import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCity, isKnownCity } from "@/lib/cities";
import { cityStats, listRegions } from "@/lib/db/courses";
import { bereichLabel, formatLabel, getMessages, hreflang, t } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { bereichSlug } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; city: string }> };

function resolve(locale: string, slug: string) {
  return isLocale(locale) && isKnownCity(slug)
    ? { locale: locale as Locale, city: getCity(slug) }
    : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { locale, city: slug } = await params;
  const r = resolve(locale, slug);
  if (!r) {
    return {};
  }
  const m = getMessages(r.locale);
  const { total } = await cityStats(r.city.slug);
  const vars = { city: r.city.name, n: total.toLocaleString(r.locale) };
  const title = t(m.landing.metaTitle, vars);
  const description = t(m.landing.metaDescription, vars);
  return {
    title,
    description,
    alternates: hreflang(r.locale, `/${r.city.slug}`),
    openGraph: { title, description, type: "website" },
  };
}

export default async function CityLandingPage({ params }: Props) {
  "use cache";
  const { locale, city: slug } = await params;
  const r = resolve(locale, slug);
  if (!r) {
    notFound();
  }
  const { locale: loc, city } = r;
  const m = getMessages(loc);
  const [stats, regions] = await Promise.all([
    cityStats(city.slug),
    listRegions(city.slug),
  ]);
  const vars = {
    city: city.name,
    n: stats.total.toLocaleString(loc),
    provider: city.displayName,
    providerShort: city.providerLabel,
    district: m.landing.district,
    districtPlural: m.landing.districtPlural,
  };

  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-semibold text-3xl tracking-tight">
          {t(m.landing.h1, vars)}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          {t(m.landing.intro, vars)}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
            href="/"
          >
            {m.landing.ctaChat}
          </Link>
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-xl">{m.landing.programmesH2}</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {stats.byBereich.map((b) => (
            <li key={b.value}>
              <Link
                className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted"
                href={`/${loc}/${city.slug}/${bereichSlug(b.value)}`}
              >
                <span>{bereichLabel(loc, b.value)}</span>
                <span className="text-muted-foreground text-sm">{b.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold text-xl">{m.landing.formatsH2}</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          {stats.byFormat
            .map((f) => `${formatLabel(loc, f.value)}: ${f.count}`)
            .join(" · ")}
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-xl">
          {t(m.landing.districtsH2, vars)}
        </h2>
        <p className="mt-2 text-muted-foreground text-sm">
          {regions.map((rg) => `${rg.value} (${rg.count})`).join(" · ")}
        </p>
      </section>
    </div>
  );
}
