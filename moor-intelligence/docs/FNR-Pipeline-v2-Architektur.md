# FNR Pipeline v2 — Architektur-Dokument

**Version:** 1.0  
**Datum:** 24. Juni 2026  
**Status:** Entschieden – Implementierung bereit

---

## 1. Ausgangslage und Ziele

### 1.1 Bisherige Architektur (v1)

Die v1-Pipeline sammelt ausschließlich Moor/Torf-Projekte über zwei departmentspezifische FNR-Subseiten:

| Quelle | URL |
|--------|-----|
| Moor-Datenbank | `moor.fnr.de/forschung-und-foerderung/projektdatenbank` |
| Torfersatz-Datenbank | `torfersatz.fnr.de/forschung-foerderung/projektdatenbank` |

**Probleme:**
- Nur ~200 Projekte (Moor/Torf-spezifisch)
- Paginiertes Scraping über mehrere Seiten pro Quelle
- Keine thematische Trennung im Vektorstore (alles in einem Namespace `prod`)
- Nicht erweiterbar auf weitere FNR-Themengebiete ohne Code-Doppelung

### 1.2 Ziele v2

1. **Vollständiger FNR-Korpus**: Alle ~5.000+ Projekte aus allen Förderprogrammen
2. **Modular nach Themen**: Saubere Namespace-Trennung im Vektorstore
3. **Zwei Informationsebenen**: Projektübersicht (infos) getrennt von Tiefen-Content (details)
4. **Erweiterbar**: Neue Themengebiete ohne Architekturänderung hinzufügbar

---

## 2. Architektur-Entscheidungen

### 2.1 Datenquelle: Zentral statt dezentral

**Entscheidung:** Einzige Discovery-Quelle ist `projekte.fnr.de/projektverzeichnis`.

**Analyse-Ergebnis:**
- Die Seite enthält die vollständige FNR-Projektdatenbank (~5.000+ Projekte) als eine einzelne HTML-Seite mit DataTable
- Projektdetail-URL: `https://projekte.fnr.de/index.php?id=18415&fkz={FKZ}`
- Die Detailseiten haben **exakt dieselbe HTML-Struktur** (TYPO3-Plugin, `div.feld`/`div.wert`) wie die bisherigen Subseiten → `parse_project_page()` bleibt unverändert
- PDF-Berichte weiterhin unter: `https://www.fnr.de/fileadmin/projektdatenbank/{FKZ}.pdf`

**Verworfen:** Crawling der 10+ Subportale (moor.fnr.de, bioenergie.fnr.de, etc.)  
**Grund:** Redundant, wartungsintensiv, und die Detailseiten der zentralen Datenbank liefern dieselben Daten.

### 2.2 Namespace-Struktur: Zwei-Ebenen-Modell

```
{thema}/infos    ← Projektübersicht: ein Chunk pro Projekt (immer vorhanden)
{thema}/details  ← Tiefen-Content: Abschlussberichte + Projektwebsites (wenn verfügbar)
```

**Verfügbare Themen:**

| Thema | Namespace-Prefix | Beschreibung |
|-------|-----------------|--------------|
| Moor | `moor` | Moor/Torf/Paludikultur/Torfersatz |
| Wald | `wald` | Wald/Holz/Forstwirtschaft/Waldklimafonds |
| Bioenergie | `bioenergie` | Biogas/Biokraftstoffe/Heizen/Pellets |
| Biowerkstoffe | `biowerkstoffe` | Biokunststoffe/Naturfasern/Baustoffe |
| Allgemein | `allgemein` | Sonstiges/NR-allgemein |

**Rationale:** Thematische Trennung ermöglicht:
- Namespace-gezielte Suche (Antwortqualität ↑, Rauschen ↓)
- Unabhängige Aktualisierung einzelner Themen
- Kostenkontrolle bei selektiver Neuindexierung

### 2.3 FKZ → Thema Mapping (Prioritätsreihenfolge)

Ab 2019 enthält die FKZ einen 2-3-buchstabigen Programmcode:

```
Format: 22{JJ}{CODE}{NNN}{[A-Z]}
Beispiel: 2220MT003A = 2020, Moor/Torf, Nr. 003, Teilvorhaben A
```

| FKZ-Code | Thema |
|----------|-------|
| `MT` | `moor` |
| `WK`, `WKF` | `wald` (Waldklimafonds) |
| `NR` | Keyword-Klassifikation |
| Alt-Format `22XXXXXX` | Keyword-Klassifikation |

**Keyword-Klassifikation** (Titel + Aufgabenbeschreibung, Case-insensitive):

| Thema | Signalwörter |
|-------|-------------|
| `moor` | moor, torf, torfersatz, paludikultur, typha, sphagnum, rohrkolben, schilf, vernässung, moorschutz, niedermoor, hochmoor |
| `wald` | wald, forst, holz, waldklima, kurzumtrieb, pappel, weide, agroforst, waldklimafonds, forstwirtschaft |
| `bioenergie` | biogas, biokraftstoff, bioethanol, pellet, hackschnitzel, biomethan, biodiesel, bioenergie, nahwärme |
| `biowerkstoffe` | biowerkstoff, biokunststoff, cellulose, lignin, stärke, biopolymer, naturfaser, hanf, flachs, dämmstoff |

Bei mehreren Treffern gewinnt das Thema mit den meisten Keyword-Matches.

---

## 3. Datenfluss (neu)

```
projekte.fnr.de/projektverzeichnis
    │ (einmalig, ~10MB HTML, alle FKZs)
    ▼
01_collect.py: discover_all_fkzs()
    → data/fkz_index.json  {fkz: detail_url}
    │
    ▼ (per FKZ, mit Resume-Logik)
01_collect.py: scrape_project()
    → data/projects_raw/{fkz}.json  (source: "fnr")
    │
    ▼
02_enrich.py (unverändert)
    → data/reports/{fkz}.pdf
    → data/report_texts/{fkz}.txt
    → data/websites/{fkz}.json
    │
    ▼
03_export.py: classify_namespace()
    → data/output/projects.json      (+ namespace-Feld)
    → data/output/stats.json         (+ namespace-Statistiken)
    │
    ▼
04_rag_pipeline.py (namespace-aware)
    → Pinecone: {thema}/infos    (core chunks)
    → Pinecone: {thema}/details  (report + website chunks)
```

---

## 4. Änderungen pro Datei

### `fnr_pipeline/utils.py`
- `fetch()`: optionaler `timeout`-Parameter (für die ~10MB Hauptseite)

### `fnr_pipeline/01_collect.py` — Hauptänderung
- **Entfernt**: `SOURCES`-Dict (moor.fnr.de, torfersatz.fnr.de), `discover_source()`, Paginierungs-Logik
- **Neu**: `CENTRAL_LISTING_URL`, `CENTRAL_DETAIL_BASE`, `discover_all_fkzs()` (parst vollständige DataTable)
- **Angepasst**: `scrape_project()` → source-Name `"fnr"` statt `"moor"`/`"torfersatz"`
- **Unverändert**: `parse_project_page()` (identische HTML-Struktur), `main()`-Skelett, Resume-Logik

### `fnr_pipeline/03_export.py`
- **Neu**: `classify_namespace(fkz, title, aufgabe)` → Thema-String
- **Neu**: `namespace`-Feld in jedem exportierten Projekt
- **Angepasst**: `merge_sources()` → unterstützt source `"fnr"` (zusätzlich zu `"moor"`, `"torfersatz"`)
- **Angepasst**: Stats um Namespace-Verteilung erweitert

### `fnr_pipeline/04_rag_pipeline.py`
- **Neu**: `NAMESPACE` wird dynamisch gesetzt: `{topic}/infos` oder `{topic}/details`
- **Angepasst**: `upsert_batch()` nimmt expliziten `namespace`-Parameter
- **Angepasst**: `run_full_index()` gruppiert nach Thema und verwendet Two-Tier-Namespaces
- **Angepasst**: Test-Run demonstriert neue Namespace-Struktur

### `chatbot-ui/lib/ai/tools/search-fnr-projects.ts`
- **Angepasst**: Namespace-Konfiguration über Env-Var `PINECONE_NAMESPACE` (default `moor/infos`)
- Suche über beide Ebenen (`infos` + `details`) via zwei parallele Requests

---

## 5. Rückwärtskompatibilität & Migration

### Bestehende Scraped-Daten (`data/projects_raw/`)
- Bleiben erhalten (Resume-Logik überspringt bereits gescrapte FKZs)
- Alte `sources`-Keys (`moor`, `torfersatz`) werden von `merge_sources()` weiterhin unterstützt
- Export-Step fügt `namespace`-Feld hinzu (klassifiziert nachträglich)

### Pinecone-Index
- v1-Index (`fnr-projektdatenbank`, integrated inference, Pinecone-Modell): nicht mehr verwendbar (EOL)
- v2-Index (`fnr-projektdatenbank-v2`, dense, 512 dim, OpenAI text-embedding-3-small): leer → Neuindexierung nötig
- Moor-Daten aus v1 gehen verloren → werden im nächsten Production-Run neu indexiert unter `moor/infos` + `moor/details`

### Production-Run (wenn bereit)
```bash
# 1. Alle ~5000 FKZs discovern + scrapen
python fnr_pipeline/run.py

# 2. Dann vollständige Neuindexierung aller Themen
python fnr_pipeline/04_rag_pipeline.py full prod
```

---

## 6. Offene Technische Fragen

| Frage | Impact | Status |
|-------|--------|--------|
| Wie viele der ~5000 Projekte haben Reports/Websites? | Determines enrichment time (Tage/Wochen?) | Offen |
| Soll `allgemein`-Namespace überhaupt indexiert werden? | ~70% der Projekte, kaum Relevanz für Moor-Agenten | Offen |
| Soll die Suche thema-übergreifend oder thema-spezifisch sein? | Search-Tool-Design | Offen |
| Bedarf es einer FKZ-Lookup-Tabelle für Waldklimafonds-Codes? | Mapping-Qualität für WKF-Projekte | Offen |
| Rate-Limiting bei ~5000 Detail-Seiten auf projekte.fnr.de? | Scraping-Stabilität | Zu testen |
