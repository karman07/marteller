import { request } from "./http";

export type ApiKey = {
  _id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt?: string;
  createdAt: string;
};

export type CreatedApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  key: string;
  createdAt: string;
};

export function listApiKeys() {
  return request<ApiKey[]>("/api-keys");
}

export function createApiKey(name: string) {
  return request<CreatedApiKey>("/api-keys", { method: "POST", body: JSON.stringify({ name }) });
}

export function revokeApiKey(id: string) {
  return request<{ deleted: boolean }>(`/api-keys/${id}`, { method: "DELETE" });
}
