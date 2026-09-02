import { geolocation, ipAddress } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
  streamText,
} from "ai";
import { checkBotId } from "botid/server";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { auth } from "@/app/(auth)/auth";
import { entitlementsByTier } from "@/lib/ai/entitlements";
import {
  allowedModelIds,
  chatModels,
  DEFAULT_CHAT_MODEL,
  getCapabilities,
} from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { editDocument } from "@/lib/ai/tools/edit-document";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { searchVhsCourses } from "@/lib/ai/tools/search-vhs-courses";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { searchWeb } from "@/lib/ai/tools/web-search";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
  updateMessage,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import { checkIpRateLimit } from "@/lib/ratelimit";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 300;

// Gesamtbudget an Agent-Schritten (Tool-Calls + finale Antwort) pro Nachricht.
// Deutlich höher als zuvor (12), weil der System Prompt für Multi-Themen- und
// bereichsübergreifende Fragen bewusst mehrere Suchen pro Aspekt verlangt
// (siehe lib/ai/prompts.ts) — 20 entspricht dem SDK-eigenen Agent-Default und
// deckt realistische Recherchen mit deutlichem Puffer ab (siehe Testlauf im
// Implementierungsbericht: eine 3-Themen-Frage brauchte 6 von 20 Schritten).
const MAX_AGENT_STEPS = 20;

function getStreamContext() {
  try {
    return createResumableStreamContext({ waitUntil: after });
  } catch (_) {
    return null;
  }
}

export { getStreamContext };

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  try {
    const { id, message, messages, selectedChatModel, selectedVisibilityType } =
      requestBody;

    const [, session] = await Promise.all([
      checkBotId().catch(() => null),
      auth(),
    ]);

    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    const chatModel = allowedModelIds.has(selectedChatModel)
      ? selectedChatModel
      : DEFAULT_CHAT_MODEL;

    const userTier = session.user.tier;

    // IP-Limit ist ein Anti-Abuse-Schutz für anonyme Gäste (beliebig oft neu
    // erzeugbar); angemeldete Nutzer:innen werden ausschließlich über ihr
    // Konto limitiert (entitlementsByTier), damit geteilte Büro-IPs mehrere
    // FNR-Mitarbeitende nicht gegenseitig ausbremsen.
    if (userTier === "guest") {
      await checkIpRateLimit(ipAddress(request));
    }

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 1,
    });

    // Fallback auf "user", falls User.role in der DB je einen unerwarteten
    // Wert enthält (role ist ein varchar ohne DB-seitiges Enum-Constraint) —
    // verhindert einen harten Absturz statt nur eines falschen Limits.
    const entitlements =
      entitlementsByTier[userTier] ?? entitlementsByTier.user;

    if (messageCount > entitlements.maxMessagesPerHour) {
      return new ChatbotError("rate_limit:chat").toResponse();
    }

    const isToolApprovalFlow = Boolean(messages);

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatbotError("forbidden:chat").toResponse();
      }
      messagesFromDb = await getMessagesByChatId({ id });
    } else if (message?.role === "user") {
      await saveChat({
        id,
        userId: session.user.id,
        title: "New chat",
        visibility: selectedVisibilityType,
      });
      titlePromise = generateTitleFromUserMessage({ message });
    }

    let uiMessages: ChatMessage[];

    if (isToolApprovalFlow && messages) {
      const dbMessages = convertToUIMessages(messagesFromDb);
      const approvalStates = new Map(
        messages.flatMap(
          (m) =>
            m.parts
              ?.filter(
                (p: Record<string, unknown>) =>
                  p.state === "approval-responded" ||
                  p.state === "output-denied"
              )
              .map((p: Record<string, unknown>) => [
                String(p.toolCallId ?? ""),
                p,
              ]) ?? []
        )
      );
      uiMessages = dbMessages.map((msg) => ({
        ...msg,
        parts: msg.parts.map((part) => {
          if (
            "toolCallId" in part &&
            approvalStates.has(String(part.toolCallId))
          ) {
            return { ...part, ...approvalStates.get(String(part.toolCallId)) };
          }
          return part;
        }),
      })) as ChatMessage[];
    } else {
      uiMessages = [
        ...convertToUIMessages(messagesFromDb),
        message as ChatMessage,
      ];
    }

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    if (message?.role === "user") {
      await saveMessages({
        messages: [
          {
            chatId: id,
            id: message.id,
            role: "user",
            parts: message.parts,
            attachments: [],
            createdAt: new Date(),
          },
        ],
      });
    }

    const modelConfig = chatModels.find((m) => m.id === chatModel);
    const modelCapabilities = getCapabilities();
    const capabilities = modelCapabilities[chatModel];
    const isReasoningModel = capabilities?.reasoning === true;
    const supportsTools = capabilities?.tools === true;

    const modelMessages = await convertToModelMessages(uiMessages);

    const stream = createUIMessageStream({
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
      execute: async ({ writer: dataStream }) => {
        const result = streamText({
          model: getLanguageModel(chatModel),
          system: systemPrompt({ requestHints, supportsTools }),
          messages: modelMessages,
          stopWhen: stepCountIs(MAX_AGENT_STEPS),
          experimental_activeTools:
            isReasoningModel && !supportsTools
              ? []
              : [
                  "searchVhsCourses",
                  "searchWeb",
                  "createDocument",
                  "editDocument",
                  "updateDocument",
                ],
          providerOptions: {
            ...(modelConfig?.gatewayOrder && {
              gateway: { order: modelConfig.gatewayOrder },
            }),
            ...(modelConfig?.reasoningEffort && {
              openrouter: {
                reasoning: {
                  enabled: true,
                  effort: modelConfig.reasoningEffort,
                },
              },
            }),
            // ─── ARCHIV: Vertex-AI providerOptions (2026-07-22 bis 2026-07-28) ───
            // Gemini und Claude auf Vertex brauchten unterschiedliche Namespaces
            // für extended thinking. Bei Bedarf wiederherstellen (siehe auch
            // Archiv-Kommentare in lib/ai/providers.ts und lib/ai/models.ts):
            //
            // ...(modelConfig?.reasoningEffort &&
            //   !chatModel.startsWith("claude-") && {
            //   google: {
            //     thinkingConfig: {
            //       // -1 = dynamisches Thinking-Budget (Modell entscheidet je Anfrage)
            //       thinkingBudget: -1,
            //       includeThoughts: true,
            //     },
            //   },
            // }),
            // ...(modelConfig?.reasoningEffort &&
            //   chatModel.startsWith("claude-") && {
            //   anthropic: {
            //     thinking: { type: "adaptive", display: "summarized" },
            //   },
            // }),
            // ────────────────────────────────────────────────────────────────────
          },
          onChunk: ({ chunk }) => {
            if (isProductionEnvironment) return;
            const c = chunk as Record<string, unknown>;
            if (c.type === "reasoning") {
              console.log(
                `[trace:reasoning-delta] ${String(c.text ?? "").length} chars`
              );
            // } else if (c.type === "tool-call") {
            //   console.log("[trace:tool-call]", c.toolName);
            // } else if (c.type === "tool-result") {
            //   console.log("[trace:tool-result]", c.toolName);
            }
          },
          onStepFinish: (step) => {
            if (isProductionEnvironment) return;
            // const s = step as Record<string, unknown>;
            // const toolNames = Array.isArray(s.toolCalls)
            //   ? (s.toolCalls as Record<string, unknown>[]).map((t) => t.toolName)
            //   : [];
            // const reasoningLen =
            //   typeof s.reasoning === "string" ? s.reasoning.length : 0;
            // console.log("[trace:step-finish]", s.stepType, {
            //   reasoning: reasoningLen ? `${reasoningLen}c` : "none",
            //   tools: toolNames,
            // });
            void step;
          },
          tools: {
            searchVhsCourses,
            searchWeb,
            createDocument: createDocument({
              session,
              dataStream,
              modelId: chatModel,
            }),
            editDocument: editDocument({ dataStream, session }),
            updateDocument: updateDocument({
              session,
              dataStream,
              modelId: chatModel,
            }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
              modelId: chatModel,
            }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        });

        dataStream.merge(
          result.toUIMessageStream({ sendReasoning: isReasoningModel })
        );

        // Sicherheitsnetz: Falls das Schrittbudget mitten in einer Tool-
        // Aufruf-Kette erschöpft wird und dadurch keine finale Textantwort
        // entsteht, erzwingt ein separater Folge-Call eine abschließende
        // Synthese aus den bereits gesammelten Suchergebnissen — statt den
        // Nutzer ohne jede Antwort dastehen zu lassen.
        //
        // Wichtig: Die Rohergebnisse werden dafür als reiner Text in eine
        // neue User-Nachricht eingebettet, statt die Original-Assistant-/
        // Tool-Turns wiederzugeben. Reasoning-tragende Assistant-Nachrichten
        // (inkl. Gemini "thought signatures") in einem separaten Call erneut
        // einzuspeisen, führte im Test zu "Corrupted thought signature"-
        // Fehlern des Providers — reiner Text umgeht dieses Problem.
        const [finishedSteps, finalText] = await Promise.all([
          result.steps,
          result.text,
        ]);

        if (!finalText.trim() && finishedSteps.length > 0) {
          const toolResultsSummary = finishedSteps
            .flatMap((step) => step.toolResults)
            .map(
              (toolResult, i) =>
                `[Ergebnis ${i + 1}] Tool: ${toolResult.toolName}\n${JSON.stringify(toolResult.output)}`
            )
            .join("\n\n---\n\n");

          try {
            const fallbackResult = streamText({
              model: getLanguageModel(chatModel),
              system: systemPrompt({ requestHints, supportsTools }),
              messages: [
                ...modelMessages,
                {
                  role: "user",
                  content: `Das Recherche-Budget für diese Antwort ist erschöpft. Hier sind die bereits gesammelten Rechercheergebnisse:\n\n${toolResultsSummary || "(keine Suchergebnisse verfügbar)"}\n\nFasse jetzt darauf basierend eine abschließende Antwort zusammen — ohne weitere Tool-Aufrufe. Benenne Themen, die dabei nicht mehr abgedeckt werden konnten, explizit als Lücke.`,
                },
              ],
              experimental_telemetry: {
                isEnabled: isProductionEnvironment,
                functionId: "stream-text-fallback",
              },
            });

            dataStream.merge(
              fallbackResult.toUIMessageStream({ sendReasoning: false })
            );
          } catch (fallbackError) {
            console.error(
              "[agent-fallback] Fallback-Synthese fehlgeschlagen:",
              fallbackError
            );
          }
        }

        if (titlePromise) {
          try {
            const title = await titlePromise;
            await updateChatTitleById({ chatId: id, title });
            dataStream.write({ type: "data-chat-title", data: title });
          } catch (titleError) {
            console.error("[title-gen] Failed to update chat title:", titleError);
          }
        }
      },
      generateId: generateUUID,
      onFinish: async ({ messages: finishedMessages }) => {
        if (isToolApprovalFlow) {
          for (const finishedMsg of finishedMessages) {
            const existingMsg = uiMessages.find((m) => m.id === finishedMsg.id);
            if (existingMsg) {
              await updateMessage({
                id: finishedMsg.id,
                parts: finishedMsg.parts,
              });
            } else {
              await saveMessages({
                messages: [
                  {
                    id: finishedMsg.id,
                    role: finishedMsg.role,
                    parts: finishedMsg.parts,
                    createdAt: new Date(),
                    attachments: [],
                    chatId: id,
                  },
                ],
              });
            }
          }
        } else if (finishedMessages.length > 0) {
          await saveMessages({
            messages: finishedMessages.map((currentMessage) => ({
              id: currentMessage.id,
              role: currentMessage.role,
              parts: currentMessage.parts,
              createdAt: new Date(),
              attachments: [],
              chatId: id,
            })),
          });
        }
      },
      onError: (error) => {
        if (
          error instanceof Error &&
          error.message?.includes(
            "AI Gateway requires a valid credit card on file to service requests"
          )
        ) {
          return "AI Gateway requires a valid credit card on file to service requests. Please visit https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card to add a card and unlock your free credits.";
        }
        return "Oops, an error occurred!";
      },
    });

    return createUIMessageStreamResponse({
      stream,
      async consumeSseStream({ stream: sseStream }) {
        if (!process.env.REDIS_URL) {
          return;
        }
        try {
          const streamContext = getStreamContext();
          if (streamContext) {
            const streamId = generateId();
            await createStreamId({ streamId, chatId: id });
            await streamContext.createNewResumableStream(
              streamId,
              () => sseStream
            );
          }
        } catch (_) {
          /* non-critical */
        }
      },
    });
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatbotError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatbotError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
