import type { Booking } from "./types";

// Home collection costs the same to run for a small order, so orders whose
// items come to less than this (before any coupon) pay a flat collection charge.
export const FREE_COLLECTION_MIN = 1000;
export const COLLECTION_CHARGE = 250;
// On a doctor's own affiliate link the charge applies only to very small orders: below this.
export const AFFILIATE_FREE_COLLECTION_MIN = 300;

// The order value from which home collection is free: Rs. 1,000 on the main site, Rs. 300 on a doctor's affiliate link.
export const freeCollectionMin = (affiliate: boolean) => (affiliate ? AFFILIATE_FREE_COLLECTION_MIN : FREE_COLLECTION_MIN);

// Most members one home visit can cover (family at the same address).
export const MAX_MEMBERS = 6;

// `affiliate`: the order is being placed through a doctor's own affiliate link (see getRef() on the server and the cart's
// scope in the browser).
export function collectionChargeFor(itemsTotal: number, affiliate = false): number {
  return itemsTotal > 0 && itemsTotal < freeCollectionMin(affiliate) ? COLLECTION_CHARGE : 0;
}

// Whether the patient pays at the clinic's front desk: the order's saved payment collector, or - for
// orders from before that was saved - whether a registered doctor prescribed it.
export function paidAtClinic(b: Pick<Booking, "paymentCollector" | "referral">): boolean {
  return b.paymentCollector ? b.paymentCollector === "clinic" : !!b.referral?.doctorId;
}

// What the customer owes on collection. Bookings made before coupons or the
// collection charge existed lack those fields, so they count as 0.
export function amountDue(booking: Pick<Booking, "subtotalPrice" | "couponDiscount" | "collectionCharge">): number {
  return booking.subtotalPrice - (booking.couponDiscount ?? 0) + (booking.collectionCharge ?? 0);
}
