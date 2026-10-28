import { request } from "./http";
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
  // Only present on the global cross-tenant admin list (GET /admin/messages)
  // — who the message belongs to. Absent on the per-applicant endpoints,
  // where the tenant is already known from the route.
  tenantLabel?: string;
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

export type Paginated<T> = { items: T[]; total: number; page: number; limit: number };

// --- Global, cross-tenant view (admin/messages/*) ---

export function fetchMessagesSummary(channel?: Channel, days = 14) {
  const params = new URLSearchParams({ days: String(days) });
  if (channel) params.set("channel", channel);
  return request<MessagesSummary>(`/admin/messages/summary?${params.toString()}`);
}

export function listMessages(channel: Channel, page = 1, limit = 20) {
  return request<Paginated<MessageLog>>(`/admin/messages?channel=${channel}&page=${page}&limit=${limit}`);
}

// Rate card lives behind the plain tenant-facing /messages/pricing route —
// it only needs a valid JWT (any role), and is a differently-shaped document
// from /admin/pricing (that one's for the separate pricing-management page).
export function fetchRateCard() {
  return request<RateCard>("/messages/pricing");
}

// --- Per-applicant drill-in (admin/applicants/:userId/messages/*) ---

export function fetchApplicantMessagesSummary(userId: string, channel?: Channel, days = 14) {
  const params = new URLSearchParams({ days: String(days) });
  if (channel) params.set("channel", channel);
  return request<MessagesSummary>(`/admin/applicants/${userId}/messages/summary?${params.toString()}`);
}

export function listApplicantMessages(userId: string, channel: Channel, page = 1, limit = 20) {
  return request<Paginated<MessageLog>>(
    `/admin/applicants/${userId}/messages?channel=${channel}&page=${page}&limit=${limit}`,
  );
}

export function sendApplicantMessage(
  userId: string,
  payload: {
    templateId: string;
    recipients: string[];
    variables?: Record<string, string>;
    recipientVariables?: Record<string, Record<string, string>>;
  },
) {
  return request<{ sent: number; failed: number; totalCostPaise: number; messages: MessageLog[] }>(
    `/admin/applicants/${userId}/messages/send`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}
