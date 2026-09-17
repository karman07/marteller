"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bot, Check, Loader2, Send, Sparkles, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ChannelIcon } from "@/components/dashboard/ChannelIcon";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { CHANNELS, Channel, channelLabel } from "@/lib/channels";
import {
  AiSentiment,
  InboundMessage,
  approveReply,
  listInbox,
  rejectReply,
  simulateInbound,
} from "@/lib/inbox";

const REPLY_STATUS_META: Record<string, { label: string; className: string }> = {
  auto_sent: { label: "Sent automatically", className: "bg-[#0ca30c]/10 text-[#0ca30c]" },
  sent: { label: "Approved & sent", className: "bg-[#0ca30c]/10 text-[#0ca30c]" },
  rejected: { label: "Rejected", className: "bg-cream-secondary text-ink-muted" },
};

function sentimentClasses(sentiment?: AiSentiment) {
  if (sentiment === "positive") return "bg-emerald-500/15 text-emerald-600";
  if (sentiment === "negative") return "bg-accent-soft/60 text-accent";
  return "bg-cream-secondary text-ink-muted";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function AiInboxView() {
  const [history, setHistory] = useState<InboundMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [from, setFrom] = useState("");
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<InboundMessage | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  function load() {
    listInbox()
      .then((items) => {
        setHistory(items);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSimulate() {
    if (!from.trim() || !text.trim()) return;
    setRunning(true);
    setResult(null);
    try {
      const saved = await simulateInbound({ channel, from: from.trim(), text: text.trim() });
      setResult(saved);
      setHistory((prev) => [saved, ...prev]);
    } finally {
      setRunning(false);
    }
  }

  async function handleApprove(id: string) {
    setActingId(id);
    try {
      const updated = await approveReply(id);
      setHistory((prev) => prev.map((h) => (h._id === id ? updated : h)));
    } catch {
      // Leave interactive so the user can retry.
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(id: string) {
    setActingId(id);
    try {
      const updated = await rejectReply(id);
      setHistory((prev) => prev.map((h) => (h._id === id ? updated : h)));
    } catch {
      // Leave interactive so the user can retry.
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-1 text-sm font-semibold text-ink">Simulate an incoming message</h2>
        <p className="mb-4 text-xs text-ink-soft">
          There&apos;s no live WhatsApp/Email/SMS webhook wired into this app yet, so this is how you test
          the real pipeline: type a message as if a customer sent it, and the AI assistant (your selected
          model, your saved API key) actually generates the reply and classification below — then any
          workflow with an &quot;AI replied&quot; trigger runs for real.
        </p>

        <div className="rounded-2xl border border-line bg-surface-2 p-4">
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as Channel)}
              className="h-11 rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {channelLabel(c)}
                </option>
              ))}
            </select>
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder={channel === "email" ? "customer@example.com" : "+91XXXXXXXXXX"}
              className="h-11 rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
            />
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What the customer said…"
            rows={3}
            className="mt-3 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
          <Button
            onClick={handleSimulate}
            disabled={running || !from.trim() || !text.trim()}
            className="mt-3 gap-1.5"
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {running ? "Thinking…" : "Simulate & get AI reply"}
          </Button>
        </div>

        {result && (
          <div className="mt-4 rounded-2xl border border-line bg-surface-2 p-4">
            {result.status === "error" ? (
              <div className="flex items-start gap-2.5 text-sm text-accent">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p>{result.errorMessage}</p>
              </div>
            ) : (
              <>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-accent-soft/40 px-2.5 py-1 text-[11px] font-medium text-accent">
                    <Bot size={11} /> {result.aiModel}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${sentimentClasses(result.aiSentiment)}`}
                  >
                    {result.aiSentiment ?? "neutral"}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      result.aiInDomain === false
                        ? "bg-cream-secondary text-ink-muted"
                        : "bg-emerald-500/15 text-emerald-600"
                    }`}
                  >
                    {result.aiInDomain === false ? "Off-topic" : "In-domain"}
                  </span>
                </div>
                <p className="text-sm text-ink">{result.aiReplyText}</p>
                {result.aiInterested && (
                  <p className="mt-3 flex items-center gap-1.5 border-t border-line/60 pt-3 text-xs font-medium text-emerald-600">
                    <UserPlus size={12} />
                    {result.leadId ? (
                      <>
                        Added as a lead —{" "}
                        <Link href="/dashboard/leads" className="underline underline-offset-2">
                          view in Leads
                        </Link>
                      </>
                    ) : (
                      "Marked as interested"
                    )}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">Recent simulations</h2>
        {!loaded ? null : history.length === 0 ? (
          <EmptyState icon={Send} title="No simulated messages yet" description="Try one above." />
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((item) => (
              <div key={item._id} className="rounded-xl border border-line bg-surface-2 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <ChannelIcon channel={item.channel} size={13} />
                    <p className="truncate text-sm font-medium text-ink">{item.from}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {item.status === "error" ? (
                      <span className="rounded-full bg-accent-soft/60 px-2 py-0.5 text-[10px] font-medium text-accent">
                        Error
                      </span>
                    ) : (
                      <>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${sentimentClasses(item.aiSentiment)}`}
                        >
                          {item.aiSentiment ?? "neutral"}
                        </span>
                        {item.aiInDomain === false && (
                          <span className="rounded-full bg-cream-secondary px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                            Off-topic
                          </span>
                        )}
                        {item.aiInterested && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                            <UserPlus size={9} /> Lead
                          </span>
                        )}
                        {item.replyStatus && item.replyStatus !== "none" && item.replyStatus !== "pending_approval" && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${REPLY_STATUS_META[item.replyStatus].className}`}
                          >
                            {REPLY_STATUS_META[item.replyStatus].label}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-ink-soft">{item.text}</p>
                {item.status === "processed" && item.aiReplyText && (
                  <p className="mt-1.5 border-t border-line/60 pt-1.5 text-xs text-ink-muted">
                    <span className="font-medium text-ink-soft">AI:</span> {item.aiReplyText}
                  </p>
                )}
                {item.replyStatus === "pending_approval" && (
                  <div className="mt-2 flex items-center gap-2 border-t border-line/60 pt-2">
                    <span className="text-[11px] font-medium text-accent">Awaiting your approval</span>
                    <button
                      onClick={() => handleApprove(item._id)}
                      disabled={actingId === item._id}
                      className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-cream transition-opacity disabled:pointer-events-none disabled:opacity-50"
                    >
                      {actingId === item._id ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <Check size={10} />
                      )}
                      Approve & send
                    </button>
                    <button
                      onClick={() => handleReject(item._id)}
                      disabled={actingId === item._id}
                      className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-ink-soft transition-colors hover:text-accent disabled:pointer-events-none disabled:opacity-50"
                    >
                      <X size={10} />
                      Reject
                    </button>
                  </div>
                )}
                <p className="mt-1.5 text-[11px] text-ink-muted">{formatDate(item.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
