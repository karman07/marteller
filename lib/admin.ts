import { BACKEND_URL, request, requestForm } from "./http";

export type VerificationStatus = "not_submitted" | "pending" | "verified" | "rejected";
export type SalesStage = "new" | "contacted" | "qualified" | "converted" | "lost";
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
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
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

export type AdminStats = {
  totalSignups: number;
  byVerification: Record<VerificationStatus, number>;
  byStage: Record<SalesStage, number>;
  isDummyData: boolean;
};

export function listApplicants() {
  return request<{ items: Applicant[]; isDummyData: boolean }>("/admin/applicants");
}

export function fetchStats() {
  return request<AdminStats>("/admin/stats");
}

export function fetchApplicant(userId: string) {
  return request<ApplicantDetail>(`/admin/applicants/${userId}`);
}

export function fetchUsage(userId: string) {
  return request<UsageSummary>(`/admin/applicants/${userId}/usage`);
}

// Admin crediting a customer's wallet directly — separate from Plan
// (platform access fee); this is the pay-as-you-go balance that funds
// messages beyond a plan's allowance. The customer can also do this
// themselves from their own dashboard.
export function addApplicantBalance(userId: string, amountPaise: number) {
  return request<{ balancePaise: number }>(`/admin/applicants/${userId}/wallet/add-balance`, {
    method: "POST",
    body: JSON.stringify({ amountPaise }),
  });
}

export type RateCard = {
  _id: string;
  whatsappMarketingPaise: number;
  whatsappUtilityPaise: number;
  whatsappAuthenticationPaise: number;
  emailPaise: number;
  smsPerSegmentPaise: number;
  smsSegmentLength: number;
};

// Per-channel message pricing — separate from a Plan's monthly platform
// fee. Any rate can be 0 to make that channel free.
export function fetchRateCard() {
  return request<RateCard>("/admin/pricing");
}

export function updateRateCard(payload: Partial<Omit<RateCard, "_id">>) {
  return request<RateCard>("/admin/pricing", { method: "PATCH", body: JSON.stringify(payload) });
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
  return request<SmsCredential | null>(`/admin/applicants/${userId}/sms-credential`);
}

export function setSmsCredential(
  userId: string,
  payload: { apiKey: string; route?: SmsRoute; senderId?: string },
) {
  return request<SmsCredential>(`/admin/applicants/${userId}/sms-credential`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function removeSmsCredential(userId: string) {
  return request<{ deleted: boolean }>(`/admin/applicants/${userId}/sms-credential`, {
    method: "DELETE",
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
  return request<ApplicantTimeline>(`/admin/applicants/${userId}/events`);
}

export type FunnelStep = { name: string; count: number };

export function fetchFunnel() {
  return request<FunnelStep[]>("/admin/analytics/funnel");
}

export function reviewVerification(
  userId: string,
  status: "verified" | "rejected",
  reviewNote?: string,
) {
  return request<VerificationRecord>(`/admin/applicants/${userId}/verification`, {
    method: "PATCH",
    body: JSON.stringify({ status, reviewNote }),
  });
}

// Uploads verification documents (and field values) on this applicant's
// behalf — e.g. they sent proof over WhatsApp/email and admin/sales enters
// it directly. Goes into the same record their own self-upload would, so
// it shows up identically either way.
export function submitVerificationOnBehalf(
  userId: string,
  fieldValues: Record<string, string>,
  files: { businessProof?: File; addressProof?: File },
) {
  const formData = new FormData();
  formData.append("fieldValuesJson", JSON.stringify(fieldValues));
  if (files.businessProof) formData.append("businessProof", files.businessProof);
  if (files.addressProof) formData.append("addressProof", files.addressProof);
  return requestForm<VerificationRecord>(`/admin/applicants/${userId}/verification/documents`, formData);
}

export function updateStage(userId: string, salesStage: SalesStage, salesNotes?: string) {
  return request<ApplicantDetail["user"]>(`/admin/applicants/${userId}/stage`, {
    method: "PATCH",
    body: JSON.stringify({ salesStage, salesNotes }),
  });
}

export function documentUrl(userId: string, storedFileName: string) {
  return `${BACKEND_URL}/admin/applicants/${userId}/documents/${storedFileName}`;
}

export function listFormFields() {
  return request<VerificationFormField[]>("/admin/form-fields");
}

export type SalesLeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "demo_scheduled"
  | "negotiating"
  | "pending_verification"
  | "converted"
  | "lost";

export const SALES_LEAD_STATUSES: { value: SalesLeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "demo_scheduled", label: "Demo scheduled" },
  { value: "negotiating", label: "Negotiating" },
  { value: "pending_verification", label: "Pending verification" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

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
  createdAt: string;
};

export function listSalesTeam() {
  return request<SalesTeamMember[]>("/admin/sales-team");
}

export function createSalesTeamMember(email: string, name: string) {
  return request<{ user: SalesTeamMember; temporaryPassword: string | null }>("/admin/sales-team", {
    method: "POST",
    body: JSON.stringify({ email, name }),
  });
}

export function listSalesLeads() {
  return request<SalesLead[]>("/admin/leads");
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
  return request<SalesLead>("/admin/leads", { method: "POST", body: JSON.stringify(payload) });
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
  return request<SalesLead>(`/admin/leads/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteSalesLead(id: string) {
  return request<{ deleted: boolean }>(`/admin/leads/${id}`, { method: "DELETE" });
}

// Moves a lead to 'pending_verification' and provisions the underlying
// account — does NOT hand out usable credentials yet. See
// issueSalesLeadCredentials(), only callable once verification is approved.
export function promoteSalesLead(id: string, email?: string) {
  return request<{ lead: SalesLead; email: string; userId: string }>(
    `/admin/leads/${id}/promote`,
    { method: "POST", body: JSON.stringify({ email }) },
  );
}

// Only succeeds once the lead has reached 'converted' (verification
// approved) — see the backend's SalesLeadsService.issueCredentials.
export function issueSalesLeadCredentials(id: string) {
  return request<{ email: string; temporaryPassword: string; userId: string }>(
    `/admin/leads/${id}/credentials`,
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
  return request<DocumentRequestItem[]>(`/admin/applicants/${userId}/document-requests`);
}

export function createDocumentRequest(userId: string, label: string, note?: string) {
  return request<DocumentRequestItem>(`/admin/applicants/${userId}/document-requests`, {
    method: "POST",
    body: JSON.stringify({ label, note }),
  });
}

export function cancelDocumentRequest(userId: string, id: string) {
  return request<{ deleted: boolean }>(`/admin/applicants/${userId}/document-requests/${id}`, {
    method: "DELETE",
  });
}

export function documentRequestFileUrl(userId: string, id: string) {
  return `${BACKEND_URL}/admin/applicants/${userId}/document-requests/${id}/file`;
}
