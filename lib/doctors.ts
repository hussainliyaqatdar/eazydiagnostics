// SERVER-ONLY. The registry of doctors registered through /for-doctors, in the
// database (lib/db.ts). It feeds the admin page, the checkout "Prescribed by"
// list and affiliate links, and is where a doctor's own branded site will hang
// off later (each has a unique `slug`).
import { getDb } from "./db";
import type { Doctor } from "./types";
import type { DoctorSignup } from "./doctor-onboarding";

export type { Doctor };

export function istTimestamp(date = new Date()): string {
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

type DoctorRow = {
  id: string;
  slug: string;
  name: string;
  clinic: string;
  mobile: string;
  email: string;
  specialty: string;
  degree: string;
  created_at: Date | string;
};

function toDoctor(r: DoctorRow): Doctor {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    clinic: r.clinic,
    mobile: r.mobile,
    email: r.email,
    specialty: r.specialty,
    degree: r.degree,
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

export async function registerDoctor(id: string, signup: DoctorSignup): Promise<void> {
  const db = await getDb();
  const base = slugify(signup.clinicName);
  // The slug must be unique: two clinics can share a name, so add -2, -3, ... A
  // simultaneous registration can still collide, so retry on a unique violation.
  for (let attempt = 0; attempt < 5; attempt++) {
    const taken = await db.query<{ slug: string }>("SELECT slug FROM doctors WHERE slug = $1 OR slug LIKE $2", [base, `${base}-%`]);
    const used = new Set(taken.map((t) => t.slug));
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    try {
      await db.query(
        `INSERT INTO doctors (id, slug, name, clinic, mobile, email, specialty, degree)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, slug, signup.fullName, signup.clinicName, signup.mobile, signup.email, signup.specialty, signup.degree]
      );
      return;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "23505" || attempt === 4) throw err;
    }
  }
}

// In the order they were registered.
export async function listDoctors(): Promise<Doctor[]> {
  const db = await getDb();
  return (await db.query<DoctorRow>("SELECT * FROM doctors ORDER BY created_at, id")).map(toDoctor);
}

// Throws when the doctor is not there, so an admin is never told a delete worked
// when it did not. Their past orders keep the doctor's copied name and clinic.
export async function removeDoctor(id: string): Promise<void> {
  const db = await getDb();
  const gone = await db.query<{ id: string }>("DELETE FROM doctors WHERE id = $1 RETURNING id", [id]);
  if (gone.length === 0) throw new Error("Doctor not found.");
}
