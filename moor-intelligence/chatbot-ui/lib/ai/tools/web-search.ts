import { tool } from "ai";
import { z } from "zod";

type LinkupResult = {
  name: string;
  url: string;
  content: string;
  favicon?: string;
  type: "text";
};

type LinkupResponse = {
  results: LinkupResult[];
};

function formatResults(results: LinkupResult[]): string {
  return results
    .map((r, i) => `[${i + 1}] ${r.name}\n${r.url}\n${r.content}`)
    .join("\n\n---\n\n");
}

export const searchWeb = tool({
  description: `Search the web for current information, news, and general knowledge not available in the FNR project database.

Use this tool when:
- The user asks about current events, news, or recent developments
- General factual information about organizations, regulations, markets, or technology
- Information that may have changed since the AI's training cutoff
- Complementing FNR project data with broader context (e.g. EU policy, market prices, general peatland science)

Do NOT use this tool for:
- Questions about specific FNR-funded research projects → use searchFnrProjects instead
- Questions answerable from training knowledge without needing current data`,

  inputSchema: z.object({
    query: z.string().describe(
      "Search query. Be specific and use the language that will yield the best results (German for German topics, English for international topics)."
    ),
    search_depth: z
      .enum(["basic", "advanced"])
      .optional()
      .default("basic")
      .describe(
        "'basic' for quick factual lookups (default, cheaper). 'advanced' for in-depth research requiring multiple sources."
      ),
  }),

  execute: async ({ query, search_depth = "basic" }) => {
    const apiKey = process.env.LINKUP_API_KEY;
    if (!apiKey) {
      return { error: "Web search not configured (LINKUP_API_KEY missing)" };
    }

    let response: Response;
    try {
      response = await fetch("https://api.linkup.so/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: query,
          depth: search_depth === "advanced" ? "deep" : "standard",
          outputType: "searchResults",
          maxResults: 5,
          includeImages: false,
        }),
      });
    } catch (err) {
      return {
        error: `Web search request failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { error: `Linkup ${response.status}: ${body.substring(0, 200)}` };
    }

    const data: LinkupResponse = await response.json();

    if (!data.results || data.results.length === 0) {
      return {
        query,
        message: "No results found. Try a different query.",
      };
    }

    return {
      query,
      results: formatResults(data.results),
      totalResults: data.results.length,
    };
  },
});
