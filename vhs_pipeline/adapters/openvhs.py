"""Generic Open-vhs XML adapter.

Handles any feed conforming to the DVV "Open-vhs" course data format
(https://api.vhs-kursfinder.de/openvhs-1.2), versions 0.9–1.2. This is the
*format* the nationwide vhs-Kursfinder ingests; many single VHS, Kreis- and
Landesverbände publish the same XML as an open-data export.

One generic adapter therefore covers most non-Berlin sources — a new provider is
just a registry entry (url + namespace).
"""

from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from collections import Counter
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

log = logging.getLogger(__name__)

_OPENVHS_NS = "http://www.dvv-vhs.de/Open-VHS"


def _localname(tag: str) -> str:
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def xml_to_dict(el: ET.Element) -> dict | str | None:
    """Recursive element -> dict; repeated child tags collapse to a list.

    Leaf with attributes keeps them: -> {"#text": ..., "@attr": ...}.
    Plain leaf -> str | None.
    """
    children = list(el)
    text = (el.text or "").strip() or None
    if not children:
        if el.attrib:
            d = {f"@{_localname(k)}": v for k, v in el.attrib.items()}
            if text is not None:
                d["#text"] = text
            return d
        return text
    out: dict = {}
    for child in children:
        key = _localname(child.tag)
        val = xml_to_dict(child)
        if key in out:
            if not isinstance(out[key], list):
                out[key] = [out[key]]
            out[key].append(val)
        else:
            out[key] = val
    for name, value in el.attrib.items():
        out[f"@{_localname(name)}"] = value
    return out


def _hhmm(value) -> str | None:
    if not value:
        return None
    s = str(value).strip()
    # "18:30:00+02:00" / "18:30:00" / "18:30"
    m = s.split("+")[0].split("Z")[0]
    parts = m.split(":")
    if len(parts) >= 2:
        return f"{int(parts[0]):02d}:{parts[1][:2]}"
    return s or None


_FORMAT_MAP = {
    "online_angebot": "online",
    "blended_learning": "blended",
    "selbstlernangebot": "selbstlern",
}


class OpenVhsXmlAdapter(SourceAdapter):
    kind = "openvhs"

    def __init__(self, config: dict):
        super().__init__(config)
        self.snapshot_ext = "xml"
        self._provider: Provider | None = None
        self._created_at: str | None = None

    # ── parse ─────────────────────────────────────────────────────────
    def _root(self, raw: bytes) -> ET.Element:
        text = raw.decode(self.config.get("encoding", "utf-8"), errors="replace")
        return ET.fromstring(text)

    def source_updated_at(self, raw: bytes) -> str | None:
        try:
            root = self._root(raw)
        except ET.ParseError:
            return None
        for el in root.iter():
            if _localname(el.tag) == "erstellungszeitpunkt":
                return (el.text or "").strip() or None
        return None

    def _read_provider(self, root: ET.Element) -> Provider:
        ersteller = None
        for el in root.iter():
            if _localname(el.tag) == "ersteller":
                ersteller = el
                break
        pid = self.default_provider_id
        pname = self.default_provider_name
        if ersteller is not None:
            d = xml_to_dict(ersteller) or {}
            pid = clean_str(d.get("guid")) or clean_str(d.get("name")) or pid
            pname = clean_str(d.get("name")) or pname
        return Provider(id=str(pid), name=pname, region=self.config.get("region"))

    def iter_raw(self, raw: bytes) -> Iterator[dict]:
        root = self._root(raw)
        self._provider = self._read_provider(root)
        for el in root.iter():
            if _localname(el.tag) == "veranstaltung":
                d = xml_to_dict(el)
                if isinstance(d, dict) and d.get("guid"):
                    yield d

    # ── map ───────────────────────────────────────────────────────────
    def to_course(self, rec: dict) -> Course | None:
        guid = clean_str(rec.get("guid"))
        if not guid:
            return None
        prov = self._provider or Provider(id=self.default_provider_id, name=self.default_provider_name)

        # dvv
        dvv = rec.get("dvv_kategorie")
        dvv_code = dvv_version = None
        if isinstance(dvv, dict):
            dvv_code = clean_str(dvv.get("#text") or dvv.get("$") or None)
            dvv_version = clean_str(dvv.get("@version"))
        elif isinstance(dvv, str):
            dvv_code = clean_str(dvv)
        # ElementTree text-with-attrib lands as {"@version":..} + no #text -> recover
        if dvv_code is None and isinstance(dvv, dict):
            dvv_code = None

        # merkmale -> dict
        merkmale: dict[str, list[str]] = {}
        for m in as_list((rec.get("merkmale") or {}).get("merkmal") if isinstance(rec.get("merkmale"), dict) else None):
            if isinstance(m, dict) and m.get("name"):
                merkmale.setdefault(str(m["name"]), []).append(str(m.get("wert")))

        course_format = "praesenz"
        for w in merkmale.get("kursart_digital", []):
            course_format = _FORMAT_MAP.get(w, course_format)

        # text blocks
        desc_parts, add_parts, desc_html_parts = [], [], []
        for t in as_list(rec.get("text")):
            if not isinstance(t, dict):
                continue
            prop = (clean_str(t.get("eigenschaft")) or "text").lower()
            body = t.get("text")
            if not body:
                continue
            desc_html_parts.append(str(body))
            target = add_parts if prop in ("zusatzinformation", "hinweis", "zusatz") else desc_parts
            target.append(strip_html(str(body)) or "")

        # schedule
        sessions: list[Session] = []
        for tm in as_list(rec.get("termin")):
            if not isinstance(tm, dict):
                continue
            sessions.append(
                Session(
                    date=clean_str(tm.get("beginn_datum")),
                    start=_hhmm(tm.get("beginn_uhrzeit")),
                    end=_hhmm(tm.get("ende_uhrzeit")),
                    weekday=clean_str(tm.get("wochentag")),
                )
            )
        weekdays = [w for w in (clean_str(x) for x in as_list(rec.get("wochentag"))) if w]
        if not weekdays:
            weekdays = sorted({s.weekday for s in sessions if s.weekday})
        time_start = _mode([s.start for s in sessions if s.start])
        time_end = _mode([s.end for s in sessions if s.end])

        # venue — `online` only when there is genuinely no physical address
        vo = rec.get("veranstaltungsort") or {}
        adr = (vo.get("adresse") if isinstance(vo, dict) else {}) or {}
        v_city = clean_str(adr.get("ort"))
        v_street = clean_str(adr.get("strasse"))
        venue = Venue(
            name=clean_str(vo.get("name")) if isinstance(vo, dict) else None,
            street=None if (v_street or "").lower() == "online" else v_street,
            zip=clean_str(adr.get("plz")),
            city=v_city,
            district=clean_str(adr.get("ortsteil")),
            country=clean_str(adr.get("land")) or "Deutschland",
            accessible=_bool(vo.get("barrierefrei")) if isinstance(vo, dict) else None,
            online=(v_city is None and v_street is None),
        )

        # instructors — `dozent` was dropped in Open-vhs 1.2 but older feeds carry it
        instructors = []
        for d in as_list(rec.get("dozent")):
            if isinstance(d, dict):
                nm = " ".join(x for x in [clean_str(d.get("vorname")), clean_str(d.get("name"))] if x)
                if nm:
                    instructors.append(nm)
            elif isinstance(d, str) and clean_str(d):
                instructors.append(clean_str(d))

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

        # links
        booking_url = mobile_url = None
        attachments = []
        for w in as_list(rec.get("webadresse")):
            if not isinstance(w, dict):
                continue
            typ = (clean_str(w.get("typ")) or "website").lower()
            uri = clean_str(w.get("uri"))
            if not uri:
                continue
            if typ == "website" and not booking_url:
                booking_url = uri
            elif typ == "website_mobile" and not mobile_url:
                mobile_url = uri
            else:
                attachments.append({"name": clean_str(w.get("name")), "uri": uri, "typ": typ})

        certificates = []
        for z in as_list(rec.get("zertifikat")):
            if isinstance(z, dict) and z.get("name"):
                certificates.append(clean_str(z["name"]))
            elif isinstance(z, str):
                certificates.append(clean_str(z))

        course = Course(
            uid=make_uid(self.source_id, prov.id, guid),
            source_id=self.source_id,
            namespace=self.namespace,
            provider=prov,
            guid=str(guid),
            course_number=clean_str(rec.get("nummer")),
            title=clean_str(rec.get("name")) or "",
            subtitle=" / ".join(x for x in (clean_str(v) for v in as_list(rec.get("untertitel"))) if x) or None,
            description="\n\n".join(p for p in desc_parts if p).strip(),
            additional_info="\n\n".join(p for p in add_parts if p).strip() or None,
            description_html="\n\n".join(desc_html_parts) or None,
            dvv_code=dvv_code,
            dvv_version=dvv_version,
            event_type=None,
            level=clean_str(rec.get("level")),
            course_format=course_format,
            keywords=[k for k in (clean_str(x) for x in as_list(rec.get("schlagwort"))) if k],
            target_groups=[k for k in (clean_str(x) for x in as_list(rec.get("zielgruppe"))) if k],
            certificates=[c for c in certificates if c],
            instructors=instructors,
            start_date=clean_str(rec.get("beginn_datum")),
            end_date=clean_str(rec.get("ende_datum")),
            session_count=to_int(rec.get("anzahl_termine")) or (len(sessions) or None),
            duration_units=to_decimal(rec.get("dauer")),
            weekdays=weekdays,
            time_start=time_start,
            time_end=time_end,
            sessions=_dedup_sessions(sessions),
            venue=venue,
            price=price,
            capacity=cap,
            booking_url=booking_url,
            mobile_url=mobile_url,
            attachments=attachments,
        )
        return course.finalize()


# ── small helpers ───────────────────────────────────────────────────────────

def _bool(value) -> bool | None:
    if value is None:
        return None
    s = str(value).strip().lower()
    if s in ("true", "1", "ja", "yes"):
        return True
    if s in ("false", "0", "nein", "no"):
        return False
    return None


def _mode(values: list[str]) -> str | None:
    return Counter(values).most_common(1)[0][0] if values else None


def _dedup_sessions(sessions: list[Session]) -> list[Session]:
    seen, out = set(), []
    for s in sessions:
        key = (s.date, s.start, s.end)
        if key not in seen:
            seen.add(key)
            out.append(s)
    return out


_RED_RE = None


def _reduced_from_notes(notes: list[str]) -> float | None:
    import re

    for n in notes:
        m = re.search(r"erm\w*\.?\s*(?:preis)?[:\s]*([\d.,]+)", n, re.IGNORECASE)
        if m:
            return to_decimal(m.group(1))
    return None
