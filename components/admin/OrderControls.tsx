"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUSES, PAYMENT_LABELS, PAYMENT_STATUSES, STATUS_LABELS, type OrderStatus, type PaymentStatus } from "@/lib/order-status";
import { sendJson } from "./api";
import { PaymentPill, VisitPill } from "./StatusPill";

type Outcome = { recipient: string; ok: boolean; detail: string; skipped?: boolean };
type Kind = "status" | "payment";

// The visit's status and its payment status, always shown as read-only pills. "Change" opens a picker
// for one of them; saving a changed value updates it and WhatsApps the patient (and the prescribing
// doctors); picking the value it already has changes nothing and sends nothing.
export default function OrderControls({ id, status, paymentStatus }: { id: string; status: OrderStatus; paymentStatus: PaymentStatus; compact?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Kind | null>(null);
  const [nextStatus, setNextStatus] = useState(status);
  const [nextPayment, setNextPayment] = useState(paymentStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [outcomes, setOutcomes] = useState<{ changed: boolean; list: Outcome[] } | null>(null);

  async function save(kind: Kind) {
    setBusy(true);
    setError("");
    setOutcomes(null);
    const result = await sendJson<{ changed: boolean; notifications: Outcome[] }>("/api/admin/orders", "PATCH", kind === "status" ? { id, status: nextStatus } : { id, paymentStatus: nextPayment });
    if (!result.ok) setError(result.error);
    else {
      setOutcomes({ changed: result.data.changed, list: result.data.notifications ?? [] });
      setEditing(null);
      router.refresh();
    }
    setBusy(false);
  }

  function open(kind: Kind) {
    setError("");
    setOutcomes(null);
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
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {outcomes && (
        <ul role="status" className="flex flex-col gap-0.5 text-xs">
          {!outcomes.changed && <li className="text-gray-500">Already at that status - nothing changed, nothing sent.</li>}
          {outcomes.changed && outcomes.list.length === 0 && <li className="text-gray-500">Saved. No WhatsApp message goes out for this change.</li>}
          {outcomes.list.map((o, i) => (
            <li key={i} className={o.ok ? "text-green-700" : "text-red-700"}>
              {o.skipped ? "= Already sent to" : o.ok ? "✓ Sent to" : "✗ Not sent to"} {o.recipient}
              {o.ok ? "" : ` - ${o.detail}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
