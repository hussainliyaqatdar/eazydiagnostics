"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "../Modal";
import { useToast } from "../Toaster";
import { buttonClass, inputClass, labelClass, quietButtonClass, sendJson } from "../api";
import TestPicker, { type PickableTest } from "./TestPicker";
import type { PackageItem } from "@/lib/types";

export type DoctorOption = { id: string; name: string; clinic: string };

const rs = (n: number | null | undefined) => (n === null || n === undefined ? "-" : `Rs. ${n.toLocaleString("en-IN")}`);

// Standard packages (`doctor` omitted) or one doctor's custom panels (`doctor` given): add, edit, switch off, delete.
// A custom panel is shown only on that doctor's own affiliate link; switching it off hides it there.
export default function PackagesPanel({
  packages,
  standard,
  tests,
  categories,
  doctor,
  lab,
}: {
  packages: PackageItem[];
  // The standard packages (templates for custom panels).
  standard: PackageItem[];
  tests: PickableTest[];
  categories: string[];
  doctor?: DoctorOption;
  lab: { id: string; name: string } | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const custom = !!doctor;
  const [editing, setEditing] = useState<PackageItem | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const noun = custom ? "panel" : "package";
  // Standard packages in the catalogue file that this database doesn't have yet (see lib/catalog-store.ts).
  const [pending, setPending] = useState<{ code: string; name: string; price: number; tests: number }[]>([]);
  useEffect(() => {
    if (custom) return;
    fetch("/api/admin/catalog/packages/import")
      .then((r) => (r.ok ? r.json() : { packages: [] }))
      .then((d) => setPending(Array.isArray(d.packages) ? d.packages : []))
      .catch(() => setPending([]));
  }, [custom]);

  async function addPending() {
    setBusy("pending");
    const res = await sendJson<{ added: string[]; skipped: { name: string; reason: string }[] }>("/api/admin/catalog/packages/import", "POST");
    if (res.ok) {
      const { added, skipped } = res.data;
      toast({ kind: skipped.length ? "error" : "success", title: `${added.length} package${added.length === 1 ? "" : "s"} added`, message: skipped.length ? `${skipped.length} could not be added: ${skipped.map((s) => `${s.name} (${s.reason})`).join("; ")}` : added.join(", ") });
      setPending([]);
      router.refresh();
    } else toast({ kind: "error", title: "Couldn't add the packages", message: res.error });
    setBusy(null);
  }

  async function toggle(p: PackageItem) {
    setBusy(p.id);
    const res = await sendJson(`/api/admin/catalog/packages/${encodeURIComponent(p.id)}`, "PATCH", { active: p.active === false });
    toast(res.ok ? { kind: "success", title: p.active === false ? `${cap(noun)} activated` : `${cap(noun)} deactivated`, message: p.active === false ? p.name : custom ? `${p.name} is hidden on ${doctor!.name}'s link.` : `${p.name} is hidden from the site.` } : { kind: "error", title: `Couldn't change the ${noun}`, message: res.error });
    setBusy(null);
    if (res.ok) router.refresh();
  }

  async function remove(p: PackageItem) {
    setBusy(p.id);
    const res = await sendJson(`/api/admin/catalog/packages/${encodeURIComponent(p.id)}`, "DELETE");
    toast(res.ok ? { kind: "success", title: `${cap(noun)} deleted`, message: p.name } : { kind: "error", title: `Couldn't delete the ${noun}`, message: res.error });
    setBusy(null);
    setConfirmDelete(null);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          {packages.length} {noun}{packages.length === 1 ? "" : "s"}
          {custom ? ` for ${doctor!.name} (${doctor!.clinic}). Shown only on this doctor's own link.` : "."}
        </p>
        <button type="button" onClick={() => setEditing("new")} className={buttonClass}>+ {custom ? "New panel" : "Add package"}</button>
      </div>

      {!custom && pending.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p>
            <span className="font-semibold">{pending.length} new package{pending.length === 1 ? "" : "s"} from the lab are in the catalogue file but not on the site yet:</span>{" "}
            {pending.map((x) => `${x.name} (Rs. ${x.price.toLocaleString("en-IN")})`).join(", ")}.
          </p>
          <div>
            <button type="button" disabled={busy === "pending"} onClick={addPending} className={buttonClass}>
              {busy === "pending" ? "Adding..." : `Add ${pending.length} package${pending.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">{custom ? "Panel" : "Package"}</th>
              <th className="px-3 py-2">Patient price</th>
              {custom && <th className="px-3 py-2">B2B price</th>}
              <th className="px-3 py-2">Tests</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {packages.map((p) => (
              <tr key={p.id} className={p.active === false ? "bg-gray-50 text-gray-500" : ""}>
                <td className="px-3 py-2">
                  <span className="font-medium text-gray-900">{p.name}</span>
                  <span className="block text-xs text-gray-500">
                    <span className="font-mono">{p.id}</span> &middot; {lab?.name ?? "Lab"} id: {p.externalId ? <span className="font-mono">{p.externalId}</span> : <span className="text-amber-700">{custom ? "none (sent as its tests)" : "not set"}</span>} &middot; {p.category}
                    {p.templateSlug && <> &middot; from {standard.find((s) => s.slug === p.templateSlug)?.name ?? p.templateSlug}</>}
                  </span>
                </td>
                <td className="px-3 py-2">{rs(p.price)}</td>
                {custom && <td className="px-3 py-2">{rs(p.b2bPrice)}</td>}
                <td className="px-3 py-2">{p.constituents.length}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.active === false ? "bg-gray-200 text-gray-700" : "bg-green-100 text-green-800"}`}>{p.active === false ? "Inactive" : "Active"}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  {confirmDelete === p.id ? (
                    <span className="inline-flex items-center gap-2 text-xs">
                      Delete for good?
                      <button type="button" disabled={busy === p.id} onClick={() => remove(p)} className="rounded bg-red-600 px-2 py-1 font-semibold text-white">Delete</button>
                      <button type="button" onClick={() => setConfirmDelete(null)} className="rounded border px-2 py-1">Cancel</button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-3 text-xs">
                      <button type="button" onClick={() => setEditing(p)} className="font-medium text-brand hover:underline">Edit</button>
                      <button type="button" disabled={busy === p.id} onClick={() => toggle(p)} className="font-medium text-gray-700 hover:underline">{p.active === false ? "Activate" : "Deactivate"}</button>
                      <button type="button" onClick={() => setConfirmDelete(p.id)} className="font-medium text-red-600 hover:underline">Delete</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {packages.length === 0 && (
              <tr><td colSpan={custom ? 6 : 5} className="px-3 py-8 text-center text-gray-500">{custom ? "No custom panels for this doctor yet. Use New panel to make one from a standard package." : "No packages."}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <PackageForm pkg={editing === "new" ? null : editing} doctor={doctor} lab={lab} standard={standard} tests={tests} categories={categories} onClose={() => setEditing(null)} onSaved={() => router.refresh()} />
      )}
    </div>
  );
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

type Form = { externalId: string; name: string; category: string; price: string; mrp: string; b2b: string; tagline: string; description: string; eta: string; active: boolean };

function PackageForm({ pkg, doctor, lab, standard, tests, categories, onClose, onSaved }: { pkg: PackageItem | null; doctor?: DoctorOption; lab: { id: string; name: string } | null; standard: PackageItem[]; tests: PickableTest[]; categories: string[]; onClose: () => void; onSaved: () => void }) {
  const custom = !!doctor;
  const editing = !!pkg;
  const { toast } = useToast();
  const [template, setTemplate] = useState("");
  const [f, setF] = useState<Form>({
    externalId: pkg?.externalId ?? "", name: pkg?.name ?? "", category: pkg?.category ?? "", price: pkg ? String(pkg.price) : "", mrp: pkg?.mrp ? String(pkg.mrp) : "",
    b2b: pkg?.b2bPrice != null ? String(pkg.b2bPrice) : "", tagline: pkg?.tagline ?? "", description: pkg?.description ?? "", eta: pkg?.eta ?? "12-24 hours", active: pkg ? pkg.active !== false : true,
  });
  const [slugs, setSlugs] = useState<string[]>(pkg ? pkg.constituents.map((c) => c.slug).filter((s): s is string => !!s) : []);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const templateItem = useMemo(() => standard.find((s) => s.slug === template), [standard, template]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((cur) => ({ ...cur, [k]: v }));

  // A custom panel starts as a copy of a standard package: its tests, wording and report time come across, and the
  // admin then gives it the doctor's name for it, the patient price and the B2B price.
  function useTemplate(slug: string) {
    setTemplate(slug);
    const t = standard.find((s) => s.slug === slug);
    if (!t) return;
    setF((cur) => ({ ...cur, name: cur.name || t.name, category: t.category, price: cur.price || String(t.price), tagline: t.tagline, description: t.description, eta: t.eta }));
    setSlugs(t.constituents.map((c) => c.slug).filter((s): s is string => !!s));
  }

  const problems = {
    externalId: !custom && !f.externalId.trim() ? `The ${lab?.name ?? "partner lab"} package id is required.` : "",
    name: f.name.trim().length < 2 ? "Enter the name." : "",
    price: !/^\d+$/.test(f.price.trim()) || Number(f.price) < 1 ? "Enter the patient price in whole rupees." : "",
    b2b: custom && !/^\d+$/.test(f.b2b.trim()) ? "Enter the B2B price in whole rupees." : "",
  };
  const show = (m: string) => (touched && m ? <span role="alert" className="font-normal text-red-600">{m}</span> : null);

  async function save() {
    setTouched(true);
    if (Object.values(problems).some(Boolean)) return;
    setBusy(true);
    const payload: Record<string, unknown> = { name: f.name, price: Number(f.price), tagline: f.tagline, description: f.description, eta: f.eta, category: f.category, tests: slugs, active: f.active };
    if (!custom) payload.mrp = f.mrp.trim() ? Number(f.mrp) : null;
    if (custom) payload.b2bPrice = Number(f.b2b);
    payload.externalId = f.externalId;
    if (!editing && custom) Object.assign(payload, { ownerDoctorId: doctor!.id, templateSlug: template || undefined });
    const res = editing ? await sendJson(`/api/admin/catalog/packages/${encodeURIComponent(pkg!.id)}`, "PATCH", payload) : await sendJson("/api/admin/catalog/packages", "POST", payload);
    setBusy(false);
    if (!res.ok) {
      toast({ kind: "error", title: `Couldn't save the ${custom ? "panel" : "package"}`, message: res.error });
      return;
    }
    toast({ kind: "success", title: editing ? "Saved" : custom ? "Panel created" : "Package added", message: f.name });
    onSaved();
    onClose();
  }

  const title = editing ? `Edit ${pkg!.name}` : custom ? `New panel for ${doctor!.name}` : "Add a package";
  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="flex flex-col gap-3">
        {custom && !editing && (
          <label className={`${labelClass} rounded-md bg-gray-50 p-3`}>
            Start from a standard package
            <select value={template} onChange={(e) => useTemplate(e.target.value)} className={inputClass} aria-label="Start from a standard package">
              <option value="">Start blank</option>
              {standard.filter((s) => s.active !== false).map((s) => (
                <option key={s.slug} value={s.slug}>{s.name} ({rs(s.price)})</option>
              ))}
            </select>
            <span className="font-normal text-gray-500">Copies its tests, wording and report time. Then set the name, patient price and B2B price for this doctor.{templateItem && ` The standard price is ${rs(templateItem.price)}.`}</span>
          </label>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            {lab?.name ?? "Partner lab"} package id{custom ? "" : "*"} <span className="font-normal text-gray-400">{custom ? "(optional: without one, the lab is sent this panel's tests)" : "(the lab's own id for this package: its external_package_id)"}</span>
            <input value={f.externalId} onChange={(e) => set("externalId", e.target.value)} maxLength={60} placeholder="e.g. PKG-FBCM" className={`${inputClass} font-mono`} aria-label="Partner lab package id" />
            {show(problems.externalId)}
            {editing && <span className="font-normal text-gray-500">Our internal id: <span className="font-mono">{pkg!.id}</span> (permanent)</span>}
          </label>
          <label className={labelClass}>
            {custom ? "Panel name* (as the doctor wants it called)" : "Name*"}
            <input value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={160} className={inputClass} aria-label="Name" />
            {show(problems.name)}
          </label>
          <label className={labelClass}>
            Patient price (Rs.)*
            <input value={f.price} onChange={(e) => set("price", e.target.value)} inputMode="numeric" className={inputClass} aria-label="Patient price" />
            {show(problems.price)}
          </label>
          {custom ? (
            <label className={labelClass}>
              B2B price (Rs.)* <span className="font-normal text-gray-400">(what the clinic is charged)</span>
              <input value={f.b2b} onChange={(e) => set("b2b", e.target.value)} inputMode="numeric" className={inputClass} aria-label="B2B price" />
              {show(problems.b2b)}
            </label>
          ) : (
            <label className={labelClass}>
              Crossed-out price (Rs.) <span className="font-normal text-gray-400">(optional)</span>
              <input value={f.mrp} onChange={(e) => set("mrp", e.target.value)} inputMode="numeric" className={inputClass} />
            </label>
          )}
          {!custom && (
            <label className={labelClass}>
              Category
              <input value={f.category} onChange={(e) => set("category", e.target.value)} list="package-categories" className={inputClass} />
              <datalist id="package-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </label>
          )}
          <label className={labelClass}>
            Short line under the name
            <input value={f.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={160} className={inputClass} />
          </label>
          <label className={labelClass}>
            Report time
            <input value={f.eta} onChange={(e) => set("eta", e.target.value)} maxLength={40} className={inputClass} />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Description
            <textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={3} maxLength={4000} className={inputClass} />
          </label>
        </div>
        <TestPicker all={tests} value={slugs} onChange={setSlugs} />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} />
          Active {custom ? `(shown on ${doctor!.name}'s link and bookable)` : "(shown on the site and bookable)"}
        </label>
      </div>
      <div className="sticky -bottom-4 -mx-5 -mb-4 mt-4 flex items-center gap-2 border-t bg-white px-5 py-3">
        <button type="button" onClick={save} disabled={busy} className={buttonClass}>{busy ? "Saving..." : editing ? "Save changes" : custom ? "Create panel" : "Add package"}</button>
        <button type="button" onClick={onClose} disabled={busy} className={quietButtonClass}>Cancel</button>
      </div>
    </Modal>
  );
}
