import { tool } from "ai";
import { z } from "zod";

const PINECONE_HOST = process.env.PINECONE_WEBSITE_INDEX_HOST!;
const EMBEDDING_MODEL = "text-embedding-3-small";
// Must match the FNR-Website-Suche embedding-pipeline `pinecone-import` default
// (1536, not the 512 used by the projects index) - a mismatch would make
// query vectors incomparable to the stored ones.
const EMBEDDING_DIMENSIONS = 1536;

// Portal ids as defined in FNR-Website-Suche crawler/config/sources.yaml.
// Kept as a loose list (not a strict enum) since the source project can add
// portals independently of this tool.
const KNOWN_PORTALS = [
  "fnr-hauptseite",
  "moor-portal",
  "wald-portal",
  "baustoffe-portal",
  "holz-portal",
  "biowerkstoffe-portal",
  "bioschmierstoffe-portal",
  "torfersatz-portal",
  "pflanzen-portal",
  "einkauf-portal",
  "kwm-portal",
  "digitalisierung-portal",
  "holzbauinitiative-portal",
  "bioenergie-portal",
  "biogas-portal",
  "heizen-portal",
  "biokraftstoffe-portal",
  "bioenergiedorf-portal",
  "energieeffizienz-portal",
  "wirtschaftsduenger-portal",
  "foerderung-portal",
  "humus-portal",
  "veranstaltungen-portal",
  "mediathek-portal",
] as const;

const PAGE_TYPES = [
  "fachartikel",
  "ankuendigung",
  "veranstaltung",
  "themenseite",
  "publikation",
  "projekt",
  "sonstiges",
] as const;

type PineconeMatch = {
  id: string;
  score: number;
  metadata?: {
    text?: string;
    heading_path?: string;
    portal_label?: string;
    page_type?: string;
    source_id?: string;
    page_url?: string;
    page_title?: string;
    published_at?: string;
  };
};

function formatMatches(matches: PineconeMatch[]): string {
  return matches
    .map((match, i) => {
      const m = match.metadata ?? {};
      const score = match.score?.toFixed(3) ?? "?";
      const heading = m.heading_path ? ` – ${m.heading_path}` : "";
      const published = m.published_at ? ` | veröffentlicht: ${m.published_at.slice(0, 10)}` : "";

      const header = `[${i + 1}] ${m.page_title ?? "?"}${heading} | Portal: ${m.portal_label ?? "?"} | Typ: ${m.page_type ?? "?"}${published} | score: ${score}\nURL: ${m.page_url ?? "?"}`;
      return `${header}\n\n${m.text ?? "(kein Text)"}`;
    })
    .join("\n\n---\n\n");
}

async function getEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input: text, model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data[0].embedding;
}

async function queryIndex(
  host: string,
  apiKey: string,
  vector: number[],
  topK: number,
  filter?: Record<string, unknown>
): Promise<PineconeMatch[]> {
  const body: Record<string, unknown> = {
    topK,
    vector,
    includeMetadata: true,
    ...(filter ? { filter } : {}),
  };
  const res = await fetch(`https://${host}/query`, {
    method: "POST",
    headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data?.matches ?? [];
}

export const searchFnrWebsite = tool({
  description: `Search the FNR website corpus — the public content of fnr.de and its ~24 thematic portals (Moor, Wald, Bioenergie, Biowerkstoffe, Torfersatz, Förderung, Veranstaltungen, Mediathek, ...). This is fnr.de's own editorial/public-facing content (Fachartikel, Ankündigungen, Veranstaltungen, Themenseiten), NOT the funded-project database — use \`searchFnrProjects\` for research projects, FKZ, and Schlussberichte instead.

Use this tool when the user asks about:
- What FNR publishes or communicates publicly on a topic (fnr.de content, not internal project data)
- Public announcements, news, or press releases from FNR
- Events (Veranstaltungen) organized or listed by FNR
- General/explainer content on a topic portal (e.g. "was sagt fnr.de zu Paludikultur")
- Publications (Publikation-Seiten) referenced or hosted on fnr.de

Do NOT use this for questions about specific funded research projects, FKZ, or Schlussbericht results — use \`searchFnrProjects\` for those.

Known portals (source_id): ${KNOWN_PORTALS.join(", ")}.
Page types: ${PAGE_TYPES.join(", ")}.

Strategy:
- Use German queries — they yield significantly better results than English.
- Be specific: topic + context (e.g. "Paludikultur Wiedervernässung Klimaschutz", "Holzbau Fördermöglichkeiten").
- Narrow with \`portals\` or \`pageTypes\` only when the user's question clearly maps to a specific portal or content type; otherwise search unfiltered first.`,

  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Semantic search query — be specific about topic and context. German queries perform better."
      ),
    portals: z
      .array(z.string())
      .optional()
      .describe(
        `Restrict results to specific portals by source_id. Known ids: ${KNOWN_PORTALS.join(", ")}.`
      ),
    pageTypes: z
      .array(z.enum(PAGE_TYPES))
      .optional()
      .describe("Restrict results to specific content types."),
    topK: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("Number of chunk results to return (default: 8)."),
  }),

  execute: async ({ query, portals, pageTypes, topK: topKParam }) => {
    const pineconeApiKey = process.env.PINECONE_WEBSITE_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!pineconeApiKey || !PINECONE_HOST) {
      return {
        error:
          "Pinecone not configured (PINECONE_WEBSITE_API_KEY or PINECONE_WEBSITE_INDEX_HOST missing)",
      };
    }
    if (!openaiApiKey) {
      return { error: "OpenAI not configured (OPENAI_API_KEY missing)" };
    }

    const embeddingVector = await getEmbedding(query, openaiApiKey);
    if (!embeddingVector) {
      return { error: "OpenAI embedding failed" };
    }

    const clauses: Record<string, unknown>[] = [];
    if (portals && portals.length > 0) clauses.push({ source_id: { $in: portals } });
    if (pageTypes && pageTypes.length > 0) clauses.push({ page_type: { $in: pageTypes } });
    const filter =
      clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : { $and: clauses };

    const topK = topKParam ?? 8;

    let matches: PineconeMatch[];
    try {
      matches = await queryIndex(PINECONE_HOST, pineconeApiKey, embeddingVector, topK, filter);
    } catch (err) {
      return { error: `Pinecone request failed: ${err instanceof Error ? err.message : String(err)}` };
    }

    if (matches.length === 0) {
      return {
        query,
        message:
          "Keine Ergebnisse gefunden. Versuche eine andere Formulierung oder entferne die Portal-/Typ-Filter.",
      };
    }

    return {
      query,
      totalHits: matches.length,
      results: formatMatches(matches),
    };
  },
});
