# vhs_pipeline — bundesweite VHS-Kursdaten-Pipeline

Holt VHS-Kursdaten aus beliebig vielen Quellen, überführt sie in **ein
kanonisches Modell** und schreibt validierten `processed`-Output. Embeddings /
Vector-Store-Import sind **bewusst nicht** Teil dieser Stufe.

```
Quelle (Feed)  ──►  SourceAdapter  ──►  Course (kanonisch)  ──►  enrich  ──►  validate  ──►  data/processed/<id>.jsonl
   registry           adapters/            models.py           enrich.py     validate.py
 sources.yaml      berlin | openvhs
```

Herkunft: Struktur & Helfer wiederverwendet aus Moor Intelligence `fnr_pipeline/`
(rate-limited `fetch` mit Retry, JSON-IO, `_truncate`/Chunk-Denke,
Resume über `content_hash`).

## Ausführen

```bash
# alle in sources.yaml aktivierten Quellen, frischer Download
python -m vhs_pipeline.run

python -m vhs_pipeline.run --only berlin        # nur eine Quelle
python -m vhs_pipeline.run --no-fetch           # jüngsten data/raw-Snapshot wiederverwenden
python -m vhs_pipeline.run --limit 200          # Kurse/Quelle deckeln (Dev)
```

Output in `data/processed/`:

| Datei | Inhalt |
|---|---|
| `<id>.jsonl` | ein kanonischer `Course` pro Zeile (UTF-8) |
| `<id>.validation.json` | Validierungsbericht der Quelle |
| `_manifest.json` | Lauf-Manifest (alle Quellen, Snapshot, Zeiten, ok) |
| `_validation.json` | globale Zusammenfassung + alle Berichte |

Exit-Code `0` nur wenn **alle** Quellen fatal-frei sind und keine
Namespace-Kollision vorliegt.

## Embedding + Vector-Store (`build_index.py`)

Läuft **nach** `run.py`, gescoped auf **einen Pinecone-Namespace pro Quelle**
(Default = `namespace`-Feld der Records, z. B. `vhs/berlin`).

```bash
python -m vhs_pipeline.build_index --source berlin                 # voll
python -m vhs_pipeline.build_index --source berlin --limit 50      # Test
python -m vhs_pipeline.build_index --source berlin --dry-run       # nur Chunk/Metadata zeigen
python -m vhs_pipeline.build_index --source berlin --namespace vhs/berlin
```

- **1 Vektor pro Kurs**, `id = uid`. Chunk = `build_course_text` (Titel, VHS/Bezirk,
  DVV-Bereich/-Label, Format, Niveau, Termine, Ort, Preis, Stichworte, Kursleitung,
  dann Beschreibung + Zusatzinfo; `_truncate` bei 6000 Zeichen).
- **Metadata** (Filter + Rendern ohne DB): `uid, guid, source_id, provider_id/name,
  course_number, title, dvv_code/bereich/label, event_type, level, course_format,
  start_date/end_date, weekdays[], time_start/end, session_count, online, city,
  region, postal_code, price_amount/reduced/free, capacity_max, status, booking_url,
  semester, content_hash, lat/lon, keywords[], text` (≤ 3500 Zeichen).
- **Inkrementell:** liest bestehende `content_hash` im Namespace → embeddet nur
  neue/geänderte `uid`, löscht verschwundene (`--no-delete` deaktiviert das).
- **Config** in `vhs_pipeline/.env` (gitignored): `PINECONE_API_KEY`,
  `PINECONE_INDEX_HOST`, `EMBED_MODEL` (default `text-embedding-3-small`),
  `EMBED_DIM` (default `512`, muss == Index-Dimension). `OPENAI_API_KEY` aus der Umgebung.
- Bricht ab, wenn `describe_index_stats.dimension` ≠ `EMBED_DIM`.

## Eine VHS hinzufügen

**Spricht Open-vhs** (XML nach <https://api.vhs-kursfinder.de/openvhs-1.2>) —
nur ein Registry-Eintrag, kein Code:

```yaml
- id: musterstadt
  kind: openvhs
  namespace: vhs/musterstadt
  url: https://opendata.musterstadt.de/vhs/datenbestand.openvhs.xml
  enabled: true
  region: Bundesland
  license: dl-de/by-2-0
```

**Bespoke-Format** — ~40-Zeilen-Adapter in `adapters/<name>.py`
(`SourceAdapter` erben, `iter_raw` + `to_course` implementieren), in
`adapters/__init__.py` registrieren, `kind: <name>` im Registry.

## Kanonisches Modell (`models.py`, `schema_version = vhs-canonical-1`)

48 Felder, u. a.:

- **Identität/Routing:** `uid` = `"{source_id}:{provider.id}:{guid}"` (global
  eindeutig, reproduzierbar), `source_id`, `namespace` (z. B. `vhs/berlin`),
  `provider{id,name,region}`, `guid`, `course_number`
- **Beschreibung:** `title`, `subtitle`, `description` (HTML entfernt),
  `additional_info`, `description_html` (roh)
- **Klassifikation:** `dvv_code`/`dvv_version`/`dvv_bereich`/`dvv_label`
  (aus `dvv_systematik.json`), `event_type`, `level`, `course_format`
  (`praesenz|online|blended|selbstlern`), `keywords[]`, `target_groups[]`,
  `certificates[]`, `instructors[]`
- **Zeit:** `start_date`/`end_date` (ISO), `session_count`, `duration_units`,
  `weekdays[]`, `time_start`/`time_end` (HH:MM), `sessions[]{date,start,end,weekday}`
- **Ort:** `venue{name,street,zip,city,district,room,country,accessible,lat,lon,online}`,
  `city`, `postal_code`, `region`
- **Kommerz:** `price{amount,reduced,discount_possible,notes[],free}`,
  `capacity{min,current,max}`, `status` (`available|full|unknown`)
- **Links:** `booking_url`, `mobile_url`, `attachments[]`, `contact_*`
- **Haushalt:** `semester` (aus Kursnummer-Suffix/Startmonat), `content_hash`
  (SHA-1 über inhaltsrelevante Felder → inkrementelles Re-Embedding),
  `source_updated_at`, `fetched_at`

## Namespaces / Isolation

Pro Quelle **genau ein** Namespace (`namespace:` im Registry). Berlins 12
Bezirks-VHS + Servicezentrum liegen alle in `vhs/berlin`, aber als getrennte
`provider.id` (`berlin-mitte`, …) → gruppier-/filterbar ohne eigene Namespaces.
`validate_global` bricht ab, wenn zwei Quellen denselben Namespace beanspruchen.

## Updates

- **Vollabzug:** Open-vhs erlaubt keine Differential-Updates der Stammdaten →
  jede Quelle wird komplett neu geladen (Snapshot in `data/raw/<id>_<datum>.*`).
- **Inkrementell downstream:** `content_hash` pro `uid` → im Embedding-Schritt
  nur geänderte/neue Kurse re-embedden, verschwundene `uid`s im Namespace löschen.
- **Belegungsstatus:** Open-vhs hat ein separates stündliches Delta-Format
  (`guid` + Teilnehmerzahlen). Optionaler späterer `status`-Refresh ohne
  Vollabzug.
- **Kadenz:** Berlin stündlich möglich, fachlich wöchentlich (Mo). Cron:
  `run.py` täglich/stündlich, dann Embedding-Delta.

## Quellen-Realität (Stand 2026-09)

- Es gibt **keine** öffentliche bundesweite *Lese*-API. `api.volkshochschule.de`
  ist die **Upload**-Seite (Open-vhs), in die >50 % der VHS ihre Kataloge
  einspeisen — nicht abfragbar.
- Bundesweite Abdeckung entsteht daher über die **Source-Registry**: pro
  Anbieter/Stadt ein Open-vhs-Feed bzw. Open-Data-Export. Berlin ist heute die
  reichhaltigste öffentliche Einzelquelle (~10.230 Kurse, CC-BY).
- `openvhs_fixture` = das offizielle DVV-Beispiel-XML; beweist den generischen
  Open-vhs-Pfad Ende-zu-Ende (Fulda/Berlin/Mainz/Ravensburg im selben Feed).
