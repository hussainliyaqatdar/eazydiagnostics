"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass, sendJson } from "../api";
import { useToast } from "../Toaster";
import TemplateStatusPill from "./TemplateStatusPill";
import type { WaTemplate } from "@/lib/whatsapp-templates";
import { AUDIENCES, AUDIENCE_LABELS, EVENTS, type Audience } from "@/lib/whatsapp-events";

export type CoverageCell = { id: number; status: string } | null;
export type CoverageRow = { key: string; cells: Record<Audience, CoverageCell> };

// For each event, which existing template patients and doctors each receive. Choosing one maps it. An
// event left unmapped sends nothing to that audience. New templates are written on the Templates tab,
// not here.
export default function CoverageGrid({ rows, templates }: { rows: CoverageRow[]; templates: WaTemplate[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();

  async function choose(event: string, audience: Audience, value: string) {
    const key = `${audience}:${event}`;
    setBusy(key);
    const res = await sendJson("/api/admin/whatsapp/mapping", "POST", { event, audience, templateId: value ? Number(value) : null });
    const who = `${AUDIENCE_LABELS[audience].toLowerCase()}s`;
    const what = EVENTS.find((e) => e.key === event)?.label ?? event;
    const chosen = templates.find((t) => t.id === Number(value));
    if (!res.ok) toast({ kind: "error", title: "Couldn't change the mapping", message: res.error });
    else if (chosen) toast({ kind: "success", title: "Mapping saved", message: `"${what}" now sends ${chosen.name} to ${who}.` });
    else toast({ kind: "info", title: "Mapping removed", message: `"${what}" sends nothing to ${who}.` });
    setBusy(null);
    router.refresh();
  }

  // An audience with no template at all cannot be mapped: say why, and where to fix it.
  const empty = AUDIENCES.filter((a) => !templates.some((t) => t.audience === a));

  return (
    <div className="flex flex-col gap-2">
      {empty.map((a) => (
        <p key={a} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No templates are set up for {AUDIENCE_LABELS[a].toLowerCase()}s yet, so there is nothing to choose in their column. On the Templates tab, create one with &ldquo;Sent to&rdquo; set to {AUDIENCE_LABELS[a]}s, or open an existing template, change &ldquo;Sent to&rdquo; to {AUDIENCE_LABELS[a]}s and save.
        </p>
      ))}
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Event</th>
              {AUDIENCES.map((a) => (
                <th key={a} className="px-3 py-2 font-semibold">{AUDIENCE_LABELS[a]}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => {
              const ev = EVENTS.find((e) => e.key === row.key)!;
              return (
                <tr key={ev.key}>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-gray-900">{ev.label}</span>
                    <span className="block text-xs text-gray-500">{ev.group}</span>
                  </td>
                  {AUDIENCES.map((a) => {
                    if (!ev.audiences.includes(a)) return <td key={a} className="px-3 py-2.5 text-xs text-gray-300">Not sent</td>;
                    const cell = row.cells[a];
                    const options = templates.filter((t) => t.audience === a);
                    return (
                      <td key={a} className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            aria-label={`Template for ${ev.label}, ${AUDIENCE_LABELS[a].toLowerCase()}s`}
                            value={cell?.id ?? ""}
                            onChange={(e) => choose(ev.key, a, e.target.value)}
                            disabled={busy !== null}
                            className={`${inputClass} min-w-[11rem] max-w-[16rem] flex-1`}
                          >
                            <option value="">Not mapped - nothing is sent</option>
                            {options.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}{t.enabled ? "" : " (off)"}</option>
                            ))}
                          </select>
                          {cell && <TemplateStatusPill status={cell.status} />}
                          {busy === `${a}:${ev.key}` && <span className="text-xs text-gray-400">Saving...</span>}
                        </div>
                        {cell && cell.status !== "APPROVED" && <span className="mt-1 block text-[11px] text-gray-500">Nothing is sent until this template is approved.</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
