"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "../Modal";
import { useToast } from "../Toaster";
import { buttonClass, inputClass, labelClass, quietButtonClass, sendJson } from "../api";
import type { LabSummary, MappingRow } from "@/lib/catalog-store";

const PAGE = 40;

// The partner labs. Every test and package has an internal id of ours; here each lab's own id for it is kept. Add a lab,
// map its ids (one by one, or by importing a CSV), and when every item has an id at it, make it the current lab.
export default function LabsPanel({ labs }: { labs: LabSummary[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [mapping, setMapping] = useState<LabSummary | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // A switch that was refused because ids are missing: offered again as "Switch anyway".
  const [refused, setRefused] = useState<{ id: string; message: string } | null>(null);

  async function makeCurrent(l: LabSummary, force = false) {
    setBusy(l.id);
    const res = await sendJson(`/api/admin/catalog/labs/${encodeURIComponent(l.id)}`, "PATCH", { makeCurrent: true, force });
    setBusy(null);
    if (!res.ok) {
      setRefused({ id: l.id, message: res.error });
      return;
    }
    setRefused(null);
    toast({ kind: "success", title: `${l.name} is now the current lab`, message: "New orders are for this lab, and new tests and packages need its ids." });
    router.refresh();
  }

  async function setActive(l: LabSummary, active: boolean) {
    setBusy(l.id);
    const res = await sendJson(`/api/admin/catalog/labs/${encodeURIComponent(l.id)}`, "PATCH", { active });
    setBusy(null);
    toast(res.ok ? { kind: "success", title: active ? "Lab switched on" : "Lab switched off", message: l.name } : { kind: "error", title: "Couldn't change the lab", message: res.error });
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-gray-600">
          Every test and package has our own permanent internal id. Each partner lab has its own id for the same item; they are mapped here. To move to a different lab: add it, map its ids for every test and package, then make it the current lab. Orders already placed keep the lab and ids they were placed with.
        </p>
        <button type="button" onClick={() => setAdding(true)} className={buttonClass}>+ Add lab</button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {labs.map((l) => {
          const complete = l.mapped.tests >= l.totals.tests && l.mapped.packages >= l.totals.packages;
          return (
            <article key={l.id} className={`flex flex-col gap-3 rounded-lg border bg-white p-4 ${l.isCurrent ? "border-brand ring-1 ring-brand" : ""} ${l.active ? "" : "opacity-70"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{l.name}</h3>
                  <span className="font-mono text-xs text-gray-500">{l.id}</span>
                </div>
                <span className="flex gap-1.5">
                  {l.isCurrent && <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">Current lab</span>}
                  {!l.active && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">Off</span>}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-gray-50 p-2">
                  <dt className="text-xs text-gray-500">Tests with a lab id</dt>
                  <dd className={`font-semibold ${l.mapped.tests >= l.totals.tests ? "text-green-700" : "text-amber-700"}`}>{l.mapped.tests} of {l.totals.tests}</dd>
                </div>
                <div className="rounded-md bg-gray-50 p-2">
                  <dt className="text-xs text-gray-500">Packages with a lab id</dt>
                  <dd className={`font-semibold ${l.mapped.packages >= l.totals.packages ? "text-green-700" : "text-amber-700"}`}>{l.mapped.packages} of {l.totals.packages}</dd>
                </div>
              </dl>
              {l.notes && <p className="text-xs text-gray-500">{l.notes}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setMapping(l)} className={quietButtonClass}>Map ids</button>
                <a href={`/api/admin/catalog/labs/${encodeURIComponent(l.id)}/mappings?format=csv`} className={quietButtonClass} download>Download CSV</a>
                {!l.isCurrent && (
                  <>
                    <button type="button" disabled={busy === l.id || !l.active} onClick={() => makeCurrent(l)} className={complete ? buttonClass : quietButtonClass}>Make current</button>
                    <button type="button" disabled={busy === l.id} onClick={() => setActive(l, !l.active)} className="text-xs font-medium text-gray-600 hover:underline">{l.active ? "Switch off" : "Switch on"}</button>
                  </>
                )}
              </div>
              {refused?.id === l.id && (
                <div role="alert" className="flex flex-col gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
                  <span>{refused.message}</span>
                  <span className="flex gap-2">
                    <button type="button" onClick={() => setMapping(l)} className={quietButtonClass}>Map ids</button>
                    <button type="button" disabled={busy === l.id} onClick={() => makeCurrent(l, true)} className="rounded-md border border-amber-400 bg-white px-3 py-2 text-sm font-medium text-amber-900">Switch anyway</button>
                    <button type="button" onClick={() => setRefused(null)} className="text-xs underline">Dismiss</button>
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {adding && <AddLab onClose={() => setAdding(false)} onSaved={() => router.refresh()} />}
      {mapping && <MappingsModal lab={mapping} onClose={() => { setMapping(null); router.refresh(); }} />}
    </div>
  );
}

function AddLab({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await sendJson("/api/admin/catalog/labs", "POST", { name, notes });
    setBusy(false);
    if (!res.ok) {
      toast({ kind: "error", title: "Couldn't add the lab", message: res.error });
      return;
    }
    toast({ kind: "success", title: "Lab added", message: `${name}. Map its ids, then make it the current lab when it is ready.` });
    onSaved();
    onClose();
  }

  return (
    <Modal title="Add a partner lab" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className={labelClass}>
          Lab name*
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={inputClass} aria-label="Lab name" />
        </label>
        <label className={labelClass}>
          Notes <span className="font-normal text-gray-400">(optional: contact, API details, terms)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} className={inputClass} />
        </label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={save} disabled={busy || name.trim().length < 2} className={buttonClass}>{busy ? "Adding..." : "Add lab"}</button>
          <button type="button" onClick={onClose} className="text-sm font-medium text-gray-600 hover:underline">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

type Edit = { externalId: string; cost: string };

function MappingsModal({ lab, onClose }: { lab: LabSummary; onClose: () => void }) {
  const { toast } = useToast();
  const [kind, setKind] = useState<"test" | "package">("test");
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [unmappedOnly, setUnmappedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [csv, setCsv] = useState("");
  const [showCsv, setShowCsv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<{ row: string; message: string }[]>([]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/catalog/labs/${encodeURIComponent(lab.id)}/mappings?kind=${kind}`).then((r) => r.json()).catch(() => null);
    setRows(res?.mappings ?? []);
    setLoading(false);
  }
  useEffect(() => {
    setEdits({});
    setProblems([]);
    setPage(1);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => (!unmappedOnly || !r.externalId) && (!needle || r.name.toLowerCase().includes(needle) || r.internalId.toLowerCase().includes(needle) || (r.externalId ?? "").toLowerCase().includes(needle)));
  }, [rows, q, unmappedOnly]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const current = Math.min(page, pages);
  const visible = shown.slice((current - 1) * PAGE, current * PAGE);
  const missing = rows.filter((r) => r.active && !r.externalId).length;
  const changed = Object.keys(edits).length;

  const setEdit = (r: MappingRow, patch: Partial<Edit>) => setEdits((cur) => ({ ...cur, [r.internalId]: { externalId: cur[r.internalId]?.externalId ?? r.externalId ?? "", cost: cur[r.internalId]?.cost ?? (r.cost === null ? "" : String(r.cost)), ...patch } }));

  async function report(res: Awaited<ReturnType<typeof sendJson<{ saved: number; removed: number; errors: { row: string; message: string }[] }>>>) {
    if (!res.ok) {
      toast({ kind: "error", title: "Couldn't save the ids", message: res.error });
      return;
    }
    setProblems(res.data.errors);
    toast({ kind: res.data.errors.length ? "warning" : "success", title: `${res.data.saved} saved${res.data.removed ? `, ${res.data.removed} removed` : ""}`, message: res.data.errors.length ? `${res.data.errors.length} could not be saved (listed below).` : lab.name });
    setEdits({});
    await load();
  }

  async function save() {
    setBusy(true);
    const payload = Object.entries(edits).map(([internalId, e]) => ({ internalId, externalId: e.externalId, ...(e.cost.trim() ? { cost: Number(e.cost) } : {}) }));
    await report(await sendJson(`/api/admin/catalog/labs/${encodeURIComponent(lab.id)}/mappings`, "PUT", { kind, rows: payload }));
    setBusy(false);
  }

  async function importCsv() {
    setBusy(true);
    await report(await sendJson(`/api/admin/catalog/labs/${encodeURIComponent(lab.id)}/mappings`, "PUT", { kind, csv }));
    setCsv("");
    setBusy(false);
  }

  return (
    <Modal title={`${lab.name}: lab ids`} onClose={onClose} wide>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {(["test", "package"] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)} className={`rounded-md px-3 py-1 text-sm font-medium ${kind === k ? "bg-white text-brand-dark shadow-sm" : "text-gray-600"}`}>{k === "test" ? "Tests" : "Packages"}</button>
            ))}
          </div>
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name or id" className={`${inputClass} max-w-[14rem]`} aria-label="Search" />
          <label className="flex items-center gap-1.5 text-xs text-gray-700">
            <input type="checkbox" checked={unmappedOnly} onChange={(e) => { setUnmappedOnly(e.target.checked); setPage(1); }} /> Only without an id ({missing})
          </label>
          <button type="button" onClick={() => setShowCsv((v) => !v)} className={`${quietButtonClass} ml-auto`}>Import CSV</button>
        </div>

        {showCsv && (
          <div className="flex flex-col gap-2 rounded-md bg-gray-50 p-3">
            <span className="text-xs text-gray-600">One line per {kind}: <code>internal id, {lab.name}&apos;s id, cost (optional)</code>. Download the CSV above, fill in the lab&apos;s ids, and paste the lines here. A header line is skipped.</span>
            <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={5} className={`${inputClass} font-mono text-xs`} placeholder={kind === "test" ? "T-000001,3250,300" : "P-000001,PKG-FBCM,900"} aria-label="CSV" />
            <div><button type="button" onClick={importCsv} disabled={busy || !csv.trim()} className={buttonClass}>{busy ? "Importing..." : "Import"}</button></div>
          </div>
        )}

        {problems.length > 0 && (
          <ul role="alert" className="max-h-32 overflow-y-auto rounded-md bg-red-50 p-3 text-xs text-red-800">
            {problems.map((p, i) => <li key={i}><span className="font-mono">{p.row}</span>: {p.message}</li>)}
          </ul>
        )}

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr><th className="px-3 py-2">Internal id</th><th className="px-3 py-2">{kind === "test" ? "Test" : "Package"}</th><th className="px-3 py-2">{lab.name} id</th><th className="px-3 py-2">Cost (Rs.)</th></tr>
            </thead>
            <tbody className="divide-y">
              {loading && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">Loading...</td></tr>}
              {!loading && visible.map((r) => {
                const e = edits[r.internalId];
                return (
                  <tr key={r.internalId} className={r.active ? "" : "bg-gray-50 text-gray-500"}>
                    <td className="px-3 py-1.5 font-mono text-xs">{r.internalId}</td>
                    <td className="px-3 py-1.5">{r.name}{!r.active && <span className="ml-1 text-xs text-amber-700">(inactive)</span>}</td>
                    <td className="px-3 py-1.5"><input value={e?.externalId ?? r.externalId ?? ""} onChange={(ev) => setEdit(r, { externalId: ev.target.value })} className={`${inputClass} font-mono ${!(e?.externalId ?? r.externalId) && r.active ? "border-amber-400" : ""}`} aria-label={`${lab.name} id for ${r.name}`} /></td>
                    <td className="px-3 py-1.5"><input value={e?.cost ?? (r.cost === null ? "" : String(r.cost))} onChange={(ev) => setEdit(r, { cost: ev.target.value })} inputMode="numeric" className={`${inputClass} w-24`} aria-label={`Cost for ${r.name}`} /></td>
                  </tr>
                );
              })}
              {!loading && visible.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">Nothing to show.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{shown.length} item{shown.length === 1 ? "" : "s"}</span>
          <span className="flex items-center gap-2">
            <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)} className={quietButtonClass}>Previous</button>
            Page {current} of {pages}
            <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)} className={quietButtonClass}>Next</button>
          </span>
        </div>
      </div>
      <div className="sticky -bottom-4 -mx-5 -mb-4 mt-4 flex items-center gap-2 border-t bg-white px-5 py-3">
        <button type="button" onClick={save} disabled={busy || changed === 0} className={buttonClass}>{busy ? "Saving..." : changed ? `Save ${changed} change${changed === 1 ? "" : "s"}` : "No changes"}</button>
        <button type="button" onClick={onClose} className="text-sm font-medium text-gray-600 hover:underline">Close</button>
      </div>
    </Modal>
  );
}
