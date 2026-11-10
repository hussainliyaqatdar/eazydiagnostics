"use client";
import { useState } from "react";
import type { AuditKind, AuditRow } from "@/lib/order-events";

const PAGE_SIZE = 10;

const KIND: Record<AuditKind, { label: string; tone: string }> = {
  visit: { label: "Visit status", tone: "bg-blue-50 text-blue-800 ring-blue-300" },
  payment: { label: "Payment", tone: "bg-amber-50 text-amber-900 ring-amber-300" },
  "report-status": { label: "Report status", tone: "bg-violet-50 text-violet-800 ring-violet-300" },
  "report-file": { label: "Report file", tone: "bg-slate-100 text-slate-700 ring-slate-300" },
  whatsapp: { label: "WhatsApp", tone: "bg-green-50 text-green-800 ring-green-300" },
};

const FILTERS: { id: "all" | AuditKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "visit", label: "Visit" },
  { id: "payment", label: "Payment" },
  { id: "report-status", label: "Report status" },
  { id: "report-file", label: "Report files" },
  { id: "whatsapp", label: "WhatsApp" },
];

const when = (iso: string) => {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
};

// The visit's audit trail: a table, newest first, ten rows a page.
export default function AuditLog({ rows }: { rows: AuditRow[] }) {
  const [filter, setFilter] = useState<"all" | AuditKind>("all");
  const [page, setPage] = useState(0);

  const shown = filter === "all" ? rows : rows.filter((r) => r.kind === filter);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const slice = shown.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <section className="flex flex-col gap-3" aria-label="Audit log">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Audit log <span className="text-sm font-normal text-gray-500">({rows.length})</span></h2>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter the audit log">
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
        <p className="rounded-lg border bg-white px-3 py-4 text-sm text-gray-500">Nothing logged yet{filter === "all" ? "" : " for this filter"}.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">When (IST)</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">About</th>
                <th className="px-3 py-2 font-semibold">What happened</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {slice.map((r, i) => {
                const t = when(r.at);
                const k = KIND[r.kind];
                return (
                  <tr key={`${r.at}-${i}`} className="align-top">
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-800">
                      {t.date}
                      <span className="block text-xs text-gray-500">{t.time}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${k.tone}`}>{k.label}</span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-800">{r.subject}</td>
                    <td className={`px-3 py-2.5 ${r.kind === "whatsapp" && r.ok === false ? "text-red-700" : "text-gray-800"}`}>
                      {r.kind === "whatsapp" && <span aria-hidden="true">{r.ok ? "✓ " : "✗ "}</span>}
                      {r.detail}
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
    </section>
  );
}
