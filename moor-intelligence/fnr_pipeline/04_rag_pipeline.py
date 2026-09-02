"""
FNR RAG Pipeline v2 – OpenAI Embeddings + Pinecone Dense Index

Embedding-Modell:  text-embedding-3-small (dim=512)
Pinecone-Index:    fnr-projektdatenbank-v2  (dense, us-east-1)

Namespace-Struktur (Two-Tier):
  {thema}/infos    ← Projektübersicht: ein Core-Chunk pro Projekt
  {thema}/details  ← Tiefen-Content: Abschlussberichte + Projektwebsites

Verfügbare Themen: moor, wald, bioenergie, biowerkstoffe, allgemein

Datenmodell:
  Core-Chunk   – 1 pro Projekt: Titel + Institution + Aufgabenbeschreibung
  Report-Chunk – N pro Schlussbericht: paragraph-basiert, mit Titel-Prefix
  Web-Chunk    – N pro Projektwebsite: gefiltert (≤ 20.000 Zeichen/Seite)

Design:
  - Embeddings via OpenAI API (text-embedding-3-small, dim=512)
  - text-Feld als Metadata gespeichert (kein integrated inference)
  - Namespace = "{thema}/infos" oder "{thema}/details"
  - Chunk-IDs: "{fkz}#core" | "{fkz}#report#{n}" | "{fkz}#web#{n}"
"""

import json
import os
import re
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

import openai
from dotenv import load_dotenv
from pinecone import Pinecone
from pinecone.exceptions import PineconeApiException

# ─── Config ───────────────────────────────────────────────────────────────────

load_dotenv(Path(__file__).parent.parent / ".env")

PINECONE_API_KEY = os.environ["PINECONE_API_KEY"]
OPENAI_API_KEY   = os.environ["OPENAI_API_KEY"]
INDEX_HOST       = os.environ.get(
    "PINECONE_INDEX_HOST",
    "fnr-projektdatenbank-v2-ny6c8su.svc.aped-4627-b74a.pinecone.io"
)

EMBEDDING_MODEL      = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 512

DATA_PATH   = Path(__file__).parent / "data/output/projects.json"
REPORT_DIR  = Path(__file__).parent / "data/report_texts"
WEBSITE_DIR = Path(__file__).parent / "data/websites"

MAX_CHARS      = 5_500
CHUNK_TARGET   = 2_000
PAGE_MAX_CHARS = 20_000
BATCH_SIZE         = 32
BATCH_DELAY_CORE   = 0.5
BATCH_DELAY_REPORT = 1.0
BATCH_DELAY_WEB    = 1.0

ALL_THEMES = ["moor", "wald", "bioenergie", "biowerkstoffe", "allgemein"]

# ─── OpenAI Embedding ─────────────────────────────────────────────────────────

_openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Returns list of 512-dim float vectors."""
    response = _openai_client.embeddings.create(
        input=texts,
        model=EMBEDDING_MODEL,
        dimensions=EMBEDDING_DIMENSIONS,
    )
    return [item.embedding for item in response.data]


# ─── Datenladen ───────────────────────────────────────────────────────────────

def load_projects(limit: int | None = None) -> list[dict]:
    with open(DATA_PATH, encoding="utf-8") as f:
        projects = json.load(f)
    return projects[:limit] if limit else projects


# ─── Text-Builder ─────────────────────────────────────────────────────────────

def _truncate(text: str) -> str:
    if len(text) <= MAX_CHARS:
        return text
    cut = text[:MAX_CHARS]
    last = max(cut.rfind(". "), cut.rfind(".\n"), cut.rfind(": "))
    return (cut[: last + 1] if last > MAX_CHARS // 2 else cut).rstrip()


def build_core_text(p: dict) -> str:
    lines = [
        f"Förderprojekt: {p['title']}",
        f"Akronym: {p.get('acronym') or '—'}  |  FKZ: {p['fkz']}",
        f"Institution: {p.get('institution') or '—'}",
        f"Laufzeit: {p.get('start_date', '')} bis {p.get('end_date', '')}",
    ]
    if desc := p.get("aufgabenbeschreibung"):
        lines += ["", "Aufgabe und Ziele:", desc]
    if usage := p.get("ergebnisverwendung"):
        lines += ["", "Ergebnisverwendung:", usage]
    return _truncate("\n".join(lines))


def build_core_record(p: dict) -> dict:
    return {
        "id":           f"{p['fkz']}#core",
        "text":         build_core_text(p),
        "fkz":          p["fkz"],
        "title":        (p.get("title") or "")[:500],
        "acronym":      p.get("acronym") or "",
        "institution":  (p.get("institution") or "")[:200],
        "project_lead": p.get("project_lead") or "",
        "email":        p.get("email") or "",
        "start_date":   p.get("start_date") or "",
        "end_date":     p.get("end_date") or "",
        "sources":      ",".join(p.get("sources") or []),
        "namespace":    p.get("namespace", "allgemein"),
        "chunk_type":   "core",
        "has_report":   (REPORT_DIR  / f"{p['fkz']}.txt" ).exists(),
        "has_website":  (WEBSITE_DIR / f"{p['fkz']}.json").exists(),
    }


# ─── Report-Chunking ──────────────────────────────────────────────────────────

def _split_paragraphs(text: str) -> list[str]:
    return [p.strip() for p in re.split(r"\n{2,}", text) if len(p.strip()) > 20]


def chunk_report_text(fkz: str, title: str, raw: str) -> list[dict]:
    paragraphs = _split_paragraphs(raw)
    buckets: list[str] = []
    current: list[str] = []
    current_len = 0

    for para in paragraphs:
        if current_len + len(para) > CHUNK_TARGET and current:
            buckets.append("\n\n".join(current))
            current, current_len = [para], len(para)
        else:
            current.append(para)
            current_len += len(para)
    if current:
        buckets.append("\n\n".join(current))

    records = []
    for i, chunk in enumerate(buckets):
        prefixed = f"[{title[:120]}]\n\n{chunk}"
        records.append({
            "id":          f"{fkz}#report#{i}",
            "text":        _truncate(prefixed),
            "fkz":         fkz,
            "title":       title[:500],
            "chunk_type":  "report",
            "chunk_index": i,
            "chunk_total": len(buckets),
        })
    return records


def load_report_records(fkz: str, title: str) -> list[dict]:
    path = REPORT_DIR / f"{fkz}.txt"
    if not path.exists():
        return []
    raw = path.read_text(encoding="utf-8", errors="replace")
    return chunk_report_text(fkz, title, raw)


# ─── Website-Chunking ─────────────────────────────────────────────────────────

def chunk_website_pages(fkz: str, title: str, pages: list[dict]) -> list[dict]:
    records = []
    flat_idx = 0

    for page in pages:
        text = page.get("text", "").strip()
        page_url   = page.get("url", "")
        page_title = page.get("title", "").strip()

        if len(text) > PAGE_MAX_CHARS:
            continue

        paragraphs = _split_paragraphs(text)
        if not paragraphs:
            continue

        buckets: list[str] = []
        current: list[str] = []
        current_len = 0
        for para in paragraphs:
            if current_len + len(para) > CHUNK_TARGET and current:
                buckets.append("\n\n".join(current))
                current, current_len = [para], len(para)
            else:
                current.append(para)
                current_len += len(para)
        if current:
            buckets.append("\n\n".join(current))

        for chunk in buckets:
            prefix = f"[{title[:100]} | {page_title[:80]}]"
            records.append({
                "id":          f"{fkz}#web#{flat_idx}",
                "text":        _truncate(f"{prefix}\n\n{chunk}"),
                "fkz":         fkz,
                "title":       title[:500],
                "chunk_type":  "web",
                "chunk_index": flat_idx,
                "page_url":    page_url[:500],
                "page_title":  page_title[:200],
            })
            flat_idx += 1

    for r in records:
        r["chunk_total"] = flat_idx

    return records


def load_website_records(fkz: str, title: str) -> list[dict]:
    path = WEBSITE_DIR / f"{fkz}.json"
    if not path.exists():
        return []
    try:
        pages = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []
    return chunk_website_pages(fkz, title, pages)


# ─── Pinecone ─────────────────────────────────────────────────────────────────

def get_index():
    return Pinecone(api_key=PINECONE_API_KEY).Index(host=INDEX_HOST)


def upsert_batch(index, records: list[dict], namespace: str, delay: float = BATCH_DELAY_CORE):
    """Embeds records via OpenAI und upserted sie in Batches an Pinecone."""
    for start in range(0, len(records), BATCH_SIZE):
        batch = records[start : start + BATCH_SIZE]
        batch_num = start // BATCH_SIZE + 1

        texts = [r["text"] for r in batch]
        embeddings = embed_texts(texts)

        vectors = []
        for r, emb in zip(batch, embeddings):
            metadata = {k: v for k, v in r.items() if k != "id"}
            vectors.append({"id": r["id"], "values": emb, "metadata": metadata})

        success = False
        for attempt in range(8):
            try:
                index.upsert(vectors=vectors, namespace=namespace)
                print(f"    ^ {len(batch)} records → namespace='{namespace}' (batch {batch_num})")
                success = True
                break
            except PineconeApiException as e:
                if e.status == 429:
                    wait = min(30 + 30 * attempt, 300)
                    print(f"    Rate limit – warte {wait}s (attempt {attempt + 1}/8)")
                    time.sleep(wait)
                else:
                    raise
        if not success:
            raise RuntimeError(f"Batch {batch_num} konnte nach 8 Versuchen nicht indexiert werden.")

        time.sleep(delay)


def search(index, query: str, namespace: str, top_k: int = 5) -> list:
    embedding = embed_texts([query])[0]
    response = index.query(
        namespace=namespace,
        vector=embedding,
        top_k=top_k,
        include_metadata=True,
    )
    return response.matches if hasattr(response, "matches") else []


# ─── Test Pipeline ────────────────────────────────────────────────────────────

def run_test(n_projects: int = 3):
    """
    Indexiert n Projekte als Smoke-Test.
    Nutzt den 'test'-Prefix für Namespaces: test/moor/infos, test/moor/details, etc.
    """
    print(f"\n{'='*65}")
    print("  FNR RAG Pipeline v2 – Test Run (Two-Tier Namespaces)")
    print(f"{'='*65}\n")

    index = get_index()
    projects = load_projects(limit=n_projects)

    # Alle Test-Projekte unter ihrem jeweiligen Thema indexieren
    for p in projects:
        topic = p.get("namespace", "allgemein")
        infos_ns   = f"test/{topic}/infos"
        details_ns = f"test/{topic}/details"

        fkz   = p["fkz"]
        title = p.get("title", fkz)

        print(f"[{fkz}] namespace={topic}")

        # Core → {topic}/infos
        core = [build_core_record(p)]
        upsert_batch(index, core, namespace=infos_ns, delay=0)

        # Reports → {topic}/details
        report_records = load_report_records(fkz, title)
        if report_records:
            upsert_batch(index, report_records[:5], namespace=details_ns, delay=0)
            print(f"  + {min(len(report_records), 5)} report chunks")

        # Websites → {topic}/details
        web_records = load_website_records(fkz, title)
        if web_records:
            upsert_batch(index, web_records[:3], namespace=details_ns, delay=0)
            print(f"  + {min(len(web_records), 3)} web chunks")

    print()

    # ── Semantische Test-Suchen ────────────────────────────────────────────
    print("Semantische Suchanfragen:\n")
    test_queries = [
        ("moor", "Paludikultur Biomasse Verwertung"),
        ("moor", "Torfersatz Substrate Gartenbau"),
        ("wald", "Holzbau Klimaschutz CO2 Speicher"),
        ("bioenergie", "Biogas Gülle Methan Anlage"),
    ]

    for topic, q in test_queries:
        ns = f"test/{topic}/infos"
        hits = search(index, q, namespace=ns, top_k=3)
        print(f"  [{ns}] \"{q}\"")
        if not hits:
            print("    → keine Ergebnisse")
        for h in hits:
            meta = h.metadata or {}
            print(f"    [{h.score:.3f}] {meta.get('fkz','')} – {(meta.get('title') or '')[:60]}")
        print()

    print(f"{'='*65}")
    print("  Test abgeschlossen.")
    print(f"{'='*65}\n")


# ─── Resume Helper ────────────────────────────────────────────────────────────

def _fetch_existing(index, ids: list[str], namespace: str) -> set[str]:
    """Gibt die Teilmenge von IDs zurück, die bereits in Pinecone existieren."""
    result = index.fetch(ids=ids, namespace=namespace)
    return set(result.vectors.keys())


# ─── Full Index (mit Resume, Two-Tier) ────────────────────────────────────────

def run_full_index(namespace_prefix: str = "prod"):
    """
    Indexiert den gesamten Korpus in Two-Tier-Namespaces.

    Namespace-Schema:
      {prefix}/{thema}/infos    ← Core-Chunks (Projektübersicht)
      {prefix}/{thema}/details  ← Report- + Website-Chunks (Tiefen-Content)

    Beispiel bei namespace_prefix="prod":
      prod/moor/infos, prod/moor/details, prod/wald/infos, ...
    """
    print(f"\n{'='*65}")
    print(f"  FNR Full Index v2 (Two-Tier) → prefix='{namespace_prefix}'")
    print(f"{'='*65}\n")

    index = get_index()
    projects = load_projects()

    # Gruppierung nach Thema
    by_theme: dict[str, list[dict]] = {t: [] for t in ALL_THEMES}
    for p in projects:
        theme = p.get("namespace", "allgemein")
        by_theme.setdefault(theme, []).append(p)

    print(f"Projekte gesamt: {len(projects)}")
    for t, ps in by_theme.items():
        print(f"  {t}: {len(ps)} Projekte")
    print()

    # ── Pro Thema: Core-Records → {prefix}/{thema}/infos ──────────────────
    for theme, theme_projects in by_theme.items():
        if not theme_projects:
            continue

        infos_ns   = f"{namespace_prefix}/{theme}/infos"
        details_ns = f"{namespace_prefix}/{theme}/details"

        print(f"[{theme.upper()}] {len(theme_projects)} Projekte → '{infos_ns}' + '{details_ns}'")

        # ── Core Records ──────────────────────────────────────────────────
        all_core_ids = [f"{p['fkz']}#core" for p in theme_projects]
        existing_core: set[str] = set()
        for i in range(0, len(all_core_ids), 100):
            existing_core |= _fetch_existing(index, all_core_ids[i : i + 100], namespace=infos_ns)

        new_core = [
            build_core_record(p)
            for p in theme_projects
            if f"{p['fkz']}#core" not in existing_core
        ]
        if new_core:
            upsert_batch(index, new_core, namespace=infos_ns, delay=BATCH_DELAY_CORE)
            print(f"  Core: {len(new_core)} neu | {len(existing_core)} übersprungen")
        else:
            print(f"  Core: alle {len(theme_projects)} bereits indexiert")

        proj_map = {p["fkz"]: p for p in theme_projects}

        # ── Report Chunks → details ────────────────────────────────────────
        report_files = [
            (p.stem, proj_map[p.stem]["title"] if p.stem in proj_map else p.stem)
            for p in sorted(REPORT_DIR.glob("*.txt"))
            if p.stem in proj_map
        ]
        if report_files:
            print(f"  Reports: {len(report_files)} Berichte …")
            rep_new = rep_skip = 0
            for fkz, title in report_files:
                records = load_report_records(fkz, title)
                if not records:
                    continue
                first_id, last_id = records[0]["id"], records[-1]["id"]
                existing = _fetch_existing(index, [first_id, last_id], namespace=details_ns)
                if first_id in existing and last_id in existing:
                    rep_skip += len(records)
                    continue
                upsert_batch(index, records, namespace=details_ns, delay=BATCH_DELAY_REPORT)
                rep_new += len(records)
            print(f"  Reports: {rep_new} neu | {rep_skip} übersprungen")

        # ── Website Chunks → details ───────────────────────────────────────
        web_files = [
            (p.stem, proj_map[p.stem]["title"] if p.stem in proj_map else p.stem)
            for p in sorted(WEBSITE_DIR.glob("*.json"))
            if p.stem in proj_map
        ]
        if web_files:
            print(f"  Websites: {len(web_files)} Projektseiten …")
            web_new = web_skip = 0
            for fkz, title in web_files:
                records = load_website_records(fkz, title)
                if not records:
                    continue
                first_id, last_id = records[0]["id"], records[-1]["id"]
                existing = _fetch_existing(index, [first_id, last_id], namespace=details_ns)
                if first_id in existing and last_id in existing:
                    web_skip += len(records)
                    continue
                upsert_batch(index, records, namespace=details_ns, delay=BATCH_DELAY_WEB)
                web_new += len(records)
            print(f"  Websites: {web_new} neu | {web_skip} übersprungen")

        print()

    print(f"{'='*65}")
    print(f"  Full Index abgeschlossen. Prefix: '{namespace_prefix}'")
    print(f"{'='*65}\n")


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "test"
    if mode == "full":
        prefix = sys.argv[2] if len(sys.argv) > 2 else "prod"
        run_full_index(namespace_prefix=prefix)
    else:
        n = int(mode) if mode.isdigit() else 3
        run_test(n_projects=n)
