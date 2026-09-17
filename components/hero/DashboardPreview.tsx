import { CheckCheck, Mail, MessageCircle, MessageSquareText } from "lucide-react";

const channels = [
  {
    icon: MessageCircle,
    name: "WhatsApp",
    metric: "Delivered",
    value: "12,480",
    unit: "messages",
  },
  {
    icon: Mail,
    name: "Email",
    metric: "Open rate",
    value: "48.6",
    unit: "%",
  },
  {
    icon: MessageSquareText,
    name: "SMS",
    metric: "Delivered",
    value: "98.9",
    unit: "%",
  },
];

const bars = [38, 52, 46, 64, 58, 74, 68, 86, 80, 92];

export function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[520px] animate-float">
      <div className="absolute -inset-x-6 -inset-y-6 -z-10 rounded-[2.5rem] bg-accent-soft/60 blur-2xl" />

      <div className="rounded-[1.75rem] border border-line bg-surface-2 p-5 shadow-[0_30px_60px_-24px_rgba(27,22,18,0.25)] sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">
              Communication Overview
            </p>
            <p className="text-xs text-ink-soft">Last 7 days · all channels</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
            Live
          </span>
        </div>

        <div className="mt-5 flex items-end gap-1.5 rounded-2xl border border-line bg-cream/70 p-4">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-full bg-accent"
              style={{
                height: `${h}px`,
                opacity: 0.35 + (i / bars.length) * 0.65,
              }}
            />
          ))}
        </div>

        <div className="mt-4 space-y-2.5">
          {channels.map((c) => (
            <div
              key={c.name}
              className="flex items-center justify-between rounded-2xl border border-line bg-cream/70 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <c.icon size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{c.name}</p>
                  <p className="text-xs text-ink-soft">{c.metric}</p>
                </div>
              </div>
              <p className="text-sm font-bold text-ink">
                {c.value}
                <span className="ml-0.5 text-xs font-medium text-ink-soft">
                  {c.unit}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -bottom-6 -left-6 hidden items-center gap-2.5 rounded-2xl border border-line bg-surface-2 px-4 py-3 shadow-lg sm:flex">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-cream">
          <CheckCheck size={14} />
        </span>
        <div>
          <p className="text-xs font-semibold text-ink">Order confirmation</p>
          <p className="text-[11px] text-ink-soft">Delivered via WhatsApp</p>
        </div>
      </div>
    </div>
  );
}
