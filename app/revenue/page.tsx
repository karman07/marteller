"use client";

import { useEffect, useState } from "react";
import { IndianRupee, Users } from "lucide-react";
import { RevenueSummary, fetchRevenue } from "@/lib/billing";
import { formatINR } from "@/lib/currency";

export default function RevenuePage() {
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchRevenue()
      .then((r) => {
        setRevenue(r);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const maxMrr = revenue ? Math.max(1, ...revenue.plans.map((p) => p.mrrPaise)) : 1;

  return (
    <>
      <div className="border-b border-line px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Revenue</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Live MRR and active subscriber counts per plan — admin-only, not visible to sales.
        </p>
      </div>

      <div className="px-8 py-6">
        {!loaded ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : !revenue || revenue.plans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-ink-muted">
            No plans configured yet.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-surface-2 p-4">
                <IndianRupee size={16} className="mb-2 text-accent" />
                <p className="text-2xl font-semibold tracking-tight text-ink">
                  {formatINR(revenue.totalMrrPaise)}
                </p>
                <p className="text-xs text-ink-muted">Total MRR</p>
              </div>
              <div className="rounded-2xl border border-line bg-surface-2 p-4">
                <Users size={16} className="mb-2 text-accent" />
                <p className="text-2xl font-semibold tracking-tight text-ink">
                  {revenue.totalActiveSubscribers}
                </p>
                <p className="text-xs text-ink-muted">Active subscribers</p>
              </div>
            </div>

            <section className="rounded-2xl border border-line bg-surface-2 p-4">
              <h2 className="mb-3 text-sm font-semibold text-ink">MRR by plan</h2>
              <div className="flex flex-col gap-4">
                {revenue.plans
                  .slice()
                  .sort((a, b) => b.mrrPaise - a.mrrPaise)
                  .map((plan) => (
                    <div key={plan.planId}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-ink-soft">
                          {plan.name}
                          {!plan.isActive && (
                            <span className="rounded-full bg-cream-secondary px-1.5 py-0.5 text-[10px] text-ink-muted">
                              Inactive
                            </span>
                          )}
                        </span>
                        <span className="text-ink-muted">
                          {formatINR(plan.mrrPaise)} · {plan.activeSubscribers} subs
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-cream-secondary">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${Math.round((plan.mrrPaise / maxMrr) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
