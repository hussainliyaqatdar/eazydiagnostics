"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "../Modal";
import { useToast } from "../Toaster";
import { buttonClass, inputClass, labelClass, quietButtonClass, sendJson } from "../api";
import type { TestItem } from "@/lib/types";

const PAGE = 40;

type Form = { externalId: string; name: string; labName: string; aliases: string; price: string; mrp: string; type: "Routine" | "Specialised"; category: string; sampleType: string; eta: string; description: string; popular: boolean; active: boolean };
const blank: Form = { externalId: "", name: "", labName: "", aliases: "", price: "", mrp: "", type: "Routine", category: "", sampleType: "Blood", eta: "12-24 hours", description: "", popular: false, active: true };

// The catalog's tests: add, edit, switch off (inactive tests are hidden from the site and cannot be booked) and delete.
export default function TestsPanel({ tests, categories, lab }: { tests: TestItem[]; categories: string[]; lab: { id: string; name: string } | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<TestItem | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tests.filter((t) => (filter === "all" || (filter === "active") === (t.active !== false)) && (!needle || t.name.toLowerCase().includes(needle) || t.id.toLowerCase().includes(needle) || (t.externalId ?? "").toLowerCase().includes(needle) || t.labName.toLowerCase().includes(needle)));
  }, [tests, q, filter]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const current = Math.min(page, pages);
  const rows = shown.slice((current - 1) * PAGE, current * PAGE);

  async function toggle(t: TestItem) {
    setBusy(t.id);
    const res = await sendJson(`/api/admin/catalog/tests/${encodeURIComponent(t.id)}`, "PATCH", { active: t.active === false });
    toast(res.ok ? { kind: "success", title: t.active === false ? "Test activated" : "Test deactivated", message: t.active === false ? `${t.name} is back on the site.` : `${t.name} is hidden from the site and cannot be booked.` } : { kind: "error", title: "Couldn't change the test", message: res.error });
    setBusy(null);
    if (res.ok) router.refresh();
  }

  async function remove(t: TestItem) {
    setBusy(t.id);
    const res = await sendJson(`/api/admin/catalog/tests/${encodeURIComponent(t.id)}`, "DELETE");
    toast(res.ok ? { kind: "success", title: "Test deleted", message: t.name } : { kind: "error", title: "Couldn't delete the test", message: res.error });
    setBusy(null);
    setConfirmDelete(null);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by name or id" className={`${inputClass} max-w-xs`} aria-label="Search tests" />
        <select value={filter} onChange={(e) => { setFilter(e.target.value as typeof filter); setPage(1); }} className={`${inputClass} w-auto`} aria-label="Show">
          <option value="all">All ({tests.length})</option>
          <option value="active">Active ({tests.filter((t) => t.active !== false).length})</option>
          <option value="inactive">Inactive ({tests.filter((t) => t.active === false).length})</option>
        </select>
        <button type="button" onClick={() => setEditing("new")} className={`${buttonClass} ml-auto`}>+ Add test</button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">Internal id</th>
              <th className="px-3 py-2">{lab ? `${lab.name} id` : "Lab id"}</th>
              <th className="px-3 py-2">Test</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((t) => (
              <tr key={t.id} className={t.active === false ? "bg-gray-50 text-gray-500" : ""}>
                <td className="px-3 py-2 font-mono text-xs">{t.id}</td>
                <td className="px-3 py-2 font-mono text-xs">{t.externalId ?? <span className="font-sans text-amber-700">not set</span>}</td>
                <td className="px-3 py-2">
                  <span className="font-medium text-gray-900">{t.name}</span>
                  {t.labName.toLowerCase() !== t.name.toLowerCase() && <span className="block text-xs text-gray-500">{t.labName}</span>}
                </td>
                <td className="px-3 py-2">Rs. {t.price.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2">{t.type}</td>
                <td className="px-3 py-2">{t.category}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.active === false ? "bg-gray-200 text-gray-700" : "bg-green-100 text-green-800"}`}>{t.active === false ? "Inactive" : "Active"}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  {confirmDelete === t.id ? (
                    <span className="inline-flex items-center gap-2 text-xs">
                      Delete for good?
                      <button type="button" disabled={busy === t.id} onClick={() => remove(t)} className="rounded bg-red-600 px-2 py-1 font-semibold text-white">Delete</button>
                      <button type="button" onClick={() => setConfirmDelete(null)} className="rounded border px-2 py-1">Cancel</button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-3 text-xs">
                      <button type="button" onClick={() => setEditing(t)} className="font-medium text-brand hover:underline">Edit</button>
                      <button type="button" disabled={busy === t.id} onClick={() => toggle(t)} className="font-medium text-gray-700 hover:underline">{t.active === false ? "Activate" : "Deactivate"}</button>
                      <button type="button" onClick={() => setConfirmDelete(t.id)} className="font-medium text-red-600 hover:underline">Delete</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500">No tests match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{shown.length} test{shown.length === 1 ? "" : "s"}</span>
        <span className="flex items-center gap-2">
          <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)} className={quietButtonClass}>Previous</button>
          Page {current} of {pages}
          <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)} className={quietButtonClass}>Next</button>
        </span>
      </div>

      {editing && <TestForm test={editing === "new" ? null : editing} categories={categories} lab={lab} onClose={() => setEditing(null)} onSaved={() => router.refresh()} />}
    </div>
  );
}

function TestForm({ test, categories, lab, onClose, onSaved }: { test: TestItem | null; categories: string[]; lab: { id: string; name: string } | null; onClose: () => void; onSaved: () => void }) {
  const editing = !!test;
  const { toast } = useToast();
  const [f, setF] = useState<Form>(test ? { ...blank, externalId: test.externalId ?? "", name: test.name, labName: test.labName, aliases: test.aliases.join(", "), price: String(test.price), mrp: test.mrp ? String(test.mrp) : "", type: test.type, category: test.category, sampleType: test.sampleType, eta: test.eta, popular: test.popular, active: test.active !== false } : blank);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  // The list leaves out the long description: fetch the whole test when editing.
  useEffect(() => {
    if (!test) return;
    fetch(`/api/admin/catalog/tests/${encodeURIComponent(test.id)}`)
      .then((r) => r.json())
      .then((d) => d.test && setF((cur) => ({ ...cur, description: d.test.description ?? "", mrp: d.test.mrp ? String(d.test.mrp) : "" })))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [test]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((cur) => ({ ...cur, [k]: v }));
  const problems = {
    externalId: !f.externalId.trim() ? `The ${lab?.name ?? "partner lab"} test id is required.` : "",
    name: f.name.trim().length < 2 ? "Enter the test name." : "",
    price: !/^\d+$/.test(f.price.trim()) || Number(f.price) < 1 ? "Enter the price in whole rupees." : "",
  };
  const show = (m: string) => (touched && m ? <span role="alert" className="font-normal text-red-600">{m}</span> : null);

  async function save() {
    setTouched(true);
    if (Object.values(problems).some(Boolean)) return;
    setBusy(true);
    const payload = { ...f, price: Number(f.price), mrp: f.mrp.trim() ? Number(f.mrp) : null };
    const res = editing ? await sendJson(`/api/admin/catalog/tests/${encodeURIComponent(test!.id)}`, "PATCH", payload) : await sendJson("/api/admin/catalog/tests", "POST", payload);
    setBusy(false);
    if (!res.ok) {
      toast({ kind: "error", title: "Couldn't save the test", message: res.error });
      return;
    }
    toast({ kind: "success", title: editing ? "Test saved" : "Test added", message: f.name });
    onSaved();
    onClose();
  }

  return (
    <Modal title={editing ? `Edit ${test!.name}` : "Add a test"} onClose={onClose} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          {lab?.name ?? "Partner lab"} test id* <span className="font-normal text-gray-400">(the lab&apos;s own id for this test: its external_test_id)</span>
          <input value={f.externalId} onChange={(e) => set("externalId", e.target.value)} maxLength={60} placeholder="e.g. 3250" className={`${inputClass} font-mono`} aria-label="Partner lab test id" />
          {show(problems.externalId)}
          {editing && <span className="font-normal text-gray-500">Our internal id: <span className="font-mono">{test!.id}</span> (permanent)</span>}
        </label>
        <label className={labelClass}>
          Test name*
          <input value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={160} placeholder="What patients see, e.g. Thyroid Stimulating Hormone (TSH)" className={inputClass} aria-label="Test name" />
          {show(problems.name)}
        </label>
        <label className={labelClass}>
          Lab&apos;s name for it
          <input value={f.labName} onChange={(e) => set("labName", e.target.value)} maxLength={160} placeholder="As on the SRL price list (defaults to the name)" className={inputClass} />
        </label>
        <label className={labelClass}>
          Also known as <span className="font-normal text-gray-400">(comma separated; patients can search these)</span>
          <input value={f.aliases} onChange={(e) => set("aliases", e.target.value)} placeholder="TSH, Thyroid Stimulating Hormone" className={inputClass} />
        </label>
        <label className={labelClass}>
          Price (Rs.)*
          <input value={f.price} onChange={(e) => set("price", e.target.value)} inputMode="numeric" className={inputClass} aria-label="Price" />
          {show(problems.price)}
        </label>
        <label className={labelClass}>
          Crossed-out price (Rs.) <span className="font-normal text-gray-400">(optional; worked out if left empty)</span>
          <input value={f.mrp} onChange={(e) => set("mrp", e.target.value)} inputMode="numeric" className={inputClass} />
        </label>
        <label className={labelClass}>
          Type
          <select value={f.type} onChange={(e) => set("type", e.target.value as Form["type"])} className={inputClass}>
            <option value="Routine">Routine</option>
            <option value="Specialised">Specialised</option>
          </select>
        </label>
        <label className={labelClass}>
          Category
          <input value={f.category} onChange={(e) => set("category", e.target.value)} list="test-categories" placeholder="Choose or type a new one" className={inputClass} />
          <datalist id="test-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <label className={labelClass}>
          Sample
          <input value={f.sampleType} onChange={(e) => set("sampleType", e.target.value)} maxLength={60} className={inputClass} />
        </label>
        <label className={labelClass}>
          Report time
          <input value={f.eta} onChange={(e) => set("eta", e.target.value)} maxLength={40} placeholder="12-24 hours" className={inputClass} />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Description {loading && <span className="font-normal text-gray-400">(loading...)</span>}
          <textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={3} maxLength={4000} className={inputClass} />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={f.popular} onChange={(e) => set("popular", e.target.checked)} /> Popular (ranked a little higher in search)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} /> Active (shown on the site and bookable)
        </label>
      </div>
      <div className="sticky -bottom-4 -mx-5 -mb-4 mt-4 flex items-center gap-2 border-t bg-white px-5 py-3">
        <button type="button" onClick={save} disabled={busy || loading} className={buttonClass}>{busy ? "Saving..." : editing ? "Save changes" : "Add test"}</button>
        <button type="button" onClick={onClose} disabled={busy} className="text-sm font-medium text-gray-600 hover:underline">Cancel</button>
      </div>
    </Modal>
  );
}
