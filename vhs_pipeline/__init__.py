"""Bundesweite VHS-Kursdaten-Pipeline (modulare Source-Adapter -> kanonisches Modell).

Reuse-Herkunft: Struktur & Helfer aus Moor Intelligence `fnr_pipeline/`
(rate-limited fetch/retry, JSON-IO, Chunk-/Truncate-Denke, Resume via content_hash).
"""

__all__ = ["adapters", "models", "registry", "enrich", "validate", "run", "utils"]
