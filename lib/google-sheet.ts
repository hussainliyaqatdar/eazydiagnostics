// Records registered doctors in a Google Sheet, through a small Google Apps Script
// attached to that sheet (scripts/google-apps-script/doctor-signups.gs), which
// the site calls over HTTPS. Setup is in that file's header. The same script
// hands the rows back, so the admin page and the checkout "Prescribed by" list
// read from here too.
//
//   DOCTOR_SHEET_WEBHOOK_URL     the Apps Script web-app URL ("Deploy > Web app")
//   DOCTOR_SHEET_WEBHOOK_SECRET  a shared secret, also saved in the script's properties
import type { DoctorSignup } from "./doctor-onboarding";
import { deleteDoctorSignup, readDoctorSignups, saveDoctorSignup } from "./store";

// Column order in the sheet. The script writes these as the header row when the
// sheet is empty, so the columns are defined here and only here.
export const DOCTOR_SHEET_COLUMNS = [
  "Doctor ID",
  "Submitted at (IST)",
  "Full name",
  "Clinic name",
  "Mobile",
  "Email",
  "Specialty",
  "Degree",
] as const;

export type DoctorRow = Record<(typeof DOCTOR_SHEET_COLUMNS)[number], string>;

export function istTimestamp(date = new Date()): string {
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

export function doctorSheetValues(id: string, signup: DoctorSignup, submittedAt: string): string[] {
  return [id, submittedAt, signup.fullName, signup.clinicName, signup.mobile, signup.email, signup.specialty, signup.degree];
}

function webhook() {
  const url = process.env.DOCTOR_SHEET_WEBHOOK_URL;
  const secret = process.env.DOCTOR_SHEET_WEBHOOK_SECRET;
  return url && secret ? { url, secret } : null;
}

// The server's disk is wiped on every restart in production, so never let a
// doctor quietly land there - fail loudly until the sheet is configured.
function requireSheetInProduction() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Doctor sheet is not configured (set DOCTOR_SHEET_WEBHOOK_URL and DOCTOR_SHEET_WEBHOOK_SECRET).");
  }
}

// Apps Script answers a POST with a redirect to the page holding its reply, so
// redirects must be followed.
async function callScript<T extends { ok?: boolean; error?: string }>(url: string, payload: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const reply = (await res.json().catch(() => null)) as T | null;
  if (!res.ok || !reply?.ok) throw new Error(`Google Sheet request failed: ${reply?.error ?? `HTTP ${res.status}`}`);
  return reply;
}

// Saves the registration. Resolves with where it went; rejects if it could not
// be saved, so the person is told to try again instead of being sent a
// confirmation for details we do not have.
export async function recordDoctorSignup(id: string, signup: DoctorSignup, submittedAt: string): Promise<"sheet" | "local"> {
  const values = doctorSheetValues(id, signup, submittedAt);
  const hook = webhook();

  if (!hook) {
    requireSheetInProduction();
    console.warn("[doctor sign-up] No Google Sheet configured - saving to .data/doctor-signups.json instead.");
    saveDoctorSignup(Object.fromEntries(DOCTOR_SHEET_COLUMNS.map((c, i) => [c, values[i]])));
    return "local";
  }

  await callScript(hook.url, { secret: hook.secret, columns: DOCTOR_SHEET_COLUMNS, values });
  return "sheet";
}

// Removes a doctor from the registry. Rejects if they could not be removed (or
// are not there), so the admin is never told a delete worked when it did not.
export async function deleteDoctorRow(id: string): Promise<void> {
  const hook = webhook();
  if (!hook) {
    requireSheetInProduction();
    if (!deleteDoctorSignup(id)) throw new Error("Doctor not found.");
    return;
  }
  await callScript(hook.url, { secret: hook.secret, action: "delete", id });
}

// Every registered doctor, in the order they were added. Rows without a Doctor
// ID (from before doctors had one) are skipped - they have no affiliate link.
export async function readDoctorRows(): Promise<DoctorRow[]> {
  const hook = webhook();
  let rows: Record<string, string>[];

  if (!hook) {
    requireSheetInProduction();
    rows = readDoctorSignups();
  } else {
    const reply = await callScript<{ ok: boolean; columns?: string[]; rows?: unknown[][] }>(hook.url, { secret: hook.secret, action: "list" });
    const header = reply.columns ?? [];
    rows = (reply.rows ?? []).map((r) => Object.fromEntries(header.map((h, i) => [h, String(r[i] ?? "")])));
  }

  return rows
    .filter((r) => r["Doctor ID"])
    .map((r) => Object.fromEntries(DOCTOR_SHEET_COLUMNS.map((c) => [c, r[c] ?? ""])) as DoctorRow);
}
