import { request, requestForm } from "./http";

export type VerificationStatus = "not_submitted" | "pending" | "verified" | "rejected";

export type VerificationFieldType = "text" | "textarea" | "select" | "number";

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

export type VerificationDocument = {
  type: string;
  fileName: string;
  storedFileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type BusinessVerification = {
  userId: string;
  fieldValues: Record<string, string>;
  documents: VerificationDocument[];
  status: VerificationStatus;
  reviewNote?: string;
  submittedAt?: string;
  reviewedAt?: string;
};

export function fetchVerification() {
  return request<BusinessVerification>("/verification/me");
}

export function fetchVerificationFormFields() {
  return request<VerificationFormField[]>("/verification/form-fields");
}

export function submitVerification(payload: {
  fieldValues: Record<string, string>;
  businessProof?: File;
  addressProof?: File;
}) {
  const formData = new FormData();
  formData.append("fieldValuesJson", JSON.stringify(payload.fieldValues));
  if (payload.businessProof) formData.append("businessProof", payload.businessProof);
  if (payload.addressProof) formData.append("addressProof", payload.addressProof);

  return requestForm<BusinessVerification>("/verification/submit", formData);
}

// Dev-only: stands in for a real admin review UI (see backend DEV_PHONE_AUTH_BYPASS).
export function devReviewVerification(status: "verified" | "rejected", reviewNote?: string) {
  return request<BusinessVerification>("/verification/dev-review", {
    method: "PATCH",
    body: JSON.stringify({ status, reviewNote }),
  });
}
