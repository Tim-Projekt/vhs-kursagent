export const LOCALES = ["de", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "de";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(x: string | null | undefined): x is Locale {
  return !!x && (LOCALES as readonly string[]).includes(x);
}

/** Grobe Sprachwahl aus Accept-Language (nur DE/EN unterstützt). */
export function pickLocale(acceptLanguage: string | null | undefined): Locale {
  for (const part of (acceptLanguage ?? "").toLowerCase().split(",")) {
    const tag = part.split(";")[0].trim().slice(0, 2);
    if (isLocale(tag)) {
      return tag;
    }
  }
  return DEFAULT_LOCALE;
}
