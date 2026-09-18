"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Plus, UserPlus } from "lucide-react";
import {
  SalesTeamMember,
  createSalesTeamMember,
  listSalesTeam,
  setSalesTeamPassword,
} from "@/lib/admin";
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
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; temporaryPassword: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  const [passwordTarget, setPasswordTarget] = useState<SalesTeamMember | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ email: string; temporaryPassword: string } | null>(null);

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
    setPassword("");
    setError(null);
    setResult(null);
    setCreateOpen(true);
  }

  async function handleCreate() {
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (password && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createSalesTeamMember(email.trim(), name.trim(), password.trim());
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

  function openPasswordReset(member: SalesTeamMember) {
    setPasswordTarget(member);
    setResetPassword("");
    setResetError(null);
    setResetResult(null);
  }

  async function handleResetPassword() {
    if (!passwordTarget) return;
    if (resetPassword && resetPassword.length < 6) {
      setResetError("Password must be at least 6 characters.");
      return;
    }
    setResetting(true);
    setResetError(null);
    try {
      const result = await setSalesTeamPassword(passwordTarget._id, resetPassword.trim());
      setResetResult({ email: result.email ?? passwordTarget.email ?? "", temporaryPassword: result.temporaryPassword });
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setResetting(false);
    }
  }

  function copyResetCredentials() {
    if (!resetResult) return;
    const text = `Email: ${resetResult.email}\nNew password: ${resetResult.temporaryPassword}`;
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
                <button
                  onClick={() => openPasswordReset(member)}
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
                >
                  <KeyRound size={12} /> Set password
                </button>
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
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (optional — leave blank to generate one)"
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

      <Modal open={!!passwordTarget} onClose={() => setPasswordTarget(null)} title="Set password">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ink-muted">
            {passwordTarget?.name ?? passwordTarget?.email} — choose a specific password, or leave blank to
            generate one.
          </p>
          {resetError && <p className="rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{resetError}</p>}
          {!resetResult ? (
            <>
              <input
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="New password (optional)"
                className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
              />
              <Button onClick={handleResetPassword} disabled={resetting} className="w-full gap-1.5">
                <KeyRound size={15} /> {resetting ? "Setting…" : "Set password"}
              </Button>
            </>
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <Check size={13} /> Password updated — share this with the rep
              </p>
              <p className="mt-1.5 text-xs text-ink">Email: {resetResult.email}</p>
              <p className="text-xs text-ink">New password: {resetResult.temporaryPassword}</p>
              <button
                onClick={copyResetCredentials}
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
