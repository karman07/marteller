"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  TooltipContentProps,
  XAxis,
} from "recharts";
import { CHANNEL_COLORS, CHANNELS, Channel } from "@/lib/channels";
import { formatINR } from "@/lib/currency";

type SpendRow = { channel: Channel; costPaise: number };

function CustomTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const channel = (row.payload as SpendRow).channel;

  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
      <div className="flex items-center gap-2 text-sm">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: CHANNEL_COLORS[channel].cssVar }}
        />
        <span className="font-semibold text-ink">{formatINR(row.value as number)}</span>
        <span className="text-ink-soft">{CHANNEL_COLORS[channel].label}</span>
      </div>
    </div>
  );
}

export function SpendByChannelChart({ data }: { data: SpendRow[] }) {
  const byChannel = new Map(data.map((d) => [d.channel, d.costPaise]));
  const rows = CHANNELS.map((channel) => ({ channel, costPaise: byChannel.get(channel) ?? 0 }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 20, right: 8, left: 8, bottom: 0 }}>
        <XAxis
          dataKey="channel"
          tickFormatter={(c: Channel) => CHANNEL_COLORS[c].label}
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <Tooltip content={CustomTooltip} cursor={{ fill: "var(--background-soft)" }} />
        <Bar dataKey="costPaise" radius={[4, 4, 0, 0]} maxBarSize={56}>
          {rows.map((row) => (
            <Cell key={row.channel} fill={CHANNEL_COLORS[row.channel].cssVar} />
          ))}
          <LabelList
            dataKey="costPaise"
            position="top"
            formatter={(value: unknown) => (Number(value) > 0 ? formatINR(Number(value)) : "")}
            fill="var(--text-secondary)"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
