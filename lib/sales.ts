import { BACKEND_URL, request } from "./http";

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

export type SalesStats = {
  totalSignups: number;
  byVerification: Record<VerificationStatus, number>;
  byStage: Record<SalesStage, number>;
  isDummyData: boolean;
};

export function listApplicants() {
  return request<{ items: Applicant[]; isDummyData: boolean }>("/sales/applicants");
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

export type SalesLeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "demo_scheduled"
  | "negotiating"
  | "converted"
  | "lost";

export const SALES_LEAD_STATUSES: { value: SalesLeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "demo_scheduled", label: "Demo scheduled" },
  { value: "negotiating", label: "Negotiating" },
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
};

// Every sales rep sees the same team list, which is what lets them hand
// leads to each other rather than only admin doing the assigning.
export function fetchSalesTeam() {
  return request<SalesTeamMember[]>("/sales/team");
}

export function listSalesLeads() {
  return request<SalesLead[]>("/sales/leads");
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

export function promoteSalesLead(id: string, email?: string) {
  return request<{ lead: SalesLead; email: string; temporaryPassword: string | null; userId: string }>(
    `/sales/leads/${id}/promote`,
    { method: "POST", body: JSON.stringify({ email }) },
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
