import { request } from "./http";
import { Channel } from "./channels";
import { WhatsappCategory } from "./templates";

// Per-applicant mirror of frontend/lib/messages.ts, pointed at the sales
// drill-in endpoints (/sales/applicants/:userId/messages/...) instead of
// the tenant's own /messages/... — same shapes throughout, since the
// backend's MessagesService.summary()/list()/send() are reused as-is with
// the target userId coming from the route instead of req.userId.

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

export type Paginated<T> = { items: T[]; total: number; page: number; limit: number };

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
    `/sales/applicants/${userId}/messages/send`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function listApplicantMessages(userId: string, channel: Channel, page = 1, limit = 20) {
  return request<Paginated<MessageLog>>(
    `/sales/applicants/${userId}/messages?channel=${channel}&page=${page}&limit=${limit}`,
  );
}

export function fetchApplicantMessagesSummary(userId: string, channel?: Channel, days = 14) {
  const params = new URLSearchParams({ days: String(days) });
  if (channel) params.set("channel", channel);
  return request<MessagesSummary>(`/sales/applicants/${userId}/messages/summary?${params.toString()}`);
}

// Not applicant-scoped — /messages/pricing just needs a valid JWT (any
// role) and returns the same rate card regardless of which tenant it's
// quoted for, so this hits the generic route directly rather than a
// per-applicant one.
export function fetchRateCard() {
  return request<RateCard>("/messages/pricing");
}
