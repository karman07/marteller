"use client";

import { useEffect, useState } from "react";
import { BarChart3, Inbox, Receipt, Send, CheckCheck } from "lucide-react";
import { StatTile } from "@/components/dashboard/StatTile";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { GraphRangeSelect } from "@/components/dashboard/GraphRangeSelect";
import { MessageStatusBadge } from "@/components/dashboard/MessageStatusBadge";
import { MessagesTrendChart } from "@/components/dashboard/MessagesTrendChart";
import { SpendByChannelChart } from "@/components/dashboard/SpendByChannelChart";
import { ChannelIcon } from "@/components/dashboard/ChannelIcon";
import { CHANNELS, Channel, channelLabel } from "@/lib/channels";
import { MessagesSummary, fetchApplicantMessagesSummary } from "@/lib/messaging";
import { formatINR } from "@/lib/currency";
import { ChannelLogsView } from "./ChannelLogsView";
import { ChannelInboxView } from "./ChannelInboxView";
import { ChannelSendView, ApplicantContact } from "./ChannelSendView";

type SubTab = "stats" | "logs" | "inbox" | "send";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "stats", label: "Stats" },
  { key: "logs", label: "Logs" },
  { key: "inbox", label: "Inbox" },
  { key: "send", label: "Send" },
];

function TabPill<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt.key
              ? "border-accent bg-accent-soft/40 text-accent"
              : "border-line text-ink-soft hover:text-ink"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Cross-channel overview for this one applicant — the per-applicant
// equivalent of frontend's main /dashboard Overview page. Not affected by
// the channel switcher below, which only scopes Logs/Inbox/Send.
function ApplicantStatsOverview({ userId }: { userId: string }) {
  const [summary, setSummary] = useState<MessagesSummary | null>(null);
  const [days, setDays] = useState(14);

  useEffect(() => {
    fetchApplicantMessagesSummary(userId, undefined, days)
      .then(setSummary)
      .catch(() => {});
  }, [userId, days]);

  const totalSpendPaise = summary?.spendByChannel.reduce((sum, r) => sum + r.costPaise, 0) ?? 0;
  const hasActivity = (summary?.messagesInRange ?? 0) > 0;

  const perChannel = CHANNELS.map((channel) => ({
    channel,
    count: (summary?.dailyByChannel ?? [])
      .filter((r) => r.channel === channel)
      .reduce((sum, r) => sum + r.count, 0),
    spendPaise: summary?.spendByChannel.find((r) => r.channel === channel)?.costPaise ?? 0,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label={`Messages sent (${days}d)`} value={String(summary?.messagesInRange ?? 0)} icon={Send} />
        <StatTile label="Delivery rate" value={`${Math.round(summary?.deliveryRate ?? 0)}%`} icon={CheckCheck} />
        <StatTile label="Spend this month" value={formatINR(totalSpendPaise)} icon={Receipt} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {perChannel.map(({ channel, count, spendPaise }) => (
          <div
            key={channel}
            className="flex items-center justify-between rounded-2xl border border-line bg-surface-2 px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <ChannelIcon channel={channel} size={18} />
              <div>
                <p className="text-sm font-medium text-ink">{channelLabel(channel)}</p>
                <p className="text-xs text-ink-muted">{count} sent</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-ink">{formatINR(spendPaise)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface-2 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">Messages sent</h3>
              <p className="text-xs text-ink-muted">By channel</p>
            </div>
            <GraphRangeSelect value={days} onChange={setDays} />
          </div>
          {hasActivity ? (
            <MessagesTrendChart data={summary?.dailyByChannel ?? []} days={days} />
          ) : (
            <EmptyState icon={BarChart3} title="No messages yet" />
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface-2 p-5">
          <h3 className="text-sm font-semibold text-ink">Spend by channel</h3>
          <p className="mb-4 text-xs text-ink-muted">This month, in ₹</p>
          {totalSpendPaise > 0 ? (
            <SpendByChannelChart data={summary?.spendByChannel ?? []} />
          ) : (
            <EmptyState icon={Receipt} title="No spend yet this month" />
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface-2 p-5">
        <h3 className="mb-4 text-sm font-semibold text-ink">Recent activity</h3>
        {summary?.recent && summary.recent.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink-muted">
                  <th className="pb-2 pr-4 font-medium">Channel</th>
                  <th className="pb-2 pr-4 font-medium">To</th>
                  <th className="pb-2 pr-4 font-medium">Template</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {summary.recent.map((m) => (
                  <tr key={m._id} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5 pr-4">
                      <span className="flex items-center gap-2 text-ink">
                        <ChannelIcon channel={m.channel} />
                        {channelLabel(m.channel)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-ink-soft">{m.to}</td>
                    <td className="py-2.5 pr-4 text-ink-soft">{m.templateName ?? "—"}</td>
                    <td className="py-2.5 pr-4">
                      <MessageStatusBadge status={m.status} />
                    </td>
                    <td className="py-2.5 text-ink-soft">{formatINR(m.costPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Inbox} title="Nothing sent to this applicant yet" />
        )}
      </div>
    </div>
  );
}

export function ApplicantMessagingPanel({
  userId,
  applicant,
}: {
  userId: string;
  applicant: ApplicantContact;
}) {
  const [subTab, setSubTab] = useState<SubTab>("stats");
  const [channel, setChannel] = useState<Channel>("whatsapp");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabPill options={SUB_TABS} value={subTab} onChange={setSubTab} />
        {subTab !== "stats" && (
          <TabPill
            options={CHANNELS.map((c) => ({ key: c, label: channelLabel(c) }))}
            value={channel}
            onChange={setChannel}
          />
        )}
      </div>

      {subTab === "stats" && <ApplicantStatsOverview userId={userId} />}
      {subTab === "logs" && <ChannelLogsView userId={userId} channel={channel} />}
      {subTab === "inbox" && <ChannelInboxView userId={userId} channel={channel} />}
      {subTab === "send" && <ChannelSendView userId={userId} channel={channel} applicant={applicant} />}
    </div>
  );
}
