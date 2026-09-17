"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import {
  FIELD_TYPES,
  VerificationFieldType,
  VerificationFormField,
  createFormField,
  deleteFormField,
  listFormFields,
  reorderFormFields,
  updateFormField,
} from "@/lib/sales";
import { Button } from "@/components/ui/Button";

function slugify(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function FormFieldsPage() {
  const [fields, setFields] = useState<VerificationFormField[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<VerificationFieldType>("text");
  const [newRequired, setNewRequired] = useState(true);
  const [newOptions, setNewOptions] = useState("");
  const [newPlaceholder, setNewPlaceholder] = useState("");

  function load() {
    listFormFields()
      .then((items) => {
        setFields(items);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!newLabel.trim()) return;
    setError(null);
    setCreating(true);
    try {
      const field = await createFormField({
        key: slugify(newLabel),
        label: newLabel.trim(),
        type: newType,
        required: newRequired,
        options: newType === "select" ? newOptions.split(",").map((o) => o.trim()).filter(Boolean) : [],
        placeholder: newPlaceholder.trim() || undefined,
      });
      setFields((prev) => [...prev, field]);
      setNewLabel("");
      setNewOptions("");
      setNewPlaceholder("");
      setNewRequired(true);
      setNewType("text");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add field.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteFormField(id);
    setFields((prev) => prev.filter((f) => f._id !== id));
  }

  async function handleToggleRequired(field: VerificationFormField) {
    const updated = await updateFormField(field._id, { required: !field.required });
    setFields((prev) => prev.map((f) => (f._id === field._id ? updated : f)));
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    setFields(next);
    await reorderFormFields(next.map((f) => f._id));
  }

  return (
    <>
      <div className="border-b border-line px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Verification form</h1>
        <p className="mt-1 text-sm text-ink-soft">
          What customers fill in to get verified — add, edit, reorder, or remove fields. Changes apply
          immediately to the live signup form.
        </p>
      </div>

      <div className="px-8 py-6">
        {!loaded ? null : (
          <div className="flex flex-col gap-2">
            {fields.map((field, i) => (
              <div
                key={field._id}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMove(i, -1)}
                    disabled={i === 0}
                    className="text-ink-muted hover:text-accent disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={() => handleMove(i, 1)}
                    disabled={i === fields.length - 1}
                    className="text-ink-muted hover:text-accent disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink">{field.label}</p>
                    <span className="rounded-full bg-cream-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                      {field.type}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    key: {field.key}
                    {field.type === "select" && field.options.length > 0 && ` · options: ${field.options.join(", ")}`}
                  </p>
                </div>

                <button
                  onClick={() => handleToggleRequired(field)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    field.required ? "bg-accent-soft/40 text-accent" : "bg-cream-secondary text-ink-muted"
                  }`}
                >
                  {field.required ? "Required" : "Optional"}
                </button>

                <button
                  onClick={() => handleDelete(field._id)}
                  aria-label="Delete field"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-cream-secondary hover:text-accent"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-dashed border-line p-4">
          <p className="mb-3 text-sm font-semibold text-ink">Add a field</p>
          {error && <p className="mb-3 rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Field label, e.g. Annual turnover"
              className="h-10 rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as VerificationFieldType)}
              className="h-10 rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {newType === "select" && (
              <input
                value={newOptions}
                onChange={(e) => setNewOptions(e.target.value)}
                placeholder="Options, comma separated"
                className="h-10 rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent sm:col-span-2"
              />
            )}
            <input
              value={newPlaceholder}
              onChange={(e) => setNewPlaceholder(e.target.value)}
              placeholder="Placeholder (optional)"
              className="h-10 rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
            />
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={newRequired}
                onChange={(e) => setNewRequired(e.target.checked)}
                className="h-4 w-4 rounded border-line accent-accent"
              />
              Required
            </label>
          </div>
          <Button onClick={handleCreate} disabled={creating || !newLabel.trim()} className="mt-3 gap-1.5">
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add field
          </Button>
        </div>
      </div>
    </>
  );
}
