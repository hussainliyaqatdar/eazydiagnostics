"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { REPORT_LABELS, REPORT_STATUSES, type ReportStatus } from "@/lib/order-status";
import { buttonClass, sendForm, sendJson } from "./api";
import { statusToast, type Outcome } from "./outcomes";
import { ReportPill } from "./StatusPill";
import { useToast } from "./Toaster";

type Result = { uploaded: boolean; branded?: boolean; clinicName?: string; changed: boolean; notifications: Outcome[] };

// A member's report. Its status (No report yet -> Partial -> Full) is a read-only pill; "Change status"
// is the only thing that WhatsApps anyone (the member and their prescribing doctor, with the report
// link). Uploading or replacing the PDF only saves it - it never sends a message. Once a file is stored,
// "Preview report" opens it in a pane so the clinic header (logo, doctor) can be checked before sharing.
export default function MemberReport({
  orderId,
  memberId,
  status,
  hasReport,
  branded,
  filename,
  doctorLabel,
  updatedAt,
  notifyTo,
}: {
  orderId: string;
  memberId: number;
  status: ReportStatus;
  hasReport: boolean;
  branded: boolean;
  filename: string | null;
  // The registered doctor whose clinic header goes on the report, or null.
  doctorLabel: string | null;
  updatedAt: string | null;
  // Who a status change is WhatsApped to, e.g. "Meera on 98765 00001 (the visit's number)".
  notifyTo: string;
}) {
  const router = useRouter();
  const [next, setNext] = useState<ReportStatus>(status === "none" ? "partial" : status);
  const [changing, setChanging] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const [showOriginal, setShowOriginal] = useState(false);
  const [preview, setPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState("");
  const base = `/api/admin/orders/${orderId}/members/${memberId}/report`;
  const fileUrl = `/api/admin/reports/${memberId}`;

  // What was sent decides what the toast says: a file (saved quietly), a header rebuild, or a status change.
  async function post(form: FormData, kind: "file" | "rebuild" | "status", after?: () => void) {
    setBusy(true);
    const res = await sendForm<Result>(base, form);
    if (!res.ok) toast({ kind: "error", title: kind === "status" ? "Couldn't update the report status" : "Couldn't save the report", message: res.error });
    else {
      const d = res.data;
      if (kind === "status") toast(statusToast("Report status", REPORT_LABELS[next], d.changed, d.notifications ?? []));
      else if (kind === "rebuild") toast({ kind: "success", title: "Report header rebuilt", message: d.branded ? `Now with ${d.clinicName}'s details. No message sent.` : "No clinic header applies. No message sent." });
      else toast({ kind: "success", title: "Report saved", message: `${d.branded ? `With ${d.clinicName}'s header.` : "No clinic header."} No message sent.` });
      after?.();
      router.refresh();
    }
    setBusy(false);
  }

  function saveFile() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    post(form, "file", () => {
      if (fileRef.current) fileRef.current.value = "";
      setPicked("");
      setShowOriginal(false);
      setPreview(false);
    });
  }

  function saveStatus() {
    const form = new FormData();
    form.append("status", next);
    post(form, "status", () => setChanging(false));
  }

  function rebuild() {
    const form = new FormData();
    form.append("rebrand", "1");
    post(form, "rebuild");
  }

  async function remove() {
    setBusy(true);
    const res = await sendJson(base, "DELETE");
    if (!res.ok) toast({ kind: "error", title: "Couldn't remove the report", message: res.error });
    else {
      toast({ kind: "success", title: "Report removed", message: "Status is back to No report yet. No message sent." });
      router.refresh();
    }
    setBusy(false);
  }

  const version = updatedAt ? encodeURIComponent(updatedAt) : "0";
  const previewSrc = `${fileUrl}?${showOriginal ? "original=1&" : ""}v=${version}#toolbar=0&navpanes=0&view=FitH`;

  return (
    <div className="flex flex-col gap-3 text-sm">
      {/* Status: a pill, changed on purpose. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Report</span>
        <ReportPill status={status} />
        {!changing && (
          <button type="button" onClick={() => { setNext(status === "none" ? "partial" : status); setChanging(true); }} disabled={busy} className="text-xs font-medium text-brand hover:underline">
            Change status
          </button>
        )}
        {changing && (
          <span className="flex flex-wrap items-center gap-2">
            <select aria-label="New report status" value={next} onChange={(e) => setNext(e.target.value as ReportStatus)} disabled={busy} className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs">
              {REPORT_STATUSES.map((s) => (
                <option key={s} value={s}>{REPORT_LABELS[s]}</option>
              ))}
            </select>
            <button type="button" onClick={saveStatus} disabled={busy || next === status} className={buttonClass}>{busy ? "Saving..." : "Update & notify"}</button>
            <button type="button" onClick={() => setChanging(false)} disabled={busy} className="text-xs font-medium text-brand hover:underline">Cancel</button>
          </span>
        )}
      </div>
      {changing && <p className="text-xs text-gray-500">If a template is mapped to this status, updating it WhatsApps {notifyTo}{hasReport ? ", with the report link" : ""}. With none mapped, nothing is sent.</p>}
      {!hasReport && next === "full" && changing && <p className="text-xs text-amber-700">Upload the full report PDF first so the message can carry its link.</p>}

      {/* The file: saving it never sends a message. */}
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept="application/pdf" disabled={busy} aria-label="Report PDF" onChange={(e) => setPicked(e.target.files?.[0]?.name ?? "")} className="min-w-0 text-xs" />
        {picked && (
          <>
            <button type="button" onClick={saveFile} disabled={busy} className={buttonClass}>
              {busy ? "Saving..." : hasReport ? "Replace report" : "Upload report"}
            </button>
            <span className="text-xs text-gray-500">Saving a file does not send a message.</span>
          </>
        )}
      </div>

      <p className="text-xs text-gray-500">
        {doctorLabel ? `The header shows ${doctorLabel} (name, logo and address) and the doctor's name and qualifications.` : "No registered prescribing doctor, so the report is kept as the lab produced it (no clinic header)."}
      </p>

      {/* The stored report: shown only when asked for. */}
      {hasReport && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-gray-50 px-3 py-2 text-xs">
            <span className="font-medium text-gray-800">{filename || "report.pdf"}</span>
            <span className="text-gray-500">{branded ? "with the clinic header" : "no clinic header"}</span>
            <span className="ml-auto flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setPreview((v) => !v)} aria-expanded={preview} className="rounded-md border border-brand bg-white px-2.5 py-1 font-semibold text-brand hover:bg-brand-light">
                {preview ? "Hide preview" : "Preview report"}
              </button>
              <a href={`${fileUrl}${showOriginal ? "?original=1" : ""}`} target="_blank" rel="noopener noreferrer" className="font-medium text-brand hover:underline">Open in new tab</a>
              <button type="button" onClick={rebuild} disabled={busy || !doctorLabel} className="font-medium text-brand hover:underline disabled:text-gray-400 disabled:no-underline">Rebuild header</button>
              <button type="button" onClick={remove} disabled={busy} className="font-medium text-red-600 hover:underline">Remove</button>
            </span>
          </div>
          {preview && (
            <div className="flex flex-col gap-2 rounded-lg border bg-gray-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-800">
                  {showOriginal ? "Lab's original, as received" : branded ? "As shared - with the clinic header" : "As shared - no clinic header"}
                </span>
                {branded && (
                  <button type="button" onClick={() => setShowOriginal((v) => !v)} className="text-xs font-medium text-brand hover:underline">
                    {showOriginal ? "Show shared version" : "Compare with original"}
                  </button>
                )}
              </div>
              <iframe key={previewSrc} src={previewSrc} title={`Report preview for member ${memberId}`} className="h-[40rem] w-full rounded-md border bg-white" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
