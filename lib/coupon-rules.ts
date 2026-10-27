// Coupon types and discount math. Pure and dependency-free so the exact same
// function runs in the browser (live preview in the cart) and on the server
// (the authoritative check when a booking is placed). It deliberately does NOT
// contain the list of coupons - see lib/coupon-config.ts (server only).

export type CouponType = "percent" | "flat";

// What a customer's browser is allowed to know about a coupon.
export type CouponRule = {
  code: string;
  type: CouponType;
  // percent: 1-100 (e.g. 10 = 10% off). flat: rupees off (e.g. 200 = Rs. 200 off).
  value: number;
  // The cart must be worth AT LEAST this much (inclusive). 0 = no minimum.
  minCartValue: number;
  // Upper limit on the discount in rupees, regardless of cart size. null = uncapped.
  maxDiscount: number | null;
  // true = only for orders made up of individual tests: a cart holding any
  // package gets no discount (and the offer is not shown to it).
  testsOnly?: boolean;
};

// True when this coupon can't be used because the cart holds a package.
export function blockedByPackage(rule: CouponRule, cartHasPackage: boolean): boolean {
  return !!rule.testsOnly && cartHasPackage;
}

export type DiscountResult = {
  discount: number; // rupees taken off; 0 if not eligible
  eligible: boolean;
  shortfall: number; // rupees the cart is short of the minimum; 0 if eligible
};

export function computeDiscount(rule: CouponRule, cartValue: number): DiscountResult {
  if (cartValue <= 0 || cartValue < rule.minCartValue) {
    return { discount: 0, eligible: false, shortfall: Math.max(0, rule.minCartValue - cartValue) };
  }
  // Round percentages DOWN so we never give away a fraction of a rupee.
  const raw = rule.type === "percent" ? Math.floor((cartValue * rule.value) / 100) : rule.value;
  const capped = rule.maxDiscount != null ? Math.min(raw, rule.maxDiscount) : raw;
  // A discount can never exceed what is actually being paid.
  return { discount: Math.min(capped, cartValue), eligible: true, shortfall: 0 };
}

export function normalizeCouponCode(input: string): string {
  return input.trim().toUpperCase();
}

const rs = (n: number) => `Rs. ${n.toLocaleString("en-IN")}`;

// Human-readable summary, e.g. "10% off up to Rs. 500 on orders of Rs. 1,000 or more"
// (testsOnly coupons say "on orders with individual tests of Rs. 1,000 or more").
export function describeCoupon(rule: CouponRule): string {
  const offer = rule.type === "percent" ? `${rule.value}% off` : `${rs(rule.value)} off`;
  const cap = rule.maxDiscount != null ? ` up to ${rs(rule.maxDiscount)}` : "";
  const what = rule.testsOnly ? "orders with individual tests of" : "orders of";
  const min = rule.minCartValue > 0 ? ` on ${what} ${rs(rule.minCartValue)} or more` : "";
  return `${offer}${cap}${min}`;
}

// Compact form for phone-width banners, e.g. "10% off up to Rs. 500 on Rs. 1,000+".
export function compactDescription(rule: CouponRule): string {
  const what = rule.testsOnly ? "individual tests of " : "";
  const min = rule.minCartValue > 0 ? ` on ${what}${rs(rule.minCartValue)}+` : "";
  return `${shortOffer(rule)}${min}`;
}

// Short form for tight spaces, e.g. "10% off up to Rs. 500".
export function shortOffer(rule: CouponRule): string {
  const offer = rule.type === "percent" ? `${rule.value}% off` : `${rs(rule.value)} off`;
  return rule.maxDiscount != null ? `${offer} up to ${rs(rule.maxDiscount)}` : offer;
}
