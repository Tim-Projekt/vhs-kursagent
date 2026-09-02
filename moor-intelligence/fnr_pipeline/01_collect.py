"""
Step 1: Discover all FKZs from the central FNR Projektverzeichnis and scrape detail pages.

Discovery source (v2):
  https://projekte.fnr.de/projektverzeichnis
  — Single HTML page (~10MB) with all ~5000+ projects in a DataTable.
  — No pagination, no API, no JS needed: FKZ links are embedded inline.

Detail pages:
  https://projekte.fnr.de/index.php?id=18415&fkz={FKZ}
  — Same TYPO3 HTML structure (div.feld / div.wert) as former department sub-sites.
  — parse_project_page() works unchanged.

Output:
  data/fkz_index.json          — {fkz: detail_url}
  data/projects_raw/{fkz}.json — raw scraped fields per project (source: "fnr")
"""

import logging
import re
import sys
from pathlib import Path
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent))
from utils import fetch, load_json, save_json, setup_logging

log = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data"

CENTRAL_LISTING_URL = "https://projekte.fnr.de/projektverzeichnis"
CENTRAL_DETAIL_BASE = "https://projekte.fnr.de/index.php?id=18415&fkz="
LISTING_FETCH_TIMEOUT = 120  # ~10MB page needs more time


# ── Discovery ────────────────────────────────────────────────────────────────

def discover_all_fkzs() -> dict[str, str]:
    """
    Fetch the full Projektverzeichnis (single large page) and extract all FKZ→URL mappings.
    The DataTable is server-rendered inline — no AJAX, no pagination.
    """
    log.info("Fetching full FNR Projektverzeichnis (~10MB, may take 30–60s) …")
    resp = fetch(CENTRAL_LISTING_URL, timeout=LISTING_FETCH_TIMEOUT)
    if resp is None:
        log.error("Failed to fetch Projektverzeichnis")
        return {}

    html = resp.text
    result: dict[str, str] = {}

    # Pattern in table rows: href="index.php?id=18415&fkz=2220MT003A"
    # HTML may encode & as &amp;
    for m in re.finditer(r"id=18415&(?:amp;)?fkz=([A-Z0-9]+)", html):
        fkz = m.group(1).strip()
        if fkz:
            result[fkz] = f"{CENTRAL_DETAIL_BASE}{fkz}"

    log.info(f"Discovered {len(result)} unique FKZs")
    return result


# ── Scraping ─────────────────────────────────────────────────────────────────

def parse_project_page(html: str, url: str) -> dict:
    """
    Extract structured fields from a project detail page.

    HTML structure (TYPO3 plugin — identical on projekte.fnr.de and department sub-sites):
      div.inhalt-column
        h2  ← full title with "- Akronym: XYZ" suffix
        div.content.details_box
          div.detail
            div.feld  ← label
            div.wert  ← value (may contain <br> and <a>)
    """
    soup = BeautifulSoup(html, "html.parser")

    # ── Content root ──────────────────────────────────────────────────────
    inhalt = soup.find("div", class_="inhalt-column") or soup

    # ── Title & Acronym (from h2) ─────────────────────────────────────────
    title = None
    acronym = None
    h2 = inhalt.find("h2")
    if h2:
        raw_title = h2.get_text(separator=" ", strip=True)
        m = re.search(r"[-–]\s*Akronym:\s*(.+)$", raw_title)
        if m:
            acronym = m.group(1).strip()
            title = raw_title[: m.start()].strip().rstrip("-–").strip()
        else:
            title = raw_title

    # ── Field rows (div.feld + div.wert) ──────────────────────────────────
    fields: dict[str, str] = {}
    field_links: dict[str, str] = {}

    for detail in inhalt.find_all("div", class_="detail"):
        feld_el = detail.find("div", class_="feld")
        wert_el = detail.find("div", class_="wert")
        if not feld_el or not wert_el:
            continue

        key = feld_el.get_text(strip=True).lower()

        for br in wert_el.find_all("br"):
            br.replace_with("\n")
        fields[key] = wert_el.get_text(separator="", strip=False).strip()

        a = wert_el.find("a", href=True)
        if a:
            href = a["href"]
            if href.startswith("mailto:"):
                field_links["email"] = href.replace("mailto:", "")
            else:
                field_links[key] = urljoin(url, href)

    # ── Parse Projektleitung sub-fields ───────────────────────────────────
    pl_raw = fields.get("projektleitung", "")
    pl_lines = [ln.strip() for ln in pl_raw.split("\n") if ln.strip()]
    project_lead_name = pl_lines[0] if pl_lines else None
    phone = None
    for ln in pl_lines[1:]:
        if ln.lower().startswith("tel"):
            phone = re.sub(r"^tel\s*[:.]?\s*", "", ln, flags=re.IGNORECASE).strip()

    # ── Abschlussbericht PDF link ─────────────────────────────────────────
    report_url = None
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "fileadmin/projektdatenbank" in href and href.endswith(".pdf"):
            report_url = href if href.startswith("http") else urljoin(url, href)
            break

    return {
        "source": "fnr",
        "scraped_url": url,
        "title": title,
        "acronym": acronym,
        "fkz": fields.get("fkz"),
        "institution_address": fields.get("anschrift"),
        "project_lead": project_lead_name,
        "phone": phone,
        "email": fields.get("e-mail") or field_links.get("email"),
        "start_date": fields.get("anfang"),
        "end_date": fields.get("ende"),
        "aufgabenbeschreibung": fields.get("aufgabenbeschreibung"),
        "ergebnisverwendung": fields.get("ergebnisverwendung"),
        "project_website_url": field_links.get("projektwebsite"),
        "report_url": report_url,
    }


def scrape_project(fkz: str, url: str) -> dict:
    """Scrape a single project detail page. Returns {fkz, sources: {fnr: {...}}}."""
    out = {"fkz": fkz, "sources": {}}
    resp = fetch(url)
    if resp is None:
        log.warning(f"[{fkz}] Failed to fetch detail page")
        return out
    data = parse_project_page(resp.text, url)
    out["sources"]["fnr"] = data
    log.info(f"[{fkz}] Scraped: {(data.get('title') or '')[:70]}")
    return out


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    setup_logging()
    index_path = DATA_DIR / "fkz_index.json"

    # ── Phase A: Discovery ──────────────────────────────────────────────────
    fkz_index = load_json(index_path) or {}

    if fkz_index:
        log.info(f"Loaded existing FKZ index: {len(fkz_index)} entries. Skipping discovery.")
    else:
        log.info("Discovering all FKZs from central Projektverzeichnis …")
        fkz_index = discover_all_fkzs()
        if not fkz_index:
            log.error("Discovery returned no FKZs. Aborting.")
            return
        save_json(index_path, fkz_index)
        log.info(f"Discovery complete: {len(fkz_index)} unique FKZs saved.")

    # ── Phase B: Scraping ───────────────────────────────────────────────────
    raw_dir = DATA_DIR / "projects_raw"
    raw_dir.mkdir(exist_ok=True)

    total = len(fkz_index)
    for i, (fkz, url) in enumerate(fkz_index.items(), 1):
        out_path = raw_dir / f"{fkz}.json"
        if out_path.exists():
            log.info(f"[{i}/{total}] {fkz}: already scraped, skipping.")
            continue

        log.info(f"[{i}/{total}] Scraping {fkz} …")
        result = scrape_project(fkz, url)
        save_json(out_path, result)

    log.info("Step 1 complete.")


if __name__ == "__main__":
    main()
