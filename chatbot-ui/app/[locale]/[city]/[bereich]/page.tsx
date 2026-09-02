import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCity, isKnownCity } from "@/lib/cities";
import { cityStats, countCourses, listCourses } from "@/lib/db/courses";
import { bereichLabel, getMessages, hreflang, t } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { bereichSlug, SLUG_TO_BEREICH } from "@/lib/seo";
import { CourseList } from "../_components/course-list";

const PAGE_SIZE = 60;

type Props = { params: Promise<{ locale: string; city: string; bereich: string }> };

function resolve(locale: string, slug: string, bereichParam: string) {
  const bereich = SLUG_TO_BEREICH[bereichParam];
  if (!(isLocale(locale) && isKnownCity(slug) && bereich)) {
    return null;
  }
  return { locale: locale as Locale, city: getCity(slug), bereich };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { locale, city: slug, bereich: bParam } = await params;
  const r = resolve(locale, slug, bParam);
  if (!r) {
    return {};
  }
  const m = getMessages(r.locale);
  const n = await countCourses({ city: r.city.slug, bereich: r.bereich });
  const vars = {
    bereich: bereichLabel(r.locale, r.bereich),
    n: n.toLocaleString(r.locale),
    city: r.city.name,
    provider: r.city.displayName,
  };
  const title = t(m.bereich.metaTitle, vars);
  return {
    title,
    description: t(m.bereich.metaDescription, vars),
    alternates: hreflang(
      r.locale,
      `/${r.city.slug}/${bereichSlug(r.bereich)}`
    ),
    openGraph: { title, type: "website" },
  };
}

export default async function BereichPage({ params }: Props) {
  "use cache";
  const { locale, city: slug, bereich: bParam } = await params;
  const r = resolve(locale, slug, bParam);
  if (!r) {
    notFound();
  }
  const { locale: loc, city, bereich } = r;
  const m = getMessages(loc);

  const [courses, total, stats] = await Promise.all([
    listCourses({ city: city.slug, bereich }, { limit: PAGE_SIZE }),
    countCourses({ city: city.slug, bereich }),
    cityStats(city.slug),
  ]);
  const label = bereichLabel(loc, bereich);

  return (
    <div className="space-y-8">
      <nav className="text-muted-foreground text-sm">
        <Link className="hover:underline" href={`/${loc}/${city.slug}`}>
          {t(m.bereich.breadcrumbCity, { city: city.name })}
        </Link>{" "}
        / {label}
      </nav>

      <header>
        <h1 className="font-semibold text-2xl tracking-tight">
          {t(m.bereich.h1, { bereich: label, city: city.name })}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t(m.bereich.intro, {
            n: total.toLocaleString(loc),
            provider: city.displayName,
            more:
              total > PAGE_SIZE
                ? t(m.bereich.introMore, { pageSize: PAGE_SIZE })
                : "",
          })}{" "}
          <Link className="underline" href="/">
            {m.bereich.chatLinkText}
          </Link>
          .
        </p>
      </header>

      <CourseList city={city.slug} courses={courses} locale={loc} />

      <section className="border-t pt-6">
        <h2 className="font-semibold text-lg">{m.bereich.otherProgrammesH2}</h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {stats.byBereich
            .filter((b) => b.value !== bereich)
            .map((b) => (
              <li key={b.value}>
                <Link
                  className="rounded-md border px-3 py-1.5 hover:bg-muted"
                  href={`/${loc}/${city.slug}/${bereichSlug(b.value)}`}
                >
                  {bereichLabel(loc, b.value)} ({b.count})
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
