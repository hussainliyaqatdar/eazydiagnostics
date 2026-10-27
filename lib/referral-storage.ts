// Shared by the browser (capturing an affiliate link) and the server (building
// one, lib/affiliate-link.ts). Kept free of server config so the client bundle
// stays small.

// Browser storage key for the doctor id captured from an affiliate link.
export const REFERRAL_STORAGE_KEY = "diagnostics-referral-v1";
export const REF_PARAM = "ref";
// Doctor ids look like DR-MH3K9Q2X; anything else in ?ref= is ignored.
export const DOCTOR_ID_RE = /^DR-[A-Z0-9]{4,16}$/;
