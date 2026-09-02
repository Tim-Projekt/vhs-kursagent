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
  primer: `## Context: the Berlin adult-education centres (Volkshochschulen)
<context>
- **Providers:** each of Berlin's 12 boroughs runs its own Volkshochschule (VHS Mitte, VHS Friedrichshain-Kreuzberg, VHS Pankow, VHS Charlottenburg-Wilmersdorf / "City West", VHS Spandau, VHS Steglitz-Zehlendorf, VHS Tempelhof-Schöneberg, VHS Neukölln, VHS Treptow-Köpenick, VHS Marzahn-Hellersdorf, VHS Lichtenberg, VHS Reinickendorf), plus a central "Servicezentrum" (e.g. central exams). Registration and the fee schedule are handled per borough VHS.
- **Programme structure (DVV classification):** six subject areas — (1) Society / Politics / Environment, (2) Culture & Creativity, (3) Health, (4) Languages, (5) Work & Career, (6) Basic education / school-leaving qualifications; in Berlin additionally literacy/basic education and cross-cutting offerings.
- **Terms:** spring ("F") and autumn ("H"); the term is the suffix of the course number (e.g. "Mi302-070H").
- **Formats:** in-person, online (often via vhs.cloud or BigBlueButton/Zoom), blended learning, self-study. Special forms: educational leave (Bildungsurlaub / Bildungszeit, under the Berlin Bildungszeitgesetz), placement advice (usually free), workshops, talks, study trips.
- **German & integration courses:** many "Deutsch als Fremdsprache" courses; some are BAMF-funded Integrationskurse (with an Orientierungskurs module) for people entitled to them — distinct from regular German courses. Eligibility for a BAMF Integrationskurs is decided by BAMF / the immigration office, not by the VHS.
- **Fees:** a standard fee plus, frequently, a reduced fee (e.g. with a berlinpass, for people on low income). Some offerings are free.
- **Levels (languages):** CEFR A1–C2; language courses from A1.1 need no placement, above that a placement check is recommended.
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
