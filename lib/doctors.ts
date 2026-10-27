// SERVER-ONLY. The registry of doctors registered through /for-doctors: the
// source for the admin page and for the checkout "Prescribed by" list. Backed by
// the Google Sheet in production (lib/google-sheet.ts).
import { readDoctorRows } from "./google-sheet";

export type Doctor = {
  id: string;
  registeredAt: string;
  name: string;
  clinic: string;
  mobile: string;
  email: string;
  specialty: string;
  degree: string;
};

// Checkout reads the list on every page load, and a sheet round trip takes a
// second or two - so keep it briefly. A new registration clears it.
const CACHE_MS = 60_000;
let cache: { at: number; doctors: Doctor[] } | null = null;

export function clearDoctorCache() {
  cache = null;
}

// `fresh` skips the cache - the admin page always shows the latest.
export async function listDoctors({ fresh = false } = {}): Promise<Doctor[]> {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.doctors;
  const rows = await readDoctorRows();
  const doctors = rows.map((r) => ({
    id: r["Doctor ID"],
    registeredAt: r["Submitted at (IST)"],
    name: r["Full name"],
    clinic: r["Clinic name"],
    mobile: r["Mobile"],
    email: r["Email"],
    specialty: r["Specialty"],
    degree: r["Degree"],
  }));
  cache = { at: Date.now(), doctors };
  return doctors;
}
