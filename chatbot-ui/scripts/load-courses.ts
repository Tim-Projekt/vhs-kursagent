/**
 * Lädt vhs_pipeline/data/processed/<city>.jsonl in die Tabelle VhsCourse.
 *
 *   pnpm db:load-courses            # default: berlin
 *   pnpm db:load-courses berlin
 *
 * Voll-Reload pro Stadt in einer Transaktion: alte Zeilen der Stadt löschen,
 * dann alle aktuellen Kurse einfügen. (Kein Cron in dieser Phase — manueller Lauf.)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { vhsCourse } from "../lib/db/schema";

config({ path: ".env.local" });

const CITY = process.argv[2] ?? "berlin";
const JSONL = join(
  process.cwd(),
  "..",
  "vhs_pipeline",
  "data",
  "processed",
  `${CITY}.jsonl`
);
const CHUNK = 500;

type Canon = Record<string, any>;

function toRow(c: Canon) {
  const venue = c.venue ?? {};
  const price = c.price ?? {};
  return {
    uid: c.uid as string,
    city: CITY,
    sourceId: c.source_id ?? CITY,
    guid: String(c.guid),
    namespace: c.namespace as string,
    courseNumber: c.course_number ?? null,
    title: c.title ?? "",
    subtitle: c.subtitle ?? null,
    description: c.description ?? null,
    dvvCode: c.dvv_code ?? null,
    dvvBereich: c.dvv_bereich ?? null,
    dvvLabel: c.dvv_label ?? null,
    eventType: c.event_type ?? null,
    level: c.level ?? null,
    courseFormat: c.course_format ?? "praesenz",
    online: Boolean(venue.online),
    keywords: Array.isArray(c.keywords) ? c.keywords : [],
    startDate: c.start_date ?? null,
    endDate: c.end_date ?? null,
    sessionCount: typeof c.session_count === "number" ? c.session_count : null,
    weekdays: Array.isArray(c.weekdays) ? c.weekdays : [],
    timeStart: c.time_start ?? null,
    timeEnd: c.time_end ?? null,
    region: c.region ?? null,
    postalCode: c.postal_code ?? null,
    venueName: venue.name ?? null,
    lat: typeof venue.lat === "number" ? venue.lat : null,
    lon: typeof venue.lon === "number" ? venue.lon : null,
    priceAmount: typeof price.amount === "number" ? price.amount : null,
    priceReduced: typeof price.reduced === "number" ? price.reduced : null,
    priceFree: Boolean(price.free),
    status: c.status ?? "unknown",
    bookingUrl: c.booking_url ?? null,
    semester: c.semester ?? null,
    contentHash: c.content_hash as string,
    data: c,
    sourceUpdatedAt: c.source_updated_at ?? null,
    updatedAt: new Date(),
  };
}

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("POSTGRES_URL missing");
  }

  const raw = readFileSync(JSONL, "utf8").trim();
  const rows = raw
    .split("\n")
    .filter(Boolean)
    .map((l) => toRow(JSON.parse(l) as Canon));

  // uid ist global eindeutig; doppelte im File wären ein Pipeline-Bug
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.uid)) {
      throw new Error(`duplicate uid in ${CITY}.jsonl: ${r.uid}`);
    }
    seen.add(r.uid);
  }
  console.log(`[load-courses] city=${CITY}  rows=${rows.length}  file=${JSONL}`);

  const sql = postgres(url, { prepare: false, ssl: { rejectUnauthorized: false } });
  const db = drizzle(sql);

  await db.transaction(async (tx) => {
    const del = await tx
      .delete(vhsCourse)
      .where(eq(vhsCourse.city, CITY))
      .returning({ uid: vhsCourse.uid });
    console.log(`[load-courses] cleared ${del.length} existing row(s) for ${CITY}`);

    for (let i = 0; i < rows.length; i += CHUNK) {
      await tx.insert(vhsCourse).values(rows.slice(i, i + CHUNK));
      process.stdout.write(
        `\r[load-courses] inserted ${Math.min(i + CHUNK, rows.length)}/${rows.length}`
      );
    }
    process.stdout.write("\n");
  });

  const [{ count }] =
    await sql`select count(*)::int as count from "VhsCourse" where city = ${CITY}`;
  console.log(`[load-courses] DONE — VhsCourse rows for ${CITY}: ${count}`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
