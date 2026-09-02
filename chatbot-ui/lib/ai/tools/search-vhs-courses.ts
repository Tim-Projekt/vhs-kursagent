import { tool } from "ai";
import { z } from "zod";

const PINECONE_HOST = process.env.PINECONE_INDEX_HOST!;
const NAMESPACE = process.env.PINECONE_NAMESPACE ?? "vhs/berlin";
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 512; // muss zur Index-Dimension passen (vhs-kurse: 512)

const DVV_BEREICHE = [
  "Politik – Gesellschaft – Umwelt",
  "Kultur – Gestalten",
  "Gesundheit",
  "Sprachen",
  "Arbeit – Beruf",
  "Grundbildung – Schulabschlüsse",
  "Grundbildung – Alphabetisierung (regionale Erweiterung, z.B. Berlin)",
  "Übergreifend / nicht zugeordnet",
] as const;

const FORMATS = ["praesenz", "online", "blended", "selbstlern"] as const;
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

type PineconeMatch = {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
};

async function getEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: text,
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data?.[0]?.embedding ?? null;
}

async function queryPinecone(
  host: string,
  apiKey: string,
  vector: number[],
  topK: number,
  filter?: Record<string, unknown>
): Promise<PineconeMatch[]> {
  const res = await fetch(`https://${host}/query`, {
    method: "POST",
    headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      namespace: NAMESPACE,
      topK,
      vector,
      includeMetadata: true,
      ...(filter ? { filter } : {}),
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data?.matches ?? [];
}

function fmtPrice(m: Record<string, unknown>): string {
  if (m.price_free) return "kostenlos";
  const a = typeof m.price_amount === "number" ? `${m.price_amount.toFixed(2)} €` : null;
  const r =
    typeof m.price_reduced === "number" ? ` (erm. ${m.price_reduced.toFixed(2)} €)` : "";
  return a ? a + r : "Preis n/a";
}

function fmtSchedule(m: Record<string, unknown>): string {
  const wd = Array.isArray(m.weekdays) ? (m.weekdays as string[]).join("/") : "";
  const t =
    m.time_start && m.time_end
      ? `${m.time_start}–${m.time_end}`
      : (m.time_start as string) ?? "";
  const start = m.start_date ? `ab ${m.start_date}` : "";
  const n = m.session_count ? `${m.session_count} Termine` : "";
  return [start, wd, t, n].filter(Boolean).join(", ");
}

function formatMatches(matches: PineconeMatch[]): string {
  return matches
    .map((match, i) => {
      const m = match.metadata ?? {};
      const score = match.score?.toFixed(3) ?? "?";
      const header =
        `[${i + 1}] ${(m.title as string) ?? "?"} — VHS ${(m.region as string) ?? "?"} · ` +
        `${(m.dvv_bereich as string) ?? "?"} · ${(m.course_format as string) ?? "?"}` +
        `${m.level ? ` · Niveau ${m.level}` : ""} · Kursnr. ${(m.course_number as string) ?? "?"} · score ${score}\n` +
        `    ${fmtSchedule(m)} · ${fmtPrice(m)} · Status: ${(m.status as string) ?? "unbekannt"}\n` +
        `    Buchung: ${(m.booking_url as string) ?? "?"}`;
      const text = (m.text as string) ?? "";
      return `${header}\n\n${text}`;
    })
    .join("\n\n---\n\n");
}

export const searchVhsCourses = tool({
  description: `Semantische Suche über den Kurskatalog der Berliner Volkshochschulen (~10.000 Kurse, aktuelles Semester, alle 12 Bezirks-VHS + Servicezentrum). PRIMÄRE Wissensquelle des Agenten.

Nutze dieses Tool für jede inhaltliche Kursfrage: Thema, Niveau, Format, Zielgruppe, Vergleich, "was gibt es zu …", Empfehlungen.

Suchstrategie:
- Deutsche, konkrete Queries ("Yoga für den Rücken am Wochenende", "Spanisch A2 online", "Bildungsurlaub Fotografie").
- Bei klaren Einschränkungen den \`filter\` setzen (Bezirk, Format, Preis, Zeitraum, Wochentag, DVV-Bereich) statt sie nur in die Query zu schreiben.
- Für breite/vergleichende Fragen mehrfach mit unterschiedlichen Formulierungen suchen und die Treffer synthetisieren.
- Jeden empfohlenen Kurs mit Titel, Kursnummer, VHS/Bezirk, Beginn+Rhythmus, Preis und \`booking_url\` ausgeben. Keine Kurse/Preise/Termine erfinden.
- \`status\`/Plätze stammen aus dem letzten Katalog-Snapshot (bis ~1 Woche alt) — für Verbindlichkeit auf den Buchungslink verweisen.`,

  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Semantische Suchanfrage auf Deutsch. Spezifisch: Thema + Kontext + ggf. Niveau/Format."
      ),
    filter: z
      .object({
        district: z
          .string()
          .optional()
          .describe(
            "Berliner Bezirk exakt, z.B. 'Mitte', 'Neukölln', 'Friedrichshain-Kreuzberg', 'Pankow', 'Charlottenburg-Wilmersdorf', 'Steglitz-Zehlendorf', 'Tempelhof-Schöneberg', 'Treptow-Köpenick', 'Marzahn-Hellersdorf', 'Lichtenberg', 'Reinickendorf', 'Spandau'."
          ),
        format: z.enum(FORMATS).optional().describe("Kursformat."),
        online: z.boolean().optional().describe("true = nur Online-/Selbstlernangebote."),
        dvv_bereich: z.enum(DVV_BEREICHE).optional().describe("DVV-Programmbereich."),
        free: z.boolean().optional().describe("true = nur kostenlose Kurse."),
        max_price: z.number().optional().describe("maximales Entgelt in EUR."),
        start_after: z
          .string()
          .optional()
          .describe("frühestes Startdatum, ISO YYYY-MM-DD."),
        start_before: z
          .string()
          .optional()
          .describe("spätestes Startdatum, ISO YYYY-MM-DD."),
        weekday: z
          .array(z.enum(WEEKDAYS))
          .optional()
          .describe("gewünschte Wochentage (Kurs findet an mind. einem davon statt)."),
      })
      .optional()
      .describe("Optionale harte Filter. Nur setzen, wenn die Frage sie klar hergibt."),
    topK: z.number().int().min(1).max(20).optional().describe("Anzahl Treffer (Default 8)."),
  }),

  execute: async ({ query, filter, topK }) => {
    const pineconeApiKey = process.env.PINECONE_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!pineconeApiKey || !PINECONE_HOST) {
      return { error: "Pinecone nicht konfiguriert (PINECONE_API_KEY / PINECONE_INDEX_HOST)" };
    }
    if (!openaiApiKey) return { error: "OpenAI nicht konfiguriert (OPENAI_API_KEY)" };

    const vector = await getEmbedding(query, openaiApiKey);
    if (!vector) return { error: "OpenAI-Embedding fehlgeschlagen" };

    const clauses: Record<string, unknown>[] = [];
    if (filter?.district) clauses.push({ region: { $eq: filter.district } });
    if (filter?.format) clauses.push({ course_format: { $eq: filter.format } });
    if (filter?.online !== undefined) clauses.push({ online: { $eq: filter.online } });
    if (filter?.dvv_bereich) clauses.push({ dvv_bereich: { $eq: filter.dvv_bereich } });
    if (filter?.free) clauses.push({ price_free: { $eq: true } });
    if (typeof filter?.max_price === "number")
      clauses.push({ price_amount: { $lte: filter.max_price } });
    if (filter?.start_after) clauses.push({ start_date: { $gte: filter.start_after } });
    if (filter?.start_before) clauses.push({ start_date: { $lte: filter.start_before } });
    if (filter?.weekday && filter.weekday.length > 0)
      clauses.push({ weekdays: { $in: filter.weekday } });

    const pineconeFilter =
      clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : { $and: clauses };

    let matches: PineconeMatch[];
    try {
      matches = await queryPinecone(
        PINECONE_HOST,
        pineconeApiKey,
        vector,
        topK ?? 8,
        pineconeFilter
      );
    } catch (err) {
      return {
        error: `Pinecone-Anfrage fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    if (matches.length === 0) {
      return {
        query,
        namespace: NAMESPACE,
        message:
          "Keine Kurse gefunden. Formuliere die Suche anders oder lockere die Filter (z.B. Bezirk oder Zeitraum weglassen).",
      };
    }

    return {
      query,
      namespace: NAMESPACE,
      filterApplied: pineconeFilter ?? null,
      totalHits: matches.length,
      results: formatMatches(matches),
    };
  },
});
