"""
FNR Pipeline – Orchestrator
Run all steps in sequence:
  01_collect.py  → Discover FKZs + scrape project pages
  02_enrich.py   → Download reports + crawl websites
  03_export.py   → Deduplicate, normalize, export JSON
"""

import importlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from utils import setup_logging

STEPS = ["01_collect", "02_enrich", "03_export"]


def run_step(module_name: str):
    print(f"\n{'='*60}")
    print(f"  Running {module_name} …")
    print(f"{'='*60}\n")
    mod = importlib.import_module(module_name)
    mod.main()


if __name__ == "__main__":
    setup_logging()

    # Allow running a single step: python run.py 01
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        matches = [s for s in STEPS if s.startswith(arg)]
        if not matches:
            print(f"Unknown step '{arg}'. Available: {STEPS}")
            sys.exit(1)
        for step in matches:
            run_step(step)
    else:
        for step in STEPS:
            run_step(step)

    print("\nPipeline complete.")
