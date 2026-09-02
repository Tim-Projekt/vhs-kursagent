"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LOCALES, type Locale, LOCALE_COOKIE } from "@/lib/i18n/config";

/** Wechselt das erste Pfadsegment (de/en) und merkt die Wahl im Cookie. */
export function LocaleSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname() || `/${current}`;

  function hrefFor(target: Locale): string {
    const parts = pathname.split("/");
    // parts[0] === "" , parts[1] === locale
    if (LOCALES.includes(parts[1] as Locale)) {
      parts[1] = target;
    } else {
      parts.splice(1, 0, target);
    }
    return parts.join("/") || `/${target}`;
  }

  return (
    <nav aria-label="Sprache" className="flex gap-1 text-sm">
      {LOCALES.map((l) => (
        <Link
          aria-current={l === current ? "true" : undefined}
          className={
            l === current
              ? "rounded px-1.5 py-0.5 font-semibold"
              : "rounded px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
          }
          href={hrefFor(l)}
          hrefLang={l}
          key={l}
          onClick={() => {
            document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
          }}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
