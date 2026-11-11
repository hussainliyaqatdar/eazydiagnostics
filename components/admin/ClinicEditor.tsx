"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, inputClass, labelClass, quietButtonClass, sendForm, sendJson } from "./api";
import type { Clinic } from "@/lib/clinics";
import { useToast } from "./Toaster";

// The clinic's own details: name, address, logo, who collects the patient's payment, and whether
// its referral links show the clinic-branded site.
export default function ClinicEditor({ clinic, logoUrl }: { clinic: Clinic; logoUrl: string | null }) {
  const router = useRouter();
  const [name, setName] = useState(clinic.name);
  const [address, setAddress] = useState(clinic.address);
  const [collector, setCollector] = useState(clinic.paymentCollector);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await sendJson(`/api/admin/clinics/${clinic.id}`, "PATCH", { name, address, paymentCollector: collector });
    toast(result.ok ? { kind: "success", title: "Clinic saved" } : { kind: "error", title: "Couldn't save the clinic", message: result.error });
    setBusy(false);
    if (result.ok) router.refresh();
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    const result = await sendForm(`/api/admin/clinics/${clinic.id}/logo`, form);
    toast(result.ok ? { kind: "success", title: "Logo updated" } : { kind: "error", title: "Couldn't upload the logo", message: result.error });
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (result.ok) router.refresh();
  }

  const [confirmDelete, setConfirmDelete] = useState(false);

  async function deleteClinic() {
    setBusy(true);
    const result = await sendJson(`/api/admin/clinics/${clinic.id}`, "DELETE");
    if (result.ok) {
      router.push("/admin/doctors");
      return;
    }
    toast({ kind: "error", title: "Couldn't delete the clinic", message: result.error });
    setConfirmDelete(false);
    setBusy(false);
  }

  async function removeLogo() {
    setBusy(true);
    const result = await sendJson(`/api/admin/clinics/${clinic.id}/logo`, "DELETE");
    toast(result.ok ? { kind: "success", title: "Logo removed" } : { kind: "error", title: "Couldn't remove the logo", message: result.error });
    setBusy(false);
    if (result.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4 rounded-lg border bg-white p-4">
      <h2 className="font-semibold text-gray-900">Clinic</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Clinic name*
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} maxLength={100} />
        </label>
        <label className={labelClass}>
          Address
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} maxLength={300} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-gray-50">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={`${clinic.name} logo`} className="h-full w-full object-contain" />
          ) : (
            <span className="px-1 text-center text-[11px] text-gray-400">No logo</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-600">Logo (PNG, JPG or WebP, up to 3 MB)</span>
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} className="text-xs" aria-label="Upload logo" />
            {logoUrl && (
              <button type="button" onClick={removeLogo} disabled={busy} className={quietButtonClass}>
                Remove logo
              </button>
            )}
          </div>
          <span className="text-xs text-gray-500">Shown in the site header and on the clinic&apos;s lab reports. Without a logo, the site shows just the clinic&apos;s name.</span>
        </div>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs font-medium text-gray-600">Who collects the payment for a visit</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="collector" checked={collector === "clinic"} onChange={() => setCollector("clinic")} />
            The clinic <span className="text-xs text-gray-500">(default - patients pay at the front desk)</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="collector" checked={collector === "eazy"} onChange={() => setCollector("eazy")} />
            Eazy Diagnostics <span className="text-xs text-gray-500">(patients pay after the sample is collected)</span>
          </label>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy || name.trim().length < 2} className={buttonClass}>
          {busy ? "Saving..." : "Save clinic"}
        </button>
        {!confirmDelete ? (
          <button type="button" onClick={() => setConfirmDelete(true)} disabled={busy} className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
            Delete clinic
          </button>
        ) : (
          <span role="alertdialog" aria-label="Delete clinic?" className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-800">
            Delete {clinic.name}? Only possible when it has no doctors.
            <button type="button" onClick={deleteClinic} disabled={busy} className="rounded bg-red-600 px-2 py-1 font-semibold text-white">Confirm</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="rounded border px-2 py-1">Cancel</button>
          </span>
        )}
      </div>
    </form>
  );
}
