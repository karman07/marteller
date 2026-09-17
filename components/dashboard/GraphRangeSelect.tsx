import { ChevronDown } from "lucide-react";
import { GRAPH_RANGES } from "@/lib/messages";

export function GraphRangeSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (days: number) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 appearance-none rounded-lg border border-line bg-cream py-1 pl-2.5 pr-7 text-xs font-medium text-ink outline-none focus:border-accent"
      >
        {GRAPH_RANGES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted"
      />
    </div>
  );
}
