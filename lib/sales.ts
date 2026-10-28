import { BACKEND_URL, request, requestForm } from "./http";

export type VerificationStatus = "not_submitted" | "pending" | "verified" | "rejected";
// Kept identical to the backend's SalesLeadStatus — a lead and a customer
// share one unified pipeline (see fetchPipeline()), so the same stage
// names mean the same thing regardless of which kind a card is.
export type SalesStage =
  | "new"
  | "contacted"
  | "qualified"
  | "negotiating"
  | "pending_verification"
  | "converted"
  | "lost";
export type VerificationFieldType = "text" | "textarea" | "select" | "number";

export const VERIFICATION_STATUSES: { value: VerificationStatus; label: string }[] = [
  { value: "not_submitted", label: "Not submitted" },
  { value: "pending", label: "Pending review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

export const SALES_STAGES: { value: SalesStage; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "negotiating", label: "Negotiating" },
  { value: "pending_verification", label: "Pending verification" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

export const FIELD_TYPES: { value: VerificationFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Dropdown" },
  { value: "number", label: "Number" },
];

export type Applicant = {
  userId: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  companyName: string | null;
  accountType: string | null;
  verificationStatus: VerificationStatus;
  submittedAt: string | null;
  salesStage: SalesStage;
  createdAt: string;
};

export type VerificationDocument = {
  type: string;
  fileName: string;
  storedFileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type VerificationRecord = {
  userId: string;
  fieldValues: Record<string, string>;
  documents: VerificationDocument[];
  status: VerificationStatus;
  reviewNote?: string;
  submittedAt?: string;
  reviewedAt?: string;
};

export type VerificationFormField = {
  _id: string;
  key: string;
  label: string;
  type: VerificationFieldType;
  required: boolean;
  options: string[];
  placeholder?: string;
  order: number;
};

export type ApplicantDetail = {
  user: {
    userId: string;
    name: string | null;
    email: string | null;
    emailVerified: boolean;
    phoneNumber: string | null;
    photoUrl: string | null;
    companyName: string | null;
    companySize: string | null;
    accountType: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    countryDialCode: string | null;
    interests: string[];
    onboarded: boolean;
    walletBalancePaise: number;
    salesStage: SalesStage;
    salesNotes: string | null;
    createdAt: string;
  };
  verification: VerificationRecord;
};

export type UsageSummary = {
  totalMessages: number;
  byChannel: { channel: string; count: number; costPaise: number }[];
  byStatus: { status: string; count: number }[];
  walletBalancePaise: number;
  leadsCount: number;
};

export type MessageLimits = { whatsapp: number; email: number; sms: number; ai: number };

export type SubscriptionStatus =
  | "created"
  | "authenticated"
  | "active"
  | "pending"
  | "halted"
  | "cancelled"
  | "completed"
  | "expired";

export type Subscription = {
  _id: string;
  planId: string;
  razorpaySubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  messagesUsedThisPeriod: MessageLimits;
  cancelAtPeriodEnd: boolean;
};

export type Plan = {
  _id: string;
  name: string;
  slug: string;
  priceMonthlyPaise: number;
  currency: string;
  messageLimits: MessageLimits;
};

// This applicant's plan + usage this period — null if they're on pure
// pay-as-you-go wallet billing with no active plan. Read-only for sales
// (plan management is admin-only); same endpoint shape as AdminController's.
export function fetchApplicantSubscription(userId: string) {
  return request<{ subscription: Subscription; plan: Plan } | null>(
    `/sales/applicants/${userId}/subscription`,
  );
}

export type SalesStats = {
  totalSignups: number;
  byVerification: Record<VerificationStatus, number>;
  byStage: Record<SalesStage, number>;
  isDummyData: boolean;
};

export function listApplicants() {
  return request<{ items: Applicant[]; isDummyData: boolean }>("/sales/applicants");
}

export type PipelineEntry = {
  kind: "lead" | "customer";
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  notes: string | null;
  stage: SalesStage;
  assignedToUserId: string | null;
  verificationStatus: VerificationStatus | null;
  createdAt: string;
};

// The single unified board — leads and customers together, one pipeline.
// A promoted lead only ever appears here as its linked customer entry
// (kind: "customer"), never as a separate lead card too — see the
// backend's SalesService.listPipeline() comment.
export function fetchPipeline() {
  return request<PipelineEntry[]>("/sales/pipeline");
}

export function fetchStats() {
  return request<SalesStats>("/sales/stats");
}

export function fetchApplicant(userId: string) {
  return request<ApplicantDetail>(`/sales/applicants/${userId}`);
}

export function fetchUsage(userId: string) {
  return request<UsageSummary>(`/sales/applicants/${userId}/usage`);
}

// Sales crediting a customer's wallet directly — separate from Plan
// (platform access fee); this is the pay-as-you-go balance that funds
// messages beyond a plan's allowance. The customer can also do this
// themselves from their own dashboard, or admin can via the identical
// route on the admin app.
export function addApplicantBalance(userId: string, amountPaise: number) {
  return request<{ balancePaise: number }>(`/sales/applicants/${userId}/wallet/add-balance`, {
    method: "POST",
    body: JSON.stringify({ amountPaise }),
  });
}

export type SmsRoute = "q" | "dlt";

export type SmsCredential = {
  _id: string;
  userId: string;
  apiKey: string;
  route: SmsRoute;
  senderId?: string;
  configuredByUserId?: string;
  createdAt: string;
  updatedAt: string;
};

// Fast2SMS config for this applicant — staff-provisioned (see the
// backend's SmsCredential schema comment), so this is the same read/write
// pair for both sales and admin.
export function fetchSmsCredential(userId: string) {
  return request<SmsCredential | null>(`/sales/applicants/${userId}/sms-credential`);
}

export function setSmsCredential(
  userId: string,
  payload: { apiKey: string; route?: SmsRoute; senderId?: string },
) {
  return request<SmsCredential>(`/sales/applicants/${userId}/sms-credential`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function removeSmsCredential(userId: string) {
  return request<{ deleted: boolean }>(`/sales/applicants/${userId}/sms-credential`, {
    method: "DELETE",
  });
}

export type WhatsAppCredential = {
  _id: string;
  userId: string;
  phoneNumberId: string;
  apiKey: string;
  wabaId?: string;
  configuredByUserId?: string;
  createdAt: string;
  updatedAt: string;
};

// WhatsApp provider config for this applicant — staff-provisioned (see the
// backend's WhatsAppCredential schema comment), same read/write pair for
// both sales and admin.
export function fetchWhatsAppCredential(userId: string) {
  return request<WhatsAppCredential | null>(`/sales/applicants/${userId}/whatsapp-credential`);
}

export function setWhatsAppCredential(
  userId: string,
  payload: { phoneNumberId: string; apiKey: string; wabaId?: string },
) {
  return request<WhatsAppCredential>(`/sales/applicants/${userId}/whatsapp-credential`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function removeWhatsAppCredential(userId: string) {
  return request<{ deleted: boolean }>(`/sales/applicants/${userId}/whatsapp-credential`, {
    method: "DELETE",
  });
}

export type WhatsappTemplateApproval = {
  userId: string;
  tenantName: string;
  templateId: string;
  templateName: string;
  templateBody: string;
  autoSubmitted: boolean;
  submittedAt: string;
};

// The queue of WhatsApp templates (across every tenant) waiting on the one
// manual registration step our provider requires — staff-handled, never
// seen by the tenant (see the backend WhatsAppTemplateMapping comment).
export function fetchWhatsappTemplateApprovals() {
  return request<WhatsappTemplateApproval[]>("/sales/whatsapp-template-approvals");
}

export function reviewWhatsappTemplateApproval(
  userId: string,
  templateId: string,
  payload: { status: "approved" | "rejected"; providerMessageId?: string; rejectionReason?: string },
) {
  return request<{ status: string }>(`/sales/whatsapp-template-approvals/${userId}/${templateId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export type ActivityEvent = {
  app: "frontend" | "sales" | "admin";
  type: "page_view" | "click" | "feature_interest" | "funnel_step" | "custom";
  name: string;
  path: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type ApplicantTimeline = {
  events: ActivityEvent[];
  funnel: {
    viewedPricing: boolean;
    startedSignup: boolean;
    completedSignup: boolean;
    submittedVerification: boolean;
    startedCheckout: boolean;
    completedCheckout: boolean;
  };
};

export function fetchApplicantEvents(userId: string) {
  return request<ApplicantTimeline>(`/sales/applicants/${userId}/events`);
}

export function reviewVerification(
  userId: string,
  status: "verified" | "rejected",
  reviewNote?: string,
) {
  return request<VerificationRecord>(`/sales/applicants/${userId}/verification`, {
    method: "PATCH",
    body: JSON.stringify({ status, reviewNote }),
  });
}

// Uploads verification documents (and field values) on this applicant's
// behalf — e.g. they sent proof over WhatsApp/email and sales enters it
// directly. Goes into the same record their own self-upload would, so it
// shows up identically to admin/sales either way.
export function submitVerificationOnBehalf(
  userId: string,
  fieldValues: Record<string, string>,
  files: { businessProof?: File; addressProof?: File },
) {
  const formData = new FormData();
  formData.append("fieldValuesJson", JSON.stringify(fieldValues));
  if (files.businessProof) formData.append("businessProof", files.businessProof);
  if (files.addressProof) formData.append("addressProof", files.addressProof);
  return requestForm<VerificationRecord>(`/sales/applicants/${userId}/verification/documents`, formData);
}

export function updateStage(userId: string, salesStage: SalesStage, salesNotes?: string) {
  return request<ApplicantDetail["user"]>(`/sales/applicants/${userId}/stage`, {
    method: "PATCH",
    body: JSON.stringify({ salesStage, salesNotes }),
  });
}

export function documentUrl(userId: string, storedFileName: string) {
  return `${BACKEND_URL}/sales/applicants/${userId}/documents/${storedFileName}`;
}

export function listFormFields() {
  return request<VerificationFormField[]>("/sales/form-fields");
}

export function createFormField(payload: {
  key: string;
  label: string;
  type: VerificationFieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}) {
  return request<VerificationFormField>("/sales/form-fields", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateFormField(
  id: string,
  payload: Partial<{
    label: string;
    type: VerificationFieldType;
    required: boolean;
    options: string[];
    placeholder: string;
  }>,
) {
  return request<VerificationFormField>(`/sales/form-fields/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteFormField(id: string) {
  return request<{ deleted: boolean }>(`/sales/form-fields/${id}`, { method: "DELETE" });
}

export function reorderFormFields(orderedIds: string[]) {
  return request<VerificationFormField[]>("/sales/form-fields/reorder", {
    method: "PATCH",
    body: JSON.stringify({ orderedIds }),
  });
}

export type SalesLeadStatus = SalesStage;
export const SALES_LEAD_STATUSES = SALES_STAGES;

export type SalesLead = {
  _id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  source?: string;
  notes?: string;
  status: SalesLeadStatus;
  convertedUserId?: string;
  assignedToUserId?: string;
  createdAt: string;
  updatedAt: string;
};

export type SalesTeamMember = {
  _id: string;
  name?: string;
  email: string | null;
};

// Every sales rep sees the same team list, which is what lets them hand
// leads to each other rather than only admin doing the assigning.
export function fetchSalesTeam() {
  return request<SalesTeamMember[]>("/sales/team");
}

export function createSalesLead(payload: {
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  source?: string;
  notes?: string;
  assignedToUserId?: string;
}) {
  return request<SalesLead>("/sales/leads", { method: "POST", body: JSON.stringify(payload) });
}

export function updateSalesLead(
  id: string,
  payload: Partial<{
    name: string;
    companyName: string;
    email: string;
    phone: string;
    source: string;
    notes: string;
    status: SalesLeadStatus;
    assignedToUserId: string;
  }>,
) {
  return request<SalesLead>(`/sales/leads/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteSalesLead(id: string) {
  return request<{ deleted: boolean }>(`/sales/leads/${id}`, { method: "DELETE" });
}

// Moves a lead to 'pending_verification' and provisions the underlying
// account — does NOT hand out usable credentials yet. See
// issueSalesLeadCredentials(), only callable once verification is approved.
export function promoteSalesLead(id: string, email?: string) {
  return request<{ lead: SalesLead; email: string; userId: string }>(
    `/sales/leads/${id}/promote`,
    { method: "POST", body: JSON.stringify({ email }) },
  );
}

// Only succeeds once the lead has reached 'converted' (verification
// approved) — see the backend's SalesLeadsService.issueCredentials.
export function issueSalesLeadCredentials(id: string) {
  return request<{ email: string; temporaryPassword: string; userId: string }>(
    `/sales/leads/${id}/credentials`,
    { method: "POST" },
  );
}

export type DocumentRequestStatus = "requested" | "uploaded";

export type DocumentRequestFile = {
  fileName: string;
  storedFileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type DocumentRequestItem = {
  _id: string;
  userId: string;
  label: string;
  note?: string;
  status: DocumentRequestStatus;
  file?: DocumentRequestFile;
  createdAt: string;
};

export function listDocumentRequests(userId: string) {
  return request<DocumentRequestItem[]>(`/sales/applicants/${userId}/document-requests`);
}

export function createDocumentRequest(userId: string, label: string, note?: string) {
  return request<DocumentRequestItem>(`/sales/applicants/${userId}/document-requests`, {
    method: "POST",
    body: JSON.stringify({ label, note }),
  });
}

export function cancelDocumentRequest(userId: string, id: string) {
  return request<{ deleted: boolean }>(`/sales/applicants/${userId}/document-requests/${id}`, {
    method: "DELETE",
  });
}

export function documentRequestFileUrl(userId: string, id: string) {
  return `${BACKEND_URL}/sales/applicants/${userId}/document-requests/${id}/file`;
}
