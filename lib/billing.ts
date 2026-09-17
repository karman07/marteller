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
  isActive: boolean;
  sortOrder: number;
};

// Public — no auth required, used on the marketing pricing page too.
export function fetchPlans() {
  return request<Plan[]>("/billing/plans");
}

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

export function fetchMySubscription() {
  return request<{ subscription: Subscription; plan: Plan } | null>("/billing/subscription");
}

export function startSubscribe(planId: string) {
  return request<{ subscriptionId: string; razorpaySubscriptionId: string; razorpayKeyId: string }>(
    "/billing/subscribe",
    { method: "POST", body: JSON.stringify({ planId }) },
  );
}

export function cancelSubscription(immediately: boolean) {
  return request<Subscription>("/billing/cancel", {
    method: "POST",
    body: JSON.stringify({ immediately }),
  });
}
