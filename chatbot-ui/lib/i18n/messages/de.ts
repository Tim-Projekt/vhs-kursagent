export const de = {
  header: {
    ctaChat: "KI-Beratung starten",
  },
  footer: {
    dataLine:
      "Kursdaten: {source} · Bereitgestellt von {attribution} · Lizenz {license}. Kein offizielles Angebot der Volkshochschulen. Anmeldung und verbindliche Informationen bei der jeweiligen {provider}.",
    imprint: "Impressum",
    privacy: "Datenschutz",
  },
  landing: {
    metaTitle: "VHS-Kurse in {city} finden – mit KI-Kursberatung",
    metaDescription:
      "Finde aus rund {n} aktuellen Kursen der Volkshochschulen in {city} den passenden: Sprachen, Gesundheit, Beruf, EDV, Kultur, Bildungsurlaub. Semantische Suche und KI-Beratung, direkt zur Anmeldung.",
    h1: "VHS-Kurse in {city} finden",
    intro:
      "Durchsuche rund {n} aktuelle Kurse der Volkshochschulen in {city} nach Thema, Niveau, Format und {district}. Die KI-Kursberatung hilft dir bei der Auswahl; anmelden kannst du dich direkt bei der jeweiligen {providerShort}.",
    ctaChat: "KI-Kursberatung starten",
    programmesH2: "Programmbereiche",
    formatsH2: "Kursformate",
    district: "Bezirk",
    districtPlural: "Bezirke",
    districtsH2: "{districtPlural} in {city}",
  },
  bereich: {
    metaTitle: "{bereich}: {n} VHS-Kurse in {city}",
    metaDescription:
      "Alle {n} Kurse im Programmbereich {bereich} von {provider} – mit Terminen, Preisen und direktem Link zur Anmeldung.",
    breadcrumbCity: "VHS {city}",
    h1: "{bereich}: VHS-Kurse in {city}",
    intro:
      "{n} Kurse im aktuellen Semester von {provider}{more}. Für eine gezielte Empfehlung nutze die KI-Kursberatung.",
    introMore: " – die {pageSize} nächststartenden zuerst",
    chatLinkText: "KI-Kursberatung",
    otherProgrammesH2: "Weitere Programmbereiche",
  },
  course: {
    titleSuffix: "VHS {region}",
    metaFallback: "{title} – VHS-Kurs in {city}.",
    dtTermine: "Termine",
    dtEntgelt: "Entgelt",
    dtOrt: "Ort",
    dtStatus: "Status",
    statusAvailable: "laut letztem Katalogstand buchbar",
    statusFull: "laut letztem Katalogstand ausgebucht",
    statusUnknown: "Verfügbarkeit bitte bei der VHS prüfen",
    termineFallback: "siehe Kursseite der VHS",
    online: "Online",
    descriptionH2: "Kursbeschreibung",
    allDatesH2: "Alle Termine",
    bookCta: "Zur Anmeldung bei der VHS {region}",
    disclaimer:
      "Angaben ohne Gewähr, Stand des Katalog-Imports. Verbindliche Informationen und die Anmeldung findest du auf der verlinkten Kursseite der {provider}.",
  },
  courseList: {
    empty: "Für diese Auswahl sind derzeit keine Kurse im Katalog.",
  },
  formats: {
    praesenz: "Präsenzkurs",
    online: "Online-Kurs",
    blended: "Blended Learning",
    selbstlern: "Selbstlernangebot",
  },
  // DVV-Programmbereiche: im Deutschen die Originalbezeichnung (Fallback).
  bereichNames: {} as Record<string, string>,
};

export type Messages = typeof de;
