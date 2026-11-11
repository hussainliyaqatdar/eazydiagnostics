"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUSES, PAYMENT_LABELS, PAYMENT_STATUSES, STATUS_LABELS, type OrderStatus, type PaymentStatus } from "@/lib/order-status";
import { sendJson } from "./api";
import { statusToast, type Outcome } from "./outcomes";
import { PaymentPill, VisitPill } from "./StatusPill";
import { useToast } from "./Toaster";

type Kind = "status" | "payment";

// The visit's status and its payment status, always shown as read-only pills. "Change" opens a picker
// for one of them. Saving a changed value updates it and WhatsApps the patient (and the prescribing
// doctors) with the template mapped to that status - or, if none is mapped, sends nothing. Either way the
// result is shown as a toast. Picking the value it already has changes nothing and sends nothing.
export default function OrderControls({ id, status, paymentStatus }: { id: string; status: OrderStatus; paymentStatus: PaymentStatus; compact?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Kind | null>(null);
  const [nextStatus, setNextStatus] = useState(status);
  const [nextPayment, setNextPayment] = useState(paymentStatus);
  const [busy, setBusy] = useState(false);

  async function save(kind: Kind) {
    setBusy(true);
    const result = await sendJson<{ changed: boolean; notifications: Outcome[] }>("/api/admin/orders", "PATCH", kind === "status" ? { id, status: nextStatus } : { id, paymentStatus: nextPayment });
    if (!result.ok) toast({ kind: "error", title: "Couldn't update the order", message: result.error });
    else {
      toast(
        kind === "status"
          ? statusToast("Visit status", STATUS_LABELS[nextStatus], result.data.changed, result.data.notifications ?? [])
          : statusToast("Payment", PAYMENT_LABELS[nextPayment], result.data.changed, result.data.notifications ?? [])
      );
      setEditing(null);
      router.refresh();
    }
    setBusy(false);
  }

  function open(kind: Kind) {
    setNextStatus(status);
    setNextPayment(paymentStatus);
    setEditing(kind);
  }

  const selectClass = "min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs";
  const buttonClass = "rounded-md bg-brand px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60";
  const linkClass = "text-xs font-medium text-brand hover:underline";

  const row = (kind: Kind, label: string, pill: React.ReactNode) => (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-12 text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</span>
        {pill}
        {editing !== kind && (
          <button type="button" onClick={() => open(kind)} disabled={busy} className={linkClass} aria-label={`Change ${label.toLowerCase()} of order ${id}`}>
            Change
          </button>
        )}
      </div>
      {editing === kind && (
        <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-14">
          {kind === "status" ? (
            <select aria-label={`New visit status for order ${id}`} value={nextStatus} onChange={(e) => setNextStatus(e.target.value as OrderStatus)} disabled={busy} className={selectClass}>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          ) : (
            <select aria-label={`New payment status for order ${id}`} value={nextPayment} onChange={(e) => setNextPayment(e.target.value as PaymentStatus)} disabled={busy} className={selectClass}>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>{PAYMENT_LABELS[s]}</option>
              ))}
            </select>
          )}
          <button type="button" onClick={() => save(kind)} disabled={busy || (kind === "status" ? nextStatus === status : nextPayment === paymentStatus)} className={buttonClass}>
            {busy ? "Saving..." : "Update & notify"}
          </button>
          <button type="button" onClick={() => setEditing(null)} disabled={busy} className={linkClass}>Cancel</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-w-[15rem] max-w-md flex-col gap-2.5">
      {row("status", "Visit", <VisitPill status={status} />)}
      {row("payment", "Payment", <PaymentPill status={paymentStatus} />)}
    </div>
  );
}
