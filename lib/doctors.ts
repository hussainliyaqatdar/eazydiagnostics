// SERVER-ONLY. The registry of doctors, in the database (lib/db.ts). Each doctor
// belongs to a clinic (lib/clinics.ts); a clinic can have several. It feeds the admin
// pages, the checkout "Prescribed by" list and affiliate links, WhatsApp updates, and
// the clinic header on reports.
import { getDb } from "./db";
import { createClinic, getClinic, newClinicId } from "./clinics";
import type { Doctor } from "./types";
import type { DoctorSignup } from "./doctor-onboarding";

export type { Doctor };

export function istTimestamp(date = new Date()): string {
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

// Default B2B discounts off list price, in percent: routine tests, special tests, packages.
export const DEFAULT_DISCOUNTS = { routine: 35, special: 10, package: 15 } as const;

type DoctorRow = {
  id: string;
  slug: string;
  name: string;
  clinic_name: string;
  clinic_id: string;
  mobile: string;
  email: string;
  specialty: string;
  degree: string;
  approved: boolean;
  discount_routine: number;
  discount_special: number;
  discount_package: number;
  certificate_name: string | null;
  has_certificate: boolean;
  created_at: Date | string;
};

const SELECT = `
  SELECT d.id, d.slug, d.name, c.name AS clinic_name, d.clinic_id, d.mobile, d.email, d.specialty, d.degree, d.approved,
         d.discount_routine, d.discount_special, d.discount_package, d.certificate_name,
         (d.certificate IS NOT NULL) AS has_certificate, d.created_at
  FROM doctors d JOIN clinics c ON c.id = d.clinic_id`;

function toDoctor(r: DoctorRow): Doctor {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    clinic: r.clinic_name,
    clinicId: r.clinic_id,
    mobile: r.mobile,
    email: r.email,
    specialty: r.specialty,
    degree: r.degree,
    approved: r.approved,
    discounts: { routine: r.discount_routine, special: r.discount_special, package: r.discount_package },
    hasCertificate: r.has_certificate,
    ...(r.certificate_name ? { certificateName: r.certificate_name } : {}),
    registeredAt: istTimestamp(new Date(r.created_at)),
  };
}

// "Sri Family Clinic, JP Nagar" -> "sri-family-clinic-jp-nagar"
export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "clinic";
}

export type RegisterOptions = {
  // Join an existing clinic instead of creating one from the form's clinic name.
  clinicId?: string;
  // False for a doctor who picked an existing clinic on the public form: an admin approves them.
  approved?: boolean;
};

// Returns the clinic the doctor ended up in. Throws "clinic-not-found" when `clinicId` is gone.
export async function registerDoctor(id: string, signup: DoctorSignup, options: RegisterOptions = {}): Promise<{ clinicId: string; clinicName: string }> {
  const db = await getDb();

  let clinicId = options.clinicId;
  let clinicName = signup.clinicName;
  if (clinicId) {
    const clinic = await getClinic(clinicId);
    if (!clinic) throw new Error("clinic-not-found");
    clinicName = clinic.name;
  } else {
    // A clinic that is not on the list yet. It stays unbranded until an admin adds its logo.
    clinicId = newClinicId();
    await createClinic({ name: clinicName, branded: false }, clinicId);
  }

  const base = slugify(clinicName);
  // The slug must be unique: two clinics can share a name, so add -2, -3, ... A
  // simultaneous registration can still collide, so retry on a unique violation.
  for (let attempt = 0; attempt < 5; attempt++) {
    const taken = await db.query<{ slug: string }>("SELECT slug FROM doctors WHERE slug = $1 OR slug LIKE $2", [base, `${base}-%`]);
    const used = new Set(taken.map((t) => t.slug));
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    try {
      await db.query(
        `INSERT INTO doctors (id, slug, name, clinic, clinic_id, mobile, email, specialty, degree, approved)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, slug, signup.fullName, clinicName, clinicId, signup.mobile, signup.email, signup.specialty, signup.degree, options.approved ?? true]
      );
      return { clinicId, clinicName };
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "23505" || attempt === 4) throw err;
    }
  }
  return { clinicId, clinicName };
}

// In the order they were registered.
export async function listDoctors(): Promise<Doctor[]> {
  const db = await getDb();
  return (await db.query<DoctorRow>(`${SELECT} ORDER BY d.created_at, d.id`)).map(toDoctor);
}

export async function listClinicDoctors(clinicId: string): Promise<Doctor[]> {
  const db = await getDb();
  return (await db.query<DoctorRow>(`${SELECT} WHERE d.clinic_id = $1 ORDER BY d.created_at, d.id`, [clinicId])).map(toDoctor);
}

export async function getDoctor(id: string): Promise<Doctor | undefined> {
  const db = await getDb();
  const [r] = await db.query<DoctorRow>(`${SELECT} WHERE d.id = $1`, [id]);
  return r ? toDoctor(r) : undefined;
}

export type DoctorUpdate = {
  name?: string;
  degree?: string;
  specialty?: string;
  mobile?: string;
  email?: string;
  clinicId?: string;
  approved?: boolean;
  discounts?: { routine?: number; special?: number; package?: number };
};

export async function updateDoctor(id: string, u: DoctorUpdate): Promise<boolean> {
  const db = await getDb();
  const sets: string[] = [];
  const params: unknown[] = [id];
  const add = (col: string, value: unknown) => {
    params.push(value);
    sets.push(`${col} = $${params.length}`);
  };
  if (u.name !== undefined) add("name", u.name);
  if (u.degree !== undefined) add("degree", u.degree);
  if (u.specialty !== undefined) add("specialty", u.specialty);
  if (u.mobile !== undefined) add("mobile", u.mobile);
  if (u.email !== undefined) add("email", u.email);
  if (u.approved !== undefined) add("approved", u.approved);
  if (u.clinicId !== undefined) {
    const clinic = await getClinic(u.clinicId);
    if (!clinic) throw new Error("clinic-not-found");
    add("clinic_id", u.clinicId);
    add("clinic", clinic.name);
  }
  if (u.discounts?.routine !== undefined) add("discount_routine", u.discounts.routine);
  if (u.discounts?.special !== undefined) add("discount_special", u.discounts.special);
  if (u.discounts?.package !== undefined) add("discount_package", u.discounts.package);
  if (sets.length === 0) return !!(await getDoctor(id));
  const done = await db.query<{ id: string }>(`UPDATE doctors SET ${sets.join(", ")} WHERE id = $1 RETURNING id`, params);
  return done.length > 0;
}

// Admin adds another doctor to an existing clinic.
export async function addDoctorToClinic(
  id: string,
  clinicId: string,
  d: { name: string; degree: string; specialty: string; mobile: string; email: string }
): Promise<void> {
  await registerDoctor(id, { fullName: d.name, clinicName: "", mobile: d.mobile, email: d.email, specialty: d.specialty, degree: d.degree }, { clinicId, approved: true });
}

// ---- degree / KMC registration certificate (optional) ---------------------------
export async function setDoctorCertificate(id: string, file: Buffer, type: string, filename: string): Promise<boolean> {
  const db = await getDb();
  const done = await db.query<{ id: string }>(
    "UPDATE doctors SET certificate = $2, certificate_type = $3, certificate_name = $4 WHERE id = $1 RETURNING id",
    [id, file, type, filename.slice(0, 120)]
  );
  return done.length > 0;
}

export async function getDoctorCertificate(id: string): Promise<{ file: Buffer; type: string; name: string } | null> {
  const db = await getDb();
  const [r] = await db.query<{ certificate: Buffer | Uint8Array | null; certificate_type: string | null; certificate_name: string | null }>(
    "SELECT certificate, certificate_type, certificate_name FROM doctors WHERE id = $1",
    [id]
  );
  if (!r?.certificate) return null;
  return { file: Buffer.from(r.certificate), type: r.certificate_type || "application/octet-stream", name: r.certificate_name || "certificate" };
}

// Throws when the doctor is not there, so an admin is never told a delete worked
// when it did not. Their past orders keep the doctor's copied name and clinic.
export async function removeDoctor(id: string): Promise<void> {
  const db = await getDb();
  const gone = await db.query<{ id: string }>("DELETE FROM doctors WHERE id = $1 RETURNING id", [id]);
  if (gone.length === 0) throw new Error("Doctor not found.");
}

export function newDoctorId(): string {
  return `DR-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
}
