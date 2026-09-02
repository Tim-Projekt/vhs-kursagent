# VHS‑Kurs‑Agent — Technische Analyse & Migrationsplan

**Basis:** Umbau von *Moor Intelligence* (FNR‑RAG‑Agent) zu einem KI‑Agenten für die
Kurssuche der Volkshochschulen — **Scope: bundesweit, modular je Quelle/Stadt** (eigener
Adapter, eigener Vector‑Store‑Namespace).
**Stand:** 2026‑09‑02
**Legende:** `[F]` festgestellt/verifiziert · `[V]` vermutet · `[E]` empfohlen

Referenzdateien in diesem Repo:
- `moor-intelligence/` — Klon von `github.com/Tim-Projekt/Moor-Intelligence` (analysiert)
- `docs/reference/vhs-opendata-sample-course.json` — ein vollständiger Kurs‑Datensatz aus der Berlin‑Open‑Data‑API
- `docs/reference/vhs-schlagworte-dropdown.tsv` — 615 Stichwörter der Live‑Suche (id → Label)
- **`vhs_pipeline/`** — lauffähige modulare Datenpipeline (Abschnitt 8); `vhs_pipeline/README.md`
- **Abschnitt 8** — bundesweite Quelle (Open‑vhs) + Adapter‑Architektur + Pipeline‑Testlauf (Update 2026‑09‑02)

---

## 1 · Kernaussage vorab

**Die aufwändigste Komponente von Moor Intelligence — die mehrstufige Scraping‑/Enrichment‑Pipeline
(`fnr_pipeline/01‑04`) — entfällt für VHS fast vollständig.** Die Berliner VHS stellen ihren
**kompletten Kurskatalog als offizielle Open‑Data‑Schnittstelle** bereit:

| | |
|---|---|
| **JSON** `[F]` | `https://www.vhsit.berlin.de/VHSKURSE/OpenData/Kurse.json` (≈ 49 MB, **10.230 Kurse**) |
| **XML** `[F]` | `https://www.vhsit.berlin.de/VHSKURSE/OpenData/Kurse.xml` |
| Lizenz `[F]` | CC‑BY (Servicezentrum der Berliner Volkshochschulen) |
| Aktualisierung `[F]` | stündlich neu generiert; fachlich wochenweise (Montags) neuer Semesterstand |
| Encoding `[F]` | UTF‑8, ein Wurzelobjekt `{"veranstaltungen":{"veranstaltung":[…]}}` |
| Quelle `[F]` | Berlin Open Data — `https://daten.berlin.de/datensaetze/kurse` |
| Umleitung `[F]` | `vhsit.berlin.de/...` → 302 → `www.vhsit.berlin.de/...` (Redirect folgen) |

Damit reduziert sich die Datenpipeline auf: **Download → Normalisieren → Chunk → Embedding → Upsert.**
Ein einziges Python‑Skript ersetzt `fnr_pipeline/01_collect.py` + `02_enrich.py` + der Großteil von `03_export.py`.

HTML‑Scraping der ASP.NET‑Oberfläche wird **nur noch als optionaler Fallback** und als Grundlage für
das *Tool „Live‑Stichwortsuche"* (Sekundärquelle) gebraucht — nicht für den RAG‑Aufbau.

---

## 2 · VHS — Technische Analyse

### 2.1 Die bestehende Suche (`CourseSearch.aspx`) `[F]`

- Software: **ASP.NET WebForms** (`/VHSKURSE/BusinessPages/*.aspx`), stateful über `__VIEWSTATE`
  + `ASP.NET_SessionId`‑Cookie. Kein `__EVENTVALIDATION` (POST‑Nachbau vereinfacht).
- Seiten: `CourseSearch.aspx` (Formular) → **302** → `CourseList.aspx` (Trefferliste, Suche liegt in
  der Session) → `CourseDetail.aspx?id={guid}` (Einzelkurs, **sessionfrei per GET abrufbar**).
- Drei Such‑Tabs: **Einfach** (Freitext + Bezirk + 1 Stichwort), **Erweitert** (Freitext + mehrere
  Stichwörter + Bezirks‑Mehrfachauswahl + Lehrstätte + Zeitstruktur + Kursleiter:in + Datum von/bis),
  **Kursnummer**.
- Filter‑Vokabular (aus dem Formular extrahiert):
  - **Bezirke:** 12 Berliner Bezirks‑VHS + „Servicezentrum" + „zentrale Kursleiterfortbildung"
    (Werte `31`–`42`, `81`, `98`).
  - **Stichwörter:** 615 kuratierte Begriffe (`id`→Label, siehe `docs/reference/…tsv`), z. B.
    `2394 = Yoga`, `2275 = A1`. Reine Schlagwort‑Liste, **keine Themenhierarchie** in der UI.
  - **Zeitstruktur:** 7 Kategorien (Abendkurs 1×/Woche, Wochenendkurs, Wochenkurs …).
  - **Lehrstätten:** 1.933 Veranstaltungsorte.
- Trefferliste: ASP.NET `DataGrid`, **10 Zeilen/Seite fest**, Pager = Image‑Buttons
  (`ctl00$Content$ILDataGrid1$ctl01$ctl04` = „weiter", `…ctl05` = „letzte Seite"); Blättern nur per
  vollständigem Form‑Postback (ganzer ViewState). `?Page=n` in der URL wird **ignoriert** `[F]`.
- Trefferzahlen (Live, Semester „H" 2026, nur Bezirksfilter): Mitte 973, Fhain‑Kreuzberg 1.525,
  Pankow 1.295, … **Summe ≈ 10.950** `[F]`. Leere Suche ohne jedes Kriterium ist nicht erlaubt `[F]`.
- `robots.txt`: sperrt nur `msnbot` und `Wdb-Suchportal-Bot` — kein generelles Crawling‑Verbot `[F]`.
- Kein internes JSON/REST/OData/ashx‑Backend erkennbar; die einzige Web‑Service‑Datei
  (`GridViewDeleteRowWebService.asmx`) ist UI‑Hilfslogik `[F]`.

### 2.2 `CourseDetail.aspx?id=N` `[F]`

Sessionfrei per GET, `id` == `guid` aus Open Data. Gerenderte Felder (Labels `ctl00_Content_lbl*`):
Kurstitel, Kursnummer, Volkshochschule/Bezirk, Anmelde‑Kontakt (Tel/Fax/Mail/URL), fachliche
Beratung, **Beschreibung** (Freitext), Zusatzinformation, „Bitte beachten Sie", Kursleiter:in,
Unterrichtseinheiten (`… UE`), Entgelt + ermäßigtes Entgelt, **Veranstaltungsort + alle Einzeltermine**
(`ILDataGridCourseDates`: Lehrstätte + PLZ/Straße/Raum, dann je Sitzung `Wochentag, TT.MM.JJJJ, HH:MM–HH:MM`).
`id`‑Enumeration ist **nicht** praktikabel: ids sind spärlich/geclustert, „nicht gefunden" liefert
trotzdem HTTP 200 (~31 kB Stub) `[F]`.

### 2.3 Open‑Data‑Datenmodell (`Kurse.json`) `[F]`

Pro `veranstaltung`:

| Feld | Typ / Werte | Anmerkung |
|---|---|---|
| `guid` | String | == `CourseDetail.aspx?id=` → **Buchungs‑Deeplink** |
| `nummer` | z. B. `Mi302-070H` | Präfix = Bezirk (`Mi`/`TS`/`CW`…), Ziffernblock ≈ DVV‑Grobcode, Suffix `H`/`F` = Semester |
| `name`, `untertitel` | String / null | Titel + Untertitel |
| `bezirk` | 13 Werte | Klartext, nicht der Zahlencode der UI |
| `dvv_kategorie` | `{@version:"2.0", #text:"3.02"}` | **DVV‑Systematik** (s. 2.4). **76 distinkte Codes** |
| `veranstaltungsart` | `Kurs` (8.661), `Bildungsurlaub` (648), `Einzelveranstaltung/Vortrag` (432), `Beratung` (233), `Workshop` (139), `Prüfungsbezogener Kurs` (61), … 11 Werte + 30× null | |
| `minimale`/`aktuelle`/`maximale_teilnehmerzahl` | String‑Zahl | `aktuelle = "-1"` = unbekannt; sonst Auslastungssignal |
| `anzahl_termine`, `beginn_datum`, `ende_datum` | Int / ISO‑Datum | |
| `zielgruppe` | String / meist null | |
| `schlagwort` | String **oder** Array | 648 distinkte Werte; Großschreibung markiert Grobbereiche (`SPRACHEN`, `GESUNDHEIT`, `KULTUR`, `ARBEIT-BERUF-EDV`), dazu Niveau (`A1`,`B1`), Format (`Online-Kurs`,`Präsenzkurs`,`vhs.cloud`), Zielgruppe (`Migrant:innen`) |
| `text` | Array, **immer genau** `Beschreibung` + `Zusatzinformation` | Beschreibung: median **892**, max **4.201** Zeichen. ~2.720 enthalten HTML‑Tags → **strippen** |
| `merkmale.merkmal` | `{name,wert}` (2.030 Kurse) | nur `kursart_digital` ∈ {`online_angebot` (2.011), `blended_learning` (19)} |
| `anmeldung` | `{telefon, mail, link}` | Bezirks‑VHS‑Geschäftsstelle |
| `ansprechperson` | `{anrede,titel,name,vorname,telefon,mail}` | fachliche Beratung |
| `dozent` | Objekt **oder** Array `{anrede,titel,name,vorname}` | `name` oft null; kein verlässliches Feld |
| `ortetermine` | `{adresse: obj|array, termin: obj|array}` | **stark denormalisiert** (Adresse pro Sitzung wiederholt). `adresse`: `lehrstaette,plz,ort,strasse,raum,behindertenzugang,breitengrad,laengengrad` (Geo nur bei ~67 %). `termin`: `wochentag,beginn_datum,beginn_uhrzeit,ende_uhrzeit` |
| `preis` | `{betrag:"66.00", rabatt_moeglich:"true"/"false", zusatz:"erm. Preis: 35,50 EUR"}` | |
| `webadresse` | `{typ:"website", name:"zur Kursbuchung", uri:"…CourseDetail.aspx?id=guid"}` | fertiger Deeplink |

**Fallstricke `[F]`:** (1) `schlagwort`, `ortetermine.adresse`, `ortetermine.termin`, `dozent`,
`merkmale.merkmal` sind **je nach Kardinalität mal Objekt, mal Array** → beim Parsen immer in Liste
zwingen. (2) HTML in `text`. (3) Zahlen als Strings. (4) `betrag` mit `.`, `zusatz` mit `,` als
Dezimaltrenner. (5) Semesterwechsel: Montags kann sich der Katalog stark ändern → Delta‑Logik nötig.

### 2.4 DVV‑Kategorien `[F]/[E]`

`dvv_kategorie.#text` folgt der **DVV‑Systematik v2.0** (bundesweiter VHS‑Standard, gepflegt von DIE).
Sechs Programmbereiche `[F]`:

| Code | Programmbereich |
|---|---|
| 1.xx | Politik – Gesellschaft – Umwelt |
| 2.xx | Kultur – Gestalten |
| 3.xx | Gesundheit |
| 4.xx | Sprachen |
| 5.xx | Arbeit – Beruf (EDV) |
| 6.xx | Grundbildung – Schulabschlüsse |

Häufigste Feincodes im Datensatz: `4.04` (1.132), `3.02` (688), `3.01` (656), `2.07` (570),
`4.06` (540), `4.22` (493 — DaF/Integration), `4.09`, `4.08`, `5.01`, … `[F]`.
`[E]` Eine **Lookup‑Tabelle `dvv_code → Klartext‑Label`** als statisches JSON pflegen (aus der
veröffentlichten DVV‑/DIE‑Systematik 2.0). Sie liefert die menschenlesbaren Facetten für Filter,
Prompt‑Kontext und Antwort‑Formatierung.

### 2.5 Extraktions‑Strategie für die volle Kursdatenbank

| Weg | Bewertung |
|---|---|
| **Open‑Data‑JSON komplett laden** `[E] Primär` | 1 Request, 49 MB, 10.230 Kurse, alle Felder inkl. Deeplink. Stündlich frisch. **Kanonische Quelle.** |
| Open‑Data‑XML | Gleicher Inhalt; nur nutzen, falls JSON‑Encoding/Struktur mal bricht. |
| `CourseList` je Bezirk paginieren + `CourseDetail` je `guid` | Nur **Fallback**, falls Open Data ausfällt: 12 Bezirke × ~100 Seiten Postbacks + ~11k Detail‑GETs (~5 h @ 1 req/1,5 s). Detailseiten sind sessionfrei parallelisierbar. Parser: TYPO3‑ähnliche `lbl*`‑Spans + `ILDataGridCourseDates`. |
| `id`‑Enumeration | **Verworfen** (spärliche ids, 200‑Stub bei Fehltreffer). |

`[E]` Für den Agenten **nicht** die Live‑Suche als Primär‑Retrieval verwenden — sie ist rein
keyword‑basiert, 10er‑Paging, stateful. Sie wird zur **Sekundärquelle** (Tool, s. 4.4): exakte
Filtertreffer (Stichwort, Bezirk, Zeitstruktur, Datum) und tagesaktuelle Verfügbarkeit.

---

## 3 · Moor Intelligence — Architektur & Reuse‑Bewertung

### 3.1 Ist‑Architektur `[F]`

**Datenpipeline** (`fnr_pipeline/`, Python, standalone):
`01_collect` (Discovery + Scrape TYPO3‑Detailseiten) → `02_enrich` (PDF‑Schlussberichte + Projekt‑
Website‑Crawl, PyMuPDF) → `03_export` (Merge, Normalisierung, `classify_namespace` per FKZ‑Code +
Keyword‑Scoring) → `04_rag_pipeline` (OpenAI `text-embedding-3-small` @ **512 dim**, Pinecone‑Upsert
in Two‑Tier‑Namespaces `{thema}/infos` | `{thema}/details`, Resume‑Logik, Batch 32).
Chunking: 1 Core‑Chunk/Projekt (`build_core_text`), N Report‑Chunks (~2.000 Zeichen, Absatz‑Buckets),
N Web‑Chunks. `text` als Pinecone‑Metadata gespeichert (kein integrated inference).

**App** (`chatbot-ui/`, Next.js 16 App Router, AI SDK 6, pnpm; Fork des Vercel‑Chatbot‑Templates):
- `lib/ai/providers.ts` — **OpenRouter** als Gateway (`getLanguageModel`), Vertex‑AI‑Variante
  vollständig auskommentiert/archiviert. `.env.example` nennt noch Vertex als „primär" → veraltet `[F]`.
- `lib/ai/models.ts` — Default `google/gemini-3.7-flash` (reasoning „high", tools), Titel
  `anthropic/claude-haiku-4-5`.
- `lib/ai/prompts.ts` — großer domänenspezifischer System Prompt (Rolle „FNR Research & Knowledge
  Agent", Themenlandkarte, Rollen‑differenzierte Antworttiefe, Belegpflicht, iterative Arbeitsweise)
  + pro Tool ein `<tool_guidance>`‑Block.
- `lib/ai/tools/` — `search-fnr-projects` (Pinecone‑Query: OpenAI‑Embed → `POST /query`, Namespace
  `{prefix}/{topic}/{tier}`, optional `fkz`‑Filter), `search-fnr-website` (zweiter Pinecone‑Index,
  1536 dim, Portal/PageType‑Filter), `web-search` (Linkup), `create/update/edit-document`,
  `request-suggestions`, `get-weather`.
- `app/(chat)/api/chat/route.ts` — `streamText`, `stepCountIs(20)`, `experimental_activeTools`,
  Fallback‑Synthese bei erschöpftem Schrittbudget, Tool‑Approval‑Flow, resumable streams (Redis),
  BotID, Rate‑Limit je Tier.
- DB: Postgres (Supabase) via `drizzle-orm` — `User/Chat/Message_v2/Vote_v2/Document/Suggestion/Stream`
  + `PasswordResetToken`. Auth: `next-auth` (Gast + Tiers `guest|user|pro|admin`, `entitlementsByTier`).
- Weitere Infra: Vercel Blob (Upload), Redis, Brevo (Reset‑Mails), `botid`, Vercel Analytics/OTel.
- Vektor‑Store: **Pinecone** serverless (`us-east-1`), zwei Indizes (Projekte 512d, Website 1536d).

### 3.2 Reuse‑Matrix

| Komponente | Aktion | Begründung |
|---|---|---|
| **Next.js‑App‑Gerüst** (Layout, Streaming‑Chat‑UI, Artifacts, Sidebar, Auth‑Seiten) | **Reuse** | Use‑Case‑agnostisch. Nur Branding/Texte. |
| **`api/chat/route.ts`** Agent‑Loop (`streamText`, Step‑Budget, Fallback‑Synthese, Approval‑Flow, resumable streams) | **Reuse** | Toolset‑Liste (`experimental_activeTools`, `tools:{}`) austauschen, sonst unverändert. |
| **Provider‑Layer** (`providers.ts`, OpenRouter, `getLanguageModel`) | **Reuse** | Gateway bleibt. Ggf. Modell‑IDs anpassen (4.6). |
| **Modell‑Katalog** `models.ts` | **Adapt** | Default‑Modell/Reasoning‑Effort für kürzere, listige Antworten neu justieren. |
| **DB‑Schema + Drizzle + Queries** | **Reuse** | Chat/Message/User/Vote/Document generisch. Keine Änderung. |
| **Auth + Tiers + Rate‑Limits** (`entitlements.ts`, `ratelimit.ts`, next‑auth) | **Reuse** | Ggf. Limits anders wählen (Publikumsverkehr statt Fachreferent:innen). |
| **Web‑Search‑Tool** (`web-search.ts`, Linkup) | **Reuse** | Wird Tertiärquelle. Nur Tool‑Description/Guidance auf VHS‑Kontext. |
| **`search-fnr-projects.ts`** (Pinecone‑RAG‑Tool) | **Adapt → `search-vhs-courses.ts`** | Query‑Mechanik (Embed→`/query`) 1:1; Namespaces/Filter/Result‑Formatierung/Description neu. |
| **`search-fnr-website.ts`** (2. Pinecone‑Index) | **Replace → `search-vhs-live` (Live‑Stichwortsuche)** | Analoge Rolle „Sekundärquelle", aber als Live‑Query gegen `CourseSearch`/`CourseList` statt zweitem Vektor‑Index. |
| **`create/edit/update-document`, `request-suggestions`, Artifacts** | **Reuse (behalten) / optional aus** | Für „erstelle mir einen Kursplan/Vergleich als Dokument" nützlich. Kein Umbau nötig. |
| **`get-weather.ts`** | **Remove** | Demo‑Rest. |
| **System Prompt** `prompts.ts` | **New (Struktur reuse)** | Rolle, Domänenwissen, Themenlandkarte komplett neu (VHS). Aufbau (Rolle/Kontext/Arbeitsweise/Belege/Output + `<tool_guidance>`) übernehmen. |
| **`fnr_pipeline/01_collect.py` + `02_enrich.py`** | **Remove** | Kein Scraping/PDF/Website‑Crawl — Open Data ersetzt beides. |
| **`fnr_pipeline/03_export.py`** | **New (Konzept reuse)** | Statt Merge/Klassifikation: Open‑Data‑Normalisierung. `classify_namespace`‑Idee → `dvv_kategorie`‑Mapping (bereits im Datensatz, kein Scoring nötig). |
| **`fnr_pipeline/04_rag_pipeline.py`** | **Adapt → `vhs_pipeline/build_index.py`** | Embedding‑Call, Batch‑Upsert, Resume‑Logik, `_truncate` behalten. Chunk‑Builder + Namespace‑Schema + Metadata neu. Single‑Tier statt Two‑Tier. |
| **`run.py` / `run_pipeline.sh`** Orchestrierung | **Adapt** | Auf 2 Schritte (fetch, build_index) verschlanken; als Cron. |
| **Pinecone‑Index** | **New (leer, vom Nutzer bereitgestellt)** | Ein Dense‑Index, Dim passend zum Embedding‑Modell (512 bei `text-embedding-3-small`). |
| **Knowledge Primer** (`docs/FNR_Moor_Knowledge_Primer.md` im Prompt) | **New (klein)** | Kurzer VHS‑Primer: 12 Bezirks‑VHS, DVV‑Bereiche, Semesterlogik, Anmeldeweg, Preis/Ermäßigung. |
| Brevo / Blob / Redis / BotID / Analytics | **Reuse** | Unverändert. |

### 3.3 Größenvergleich

| | FNR | VHS |
|---|---|---|
| Einheiten | ~5.708 Projekte | **10.230 Kurse** `[F]` |
| Tiefen‑Content | 3.588 PDF‑Berichte + Websites | keiner — Beschreibung median 892 Z. `[F]` |
| Chunks | Core + N Report + N Web (10.000e) | **~10–12k** (≈ 1/Kurs) `[V]` |
| Pipeline‑Schritte | 4 (Scrape/PDF/Enrich/Index) | **2** (Fetch/Index) |
| Refresh | manuell, selten | **stündlich möglich**, mind. wöchentlich (Semester) `[E]` |

---

## 4 · Migrationsplan

### 4.1 Zielarchitektur (ein Agent, drei Quellen)

```
Nutzeranfrage (natürliche Sprache)
        │
   streamText  (api/chat/route.ts, unverändert; stepCountIs 20)
        │  System Prompt: VHS-Rolle + Primer + Tool-Guidance
        ├─ 1. searchVhsCourses   → Pinecone-RAG über gesamten Kurskatalog   [Primär]
        ├─ 2. searchVhsLive      → Live-Stichwort-/Filtersuche CourseSearch  [Sekundär]
        └─ 3. searchWeb          → Linkup (allgemeine Websuche)              [Tertiär]
        │
   Synthese-Antwort mit Kurs-Deeplinks (CourseDetail.aspx?id=guid)
```

### 4.2 VHS‑Datenpipeline (`vhs_pipeline/`)

**`fetch.py`** `[E]`
1. `GET Kurse.json` (Redirect folgen, `www.`‑Host, Timeout 60 s, Retry/Backoff aus `utils.fetch`).
2. Roh‑Snapshot ablegen: `data/raw/Kurse_<YYYY-MM-DD>.json` (Historie/Diff/Rebuild).
3. Sanity‑Checks: `veranstaltungen.veranstaltung` ist Liste, Länge in Plausibilitätsband
   (z. B. 5.000–20.000), `guid` unique. Bei Bruch: XML‑Endpoint versuchen, sonst abbrechen (alten
   Index stehen lassen).

**`normalize.py`** `[E]` → `data/output/courses.json` (Liste flacher Records):

```jsonc
{
  "guid": "789304",
  "course_number": "Mi302-121H",
  "title": "Kickbox trifft Fitness",
  "subtitle": null,
  "district": "Mitte",
  "provider_vhs": "VHS Mitte",
  "dvv_code": "3.02",
  "dvv_bereich": "Gesundheit",                 // aus Lookup 2.4
  "dvv_label": "Bewegung / Gymnastik",         // aus Lookup 2.4 (Feincode)
  "event_type": "Kurs",
  "format": "praesenz|online|blended",         // aus merkmale.kursart_digital + schlagwort
  "keywords": ["Fitnessgymnastik", "GESUNDHEIT"],
  "target_group": null,
  "description": "…HTML entfernt, \\r\\n normalisiert…",
  "additional_info": "…",
  "start_date": "2026-09-02", "end_date": "2026-12-09",
  "session_count": 26,
  "weekday": ["Di"],                           // distinct aus termin[].wochentag
  "time_start": "18:30", "time_end": "20:00",  // Modalwert
  "sessions": [{"date":"2026-09-02","start":"18:30","end":"20:00"}],  // dedupliziert
  "venues": [{"name":"…","street":"…","zip":"…","city":"Berlin","room":"…",
              "accessible": true, "lat": 52.53, "lon": 13.39}],       // dedupliziert
  "price_eur": 66.00, "price_reduced_eur": 35.50, "discount_possible": true,
  "capacity_min": 6, "capacity_max": 10, "capacity_current": 1,
  "status": "available|waitlist|full|unknown", // aus current vs max (−1 → unknown)
  "instructors": ["Anna Pliakou"],
  "contact_email": "vhs@ba-mitte.berlin.de", "contact_phone": "9018 37474",
  "booking_url": "https://www.vhsit.berlin.de/VHSKURSE/BusinessPages/CourseDetail.aspx?id=789304",
  "semester": "H2026",
  "content_hash": "sha1(title+description+sessions+price+status…)"
}
```

Regeln `[E]`: alle „mal Objekt/mal Array"-Felder in Liste zwingen · HTML strippen (Tags raus,
`&nbsp;`→Space, Absätze erhalten) · Strings→Zahlen · `zusatz` „erm. Preis: 35,50 EUR" per Regex
→ `price_reduced_eur` · `venues`/`sessions` deduplizieren · `format` aus
`merkmale.kursart_digital` ∈ {online_angebot→`online`, blended_learning→`blended`}, sonst `praesenz`.

**`build_index.py`** (aus `04_rag_pipeline.py` `[Adapt]`)
- **Ein Chunk pro Kurs** (`build_course_text`, s. 4.3). Kein Report/Web‑Chunking. `_truncate` behalten
  (Limit hier praktisch nie greifend).
- Embedding: `text-embedding-3-small` @ 512 dim (wie FNR) `[E]` — oder Modell nach Vorgabe des
  bereitgestellten Index (Dim muss exakt passen).
- Upsert‑Batching (32), Retry bei 429, Resume über `content_hash` (nur geänderte/neue `guid`s
  re‑embedden; verschwundene `guid`s löschen → sauberer Semesterwechsel).
- **Namespace‑Schema `[E]`:** Single‑Tier, ein Namespace `courses` (Katalog ist klein genug, dass
  thematische Namespace‑Trennung mehr schadet als nutzt — bereichsübergreifende Fragen sind häufig).
  Grobsteuerung über **Metadata‑Filter** statt Namespaces.

**Orchestrierung:** `fetch → normalize → build_index` als **stündlicher/ täglicher Cron**
(GitHub Action oder Vercel Cron ruft ein Skript / einen Worker). Kein Dauerlauf, kein `run_pipeline.sh`‑Warteloop.

### 4.3 Embedding‑Text & Vector‑Metadata

**`build_course_text(c)`** `[E]` (deutsch, dicht, ein Chunk):
```
Kurs: {title}{ " – " + subtitle }
VHS {district} · {dvv_bereich} / {dvv_label} · {event_type} · {format}
Kursnummer: {course_number} · Beginn: {start_date} · {session_count} Termine · {weekday} {time_start}–{time_end}
Ort: {venues[0].name}, {venues[0].zip} Berlin{ " (Online)" if online }
Stichworte: {keywords join ", "}
Preis: {price_eur} EUR{ " (erm. " + price_reduced_eur + ")" }

{description}

{additional_info kurz}
```

**Metadata pro Vektor** (für Filter + zum Rendern ohne DB‑Join, Pinecone‑Limit ~40 KB beachten `[F]`):
`guid, course_number, title, district, dvv_code, dvv_bereich, event_type, format, start_date,
end_date, weekday, time_start, price_eur, status, online (bool), booking_url, semester` und
`text` (der Chunk). Lange Freitexte nur einmal in `text`.

### 4.4 Tools

**1) `search-vhs-courses.ts`** — aus `search-fnr-projects.ts` `[Adapt]`
- Übernehmen: `getEmbedding` (OpenAI), `queryNamespace` (`POST https://{host}/query`),
  Fehlerbehandlung, `formatMatches`.
- Neu: `inputSchema` = `{ query, filter?: { district?, dvv_bereich?, dvv_code?, format?, event_type?,
  weekday?, start_after?, start_before?, max_price? }, topK? }`.
- Filter → Pinecone `filter`‑Objekt (`$eq`, `$in`, `$gte`/`$lte` auf `start_date`, `price_eur`).
- `formatMatches`: pro Treffer `Titel · VHS {district} · {dvv_bereich} · {format} · ab {start_date}
  {weekday} {time} · {price} EUR · Status · {booking_url}` + Beschreibungsauszug.
- Description/`<tool_guidance>`: „Primärquelle. Semantische Suche über den gesamten Berliner
  VHS‑Kurskatalog (~10.000 Kurse, alle 12 Bezirks‑VHS, aktuelles Semester). Deutsche Queries. Bei
  konkreten Constraints (Bezirk, online, Wochentag, Preis, Zeitraum) die `filter` nutzen. Immer
  `booking_url` und Kursnummer mit ausgeben."

**2) `search-vhs-live.ts`** — NEU `[E]` (ersetzt `search-fnr-website.ts` in der Rolle „Sekundär")
- Serverseitig: `GET CourseSearch.aspx` → Hidden‑Fields parsen → `POST` mit
  `SimpleSearchBox$txtSearchTerm` + `AreaList1$cmbDistricts` + optional `KeywordsList1$cmbKeyword`
  (id aus mitgeliefertem Stichwort‑Mapping) → Redirect zu `CourseList.aspx` → Zeilen parsen
  (`DataGridItem*`: District, CourseNumber, CourseTitle, CourseBegin, Places, Costs, `id`),
  optional Pager‑Postback für Seite 2–n (Cap z. B. 3 Seiten / 30 Treffer).
- Zweck: exakte Stichwort-/Bezirks-/Zeit‑Treffer und **tagesaktuelle Plätze/Status** (frischer als
  der wöchentliche RAG‑Snapshot). Kein Embedding.
- `<tool_guidance>`: „Sekundär. Nutze dies für exakte Filtertreffer (offizielles Stichwort, Bezirk,
  Zeitstruktur, Datum) oder wenn der Nutzer nach *freien Plätzen / Anmeldeschluss / aktuell buchbar*
  fragt. Für explorative/semantische Fragen zuerst `searchVhsCourses`."
- `[V]` Rechtlich unkritisch (öffentliche Seite, kein robots‑Verbot), aber **rate‑limiten**
  (≥ 1 s/Request, Ergebnis‑Cache 5–15 min je `term+district`).

**3) `searchWeb`** (`web-search.ts`) — **Reuse**, nur Description auf VHS‑Kontext (Wegbeschreibung,
Trägerinfos, allgemeine Themenrecherche, „was ist Alexandertechnik").

**4) Artifacts‑Tools** — behalten (optional per `experimental_activeTools` deaktivierbar).
`get-weather` entfernen.

In `api/chat/route.ts` nur die Tool‑Namen in `experimental_activeTools` und im `tools:{}`‑Objekt
tauschen — Loop/Fallback/Streaming unverändert.

### 4.5 System Prompt (`prompts.ts`) `[New]`

Struktur von Moor übernehmen, Inhalt neu:
- **Rolle:** „Kursberater der Berliner Volkshochschulen" — hilft Bürger:innen, aus ~10.000 Kursen
  den passenden zu finden; erklärt Unterschiede (Niveau, Format, Bezirk, Kosten/Ermäßigung),
  vergleicht, fasst zusammen. Kein Anmeldesystem — verweist zum Buchen auf `booking_url`.
- **Domänen‑Primer (kurz):** 12 Bezirks‑VHS + Servicezentrum; 6 DVV‑Programmbereiche; Semesterlogik
  (`H`/`F`, Suffix in Kursnummer); Formate (Präsenz/Online/vhs.cloud/Bildungsurlaub); Preis +
  ermäßigtes Entgelt (Berlinpass etc.); Anmeldung läuft je Bezirks‑VHS.
- **Arbeitsweise:** einfache Einzelfrage → 1× `searchVhsCourses`; Constraints → mit `filter`;
  „aktuell frei?/Anmeldeschluss" → `searchVhsLive`; Hintergrund/allgemein → `searchWeb`.
  Bei vagen Wünschen 1 gezielte Rückfrage (Bezirk? online/vor Ort? Vorkenntnisse? Zeitfenster?),
  dann suchen.
- **Belege/Form:** jeder empfohlene Kurs mit **Titel, Kursnummer, VHS/Bezirk, Beginn+Rhythmus, Preis,
  Link**. Keine erfundenen Kurse/Preise/Termine. Nichts gefunden → sagen + Suchbegriff/Filter
  anpassen vorschlagen. Antworten kompakt, Listen/Tabellen; kein Fach‑Essay.
- Pro Tool ein `<tool_guidance>`‑Block (s. 4.4).

### 4.6 Modelle `[Adapt]`

- Gateway **OpenRouter bleibt** (`providers.ts` unverändert).
- `.env.example` bereinigen (Vertex‑Block ist tote Doku).
- Default‑Chat‑Modell: schnelles Tool‑fähiges Modell mit **niedrigerem Reasoning‑Effort** als bei
  FNR (Antworten sind kürzer/listiger) — z. B. `google/gemini-3.7-flash` mit `reasoningEffort: "low"`
  oder ein günstigeres Flash/Haiku‑Modell. Titel‑Modell (`claude-haiku-4-5`) unverändert.
- Embedding: `text-embedding-3-small` (512 dim) beibehalten, **sofern** der bereitgestellte
  Pinecone‑Index diese Dimension hat — sonst Modell/Dim an den Index anpassen (ein Wert, zentral in
  `vhs_pipeline` + `search-vhs-courses.ts`).

### 4.7 Frontend `[Adapt, gering]`

- Branding: Name, Logo, Farben, `app/(chat)/opengraph-image`, `layout.tsx`‑Metadaten,
  `greeting.tsx`, `suggested-actions.tsx` (VHS‑Beispiel‑Prompts: „Yogakurs in Neukölln am
  Wochenende", „Spanisch A2 online", „Bildungsurlaub Fotografie").
- Ergebnis‑Darstellung: Standard‑Markdown reicht; optional eine kleine **Kurs‑Karten‑Komponente**
  (Titel, Bezirk, Termine, Preis, Button „Zur Buchung"). Nicht MVP‑kritisch.
- Auth: Gast‑Zugang aktiv lassen (öffentliches Publikum); Rate‑Limits in `entitlements.ts` ggf.
  großzügiger für `guest`.
- `get-weather`‑UI‑Reste (`weather.tsx`) entfernen.

### 4.8 Konfiguration / Infra

| Env | Zweck | Status |
|---|---|---|
| `OPENROUTER_API_KEY` | LLM‑Gateway | reuse |
| `OPENAI_API_KEY` | Embeddings (Query + Pipeline) | reuse |
| `PINECONE_API_KEY`, `PINECONE_INDEX_HOST` | Vektor‑Store (vom Nutzer bereitgestellt) | **neu befüllen** |
| `PINECONE_NAMESPACE` (statt `_PREFIX`) | `courses` | neu |
| `LINKUP_API_KEY` | Websuche | reuse |
| `POSTGRES_URL`, `REDIS_URL`, `BLOB_READ_WRITE_TOKEN`, `AUTH_SECRET`, `BREVO_*` | App‑Infra | reuse |
| entfällt | `PINECONE_WEBSITE_*`, alle `GOOGLE_VERTEX_*` / `GOOGLE_CLIENT_EMAIL` / `GOOGLE_PRIVATE_KEY` | löschen |
| neu | `VHS_OPENDATA_URL` (Default s. o.), `VHS_LIVE_BASE` (`…/VHSKURSE/BusinessPages/`) | für Pipeline + Live‑Tool |

Cron: GitHub Action `schedule` (z. B. stündlich `fetch`+`build_index` Delta) **oder** Vercel Cron
→ interne Route/Worker. Pinecone‑Index‑Aufbau: der Nutzer stellt den leeren Index bereit; die
Pipeline definiert Struktur (ein Dense‑Index, `courses`‑Namespace, Metadata‑Felder aus 4.3) und den
Upsert.

---

## 5 · Umsetzungsreihenfolge

1. **Repo‑Setup:** `chatbot-ui/` als Basis übernehmen (neues Repo/Branch), `get-weather` +
   `search-fnr-website` + `fnr_pipeline/01,02` entfernen, `.env.example` bereinigen, Branding‑TODOs
   markieren. *(0,5 Tag)*
2. **`vhs_pipeline/fetch.py` + `normalize.py`:** Open Data laden, Snapshot, flaches Datenmodell (4.2)
   inkl. Array/HTML/Preis‑Edge‑Cases; als Test gegen `docs/reference/vhs-opendata-sample-course.json`
   + Volldatensatz. Output `data/output/courses.json`. *(1–1,5 Tage)*
3. **DVV‑Lookup‑Tabelle** (`vhs_pipeline/dvv_systematik.json`, Code→Bereich/Label) erstellen und in
   `normalize.py` einbinden. *(0,5 Tag)*
4. **`build_index.py`:** aus `04_rag_pipeline.py` ableiten — `build_course_text`, Single‑Namespace,
   Metadata (4.3), `content_hash`‑Resume, Delete verschwundener `guid`s. Gegen den bereitgestellten
   Pinecone‑Index laufen lassen (erst `--limit 50` Testlauf, dann voll). *(1–1,5 Tage)*
5. **`search-vhs-courses.ts`:** `search-fnr-projects.ts` kopieren, Namespace/Filter/Format/Description
   anpassen; lokal gegen den befüllten Index testen. *(1 Tag)*
6. **`api/chat/route.ts` + `prompts.ts`:** Toolset auf `[searchVhsCourses, searchWeb]` reduzieren,
   VHS‑System‑Prompt + Primer schreiben, Default‑Modell/Reasoning justieren. End‑to‑End‑Chat testen
   (typische Fragen: Bezirk/Format/Niveau/Preis/Zeit, „nichts gefunden", Vergleich). *(1–1,5 Tage)*
7. **`search-vhs-live.ts`:** ASP.NET‑POST‑Flow (Hidden‑Fields → Search‑POST → CourseList‑Parse,
   optional Pager), Stichwort‑id‑Mapping bundlen, Rate‑Limit + Cache; als Sekundär‑Tool einhängen
   + Prompt‑Guidance. *(1,5–2 Tage)*
8. **Frontend‑Feinschliff:** Branding, `suggested-actions`, optionale Kurs‑Karte, Gast‑Rate‑Limits.
   *(1 Tag)*
9. **Betrieb:** Cron für Pipeline (stündlich Delta / täglich), Monitoring (Treffer‑Anzahl‑Band,
   Pipeline‑Fehler → alten Index halten), Deploy (Vercel, Env‑Vars). *(0,5–1 Tag)*
10. **Optional später:** Two‑Tier/Reranking, mehrsprachige Queries (EN→DE), Umkreissuche über
    `venues.lat/lon`, „ähnliche Kurse", Merkliste, feinere DVV‑Feincode‑Labels.

**MVP (buchbar‑nützlich) = Schritte 1–6 + 9**, ca. **6–8 Personentage**. Schritt 7 (Live‑Sekundär)
und 8 danach.

---

## 6 · Risiken / offene Punkte

| Thema | Bewertung |
|---|---|
| Open‑Data‑Schema ändert sich beim Semesterwechsel (Montags) | `[V]` Sanity‑Checks + Snapshot‑Historie + „alten Index halten" fangen das ab. Feld‑Kardinalitäten defensiv parsen. |
| Pinecone‑Index‑Dimension ≠ `text-embedding-3-small`/512 | `[E]` Embedding‑Modell zentral konfigurierbar; vor Schritt 4 mit dem bereitgestellten Index abgleichen. |
| Live‑Tool: ASP.NET‑ViewState/Anti‑Bot bricht | `[F]` Kein `__EVENTVALIDATION`, BotID nicht auf dieser Domain; funktioniert im Test. Trotzdem als *nice‑to‑have* behandeln — RAG‑Primär trägt den MVP. |
| Aktualität der Verfügbarkeit im RAG | `[F]` `capacity_current` im Snapshot ist bis zu 1 h/1 Woche alt → Status im Prompt als „laut letztem Stand" kennzeichnen, für Verbindlichkeit auf `booking_url`/`searchVhsLive` verweisen. |
| DVV‑Feincode‑Labels unvollständig | `[E]` Grobbereich (1–6) ist sicher ableitbar; Feincode‑Klartext notfalls aus `schlagwort`‑Korrelation oder DIE‑Systematik nachziehen. |
| Encoding | `[F]` Open Data = UTF‑8 (sauber), Live‑`.aspx` = ISO‑8859‑15 (im Live‑Parser `decode('iso-8859-15')`). |

---

## 7 · Quellen

- Open‑Data‑Datensatz: <https://daten.berlin.de/datensaetze/kurse> · GovData:
  <https://data.gov.de/suche/daten/kurse-der-berliner-volkshochschulen>
- Endpunkte: `https://www.vhsit.berlin.de/VHSKURSE/OpenData/Kurse.json` / `Kurse.xml`
- Live‑Suche: `https://www.vhsit.berlin.de/VHSKURSE/BusinessPages/CourseSearch.aspx`
  → `CourseList.aspx` → `CourseDetail.aspx?id={guid}`
- Kursübersicht (redaktionell): <https://www.berlin.de/vhs/kurse/>
- DVV‑Systematik / VHS‑Statistik (DIE): <https://www.volkshochschule.de/vhs-welt/die-vhs-kennenlernen/themenbereiche.php>
- Moor Intelligence (analysiert): `github.com/Tim-Projekt/Moor-Intelligence` → `moor-intelligence/`

---

## 8 · Bundesweite Quelle + Adapter‑Architektur + Pipeline‑Testlauf (Update 2026‑09‑02)

### 8.1 Open‑vhs / `api.volkshochschule.de` — Analyse `[F]`

| Frage | Ergebnis |
|---|---|
| Was ist es? | **`api.volkshochschule.de` = Upload‑Seite** des *vhs‑Kursfinder*. VHS *pushen* ihren Vollkatalog als **Open‑vhs‑XML** an `POST https://api.volkshochschule.de/1/upload` (`multipart/form-data`: `file` + `access_token`). Phoenix‑Web‑App, keine öffentliche REST‑API. |
| Öffentliche Lese‑/Query‑/Download‑API? | **Nein.** Die Spezifikation kennt nur den Upload. Der vhs‑Kursfinder (`volkshochschule.de/kursfinder`) hat eine Such‑UI, aber kein dokumentiertes/öffentliches Abfrage‑Backend. Kein `openapi.json`; jeder unbekannte Pfad → `{"error":"unknown"}`. |
| Format‑Spezifikation | Open‑vhs **1.2** (0.9–1.1 noch im Feld): <https://api.vhs-kursfinder.de/openvhs-1.2> + `openvhs-1.2.xml` (Beispiel → `vhs_pipeline/tests/fixtures/`) + `openvhs-1.2.xsd`. Belegungsstatus‑Delta: `openvhs-belegungsstatus-1.0`. |
| Anbieter‑Identifikation | XML `export/ersteller` (`guid` + `name`) + zugeteilter Access‑Token. **Eine Datei pro VHS.** |
| Update‑Mechanik | **Stammdaten: nur Vollabzug** (jeder Upload ersetzt den kompletten Bestand des Erstellers, keine Diffs). **Belegungsstatus: stündliches Delta** (`guid` + `minimale/aktuelle/maximale_teilnehmerzahl`). |
| Abdeckung | Laut DVV speisen **> 50 % aller ~890 VHS** in den vhs‑Kursfinder ein — aber *hinein*, nicht abrufbar heraus. |
| Encoding / Validierung | UTF‑8, `xs:*`‑Typen, `guid` eindeutig über den ganzen Export, `webadresse` ≥ 1× Pflicht (ab 1.2), `dozent` **in 1.2 entfernt**. |

**Kanonische Open‑vhs‑`veranstaltung`‑Felder** (Beispiel‑XML verifiziert): `guid`, `nummer`,
`name`, `untertitel*`, `dvv_kategorie[@version]`, `merkmale/merkmal(name,wert)*` (u. a.
`kursart_digital`, `anmeldung_kostenlos`, `barrierefreies_lernen`, `vhscloud_kurs`), `level`,
`minimale|aktuelle|maximale_teilnehmerzahl`, `anzahl_termine`, `beginn_datum`, `dauer`,
`ende_datum`, `wochentag*`, `zielgruppe*`, `schlagwort*`, `zertifikat*(name,text)`,
`text*(eigenschaft,text)`, `veranstaltungsort(name, adresse(land,plz,ort,ortsteil,strasse),
barrierefrei)`, `termin*(beginn_datum,beginn_uhrzeit,ende_uhrzeit)`, `preis(betrag,
rabatt_moeglich, zusatz*)`, `webadresse+(typ∈{website,website_mobile,attachment,picture,video},
name,uri)`.

**Unterschiede Berlin‑Feed ↔ kanonisches Open‑vhs** `[F]`:

| | Berlin `Kurse.json` | Open‑vhs 1.2 |
|---|---|---|
| Serialisierung | JSON, Wurzel `veranstaltungen.veranstaltung[]` | XML, Namespace `http://www.dvv-vhs.de/Open-VHS` |
| Ort + Termine | verschachtelt `ortetermine{adresse[],termin[]}` (Adresse je Sitzung wiederholt) | flach: `veranstaltungsort` + wiederholtes `termin` |
| Berlin‑Extras | `bezirk`, `veranstaltungsart`, `anmeldung`, `ansprechperson`, `dozent`, `adresse.raum`, `adresse.behindertenzugang`, `adresse.breitengrad/laengengrad` | — (`dozent` ab 1.2 raus; Geo nur via Geocoding) |
| Fehlt in Berlin | `level`, `zertifikat`, `dauer`, `ortsteil`, reiche `merkmale` | — |
| `text.eigenschaft` | `"Beschreibung"` / `"Zusatzinformation"` | `"text"` |
| DVV‑Feincodes | zusätzlich `0.xx` (übergreifend) und `7.xx` (Alphabetisierung/Grundbildung) | Standard 1–6 |

→ Berlin ist ein **älterer Open‑vhs‑Dialekt + Berlin‑Erweiterungen**, als JSON serialisiert.
Generischer Open‑vhs‑Adapter und Berlin‑Adapter teilen ~90 % Feldlogik.

### 8.2 Konsequenz für „bundesweit"

- Kein Ein‑Endpunkt‑Vollabzug → **Source‑Registry** (`vhs_pipeline/sources.yaml`): pro
  Anbieter/Stadt ein Eintrag mit Feed‑URL + `namespace` + Adapter‑`kind`.
- **Ein generischer `openvhs`‑Adapter** deckt jede Quelle ab, die Open‑vhs‑XML publiziert
  (viele Städte/Kreise/Landesverbände als Open‑Data‑Export). Neue solche Quelle = **nur ein
  Registry‑Eintrag, kein Code**.
- Bespoke‑Quelle = ~40‑Zeilen‑Adapter‑Subklasse.
- Berlin heute die reichhaltigste öffentliche Einzelquelle (~10.230 Kurse, CC‑BY, stündlich).

### 8.3 Implementierte Architektur (`vhs_pipeline/`)

```
sources.yaml (Registry)
   └─ je Quelle:  fetch ─► SourceAdapter.iter_raw ─► SourceAdapter.to_course ─► enrich(DVV) ─► validate ─► data/processed/<id>.jsonl
                  adapters/base.py        adapters/{berlin,openvhs}.py       enrich.py       validate.py
                                                     ▼
                                        models.py — Course (48 Felder, schema_version="vhs-canonical-1")
                                        uid = "{source_id}:{provider.id}:{guid}"   namespace = "vhs/<quelle>"
```

| Datei | Rolle | Reuse aus Moor |
|---|---|---|
| `utils.py` | rate‑limited `fetch` + Retry, JSON/JSONL‑IO, `strip_html`, `as_list`, `to_decimal/int` | **Adapt** `fnr_pipeline/utils.py` |
| `models.py` | kanonisches `Course` + `Provider/Session/Venue/Price/Capacity`, `content_hash`, `make_uid`, Semester/Status‑Ableitung | **New** (Denke aus `03_export.py`) |
| `adapters/base.py` | `SourceAdapter`‑ABC: `fetch → snapshot → iter_raw → to_course` | **New** |
| `adapters/openvhs.py` | generischer Open‑vhs‑XML‑Adapter (0.9–1.2), stdlib `ElementTree`, `xml_to_dict` | **New** |
| `adapters/berlin.py` | Berlin‑Open‑Data‑JSON‑Adapter; 12 Bezirks‑VHS + Servicezentrum → je eigener `Provider` in `vhs/berlin` | **New** (löst `search-fnr-website`‑Rolle ab) |
| `registry.py` / `sources.yaml` | Quellenverwaltung (`enabled`, `url`/`local_path`, `namespace`, `encoding`, `region`) | **New** |
| `enrich.py` / `dvv_systematik.json` | `dvv_code → Bereich (1–6, sicher) + Feinlabel` (Feinlabels `verify:true`, aus DIE‑Systematik nachzuziehen) | **New** (ersetzt `classify_namespace`) |
| `validate.py` | Vollständigkeit · Schema‑Konsistenz · Normalisierung · Duplikate · stabile IDs · Namespace‑Isolation; Bericht + Exit‑Code | **New** |
| `run.py` | Orchestrator + Manifest; `--only`, `--no-fetch`, `--limit` | **Adapt** `fnr_pipeline/run.py` |
| `build_index.py` | Embedding (`text-embedding-3-small`, 512 dim) + Pinecone‑Upsert **je Namespace**; 1 Vektor/Kurs, `content_hash`‑Resume, Delete verschwundener `uid` | **Adapt** `fnr_pipeline/04_rag_pipeline.py` |

Namespace‑Regel: **genau ein `namespace` pro Quelle**; `validate_global` bricht bei Kollision ab.
Berlins Bezirke bleiben ein Namespace, sind aber über `provider.id` (`berlin-mitte`, …) filterbar.

### 8.4 Testlauf `python -m vhs_pipeline.run` `[F]` (2026‑09‑02)

```
source            ns                courses  prov  skip   ok
berlin            vhs/berlin          10230    13     0  yes     (Live‑Fetch 49 MB → parse+validate 23 s)
openvhs_fixture   vhs/_fixture            6     1     0  yes     (DVV‑Beispiel‑XML: Fulda/Berlin/Mainz/Ravensburg)
TOTAL                                 10236   all_ok=True
```

**Validierung Berlin:** kritische Felder (`uid,source_id,namespace,guid,title,booking_url`)
100 %; `description` 99,6 %, `dvv_bereich` 100 %, `start_date` 100 %, `sessions` 99,6 %,
`price` 100 %, Geo 81,9 %, `instructors` 99,1 %. **0 uid‑Kollisionen** (auch global), 0 guid‑
Wiederholungen, 2 Soft‑Dupes (`provider+nummer+start_date`, real). HTML‑Rückstände 0, alle
Datumswerte ISO, alle `booking_url` absolut, ein Namespace, ein kanonisches Key‑Set (48).
Format 7748 Präsenz / 2463 Online / 19 Blended · Status 8530 frei / 1517 voll / 183 unbekannt.

### 8.4b Embedding‑Lauf `python -m vhs_pipeline.build_index --source berlin` `[F]` (2026‑09‑02)

- Vector‑Store: Pinecone `vhs-kurse` (dense, **512 dim**, aws us‑east‑1). Embedding‑Modell
  `text-embedding-3-small` @ 512 (Index‑Dimension per `describe_index_stats` verifiziert).
- **10.230 Vektoren im Namespace `vhs/berlin`** (1 Vektor/Kurs, `id = uid`), ~5,5 min
  (80 Embedding‑Batches à 128, ~100 Upsert‑Batches à 100). `totalVectorCount = 10230`.
- Metadata pro Vektor: 34 Felder (s. `vhs_pipeline/README.md`) inkl. `booking_url`,
  `content_hash`, `dvv_bereich`, `course_format`, `price_amount`, `status`, `weekdays[]`,
  `keywords[]`, `lat/lon`, `text` (≤ 3500 Z.).
- Retrieval‑Stichprobe (Cosine): „spanisch für anfänger online" → Spanisch‑A1.1‑Online‑Kurse
  (0,69); „bildungsurlaub fotografie" → Bildungszeit‑Fotokurse (0,65); „excel grundlagen für
  den beruf" → Excel‑Grundlagen (0,66). Filter‑Metadata (Bezirk, Format, Preis) vorhanden.
- Config in `vhs_pipeline/.env` (gitignored): `PINECONE_API_KEY`, `PINECONE_INDEX_HOST`,
  `EMBED_MODEL`, `EMBED_DIM`. `OPENAI_API_KEY` aus der Umgebung.

**Offen / To‑do:**
- DVV‑Feinlabels (`dvv_systematik.json`, `verify:true`) durch die offizielle DIE‑Systematik ersetzen.
- Reale bundesweite Quellen ins Registry (Bonn‑Open‑Data zuerst prüfen: echtes Open‑vhs‑XML? sonst
  kleiner Adapter). Templates in `sources.yaml`. Je Quelle: `run.py` → `build_index.py --source <id>`
  (eigener Namespace `vhs/<id>`).
- Optionaler stündlicher `status`‑Refresh über das Open‑vhs‑Belegungsstatus‑Delta (ohne Vollabzug).
- Agent‑Tool `search-vhs-courses.ts` (aus `search-fnr-projects.ts`) gegen Namespace `vhs/berlin`
  + Metadata‑Filter (Bezirk/Format/Preis/Datum) — Retrieval‑Schicht steht damit.

### 8.5 Quellen (Update)

- Open‑vhs‑Spezifikation 1.2: <https://api.vhs-kursfinder.de/openvhs-1.2> · Upload:
  `https://api.volkshochschule.de/1/upload` · vhs‑Kursfinder: <https://www.volkshochschule.de/kursfinder.php>
- Bonn‑Open‑Data (Kandidat): <https://opendata.bonn.de/dataset/programm-kurse-veranstaltungen-volkshochschule-vhs>

---

## 9 · Agent-Integration (Update 2026‑09‑02)

Neuer App‑Ordner **`chatbot-ui/`** — Kopie des Moor‑Next.js‑Templates, zum VHS‑Agenten umgebaut.

### Änderungen

| Bereich | Änderung |
|---|---|
| **Retrieval‑Tool** | `lib/ai/tools/search-vhs-courses.ts` (aus `search-fnr-projects.ts`): OpenAI‑Embedding `text-embedding-3-small` @ **512 dim** → Pinecone `POST /query` gegen Namespace `PINECONE_NAMESPACE` (`vhs/berlin`). Metadata‑Filter: `district`(→`region`), `format`, `online`, `dvv_bereich`, `free`, `max_price`(→`price_amount $lte`), `start_after`/`start_before`(→`start_date`), `weekday`(→`weekdays $in`). Ergebnis‑Formatierung mit Kursnr., VHS/Bezirk, Termin, Preis+ermäßigt, Status, `booking_url`. |
| **Entfernt** | `search-fnr-projects.ts`, `search-fnr-website.ts`, `get-weather.ts` + Referenzen in `lib/types.ts`, `components/chat/message.tsx`, `route.ts`. `web-search.ts` bleibt (Tertiärquelle), Description auf VHS‑Kontext. |
| **System Prompt** | `lib/ai/prompts.ts` komplett neu: Rolle „Kursberatungs‑Assistent der Berliner VHS", Primer (12 Bezirks‑VHS, DVV‑Bereiche, Semester `H`/`F`, Formate, Entgelt/Ermäßigung, GER‑Stufen), Arbeitsweise (1 Rückfrage bei vagem Wunsch, dann suchen), Belegpflicht (Kursnr.+Link, nichts erfinden), Katalogstand‑Caveat. `<tool_guidance>` für `searchVhsCourses` + `searchWeb`. `titlePrompt` auf VHS‑Beispiele. Agent‑Loop (`route.ts`: `stepCountIs(20)`, Fallback‑Synthese, Approval‑Flow, resumable streams) **unverändert**. |
| **Modelle** | unverändert: OpenRouter‑Gateway, Default `google/gemini-3.7-flash`, Titel `anthropic/claude-haiku-4-5`. |
| **DB** | Neuer Supabase‑Transaction‑Pooler (`aws-0-eu-west-2.pooler.supabase.com:6543`) in `chatbot-ui/.env.local`. `migrate.ts`/`queries.ts` haben bereits `prepare:false` + SSL → pooler‑kompatibel. `pnpm db:migrate` erfolgreich (alle Tabellen angelegt). |
| **Env** (`chatbot-ui/.env.local`, gitignored) | `AUTH_SECRET` (neu generiert), `POSTGRES_URL` (neu), `OPENROUTER_API_KEY` + `OPENAI_API_KEY` + `LINKUP_API_KEY` (aus Moor‑Projekt), `PINECONE_API_KEY` + `PINECONE_INDEX_HOST` + `PINECONE_NAMESPACE=vhs/berlin`. Optional weggelassen: `REDIS_URL` (resumable streams — Fallback greift), `BLOB_*` (Uploads), `BREVO_*` (Reset‑Mails), alle `GOOGLE_VERTEX_*`. |

### Start & Verifikation `[F]` (localhost)

```bash
cd chatbot-ui
pnpm install            # packageManager auf pnpm@11.8.0 gesetzt
pnpm db:migrate         # → Migrations completed
pnpm dev                # → http://localhost:3000  (Next 16, Turbopack, "Ready in 17.8s")
```

- Guest‑Auth‑Flow (`/api/auth/guest`) legt Gast‑User in Supabase an → `User=2, Chat=2, Message_v2=4` nach den Tests.
- End‑to‑End‑Chat („Yogakurs in Pankow, abends"): Modell ruft `searchVhsCourses` mit
  `{query:"Yoga abends", filter:{district:"Pankow"}}` → Pinecone liefert echte VHS‑Pankow‑Kurse →
  strukturierte Antwort mit Kursnummern, Abendterminen, Preisen (inkl. ermäßigt),
  `CourseDetail.aspx`‑Buchungslinks, Katalogstand‑Hinweis und einer gezielten Rückfrage.
- Bekannte, unkritische Dev‑Logs: BotId „[Dev Only] … will return HUMAN"; OpenRouter
  „reasoning_details … missing signatures" (Gemini thought‑signatures, bricht Streaming nicht).

### Offen
- `sharp` postinstall lief nicht durch (nur Next‑Bildoptimierung betroffen; Chat unberührt).
- Optional: `REDIS_URL` für resumable streams, Branding (`greeting.tsx`, `suggested-actions.tsx`,
  OpenGraph), Kurs‑Karten‑Komponente statt reinem Markdown, `search-vhs-live` (ASP.NET‑Sekundärtool).
