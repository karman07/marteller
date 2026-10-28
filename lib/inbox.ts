import { request } from "./http";
import { Channel } from "./channels";

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
  aiSentiment?: "positive" | "negative" | "neutral";
  aiInDomain?: boolean;
  aiInterested?: boolean;
  status?: string;
  templateName?: string;
  inboundMessageId?: string;
  replyStatus?: "none" | "pending_approval" | "auto_sent" | "sent" | "rejected";
  sentMessageId?: string;
};

export type Conversation = {
  channel: Channel;
  contact: string;
  items: ConversationItem[];
  isDummyData: boolean;
};

// Per-applicant inbox — admin reads a specific tenant's conversations
// read-only (no approve/reject-reply actions on this side; that stays on
// the tenant's own AI Assistant → Inbox).
export function listApplicantConversations(userId: string, channel: Channel) {
  return request<{ items: ConversationThread[]; isDummyData: boolean }>(
    `/admin/applicants/${userId}/inbox/${channel}`,
  );
}

export function fetchApplicantConversation(userId: string, channel: Channel, contact: string) {
  return request<Conversation>(
    `/admin/applicants/${userId}/inbox/${channel}/${encodeURIComponent(contact)}`,
  );
}
