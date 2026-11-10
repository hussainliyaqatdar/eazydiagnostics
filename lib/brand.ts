// Clinic (doctor) branding. A visitor who arrives through a doctor's referral link
// (/?ref=DR-XXXX) sees the site under that clinic's own name and logo, and the
// lab partner's name and ours are kept out of the patient flow (ours appears only
// as "Powered by" in the footer).
//
// This file is pure (no server or browser APIs) so the same helpers run in server
// pages, client components and the middleware. Reading the cookie on the server is
// in lib/brand-server.ts.
import { BUSINESS_NAME } from "./site-config";
import { DOCTOR_ID_RE } from "./referral-storage";

export type ClinicBrand = {
  // The doctor's affiliate id: the key a referral link carries.
  doctorId: string;
  name: string;
  // Path under /public, or a URL; null for a clinic with no logo uploaded yet (the name alone is shown).
  logo: string | null;
  // False when Eazy Diagnostics (not the clinic) collects the payment: the site then keeps saying the
  // patient pays after the sample is collected. Missing means the clinic collects (the default).
  payAtClinic?: boolean;
};

// Clinics that have their own branded version of the site. A demo for now: add
// an entry per clinic (later this moves into the doctors table with a logo upload).
export const CLINIC_BRANDS: Record<string, ClinicBrand> = {
  "DR-MVQS1ZBH": { doctorId: "DR-MVQS1ZBH", name: "Medicare Clinic", logo: "/brands/medicare-clinic.jpg" },
};

// The visitor's doctor id, remembered for the visit: set by the middleware when a
// referral link is opened.
export const REF_COOKIE = "diag-ref";
export const REF_HEADER = "x-diag-ref";
// Set by the middleware on /admin pages, which always show our own branding.
export const ADMIN_HEADER = "x-diag-admin";
// /?ref=clear drops the remembered doctor (handy when demoing both versions).
export const REF_CLEAR = "CLEAR";

export function validRef(ref: string | null | undefined): string | null {
  const r = ref?.trim().toUpperCase();
  return r && DOCTOR_ID_RE.test(r) ? r : null;
}

export function brandForRef(ref: string | null | undefined): ClinicBrand | null {
  const r = validRef(ref);
  return r ? CLINIC_BRANDS[r] ?? null : null;
}

// What orders placed through a doctor's referral link say about paying: the
// patient settles with the clinic, not the phlebotomist.
// The home link in a clinic's version carries the referral, because the bare home
// address ("/") always means the public site (see middleware.ts).
export function homeHref(brand: ClinicBrand | null): string {
  return brand ? `/?ref=${brand.doctorId}` : "/";
}

export const PAY_AT_CLINIC = "Pay now at the clinic front desk";

// The four trust cards on a clinic's home page: the same 1x4 / 2x2 grid as the main
// site, with the clinic version's own copy and picture. The one new picture
// (public/brands/clinic-trust-story.webp) is the medic card, the scan and reports
// cards have their own (clinic-trust-scan.webp, clinic-trust-reports-senior.webp), and the
// lab card keeps the main site's picture. None of these files are used by the main site.
export type ClinicTrustMarker = {
  label: string;
  alt: string;
  image: string;
  // Zoom the picture into one part of it: CSS background-size / background-position.
  crop?: { size: string; position: string };
};

export const CLINIC_TRUST_MARKERS: ClinicTrustMarker[] = [
  {
    label: "Scan at clinic",
    alt: "A patient scanning a QR code on the clinic's front desk to book a home sample collection.",
    image: "/brands/clinic-trust-scan.webp",
  },
  {
    label: "On-time trained medic at doorstep",
    alt: "A trained medic collecting a blood sample from a patient at home, with a clock showing the visit is on time.",
    image: "/brands/clinic-trust-story.webp",
  },
  { label: "NABL accredited labs", alt: "NABL accreditation mark alongside the Fortis Hospitals logo.", image: "/images/trust-nabl-fortis.webp" },
  {
    label: "Reports in 6-12 hours*",
    alt: "A patient viewing his lab report on WhatsApp.",
    image: "/brands/clinic-trust-reports-senior.webp",
  },
];

const PARTNER_LAB = /Agilus|\bSRL\b/i;

// True for copy that is about the lab partner's brand (e.g. a FAQ titled "How do I
// find SRL Diagnostics near me?"): in a clinic's version those entries are dropped.
export function mentionsPartnerBrand(text: string): boolean {
  return PARTNER_LAB.test(text);
}

// Rewrites our standard copy for a clinic's version: the clinic's name in place of
// ours, no lab-partner brand, and "pay at the clinic front desk" in place of "pay
// after collection". Rules run in order, most specific first.
export function brandText(text: string, brand: ClinicBrand | null): string {
  if (!brand) return text;
  const clinicPays = brand.payAtClinic !== false;
  return text
    .replace(/NABL-accredited labs (?:run by|of) (?:Agilus \(SRL\) Diagnostics|Agilus Diagnostics)(?:, our authorised lab partner)?/gi, "NABL-accredited partner labs")
    .replace(/(?:Agilus \(SRL\) Diagnostics|Agilus \(formerly SRL\) Diagnostics) (?:NABL-accredited )?labs/gi, "NABL-accredited partner labs")
    .replace(/Agilus Diagnostics \(earlier known as SRL Diagnostics\)|Agilus \(formerly SRL\) Diagnostics|Agilus \(SRL\) Diagnostics|Agilus Diagnostics|SRL Diagnostics|Agilus|\bSRL\b/gi, "our partner lab")
    .replace(/\bour authorised lab partner\b/gi, "our partner lab")
    .replace(new RegExp(BUSINESS_NAME, "g"), brand.name)
    .replace(/\bEazy\b/g, brand.name)
    .replace(/pay(?:s)? only after (?:the|your) sample (?:is|has been) collected/gi, (m) => (clinicPays ? "pay now at the clinic front desk" : m))
    .replace(/\byou pay after (?:the|your) sample is collected/gi, (m) => (clinicPays ? "you pay now at the clinic front desk" : m))
    .replace(/\bPay after collection\b/g, (m) => (clinicPays ? PAY_AT_CLINIC : m))
    .replace(/our partner lab (?:our|the) partner lab/gi, "our partner lab");
}
