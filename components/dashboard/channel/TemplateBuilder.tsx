"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, Loader2, Plus, Trash2, Type } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Channel } from "@/lib/channels";
import {
  CreateTemplatePayload,
  HeaderType,
  TEMPLATE_BUTTON_TYPES,
  Template,
  TemplateButton,
  TemplateButtonType,
  WHATSAPP_CATEGORIES,
  WhatsappCategory,
  templateAssetUrl,
  uploadTemplateImage,
} from "@/lib/templates";
import { TemplatePreview } from "./TemplatePreview";
import { VariableChips } from "./VariableChips";

type TextField = HTMLInputElement | HTMLTextAreaElement;

function insertAt(el: TextField | null, value: string, setValue: (v: string) => void, varName: string) {
  const insertText = `{{${varName}}}`;
  if (el) {
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + insertText + value.slice(end);
    setValue(next);
    const cursor = start + insertText.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  } else {
    setValue(value + insertText);
  }
}

function allowDrop(e: React.DragEvent) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
}

function extractVariables(...texts: (string | undefined)[]): string[] {
  const found = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    for (const match of text.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)) {
      found.add(match[1]);
    }
  }
  return Array.from(found);
}

export function TemplateBuilder({
  channel,
  open,
  onClose,
  onSave,
  editingTemplate,
}: {
  channel: Channel;
  open: boolean;
  onClose: () => void;
  onSave: (payload: CreateTemplatePayload) => Promise<void>;
  editingTemplate?: Template | null;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<WhatsappCategory>("utility");
  const [subject, setSubject] = useState("");
  const [headerType, setHeaderType] = useState<HeaderType>("text");
  const [header, setHeader] = useState("");
  const [headerImageUrl, setHeaderImageUrl] = useState("");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [buttons, setButtons] = useState<TemplateButton[]>([]);
  const [sampleValues, setSampleValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const headerRef = useRef<HTMLInputElement>(null);

  const variables = useMemo(
    () => extractVariables(header, body, footer, subject),
    [header, body, footer, subject],
  );

  useEffect(() => {
    if (!open) return;
    if (editingTemplate) {
      setName(editingTemplate.name);
      setCategory(editingTemplate.category ?? "utility");
      setSubject(editingTemplate.subject ?? "");
      setHeaderType(editingTemplate.headerType ?? "text");
      setHeader(editingTemplate.header ?? "");
      setHeaderImageUrl(editingTemplate.headerImageUrl ?? "");
      setBody(editingTemplate.body);
      setFooter(editingTemplate.footer ?? "");
      setBannerImageUrl(editingTemplate.bannerImageUrl ?? "");
      setButtons(editingTemplate.buttons ?? []);
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingTemplate]);

  function reset() {
    setName("");
    setCategory("utility");
    setSubject("");
    setHeaderType("text");
    setHeader("");
    setHeaderImageUrl("");
    setBody("");
    setFooter("");
    setBannerImageUrl("");
    setButtons([]);
    setSampleValues({});
    setError(null);
  }

  async function handleUpload(file: File, target: "header" | "banner") {
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadTemplateImage(file);
      if (target === "header") setHeaderImageUrl(url);
      else setBannerImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setError(null);
    if (!name.trim() || !body.trim()) {
      setError("Name and body are required.");
      return;
    }
    if (channel === "email" && !subject.trim()) {
      setError("Email templates need a subject.");
      return;
    }
    if (channel === "whatsapp" && headerType === "image" && !headerImageUrl) {
      setError("Upload a header image, or switch back to text.");
      return;
    }
    if (channel === "whatsapp") {
      for (const b of buttons) {
        if (!b.text.trim()) continue;
        if (b.type === "url" && !b.url?.trim()) {
          setError("Add a URL for the website button, or remove it.");
          return;
        }
        if (b.type === "phone_number" && !b.phoneNumber?.trim()) {
          setError("Add a phone number for the call button, or remove it.");
          return;
        }
      }
    }

    setSaving(true);
    try {
      await onSave({
        channel,
        name: name.trim(),
        category: channel === "whatsapp" ? category : undefined,
        subject: channel === "email" ? subject.trim() : undefined,
        headerType: channel === "whatsapp" ? headerType : undefined,
        header: channel === "whatsapp" && headerType === "text" ? header.trim() || undefined : undefined,
        headerImageUrl: channel === "whatsapp" && headerType === "image" ? headerImageUrl : undefined,
        body: body.trim(),
        footer: channel === "whatsapp" ? footer.trim() || undefined : undefined,
        bannerImageUrl: channel === "email" ? bannerImageUrl || undefined : undefined,
        buttons: channel === "whatsapp" ? buttons.filter((b) => b.text.trim()) : undefined,
      });
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={editingTemplate ? "Edit template" : "New template"}
      size="lg"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          {error && (
            <p className="rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{error}</p>
          )}

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Template name"
            className="h-10 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
          />

          {channel === "whatsapp" && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as WhatsappCategory)}
              className="h-10 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
            >
              {WHATSAPP_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          )}

          {channel === "email" && (
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject (supports {{variables}})"
              className="h-10 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
            />
          )}

          {channel === "whatsapp" && (
            <div>
              <div className="mb-1.5 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setHeaderType("text")}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    headerType === "text"
                      ? "border-accent bg-accent-soft/40 text-accent"
                      : "border-line text-ink-soft"
                  }`}
                >
                  <Type size={12} /> Text header
                </button>
                <button
                  type="button"
                  onClick={() => setHeaderType("image")}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    headerType === "image"
                      ? "border-accent bg-accent-soft/40 text-accent"
                      : "border-line text-ink-soft"
                  }`}
                >
                  <ImageIcon size={12} /> Image header
                </button>
              </div>

              {headerType === "text" ? (
                <input
                  ref={headerRef}
                  value={header}
                  onChange={(e) => setHeader(e.target.value)}
                  onDragOver={allowDrop}
                  onDrop={(e) => {
                    e.preventDefault();
                    const varName = e.dataTransfer.getData("text/plain");
                    if (varName) insertAt(e.currentTarget, header, setHeader, varName);
                  }}
                  placeholder="Header (optional)"
                  maxLength={60}
                  className="h-10 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
                />
              ) : (
                <ImageUploadField
                  imageUrl={headerImageUrl}
                  uploading={uploading}
                  onSelect={(file) => handleUpload(file, "header")}
                />
              )}
            </div>
          )}

          <VariableChips onInsert={(v) => insertAt(bodyRef.current, body, setBody, v)} />

          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onDragOver={allowDrop}
            onDrop={(e) => {
              e.preventDefault();
              const varName = e.dataTransfer.getData("text/plain");
              if (varName) insertAt(e.currentTarget, body, setBody, varName);
            }}
            placeholder="Body — drag a variable in, or type {{name}} directly"
            rows={5}
            maxLength={channel === "whatsapp" ? 1024 : undefined}
            className="w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />

          {channel === "email" && (
            <div>
              <p className="mb-1.5 text-xs text-ink-muted">Banner image (optional)</p>
              <ImageUploadField
                imageUrl={bannerImageUrl}
                uploading={uploading}
                onSelect={(file) => handleUpload(file, "banner")}
              />
            </div>
          )}

          {channel === "whatsapp" && (
            <>
              <input
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                placeholder="Footer (optional)"
                maxLength={60}
                className="h-10 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
              />

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs text-ink-muted">Buttons (up to 3)</p>
                  {buttons.length < 3 && (
                    <button
                      type="button"
                      onClick={() => setButtons([...buttons, { type: "quick_reply", text: "" }])}
                      className="flex items-center gap-1 text-xs font-medium text-accent"
                    >
                      <Plus size={12} /> Add
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {buttons.map((btn, i) => {
                    const phoneCount = buttons.filter((b) => b.type === "phone_number").length;
                    const urlCount = buttons.filter((b) => b.type === "url").length;
                    function updateButton(patch: Partial<TemplateButton>) {
                      const next = [...buttons];
                      next[i] = { ...next[i], ...patch };
                      setButtons(next);
                    }
                    return (
                      <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-line/60 p-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={btn.type}
                            onChange={(e) => updateButton({ type: e.target.value as TemplateButtonType })}
                            className="h-9 rounded-lg border border-line bg-cream px-2 text-xs text-ink outline-none focus:border-accent"
                          >
                            {TEMPLATE_BUTTON_TYPES.map((t) => (
                              <option
                                key={t.value}
                                value={t.value}
                                disabled={
                                  (t.value === "phone_number" && phoneCount >= 1 && btn.type !== "phone_number") ||
                                  (t.value === "url" && urlCount >= 2 && btn.type !== "url")
                                }
                              >
                                {t.label}
                              </option>
                            ))}
                          </select>
                          <input
                            value={btn.text}
                            onChange={(e) => updateButton({ text: e.target.value })}
                            placeholder="Button text"
                            maxLength={25}
                            className="h-9 flex-1 rounded-lg border border-line bg-cream px-2.5 text-sm text-ink outline-none focus:border-accent"
                          />
                          <button
                            type="button"
                            onClick={() => setButtons(buttons.filter((_, idx) => idx !== i))}
                            className="text-ink-muted hover:text-accent"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {btn.type === "url" && (
                          <input
                            value={btn.url ?? ""}
                            onChange={(e) => updateButton({ url: e.target.value })}
                            placeholder="https://example.com"
                            maxLength={2000}
                            className="h-9 w-full rounded-lg border border-line bg-cream px-2.5 text-sm text-ink outline-none focus:border-accent"
                          />
                        )}
                        {btn.type === "phone_number" && (
                          <input
                            value={btn.phoneNumber ?? ""}
                            onChange={(e) => updateButton({ phoneNumber: e.target.value })}
                            placeholder="+911234567890"
                            maxLength={20}
                            className="h-9 w-full rounded-lg border border-line bg-cream px-2.5 text-sm text-ink outline-none focus:border-accent"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {variables.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs text-ink-muted">Preview values</p>
              <div className="flex flex-col gap-2">
                {variables.map((v) => (
                  <input
                    key={v}
                    value={sampleValues[v] ?? ""}
                    onChange={(e) => setSampleValues({ ...sampleValues, [v]: e.target.value })}
                    placeholder={`Sample for {{${v}}}`}
                    className="h-9 w-full rounded-lg border border-line bg-cream px-2.5 text-sm text-ink outline-none focus:border-accent"
                  />
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleSave} disabled={saving || uploading} className="w-full">
            {saving ? "Saving…" : editingTemplate ? "Save changes" : "Save template"}
          </Button>
        </div>

        <div>
          <p className="mb-2 text-xs text-ink-muted">Live preview</p>
          <TemplatePreview
            channel={channel}
            headerType={headerType}
            header={header}
            headerImageUrl={headerImageUrl}
            body={body}
            footer={footer}
            subject={subject}
            bannerImageUrl={bannerImageUrl}
            buttons={buttons}
            sampleValues={sampleValues}
          />
        </div>
      </div>
    </Modal>
  );
}

function ImageUploadField({
  imageUrl,
  uploading,
  onSelect,
}: {
  imageUrl: string;
  uploading: boolean;
  onSelect: (file: File) => void;
}) {
  return (
    <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-dashed border-line bg-cream text-center transition-colors hover:border-accent">
      {uploading ? (
        <Loader2 size={16} className="animate-spin text-ink-muted" />
      ) : imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={templateAssetUrl(imageUrl)} alt="" className="h-full w-full object-cover" />
      ) : (
        <>
          <ImageIcon size={16} className="text-ink-muted" />
          <span className="px-2 text-xs text-ink-soft">PNG, JPEG, or WebP — up to 5MB</span>
        </>
      )}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
        }}
      />
    </label>
  );
}
