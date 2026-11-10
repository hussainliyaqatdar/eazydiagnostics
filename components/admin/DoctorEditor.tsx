"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CopyLinkButton from "@/components/CopyLinkButton";
import DeleteDoctorButton from "@/components/DeleteDoctorButton";
import { buttonClass, inputClass, labelClass, quietButtonClass, sendForm, sendJson } from "./api";
import type { Doctor } from "@/lib/types";

type Props =
  | { mode: "edit"; doctor: Doctor; link: string; clinics: { id: string; name: string }[] }
  | { mode: "add"; clinicId: string; onDone?: () => void };

// One doctor of a clinic: name and qualifications, the WhatsApp number and email used for updates and
// reports, an optional degree / KMC certificate, and the B2B discounts (set per doctor, not per clinic).
// In "add" mode it is the form for another doctor of the clinic.
export default function DoctorEditor(props: Props) {
  const router = useRouter();
  const doctor = props.mode === "edit" ? props.doctor : null;
  const [name, setName] = useState(doctor?.name ?? "Dr. ");
  const [degree, setDegree] = useState(doctor?.degree ?? "");
  const [specialty, setSpecialty] = useState(doctor?.specialty ?? "");
  const [mobile, setMobile] = useState(doctor?.mobile ?? "");
  const [email, setEmail] = useState(doctor?.email ?? "");
  const [routine, setRoutine] = useState(String(doctor?.discounts.routine ?? 35));
  const [special, setSpecial] = useState(String(doctor?.discounts.special ?? 10));
  const [pkg, setPkg] = useState(String(doctor?.discounts.package ?? 15));
  const [clinicId, setClinicId] = useState(doctor?.clinicId ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const certRef = useRef<HTMLInputElement>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    if (props.mode === "add") {
      const result = await sendJson(`/api/admin/clinics/${props.clinicId}/doctors`, "POST", { name, degree, specialty, mobile, email });
      if (!result.ok) {
        setMessage({ ok: false, text: result.error });
        setBusy(false);
        return;
      }
      setName("Dr. ");
      setDegree("");
      setSpecialty("");
      setMobile("");
      setEmail("");
      setMessage({ ok: true, text: "Doctor added." });
      setBusy(false);
      if (props.onDone) props.onDone();
      else router.refresh();
      return;
    }
    const result = await sendJson(`/api/admin/doctors/${props.doctor.id}`, "PATCH", {
      name, degree, specialty, mobile, email, clinicId,
      discounts: { routine, special, package: pkg },
    });
    setMessage(result.ok ? { ok: true, text: "Saved." } : { ok: false, text: result.error });
    setBusy(false);
    if (result.ok) router.refresh();
  }

  async function approve() {
    if (props.mode !== "edit") return;
    setBusy(true);
    const result = await sendJson(`/api/admin/doctors/${props.doctor.id}`, "PATCH", { approved: true });
    setMessage(result.ok ? { ok: true, text: "Approved." } : { ok: false, text: result.error });
    setBusy(false);
    if (result.ok) router.refresh();
  }

  async function uploadCertificate(file: File | undefined) {
    if (!file || props.mode !== "edit") return;
    setBusy(true);
    setMessage(null);
    const form = new FormData();
    form.append("file", file);
    const result = await sendForm(`/api/admin/doctors/${props.doctor.id}/certificate`, form);
    setMessage(result.ok ? { ok: true, text: "Certificate uploaded." } : { ok: false, text: result.error });
    setBusy(false);
    if (certRef.current) certRef.current.value = "";
    if (result.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className={`flex flex-col gap-3 ${props.mode === "add" ? "" : "rounded-lg border bg-white p-4"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {props.mode === "edit" && <h3 className="font-semibold text-gray-900">{doctor!.name}</h3>}
        {doctor && !doctor.approved && (
          <span className="flex items-center gap-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
            Waiting for approval - not shown at checkout or messaged yet
            <button type="button" onClick={approve} disabled={busy} className="rounded bg-amber-600 px-2 py-0.5 font-semibold text-white">Approve</button>
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Name*
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} maxLength={80} />
        </label>
        <label className={labelClass}>
          Qualifications*
          <input value={degree} onChange={(e) => setDegree(e.target.value)} className={inputClass} maxLength={120} placeholder="MBBS, MD" />
        </label>
        <label className={labelClass}>
          Specialty*
          <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} className={inputClass} maxLength={80} placeholder="General Physician" />
        </label>
        <label className={labelClass}>
          WhatsApp number* <span className="font-normal text-gray-400">(order updates and reports)</span>
          <input value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputClass} inputMode="tel" placeholder="98450 12345" />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Email <span className="font-normal text-gray-400">(optional; reports and communication)</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} type="email" maxLength={120} />
        </label>
        {props.mode === "edit" && (
          <label className={`${labelClass} sm:col-span-2`}>
            Clinic
            <select value={clinicId} onChange={(e) => setClinicId(e.target.value)} className={inputClass}>
              {props.clinics.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {props.mode === "edit" && (
        <>
          <fieldset className="rounded-md border p-3">
            <legend className="px-1 text-xs font-medium text-gray-600">B2B discount off list price (this doctor)</legend>
            <div className="grid grid-cols-3 gap-3">
              <label className={labelClass}>
                Routine tests %
                <input value={routine} onChange={(e) => setRoutine(e.target.value)} className={inputClass} inputMode="numeric" />
              </label>
              <label className={labelClass}>
                Special tests %
                <input value={special} onChange={(e) => setSpecial(e.target.value)} className={inputClass} inputMode="numeric" />
              </label>
              <label className={labelClass}>
                Packages %
                <input value={pkg} onChange={(e) => setPkg(e.target.value)} className={inputClass} inputMode="numeric" />
              </label>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">Defaults are 35 / 10 / 15. Stored for invoicing; there is no automatic reconciliation yet.</p>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-xs font-medium text-gray-600">Degree / KMC registration certificate (optional):</span>
            {doctor!.hasCertificate ? (
              <a href={`/api/admin/doctors/${doctor!.id}/certificate`} target="_blank" rel="noopener noreferrer" className="text-brand underline">
                {doctor!.certificateName || "View certificate"}
              </a>
            ) : (
              <span className="text-gray-400">none uploaded</span>
            )}
            <input ref={certRef} type="file" accept="application/pdf,image/png,image/jpeg" disabled={busy} onChange={(e) => uploadCertificate(e.target.files?.[0])} className="text-xs" aria-label="Upload certificate" />
          </div>

          <div className="flex flex-wrap items-start gap-2 text-sm">
            <span className="text-xs font-medium text-gray-600">Affiliate link:</span>
            <a href={props.link} target="_blank" rel="noopener noreferrer" className="min-w-0 break-all text-brand hover:underline">{props.link}</a>
            <CopyLinkButton text={props.link} />
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={buttonClass}>
          {busy ? "Saving..." : props.mode === "add" ? "Add doctor" : "Save doctor"}
        </button>
        {props.mode === "edit" && <DeleteDoctorButton id={doctor!.id} name={doctor!.name} />}
        {message && (
          <span role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}>
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}
