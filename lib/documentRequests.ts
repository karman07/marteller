import { request, requestForm } from "./http";

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
  label: string;
  note?: string;
  status: DocumentRequestStatus;
  file?: DocumentRequestFile;
  createdAt: string;
};

export function listDocumentRequests() {
  return request<DocumentRequestItem[]>("/document-requests");
}

export function uploadDocumentRequest(id: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return requestForm<DocumentRequestItem>(`/document-requests/${id}/upload`, formData);
}
