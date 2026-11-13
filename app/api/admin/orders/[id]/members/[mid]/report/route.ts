import { NextRequest, NextResponse } from "next/server";
import { getBooking } from "@/lib/orders";
import { getMember, rebrandMemberReport, removeMemberReport, saveMemberReport, setReportStatus } from "@/lib/order-admin";
import { isReportStatus, REPORT_LABELS } from "@/lib/order-status";
import { logEvent } from "@/lib/order-events";
import { notifyReport } from "@/lib/order-notifications";
import { ReportError, looksLikePdf } from "@/lib/report-branding";
import { readForm, readUpload } from "@/lib/admin-input";

const MAX_REPORT_BYTES = 15 * 1024 * 1024;

async function context(orderId: string, memberIdText: string) {
  const memberId = Number(memberIdText);
  if (!/^BK-[A-Z0-9]{1,20}$/.test(orderId) || !Number.isInteger(memberId)) return null;
  const [booking, member] = await Promise.all([getBooking(orderId), getMember(memberId)]);
  // The member must belong to this order.
  return booking && member && member.orderId === orderId ? { booking, member, memberId } : null;
}

// Admin-only. One request can upload the member's report (PDF) and/or set its status:
//   file    the lab's report PDF (optional). A member has one report at a time: this replaces it.
//           If they have a registered prescribing doctor, a copy with their clinic's header
//           (clinic name + logo, doctor's name + qualifications) is made and is what is shared.
//   status  "none" | "partial" | "full" (optional). Changing it WhatsApps the member and their doctor,
//           with the report link when a file is stored; setting the status it already has sends nothing.
//   rebrand "1" rebuilds the branded copy from the stored original (after a logo or doctor change).
// Only a status change sends a message. Uploading, replacing or rebuilding a file never does: a request
// that carries a file (or rebrand) ignores `status`, so the file is saved quietly.
export async function POST(req: NextRequest, { params }: { params: { id: string; mid: string } }) {
  const ctx = await context(params.id, params.mid).catch(() => null);
  if (!ctx) return NextResponse.json({ error: "That member no longer exists. Refresh the page." }, { status: 404 });
  const form = await readForm(req);
  if (!form) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const statusField = form.get("status");
  let status = typeof statusField === "string" && statusField ? statusField : null;
  if (status !== null && !isReportStatus(status)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const hasFile = form.get("file") instanceof File && (form.get("file") as File).size > 0;
  if (hasFile || form.get("rebrand") === "1") status = null;

  let branded: boolean | undefined;
  let clinicName: string | undefined;
  let refDoctor: string | undefined;
  try {
    if (hasFile) {
      const upload = await readUpload(form, "file", MAX_REPORT_BYTES, ["application/pdf"]);
      if ("error" in upload) return NextResponse.json({ error: upload.error }, { status: 400 });
      if (!looksLikePdf(upload.buffer)) return NextResponse.json({ error: "That file is not a PDF." }, { status: 400 });
      const saved = await saveMemberReport(ctx.memberId, upload.buffer, upload.name);
      branded = saved.branded;
      clinicName = saved.clinicName;
      refDoctor = saved.refDoctor;
      await logEvent(ctx.booking.id, "report-file", `Report file saved (${upload.name})${saved.clinicName ? ` with ${saved.clinicName}'s header` : " without a clinic header"}${saved.refDoctor ? `; REF. DOCTOR set to ${saved.refDoctor}` : ""}`, ctx.member.name);
    } else if (form.get("rebrand") === "1") {
      const saved = await rebrandMemberReport(ctx.memberId);
      branded = saved.branded;
      clinicName = saved.clinicName;
      refDoctor = saved.refDoctor;
      await logEvent(ctx.booking.id, "report-file", `Report header rebuilt${saved.clinicName ? ` with ${saved.clinicName}'s details` : ""}${saved.refDoctor ? `; REF. DOCTOR set to ${saved.refDoctor}` : ""}`, ctx.member.name);
    }
  } catch (err) {
    if (err instanceof ReportError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error(`Admin: report for member ${ctx.memberId} could not be saved:`, err);
    return NextResponse.json({ error: "Couldn't save the report. Please try again." }, { status: 502 });
  }

  // Status last, so a message that carries the link goes out after the file is stored.
  let notifications: Awaited<ReturnType<typeof notifyReport>> = [];
  let changed = false;
  if (status !== null) {
    try {
      const changedAt = await setReportStatus(ctx.memberId, status);
      changed = !!changedAt;
      if (changedAt) {
        await logEvent(ctx.booking.id, "report-status", `Report status changed: ${REPORT_LABELS[ctx.member.reportStatus]} → ${REPORT_LABELS[status as keyof typeof REPORT_LABELS]}`, ctx.member.name);
        const fresh = await getMember(ctx.memberId);
        if (fresh) notifications = await notifyReport(ctx.booking, fresh, status, fresh.hasReport, fresh.reportToken, changedAt);
      }
    } catch (err) {
      console.error(`Admin: report status for member ${ctx.memberId} could not be changed:`, err);
      return NextResponse.json({ error: "The file was saved but the status could not be changed. Please try again." }, { status: 502 });
    }
  }
  return NextResponse.json({ ok: true, uploaded: hasFile, branded, clinicName, refDoctor, changed, notifications });
}

// Admin-only: remove the member's report (back to "No report yet"; no message is sent).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; mid: string } }) {
  const ctx = await context(params.id, params.mid).catch(() => null);
  if (!ctx) return NextResponse.json({ error: "That member no longer exists. Refresh the page." }, { status: 404 });
  try {
    await removeMemberReport(ctx.memberId);
    await logEvent(ctx.booking.id, "report-file", "Report removed (status back to No report yet)", ctx.member.name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Admin: report for member ${ctx.memberId} could not be removed:`, err);
    return NextResponse.json({ error: "Couldn't remove the report. Please try again." }, { status: 502 });
  }
}
