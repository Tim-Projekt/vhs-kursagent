import { tool } from "ai";
import { z } from "zod";

const PINECONE_HOST = process.env.PINECONE_INDEX_HOST!;
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 512;

// Namespace schema: {prefix}/{thema}/{tier}
const NAMESPACE_PREFIX = process.env.PINECONE_NAMESPACE_PREFIX ?? "prod";

const AVAILABLE_TOPICS = ["moor", "wald", "bioenergie", "biowerkstoffe", "allgemein"] as const;
type Topic = (typeof AVAILABLE_TOPICS)[number];

// New FKZ format (2019+): 22{YY}{CODE}{NNN}[X]
const FKZ_CODE_RE = /^22\d{2}([A-Z]{2,3})\d+/i;
const FKZ_TOPIC_MAP: Record<string, Topic> = {
  MT: "moor",
  WK: "wald",
  WKF: "wald",
};

function inferTopicFromFkz(fkz: string): Topic | null {
  const m = fkz.toUpperCase().match(FKZ_CODE_RE);
  if (!m) return null;
  return FKZ_TOPIC_MAP[m[1]] ?? null;
}

type PineconeMatch = {
  id: string;
  score: number;
  metadata?: {
    text?: string;
    fkz?: string;
    title?: string;
    chunk_type?: string;
    chunk_index?: number;
    chunk_total?: number;
    page_url?: string;
    page_title?: string;
    namespace?: string;
  };
};

function formatMatches(matches: PineconeMatch[]): string {
  return matches
    .map((match, i) => {
      const m = match.metadata ?? {};
      const score = match.score?.toFixed(3) ?? "?";
      const type = m.chunk_type ?? "?";

      let typeLabel: string;
      if (type === "report") {
        typeLabel = `Schlussbericht Chunk ${(m.chunk_index ?? 0) + 1}/${m.chunk_total ?? "?"}`;
      } else if (type === "web") {
        typeLabel = `Projektwebsite – ${m.page_title ?? m.page_url ?? ""}`;
      } else {
        typeLabel = "Projektübersicht";
      }

      const header = `[${i + 1}] FKZ ${m.fkz ?? "?"} | ${(m.title ?? "?").substring(0, 90)} | ${typeLabel} | score: ${score}`;
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

async function queryNamespace(
  host: string,
  apiKey: string,
  namespace: string,
  vector: number[],
  topK: number,
  filter?: Record<string, unknown>
): Promise<PineconeMatch[]> {
  const body: Record<string, unknown> = {
    namespace,
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

export const searchFnrProjects = tool({
  description: `Search the FNR (Fachagentur Nachwachsende Rohstoffe) project database — ~5,700 German research projects on paludiculture, peatlands, forestry, bioenergy, and biomaterials.

Use this tool when the user asks about:
- Research projects by topic, material, method, or result
- Specific projects by name, FKZ (Förderkennzeichen), institution, or Teilvorhaben
- Scientific findings, experiment results, or conclusions from Schlussberichte
- Project partners, timelines, funding amounts, or geographic scope
- Comparisons across projects or synthesis of a research area

Topics:
- moor: Moor, Torf, Paludikultur, Sphagnum, Rohrkolben, Wiedervernässung (~193 projects)
- wald: Wald, Holz, Forstwirtschaft, KUP, Agroforst (~2,090 projects)
- bioenergie: Biogas, Biokraftstoff, Pellet, Nahwärme (~1,148 projects)
- biowerkstoffe: Biokunststoff, Naturfaser, Hanf, Lignin, Dämmstoffe (~1,164 projects)
- allgemein: Cross-cutting and unclassified projects (~1,113 projects)

Search tiers:
- "infos": fast — one core overview chunk per project (title, institution, Aufgabenbeschreibung)
- "details": slower, richer — full text from Schlussberichte and project websites

Strategy:
1. Start with tier="infos" to identify relevant projects and FKZs
2. Follow up with tier="details" + fkz=<FKZ> to deep-dive into a specific project's report
3. Use German queries — they yield significantly better results than English
4. For cross-topic questions (e.g. Biomasse, Klimaschutz, Wertschöpfungsketten), call this tool once per relevant topic and synthesize across results`,

  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Semantic search query — be specific about topic, material, and context. German queries perform better. Examples: 'Ergebnisse Torfmoos Kultivierung Substrat Gartenbau', 'Rohrkolben Baustoffe Dämmung', 'Wiedervernässung CO₂ Emissionen Klimaschutz'"
      ),
    topic: z
      .enum(AVAILABLE_TOPICS)
      .optional()
      .describe(
        "Thematic area to search. Inferred automatically from FKZ if provided (MT→moor, WK→wald). Default: moor."
      ),
    tier: z
      .enum(["infos", "details"])
      .optional()
      .default("infos")
      .describe(
        "Search tier: 'infos' for project overviews (fast, one entry per project), 'details' for full Schlussbericht and website text (richer, slower)."
      ),
    fkz: z
      .string()
      .optional()
      .describe(
        "Restrict results to a specific project by FKZ (e.g. '2220MT003A'). Topic is auto-inferred from the FKZ code when not explicitly set."
      ),
    topK: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("Number of results to return (default: 6, or 10 when fkz is set)."),
  }),

  execute: async ({ query, topic, tier, fkz, topK: topKParam }) => {
    const pineconeApiKey = process.env.PINECONE_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!pineconeApiKey || !PINECONE_HOST) {
      return { error: "Pinecone not configured (PINECONE_API_KEY or PINECONE_INDEX_HOST missing)" };
    }
    if (!openaiApiKey) {
      return { error: "OpenAI not configured (OPENAI_API_KEY missing)" };
    }

    // Resolve topic: explicit > FKZ inference > default
    const resolvedTopic: Topic =
      topic ?? (fkz ? inferTopicFromFkz(fkz) : null) ?? "moor";

    // Step 1: Embed query via OpenAI
    const embeddingVector = await getEmbedding(query, openaiApiKey);
    if (!embeddingVector) {
      return { error: "OpenAI embedding failed" };
    }

    // Step 2: Build namespace and query Pinecone
    const namespace = `${NAMESPACE_PREFIX}/${resolvedTopic}/${tier}`;
    const topK = topKParam ?? (fkz ? 10 : 6);
    const filter = fkz ? { fkz: { $eq: fkz } } : undefined;

    let matches: PineconeMatch[];
    try {
      matches = await queryNamespace(PINECONE_HOST, pineconeApiKey, namespace, embeddingVector, topK, filter);
    } catch (err) {
      return { error: `Pinecone request failed: ${err instanceof Error ? err.message : String(err)}` };
    }

    if (matches.length === 0) {
      return {
        query,
        namespace,
        message:
          "Keine Ergebnisse gefunden. Versuche eine andere Formulierung, ein breiteres Thema (z.B. 'allgemein'), oder wechsle den tier auf 'details'.",
      };
    }

    return {
      query,
      namespace,
      totalHits: matches.length,
      results: formatMatches(matches),
    };
  },
});
