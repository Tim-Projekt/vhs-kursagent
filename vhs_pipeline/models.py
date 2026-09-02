"""Canonical, source-agnostic course model for the bundesweite VHS pipeline.

Every source adapter must emit `Course` objects. The RAG pipeline (embeddings,
vector import, retrieval) only ever sees this shape — never a source's raw feed.

Design goals:
- one flat record per course (1 embedding chunk per course later)
- stable, globally unique `uid` that encodes source + provider + local id
- explicit `namespace` for per-source isolation in the vector store
- `content_hash` for incremental re-embedding / deletion on the next run
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timezone

SCHEMA_VERSION = "vhs-canonical-1"


# ── value objects ────────────────────────────────────────────────────────────

@dataclass
class Provider:
    id: str            # stable id of the VHS / data provider inside the source
    name: str | None = None
    region: str | None = None   # Bezirk (Berlin) / Bundesland / Landkreis


@dataclass
class Session:
    date: str | None = None          # ISO yyyy-mm-dd
    start: str | None = None         # HH:MM
    end: str | None = None           # HH:MM
    weekday: str | None = None


@dataclass
class Venue:
    name: str | None = None
    street: str | None = None
    zip: str | None = None
    city: str | None = None
    district: str | None = None      # Ortsteil / Bezirk
    room: str | None = None
    country: str | None = "Deutschland"
    accessible: bool | None = None
    lat: float | None = None
    lon: float | None = None
    online: bool = False


@dataclass
class Price:
    amount: float | None = None
    reduced: float | None = None
    discount_possible: bool | None = None
    notes: list[str] = field(default_factory=list)
    free: bool = False


@dataclass
class Capacity:
    min: int | None = None
    current: int | None = None       # -1 / None => unknown
    max: int | None = None


@dataclass
class Course:
    # ── identity / routing ──────────────────────────────────────────────
    uid: str                          # f"{source_id}:{provider.id}:{guid}"
    source_id: str
    namespace: str                    # e.g. "vhs/berlin"
    provider: Provider
    guid: str                         # source-local course guid
    course_number: str | None = None  # human "Kursnummer" (not globally unique)

    # ── descriptive ─────────────────────────────────────────────────────
    title: str = ""
    subtitle: str | None = None
    description: str = ""              # HTML-stripped, joined
    additional_info: str | None = None
    description_html: str | None = None  # raw, kept for the frontend if needed

    # ── classification ──────────────────────────────────────────────────
    dvv_code: str | None = None
    dvv_version: str | None = None
    dvv_bereich: str | None = None    # top-level DVV programme area (filled from lookup)
    dvv_label: str | None = None      # fine-grained DVV label (filled from lookup)
    event_type: str | None = None     # Berlin "veranstaltungsart"; None where absent
    level: str | None = None          # "A1", "B1.2", "Einsteiger", ...
    course_format: str = "praesenz"   # praesenz | online | blended | selbstlern
    keywords: list[str] = field(default_factory=list)
    target_groups: list[str] = field(default_factory=list)
    certificates: list[str] = field(default_factory=list)
    instructors: list[str] = field(default_factory=list)

    # ── schedule ────────────────────────────────────────────────────────
    start_date: str | None = None
    end_date: str | None = None
    session_count: int | None = None
    duration_units: float | None = None   # "dauer" in Unterrichtseinheiten
    weekdays: list[str] = field(default_factory=list)
    time_start: str | None = None
    time_end: str | None = None
    sessions: list[Session] = field(default_factory=list)

    # ── place ───────────────────────────────────────────────────────────
    venue: Venue = field(default_factory=Venue)
    city: str | None = None
    postal_code: str | None = None
    region: str | None = None          # Bezirk (Berlin) / Ort / Landkreis

    # ── commercial ──────────────────────────────────────────────────────
    price: Price = field(default_factory=Price)
    capacity: Capacity = field(default_factory=Capacity)
    status: str = "unknown"            # available | full | unknown

    # ── links / contact ────────────────────────────────────────────────
    booking_url: str | None = None
    mobile_url: str | None = None
    attachments: list[dict] = field(default_factory=list)   # {name, uri, typ}
    contact_email: str | None = None
    contact_phone: str | None = None
    contact_url: str | None = None

    # ── housekeeping ───────────────────────────────────────────────────
    semester: str | None = None
    schema_version: str = SCHEMA_VERSION
    source_updated_at: str | None = None
    fetched_at: str | None = None
    content_hash: str | None = None

    # ── derived / serialisation ───────────────────────────────────────
    def compute_hash(self) -> str:
        payload = {
            "title": self.title,
            "subtitle": self.subtitle,
            "description": self.description,
            "additional_info": self.additional_info,
            "dvv_code": self.dvv_code,
            "level": self.level,
            "course_format": self.course_format,
            "keywords": sorted(self.keywords),
            "start_date": self.start_date,
            "end_date": self.end_date,
            "sessions": [asdict(s) for s in self.sessions],
            "venue": asdict(self.venue),
            "price": asdict(self.price),
            "capacity": asdict(self.capacity),
            "status": self.status,
            "booking_url": self.booking_url,
        }
        blob = json.dumps(payload, ensure_ascii=False, sort_keys=True)
        return hashlib.sha1(blob.encode("utf-8")).hexdigest()

    def finalize(self) -> "Course":
        if not self.fetched_at:
            self.fetched_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        # derive semester from course number suffix (…H / …F) or start month
        if not self.semester:
            self.semester = derive_semester(self.course_number, self.start_date)
        # derive status
        self.status = derive_status(self.capacity)
        # mirror geography
        self.city = self.city or self.venue.city
        self.postal_code = self.postal_code or self.venue.zip
        self.region = self.region or self.provider.region or self.venue.city
        self.content_hash = self.compute_hash()
        return self

    def to_dict(self) -> dict:
        d = asdict(self)
        return d


# ── helpers ─────────────────────────────────────────────────────────────────

def derive_status(cap: Capacity) -> str:
    cur, mx = cap.current, cap.max
    if cur is None or cur < 0:
        return "unknown"
    if mx and cur >= mx:
        return "full"
    return "available"


_SEM_RE = re.compile(r"([HF])\d*$")


def derive_semester(course_number: str | None, start_date: str | None) -> str | None:
    if course_number:
        m = _SEM_RE.search(course_number.strip())
        if m and start_date:
            year = start_date[:4]
            return f"{m.group(1)}{year}"
        if m:
            return m.group(1)
    if start_date and len(start_date) >= 7:
        year, month = start_date[:4], int(start_date[5:7])
        return f"{'F' if 1 <= month <= 6 else 'H'}{year}"
    return None


def make_uid(source_id: str, provider_id: str, guid: str) -> str:
    def norm(x: str) -> str:
        return re.sub(r"[^A-Za-z0-9_.:-]", "_", str(x)).strip("_") or "x"
    return f"{norm(source_id)}:{norm(provider_id)}:{norm(guid)}"
