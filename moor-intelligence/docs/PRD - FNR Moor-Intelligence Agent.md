# Product Requirements Document
## FNR Moor-Intelligence Agent

**Version:** 0.1 (Analysebasiert, vor Nutzervalidierung)
**Autor:** Claude Sonnet 4.6 / Moor-Intelligence
**Datum:** 18. Juni 2026
**Status:** Entwurf – kritische Annahmen markiert, Rückfragen am Ende

---

## 1. Zweck dieses Dokuments

Dieses PRD ist keine Featureliste. Es ist eine strukturierte Produktdefinition auf Basis von institutionellem Kontextverständnis, Online-Recherche und fachlicher Analyse. Es soll als Entscheidungsgrundlage dienen: Was wird gebaut, warum, für wen, mit welchen Qualitätsanforderungen und was bleibt noch offen.

Grundregel dieses Dokuments: Gesicherte Erkenntnisse, Annahmen und offene Fragen sind explizit markiert.

---

## 2. Situationsanalyse: Das eigentliche Problem

### 2.1 Was hier nicht gebaut wird

Es geht nicht darum, eine Suchmaschine über FNR-Projektberichte zu bauen. Das wäre das falsche Produkt – und würde den tatsächlichen Bedarf verfehlen.

Abschlussberichte sind für eine Suchmaschine zu sperrig, zu heterogen und zu kontextarm. Ein Projektbericht antwortet auf die Frage "Was haben wir in diesem Projekt gemacht und gefunden?" – nicht auf die Frage "Was bedeutet das für die übergreifende Förderarbeit der FNR?"

### 2.2 Was das eigentliche Problem ist

Die FNR akkumuliert über Jahre hinweg ein massives Wissenskorpus: Projektberichte, Zwischenberichte, Fachpublikationen, Gutachten, Förderaufrufe, Projektskizzen, Praxisberichte. Dieses Wissen ist:

- **fragmentiert:** Verteilt über viele Projekte, Themenfelder, Förderjahre
- **heterogen:** Unterschiedliche Berichtsformate, wissenschaftliche Tiefe, Sprachen
- **schwer aggregierbar:** Kein Instrument verbindet die Erkenntnisse über Projekte hinweg
- **implizit kodiert:** Viele Muster, Erfolgsfaktoren und Wissensdefizite stecken latent im Korpus, sind aber nicht explizit adressiert

Die Folge: Entscheidungsträger bei der FNR – und beim auftraggebenden BMLEH – können nur begrenzt auf das akkumulierte Wissen zugreifen. Neue Förderaufrufe werden gestaltet, ohne systematisch aus vergangenen Projektergebnissen zu lernen. Lücken in der Erkenntnisbasis bleiben unentdeckt. Muster über erfolgreiche und weniger erfolgreiche Förderstrategien sind schwer zu benennen.

### 2.3 Die eigentliche Aufgabe des Agents

Der Agent soll institutionelles Gedächtnis und fachliche Synthesekapazität bereitstellen, die die FNR-Mitarbeitenden selbst nicht in der Breite und Tiefe leisten können – weil es an Zeit, Kapazität oder systematischen Instrumenten fehlt.

Er soll nicht Fragen beantworten, die man googlen könnte. Er soll Fragen beantworten, die nur beantwortet werden können, wenn man den gesamten FNR-Moor-Projektkorpus tiefgründig versteht und in Zusammenhang bringen kann.

---

## 3. Institutioneller und fachlicher Kontext

### 3.1 Die FNR: Rolle und Arbeitslogik

**Gesichert:** Die Fachagentur Nachwachsende Rohstoffe (FNR) ist Projektträger des Bundesministeriums für Landwirtschaft, Ernährung und Heimat (BMLEH). Sie fungiert als Bindeglied zwischen Ministerium und Forschungsnehmenden.

Kernaufgaben der FNR im Förderprozess:
- Beratung von Antragstellern
- Entgegennahme und Prüfung von Projektskizzen und Vollanträgen
- Vorbereitung von Förderentscheidungen (im Auftrag des BMLEH)
- Administrative und fachliche Projektbegleitung während der Laufzeit
- Prüfung von Zwischen- und Abschlussberichten
- Erfolgskontrolle und Wissenstransfer
- Gestaltung und Ausschreibung neuer Förderaufrufe

**Für das Produkt relevant:** Die FNR ist nicht nur Verwalter, sondern fachlicher Begleiter. Ihre Mitarbeitenden entwickeln über die Jahre tiefes Domänenwissen – das aber nicht systematisch festgehalten wird. Genau hier liegt der primäre Ansatzpunkt des Agents.

### 3.2 Die institutionelle Komplexität: Zwei Ministerien, ein Thema

**Gesichert:** Moorschutz in Deutschland ist zwischen zwei Bundesministerien aufgeteilt – mit unterschiedlichen Förderlogiken, Instrumenten und Zielgruppen:

| Ministerium | Förderinstrument | Schwerpunkt | Durchführer |
|---|---|---|---|
| BMLEH | Förderprogramm NER / FNR | Paludikultur, landwirtschaftliche Moornutzung, F&E | FNR |
| BMUKN | ANK (Aktionsprogramm Natürlicher Klimaschutz) | Wiedervernässung, Naturschutz, Flächenschutz | ZUG |
| BMUKN | Pilotvorhaben Moorbodenschutz | Demonstrationsprojekte Nassnutzung | ZUG |
| Palu-Förderrichtlinie (BMUKN) | Direktzahlungen an Landwirte | Wirtschaftliche Anreize | Länder |

Das BMLEH-Budget (FNR): ~80 Mio. € bis 2032 für F&E und MuD
Das BMUKN-Budget (ANK + Pilotvorhaben): >1,8 Mrd. € bis 2029/2031

**Für das Produkt relevant:** Der Agent muss die unterschiedliche Förderlogik beider Ministerien verstehen und auseinanderhalten können. Fragen wie "Was fördert der Bund beim Moorschutz?" haben keine einfache Antwort – sie hängen davon ab, ob man landwirtschaftliche Nutzung, Naturschutz oder Klimaschutz meint. Diese institutionelle Komplexität muss im Agent kodiert sein.

### 3.3 Fachlicher Kontext: Moorschutz in Deutschland

**Gesichert:** Moore bedecken in Deutschland ca. 1,8 Mio. Hektar (ca. 5% der Landfläche), davon sind über 90% entwässert. Entwässerte Moore emittierten 2023 ~50,8 Mio. t CO2-Äquivalente – ca. 7% der deutschen Treibhausgasemissionen.

Die Nationale Moorschutzstrategie (Kabinettsbeschluss November 2022) definiert:
- 10 Handlungsfelder, 49 Ziele, 117 Maßnahmen
- Kernemissionsziel: -5 Mio. t CO2-Äq./Jahr bis 2030
- Instrumente: Wiedervernässung, Paludikultur, Naturschutz, regulatorische Maßnahmen

Die drei zentralen Handlungsansätze, die das FNR-Förderportfolio strukturieren:

**1. Moorrenaturierung / Wiedervernässung**
Anhebung des Wasserstandes auf entwässerten Moorflächen. Schnellste Wirkung auf THG-Emissionen. Hohe Akzeptanzherausforderungen bei Landwirten. Primär BMUKN/ANK, aber auch Teil von FNR-geförderten Demonstrationsprojekten.

**2. Paludikultur**
Nasslandwirtschaft auf wiedervernässten Moorböden. Schlüsselkonzept, weil es Klimaschutz und landwirtschaftliche Nutzung verbindet. Pflanzen: Schilf (*Phragmites*), Rohrkolben (*Typha*), Torfmoos (*Sphagnum*), Seggen (*Carex*). Produkte: Dämmstoffe, Substrate (Torfersatz im Gartenbau), Energie, Papier, Biokunststoffe. **Kernherausforderung:** Keine etablierten Wertschöpfungsketten, kaum Marktreife, Anbaumethoden noch in Entwicklung. Dies ist der primäre FNR-Förderschwerpunkt.

**3. Schutz intakter Moore**
Erhalt verbliebener naturnaher Hochmoore und Niedermoore. Primär Naturschutzinstrument (BMUKN/BfN/Länder). FNR-Relevanz eher nachgeordnet.

### 3.4 Das wissenschaftliche Ökosystem

**Gesichert:** Ein dichtes Netzwerk spezialisierter Institutionen prägt die deutsche Moorforschung:

- **Greifswald Moor Centrum (GMC):** Leitendes Forschungszentrum, ~70 Moorwissenschaftler, Schnittstelle Wissenschaft-Politik-Praxis, internationale Expertise
- **Thünen-Institut (Agrarklimaschutz):** THG-Messung auf Moorböden, Moorkataster, Grundlagendaten für Emissionsberichterstattung, koordiniert PaludiZentrale
- **HSWT – Peatland Science Center:** Angewandte Paludikultur-Forschung
- **HNEE Eberswalde:** Moorschutz-AG, regionale Transferarbeit
- **Succow-Stiftung:** Naturschutz-Moorschutz, Projektträger für GMC
- **NABU, BUND:** NGO-Implementierung, Praxisprojekte

**Für das Produkt relevant:** Der Agent muss wissen, welche Institution für welche Fragen die maßgebliche wissenschaftliche Quelle ist. Greifswald hat Klimaexpertise; Thünen liefert Emissionsdaten; HSWT kennt Anbautechnik. Diese Expertise-Karte ist Teil des institutionellen Wissens, das der Agent tragen muss.

---

## 4. Nutzerprofil und Entscheidungsbedarfe

### 4.1 Primäre Nutzer: FNR-Fachreferenten und Projektbetreuer

**Annahme (zu validieren):** Die primären Nutzer sind FNR-interne Mitarbeitende, die:

- Neue Förderaufrufe konzipieren und fachlich vorbereiten
- Projektskizzen und -anträge fachlich beurteilen
- Laufende Projekte begleiten und Berichte bewerten
- Synergien zwischen Projekten identifizieren
- Fachliche Unterlagen und Strategiepapiere für das Ministerium erstellen
- Stakeholderveranstaltungen vorbereiten

**Charakteristik:** Diese Nutzer sind keine Moorwissenschaftler, aber auch keine Laien. Sie haben mittlere bis hohe Fachkompetenz, kennen die FNR-Projekte, aber können nicht alle gleichzeitig detailliert im Kopf haben. Sie brauchen keinen Wissenstransfer – sie brauchen Synthese und Kontext auf Zuruf.

### 4.2 Sekundäre Nutzer: BMLEH-Referenten (ministerielle Ebene)

**Annahme:** Das BMLEH nutzt FNR-Expertise für politische Entscheidungen. Auf dieser Ebene sind die Fragen strategischer:

- Welche Erkenntnislage rechtfertigt einen neuen Förderaufruf?
- Wie wirksam war die bisherige Förderung?
- Was sind die zentralen Bottlenecks bei der Skalierung von Paludikultur?
- Welche Wissenslücken müssen für die Zielerreichung 2030 noch geschlossen werden?

Diese Nutzer wollen keine Projektdetails – sie wollen gesicherte Aussagen mit Begründung und klarer Transparenz über Evidenzlage.

### 4.3 Entscheidungstypen, die das Produkt besser machen soll

| Entscheidungstyp | Beispielfrage | Benötigter Wissenstyp |
|---|---|---|
| Förderaufrufsgestaltung | "Welche Themen sind in bestehenden Projekten unterversorgt?" | Corpus-Analyse, Lückenidentifikation |
| Antragsprüfung | "Welche Vorarbeiten existieren zu diesem Ansatz?" | Projektsuche, Duplikatprüfung |
| Strategieberatung | "Was sind die 3 größten Skalierungshürden bei Paludikultur?" | Synthese über Projektergebnisse |
| Wirkungsmonitoring | "Welche Projekte haben ihre Ziele erreicht und was waren Erfolgsfaktoren?" | Komparative Analyse |
| Netzwerkpflege | "Wer hat am meisten zu Thema X geforscht und ist noch aktiv?" | Akteurs-Wissensgraph |
| Wissensvermittlung | "Erkläre mir den aktuellen Forschungsstand zur Sphagnum-Produktion" | Fachliche Synthese + Quellenbegründung |

---

## 5. Produktvision: Was genau wird gebaut

### 5.1 Kernkonzept

Ein spezialisierter KI-Agent, der das akkumulierte Förder- und Forschungswissen der FNR im Moorbereich synthetisch zugänglich macht. Er verbindet drei Wissensebenen:

1. **Projektwissen:** Erkenntnisse aus einzelnen FNR-Projekten (Berichte, Ergebnisse, Methoden, Akteure)
2. **Kontextwissen:** Institutionelle Logik (FNR, BMLEH, BMUKN), Förderpraxis, Akteursnetzwerk
3. **Domänenwissen:** Fachliche Grundlagen Moorschutz, Paludikultur, Renaturierung, Klimaschutz

Der Agent ist kein Chatbot für allgemeine Moorinformationen und keine Projektdatenbank-Suchmaske. Er ist ein Analyse- und Synthesewerkzeug für informierte Nutzer, die spezifische Fragen an das FNR-Wissenskorpus stellen.

### 5.2 Abgrenzung: Was der Agent NICHT ist

- Kein Ersatz für wissenschaftliche Gutachter
- Kein Publikumswerkzeug (nicht für Laien oder allgemeine Moorinteressierte)
- Keine Fördermitteldatenbank (nicht "wo beantrage ich Mittel?")
- Kein Werkzeug für rechtssichere Förderbescheide
- Keine Echtzeit-Informationsquelle zu aktuellen Förderaufrufen
- Kein Dokumentenmanagementsystem

---

## 6. Wissensarchitektur: Vier Wissenstypen

### Typ 1: Strukturiertes Projektwissen (primäre Datengrundlage)

- FNR-Abschlussberichte (Quelldokumente je Projekt)
- Zwischenberichte (prozessuale Erkenntnisse, Herausforderungen)
- Projektskizzen und -anträge (ursprüngliche Ziele, Hypothesen)
- Veröffentlichte Projektergebnisse (Publikationen, Poster, Präsentationen)
- Projektmetadaten (Laufzeit, Budget, Förderlinie, Konsortium, Fördernehmer, Fördergebiet)

**Anforderung:** Dieses Wissen muss strukturiert indexierbar und mit Quellangaben verknüpfbar sein. Jede Aussage des Agents, die auf diesem Wissen basiert, muss auf konkrete Projekte und Dokumente zurückführbar sein.

### Typ 2: Institutionelles Kontextwissen (einzubettendes Systemwissen)

- Förderlogik der FNR (Projekttypen FuE/MuD, Berichtspflichten, Evaluationslogik)
- Förderlogik BMLEH vs. BMUKN (institutionelle Landschaft, Abgrenzungen)
- Förderaufrufe und Bekanntmachungen (thematische Schwerpunktsetzungen über Zeit)
- Akteurskarte: Welche Institutionen forschen zu welchen Themen?
- Governance-Rahmen: Nationale Moorschutzstrategie, EU-Naturwiederherstellungsverordnung, LULUCF

**Anforderung:** Dieses Wissen muss so kodiert sein, dass der Agent institutionelle Zusammenhänge erklären kann, ohne dabei die Frage direkt im Dokument beantworten zu müssen. Es ist Hintergrundmodell, nicht primärer Retrieval-Gegenstand.

### Typ 3: Fachwissenschaftliches Grundwissen (Domänenmodell)

- Moorökosysteme: Hoch- vs. Niedermoore, Hydrologie, Torfbildung, Biodiversität
- Klimaschutzwirkung: THG-Emissionsmechanismen aus entwässerten Mooren, Senkeneffekte bei Wiedervernässung
- Paludikultur-Agronomie: Pflanzenarten, Anbausysteme, Ernte- und Verwertungslogistik
- Wertschöpfungsketten: Rohstoffwege, Marktreife, Skalierungshürden
- Ökologie: Biodiversitätswirkungen von Wiedervernässung, Habitatfunktionen

**Anforderung:** Dieses Wissen bildet den Referenzrahmen, damit der Agent Projektaussagen kontextuell einordnen kann ("War dieses Projektergebnis überraschend? Entspricht es dem Forschungsstand?"). Es ist nicht vollständig dokumentenbasiert – sondern muss als strukturiertes Domänenmodell (ggf. über hochwertige Basisliteratur + Modell-Training) eingebettet sein.

### Typ 4: Metawissen über den Projektkorpus (emergierende Ebene)

- Welche Themen sind im Korpus gut abgedeckt, welche unterversorgt?
- Welche Forschungsgruppen arbeiten zu welchen Themen, gibt es Cluster?
- Wie haben sich Erkenntnisse über Zeit entwickelt (z.B. THG-Faktoren)?
- Welche Annahmen aus frühen Projekten wurden später widerlegt?
- Welche Fragestellungen tauchen in vielen Projekten auf?

**Anforderung:** Dieser Wissenstyp entsteht nicht aus einzelnen Dokumenten – er erfordert Aggregation über den gesamten Corpus. Das ist die technisch und konzeptionell anspruchsvollste Ebene, aber auch die wertvollste.

---

## 7. Kernfunktionen des Agents (nach Priorität)

### Prio 1 – Kernfunktionen (Produktreife ohne diese nicht sinnvoll)

**F1: Projektbezogene Synthese**
Antworten auf Fragen über einzelne Projekte, aber vor allem über Projektgruppen oder Themencluster. "Was wissen wir aus unseren Projekten zur THG-Minderung durch Schilfanbau?" erfordert kein Projektretrieval, sondern thematische Synthese.

**F2: Vergleichende Analyse**
Gegenüberstellung von Ansätzen, Methoden oder Ergebnissen verschiedener Projekte. "Welche Wiedervernässungsmethoden wurden erprobt und welche zeigten welche Wirkungen?"

**F3: Quellentransparenz**
Jede inhaltliche Aussage muss auf Quellen (Projekte, Berichte, Dokumente) zurückführbar sein. Ohne diese Eigenschaft ist der Agent für institutionelle Entscheidungsunterstützung nicht vertrauenswürdig.

**F4: Lückenidentifikation**
Benennung von Themen, Fragestellungen oder Regionen, die im Förderkorpus unterrepräsentiert sind. Dies ist eine direkte Entscheidungsunterstützung für neue Förderaufrufe.

### Prio 2 – Erweiterungsfunktionen (klar nützlich, aber nicht blockierend)

**F5: Akteurs-Mapping**
"Wer forscht zu Thema X, wer hat welche Expertise?" auf Basis des Projektkorpus.

**F6: Zeitliche Entwicklung**
Wie hat sich Erkenntnisstand zu einer Frage über mehrere Förderjahre entwickelt? Haben frühere Annahmen gehalten?

**F7: Kontexteinbettung**
Einordnung von Projekterkenntnissen in den größeren Policy-Rahmen (Moorschutzstrategie, Emissionsziele, internationale Einordnung).

### Prio 3 – Zukunftsfunktionen (nach erfolgreicher Prio-1-Implementierung)

**F8: Förderaufruf-Assistent**
Unterstützung bei der Gestaltung neuer Förderaufrufe: Welche Themen fehlen? Welche Expertise sollte eingebunden werden? Welche Fragestellungen sind wissenschaftlich reif für eine Förderphase?

**F9: Antragsprüfungs-Support**
Schnellcheck: Gibt es Vorarbeiten zu diesem Thema? Welche Projekte haben ähnliche Ansätze verfolgt?

---

## 8. Qualitätsanforderungen an Antworten

Dies ist möglicherweise die kritischste Anforderungsdimension. Oberflächliche oder fehlerhafte Antworten in einem institutionellen Entscheidungskontext können Schaden anrichten.

### 8.1 Antwortqualität

**Begründungspflicht:** Jede inhaltliche Aussage muss begründet sein – entweder durch Quellenangabe oder durch explizite Einordnung als Systemwissen/Inferenz.

**Unsicherheitstransparenz:** Der Agent muss unterscheiden können zwischen:
- Direkt belegten Aussagen ("Projekt X hat gezeigt, dass...")
- Schlussfolgerungen aus mehreren Quellen ("Über mehrere Projekte hinweg zeichnet sich ab...")
- Fachlichem Systemwissen ("Nach aktuellem Forschungsstand...")
- Nicht-belegbaren Annahmen ("Es ist plausibel anzunehmen, dass... [nicht belegt]")

**Vollständigkeitssignaling:** Wenn der Agent eine Frage nicht vollständig aus dem Corpus beantworten kann, muss er dies explizit benennen – inkl. Einschätzung, ob die Lücke im Corpus liegt oder in der Fragestellung.

**Keine Halluzination:** Besonders kritisch bei Zahlen, Förderbeträgen, Projektergebnissen. Der Agent darf keine Projektergebnisse erfinden oder interpolieren. Lieber "Keine gesicherte Information vorhanden" als plausibel klingende Falschinformation.

### 8.2 Antwortform

**Angemessene Länge:** Antworten sollen substanziell, aber nicht erschöpfend sein. Nutzer sind informierte Fachleute, keine Einsteiger.

**Strukturierte Ausgabe:** Für Synthesefragen: klare Gliederung. Für Faktenfragen: direkte Antwort mit Quellenangabe. Für Strategiefragen: Kernaussage + Begründungsrahmen + Einschränkungen.

**Keine Reproduktion:** Der Agent soll nicht Texte aus Berichten reproduzieren, sondern aus ihnen synthetisieren. Wörtliche Zitate nur wenn fachlich präzise relevant.

### 8.3 Vertrauenswürdigkeit als Systemeigenschaft

Der Agent muss konsistent sein: Gleiche Frage darf nicht heute eine andere Antwort ergeben als morgen (bei gleichem Wissensstand). Inkonsistenz untergräbt institutionelles Vertrauen dauerhaft.

---

## 9. Systemgrenzen und kritische Einschränkungen

### Was der Agent explizit NICHT leisten soll

- **Rechtliche Einschätzungen** zu Förderfähigkeit, Zuwendungsrecht, BNBR
- **Aktuelle Echtzeitinformationen** (Deadline nächster Förderaufruf, aktuelle Projektliste)
- **Fachliche Begutachtung** von Anträgen im Sinne einer offiziellen Prüfung
- **Politische Positionierung** zu Interessenkonflikten (Landwirtschaft vs. Umwelt)
- **Externe Datenbanken** (Thünen-Moorkataster, UBA-Emissionsberichte) ohne explizite Integration

### Wichtige technische Einschränkungen

- Der Agent ist so gut wie seine Datenbasis. Wenn Abschlussberichte fehlen, zu spät hochgeladen oder qualitativ minderwertig sind, leidet die Antwortqualität
- Der Corpus ist naturgemäß vergangenheitsorientiert. Aktuelle Forschungsentwicklungen außerhalb des FNR-Portfolios sind nur durch explizite Integration erreichbar

---

## 10. Technische und produktseitige Risiken

### Risiko 1: Datenlage (hoch)
**Problem:** Wenn die Abschlussberichte strukturell heterogen, unvollständig oder qualitativ inkonsistent sind, kann kein verlässlicher Agent daraus entstehen.
**Mitigation:** Vor Beginn der Implementierung muss der Dokumentenkorpus analysiert werden: Umfang, Format, Qualität, Metadaten-Verfügbarkeit.

### Risiko 2: Halluzination in einem Niedrig-Feedback-Kontext (hoch)
**Problem:** FNR-Fachleute kennen nicht alle Projektergebnisse im Detail. Sie können Fehler des Agents möglicherweise nicht erkennen.
**Mitigation:** Quellentransparenz ist keine Nice-to-have-Funktion, sondern Grundvoraussetzung. Der Agent muss immer zeigen, woher er weiß, was er sagt.

### Risiko 3: Überinterpretation von Projektergebnissen (mittel)
**Problem:** MuD-Ergebnisse sind kontextspezifisch (Region, Bodenbedingungen, Wasserhaushalt). Der Agent könnte Ergebnisse übertragen, die nicht übertragbar sind.
**Mitigation:** Kontextfaktoren müssen als Metadaten je Projekt kodiert sein. Antworten müssen Geltungsbereich explizit machen.

### Risiko 4: Vertrauensaufbau braucht Zeit (mittel)
**Problem:** Wenn der Agent früh schlechte Antworten gibt (wegen Datenlage oder Modellqualität), verlieren die Nutzer das Vertrauen dauerhaft.
**Mitigation:** Gestaffelter Rollout. Anfangs enge Einschränkung auf gut abgedeckte Themen. Transparenz über aktuelle Grenzen des Systems.

### Risiko 5: Institutionelle Sensibilität (mittel)
**Problem:** Projektbeurteilungen, Erfolgsfaktorenanalysen und Lückenidentifikation können als implizite Kritik an einzelnen Projekten oder Förderentscheidungen wahrgenommen werden.
**Mitigation:** Klarer Rahmen: Der Agent analysiert das Wissenskorpus, bewertet keine Förderentscheidungen. Sprache muss entsprechend kalibriert sein.

---

## 11. Kritische offene Fragen

Dies sind keine Fragen, die ich als Autor beantworten kann. Sie müssen mit der FNR und dem Auftraggeber geklärt werden, bevor eine fundierte technische Konzeption beginnt.

### F1 (Kritisch – blockiert technische Architektur)
**Welche Dokumente existieren konkret, in welchem Format und welcher Qualität?**
Anzahl der Projekte im Moorbereich, Format der Berichte (PDF, Word, Scans), Metadaten-Verfügbarkeit, Sprachen, Zeitraum. Ohne diese Information kann kein RAG-System, kein Datenbankschema und kein Indexierungsplan entwickelt werden.

### F2 (Kritisch – bestimmt Produktschnitt)
**Wer sind die primären Nutzer und wie sind ihre konkreten Arbeitssituationen?**
Sitzen FNR-Referenten mit dem Agent vor einem Laptop und formulieren Fragen? Oder wird der Agent in einen bestehenden Workflow eingebettet (z.B. Antragsbearbeitung, Strategiepapier-Erstellung)? Dies bestimmt Interface, Antwortstil und Priorisierung der Funktionen fundamental.

### F3 (Kritisch – Datenschutz und IT-Governance)
**Welche Anforderungen gelten für Datensouveränität, Hosting und Zugriffskontrolle?**
Die FNR ist Projektträger des Bundes. Unveröffentlichte Projektberichte können vertraulich sein. Cloud vs. On-Premise, welcher LLM-Anbieter darf genutzt werden, welche Daten dürfen das Bundesrechenzentrum verlassen? Dies ist entscheidend für die technische Architektur.

### F4 (Wichtig – Scope-Definition)
**Soll der Agent ausschließlich FNR-Projekte abbilden oder auch externe wissenschaftliche Literatur?**
Eine Integration von GMC-Publikationen, Thünen-Berichten oder UBA-Studien würde die Aussagekraft deutlich erhöhen – aber auch den Scope, die Lizenzfragen und die Pflegekomplexität.

### F5 (Wichtig – Abgrenzung)
**Gibt es bereits interne Wissenssysteme bei der FNR (Wissensdatenbank, SharePoint, Projekttracking-System)?**
Integration vs. Neuentwicklung. Der Agent sollte an bestehende Systeme anschließen, nicht duplizieren.

### F6 (Mittel – aber zeitkritisch für MVP)
**Wie viele Moor-bezogene FNR-Projekte existieren aktuell, und sind die Abschlussberichte bereits digital verfügbar?**
Projektdatenbank (projekte.fnr.de) ist öffentlich, aber Berichte sind nicht alle zugänglich. Wird die FNR interne Dokumente bereitstellen? In welchem Prozess?

---

## 12. Priorisierung und MVP-Empfehlung

### MVP (Phase 1): Domänenwissen + strukturierte Dokumentenabfrage

**Ziel:** Beweisen, dass der Agent nützlichere Antworten auf Synthesefragen gibt als ein manueller Dokumentenabruf.

**Umfang:**
- Integration von 20–50 repräsentativen FNR-Moor-Projekten (Abschlussberichte, Metadaten)
- Eingebettetes institutionelles Wissen (FNR-Förderlogik, Nationaler Moorschutzrahmen, Akteurskarte)
- Domänenmodell Paludikultur + Moorrenaturierung als strukturiertes Basiswissen
- Kernfunktionen F1–F3 (Projektsynthese, Vergleich, Quellenangaben)

**Nicht im MVP:**
- Metaanalyse über den Gesamtcorpus (F4, Lückenidentifikation)
- Akteurs-Mapping (F5)
- Externe Literaturdatenbanken

**Validierungskriterium für MVP:**
5 FNR-Fachreferenten, 5 vorbereitete Fragen, die in der Praxis relevant sind. Bewertet werden: Antwortqualität, Quellengenauigkeit, nützlicher Erkenntnisgewinn gegenüber eigenem Wissen/eigener Suche.

### Phase 2: Metaebene und Corpus-Vollständigkeit

- Ausbau auf vollständigen Moorprojekt-Corpus der FNR
- Lückenidentifikation (F4) und zeitliche Entwicklungsanalyse (F6)
- Integration externer Quellen (Thünen, GMC, UBA) – nach Lizenz- und Governance-Klärung

### Phase 3: Entscheidungsunterstützung

- Förderaufruf-Assistent (F8)
- Antragsprüfungs-Support (F9)
- Integration in FNR-Workflows

---

## 13. Zusammenfassung: Was hier kritisch ist

Die folgenden Eigenschaften sind keine Features, sondern Grundbedingungen für ein nützliches Produkt:

1. **Quellentransparenz** – ohne sie ist der Agent im institutionellen Kontext nicht vertrauenswürdig
2. **Fachliche Tiefe** – ein generisches KI-System ohne Moordomäne und FNR-Institutionsverständnis beantwortet die relevanten Fragen nicht
3. **Unsicherheitssignaling** – das System muss wissen, was es nicht weiß, und das sagen
4. **Datenbasis-Qualität** – die beste Architektur kann einen inkonsistenten Dokumentenkorpus nicht kompensieren
5. **Nutzervalidierung** – die Nutzeranforderungen dieses PRDs sind Annahmen, keine gesicherten Erkenntnisse. Bevor Prio-1-Entwicklung beginnt, muss mit echten FNR-Nutzern validiert werden

Was hier scheitern würde: Ein System, das nur eine semantische Suche über PDF-Berichte legt, gute Ergebnisse für einfache Suchanfragen liefert, aber keine Synthese produziert, institutionellen Kontext nicht kennt und Unsicherheiten nicht transparent macht.

---

*Dieses PRD basiert auf Desk Research und öffentlich zugänglichen Informationen. Für die Validierung der Nutzerannahmen (Abschnitt 4 und 11) sowie der Datenlage (Frage F1, F6) sind strukturierte Interviews mit FNR-Mitarbeitenden und eine Corpus-Analyse erforderlich.*

---

**Quellen (Recherchegrundlage):**
- [FNR – Projektträgerschaft](https://www.fnr.de/fnr-struktur-aufgaben-lage/aufgaben/projekttraegerschaft)
- [FNR – Themenportal Moorbodenschutz](https://moor.fnr.de)
- [BMLEH – Klimaschutz durch Moorbodenschutz](https://www.bmleh.de/DE/themen/landwirtschaft/klimaschutz/moorbodenschutz.html)
- [Nationale Moorschutzstrategie – Kabinettsbeschluss Nov. 2022](https://www.bmuv.de/fileadmin/Daten_BMU/Pools/Broschueren/nationale_moorschutzstrategie_bf.pdf)
- [FNR – Förderaufruf Moorbodenschutz und Paludikultur](https://news.fnr.de/fnr-pressemitteilung/foerderaufruf-zum-moorbodenschutz-1)
- [Greifswald Moor Centrum – Expertise](https://greifswaldmoor.de/home.html)
- [Thünen-Institut – Moorschutz in Deutschland](https://www.thuenen.de/de/institutsuebergreifende-projekte/moorschutz-in-deutschland/)
- [FNR – Förderprogramm Nachhaltige Erneuerbare Ressourcen](https://www.fnr.de/projektfoerderung)
