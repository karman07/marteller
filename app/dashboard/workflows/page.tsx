"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, GitBranch, Plus, Power, Trash2, Workflow as WorkflowIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  Workflow,
  createWorkflow,
  deleteWorkflow,
  listWorkflows,
  updateWorkflow,
} from "@/lib/workflows";
import { NODE_META } from "@/components/dashboard/workflows/nodeMeta";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    listWorkflows()
      .then((items) => {
        setWorkflows(items);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const workflow = await createWorkflow(name.trim());
      setWorkflows((prev) => [workflow, ...prev]);
      setCreateOpen(false);
      setName("");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(workflow: Workflow) {
    const updated = await updateWorkflow(workflow._id, { active: !workflow.active });
    setWorkflows((prev) => prev.map((w) => (w._id === updated._id ? updated : w)));
  }

  async function handleDelete(id: string) {
    await deleteWorkflow(id);
    setWorkflows((prev) => prev.filter((w) => w._id !== id));
  }

  return (
    <>
      <PageHeader
        title="Workflows"
        description="Automate what happens after a lead comes in — a drag-and-drop builder for your pipeline."
        action={
          <Button
            onClick={() => {
              setName("");
              setCreateOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus size={15} /> New workflow
          </Button>
        }
      />

      <div className="px-8 py-6">
        {!loaded ? null : workflows.length === 0 ? (
          <EmptyState
            icon={WorkflowIcon}
            title="No workflows yet"
            description="Build one from scratch, or the sample “Welcome new leads” workflow will appear here automatically."
            action={
              <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
                <Plus size={15} /> New workflow
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workflows.map((workflow) => {
              const nodeCount = workflow.nodes.length;
              const kinds = workflow.nodes
                .map((n) => NODE_META[n.type]?.label)
                .filter(Boolean)
                .slice(0, 3);
              return (
                <div
                  key={workflow._id}
                  className="flex flex-col rounded-2xl border border-line bg-surface-2 p-4 shadow-sm transition-colors hover:border-accent"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft/40 text-accent">
                        <GitBranch size={15} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{workflow.name}</p>
                        <p className="text-[11px] text-ink-muted">
                          {nodeCount} node{nodeCount === 1 ? "" : "s"} · {formatDate(workflow.createdAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleActive(workflow)}
                      className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition-colors ${
                        workflow.active
                          ? "bg-emerald-500/15 text-emerald-600"
                          : "bg-cream-secondary text-ink-muted"
                      }`}
                    >
                      <Power size={10} />
                      {workflow.active ? "Active" : "Paused"}
                    </button>
                  </div>

                  {kinds.length > 0 && (
                    <p className="mt-3 truncate text-xs text-ink-soft">{kinds.join(" → ")}</p>
                  )}

                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      href={`/dashboard/workflows/${workflow._id}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
                    >
                      Open editor <ArrowRight size={12} />
                    </Link>
                    <button
                      onClick={() => handleDelete(workflow._id)}
                      aria-label="Delete workflow"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New workflow">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workflow name"
          autoFocus
          className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
        />
        <Button onClick={handleCreate} disabled={saving || !name.trim()} className="mt-4 w-full">
          {saving ? "Creating…" : "Create workflow"}
        </Button>
      </Modal>
    </>
  );
}
