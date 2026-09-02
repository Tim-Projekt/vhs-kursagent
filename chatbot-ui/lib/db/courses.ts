import "server-only";

import { and, asc, count, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { type VhsCourse, vhsCourse } from "./schema";

const POSTGRES_URL =
  process.env.POSTGRES_URL ||
  process.env.VERCEL_POSTGRES_URL ||
  process.env.DATABASE_URL ||
  "";

const client = postgres(POSTGRES_URL, {
  prepare: false,
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(client);

export type CourseListItem = Pick<
  VhsCourse,
  | "uid"
  | "guid"
  | "courseNumber"
  | "title"
  | "subtitle"
  | "dvvBereich"
  | "dvvLabel"
  | "eventType"
  | "level"
  | "courseFormat"
  | "online"
  | "region"
  | "startDate"
  | "endDate"
  | "weekdays"
  | "timeStart"
  | "timeEnd"
  | "sessionCount"
  | "priceAmount"
  | "priceReduced"
  | "priceFree"
  | "status"
  | "bookingUrl"
  | "venueName"
  | "postalCode"
>;

const LIST_COLUMNS = {
  uid: vhsCourse.uid,
  guid: vhsCourse.guid,
  courseNumber: vhsCourse.courseNumber,
  title: vhsCourse.title,
  subtitle: vhsCourse.subtitle,
  dvvBereich: vhsCourse.dvvBereich,
  dvvLabel: vhsCourse.dvvLabel,
  eventType: vhsCourse.eventType,
  level: vhsCourse.level,
  courseFormat: vhsCourse.courseFormat,
  online: vhsCourse.online,
  region: vhsCourse.region,
  startDate: vhsCourse.startDate,
  endDate: vhsCourse.endDate,
  weekdays: vhsCourse.weekdays,
  timeStart: vhsCourse.timeStart,
  timeEnd: vhsCourse.timeEnd,
  sessionCount: vhsCourse.sessionCount,
  priceAmount: vhsCourse.priceAmount,
  priceReduced: vhsCourse.priceReduced,
  priceFree: vhsCourse.priceFree,
  status: vhsCourse.status,
  bookingUrl: vhsCourse.bookingUrl,
  venueName: vhsCourse.venueName,
  postalCode: vhsCourse.postalCode,
} as const;

export type CourseFilter = {
  city: string;
  bereich?: string;
  region?: string;
  format?: string;
  online?: boolean;
};

function whereFor(f: CourseFilter) {
  const parts = [eq(vhsCourse.city, f.city)];
  if (f.bereich) {
    parts.push(eq(vhsCourse.dvvBereich, f.bereich));
  }
  if (f.region) {
    parts.push(eq(vhsCourse.region, f.region));
  }
  if (f.format) {
    parts.push(eq(vhsCourse.courseFormat, f.format));
  }
  if (typeof f.online === "boolean") {
    parts.push(eq(vhsCourse.online, f.online));
  }
  return and(...parts);
}

export async function listCourses(
  f: CourseFilter,
  opts: { limit?: number; offset?: number } = {}
): Promise<CourseListItem[]> {
  return db
    .select(LIST_COLUMNS)
    .from(vhsCourse)
    .where(whereFor(f))
    .orderBy(asc(vhsCourse.startDate), asc(vhsCourse.title))
    .limit(opts.limit ?? 60)
    .offset(opts.offset ?? 0);
}

export async function countCourses(f: CourseFilter): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(vhsCourse)
    .where(whereFor(f));
  return row?.n ?? 0;
}

export async function getCourse(
  city: string,
  guid: string
): Promise<VhsCourse | null> {
  const [row] = await db
    .select()
    .from(vhsCourse)
    .where(and(eq(vhsCourse.city, city), eq(vhsCourse.guid, guid)))
    .limit(1);
  return row ?? null;
}

export type Facet = { value: string; count: number };

/** Programmbereiche (DVV top level) einer Stadt, mit Kurszahl, häufigste zuerst. */
export async function listBereiche(city: string): Promise<Facet[]> {
  const rows = await db
    .select({ value: vhsCourse.dvvBereich, n: count() })
    .from(vhsCourse)
    .where(eq(vhsCourse.city, city))
    .groupBy(vhsCourse.dvvBereich)
    .orderBy(sql`count(*) desc`);
  return rows
    .filter((r): r is { value: string; n: number } => Boolean(r.value))
    .map((r) => ({ value: r.value, count: r.n }));
}

/** Bezirke/Orte einer Stadt, mit Kurszahl. */
export async function listRegions(city: string): Promise<Facet[]> {
  const rows = await db
    .select({ value: vhsCourse.region, n: count() })
    .from(vhsCourse)
    .where(eq(vhsCourse.city, city))
    .groupBy(vhsCourse.region)
    .orderBy(sql`count(*) desc`);
  return rows
    .filter((r): r is { value: string; n: number } => Boolean(r.value))
    .map((r) => ({ value: r.value, count: r.n }));
}

export async function cityStats(city: string): Promise<{
  total: number;
  byBereich: Facet[];
  byFormat: Facet[];
}> {
  const [total, byBereich, byFormatRows] = await Promise.all([
    countCourses({ city }),
    listBereiche(city),
    db
      .select({ value: vhsCourse.courseFormat, n: count() })
      .from(vhsCourse)
      .where(eq(vhsCourse.city, city))
      .groupBy(vhsCourse.courseFormat)
      .orderBy(sql`count(*) desc`),
  ]);
  return {
    total,
    byBereich,
    byFormat: byFormatRows.map((r) => ({ value: r.value, count: r.n })),
  };
}

/** Alle Kurse einer Stadt als (guid, title, updatedAt) — für die Sitemap. */
export async function listCourseSlugsData(
  city: string
): Promise<{ guid: string; title: string; updatedAt: Date }[]> {
  return db
    .select({
      guid: vhsCourse.guid,
      title: vhsCourse.title,
      updatedAt: vhsCourse.updatedAt,
    })
    .from(vhsCourse)
    .where(eq(vhsCourse.city, city));
}
