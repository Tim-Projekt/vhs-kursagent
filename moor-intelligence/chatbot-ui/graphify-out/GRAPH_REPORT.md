# Graph Report - chatbot-ui  (2026-07-30)

## Corpus Check
- 174 files · ~68,501 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1281 nodes · 2614 edges · 147 communities (75 shown, 72 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6ad423c0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- (auth)/actions.ts
- prompt-input.tsx
- ai-elements/message.tsx
- cn
- code-block.tsx
- types.ts
- diff.js
- sidebar.tsx
- compilerOptions
- chat/route.ts
- use-active-chat.tsx
- model-selector.tsx
- queries.ts
- text-editor.tsx
- multimodal-input.tsx
- app-sidebar.tsx
- artifact.tsx
- code/client.tsx
- artifacts/server.ts
- tool.tsx
- ChatPage
- dependencies
- sheet/client.tsx
- components.json
- sidebar-history-item.tsx
- messages.tsx
- (chat)/actions.ts
- reasoning.tsx
- create-artifact.tsx
- document-preview.tsx
- lib/utils.ts
- conversation.tsx
- scripts
- models.ts
- devDependencies
- button.tsx
- input-group.tsx
- document/route.ts
- ai-elements/suggestion.tsx
- useSidebar
- toolbar.tsx
- getChatById
- select.tsx
- models.test.ts
- document.tsx
- visibility-selector.tsx
- chat/schema.ts
- weather.tsx
- models.mock.ts
- text/client.tsx
- shimmer.tsx
- chat/message.tsx
- button-group.tsx
- preview.tsx
- sidebar-user-nav.tsx
- README.md
- toast.tsx
- package.json
- preview-attachment.tsx
- hover-card.tsx
- @ai-sdk/google-vertex
- @ai-sdk/react
- @biomejs/biome
- botid
- class-variance-authority
- classnames
- clsx
- cmdk
- codemirror
- @codemirror/state
- @codemirror/theme-one-dark
- @codemirror/view
- date-fns
- dotenv
- drizzle-kit
- fast-deep-equal
- framer-motion
- katex
- lucide-react
- motion
- nanoid
- next
- next-auth
- next.config.ts
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
- prosemirror-model
- prosemirror-schema-list
- prosemirror-state
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
- usehooks-ts
- @vercel/blob
- @vercel/functions
- @vercel/otel
- @playwright/test
- postcss
- @tailwindcss/postcss
- @tailwindcss/typography
- @types/d3-scale
- @types/node
- @types/react
- @types/react-dom
- typescript
- postcss.config.mjs
- vercel.json
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
9. `toast()` - 14 edges
10. `scripts` - 14 edges

## Surprising Connections (you probably didn't know these)
- `CodeBlockContainer()` --calls--> `cn()`  [EXTRACTED]
  components/ai-elements/code-block.tsx → lib/utils.ts
- `CodeBlockHeader()` --calls--> `cn()`  [EXTRACTED]
  components/ai-elements/code-block.tsx → lib/utils.ts
- `CodeBlockTitle()` --calls--> `cn()`  [EXTRACTED]
  components/ai-elements/code-block.tsx → lib/utils.ts
- `CodeBlockFilename()` --calls--> `cn()`  [EXTRACTED]
  components/ai-elements/code-block.tsx → lib/utils.ts
- `CodeBlockActions()` --calls--> `cn()`  [EXTRACTED]
  components/ai-elements/code-block.tsx → lib/utils.ts

## Import Cycles
- 3-file cycle: `components/chat/artifact.tsx -> components/chat/toolbar.tsx -> components/chat/create-artifact.tsx -> components/chat/artifact.tsx`
- 3-file cycle: `components/chat/sidebar-history-item.tsx -> hooks/use-chat-visibility.ts -> components/chat/sidebar-history.tsx -> components/chat/sidebar-history-item.tsx`
- 3-file cycle: `artifacts/text/client.tsx -> components/chat/document-skeleton.tsx -> components/chat/artifact.tsx -> artifacts/text/client.tsx`
- 3-file cycle: `artifacts/code/client.tsx -> components/chat/create-artifact.tsx -> components/chat/artifact.tsx -> artifacts/code/client.tsx`
- 3-file cycle: `artifacts/image/client.tsx -> components/chat/create-artifact.tsx -> components/chat/artifact.tsx -> artifacts/image/client.tsx`
- 3-file cycle: `artifacts/sheet/client.tsx -> components/chat/create-artifact.tsx -> components/chat/artifact.tsx -> artifacts/sheet/client.tsx`
- 3-file cycle: `artifacts/text/client.tsx -> components/chat/create-artifact.tsx -> components/chat/artifact.tsx -> artifacts/text/client.tsx`
- 3-file cycle: `components/chat/artifact-actions.tsx -> components/chat/create-artifact.tsx -> components/chat/artifact.tsx -> components/chat/artifact-actions.tsx`
- 3-file cycle: `app/(chat)/actions.ts -> components/chat/visibility-selector.tsx -> hooks/use-chat-visibility.ts -> app/(chat)/actions.ts`
- 4-file cycle: `app/(chat)/actions.ts -> lib/db/queries.ts -> components/chat/visibility-selector.tsx -> hooks/use-chat-visibility.ts -> app/(chat)/actions.ts`
- 4-file cycle: `artifacts/actions.ts -> lib/db/queries.ts -> components/chat/artifact.tsx -> artifacts/text/client.tsx -> artifacts/actions.ts`
- 5-file cycle: `app/(auth)/auth.ts -> lib/db/queries.ts -> components/chat/visibility-selector.tsx -> hooks/use-chat-visibility.ts -> app/(chat)/actions.ts -> app/(auth)/auth.ts`
- 5-file cycle: `app/(chat)/actions.ts -> lib/ai/prompts.ts -> components/chat/artifact.tsx -> components/chat/visibility-selector.tsx -> hooks/use-chat-visibility.ts -> app/(chat)/actions.ts`
- 5-file cycle: `app/(chat)/actions.ts -> lib/db/queries.ts -> components/chat/artifact.tsx -> components/chat/visibility-selector.tsx -> hooks/use-chat-visibility.ts -> app/(chat)/actions.ts`

## Communities (147 total, 72 thin omitted)

### Community 0 - "(auth)/actions.ts"
Cohesion: 0.05
Nodes (49): authFormSchema, ForgotPasswordActionState, forgotPasswordFormSchema, login(), LoginActionState, register(), RegisterActionState, requestPasswordReset() (+41 more)

### Community 1 - "prompt-input.tsx"
Cohesion: 0.04
Nodes (51): AttachmentsContext, convertBlobUrlToDataUrl(), LocalAttachmentsContext, LocalReferencedSourcesContext, PromptInput(), PromptInputActionAddAttachments(), PromptInputActionAddAttachmentsProps, PromptInputActionMenuContentProps (+43 more)

### Community 2 - "ai-elements/message.tsx"
Cohesion: 0.06
Nodes (37): geist, geistMono, metadata, viewport, Message(), MessageAction(), MessageActionProps, MessageActions() (+29 more)

### Community 3 - "cn"
Cohesion: 0.06
Nodes (41): PromptInputActionMenuContent(), PromptInputActionMenuItem(), PromptInputBody(), PromptInputButton(), PromptInputCommand(), PromptInputCommandEmpty(), PromptInputCommandGroup(), PromptInputCommandInput() (+33 more)

### Community 4 - "code-block.tsx"
Cohesion: 0.06
Nodes (34): CodeBlock(), CodeBlockActions(), CodeBlockBody, CodeBlockContainer(), CodeBlockContent(), CodeBlockContext, CodeBlockContextType, CodeBlockCopyButton() (+26 more)

### Community 5 - "types.ts"
Cohesion: 0.06
Nodes (24): getWeather, AVAILABLE_TOPICS, FKZ_TOPIC_MAP, PineconeMatch, searchFnrProjects, Topic, KNOWN_PORTALS, PAGE_TYPES (+16 more)

### Community 6 - "diff.js"
Cohesion: 0.12
Nodes (33): MessageResponse, computeDiff(), DiffEditorProps, diffSchema, DiffView(), diff-match-patch, assertNodeTypeEqual(), computeChildEqualityFactor() (+25 more)

### Community 7 - "sidebar.tsx"
Cohesion: 0.08
Nodes (28): Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetTitle(), SidebarContent() (+20 more)

### Community 8 - "compilerOptions"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, next.config.js, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+21 more)

### Community 9 - "chat/route.ts"
Cohesion: 0.16
Nodes (21): DELETE(), POST(), getLanguageModel(), createDocument(), CreateDocumentProps, requestSuggestions(), RequestSuggestionsProps, updateDocument() (+13 more)

### Community 10 - "use-active-chat.tsx"
Cohesion: 0.13
Nodes (19): AppSidebar(), DataStreamContext, DataStreamContextValue, DataStreamProvider(), useDataStream(), ChatShell(), ChatHistory, getChatHistoryPaginationKey() (+11 more)

### Community 12 - "model-selector.tsx"
Cohesion: 0.09
Nodes (19): ModelSelectorContentProps, ModelSelectorEmptyProps, ModelSelectorGroup(), ModelSelectorGroupProps, ModelSelectorInputProps, ModelSelectorItemProps, ModelSelectorListProps, ModelSelectorLogoGroup() (+11 more)

### Community 13 - "queries.ts"
Cohesion: 0.14
Nodes (18): DELETE(), GET(), GET(), getSuggestions(), client, createGuestUser(), createStreamId(), db (+10 more)

### Community 14 - "text-editor.tsx"
Cohesion: 0.18
Nodes (18): CrossIcon(), SparklesIcon(), SuggestionDialog(), EditorProps, PureEditor(), Suggestion, documentSchema, handleTransaction() (+10 more)

### Community 15 - "multimodal-input.tsx"
Cohesion: 0.10
Nodes (20): ModelSelector(), ModelSelectorContent(), ModelSelectorInput(), ModelSelectorItem(), ModelSelectorList(), ModelSelectorLogo(), ModelSelectorName(), PaperclipIcon() (+12 more)

### Community 16 - "app-sidebar.tsx"
Cohesion: 0.22
Nodes (16): groupChatsByDate(), GroupedChats, SidebarHistory(), AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription() (+8 more)

### Community 17 - "artifact.tsx"
Cohesion: 0.19
Nodes (16): Artifact, artifactDefinitions, ArtifactCloseButton, PureArtifactCloseButton(), PureArtifact(), UIArtifact, DataStreamHandler(), DocumentContent() (+8 more)

### Community 18 - "code/client.tsx"
Cohesion: 0.14
Nodes (13): codeArtifact, Metadata, OUTPUT_HANDLERS, CodeEditor, EditorProps, Console(), ConsoleOutput, ConsoleOutputContent (+5 more)

### Community 19 - "artifacts/server.ts"
Cohesion: 0.19
Nodes (12): codeDocumentHandler, sheetDocumentHandler, textDocumentHandler, getRequestPromptFromHints(), RequestHints, systemPrompt(), updateDocumentPrompt(), CreateDocumentCallbackProps (+4 more)

### Community 20 - "tool.tsx"
Cohesion: 0.15
Nodes (15): getStatusBadge(), statusIcons, statusLabels, ToolContentProps, ToolHeader(), ToolHeaderProps, ToolInputProps, ToolOutputProps (+7 more)

### Community 21 - "ChatPage"
Cohesion: 0.15
Nodes (3): Fixtures, test, ChatPage

### Community 22 - "dependencies"
Cohesion: 0.12
Nodes (17): ai, @ai-sdk/provider, bcrypt-ts, @codemirror/lang-python, drizzle-orm, dependencies, ai, @ai-sdk/provider (+9 more)

### Community 23 - "sheet/client.tsx"
Cohesion: 0.15
Nodes (12): imageArtifact, Metadata, sheetArtifact, CopyIcon(), LineChartIcon(), RedoIcon(), UndoIcon(), ImageEditor() (+4 more)

### Community 24 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 25 - "sidebar-history-item.tsx"
Cohesion: 0.15
Nodes (13): MoreHorizontalIcon(), ShareIcon(), TrashIcon(), ChatItem, DropdownMenuCheckboxItem(), DropdownMenuLabel(), DropdownMenuPortal(), DropdownMenuRadioItem() (+5 more)

### Community 26 - "messages.tsx"
Cohesion: 0.20
Nodes (10): ArtifactMessages, ArtifactMessagesProps, PureArtifactMessages(), Greeting(), ThinkingMessage(), MessagesProps, PureMessages(), useMessages() (+2 more)

### Community 27 - "(chat)/actions.ts"
Cohesion: 0.23
Nodes (11): deleteTrailingMessages(), generateTitleFromUserMessage(), updateChatVisibility(), submitEditedMessage(), titleModel, getTitleModel(), openrouter, deleteMessagesByChatIdAfterTimestamp() (+3 more)

### Community 28 - "reasoning.tsx"
Cohesion: 0.16
Nodes (11): Reasoning, ReasoningContent, ReasoningContentProps, ReasoningContext, ReasoningContextValue, ReasoningProps, ReasoningTrigger, ReasoningTriggerProps (+3 more)

### Community 29 - "create-artifact.tsx"
Cohesion: 0.15
Nodes (12): ArtifactActions, ArtifactActionsProps, PureArtifactActions(), Artifact, ArtifactAction, ArtifactActionContext, ArtifactConfig, ArtifactContent (+4 more)

### Community 30 - "document-preview.tsx"
Cohesion: 0.15
Nodes (10): ArtifactKind, DocumentHeader, DocumentPreviewProps, DocumentToolOutput, HitboxLayer, DocumentSkeleton(), InlineDocumentSkeleton(), CodeIcon() (+2 more)

### Community 31 - "lib/utils.ts"
Cohesion: 0.21
Nodes (10): ChatbotError, ErrorCode, ErrorType, ErrorVisibility, getMessageByErrorCode(), getStatusCodeByType(), Surface, visibilityBySurface (+2 more)

### Community 32 - "conversation.tsx"
Cohesion: 0.15
Nodes (12): Conversation(), ConversationContent(), ConversationContentProps, ConversationDownload(), ConversationDownloadProps, ConversationEmptyState(), ConversationEmptyStateProps, ConversationMessage (+4 more)

### Community 33 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, check, db:check, db:generate, db:migrate, db:pull, db:push (+6 more)

### Community 34 - "models.ts"
Cohesion: 0.21
Nodes (10): GET(), allowedModelIds, ChatModel, chatModels, GatewayModel, GatewayModelWithCapabilities, getAllGatewayModels(), getCapabilities() (+2 more)

### Community 35 - "devDependencies"
Cohesion: 0.15
Nodes (13): babel-plugin-react-compiler, devDependencies, babel-plugin-react-compiler, tailwindcss, tsx, @types/papaparse, @types/pdf-parse, ultracite (+5 more)

### Community 36 - "button.tsx"
Cohesion: 0.19
Nodes (7): ChatHeader, FnrMark(), Button(), buttonVariants, Dialog(), DialogFooter(), DialogOverlay()

### Community 37 - "input-group.tsx"
Cohesion: 0.21
Nodes (10): InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput(), InputGroupText(), InputGroupTextarea() (+2 more)

### Community 38 - "document/route.ts"
Cohesion: 0.27
Nodes (10): DELETE(), documentSchema, GET(), POST(), editDocument(), EditDocumentProps, deleteDocumentsByIdAfterTimestamp(), getDocumentsById() (+2 more)

### Community 39 - "ai-elements/suggestion.tsx"
Cohesion: 0.21
Nodes (8): Suggestion(), SuggestionProps, Suggestions(), SuggestionsProps, SuggestedActions, SuggestedActionsProps, ScrollArea(), ScrollBar()

### Community 40 - "useSidebar"
Cohesion: 0.24
Nodes (10): PureChatHeader(), SidebarLeftIcon(), SidebarToggle(), Sidebar(), SidebarRail(), SidebarTrigger(), useSidebar(), Tooltip() (+2 more)

### Community 41 - "toolbar.tsx"
Cohesion: 0.18
Nodes (8): ArrowUpIcon(), StopIcon(), SummarizeIcon(), createFixErrorTool(), PureToolbar(), randomArr, Toolbar, ToolProps

### Community 42 - "getChatById"
Cohesion: 0.31
Nodes (9): GET(), GET(), PATCH(), voteSchema, getChatById(), getMessagesByChatId(), getVotesByChatId(), voteMessage() (+1 more)

### Community 43 - "select.tsx"
Cohesion: 0.18
Nodes (10): Select(), SelectContent(), SelectGroup(), SelectItem(), SelectLabel(), SelectScrollDownButton(), SelectScrollUpButton(), SelectSeparator() (+2 more)

### Community 44 - "models.test.ts"
Cohesion: 0.20
Nodes (9): chatModel, mockFinishReason, mockGenerateResult, mockUsage, reasoningModel, titleGenerateResult, titleModel, getResponseChunksByPrompt() (+1 more)

### Community 45 - "document.tsx"
Cohesion: 0.28
Nodes (8): DocumentToolCall, DocumentToolCallProps, DocumentToolResult, DocumentToolResultProps, getActionText(), PureDocumentToolCall(), PureDocumentToolResult(), FileIcon()

### Community 46 - "visibility-selector.tsx"
Cohesion: 0.25
Nodes (8): ChevronDownIcon(), GlobeIcon(), LockIcon(), PureChatItem(), visibilities, VisibilitySelector(), DropdownMenu(), useChatVisibility()

### Community 47 - "chat/schema.ts"
Cohesion: 0.25
Nodes (7): filePartSchema, partSchema, PostRequestBody, postRequestBodySchema, textPartSchema, toolApprovalMessageSchema, userMessageSchema

### Community 48 - "weather.tsx"
Cohesion: 0.29
Nodes (4): n(), SAMPLE, Weather(), WeatherAtLocation

### Community 49 - "models.mock.ts"
Cohesion: 0.29
Nodes (6): chatModel, createMockModel(), getResponseForPrompt(), mockResponses, mockUsage, titleModel

### Community 50 - "text/client.tsx"
Cohesion: 0.29
Nodes (6): textArtifact, TextArtifactMetadata, ClockRewind(), MessageIcon(), PenIcon(), Editor

### Community 51 - "shimmer.tsx"
Cohesion: 0.33
Nodes (6): getMotionComponent(), motionComponentCache, MotionHTMLProps, Shimmer, ShimmerComponent(), TextShimmerProps

### Community 52 - "chat/message.tsx"
Cohesion: 0.33
Nodes (6): Tool(), ToolContent(), ToolInput(), ToolOutput(), PurePreviewMessage(), sanitizeText()

### Community 53 - "button-group.tsx"
Cohesion: 0.38
Nodes (5): ButtonGroup(), ButtonGroupSeparator(), ButtonGroupText(), buttonGroupVariants, Separator()

### Community 54 - "preview.tsx"
Cohesion: 0.40
Nodes (3): FnrWordmark(), Preview(), suggestions

### Community 55 - "sidebar-user-nav.tsx"
Cohesion: 0.40
Nodes (5): emailToHue(), SidebarUserNav(), DropdownMenuSeparator(), DropdownMenuTrigger(), SidebarMenuItem()

### Community 56 - "README.md"
Cohesion: 0.33
Nodes (5): AI Gateway Authentication, Deploy Your Own, Features, Model Providers, Running locally

### Community 57 - "toast.tsx"
Cohesion: 0.40
Nodes (4): CheckCircleFillIcon(), WarningIcon(), iconsByType, ToastProps

### Community 58 - "package.json"
Cohesion: 0.40
Nodes (4): name, packageManager, private, version

### Community 59 - "preview-attachment.tsx"
Cohesion: 0.50
Nodes (3): CrossSmallIcon(), PreviewAttachment(), Attachment

### Community 60 - "hover-card.tsx"
Cohesion: 0.50
Nodes (3): HoverCard(), HoverCardContent(), HoverCardTrigger()

## Knowledge Gaps
- **384 isolated node(s):** `authFormSchema`, `forgotPasswordFormSchema`, `resetPasswordFormSchema`, `UserType`, `next-auth` (+379 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **72 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `(auth)/actions.ts`, `prompt-input.tsx`, `ai-elements/message.tsx`, `code-block.tsx`, `sidebar.tsx`, `use-active-chat.tsx`, `model-selector.tsx`, `multimodal-input.tsx`, `app-sidebar.tsx`, `artifact.tsx`, `code/client.tsx`, `tool.tsx`, `sheet/client.tsx`, `sidebar-history-item.tsx`, `messages.tsx`, `reasoning.tsx`, `create-artifact.tsx`, `document-preview.tsx`, `lib/utils.ts`, `conversation.tsx`, `button.tsx`, `input-group.tsx`, `ai-elements/suggestion.tsx`, `useSidebar`, `select.tsx`, `visibility-selector.tsx`, `shimmer.tsx`, `chat/message.tsx`, `button-group.tsx`, `sidebar-user-nav.tsx`, `toast.tsx`, `hover-card.tsx`?**
  _High betweenness centrality (0.296) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `diff.js`, `sidebar.tsx`, `package.json`, `@ai-sdk/google-vertex`, `@ai-sdk/react`, `botid`, `class-variance-authority`, `classnames`, `clsx`, `cmdk`, `codemirror`, `@codemirror/state`, `@codemirror/theme-one-dark`, `@codemirror/view`, `date-fns`, `dotenv`, `fast-deep-equal`, `framer-motion`, `katex`, `lucide-react`, `motion`, `nanoid`, `next`, `next-auth`, `next-themes`, `@openrouter/ai-sdk-provider`, `@opentelemetry/api`, `@opentelemetry/api-logs`, `orderedmap`, `papaparse`, `postgres`, `prosemirror-example-setup`, `prosemirror-inputrules`, `prosemirror-markdown`, `prosemirror-model`, `prosemirror-schema-list`, `prosemirror-state`, `prosemirror-view`, `radix-ui`, `@radix-ui/react-use-controllable-state`, `react-data-grid`, `react-dom`, `redis`, `resumable-stream`, `server-only`, `shiki`, `sonner`, `streamdown`, `@streamdown/cjk`, `@streamdown/code`, `@streamdown/math`, `@streamdown/mermaid`, `swr`, `tailwind-merge`, `tailwindcss-animate`, `use-stick-to-bottom`, `usehooks-ts`, `@vercel/blob`, `@vercel/functions`, `@vercel/otel`?**
  _High betweenness centrality (0.242) - this node is a cross-community bridge._
- **Why does `react` connect `sidebar.tsx` to `useSidebar`, `dependencies`?**
  _High betweenness centrality (0.217) - this node is a cross-community bridge._
- **What connects `authFormSchema`, `forgotPasswordFormSchema`, `resetPasswordFormSchema` to the rest of the system?**
  _384 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `(auth)/actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0532724505327245 - nodes in this community are weakly interconnected._
- **Should `prompt-input.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.035430988894764676 - nodes in this community are weakly interconnected._
- **Should `ai-elements/message.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05537098560354374 - nodes in this community are weakly interconnected._