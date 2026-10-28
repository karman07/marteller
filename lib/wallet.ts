import { request, Paginated } from "./http";

export type WalletTransaction = {
  _id: string;
  type: "credit" | "debit";
  amountPaise: number;
  description: string;
  createdAt: string;
};

export function fetchBalance() {
  return request<{ balancePaise: number }>("/wallet");
}

export function fetchTransactions(page = 1, limit = 20) {
  return request<Paginated<WalletTransaction>>(`/wallet/transactions?page=${page}&limit=${limit}`);
}

// Real top-up: create a Razorpay order, then (after Checkout confirms
// payment client-side) verify the signature server-side before crediting.
// See SubscriptionSection.tsx for the equivalent subscription-checkout flow.
export function createTopupOrder(amountPaise: number) {
  return request<{ orderId: string; amountPaise: number; currency: string; keyId: string }>(
    "/wallet/topup/order",
    { method: "POST", body: JSON.stringify({ amountPaise }) },
  );
}

export function verifyTopupPayment(orderId: string, paymentId: string, signature: string) {
  return request<{ balancePaise: number }>("/wallet/topup/verify", {
    method: "POST",
    body: JSON.stringify({ orderId, paymentId, signature }),
  });
}

// Dev-only instant credit, no payment — only reachable when the backend's
// own DEV_PHONE_AUTH_BYPASS gate is on (it 403s otherwise regardless of
// this flag), gated client-side on the same NEXT_PUBLIC_DEV_PHONE_BYPASS
// flag used elsewhere to skip real Firebase OTP.
export function devAddBalance(amountPaise: number) {
  return request<{ balancePaise: number }>("/wallet/dev-add-balance", {
    method: "POST",
    body: JSON.stringify({ amountPaise }),
  });
}
