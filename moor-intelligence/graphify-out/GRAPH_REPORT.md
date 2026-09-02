# Graph Report - Moor-Intelligence  (2026-07-28)

## Corpus Check
- 198 files · ~98,790 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1602 nodes · 2980 edges · 175 communities (97 shown, 78 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5ba5ac3c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- prompt-input.tsx
- model-selector.tsx
- 02_enrich.py
- ai-elements/message.tsx
- Knowledge Primer: Design und LLM-Aggregationspipeline
- code-block.tsx
- diff.js
- cn
- icons.tsx
- auth.ts
- compilerOptions
- text-editor.tsx
- sidebar.tsx
- types.ts
- lib/utils.ts
- sidebar-history-item.tsx
- artifacts/server.ts
- (auth)/actions.ts
- toast.tsx
- 04_rag_pipeline.py
- What You Must Do When Invoked
- queries.ts
- chat/route.ts
- errors.ts
- use-active-chat.tsx
- FNR Pipeline v2 — Architektur-Dokument
- tool.tsx
- getChatById
- command.tsx
- ChatPage
- dependencies
- components.json
- (chat)/actions.ts
- code/client.tsx
- chat/message.tsx
- document-preview.tsx
- shimmer.tsx
- reasoning.tsx
- messages.tsx
- models.ts
- sheet/client.tsx
- conversation.tsx
- scripts
- devDependencies
- slash-commands.tsx
- input-group.tsx
- ai-elements/suggestion.tsx
- toolbar.tsx
- create-artifact.tsx
- models.test.ts
- ai
- graphify reference: extra exports and benchmark
- FNR Moor-Förderportfolio: Aktivitäts- und Wissensübersicht
- 5. Empfohlene Architektur
- chat/schema.ts
- weather.tsx
- babel-plugin-react-compiler
- Product Requirements Document
- 11. Kritische offene Fragen
- Technical Design Document
- 4. Architekturoptionen und Trade-off-Analyse
- 5.3 Corpus Index – Aufbau, Datenmodell und Querybarkeit
- 8. Technische Risiken
- multimodal-input.tsx
- README.md
- graphify reference: query, path, explain
- 10. Technische und produktseitige Risiken
- 7. Kritische technische Hebel
- 9. Offene Architekturfragen
- package.json
- 3. Institutioneller und fachlicher Kontext
- 6. Wissensarchitektur: Vier Wissenstypen
- 1. Anforderungsanalyse
- 3. Fundamentales Systemmodell
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- 12. Priorisierung und MVP-Empfehlung
- 2. Situationsanalyse: Das eigentliche Problem
- 4. Nutzerprofil und Entscheidungsbedarfe
- 7. Kernfunktionen des Agents (nach Priorität)
- 8. Qualitätsanforderungen an Antworten
- 2. Stand der Technik: Agentensysteme 2026
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- 9. Systemgrenzen und kritische Einschränkungen
- @ai-sdk/google-vertex
- @codemirror/state
- bcrypt-ts
- @biomejs/biome
- botid
- next.config.ts
- class-variance-authority
- classnames
- clsx
- @codemirror/view
- framer-motion
- @codemirror/lang-python
- @codemirror/theme-one-dark
- date-fns
- motion
- fast-deep-equal
- katex
- lucide-react
- nanoid
- next
- next-auth
- next-themes
- @openrouter/ai-sdk-provider
- @opentelemetry/api
- @opentelemetry/api-logs
- orderedmap
- papaparse
- postgres
- prosemirror-example-setup
- prosemirror-inputrules
- prosemirror-markdown
- prosemirror-schema-basic
- prosemirror-schema-list
- prosemirror-model
- prosemirror-view
- radix-ui
- @radix-ui/react-use-controllable-state
- react-data-grid
- react-dom
- redis
- resumable-stream
- server-only
- shiki
- sonner
- streamdown
- @streamdown/cjk
- @streamdown/code
- @streamdown/math
- @streamdown/mermaid
- swr
- tailwind-merge
- tailwindcss-animate
- use-stick-to-bottom
- resend
- @vercel/analytics
- @vercel/blob
- @vercel/otel
- @vercel/functions
- drizzle-kit
- @playwright/test
- postcss
- @tailwindcss/postcss
- tsx
- @types/node
- @types/react
- @types/react-dom
- typescript
- postcss.config.mjs
- vercel.json
- CLAUDE.md
- .claude/CLAUDE.md
- extraction-spec.md
- run_pipeline.sh
- expect

## God Nodes (most connected - your core abstractions)
1. `cn()` - 210 edges
2. `ChatMessage` - 22 edges
3. `POST()` - 19 edges
4. `Button()` - 19 edges
5. `useArtifact()` - 17 edges
6. `compilerOptions` - 17 edges
7. `useSidebar()` - 16 edges
8. `ChatPage` - 15 edges
9. `Product Requirements Document` - 15 edges
10. `toast()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Page()` --indirect_call--> `register()`  [INFERRED]
  chatbot-ui/app/(auth)/register/page.tsx → chatbot-ui/app/(auth)/actions.ts
- `Page()` --indirect_call--> `requestPasswordReset()`  [INFERRED]
  chatbot-ui/app/(auth)/forgot-password/page.tsx → chatbot-ui/app/(auth)/actions.ts
- `ResetPasswordForm()` --indirect_call--> `resetPassword()`  [INFERRED]
  chatbot-ui/app/(auth)/reset-password/page.tsx → chatbot-ui/app/(auth)/actions.ts
- `CodeBlockContainer()` --calls--> `cn()`  [EXTRACTED]
  chatbot-ui/components/ai-elements/code-block.tsx → chatbot-ui/lib/utils.ts
- `CodeBlockHeader()` --calls--> `cn()`  [EXTRACTED]
  chatbot-ui/components/ai-elements/code-block.tsx → chatbot-ui/lib/utils.ts

## Import Cycles
- 3-file cycle: `chatbot-ui/artifacts/sheet/client.tsx -> chatbot-ui/components/chat/create-artifact.tsx -> chatbot-ui/components/chat/artifact.tsx -> chatbot-ui/artifacts/sheet/client.tsx`
- 3-file cycle: `chatbot-ui/artifacts/code/client.tsx -> chatbot-ui/components/chat/create-artifact.tsx -> chatbot-ui/components/chat/artifact.tsx -> chatbot-ui/artifacts/code/client.tsx`
- 3-file cycle: `chatbot-ui/artifacts/image/client.tsx -> chatbot-ui/components/chat/create-artifact.tsx -> chatbot-ui/components/chat/artifact.tsx -> chatbot-ui/artifacts/image/client.tsx`
- 3-file cycle: `chatbot-ui/artifacts/text/client.tsx -> chatbot-ui/components/chat/create-artifact.tsx -> chatbot-ui/components/chat/artifact.tsx -> chatbot-ui/artifacts/text/client.tsx`
- 3-file cycle: `chatbot-ui/components/chat/artifact-actions.tsx -> chatbot-ui/components/chat/create-artifact.tsx -> chatbot-ui/components/chat/artifact.tsx -> chatbot-ui/components/chat/artifact-actions.tsx`
- 3-file cycle: `chatbot-ui/components/chat/artifact.tsx -> chatbot-ui/components/chat/toolbar.tsx -> chatbot-ui/components/chat/create-artifact.tsx -> chatbot-ui/components/chat/artifact.tsx`
- 3-file cycle: `chatbot-ui/components/chat/sidebar-history-item.tsx -> chatbot-ui/hooks/use-chat-visibility.ts -> chatbot-ui/components/chat/sidebar-history.tsx -> chatbot-ui/components/chat/sidebar-history-item.tsx`
- 3-file cycle: `chatbot-ui/app/(chat)/actions.ts -> chatbot-ui/components/chat/visibility-selector.tsx -> chatbot-ui/hooks/use-chat-visibility.ts -> chatbot-ui/app/(chat)/actions.ts`
- 3-file cycle: `chatbot-ui/artifacts/text/client.tsx -> chatbot-ui/components/chat/document-skeleton.tsx -> chatbot-ui/components/chat/artifact.tsx -> chatbot-ui/artifacts/text/client.tsx`
- 4-file cycle: `chatbot-ui/app/(chat)/actions.ts -> chatbot-ui/lib/db/queries.ts -> chatbot-ui/components/chat/visibility-selector.tsx -> chatbot-ui/hooks/use-chat-visibility.ts -> chatbot-ui/app/(chat)/actions.ts`
- 4-file cycle: `chatbot-ui/artifacts/actions.ts -> chatbot-ui/lib/db/queries.ts -> chatbot-ui/components/chat/artifact.tsx -> chatbot-ui/artifacts/text/client.tsx -> chatbot-ui/artifacts/actions.ts`
- 5-file cycle: `chatbot-ui/app/(auth)/auth.ts -> chatbot-ui/lib/db/queries.ts -> chatbot-ui/components/chat/visibility-selector.tsx -> chatbot-ui/hooks/use-chat-visibility.ts -> chatbot-ui/app/(chat)/actions.ts -> chatbot-ui/app/(auth)/auth.ts`
- 5-file cycle: `chatbot-ui/app/(chat)/actions.ts -> chatbot-ui/lib/ai/prompts.ts -> chatbot-ui/components/chat/artifact.tsx -> chatbot-ui/components/chat/visibility-selector.tsx -> chatbot-ui/hooks/use-chat-visibility.ts -> chatbot-ui/app/(chat)/actions.ts`
- 5-file cycle: `chatbot-ui/app/(chat)/actions.ts -> chatbot-ui/lib/db/queries.ts -> chatbot-ui/components/chat/artifact.tsx -> chatbot-ui/components/chat/visibility-selector.tsx -> chatbot-ui/hooks/use-chat-visibility.ts -> chatbot-ui/app/(chat)/actions.ts`

## Communities (175 total, 78 thin omitted)

### Community 0 - "prompt-input.tsx"
Cohesion: 0.03
Nodes (54): AttachmentsContext, convertBlobUrlToDataUrl(), LocalAttachmentsContext, LocalReferencedSourcesContext, PromptInput(), PromptInputActionAddAttachments(), PromptInputActionAddAttachmentsProps, PromptInputActionMenuContentProps (+46 more)

### Community 1 - "model-selector.tsx"
Cohesion: 0.09
Nodes (19): ModelSelector(), ModelSelectorContentProps, ModelSelectorEmptyProps, ModelSelectorGroupProps, ModelSelectorInputProps, ModelSelectorItemProps, ModelSelectorListProps, ModelSelectorLogoGroup() (+11 more)

### Community 2 - "02_enrich.py"
Cohesion: 0.08
Nodes (44): BeautifulSoup, discover_all_fkzs(), main(), parse_project_page(), Step 1: Discover all FKZs from the central FNR Projektverzeichnis and scrape…, Scrape a single project detail page. Returns {fkz, sources: {fnr: {...}}}., Fetch the full Projektverzeichnis (single large page) and extract all FKZ→URL…, Extract structured fields from a project detail page. HTML structure (TYPO3… (+36 more)

### Community 3 - "ai-elements/message.tsx"
Cohesion: 0.06
Nodes (36): geist, geistMono, metadata, viewport, Message(), MessageActionProps, MessageActionsProps, MessageBranch() (+28 more)

### Community 4 - "Knowledge Primer: Design und LLM-Aggregationspipeline"
Cohesion: 0.05
Nodes (40): 10. Zusammenfassung: Architektonische Position des Knowledge Primers, 1.1 Korpus-Kennzahlen (gemessen), 1.2 Verbundvorhaben-Struktur, 1.3 Token-Umfang (gemessen, ~3,5 Zeichen/Token Deutsch), 1. Empirische Datenbasis: Was im Corpus vorhanden ist, 2.1 Warum Volltextinjektion falsch ist, 2.2 Warum reiner Metadaten-Index unzureichend ist, 2.3 Die Lösung: Knowledge Primer als semantisches Gedächtnis (+32 more)

### Community 5 - "code-block.tsx"
Cohesion: 0.06
Nodes (34): CodeBlock(), CodeBlockActions(), CodeBlockBody, CodeBlockContainer(), CodeBlockContent(), CodeBlockContext, CodeBlockContextType, CodeBlockCopyButton() (+26 more)

### Community 6 - "diff.js"
Cohesion: 0.12
Nodes (33): MessageResponse, computeDiff(), DiffEditorProps, diffSchema, DiffView(), assertNodeTypeEqual(), computeChildEqualityFactor(), createDiffMark() (+25 more)

### Community 7 - "cn"
Cohesion: 0.07
Nodes (36): PromptInputActionMenuContent(), PromptInputActionMenuItem(), PromptInputBody(), PromptInputButton(), PromptInputCommand(), PromptInputCommandEmpty(), PromptInputCommandGroup(), PromptInputCommandInput() (+28 more)

### Community 8 - "icons.tsx"
Cohesion: 0.06
Nodes (6): MessageAction(), MessageActions(), PencilEditIcon(), ThumbDownIcon(), ThumbUpIcon(), MessageActions

### Community 9 - "auth.ts"
Cohesion: 0.08
Nodes (18): {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
}, JWT, next-auth, next-auth/jwt, Session, User, UserTier, UserType (+10 more)

### Community 10 - "compilerOptions"
Cohesion: 0.07
Nodes (29): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+21 more)

### Community 11 - "text-editor.tsx"
Cohesion: 0.15
Nodes (20): CodeEditor, EditorProps, CrossIcon(), SparklesIcon(), SuggestionDialog(), EditorProps, PureEditor(), Suggestion (+12 more)

### Community 12 - "sidebar.tsx"
Cohesion: 0.05
Nodes (61): AppSidebar(), ChatHeader, PureChatHeader(), SidebarLeftIcon(), ChatShell(), groupChatsByDate(), GroupedChats, SidebarHistory() (+53 more)

### Community 13 - "types.ts"
Cohesion: 0.08
Nodes (19): getWeather, AVAILABLE_TOPICS, FKZ_TOPIC_MAP, PineconeMatch, searchFnrProjects, Topic, LinkupResponse, LinkupResult (+11 more)

### Community 14 - "lib/utils.ts"
Cohesion: 0.13
Nodes (24): Artifact, ArtifactCloseButton, PureArtifactCloseButton(), PureArtifact(), DocumentToolCall, DocumentToolCallProps, DocumentToolResult, DocumentToolResultProps (+16 more)

### Community 15 - "sidebar-history-item.tsx"
Cohesion: 0.10
Nodes (30): CheckCircleFillIcon(), ChevronDownIcon(), GlobeIcon(), LockIcon(), MoreHorizontalIcon(), ShareIcon(), TrashIcon(), ChatItem (+22 more)

### Community 16 - "artifacts/server.ts"
Cohesion: 0.18
Nodes (13): codeDocumentHandler, sheetDocumentHandler, textDocumentHandler, ArtifactKind, getRequestPromptFromHints(), RequestHints, systemPrompt(), updateDocumentPrompt() (+5 more)

### Community 17 - "(auth)/actions.ts"
Cohesion: 0.19
Nodes (19): authFormSchema, forgotPasswordFormSchema, register(), requestPasswordReset(), resetPassword(), resetPasswordFormSchema, generatePasswordResetToken(), hashPasswordResetToken() (+11 more)

### Community 18 - "toast.tsx"
Cohesion: 0.16
Nodes (17): ForgotPasswordActionState, login(), LoginActionState, RegisterActionState, ResetPasswordActionState, Page(), Page(), Page() (+9 more)

### Community 19 - "04_rag_pipeline.py"
Cohesion: 0.16
Nodes (24): dotenv, dotenv, build_core_record(), build_core_text(), chunk_report_text(), chunk_website_pages(), embed_texts(), _fetch_existing() (+16 more)

### Community 20 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 21 - "queries.ts"
Cohesion: 0.14
Nodes (20): DELETE(), documentSchema, GET(), POST(), DELETE(), GET(), client, createStreamId() (+12 more)

### Community 22 - "chat/route.ts"
Cohesion: 0.13
Nodes (24): DELETE(), POST(), getLanguageModel(), createDocument(), CreateDocumentProps, editDocument(), EditDocumentProps, requestSuggestions() (+16 more)

### Community 23 - "errors.ts"
Cohesion: 0.21
Nodes (10): GET(), getSuggestionsByDocumentId(), ChatbotError, ErrorCode, ErrorType, ErrorVisibility, getMessageByErrorCode(), getStatusCodeByType() (+2 more)

### Community 24 - "use-active-chat.tsx"
Cohesion: 0.19
Nodes (15): DataStreamHandler(), DataStreamContext, DataStreamContextValue, DataStreamProvider(), useDataStream(), getChatHistoryPaginationKey(), ActiveChatContext, ActiveChatContextValue (+7 more)

### Community 25 - "FNR Pipeline v2 — Architektur-Dokument"
Cohesion: 0.10
Nodes (20): 1.1 Bisherige Architektur (v1), 1.2 Ziele v2, 1. Ausgangslage und Ziele, 2.1 Datenquelle: Zentral statt dezentral, 2.2 Namespace-Struktur: Zwei-Ebenen-Modell, 2.3 FKZ → Thema Mapping (Prioritätsreihenfolge), 2. Architektur-Entscheidungen, 3. Datenfluss (neu) (+12 more)

### Community 26 - "tool.tsx"
Cohesion: 0.15
Nodes (15): getStatusBadge(), statusIcons, statusLabels, ToolContentProps, ToolHeader(), ToolHeaderProps, ToolInputProps, ToolOutputProps (+7 more)

### Community 27 - "getChatById"
Cohesion: 0.31
Nodes (9): GET(), GET(), PATCH(), voteSchema, getChatById(), getMessagesByChatId(), getVotesByChatId(), voteMessage() (+1 more)

### Community 28 - "command.tsx"
Cohesion: 0.12
Nodes (16): Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem(), CommandList(), CommandSeparator() (+8 more)

### Community 29 - "ChatPage"
Cohesion: 0.15
Nodes (3): Fixtures, test, ChatPage

### Community 30 - "dependencies"
Cohesion: 0.12
Nodes (17): @ai-sdk/provider, @ai-sdk/react, dependencies, @ai-sdk/provider, @ai-sdk/react, cmdk, codemirror, drizzle-orm (+9 more)

### Community 31 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 32 - "(chat)/actions.ts"
Cohesion: 0.13
Nodes (18): deleteTrailingMessages(), generateTitleFromUserMessage(), updateChatVisibility(), submitEditedMessage(), ChatHistory, VisibilityType, chatModel, createMockModel() (+10 more)

### Community 33 - "code/client.tsx"
Cohesion: 0.19
Nodes (11): codeArtifact, Metadata, OUTPUT_HANDLERS, Console(), ConsoleOutput, ConsoleOutputContent, ConsoleProps, LogsIcon() (+3 more)

### Community 34 - "chat/message.tsx"
Cohesion: 0.33
Nodes (6): Tool(), ToolContent(), ToolInput(), ToolOutput(), PurePreviewMessage(), sanitizeText()

### Community 35 - "document-preview.tsx"
Cohesion: 0.11
Nodes (15): getSuggestions(), textArtifact, TextArtifactMetadata, DocumentHeader, DocumentPreviewProps, DocumentToolOutput, HitboxLayer, DocumentSkeleton() (+7 more)

### Community 36 - "shimmer.tsx"
Cohesion: 0.33
Nodes (6): getMotionComponent(), motionComponentCache, MotionHTMLProps, Shimmer, ShimmerComponent(), TextShimmerProps

### Community 37 - "reasoning.tsx"
Cohesion: 0.16
Nodes (11): Reasoning, ReasoningContent, ReasoningContentProps, ReasoningContext, ReasoningContextValue, ReasoningProps, ReasoningTrigger, ReasoningTriggerProps (+3 more)

### Community 38 - "messages.tsx"
Cohesion: 0.20
Nodes (10): ArtifactMessages, ArtifactMessagesProps, PureArtifactMessages(), Greeting(), ThinkingMessage(), MessagesProps, PureMessages(), useMessages() (+2 more)

### Community 39 - "models.ts"
Cohesion: 0.19
Nodes (11): GET(), allowedModelIds, ChatModel, chatModels, GatewayModel, GatewayModelWithCapabilities, getAllGatewayModels(), getCapabilities() (+3 more)

### Community 40 - "sheet/client.tsx"
Cohesion: 0.15
Nodes (12): imageArtifact, Metadata, sheetArtifact, CopyIcon(), LineChartIcon(), RedoIcon(), UndoIcon(), ImageEditor() (+4 more)

### Community 41 - "conversation.tsx"
Cohesion: 0.15
Nodes (12): Conversation(), ConversationContent(), ConversationContentProps, ConversationDownload(), ConversationDownloadProps, ConversationEmptyState(), ConversationEmptyStateProps, ConversationMessage (+4 more)

### Community 42 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, check, db:check, db:generate, db:migrate, db:pull, db:push (+6 more)

### Community 43 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, tailwindcss, @tailwindcss/typography, @types/d3-scale, @types/papaparse, @types/pdf-parse, ultracite, tailwindcss (+5 more)

### Community 44 - "slash-commands.tsx"
Cohesion: 0.40
Nodes (4): SlashCommand, SlashCommandMenu(), SlashCommandMenuProps, slashCommands

### Community 45 - "input-group.tsx"
Cohesion: 0.24
Nodes (9): InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput(), InputGroupText(), InputGroupTextarea() (+1 more)

### Community 46 - "ai-elements/suggestion.tsx"
Cohesion: 0.13
Nodes (12): Suggestion(), SuggestionProps, Suggestions(), SuggestionsProps, FnrMark(), FnrWordmark(), Preview(), SuggestedActions (+4 more)

### Community 47 - "toolbar.tsx"
Cohesion: 0.18
Nodes (8): ArrowUpIcon(), StopIcon(), SummarizeIcon(), createFixErrorTool(), PureToolbar(), randomArr, Toolbar, ToolProps

### Community 48 - "create-artifact.tsx"
Cohesion: 0.15
Nodes (13): ArtifactActions, ArtifactActionsProps, PureArtifactActions(), artifactDefinitions, UIArtifact, Artifact, ArtifactAction, ArtifactActionContext (+5 more)

### Community 49 - "models.test.ts"
Cohesion: 0.20
Nodes (9): chatModel, mockFinishReason, mockGenerateResult, mockUsage, reasoningModel, titleGenerateResult, titleModel, getResponseChunksByPrompt() (+1 more)

### Community 51 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 52 - "FNR Moor-Förderportfolio: Aktivitäts- und Wissensübersicht"
Cohesion: 0.22
Nodes (8): 1. Fördertypen und ihr Charakter, 2. Thematische Schwerpunkte des Portfolios, 3. Typische Aktivitäten und Output-Typen, 4. Akteurs- und Institutionsmuster, 5. Regionale Verteilung und Moortypen, 6. Portfolio-Entwicklung und erkennbare Zusammenhänge, 7. Erkennbare Lücken und Randthemen, FNR Moor-Förderportfolio: Aktivitäts- und Wissensübersicht

### Community 53 - "5. Empfohlene Architektur"
Cohesion: 0.22
Nodes (9): 5.1 Gesamtbild, 5.2 Wissensschichten und ihre Repräsentation, 5.4 Retrieval-Architektur: Agentisches iteratives Retrieval, 5.5 Emergentes Komplexitätsrouting und "Plan-First"-Prompt, 5.6 Kontextmanagement und Syntheseebene, 5.7 Modell- und Promptingstrategie, 5.8 Antwortstruktur und Quellentransparenz, 5.9 Lückenidentifikation (F4) (+1 more)

### Community 54 - "chat/schema.ts"
Cohesion: 0.25
Nodes (7): filePartSchema, partSchema, PostRequestBody, postRequestBodySchema, textPartSchema, toolApprovalMessageSchema, userMessageSchema

### Community 55 - "weather.tsx"
Cohesion: 0.29
Nodes (4): n(), SAMPLE, Weather(), WeatherAtLocation

### Community 57 - "Product Requirements Document"
Cohesion: 0.25
Nodes (7): 13. Zusammenfassung: Was hier kritisch ist, 1. Zweck dieses Dokuments, 5.1 Kernkonzept, 5.2 Abgrenzung: Was der Agent NICHT ist, 5. Produktvision: Was genau wird gebaut, FNR Moor-Intelligence Agent, Product Requirements Document

### Community 58 - "11. Kritische offene Fragen"
Cohesion: 0.29
Nodes (7): 11. Kritische offene Fragen, F1 (Kritisch – blockiert technische Architektur), F2 (Kritisch – bestimmt Produktschnitt), F3 (Kritisch – Datenschutz und IT-Governance), F4 (Wichtig – Scope-Definition), F5 (Wichtig – Abgrenzung), F6 (Mittel – aber zeitkritisch für MVP)

### Community 59 - "Technical Design Document"
Cohesion: 0.29
Nodes (6): 10. Architekturbewertungsmatrix, 6. Komponenten, die bewusst NICHT benötigt werden, Anhang: Glossar technischer Konzepte, FNR Moor-Intelligence Agent, Kurzfassung, Technical Design Document

### Community 60 - "4. Architekturoptionen und Trade-off-Analyse"
Cohesion: 0.29
Nodes (7): 4.1 Option A: Single-Pass semantische Suche, 4.2 Option B: Agentisches iteratives Retrieval (mit optionalem BM25-Hybrid), 4.3 Option C: Long-Context-Stuffing, 4.4 Option D: Agentische Deep-Research-Schleife, 4.5 Option E: Vorberechnete Wissensstruktur (Offline-Index), 4.6 Option F: Hybride Drei-Schichten-Architektur (Empfehlung), 4. Architekturoptionen und Trade-off-Analyse

### Community 61 - "5.3 Corpus Index – Aufbau, Datenmodell und Querybarkeit"
Cohesion: 0.29
Nodes (7): 5.3.1 Zwei-Schichten-Konzept, 5.3.2 Extraktionspipeline: PDF → Corpus Index, 5.3.3 Kosten der Indexerstellung, 5.3.4 Querybarkeit zur Laufzeit, 5.3.5 Was der Corpus Index leistet — und was nicht, 5.3.6 Kritisches Risiko: Vokabular-Konsistenz, 5.3 Corpus Index – Aufbau, Datenmodell und Querybarkeit

### Community 62 - "8. Technische Risiken"
Cohesion: 0.29
Nodes (7): 8. Technische Risiken, Risiko 1: Datensouveränität blockiert beste Modellwahl (Kritisch), Risiko 2: Korpus-Heterogenität untergräbt Retrieval-Qualität (Hoch), Risiko 3: Halluzination bei fehlenden Corpus-Belegen (Hoch), Risiko 4: Vertrauensverlust durch frühe schlechte Antworten (Mittel), Risiko 5: Vokabular-Inkonsistenz im Corpus Index (Mittel), Risiko 6: Institutionelle Sensibilität bei Projektbewertung (Mittel)

### Community 63 - "multimodal-input.tsx"
Cohesion: 0.10
Nodes (19): ModelSelectorContent(), ModelSelectorGroup(), ModelSelectorInput(), ModelSelectorItem(), ModelSelectorList(), ModelSelectorLogo(), ModelSelectorTrigger(), CrossSmallIcon() (+11 more)

### Community 64 - "README.md"
Cohesion: 0.33
Nodes (5): AI Gateway Authentication, Deploy Your Own, Features, Model Providers, Running locally

### Community 65 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 66 - "10. Technische und produktseitige Risiken"
Cohesion: 0.33
Nodes (6): 10. Technische und produktseitige Risiken, Risiko 1: Datenlage (hoch), Risiko 2: Halluzination in einem Niedrig-Feedback-Kontext (hoch), Risiko 3: Überinterpretation von Projektergebnissen (mittel), Risiko 4: Vertrauensaufbau braucht Zeit (mittel), Risiko 5: Institutionelle Sensibilität (mittel)

### Community 67 - "7. Kritische technische Hebel"
Cohesion: 0.33
Nodes (6): 7. Kritische technische Hebel, Hebel 1: Tool-Design und Retrieval-Qualität (Rang 1, höchster Einfluss), Hebel 2: Institutioneller Kontextrahmen (Rang 2), Hebel 3: Quellenverankerung im Prompt-Design (Rang 3), Hebel 4: Evaluierungsrahmen (Rang 4, strategisch entscheidend), Hebel 5: Chunk-Strategie und Metadaten-Vollständigkeit (Rang 5)

### Community 68 - "9. Offene Architekturfragen"
Cohesion: 0.33
Nodes (6): 9. Offene Architekturfragen, AF1 (Blockierend): Datensouveränität und LLM-Provider, AF2 (Blockierend): Corpus-Umfang und -Qualität, AF3 (Wichtig): Interface und Integrationspunkt, AF4 (Wichtig): Externe Quellen, AF5 (Mittel): Aktualisierungsfrequenz des Corpus

### Community 69 - "package.json"
Cohesion: 0.40
Nodes (4): name, packageManager, private, version

### Community 70 - "3. Institutioneller und fachlicher Kontext"
Cohesion: 0.40
Nodes (5): 3.1 Die FNR: Rolle und Arbeitslogik, 3.2 Die institutionelle Komplexität: Zwei Ministerien, ein Thema, 3.3 Fachlicher Kontext: Moorschutz in Deutschland, 3.4 Das wissenschaftliche Ökosystem, 3. Institutioneller und fachlicher Kontext

### Community 71 - "6. Wissensarchitektur: Vier Wissenstypen"
Cohesion: 0.40
Nodes (5): 6. Wissensarchitektur: Vier Wissenstypen, Typ 1: Strukturiertes Projektwissen (primäre Datengrundlage), Typ 2: Institutionelles Kontextwissen (einzubettendes Systemwissen), Typ 3: Fachwissenschaftliches Grundwissen (Domänenmodell), Typ 4: Metawissen über den Projektkorpus (emergierende Ebene)

### Community 72 - "1. Anforderungsanalyse"
Cohesion: 0.40
Nodes (5): 1.1 Kernziele des Systems, 1.2 Nutzerprofil und Entscheidungstypen, 1.3 Abgeleitete Systemfähigkeiten, 1.4 Kritische Qualitätsanforderungen, 1. Anforderungsanalyse

### Community 73 - "3. Fundamentales Systemmodell"
Cohesion: 0.40
Nodes (5): 3.1 Wie Verständnis entsteht, 3.2 Wie Synthese über viele Dokumente entsteht, 3.3 Wie Quellentransparenz gewährleistet wird, 3.4 Wie Verlässlichkeit und Konsistenz entstehen, 3. Fundamentales Systemmodell

### Community 74 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 75 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 76 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 77 - "12. Priorisierung und MVP-Empfehlung"
Cohesion: 0.50
Nodes (4): 12. Priorisierung und MVP-Empfehlung, MVP (Phase 1): Domänenwissen + strukturierte Dokumentenabfrage, Phase 2: Metaebene und Corpus-Vollständigkeit, Phase 3: Entscheidungsunterstützung

### Community 78 - "2. Situationsanalyse: Das eigentliche Problem"
Cohesion: 0.50
Nodes (4): 2.1 Was hier nicht gebaut wird, 2.2 Was das eigentliche Problem ist, 2.3 Die eigentliche Aufgabe des Agents, 2. Situationsanalyse: Das eigentliche Problem

### Community 79 - "4. Nutzerprofil und Entscheidungsbedarfe"
Cohesion: 0.50
Nodes (4): 4.1 Primäre Nutzer: FNR-Fachreferenten und Projektbetreuer, 4.2 Sekundäre Nutzer: BMLEH-Referenten (ministerielle Ebene), 4.3 Entscheidungstypen, die das Produkt besser machen soll, 4. Nutzerprofil und Entscheidungsbedarfe

### Community 80 - "7. Kernfunktionen des Agents (nach Priorität)"
Cohesion: 0.50
Nodes (4): 7. Kernfunktionen des Agents (nach Priorität), Prio 1 – Kernfunktionen (Produktreife ohne diese nicht sinnvoll), Prio 2 – Erweiterungsfunktionen (klar nützlich, aber nicht blockierend), Prio 3 – Zukunftsfunktionen (nach erfolgreicher Prio-1-Implementierung)

### Community 81 - "8. Qualitätsanforderungen an Antworten"
Cohesion: 0.50
Nodes (4): 8.1 Antwortqualität, 8.2 Antwortform, 8.3 Vertrauenswürdigkeit als Systemeigenschaft, 8. Qualitätsanforderungen an Antworten

### Community 82 - "2. Stand der Technik: Agentensysteme 2026"
Cohesion: 0.50
Nodes (4): 2.1 Was sich empirisch bewährt hat, 2.2 Was häufig überschätzt wird, 2.3 Kritische technische Hebel (empirisch rangiert), 2. Stand der Technik: Agentensysteme 2026

### Community 86 - "9. Systemgrenzen und kritische Einschränkungen"
Cohesion: 0.67
Nodes (3): 9. Systemgrenzen und kritische Einschränkungen, Was der Agent explizit NICHT leisten soll, Wichtige technische Einschränkungen

## Knowledge Gaps
- **569 isolated node(s):** `authFormSchema`, `forgotPasswordFormSchema`, `resetPasswordFormSchema`, `UserType`, `next-auth` (+564 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **78 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `prompt-input.tsx`, `model-selector.tsx`, `ai-elements/message.tsx`, `code-block.tsx`, `icons.tsx`, `sidebar.tsx`, `lib/utils.ts`, `sidebar-history-item.tsx`, `toast.tsx`, `tool.tsx`, `command.tsx`, `code/client.tsx`, `chat/message.tsx`, `document-preview.tsx`, `shimmer.tsx`, `reasoning.tsx`, `messages.tsx`, `sheet/client.tsx`, `conversation.tsx`, `slash-commands.tsx`, `input-group.tsx`, `ai-elements/suggestion.tsx`, `create-artifact.tsx`, `multimodal-input.tsx`?**
  _High betweenness centrality (0.188) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `radix-ui`, `@radix-ui/react-use-controllable-state`, `react-data-grid`, `react-dom`, `redis`, `resumable-stream`, `diff.js`, `server-only`, `shiki`, `sonner`, `streamdown`, `@streamdown/cjk`, `sidebar.tsx`, `@streamdown/code`, `@streamdown/math`, `@streamdown/mermaid`, `swr`, `tailwind-merge`, `resend`, `04_rag_pipeline.py`, `tailwindcss-animate`, `use-stick-to-bottom`, `@vercel/analytics`, `@vercel/blob`, `@vercel/functions`, `@vercel/otel`, `ai`, `package.json`, `@ai-sdk/google-vertex`, `@codemirror/state`, `bcrypt-ts`, `botid`, `class-variance-authority`, `classnames`, `clsx`, `@codemirror/view`, `framer-motion`, `@codemirror/lang-python`, `@codemirror/theme-one-dark`, `date-fns`, `motion`, `fast-deep-equal`, `katex`, `lucide-react`, `nanoid`, `next`, `next-auth`, `next-themes`, `@openrouter/ai-sdk-provider`, `@opentelemetry/api`, `@opentelemetry/api-logs`, `orderedmap`, `papaparse`, `postgres`, `prosemirror-example-setup`, `prosemirror-inputrules`, `prosemirror-markdown`, `prosemirror-schema-basic`, `prosemirror-schema-list`, `prosemirror-model`, `prosemirror-view`?**
  _High betweenness centrality (0.162) - this node is a cross-community bridge._
- **Why does `react` connect `sidebar.tsx` to `dependencies`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **What connects `authFormSchema`, `forgotPasswordFormSchema`, `resetPasswordFormSchema` to the rest of the system?**
  _569 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prompt-input.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0344988344988345 - nodes in this community are weakly interconnected._
- **Should `model-selector.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `02_enrich.py` be split into smaller, more focused modules?**
  _Cohesion score 0.07510204081632653 - nodes in this community are weakly interconnected._