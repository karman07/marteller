import { request } from "./http";
import { Channel } from "./channels";

// Admin has no AI Assistant settings page the way the tenant dashboard
// does — these are the same generic /ai/* routes (JwtAuthGuard-only, keyed
// off the caller's own userId), just the minimal slice admin needs to
// configure its own model + API key once before generating templates.

export type AiProvider = "anthropic" | "openai" | "google" | "xai" | "deepseek";

export type AiModel = {
  id: string;
  provider: AiProvider;
  label: string;
  ratePer1kTokensPaise: number;
};

export function fetchAiModels() {
  return request<AiModel[]>("/ai/models");
}

export function fetchAiConfig() {
  return request<{ selectedModel: string; keyMode: "own_key" | "managed_credits" }>("/ai/config");
}

export async function saveAiModelAndKey(model: AiModel, apiKey: string) {
  await request("/ai/config", {
    method: "PATCH",
    body: JSON.stringify({ selectedModel: model.id, keyMode: "own_key" }),
  });
  await request(`/ai/keys/${model.provider}`, {
    method: "PUT",
    body: JSON.stringify({ key: apiKey }),
  });
}

export type GeneratedTemplate = {
  name: string;
  body: string;
  subject?: string;
  category?: "marketing" | "utility" | "authentication";
  footer?: string;
};

// Exempt from the AI generation allowance — admin has no Plan/Subscription
// to draw one from (see backend AdminController.generateSystemTemplate).
export function generateSystemTemplate(channel: Channel, prompt: string) {
  return request<GeneratedTemplate>("/admin/templates/generate", {
    method: "POST",
    body: JSON.stringify({ channel, prompt }),
  });
}
