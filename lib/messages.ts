import { request, Paginated } from "./http";
import { Channel } from "./channels";
import { WhatsappCategory } from "./templates";

export type MessageStatus = "queued" | "sent" | "delivered" | "failed";

export type MessageLog = {
  _id: string;
  channel: Channel;
  templateId?: string;
  templateName?: string;
  to: string;
  variables: Record<string, string>;
  status: MessageStatus;
  providerMessageId?: string;
  errorMessage?: string;
  costPaise: number;
  createdAt: string;
};

export type MessagesSummary = {
  dailyByChannel: { day: string; channel: Channel; count: number }[];
  spendByChannel: { channel: Channel; costPaise: number }[];
  messagesInRange: number;
  days: number;
  deliveryRate: number;
  recent: MessageLog[];
  statusBreakdown: { status: MessageStatus; count: number }[];
};

export const GRAPH_RANGES = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

export type RateCard = {
  whatsapp: Record<WhatsappCategory, number>;
  email: number;
  sms: { perSegmentPaise: number; segmentLength: number };
};

export function sendMessage(payload: {
  templateId: string;
  recipients: string[];
  variables?: Record<string, string>;
  recipientVariables?: Record<string, Record<string, string>>;
}) {
  return request<{ sent: number; failed: number; totalCostPaise: number; messages: MessageLog[] }>(
    "/messages/send",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function listMessages(channel: Channel, page = 1, limit = 20) {
  return request<Paginated<MessageLog>>(`/messages?channel=${channel}&page=${page}&limit=${limit}`);
}

export function fetchMessagesSummary(channel?: Channel, days = 14) {
  const params = new URLSearchParams({ days: String(days) });
  if (channel) params.set("channel", channel);
  return request<MessagesSummary>(`/messages/summary?${params.toString()}`);
}

export function fetchRateCard() {
  return request<RateCard>("/messages/pricing");
}

// Dev-only — backend independently refuses this outside dev (see MessagesService.seedDemoData).
export function seedDemoMessages() {
  return request<{ inserted: number }>("/messages/seed-demo", { method: "POST" });
}
