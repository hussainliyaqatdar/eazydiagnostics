"use client";
import Link from "next/link";
import { useState } from "react";
import type { MessageRow } from "@/lib/whatsapp-log";

const PAGE_SIZE = 15;

const TONES: Record<string, string> = {
  sent: "bg-blue-50 text-blue-800 ring-blue-300",
  delivered: "bg-green-50 text-green-800 ring-green-300",
  read: "bg-emerald-50 text-emerald-800 ring-emerald-400",
  failed: "bg-red-50 text-red-800 ring-red-300",
};
const LABELS: Record<string, string> = { sent: "Sent", delivered: "Delivered", read: "Read", failed: "Failed" };

const FILTERS = [
  { id: "all", label: "All" },
  { id: "sent", label: "Sent" },
  { id: "delivered", label: "Delivered" },
  { id: "read", label: "Read" },
  { id: "failed", label: "Failed" },
];

const when = (iso: string) => {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }),
    time: d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }),
  };
};

// Every WhatsApp message sent about an order, newest first, with how far each one got. The status
// follows WhatsApp's delivery receipts (see /api/whatsapp/webhook).
export default function MessageLog({ rows }: { rows: MessageRow[] }) {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const shown = filter === "all" ? rows : rows.filter((r) => r.delivery === filter);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const slice = shown.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">{rows.length} message{rows.length === 1 ? "" : "s"} sent about orders.</p>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter the message log">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => { setFilter(f.id); setPage(0); }}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${filter === f.id ? "border-brand bg-brand text-white" : "border-gray-300 bg-white text-gray-600 hover:border-brand hover:text-brand"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-lg border bg-white px-4 py-8 text-center text-sm text-gray-500">No messages{filter === "all" ? " yet" : " with that status"}.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">When (IST)</th>
                <th className="px-3 py-2 font-semibold">Order</th>
                <th className="px-3 py-2 font-semibold">About</th>
                <th className="px-3 py-2 font-semibold">To</th>
                <th className="px-3 py-2 font-semibold">Template</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {slice.map((r) => {
                const t = when(r.at);
                const d = r.delivery ?? "sent";
                return (
                  <tr key={r.id} className="align-top">
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-800">{t.date}<span className="block text-xs text-gray-500">{t.time}</span></td>
                    <td className="px-3 py-2.5"><Link href={`/admin/orders/${r.orderId}`} className="font-medium text-brand hover:underline">{r.orderId}</Link></td>
                    <td className="px-3 py-2.5 text-gray-800">{r.what}</td>
                    <td className="px-3 py-2.5 text-gray-800">{r.recipient}<span className="block text-xs text-gray-500">+{r.to}</span></td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-600">{r.template ?? "-"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[d] ?? TONES.sent}`}>{LABELS[d] ?? d}</span>
                      {d === "failed" && <span className="mt-1 block max-w-[18rem] text-[11px] text-red-700">{r.detail}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {shown.length > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
          <span>Showing {current * PAGE_SIZE + 1}-{Math.min((current + 1) * PAGE_SIZE, shown.length)} of {shown.length}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage(current - 1)} disabled={current === 0} className="rounded-md border border-gray-300 bg-white px-2.5 py-1 font-medium disabled:opacity-40">Previous</button>
            <span>Page {current + 1} of {pages}</span>
            <button type="button" onClick={() => setPage(current + 1)} disabled={current >= pages - 1} className="rounded-md border border-gray-300 bg-white px-2.5 py-1 font-medium disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
