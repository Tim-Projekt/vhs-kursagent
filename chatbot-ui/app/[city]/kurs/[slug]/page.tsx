import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCity, isKnownCity } from "@/lib/cities";
import { getCourse } from "@/lib/db/courses";
import {
  bereichSlug,
  courseSlug,
  FORMAT_LABEL,
  formatDate,
  formatPrice,
  formatSchedule,
  guidFromCourseSlug,
} from "@/lib/seo";



type Props = { params: Promise<{ city: string; slug: string }> };

async function load(slug: string, courseSlugParam: string) {
  if (!isKnownCity(slug)) {
    return null;
  }
  const city = getCity(slug);
  const guid = guidFromCourseSlug(courseSlugParam);
  const course = await getCourse(city.slug, guid);
  if (!course) {
    return null;
  }
  return { city, course };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { city: slug, slug: cslug } = await params;
  const r = await load(slug, cslug);
  if (!r) {
    return {};
  }
  const { city, course } = r;
  const desc =
    (course.description ?? "").replace(/\s+/g, " ").slice(0, 155).trim() ||
    `${course.title} – VHS-Kurs in ${city.name}.`;
  const canonical = `/${city.slug}/kurs/${courseSlug(course.title, course.guid)}`;
  return {
    title: `${course.title} – VHS ${course.region ?? city.name}`,
    description: desc,
    alternates: { canonical },
    openGraph: { title: course.title, description: desc, url: canonical },
  };
}

export default async function CoursePage({ params }: Props) {
  "use cache";
  const { city: slug, slug: cslug } = await params;
  const r = await load(slug, cslug);
  if (!r) {
    notFound();
  }
  const { city, course } = r;
  const data = course.data as Record<string, any>;
  const sessions: { date?: string; start?: string; end?: string }[] =
    Array.isArray(data.sessions) ? data.sessions : [];
  const venue = (data.venue ?? {}) as Record<string, any>;
  const bereich = course.dvvBereich;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: (course.description ?? "").slice(0, 500),
    inLanguage: "de",
    provider: {
      "@type": "Organization",
      name: `Volkshochschule ${course.region ?? city.name}`,
    },
    ...(course.courseNumber ? { courseCode: course.courseNumber } : {}),
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: course.online ? "online" : "onsite",
      ...(course.startDate ? { startDate: course.startDate } : {}),
      ...(course.endDate ? { endDate: course.endDate } : {}),
      ...(venue.name && !course.online
        ? {
            location: {
              "@type": "Place",
              name: venue.name,
              address: [venue.street, venue.zip, venue.city]
                .filter(Boolean)
                .join(", "),
            },
          }
        : {}),
    },
    ...(typeof course.priceAmount === "number"
      ? {
          offers: {
            "@type": "Offer",
            price: course.priceAmount,
            priceCurrency: "EUR",
            ...(course.bookingUrl ? { url: course.bookingUrl } : {}),
          },
        }
      : {}),
  };

  return (
    <article className="space-y-6">
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD */}
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />

      <nav className="text-muted-foreground text-sm">
        <Link className="hover:underline" href={`/${city.slug}`}>
          VHS {city.name}
        </Link>
        {bereich ? (
          <>
            {" / "}
            <Link
              className="hover:underline"
              href={`/${city.slug}/${bereichSlug(bereich)}`}
            >
              {bereich}
            </Link>
          </>
        ) : null}
      </nav>

      <header>
        <h1 className="font-semibold text-2xl tracking-tight">{course.title}</h1>
        {course.subtitle ? (
          <p className="mt-1 text-lg text-muted-foreground">{course.subtitle}</p>
        ) : null}
        <p className="mt-2 text-muted-foreground text-sm">
          {[
            `VHS ${course.region ?? city.name}`,
            FORMAT_LABEL[course.courseFormat] ?? course.courseFormat,
            course.level ? `Niveau ${course.level}` : null,
            course.eventType,
            course.courseNumber ? `Kursnr. ${course.courseNumber}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
        <dt className="text-muted-foreground">Termine</dt>
        <dd>{formatSchedule(course) || "siehe Kursseite der VHS"}</dd>
        <dt className="text-muted-foreground">Entgelt</dt>
        <dd>
          {formatPrice(course.priceAmount, course.priceReduced, course.priceFree)}
        </dd>
        <dt className="text-muted-foreground">Ort</dt>
        <dd>
          {course.online
            ? `Online${venue.room ? ` (${venue.room})` : ""}`
            : [venue.name, venue.street, venue.zip && `${venue.zip} ${venue.city ?? ""}`]
                .filter(Boolean)
                .join(", ") || `VHS ${course.region ?? city.name}`}
        </dd>
        <dt className="text-muted-foreground">Status</dt>
        <dd>
          {course.status === "available"
            ? "laut letztem Katalogstand buchbar"
            : course.status === "full"
              ? "laut letztem Katalogstand ausgebucht"
              : "Verfügbarkeit bitte bei der VHS prüfen"}
        </dd>
      </dl>

      {course.description ? (
        <section>
          <h2 className="font-semibold text-lg">Kursbeschreibung</h2>
          <div className="mt-2 whitespace-pre-line text-sm leading-relaxed">
            {course.description}
          </div>
        </section>
      ) : null}

      {sessions.length > 1 ? (
        <section>
          <h2 className="font-semibold text-lg">Alle Termine</h2>
          <ul className="mt-2 columns-2 text-sm">
            {sessions.map((s, i) => (
              <li key={`${s.date}-${i}`}>
                {formatDate(s.date)}
                {s.start ? `, ${s.start}${s.end ? `–${s.end}` : ""}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {course.bookingUrl ? (
        <p>
          <a
            className="inline-block rounded-md bg-foreground px-4 py-2 font-medium text-background text-sm"
            href={course.bookingUrl}
            rel="nofollow noopener"
            target="_blank"
          >
            Zur Anmeldung bei der VHS {course.region ?? city.name}
          </a>
        </p>
      ) : null}

      <p className="border-t pt-4 text-muted-foreground text-xs">
        Angaben ohne Gewähr, Stand des Katalog-Imports. Verbindliche Informationen
        und die Anmeldung findest du auf der verlinkten Kursseite der{" "}
        {city.providerLabel}.
      </p>
    </article>
  );
}
