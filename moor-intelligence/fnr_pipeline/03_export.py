"""
Step 3: Deduplicate, normalize, classify and export final JSON corpus.

Reads:   data/projects_raw/{fkz}.json
         data/report_texts/{fkz}.txt
         data/websites/{fkz}.json
         data/reports/{fkz}.pdf  (for metadata)

Writes:  data/output/projects.json   — full structured corpus (+ namespace field)
         data/output/stats.json      — summary statistics (+ namespace distribution)

Namespace assignment (classify_namespace):
  Priority 1: FKZ code pattern (new format 2019+)  MT→moor, WK→wald
  Priority 2: Keyword match in title + Aufgabenbeschreibung
  Priority 3: Default → allgemein
"""

import logging
import re
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from utils import load_json, save_json, setup_logging

log = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data"
RAW_DIR = DATA_DIR / "projects_raw"
REPORT_TEXT_DIR = DATA_DIR / "report_texts"
WEBSITE_DIR = DATA_DIR / "websites"
REPORT_DIR = DATA_DIR / "reports"
OUTPUT_DIR = DATA_DIR / "output"


# ── Namespace Classification ──────────────────────────────────────────────────

# New FKZ format (2019+): 22{YY}{CODE}{NNN}{[A-Z]}
_FKZ_CODE_RE = re.compile(r"22\d{2}([A-Z]{2,3})\d+", re.IGNORECASE)

_FKZ_CODE_MAP = {
    "MT": "moor",
    "WK": "wald",
    "WKF": "wald",
}

_NAMESPACE_KEYWORDS: dict[str, list[str]] = {
    "moor": [
        "moor", "torf", "torfersatz", "paludikultur", "typha", "sphagnum",
        "rohrkolben", "schilf", "phragmites", "vernässung", "moorschutz",
        "torfmoos", "niedermoor", "hochmoor", "paludibiomasse", "moorwiedervernässung",
    ],
    "wald": [
        "wald", "forst", "holz", "waldklima", "kurzumtrieb", "kup",
        "pappel", "weide", "agroforst", "waldklimafonds", "forstwirtschaft",
        "waldbau", "baum", "gehölz", "baumartenmischung", "aufforstung",
    ],
    "bioenergie": [
        "biogas", "biokraftstoff", "bioethanol", "biogasanlage", "pellet",
        "hackschnitzel", "biomethan", "biodiesel", "bioenergie", "nahwärme",
        "gülle", "gärrest", "biogasspeicher", "holzheizung", "heizanlage",
    ],
    "biowerkstoffe": [
        "biowerkstoff", "biokunststoff", "biobasiert", "cellulose", "lignin",
        "stärke", "biopolymer", "naturfaser", "hanf", "flachs", "kenaf",
        "baustoffe", "dämmstoff", "bioschmierstoff", "verbundwerkstoff",
    ],
}


def classify_namespace(fkz: str, title: str = "", aufgabe: str = "") -> str:
    """
    Assign a thematic namespace to a project.

    Priority:
    1. FKZ code (new 2019+ format): MT→moor, WK/WKF→wald
    2. Keyword scoring in title + Aufgabenbeschreibung
    3. Default: allgemein
    """
    # 1. FKZ code pattern
    m = _FKZ_CODE_RE.match(fkz.upper())
    if m:
        code = m.group(1).upper()
        ns = _FKZ_CODE_MAP.get(code)
        if ns:
            return ns

    # 2. Keyword scoring
    text = f"{title} {aufgabe}".lower()
    scores: dict[str, int] = {}
    for ns, keywords in _NAMESPACE_KEYWORDS.items():
        scores[ns] = sum(1 for kw in keywords if kw in text)

    best_ns = max(scores, key=scores.get)
    if scores[best_ns] > 0:
        return best_ns

    return "allgemein"


# ── Normalization ─────────────────────────────────────────────────────────────

def parse_date(s: str | None) -> str | None:
    """DD.MM.YYYY → YYYY-MM-DD"""
    if not s:
        return None
    s = s.strip()
    for fmt in ("%d.%m.%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return s


def clean_text(s: str | None) -> str | None:
    if not s:
        return None
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip() or None


def split_institution_address(raw: str | None) -> tuple[str | None, str | None]:
    if not raw:
        return None, None
    lines = [ln.strip() for ln in raw.split("\n") if ln.strip()]
    if not lines:
        return None, None
    if len(lines) == 1:
        return lines[0], None
    return lines[0], ", ".join(lines[1:])


# ── Deduplication / Merging ───────────────────────────────────────────────────

def merge_sources(project: dict) -> dict:
    """
    Merge multi-source project data into a single normalized record.

    Source priority: fnr > moor > torfersatz > first available.
    This handles both old raw data (sources: moor/torfersatz) and
    new raw data (sources: fnr) transparently.
    """
    sources = project.get("sources", {})
    fkz = project["fkz"]

    # Priority order for primary source
    primary = (
        sources.get("fnr")
        or sources.get("moor")
        or sources.get("torfersatz")
        or (next(iter(sources.values()), {}) if sources else {})
    )

    # Secondary source for gap-filling (old dual-source projects)
    secondary: dict = {}
    if "moor" in sources and "torfersatz" in sources:
        secondary = sources["torfersatz"]

    def pick(field: str):
        return primary.get(field) or secondary.get(field)

    institution, address = split_institution_address(pick("institution_address"))

    return {
        "fkz": fkz,
        "sources": sorted(sources.keys()),
        "title": clean_text(pick("title")),
        "acronym": clean_text(pick("acronym")),
        "institution": clean_text(institution),
        "address": clean_text(address),
        "project_lead": clean_text(pick("project_lead")),
        "phone": clean_text(pick("phone")),
        "email": clean_text(pick("email")),
        "start_date": parse_date(pick("start_date")),
        "end_date": parse_date(pick("end_date")),
        "aufgabenbeschreibung": clean_text(pick("aufgabenbeschreibung")),
        "ergebnisverwendung": clean_text(pick("ergebnisverwendung")),
        "project_website_url": pick("project_website_url"),
        "report_url": pick("report_url"),
    }


# ── Enrichment loading ────────────────────────────────────────────────────────

def load_report_info(fkz: str) -> dict | None:
    text_path = REPORT_TEXT_DIR / f"{fkz}.txt"
    pdf_path = REPORT_DIR / f"{fkz}.pdf"

    if not text_path.exists() and not pdf_path.exists():
        return None

    result = {}
    if pdf_path.exists():
        result["size_bytes"] = pdf_path.stat().st_size
    if text_path.exists():
        result["char_count"] = text_path.stat().st_size  # no full text — 04_rag_pipeline reads directly
        result["has_text"] = True
    return result


def load_website_info(fkz: str) -> list[dict] | None:
    path = WEBSITE_DIR / f"{fkz}.json"
    if not path.exists():
        return None
    pages = load_json(path) or []
    return pages if pages else None


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    setup_logging()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    raw_files = sorted(RAW_DIR.glob("*.json"))
    if not raw_files:
        log.error("No scraped project files found. Run 01_collect.py first.")
        return

    KNOWN_NAMESPACES = ["moor", "wald", "bioenergie", "biowerkstoffe", "allgemein"]

    projects = []
    stats: dict = {
        "total_projects": 0,
        "sources": {"fnr": 0, "moor": 0, "torfersatz": 0, "both_moor_torf": 0},
        "namespaces": {ns: 0 for ns in KNOWN_NAMESPACES},
        "with_report": 0,
        "with_website": 0,
        "with_report_text": 0,
        "with_website_pages": 0,
    }

    for raw_path in raw_files:
        raw = load_json(raw_path)
        fkz = raw["fkz"]

        project = merge_sources(raw)

        # ── Namespace classification ────────────────────────────────────────
        project["namespace"] = classify_namespace(
            fkz=fkz,
            title=project.get("title") or "",
            aufgabe=project.get("aufgabenbeschreibung") or "",
        )

        # ── Attach report ───────────────────────────────────────────────────
        report_info = load_report_info(fkz)
        if project["report_url"]:
            project["report"] = {
                "url": project.pop("report_url"),
                **(report_info or {}),
            }
            stats["with_report"] += 1
            if report_info and "text" in report_info:
                stats["with_report_text"] += 1
        else:
            project.pop("report_url", None)
            project["report"] = None

        # ── Attach website pages ────────────────────────────────────────────
        website_pages = load_website_info(fkz)
        project["website_pages"] = website_pages or []
        if project["project_website_url"]:
            stats["with_website"] += 1
        if website_pages:
            stats["with_website_pages"] += 1

        projects.append(project)

        # ── Stats ───────────────────────────────────────────────────────────
        src = project["sources"]
        if "fnr" in src:
            stats["sources"]["fnr"] += 1
        elif "moor" in src and "torfersatz" in src:
            stats["sources"]["both_moor_torf"] += 1
        elif "moor" in src:
            stats["sources"]["moor"] += 1
        elif "torfersatz" in src:
            stats["sources"]["torfersatz"] += 1

        ns = project["namespace"]
        stats["namespaces"][ns] = stats["namespaces"].get(ns, 0) + 1

    stats["total_projects"] = len(projects)

    # Sort by start_date descending
    projects.sort(key=lambda p: p.get("start_date") or "", reverse=True)

    save_json(OUTPUT_DIR / "projects.json", projects)
    save_json(OUTPUT_DIR / "stats.json", stats)

    log.info(f"Exported {len(projects)} projects to data/output/projects.json")
    log.info(f"Namespace distribution: {stats['namespaces']}")
    log.info(f"Stats: {stats}")


if __name__ == "__main__":
    main()
