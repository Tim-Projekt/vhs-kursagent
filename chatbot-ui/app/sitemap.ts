import type { MetadataRoute } from "next";
import { listCities } from "@/lib/cities";
import { listBereiche, listCourseSlugsData } from "@/lib/db/courses";
import { LOCALES } from "@/lib/i18n/config";
import { bereichSlug, courseSlug } from "@/lib/seo";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function withLocales(pathAfterLocale: string) {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = `${BASE}/${l}${pathAfterLocale}`;
  }
  return { url: `${BASE}/de${pathAfterLocale}`, alternates: { languages } };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  const entries: MetadataRoute.Sitemap = [];

  for (const city of listCities()) {
    entries.push({
      ...withLocales(`/${city.slug}`),
      changeFrequency: "daily",
      priority: 0.9,
    });

    const [bereiche, courses] = await Promise.all([
      listBereiche(city.slug),
      listCourseSlugsData(city.slug),
    ]);

    for (const b of bereiche) {
      entries.push({
        ...withLocales(`/${city.slug}/${bereichSlug(b.value)}`),
        changeFrequency: "daily",
        priority: 0.7,
      });
    }

    for (const c of courses) {
      entries.push({
        ...withLocales(`/${city.slug}/kurs/${courseSlug(c.title, c.guid)}`),
        lastModified: c.updatedAt,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  }

  return entries;
}
