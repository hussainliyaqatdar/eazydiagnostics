"use client";
import { useState } from "react";
import { useCartSummary } from "@/lib/cart-context";
import { blockedByPackage, computeDiscount, shortOffer, type CouponRule } from "@/lib/coupon-rules";

const rs = (n: number) => `Rs. ${n.toLocaleString("en-IN")}`;

// Pinned strip at the top of the cart drawer that tells the customer where they
// stand with the featured coupon: how far from unlocking it, that it's ready to
// apply, or how much it is saving them.
export default function CouponNudge({ featured }: { featured: CouponRule | null }) {
  const { subtotalPrice, coupon, discount, couponShortfall, applyCoupon, hasPackage } = useCartSummary();
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  if (!featured) return null;
  // The offer is for individual tests only - don't show it to a cart with a package.
  if (blockedByPackage(featured, hasPackage)) return null;
  // The customer is using some other coupon - don't advertise a different one.
  if (coupon && coupon.code !== featured.code) return null;

  const isApplied = coupon?.code === featured.code;
  const potential = computeDiscount(featured, subtotalPrice);
  const progress = featured.minCartValue > 0 ? Math.min(1, subtotalPrice / featured.minCartValue) : 1;

  async function apply() {
    setApplying(true);
    setError("");
    const result = await applyCoupon(featured!.code);
    if (!result.ok) setError(result.message);
    setApplying(false);
  }

  // Applied and saving money.
  if (isApplied && discount > 0) {
    return (
      <div className="shrink-0 px-4 py-2.5 bg-green-50 border-b border-green-200 text-sm text-green-900 flex items-center gap-2">
        <span aria-hidden className="text-base">{"\u{1F389}"}</span>
        <span>
          You&apos;re saving <strong>{rs(discount)}</strong> with <strong>{featured.code}</strong>
        </span>
      </div>
    );
  }

  // Not applied and the cart already qualifies: offer one-tap apply.
  if (!isApplied && potential.eligible) {
    return (
      <div className="shrink-0 px-4 py-2.5 bg-brand-light border-b border-brand/20 flex items-center gap-3">
        <div className="flex-1 min-w-0 text-sm text-brand-dark">
          <p className="font-semibold leading-snug">
            You unlocked {rs(potential.discount)} off!
          </p>
          <p className="text-xs text-gray-600 leading-snug">
            Use code <strong>{featured.code}</strong> &middot; {shortOffer(featured)}
          </p>
          {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
        </div>
        <button
          onClick={apply}
          disabled={applying}
          className="shrink-0 bg-brand text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition disabled:opacity-60"
        >
          {applying ? "Applying…" : "Apply"}
        </button>
      </div>
    );
  }

  // Not unlocked yet (whether or not the code has been entered): show progress.
  const remaining = isApplied ? couponShortfall : potential.shortfall;
  return (
    <div className="shrink-0 px-4 py-2.5 bg-amber-50 border-b border-amber-200">
      <p className="text-sm text-amber-950 leading-snug">
        {remaining > 0 && subtotalPrice > 0 ? (
          <>
            Add <strong>{rs(remaining)}</strong> more to get {shortOffer(featured)}
          </>
        ) : (
          <>
            Get <strong>{shortOffer(featured)}</strong> on {featured.testsOnly ? "individual tests of " : "orders of "}{rs(featured.minCartValue)}+
          </>
        )}
      </p>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-amber-200 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Progress towards coupon minimum">
        <div className="h-full rounded-full bg-brand-accent transition-all duration-300" style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="text-xs text-amber-900/80 mt-1">
        {isApplied ? (
          <>
            Code <strong>{featured.code}</strong> is applied - it kicks in automatically.
          </>
        ) : (
          <>
            Use code <strong>{featured.code}</strong>
          </>
        )}
      </p>
    </div>
  );
}
