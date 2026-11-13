// SERVER-ONLY. What the order admin needs beyond saving an order (lib/orders.ts): the members
// of a visit, the payment status, and each member's report (status, file, and the clinic-branded
// copy). Status changes are single UPDATEs that only match when the value actually changes, so
// a double click, or two admins at once, changes - and notifies - once.
import { randomBytes } from "crypto";
import { getDb } from "./db";
import { getClinic, getClinicLogo } from "./clinics";
import { getDoctor } from "./doctors";
import { brandReport, ReportError, setRefDoctorOnly, type ReportHeader } from "./report-branding";
import { isReportStatus, type ReportStatus } from "./order-status";
import type { BookingLineItem } from "./types";

export type OrderMember = {
  id: number;
  orderId: string;
  position: number;
  name: string;
  age: string;
  gender: string;
  whatsapp: string | null;
  items: BookingLineItem[];
  // The registered doctor this member chose as "Prescribed by" (null: none, or only a typed name).
  doctorId: string | null;
  referralName: string | null;
  reportStatus: ReportStatus;
  reportFilename: string | null;
  hasReport: boolean;
  // Whether the stored report has the clinic's header on it.
  reportBranded: boolean;
  reportToken: string | null;
  reportUpdatedAt: string | null;
};

type MemberRow = {
  id: number | string;
  order_id: string;
  position: number;
  name: string;
  age: string;
  gender: string;
  whatsapp: string | null;
  items: BookingLineItem[];
  doctor_id: string | null;
  referral_name: string | null;
  report_status: string;
  report_filename: string | null;
  has_report: boolean;
  has_branded: boolean;
  report_token: string | null;
  report_updated_at: Date | string | null;
};

const MEMBER_SELECT = `
  SELECT id, order_id, position, name, age, gender, whatsapp, items, doctor_id, referral_name, report_status,
         report_filename, report_token, report_updated_at,
         (report_original IS NOT NULL) AS has_report, (report_branded IS NOT NULL) AS has_branded
  FROM order_members`;

function toMember(r: MemberRow): OrderMember {
  return {
    id: Number(r.id),
    orderId: r.order_id,
    position: r.position,
    name: r.name,
    age: r.age,
    gender: r.gender,
    whatsapp: r.whatsapp,
    items: r.items,
    doctorId: r.doctor_id,
    referralName: r.referral_name,
    reportStatus: isReportStatus(r.report_status) ? r.report_status : "none",
    reportFilename: r.report_filename,
    hasReport: r.has_report,
    reportBranded: r.has_branded,
    reportToken: r.report_token,
    reportUpdatedAt: r.report_updated_at ? new Date(r.report_updated_at).toISOString() : null,
  };
}

export async function listMembers(orderIds: string[]): Promise<Map<string, OrderMember[]>> {
  const byOrder = new Map<string, OrderMember[]>();
  if (orderIds.length === 0) return byOrder;
  const db = await getDb();
  const rows = await db.query<MemberRow>(`${MEMBER_SELECT} WHERE order_id = ANY($1) ORDER BY order_id, position`, [orderIds]);
  for (const r of rows) {
    const list = byOrder.get(r.order_id) ?? [];
    list.push(toMember(r));
    byOrder.set(r.order_id, list);
  }
  return byOrder;
}

export async function getMember(memberId: number): Promise<OrderMember | undefined> {
  const db = await getDb();
  const [r] = await db.query<MemberRow>(`${MEMBER_SELECT} WHERE id = $1`, [memberId]);
  return r ? toMember(r) : undefined;
}

// ---- report status ----------------------------------------------------------------
// Returns the time of the change, or null when the report was already at this status (so the
// same news is never sent twice).
export async function setReportStatus(memberId: number, status: ReportStatus): Promise<string | null> {
  const db = await getDb();
  const changed = await db.query<{ at: Date | string }>(
    "UPDATE order_members SET report_status = $2, report_status_updated_at = now() WHERE id = $1 AND report_status <> $2 RETURNING report_status_updated_at AS at",
    [memberId, status]
  );
  return changed.length > 0 ? new Date(changed[0].at).toISOString() : null;
}

// The header for a member's report: the prescribing doctor's clinic (name, address, logo) and
// the doctor's own name and qualifications. null when the member has no registered doctor (a typed-in
// doctor still sets the REF. DOCTOR field, but there is no clinic header).
export async function reportHeaderFor(member: OrderMember): Promise<ReportHeader | null> {
  if (!member.doctorId) return null;
  const doctor = await getDoctor(member.doctorId);
  if (!doctor) return null;
  const clinic = await getClinic(doctor.clinicId);
  if (!clinic) return null;
  return {
    clinicName: clinic.name,
    clinicAddress: clinic.address || undefined,
    logoPng: clinic.hasLogo ? await getClinicLogo(clinic.id) : null,
    doctorName: doctor.name,
    doctorQualifications: doctor.degree,
  };
}

// The doctor named in the member's "Prescribed by": the registered doctor's name, else the name typed at checkout.
// This is what goes in the report's REF. DOCTOR field. null when the order names nobody.
export async function prescribedByName(member: OrderMember): Promise<string | null> {
  if (member.doctorId) {
    const doctor = await getDoctor(member.doctorId).catch(() => undefined);
    if (doctor?.name) return doctor.name;
  }
  return member.referralName?.trim() || null;
}

export type SavedReport = { branded: boolean; clinicName?: string; refDoctor?: string };

// Stores the uploaded PDF as this member's one current report (replacing any earlier one) and,
// when they have a registered prescribing doctor, a copy with their clinic's header on it. The
// report status is changed separately (setReportStatus) so that notifying is a separate step.
export async function saveMemberReport(memberId: number, file: Buffer, filename: string): Promise<SavedReport> {
  const member = await getMember(memberId);
  if (!member) throw new ReportError("That member no longer exists.");

  const header = await reportHeaderFor(member);
  const refDoctor = await prescribedByName(member);
  // With a registered doctor: their clinic's header, and REF. DOCTOR set to them. With only a typed-in name:
  // REF. DOCTOR set to that name, nothing else changed. With nobody named: the lab's file as it is.
  let branded: Buffer | null = null;
  if (header) branded = Buffer.from(await brandReport(file, header, refDoctor));
  else if (refDoctor) {
    const edited = await setRefDoctorOnly(file, refDoctor);
    branded = edited ? Buffer.from(edited) : null;
  }

  const db = await getDb();
  const token = member.reportToken ?? randomBytes(16).toString("hex");
  await db.query(
    `UPDATE order_members
        SET report_original = $2, report_branded = $3, report_filename = $4, report_token = $5, report_updated_at = now()
      WHERE id = $1`,
    [memberId, file, branded, filename.slice(0, 120), token]
  );
  return { branded: !!branded, clinicName: header?.clinicName, refDoctor: refDoctor ?? undefined };
}

// Rebuilds the branded copy from the stored original, after the clinic's logo or the doctor's
// details changed.
export async function rebrandMemberReport(memberId: number): Promise<SavedReport> {
  const db = await getDb();
  const [row] = await db.query<{ report_original: Buffer | Uint8Array | null; report_filename: string | null }>(
    "SELECT report_original, report_filename FROM order_members WHERE id = $1",
    [memberId]
  );
  if (!row?.report_original) throw new ReportError("There is no report to rebuild yet.");
  return saveMemberReport(memberId, Buffer.from(row.report_original), row.report_filename || "report.pdf");
}

export async function removeMemberReport(memberId: number): Promise<void> {
  const db = await getDb();
  await db.query(
    "UPDATE order_members SET report_original = NULL, report_branded = NULL, report_filename = NULL, report_updated_at = NULL, report_status = 'none', report_status_updated_at = now() WHERE id = $1",
    [memberId]
  );
}

// The file to serve: the branded copy when there is one, else what the lab produced. By
// member id for the admin, by token for the patient / doctor link.
export type ReportFile = { file: Buffer; filename: string; branded: boolean };

async function readReport(where: string, param: unknown, preferOriginal: boolean): Promise<ReportFile | null> {
  const db = await getDb();
  const [r] = await db.query<{ report_original: Buffer | Uint8Array | null; report_branded: Buffer | Uint8Array | null; report_filename: string | null }>(
    `SELECT report_original, report_branded, report_filename FROM order_members WHERE ${where}`,
    [param]
  );
  const bytes = preferOriginal ? r?.report_original : r?.report_branded ?? r?.report_original;
  if (!r || !bytes) return null;
  return { file: Buffer.from(bytes), filename: r.report_filename || "report.pdf", branded: !preferOriginal && !!r.report_branded };
}

export function getReportById(memberId: number, original = false) {
  return readReport("id = $1", memberId, original);
}

export function getReportByToken(token: string) {
  return /^[0-9a-f]{32}$/.test(token) ? readReport("report_token = $1", token, false) : Promise.resolve(null);
}
