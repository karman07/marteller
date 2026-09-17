"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Country, getCountryList } from "@/lib/countries";
import { useClickOutside } from "@/lib/useClickOutside";

export function CountrySelect({
  value,
  onChange,
}: {
  value: Country;
  onChange: (country: Country) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const countries = useMemo(() => getCountryList(), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q),
    );
  }, [countries, query]);

  return (
    <div className="relative h-full shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-full items-center gap-1.5 px-3 text-sm font-medium text-ink outline-none"
      >
        <span className="text-base leading-none">{value.flag}</span>
        <span>{value.dialCode}</span>
        <ChevronDown size={14} className="text-ink-muted" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-10 mt-1.5 w-64 overflow-hidden rounded-xl border border-line bg-surface-2 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country..."
            className="w-full border-b border-line bg-transparent px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted"
          />
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.map((c) => (
              <button
                key={c.iso2}
                type="button"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink hover:bg-cream-secondary"
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-ink-muted">{c.dialCode}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2.5 text-sm text-ink-muted">No matches</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
