// Affiliate doctors - every doctor registered through /for-doctors. This feeds
// the checkout "Prescribed by" list and validates the doctor id on a booking.
// The id is also what a doctor's affiliate link carries (see lib/affiliate-link.ts).
import { listDoctors } from "./doctors";

export type AffiliateDoctor = {
  id: string;
  name: string;
  clinic: string;
};

export async function getAffiliateDoctors(): Promise<AffiliateDoctor[]> {
  return (await listDoctors()).map((d) => ({ id: d.id, name: d.name, clinic: d.clinic }));
}

export async function findAffiliateDoctor(id: string | undefined): Promise<AffiliateDoctor | undefined> {
  if (!id) return undefined;
  return (await getAffiliateDoctors()).find((d) => d.id === id);
}

// Longest free-text referral name we keep.
export const MAX_REFERRAL_NAME = 80;

// Browser input is untrusted: drop control characters, collapse whitespace and
// cap the length. Returns "" when nothing usable is left.
export function cleanReferralName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_REFERRAL_NAME);
}
