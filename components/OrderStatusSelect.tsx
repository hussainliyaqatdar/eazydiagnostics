"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUSES, STATUS_LABELS, type OrderStatus } from "@/lib/order-status";

type Outcome = { recipient: string; ok: boolean; detail: string };

// Changing the status saves it and WhatsApps the patient / doctor straight away. A
// confirm step avoids a stray click messaging a patient, and the result shows who was
// reached (or why not).
export default function OrderStatusSelect({ id, current }: { id: string; current: OrderStatus }) {
  const router = useRouter();
  const [next, setNext] = useState<OrderStatus>(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);

  async function save() {
    setBusy(true);
    setError("");
    setOutcomes(null);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't change the status. Please try again.");
      } else {
        setOutcomes(data.notifications ?? []);
        router.refresh();
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="flex min-w-[12rem] flex-col gap-1.5">
      <div className="flex gap-2">
        <select
          aria-label={`Status of order ${id}`}
          value={next}
          onChange={(e) => setNext(e.target.value as OrderStatus)}
          disabled={busy}
          className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        {next !== current && (
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-md bg-brand px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? "Saving..." : "Update & notify"}
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {outcomes && (
        <ul role="status" className="flex flex-col gap-0.5 text-xs">
          {outcomes.length === 0 && <li className="text-gray-500">Saved. No WhatsApp message goes out for this status.</li>}
          {outcomes.map((o, i) => (
            <li key={i} className={o.ok ? "text-green-700" : "text-red-700"}>
              {o.ok ? "✓ Sent to" : "✗ Not sent to"} {o.recipient}{o.ok ? "" : ` - ${o.detail}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
