import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCity, isKnownCity } from "@/lib/cities";
import { cityStats, listRegions } from "@/lib/db/courses";
import { bereichSlug, FORMAT_LABEL } from "@/lib/seo";



type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { city: slug } = await params;
  if (!isKnownCity(slug)) {
    return {};
  }
  const city = getCity(slug);
  return {
    title: city.seo.tagline,
    description: city.seo.metaDescription,
    alternates: { canonical: `/${city.slug}` },
    openGraph: {
      title: city.seo.tagline,
      description: city.seo.metaDescription,
      url: `/${city.slug}`,
      type: "website",
    },
  };
}

export default async function CityLandingPage({ params }: Props) {
  "use cache";
  const { city: slug } = await params;
  if (!isKnownCity(slug)) {
    notFound();
  }
  const city = getCity(slug);
  const [stats, regions] = await Promise.all([
    cityStats(city.slug),
    listRegions(city.slug),
  ]);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-semibold text-3xl tracking-tight">
          VHS-Kurse in {city.name} finden
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Durchsuche rund {stats.total.toLocaleString("de-DE")} aktuelle Kurse
          von {city.displayName} nach Thema, Niveau, Format und {city.districtLabel}.
          Die KI-Kursberatung hilft dir bei der Auswahl; anmelden kannst du dich
          direkt bei deiner {city.providerLabel}.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
            href="/"
          >
            KI-Kursberatung starten
          </Link>
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-xl">Programmbereiche</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {stats.byBereich.map((b) => (
            <li key={b.value}>
              <Link
                className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted"
                href={`/${city.slug}/${bereichSlug(b.value)}`}
              >
                <span>{b.value}</span>
                <span className="text-muted-foreground text-sm">{b.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold text-xl">Kursformate</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          {stats.byFormat
            .map(
              (f) => `${FORMAT_LABEL[f.value] ?? f.value}: ${f.count}`
            )
            .join(" · ")}
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-xl">
          {city.districtLabel}e in {city.name}
        </h2>
        <p className="mt-2 text-muted-foreground text-sm">
          {regions.map((r) => `${r.value} (${r.count})`).join(" · ")}
        </p>
      </section>
    </div>
  );
}
