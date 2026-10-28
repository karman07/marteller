"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  WhatsappTemplateApproval,
  fetchWhatsappTemplateApprovals,
  reviewWhatsappTemplateApproval,
} from "@/lib/sales";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ApprovalRow({
  entry,
  onReviewed,
}: {
  entry: WhatsappTemplateApproval;
  onReviewed: () => void;
}) {
  const [messageId, setMessageId] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualOverride, setManualOverride] = useState(false);

  async function approve() {
    if (!messageId.trim()) return;
    setBusy("approve");
    setError(null);
    try {
      await reviewWhatsappTemplateApproval(entry.userId, entry.templateId, {
        status: "approved",
        providerMessageId: messageId.trim(),
      });
      onReviewed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve.");
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    const reason = window.prompt("Reason for rejecting this template (shown to the tenant)?");
    if (reason === null) return;
    setBusy("reject");
    setError(null);
    try {
      await reviewWhatsappTemplateApproval(entry.userId, entry.templateId, {
        status: "rejected",
        rejectionReason: reason || undefined,
      });
      onReviewed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reject.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border-t border-line px-4 py-4 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{entry.templateName}</p>
          <p className="text-xs text-ink-muted">
            {entry.tenantName} · submitted {timeAgo(entry.submittedAt)}
          </p>
        </div>
      </div>
      {entry.templateBody && (
        <p className="mt-2 line-clamp-2 rounded-lg bg-cream-secondary px-3 py-2 text-xs text-ink-soft">
          {entry.templateBody}
        </p>
      )}
      {error && <p className="mt-2 text-xs text-accent">{error}</p>}

      {entry.autoSubmitted && !manualOverride ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
            <Clock size={13} /> Submitted automatically — checking for a decision periodically
          </p>
          <button
            onClick={() => setManualOverride(true)}
            className="text-xs font-medium text-accent underline underline-offset-2 hover:no-underline"
          >
            Resolve manually instead
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={messageId}
            onChange={(e) => setMessageId(e.target.value)}
            placeholder="Message ID, once registered"
            className="h-9 min-w-[200px] flex-1 rounded-lg border border-line bg-cream px-2.5 text-sm text-ink outline-none focus:border-accent"
          />
          <Button
            onClick={approve}
            disabled={busy !== null || !messageId.trim()}
            variant="outline"
            className="gap-1.5"
          >
            {busy === "approve" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            Approve
          </Button>
          <Button onClick={reject} disabled={busy !== null} variant="outline" className="gap-1.5">
            {busy === "reject" ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}

export default function WhatsappTemplateApprovalsPage() {
  const [items, setItems] = useState<WhatsappTemplateApproval[] | null>(null);

  function load() {
    fetchWhatsappTemplateApprovals()
      .then(setItems)
      .catch(() => setItems([]));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="border-b border-line px-4 sm:px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">WhatsApp template approvals</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Most templates are submitted and tracked automatically — this just shows where things stand.
          A template only needs you by hand if it has an image header or auto-submission couldn&apos;t run.
        </p>
      </div>

      <div className="px-4 sm:px-8 py-6">
        {!items ? (
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-muted/25 border-t-ink-muted" />
            Loading…
          </p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-ink-muted">
            All caught up — no templates waiting on approval.
          </div>
        ) : (
          <div className="max-w-2xl overflow-hidden rounded-2xl border border-line bg-surface-2">
            {items.map((entry) => (
              <ApprovalRow
                key={`${entry.userId}:${entry.templateId}`}
                entry={entry}
                onReviewed={load}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
