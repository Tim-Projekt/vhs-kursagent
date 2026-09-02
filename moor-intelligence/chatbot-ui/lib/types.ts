import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/chat/artifact";
import type { createDocument } from "./ai/tools/create-document";
import type { editDocument } from "./ai/tools/edit-document";
import type { getWeather } from "./ai/tools/get-weather";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { searchFnrProjects } from "./ai/tools/search-fnr-projects";
import type { searchFnrWebsite } from "./ai/tools/search-fnr-website";
import type { updateDocument } from "./ai/tools/update-document";
import type { searchWeb } from "./ai/tools/web-search";
import type { Suggestion } from "./db/schema";

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<ReturnType<typeof requestSuggestions>>;
type searchFnrProjectsTool = InferUITool<typeof searchFnrProjects>;
type searchFnrWebsiteTool = InferUITool<typeof searchFnrWebsite>;
type searchWebTool = InferUITool<typeof searchWeb>;
type editDocumentTool = InferUITool<ReturnType<typeof editDocument>>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  searchFnrProjects: searchFnrProjectsTool;
  searchFnrWebsite: searchFnrWebsiteTool;
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
