"""Embedding + Pinecone-Upsert der processed VHS-Kurse — namespace-gescoped.

    python -m vhs_pipeline.build_index --source berlin
    python -m vhs_pipeline.build_index --source berlin --limit 50 --dry-run
    python -m vhs_pipeline.build_index --source berlin --namespace vhs/berlin

Ein Chunk pro Kurs (`build_course_text`). Inkrementell über `content_hash`:
nur neue/geänderte `uid` werden re-embedded, im Namespace verschwundene gelöscht.

Config (env oder vhs_pipeline/.env):
    PINECONE_API_KEY, PINECONE_INDEX_HOST, OPENAI_API_KEY
    EMBED_MODEL   (default text-embedding-3-small)
    EMBED_DIM     (default 512 — muss zur Index-Dimension passen)

Reuse aus Moor Intelligence `fnr_pipeline/04_rag_pipeline.py`:
Embedding-Batching, `_truncate`, Batch-Upsert mit 429-Retry, Resume-Logik.
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
import time
from pathlib import Path

import requests

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except Exception:  # noqa: BLE001
    pass

import openai

from .utils import iter_jsonl, setup_logging

log = logging.getLogger("vhs_pipeline.build_index")

ROOT = Path(__file__).resolve().parent
PROCESSED_DIR = ROOT / "data" / "processed"

EMBED_MODEL = os.environ.get("EMBED_MODEL", "text-embedding-3-small")
EMBED_DIM = int(os.environ.get("EMBED_DIM", "512"))

EMBED_BATCH = 128
UPSERT_BATCH = 100
MAX_CHARS = 6000

_openai = openai.OpenAI()


# ── chunk text ──────────────────────────────────────────────────────────────

def _truncate(text: str, limit: int = MAX_CHARS) -> str:
    if len(text) <= limit:
        return text
    cut = text[:limit]
    last = max(cut.rfind(". "), cut.rfind(".\n"), cut.rfind("\n"))
    return (cut[: last + 1] if last > limit // 2 else cut).rstrip()


def build_course_text(c: dict) -> str:
    v = c.get("venue") or {}
    p = c.get("price") or {}
    prov = c.get("provider") or {}

    head = c["title"] + (f" – {c['subtitle']}" if c.get("subtitle") else "")
    vhs_name = prov.get("name") or (f"VHS {c['region']}" if c.get("region") else None)
    line2 = " · ".join(
        x for x in [
            vhs_name,
            c.get("dvv_bereich"),
            c.get("dvv_label") if c.get("dvv_label") != c.get("dvv_bereich") else None,
            c.get("event_type"),
            {"praesenz": "Präsenzkurs", "online": "Online-Kurs", "blended": "Blended Learning",
             "selbstlern": "Selbstlernangebot"}.get(c.get("course_format"), None),
            f"Niveau {c['level']}" if c.get("level") else None,
        ]
        if x
    )

    sched_bits = []
    if c.get("start_date"):
        sched_bits.append(f"ab {c['start_date']}")
    if c.get("weekdays"):
        sched_bits.append("/".join(c["weekdays"]))
    if c.get("time_start"):
        sched_bits.append(f"{c['time_start']}–{c.get('time_end') or ''}".rstrip("–"))
    if c.get("session_count"):
        sched_bits.append(f"{c['session_count']} Termine")
    sched = "Termine: " + ", ".join(sched_bits) if sched_bits else ""

    if v.get("online"):
        ort = "Ort: online"
    else:
        ort = "Ort: " + ", ".join(x for x in [v.get("name"), v.get("street"),
                                              f"{v.get('zip') or ''} {v.get('city') or ''}".strip()] if x)

    price_bits = []
    if p.get("amount") is not None:
        price_bits.append(f"{p['amount']:.2f} EUR" if not p.get("free") else "kostenlos")
    if p.get("reduced") is not None:
        price_bits.append(f"ermäßigt {p['reduced']:.2f} EUR")
    price = "Preis: " + ", ".join(price_bits) if price_bits else ""

    kw = "Stichworte: " + ", ".join(c.get("keywords") or []) if c.get("keywords") else ""
    tg = "Zielgruppe: " + ", ".join(c.get("target_groups") or []) if c.get("target_groups") else ""
    instr = "Kursleitung: " + ", ".join(c.get("instructors") or []) if c.get("instructors") else ""

    body = "\n\n".join(x for x in [c.get("description"), c.get("additional_info")] if x)

    parts = [head, line2, " | ".join(x for x in [sched, ort] if x),
             " | ".join(x for x in [price, kw] if x),
             " | ".join(x for x in [tg, instr] if x), "", body]
    return _truncate("\n".join(x for x in parts if x is not None).strip())


# ── metadata ────────────────────────────────────────────────────────────────

_META_KEEP_STR = ["uid", "guid", "source_id", "namespace", "course_number", "title",
                  "subtitle", "dvv_code", "dvv_bereich", "dvv_label", "event_type",
                  "level", "course_format", "start_date", "end_date", "time_start",
                  "time_end", "city", "region", "postal_code", "status", "booking_url",
                  "semester", "content_hash"]
_META_KEEP_NUM = ["session_count"]


def build_metadata(c: dict, text: str) -> dict:
    v = c.get("venue") or {}
    p = c.get("price") or {}
    cap = c.get("capacity") or {}
    prov = c.get("provider") or {}
    md: dict = {}
    for k in _META_KEEP_STR:
        val = c.get(k)
        if isinstance(val, str) and val.strip():
            md[k] = val
    for k in _META_KEEP_NUM:
        if isinstance(c.get(k), (int, float)):
            md[k] = c[k]
    md["provider_id"] = prov.get("id") or ""
    if prov.get("name"):
        md["provider_name"] = prov["name"]
    md["online"] = bool(v.get("online"))
    if v.get("lat") is not None and v.get("lon") is not None:
        md["lat"] = float(v["lat"])
        md["lon"] = float(v["lon"])
    if p.get("amount") is not None:
        md["price_amount"] = float(p["amount"])
    if p.get("reduced") is not None:
        md["price_reduced"] = float(p["reduced"])
    md["price_free"] = bool(p.get("free"))
    if cap.get("max") is not None:
        md["capacity_max"] = int(cap["max"])
    if c.get("weekdays"):
        md["weekdays"] = list(c["weekdays"])[:7]
    if c.get("keywords"):
        md["keywords"] = [k for k in c["keywords"] if isinstance(k, str)][:32]
    md["text"] = text[:3500]
    return md


# ── OpenAI embeddings ───────────────────────────────────────────────────────

def embed(texts: list[str]) -> list[list[float]]:
    for attempt in range(8):
        try:
            r = _openai.embeddings.create(model=EMBED_MODEL, input=texts, dimensions=EMBED_DIM)
            return [d.embedding for d in r.data]
        except (openai.RateLimitError, openai.APIStatusError, openai.APIConnectionError) as e:
            wait = min(10 + 15 * attempt, 120)
            log.warning("embed retry %d/8 in %ss (%s)", attempt + 1, wait, type(e).__name__)
            time.sleep(wait)
    raise RuntimeError("embedding failed after 8 attempts")


# ── Pinecone REST ───────────────────────────────────────────────────────────

class Pinecone:
    def __init__(self, host: str, api_key: str):
        self.base = f"https://{host.replace('https://', '').rstrip('/')}"
        self.h = {"Api-Key": api_key, "Content-Type": "application/json"}

    def stats(self) -> dict:
        return requests.post(f"{self.base}/describe_index_stats", headers=self.h, json={}, timeout=30).json()

    def list_ids(self, namespace: str) -> list[str]:
        ids, token = [], None
        while True:
            params = {"namespace": namespace, "limit": 100}
            if token:
                params["paginationToken"] = token
            r = requests.get(f"{self.base}/vectors/list", headers=self.h, params=params, timeout=30).json()
            ids += [v["id"] for v in r.get("vectors", [])]
            token = (r.get("pagination") or {}).get("next")
            if not token:
                return ids

    def fetch_hashes(self, namespace: str, ids: list[str]) -> dict[str, str]:
        out: dict[str, str] = {}
        for i in range(0, len(ids), 200):
            batch = ids[i : i + 200]
            params = [("namespace", namespace)] + [("ids", x) for x in batch]
            r = requests.get(f"{self.base}/vectors/fetch", headers=self.h, params=params, timeout=60).json()
            for vid, v in (r.get("vectors") or {}).items():
                out[vid] = (v.get("metadata") or {}).get("content_hash", "")
        return out

    def upsert(self, namespace: str, vectors: list[dict]) -> None:
        for i in range(0, len(vectors), UPSERT_BATCH):
            batch = vectors[i : i + UPSERT_BATCH]
            for attempt in range(8):
                resp = requests.post(f"{self.base}/vectors/upsert", headers=self.h,
                                     json={"namespace": namespace, "vectors": batch}, timeout=120)
                if resp.status_code == 200:
                    break
                if resp.status_code == 429:
                    wait = min(20 + 20 * attempt, 180)
                    log.warning("upsert 429 – wait %ss (%d/8)", wait, attempt + 1)
                    time.sleep(wait)
                else:
                    raise RuntimeError(f"upsert {resp.status_code}: {resp.text[:300]}")
            else:
                raise RuntimeError("upsert failed after 8 attempts")

    def delete(self, namespace: str, ids: list[str]) -> None:
        for i in range(0, len(ids), 1000):
            requests.post(f"{self.base}/vectors/delete", headers=self.h,
                          json={"namespace": namespace, "ids": ids[i : i + 1000]}, timeout=60).raise_for_status()


# ── main ────────────────────────────────────────────────────────────────────

def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Embedding + Pinecone-Upsert (namespace-gescoped)")
    ap.add_argument("--source", default="berlin", help="processed source id (data/processed/<id>.jsonl)")
    ap.add_argument("--namespace", help="Pinecone namespace (default: namespace-Feld der Records)")
    ap.add_argument("--limit", type=int, help="nur die ersten N Kurse (Test)")
    ap.add_argument("--dry-run", action="store_true", help="embedden simulieren, kein OpenAI/Pinecone-Write")
    ap.add_argument("--no-delete", action="store_true", help="verschwundene uids nicht löschen")
    args = ap.parse_args(argv)
    setup_logging()

    path = PROCESSED_DIR / f"{args.source}.jsonl"
    if not path.exists():
        log.error("not found: %s — erst `python -m vhs_pipeline.run` laufen lassen", path)
        return 2
    courses = list(iter_jsonl(path))
    if args.limit:
        courses = courses[: args.limit]
    if not courses:
        log.error("no courses in %s", path)
        return 2

    namespaces = {c["namespace"] for c in courses}
    namespace = args.namespace or (namespaces.pop() if len(namespaces) == 1 else None)
    if not namespace:
        log.error("uneinheitliche namespaces %s — bitte --namespace setzen", namespaces)
        return 2

    log.info("source=%s  namespace=%s  courses=%d  model=%s  dim=%d%s",
             args.source, namespace, len(courses), EMBED_MODEL, EMBED_DIM,
             "  [DRY-RUN]" if args.dry_run else "")

    # ── build (id, text, hash, metadata) ─────────────────────────────
    items = []
    for c in courses:
        text = build_course_text(c)
        items.append({"id": c["uid"], "hash": c["content_hash"], "text": text,
                      "metadata": build_metadata(c, text)})
    avg = sum(len(i["text"]) for i in items) / len(items)
    log.info("chunk text: avg %d chars, max %d chars", avg, max(len(i["text"]) for i in items))

    if args.dry_run:
        print("\n--- sample chunk (%s) ---\n%s" % (items[0]["id"], items[0]["text"][:1200]))
        print("\n--- sample metadata keys ---\n%s" % sorted(items[0]["metadata"]))
        return 0

    pk = os.environ.get("PINECONE_API_KEY")
    host = os.environ.get("PINECONE_INDEX_HOST")
    if not pk or not host:
        log.error("PINECONE_API_KEY / PINECONE_INDEX_HOST fehlen (env oder vhs_pipeline/.env)")
        return 2
    pc = Pinecone(host, pk)

    stats = pc.stats()
    dim = stats.get("dimension")
    if dim and dim != EMBED_DIM:
        log.error("Index-Dimension %s ≠ EMBED_DIM %s — abbruch", dim, EMBED_DIM)
        return 2
    ns_count = (stats.get("namespaces") or {}).get(namespace, {}).get("vectorCount", 0)
    log.info("index dim=%s  namespace '%s' hat aktuell %d Vektoren", dim, namespace, ns_count)

    # ── resume diff ──────────────────────────────────────────────────
    existing: dict[str, str] = {}
    if ns_count:
        ids = pc.list_ids(namespace)
        existing = pc.fetch_hashes(namespace, ids)
        log.info("bestehende Vektoren gelesen: %d", len(existing))

    want_ids = {i["id"] for i in items}
    todo = [i for i in items if existing.get(i["id"]) != i["hash"]]
    stale = [vid for vid in existing if vid not in want_ids] if not args.no_delete else []
    log.info("neu/geändert: %d  unverändert: %d  zu löschen: %d",
             len(todo), len(items) - len(todo), len(stale))

    # ── embed + upsert ──────────────────────────────────────────────
    t0 = time.time()
    done = 0
    for i in range(0, len(todo), EMBED_BATCH):
        batch = todo[i : i + EMBED_BATCH]
        vecs = embed([b["text"] for b in batch])
        pc.upsert(namespace, [{"id": b["id"], "values": v, "metadata": b["metadata"]}
                              for b, v in zip(batch, vecs)])
        done += len(batch)
        log.info("  upserted %d/%d (%.0fs)", done, len(todo), time.time() - t0)

    if stale:
        pc.delete(namespace, stale)
        log.info("  deleted %d stale", len(stale))

    final = pc.stats()
    fc = (final.get("namespaces") or {}).get(namespace, {}).get("vectorCount", 0)
    log.info("FERTIG: namespace '%s' → %d Vektoren (Δ %+d), %.0fs total",
             namespace, fc, fc - ns_count, time.time() - t0)
    return 0


if __name__ == "__main__":
    sys.exit(main())
