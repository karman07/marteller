"use client";

import { useEffect, useState } from "react";
import { Bot, FlaskConical, Inbox as InboxIcon, Send, User } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Channel } from "@/lib/channels";
import {
  Conversation,
  ConversationItem,
  ConversationThread,
  fetchApplicantConversation,
  listApplicantConversations,
} from "@/lib/inbox";

function formatRelative(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function sentimentDot(sentiment?: string) {
  if (sentiment === "positive") return "bg-emerald-500";
  if (sentiment === "negative") return "bg-accent";
  return "bg-ink-muted";
}

const REPLY_STATUS_LABEL: Record<string, string> = {
  pending_approval: "AI drafted — awaiting approval",
  auto_sent: "AI reply — sent automatically",
  sent: "AI reply — approved & sent",
  rejected: "AI reply — rejected",
};

// Read-only — sales can see AI-drafted replies and their status but has no
// approve/reject action (that's the tenant's own call; SalesController
// doesn't expose those routes).
function Bubble({ item }: { item: ConversationItem }) {
  const isIn = item.direction === "in";
  const isAiReply = item.source === "ai_reply";
  const replyStatus = item.replyStatus;

  return (
    <div className={`flex ${isIn ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
          isIn
            ? "rounded-bl-sm bg-cream-secondary text-ink"
            : isAiReply
              ? "rounded-br-sm bg-accent-soft/40 text-ink"
              : "rounded-br-sm bg-ink text-cream"
        }`}
      >
        {!isIn && (
          <p
            className={`mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${
              isAiReply ? "text-accent" : "text-cream/70"
            }`}
          >
            {isAiReply ? (
              <>
                <Bot size={10} /> {(replyStatus && REPLY_STATUS_LABEL[replyStatus]) ?? "AI drafted (not sent)"}
              </>
            ) : (
              <>
                <Send size={10} /> {item.templateName ?? "Sent"} · {item.status}
              </>
            )}
          </p>
        )}
        <p className="whitespace-pre-wrap">{item.text}</p>
        {isIn && (item.aiSentiment || item.aiInterested !== undefined) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {item.aiSentiment && (
              <span className="flex items-center gap-1 text-[10px] font-medium capitalize text-ink-muted">
                <span className={`h-1.5 w-1.5 rounded-full ${sentimentDot(item.aiSentiment)}`} />
                {item.aiSentiment}
              </span>
            )}
            {item.aiInterested && (
              <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                Interested
              </span>
            )}
            {item.aiInDomain === false && (
              <span className="rounded-full bg-cream px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                Off-topic
              </span>
            )}
          </div>
        )}
        <p className={`mt-1 text-right text-[10px] ${isIn ? "text-ink-muted" : "text-current opacity-60"}`}>
          {formatTime(item.createdAt)}
        </p>
      </div>
    </div>
  );
}

export function ChannelInboxView({ userId, channel }: { userId: string; channel: Channel }) {
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [threadsAreDummy, setThreadsAreDummy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversationKey, setConversationKey] = useState<string | null>(null);

  const loadingConversation = selectedContact !== null && conversationKey !== selectedContact;

  useEffect(() => {
    setSelectedContact(null);
    setConversation(null);
    setConversationKey(null);
    listApplicantConversations(userId, channel)
      .then(({ items, isDummyData }) => {
        setThreads(items);
        setThreadsAreDummy(isDummyData);
        setLoaded(true);
        if (items.length > 0) setSelectedContact(items[0].contact);
      })
      .catch(() => setLoaded(true));
  }, [userId, channel]);

  useEffect(() => {
    if (!selectedContact) return;
    fetchApplicantConversation(userId, channel, selectedContact)
      .then((c) => {
        setConversation(c);
        setConversationKey(selectedContact);
      })
      .catch(() => {
        setConversation(null);
        setConversationKey(selectedContact);
      });
  }, [userId, channel, selectedContact]);

  return (
    <div className="flex h-[70vh] min-h-[420px] overflow-hidden rounded-2xl border border-line">
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-line bg-surface-2">
        {threadsAreDummy && (
          <div className="flex items-center gap-1.5 border-b border-line/60 bg-cream-secondary px-4 py-2 text-[11px] font-medium text-ink-muted">
            <FlaskConical size={11} /> Sample data — dev preview only
          </div>
        )}
        {!loaded ? null : threads.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={InboxIcon} title="No conversations yet" />
          </div>
        ) : (
          threads.map((t) => {
            const active = selectedContact === t.contact;
            return (
              <button
                key={t.contact}
                onClick={() => setSelectedContact(t.contact)}
                className={`flex w-full items-center gap-2.5 border-b border-line/60 px-4 py-3 text-left transition-colors ${
                  active ? "bg-accent-soft/30" : "hover:bg-cream-secondary"
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft/40 text-accent">
                  <User size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-ink">{t.contact}</p>
                    <span className="shrink-0 text-[10px] text-ink-muted">{formatRelative(t.lastAt)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-soft">{t.lastPreview}</p>
                </div>
              </button>
            );
          })
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-cream">
        {!selectedContact ? (
          <div className="flex flex-1 items-center justify-center text-sm text-ink-muted">
            Select a conversation
          </div>
        ) : loadingConversation || !conversation ? (
          <div className="flex flex-1 items-center justify-center text-sm text-ink-muted">Loading…</div>
        ) : (
          <>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-surface-2 px-6 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft/40 text-accent">
                  <User size={14} />
                </span>
                <p className="text-sm font-semibold text-ink">{conversation.contact}</p>
              </div>
              {conversation.isDummyData && (
                <span className="flex items-center gap-1 rounded-full bg-cream-secondary px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                  <FlaskConical size={10} /> Sample
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col justify-end gap-3 overflow-y-auto px-6 py-5">
              {conversation.items.length === 0 ? (
                <p className="text-sm text-ink-muted">No messages in this conversation.</p>
              ) : (
                conversation.items.map((item, i) => <Bubble key={i} item={item} />)
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
