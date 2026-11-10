// SERVER-ONLY. Clinics: the account a doctor (or several, in a multi-speciality clinic)
// belongs to. A clinic has a name, an address, a logo, and a setting for who collects
// the patient's payment. Its doctors are in lib/doctors.ts.
import { getDb } from "./db";

export type PaymentCollector = "clinic" | "eazy";
export const PAYMENT_COLLECTORS: PaymentCollector[] = ["clinic", "eazy"];
export const DEFAULT_PAYMENT_COLLECTOR: PaymentCollector = "clinic";

export type Clinic = {
  id: string;
  name: string;
  address: string;
  paymentCollector: PaymentCollector;
  // Whether this clinic's referral links show the clinic-branded version of the site.
  branded: boolean;
  hasLogo: boolean;
  // Changes when the logo does, so a cached copy is not shown after an update.
  logoVersion: number;
  doctorCount: number;
  createdAt: string;
};

type ClinicRow = {
  id: string;
  name: string;
  address: string;
  payment_collector: string;
  branded: boolean;
  has_logo: boolean;
  logo_updated_at: Date | string | null;
  doctor_count: number | string;
  created_at: Date | string;
};

const SELECT = `
  SELECT c.id, c.name, c.address, c.payment_collector, c.branded, c.logo_updated_at, c.created_at,
         (c.logo IS NOT NULL) AS has_logo,
         (SELECT count(*) FROM doctors d WHERE d.clinic_id = c.id) AS doctor_count
  FROM clinics c`;

function toClinic(r: ClinicRow): Clinic {
  return {
    id: r.id,
    name: r.name,
    address: r.address,
    paymentCollector: r.payment_collector === "eazy" ? "eazy" : "clinic",
    branded: r.branded,
    hasLogo: r.has_logo,
    logoVersion: r.logo_updated_at ? new Date(r.logo_updated_at).getTime() : 0,
    doctorCount: Number(r.doctor_count),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export const CLINIC_LIMITS = { name: { min: 2, max: 100 }, address: { max: 300 } } as const;

export function cleanClinicText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export async function listClinics(): Promise<Clinic[]> {
  const db = await getDb();
  return (await db.query<ClinicRow>(`${SELECT} ORDER BY lower(c.name), c.id`)).map(toClinic);
}

export async function getClinic(id: string): Promise<Clinic | undefined> {
  const db = await getDb();
  const [r] = await db.query<ClinicRow>(`${SELECT} WHERE c.id = $1`, [id]);
  return r ? toClinic(r) : undefined;
}

// Just id and name: what the public /for-doctors form needs to offer "choose your clinic".
export async function listClinicChoices(): Promise<{ id: string; name: string }[]> {
  const db = await getDb();
  return db.query<{ id: string; name: string }>("SELECT id, name FROM clinics ORDER BY lower(name), id");
}

export function newClinicId(): string {
  return `CL-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

// Created by an admin from /admin/doctors (branded by default), or implicitly when a doctor
// registers a clinic that is not on the list (not branded until an admin adds the logo).
export async function createClinic(input: { name: string; address?: string; branded?: boolean }, id = newClinicId()): Promise<Clinic> {
  const db = await getDb();
  await db.query("INSERT INTO clinics (id, name, address, branded) VALUES ($1, $2, $3, $4)", [id, input.name, input.address ?? "", input.branded ?? true]);
  return (await getClinic(id))!;
}

export type ClinicUpdate = { name?: string; address?: string; paymentCollector?: PaymentCollector; branded?: boolean };

export async function updateClinic(id: string, u: ClinicUpdate): Promise<boolean> {
  const db = await getDb();
  const sets: string[] = [];
  const params: unknown[] = [id];
  const add = (col: string, value: unknown) => {
    params.push(value);
    sets.push(`${col} = $${params.length}`);
  };
  if (u.name !== undefined) add("name", u.name);
  if (u.address !== undefined) add("address", u.address);
  if (u.paymentCollector !== undefined) add("payment_collector", u.paymentCollector);
  if (u.branded !== undefined) add("branded", u.branded);
  if (sets.length === 0) return !!(await getClinic(id));
  const done = await db.query<{ id: string }>(`UPDATE clinics SET ${sets.join(", ")} WHERE id = $1 RETURNING id`, params);
  // Keep the clinic name each doctor row carries in step (older code reads it).
  if (u.name !== undefined) await db.query("UPDATE doctors SET clinic = $2 WHERE clinic_id = $1", [id, u.name]);
  return done.length > 0;
}

// A clinic with doctors cannot be deleted (move or delete the doctors first).
export async function deleteClinic(id: string): Promise<"deleted" | "has_doctors" | "missing"> {
  const db = await getDb();
  const clinic = await getClinic(id);
  if (!clinic) return "missing";
  if (clinic.doctorCount > 0) return "has_doctors";
  await db.query("DELETE FROM clinics WHERE id = $1", [id]);
  return "deleted";
}

// Who collects the payment for an order prescribed by this doctor. null when the doctor (or
// their clinic) is not found, so unregistered doctors change nothing.
export async function paymentCollectorForDoctor(doctorId: string | undefined): Promise<PaymentCollector | null> {
  if (!doctorId) return null;
  const db = await getDb();
  const [r] = await db.query<{ payment_collector: string }>(
    "SELECT c.payment_collector FROM doctors d JOIN clinics c ON c.id = d.clinic_id WHERE d.id = $1",
    [doctorId]
  );
  return r ? (r.payment_collector === "eazy" ? "eazy" : "clinic") : null;
}

// ---- logo --------------------------------------------------------------------
// The logo is normalised to a PNG (at most 480px) when it is uploaded, so the site header
// and the report PDF header can both use the same file.
export async function normalizeLogo(file: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(file).rotate().resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true }).png().toBuffer();
}

export async function setClinicLogo(id: string, png: Buffer): Promise<boolean> {
  const db = await getDb();
  const done = await db.query<{ id: string }>("UPDATE clinics SET logo = $2, logo_type = 'image/png', logo_updated_at = now() WHERE id = $1 RETURNING id", [id, png]);
  return done.length > 0;
}

export async function clearClinicLogo(id: string): Promise<void> {
  const db = await getDb();
  await db.query("UPDATE clinics SET logo = NULL, logo_type = NULL, logo_updated_at = now() WHERE id = $1", [id]);
}

export async function getClinicLogo(id: string): Promise<Buffer | null> {
  const db = await getDb();
  const [r] = await db.query<{ logo: Buffer | Uint8Array | null }>("SELECT logo FROM clinics WHERE id = $1", [id]);
  return r?.logo ? Buffer.from(r.logo) : null;
}

export function clinicLogoUrl(c: Pick<Clinic, "id" | "hasLogo" | "logoVersion">): string | null {
  return c.hasLogo ? `/api/clinics/${c.id}/logo?v=${c.logoVersion}` : null;
}
