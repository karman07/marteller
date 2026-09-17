"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FlaskConical, Users } from "lucide-react";
import { fetchStats, SalesStats, VERIFICATION_STATUSES, SALES_STAGES } from "@/lib/sales";

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

export default function OverviewPage() {
  const [stats, setStats] = useState<SalesStats | null>(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="border-b border-line px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Overview</h1>
        <p className="mt-1 text-sm text-ink-soft">Signups, verification, and pipeline at a glance.</p>
      </div>

      <div className="px-8 py-6">
        {stats?.isDummyData && (
          <div className="mb-4 flex items-center gap-1.5 rounded-lg bg-cream-secondary px-3 py-2 text-xs font-medium text-ink-muted">
            <FlaskConical size={12} /> Sample data — dev preview only
          </div>
        )}

        {!stats ? null : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Total signups" value={stats.totalSignups} />
              {VERIFICATION_STATUSES.map((s) => (
                <StatTile key={s.value} label={s.label} value={stats.byVerification[s.value] ?? 0} />
              ))}
            </div>

            <div className="mt-6">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
                Sales pipeline
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {SALES_STAGES.map((s) => (
                  <StatTile key={s.value} label={s.label} value={stats.byStage[s.value] ?? 0} />
                ))}
              </div>
            </div>

            <Link
              href="/applicants"
              className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
            >
              <Users size={14} /> View all applicants
            </Link>
          </>
        )}
      </div>
    </>
  );
}
