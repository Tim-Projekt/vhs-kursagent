"""Load the source registry (sources.yaml)."""

from __future__ import annotations

from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent
DEFAULT_REGISTRY = ROOT / "sources.yaml"


def load_sources(path: Path | str | None = None, only: list[str] | None = None) -> list[dict]:
    path = Path(path) if path else DEFAULT_REGISTRY
    doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    sources = doc.get("sources", [])
    out = []
    for s in sources:
        if only and s["id"] not in only:
            continue
        if not only and not s.get("enabled", False):
            continue
        s.setdefault("encoding", "utf-8")
        # resolve local_path relative to repo root (registry lives one level down)
        if s.get("local_path"):
            lp = Path(s["local_path"])
            s["local_path"] = str(lp if lp.is_absolute() else ROOT.parent / lp)
        out.append(s)
    return out
