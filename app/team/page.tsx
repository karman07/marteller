"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Plus, UserPlus } from "lucide-react";
import { SalesTeamMember, createSalesTeamMember, listSalesTeam } from "@/lib/admin";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function TeamPage() {
  const [team, setTeam] = useState<SalesTeamMember[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; temporaryPassword: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  function load() {
    listSalesTeam()
      .then((items) => {
        setTeam(items);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }

  useEffect(load, []);

  function openCreate() {
    setName("");
    setEmail("");
    setError(null);
    setResult(null);
    setCreateOpen(true);
  }

  async function handleCreate() {
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createSalesTeamMember(email.trim(), name.trim());
      setResult({ email: created.user.email ?? email.trim(), temporaryPassword: created.temporaryPassword });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create sales account.");
    } finally {
      setSaving(false);
    }
  }

  function copyCredentials() {
    if (!result) return;
    const text = `Email: ${result.email}${result.temporaryPassword ? `\nTemporary password: ${result.temporaryPassword}` : ""}`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Sales team</h1>
          <p className="mt-1 text-sm text-ink-soft">Sales reps who can work and reassign leads.</p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus size={15} /> Add sales person
        </Button>
      </div>

      <div className="px-8 py-6">
        {!loaded ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : team.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-ink-muted">
            No sales reps yet — add one to start assigning leads.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((member) => (
              <div key={member._id} className="rounded-2xl border border-line bg-surface-2 p-4">
                <p className="text-sm font-semibold text-ink">{member.name ?? "Unnamed"}</p>
                <p className="mt-0.5 truncate text-xs text-ink-muted">{member.email}</p>
                <p className="mt-2 text-[11px] text-ink-muted">Added {formatDate(member.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add sales person">
        <div className="flex flex-col gap-3">
          {error && <p className="rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{error}</p>}
          {!result ? (
            <>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Work email"
                type="email"
                className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
              />
              <Button onClick={handleCreate} disabled={saving} className="mt-1 w-full gap-1.5">
                <UserPlus size={15} /> {saving ? "Creating…" : "Create account"}
              </Button>
            </>
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <Check size={13} /> Account created — share these with the rep
              </p>
              <p className="mt-1.5 text-xs text-ink">Email: {result.email}</p>
              {result.temporaryPassword ? (
                <p className="text-xs text-ink">Temporary password: {result.temporaryPassword}</p>
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
        </div>
      </Modal>
    </>
  );
}
