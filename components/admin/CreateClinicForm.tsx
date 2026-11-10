"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import { buttonClass, inputClass, labelClass, quietButtonClass, sendJson } from "./api";

// "Register a clinic" button that opens a dialog for the name and address; everything else (logo,
// doctors, who collects payment) is set on the clinic's own page, which opens straight after.
export default function CreateClinicForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result = await sendJson<{ id: string }>("/api/admin/clinics", "POST", { name, address });
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(`/admin/clinics/${result.data.id}`);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass}>+ Register a clinic</button>
      {open && (
        <Modal title="Register a clinic" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className={labelClass}>
              Clinic name*
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} maxLength={100} placeholder="e.g. Medicare Clinic" autoFocus />
            </label>
            <label className={labelClass}>
              Address
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} maxLength={300} placeholder="Street, area, city" />
            </label>
            <p className="text-xs text-gray-500">You can add the logo, doctors and payment settings on the next page.</p>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={busy || name.trim().length < 2} className={buttonClass}>{busy ? "Creating..." : "Register clinic"}</button>
              <button type="button" onClick={() => setOpen(false)} className={quietButtonClass}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
