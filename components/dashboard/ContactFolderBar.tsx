"use client";

import { useState } from "react";
import { Folder, FolderPlus } from "lucide-react";
import { ContactListSummary } from "@/lib/contacts";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function ContactFolderBar({
  lists,
  activeList,
  onSelect,
  onCreateList,
  onDropContact,
}: {
  lists: ContactListSummary[];
  activeList: string | null;
  onSelect: (list: string | null) => void;
  onCreateList: (name: string) => void | Promise<void>;
  onDropContact: (contactId: string, list: string | null) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOverList, setDragOverList] = useState<string | null>(null);

  const existingNames = new Set(lists.map((l) => l.list.toLowerCase()));

  function openDialog() {
    setDraft("");
    setError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setDraft("");
    setError(null);
  }

  async function commit() {
    const clean = draft.trim();
    if (!clean) {
      setError("Enter a list name.");
      return;
    }
    if (existingNames.has(clean.toLowerCase())) {
      setError("A list with this name already exists.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreateList(clean);
      closeDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the list.");
    } finally {
      setSaving(false);
    }
  }

  function dropHandlers(list: string | null) {
    return {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverList(list ?? "Uncategorized");
      },
      onDragLeave: () => setDragOverList(null),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        setDragOverList(null);
        const contactId = e.dataTransfer.getData("text/plain");
        if (contactId) onDropContact(contactId, list);
      },
    };
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      <button
        onClick={() => onSelect(null)}
        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
          activeList === null ? "border-accent bg-accent-soft/40 text-accent" : "border-line text-ink-soft"
        }`}
      >
        All contacts
      </button>

      {lists.map((l) => {
        const isOver = dragOverList === l.list;
        const isActive = activeList === l.list;
        return (
          <button
            key={l.list}
            onClick={() => onSelect(l.list)}
            {...dropHandlers(l.list === "Uncategorized" ? null : l.list)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              isOver
                ? "border-accent bg-accent-soft/60 text-accent"
                : isActive
                  ? "border-accent bg-accent-soft/40 text-accent"
                  : "border-line text-ink-soft"
            }`}
          >
            <Folder size={12} />
            {l.list} · {l.count}
          </button>
        );
      })}

      <button
        onClick={openDialog}
        className="flex items-center gap-1.5 rounded-full border border-dashed border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
      >
        <FolderPlus size={12} /> New list
      </button>

      <Modal open={dialogOpen} onClose={closeDialog} title="Create a new contact list">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-ink-muted">
            Give it a name — you can drag contacts into it, or assign a list when adding a new contact.
          </p>
          {error && <p className="rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{error}</p>}
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
            placeholder="e.g. Diwali Customers"
            className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
          />
          <Button onClick={commit} disabled={saving} className="w-full">
            {saving ? "Creating…" : "Create list"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
