// SERVER-ONLY. Which clinic (if any) the current visitor came from.
import { cookies, headers } from "next/headers";
import { REF_COOKIE, REF_HEADER, brandForRef, validRef, type ClinicBrand } from "./brand";

// The doctor id from the referral link the visitor opened. The middleware puts it
// on the request (so the very first page already knows) and in a cookie (so later
// pages do).
export function getRef(): string | null {
  return validRef(headers().get(REF_HEADER)) ?? validRef(cookies().get(REF_COOKIE)?.value);
}

export function getBrand(): ClinicBrand | null {
  return brandForRef(getRef());
}
