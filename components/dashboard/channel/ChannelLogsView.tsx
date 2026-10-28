"use client";

import { useEffect, useState } from "react";
import { Send as SendIcon } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { MessageStatusBadge } from "@/components/dashboard/MessageStatusBadge";
import { Pagination } from "@/components/dashboard/Pagination";
import { Channel } from "@/lib/channels";
import { MessageLog, listApplicantMessages } from "@/lib/messaging";
import { formatINR } from "@/lib/currency";
import { ChannelStatsHeader } from "./ChannelStatsHeader";

const LOGS_PAGE_SIZE = 15;

// Scoped to one applicant. Drops frontend's "Add as lead" column — a
// message here already belongs to an applicant already on the pipeline
// board, so there's nothing to promote.
export function ChannelLogsView({ userId, channel }: { userId: string; channel: Channel }) {
  const [logs, setLogs] = useState<{ items: MessageLog[]; total: number; page: number }>({
    items: [],
    total: 0,
    page: 1,
  });

  function loadLogs(page: number) {
    listApplicantMessages(userId, channel, page, LOGS_PAGE_SIZE)
      .then((res) => setLogs({ items: res.items, total: res.total, page: res.page }))
      .catch(() => {});
  }

  useEffect(() => {
    loadLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, channel]);

  return (
    <>
      <ChannelStatsHeader userId={userId} channel={channel} />

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
                </tr>
              </thead>
              <tbody>
                {logs.items.map((m) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={logs.page} limit={LOGS_PAGE_SIZE} total={logs.total} onPageChange={loadLogs} />
        </div>
      )}
    </>
  );
}
