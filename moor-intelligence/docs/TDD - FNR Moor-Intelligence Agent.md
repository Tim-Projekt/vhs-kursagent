# Technical Design Document
## FNR Moor-Intelligence Agent

**Version:** 1.2  
**Datum:** 18. Juni 2026  
**Status:** Entwurf – basierend auf PRD v0.1  
**Basis:** PRD – FNR Moor-Intelligence Agent (18. Juni 2026)  
**Änderungen v1.1:** RAG-Strategie auf agentisches iteratives Retrieval umgestellt; BM25 als optionale Erweiterung klassifiziert; emergentes Komplexitätsrouting via Tool-Design und "Plan-First"-Prompt ergänzt  
**Änderungen v1.2:** Corpus Index ausgebaut zu Zwei-Schichten-Modell (statistische Coverage + semantische Befundebene); vollständiges Extraktionsschema mit Projekt-Digest-Datenmodell; Extraktionspipeline, Kosten und Querybarkeit detailliert; drei Lückentypen für F4 spezifiziert; Risiko Vokabular-Inkonsistenz ergänzt

---

## Kurzfassung

Der FNR Moor-Intelligence Agent ist kein Suchsystem. Er ist ein Synthesewerkzeug. Diese Unterscheidung treibt sämtliche Architekturentscheidungen in diesem Dokument.

Die empfohlene Architektur ist eine **Drei-Schichten-Hybrid-Architektur**: ein vorberechneter Wissensindex für Korpus-Metafragen, ein agentisches iteratives Retrieval via Werkzeugaufruf für dokumentenbasierte Synthese und ein permanenter Kontextrahmen für institutionelles und fachliches Hintergrundwissen. Ein einzelner, gut konfigurierter Agent übernimmt die Orchestrierung – er entscheidet selbst, wann, wie oft und mit welchen Suchanfragen er retrievet. Kein Single-Pass-RAG. Kein Multi-Agent-System in der MVP-Phase.

Die kritischen Hebel in absteigender Wirkungspriorität: Tool-Design und Retrieval-Qualität, institutionelles Kontextmodell, "Plan-First"-Prompt für Komplexitätsrouting und Quellenverankerung, Evaluierungsrahmen.

Fine-Tuning wird bewusst ausgeschlossen. Ein vorkonfigurierter Wissenskorpus in einem Vector-Datenbankindex ist wartbarer, nachvollziehbarer und zuverlässiger für faktisches Wissen.

---

## 1. Anforderungsanalyse

### 1.1 Kernziele des Systems

Das PRD definiert eine klare Systemintention: institutionelles Gedächtnis und fachliche Synthesekapazität bereitzustellen. Die FNR akkumuliert Wissen, das fragmentiert, heterogen und nicht aggregierbar ist. Das System muss dieses Wissen synthetisch zugänglich machen – nicht durchsuchbar.

Daraus leiten sich drei operative Kernziele ab:

1. **Themenübergreifende Synthese** über Projektgrenzen hinweg (nicht einzeldokumentbasierte Antwort)
2. **Quellentransparenz** – jede inhaltliche Aussage auf konkrete Dokumente zurückführbar
3. **Unsicherheitskalibrierung** – das System unterscheidet zwischen Belegtem, Abgeleitetem, Systemwissen und Unbekanntem

### 1.2 Nutzerprofil und Entscheidungstypen

Zwei Nutzergruppen mit fundamental unterschiedlichem Informationsbedarf:

**Primär: FNR-Fachreferenten**
Mittlere bis hohe Fachkompetenz. Bedürfen nicht Erklärung, sondern Synthese. Stellen Fragen wie: "Was wissen wir über THG-Minderung durch Schilfanbau?" oder "Welche Wiedervernässungsmethoden wurden in Niedersachsen erprobt?" Sie können Antwortqualität einschätzen, aber nicht vollständig verifizieren.

**Sekundär: BMLEH-Referenten**
Strategischer Fragebedarf. Wollen gesicherte Aussagen mit klarer Evidenzlage und expliziten Einschränkungen. Können Detailaussagen des Systems nicht unabhängig überprüfen – daher besonders hoher Bedarf an Verlässlichkeit und Quellentransparenz.

### 1.3 Abgeleitete Systemfähigkeiten

| Fähigkeit | Beschreibung | Kritikalität |
|---|---|---|
| **Thematische Synthese** | Übergreifende Antworten aus mehreren Projektdokumenten | Kern – ohne diese kein sinnvolles Produkt |
| **Vergleichende Analyse** | Gegenüberstellung von Ansätzen, Ergebnissen, Methoden | Kern |
| **Quellentransparenz** | Jede Aussage verweist auf konkrete Quellen | Kern – systemisches Vertrauenselement |
| **Unsicherheitssignaling** | Unterscheidung: belegt / abgeleitet / Systemwissen / unbekannt | Kern |
| **Lückenidentifikation** | Benennung unterrepräsentierter Themen im Korpus | Hoch |
| **Institutioneller Kontext** | FNR-Förderlogik, zwei-Ministerien-Struktur verstehen | Hoch |
| **Domäneneinordnung** | Projektergebnisse in Forschungsstand einordnen | Mittel |
| **Akteurs-Mapping** | Wer forscht zu welchem Thema? | Mittel (Phase 2) |
| **Zeitliche Entwicklung** | Wie hat sich Erkenntnisstand entwickelt? | Mittel (Phase 2) |

### 1.4 Kritische Qualitätsanforderungen

Diese Anforderungen sind keine Features – sie sind Systemvoraussetzungen:

**Keine Halluzination bei Fakten.** Besonders bei Zahlen, Förderbeträgen, Projektergebnissen. Lieber explizite Wissenslücke als plausibel klingende Fehlinformation. Ein einziger schwerer Fehler in einem institutionellen Kontext untergräbt dauerhaft das Vertrauen.

**Quellenangabe als Pflicht.** Jede inhaltliche Aussage trägt eine Quellenreferenz oder eine explizite Kennzeichnung als Systemwissen/Inferenz. Keine Antwort ohne Begründungsrahmen.

**Konsistenz über Sessions.** Gleiche Frage muss (bei gleichem Wissensstand) gleiche Antwort ergeben. Dies schließt stochastische Architekturvarianten bei der Faktenaussage aus.

**Vollständigkeitssignaling.** Das System muss explizit kommunizieren, wenn es eine Frage nicht vollständig beantworten kann – und einschätzen, ob die Lücke im Datenmaterial oder in der Fragestellung liegt.

---

## 2. Stand der Technik: Agentensysteme 2026

### 2.1 Was sich empirisch bewährt hat

**Agentisches, iteratives Retrieval schlägt Single-Pass-RAG bei Syntheseaufgaben.**
Wenn das LLM die Suchanfragen selbst formuliert und mehrere gezielte Suchen durchführen kann, ist die Retrievalqualität für Synthesefragen erheblich besser als bei einer einzigen, vom Nutzer abgeleiteten Vektorsuche. Die User-Query ist zu arm an Signal, um alle relevanten Aspekte einer Synthesefrage in einem einzigen Embedding zu erfassen. Agentic RAG macht das Retrieval zur Entscheidungsaufgabe des Modells – nicht zur Pipeline-Vorstufe.

**Semantische Suche ist das primäre Retrieval-Werkzeug.**
Moderne Embedding-Modelle (multilingual-e5-large, text-embedding-3-large) erfassen konzeptuelle Ähnlichkeit zuverlässig – auch für wissenschaftlichen Fachjargon auf Deutsch. In Kombination mit präzisen, vom LLM formulierten Suchanfragen deckt semantische Suche den Großteil der Retrieval-Anforderungen ab. BM25 (lexikalische Suche) kann in bestimmten Randfällen ergänzen, ist aber kein Standardbestandteil.

**Parent-Child-Chunking ist Produktionsstandard.**
Kleine Chunks (ca. 200 Token) für präzises Retrieval, größere Eltern-Chunks (600–800 Token) für Kontext. Das Modell erhält beim Retrieval-Treffer den Eltern-Chunk – besser informiert, ohne die Retrieval-Präzision zu opfern.

**RAG reduziert Halluzination um bis zu 71 % gegenüber reiner Parametrierung.**
Bei korrekt implementiertem RAG mit Chunk-IDs und Quellenverankerung in Prompts. Schlecht implementiertes RAG halluziniert in 40 % der Fälle. Qualität des RAG-Systems – nicht Modellqualität – ist der entscheidende Hebel.

**Retrieval → Long-Context-Synthese als Hybrid dominiert.**
Weder reines RAG noch reines Long-Context-Stuffing gewinnt empirisch. Der überlegene Ansatz: relevante Dokumente per Retrieval selektieren, dann 100–300K Token Kontext für Synthese nutzen. Dies maximiert Qualität bei akzeptablen Latenz- und Kostenkosten.

**Prompting löst ~70 % der Verhaltens- und Qualitätsprobleme.**
Der Aufwand für Prompt-Engineering ist fast immer effizienter als Fine-Tuning oder Architekturwechsel.

### 2.2 Was häufig überschätzt wird

**Fine-Tuning für Faktenwissen.**
Fine-Tuning codiert Wissen in Gewichten – das führt zu erhöhtem Halluzinationsrisiko bei Detailfakten. Für ein System, das auf Abschlussberichte verweisen muss, ist Fine-Tuning des Grundmodells kontraproduktiv. RAG ist für faktisches Wissen zuverlässiger und aktualisierbar.

**Multi-Agent-Systeme als Standardarchitektur.**
Empirisch zeigen aktuelle Benchmarks: Single-Agent-Systeme mit Werkzeugzugriff erreichen Multi-Agent-Leistung bei 4-fach niedrigerem Rechenaufwand. Multi-Agent verbessert nur parallelisierbare Aufgaben substantiell (+81 %). Für sequentielle Syntheseaufgaben (wie die meisten Nutzerfragen) ist Multi-Agent häufig schlechter.

**1M-Token-Kontextfenster als RAG-Ersatz.**
1M-Token-Kontext ist 1.250-mal teurer als RAG pro Abfrage. Accuracy degradiert ab ~60–70 % des genutzten Kontextfensters. Für einen Produktivbetrieb mit vielen Anfragen ungeeignet als primäre Strategie.

**Komplexe Agenten-Frameworks (LangChain, AutoGen, CrewAI) für Standard-RAG.**
Für einfache bis mittlere Retrieval-Syntheseaufgaben erzeugen diese Frameworks Overhead ohne Qualitätsgewinn. Sie erhöhen die Debugging-Komplexität und verschleiern Fehlerquellen. Direkte API-Nutzung mit gezieltem Tooling ist wartbarer.

### 2.3 Kritische technische Hebel (empirisch rangiert)

1. **Retrieval-Qualität** (Recall@K, Relevanz der retrievelten Chunks)
2. **Kontextstrukturierung** (Was geht in welcher Reihenfolge mit welchem Framing in den Kontext?)
3. **Prompt-Engineering für Quellenverankerung und Unsicherheitssignaling**
4. **Datenbasis-Qualität** (Vollständigkeit, Konsistenz der Ausgangsdokumente)
5. **Evaluierungsrahmen** (Kann Qualität gemessen werden? Kann Regression erkannt werden?)

---

## 3. Fundamentales Systemmodell

### 3.1 Wie Verständnis entsteht

Das Sprachmodell besitzt Domänenwissen über Moorschutz, Paludikultur und Klimaschutz aus dem Training – aber ohne Bezug auf FNR-spezifische Projekte. Projektwissen existiert nicht im Modell. Es muss zur Abfragezeit in den Kontext gebracht werden.

**Verständnis = Modellkapazität × Kontext-Qualität.**

Die entscheidende Variable ist nicht die Modellkapazität (alle führenden Modelle sind ausreichend für Deutsch und Fachkompetenz), sondern die Qualität des bereitgestellten Kontexts: Welche Informationen werden retrieviert? In welcher Struktur werden sie präsentiert? Welcher Rahmen wird mitgegeben?

### 3.2 Wie Synthese über viele Dokumente entsteht

Cross-Dokument-Synthese ist das technisch anspruchsvollste Problem des Systems. Sie erfordert:

1. **Dekompositon:** Die Frage wird in thematische Teilaspekte zerlegt
2. **Iteratives Retrieval:** Das Modell sucht gezielt nach jedem Aspekt mit eigenständig formulierten Suchanfragen
3. **Akkumulation:** Gefundene Chunks werden im wachsenden Kontext gesammelt
4. **Synthese:** Das Modell generiert eine kohärente Antwort über den gesamten akkumulierten Kontext – erkennt Übereinstimmungen, Widersprüche, Komplementäraussagen
5. **Zuordnung:** Jede Teilaussage wird einer Quelle zugeordnet

Der Mechanismus: **Query → "Plan-First"-Schritt (LLM analysiert Aspekte) → iterative search()-Aufrufe (3–6 Calls) → akkumulierter Kontext mit Quellenankern → Synthesegenerierung**.

Das Modell synthetisiert nicht aus einer einmaligen Pipeline-Retrieval-Stufe. Es baut seinen Kontext aktiv auf – wie ein Forscher, der gezielt Quellen sucht, bevor er schreibt. Diese aktive Kontextakkumulation ist der Kernmechanismus für Synthesequalität.

### 3.3 Wie Quellentransparenz gewährleistet wird

Quellentransparenz ist keine Modelleigenschaft – sie ist ein Systementwurfsmerkmal:

- **Jeder Chunk im Vector-Index trägt eine eindeutige ID** (Projekt-ID + Dokument-ID + Chunk-Nummer)
- **Retrieval gibt Chunks mit Metadaten zurück:** Projekt, Berichtstyp, Jahr, Förderlinie
- **Kontext-Template** strukturiert den Input explizit: `[Quelle: Projekt 12345, Abschlussbericht 2023, Abschnitt 4.2]: <Chunkinhalt>`
- **System-Prompt verpflichtet das Modell:** jede Faktaussage mit `[Q:ID]`-Verweis zu versehen
- **Antwortformat** enthält mandatory Quellenabschnitt am Ende

### 3.4 Wie Verlässlichkeit und Konsistenz entstehen

Konsistenz (gleiche Frage → gleiche Antwort) erfordert:

- **Deterministische Retrieval-Parameter:** fester Embedding-Algorithmus, feste Top-K-Werte, konsistente Metadaten-Filter
- **Niedriger Temperature-Wert** bei der Textgenerierung (0.0–0.2 für Faktaussagen)
- **Versionierung der Wissensbasis:** Datenbankstand-Snapshot pro Deployment; Antwortverhalten kann einem Wissensstand-Datum zugeordnet werden
- **Keine stochastische Modell-Routing-Logik** im kritischen Antwortpfad

---

## 4. Architekturoptionen und Trade-off-Analyse

### 4.1 Option A: Single-Pass semantische Suche

**Beschreibung:** User-Query → Embedding → Vector-Suche → Top-K Chunks → LLM-Antwort (einmaliger Retrieval-Pass)

| Kriterium | Bewertung |
|---|---|
| Entwicklungsaufwand | Sehr niedrig |
| Synthesequalität | Unzureichend – User-Query zu arm für Aspekt-Retrieval |
| Quellentransparenz | Schwach – nur oberflächlich umsetzbar |
| Lückenidentifikation | Nicht möglich |
| Flexibilität bei Nachfragen | Keine |

**Urteil:** Nicht geeignet. Kann F1 und F2 nicht erfüllen. Produziert Antworten auf Einzeldokument-Niveau, keine echte Synthese. Besonders schwach bei mehrdimensionalen Fragen, bei denen eine User-Query nicht alle relevanten Suchaspekte abdeckt.

### 4.2 Option B: Agentisches iteratives Retrieval (mit optionalem BM25-Hybrid)

**Beschreibung:** LLM als aktiver Suchagent – formuliert eigene Suchanfragen, führt mehrere semantische search()-Calls durch, akkumuliert Kontext, synthetisiert. BM25 als optionale Erweiterung wenn Evaluierung lexikalische Lücken zeigt.

| Kriterium | Bewertung |
|---|---|
| Synthesequalität | Hoch – LLM steuert Aspektabdeckung selbst |
| Quellentransparenz | Vollständig umsetzbar |
| Lückenidentifikation (F4) | Schwach – erfordert Zusatzkomponente |
| Flexibilität bei Nachfragen | Hoch |
| Wartbarkeit | Gut – klare Tool-Schnittstellen |
| Kosten | Moderat (mehrere LLM-Calls pro Query) |

**Urteil:** Geeignet als Kernkomponente. Abdeckt MVP-Anforderungen F1–F3. Erfordert Ergänzung für F4.

### 4.3 Option C: Long-Context-Stuffing

**Beschreibung:** Alle oder viele Dokumente werden direkt in ein sehr langes Kontextfenster gegeben.

| Kriterium | Bewertung |
|---|---|
| Synthesequalität | Sehr gut wenn alles im Kontext |
| Skalierbarkeit | Nicht geeignet für großen Corpus |
| Kosten | 1.250-fach höher als RAG pro Query |
| Latenz | 30–60 Sekunden statt ~1 Sekunde |
| MVP-Eignung | Nur bei <50 kurzen Dokumenten |

**Urteil:** Nicht als Primärstrategie geeignet. Kann als Fallback für komplexe Synthesequeries genutzt werden, wenn Corpus-Subset selektiert wurde. Nicht für Produktivbetrieb mit normalem Abfragevolumen.

### 4.4 Option D: Agentische Deep-Research-Schleife

**Beschreibung:** Autonome Abfrageschleife – Agent plant Suchschritte, reflektiert über Lücken, führt weitere Abfragen durch, konsolidiert.

| Kriterium | Bewertung |
|---|---|
| Qualität bei komplexen Fragen | Hoch |
| Latenz | Hoch (3–10 Sekunden pro Iteration, mehrere Iterationen) |
| Vorhersehbarkeit | Niedrig |
| Debugging-Aufwand | Hoch |
| Eignung als Standardpfad | Nicht geeignet |

**Urteil:** Geeignet als Sonderpfad für besonders komplexe Synthese- und Gap-Fragen. Nicht als Standard-Architektur. Kann ab Phase 2 als optionale "Deep Research"-Funktion für F4 und F6 eingeführt werden.

### 4.5 Option E: Vorberechnete Wissensstruktur (Offline-Index)

**Beschreibung:** Offline-Preprocessing: LLM extrahiert strukturiertes Wissen aus Dokumenten (Entitäten, Themen, Methoden, Ergebnisse, Schlussfolgerungen) → Strukturierte Datenbank → Querys gegen strukturierte Daten

| Kriterium | Bewertung |
|---|---|
| Lückenidentifikation (F4) | Sehr gut |
| Akteurs-Mapping (F5) | Sehr gut |
| Faktensynthese | Gut für vordefinierte Strukturen |
| Schema-Designaufwand | Hoch |
| Fragile gegenüber unerwarteten Fragen | Ja |

**Urteil:** Geeignet als Ergänzungskomponente, nicht als primäre Architektur. Essentiell für F4 (Lückenidentifikation) und F5 (Akteurs-Mapping), da diese Funktionen nicht durch Retrieval allein abbildbar sind.

### 4.6 Option F: Hybride Drei-Schichten-Architektur (Empfehlung)

**Beschreibung:** Kombination von B + E + permanentem Kontextrahmen:

- **Schicht 1:** Permanenter Kontextrahmen (institutionelles Wissen, Domänenmodell) → immer im Kontext
- **Schicht 2:** Agentisches iteratives Retrieval via Werkzeugaufruf → Standard-Abfragepfad
- **Schicht 3:** Vorberechneter Korpus-Index → für Metafragen (Lücken, Akteure, Verteilung)

| Kriterium | Bewertung |
|---|---|
| Synthesequalität (F1, F2) | Hoch |
| Quellentransparenz (F3) | Vollständig |
| Lückenidentifikation (F4) | Gut (Schicht 3) |
| Skalierbarkeit | Gut |
| Wartbarkeit | Mittel |
| Komplexität | Mittel – beherrschbar |

**Urteil:** Diese Architektur wird empfohlen. Die Komplexität ist höher als Option B, aber der Zugewinn bei F4/F5 und die bessere institutionelle Kontextverankerung rechtfertigen die Zusatzkomponente.

---

## 5. Empfohlene Architektur

### 5.1 Gesamtbild

```
┌───────────────────────────────────────────────────────────────────┐
│                         NUTZER-INTERFACE                          │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────────┐
│                    LLM-AGENT (Orchestrierung)                     │
│  1. "Plan-First": Komplexität einschätzen, Suchplan formulieren   │
│  2. Iterative Tool-Calls (search, get_section, analyze_coverage)  │
│  3. Kontext akkumulieren + Synthese generieren                    │
└───┬───────────────────┬──────────────────────┬────────────────────┘
    │                   │                      │
    ▼ (immer im         ▼ (Tool-Calls,         ▼ (Tool-Call,
    System-Prompt)      1–6× pro Query)        bei Gap-Fragen)
    │                   │                      │
┌──────────┐   ┌────────────────────┐   ┌─────────────────┐
│PERMANENTER│   │ AGENTISCHES        │   │  KORPUS-INDEX   │
│KONTEXT-  │   │ RETRIEVAL          │   │  (Vorberechnet) │
│RAHMEN    │   │                    │   │                 │
│          │   │ search(query,      │   │ Themenverteilung│
│FNR-Logik │   │   filters?)        │   │ Akteurs-Mapping │
│Förder-   │   │                    │   │ Coverage-Analyse│
│struktur  │   │ get_section(       │   │                 │
│Akteurs-  │   │   project_id,      │   │ analyze_coverage│
│karte     │   │   section)         │   │ (topic)         │
│Domänen-  │   │                    │   │                 │
│modell    │   └────────────────────┘   └─────────────────┘
│          │            │
└──────────┘            ▼
               ┌──────────────────────┐
               │  VECTOR-DATENBANK    │
               │  (Projektwissen)     │
               │                      │
               │ Semantische Suche    │
               │ + Metadaten-Filter   │
               │                      │
               │ Chunks + Metadaten   │
               │ (Projekt-ID,         │
               │  Dokumenttyp,        │
               │  Jahr, Themen,       │
               │  Fördertyp, Region)  │
               └──────────────────────┘
```

### 5.2 Wissensschichten und ihre Repräsentation

**Schicht A: Institutionelles Kontextwissen → System-Prompt (immer verfügbar)**

Dieses Wissen soll NICHT retrieviert werden – es soll immer vorhanden sein:

- FNR-Förderlogik (Projekttypen FuE/MuD, Berichtspflichten, Förderprozess)
- Zwei-Ministerien-Struktur (BMLEH/FNR vs. BMUKN/ZUG) mit Abgrenzungen
- Nationale Moorschutzstrategie-Rahmen (10 Handlungsfelder, Kernemissionsziel)
- Akteurskarte (GMC, Thünen, HSWT, HNEE – Expertise-Zuordnung)
- Handlungsrahmen Paludikultur / Wiedervernässung / Schutz

**Warum System-Prompt statt Vector-DB:** Dieses Wissen ist bei nahezu jeder Abfrage relevant und muss ohne Retrieval-Qualitätsvarianz verfügbar sein. Es ist Referenzrahmen, nicht Suchobjekt. Im Vector-Index würde es mit projektspezifischen Chunks konkurrieren und bei bestimmten Abfragen nicht auftauchen.

**Schicht B: Projektwissen → Vector-Datenbank**

Jedes Dokument wird in Parent-Child-Chunks zerlegt:
- Child-Chunks: ~200 Token (Präzisions-Retrieval)
- Parent-Chunks: ~600–800 Token (Kontext-Bereitstellung)

**Pflicht-Metadaten je Chunk:**

| Feld | Beschreibung | Zweck |
|---|---|---|
| `projekt_id` | FNR-Projektnummer | Quellzuordnung |
| `projekt_titel` | Projekttitel | Quelldarstellung |
| `doc_typ` | Abschlussbericht / Zwischenbericht / Antrag / Publikation | Differenzierung nach Evidenzstärke |
| `jahr` | Berichtsjahr | Zeitliche Einordnung |
| `foerdertyp` | FuE / MuD | Charakterisierung des Projekttyps |
| `themen_tags` | Liste fachlicher Themen (Paludikultur, THG, Hydrologie…) | Metadaten-Filter |
| `region` | Bundesland / Regionstyp / Moortyp | Kontextualisierung |
| `institution` | Projektnehmende Institution(en) | Akteurs-Mapping |
| `chunk_id` | Eindeutige Chunk-Kennung | Zitationsanker |

**Schicht C: Fachwissenschaftliches Grundwissen**

Dieser Wissenstyp ist zu großen Teilen im Basismodell enthalten (GPT-4o, Claude Opus 4 sind umfassend in Moorschutz, Paludikultur, Klimawissenschaft trainiert). Ergänzend werden strukturierte Referenzdokumente (GMC-Leitpapiere, Thünen-Moorkataster-Übersichten) in die Vector-Datenbank aufgenommen – explizit gekennzeichnet als Sekundärliteratur (Nicht-FNR-Quelle, höhere Evidenzstärke).

**Keine Vollintegration externer Literaturdatenbanken im MVP** – dies erhöht Scope, Lizenzfragen und Pflegekomplexität unverhältnismäßig (vgl. PRD F4, offene Frage).

**Schicht D: Metawissen über Korpus → Strukturierter Projekt-Wissensindex (Offline)**

Dieser Wissenstyp kann nicht durch Retrieval entstehen – er erfordert Vorberechnung über den gesamten Corpus. Der Corpus Index ist kein rein statistisches System ("wie viele Projekte zu Thema X?"), sondern ein strukturierter Wissensindex, der Kernergebnisse, Schlussfolgerungen, Erfolgsfaktoren und Wissenslücken jedes Projekts querybar macht — ohne dass der Agent den Volltext retrieven und lesen muss.

Technischer Aufbau, Datenmodell, Kosten und Querybarkeit werden in Abschnitt 5.3 im Detail beschrieben.

*Laufzeitnutzung:*
- Lückenidentifikation (F4): `analyze_coverage()` → Coverage-Index-Query + aggregierte Desiderate
- Akteurs-Mapping (F5): `analyze_coverage()` → Akteurs-Index
- Schnellbewertung Projektergebnisse: `get_project_summary()` → strukturierte Projekt-Digest

### 5.3 Corpus Index – Aufbau, Datenmodell und Querybarkeit

Der Corpus Index ist die technisch eigenständigste Komponente des Systems. Er entsteht vollständig offline, wird bei jedem Corpus-Update regeneriert, und beantwortet eine Klasse von Fragen, die weder RAG noch Volltext-Retrieval beantworten können: Fragen über den Wissensstand des gesamten Corpus, über Muster über Projekte hinweg, über Konsens und Widerspruch in den Ergebnissen, und über das, was *nicht* da ist.

#### 5.3.1 Zwei-Schichten-Konzept

**Schicht I – Statistisch-strukturelle Ebene**

Quantitative Verteilungen und strukturelle Zusammenhänge:
- Wie viele Projekte adressieren Thema / Handlungsfeld X?
- Welche Institutionen forschen zu welchen Themen?
- Wie hat sich Forschungsschwerpunkt über Zeit entwickelt?
- Mapping gegen die 10 Handlungsfelder der Nationalen Moorschutzstrategie

**Schicht II – Semantische Befundebene**

Inhaltliche Essenz jedes Projekts, strukturiert extrahiert und querybar:
- Was sind die zentralen Ergebnisse? (mit Evidenzgrad und Geltungsbereich)
- Was sind die Schlussfolgerungen und Empfehlungen?
- Was sind Erfolgsfaktoren und Misserfolgsgründe?
- Welche Wissenslücken haben die Forscher selbst benannt?
- Wie wurde das Projektziel bewertet?

Diese Schicht macht es möglich, Projekte zu bewerten und zu vergleichen, ohne sie im Detail gelesen zu haben. Sie ist das eigentliche Differenzierungsmerkmal gegenüber einem einfachen Suchsystem.

#### 5.3.2 Extraktionspipeline: PDF → Corpus Index

```
PDF-Dokument
    │
    ▼ (Textextraktion: PyMuPDF / pdfplumber, OCR bei Scans)
Plaintext
    │
    ▼ (LLM-Extraktion: strukturierter Prompt → JSON)
Projekt-JSON (pro Dokument)
    │
    ▼ (Aggregation über alle Projekte)
Corpus Index (SQLite / JSON-DB)
    │
    ├── Themen-Index (Schicht I)
    ├── Handlungsfeld-Coverage-Matrix (Schicht I)
    ├── Akteurs-Index (Schicht I)
    ├── Projekt-Digests (Schicht II)
    └── Desiderate-Aggregation (Schicht II)
```

**Schritt 1: Textextraktion**

Standard-PDF-Parsing. Für gescannte Dokumente OCR-Vorverarbeitung erforderlich (Tesseract oder kommerzieller Dienst). Kein LLM in diesem Schritt. Output: sauberer Plaintext pro Dokument.

**Schritt 2: Strukturierte LLM-Extraktion (das Herzstück)**

Pro Dokument ein LLM-Call mit kontrolliertem Extraktionsprompt. Das Modell befüllt ein fixes JSON-Schema — kein freier Text, sondern geführte Klassifikation. Der Output ist vollständig maschinenlesbar.

**Extraktionsschema pro Dokument:**

```json
{
  "projekt_id": "FNR-2021-0456",
  "projekt_titel": "...",
  "foerdertyp": "MuD",
  "laufzeit": {"start": 2018, "ende": 2021},
  "institutionen": ["HSWT Weihenstephan", "TU Berlin"],
  "region": ["Brandenburg", "Niedermoor"],

  "themen": ["Typha-Anbau", "Wertschöpfungskette", "THG-Bilanz"],
  "handlungsfelder_nms": [3, 6],
  "methoden": ["Feldversuch", "THG-Flussmessung", "Marktstudie"],

  "kernergebnisse": [
    {
      "befund": "Typha-Ernteerträge von 8–12 t TM/ha/Jahr unter optimierten Bedingungen erreichbar",
      "evidenzlage": "gemessen",
      "geltungsbereich": "Niedermoor Brandenburg, GW-Stand > -10 cm",
      "konfidenz": "mittel"
    },
    {
      "befund": "Wirtschaftliche Tragfähigkeit ohne Subventionen unter aktuellen Marktbedingungen nicht gegeben",
      "evidenzlage": "berechnet",
      "geltungsbereich": "Deutschland, allgemein",
      "konfidenz": "hoch"
    }
  ],

  "schlussfolgerungen": [
    "Großflächiger Typha-Anbau ist technisch umsetzbar, Marktentwicklung bleibt kritischer Engpass",
    "Wassermanagement erfordert koordinierten Gebietsansatz; Einzelbetrieb nicht ausreichend"
  ],

  "empfehlungen": [
    {"adressat": "FNR", "text": "Förderaufruf zur Wertschöpfungskettenentwicklung empfohlen"},
    {"adressat": "Praxis", "text": "Kooperation mit Wasserverbänden als Vorbedingung für Standortwahl"}
  ],

  "erfolgsfaktoren": [
    "Vorabklärung Wasserrechtsfragen",
    "Enge Einbindung lokaler Landwirtschaftsbetriebe"
  ],

  "limitierungen": [
    "Ergebnisse nur für Niedermoore mit stabiler Wasserverfügbarkeit übertragbar",
    "Kein Monitoring nach Projektende – Langzeitwirkung unklar"
  ],

  "desiderate": [
    "Langzeitdaten (>5 Jahre) zur Bodenentwicklung unter Typha",
    "Qualitätsstandards für Typha-Erntegut als Dämmmaterial",
    "Wirtschaftlichkeitsanalyse unter CO2-Bepreisungsszenarien"
  ],

  "zielerreichung": "überwiegend erreicht",
  "projekterfolg_signale": [
    "Demonstrationsanlage erfolgreich etabliert",
    "Zwei Praxisbetriebe als Folgeprojektpartner gewonnen"
  ],

  "transferhemmnisse": [
    "Fehlende Abnehmerstrukturen für Typha-Biomasse",
    "Genehmigungsaufwand für Wasserstandsanhebung unterschätzt"
  ]
}
```

**Wichtig – Kontrolliertes Themen-Vokabular:**

Das `themen`-Feld wird nicht freitext befüllt. Der Extraktionsprompt enthält eine vorab definierte Themenliste (~50–80 Begriffe, abgeleitet aus den 10 Handlungsfeldern der NMS und den FNR-Förderschwerpunkten). Das LLM klassifiziert ausschließlich in diese Kategorien. Ohne kontrolliertes Vokabular entstehen inkonsistente Terme ("Schilfanbau" vs. "Phragmites-Kultivierung" vs. "Reetanbau"), die nicht aggregierbar sind.

Die Vokabular-Erstellung ist eine fachliche Vorleistung — sie erfordert FNR-Domänenkenntnis und muss vor dem Preprocessing abgeschlossen sein.

**Schritt 3: Aggregation**

Alle Einzel-JSONs werden zu einem queryablen Corpus Index zusammengeführt:

```json
{
  "themen_index": {
    "Typha-Anbau": {
      "projekt_count": 7,
      "projekte": ["FNR-0456", "FNR-0234", ...],
      "zeitraum": {"erste": 2015, "letzte": 2023},
      "institutionen": ["HSWT", "Uni Greifswald", "TU Berlin"],
      "aggregierte_befunde": [
        "Erträge 8–12 t TM/ha/Jahr (gemessen, 4 Projekte)",
        "Wirtschaftlichkeit ohne Förderung nicht gegeben (3 Projekte, konsistent)"
      ],
      "aggregierte_desiderate": [
        "Langzeitdaten Bodenentwicklung (5 Projekte)",
        "Qualitätsstandards Erntegut (3 Projekte)"
      ]
    }
  },

  "handlungsfeld_coverage": {
    "HF3_Paludikultur": {
      "projekt_count": 14,
      "themen_abgedeckt": ["Typha-Anbau", "Sphagnum-Produktion", ...],
      "themen_schwach": ["Export-Logistik", "Maschinenentwicklung nasse Böden"],
      "themen_fehlend": ["Qualitätsstandards", "Versicherungsmodelle"]
    }
  },

  "akteurs_index": {
    "HSWT": {
      "themen": ["Typha-Anbau", "Ernte-Methoden", "Sphagnum-Anbau"],
      "projekt_count": 5,
      "projekte": [...]
    }
  },

  "desiderate_aggregiert": [
    {
      "thema": "Langzeitdaten Bodenentwicklung unter Paludikultur",
      "genannt_in_n_projekten": 8,
      "projekte": ["FNR-0456", ...],
      "prioritaet_signal": "hoch"
    }
  ]
}
```

**Schritt 4: Speicherung**

Für MVP: SQLite-Datenbank oder strukturiertes JSON. Keine zusätzliche Infrastruktur erforderlich. Größenordnung bei 300 Projekten: 5–15 MB. Das `analyze_coverage()`-Tool liest per strukturierter SQL-Query oder JSON-Filter aus.

Optionale Erweiterung: Die `kernergebnisse` und `schlussfolgerungen` aus dem Projekt-JSON werden zusätzlich als speziell getaggte Chunks (`chunk_type: "project_digest"`) in die Vector-Datenbank aufgenommen. Dies ermöglicht semantische Suche über Projektergebnisse via `search()` — nicht nur strukturierte Abfragen. Damit überlappt der Corpus Index mit Schicht B.

#### 5.3.3 Kosten der Indexerstellung

Die Erstellung ist eine einmalige Offline-Berechnung. Kosten entstehen nur beim Preprocessing, nicht pro Nutzerabfrage.

**Annahme:** Mittlerer Abschlussbericht ~80 Seiten → ~40.000 Token Input; Extraktionsprompt ~1.500 Token; strukturierter JSON-Output ~2.500 Token.

| Modell | Kosten/Dokument | 50 Projekte (MVP) | 150 Projekte | 300 Projekte |
|---|---|---|---|---|
| Claude Haiku 4.5 | ~$0,04 | ~$2 | ~$6 | ~$12 |
| Claude Sonnet 4.6 | ~$0,20 | ~$10 | ~$30 | ~$60 |
| GPT-4o mini | ~$0,03 | ~$1,50 | ~$4,50 | ~$9 |

Dies ist vernachlässigbar. Selbst bei vierteljährlichem Corpus-Update mit 15 neuen Berichten: unter $3 pro Refresh.

Das teurere Modell (Sonnet statt Haiku) produziert qualitativ bessere Extraktion — insbesondere bei der Evidenzlagen-Bewertung und der Erfassung von Transferhemmnissen. Für die Indexerstellung ist Qualität der Extraktion wichtiger als Kosten.

#### 5.3.4 Querybarkeit zur Laufzeit

Der Agent verfügt über zwei Corpus-Index-Werkzeuge:

**`analyze_coverage(topic, mode?)`**

Strukturierte Abfrage gegen den aggregierten Index. Gibt je nach `mode` zurück:
- `"coverage"`: Coverage-Stats + Lückenanalyse gegen NMS-Referenzrahmen
- `"findings"`: Aggregierte Befunde aller Projekte zum Thema mit Evidenzlage
- `"actors"`: Akteurs-Index für das Thema
- `"gaps"`: Aggregierte Desiderate, sortiert nach Häufigkeit

**`get_project_summary(project_id)`**

Gibt den vollständigen strukturierten Digest eines spezifischen Projekts zurück — Kernergebnisse, Schlussfolgerungen, Erfolgsfaktoren, Limitierungen, Desiderate — ohne dass der Agent den Volltext retrieven muss.

**Beispielinteraktion:**

```
Agent: analyze_coverage("Typha-Anbau", mode="findings")

→ {
    "thema": "Typha-Anbau",
    "projekt_count": 7,
    "aggregierte_befunde": [
      {"befund": "Erträge 8–12 t TM/ha/Jahr erreichbar", 
       "belegt_durch": 4, "evidenzlage": "gemessen", "konfidenz": "mittel"},
      {"befund": "Wirtschaftlichkeit ohne Subventionen nicht gegeben",
       "belegt_durch": 5, "evidenzlage": "berechnet", "konfidenz": "hoch"},
      {"befund": "Wasserstandsmanagement kritischer Erfolgsfaktor",
       "belegt_durch": 6, "evidenzlage": "beobachtet", "konfidenz": "hoch"}
    ],
    "konsens_signale": ["Wasserstand > -10 cm notwendig (6/7 Projekte)"],
    "widersprueche": ["Ertragsschätzungen variieren stark zwischen Standorttypen"],
    "aggregierte_desiderate": [
      {"thema": "Langzeitdaten Bodenentwicklung", "n": 5},
      {"thema": "Qualitätsstandards Erntegut", "n": 3}
    ]
  }
```

Das LLM erhält diese strukturierten Daten und interpretiert sie im Syntheseschritt — der Index liefert die Evidenzbasis, das Modell liefert die Einordnung.

#### 5.3.5 Was der Corpus Index leistet — und was nicht

**Ermöglicht:**

| Fähigkeit | Mechanismus |
|---|---|
| Themenabdeckung quantifizieren | Schicht I: Coverage-Query |
| Forschungslücken benennen | Schicht I: Mapping gegen NMS-Referenzrahmen |
| Konsens über Projekte sichtbar machen | Schicht II: Befunde-Aggregation mit Häufigkeitszählung |
| Widersprüche zwischen Projekten identifizieren | Schicht II: Konfligierende Befunde zum selben Thema |
| Projekt-Schnellbewertung ohne Volltext | Schicht II: `get_project_summary()` |
| Forscher-eigene Desiderate aggregieren | Schicht II: `desiderate`-Feld, nach Häufigkeit sortiert |
| Institutionelle Expertise kartieren | Schicht I: Akteurs-Index |
| Transferhemmnisse systematisch erfassen | Schicht II: `transferhemmnisse`-Aggregation |

**Nicht ermöglicht:**

Quantität ≠ Qualität. Der Index sagt "7 Projekte zu Typha-Anbau, davon 5 mit Wirtschaftlichkeitsbefund" — er sagt nicht, ob diese 5 Projekte methodisch belastbar sind oder ob ihre Berechnungsgrundlagen vergleichbar sind. Die qualitative Bewertung der Befundlage muss das LLM mit Domänenwissen oder ein menschlicher Experte übernehmen.

Der Index deckt auch keine impliziten Lücken auf — Themen, über die niemand im Corpus geschrieben hat und die auch nicht als Desiderat auftauchen, aber fachlich kritisch wären. Diese Ebene setzt menschliche Domänenexpertise voraus, die der Agent über seinen institutionellen Kontextrahmen (System-Prompt) partiell abbilden kann.

#### 5.3.6 Kritisches Risiko: Vokabular-Konsistenz

Das kontrollierte Themen-Vokabular ist die wichtigste Vorleistung vor dem Preprocessing. Ohne es entstehen heterogene Begriffe, die sich nicht aggregieren lassen ("Schilfanbau", "Phragmites-Kultivierung", "Reetproduktion" wären drei verschiedene Cluster statt eines). Die Qualität des gesamten Schicht-I-Index hängt davon ab.

Das Vokabular wird nicht technisch generiert — es ist eine fachliche Entscheidung, die FNR-Domänenkenntnis erfordert und vor dem Preprocessing-Lauf abgeschlossen sein muss.

### 5.4 Retrieval-Architektur: Agentisches iteratives Retrieval

Das LLM hat direkten Werkzeugzugriff auf die Vector-Datenbank. Es ist kein passiver Konsument einer Pipeline – es ist aktiver Suchagent.

**Verfügbare Werkzeuge:**

| Tool | Signatur | Zweck |
|---|---|---|
| `search` | `search(query: str, n: int = 5, filters?: dict)` | Semantische Suche; gibt n Parent-Chunks mit Metadaten zurück |
| `get_section` | `get_section(project_id: str, section_key: str)` | Gezielter Direktzugriff auf bekanntes Projekt/Abschnitt |
| `get_project_summary` | `get_project_summary(project_id: str)` | Vollständiger strukturierter Digest aus Corpus Index (Befunde, Schlussfolgerungen, Erfolgsfaktoren, Limitierungen, Desiderate) ohne Volltext-Retrieval |
| `analyze_coverage` | `analyze_coverage(topic: str, mode: str)` | Query gegen Corpus Index: Coverage-Stats, aggregierte Befunde, Akteurs-Index oder Desiderate-Aggregation |

**Ablauf (Standard-Query):**

```
1. LLM erhält User-Query + System-Prompt (inkl. "Plan-First"-Instruktion)
2. LLM formuliert intern: Suchplan mit Teilaspekten
3. LLM ruft search() mit Aspekt-Query 1 auf → erhält Chunks
4. LLM ruft search() mit Aspekt-Query 2 auf → erhält Chunks
5. [Ggf. weitere Calls] LLM erkennt Lücke, sucht nach
6. LLM ruft ggf. get_section() auf für bekannte relevante Projekte
7. LLM synthetisiert aus akkumulierten Chunks → strukturierte Antwort mit Quellenankern
```

**Tool-Call-Limit:** max. 8 Tool-Calls pro Query (konfigurierbar). Schützt vor ungebremster Iteration und macht Kosten berechenbar. Das LLM wird im System-Prompt über dieses Budget informiert.

**Retrieval-Parameter (MVP-Ausgangswerte):**
- Child-Chunk-Größe: ~200 Token (Präzisions-Retrieval)
- Parent-Chunk-Größe: ~700 Token (Kontext; `search()` gibt Parent-Chunks zurück)
- n pro search()-Call: 5–8 Parent-Chunks
- Erwartete Calls bei Synthesefragen: 3–6
- Erwartete Gesamtchunks im Kontext: 15–30 Parent-Chunks

**Semantische Suche als primäres Retrieval-Verfahren:**

Semantische Suche mit einem hochwertigen multilingualen Embedding-Modell (z.B. multilingual-e5-large, text-embedding-3-large) deckt den Großteil der Retrieval-Anforderungen ab. Der entscheidende Qualitätshebel ist nicht das Retrieval-Verfahren, sondern die Qualität der Suchanfrage – und diese liefert das LLM selbst.

Metadaten-Filter (`filters` im `search()`-Call) kompensieren viele Fälle, in denen lexikalische Suche traditionell im Vorteil wäre: Fördertyp, Region, Jahr, Projektnummer können als strukturierter Filter übergeben werden.

**BM25 als optionale Erweiterung (nicht im MVP):**

BM25 wird nicht standardmäßig eingesetzt. Es kann nachgerüstet werden, wenn Evaluierung spezifische Retrieval-Lücken in diesen Randfällen zeigt:
- Acronyme ohne Kontext: LULUCF, ANK, MuD – Embedding-Modelle können diese missinterpretieren
- Lateinische Artnamen: *Phragmites australis*, *Typha angustifolia*
- Reine Kennziffern und Projektnummern

Bei echter Evidenz aus dem Evaluierungsrahmen (vgl. Abschnitt 7) wird Hybrid-Retrieval (BM25 + Semantisch via RRF) als Upgrade evaluiert. Nicht vorher.

### 5.5 Emergentes Komplexitätsrouting und "Plan-First"-Prompt

Es gibt keinen separaten Routing-Step und keine explizite Komplexitätsklassifikation. Die Routing-Logik entsteht emergent aus dem Tool-Design und dem "Plan-First"-Prompt.

**Das Kernprinzip:** Die Tool-Auswahl des LLMs *ist* das Routing. Ein gut designtes Tool-Set macht die Fragetypen implizit erkennbar und die entsprechenden Tools natürlich wählbar.

**"Plan-First"-Instruktion im System-Prompt:**

```
Bevor du ein Tool aufrufst:
Analysiere die Anfrage kurz.
- Welche thematischen Aspekte müssen abgedeckt werden?
- Wie viele Suchläufe brauchst du voraussichtlich?
- Sind Metadaten-Filter sinnvoll (Zeitraum, Region, Fördertyp)?
- Ist dies eine Gap-Frage → analyze_coverage() relevant?

Formuliere einen Suchplan. Führe ihn dann aus.
```

Dieses Muster erzeugt vorhersehbare Komplexitätsadaptierung:

| Fragetyp | Erwartetes LLM-Verhalten |
|---|---|
| **Faktfrage** ("Wann startete Projekt X?") | 1 search()-Call mit gezielter Query, ggf. get_section() |
| **Synthesefrage** ("Was wissen wir über Schilfanbau?") | 3–5 search()-Calls mit Teilaspekten (Agronomie, THG-Wirkung, Wirtschaftlichkeit, …) |
| **Vergleichsfrage** ("Welche Methoden wurden erprobt?") | 3–6 search()-Calls, nach Methoden getrennt |
| **Gap-Frage** ("Was fehlt im Korpus zu Paludikultur?") | analyze_coverage(mode="gaps") + analyze_coverage(mode="coverage") + ggf. search() zur Vertiefung |
| **Akteursfrage** ("Wer forscht zu Torfmoos?") | analyze_coverage(mode="actors") + ggf. get_project_summary() |
| **Projektbewertung** ("War Projekt X erfolgreich?") | get_project_summary() → strukturierter Digest ohne Volltextlesen |
| **Konsens-Frage** ("Sind sich Projekte einig über X?") | analyze_coverage(mode="findings") → Befunde mit Häufigkeit und Widerspruchssignalen |

**Warum kein expliziter Routing-Step?**

Ein separater Klassifikations-Call fügt einen zusätzlichen LLM-Aufruf hinzu und kann falsch klassifizieren. Schlimmer: Er zwingt eine Entscheidung zu einem Zeitpunkt, wo das LLM die Frage noch nicht vollständig analysiert hat. Beim "Plan-First"-Ansatz entsteht die Routing-Entscheidung im selben Denkschritt, in dem das Modell die Frage versteht – natürlich und ohne Mehrkosten.

**Extended Thinking als Tiefensteuerung:**

Für Modelle mit Extended Thinking (Claude Opus 4.8) ist dies die natürliche Erweiterung: Das Modell entscheidet implizit, wie lange und wie tief es nachdenkt – basierend auf wahrgenommener Fragekomplexit. Dies macht die Reasoning-Tiefe adaptiv, ohne explizite Parameter.

### 5.6 Kontextmanagement und Syntheseebene

**Kontextstruktur (wächst durch iterative Tool-Calls):**

```
[1] SYSTEM-PROMPT
    - Rollendefinition + Verhaltensvorgaben
    - Institutionelles Wissen (FNR-Förderlogik, Ministerienstruktur,
      Akteurskarte, Moorschutzrahmen)
    - "Plan-First"-Instruktion
    - Quellenverankerungs- und Unsicherheitsregeln
    - Tool-Definitionen + Call-Limit

[2] USER QUERY

[3] TOOL-CALL SEQUENCE (wächst iterativ)
    → search("Schilfanbau THG-Minderung")
    ← [Q:FNR-2021-0456/C3] Abschlussbericht, Projekt: "Typha-Anbau..."
       <Chunk-Inhalt>
    → search("Phragmites Ernte Methoden Wirtschaftlichkeit")
    ← [Q:FNR-2019-0123/C7] Abschlussbericht, Projekt: "Schilf als..."
       <Chunk-Inhalt>
    ...

[4] SYNTHESEGENERIERUNG (nach letztem Tool-Call)
```

Quellen sind vor der finalen Synthesegenerierung im Kontext – nicht nachher. LLMs nutzen Quellen zuverlässiger, wenn diese im Kontext stehen bevor die Antwort generiert wird.

### 5.7 Modell- und Promptingstrategie

**Modellauswahl:**

Das System erfordert ein Modell mit folgenden Eigenschaften:
- Sehr gutes Deutschsprachverständnis (wissenschaftlicher und administrativer Stil)
- Zuverlässiges Instruction-Following für strukturierte Ausgabeformate
- Nachweislich niedrige Halluzinationsrate bei quellengebundenen Aufgaben
- Langer Kontext (min. 128K, besser 200K Token)
- Verfügbar in datensouveräner Deployment-Umgebung (kritisch – siehe Abschnitt 8)

**Führende Optionen 2026 (technologieagnostisch bewertet):**

| Modell | Deutschkompetenz | Citability | Kontext | Datensouveränität |
|---|---|---|---|---|
| Claude Opus 4.8 | Sehr hoch | Sehr hoch | 200K | API (US-Unternehmen) – Sondervertrag erforderlich |
| GPT-4o / GPT-4.1 | Sehr hoch | Hoch | 128K | "OpenAI für Deutschland" (H2 2026) |
| PhariaAI (Aleph Alpha-Nachfolger) | Hoch | Mittel | Variabel | Sovereign Cloud (STACKIT), bereits bei Bundesbehörden |
| Mistral Large | Mittel-hoch | Mittel | 128K | EU-Hosting verfügbar |
| Open-Source (LLaMA 3.x, Qwen) | Mittel | Niedrig | Variabel | On-Premise möglich |

**Empfehlung:** Architektur LLM-provider-agnostisch designen. Modellauswahl final erst nach Klärung der Datensouveränitätsanforderungen (kritische offene Frage F3 aus PRD). Qualitätsmäßig empfiehlt sich Claude Opus 4.8 oder GPT-4o falls Datensouveränität über Sondervertrag geklärt werden kann; bei harten On-Premise-Anforderungen PhariaAI oder ein fine-getuntes Open-Source-Modell.

**Keine Fine-Tuning für die MVP-Phase.** Fine-Tuning für faktisches Wissen erhöht Halluzinationsrisiko, macht Wissensaktualisierung teurer und reduziert Erklärbarkeit. Context Engineering leistet das Gleiche bei besserer Wartbarkeit.

**Promptingstrategie:**

Das System-Prompt enthält:
1. Rollenrahmen: Synthesewerkzeug für FNR-Moorprojekt-Wissen, keine Rechtsberatung, kein Laienassistent
2. Institutionelles Wissen (kompakt strukturiert)
3. Verbindliche Antwortregeln:
   - Jede Faktaussage trägt Quellenreferenz `[Q:ID]`
   - Unsicherheitsebene explizit signalisieren (belegt / abgeleitet / Systemwissen / unbekannt)
   - Wenn keine ausreichende Quellenlage: explizit benennen
   - Keine Reproduktion von Berichtstexten; Synthese und Einordnung
   - Deutsch, fachlich angemessen (keine vereinfachenden Erklärungen)

### 5.8 Antwortstruktur und Quellentransparenz

**Pflicht-Antwortstruktur:**

```
## [Kernantwort / Synthese]

### Erkenntnisse aus FNR-Projekten

[Strukturierte Antwort mit Inline-Referenzen wie [Q:FNR-2021-0456]]

### Einschränkungen und Unsicherheiten

- [Direkt belegt durch X]: ...
- [Übergreifend abgeleitet]: ...
- [Nicht im Korpus belegt]: ...

### Quellen

- FNR Projekt 0456 (2021): [Projekttitel], Abschlussbericht
- FNR Projekt 0123 (2019): [Projekttitel], Zwischenbericht
```

Dieses Format ist nicht nur Darstellungswahl – es ist Qualitätssicherungsmechanismus. Ein Modell, das strukturiert zitieren muss, halluziniert weniger.

### 5.9 Lückenidentifikation (F4)

Lückenidentifikation unterscheidet sich fundamental von Synthese: Es geht darum, was NICHT im Corpus ist. Dies erfordert den Corpus Index — kein Retrieval-System kann antworten, was es nicht findet.

**Drei Lückentypen mit unterschiedlichen Erkennungsmechanismen:**

**Typ 1: Strukturelle Lücken** – Themen, die im Corpus gar nicht oder kaum vorkommen

Mechanismus: `analyze_coverage(mode="coverage")` vergleicht Ist-Coverage gegen die 10 Handlungsfelder der Nationalen Moorschutzstrategie. Handlungsfelder mit wenigen Projekten, fehlenden Sub-Themen oder ausschließlich alten Studien sind strukturelle Lücken.

**Typ 2: Forscher-benannte Desiderate** – Lücken, die Wissenschaftler selbst in ihren Berichten dokumentiert haben

Mechanismus: `analyze_coverage(mode="gaps")` gibt aggregierte `desiderate` aller Projekte, sortiert nach Häufigkeit. Desiderate, die in 5+ Projekten unabhängig voneinander genannt werden, sind besonders belastbare Lückensignale.

**Typ 3: Transferlücken** – Erkenntnisse existieren, sind aber nicht in Praxis oder Politik übertragen

Mechanismus: Vergleich von `empfehlungen` und `transferhemmnisse` im Corpus Index mit nachfolgenden Förderjahren. Wenn eine Empfehlung aus 2018 in keinem Folgeprojekt aufgegriffen wurde, ist dies ein Transferlücken-Signal.

**Query-Pfad für Gap-Fragen:**

```
1. analyze_coverage("Handlungsfeld X", mode="coverage")
   → Coverage-Stats, fehlende Themen
2. analyze_coverage("Handlungsfeld X", mode="gaps")
   → Aggregierte Desiderate, sortiert nach Häufigkeit
3. [Optional] search() für inhaltliche Vertiefung einzelner Lücken
4. LLM-Synthese: Strukturelle Lücken + Forscher-Desiderate → priorisierte Lückenaussage
```

Diese Komponente wird offline vorberechnet und bei jedem Corpus-Update regeneriert. Der initiale Aufwand für die Vokabular- und Referenzrahmen-Definition (NMS-Mapping) ist einmalig.

---

## 6. Komponenten, die bewusst NICHT benötigt werden

**Kein Fine-Tuning (MVP und Phase 2).**
Bewusste Entscheidung: Context Engineering und Retrieval erzielen bessere Faktentreue bei niedrigeren Wartungskosten. Ausnahme: Wenn Qualitätsverbesserungen durch prompting und RAG-Optimierung erschöpft sind und spezifische Ausgabeformat-Konsistenz benötigt wird, kann ein leichtes LoRA-Fine-Tuning auf Antwortformat evaluiert werden. Nicht für Faktenwissen.

**Kein Multi-Agent-System (MVP).**
Empirisch nicht gerechtfertigt für sequentielle Syntheseaufgaben. Erhöht Komplexität, Latenz und Debugging-Aufwand. Einzige begründete Ausnahme ab Phase 2: ein separater Parallelisierungspfad für umfangreiche Corpus-Scans bei sehr breiten Synthesefragen.

**Kein komplexes Agent-Framework (LangChain, LlamaIndex, AutoGen, CrewAI) als Basis.**
Direkte API-Integration + schlanke Retrieval-Bibliothek (z.B. qdrant-client, tiktoken). Frameworks erhöhen Overhead und verschleiern Fehlerquellen ohne proportionalen Nutzen für dieses System.

**Keine externe Echtzeitsuche (Web-RAG) im MVP.**
Der Agent ist explizit kein Echtzeitinformationssystem. Web-Suche würde unkontrollierte Quellen einbringen und die Quellenbeherrschbarkeit untergraben. Externe Literaturdaten erst ab Phase 2 nach Governance-Klärung.

**Keine Session-übergreifende Personalisierung (User Memory).**
FNR-Fachreferenten stellen Fragen an ein institutionelles Wissenskorpus, nicht an einen persönlichen Assistenten. User-spezifisches Gedächtnis erzeugt Komplexität ohne entsprechenden Nutzen. Sessions sind zustandslos.

**Kein eigenständiges Dokumentenmanagement-System.**
Das System übernimmt keine Dokumente, ersetzt keine Wissensinfrastruktur. Es konsumiert einen vorbereiteten Corpus. Die Frage der Dokumentenverwaltung, -aktualisierung und -qualitätssicherung ist explizit out of scope.

---

## 7. Kritische technische Hebel

### Hebel 1: Tool-Design und Retrieval-Qualität (Rang 1, höchster Einfluss)

Ein System, bei dem das LLM präzise Suchwerkzeuge mit klaren Signaturen und gutem Metadaten-Schema hat, übertrifft eines mit besseren Modellen aber schlechtem Tool-Design. Die Qualität der vom LLM formulierten Suchanfragen ist direkt abhängig davon, wie gut die Tool-Schnittstelle gestaltet ist – was filterbar ist, was zurückgegeben wird, wie Metadaten benannt sind.

**Maßnahmen:** Sorgfältige Tool-Schnittstellen-Definition, Chunk-Strategie-Optimierung, Metadaten-Vollständigkeit und -Konsistenz, Recall@K-Messung im Evaluierungsrahmen. BM25 als Erweiterung evaluieren sobald Baseline-Evaluierung Lücken zeigt.

### Hebel 2: Institutioneller Kontextrahmen (Rang 2)

Ein Modell, das ohne FNR-Institutionenverständnis antwortet, produziert inhaltlich inkompetente Antworten – auch wenn die retrievierten Chunks korrekt sind. Das Verständnis der Zwei-Ministerien-Struktur, Förderlogik und Akteurskarte ist Grundbedingung für korrektes Einordnen von Projektaussagen.

**Maßnahmen:** Sorgfältig strukturiertes, aktuelles institutionelles System-Prompt. Regelmäßige Revision bei institutionellen Veränderungen.

### Hebel 3: Quellenverankerung im Prompt-Design (Rang 3)

Die konkrete Formulierung der Quellenverankerungsregel im System-Prompt hat direkten Einfluss auf Halluzinationsrate und Zitationsqualität. Dies ist nicht modell-, sondern prompt-spezifisch.

**Maßnahmen:** Iteratives Prompt-Testing gegen Evaluation-Set. Klare Chunk-ID-Syntax in Retrieval und Prompt.

### Hebel 4: Evaluierungsrahmen (Rang 4, strategisch entscheidend)

Ohne Evaluierungsrahmen ist Qualitätsverbesserung nicht messbar und Regression nicht erkennbar. Der Evaluierungsrahmen sollte vor dem ersten Deployment existieren.

**Komponenten:**
- 20–30 Testfragen mit Referenzantworten (von FNR-Experten validiert)
- Automatische Metriken: Faithfulness (stimmt Antwort mit Quellen überein?), Citation Accuracy, Recall@K
- Manuelle Evaluation durch FNR-Fachreferenten für Synthesequalität
- Tool-Empfehlung: RAGAS (Open Source, Industriestandard, 400K+ monatliche Downloads)

### Hebel 5: Chunk-Strategie und Metadaten-Vollständigkeit (Rang 5)

Die Qualität des Metadaten-Schemas bestimmt die Filtergenauigkeit und die Zitierfähigkeit. Fehlende Metadaten (kein `doc_typ`, keine `region`) degradieren F2 (Vergleich) und F3 (Quellentransparenz) erheblich.

**Maßnahmen:** Metadaten-Schema vor Ingestion festlegen, Vollständigkeit als Ingestion-Qualitätskriterium.

---

## 8. Technische Risiken

### Risiko 1: Datensouveränität blockiert beste Modellwahl (Kritisch)

**Problem:** Die FNR ist Projektträger des Bundes. Unveröffentlichte Projektberichte können vertraulich sein. BSI-IT-Grundschutz, DSGVO und interne Governance-Regeln können die Nutzung US-amerikanischer Cloud-LLM-APIs ausschließen.

**Impact:** Wenn Claude Opus oder GPT-4o nicht genutzt werden darf, verringert sich die verfügbare Modellqualität (Syntheseleistung, Citability) erheblich. Open-Source-Modelle on-premise zeigen 20–30% geringere Qualität bei komplexen Syntheseaufgaben.

**Mitigation:** Architektur LLM-provider-agnostisch designen (abstrahierte Modell-Schnittstelle). Frühzeitige Governance-Klärung (PRD-Frage F3). Evaluierung von PhariaAI (Bundesbehörden-Track) und "OpenAI für Deutschland" (H2 2026). Wenn On-Premise unvermeidlich: Qualitätserwartungen entsprechend kalibrieren.

### Risiko 2: Korpus-Heterogenität untergräbt Retrieval-Qualität (Hoch)

**Problem:** Abschlussberichte über viele Jahre variieren stark in Format (PDF, Word, gescannt), Strukturdisziplin, Metadaten-Verfügbarkeit und Qualität. Schlechte OCR, inkonsistente Nomenklatur und fehlende Metadaten degenerieren die Retrieval-Qualität unabhängig vom Systemdesign.

**Impact:** Recall sinkt, Synthese wird lückenhaft, Quellenangaben werden unvollständig.

**Mitigation:** Corpus-Analyse vor Systemdesign (PRD-Frage F1 ist nicht optional). Explizites Ingestion-Pipeline-Design mit Qualitäts-Checks. Erwartungsmanagement: Der Agent kann nur so gut sein wie sein Datenmaterial.

### Risiko 3: Halluzination bei fehlenden Corpus-Belegen (Hoch)

**Problem:** Wenn eine Frage auf Themen abzielt, die im Corpus schlecht abgedeckt sind, besteht Risiko, dass das Modell aus seinem Parameterwissen halluziniert, statt eine Lücke zu signalisieren.

**Impact:** Sachlich falsche Aussagen in einem institutionellen Entscheidungskontext.

**Mitigation:** Robuste "Keine Quelle gefunden"-Signalisierung im Prompt (erzwingen). Faithfulness-Evaluation als kontinuierliche Metrik. Explizites Testen mit Fragen zu bekannten Themenauslassungen im Corpus.

### Risiko 4: Vertrauensverlust durch frühe schlechte Antworten (Mittel)

**Problem:** Wenn FNR-Referenten früh fehlerhafte Antworten erleben, ist das Vertrauen dauerhaft beschädigt.

**Mitigation:** Gestaffelter Rollout (PRD-Empfehlung). Anfangs Scope einschränken auf gut belegte Themen. Explizite Kommunikation der aktuellen Systemgrenzen gegenüber Nutzern. Kein "Big Bang"-Release.

### Risiko 5: Vokabular-Inkonsistenz im Corpus Index (Mittel)

**Problem:** Wenn das Extraktionsvokabular für den Corpus Index nicht vorab klar definiert ist, erzeugt die LLM-Extraktion inkonsistente Begriffe ("Schilfanbau", "Phragmites-Kultivierung", "Reetproduktion" als separate Einträge). Der Themen-Index und die Coverage-Matrix sind dann fehlerhaft aggregiert.

**Impact:** Handlungsfeld-Coverage wird falsch berichtet, Gap-Identifikation ist unzuverlässig, Akteurs-Index unvollständig.

**Mitigation:** Kontrolliertes Vokabular (~50–80 Begriffe, abgeleitet aus NMS-Handlungsfeldern + FNR-Förderschwerpunkten) ist Vorleistung vor dem Preprocessing. Erfordert FNR-Domänenkenntnis. Validierung nach erstem Preprocessing-Lauf durch Stichproben-Review.

### Risiko 6: Institutionelle Sensibilität bei Projektbewertung (Mittel)

**Problem:** Lückenidentifikation (F4) und Erfolgsfaktorenanalyse können als implizite Kritik an früheren Förderentscheidungen wahrgenommen werden.

**Mitigation:** Sprachkalibrierung im System-Prompt: Der Agent analysiert Erkenntnislage, bewertet keine Förderentscheidungen. Antworten auf Analyseebene halten, nicht Bewertungsebene.

---

## 9. Offene Architekturfragen

Diese Fragen können nicht ohne externe Information beantwortet werden. Sie blockieren oder beeinflussen spezifische Architekturentscheidungen.

### AF1 (Blockierend): Datensouveränität und LLM-Provider

**Frage:** Welche LLM-Anbieter und Hosting-Optionen sind aus IT-Governance-Sicht der FNR zulässig? Dürfen Projektdaten die FNR-IT-Infrastruktur verlassen? Welche Datenklassifizierung haben die Abschlussberichte?

**Architekturimpact:** Bestimmt Modellauswahl fundamental. Bei On-Premise-Anforderung ändern sich Leistungserwartungen und Kostenstruktur erheblich.

### AF2 (Blockierend): Corpus-Umfang und -Qualität

**Frage:** Wie viele Moor-Projekte gibt es, in welchen Formaten, mit welchen Metadaten, welcher OCR-Qualität? Sind alle digital verfügbar?

**Architekturimpact:** Bestimmt Chunk-Strategie, Index-Größe, Ingestion-Aufwand und Lücken-Identifikations-Machbarkeit.

### AF3 (Wichtig): Interface und Integrationspunkt

**Frage:** Wie wird der Agent genutzt – als Standalone-Chatinterface, in bestehende Tools eingebettet, als API für andere Systeme?

**Architekturimpact:** Bestimmt Session-Handling, Antwortformat-Anforderungen und Authentifizierungsarchitektur.

### AF4 (Wichtig): Externe Quellen

**Frage:** Sollen externe Quellen (GMC, Thünen, UBA) integriert werden? Unter welchen Lizenz- und Governance-Bedingungen?

**Architekturimpact:** Erweiterung des Corpus-Schemas, Quellentransparenz-Differenzierung (FNR-intern vs. extern), signifikanter Scope-Anstieg.

### AF5 (Mittel): Aktualisierungsfrequenz des Corpus

**Frage:** Wie häufig kommen neue Abschlussberichte hinzu? Gibt es einen definierten Updatezyklus?

**Architekturimpact:** Bestimmt Offline-Index-Refresh-Strategie und Anforderungen an die Ingestion-Pipeline.

---

## 10. Architekturbewertungsmatrix

| Entscheidung | Gewählter Ansatz | Alternativen | Begründung |
|---|---|---|---|
| RAG-Strategie | Agentisches iteratives Retrieval (Tool-basiert) | Single-Pass RAG | User-Query zu arm für Synthese-Aspekte; LLM formuliert bessere Suchanfragen als Pipeline |
| Retrieval-Verfahren | Semantische Suche (primär) + Metadaten-Filter | Hybrid BM25+Semantisch | Semantisch ausreichend wenn LLM Queries formuliert; BM25 nur bei evaluierten Lücken |
| Komplexitätsrouting | Emergent via Tool-Design + "Plan-First"-Prompt | Explizite Klassifikation | Kein extra LLM-Call; Routing entsteht im selben Denkschritt wie Fragenverständnis |
| Chunk-Strategie | Parent-Child (200/700 Token) | Flat chunking, Satz-basiert | Präzision bei Retrieval, Kontext bei Ausgabe |
| Institutionelles Wissen | System-Prompt | Vector-DB, Fine-Tuning | Muss immer verfügbar sein, unabhängig von Query |
| Corpus Index – Tiefe | Zwei Schichten: statistische Coverage + semantische Befundebene (Projekt-Digests) | Nur Statistik (Projektzahlen) | Befundebene ermöglicht Projektbewertung ohne Volltext; Desiderate-Aggregation ist direktes Gap-Signal |
| Corpus Index – Vokabular | Kontrolliertes Vokabular (~50–80 Begriffe aus NMS-Handlungsfeldern) | Freie LLM-Generierung | Aggregierbarkeit und Coverage-Matrix erfordern konsistente Terminologie |
| Lückenidentifikation | Corpus Index (3 Lückentypen) + analyze_coverage() + search() | Live RAG, Long Context | Retrieval kann negativen Raum nicht sehen; Desiderate aus Forscher-Berichten aggregierbar |
| Agent-Architektur | Single Agent + Tools | Multi-Agent | Empirisch überlegen für sequentielle Synthese, 4× kostengünstiger |
| Framework | Direktes API + schlanke Bibliotheken | LangChain, LlamaIndex | Beherrschbarkeit, Debugging, kein Overhead |
| Fine-Tuning | Kein Fine-Tuning (MVP) | LoRA, Full Fine-Tuning | RAG überlegen für faktisches Wissen; Context Engineering flexibler |
| Modellwahl | Provider-agnostisch (Klärung F3 nötig) | Claude Opus, GPT-4o, PhariaAI | Datensouveränität ist primäre Einschränkung |
| Evaluierung | RAGAS + manuelle Experten-Eval | Rein manuell, rein automatisch | Industriestandard; manuelle Eval für Synthesequalität unverzichtbar |
| Session-Gedächtnis | Zustandslos | User Memory | Institutionelles System, keine Personalisierung nötig |

---

## Anhang: Glossar technischer Konzepte

**Agentic RAG:** RAG-Variante, bei der das LLM aktiv Suchanfragen formuliert und iterativ Werkzeuge aufruft, statt passiv ein einmaliges Retrieval-Ergebnis zu konsumieren.

**Corpus Index:** Vorberechneter strukturierter Wissensindex über den gesamten Dokumentkorpus. Zwei Schichten: (I) statistische Coverage-Daten (Themenhäufigkeiten, Handlungsfeld-Abdeckung, Akteurs-Index), (II) semantische Befundebene (Kernergebnisse mit Evidenzlage und Geltungsbereich, Schlussfolgerungen, Erfolgsfaktoren, Limitierungen, Desiderate pro Projekt). Ermöglicht Projektbewertung und Lückenidentifikation ohne Volltext-Retrieval. Aufgebaut durch offline LLM-Extraktion mit kontrolliertem Vokabular.

**Desiderate:** Von Forschern in ihren Berichten explizit benannte Wissenslücken und Forschungsbedarfe. Im Corpus Index aggregiert und nach Häufigkeit sortiert — ein besonders belastbares Signal für prioritäre Förderlücken, weil es direkt aus der Forschungscommunity stammt.

**Kontrolliertes Vokabular:** Vorab definierte, abgeschlossene Themenliste (~50–80 Begriffe) für die LLM-Extraktion in den Corpus Index. Verhindert inkonsistente Terminologie und ermöglicht korrekte Aggregation. Fachliche Vorleistung vor dem Preprocessing — erfordert FNR-Domänenkenntnis.

**Projekt-Digest:** Strukturiertes JSON-Extrakt eines Projekts aus dem Corpus Index. Enthält Kernergebnisse (mit Evidenzlage und Geltungsbereich), Schlussfolgerungen, Empfehlungen, Erfolgsfaktoren, Limitierungen, Desiderate und Zielerreichungsbewertung. Abrufbar via `get_project_summary()` ohne Volltext-Retrieval.

**BM25:** Probabilistisches Textsuchverfahren (Term-Frequenz/inverse Dokumenthäufigkeit). Stark bei exakten Begriffen, Acronymen und Kennziffern. Im MVP nicht als Standardkomponente vorgesehen – optionale Erweiterung nach evaluiertem Bedarf.

**Chunk:** Abschnitt eines Dokuments, der in der Vector-Datenbank gespeichert und retrieviert wird.

**Context Engineering:** Gezielte Gestaltung des LLM-Kontexts (System-Prompt, Tool-Definitionen, Retrieval-Ergebnisse, Strukturierung) zur Qualitätsoptimierung – Alternative zu Fine-Tuning.

**Emergentes Routing:** Routing-Strategie, bei der kein separater Klassifikationsschritt existiert. Das LLM wählt Werkzeuge und Suchtiefe implizit basierend auf seiner Fragenanalyse – die Tool-Auswahl *ist* das Routing.

**Faithfulness:** Metrik: Stimmt die Antwort inhaltlich mit den retrievierten Quellen überein? (RAGAS-Metrik)

**Long-Context-Stuffing:** Strategie, viele Dokumente vollständig in ein sehr langes Kontextfenster zu laden. Teuer, langsam, aber qualitativ stark für kleine Corpora.

**Parent-Child-Chunking:** Chunk-Strategie mit kleinen Retrieve-Chunks (~200 Token, Präzision) und großen Kontext-Chunks (~700 Token, Vollständigkeit). Das `search()`-Tool gibt Parent-Chunks zurück.

**Plan-First:** Prompt-Muster, bei dem das LLM vor dem ersten Tool-Call einen Suchplan formuliert. Macht Komplexitätseinschätzung und Aspekt-Dekomposition explizit und auditierbar.

**RAG (Retrieval-Augmented Generation):** LLM-Architektur, die externe Datenquellen bei jeder Abfrage dynamisch einbezieht – statt Wissen in Modell-Parametern zu kodieren.

**RAGAS:** Open-Source-Evaluierungsframework für RAG-Systeme (Faithfulness, Answer Relevancy, Context Precision, Context Recall).

**Reranking:** Zweite Ranking-Stufe nach Initial-Retrieval – präziser als Vector-Suche, aber teurer. Typisch: Cross-Encoder-Modell. Im MVP optional.

**RRF (Reciprocal Rank Fusion):** Fusionsalgorithmus für Hybrid-Search – kombiniert Rankings aus BM25 und semantischer Suche ohne Normierungsprobleme. Relevant wenn BM25 als Erweiterung eingeführt wird.

**Tool-Call-Limit:** Maximale Anzahl Werkzeugaufrufe pro User-Query (MVP: 8). Schützt vor unkontrollierter Iteration, macht Kosten berechenbar.

**Vector-Datenbank:** Datenbank für hochdimensionale Embedding-Vektoren mit Ähnlichkeitssuche. Beispiele: Qdrant, Weaviate, pgvector.

---

*Dieses TDD basiert auf dem PRD v0.1 (18. Juni 2026), eigener Systemanalyse und aktuellem Stand der Agenten-Systemarchitektur-Forschung (2025/2026). Es ist kein Implementierungsplan und kein Infrastrukturdesign. Offene Architekturfragen (AF1–AF5) müssen vor finaler technischer Entscheidung mit FNR und Auftraggeber geklärt werden.*
