import Link from "next/link";
import type { CourseListItem } from "@/lib/db/courses";
import {
  courseSlug,
  FORMAT_LABEL,
  formatPrice,
  formatSchedule,
} from "@/lib/seo";

export function CourseList({
  city,
  courses,
}: {
  city: string;
  courses: CourseListItem[];
}) {
  if (courses.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Für diese Auswahl sind derzeit keine Kurse im Katalog.
      </p>
    );
  }
  return (
    <ul className="divide-y">
      {courses.map((c) => (
        <li className="py-4" key={c.uid}>
          <h3 className="font-medium">
            <Link
              className="hover:underline"
              href={`/${city}/kurs/${courseSlug(c.title, c.guid)}`}
            >
              {c.title}
            </Link>
          </h3>
          <p className="mt-1 text-muted-foreground text-sm">
            {[
              `VHS ${c.region ?? ""}`.trim(),
              FORMAT_LABEL[c.courseFormat] ?? c.courseFormat,
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
