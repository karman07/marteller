"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CreditCard,
  KeyRound,
  MessageSquare,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { fetchSalesActivity, StaffActivity } from "@/lib/admin";

const ACTION_ICONS: Record<string, typeof Activity> = {
  lead_created: UserPlus,
  lead_reassigned: Users,
  lead_status_changed: Users,
  lead_promoted: UserPlus,
  credentials_issued: KeyRound,
  verification_reviewed: ShieldCheck,
  sms_configured: MessageSquare,
  balance_added: Wallet,
  sales_rep_created: UserPlus,
  password_reset: KeyRound,
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function SalesActivityPage() {
  const [activity, setActivity] = useState<StaffActivity[] | null>(null);

  useEffect(() => {
    fetchSalesActivity()
      .then(setActivity)
      .catch(() => setActivity([]));
  }, []);

  return (
    <>
      <div className="border-b border-line px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Sales activity</h1>
        <p className="mt-1 text-sm text-ink-soft">
          What the team has actually been doing — leads worked, verification decisions, credentials issued,
          balances added.
        </p>
      </div>

      <div className="px-8 py-6">
        {!activity ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : activity.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-ink-muted">
            No activity recorded yet.
          </div>
        ) : (
          <div className="max-w-2xl overflow-hidden rounded-2xl border border-line bg-surface-2">
            {activity.map((entry, i) => {
              const Icon = ACTION_ICONS[entry.action] ?? CreditCard;
              return (
                <div
                  key={entry._id}
                  className={`flex items-start gap-3 px-4 py-3 ${
                    i > 0 ? "border-t border-line" : ""
                  }`}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft/40 text-accent">
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">{entry.summary}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                      <span className="font-medium text-ink-soft">{entry.staffName}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                          entry.staffRole === "admin"
                            ? "bg-accent-soft/40 text-accent"
                            : "bg-cream-secondary text-ink-muted"
                        }`}
                      >
                        {entry.staffRole}
                      </span>
                      · {timeAgo(entry.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
