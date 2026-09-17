"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/applicants", label: "Users", icon: Users },
  { href: "/leads", label: "Leads", icon: UserPlus },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-line bg-surface-2">
        <div className="flex h-16 shrink-0 items-center gap-2 px-5">
          <Logo />
          <span className="rounded-full bg-accent-soft/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
            Admin
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-accent-soft/40 text-accent" : "text-ink-soft hover:bg-cream-secondary hover:text-ink"
                }`}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-line p-3">
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
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

      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
