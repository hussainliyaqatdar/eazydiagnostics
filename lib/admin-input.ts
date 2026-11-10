// SERVER-ONLY. Reading and checking what the admin forms send.
import { NextRequest } from "next/server";
import { normalizeMobile, LIMITS } from "./doctor-onboarding";
import type { DoctorUpdate } from "./doctors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export type DoctorFields = { name: string; degree: string; specialty: string; mobile: string; email: string };

// The doctor's contact and qualifications, as the admin form sends them. `errors` is a
// message per field; `value` is the cleaned, normalised data when there are none.
export function parseDoctorFields(raw: Record<string, unknown>): { ok: true; value: DoctorFields } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const name = clean(raw.name, LIMITS.fullName.max);
  if (name.replace(/^dr\.?\s*/i, "").length < LIMITS.fullName.min) errors.name = "Enter the doctor's name.";
  const degree = clean(raw.degree, LIMITS.degree.max);
  if (degree.length < LIMITS.degree.min) errors.degree = "Enter the qualifications, e.g. MBBS, MD.";
  const specialty = clean(raw.specialty, LIMITS.specialty.max);
  if (specialty.length < LIMITS.specialty.min) errors.specialty = "Enter the specialty.";
  const mobile = normalizeMobile(clean(raw.mobile, 30));
  if (!mobile) errors.mobile = "Enter a valid 10-digit WhatsApp number.";
  const email = clean(raw.email, LIMITS.email.max).toLowerCase();
  if (email && !EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, degree, specialty, mobile: mobile!, email } };
}

// A whole-number percentage 0-100, or undefined when absent.
export function percent(value: unknown): number | undefined | "bad" {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 100 ? n : "bad";
}

// Only the fields the admin sent, checked, as a DoctorUpdate.
export function parseDoctorUpdate(raw: Record<string, unknown>): { ok: true; value: DoctorUpdate } | { ok: false; error: string } {
  const u: DoctorUpdate = {};
  if (raw.name !== undefined) {
    const name = clean(raw.name, LIMITS.fullName.max);
    if (name.replace(/^dr\.?\s*/i, "").length < LIMITS.fullName.min) return { ok: false, error: "Enter the doctor's name." };
    u.name = name;
  }
  if (raw.degree !== undefined) {
    const degree = clean(raw.degree, LIMITS.degree.max);
    if (degree.length < LIMITS.degree.min) return { ok: false, error: "Enter the qualifications, e.g. MBBS, MD." };
    u.degree = degree;
  }
  if (raw.specialty !== undefined) {
    const specialty = clean(raw.specialty, LIMITS.specialty.max);
    if (specialty.length < LIMITS.specialty.min) return { ok: false, error: "Enter the specialty." };
    u.specialty = specialty;
  }
  if (raw.mobile !== undefined) {
    const mobile = normalizeMobile(clean(raw.mobile, 30));
    if (!mobile) return { ok: false, error: "Enter a valid 10-digit WhatsApp number." };
    u.mobile = mobile;
  }
  if (raw.email !== undefined) {
    const email = clean(raw.email, LIMITS.email.max).toLowerCase();
    if (email && !EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
    u.email = email;
  }
  if (typeof raw.clinicId === "string" && raw.clinicId) u.clinicId = raw.clinicId;
  if (typeof raw.approved === "boolean") u.approved = raw.approved;
  const d = (raw.discounts && typeof raw.discounts === "object" ? raw.discounts : {}) as Record<string, unknown>;
  const routine = percent(d.routine), special = percent(d.special), pkg = percent(d.package);
  if (routine === "bad" || special === "bad" || pkg === "bad") return { ok: false, error: "Discounts must be whole numbers from 0 to 100." };
  if (routine !== undefined || special !== undefined || pkg !== undefined) u.discounts = { routine, special, package: pkg };
  return { ok: true, value: u };
}

export type Upload = { buffer: Buffer; name: string; type: string };

// The file in a multipart form field, or an error message when it is missing, too big or the
// wrong kind. `types` are MIME types; a file whose type the browser did not set is judged by name.
export async function readUpload(form: FormData, field: string, maxBytes: number, types: string[]): Promise<Upload | { error: string }> {
  const file = form.get(field);
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  if (file.size > maxBytes) return { error: `That file is too large (the limit is ${Math.round(maxBytes / 1024 / 1024)} MB).` };
  const byName = /\.pdf$/i.test(file.name) ? "application/pdf" : /\.png$/i.test(file.name) ? "image/png" : /\.jpe?g$/i.test(file.name) ? "image/jpeg" : /\.webp$/i.test(file.name) ? "image/webp" : "";
  const type = file.type || byName;
  if (!types.includes(type)) return { error: `That file type isn't allowed. Use ${types.map((t) => t.split("/")[1].toUpperCase()).join(", ")}.` };
  return { buffer: Buffer.from(await file.arrayBuffer()), name: file.name.slice(0, 120), type };
}

export async function readForm(req: NextRequest): Promise<FormData | null> {
  try {
    return await req.formData();
  } catch {
    return null;
  }
}

export function fileResponse(file: Buffer, type: string, filename: string, cache = "private, max-age=0, must-revalidate"): Response {
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": type,
      "Content-Length": String(file.length),
      "Content-Disposition": `inline; filename="${filename.replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": cache,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
