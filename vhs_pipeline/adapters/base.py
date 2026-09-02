"""SourceAdapter contract.

A source = one data feed (a city's open-data export, a provider's Open-vhs XML,
a national push-DB dump, …). Every adapter does exactly three things:

    fetch()      -> raw payload (bytes)               [+ snapshot to data/raw/]
    iter_raw()   -> yields raw per-course dicts
    to_course()  -> maps one raw dict -> canonical Course

`run.py` drives all adapters identically. Adding a VHS = a registry entry
(if it speaks Open-vhs) or a ~40-line subclass (if it is bespoke).
"""

from __future__ import annotations

import abc
import logging
from collections.abc import Iterator
from datetime import datetime, timezone
from pathlib import Path

from ..models import Course
from ..utils import fetch_bytes

log = logging.getLogger(__name__)

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"


class SourceAdapter(abc.ABC):
    #: registry key, e.g. "openvhs" or "berlin"
    kind: str = "abstract"

    def __init__(self, config: dict):
        self.config = config
        self.source_id: str = config["id"]
        self.namespace: str = config["namespace"]
        self.url: str = config.get("url", "")
        self.default_provider_id: str = config.get("provider_id", self.source_id)
        self.default_provider_name: str | None = config.get("provider_name")
        self.snapshot_ext: str = "bin"

    # ── acquisition ────────────────────────────────────────────────────
    def fetch(self) -> bytes:
        """Download the feed. Override for non-HTTP or multi-file sources."""
        local = self.config.get("local_path")
        if local:
            data = Path(local).read_bytes()
            log.info("[%s] read local feed %s (%d bytes)", self.source_id, local, len(data))
            return data
        if not self.url:
            raise ValueError(f"[{self.source_id}] no url and no local_path configured")
        data = fetch_bytes(self.url, timeout=self.config.get("timeout", 120))
        if data is None:
            raise RuntimeError(f"[{self.source_id}] fetch failed: {self.url}")
        log.info("[%s] fetched %s (%d bytes)", self.source_id, self.url, len(data))
        return data

    def snapshot(self, raw: bytes) -> Path:
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        path = RAW_DIR / f"{self.source_id}_{stamp}.{self.snapshot_ext}"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)
        log.info("[%s] snapshot -> %s", self.source_id, path.name)
        return path

    # ── parsing ───────────────────────────────────────────────────────
    @abc.abstractmethod
    def iter_raw(self, raw: bytes) -> Iterator[dict]:
        """Yield one raw dict per course (source's own shape)."""

    @abc.abstractmethod
    def to_course(self, rec: dict) -> Course | None:
        """Map one raw dict to a canonical Course (or None to skip)."""

    # ── source-level metadata for the manifest ────────────────────────
    def source_updated_at(self, raw: bytes) -> str | None:
        return None
