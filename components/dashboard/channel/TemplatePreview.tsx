import { ExternalLink, Phone } from "lucide-react";
import { Channel } from "@/lib/channels";
import { HeaderType, TemplateButton, templateAssetUrl } from "@/lib/templates";

function renderText(text: string, sampleValues: Record<string, string>) {
  return text.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_m, key) => sampleValues[key] || `{{${key}}}`);
}

export function TemplatePreview({
  channel,
  headerType = "text",
  header,
  headerImageUrl,
  body,
  footer,
  subject,
  bannerImageUrl,
  buttons,
  sampleValues,
}: {
  channel: Channel;
  headerType?: HeaderType;
  header?: string;
  headerImageUrl?: string;
  body: string;
  footer?: string;
  subject?: string;
  bannerImageUrl?: string;
  buttons?: TemplateButton[];
  sampleValues: Record<string, string>;
}) {
  const renderedBody = body ? renderText(body, sampleValues) : "";
  const renderedHeader = header ? renderText(header, sampleValues) : "";
  const renderedFooter = footer ? renderText(footer, sampleValues) : "";
  const renderedSubject = subject ? renderText(subject, sampleValues) : "";

  if (channel === "whatsapp") {
    return (
      <div className="rounded-2xl bg-[#e5ded4] p-4 dark:bg-[#0b141a]">
        <div className="max-w-[85%] overflow-hidden rounded-lg rounded-tl-none bg-white shadow-sm dark:bg-[#1f2c34]">
          {headerType === "image" && headerImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={templateAssetUrl(headerImageUrl)}
              alt=""
              className="h-36 w-full object-cover"
            />
          )}
          <div className="p-3">
            {headerType === "text" && renderedHeader && (
              <p className="mb-1 text-sm font-bold text-ink">{renderedHeader}</p>
            )}
            <p className="whitespace-pre-wrap text-sm text-ink">
              {renderedBody || <span className="text-ink-muted">Message body…</span>}
            </p>
            {renderedFooter && <p className="mt-1 text-xs text-ink-muted">{renderedFooter}</p>}
            {buttons && buttons.length > 0 && (
              <div className="mt-2 flex flex-col gap-1 border-t border-line/60 pt-2">
                {buttons.map((b, i) => (
                  <p
                    key={i}
                    className="flex items-center justify-center gap-1.5 text-center text-xs font-medium text-[#00a5f4]"
                  >
                    {b.type === "url" && <ExternalLink size={12} />}
                    {b.type === "phone_number" && <Phone size={12} />}
                    {b.text || "Button"}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (channel === "email") {
    return (
      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="border-b border-line bg-cream-secondary px-4 py-2.5">
          <p className="text-xs text-ink-muted">Subject</p>
          <p className="text-sm font-medium text-ink">
            {renderedSubject || <span className="text-ink-muted">Email subject…</span>}
          </p>
        </div>
        {bannerImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={templateAssetUrl(bannerImageUrl)} alt="" className="h-32 w-full object-cover" />
        )}
        <div className="bg-white p-4 dark:bg-[#f1ede5] dark:text-[#241e19]">
          <p className="whitespace-pre-wrap text-sm text-[#241e19]">
            {renderedBody || <span className="text-ink-muted">Email body…</span>}
          </p>
        </div>
      </div>
    );
  }

  // sms
  const segments = Math.max(1, Math.ceil((renderedBody.length || 0) / 160));
  return (
    <div>
      <div className="rounded-2xl bg-cream-secondary p-4">
        <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-white px-3 py-2 shadow-sm dark:bg-[#241e19]">
          <p className="whitespace-pre-wrap text-sm text-ink">
            {renderedBody || <span className="text-ink-muted">Message body…</span>}
          </p>
        </div>
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        {renderedBody.length} characters · {segments} segment{segments > 1 ? "s" : ""}
      </p>
    </div>
  );
}
