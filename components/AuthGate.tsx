"use client";

import { ReactNode, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Loader2, Lock, ShieldAlert } from "lucide-react";
import { firebaseAuth } from "@/lib/firebase";
import { devSetRole, syncSession } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";
import { AdminShell } from "@/components/dashboard/AdminShell";

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_PHONE_BYPASS === "true";

function LoginScreen() {
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const idToken = await credential.user.getIdToken();
      const { token, user } = await syncSession(idToken);
      setSession(token, user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface-2 p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2.5">
          <Logo />
          <span className="rounded-full bg-accent-soft/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
            Admin
          </span>
        </div>
        <p className="-mt-3 mb-5 flex items-center gap-1.5 text-xs text-ink-muted">
          <Lock size={11} /> Internal admin console
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && <p className="rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{error}</p>}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Work email"
            className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
          />
          <Button type="submit" disabled={loading} className="mt-1 w-full">
            {loading ? <Loader2 size={15} className="animate-spin" /> : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function UnauthorizedScreen() {
  const { user, updateUser, logout } = useAuth();
  const [promoting, setPromoting] = useState(false);

  async function handlePromote() {
    setPromoting(true);
    try {
      const updated = await devSetRole("admin");
      updateUser(updated);
    } catch {
      // Dev bypass disabled or request failed — the button just stays put.
    } finally {
      setPromoting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface-2 p-6 text-center shadow-sm">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft/40 text-accent">
          <ShieldAlert size={20} />
        </span>
        <p className="mt-3 text-sm font-semibold text-ink">Not an admin account</p>
        <p className="mt-1 text-sm text-ink-soft">
          {user?.email ?? user?.phoneNumber} isn&apos;t authorized for the admin console.
        </p>

        {DEV_BYPASS && (
          <Button onClick={handlePromote} disabled={promoting} variant="outline" className="mt-4 w-full">
            {promoting ? <Loader2 size={14} className="animate-spin" /> : "Grant admin access (dev only)"}
          </Button>
        )}

        <button onClick={logout} className="mt-3 text-xs text-ink-muted hover:text-accent">
          Sign in with a different account
        </button>
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-sm text-ink-muted">
        Loading…
      </div>
    );
  }

  if (!user) return <LoginScreen />;
  if (user.role !== "admin") return <UnauthorizedScreen />;

  return <AdminShell>{children}</AdminShell>;
}
