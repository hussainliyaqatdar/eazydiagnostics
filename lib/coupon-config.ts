// SERVER-ONLY: the list of valid coupons. Never import this from a client
// component - the browser must only ever learn about a coupon a customer has
// actually typed in (via /api/coupons/validate), plus the one public
// "featured" coupon advertised in the banner.
//
// To add a coupon, add an entry below and deploy. Fields:
//   code          what the customer types (case-insensitive)
//   type          "percent" or "flat"
//   value         percent: 1-100. flat: rupees off.
//   minCartValue  cart must be at least this many rupees (inclusive); 0 = none
//   maxDiscount   cap on the discount in rupees; null = uncapped
//   testsOnly     true = individual tests only; a cart with any package gets
//                 no discount and never sees the offer
//   active        false switches the coupon off without deleting it
//   featured      true advertises it in the home banner and cart nudge
//                 (only ONE coupon may be featured)
import { normalizeCouponCode, type CouponRule } from "./coupon-rules";

export type CouponConfig = CouponRule & {
  active: boolean;
  featured: boolean;
};

const COUPONS: CouponConfig[] = [
  {
    code: "HEALTHY15",
    type: "percent",
    value: 15,
    // "Orders above Rs. 1,499" - prices are whole rupees, so "above 1499" is
    // the same as "1,500 or more".
    minCartValue: 1500,
    maxDiscount: 500,
    testsOnly: true,
    active: true,
    featured: true,
  },
];

// Fail loudly at startup on a bad config rather than mis-pricing orders.
function validateConfig(coupons: CouponConfig[]) {
  const seen = new Set<string>();
  for (const c of coupons) {
    const where = `Coupon "${c.code}"`;
    if (c.code !== normalizeCouponCode(c.code) || !/^[A-Z0-9_-]{3,20}$/.test(c.code)) {
      throw new Error(`${where}: code must be 3-20 characters of A-Z, 0-9, _ or -, in upper case`);
    }
    if (seen.has(c.code)) throw new Error(`${where}: duplicate code`);
    seen.add(c.code);
    if (c.type !== "percent" && c.type !== "flat") throw new Error(`${where}: type must be "percent" or "flat"`);
    if (!Number.isFinite(c.value) || c.value <= 0) throw new Error(`${where}: value must be greater than 0`);
    if (c.type === "percent" && c.value > 100) throw new Error(`${where}: a percent discount can't exceed 100`);
    if (!Number.isFinite(c.minCartValue) || c.minCartValue < 0) throw new Error(`${where}: minCartValue can't be negative`);
    if (c.maxDiscount != null && (!Number.isFinite(c.maxDiscount) || c.maxDiscount <= 0)) {
      throw new Error(`${where}: maxDiscount must be greater than 0, or null for no cap`);
    }
  }
  if (coupons.filter((c) => c.featured && c.active).length > 1) {
    throw new Error("Only one active coupon may be featured");
  }
}
validateConfig(COUPONS);

function toRule(c: CouponConfig): CouponRule {
  return { code: c.code, type: c.type, value: c.value, minCartValue: c.minCartValue, maxDiscount: c.maxDiscount, testsOnly: c.testsOnly };
}

// Returns the coupon's public rule, or null if the code is unknown or switched
// off (callers should not distinguish the two - that would help code guessing).
export function findCoupon(code: string): CouponRule | null {
  const normalized = normalizeCouponCode(code);
  const found = COUPONS.find((c) => c.active && c.code === normalized);
  return found ? toRule(found) : null;
}

export function getFeaturedCoupon(): CouponRule | null {
  const found = COUPONS.find((c) => c.active && c.featured);
  return found ? toRule(found) : null;
}
