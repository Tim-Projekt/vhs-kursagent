import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/chat/artifact";
import type { createDocument } from "./ai/tools/create-document";
import type { editDocument } from "./ai/tools/edit-document";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { searchVhsCourses } from "./ai/tools/search-vhs-courses";
import type { updateDocument } from "./ai/tools/update-document";
import type { searchWeb } from "./ai/tools/web-search";
import type { Suggestion } from "./db/schema";

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<ReturnType<typeof requestSuggestions>>;
type searchVhsCoursesTool = InferUITool<typeof searchVhsCourses>;
type searchWebTool = InferUITool<typeof searchWeb>;
type editDocumentTool = InferUITool<ReturnType<typeof editDocument>>;

export type ChatTools = {
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  searchVhsCourses: searchVhsCoursesTool;
  searchWeb: searchWebTool;
  editDocument: editDocumentTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  "chat-title": string;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
