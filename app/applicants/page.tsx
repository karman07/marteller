"use client";

import { useEffect, useMemo, useState } from "react";
import { DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlaskConical, LayoutGrid, Mail, Phone, Search, Table as TableIcon } from "lucide-react";
import {
  Applicant,
  listApplicants,
  SalesStage,
  SALES_STAGES,
  updateStage,
  VerificationStatus,
  VERIFICATION_STATUSES,
} from "@/lib/admin";
import { VerificationBadge, StageBadge } from "@/components/ui/Badge";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type View = "board" | "table";

export default function ApplicantsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Applicant[]>([]);
  const [isDummyData, setIsDummyData] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [verificationFilter, setVerificationFilter] = useState<VerificationStatus | "">("");
  const [stageFilter, setStageFilter] = useState<SalesStage | "">("");
  const [view, setView] = useState<View>("board");
  const [dragOverStage, setDragOverStage] = useState<SalesStage | null>(null);

  function load() {
    listApplicants()
      .then(({ items, isDummyData }) => {
        setItems(items);
        setIsDummyData(isDummyData);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((a) => {
      if (verificationFilter && a.verificationStatus !== verificationFilter) return false;
      if (stageFilter && a.salesStage !== stageFilter) return false;
      if (!q) return true;
      return [a.name, a.email, a.phoneNumber, a.companyName]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [items, query, verificationFilter, stageFilter]);

  const byStage = useMemo(() => {
    const map = new Map<SalesStage, Applicant[]>();
    for (const s of SALES_STAGES) map.set(s.value, []);
    for (const a of filtered) map.get(a.salesStage)?.push(a);
    return map;
  }, [filtered]);

  function handleDragStart(e: DragEvent<HTMLDivElement>, userId: string) {
    e.dataTransfer.setData("text/plain", userId);
    e.dataTransfer.effectAllowed = "move";
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>, stage: SalesStage) {
    e.preventDefault();
    setDragOverStage(null);
    const userId = e.dataTransfer.getData("text/plain");
    const applicant = items.find((a) => a.userId === userId);
    if (!applicant || applicant.salesStage === stage) return;

    setItems((prev) => prev.map((a) => (a.userId === userId ? { ...a, salesStage: stage } : a)));
    try {
      await updateStage(userId, stage);
    } catch {
      load();
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Applicants</h1>
          <p className="mt-1 text-sm text-ink-soft">Everyone who has signed up, with verification and pipeline status.</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-2 p-1">
          <button
            onClick={() => setView("board")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "board" ? "bg-accent-soft text-accent" : "text-ink-soft hover:text-ink"
            }`}
          >
            <LayoutGrid size={13} /> Board
          </button>
          <button
            onClick={() => setView("table")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "table" ? "bg-accent-soft text-accent" : "text-ink-soft hover:text-ink"
            }`}
          >
            <TableIcon size={13} /> Table
          </button>
        </div>
      </div>

      <div className="px-8 py-6">
        {isDummyData && (
          <div className="mb-4 flex items-center gap-1.5 rounded-lg bg-cream-secondary px-3 py-2 text-xs font-medium text-ink-muted">
            <FlaskConical size={12} /> Sample data — dev preview only
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, phone, or company…"
              className="h-10 w-full rounded-xl border border-line bg-surface-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-accent"
            />
          </div>
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value as VerificationStatus | "")}
            className="h-10 rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">All verification statuses</option>
            {VERIFICATION_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {view === "table" && (
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as SalesStage | "")}
              className="h-10 rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">All pipeline stages</option>
              {SALES_STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {!loaded ? null : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-ink-muted">
            No applicants match.
          </div>
        ) : view === "board" ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {SALES_STAGES.map((col) => {
              const columnItems = byStage.get(col.value) ?? [];
              const isDragOver = dragOverStage === col.value;
              return (
                <div
                  key={col.value}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStage(col.value);
                  }}
                  onDragLeave={() => setDragOverStage((s) => (s === col.value ? null : s))}
                  onDrop={(e) => handleDrop(e, col.value)}
                  className={`flex w-64 shrink-0 flex-col rounded-2xl border bg-cream-secondary/40 p-3 transition-colors ${
                    isDragOver ? "border-accent bg-accent-soft/20" : "border-line"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between px-1">
                    <p className="text-sm font-semibold text-ink">{col.label}</p>
                    <span className="rounded-full bg-cream-secondary px-2 py-0.5 text-xs font-medium text-ink-muted">
                      {columnItems.length}
                    </span>
                  </div>

                  <div className="flex min-h-[60px] flex-col gap-2">
                    {columnItems.map((a) => (
                      <div
                        key={a.userId}
                        draggable={!isDummyData}
                        onDragStart={(e) => handleDragStart(e, a.userId)}
                        onClick={() => !isDummyData && router.push(`/applicants/${a.userId}`)}
                        className="cursor-grab rounded-xl border border-line bg-surface-2 p-3 text-left shadow-sm transition-colors hover:border-accent active:cursor-grabbing"
                      >
                        <p className="truncate text-sm font-medium text-ink">{a.name}</p>
                        {a.companyName && <p className="truncate text-xs text-ink-soft">{a.companyName}</p>}
                        {a.phoneNumber && (
                          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-ink-soft">
                            <Phone size={11} /> {a.phoneNumber}
                          </p>
                        )}
                        {a.email && (
                          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-ink-soft">
                            <Mail size={11} /> {a.email}
                          </p>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <VerificationBadge status={a.verificationStatus} />
                          <span className="text-[11px] text-ink-muted">{formatDate(a.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-ink-muted">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Verification</th>
                    <th className="px-4 py-3 font-medium">Pipeline</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium">Signed up</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.userId} className="border-b border-line/60 last:border-0 hover:bg-cream-secondary/40">
                      <td className="px-4 py-3">
                        {isDummyData ? (
                          <span className="font-medium text-ink">{a.name}</span>
                        ) : (
                          <Link href={`/applicants/${a.userId}`} className="font-medium text-ink hover:text-accent">
                            {a.name}
                          </Link>
                        )}
                        <p className="text-xs text-ink-muted">{a.email ?? a.phoneNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{a.companyName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <VerificationBadge status={a.verificationStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <StageBadge stage={a.salesStage} />
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{formatDate(a.submittedAt)}</td>
                      <td className="px-4 py-3 text-ink-soft">{formatDate(a.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
