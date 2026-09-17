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

export function addBalance(amountPaise: number) {
  return request<{ balancePaise: number }>("/wallet/add-balance", {
    method: "POST",
    body: JSON.stringify({ amountPaise }),
  });
}
