"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Pagination } from "@/components/dashboard/Pagination";
import { ApiKeysSection } from "@/components/dashboard/ApiKeysSection";
import { SubscriptionSection } from "@/components/dashboard/SubscriptionSection";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  WalletTransaction,
  createTopupOrder,
  devAddBalance,
  fetchBalance,
  fetchTransactions,
  verifyTopupPayment,
} from "@/lib/wallet";
import { loadRazorpayScript } from "@/lib/razorpay";
import { formatINR } from "@/lib/currency";

const PRESETS_PAISE = [50000, 100000, 500000]; // ₹500 / ₹1,000 / ₹5,000
const TX_PAGE_SIZE = 10;
const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_PHONE_BYPASS === "true";

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [balancePaise, setBalancePaise] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<{ items: WalletTransaction[]; total: number; page: number }>({
    items: [],
    total: 0,
    page: 1,
  });
  const [addOpen, setAddOpen] = useState(false);
  const [amount, setAmount] = useState<number>(PRESETS_PAISE[0]);
  const [customAmount, setCustomAmount] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  function loadTransactions(page: number) {
    fetchTransactions(page, TX_PAGE_SIZE)
      .then((res) => setTransactions({ items: res.items, total: res.total, page: res.page }))
      .catch(() => {});
  }

  function load() {
    fetchBalance().then((r) => setBalancePaise(r.balancePaise)).catch(() => {});
    loadTransactions(1);
  }

  useEffect(load, []);

  useEffect(() => {
    if (searchParams.get("addBalance") === "true") setAddOpen(true);
  }, [searchParams]);

  function pickedAmount() {
    return customAmount ? Math.round(parseFloat(customAmount) * 100) : amount;
  }

  // Real top-up: create a Razorpay order, open Checkout, then verify the
  // signature server-side before the wallet is credited — same pattern as
  // SubscriptionSection's subscribe flow, just a one-time order instead of
  // a recurring subscription.
  async function handleAddBalance() {
    const finalAmount = pickedAmount();
    if (!finalAmount || finalAmount <= 0) return;
    setAddError(null);
    setAdding(true);
    try {
      const order = await createTopupOrder(finalAmount);
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Could not load the payment gateway. Check your connection and try again.");
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        order_id: order.orderId,
        name: "Marteller",
        description: "Credits top-up",
        theme: { color: "#d96a36" },
        handler: async (response) => {
          try {
            await verifyTopupPayment(
              response.razorpay_order_id ?? order.orderId,
              response.razorpay_payment_id ?? "",
              response.razorpay_signature ?? "",
            );
            setAddOpen(false);
            setCustomAmount("");
            load();
          } catch (err) {
            setAddError(err instanceof Error ? err.message : "Could not verify payment.");
          } finally {
            setAdding(false);
          }
        },
        modal: { ondismiss: () => setAdding(false) },
      });
      checkout.open();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not start payment.");
      setAdding(false);
    }
  }

  // Dev-only instant credit, no payment — see lib/wallet.ts's devAddBalance.
  async function handleDevAddBalance() {
    const finalAmount = pickedAmount();
    if (!finalAmount || finalAmount <= 0) return;
    setAddError(null);
    setAdding(true);
    try {
      await devAddBalance(finalAmount);
      setAddOpen(false);
      setCustomAmount("");
      load();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not add test credit.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Billing & usage"
        description="Your plan allowance, credits, and message spend — in one place."
        action={
          <Button onClick={() => setAddOpen(true)} className="gap-1.5">
            <Wallet size={15} /> Add credits
          </Button>
        }
      />

      <div className="px-4 py-6 sm:px-8">
        <SubscriptionSection />

        <div className="mt-6 rounded-2xl border border-line bg-surface-2 p-6">
          <p className="text-xs text-ink-muted">Credits</p>
          <p className="mt-1 text-3xl font-semibold text-ink">
            {balancePaise === null ? "—" : formatINR(balancePaise)}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            A separate pool from your plan&apos;s monthly allowance — covers any channel once that
            allowance runs out, and never expires at the end of the period.
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface-2">
          <h2 className="p-5 pb-4 text-sm font-semibold text-ink">Transaction history</h2>
          {transactions.items.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState icon={Wallet} title="No transactions yet" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-ink-muted">
                      <th className="px-5 pb-2 font-medium">Date</th>
                      <th className="px-5 pb-2 font-medium">Description</th>
                      <th className="px-5 pb-2 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.items.map((t) => (
                      <tr key={t._id} className="border-b border-line/60 last:border-0">
                        <td className="px-5 py-2.5 text-ink-soft">
                          {new Date(t.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-5 py-2.5 text-ink-soft">
                          <span className="flex items-center gap-2">
                            {t.type === "credit" ? (
                              <ArrowDownLeft size={14} className="text-[#0ca30c]" />
                            ) : (
                              <ArrowUpRight size={14} className="text-ink-muted" />
                            )}
                            {t.description}
                          </span>
                        </td>
                        <td
                          className={`px-5 py-2.5 font-medium ${
                            t.type === "credit" ? "text-[#0ca30c]" : "text-ink"
                          }`}
                        >
                          {t.type === "credit" ? "+" : "-"}
                          {formatINR(t.amountPaise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={transactions.page}
                limit={TX_PAGE_SIZE}
                total={transactions.total}
                onPageChange={loadTransactions}
              />
            </>
          )}
        </div>

        <div className="mt-6">
          <ApiKeysSection />
        </div>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add credits">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-ink-muted">Paid securely via Razorpay.</p>
          {addError && (
            <p className="rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{addError}</p>
          )}
          <div className="grid grid-cols-3 gap-2">
            {PRESETS_PAISE.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setAmount(p);
                  setCustomAmount("");
                }}
                className={`rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                  !customAmount && amount === p
                    ? "border-accent bg-accent-soft/40 text-accent"
                    : "border-line text-ink-soft hover:text-ink"
                }`}
              >
                {formatINR(p)}
              </button>
            ))}
          </div>
          <input
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            type="number"
            min="1"
            placeholder="Custom amount (₹)"
            className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
          />
          <Button onClick={handleAddBalance} disabled={adding} className="w-full">
            {adding ? "Processing…" : "Add credits"}
          </Button>
          {DEV_BYPASS && (
            <button
              type="button"
              onClick={handleDevAddBalance}
              disabled={adding}
              className="text-center text-xs text-ink-muted underline hover:text-ink disabled:pointer-events-none"
            >
              Dev: instant test credit (no payment)
            </button>
          )}
        </div>
      </Modal>
    </>
  );
}
