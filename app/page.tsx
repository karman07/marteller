"use client";

import { useEffect, useState } from "react";
import { FlaskConical, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { AdminStats, fetchStats, SALES_STAGES, VERIFICATION_STATUSES } from "@/lib/admin";

export default function OverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
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
