import { DEFAULT_LOCALE, LOCALES, type Locale } from "./config";
import { de, type Messages } from "./messages/de";
import { en } from "./messages/en";

export type { Locale } from "./config";
export type { Messages } from "./messages/de";

const DICT: Record<Locale, Messages> = { de, en };

export function getMessages(locale: Locale): Messages {
  return DICT[locale] ?? DICT[DEFAULT_LOCALE];
}

/** "{n} Kurse in {city}" + { n: 42, city: "Berlin" } → "42 Kurse in Berlin" */
export function t(
  template: string,
  vars: Record<string, string | number> = {}
): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`
  );
}

/** DVV-Programmbereich lokalisiert (Fallback: deutsche Originalbezeichnung). */
export function bereichLabel(locale: Locale, germanName: string): string {
  return getMessages(locale).bereichNames[germanName] ?? germanName;
}

export function formatLabel(locale: Locale, key: string): string {
  const f = getMessages(locale).formats as Record<string, string>;
  return f[key] ?? key;
}

/**
 * canonical + hreflang für eine Metadata. `pathAfterLocale` z. B. "/berlin"
 * oder "/berlin/sprachen" (ohne Locale-Präfix, mit führendem "/").
 */
export function hreflang(locale: Locale, pathAfterLocale: string) {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = `/${l}${pathAfterLocale}`;
  }
  languages["x-default"] = `/${DEFAULT_LOCALE}${pathAfterLocale}`;
  return { canonical: `/${locale}${pathAfterLocale}`, languages };
}
