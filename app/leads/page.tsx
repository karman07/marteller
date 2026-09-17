"use client";

import { useEffect, useMemo, useState } from "react";
import { DragEvent } from "react";
import { Check, Copy, Mail, Phone, Plus, Trash2, UserPlus } from "lucide-react";
import {
  SALES_LEAD_STATUSES,
  SalesLead,
  SalesLeadStatus,
  createSalesLead,
  deleteSalesLead,
  listSalesLeads,
  promoteSalesLead,
  updateSalesLead,
} from "@/lib/admin";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<SalesLead | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<SalesLeadStatus | null>(null);

  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [promoting, setPromoting] = useState(false);
  const [promoteResult, setPromoteResult] = useState<{
    email: string;
    temporaryPassword: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  function load() {
    listSalesLeads()
      .then((items) => {
        setLeads(items);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }

  useEffect(() => {
    load();
  }, []);

  const byStatus = useMemo(() => {
    const map = new Map<SalesLeadStatus, SalesLead[]>();
    for (const s of SALES_LEAD_STATUSES) map.set(s.value, []);
    for (const lead of leads) map.get(lead.status)?.push(lead);
    return map;
  }, [leads]);

  function resetForm() {
    setName("");
    setCompanyName("");
    setEmail("");
    setPhone("");
    setSource("");
    setNotes("");
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
      const lead = await createSalesLead({
        name: name.trim(),
        companyName: companyName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        source: source.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setLeads((prev) => [lead, ...prev]);
      setCreateOpen(false);
      resetForm();
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
      const updated = await updateSalesLead(editingLead._id, {
        name: name.trim(),
        companyName: companyName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        source: source.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setLeads((prev) => prev.map((l) => (l._id === updated._id ? updated : l)));
      setEditingLead(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save lead.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteSalesLead(id);
    setLeads((prev) => prev.filter((l) => l._id !== id));
    setEditingLead(null);
  }

  function openEdit(lead: SalesLead) {
    setEditingLead(lead);
    setName(lead.name);
    setCompanyName(lead.companyName ?? "");
    setEmail(lead.email ?? "");
    setPhone(lead.phone ?? "");
    setSource(lead.source ?? "");
    setNotes(lead.notes ?? "");
    setError(null);
    setPromoteResult(null);
  }

  async function handlePromote() {
    if (!editingLead) return;
    setPromoting(true);
    setError(null);
    try {
      const result = await promoteSalesLead(editingLead._id, email.trim() || undefined);
      setPromoteResult({ email: result.email, temporaryPassword: result.temporaryPassword });
      setLeads((prev) => prev.map((l) => (l._id === result.lead._id ? result.lead : l)));
      setEditingLead(result.lead);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not promote this lead.");
    } finally {
      setPromoting(false);
    }
  }

  function copyCredentials() {
    if (!promoteResult) return;
    const text = `Email: ${promoteResult.email}${
      promoteResult.temporaryPassword ? `\nTemporary password: ${promoteResult.temporaryPassword}` : ""
    }`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>, leadId: string) {
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>, status: SalesLeadStatus) {
    e.preventDefault();
    setDragOverStatus(null);
    const leadId = e.dataTransfer.getData("text/plain");
    const lead = leads.find((l) => l._id === leadId);
    if (!lead || lead.status === status) return;

    setLeads((prev) => prev.map((l) => (l._id === leadId ? { ...l, status } : l)));
    try {
      await updateSalesLead(leadId, { status });
    } catch {
      load();
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Leads</h1>
          <p className="mt-1 text-sm text-ink-soft">Prospects the sales team is working — not yet a Marteller account.</p>
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

      <div className="px-8 py-6">
        {!loaded ? null : leads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-ink-muted">
            No leads yet.
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {SALES_LEAD_STATUSES.map((col) => {
              const columnLeads = byStatus.get(col.value) ?? [];
              const isDragOver = dragOverStatus === col.value;
              return (
                <div
                  key={col.value}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStatus(col.value);
                  }}
                  onDragLeave={() => setDragOverStatus((s) => (s === col.value ? null : s))}
                  onDrop={(e) => handleDrop(e, col.value)}
                  className={`flex w-64 shrink-0 flex-col rounded-2xl border bg-cream-secondary/40 p-3 transition-colors ${
                    isDragOver ? "border-accent bg-accent-soft/20" : "border-line"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between px-1">
                    <p className="text-sm font-semibold text-ink">{col.label}</p>
                    <span className="rounded-full bg-cream-secondary px-2 py-0.5 text-xs font-medium text-ink-muted">
                      {columnLeads.length}
                    </span>
                  </div>

                  <div className="flex min-h-[60px] flex-col gap-2">
                    {columnLeads.map((lead) => (
                      <div
                        key={lead._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead._id)}
                        onClick={() => openEdit(lead)}
                        className="cursor-grab rounded-xl border border-line bg-surface-2 p-3 text-left shadow-sm transition-colors hover:border-accent active:cursor-grabbing"
                      >
                        <p className="truncate text-sm font-medium text-ink">{lead.name}</p>
                        {lead.companyName && <p className="truncate text-xs text-ink-soft">{lead.companyName}</p>}
                        {lead.phone && (
                          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-ink-soft">
                            <Phone size={11} /> {lead.phone}
                          </p>
                        )}
                        {lead.email && (
                          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-ink-soft">
                            <Mail size={11} /> {lead.email}
                          </p>
                        )}
                        <p className="mt-2 text-[11px] text-ink-muted">{formatDate(lead.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
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
          error={error}
        />

        {promoteResult && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <Check size={13} /> Account created — share these with the lead
            </p>
            <p className="mt-1.5 text-xs text-ink">Email: {promoteResult.email}</p>
            {promoteResult.temporaryPassword ? (
              <p className="text-xs text-ink">Temporary password: {promoteResult.temporaryPassword}</p>
            ) : (
              <p className="text-xs text-ink-muted">
                An account already existed for this email — they can sign in with their existing password.
              </p>
            )}
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
          {editingLead?.status !== "converted" && (
            <Button onClick={handlePromote} disabled={promoting} variant="outline" className="flex-1 gap-1.5">
              <UserPlus size={13} /> {promoting ? "Promoting…" : "Promote to customer"}
            </Button>
          )}
          <button
            onClick={() => editingLead && handleDelete(editingLead._id)}
            aria-label="Delete lead"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-ink-muted transition-colors hover:border-accent hover:text-accent"
          >
            <Trash2 size={16} />
          </button>
        </div>
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
    </div>
  );
}
