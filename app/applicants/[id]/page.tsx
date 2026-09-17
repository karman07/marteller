"use client";

import { Fragment, use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Check,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  MousePointerClick,
  Plus,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  ActivityEvent,
  ApplicantDetail,
  ApplicantTimeline,
  cancelDocumentRequest,
  createDocumentRequest,
  documentRequestFileUrl,
  documentUrl,
  DocumentRequestItem,
  fetchApplicant,
  fetchApplicantEvents,
  fetchUsage,
  listDocumentRequests,
  listFormFields,
  reviewVerification,
  SalesStage,
  SALES_STAGES,
  updateStage,
  UsageSummary,
  VerificationFormField,
} from "@/lib/admin";
import { formatINR } from "@/lib/currency";
import { VerificationBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ApplicantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<ApplicantDetail | null>(null);
  const [fields, setFields] = useState<VerificationFormField[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [timeline, setTimeline] = useState<ApplicantTimeline | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [stage, setStage] = useState<SalesStage>("new");
  const [notes, setNotes] = useState("");
  const [savingStage, setSavingStage] = useState(false);

  const [docRequests, setDocRequests] = useState<DocumentRequestItem[]>([]);
  const [newDocLabel, setNewDocLabel] = useState("");
  const [newDocNote, setNewDocNote] = useState("");
  const [requestingDoc, setRequestingDoc] = useState(false);

  function load() {
    fetchApplicant(id)
      .then((d) => {
        setDetail(d);
        setStage(d.user.salesStage);
        setNotes(d.user.salesNotes ?? "");
      })
      .catch(() => {});
    listFormFields()
      .then(setFields)
      .catch(() => {});
    fetchUsage(id)
      .then(setUsage)
      .catch(() => {});
    listDocumentRequests(id)
      .then(setDocRequests)
      .catch(() => {});
    fetchApplicantEvents(id)
      .then(setTimeline)
      .catch(() => {});
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleReview(status: "verified" | "rejected") {
    setReviewing(true);
    setReviewError(null);
    try {
      await reviewVerification(id, status, reviewNote.trim() || undefined);
      load();
      setReviewNote("");
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Could not save review.");
    } finally {
      setReviewing(false);
    }
  }

  async function handleSaveStage() {
    setSavingStage(true);
    try {
      await updateStage(id, stage, notes.trim() || undefined);
    } finally {
      setSavingStage(false);
    }
  }

  async function handleRequestDocument() {
    if (!newDocLabel.trim()) return;
    setRequestingDoc(true);
    try {
      const request = await createDocumentRequest(id, newDocLabel.trim(), newDocNote.trim() || undefined);
      setDocRequests((prev) => [request, ...prev]);
      setNewDocLabel("");
      setNewDocNote("");
    } finally {
      setRequestingDoc(false);
    }
  }

  async function handleCancelRequest(requestId: string) {
    await cancelDocumentRequest(id, requestId);
    setDocRequests((prev) => prev.filter((r) => r._id !== requestId));
  }

  if (!detail) {
    return <div className="px-8 py-6 text-sm text-ink-muted">Loading…</div>;
  }

  const { user, verification } = detail;
  const fieldLabel = (key: string) => fields.find((f) => f.key === key)?.label ?? key;

  return (
    <>
      <div className="border-b border-line px-8 py-6">
        <Link href="/applicants" className="mb-2 inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-accent">
          <ArrowLeft size={12} /> Back to applicants
        </Link>
        <div className="flex items-center gap-3">
          {user.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft/40 text-sm font-semibold text-accent">
              {(user.name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">{user.name ?? "Unnamed signup"}</h1>
            <p className="text-sm text-ink-soft">{user.email ?? user.phoneNumber}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-8 py-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-line bg-surface-2 p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Profile</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-ink-muted">Email</dt>
              <dd className="text-ink">
                {user.email ?? "—"}
                {user.email && (
                  <span className={`ml-1.5 text-xs ${user.emailVerified ? "text-emerald-600" : "text-ink-muted"}`}>
                    {user.emailVerified ? "· verified" : "· unverified"}
                  </span>
                )}
              </dd>
              <dt className="text-ink-muted">Phone</dt>
              <dd className="text-ink">
                {user.phoneNumber ? `${user.countryDialCode ?? ""} ${user.phoneNumber}` : "—"}
              </dd>
              <dt className="text-ink-muted">Company</dt>
              <dd className="text-ink">{user.companyName ?? "—"}</dd>
              <dt className="text-ink-muted">Company size</dt>
              <dd className="text-ink">{user.companySize ?? "—"}</dd>
              <dt className="text-ink-muted">Account type</dt>
              <dd className="capitalize text-ink">{user.accountType ?? "—"}</dd>
              <dt className="text-ink-muted">Address</dt>
              <dd className="text-ink">{user.address ?? "—"}</dd>
              <dt className="text-ink-muted">Location</dt>
              <dd className="text-ink">
                {[user.city, user.state, user.postalCode, user.country].filter(Boolean).join(", ") || "—"}
              </dd>
              <dt className="text-ink-muted">Interests</dt>
              <dd className="text-ink">{user.interests.length > 0 ? user.interests.join(", ") : "—"}</dd>
              <dt className="text-ink-muted">Onboarding</dt>
              <dd className="text-ink">{user.onboarded ? "Complete" : "Incomplete"}</dd>
              <dt className="text-ink-muted">Wallet balance</dt>
              <dd className="text-ink">{formatINR(user.walletBalancePaise)}</dd>
              <dt className="text-ink-muted">Signed up</dt>
              <dd className="text-ink">{formatDate(user.createdAt)}</dd>
            </dl>
          </section>

          <section className="rounded-2xl border border-line bg-surface-2 p-4">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 size={15} className="text-accent" />
              <h2 className="text-sm font-semibold text-ink">Usage</h2>
            </div>
            {!usage ? (
              <p className="text-sm text-ink-muted">Loading…</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-2">
                  <UsageTile icon={MessageSquare} label="Messages sent" value={String(usage.totalMessages)} />
                  <UsageTile icon={Wallet} label="Wallet" value={formatINR(usage.walletBalancePaise)} />
                  <UsageTile icon={Users} label="Leads" value={String(usage.leadsCount)} />
                </div>
                {usage.byChannel.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-ink-muted">By channel</p>
                    <div className="flex flex-col gap-1">
                      {usage.byChannel.map((c) => (
                        <div key={c.channel} className="flex items-center justify-between text-xs">
                          <span className="capitalize text-ink-soft">{c.channel}</span>
                          <span className="text-ink">
                            {c.count} sent · {formatINR(c.costPaise)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-surface-2 p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Sales pipeline</h2>
            <div className="flex flex-col gap-3">
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as SalesStage)}
                className="h-10 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
              >
                {SALES_STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes for the team — last call, next step, objections…"
                rows={3}
                className="w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              />
              <Button onClick={handleSaveStage} disabled={savingStage} variant="outline">
                {savingStage ? <Loader2 size={14} className="animate-spin" /> : "Save"}
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface-2 p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Document requests</h2>
            <p className="mb-3 text-xs text-ink-muted">
              Ask this applicant for a specific document — only they can see and fulfill it.
            </p>

            {docRequests.length > 0 && (
              <div className="mb-3 flex flex-col gap-2">
                {docRequests.map((r) => (
                  <div key={r._id} className="rounded-lg border border-line bg-cream px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink">{r.label}</p>
                      {r.status === "uploaded" ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                          <Check size={10} /> Uploaded
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          <Clock size={10} /> Requested
                        </span>
                      )}
                    </div>
                    {r.note && <p className="mt-0.5 text-xs text-ink-soft">{r.note}</p>}
                    {r.file ? (
                      <a
                        href={documentRequestFileUrl(id, r._id)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 flex items-center gap-1.5 text-xs text-accent hover:underline"
                      >
                        <FileText size={11} /> {r.file.fileName}
                      </a>
                    ) : (
                      <button
                        onClick={() => handleCancelRequest(r._id)}
                        className="mt-1.5 flex items-center gap-1 text-xs text-ink-muted hover:text-accent"
                      >
                        <Trash2 size={11} /> Cancel request
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <input
                value={newDocLabel}
                onChange={(e) => setNewDocLabel(e.target.value)}
                placeholder="Document, e.g. Aadhar card, bank statement"
                className="h-10 w-full rounded-lg border border-line bg-cream px-2.5 text-sm text-ink outline-none focus:border-accent"
              />
              <input
                value={newDocNote}
                onChange={(e) => setNewDocNote(e.target.value)}
                placeholder="Note for the applicant (optional)"
                className="h-9 w-full rounded-lg border border-line bg-cream px-2.5 text-xs text-ink outline-none focus:border-accent"
              />
              <Button
                onClick={handleRequestDocument}
                disabled={requestingDoc || !newDocLabel.trim()}
                variant="outline"
                className="gap-1.5"
              >
                {requestingDoc ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Request document
              </Button>
            </div>
          </section>

          <ActivityPanel timeline={timeline} />
        </div>

        <section className="rounded-2xl border border-line bg-surface-2 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Business verification</h2>
            <VerificationBadge status={verification.status} />
          </div>

          {verification.status === "not_submitted" ? (
            <p className="text-sm text-ink-muted">This applicant hasn&apos;t submitted verification yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {Object.entries(verification.fieldValues).map(([key, value]) => (
                  <Fragment key={key}>
                    <dt className="text-ink-muted">{fieldLabel(key)}</dt>
                    <dd className="text-ink">{value || "—"}</dd>
                  </Fragment>
                ))}
                <dt className="text-ink-muted">Submitted</dt>
                <dd className="text-ink">{formatDate(verification.submittedAt)}</dd>
                {verification.reviewedAt && (
                  <>
                    <dt className="text-ink-muted">Last reviewed</dt>
                    <dd className="text-ink">{formatDate(verification.reviewedAt)}</dd>
                  </>
                )}
              </dl>

              {verification.documents.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-ink-muted">Documents</p>
                  <div className="flex flex-col gap-1.5">
                    {verification.documents.map((doc) => (
                      <a
                        key={doc.storedFileName}
                        href={documentUrl(id, doc.storedFileName)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
                      >
                        <FileText size={14} className="shrink-0 text-ink-muted" />
                        <span className="min-w-0 flex-1 truncate">{doc.fileName}</span>
                        <span className="shrink-0 text-xs capitalize text-ink-muted">
                          {doc.type.replace(/([A-Z])/g, " $1")} · {formatBytes(doc.sizeBytes)}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {verification.reviewNote && (
                <p className="rounded-lg bg-cream-secondary px-3 py-2 text-xs text-ink-soft">
                  Last note: {verification.reviewNote}
                </p>
              )}

              <div className="border-t border-line pt-3">
                {reviewError && (
                  <p className="mb-2 rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{reviewError}</p>
                )}
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Review note (optional) — shown to the applicant"
                  rows={2}
                  className="mb-2 w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                />
                <div className="flex items-center gap-2">
                  <Button onClick={() => handleReview("verified")} disabled={reviewing} className="flex-1 gap-1.5">
                    <Check size={14} /> Approve — allow sign in
                  </Button>
                  <Button
                    onClick={() => handleReview("rejected")}
                    disabled={reviewing}
                    variant="danger"
                    className="flex-1 gap-1.5"
                  >
                    <X size={14} /> Reject
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function UsageTile({ icon: Icon, label, value }: { icon: typeof MessageSquare; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-cream px-3 py-2.5">
      <Icon size={13} className="mb-1 text-ink-muted" />
      <p className="text-sm font-semibold text-ink">{value}</p>
      <p className="text-[11px] text-ink-muted">{label}</p>
    </div>
  );
}

const FUNNEL_LABELS: Record<keyof ApplicantTimeline["funnel"], string> = {
  viewedPricing: "Viewed pricing",
  startedSignup: "Started signup",
  completedSignup: "Completed signup",
  submittedVerification: "Submitted verification",
  startedCheckout: "Started checkout",
  completedCheckout: "Completed checkout",
};

function EVENT_LABEL(e: ActivityEvent) {
  if (e.type === "page_view") return `Viewed ${e.path ?? "a page"}`;
  return e.name.replace(/_/g, " ").replace(/^feature click:/i, "Clicked ");
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ActivityPanel({ timeline }: { timeline: ApplicantTimeline | null }) {
  return (
    <section className="rounded-2xl border border-line bg-surface-2 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Activity size={15} className="text-accent" />
        <h2 className="text-sm font-semibold text-ink">Activity</h2>
      </div>
      {!timeline ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FUNNEL_LABELS) as (keyof ApplicantTimeline["funnel"])[]).map((key) => (
              <span
                key={key}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  timeline.funnel[key]
                    ? "bg-emerald-500/15 text-emerald-600"
                    : "bg-cream-secondary text-ink-muted"
                }`}
              >
                {FUNNEL_LABELS[key]}
              </span>
            ))}
          </div>

          {timeline.events.length === 0 ? (
            <p className="text-xs text-ink-muted">No tracked activity yet.</p>
          ) : (
            <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto border-t border-line pt-3">
              {timeline.events.map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <MousePointerClick size={11} className="shrink-0 text-ink-muted" />
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{EVENT_LABEL(e)}</span>
                  <span className="shrink-0 text-ink-muted">{timeAgo(e.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
