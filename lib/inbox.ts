import { request } from "./http";
import { Channel } from "./channels";

// Per-applicant, read-only mirror of frontend/lib/inbox.ts's conversation
// types. Sales can browse an applicant's inbox threads but — unlike the
// tenant's own dashboard — has no approve/reject-reply actions; the backend
// doesn't expose those on SalesController (see AiConfig.autoSendChannels —
// that approval flow is the tenant's own, not staff's).

export type AiSentiment = "positive" | "negative" | "neutral";

// Whether/how an AI-drafted reply (aiReplyText) was actually delivered to
// the customer. "none" covers both "no reply was generated" and rows
// created before this field existed.
export type ReplyStatus = "none" | "pending_approval" | "auto_sent" | "sent" | "rejected";

export type ConversationThread = {
  channel: Channel;
  contact: string;
  lastAt: string;
  lastPreview: string;
  messageCount: number;
};

export type ConversationItemDirection = "in" | "out";
export type ConversationItemSource = "customer" | "ai_reply" | "sent_message";

export type ConversationItem = {
  direction: ConversationItemDirection;
  source: ConversationItemSource;
  text: string;
  createdAt: string;
  aiSentiment?: AiSentiment;
  aiInDomain?: boolean;
  aiInterested?: boolean;
  status?: string;
  templateName?: string;
  inboundMessageId?: string;
  replyStatus?: ReplyStatus;
  sentMessageId?: string;
};

export type Conversation = {
  channel: Channel;
  contact: string;
  items: ConversationItem[];
  isDummyData: boolean;
};

export function listApplicantConversations(userId: string, channel: Channel) {
  return request<{ items: ConversationThread[]; isDummyData: boolean }>(
    `/sales/applicants/${userId}/inbox/${channel}`,
  );
}

export function fetchApplicantConversation(userId: string, channel: Channel, contact: string) {
  return request<Conversation>(
    `/sales/applicants/${userId}/inbox/${channel}/${encodeURIComponent(contact)}`,
  );
}
