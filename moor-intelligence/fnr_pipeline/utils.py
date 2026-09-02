"""Shared HTTP client and file helpers for the FNR pipeline."""

import json
import logging
import threading
import time
from pathlib import Path

import requests

log = logging.getLogger(__name__)

RATE_LIMIT = 1.5  # seconds between requests (per logical slot)
REQUEST_TIMEOUT = 30
MAX_RETRIES = 3

_session = requests.Session()
_session.headers.update({
    "User-Agent": "Mozilla/5.0 (FNR Research Pipeline; academic use)"
})
_last_request_time = 0.0
_rate_lock = threading.Lock()  # thread-safe rate limiting


def fetch(url: str, params: dict = None, stream: bool = False, timeout: int = REQUEST_TIMEOUT) -> requests.Response | None:
    """Rate-limited GET with retry. Thread-safe. Returns Response or None on failure."""
    global _last_request_time

    with _rate_lock:
        wait = RATE_LIMIT - (time.time() - _last_request_time)
        if wait > 0:
            time.sleep(wait)
        _last_request_time = time.time()

    for attempt in range(MAX_RETRIES):
        try:
            resp = _session.get(url, params=params, timeout=timeout, stream=stream)
            resp.raise_for_status()
            return resp
        except requests.RequestException as e:
            if attempt < MAX_RETRIES - 1:
                backoff = 2 ** attempt * 3
                log.warning(f"Attempt {attempt + 1} failed for {url}: {e}. Retrying in {backoff}s")
                time.sleep(backoff)
            else:
                log.error(f"All retries failed for {url}: {e}")
                return None


def load_json(path: Path) -> dict | list | None:
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return None


def save_json(path: Path, data: dict | list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler("pipeline.log", encoding="utf-8"),
        ],
    )
