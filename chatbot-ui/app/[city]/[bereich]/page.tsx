import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCity, isKnownCity } from "@/lib/cities";
import {
  cityStats,
  countCourses,
  listCourses,
} from "@/lib/db/courses";
import { bereichSlug, SLUG_TO_BEREICH } from "@/lib/seo";
import { CourseList } from "../_components/course-list";



const PAGE_SIZE = 60;

type Props = { params: Promise<{ city: string; bereich: string }> };

function resolve(slug: string, bereichParam: string) {
  if (!isKnownCity(slug)) {
    return null;
  }
  const bereich = SLUG_TO_BEREICH[bereichParam];
  if (!bereich) {
    return null;
  }
  return { city: getCity(slug), bereich };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { city: slug, bereich: bParam } = await params;
  const r = resolve(slug, bParam);
  if (!r) {
    return {};
  }
  const n = await countCourses({ city: r.city.slug, bereich: r.bereich });
  const title = `${r.bereich}: ${n} VHS-Kurse in ${r.city.name}`;
  return {
    title,
    description: `Alle ${n} Kurse im Programmbereich ${r.bereich} von ${r.city.displayName} – mit Terminen, Preisen und direktem Link zur Anmeldung.`,
    alternates: { canonical: `/${r.city.slug}/${bereichSlug(r.bereich)}` },
    openGraph: { title, url: `/${r.city.slug}/${bereichSlug(r.bereich)}` },
  };
}

export default async function BereichPage({ params }: Props) {
  "use cache";
  const { city: slug, bereich: bParam } = await params;
  const r = resolve(slug, bParam);
  if (!r) {
    notFound();
  }
  const { city, bereich } = r;

  const [courses, total, stats] = await Promise.all([
    listCourses({ city: city.slug, bereich }, { limit: PAGE_SIZE }),
    countCourses({ city: city.slug, bereich }),
    cityStats(city.slug),
  ]);

  return (
    <div className="space-y-8">
      <nav className="text-muted-foreground text-sm">
        <Link className="hover:underline" href={`/${city.slug}`}>
          VHS {city.name}
        </Link>{" "}
        / {bereich}
      </nav>

      <header>
        <h1 className="font-semibold text-2xl tracking-tight">
          {bereich}: VHS-Kurse in {city.name}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {total.toLocaleString("de-DE")} Kurse im aktuellen Semester von{" "}
          {city.displayName}
          {total > PAGE_SIZE
            ? ` – die ${PAGE_SIZE} nächststartenden zuerst`
            : ""}
          . Für eine gezielte Empfehlung nutze die{" "}
          <Link className="underline" href="/">
            KI-Kursberatung
          </Link>
          .
        </p>
      </header>

      <CourseList city={city.slug} courses={courses} />

      <section className="border-t pt-6">
        <h2 className="font-semibold text-lg">Weitere Programmbereiche</h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {stats.byBereich
            .filter((b) => b.value !== bereich)
            .map((b) => (
              <li key={b.value}>
                <Link
                  className="rounded-md border px-3 py-1.5 hover:bg-muted"
                  href={`/${city.slug}/${bereichSlug(b.value)}`}
                >
                  {b.value} ({b.count})
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
