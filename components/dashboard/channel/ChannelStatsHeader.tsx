"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, TooltipContentProps, XAxis, YAxis } from "recharts";
import { BarChart3, Send, CheckCheck, Receipt } from "lucide-react";
import { StatTile } from "@/components/dashboard/StatTile";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { GraphRangeSelect } from "@/components/dashboard/GraphRangeSelect";
import { Channel, CHANNEL_COLORS } from "@/lib/channels";
import { fetchMessagesSummary } from "@/lib/messages";
import { formatINR } from "@/lib/currency";

const STATUS_META: Record<"delivered" | "queued" | "failed", { label: string; color: string }> = {
  delivered: { label: "Delivered", color: "#0ca30c" },
  queued: { label: "Queued", color: "var(--text-muted)" },
  failed: { label: "Failed", color: "#d03b3b" },
};

function formatDay(day: string) {
  return new Date(day).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function CustomTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  if (!value) return null;
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
      <p className="text-xs text-ink-muted">{formatDay(String(label))}</p>
      <p className="text-sm font-semibold text-ink">{String(value)} messages</p>
    </div>
  );
}

export function ChannelStatsHeader({ channel }: { channel: Channel }) {
  const [days, setDays] = useState(14);
  const [data, setData] = useState<{ day: string; count: number }[]>([]);
  const [stats, setStats] = useState({ sent: 0, deliveryRate: 0, spendPaise: 0 });
  const [statusCounts, setStatusCounts] = useState({ delivered: 0, queued: 0, failed: 0 });

  useEffect(() => {
    fetchMessagesSummary(channel, days).then((summary) => {
      const today = new Date();
      const byDay = new Map<string, number>();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        byDay.set(d.toISOString().slice(0, 10), 0);
      }
      for (const row of summary.dailyByChannel) {
        if (byDay.has(row.day)) byDay.set(row.day, row.count);
      }
      setData(Array.from(byDay.entries()).map(([day, count]) => ({ day, count })));
      setStats({
        sent: summary.messagesInRange,
        deliveryRate: summary.deliveryRate,
        spendPaise: summary.spendByChannel.reduce((sum, r) => sum + r.costPaise, 0),
      });

      const counts = { delivered: 0, queued: 0, failed: 0 };
      for (const row of summary.statusBreakdown) {
        const bucket: "delivered" | "queued" | "failed" =
          row.status === "failed" ? "failed" : row.status === "queued" ? "queued" : "delivered";
        counts[bucket] += row.count;
      }
      setStatusCounts(counts);
    });
  }, [channel, days]);

  const color = CHANNEL_COLORS[channel].cssVar;
  const tickInterval = Math.max(0, Math.floor(data.length / 7));
  const hasActivity = stats.sent > 0;

  const statusTotal = statusCounts.delivered + statusCounts.queued + statusCounts.failed;
  const statusSegments = (["delivered", "queued", "failed"] as const)
    .map((key) => ({ key, count: statusCounts[key], ...STATUS_META[key] }))
    .filter((s) => s.count > 0);

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label={`Sent (${days}d)`} value={String(stats.sent)} icon={Send} />
        <StatTile label="Delivery rate" value={`${Math.round(stats.deliveryRate)}%`} icon={CheckCheck} />
        <StatTile label="Spend this month" value={formatINR(stats.spendPaise)} icon={Receipt} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col rounded-2xl border border-line bg-surface-2 p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Messages sent</h2>
            <GraphRangeSelect value={days} onChange={setDays} />
          </div>
          {hasActivity ? (
            <div className="min-h-[200px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickFormatter={formatDay}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                    interval={tickInterval}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip content={CustomTooltip} cursor={{ stroke: "var(--border)" }} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={color}
                    strokeWidth={2}
                    fill={color}
                    fillOpacity={0.1}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface-2)" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={BarChart3} title="No messages yet" />
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface-2 p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">Delivery status</h2>
          {statusTotal > 0 ? (
            <div className="flex h-full flex-col justify-center gap-4">
              <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-cream-secondary">
                {statusSegments.map((s) => (
                  <div
                    key={s.key}
                    style={{ width: `${(s.count / statusTotal) * 100}%`, backgroundColor: s.color }}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    title={`${s.label} · ${s.count}`}
                  />
                ))}
              </div>
              <div className="flex flex-col gap-2.5">
                {(["delivered", "queued", "failed"] as const).map((key) => {
                  const meta = STATUS_META[key];
                  const count = statusCounts[key];
                  return (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-ink-soft">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                        {meta.label}
                      </span>
                      <span className="font-semibold text-ink">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <EmptyState icon={CheckCheck} title="No messages yet" />
          )}
        </div>
      </div>
    </div>
  );
}
