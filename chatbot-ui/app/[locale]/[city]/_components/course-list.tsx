import Link from "next/link";
import { formatLabel, getMessages } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { CourseListItem } from "@/lib/db/courses";
import { courseSlug, formatPrice, formatSchedule } from "@/lib/seo";

export function CourseList({
  city,
  courses,
  locale,
}: {
  city: string;
  courses: CourseListItem[];
  locale: Locale;
}) {
  const m = getMessages(locale);
  if (courses.length === 0) {
    return <p className="text-muted-foreground text-sm">{m.courseList.empty}</p>;
  }
  return (
    <ul className="divide-y">
      {courses.map((c) => (
        <li className="py-4" key={c.uid}>
          <h3 className="font-medium">
            <Link
              className="hover:underline"
              href={`/${locale}/${city}/kurs/${courseSlug(c.title, c.guid)}`}
            >
              {c.title}
            </Link>
          </h3>
          <p className="mt-1 text-muted-foreground text-sm">
            {[
              `VHS ${c.region ?? ""}`.trim(),
              formatLabel(locale, c.courseFormat),
              c.level ? `Niveau ${c.level}` : null,
              formatSchedule(c),
              formatPrice(c.priceAmount, c.priceReduced, c.priceFree),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </li>
      ))}
    </ul>
  );
}
