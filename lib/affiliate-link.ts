// A doctor's affiliate booking link: the home page with their id attached. The
// site remembers the id (components/ReferralCapture.tsx) and pre-fills "Referred
// by" at checkout, so this is the link to share - or turn into a QR code for
// patients at the doctor's clinic.
import { REF_PARAM } from "./referral-storage";
import { SITE_URL } from "./site-config";

export function affiliateLink(doctorId: string): string {
  return `${SITE_URL.replace(/\/$/, "")}/?${REF_PARAM}=${encodeURIComponent(doctorId)}`;
}
