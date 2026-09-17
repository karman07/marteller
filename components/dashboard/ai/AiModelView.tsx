"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Key, KeyRound, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ChannelIcon } from "@/components/dashboard/ChannelIcon";
import {
  AI_PROVIDERS,
  AiConfig,
  AiModel,
  AiProvider,
  fetchAiConfig,
  fetchAiModels,
  removeProviderApiKey,
  setProviderApiKey,
  updateAiConfig,
} from "@/lib/ai";
import { CHANNELS, channelLabel } from "@/lib/channels";
import { fetchBalance } from "@/lib/wallet";
import { formatINR } from "@/lib/currency";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function AiModelView() {
  const [models, setModels] = useState<AiModel[]>([]);
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [balancePaise, setBalancePaise] = useState<number | null>(null);
  const [systemPromptInput, setSystemPromptInput] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);

  const [editingProvider, setEditingProvider] = useState<AiProvider | null>(null);
  const [keyDraft, setKeyDraft] = useState("");
  const [savingProviderKey, setSavingProviderKey] = useState(false);

  useEffect(() => {
    fetchAiModels().then(setModels).catch(() => {});
    fetchAiConfig()
      .then((c) => {
        setConfig(c);
        setSystemPromptInput(c.systemPrompt ?? "");
      })
      .catch(() => {});
    fetchBalance().then((r) => setBalancePaise(r.balancePaise)).catch(() => {});
  }, []);

  async function selectModel(id: AiConfig["selectedModel"]) {
    const updated = await updateAiConfig({ selectedModel: id });
    setConfig(updated);
  }

  async function selectKeyMode(mode: AiConfig["keyMode"]) {
    const updated = await updateAiConfig({ keyMode: mode });
    setConfig(updated);
  }

  function startEditKey(provider: AiProvider) {
    setEditingProvider(provider);
    setKeyDraft("");
  }

  function cancelEditKey() {
    setEditingProvider(null);
    setKeyDraft("");
  }

  async function saveProviderKey(provider: AiProvider) {
    if (!keyDraft.trim()) return;
    setSavingProviderKey(true);
    try {
      const updated = await setProviderApiKey(provider, keyDraft.trim());
      setConfig(updated);
      setEditingProvider(null);
      setKeyDraft("");
    } finally {
      setSavingProviderKey(false);
    }
  }

  async function handleRemoveProviderKey(provider: AiProvider) {
    const updated = await removeProviderApiKey(provider);
    setConfig(updated);
  }

  async function toggleAutoReplyChannel(channel: (typeof CHANNELS)[number]) {
    if (!config) return;
    const enabled = config.autoReplyChannels.includes(channel);
    const next = enabled
      ? config.autoReplyChannels.filter((c) => c !== channel)
      : [...config.autoReplyChannels, channel];
    const updated = await updateAiConfig({ autoReplyChannels: next });
    setConfig(updated);
  }

  async function toggleAutoSendChannel(channel: (typeof CHANNELS)[number]) {
    if (!config) return;
    const enabled = config.autoSendChannels.includes(channel);
    const next = enabled
      ? config.autoSendChannels.filter((c) => c !== channel)
      : [...config.autoSendChannels, channel];
    const updated = await updateAiConfig({ autoSendChannels: next });
    setConfig(updated);
  }

  async function saveSystemPrompt() {
    setSavingPrompt(true);
    try {
      const updated = await updateAiConfig({ systemPrompt: systemPromptInput.trim() || undefined });
      setConfig(updated);
    } finally {
      setSavingPrompt(false);
    }
  }

  const selectedModel = models.find((m) => m.id === config?.selectedModel);
  const modelsByProvider = useMemo(() => {
    return AI_PROVIDERS.map((p) => ({
      provider: p,
      models: models.filter((m) => m.provider === p.id),
    })).filter((g) => g.models.length > 0);
  }, [models]);

  const keyByProvider = useMemo(() => {
    const map = new Map(config?.ownApiKeys.map((k) => [k.provider, k]) ?? []);
    return map;
  }, [config?.ownApiKeys]);

  const promptDirty = (config?.systemPrompt ?? "") !== systemPromptInput;
  const byok = config?.keyMode === "own_key";

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-1 text-sm font-semibold text-ink">Model</h2>
        <p className="mb-4 text-xs text-ink-soft">
          {byok
            ? "Bringing your own key — pick any model from a provider you've connected below."
            : "Pay-per-use models across every major provider, priced per 1K tokens."}
        </p>

        <div className="flex flex-col gap-5">
          {modelsByProvider.map(({ provider, models: providerModels }) => {
            const hasKey = keyByProvider.has(provider.id);
            return (
              <div key={provider.id}>
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{provider.label}</p>
                  {byok && (
                    <span
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal ${
                        hasKey ? "bg-[#0ca30c]/10 text-[#0ca30c]" : "bg-cream-secondary text-ink-muted"
                      }`}
                    >
                      <KeyRound size={10} />
                      {hasKey ? "Key saved" : "No key"}
                    </span>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {providerModels.map((m) => {
                    const active = config?.selectedModel === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => selectModel(m.id)}
                        className={`rounded-2xl border p-4 text-left transition-colors ${
                          active
                            ? "border-accent bg-accent-soft/40"
                            : "border-line bg-surface-2 hover:border-ink-muted"
                        }`}
                      >
                        <Bot size={17} className={active ? "text-accent" : "text-ink-muted"} />
                        <p className="mt-2 text-sm font-semibold text-ink">{m.label}</p>
                        <p className="mt-1 text-xs text-ink-soft">
                          {formatINR(m.ratePer1kTokensPaise)} / 1K tokens
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">Billing mode</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => selectKeyMode("managed_credits")}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              config?.keyMode === "managed_credits"
                ? "border-accent bg-accent-soft/40"
                : "border-line bg-surface-2 hover:border-ink-muted"
            }`}
          >
            <Wallet size={17} className={config?.keyMode === "managed_credits" ? "text-accent" : "text-ink-muted"} />
            <p className="mt-2 text-sm font-semibold text-ink">Pay per use</p>
            <p className="mt-1 text-xs text-ink-soft">
              We handle the model access — billed to your account in ₹.
            </p>
          </button>
          <button
            onClick={() => selectKeyMode("own_key")}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              byok ? "border-accent bg-accent-soft/40" : "border-line bg-surface-2 hover:border-ink-muted"
            }`}
          >
            <Key size={17} className={byok ? "text-accent" : "text-ink-muted"} />
            <p className="mt-2 text-sm font-semibold text-ink">Bring your own key</p>
            <p className="mt-1 text-xs text-ink-soft">Use your own provider API key at cost.</p>
          </button>
        </div>

        {config?.keyMode === "managed_credits" && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-cream-secondary px-4 py-3">
            <div>
              <p className="text-sm text-ink-soft">
                Wallet balance · {selectedModel ? `${selectedModel.label} selected` : ""}
              </p>
              <p className="text-lg font-semibold text-ink">
                {balancePaise === null ? "—" : formatINR(balancePaise)}
              </p>
            </div>
            <Button href="/dashboard/billing?addBalance=true" variant="outline">
              Add balance
            </Button>
          </div>
        )}
      </section>

      {byok && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-ink">API keys</h2>
          <p className="mb-3 text-xs text-ink-soft">
            One key per provider — every model under that provider uses it. Keys are never shown again
            after saving, only a masked preview.
          </p>
          <div className="flex flex-col gap-2">
            {AI_PROVIDERS.map((provider) => {
              const entry = keyByProvider.get(provider.id);
              const editing = editingProvider === provider.id;
              return (
                <div key={provider.id} className="rounded-xl border border-line bg-surface-2 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          entry ? "bg-[#0ca30c]/10 text-[#0ca30c]" : "bg-cream-secondary text-ink-muted"
                        }`}
                      >
                        <KeyRound size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">{provider.label}</p>
                        <p className="text-xs text-ink-muted">
                          {entry ? `${entry.maskedKey} · updated ${formatDate(entry.updatedAt)}` : "No key saved"}
                        </p>
                      </div>
                    </div>
                    {!editing && (
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" onClick={() => startEditKey(provider.id)}>
                          {entry ? "Replace" : "Add key"}
                        </Button>
                        {entry && (
                          <button
                            onClick={() => handleRemoveProviderKey(provider.id)}
                            className="text-ink-muted hover:text-accent"
                            aria-label={`Remove ${provider.label} key`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {editing && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        autoFocus
                        type="password"
                        value={keyDraft}
                        onChange={(e) => setKeyDraft(e.target.value)}
                        placeholder={`Paste ${provider.label} API key`}
                        className="h-10 flex-1 rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
                      />
                      <Button
                        onClick={() => saveProviderKey(provider.id)}
                        disabled={savingProviderKey || !keyDraft.trim()}
                      >
                        {savingProviderKey ? "Saving…" : "Save"}
                      </Button>
                      <Button variant="ghost" onClick={cancelEditKey}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-1 text-sm font-semibold text-ink">Auto-reply channels</h2>
        <p className="mb-3 text-xs text-ink-soft">
          When enabled, the assistant answers incoming messages on that channel automatically, grounded
          in your knowledge base.
        </p>
        <div className="flex flex-col gap-2">
          {CHANNELS.map((channel) => {
            const enabled = config?.autoReplyChannels.includes(channel) ?? false;
            return (
              <div
                key={channel}
                className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <ChannelIcon channel={channel} size={16} />
                  <div>
                    <p className="text-sm font-medium text-ink">{channelLabel(channel)}</p>
                    <p className="text-xs text-ink-muted">
                      {enabled ? "Auto-reply is on" : "Auto-reply is off"}
                    </p>
                  </div>
                </div>
                <button
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => toggleAutoReplyChannel(channel)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    enabled ? "bg-accent" : "bg-cream-secondary"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      enabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold text-ink">Auto-send replies</h2>
        <p className="mb-3 text-xs text-ink-soft">
          When enabled, the assistant&apos;s drafted reply is sent to the customer right away. When off, it&apos;s
          held in the inbox for you to approve or reject first.
        </p>
        <div className="flex flex-col gap-2">
          {CHANNELS.map((channel) => {
            const enabled = config?.autoSendChannels.includes(channel) ?? false;
            return (
              <div
                key={channel}
                className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <ChannelIcon channel={channel} size={16} />
                  <div>
                    <p className="text-sm font-medium text-ink">{channelLabel(channel)}</p>
                    <p className="text-xs text-ink-muted">
                      {enabled ? "Auto-send is on" : "Replies need approval"}
                    </p>
                  </div>
                </div>
                <button
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => toggleAutoSendChannel(channel)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    enabled ? "bg-accent" : "bg-cream-secondary"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      enabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold text-ink">Agent instructions</h2>
        <p className="mb-3 text-xs text-ink-soft">
          Tell the assistant how to talk to customers — tone, escalation rules, and what it should never
          promise.
        </p>
        <textarea
          value={systemPromptInput}
          onChange={(e) => setSystemPromptInput(e.target.value)}
          placeholder="e.g. Be warm and concise. If a customer asks for a refund, tell them a human will follow up within 24 hours. Never quote a price that isn't in the knowledge base."
          rows={4}
          className="w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
        />
        {promptDirty && (
          <div className="mt-2 flex justify-end">
            <Button onClick={saveSystemPrompt} disabled={savingPrompt} variant="outline">
              {savingPrompt ? "Saving…" : "Save instructions"}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
