"use client";

import { useState } from "react";
import { GripVertical, Plus } from "lucide-react";

const PRESET_VARS = ["name", "order_id", "code", "date", "business_name"];

export function VariableChips({ onInsert }: { onInsert: (varName: string) => void }) {
  const [customVars, setCustomVars] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const allVars = [...PRESET_VARS, ...customVars];

  function commitCustom() {
    const clean = draft.trim().replace(/[^a-zA-Z0-9_]/g, "");
    if (clean && !allVars.includes(clean)) {
      setCustomVars((prev) => [...prev, clean]);
    }
    setDraft("");
    setAdding(false);
  }

  return (
    <div>
      <p className="mb-1.5 text-[11px] text-ink-muted">Drag a variable into Header or Body</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {allVars.map((v) => (
          <button
            key={v}
            type="button"
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", v)}
            onClick={() => onInsert(v)}
            className="flex cursor-grab items-center gap-1 rounded-full bg-cream-secondary px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:text-accent active:cursor-grabbing"
          >
            <GripVertical size={10} className="opacity-40" />
            {v}
          </button>
        ))}

        {adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitCustom();
              }
              if (e.key === "Escape") {
                setDraft("");
                setAdding(false);
              }
            }}
            onBlur={commitCustom}
            placeholder="name…"
            className="h-6 w-24 rounded-full border border-line bg-cream px-2 text-xs text-ink outline-none focus:border-accent"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-full border border-dashed border-line px-2.5 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
          >
            <Plus size={11} /> Custom
          </button>
        )}
      </div>
    </div>
  );
}
