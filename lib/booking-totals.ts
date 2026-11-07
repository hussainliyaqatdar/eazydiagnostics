import type { Booking } from "./types";

// Home collection costs the same to run for a small order, so orders whose
// items come to less than this (before any coupon) pay a flat collection charge.
export const FREE_COLLECTION_MIN = 1000;
export const COLLECTION_CHARGE = 250;

export function collectionChargeFor(itemsTotal: number): number {
  return itemsTotal > 0 && itemsTotal < FREE_COLLECTION_MIN ? COLLECTION_CHARGE : 0;
}

// What the customer owes on collection. Bookings made before coupons or the
// collection charge existed lack those fields, so they count as 0.
export function amountDue(booking: Pick<Booking, "subtotalPrice" | "couponDiscount" | "collectionCharge">): number {
  return booking.subtotalPrice - (booking.couponDiscount ?? 0) + (booking.collectionCharge ?? 0);
}
