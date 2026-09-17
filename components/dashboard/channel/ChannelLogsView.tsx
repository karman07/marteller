"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Send as SendIcon, UserPlus } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { MessageStatusBadge } from "@/components/dashboard/MessageStatusBadge";
import { Pagination } from "@/components/dashboard/Pagination";
import { Channel } from "@/lib/channels";
import { MessageLog, listMessages } from "@/lib/messages";
import { formatINR } from "@/lib/currency";
import { promoteMessageToLead } from "@/lib/leads";
import { ChannelStatsHeader } from "./ChannelStatsHeader";

const LOGS_PAGE_SIZE = 15;

export function ChannelLogsView({ channel }: { channel: Channel }) {
  const [logs, setLogs] = useState<{ items: MessageLog[]; total: number; page: number }>({
    items: [],
    total: 0,
    page: 1,
  });
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());

  function loadLogs(page: number) {
    listMessages(channel, page, LOGS_PAGE_SIZE)
      .then((res) => setLogs({ items: res.items, total: res.total, page: res.page }))
      .catch(() => {});
  }

  async function handlePromote(messageId: string) {
    setConvertingId(messageId);
    try {
      await promoteMessageToLead(messageId);
      setConvertedIds((prev) => new Set(prev).add(messageId));
    } catch {
      // Leave the button interactive so the user can retry.
    } finally {
      setConvertingId(null);
    }
  }

  useEffect(() => {
    loadLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  return (
    <>
      <ChannelStatsHeader channel={channel} />

      {logs.items.length === 0 ? (
        <EmptyState icon={SendIcon} title="No messages sent yet" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink-muted">
                  <th className="px-4 py-3 font-medium">To</th>
                  <th className="px-4 py-3 font-medium">Template</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Cost</th>
                  <th className="px-4 py-3 font-medium">Sent</th>
                  <th className="px-4 py-3 font-medium">Lead</th>
                </tr>
              </thead>
              <tbody>
                {logs.items.map((m) => {
                  const converted = convertedIds.has(m._id);
                  return (
                    <tr key={m._id} className="border-b border-line/60 last:border-0">
                      <td className="px-4 py-3 text-ink-soft">{m.to}</td>
                      <td className="px-4 py-3 text-ink-soft">{m.templateName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <MessageStatusBadge status={m.status} />
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{formatINR(m.costPaise)}</td>
                      <td className="px-4 py-3 text-ink-soft">
                        {new Date(m.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handlePromote(m._id)}
                          disabled={converted || convertingId === m._id}
                          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            converted
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                              : "border-line text-ink-soft hover:border-accent hover:text-accent"
                          } disabled:pointer-events-none`}
                        >
                          {convertingId === m._id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : converted ? (
                            <Check size={11} />
                          ) : (
                            <UserPlus size={11} />
                          )}
                          {converted ? "Lead added" : "Add as lead"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={logs.page} limit={LOGS_PAGE_SIZE} total={logs.total} onPageChange={loadLogs} />
        </div>
      )}
    </>
  );
}
