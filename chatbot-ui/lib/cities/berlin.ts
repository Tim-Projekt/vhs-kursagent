import type { City } from "./types";

export const BERLIN_DISTRICTS = [
  "Mitte",
  "Friedrichshain-Kreuzberg",
  "Pankow",
  "Charlottenburg-Wilmersdorf",
  "Spandau",
  "Steglitz-Zehlendorf",
  "Tempelhof-Schöneberg",
  "Neukölln",
  "Treptow-Köpenick",
  "Marzahn-Hellersdorf",
  "Lichtenberg",
  "Reinickendorf",
  "Servicezentrum",
];

export const berlin: City = {
  slug: "berlin",
  name: "Berlin",
  displayName: "die Berliner Volkshochschulen",
  namespace: "vhs/berlin",
  sourceId: "berlin",
  region: "Berlin",
  providerLabel: "Bezirks-VHS",
  districtLabel: "Bezirk",
  districts: BERLIN_DISTRICTS,
  approxCourseCount: 10_000,
  primer: `## Kontext: ${"die Berliner Volkshochschulen"}
<context>
- **Träger:** Jeder der 12 Berliner Bezirke betreibt eine eigene Volkshochschule (VHS Mitte, VHS Friedrichshain-Kreuzberg, VHS Pankow, VHS Charlottenburg-Wilmersdorf / "City West", VHS Spandau, VHS Steglitz-Zehlendorf, VHS Tempelhof-Schöneberg, VHS Neukölln, VHS Treptow-Köpenick, VHS Marzahn-Hellersdorf, VHS Lichtenberg, VHS Reinickendorf). Dazu ein "Servicezentrum" (u. a. zentrale Prüfungen). Anmeldung und Entgeltordnung laufen je Bezirks-VHS.
- **Programmstruktur (DVV-Systematik):** sechs Programmbereiche — (1) Politik – Gesellschaft – Umwelt, (2) Kultur – Gestalten, (3) Gesundheit, (4) Sprachen, (5) Arbeit – Beruf, (6) Grundbildung – Schulabschlüsse; in Berlin zusätzlich Alphabetisierung/Grundbildung und übergreifende Angebote.
- **Semester:** Frühjahr ("F") und Herbst ("H"); das Semester steckt im Suffix der Kursnummer (z. B. "Mi302-070H").
- **Formate:** Präsenzkurs, Online-Kurs (oft über die vhs.cloud oder BigBlueButton/Zoom), Blended Learning, Selbstlernangebote. Sonderformen: Bildungsurlaub/Bildungszeit (nach dem Berliner Bildungszeitgesetz), Einstufungsberatung (meist kostenlos), Workshops, Vorträge, Studienfahrten.
- **Entgelt:** reguläres Entgelt + häufig ein ermäßigtes Entgelt (z. B. mit berlinpass, für Menschen mit geringem Einkommen). Einzelne Angebote sind kostenlos.
- **Niveaus (Sprachen):** GER-Stufen A1–C2; Sprachkurse ab A1.1 brauchen keine Beratung, darüber wird eine Einstufung empfohlen.
</context>`,
  seo: {
    tagline: "VHS-Kurse in Berlin finden – mit KI-Kursberatung",
    metaDescription:
      "Finde aus rund 10.000 Kursen der 12 Berliner Volkshochschulen den passenden: Sprachen, Gesundheit, EDV, Kultur, Bildungsurlaub. Semantische Suche und KI-Beratung, direkt zur Anmeldung bei deiner Bezirks-VHS.",
  },
  data: {
    licenseLabel: "Creative Commons Namensnennung (CC BY)",
    attribution: "Servicezentrum der Berliner Volkshochschulen",
    sourceName: "Berlin Open Data",
    sourceUrl: "https://daten.berlin.de/datensaetze/kurse",
  },
};
