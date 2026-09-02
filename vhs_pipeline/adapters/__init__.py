"""Adapter registry. `kind` in sources.yaml -> adapter class."""

from __future__ import annotations

from .base import SourceAdapter
from .berlin import BerlinOpenDataAdapter
from .openvhs import OpenVhsXmlAdapter

ADAPTERS: dict[str, type[SourceAdapter]] = {
    OpenVhsXmlAdapter.kind: OpenVhsXmlAdapter,   # "openvhs"
    BerlinOpenDataAdapter.kind: BerlinOpenDataAdapter,  # "berlin"
}


def build_adapter(config: dict) -> SourceAdapter:
    kind = config.get("kind")
    if kind not in ADAPTERS:
        raise KeyError(f"unknown adapter kind {kind!r}; known: {sorted(ADAPTERS)}")
    return ADAPTERS[kind](config)


__all__ = ["ADAPTERS", "SourceAdapter", "build_adapter"]
