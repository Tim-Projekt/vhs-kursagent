import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { customProvider } from "ai";
import { isTestEnvironment } from "../constants";
import { titleModel } from "./models";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// ─── ARCHIV: Vertex-AI-Provider (2026-07-22 bis 2026-07-28, ersetzt durch OpenRouter) ───
// Bei Bedarf wiederherstellen: @ai-sdk/google-vertex ist noch als Dependency
// in package.json vorhanden, GOOGLE_VERTEX_*/GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY
// liegen noch in .env.local/Vercel. Zum Reaktivieren: Block unten einkommentieren,
// die OpenRouter-Initialisierung oben sowie die einfachen `return openrouter(...)`
// Aufrufe in getLanguageModel()/getTitleModel() entfernen und durch die
// "claude-"-Präfix-Weiche (vertexAnthropic vs. vertex) ersetzen. Modell-IDs waren
// Vertex-Format ("claude-sonnet-5", "gemini-3.6-flash" statt "anthropic/claude-..."
// / "google/gemini-...") — lib/ai/models.ts müsste entsprechend mit-zurückgesetzt
// werden (siehe `git show 9bd2810:chatbot-ui/lib/ai/models.ts` für den Vertex-Stand,
// bzw. `git log --oneline -- chatbot-ui/lib/ai/models.ts` für die volle Historie).
// Bekannter offener Blocker beim letzten Live-Betrieb: Google-Kontingent für
// Anthropic-Partnermodelle auf Vertex war durch einen Google-seitigen
// Eligibility-Bug blockiert (429 RESOURCE_EXHAUSTED trotz dokumentiertem
// Standardkontingent) — vor Reaktivierung prüfen, ob das inzwischen gelöst ist.
//
// import { createVertex } from "@ai-sdk/google-vertex";
// import { createVertexAnthropic } from "@ai-sdk/google-vertex/anthropic";
//
// const project = process.env.GOOGLE_VERTEX_PROJECT;
// const location = process.env.GOOGLE_VERTEX_LOCATION ?? "europe-west1";
// // Anthropic-Partner-Modelle können in einer anderen Region liegen als Gemini
// const anthropicLocation =
//   process.env.GOOGLE_VERTEX_LOCATION_ANTHROPIC ?? location;
//
// // Credentials aus Env (Vercel + lokal); Fallback: GOOGLE_APPLICATION_CREDENTIALS / ADC
// const googleAuthOptions =
//   process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
//     ? {
//         credentials: {
//           client_email: process.env.GOOGLE_CLIENT_EMAIL,
//           private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
//         },
//       }
//     : undefined;
//
// const vertex = createVertex({ project, location, googleAuthOptions });
//
// const vertexAnthropic = createVertexAnthropic({
//   project,
//   location: anthropicLocation,
//   googleAuthOptions,
// });
//
// // In getLanguageModel(): if (modelId.startsWith("claude-")) return vertexAnthropic(modelId);
// //                        return vertex(modelId);
// // In getTitleModel():    return vertex(titleModel.id); // oder vertexAnthropic, je nach Modell
// ──────────────────────────────────────────────────────────────────────────────────────

export const myProvider = isTestEnvironment
  ? (() => {
      const { chatModel, titleModel } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": titleModel,
        },
      });
    })()
  : null;

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  return openrouter(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return openrouter(titleModel.id);
}
