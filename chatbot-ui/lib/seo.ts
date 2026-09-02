/** Kleine SEO-/URL-Helfer für die öffentlichen Stadt-Seiten. */

const DE_MAP: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  ß: "ss",
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[äöüß]/g, (m) => DE_MAP[m] ?? m)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Kurs-URL-Slug: sprechend + guid als stabiler Anker am Ende. */
export function courseSlug(title: string, guid: string): string {
  const base = slugify(title).slice(0, 70).replace(/-$/, "");
  return `${base}-${guid}`;
}

/** guid aus dem Kurs-Slug zurückholen (letztes Segment). */
export function guidFromCourseSlug(slug: string): string {
  const parts = slug.split("-");
  return parts.at(-1) ?? slug;
}

/** DVV-Programmbereich <-> URL-Segment (stabil, kurz). */
export const BEREICH_SLUGS: Record<string, string> = {
  "Politik – Gesellschaft – Umwelt": "gesellschaft",
  "Kultur – Gestalten": "kultur",
  Gesundheit: "gesundheit",
  Sprachen: "sprachen",
  "Arbeit – Beruf": "beruf",
  "Grundbildung – Schulabschlüsse": "grundbildung",
  "Grundbildung – Alphabetisierung (regionale Erweiterung, z.B. Berlin)":
    "alphabetisierung",
  "Übergreifend / nicht zugeordnet": "weitere",
};

export const SLUG_TO_BEREICH: Record<string, string> = Object.fromEntries(
  Object.entries(BEREICH_SLUGS).map(([k, v]) => [v, k])
);

export function bereichSlug(bereich: string): string {
  return BEREICH_SLUGS[bereich] ?? slugify(bereich);
}

const DE_DATE = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDate(iso?: string | null): string {
  if (!iso) {
    return "";
  }
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : DE_DATE.format(d);
}

export function formatPrice(
  amount?: number | null,
  reduced?: number | null,
  free?: boolean
): string {
  if (free || amount === 0) {
    return "kostenlos";
  }
  if (typeof amount !== "number") {
    return "Preis auf Anfrage";
  }
  const base = `${amount.toFixed(2).replace(".", ",")} €`;
  return typeof reduced === "number"
    ? `${base} (ermäßigt ${reduced.toFixed(2).replace(".", ",")} €)`
    : base;
}

export function formatSchedule(c: {
  startDate?: string | null;
  weekdays?: string[] | null;
  timeStart?: string | null;
  timeEnd?: string | null;
  sessionCount?: number | null;
}): string {
  const bits: string[] = [];
  if (c.startDate) {
    bits.push(`ab ${formatDate(c.startDate)}`);
  }
  if (c.weekdays?.length) {
    bits.push(c.weekdays.join("/"));
  }
  if (c.timeStart) {
    bits.push(`${c.timeStart}${c.timeEnd ? `–${c.timeEnd}` : ""} Uhr`);
  }
  if (c.sessionCount) {
    bits.push(`${c.sessionCount} Termine`);
  }
  return bits.join(", ");
}

export const FORMAT_LABEL: Record<string, string> = {
  praesenz: "Präsenzkurs",
  online: "Online-Kurs",
  blended: "Blended Learning",
  selbstlern: "Selbstlernangebot",
};
