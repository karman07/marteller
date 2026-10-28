"use client";

import { useEffect, useState } from "react";
import { fetchApplicantSubscription, MessageLimits, Plan, Subscription } from "@/lib/sales";

const LIMIT_LABELS: Record<keyof MessageLimits, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  sms: "SMS",
  ai: "AI generations",
};

// Compact plan-allowance bars for an applicant's Usage card — read-only for
// sales (plan management is admin-only). Shows nothing but a one-line note
// if this applicant has no active plan (pure pay-as-you-go wallet billing).
export function ApplicantLimitsBars({ userId }: { userId: string }) {
  const [data, setData] = useState<{ subscription: Subscription; plan: Plan } | null | undefined>(undefined);

  useEffect(() => {
    fetchApplicantSubscription(userId)
      .then(setData)
      .catch(() => setData(null));
  }, [userId]);

  if (data === undefined)
    return (
      <p className="flex items-center gap-2 text-xs text-ink-muted">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink-muted/25 border-t-ink-muted" />
        Loading plan allowance…
      </p>
    );
  if (data === null) {
    return <p className="text-xs text-ink-muted">No active plan — pay-as-you-go from wallet only.</p>;
  }

  const { subscription, plan } = data;

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-ink-muted">Plan allowance this period ({plan.name})</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(LIMIT_LABELS) as (keyof MessageLimits)[]).map((channel) => {
          const used = subscription.messagesUsedThisPeriod[channel] ?? 0;
          const limit = plan.messageLimits[channel] ?? 0;
          const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
          return (
            <div key={channel} className="rounded-lg border border-line bg-cream px-2.5 py-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-ink-soft">{LIMIT_LABELS[channel]}</span>
                <span className="text-ink-muted">
                  {used}/{limit}
                </span>
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-cream-secondary">
                <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
