"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { AddressResult, searchAddress } from "@/lib/address";
import { useClickOutside } from "@/lib/useClickOutside";

export function AddressSearch({
  initialQuery = "",
  onSelect,
}: {
  initialQuery?: string;
  onSelect: (result: AddressResult) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<AddressResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (selected) {
      setSelected(false);
      return;
    }
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      searchAddress(query, controller.signal)
        .then((res) => {
          setResults(res);
          setOpen(true);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
      setLoading(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="relative" ref={ref}>
      <div className="flex h-11 items-center gap-2 rounded-xl border border-line bg-cream px-3 transition-colors focus-within:border-accent">
        <Search size={15} className="shrink-0 text-ink-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search your address..."
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
        />
        {loading && <Loader2 size={14} className="shrink-0 animate-spin text-ink-muted" />}
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 top-full z-10 mt-1.5 w-full overflow-hidden rounded-xl border border-line bg-surface-2 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
          <div className="max-h-56 overflow-y-auto py-1">
            {results.map((result, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setSelected(true);
                  setQuery(result.label);
                  setResults([]);
                  setOpen(false);
                  onSelect(result);
                }}
                className="flex w-full items-start gap-2.5 px-3 py-2 text-left text-sm text-ink hover:bg-cream-secondary"
              >
                <MapPin size={14} className="mt-0.5 shrink-0 text-accent" />
                <span className="truncate">{result.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
