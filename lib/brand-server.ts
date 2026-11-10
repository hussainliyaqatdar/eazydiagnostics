// SERVER-ONLY. Which clinic (if any) the current visitor came from, and how that clinic wants to be
// shown. The clinic's name, logo and "who collects payment" setting come from the database (set on
// /admin/clinics/<id>); the demo entry in lib/brand.ts is the fallback for a doctor not in it.
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { ADMIN_HEADER, REF_COOKIE, REF_HEADER, brandForRef, validRef, type ClinicBrand } from "./brand";
import { clinicLogoUrl, getClinic } from "./clinics";
import { getDoctor } from "./doctors";

// The doctor id from the referral link the visitor opened. The middleware puts it
// on the request (so the very first page already knows) and in a cookie (so later
// pages do).
export function getRef(): string | null {
  if (headers().get(ADMIN_HEADER)) return null;
  return validRef(headers().get(REF_HEADER)) ?? validRef(cookies().get(REF_COOKIE)?.value);
}

export type Referral = {
  // Show the clinic-branded site (the clinic has it switched on, or is the built-in demo).
  brand: ClinicBrand | null;
  // The patient pays at the clinic's front desk (the clinic collects payment, which is the default).
  payAtClinic: boolean;
};

const NONE: Referral = { brand: null, payAtClinic: false };
const TTL_MS = 30_000;
const memo = new Map<string, { at: number; value: Referral }>();

async function lookup(ref: string): Promise<Referral> {
  const hit = memo.get(ref);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  let value: Referral;
  try {
    const doctor = await getDoctor(ref);
    const clinic = doctor ? await getClinic(doctor.clinicId) : undefined;
    if (doctor && clinic) {
      value = {
        // Every registered clinic gets its own branded site: its logo if one was uploaded, else just its name.
        brand: { doctorId: ref, name: clinic.name, logo: clinicLogoUrl(clinic), payAtClinic: clinic.paymentCollector === "clinic" },
        payAtClinic: clinic.paymentCollector === "clinic",
      };
    } else {
      // Not a registered doctor: only the built-in demo clinic still has a branded version.
      const demo = brandForRef(ref);
      value = demo ? { brand: demo, payAtClinic: true } : NONE;
    }
  } catch (err) {
    // The database being unreachable must not break the page: fall back to the demo entry.
    console.error("Clinic brand could not be loaded:", err);
    const demo = brandForRef(ref);
    return demo ? { brand: demo, payAtClinic: true } : NONE;
  }
  memo.set(ref, { at: Date.now(), value });
  return value;
}

// Once per request, however many components ask.
export const getReferral = cache(async (): Promise<Referral> => {
  const ref = getRef();
  return ref ? lookup(ref) : NONE;
});

export async function getBrand(): Promise<ClinicBrand | null> {
  return (await getReferral()).brand;
}

export async function getPayAtClinic(): Promise<boolean> {
  return (await getReferral()).payAtClinic;
}
