"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Send, CheckCheck, Receipt, BarChart3, Inbox, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatTile } from "@/components/dashboard/StatTile";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { MessagesTrendChart } from "@/components/dashboard/MessagesTrendChart";
import { SpendByChannelChart } from "@/components/dashboard/SpendByChannelChart";
import { MessageStatusBadge } from "@/components/dashboard/MessageStatusBadge";
import { ChannelIcon } from "@/components/dashboard/ChannelIcon";
import { GraphRangeSelect } from "@/components/dashboard/GraphRangeSelect";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { MessagesSummary, fetchMessagesSummary, seedDemoMessages } from "@/lib/messages";
import { formatINR } from "@/lib/currency";
import { CHANNELS, channelLabel } from "@/lib/channels";

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_PHONE_BYPASS === "true";

export default function OverviewPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<MessagesSummary | null>(null);
  const [days, setDays] = useState(14);
  const [seeding, setSeeding] = useState(false);

  function load(range: number) {
    fetchMessagesSummary(undefined, range).then(setSummary).catch(() => {});
  }

  useEffect(() => {
    if (user) load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, days]);

  // Dev-only: silently backfill demo data once for a brand-new, empty
  // account, so the dashboard isn't blank while exploring — no need to hunt
  // for the manual "Seed sample data" button first.
  useEffect(() => {
    if (!user || !DEV_BYPASS) return;
    const seededKey = `marteller-auto-seeded:${user.id}`;
    if (localStorage.getItem(seededKey)) return;

    fetchMessagesSummary(undefined, 90).then((wide) => {
      localStorage.setItem(seededKey, "true");
      if (wide.messagesInRange === 0) {
        seedDemoMessages().then(() => load(days));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleSeedDemo() {
    setSeeding(true);
    try {
      await seedDemoMessages();
      load(days);
    } finally {
      setSeeding(false);
    }
  }

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
    <>
      <PageHeader
        title="Overview"
        description={`Welcome${user?.name ? `, ${user.name}` : ""} — here's your messaging activity.`}
        action={
          DEV_BYPASS && (
            <Button onClick={handleSeedDemo} disabled={seeding} variant="outline" className="gap-1.5">
              <Sparkles size={15} /> {seeding ? "Seeding…" : "Seed sample data"}
            </Button>
          )
        }
      />

      <div className="px-8 py-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile
            label={`Messages sent (${days}d)`}
            value={String(summary?.messagesInRange ?? 0)}
            icon={Send}
          />
          <StatTile
            label="Delivery rate"
            value={`${Math.round(summary?.deliveryRate ?? 0)}%`}
            icon={CheckCheck}
          />
          <StatTile label="Spend this month" value={formatINR(totalSpendPaise)} icon={Receipt} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
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

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface-2 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink">Messages sent</h2>
                <p className="text-xs text-ink-muted">By channel</p>
              </div>
              <GraphRangeSelect value={days} onChange={setDays} />
            </div>
            {hasActivity ? (
              <MessagesTrendChart data={summary?.dailyByChannel ?? []} days={days} />
            ) : (
              <EmptyState
                icon={BarChart3}
                title="No messages yet"
                description="Send your first message from WhatsApp, Email, or SMS to see activity here."
              />
            )}
          </div>

          <div className="rounded-2xl border border-line bg-surface-2 p-5">
            <h2 className="text-sm font-semibold text-ink">Spend by channel</h2>
            <p className="mb-4 text-xs text-ink-muted">This month, in ₹</p>
            {totalSpendPaise > 0 ? (
              <SpendByChannelChart data={summary?.spendByChannel ?? []} />
            ) : (
              <EmptyState icon={Receipt} title="No spend yet this month" />
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-surface-2 p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">Recent activity</h2>
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
            <EmptyState
              icon={Inbox}
              title="Nothing sent yet"
              description="Send your first message from WhatsApp, Email, or SMS to see it here."
              action={
                <Link
                  href="/dashboard/whatsapp/send"
                  className="text-sm font-medium text-accent underline underline-offset-2"
                >
                  Go to WhatsApp
                </Link>
              }
            />
          )}
        </div>
      </div>
    </>
  );
}
