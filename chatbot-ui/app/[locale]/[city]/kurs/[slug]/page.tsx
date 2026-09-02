import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCity, isKnownCity } from "@/lib/cities";
import { getCourse } from "@/lib/db/courses";
import { bereichLabel, formatLabel, getMessages, hreflang, t } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import {
  bereichSlug,
  courseSlug,
  formatDate,
  formatPrice,
  formatSchedule,
  guidFromCourseSlug,
} from "@/lib/seo";

type Props = { params: Promise<{ locale: string; city: string; slug: string }> };

async function load(locale: string, slug: string, courseSlugParam: string) {
  if (!(isLocale(locale) && isKnownCity(slug))) {
    return null;
  }
  const city = getCity(slug);
  const course = await getCourse(city.slug, guidFromCourseSlug(courseSlugParam));
  if (!course) {
    return null;
  }
  return { locale: locale as Locale, city, course };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { locale, city: slug, slug: cslug } = await params;
  const r = await load(locale, slug, cslug);
  if (!r) {
    return {};
  }
  const { locale: loc, city, course } = r;
  const m = getMessages(loc);
  const desc =
    (course.description ?? "").replace(/\s+/g, " ").slice(0, 155).trim() ||
    t(m.course.metaFallback, { title: course.title, city: city.name });
  const title = `${course.title} – ${t(m.course.titleSuffix, {
    region: course.region ?? city.name,
  })}`;
  return {
    title,
    description: desc,
    alternates: hreflang(
      loc,
      `/${city.slug}/kurs/${courseSlug(course.title, course.guid)}`
    ),
    openGraph: { title: course.title, description: desc, type: "website" },
  };
}

export default async function CoursePage({ params }: Props) {
  "use cache";
  const { locale, city: slug, slug: cslug } = await params;
  const r = await load(locale, slug, cslug);
  if (!r) {
    notFound();
  }
  const { locale: loc, city, course } = r;
  const m = getMessages(loc);
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

  const statusText =
    course.status === "available"
      ? m.course.statusAvailable
      : course.status === "full"
        ? m.course.statusFull
        : m.course.statusUnknown;

  return (
    <article className="space-y-6">
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD */}
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />

      <nav className="text-muted-foreground text-sm">
        <Link className="hover:underline" href={`/${loc}/${city.slug}`}>
          {t(m.bereich.breadcrumbCity, { city: city.name })}
        </Link>
        {bereich ? (
          <>
            {" / "}
            <Link
              className="hover:underline"
              href={`/${loc}/${city.slug}/${bereichSlug(bereich)}`}
            >
              {bereichLabel(loc, bereich)}
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
            formatLabel(loc, course.courseFormat),
            course.level ? `Niveau ${course.level}` : null,
            course.eventType,
            course.courseNumber ? `Kursnr. ${course.courseNumber}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
        <dt className="text-muted-foreground">{m.course.dtTermine}</dt>
        <dd>{formatSchedule(course) || m.course.termineFallback}</dd>
        <dt className="text-muted-foreground">{m.course.dtEntgelt}</dt>
        <dd>
          {formatPrice(course.priceAmount, course.priceReduced, course.priceFree)}
        </dd>
        <dt className="text-muted-foreground">{m.course.dtOrt}</dt>
        <dd>
          {course.online
            ? `${m.course.online}${venue.room ? ` (${venue.room})` : ""}`
            : [
                venue.name,
                venue.street,
                venue.zip && `${venue.zip} ${venue.city ?? ""}`,
              ]
                .filter(Boolean)
                .join(", ") || `VHS ${course.region ?? city.name}`}
        </dd>
        <dt className="text-muted-foreground">{m.course.dtStatus}</dt>
        <dd>{statusText}</dd>
      </dl>

      {course.description ? (
        <section>
          <h2 className="font-semibold text-lg">{m.course.descriptionH2}</h2>
          <div className="mt-2 whitespace-pre-line text-sm leading-relaxed">
            {course.description}
          </div>
        </section>
      ) : null}

      {sessions.length > 1 ? (
        <section>
          <h2 className="font-semibold text-lg">{m.course.allDatesH2}</h2>
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
            {t(m.course.bookCta, { region: course.region ?? city.name })}
          </a>
        </p>
      ) : null}

      <p className="border-t pt-4 text-muted-foreground text-xs">
        {t(m.course.disclaimer, { provider: city.providerLabel })}
      </p>
    </article>
  );
}
