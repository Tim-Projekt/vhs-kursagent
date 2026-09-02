"""Shared HTTP client, IO and text helpers for the VHS pipeline.

Adapted from Moor Intelligence `fnr_pipeline/utils.py` (rate-limited fetch with
retry, JSON IO, logging) — extended with byte/text fetch and HTML cleaning.
"""

from __future__ import annotations

import html as _html
import json
import logging
import re
import threading
import time
from pathlib import Path

import requests

log = logging.getLogger(__name__)

RATE_LIMIT = 1.0          # seconds between requests (per logical slot)
REQUEST_TIMEOUT = 60
MAX_RETRIES = 3

_session = requests.Session()
_session.headers.update(
    {"User-Agent": "VHS-Kurs-Agent Pipeline (bundesweiter vhs-Kursfinder; +kontakt)"}
)
_last_request_time = 0.0
_rate_lock = threading.Lock()


def fetch(
    url: str,
    params: dict | None = None,
    stream: bool = False,
    timeout: int = REQUEST_TIMEOUT,
    headers: dict | None = None,
) -> requests.Response | None:
    """Rate-limited GET with retry/backoff. Thread-safe. None on failure."""
    global _last_request_time

    with _rate_lock:
        wait = RATE_LIMIT - (time.time() - _last_request_time)
        if wait > 0:
            time.sleep(wait)
        _last_request_time = time.time()

    for attempt in range(MAX_RETRIES):
        try:
            resp = _session.get(
                url, params=params, timeout=timeout, stream=stream, headers=headers
            )
            resp.raise_for_status()
            return resp
        except requests.RequestException as e:
            if attempt < MAX_RETRIES - 1:
                backoff = 2**attempt * 3
                log.warning("Attempt %s failed for %s: %s. Retry in %ss", attempt + 1, url, e, backoff)
                time.sleep(backoff)
            else:
                log.error("All retries failed for %s: %s", url, e)
                return None


def fetch_bytes(url: str, timeout: int = REQUEST_TIMEOUT) -> bytes | None:
    resp = fetch(url, timeout=timeout)
    return resp.content if resp is not None else None


def fetch_text(url: str, encoding: str | None = None, timeout: int = REQUEST_TIMEOUT) -> str | None:
    resp = fetch(url, timeout=timeout)
    if resp is None:
        return None
    if encoding:
        return resp.content.decode(encoding, errors="replace")
    return resp.text


def load_json(path: Path) -> dict | list | None:
    p = Path(path)
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return None


def save_json(path: Path, data) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def save_jsonl(path: Path, rows) -> int:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    n = 0
    with p.open("w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False))
            fh.write("\n")
            n += 1
    return n


def iter_jsonl(path: Path):
    with Path(path).open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                yield json.loads(line)


def setup_logging(level: int = logging.INFO) -> None:
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[logging.StreamHandler()],
    )


# ── Text helpers ─────────────────────────────────────────────────────────────

_TAG_RE = re.compile(r"<[^>]+>")
_BR_RE = re.compile(r"(?i)<\s*br\s*/?\s*>|</\s*p\s*>|</\s*li\s*>|</\s*div\s*>")
_WS_RE = re.compile(r"[ \t ]+")
_NL_RE = re.compile(r"\n{3,}")


def strip_html(value: str | None) -> str | None:
    """Remove HTML markup, keep paragraph breaks, normalise whitespace."""
    if not value:
        return None
    text = value.replace("\r\n", "\n").replace("\r", "\n")
    text = _BR_RE.sub("\n", text)
    text = _TAG_RE.sub("", text)
    text = _html.unescape(text)
    text = _WS_RE.sub(" ", text)
    text = _NL_RE.sub("\n\n", text)
    text = "\n".join(ln.strip() for ln in text.split("\n"))
    return text.strip() or None


def as_list(value) -> list:
    """Open-vhs / Berlin fields are 'object OR array' depending on cardinality."""
    if value is None:
        return []
    if isinstance(value, list):
        return [v for v in value if v is not None]
    return [value]


def to_decimal(value) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().replace("€", "").replace("EUR", "").strip()
    s = s.replace(".", "") if s.count(",") == 1 and s.count(".") >= 1 else s
    s = s.replace(",", ".")
    m = re.search(r"-?\d+(?:\.\d+)?", s)
    return float(m.group(0)) if m else None


def to_int(value) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(str(value).strip())
    except ValueError:
        m = re.search(r"-?\d+", str(value))
        return int(m.group(0)) if m else None


def clean_str(value) -> str | None:
    if value is None:
        return None
    s = _WS_RE.sub(" ", str(value)).strip()
    return s or None
