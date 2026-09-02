"""Berlin adapter — Servicezentrum der Berliner Volkshochschulen Open Data.

Feed: https://www.vhsit.berlin.de/VHSKURSE/OpenData/Kurse.json  (CC-BY, hourly)

Berlin publishes an Open-vhs-*dialect* as JSON: same vocabulary as the canonical
XML (guid, nummer, dvv_kategorie, preis, webadresse, merkmale …) plus Berlin
extensions — `bezirk`, `veranstaltungsart`, `anmeldung`, `ansprechperson`,
`dozent` (dropped in Open-vhs 1.2), and a nested `ortetermine{adresse[],termin[]}`
wrapper instead of flat `veranstaltungsort` + repeated `termin`. Addresses carry
`raum`, `behindertenzugang`, `breitengrad`/`laengengrad`.

Each of the 12 Bezirks-VHS (+ Servicezentrum) is modelled as its own `Provider`
so downstream code can group/filter by VHS while everything stays in the single
`vhs/berlin` namespace.
"""

from __future__ import annotations

import json
import logging
import re
from collections.abc import Iterator

from ..models import (
    Capacity,
    Course,
    Price,
    Provider,
    Session,
    Venue,
    make_uid,
)
from ..utils import as_list, clean_str, strip_html, to_decimal, to_int
from .base import SourceAdapter
from .openvhs import _bool, _dedup_sessions, _hhmm, _mode, _reduced_from_notes

log = logging.getLogger(__name__)

_FORMAT_MAP = {"online_angebot": "online", "blended_learning": "blended", "selbstlernangebot": "selbstlern"}
_ONLINE_KW = {"online-kurs", "onlinekurs", "online learning", "vhs.cloud", "webinar", "elearning", "szenario_online"}


def _slug(value: str) -> str:
    s = (value or "").lower()
    s = s.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "unbekannt"


class BerlinOpenDataAdapter(SourceAdapter):
    kind = "berlin"

    def __init__(self, config: dict):
        super().__init__(config)
        self.snapshot_ext = "json"
        self._doc: dict | None = None

    # ── parse ─────────────────────────────────────────────────────────
    def _load(self, raw: bytes) -> dict:
        if self._doc is None:
            self._doc = json.loads(raw.decode(self.config.get("encoding", "utf-8")))
        return self._doc

    def iter_raw(self, raw: bytes) -> Iterator[dict]:
        doc = self._load(raw)
        container = (doc or {}).get("veranstaltungen") or {}
        for rec in as_list(container.get("veranstaltung")):
            if isinstance(rec, dict) and rec.get("guid"):
                yield rec

    def _provider(self, bezirk: str | None) -> Provider:
        b = clean_str(bezirk) or "Berlin"
        return Provider(id=f"berlin-{_slug(b)}", name=f"VHS {b}", region=b)

    # ── map ───────────────────────────────────────────────────────────
    def to_course(self, rec: dict) -> Course | None:
        guid = clean_str(rec.get("guid"))
        if not guid:
            return None
        bezirk = clean_str(rec.get("bezirk"))
        prov = self._provider(bezirk)

        # dvv
        dvv = rec.get("dvv_kategorie")
        dvv_code = dvv_version = None
        if isinstance(dvv, dict):
            dvv_code = clean_str(dvv.get("#text"))
            dvv_version = clean_str(dvv.get("@version"))
        elif isinstance(dvv, str):
            dvv_code = clean_str(dvv)

        # merkmale
        merkmale: dict[str, list[str]] = {}
        mk = rec.get("merkmale")
        if isinstance(mk, dict):
            for m in as_list(mk.get("merkmal")):
                if isinstance(m, dict) and m.get("name"):
                    merkmale.setdefault(str(m["name"]), []).append(str(m.get("wert")))

        keywords = [k for k in (clean_str(x) for x in as_list(rec.get("schlagwort"))) if k]
        course_format = "praesenz"
        for w in merkmale.get("kursart_digital", []):
            course_format = _FORMAT_MAP.get(w, course_format)
        if course_format == "praesenz" and any(k.lower() in _ONLINE_KW for k in keywords):
            course_format = "online"

        # text: Berlin uses eigenschaft "Beschreibung" / "Zusatzinformation"
        desc_parts, add_parts, html_parts = [], [], []
        for t in as_list(rec.get("text")):
            if not isinstance(t, dict) or not t.get("text"):
                continue
            prop = (clean_str(t.get("eigenschaft")) or "").lower()
            html_parts.append(str(t["text"]))
            (add_parts if prop.startswith("zusatz") or prop.startswith("hinweis") else desc_parts).append(
                strip_html(str(t["text"])) or ""
            )

        # ortetermine -> sessions + venues
        ot = rec.get("ortetermine") or {}
        addresses = as_list(ot.get("adresse")) if isinstance(ot, dict) else []
        termine = as_list(ot.get("termin")) if isinstance(ot, dict) else []
        sessions = [
            Session(
                date=clean_str(t.get("beginn_datum")),
                start=_hhmm(t.get("beginn_uhrzeit")),
                end=_hhmm(t.get("ende_uhrzeit")),
                weekday=_wd(clean_str(t.get("wochentag"))),
            )
            for t in termine
            if isinstance(t, dict)
        ]
        sessions = _dedup_sessions(sessions)
        venue = self._primary_venue(addresses, course_format)
        weekdays = sorted({s.weekday for s in sessions if s.weekday})
        time_start = _mode([s.start for s in sessions if s.start])
        time_end = _mode([s.end for s in sessions if s.end])

        # price
        pr = rec.get("preis") or {}
        notes = [n for n in (clean_str(x) for x in as_list(pr.get("zusatz"))) if n]
        amount = to_decimal(pr.get("betrag"))
        price = Price(
            amount=amount,
            reduced=_reduced_from_notes(notes),
            discount_possible=_bool(pr.get("rabatt_moeglich")),
            notes=notes,
            free=(amount == 0.0),
        )

        cap = Capacity(
            min=to_int(rec.get("minimale_teilnehmerzahl")),
            current=to_int(rec.get("aktuelle_teilnehmerzahl")),
            max=to_int(rec.get("maximale_teilnehmerzahl")),
        )

        # instructors: dozent obj|list
        instructors = []
        for d in as_list(rec.get("dozent")):
            if isinstance(d, dict):
                nm = " ".join(x for x in [clean_str(d.get("vorname")), clean_str(d.get("name"))] if x)
                if nm:
                    instructors.append(nm)

        anm = rec.get("anmeldung") or {}
        web = rec.get("webadresse") or {}
        booking_url = clean_str(web.get("uri")) if isinstance(web, dict) else None
        if not booking_url:
            booking_url = f"https://www.vhsit.berlin.de/VHSKURSE/BusinessPages/CourseDetail.aspx?id={guid}"

        course = Course(
            uid=make_uid(self.source_id, prov.id, guid),
            source_id=self.source_id,
            namespace=self.namespace,
            provider=prov,
            guid=str(guid),
            course_number=clean_str(rec.get("nummer")),
            title=clean_str(rec.get("name")) or "",
            subtitle=clean_str(rec.get("untertitel")),
            description="\n\n".join(p for p in desc_parts if p).strip(),
            additional_info="\n\n".join(p for p in add_parts if p).strip() or None,
            description_html="\n\n".join(html_parts) or None,
            dvv_code=dvv_code,
            dvv_version=dvv_version,
            event_type=clean_str(rec.get("veranstaltungsart")),
            level=None,
            course_format=course_format,
            keywords=keywords,
            target_groups=[k for k in (clean_str(x) for x in as_list(rec.get("zielgruppe"))) if k],
            certificates=[],
            instructors=instructors,
            start_date=clean_str(rec.get("beginn_datum")),
            end_date=clean_str(rec.get("ende_datum")),
            session_count=to_int(rec.get("anzahl_termine")) or (len(sessions) or None),
            duration_units=None,
            weekdays=weekdays,
            time_start=time_start,
            time_end=time_end,
            sessions=sessions,
            venue=venue,
            price=price,
            capacity=cap,
            booking_url=booking_url,
            mobile_url=None,
            attachments=[],
            contact_email=clean_str(anm.get("mail")),
            contact_phone=clean_str(anm.get("telefon")),
            contact_url=clean_str(anm.get("link")),
        )
        course.region = bezirk
        return course.finalize()

    def _primary_venue(self, addresses: list, course_format: str) -> Venue:
        for a in addresses:
            if not isinstance(a, dict):
                continue
            city = clean_str(a.get("ort"))
            name = clean_str(a.get("lehrstaette"))
            street = clean_str(a.get("strasse"))
            online = (course_format in ("online", "selbstlern")) or (name or "").lower() in ("online", "onlinekurs") or street == "Online"
            return Venue(
                name=name,
                street=None if street == "Online" else street,
                zip=clean_str(a.get("plz")),
                city=city or ("Berlin" if not online else None),
                room=clean_str(a.get("raum")),
                district=None,
                country="Deutschland",
                accessible=_bool(a.get("behindertenzugang")),
                lat=to_decimal(a.get("breitengrad")),
                lon=to_decimal(a.get("laengengrad")),
                online=bool(online),
            )
        return Venue(city="Berlin", online=(course_format != "praesenz"))


_WD = {
    "montag": "Mo", "dienstag": "Di", "mittwoch": "Mi", "donnerstag": "Do",
    "freitag": "Fr", "samstag": "Sa", "sonnabend": "Sa", "sonntag": "So",
}


def _wd(value: str | None) -> str | None:
    if not value:
        return None
    return _WD.get(value.strip().lower(), value.strip()[:2])
