export const DEFAULT_CHAT_MODEL = "google/gemini-3.7-flash";

export const titleModel: ChatModel = {
  id: "anthropic/claude-haiku-4-5",
  name: "Claude Haiku 4.5",
  provider: "anthropic",
  description: "Fast model for title generation",
  capabilities: { tools: false, vision: false, reasoning: false },
};

export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
};

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  gatewayOrder?: string[];
  /** When set, enables OpenRouter reasoning with this effort level. */
  reasoningEffort?: "minimal" | "low" | "medium" | "high" | "xhigh";
  capabilities: ModelCapabilities;
};

export const chatModels: ChatModel[] = [
  {
    id: "google/gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    provider: "google",
    description: "Google's fast multimodal model with reasoning and tool support",
    reasoningEffort: "high",
    capabilities: { tools: true, vision: true, reasoning: true },
  },
  {
    id: "z-ai/glm-5.2",
    name: "GLM-5.2",
    provider: "z-ai",
    description: "Z.ai large-scale reasoning model with full tool support",
    reasoningEffort: "xhigh",
    capabilities: { tools: true, vision: false, reasoning: true },
  },
];

// ─── ARCHIV: Vertex-AI-Modellkatalog (2026-07-22 bis 2026-07-28, ersetzt durch OpenRouter) ───
// Bei Bedarf wiederherstellen (siehe auch Archiv-Kommentar in lib/ai/providers.ts):
// zurück auf `git show 9bd2810:chatbot-ui/lib/ai/models.ts` — enthält u. a.
// gemini-3.5-flash, gemini-3.6-flash, claude-sonnet-5 (jeweils direkte Vertex-IDs
// ohne Provider-Präfix) und den PROVISORISCH-Kommentar zur Titelgenerierung
// (Vertex-Claude-Kontingentproblem, siehe project_vertex_migration Memory).
// ───────────────────────────────────────────────────────────────────────────────────────────

export function getCapabilities(): Record<string, ModelCapabilities> {
  return Object.fromEntries(chatModels.map((m) => [m.id, m.capabilities]));
}

export const isDemo = process.env.IS_DEMO === "1";

type GatewayModel = {
  id: string;
  name: string;
  type?: string;
  tags?: string[];
};

export type GatewayModelWithCapabilities = ChatModel & {
  capabilities: ModelCapabilities;
};

export async function getAllGatewayModels(): Promise<
  GatewayModelWithCapabilities[]
> {
  try {
    const res = await fetch("https://ai-gateway.vercel.sh/v1/models", {
      next: { revalidate: 86_400 },
    });
    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    return (json.data ?? [])
      .filter((m: GatewayModel) => m.type === "language")
      .map((m: GatewayModel) => ({
        id: m.id,
        name: m.name,
        provider: m.id.split("/")[0],
        description: "",
        capabilities: {
          tools: m.tags?.includes("tool-use") ?? false,
          vision: m.tags?.includes("vision") ?? false,
          reasoning: m.tags?.includes("reasoning") ?? false,
        },
      }));
  } catch {
    return [];
  }
}

export function getActiveModels(): ChatModel[] {
  return chatModels;
}

export const allowedModelIds = new Set(chatModels.map((m) => m.id));

export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);
