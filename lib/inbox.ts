import { request } from "./http";
import { Channel } from "./channels";

export type AiSentiment = "positive" | "negative" | "neutral";

export const AI_SENTIMENTS: { value: AiSentiment; label: string }[] = [
  { value: "positive", label: "Positive" },
  { value: "negative", label: "Negative" },
  { value: "neutral", label: "Neutral" },
];

export type InboundMessageStatus = "processed" | "error";

// Whether/how an AI-drafted reply (aiReplyText) was actually delivered to
// the customer — see AiConfig.autoSendChannels. "none" covers both "no
// reply was generated" and rows created before this field existed.
export type ReplyStatus = "none" | "pending_approval" | "auto_sent" | "sent" | "rejected";

export type InboundMessage = {
  _id: string;
  userId: string;
  channel: Channel;
  from: string;
  text: string;
  aiReplyText?: string;
  aiSentiment?: AiSentiment;
  aiInDomain?: boolean;
  aiInterested?: boolean;
  aiProvider?: string;
  aiModel?: string;
  status: InboundMessageStatus;
  errorMessage?: string;
  leadId?: string;
  replyStatus?: ReplyStatus;
  // Set once replyStatus is "auto_sent" or "sent" — the outbound
  // EmailMessage id the reply went out as.
  sentMessageId?: string;
  createdAt: string;
};

export function listInbox() {
  return request<InboundMessage[]>("/inbox");
}

export function simulateInbound(payload: { channel: Channel; from: string; text: string }) {
  return request<InboundMessage>("/inbox/simulate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// A drafted reply held for approval (replyStatus "pending_approval") — both
// are no-body POSTs, id is the InboundMessage's _id.
export function approveReply(id: string) {
  return request<InboundMessage>(`/inbox/${id}/approve-reply`, { method: "POST" });
}

export function rejectReply(id: string) {
  return request<InboundMessage>(`/inbox/${id}/reject-reply`, { method: "POST" });
}

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
  // Only present on "ai_reply" items once the backend's conversation
  // mapping carries the underlying InboundMessage id through — lets the
  // "pending approval" reply be approved/rejected right from the thread.
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

export function listConversations(channel: Channel) {
  return request<{ items: ConversationThread[]; isDummyData: boolean }>(
    `/inbox/conversations/${channel}`,
  );
}

export function fetchConversation(channel: Channel, contact: string) {
  return request<Conversation>(
    `/inbox/conversations/${channel}/${encodeURIComponent(contact)}`,
  );
}
