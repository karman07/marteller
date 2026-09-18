"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, IndianRupee, LayoutDashboard, LogOut, Tag, UserCog, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV_GROUPS = [
  {
    label: null,
    items: [{ href: "/", label: "Overview", icon: LayoutDashboard }],
  },
  {
    label: "Sales",
    items: [
      { href: "/applicants", label: "Users", icon: Users },
      { href: "/leads", label: "Leads", icon: UserPlus },
      { href: "/team", label: "Sales team", icon: UserCog },
    ],
  },
  {
    label: "Billing",
    items: [
      { href: "/plans", label: "Plans", icon: CreditCard },
      { href: "/pricing", label: "Pricing", icon: Tag },
      { href: "/revenue", label: "Revenue", icon: IndianRupee },
    ],
  },
];

function initialsOf(name?: string | null, email?: string | null) {
  const source = name?.trim() || email || "?";
  return source.slice(0, 1).toUpperCase();
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-cream">
      <aside className="fixed inset-y-0 left-0 z-30 flex h-screen w-64 flex-col border-r border-line bg-surface-2">
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-line px-5">
          <Logo />
          <span className="rounded-full bg-accent-soft/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
            Admin
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label ?? gi} className={gi > 0 ? "mt-5" : undefined}>
              {group.label && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-ink-muted/70">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative flex items-center gap-3 rounded-lg py-2.5 pl-3 pr-3 text-sm font-medium transition-colors ${
                        active ? "bg-accent-soft/40 text-accent" : "text-ink-soft hover:bg-cream-secondary hover:text-ink"
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-accent" />
                      )}
                      <Icon size={17} strokeWidth={active ? 2.25 : 1.75} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-line p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft/50 text-xs font-semibold text-accent">
              {initialsOf(user?.name, user?.email)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{user?.name ?? "Admin"}</p>
              <p className="truncate text-xs text-ink-muted">{user?.email ?? user?.phoneNumber}</p>
            </div>
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

      <main className="min-h-screen pl-64">{children}</main>
    </div>
  );
}
