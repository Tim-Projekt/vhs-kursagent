# Knowledge Primer: Design und LLM-Aggregationspipeline
## FNR Moor-Intelligence Agent — Semantisches Gedächtnis

**Version:** 1.0  
**Datum:** 19. Juni 2026  
**Status:** Technisches Designdokument für die Implementierung

---

## 1. Empirische Datenbasis: Was im Corpus vorhanden ist

### 1.1 Korpus-Kennzahlen (gemessen)

| Kennzahl | Wert |
|---|---|
| FKZ-Einträge gesamt | **177** |
| Davon: Verbundvorhaben-Gruppen | **44** (mit 2–12 Teilvorhaben je) |
| Davon: Einzelprojekte / Sonstige | **22** |
| Einzigartige Forschungsinitiativen | **~59** (distinkte Verbundprojekte) |
| FKZs mit `aufgabenbeschreibung` | **177 (100%)** |
| FKZs mit `ergebnisverwendung` | **38 (21%)** |
| FKZs mit `titel` | **177 (100%)** |

**Konsequenz:** Die Ergebnisverwendung fehlt bei 79% der Projekte — typischerweise bei laufenden Projekten ohne Abschlussbericht. Für den Knowledge Primer ist `aufgabenbeschreibung` der primäre Wissensträger.

### 1.2 Verbundvorhaben-Struktur

Die 177 FKZs sind keine 177 unabhängigen Projekte. Sie sind Teilvorhaben innerhalb von ~59 Forschungsinitiativen (Verbundvorhaben). Die Teilvorhaben `A, B, C, ...` einer Gruppe beschreiben jeweils den Beitrag einer Institution oder eines Arbeitspakets.

| Verbundvorhaben | Teilvorhaben | Beispiel |
|---|---|---|
| `2222MT006` (RoNNi) | 12 | Rohrkolben-Anbau Niedersachsen |
| `2220MT006` | 9 | — |
| `2222MT007` (MOOReturn) | 9 | Moor-Revitalisierung + Verwertung |
| `2222MT010` | 8 | — |
| `2221MT010` | 7 | — |

**Für die Aggregation bedeutet das:** Nicht 177 unabhängige Texte, sondern ~59 Forschungsinitiativen, die als Verbund mit 2–12 verwandten Teilbeschreibungen vorliegen. Die inhaltliche Einheit ist das Verbundvorhaben, nicht das Teilvorhaben.

### 1.3 Token-Umfang (gemessen, ~3,5 Zeichen/Token Deutsch)

| Feld | Projekte mit Inhalt | Ø Zeichen | Gesamt Zeichen | **≈ Token** |
|---|---|---|---|---|
| `titel` | 177 | 202 | 35.820 | **~10.200** |
| `aufgabenbeschreibung` | 177 | 1.680 | 297.519 | **~85.000** |
| `ergebnisverwendung` | 38 | 1.722 | 65.472 | **~18.700** |
| **Gesamt** | — | — | **398.811** | **~114.000** |

**Durchschnitt pro FKZ:** ~585 Token (Aufgabe + Ergebnis kombiniert)  
**Aufgabenbeschreibungen allein:** ~85.000 Token für 177 Einträge

---

## 2. Das Dilemma: Warum weder 0 noch 114.000 Token

### 2.1 Warum Volltextinjektion falsch ist

114.000 Token aller Felder direkt in jeden Prompt zu laden ist technisch möglich (Claude Sonnet 4.6: 200K Kontextfenster), aber konzeptuell falsch:

- **Kontextdegradierung:** Bei 114K Token Projekttext im Kontext verliert das Modell Präzision für spezifische Fragen; Aufmerksamkeit verteilt sich auf irrelevante Sub-Projekte
- **Quellenverankerung bricht zusammen:** Das Modell kann nicht mehr zuordnen, welche Information aus welchem Teilvorhaben stammt
- **Kein Erkenntnisgewinn:** Für "Was für Projekte fördert die FNR?" braucht man keine 177 Vollbeschreibungen — man braucht ein synthetisiertes Bild
- **Kosten pro Query:** ~$0,57 allein für Kontext-Input (Sonnet 4.6) — bei 100 Queries/Tag: ~$57/Tag für statischen, unveränderlichen Text
- **Prompt-Caching nötig aber fragil:** Wenn auch nur eine Projektbeschreibung hinzukommt, bricht der Cache; Updates erzeugen hohe Latenz

### 2.2 Warum reiner Metadaten-Index unzureichend ist

Ein statistischer Index ("7 Typha-Projekte, 14 Wiedervernässungsprojekte") gibt dem Agenten Quantität, aber keinen Charakter. Er beantwortet:
- ✓ "Wie viele Projekte zu Thema X?"
- ✗ "Was für Projekte sind das? Was machen die konkret?"
- ✗ "Welche Arten von Aktivitäten prägen das FNR-Portfolio?"

### 2.3 Die Lösung: Knowledge Primer als semantisches Gedächtnis

Der Knowledge Primer ist ein **einmalig offline erzeugtes, kompaktes Textdokument** (~3.000–5.000 Token), das das qualitative Verständnis der FNR-Förderaktivitäten dauerhaft trägt. Er ist kein Bericht-Summary, keine Datenbank — sondern ein kuratiertes Organisationsgedächtnis.

**Kompressionsrate:** Input ~85K Token → Output ~4K Token → **Faktor ~20x**

---

## 3. Knowledge Primer: Struktur und Inhalt

### 3.1 Was der Knowledge Primer enthält

Der Primer beantwortet diese Fragen, **ohne dass der Agent Dokumente retrieven muss:**

1. **Welche Fördertypen gibt es, und was ist ihr Charakter?**  
   MuD vs. FuE — was wird jeweils gemacht, welche Outputs entstehen typischerweise

2. **Welche thematischen Schwerpunkte hat das FNR-Portfolio?**  
   Cluster beschrieben in Aktivitätssprache (was wird gemacht, nicht nur Labels)

3. **Welche Pflanzensysteme und Materialien sind zentral?**  
   Typha, Sphagnum, Phragmites, Carex — und ihre jeweiligen Verwertungswege

4. **Was sind typische Projektziele und -outputs?**  
   Demonstration, Leitfäden, Marktentwicklung, THG-Messungen, Netzwerke

5. **Welche Regionen und Moortypen sind Fördergegenstand?**  
   Niedermoor, Hochmoor, regionale Cluster

6. **Wer sind die Hauptakteure im FNR-Verbund?**  
   Institutionentypen: Hochschulen, Verbände, Unternehmen, Transfer-Zentren

7. **Was fehlt erkennbar im Portfolio?**  
   Themen, die in keiner Aufgabenbeschreibung auftauchen (strukturelle Lücken)

### 3.2 Was der Primer NICHT enthält

- Keine Einzelprojekt-Beschreibungen (das ist Aufgabe des Vector-Index / RAG)
- Keine Ergebnisse oder Befunde (das ist Aufgabe des Corpus Index)
- Keine Zitationen oder Quellenangaben (der Primer ist Kontextwissen, keine Faktenbasis)
- Keine Zahlen, Messwerte oder Förderbeträge (Halluzinationsrisiko hoch ohne Quellenverankerung)

### 3.3 Beispiel-Struktur (Ziel-Output)

```markdown
## FNR Moor-Förderportfolio: Aktivitätsüberblick (Stand: 2024)

### Fördertypen und ihr Charakter
**MuD-Projekte** machen den Großteil des neueren Portfolios aus. Sie erproben
Verfahren und Anbausysteme auf realen Praxisflächen — typisch 2–5 ha Polderversuche
auf Niedermoorstandorten. Outputs sind Demonstrationsanlagen, Praxisleitfäden und
regionale Akteursnetzwerke. Wirtschaftliche Eigenständigkeit ist selten Projektziel,
Akzeptanzschaffung und Machbarkeitsnachweis stehen im Vordergrund.

**FuE-Projekte** entwickeln Grundlagen: Emissionsmessverfahren, Substratqualitäten,
Wertschöpfungskettenanalysen. Primäre Akteure sind Universitäten und Forschungszentren.

### Thematische Schwerpunkte

**Typha-Anbau und Rohrkolben-Verwertung** (stärkstes Cluster)
[...]

**Sphagnum-Produktion als Torfersatz**
[...]

**Wiedervernässung und THG-Monitoring**
[...]
```

---

## 4. LLM-Aggregationspipeline

### 4.1 Designprinzip

Die Aggregation ist eine **einmalige Offline-Operation**. Sie wird wiederholt wenn:
- Neue Projekte in den Corpus aufgenommen werden (quartalsweise)
- Das kontrollierte Vokabular aktualisiert wird
- Ein menschlicher Review inhaltliche Anpassungen fordert

**Kein LLM-Aufruf pro Nutzerabfrage.** Der erzeugte Primer ist statisch.

### 4.2 Zweistufige Aggregationspipeline (empfohlen)

```
STUFE 1: Verbundvorhaben-Kondensation
─────────────────────────────────────
Input: Aufgabenbeschreibungen aller Teilvorhaben eines Verbundvorhabens
       (typisch 2–12 Texte × ~480 Token = ~1.000–5.800 Token je Gruppe)

Prozess: 1 LLM-Call pro Verbundvorhaben
         → Extrakt: Ziel, Aktivitäten, Outputs, Themen, Region (200–300 Token)

Output: ~59 Verbundvorhaben-Extrakte × ~250 Token = ~15.000 Token
        (gespeichert als JSON, menschlich reviewbar)

STUFE 2: Knowledge Primer Synthese
────────────────────────────────────
Input: ~59 Verbundvorhaben-Extrakte (~15.000 Token)
       + Strukturierungs-Prompt (~2.000 Token)

Prozess: 1 LLM-Call
         → Thematische Cluster identifizieren
         → Aktivitätscharakter beschreiben
         → Fördertypen und Muster benennen

Output: Knowledge Primer Dokument (~4.000 Token)
```

**Warum zweistufig?**

Eine direkte Einstufung (177 Texte → Primer) wäre theoretisch möglich (85K Token Input passt in 200K Kontext), aber zweistufig ist besser weil:
- Verbundvorhaben werden als Einheit behandelt (nicht 12 Teilbeschreibungen von RoNNi gleichwertig zu einem Einzelprojekt)
- Stufe-1-Extrakte sind reviewbar und korrigierbar (menschliche Qualitätskontrolle)
- Stufe 2 hat nur 15K Token Input → besser Synthesequalität, geringere Kosten

### 4.3 Stufe 1: Extraktion pro Verbundvorhaben

**Eingabe-Format:**

```python
# Gruppierung der Teilvorhaben
for verbund_id, teilvorhaben_list in verbund_groups.items():
    texts = []
    for fkz in teilvorhaben_list:
        src = load_project(fkz)
        texts.append(f"""
[Teilvorhaben {fkz}]
Titel: {src['title']}
Aufgabe: {src['aufgabenbeschreibung']}
""")
    
    combined_input = "\n---\n".join(texts)
    extrakt = llm_call(STUFE1_PROMPT, combined_input)
    save_extrakt(verbund_id, extrakt)
```

**Stufe-1-Prompt:**

```
Du erhältst die Aufgabenbeschreibungen aller Teilvorhaben eines FNR-Verbundvorhabens
zur Moorschutz-Förderung.

Extrahiere daraus ein kompaktes Verbundvorhaben-Profil. Beschreibe AUSSCHLIESSLICH
was aus den Texten direkt hervorgeht. Keine Bewertungen, keine Ergänzungen.

Fülle folgendes Schema aus (JSON):
{
  "verbund_id": "<ID>",
  "kurztitel": "<5-10 Wörter>",
  "foerdertyp": "MuD" | "FuE" | "Gemischt",
  "laufzeit": "<Startjahr>-<Endjahr>",
  "region": ["<Region>", ...],
  "pflanzen_systeme": ["<Pflanze/System>", ...],
  "verwertungswege": ["<Weg>", ...],
  "hauptaktivitaeten": ["<Aktivität>", ...],  // max. 4, Verbformen: "erprobt", "untersucht"
  "output_typen": ["<Outputtyp>", ...],       // z.B. "Demonstrationsanlage", "Leitfaden"
  "themen_tags": ["<Tag>", ...],              // aus kontrolliertem Vokabular
  "n_teilvorhaben": <Zahl>
}

Antworte NUR mit gültigem JSON, ohne Kommentare.
```

**Kontrolliertes Vokabular für `themen_tags`** (Vorleistung, muss vor Pipeline-Start definiert sein):

```
Paludikultur-Anbau, Typha-Anbau, Sphagnum-Produktion, Phragmites-Kultivierung,
Carex-Nutzung, Wiedervernässung, Wasserstandsmanagement, THG-Messung,
THG-Bilanzierung, Torfersatz, Dämmstoff, Gartenbausubstrat, Wertschöpfungskette,
Marktentwicklung, Nährstoffmanagement, Biodiversität, Renaturierung,
Akzeptanz-Landwirtschaft, Stakeholder-Prozess, Wissenstransfer,
Demonstrationsanlage, Regionalkonzept, Ökosystemdienstleistungen,
Emissionsfaktoren, Bodenkunde, Hydrologie, Landnutzungsrecht, Förderpolitik
```

### 4.4 Stufe 2: Knowledge Primer Synthese

**Eingabe-Format:**

```python
extrakte = load_all_extrakte()  # ~59 JSON-Objekte, ~15K Token
extrakte_text = json.dumps(extrakte, ensure_ascii=False, indent=2)

primer = llm_call(STUFE2_PROMPT, extrakte_text)
save_primer("knowledge_primer.md")
```

**Stufe-2-Prompt:**

```
Du erhältst strukturierte Extrakte von ~59 FNR-geförderten Verbundvorhaben
im Bereich Moorschutz und Paludikultur.

Erstelle einen "Knowledge Primer" — ein kompaktes Referenzdokument (~3.000–4.000 Wörter),
das einem Fachagenten ein dauerhaftes, passives Verständnis der FNR-Förderaktivitäten gibt.

DER PRIMER BESCHREIBT:
- Den Charakter und die Typen der geförderten Projekte (nicht: Auflistung)
- Die thematischen Schwerpunkte und Aktivitätscluster
- Typische Projektziele, Vorgehensweisen und Outputs
- Beteiligte Akteurtypen und ihre Rollen
- Erkennbare Muster, Schwerpunkte und fehlende Bereiche

DER PRIMER BESCHREIBT NICHT:
- Einzelprojekte mit Namen (höchstens als Beispiele, nicht als Auflistung)
- Konkrete Messergebnisse oder Befunde
- Förderbeträge oder Budgets (nicht in Extrakten)
- Bewertungen oder Empfehlungen

STIL:
- Aktivitätsorientiert ("Die FNR fördert vor allem...", "Ein typisches MuD-Projekt...")
- Präsens oder Präteritum, kein Futur
- Fachlich präzise, nicht vereinfachend
- Keine Überschriften-Listen, fließender beschreibender Text pro Abschnitt

STRUKTUR (Pflicht-Abschnitte):
1. ## Fördertypen und ihr Charakter
2. ## Thematische Schwerpunkte des Portfolios
3. ## Typische Projektaktivitäten und -outputs
4. ## Akteursnetzwerk: Wer ist beteiligt
5. ## Regionale Verteilung und Moortypen
6. ## Erkennbare Lücken und Randthemen

Antworte ausschließlich mit dem Markdown-Dokument, ohne Präambel.
```

### 4.5 Alternativer Einzelschritt-Ansatz (Vereinfachung)

Für den MVP ist auch ein Einzelschritt-Ansatz vertretbar, wenn die Inputdaten zuerst auf Verbundvorhaben-Ebene dedupliziert werden:

```
Input: Je eine (die längste) Aufgabenbeschreibung pro Verbundvorhaben
       → ~59 Texte × ~800 Token = ~47K Token Input
       
1 LLM-Call mit Knowledge Primer Prompt
→ Output: ~4K Token Primer

Vorteil:  Einfacher, weniger Code
Nachteil: Verliert Information aus kurzen Teilvorhaben-Beschreibungen
           die spezifischere Arbeitspakete beschreiben
```

**Empfehlung:** Zweistufig für bessere Qualität und menschliche Kontrollmöglichkeit. Einzelschritt als MVP-Einstieg vertretbar, wenn Qualität ausreicht.

---

## 5. Kompressionsrate und Dimensionierung

### 5.1 Kompressionskaskade

```
Rohcorpus: 177 FKZ-Aufgabenbeschreibungen
         = ~85.000 Token

Stufe 1:  59 Verbundvorhaben-Extrakte
         = ~59 × 250 Token
         = ~15.000 Token
         → Kompressionsfaktor: 5,7x

Stufe 2:  Knowledge Primer
         = ~4.000 Token
         → Kompressionsfaktor aus Stufe 1: 3,8x

Gesamtfaktor: 85.000 → 4.000 = 21x
```

### 5.2 Was bei 21x Kompression erhalten bleibt

Die Kompression eliminiert:
- Redundanzen zwischen Teilvorhaben derselben Verbundprojekte
- Projektspezifische Details (Standortkoordinaten, Personalfunktionen)
- Formale Begründungsfloskeln

Die Kompression bewahrt:
- Typen von Aktivitäten (was wird getan)
- Thematische Cluster und ihre Charaktere
- Output-Typen (was entsteht)
- Akteursmuster (wer ist beteiligt)
- Strukturelle Muster über Projekte hinweg

### 5.3 Informationsverlust und Toleranzgrenze

Nicht jede Information aus den Aufgabenbeschreibungen muss im Primer erhalten bleiben. Der Primer ist **kein Archiv**, sondern ein **Orientierungsrahmen**. Projektspezifische Details gehören in den Vector-Index (Steckbrief-Layer), nicht in den Primer.

**Akzeptable Verluste:** Einzelprojekt-Details, Partnerinstitutionen nach Namen, spezifische Messpunkte  
**Nicht akzeptable Verluste:** Aktivitätstypen, thematische Cluster, typische Output-Formen, erkennbare Lücken

---

## 6. Kosten

### 6.1 Einmalige Offline-Berechnung

| Schritt | Input Token | Output Token | Modell | Kosten |
|---|---|---|---|---|
| Stufe 1: 59 Verbund-Extrakte | ~85.000 ÷ 59 × 59 = ~85K | ~15K | Haiku 4.5 | ~$0,10 |
| Stufe 2: Primer-Synthese | ~15K + 2K Prompt | ~4K | Sonnet 4.6 | ~$0,08 |
| **Gesamt** | | | | **~$0,18–0,25** |

Kosten sind vernachlässigbar. Auch bei monatlicher Regeneration: <$3/Jahr.

**Modellwahl:** Stufe 1 kann Haiku 4.5 verwenden (strukturierte JSON-Extraktion, keine Synthese). Stufe 2 sollte Sonnet 4.6 oder besser verwenden (qualitative Synthese, Sprachqualität des Primers).

### 6.2 Laufzeitkosten (kein LLM)

Der fertige Primer wird als statischer Text im System-Prompt eingebettet. Pro Nutzerabfrage entstehen keine Aggregationskosten mehr.

Mit **Prompt-Caching** (Anthropic: 90% Rabatt auf gecachte Input-Token) amortisiert sich der Primer-Text nach 10 Abfragen. Bei 100 Abfragen/Tag spart Prompt-Caching gegenüber ungecachtem Input: ~$1,60/Tag.

---

## 7. Integration in den Agent

### 7.1 Platzierung im Kontext-Stack

```
SYSTEM-PROMPT STRUKTUR:
────────────────────────────────────────────────────────────
[BLOCK 1] Rollendefinition und Verhaltensvorgaben         ~500 Token
          (statisch, selten geändert)

[BLOCK 2] Institutionelles Modell (FNR, BMLEH, NMS)      ~1.500 Token
          (statisch, bei institutionellen Änderungen updaten)

[BLOCK 3] Knowledge Primer (FNR-Aktivitätsverständnis)   ~4.000 Token
          ← HIER, nach institutionellem Modell
          (offline generiert, quartalsweise refresh)

[BLOCK 4] Tool-Definitionen + Plan-First-Instruktion       ~800 Token
          (statisch)
────────────────────────────────────────────────────────────
SYSTEM-PROMPT GESAMT:                                    ~7.000 Token
```

**Warum Block 3 nach Block 2:** Das institutionelle Modell gibt den Deutungsrahmen. Der Knowledge Primer ist dann das "Wissen, das innerhalb dieses Rahmens akkumuliert wurde". Der Agent liest Block 2 zuerst und kontextualisiert Block 3 entsprechend.

### 7.2 Prompt-Caching Konfiguration

```python
messages = [
    {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": system_prompt_with_primer,
                "cache_control": {"type": "ephemeral"}
                # Cache-Breakpoint nach dem kompletten System-Prompt
            },
            {
                "type": "text",
                "text": user_query
                # Nicht gecacht — ändert sich pro Abfrage
            }
        ]
    }
]
```

Der System-Prompt (inkl. Primer) wird in der Anthropic-API als Cache-Breakpoint markiert. Nachfolgende Abfragen innerhalb von 5 Minuten zahlen nur ~10% der Input-Token-Kosten für den gecachten Block.

### 7.3 Aktualisierungszyklus

| Trigger | Aktion | Zeitaufwand |
|---|---|---|
| Neue Projekte im Corpus | Stufe 1: Nur neue Verbundvorhaben extrahieren; Stufe 2: Neu generieren | ~15 Min. (automatisiert) |
| Kontrolliiertes Vokabular geändert | Stufe 1 + 2 komplett neu | ~20 Min. |
| Institutionelle Änderungen (NMS, FNR-Struktur) | Nur System-Prompt Block 2 updaten; Primer unberührt | Manuell |
| Qualitätsproblem im Primer erkannt | Stufe-2-Prompt anpassen, Primer neu generieren | ~5 Min. |

**Wichtig:** Der Primer ist versioniert (Dateiname mit Datum). Bei Deployment wird die Primer-Version im Systemlog festgehalten, sodass Antwortverhalten einem Wissensstand zugeordnet werden kann.

---

## 8. Qualitätssicherung

### 8.1 Menschlicher Review nach Stufe 1

Die 59 Verbundvorhaben-Extrakte (JSON, je ~250 Token) sind der natürliche Review-Punkt. Ein FNR-Fachreferent prüft in ~30 Minuten:
- Sind die `themen_tags` konsistent mit dem kontrollierten Vokabular?
- Ist der `foerdertyp` korrekt klassifiziert?
- Fehlen Aktivitäten, die aus den Originaltexten hätten erkannt werden müssen?

Korrekturen werden direkt in die Extrakt-JSONs eingetragen, bevor Stufe 2 läuft.

### 8.2 Qualitätskriterien für den fertigen Primer

Der Primer ist qualitativ ausreichend, wenn ein FNR-Fachreferent nach Lesen bestätigt:

- [ ] Der Primer gibt einen korrekten Gesamteindruck der FNR-Förderaktivitäten
- [ ] Die genannten thematischen Schwerpunkte stimmen mit der wahrgenommenen Realität überein
- [ ] Der beschriebene Projektcharakter (MuD vs. FuE) ist korrekt differenziert
- [ ] Keine wesentlichen Themencluster fehlen
- [ ] Keine falschen Tatsachenbehauptungen (Zahlen, spezifische Ergebnisse)

**Was der Primer nicht leisten muss:** Vollständigkeit über jedes Einzelprojekt. Er ist ein Orientierungsrahmen, kein Faktendokument.

### 8.3 Abgrenzung zum Corpus Index

| Frage | Knowledge Primer | Corpus Index |
|---|---|---|
| "Was für Projekte fördert die FNR?" | ✓ | ✗ |
| "Wie viele Projekte zu Thema X?" | ✗ | ✓ |
| "Was ist der Charakter von MuD-Projekten?" | ✓ | ✗ |
| "Welche Institutionen forschen zu Y?" | Nur Typen | Spezifische Namen |
| "Welche Forschungslücken gibt es?" | Erkennbare Lücken | Aggregierte Desiderate |
| "Was hat Projekt Z konkret gefunden?" | ✗ | ✓ (Befund-Schicht) |

---

## 9. Implementierungsplan (MVP)

### Phase 1 — Vorleistung (manuell, einmalig)

- [ ] Kontrolliertes Vokabular definieren (~30 Tags aus NMS-Handlungsfeldern)
- [ ] Verbundvorhaben-Gruppierung verifizieren (Skript liegt vor, manuelles Review)
- [ ] Stufe-1-Prompt testen an 5 Verbundvorhaben, Extrakt-Qualität prüfen

### Phase 2 — Pipeline-Implementierung

```python
# fnr_pipeline/04_knowledge_primer.py

STUFE1_EXTRAKTION:
  input:  projects_raw/*.json  (177 FKZs)
  group:  nach Verbundvorhaben-ID (Regex auf FKZ-Muster)
  output: data/verbund_extrakte/{verbund_id}.json  (59 Dateien)
  model:  claude-haiku-4-5-20251001
  calls:  ~59 LLM-Calls (parallelisierbar, rate-limited)

STUFE2_SYNTHESE:
  input:  data/verbund_extrakte/*.json  (~59 JSONs)
  output: data/knowledge_primer.md
  model:  claude-sonnet-4-6
  calls:  1 LLM-Call

INTEGRATION:
  output: knowledge_primer.md wird in System-Prompt eingebettet
  update: Datum + Version in Dateiname (knowledge_primer_2026-06-19.md)
```

### Phase 3 — Review und Deployment

- [ ] FNR-Fachreferent reviewt Stufe-1-Extrakte (30 Min.)
- [ ] Korrekturen an Extrakten → Stufe 2 neu ausführen
- [ ] Fertigem Primer: Qualitätscheckliste (Abschnitt 8.2)
- [ ] Integration in System-Prompt, Prompt-Caching konfigurieren

---

## 10. Zusammenfassung: Architektonische Position des Knowledge Primers

```
OFFLINE (einmalig + bei Updates)
─────────────────────────────────────────────────────
177 FKZ-Aufgabenbeschreibungen (~85K Token)
    │
    ▼ [LLM Stufe 1: Haiku, ~59 Calls]
59 Verbundvorhaben-Extrakte (~15K Token JSON)
    │ [menschlicher Review]
    ▼ [LLM Stufe 2: Sonnet, 1 Call]
Knowledge Primer (~4K Token Markdown)
    │
    ▼
System-Prompt Block 3 (prompt-cacheable)
─────────────────────────────────────────────────────

RUNTIME (pro Nutzerabfrage)
─────────────────────────────────────────────────────
Knowledge Primer ist IMMER im Kontext (gecacht)
→ Agent "weiß" ohne Tool-Call, was die FNR fördert

Für Projektcharakter-Details:
→ search(filter={chunk_type: "overview"})  [Steckbrief-Layer]

Für Quantitäten und Lücken:
→ analyze_coverage()  [Corpus Index]

Für Fakten und Belege:
→ search()  [Report-Chunks]
─────────────────────────────────────────────────────
```

Der Knowledge Primer löst das passive Verständnis-Problem mit minimalem Overhead: eine einmalige Offline-Berechnung für ~$0,20, ein statisches Dokument von ~4K Token im System-Prompt, null Retrieval-Latenz für Fragen über den Charakter der FNR-Förderaktivitäten.

---

*Dieses Dokument basiert auf empirischer Analyse des tatsächlichen Projekt-Corpus (177 FKZ-Dateien, gemessen am 19. Juni 2026). Alle Token-Angaben sind Näherungswerte (~3,5 Zeichen/Token für deutschsprachigen Fachtext).*
