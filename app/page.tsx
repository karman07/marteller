"use client";

import { useEffect, useState } from "react";
import { FlaskConical, ShieldCheck, TrendingUp, Users } from "lucide-react";
import {
  AdminStats,
  fetchFunnel,
  fetchStats,
  FunnelStep,
  SALES_STAGES,
  VERIFICATION_STATUSES,
} from "@/lib/admin";

const FUNNEL_LABELS: Record<string, string> = {
  page_view: "Site visits",
  pricing_view: "Viewed pricing",
  signup_started: "Started signup",
  signup_completed: "Completed signup",
  verification_submitted: "Submitted verification",
  checkout_started: "Started checkout",
  checkout_completed: "Completed checkout",
};

export default function OverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [funnel, setFunnel] = useState<FunnelStep[] | null>(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => {});
    fetchFunnel()
      .then(setFunnel)
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="border-b border-line px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Overview</h1>
        <p className="mt-1 text-sm text-ink-soft">Platform-wide signups, verification, and pipeline status.</p>
      </div>

      <div className="px-8 py-6">
        {!stats ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : (
          <div className="flex flex-col gap-6">
            {stats.isDummyData && (
              <div className="flex items-center gap-1.5 rounded-lg bg-cream-secondary px-3 py-2 text-xs font-medium text-ink-muted">
                <FlaskConical size={12} /> Sample data — dev preview only
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <StatTile icon={Users} label="Total signups" value={String(stats.totalSignups)} />
              <StatTile
                icon={ShieldCheck}
                label="Verified"
                value={String(stats.byVerification.verified ?? 0)}
              />
              <StatTile
                icon={TrendingUp}
                label="Converted"
                value={String(stats.byStage.converted ?? 0)}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-line bg-surface-2 p-4">
                <h2 className="mb-3 text-sm font-semibold text-ink">Verification status</h2>
                <div className="flex flex-col gap-2">
                  {VERIFICATION_STATUSES.map((s) => (
                    <BarRow
                      key={s.value}
                      label={s.label}
                      value={stats.byVerification[s.value] ?? 0}
                      total={stats.totalSignups}
                    />
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-line bg-surface-2 p-4">
                <h2 className="mb-3 text-sm font-semibold text-ink">Sales pipeline</h2>
                <div className="flex flex-col gap-2">
                  {SALES_STAGES.map((s) => (
                    <BarRow
                      key={s.value}
                      label={s.label}
                      value={stats.byStage[s.value] ?? 0}
                      total={stats.totalSignups}
                    />
                  ))}
                </div>
              </section>
            </div>

            {funnel && funnel.length > 0 && (
              <section className="rounded-2xl border border-line bg-surface-2 p-4">
                <h2 className="mb-3 text-sm font-semibold text-ink">Platform funnel</h2>
                <p className="mb-4 text-xs text-ink-muted">
                  Distinct visitors reaching each step, from site visits through paid conversion.
                </p>
                <div className="flex flex-col gap-3">
                  {funnel.map((step, i) => {
                    const max = funnel[0]?.count || 1;
                    const pct = Math.round((step.count / max) * 100);
                    const dropoff = i > 0 && funnel[i - 1].count > 0
                      ? Math.round((1 - step.count / funnel[i - 1].count) * 100)
                      : null;
                    return (
                      <div key={step.name}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-ink-soft">{FUNNEL_LABELS[step.name] ?? step.name}</span>
                          <span className="text-ink-muted">
                            {step.count}
                            {dropoff !== null && dropoff > 0 && (
                              <span className="ml-1.5 text-[#d03b3b]">-{dropoff}%</span>
                            )}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-cream-secondary">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      <Icon size={16} className="mb-2 text-accent" />
      <p className="text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  );
}

function BarRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-ink-soft">{label}</span>
        <span className="text-ink-muted">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream-secondary">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
