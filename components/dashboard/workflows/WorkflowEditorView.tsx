"use client";

import { useCallback, useEffect, useMemo, useState, DragEvent as ReactDragEvent } from "react";
import Link from "next/link";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MinusCircle,
  Play,
  Power,
  Save,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Template, listTemplates } from "@/lib/templates";
import { LEAD_STATUSES } from "@/lib/leads";
import { AI_SENTIMENTS } from "@/lib/inbox";
import {
  Workflow,
  WorkflowNodeType,
  WorkflowRun,
  fetchWorkflow,
  listWorkflowRuns,
  runWorkflow,
  updateWorkflow,
} from "@/lib/workflows";
import { workflowNodeTypes } from "./WorkflowNode";
import { NODE_META, PALETTE_GROUPS, kindClasses } from "./nodeMeta";

let nodeSeq = 0;
function nextNodeId() {
  nodeSeq += 1;
  return `node_${Date.now()}_${nodeSeq}`;
}

function EditorInner({ workflowId }: { workflowId: string }) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [runsOpen, setRunsOpen] = useState(false);

  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    Promise.all([fetchWorkflow(workflowId), listTemplates("whatsapp")])
      .then(([wf, tpls]) => {
        setWorkflow(wf);
        setTemplates(tpls);
        setName(wf.name);
        setActive(wf.active);
        setNodes(
          wf.nodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data ?? {},
          })),
        );
        setEdges(
          wf.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
          })),
        );
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    listWorkflowRuns(workflowId)
      .then(setRuns)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setDirty(true);
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `e_${connection.source}_${connection.target}_${connection.sourceHandle ?? "x"}_${Date.now()}`,
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const onDragOver = useCallback((event: ReactDragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: ReactDragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow") as WorkflowNodeType;
      if (!type || !(type in workflowNodeTypes)) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const id = nextNodeId();
      setNodes((nds) => nds.concat({ id, type, position, data: {} }));
      setDirty(true);
    },
    [screenToFlowPosition, setNodes],
  );

  function updateNodeData(nodeId: string, patch: Record<string, unknown>) {
    setDirty(true);
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)),
    );
  }

  function deleteNode(nodeId: string) {
    setDirty(true);
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNodeId(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateWorkflow(workflowId, {
        name,
        active,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type as WorkflowNodeType,
          position: n.position,
          data: n.data as Record<string, unknown>,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? undefined,
        })),
      });
      setWorkflow(updated);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleRun() {
    setRunning(true);
    try {
      if (dirty) await handleSave();
      const run = await runWorkflow(workflowId);
      setRuns((prev) => [run, ...prev]);
      setRunsOpen(true);
    } finally {
      setRunning(false);
    }
  }

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink-muted">
        Loading workflow…
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-ink-muted">
        <p>Workflow not found.</p>
        <Link href="/dashboard/workflows" className="text-accent hover:underline">
          Back to workflows
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-surface-2 px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard/workflows"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-secondary hover:text-ink"
          >
            <ArrowLeft size={16} />
          </Link>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
            className="min-w-0 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-ink outline-none focus:border-line focus:bg-cream"
          />
          <button
            onClick={() => {
              setActive((a) => !a);
              setDirty(true);
            }}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? "bg-emerald-500/15 text-emerald-600"
                : "bg-cream-secondary text-ink-muted"
            }`}
          >
            <Power size={11} />
            {active ? "Active" : "Paused"}
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setRunsOpen((o) => !o)}
            className="rounded-full border border-line px-3 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent"
          >
            Runs {runs.length > 0 && `(${runs.length})`}
          </button>
          <Button variant="outline" onClick={handleSave} disabled={saving} className="gap-1.5 !px-4 !py-2 text-xs">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </Button>
          <Button onClick={handleRun} disabled={running} className="gap-1.5 !px-4 !py-2 text-xs">
            {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
            {running ? "Running…" : "Run now"}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="w-64 shrink-0 space-y-4 overflow-y-auto border-r border-line bg-cream-secondary/30 p-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Drag onto canvas
            </p>
            {PALETTE_GROUPS.map((group) => (
              <div key={group.title} className="mb-4">
                <p className="mb-2 text-[11px] font-medium text-ink-muted">{group.title}</p>
                <div className="flex flex-col gap-2">
                  {group.types.map((type) => (
                    <PaletteItem key={type} type={type} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="relative min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={workflowNodeTypes}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            onNodesDelete={(deleted) => {
              setDirty(true);
              if (deleted.some((n) => n.id === selectedNodeId)) setSelectedNodeId(null);
            }}
            onEdgesDelete={() => setDirty(true)}
            deleteKeyCode={["Backspace", "Delete"]}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--color-line)" />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              maskColor="rgba(0,0,0,0.05)"
              className="!bg-surface-2"
            />
          </ReactFlow>

          {runsOpen && (
            <RunsPanel runs={runs} onClose={() => setRunsOpen(false)} />
          )}
        </div>

        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            templates={templates}
            onChange={(patch) => updateNodeData(selectedNode.id, patch)}
            onDelete={() => deleteNode(selectedNode.id)}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
}

function PaletteItem({ type }: { type: WorkflowNodeType }) {
  const meta = NODE_META[type];
  const Icon = meta.icon;
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/reactflow", type);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="flex cursor-grab items-start gap-2.5 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-left shadow-sm transition-colors hover:border-accent active:cursor-grabbing"
    >
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${kindClasses(meta.kind)}`}
      >
        <Icon size={12} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-ink">{meta.label}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">{meta.description}</p>
      </div>
    </div>
  );
}

function ConfigPanel({
  node,
  templates,
  onChange,
  onDelete,
  onClose,
}: {
  node: Node;
  templates: Template[];
  onChange: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const nodeType = node.type as WorkflowNodeType;
  const meta = NODE_META[nodeType];
  const Icon = meta.icon;
  const data = node.data as Record<string, unknown>;

  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-l border-line bg-surface-2 p-4">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${kindClasses(meta.kind)}`}
          >
            <Icon size={13} />
          </span>
          <p className="text-sm font-semibold text-ink">{meta.label}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-cream-secondary hover:text-ink"
        >
          <X size={14} />
        </button>
      </div>
      <p className="mb-4 text-xs text-ink-muted">{meta.description}</p>

      <div className="flex flex-col gap-3">
        {nodeType === "action_send_whatsapp" && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">WhatsApp template</span>
            <select
              value={(data.templateId as string) ?? ""}
              onChange={(e) => {
                const tpl = templates.find((t) => t._id === e.target.value);
                onChange({ templateId: e.target.value, templateName: tpl?.name ?? "" });
              }}
              className="h-10 w-full rounded-lg border border-line bg-cream px-2.5 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">Select a template…</option>
              {templates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
            {templates.length === 0 && (
              <p className="mt-1.5 text-[11px] text-ink-muted">
                No approved WhatsApp templates yet — create one first.
              </p>
            )}
          </label>
        )}

        {(nodeType === "action_update_lead_status" || nodeType === "condition_lead_status") && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">
              {nodeType === "condition_lead_status" ? "Status to compare" : "New status"}
            </span>
            <select
              value={(data.status as string) ?? ""}
              onChange={(e) => onChange({ status: e.target.value })}
              className="h-10 w-full rounded-lg border border-line bg-cream px-2.5 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">Select a status…</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {nodeType === "action_wait" && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">Seconds to wait</span>
            <input
              type="number"
              min={1}
              value={(data.seconds as number) ?? ""}
              onChange={(e) => onChange({ seconds: Number(e.target.value) || 0 })}
              className="h-10 w-full rounded-lg border border-line bg-cream px-2.5 text-sm text-ink outline-none focus:border-accent"
            />
            <p className="mt-1.5 text-[11px] text-ink-muted">
              Test runs log this step without actually pausing.
            </p>
          </label>
        )}

        {nodeType === "action_notify_admin" && (
          <>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-soft">Admin phone number</span>
              <input
                value={(data.phoneNumber as string) ?? ""}
                onChange={(e) => onChange({ phoneNumber: e.target.value })}
                placeholder="+91XXXXXXXXXX"
                className="h-10 w-full rounded-lg border border-line bg-cream px-2.5 text-sm text-ink outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-soft">WhatsApp template</span>
              <select
                value={(data.templateId as string) ?? ""}
                onChange={(e) => {
                  const tpl = templates.find((t) => t._id === e.target.value);
                  onChange({ templateId: e.target.value, templateName: tpl?.name ?? "" });
                }}
                className="h-10 w-full rounded-lg border border-line bg-cream px-2.5 text-sm text-ink outline-none focus:border-accent"
              >
                <option value="">Select a template…</option>
                {templates.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-[11px] text-ink-muted">
              Sends this template to the number above — the customer&apos;s message and AI sentiment are
              passed in as variables where your template uses them.
            </p>
          </>
        )}

        {nodeType === "action_call_api" && (
          <>
            <div className="grid grid-cols-[110px_1fr] gap-2">
              <select
                value={(data.method as string) ?? "GET"}
                onChange={(e) => onChange({ method: e.target.value })}
                className="h-10 rounded-lg border border-line bg-cream px-2 text-sm text-ink outline-none focus:border-accent"
              >
                {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                value={(data.url as string) ?? ""}
                onChange={(e) => onChange({ url: e.target.value })}
                placeholder="https://api.example.com/webhook"
                className="h-10 w-full rounded-lg border border-line bg-cream px-2.5 text-sm text-ink outline-none focus:border-accent"
              />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-soft">Headers (JSON, optional)</span>
              <textarea
                value={(data.headers as string) ?? ""}
                onChange={(e) => onChange({ headers: e.target.value })}
                placeholder='{"Authorization": "Bearer …"}'
                rows={2}
                className="w-full rounded-lg border border-line bg-cream px-2.5 py-2 font-mono text-xs text-ink outline-none focus:border-accent"
              />
            </label>
            {(data.method as string) !== "GET" && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink-soft">Body (optional)</span>
                <textarea
                  value={(data.body as string) ?? ""}
                  onChange={(e) => onChange({ body: e.target.value })}
                  placeholder='{"name": "{{lead_name}}"}'
                  rows={3}
                  className="w-full rounded-lg border border-line bg-cream px-2.5 py-2 font-mono text-xs text-ink outline-none focus:border-accent"
                />
              </label>
            )}
            <p className="text-[11px] text-ink-muted">
              URL, headers, and body can use{" "}
              <code className="rounded bg-cream-secondary px-1 py-0.5">
                {"{{lead_name}}"}
              </code>
              , <code className="rounded bg-cream-secondary px-1 py-0.5">{"{{lead_phone}}"}</code>,{" "}
              <code className="rounded bg-cream-secondary px-1 py-0.5">{"{{lead_email}}"}</code>,{" "}
              <code className="rounded bg-cream-secondary px-1 py-0.5">{"{{lead_status}}"}</code>,{" "}
              <code className="rounded bg-cream-secondary px-1 py-0.5">{"{{message_text}}"}</code>,{" "}
              <code className="rounded bg-cream-secondary px-1 py-0.5">{"{{message_from}}"}</code>,{" "}
              <code className="rounded bg-cream-secondary px-1 py-0.5">{"{{ai_reply}}"}</code>, and{" "}
              <code className="rounded bg-cream-secondary px-1 py-0.5">{"{{ai_sentiment}}"}</code> —
              whichever are available in this run. Requests time out after 10s.
            </p>
          </>
        )}

        {nodeType === "condition_ai_sentiment" && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">Sentiment to compare</span>
            <select
              value={(data.sentiment as string) ?? ""}
              onChange={(e) => onChange({ sentiment: e.target.value })}
              className="h-10 w-full rounded-lg border border-line bg-cream px-2.5 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">Select a sentiment…</option>
              {AI_SENTIMENTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {nodeType === "action_add_lead" && (
          <p className="rounded-lg bg-cream-secondary px-3 py-2.5 text-[11px] text-ink-muted">
            No configuration needed — creates (or reuses) a lead from whoever sent the message that
            triggered this run.
          </p>
        )}

        {nodeType === "condition_ai_in_domain" && (
          <p className="rounded-lg bg-cream-secondary px-3 py-2.5 text-[11px] text-ink-muted">
            No configuration needed — branches on the AI&apos;s own judgment of whether the question was
            actually about this business.
          </p>
        )}

        {(nodeType === "trigger_lead_created" ||
          nodeType === "trigger_manual" ||
          nodeType === "trigger_ai_replied") && (
          <p className="rounded-lg bg-cream-secondary px-3 py-2.5 text-[11px] text-ink-muted">
            Triggers have no configuration — connect this to the first action below.
          </p>
        )}
      </div>

      <button
        onClick={onDelete}
        className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
      >
        <Trash2 size={13} /> Delete node
      </button>
    </aside>
  );
}

function stepIcon(status: string) {
  if (status === "success") return <CheckCircle2 size={13} className="text-emerald-600" />;
  if (status === "error") return <XCircle size={13} className="text-accent" />;
  return <MinusCircle size={13} className="text-ink-muted" />;
}

function RunsPanel({ runs, onClose }: { runs: WorkflowRun[]; onClose: () => void }) {
  return (
    <div className="absolute right-3 top-3 z-10 max-h-[80%] w-80 overflow-y-auto rounded-2xl border border-line bg-surface-2 p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Run history</p>
        <button
          onClick={onClose}
          aria-label="Close runs panel"
          className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted hover:bg-cream-secondary hover:text-ink"
        >
          <X size={13} />
        </button>
      </div>
      {runs.length === 0 ? (
        <p className="text-xs text-ink-muted">No runs yet. Press Run now to test this workflow.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {runs.map((run) => (
            <div key={run._id} className="rounded-xl border border-line p-3">
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold ${run.status === "success" ? "text-emerald-600" : "text-accent"}`}
                >
                  {run.status === "success" ? "Success" : "Error"}
                </span>
                <span className="text-[11px] text-ink-muted">
                  {new Date(run.createdAt).toLocaleString("en-IN")}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] capitalize text-ink-muted">{run.trigger.replace("_", " ")}</p>
              <div className="mt-2 flex flex-col gap-1.5">
                {run.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-ink-soft">
                    {stepIcon(step.status)}
                    <span>{step.message ?? step.type}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkflowEditorView({ workflowId }: { workflowId: string }) {
  return (
    <ReactFlowProvider>
      <EditorInner workflowId={workflowId} />
    </ReactFlowProvider>
  );
}
