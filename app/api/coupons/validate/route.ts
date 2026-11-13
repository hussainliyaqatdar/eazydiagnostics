import { NextRequest, NextResponse } from "next/server";
import { findCoupon } from "@/lib/coupon-config";
import { rateLimit } from "@/lib/rate-limit";
import { getRef } from "@/lib/brand-server";

// Checks that a code exists and is active, and returns its rule so the cart can
// preview the discount as items change. It does NOT decide what an order is
// charged - /api/bookings re-checks the code and recomputes the discount itself.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const limit = rateLimit(`coupon:${ip}`, 15, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { valid: false, message: "Too many attempts. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  // No coupons through a doctor's link.
  if (getRef()) return NextResponse.json({ valid: false, message: "Coupons aren't available on this site." });

  let code: unknown;
  try {
    ({ code } = await req.json());
  } catch {
    return NextResponse.json({ valid: false, message: "Enter a coupon code." }, { status: 400 });
  }
  if (typeof code !== "string" || !code.trim() || code.length > 40) {
    return NextResponse.json({ valid: false, message: "Enter a coupon code." }, { status: 400 });
  }

  const coupon = findCoupon(code);
  if (!coupon) {
    // Same message for unknown and switched-off codes, so it doesn't help guessing.
    return NextResponse.json({ valid: false, message: "That coupon code isn't valid." });
  }
  return NextResponse.json({ valid: true, coupon });
}
