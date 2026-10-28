import { request, requestForm, BACKEND_URL } from "./http";
import { Channel } from "./channels";

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

export const TEMPLATE_BUTTON_TYPES: { value: TemplateButtonType; label: string }[] = [
  { value: "quick_reply", label: "Quick reply" },
  { value: "url", label: "Visit website" },
  { value: "phone_number", label: "Call phone number" },
];

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
  // Always true for everything the admin endpoints return — this is the
  // shared system template library, not a tenant's own drafts.
  isSystem: boolean;
  createdAt: string;
};

export type CreateTemplatePayload = {
  channel: Channel;
  name: string;
  category?: WhatsappCategory;
  subject?: string;
  headerType?: HeaderType;
  header?: string;
  headerImageUrl?: string;
  body: string;
  footer?: string;
  bannerImageUrl?: string;
  buttons?: TemplateButton[];
};

export function templateAssetUrl(path: string) {
  return path.startsWith("http") ? path : `${BACKEND_URL}${path}`;
}

// Shared system template library — admin/templates, not the tenant /templates
// route (CRUD here is admin-only; reads are shared with every tenant).
export function listTemplates(channel: Channel, category?: WhatsappCategory) {
  const params = new URLSearchParams({ channel });
  if (category) params.set("category", category);
  return request<Template[]>(`/admin/templates?${params.toString()}`);
}

export function createTemplate(payload: CreateTemplatePayload) {
  return request<Template>("/admin/templates", { method: "POST", body: JSON.stringify(payload) });
}

export function updateTemplate(id: string, payload: Partial<CreateTemplatePayload>) {
  return request<Template>(`/admin/templates/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteTemplate(id: string) {
  return request<{ deleted: boolean }>(`/admin/templates/${id}`, { method: "DELETE" });
}

// No admin-scoped upload-image route exists — the tenant-facing one only
// requires a valid JWT (any role, see TemplatesController's JwtAuthGuard),
// so an admin token works against it directly.
export function uploadTemplateImage(file: File) {
  const formData = new FormData();
  formData.append("image", file);
  return requestForm<{ url: string }>("/templates/upload-image", formData);
}
