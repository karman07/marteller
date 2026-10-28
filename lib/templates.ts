import { request } from "./http";
import { Channel } from "./channels";

// Read-only mirror of frontend/lib/templates.ts's types — sales never
// creates/edits/deletes templates (only admin manages the shared system
// library, via AdminController), so this module only ever lists them.
export { assetUrl as templateAssetUrl } from "./http";

export type WhatsappCategory = "marketing" | "utility" | "authentication";
export type TemplateStatus = "draft" | "pending_review" | "approved" | "rejected";
export type HeaderType = "text" | "image";
export type TemplateButtonType = "quick_reply" | "phone_number" | "url";
export type TemplateButton = {
  type: TemplateButtonType;
  text: string;
  phoneNumber?: string;
  url?: string;
};

export const WHATSAPP_CATEGORIES: { value: WhatsappCategory; label: string }[] = [
  { value: "marketing", label: "Marketing" },
  { value: "utility", label: "Utility" },
  { value: "authentication", label: "Authentication" },
];

export type Template = {
  _id: string;
  channel: Channel;
  name: string;
  category?: WhatsappCategory;
  language?: string;
  subject?: string;
  headerType?: HeaderType;
  header?: string;
  headerImageUrl?: string;
  body: string;
  footer?: string;
  bannerImageUrl?: string;
  buttons: TemplateButton[];
  variables: string[];
  status: TemplateStatus;
  isSystem: boolean;
  createdAt: string;
};

// GET /sales/templates — the shared system template library (plus this
// rep's own templates, via the backend's existing $or), read-only.
export function listTemplates(channel: Channel, category?: WhatsappCategory) {
  const params = new URLSearchParams({ channel });
  if (category) params.set("category", category);
  return request<Template[]>(`/sales/templates?${params.toString()}`);
}
