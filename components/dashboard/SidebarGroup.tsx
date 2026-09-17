"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LucideIcon } from "lucide-react";

export function SidebarGroup({
  base,
  label,
  icon: Icon,
  tabs,
}: {
  base: string;
  label: string;
  icon: LucideIcon;
  tabs: { key: string; label: string }[];
}) {
  const pathname = usePathname();
  const isActiveGroup = pathname.startsWith(base);
  // Open by default — the whole point of grouping tabs in the sidebar is to
  // show them at a glance, not to make them hunt for a chevron.
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActiveGroup ? "bg-accent-soft/40 text-accent" : "text-ink-soft hover:bg-cream-secondary hover:text-ink"
        }`}
      >
        <Icon size={17} />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="ml-4 mt-2 flex flex-col gap-1 border-l border-line pl-4">
          {tabs.map((tab) => {
            const href = `${base}/${tab.key}`;
            const active = pathname === href;
            return (
              <Link
                key={tab.key}
                href={href}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? "font-medium text-accent" : "text-ink-soft hover:text-ink"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
