"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageCircle,
  Mail,
  MessageSquareText,
  Users,
  UserPlus,
  Workflow,
  Bot,
  Receipt,
  User,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { BusinessVerification, fetchVerification } from "@/lib/verification";
import { VerificationGate } from "./VerificationGate";
import { SidebarChannelGroup } from "./SidebarChannelGroup";
import { SidebarGroup } from "./SidebarGroup";

const TOP_NAV = [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }];

const CHANNEL_GROUPS = [
  { channel: "whatsapp" as const, label: "WhatsApp", icon: MessageCircle },
  { channel: "email" as const, label: "Email", icon: Mail },
  { channel: "sms" as const, label: "SMS", icon: MessageSquareText },
];

const AI_ASSISTANT_TABS = [
  { key: "analytics", label: "Analytics" },
  { key: "model", label: "Model" },
  { key: "knowledge-base", label: "Knowledge base" },
  { key: "inbox", label: "Inbox (test)" },
];

const BOTTOM_NAV_BEFORE_AI = [
  { href: "/dashboard/contacts", label: "Contacts", icon: Users },
  { href: "/dashboard/leads", label: "Leads", icon: UserPlus },
  { href: "/dashboard/workflows", label: "Workflows", icon: Workflow },
];
const BOTTOM_NAV_AFTER_AI = [
  { href: "/dashboard/billing", label: "Billing & Usage", icon: Receipt },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [verification, setVerification] = useState<BusinessVerification | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      fetchVerification().then(setVerification).catch(() => {});
    }
  }, [user]);

  if (loading || !user || !verification) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-ink-soft">
        Loading…
      </div>
    );
  }

  const verified = verification.status === "verified";

  function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Users }) {
    const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          active ? "bg-accent-soft/40 text-accent" : "text-ink-soft hover:bg-cream-secondary hover:text-ink"
        }`}
      >
        <Icon size={17} />
        {label}
      </Link>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-line bg-surface-2">
        <div className="flex h-16 shrink-0 items-center px-5">
          <Link href="/dashboard">
            <Logo />
          </Link>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-2 pt-3">
          {TOP_NAV.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}

          {CHANNEL_GROUPS.map((g) => (
            <SidebarChannelGroup key={g.channel} channel={g.channel} label={g.label} icon={g.icon} />
          ))}

          {BOTTOM_NAV_BEFORE_AI.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}

          <SidebarGroup base="/dashboard/ai-assistant" label="AI Assistant" icon={Bot} tabs={AI_ASSISTANT_TABS} />

          {BOTTOM_NAV_AFTER_AI.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <div className="shrink-0 border-t border-line p-3">
          <div className="flex items-center gap-2 rounded-lg px-1 py-1">
            <Link
              href="/dashboard/profile"
              className="min-w-0 flex-1 rounded-lg px-2 py-1.5 transition-colors hover:bg-cream-secondary"
            >
              <p className="truncate text-sm font-medium text-ink">{user.name ?? "Your account"}</p>
              <p className="truncate text-xs text-ink-muted">{user.email ?? user.phoneNumber}</p>
            </Link>
            <ThemeToggle />
            <button
              onClick={logout}
              aria-label="Log out"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-secondary hover:text-ink"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <main className="h-screen min-w-0 flex-1 overflow-y-auto">{children}</main>

      {!verified && <VerificationGate record={verification} onUpdated={setVerification} />}
    </div>
  );
}
