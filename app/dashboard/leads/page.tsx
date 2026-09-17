"use client";

import { useEffect, useMemo, useState } from "react";
import { DragEvent } from "react";
import { Mail, Phone, Plus, Trash2, User } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ChannelIcon } from "@/components/dashboard/ChannelIcon";
import { CHANNELS, Channel, channelLabel } from "@/lib/channels";
import {
  LEAD_STATUSES,
  Lead,
  LeadStatus,
  createLead,
  deleteLead,
  listLeads,
  updateLead,
} from "@/lib/leads";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<Channel | "">("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    listLeads()
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
    const map = new Map<LeadStatus, Lead[]>();
    for (const s of LEAD_STATUSES) map.set(s.value, []);
    for (const lead of leads) map.get(lead.status)?.push(lead);
    return map;
  }, [leads]);

  function resetForm() {
    setName("");
    setPhone("");
    setEmail("");
    setChannel("");
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
      const lead = await createLead({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        channel: channel || undefined,
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
      const updated = await updateLead(editingLead._id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        channel: channel || undefined,
        notes: notes.trim() || undefined,
      });
      setLeads((prev) => prev.map((l) => (l._id === updated._id ? updated : l)));
      setEditingLead(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save lead.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteLead(id);
    setLeads((prev) => prev.filter((l) => l._id !== id));
    setEditingLead(null);
  }

  function openEdit(lead: Lead) {
    setEditingLead(lead);
    setName(lead.name);
    setPhone(lead.phone ?? "");
    setEmail(lead.email ?? "");
    setChannel(lead.channel ?? "");
    setNotes(lead.notes ?? "");
    setError(null);
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>, leadId: string) {
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>, status: LeadStatus) {
    e.preventDefault();
    setDragOverStatus(null);
    const leadId = e.dataTransfer.getData("text/plain");
    const lead = leads.find((l) => l._id === leadId);
    if (!lead || lead.status === status) return;

    setLeads((prev) => prev.map((l) => (l._id === leadId ? { ...l, status } : l)));
    try {
      await updateLead(leadId, { status });
    } catch {
      load();
    }
  }

  const hasLeads = leads.length > 0;

  return (
    <>
      <PageHeader
        title="Leads"
        description="Every prospect across WhatsApp, Email, and SMS, in one pipeline."
        action={
          <Button
            onClick={() => {
              resetForm();
              setCreateOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus size={15} /> New lead
          </Button>
        }
      />

      <div className="px-8 py-6">
        {!loaded ? null : !hasLeads ? (
          <EmptyState
            icon={User}
            title="No leads yet"
            description="Add a lead manually, or promote one straight from a WhatsApp, Email, or SMS conversation in Logs."
            action={
              <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
                <Plus size={15} /> New lead
              </Button>
            }
          />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {LEAD_STATUSES.map((col) => {
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
                  className={`flex w-72 shrink-0 flex-col rounded-2xl border bg-cream-secondary/40 p-3 transition-colors ${
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
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-medium text-ink">{lead.name}</p>
                          {lead.channel && <ChannelIcon channel={lead.channel} size={13} />}
                        </div>
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
          phone={phone}
          setPhone={setPhone}
          email={email}
          setEmail={setEmail}
          channel={channel}
          setChannel={setChannel}
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
          phone={phone}
          setPhone={setPhone}
          email={email}
          setEmail={setEmail}
          channel={channel}
          setChannel={setChannel}
          notes={notes}
          setNotes={setNotes}
          error={error}
        />
        <div className="mt-4 flex items-center gap-2">
          <Button onClick={handleEditSave} disabled={saving} className="flex-1">
            {saving ? "Saving…" : "Save changes"}
          </Button>
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
  phone,
  setPhone,
  email,
  setEmail,
  channel,
  setChannel,
  notes,
  setNotes,
  error,
}: {
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  channel: Channel | "";
  setChannel: (v: Channel | "") => void;
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
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
        />
      </div>
      <select
        value={channel}
        onChange={(e) => setChannel(e.target.value as Channel | "")}
        className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
      >
        <option value="">Source channel (optional)</option>
        {CHANNELS.map((c) => (
          <option key={c} value={c}>
            {channelLabel(c)}
          </option>
        ))}
      </select>
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
