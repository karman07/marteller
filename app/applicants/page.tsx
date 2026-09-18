"use client";

import { useEffect, useMemo, useState } from "react";
import { DragEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Copy,
  FileCheck,
  KeyRound,
  LayoutGrid,
  Mail,
  Phone,
  Plus,
  Search,
  Table as TableIcon,
  Trash2,
  User as UserIcon,
  UserPlus,
} from "lucide-react";
import {
  PipelineEntry,
  SalesLead,
  SalesStage,
  SALES_STAGES,
  SalesTeamMember,
  createSalesLead,
  deleteSalesLead,
  fetchPipeline,
  issueSalesLeadCredentials,
  listSalesTeam,
  promoteSalesLead,
  updateSalesLead,
  updateStage,
  VerificationStatus,
  VERIFICATION_STATUSES,
} from "@/lib/admin";
import { VerificationBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

type View = "board" | "table";

export default function PipelinePage() {
  const router = useRouter();
  const [pipeline, setPipeline] = useState<PipelineEntry[]>([]);
  const [team, setTeam] = useState<SalesTeamMember[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [verificationFilter, setVerificationFilter] = useState<VerificationStatus | "">("");
  const [view, setView] = useState<View>("board");
  const [dragOverStage, setDragOverStage] = useState<SalesStage | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<PipelineEntry | null>(null);

  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [promoting, setPromoting] = useState(false);
  const [issuingCredentials, setIssuingCredentials] = useState(false);
  const [credentialsResult, setCredentialsResult] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  function load() {
    fetchPipeline()
      .then((items) => {
        setPipeline(items);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }

  useEffect(() => {
    load();
    listSalesTeam()
      .then(setTeam)
      .catch(() => {});
  }, []);

  const teamById = useMemo(() => new Map(team.map((m) => [m._id, m])), [team]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pipeline.filter((p) => {
      if (verificationFilter && p.verificationStatus !== verificationFilter) return false;
      if (!q) return true;
      return [p.name, p.email, p.phone, p.companyName].filter(Boolean).some((v) => v!.toLowerCase().includes(q));
    });
  }, [pipeline, query, verificationFilter]);

  const byStage = useMemo(() => {
    const map = new Map<SalesStage, PipelineEntry[]>();
    for (const s of SALES_STAGES) map.set(s.value, []);
    for (const p of filtered) map.get(p.stage)?.push(p);
    return map;
  }, [filtered]);

  function resetForm() {
    setName("");
    setCompanyName("");
    setEmail("");
    setPhone("");
    setSource("");
    setNotes("");
    setAssignedToUserId("");
    setError(null);
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createSalesLead({
        name: name.trim(),
        companyName: companyName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        source: source.trim() || undefined,
        notes: notes.trim() || undefined,
        assignedToUserId: assignedToUserId || undefined,
      });
      setCreateOpen(false);
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create lead.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSave() {
    if (!editingLead) return;
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateSalesLead(editingLead.id, {
        name: name.trim(),
        companyName: companyName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        source: source.trim() || undefined,
        notes: notes.trim() || undefined,
        assignedToUserId,
      });
      setEditingLead((prev) =>
        prev ? { ...prev, name: updated.name, companyName: updated.companyName ?? null, assignedToUserId: updated.assignedToUserId ?? null } : prev,
      );
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save lead.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingLead) return;
    await deleteSalesLead(editingLead.id);
    setEditingLead(null);
    load();
  }

  function openEditLead(entry: PipelineEntry) {
    setEditingLead(entry);
    setName(entry.name);
    setCompanyName(entry.companyName ?? "");
    setEmail(entry.email ?? "");
    setPhone(entry.phone ?? "");
    setSource(entry.source ?? "");
    setNotes(entry.notes ?? "");
    setAssignedToUserId(entry.assignedToUserId ?? "");
    setError(null);
    setCredentialsResult(null);
  }

  function handleCardClick(entry: PipelineEntry) {
    if (entry.kind === "customer") {
      router.push(`/applicants/${entry.id}`);
    } else {
      openEditLead(entry);
    }
  }

  // Moves the lead to 'pending_verification' and provisions the account —
  // no credentials come back from this; see handleIssueCredentials, only
  // reachable once verification is approved.
  async function handlePromote() {
    if (!editingLead) return;
    setPromoting(true);
    setError(null);
    try {
      const result: { lead: SalesLead } = await promoteSalesLead(editingLead.id, email.trim() || undefined);
      setEditingLead((prev) => (prev ? { ...prev, stage: result.lead.status } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not promote this lead.");
    } finally {
      setPromoting(false);
      load();
    }
  }

  async function handleIssueCredentials() {
    if (!editingLead) return;
    setIssuingCredentials(true);
    setError(null);
    try {
      const result = await issueSalesLeadCredentials(editingLead.id);
      setCredentialsResult({ email: result.email, temporaryPassword: result.temporaryPassword });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not issue credentials.");
    } finally {
      setIssuingCredentials(false);
    }
  }

  function copyCredentials() {
    if (!credentialsResult) return;
    const text = `Email: ${credentialsResult.email}\nTemporary password: ${credentialsResult.temporaryPassword}`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>, entry: PipelineEntry) {
    e.dataTransfer.setData("text/plain", JSON.stringify({ id: entry.id, kind: entry.kind }));
    e.dataTransfer.effectAllowed = "move";
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>, stage: SalesStage) {
    e.preventDefault();
    setDragOverStage(null);
    let dragged: { id: string; kind: PipelineEntry["kind"] };
    try {
      dragged = JSON.parse(e.dataTransfer.getData("text/plain"));
    } catch {
      return;
    }
    const entry = pipeline.find((p) => p.id === dragged.id && p.kind === dragged.kind);
    if (!entry || entry.stage === stage) return;

    setPipeline((prev) => prev.map((p) => (p.id === dragged.id && p.kind === dragged.kind ? { ...p, stage } : p)));
    try {
      if (dragged.kind === "lead") {
        await updateSalesLead(dragged.id, { status: stage });
      } else {
        await updateStage(dragged.id, stage);
      }
    } catch {
      load();
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Pipeline</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Everyone sales is working — prospects and signed-up accounts, one pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button
            onClick={() => {
              resetForm();
              setCreateOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus size={15} /> New lead
          </Button>
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
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
        </div>

        {!loaded ? null : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-ink-muted">
            Nothing matches yet.
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
                    {columnItems.map((entry) => (
                      <div
                        key={`${entry.kind}-${entry.id}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, entry)}
                        onClick={() => handleCardClick(entry)}
                        className="cursor-grab rounded-xl border border-line bg-surface-2 p-3 text-left shadow-sm transition-colors hover:border-accent active:cursor-grabbing"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-ink">{entry.name}</p>
                          <span
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                              entry.kind === "customer"
                                ? "bg-emerald-500/15 text-emerald-600"
                                : "bg-cream-secondary text-ink-muted"
                            }`}
                          >
                            {entry.kind === "customer" ? "Account" : "Lead"}
                          </span>
                        </div>
                        {entry.companyName && <p className="truncate text-xs text-ink-soft">{entry.companyName}</p>}
                        {entry.phone && (
                          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-ink-soft">
                            <Phone size={11} /> {entry.phone}
                          </p>
                        )}
                        {entry.email && (
                          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-ink-soft">
                            <Mail size={11} /> {entry.email}
                          </p>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          {entry.verificationStatus ? (
                            <VerificationBadge status={entry.verificationStatus} />
                          ) : (
                            <span className="text-[11px] text-ink-muted">{formatDate(entry.createdAt)}</span>
                          )}
                          {entry.assignedToUserId && (
                            <span className="flex items-center gap-1 truncate rounded-full bg-cream-secondary px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                              <UserIcon size={9} />
                              {teamById.get(entry.assignedToUserId)?.name ??
                                teamById.get(entry.assignedToUserId)?.email ??
                                "Unknown"}
                            </span>
                          )}
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
                    <th className="px-4 py-3 font-medium">Kind</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Verification</th>
                    <th className="px-4 py-3 font-medium">Stage</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr
                      key={`${entry.kind}-${entry.id}`}
                      onClick={() => handleCardClick(entry)}
                      className="cursor-pointer border-b border-line/60 last:border-0 hover:bg-cream-secondary/40"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-ink">{entry.name}</span>
                        <p className="text-xs text-ink-muted">{entry.email ?? entry.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{entry.kind === "customer" ? "Account" : "Lead"}</td>
                      <td className="px-4 py-3 text-ink-soft">{entry.companyName ?? "—"}</td>
                      <td className="px-4 py-3">
                        {entry.verificationStatus ? <VerificationBadge status={entry.verificationStatus} /> : "—"}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {SALES_STAGES.find((s) => s.value === entry.stage)?.label ?? entry.stage}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{formatDate(entry.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New lead">
        <LeadForm
          name={name}
          setName={setName}
          companyName={companyName}
          setCompanyName={setCompanyName}
          email={email}
          setEmail={setEmail}
          phone={phone}
          setPhone={setPhone}
          source={source}
          setSource={setSource}
          notes={notes}
          setNotes={setNotes}
          team={team}
          assignedToUserId={assignedToUserId}
          setAssignedToUserId={setAssignedToUserId}
          error={error}
        />
        <Button onClick={handleCreate} disabled={saving} className="mt-4 w-full">
          {saving ? "Saving…" : "Create lead"}
        </Button>
      </Modal>

      <Modal open={!!editingLead} onClose={() => setEditingLead(null)} title="Edit lead">
        <LeadForm
          name={name}
          setName={setName}
          companyName={companyName}
          setCompanyName={setCompanyName}
          email={email}
          setEmail={setEmail}
          phone={phone}
          setPhone={setPhone}
          source={source}
          setSource={setSource}
          notes={notes}
          setNotes={setNotes}
          team={team}
          assignedToUserId={assignedToUserId}
          setAssignedToUserId={setAssignedToUserId}
          error={error}
        />

        {editingLead?.stage === "pending_verification" && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <FileCheck size={13} /> Awaiting document verification
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              An account was created but no credentials have been issued yet — this lead has moved into the
              account&apos;s own verification flow.
            </p>
          </div>
        )}

        {credentialsResult && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <Check size={13} /> Credentials issued — share these with the customer
            </p>
            <p className="mt-1.5 text-xs text-ink">Email: {credentialsResult.email}</p>
            <p className="text-xs text-ink">Temporary password: {credentialsResult.temporaryPassword}</p>
            <button
              onClick={copyCredentials}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
            >
              <Copy size={11} /> {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <Button onClick={handleEditSave} disabled={saving} className="flex-1">
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {editingLead?.stage !== "pending_verification" && editingLead?.stage !== "converted" && (
            <Button onClick={handlePromote} disabled={promoting} variant="outline" className="flex-1 gap-1.5">
              <UserPlus size={13} /> {promoting ? "Starting…" : "Start verification"}
            </Button>
          )}
          {editingLead?.stage === "converted" && (
            <Button onClick={handleIssueCredentials} disabled={issuingCredentials} variant="outline" className="flex-1 gap-1.5">
              <KeyRound size={13} /> {issuingCredentials ? "Issuing…" : "Issue credentials"}
            </Button>
          )}
          <button
            onClick={handleDelete}
            aria-label="Delete lead"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-ink-muted transition-colors hover:border-accent hover:text-accent"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {editingLead?.stage === "pending_verification" && (
          <Link
            href={`/applicants`}
            onClick={() => setEditingLead(null)}
            className="mt-2 block text-center text-xs text-ink-muted hover:text-accent"
          >
            Refresh the board after reviewing their documents to see this move to Converted.
          </Link>
        )}
      </Modal>
    </>
  );
}

function LeadForm({
  name,
  setName,
  companyName,
  setCompanyName,
  email,
  setEmail,
  phone,
  setPhone,
  source,
  setSource,
  notes,
  setNotes,
  team,
  assignedToUserId,
  setAssignedToUserId,
  error,
}: {
  name: string;
  setName: (v: string) => void;
  companyName: string;
  setCompanyName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  source: string;
  setSource: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  team: SalesTeamMember[];
  assignedToUserId: string;
  setAssignedToUserId: (v: string) => void;
  error: string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      {error && <p className="rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{error}</p>}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Full name"
        className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
      />
      <input
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder="Company (optional)"
        className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
        />
      </div>
      <input
        value={source}
        onChange={(e) => setSource(e.target.value)}
        placeholder="Source, e.g. referral, conference (optional)"
        className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
        rows={3}
        className="w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
      />
      <select
        value={assignedToUserId}
        onChange={(e) => setAssignedToUserId(e.target.value)}
        className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
      >
        <option value="">Unassigned</option>
        {team.map((m) => (
          <option key={m._id} value={m._id}>
            {m.name ?? m.email}
          </option>
        ))}
      </select>
    </div>
  );
}
