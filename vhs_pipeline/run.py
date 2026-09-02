"""VHS pipeline orchestrator — fetch -> parse (adapter) -> normalize -> validate.

    python -m vhs_pipeline.run                     # all enabled sources
    python -m vhs_pipeline.run --only berlin       # one source
    python -m vhs_pipeline.run --no-fetch          # reuse newest data/raw snapshot
    python -m vhs_pipeline.run --limit 200         # cap courses/source (dev)

Output (data/processed/):
    <source_id>.jsonl              one canonical Course per line
    <source_id>.validation.json   per-source validation report
    _manifest.json                run manifest (all sources)
    _validation.json              global validation summary

Embeddings / vector import are intentionally NOT part of this step.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from .adapters import build_adapter
from .enrich import enrich
from .registry import load_sources
from .utils import save_json, save_jsonl, setup_logging
from .validate import validate_global, validate_source

log = logging.getLogger("vhs_pipeline")

ROOT = Path(__file__).resolve().parent
RAW_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "data" / "processed"


def _newest_snapshot(source_id: str) -> Path | None:
    cands = sorted(RAW_DIR.glob(f"{source_id}_*.*"))
    return cands[-1] if cands else None


def run_source(cfg: dict, *, no_fetch: bool, limit: int | None, out_dir: Path) -> dict:
    sid = cfg["id"]
    t0 = time.time()
    adapter = build_adapter(cfg)

    # ── acquire ───────────────────────────────────────────────────────
    snap_path = None
    if no_fetch and not cfg.get("local_path"):
        snap_path = _newest_snapshot(sid)
        if not snap_path:
            raise FileNotFoundError(f"[{sid}] --no-fetch but no snapshot in {RAW_DIR}")
        raw = snap_path.read_bytes()
        log.info("[%s] reusing snapshot %s (%d bytes)", sid, snap_path.name, len(raw))
    else:
        raw = adapter.fetch()
        snap_path = adapter.snapshot(raw)

    src_updated = adapter.source_updated_at(raw)
    fetched_at = datetime.now(timezone.utc).isoformat(timespec="seconds")

    # ── parse + normalize ────────────────────────────────────────────
    courses: list[dict] = []
    n_raw = n_skipped = 0
    for rec in adapter.iter_raw(raw):
        n_raw += 1
        try:
            course = adapter.to_course(rec)
        except Exception as e:  # noqa: BLE001 - keep the run going, log the record
            n_skipped += 1
            log.warning("[%s] map error on guid=%s: %s", sid, rec.get("guid"), e)
            continue
        if course is None:
            n_skipped += 1
            continue
        enrich(course)
        course.source_updated_at = src_updated
        course.fetched_at = fetched_at
        courses.append(course.to_dict())
        if limit and len(courses) >= limit:
            break

    # ── write processed ─────────────────────────────────────────────
    out_path = out_dir / f"{sid}.jsonl"
    save_jsonl(out_path, courses)

    # ── validate ────────────────────────────────────────────────────
    report = validate_source(sid, cfg["namespace"], courses, adapter.kind)
    save_json(out_dir / f"{sid}.validation.json", report)

    report["_timing_s"] = round(time.time() - t0, 1)
    report["_raw_records"] = n_raw
    report["_skipped"] = n_skipped
    report["_snapshot"] = snap_path.name if snap_path else None
    report["_source_updated_at"] = src_updated
    report["_output"] = str(out_path.relative_to(ROOT))
    return report


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="VHS bundesweite Datenpipeline (bis processed output)")
    ap.add_argument("--only", help="comma-separated source ids (overrides 'enabled')")
    ap.add_argument("--registry", help="path to sources.yaml")
    ap.add_argument("--no-fetch", action="store_true", help="reuse newest data/raw snapshot")
    ap.add_argument("--limit", type=int, help="cap courses per source (dev)")
    ap.add_argument("--out", default=str(OUT_DIR), help="processed output dir")
    args = ap.parse_args(argv)

    setup_logging()
    only = [s.strip() for s in args.only.split(",")] if args.only else None
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    sources = load_sources(args.registry, only=only)
    if not sources:
        log.error("no sources selected (enabled=false everywhere? wrong --only?)")
        return 2
    log.info("running %d source(s): %s", len(sources), ", ".join(s["id"] for s in sources))

    reports = []
    for cfg in sources:
        try:
            reports.append(run_source(cfg, no_fetch=args.no_fetch, limit=args.limit, out_dir=out_dir))
        except Exception as e:  # noqa: BLE001
            log.exception("[%s] FAILED: %s", cfg["id"], e)
            reports.append({"source_id": cfg["id"], "namespace": cfg["namespace"], "ok": False,
                            "fatal_count": 1, "issues": [f"FATAL run error: {e}"], "total_courses": 0})

    glob = validate_global(reports)
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "global": glob,
        "sources": [
            {k: r.get(k) for k in (
                "source_id", "namespace", "adapter", "total_courses", "ok", "fatal_count",
                "provider_count", "_raw_records", "_skipped", "_snapshot",
                "_source_updated_at", "_timing_s", "_output",
            )}
            for r in reports
        ],
    }
    save_json(out_dir / "_manifest.json", manifest)
    save_json(out_dir / "_validation.json", {"global": glob, "reports": reports})

    _print_summary(reports, glob)
    return 0 if glob["all_ok"] else 1


def _print_summary(reports: list[dict], glob: dict) -> None:
    print("\n" + "=" * 78)
    print(f"{'source':<18}{'ns':<16}{'courses':>9}{'prov':>6}{'skip':>6}{'ok':>5}")
    print("-" * 78)
    for r in reports:
        print(f"{r.get('source_id',''):<18}{r.get('namespace',''):<16}"
              f"{r.get('total_courses',0):>9}{r.get('provider_count',0):>6}"
              f"{r.get('_skipped',0):>6}{'yes' if r.get('ok') else 'NO':>5}")
    print("-" * 78)
    print(f"{'TOTAL':<34}{glob['total_courses']:>9}   sources={glob['sources']}  "
          f"all_ok={glob['all_ok']}")
    if glob["namespace_collisions"]:
        print(f"  !! namespace collisions: {glob['namespace_collisions']}")
    print("=" * 78)
    for r in reports:
        if r.get("issues"):
            print(f"\n[{r['source_id']}] {len(r['issues'])} issue(s):")
            for i in r["issues"]:
                print(f"   - {i}")
            if r.get("dvv_codes_without_label"):
                print(f"   · dvv codes w/o fine label: {r['dvv_codes_without_label']}")


if __name__ == "__main__":
    sys.exit(main())
