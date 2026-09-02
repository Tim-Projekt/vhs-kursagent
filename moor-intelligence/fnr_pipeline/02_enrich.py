"""
Step 2: Download PDF reports and crawl external project websites.

Reads:   data/projects_raw/{fkz}.json
Writes:  data/reports/{fkz}.pdf
         data/report_texts/{fkz}.txt
         data/websites/{fkz}.json   — list of {url, title, text} per page

PDF downloads run in parallel (PDF_WORKERS concurrent threads).
Website crawling runs sequentially (BFS per project, rate-sensitive).
"""

import logging
import re
import sys
from collections import deque
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urljoin, urlparse

import fitz  # PyMuPDF
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent))
from utils import fetch, load_json, save_json, setup_logging

log = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data"
RAW_DIR = DATA_DIR / "projects_raw"
REPORT_DIR = DATA_DIR / "reports"
REPORT_TEXT_DIR = DATA_DIR / "report_texts"
WEBSITE_DIR = DATA_DIR / "websites"

MAX_WEBSITE_PAGES = 20
MAX_WEBSITE_DEPTH = 2
PDF_WORKERS = 5          # parallel download threads
PDF_MAX_SIZE_MB = 30     # skip PDFs larger than this (corrupted / huge compilations)

SKIP_URL_PATTERNS = re.compile(
    r"(impressum|datenschutz|kontakt|contact|privacy|barrierefreiheit"
    r"|sitemap|login|newsletter|social|youtube|linkedin|twitter|instagram"
    r"|facebook|bluesky|threads|xing|rss|feed|javascript|mailto|tel:)",
    re.IGNORECASE,
)


# ── Report Download & Parsing ─────────────────────────────────────────────────

def download_report(fkz: str, url: str) -> Path | None:
    """
    Download PDF to data/reports/{fkz}.pdf via streaming.
    Returns path on success, None on failure or size limit exceeded.
    Skips if a valid file already exists.
    """
    out_path = REPORT_DIR / f"{fkz}.pdf"
    if out_path.exists() and out_path.stat().st_size > 100:
        return out_path

    resp = fetch(url, stream=True)
    if resp is None:
        return None

    # Size check via Content-Length header (not always present)
    content_length = resp.headers.get("Content-Length")
    if content_length:
        size_mb = int(content_length) / (1024 * 1024)
        if size_mb > PDF_MAX_SIZE_MB:
            log.warning(f"[{fkz}] PDF too large ({size_mb:.1f} MB > {PDF_MAX_SIZE_MB} MB) — skipping")
            return None

    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    total_bytes = 0
    chunks = []
    for chunk in resp.iter_content(chunk_size=65536):
        if not chunk:
            continue
        chunks.append(chunk)
        total_bytes += len(chunk)
        if total_bytes > PDF_MAX_SIZE_MB * 1024 * 1024:
            log.warning(f"[{fkz}] PDF exceeded {PDF_MAX_SIZE_MB} MB during download — skipping")
            return None

    content = b"".join(chunks)

    if not content.startswith(b"%PDF"):
        log.warning(f"[{fkz}] Response is not a valid PDF ({total_bytes} bytes) — skipping")
        return None

    out_path.write_bytes(content)
    log.info(f"[{fkz}] Report saved ({total_bytes // 1024} KB)")
    return out_path


def extract_pdf_text(fkz: str, pdf_path: Path) -> str | None:
    """Extract text from PDF using PyMuPDF. Skips if .txt already exists."""
    text_path = REPORT_TEXT_DIR / f"{fkz}.txt"
    if text_path.exists():
        return text_path.read_text(encoding="utf-8")

    try:
        with fitz.open(str(pdf_path)) as doc:
            page_count = doc.page_count
            pages_text = [doc[i].get_text() for i in range(page_count)]

        text = "\n".join(pages_text).strip()
        text = re.sub(r"\n{3,}", "\n\n", text)

        REPORT_TEXT_DIR.mkdir(parents=True, exist_ok=True)
        text_path.write_text(text, encoding="utf-8")
        log.info(f"[{fkz}] Extracted {page_count} pages, {len(text):,} chars")
        return text

    except Exception as e:
        log.error(f"[{fkz}] PDF extraction failed: {e}")
        return None


def process_report(fkz: str, report_url: str) -> str:
    """Download + extract a single PDF. Returns status string for logging."""
    text_path = REPORT_TEXT_DIR / f"{fkz}.txt"
    if text_path.exists():
        return f"[{fkz}] text already extracted — skipped"

    pdf_path = download_report(fkz, report_url)
    if pdf_path is None:
        return f"[{fkz}] download failed or skipped"

    extract_pdf_text(fkz, pdf_path)
    return f"[{fkz}] done"


# ── Website Crawling ──────────────────────────────────────────────────────────

def should_follow(url: str, base_domain: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False
    if parsed.netloc != base_domain:
        return False
    if SKIP_URL_PATTERNS.search(url):
        return False
    return True


def extract_main_text(soup: BeautifulSoup) -> str:
    """Remove boilerplate and return readable text."""
    for tag in soup(["nav", "header", "footer", "script", "style", "aside", "form"]):
        tag.decompose()

    main = (
        soup.find("main")
        or soup.find("article")
        or soup.find(id=re.compile(r"content|main|inhalt", re.I))
        or soup.find(class_=re.compile(r"content|main|article", re.I))
        or soup.find("body")
        or soup
    )
    text = main.get_text(separator="\n", strip=True)
    return re.sub(r"\n{3,}", "\n\n", text)


def crawl_website(fkz: str, start_url: str) -> list[dict]:
    """BFS crawl of a project website. Returns list of {url, title, text}."""
    out_path = WEBSITE_DIR / f"{fkz}.json"
    if out_path.exists():
        return load_json(out_path)

    base_domain = urlparse(start_url).netloc
    queue: deque[tuple[str, int]] = deque([(start_url, 0)])
    visited: set[str] = set()
    pages: list[dict] = []

    log.info(f"[{fkz}] Crawling website: {start_url}")

    while queue and len(pages) < MAX_WEBSITE_PAGES:
        url, depth = queue.popleft()
        url_no_frag = url.split("#")[0]
        if url_no_frag in visited:
            continue
        visited.add(url_no_frag)

        resp = fetch(url_no_frag)
        if resp is None:
            continue

        content_type = resp.headers.get("Content-Type", "")
        if "html" not in content_type:
            continue

        soup = BeautifulSoup(resp.text, "html.parser")
        title_el = soup.find("title")
        title = title_el.get_text(strip=True) if title_el else ""
        text = extract_main_text(soup)

        if len(text) > 200:
            pages.append({"url": url_no_frag, "title": title, "text": text})
            log.info(f"[{fkz}]   + {url_no_frag} ({len(text):,} chars)")

        if depth < MAX_WEBSITE_DEPTH:
            for a in soup.find_all("a", href=True):
                next_url = urljoin(url_no_frag, a["href"]).split("#")[0]
                if next_url not in visited and should_follow(next_url, base_domain):
                    queue.append((next_url, depth + 1))

    WEBSITE_DIR.mkdir(parents=True, exist_ok=True)
    save_json(out_path, pages)
    log.info(f"[{fkz}] Website crawl done: {len(pages)} pages saved")
    return pages


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    setup_logging()

    raw_files = sorted(RAW_DIR.glob("*.json"))
    if not raw_files:
        log.error("No scraped project files found in data/projects_raw/. Run 01_collect.py first.")
        return

    total = len(raw_files)
    log.info(f"Enriching {total} projects — {PDF_WORKERS} parallel PDF workers")

    # ── Collect tasks ───────────────────────────────────────────────────────
    pdf_tasks: list[tuple[str, str]] = []   # (fkz, url)
    website_tasks: list[tuple[str, str]] = []

    for raw_path in raw_files:
        project = load_json(raw_path)
        fkz = project["fkz"]
        report_url = None
        website_url = None
        for source_data in project.get("sources", {}).values():
            if source_data.get("report_url") and not report_url:
                report_url = source_data["report_url"]
            if source_data.get("project_website_url") and not website_url:
                website_url = source_data["project_website_url"]

        if report_url:
            pdf_tasks.append((fkz, report_url))
        if website_url:
            website_tasks.append((fkz, website_url))

    log.info(f"PDF tasks: {len(pdf_tasks)} | Website tasks: {len(website_tasks)}")

    # ── Phase 1: Parallel PDF downloads + extraction ────────────────────────
    log.info(f"Starting PDF phase ({PDF_WORKERS} workers) …")
    completed = 0
    with ThreadPoolExecutor(max_workers=PDF_WORKERS) as executor:
        futures = {executor.submit(process_report, fkz, url): fkz for fkz, url in pdf_tasks}
        for future in as_completed(futures):
            completed += 1
            try:
                msg = future.result()
                if completed % 50 == 0 or completed == len(pdf_tasks):
                    log.info(f"PDF progress: {completed}/{len(pdf_tasks)} — {msg}")
            except Exception as e:
                fkz = futures[future]
                log.error(f"[{fkz}] Unexpected error in PDF worker: {e}")

    log.info(f"PDF phase complete. {completed} tasks processed.")

    # ── Phase 2: Sequential website crawling ────────────────────────────────
    log.info(f"Starting website crawl phase ({len(website_tasks)} sites) …")
    for i, (fkz, url) in enumerate(website_tasks, 1):
        log.info(f"[{i}/{len(website_tasks)}] Website: {fkz}")
        crawl_website(fkz, url)

    log.info("Step 2 complete.")


if __name__ == "__main__":
    main()
