"use client";

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
import { CHANNEL_COLORS, CHANNELS, Channel } from "@/lib/channels";

type DailyRow = { day: string; channel: Channel; count: number };
type PivotedRow = { day: string; whatsapp: number; email: number; sms: number };

function pivot(rows: DailyRow[], days: number): PivotedRow[] {
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

function formatDay(day: string) {
  const d = new Date(day);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
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
            <span
              className="h-0.5 w-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-semibold text-ink">{entry.value}</span>
            <span className="text-ink-soft">
              {CHANNEL_COLORS[entry.dataKey as Channel].label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MessagesTrendChart({ data, days }: { data: DailyRow[]; days: number }) {
  const pivoted = pivot(data, days);
  const tickInterval = Math.max(0, Math.floor(pivoted.length / 7));

  return (
    <div>
      <div className="mb-3 flex items-center gap-4">
        {CHANNELS.map((channel) => (
          <div key={channel} className="flex items-center gap-1.5 text-xs text-ink-soft">
            <span
              className="h-0.5 w-3 rounded-full"
              style={{ backgroundColor: CHANNEL_COLORS[channel].cssVar }}
            />
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
    </div>
  );
}
