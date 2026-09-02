"""Cross-source enrichment applied after adapter mapping.

Currently: resolve the DVV programme area + fine label from `dvv_code`.
Top level (first digit) is always resolvable; fine label may be absent.
"""

from __future__ import annotations

import json
from pathlib import Path

from .models import Course

_LOOKUP = json.loads((Path(__file__).resolve().parent / "dvv_systematik.json").read_text(encoding="utf-8"))
_BEREICHE: dict[str, str] = _LOOKUP["programmbereiche"]
_FEIN: dict[str, dict] = _LOOKUP["feincodes"]


def enrich_dvv(course: Course) -> Course:
    code = (course.dvv_code or "").strip()
    if not code:
        return course
    top = code.split(".")[0]
    course.dvv_bereich = _BEREICHE.get(top)
    fine = _FEIN.get(code)
    if fine:
        course.dvv_label = fine.get("label")
    elif code.endswith(".00") and course.dvv_bereich:
        course.dvv_label = f"{course.dvv_bereich} – allgemein"
    elif course.dvv_bereich:
        course.dvv_label = course.dvv_bereich  # graceful fallback
    return course


def enrich(course: Course) -> Course:
    return enrich_dvv(course)
