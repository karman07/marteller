"use client";

import { useEffect, useState } from "react";
import { Send as SendIcon } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { MessageStatusBadge } from "@/components/dashboard/MessageStatusBadge";
import { Pagination } from "@/components/dashboard/Pagination";
import { Channel } from "@/lib/channels";
import { MessageLog, listMessages, listApplicantMessages } from "@/lib/messaging";
import { formatINR } from "@/lib/currency";
import { ChannelStatsHeader } from "./ChannelStatsHeader";

const LOGS_PAGE_SIZE = 15;

// showTenant adds a "Tenant" column — only meaningful for the global,
// cross-tenant admin view (GET /admin/messages), where each row carries a
// tenantLabel. The per-applicant view (userId set) already knows whose
// messages these are, so it never needs that column.
export function ChannelLogsView({
  channel,
  userId,
  showTenant = false,
}: {
  channel: Channel;
  userId?: string;
  showTenant?: boolean;
}) {
  const [logs, setLogs] = useState<{ items: MessageLog[]; total: number; page: number }>({
    items: [],
    total: 0,
    page: 1,
  });

  function loadLogs(page: number) {
    const req = userId
      ? listApplicantMessages(userId, channel, page, LOGS_PAGE_SIZE)
      : listMessages(channel, page, LOGS_PAGE_SIZE);
    req.then((res) => setLogs({ items: res.items, total: res.total, page: res.page })).catch(() => {});
  }

  useEffect(() => {
    loadLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, userId]);

  return (
    <>
      <ChannelStatsHeader channel={channel} userId={userId} />

      {logs.items.length === 0 ? (
        <EmptyState icon={SendIcon} title="No messages sent yet" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink-muted">
                  {showTenant && <th className="px-4 py-3 font-medium">Tenant</th>}
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
                    {showTenant && <td className="px-4 py-3 text-ink-soft">{m.tenantLabel ?? "—"}</td>}
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
