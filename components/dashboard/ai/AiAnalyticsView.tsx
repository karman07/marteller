"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import { Clock3, Coins, MessagesSquare, Sparkles, TrendingUp } from "lucide-react";
import { StatTile } from "@/components/dashboard/StatTile";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { GraphRangeSelect } from "@/components/dashboard/GraphRangeSelect";
import { AiAnalyticsSummary, AiQueryStatus, fetchAiAnalytics } from "@/lib/ai";
import { CHANNELS, CHANNEL_COLORS, Channel } from "@/lib/channels";
import { formatINR, formatCompactNumber } from "@/lib/currency";

const STATUS_META: Record<AiQueryStatus, { label: string; color: string }> = {
  resolved: { label: "Auto-resolved", color: "#0ca30c" },
  escalated: { label: "Escalated to a human", color: "#c98500" },
};

function formatDay(day: string) {
  return new Date(day).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

type PivotedRow = { day: string } & Record<Channel, number>;

function pivot(rows: AiAnalyticsSummary["dailyByChannel"], days: number): PivotedRow[] {
  const byDay = new Map<string, PivotedRow>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, { day: key, whatsapp: 0, email: 0, sms: 0 });
  }
  for (const row of rows) {
    const entry = byDay.get(row.day);
    if (entry) entry[row.channel] = row.count;
  }
  return Array.from(byDay.values());
}

function CustomTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((p) => Number(p.value ?? 0) > 0);
  if (visible.length === 0) return null;
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
      <p className="mb-1.5 text-xs text-ink-muted">{formatDay(String(label))}</p>
      <div className="flex flex-col gap-1">
        {visible.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center gap-2 text-sm">
            <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="font-semibold text-ink">{entry.value}</span>
            <span className="text-ink-soft">{CHANNEL_COLORS[entry.dataKey as Channel].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AiAnalyticsView() {
  const [days, setDays] = useState(14);
  const [summary, setSummary] = useState<AiAnalyticsSummary | null>(null);

  useEffect(() => {
    fetchAiAnalytics(days).then(setSummary).catch(() => {});
  }, [days]);

  const hasActivity = (summary?.totalQueries ?? 0) > 0;
  const pivoted = summary ? pivot(summary.dailyByChannel, days) : [];
  const tickInterval = Math.max(0, Math.floor(pivoted.length / 7));

  const statusTotal = summary ? summary.byStatus.reduce((sum, r) => sum + r.count, 0) : 0;
  const statusSegments = summary
    ? summary.byStatus.filter((s) => s.count > 0).map((s) => ({ ...s, ...STATUS_META[s.status] }))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Analytics</h2>
          <p className="text-xs text-ink-soft">How the assistant is performing across channels.</p>
        </div>
        <div className="flex items-center gap-2">
          {summary?.isDummyData && (
            <span className="flex items-center gap-1 rounded-full border border-accent bg-accent-soft/30 px-2.5 py-1 text-xs font-medium text-accent">
              <Sparkles size={11} />
              Sample data · dev mode
            </span>
          )}
          <GraphRangeSelect value={days} onChange={setDays} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatTile label={`Queries (${days}d)`} value={String(summary?.totalQueries ?? 0)} icon={MessagesSquare} />
        <StatTile label="Auto-reply rate" value={`${summary?.autoReplyRate ?? 0}%`} icon={TrendingUp} />
        <StatTile
          label="Tokens used"
          value={summary ? formatCompactNumber(summary.tokensUsed) : "0"}
          icon={Coins}
        />
        <StatTile label="Avg. response time" value={`${((summary?.avgResponseMs ?? 0) / 1000).toFixed(1)}s`} icon={Clock3} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface-2 p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">Queries handled</h3>
              <p className="text-xs text-ink-muted">By channel</p>
            </div>
          </div>
          {hasActivity ? (
            <>
              <div className="mb-3 flex items-center gap-4">
                {CHANNELS.map((channel) => (
                  <div key={channel} className="flex items-center gap-1.5 text-xs text-ink-soft">
                    <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[channel].cssVar }} />
                    {CHANNEL_COLORS[channel].label}
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={pivoted} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
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
                    width={32}
                  />
                  <Tooltip content={CustomTooltip} cursor={{ stroke: "var(--border)" }} />
                  {CHANNELS.map((channel) => (
                    <Line
                      key={channel}
                      type="monotone"
                      dataKey={channel}
                      stroke={CHANNEL_COLORS[channel].cssVar}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface-2)" }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : (
            <EmptyState
              icon={MessagesSquare}
              title="No queries yet"
              description="Once auto-reply is enabled on a channel, activity will show up here."
            />
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface-2 p-5">
          <h3 className="mb-4 text-sm font-semibold text-ink">Resolution</h3>
          {statusTotal > 0 ? (
            <div className="flex h-[calc(100%-1.5rem)] flex-col justify-center gap-4">
              <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-cream-secondary">
                {statusSegments.map((s) => (
                  <div
                    key={s.status}
                    style={{ width: `${(s.count / statusTotal) * 100}%`, backgroundColor: s.color }}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    title={`${s.label} · ${s.count}`}
                  />
                ))}
              </div>
              <div className="flex flex-col gap-2.5">
                {summary?.byStatus.map((s) => {
                  const meta = STATUS_META[s.status];
                  return (
                    <div key={s.status} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-ink-soft">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                        {meta.label}
                      </span>
                      <span className="font-semibold text-ink">{s.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <EmptyState icon={TrendingUp} title="No data yet" />
          )}
        </div>
      </div>

      {summary && (
        <div className="rounded-2xl border border-line bg-surface-2 p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink">Estimated spend</h3>
          <p className="text-xs text-ink-muted">
            {summary.totalQueries} quer{summary.totalQueries === 1 ? "y" : "ies"} over the last {days} days
          </p>
          <p className="mt-1 text-2xl font-semibold text-ink">{formatINR(summary.costPaise)}</p>
        </div>
      )}
    </div>
  );
}
