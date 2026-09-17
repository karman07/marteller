import { request } from "./http";
import { Channel } from "./channels";

export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

export type Lead = {
  _id: string;
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  channel?: Channel;
  status: LeadStatus;
  notes?: string;
  contactId?: string;
  sourceMessageId?: string;
  createdAt: string;
  updatedAt: string;
};

export function listLeads() {
  return request<Lead[]>("/leads");
}

export function createLead(payload: {
  name: string;
  phone?: string;
  email?: string;
  channel?: Channel;
  notes?: string;
}) {
  return request<Lead>("/leads", { method: "POST", body: JSON.stringify(payload) });
}

export function updateLead(
  id: string,
  payload: Partial<{
    name: string;
    phone: string;
    email: string;
    channel: Channel;
    status: LeadStatus;
    notes: string;
  }>,
) {
  return request<Lead>(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteLead(id: string) {
  return request<{ deleted: boolean }>(`/leads/${id}`, { method: "DELETE" });
}

export function promoteMessageToLead(messageId: string) {
  return request<Lead>(`/leads/from-message/${messageId}`, { method: "POST" });
}
