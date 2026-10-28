"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { Channel, channelLabel } from "@/lib/channels";
import { Plan, Subscription, fetchMySubscription } from "@/lib/billing";
import { fetchBalance } from "@/lib/wallet";
import { formatINR } from "@/lib/currency";

const LIMIT_LABELS: Record<keyof Plan["messageLimits"], string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  sms: "SMS",
  ai: "AI generations",
};

type LimitsData = { subscription: Subscription; plan: Plan } | null;

function useLimitsData() {
  const [data, setData] = useState<LimitsData | undefined>(undefined);
  const [balancePaise, setBalancePaise] = useState<number | null>(null);

  useEffect(() => {
    fetchMySubscription()
      .then(setData)
      .catch(() => setData(null));
    fetchBalance()
      .then((r) => setBalancePaise(r.balancePaise))
      .catch(() => {});
  }, []);

  return { data, balancePaise };
}

function LimitBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const low = limit > 0 && pct >= 90;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-ink-soft">{label}</span>
        <span className={low ? "font-medium text-accent" : "text-ink-muted"}>
          {used} / {limit}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream-secondary">
        <div
          className={`h-full rounded-full ${low ? "bg-accent" : "bg-accent/70"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Compact limits widget, reused across the Overview page, each channel's
// Analytics page, and the Billing page — shows plan allowance remaining
// (all 4 channels, or just one via `channel`) plus the pooled wallet
// balance, with a direct "Add credits" link into the existing top-up flow
// (/dashboard/billing?addBalance=true already auto-opens that modal).
export function LimitsSummary({ channel }: { channel?: Channel }) {
  const { data, balancePaise } = useLimitsData();

  if (data === undefined) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-2 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-muted/25 border-t-ink-muted" />
          Loading limits…
        </p>
      </div>
    );
  }

  const channels = (channel ? [channel] : (["whatsapp", "email", "sms", "ai"] as const)) as (keyof Plan["messageLimits"])[];

  // Credits only matter once the plan's own allowance can't cover a send —
  // AI has no credits fallback at all (hard stop, see AiReplyService), so
  // it never triggers this regardless of its own limit.
  const billableChannels = channels.filter((c) => c !== "ai");
  const anyExhausted =
    data === null ||
    billableChannels.some((c) => {
      const limit = data.plan.messageLimits[c] ?? 0;
      const used = data.subscription.messagesUsedThisPeriod[c] ?? 0;
      return limit <= 0 || used >= limit;
    });

  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-5">
      <div className={`flex flex-col gap-4 ${anyExhausted ? "sm:flex-row sm:items-start sm:justify-between" : ""}`}>
        <div className="flex-1">
          <p className="text-xs font-semibold text-ink-soft">
            {channel ? `${channelLabel(channel)} allowance this period` : "Plan allowance this period"}
          </p>
          {data === null ? (
            <p className="mt-2 text-sm text-ink-muted">No active plan yet.</p>
          ) : (
            <div className={`mt-3 grid gap-4 ${channels.length > 1 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1"}`}>
              {channels.map((c) => (
                <LimitBar
                  key={c}
                  label={LIMIT_LABELS[c]}
                  used={data.subscription.messagesUsedThisPeriod[c] ?? 0}
                  limit={data.plan.messageLimits[c] ?? 0}
                />
              ))}
            </div>
          )}
        </div>

        {anyExhausted && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-accent-soft/60 bg-accent-soft/15 px-4 py-3 sm:w-48 sm:shrink-0 sm:flex-col sm:items-end sm:text-right">
            <div className="flex items-center gap-2 text-ink-soft sm:justify-end">
              <Wallet size={14} />
              <span className="text-xs">Credits</span>
            </div>
            <p className="text-lg font-semibold text-ink">
              {balancePaise === null ? "—" : formatINR(balancePaise)}
            </p>
            <p className="text-[11px] text-ink-muted sm:text-right">Out of allowance — now billed from credits</p>
            <Link
              href="/dashboard/billing?addBalance=true"
              className="text-xs font-medium text-accent underline underline-offset-2 hover:no-underline"
            >
              Add credits
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
