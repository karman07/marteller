"use client";

import { useState } from "react";
import { FileUp, ClipboardPaste } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { bulkCreateContacts, parseContactsText, readFileAsText } from "@/lib/contacts";

type Mode = "paste" | "file";

export function BulkImportContactsDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [mode, setMode] = useState<Mode>("paste");
  const [pasted, setPasted] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileText, setFileText] = useState("");
  const [listName, setListName] = useState(() =>
    new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date()),
  );
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setFileText(await readFileAsText(file));
  }

  async function handleImport() {
    setError(null);
    setResult(null);
    const text = mode === "paste" ? pasted : fileText;
    const rows = parseContactsText(text);

    if (rows.length === 0) {
      setError("No contacts found. Check the format and try again.");
      return;
    }

    setImporting(true);
    try {
      const res = await bulkCreateContacts(rows, listName.trim() || undefined);
      setResult(res);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import contacts.");
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    setPasted("");
    setFileName("");
    setFileText("");
    setResult(null);
    setError(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import contacts">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-ink-muted">
          One contact per line: name, phone, email — or paste rows straight from Excel/Google
          Sheets.
        </p>

        <div className="flex gap-1.5">
          <button
            onClick={() => setMode("paste")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === "paste" ? "border-accent bg-accent-soft/40 text-accent" : "border-line text-ink-soft"
            }`}
          >
            <ClipboardPaste size={13} /> Paste
          </button>
          <button
            onClick={() => setMode("file")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === "file" ? "border-accent bg-accent-soft/40 text-accent" : "border-line text-ink-soft"
            }`}
          >
            <FileUp size={13} /> Upload CSV
          </button>
        </div>

        {error && (
          <p className="rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{error}</p>
        )}
        {result && (
          <p className="rounded-lg bg-[#0ca30c]/10 px-3 py-2 text-sm text-[#0ca30c]">
            Added {result.created} contact{result.created === 1 ? "" : "s"}
            {result.skipped > 0 ? ` — skipped ${result.skipped} invalid row${result.skipped === 1 ? "" : "s"}` : ""}.
          </p>
        )}

        <div>
          <p className="mb-1.5 text-xs text-ink-muted">Save as list</p>
          <input
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="List name"
            className="h-10 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
          />
        </div>

        {mode === "paste" ? (
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={"Ritu Singh, +919999911111, ritu@example.com\nAmit Kumar, +919999922222"}
            rows={8}
            className="w-full rounded-xl border border-line bg-cream px-3 py-2.5 font-mono text-xs text-ink outline-none focus:border-accent"
          />
        ) : (
          <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-cream text-center transition-colors hover:border-accent">
            <FileUp size={16} className="text-ink-muted" />
            <span className="px-2 text-xs text-ink-soft">{fileName || "Choose a .csv file"}</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
        )}

        <Button onClick={handleImport} disabled={importing} className="w-full">
          {importing ? "Importing…" : "Import contacts"}
        </Button>
      </div>
    </Modal>
  );
}
