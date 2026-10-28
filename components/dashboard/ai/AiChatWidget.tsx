"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { ChatMessage, sendChatMessage } from "@/lib/ai";

type DisplayMessage = ChatMessage & { toolsUsed?: { tool: string; summary: string }[]; error?: boolean };

const INTRO: DisplayMessage = {
  role: "assistant",
  content:
    "Hi! I can draft and save WhatsApp, Email, or SMS templates, answer questions grounded in your knowledge base, and report your current message analytics. What do you need?",
};

// The one `fixed bottom-*`-positioned widget in this app — no existing
// precedent to match (see the plan this was built from), so this
// establishes the pattern: launcher button collapses into a panel anchored
// to the same corner, reusing ChannelInboxView's Bubble styling for visual
// consistency with the rest of the dashboard.
export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([INTRO]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      // Only real user/assistant turns go to the backend — the static
      // intro bubble isn't part of the model's conversation.
      const history = next.filter((m) => m !== INTRO).map(({ role, content }) => ({ role, content }));
      const result = await sendChatMessage(history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply, toolsUsed: result.toolsUsed },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Something went wrong — try again.",
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open AI assistant"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-cream shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-transform hover:scale-105 active:scale-95"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex h-[32rem] w-[calc(100vw-2.5rem)] max-w-96 flex-col overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-[0_20px_60px_rgba(0,0,0,0.25)] animate-fade-up">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-cream-secondary/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft/40 text-accent">
            <Sparkles size={13} />
          </span>
          <p className="text-sm font-semibold text-ink">AI Assistant</p>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-cream hover:text-ink"
        >
          <X size={15} />
        </button>
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col justify-end gap-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                m.role === "user"
                  ? "rounded-br-sm bg-ink text-cream"
                  : m.error
                    ? "rounded-bl-sm bg-accent-soft/40 text-accent"
                    : "rounded-bl-sm bg-cream-secondary text-ink"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.toolsUsed?.map((t, j) => (
                <p key={j} className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                  <CheckCircle2 size={11} /> {t.summary}
                </p>
              ))}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-cream-secondary px-3.5 py-2.5">
              <Loader2 size={13} className="animate-spin text-ink-muted" />
              <span className="text-sm text-ink-muted">Thinking…</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-line p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask for a template, or how you're doing…"
          className="h-10 flex-1 rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-cream transition-opacity disabled:pointer-events-none disabled:opacity-40"
        >
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
    </div>
  );
}
