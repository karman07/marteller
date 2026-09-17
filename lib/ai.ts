import { request } from "./http";
import { Channel } from "./channels";

export type AiModelId =
  | "gpt-4o-mini"
  | "gpt-4o"
  | "claude-haiku-4-5"
  | "claude-sonnet-5"
  | "claude-opus-5"
  | "gemini-2-0-flash"
  | "gemini-2-5-pro"
  | "grok-3-mini"
  | "grok-3"
  | "deepseek-v3"
  | "deepseek-r1";
export type AiProvider = "anthropic" | "openai" | "google" | "xai" | "deepseek";
export type KeyMode = "own_key" | "managed_credits";
export type DataSourceType = "file" | "text" | "url";
export type DataSourceStatus = "processing" | "ready";

export type AiModel = {
  id: AiModelId;
  provider: AiProvider;
  label: string;
  ratePer1kTokensPaise: number;
};

export const AI_PROVIDERS: { id: AiProvider; label: string }[] = [
  { id: "anthropic", label: "Anthropic" },
  { id: "openai", label: "OpenAI" },
  { id: "google", label: "Google" },
  { id: "xai", label: "xAI" },
  { id: "deepseek", label: "DeepSeek" },
];

export type DataSource = {
  _id: string;
  name: string;
  type: DataSourceType;
  status: DataSourceStatus;
  addedAt: string;
};

// A saved key's raw value never comes back from the API — only enough to
// recognize it (masked) plus when it was last set.
export type OwnApiKeyEntry = {
  provider: AiProvider;
  maskedKey: string;
  updatedAt: string;
};

export type AiConfig = {
  selectedModel: AiModelId;
  keyMode: KeyMode;
  ownApiKeys: OwnApiKeyEntry[];
  dataSources: DataSource[];
  autoReplyChannels: Channel[];
  // Channels where the AI's reply is sent to the customer automatically —
  // if a channel is in autoReplyChannels but not here, the reply is drafted
  // and held for the user to approve first (see InboundMessage.replyStatus).
  autoSendChannels: Channel[];
  systemPrompt?: string;
};

export function fetchAiModels() {
  return request<AiModel[]>("/ai/models");
}

export function fetchAiConfig() {
  return request<AiConfig>("/ai/config");
}

export function updateAiConfig(
  payload: Partial<{
    selectedModel: AiModelId;
    keyMode: KeyMode;
    autoReplyChannels: Channel[];
    autoSendChannels: Channel[];
    systemPrompt: string;
  }>,
) {
  return request<AiConfig>("/ai/config", { method: "PATCH", body: JSON.stringify(payload) });
}

export function setProviderApiKey(provider: AiProvider, key: string) {
  return request<AiConfig>(`/ai/keys/${provider}`, { method: "PUT", body: JSON.stringify({ key }) });
}

export function removeProviderApiKey(provider: AiProvider) {
  return request<AiConfig>(`/ai/keys/${provider}`, { method: "DELETE" });
}

export function addDataSource(name: string, type: DataSourceType) {
  return request<AiConfig>("/ai/data-sources", { method: "POST", body: JSON.stringify({ name, type }) });
}

export function removeDataSource(id: string) {
  return request<AiConfig>(`/ai/data-sources/${id}`, { method: "DELETE" });
}

export type AiQueryStatus = "resolved" | "escalated";

export type AiAnalyticsSummary = {
  days: number;
  totalQueries: number;
  autoReplyRate: number;
  avgResponseMs: number;
  tokensUsed: number;
  costPaise: number;
  dailyQueries: { day: string; count: number }[];
  dailyByChannel: { day: string; channel: Channel; count: number }[];
  byChannel: { channel: Channel; count: number }[];
  byStatus: { status: AiQueryStatus; count: number }[];
  isDummyData: boolean;
};

export function fetchAiAnalytics(days = 14) {
  return request<AiAnalyticsSummary>(`/ai/analytics/summary?days=${days}`);
}
