import { request } from "./http";

export type MessageLimits = { whatsapp: number; email: number; sms: number };

export type Plan = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  priceMonthlyPaise: number;
  currency: string;
  messageLimits: MessageLimits;
  features: string[];
  razorpayPlanId?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CreatePlanPayload = {
  name: string;
  slug: string;
  description?: string;
  priceMonthlyPaise: number;
  currency?: string;
  messageLimits: MessageLimits;
  features?: string[];
  isActive?: boolean;
  sortOrder?: number;
};

export type UpdatePlanPayload = Partial<CreatePlanPayload>;

export function listAllPlans() {
  return request<Plan[]>("/admin/plans");
}

export function createPlan(payload: CreatePlanPayload) {
  return request<Plan>("/admin/plans", { method: "POST", body: JSON.stringify(payload) });
}

export function updatePlan(id: string, payload: UpdatePlanPayload) {
  return request<Plan>(`/admin/plans/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deletePlan(id: string) {
  return request<{ deleted: boolean }>(`/admin/plans/${id}`, { method: "DELETE" });
}

export type RevenuePlanSummary = {
  planId: string;
  name: string;
  slug: string;
  priceMonthlyPaise: number;
  isActive: boolean;
  activeSubscribers: number;
  mrrPaise: number;
};

export type RevenueSummary = {
  plans: RevenuePlanSummary[];
  totalMrrPaise: number;
  totalActiveSubscribers: number;
};

export function fetchRevenue() {
  return request<RevenueSummary>("/admin/revenue");
}
