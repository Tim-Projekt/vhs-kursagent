"""Validation of the normalized/processed output.

Checks (per source + global):
  1. completeness      — coverage of critical & useful fields
  2. schema consistency — canonical keys present, types sane, schema_version fixed
  3. normalization      — no leftover HTML, ISO dates, HH:MM times, numeric prices
  4. duplicates         — uid (fatal), guid-in-source, (provider,nummer,start) soft
  5. stable ids         — uid format + determinism, provider assignment
  6. namespace          — one namespace per source, no cross-source collision

Returns a report dict; `ok` is False if any FATAL check fails.
"""

from __future__ import annotations

import re
from collections import Counter, defaultdict

from .models import SCHEMA_VERSION, Course, make_uid

_HTML_RE = re.compile(r"<[a-zA-Z/][^>]*>")
_ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_HHMM = re.compile(r"^\d{2}:\d{2}$")
_UID_RE = re.compile(r"^[A-Za-z0-9_.:-]+:[A-Za-z0-9_.:-]+:[A-Za-z0-9_.:-]+$")

CRITICAL = ["uid", "source_id", "namespace", "guid", "title", "booking_url"]
USEFUL = ["description", "dvv_code", "dvv_bereich", "start_date", "course_number"]


def _pct(n, total):
    return round(100.0 * n / total, 1) if total else 0.0


def validate_source(source_id: str, namespace: str, courses: list[dict], adapter_kind: str) -> dict:
    total = len(courses)
    issues: list[str] = []
    fatal = 0

    # ── 1. completeness ────────────────────────────────────────────────
    coverage = {}
    for f in CRITICAL + USEFUL:
        coverage[f] = _pct(sum(1 for c in courses if _present(c.get(f))), total)
    with_sessions = sum(1 for c in courses if c.get("sessions"))
    with_geo = sum(1 for c in courses if (c.get("venue") or {}).get("lat") is not None)
    with_price = sum(1 for c in courses if (c.get("price") or {}).get("amount") is not None)
    with_city = sum(1 for c in courses if c.get("city"))

    for f in CRITICAL:
        if coverage[f] < 100.0:
            issues.append(f"FATAL completeness: {f} present on {coverage[f]}% (< 100%)")
            fatal += 1

    # ── 2. schema consistency ─────────────────────────────────────────
    canonical_keys = set(Course.__dataclass_fields__.keys())
    key_mismatch = 0
    bad_types = 0
    for c in courses:
        if set(c.keys()) != canonical_keys:
            key_mismatch += 1
        if not isinstance(c.get("keywords"), list) or not isinstance(c.get("sessions"), list):
            bad_types += 1
        if c.get("schema_version") != SCHEMA_VERSION:
            bad_types += 1
    if key_mismatch:
        issues.append(f"FATAL schema: {key_mismatch} records with non-canonical key set")
        fatal += 1
    if bad_types:
        issues.append(f"FATAL schema: {bad_types} records with wrong field types / schema_version")
        fatal += 1

    # ── 3. normalization ─────────────────────────────────────────────
    html_left = sum(1 for c in courses if c.get("description") and _HTML_RE.search(c["description"]))
    bad_dates = sum(
        1 for c in courses for k in ("start_date", "end_date")
        if c.get(k) and not _ISO_DATE.match(str(c[k]))
    )
    bad_times = sum(
        1 for c in courses for k in ("time_start", "time_end")
        if c.get(k) and not _HHMM.match(str(c[k]))
    )
    bad_price = sum(
        1 for c in courses
        if (c.get("price") or {}).get("amount") is not None
        and not isinstance(c["price"]["amount"], (int, float))
    )
    if html_left:
        issues.append(f"WARN normalization: {html_left} descriptions still contain HTML tags")
    if bad_dates:
        issues.append(f"FATAL normalization: {bad_dates} non-ISO date values")
        fatal += 1
    if bad_times:
        issues.append(f"WARN normalization: {bad_times} non-HH:MM time values")
    if bad_price:
        issues.append(f"FATAL normalization: {bad_price} non-numeric price amounts")
        fatal += 1

    # ── 4. duplicates ─────────────────────────────────────────────────
    uid_counts = Counter(c["uid"] for c in courses)
    dup_uid = {u: n for u, n in uid_counts.items() if n > 1}
    guid_counts = Counter(c["guid"] for c in courses)
    dup_guid = {g: n for g, n in guid_counts.items() if n > 1}
    softkey = Counter(
        (c.get("provider", {}).get("id"), c.get("course_number"), c.get("start_date"))
        for c in courses
        if c.get("course_number") and c.get("start_date")
    )
    soft_dupes = sum(n - 1 for n in softkey.values() if n > 1)
    if dup_uid:
        issues.append(f"FATAL duplicates: {len(dup_uid)} uid collisions (e.g. {list(dup_uid)[:3]})")
        fatal += 1
    if dup_guid:
        issues.append(f"WARN duplicates: {len(dup_guid)} guid values repeat within source")
    if soft_dupes:
        issues.append(f"INFO duplicates: {soft_dupes} records share (provider, nummer, start_date)")

    # ── 5. stable ids / provider assignment ─────────────────────────
    bad_uid_fmt = sum(1 for c in courses if not _UID_RE.match(c["uid"]))
    no_provider = sum(1 for c in courses if not (c.get("provider") or {}).get("id"))
    nondeterministic = sum(
        1 for c in courses
        if c["uid"] != make_uid(c["source_id"], c["provider"]["id"], c["guid"])
    )
    if bad_uid_fmt:
        issues.append(f"FATAL ids: {bad_uid_fmt} uids not '<src>:<provider>:<guid>'")
        fatal += 1
    if no_provider:
        issues.append(f"FATAL ids: {no_provider} courses without provider.id")
        fatal += 1
    if nondeterministic:
        issues.append(f"FATAL ids: {nondeterministic} uids not reproducible from parts")
        fatal += 1
    providers = sorted({c["provider"]["id"] for c in courses})

    # ── 6. namespace ────────────────────────────────────────────────
    ns_values = sorted({c["namespace"] for c in courses})
    if ns_values != [namespace]:
        issues.append(f"FATAL namespace: expected only {namespace!r}, found {ns_values}")
        fatal += 1
    src_values = sorted({c["source_id"] for c in courses})
    if src_values != [source_id]:
        issues.append(f"FATAL namespace: mixed source_id values {src_values}")
        fatal += 1

    # ── dvv distribution (data-driven label suggestion aid) ─────────
    dvv_top = Counter(c.get("dvv_code") for c in courses if c.get("dvv_code")).most_common(10)
    unresolved_dvv = sorted({
        c["dvv_code"] for c in courses
        if c.get("dvv_code") and not c.get("dvv_label")
    })
    fmt_dist = Counter(c.get("course_format") for c in courses)
    status_dist = Counter(c.get("status") for c in courses)

    return {
        "source_id": source_id,
        "namespace": namespace,
        "adapter": adapter_kind,
        "total_courses": total,
        "ok": fatal == 0,
        "fatal_count": fatal,
        "issues": issues,
        "coverage_pct": coverage,
        "extra_coverage": {
            "with_sessions_pct": _pct(with_sessions, total),
            "with_geo_pct": _pct(with_geo, total),
            "with_price_pct": _pct(with_price, total),
            "with_city_pct": _pct(with_city, total),
        },
        "duplicates": {
            "uid_collisions": len(dup_uid),
            "guid_repeats_in_source": len(dup_guid),
            "soft_dupes_provider_nummer_start": soft_dupes,
        },
        "providers": providers,
        "provider_count": len(providers),
        "dvv_top10": dvv_top,
        "dvv_codes_without_label": unresolved_dvv,
        "format_distribution": dict(fmt_dist),
        "status_distribution": dict(status_dist),
    }


def validate_global(reports: list[dict]) -> dict:
    ns_map = defaultdict(set)
    for r in reports:
        ns_map[r["namespace"]].add(r["source_id"])
    collisions = {ns: sorted(s) for ns, s in ns_map.items() if len(s) > 1}
    all_uid_prefixes = Counter(r["source_id"] for r in reports)
    return {
        "sources": len(reports),
        "total_courses": sum(r["total_courses"] for r in reports),
        "all_ok": all(r["ok"] for r in reports) and not collisions,
        "namespace_collisions": collisions,
        "source_id_duplicates": {k: v for k, v in all_uid_prefixes.items() if v > 1},
    }


def _present(v) -> bool:
    if v is None:
        return False
    if isinstance(v, str):
        return v.strip() != ""
    if isinstance(v, (list, dict)):
        return len(v) > 0
    return True
