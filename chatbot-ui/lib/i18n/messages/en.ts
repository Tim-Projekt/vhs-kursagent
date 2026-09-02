import type { Messages } from "./de";

export const en: Messages = {
  header: {
    ctaChat: "Start AI advisor",
  },
  footer: {
    dataLine:
      "Course data: {source} · Provided by {attribution} · Licence {license}. Not an official service of the Volkshochschulen. Registration and binding information via the respective {provider}.",
    imprint: "Legal notice",
    privacy: "Privacy",
  },
  landing: {
    metaTitle: "Find adult-education (VHS) courses in {city} – with AI advice",
    metaDescription:
      "Find the right course from around {n} current courses at the adult-education centres (Volkshochschulen) in {city}: languages, health, career, IT, culture, educational leave. Semantic search and AI advice, straight to registration.",
    h1: "Find VHS courses in {city}",
    intro:
      "Search around {n} current courses at the Volkshochschulen in {city} by topic, level, format and {district}. The AI advisor helps you choose; you register directly with the relevant local VHS.",
    ctaChat: "Start the AI course advisor",
    programmesH2: "Subject areas",
    formatsH2: "Course formats",
    district: "district",
    districtPlural: "districts",
    districtsH2: "{districtPlural} in {city}",
  },
  bereich: {
    metaTitle: "{bereich}: {n} VHS courses in {city}",
    metaDescription:
      "All {n} courses in the subject area {bereich} at {provider} – with dates, prices and a direct link to register.",
    breadcrumbCity: "VHS {city}",
    h1: "{bereich}: VHS courses in {city}",
    intro:
      "{n} courses this term from {provider}{more}. For a targeted recommendation, use the AI course advisor.",
    introMore: " – the {pageSize} starting soonest first",
    chatLinkText: "AI course advisor",
    otherProgrammesH2: "Other subject areas",
  },
  course: {
    titleSuffix: "VHS {region}",
    metaFallback: "{title} – VHS course in {city}.",
    dtTermine: "Dates",
    dtEntgelt: "Fee",
    dtOrt: "Location",
    dtStatus: "Status",
    statusAvailable: "bookable as of the latest catalogue data",
    statusFull: "fully booked as of the latest catalogue data",
    statusUnknown: "please check availability with the VHS",
    termineFallback: "see the VHS course page",
    online: "Online",
    descriptionH2: "Course description",
    allDatesH2: "All dates",
    bookCta: "Register with VHS {region}",
    disclaimer:
      "Information without guarantee, as of the catalogue import. Binding information and registration are on the linked course page of the {provider}.",
  },
  courseList: {
    empty: "There are currently no courses in the catalogue for this selection.",
  },
  formats: {
    praesenz: "In-person course",
    online: "Online course",
    blended: "Blended learning",
    selbstlern: "Self-study",
  },
  bereichNames: {
    "Politik – Gesellschaft – Umwelt": "Society, Politics & Environment",
    "Kultur – Gestalten": "Culture & Creativity",
    Gesundheit: "Health",
    Sprachen: "Languages",
    "Arbeit – Beruf": "Work & Career",
    "Grundbildung – Schulabschlüsse": "Basic education & school qualifications",
    "Grundbildung – Alphabetisierung (regionale Erweiterung, z.B. Berlin)":
      "Basic education & literacy",
    "Übergreifend / nicht zugeordnet": "Cross-cutting / unassigned",
  },
};
