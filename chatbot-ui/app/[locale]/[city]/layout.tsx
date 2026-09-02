import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getCity, isKnownCity } from "@/lib/cities";
import { getMessages, t } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n/config";
import { SITE_NAME } from "@/lib/site";
import { LocaleSwitcher } from "./_components/locale-switcher";

export default async function CityLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string; city: string }>;
}) {
  const { locale, city: slug } = await params;
  if (!(isLocale(locale) && isKnownCity(slug))) {
    notFound();
  }
  const city = getCity(slug);
  const m = getMessages(locale);

  return (
    <div
      className="mx-auto flex min-h-dvh max-w-4xl flex-col px-4 py-6"
      lang={locale}
    >
      <header className="flex items-center justify-between gap-4 border-b pb-4">
        <Link
          className="font-semibold text-lg tracking-tight"
          href={`/${locale}/${city.slug}`}
        >
          {SITE_NAME}{" "}
          <span className="text-muted-foreground">{city.name}</span>
        </Link>
        <div className="flex items-center gap-3">
          <LocaleSwitcher current={locale} />
          <Link
            className="rounded-md border px-3 py-1.5 font-medium text-sm hover:bg-muted"
            href="/"
          >
            {m.header.ctaChat}
          </Link>
        </div>
      </header>

      <main className="flex-1 py-8">{children}</main>

      <footer className="border-t pt-4 text-muted-foreground text-xs leading-relaxed">
        <p>
          {t(m.footer.dataLine, {
            source: city.data.sourceName,
            attribution: city.data.attribution,
            license: city.data.licenseLabel,
            provider: city.providerLabel,
          })}
        </p>
        <p className="mt-2 flex gap-3">
          <Link className="hover:underline" href="/impressum">
            {m.footer.imprint}
          </Link>
          <Link className="hover:underline" href="/datenschutz">
            {m.footer.privacy}
          </Link>
        </p>
      </footer>
    </div>
  );
}
