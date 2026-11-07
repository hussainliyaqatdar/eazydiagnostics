"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useCartSummary } from "@/lib/cart-context";
import { useUI } from "@/lib/ui-context";
import { CONSULT_FEE, describeConsult, hasConsult } from "@/lib/consult-offers";
import PriceTag from "./PriceTag";
import CouponNudge from "./CouponNudge";
import CouponField from "./CouponField";
import type { CouponRule } from "@/lib/coupon-rules";
import { FREE_COLLECTION_MIN } from "@/lib/booking-totals";

export default function CartDrawer({ featuredCoupon = null }: { featuredCoupon?: CouponRule | null }) {
  const { cartDrawerOpen, closeCartDrawer, openSearchModal } = useUI();
  const { items, subtotalMrp, remove, clear, setConsult, couponsAllowed, coupon, discount, total, collectionCharge, subtotalPrice } = useCartSummary();

  useEffect(() => {
    if (!cartDrawerOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeCartDrawer();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [cartDrawerOpen, closeCartDrawer]);

  if (!cartDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={closeCartDrawer} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        className="relative w-full sm:w-[420px] h-dvh bg-white shadow-xl flex flex-col animate-[cart-drawer-in_0.2s_ease-out]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Your cart</h2>
          <button onClick={closeCartDrawer} aria-label="Close cart" className="text-gray-400 hover:text-gray-700 p-1">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {items.length > 0 && couponsAllowed && <CouponNudge featured={featuredCoupon} />}

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-gray-500">Your cart is empty.</p>
            <button
              onClick={() => {
                closeCartDrawer();
                openSearchModal();
              }}
              className="text-brand font-medium hover:underline"
            >
              Browse tests and packages →
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {items.map((i) => (
                <div key={`${i.kind}-${i.slug}`} className="border rounded-lg overflow-hidden">
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs uppercase tracking-wide text-gray-400">{i.kind}</span>
                      <Link
                        href={i.kind === "test" ? `/tests/${i.slug}` : `/packages/${i.slug}`}
                        onClick={closeCartDrawer}
                        className="block font-semibold text-gray-900 hover:text-brand truncate"
                      >
                        {i.name}
                      </Link>
                      <p className="text-xs text-gray-500">Qty: {i.qty}</p>
                      {i.offer?.variant === "included" && describeConsult(i.offer) && (
                        <p className="text-xs text-brand-dark mt-0.5">{describeConsult(i.offer)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <PriceTag mrp={i.mrp * i.qty} price={i.price * i.qty} size="sm" />
                      <button
                        onClick={() => remove(i.kind, i.slug)}
                        aria-label={`Remove ${i.name} from cart`}
                        title="Remove"
                        className="text-gray-400 hover:text-red-500 transition p-1"
                      >
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6l-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {i.offer?.variant === "addon" && (
                    <label className="flex cursor-pointer items-center justify-between gap-3 border-t bg-brand-light px-3 py-2.5">
                      <span className="min-w-0 text-sm">
                        <span className="block font-semibold text-gray-900">
                          Add a follow-up doctor consultation <span className="text-brand-dark">+Rs. {CONSULT_FEE}</span>
                        </span>
                        <span className="block text-xs text-gray-600">
                          {hasConsult(i.offer) ? "Added - you'll choose your doctor at checkout." : "Go through your report with a doctor."}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        role="switch"
                        checked={hasConsult(i.offer)}
                        onChange={(e) => setConsult(i.slug, e.target.checked)}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className="relative h-6 w-11 shrink-0 rounded-full bg-gray-300 transition peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5"
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>

            <div className="shrink-0 border-t px-4 py-3 flex flex-col gap-3 bg-white">
              {couponsAllowed && <CouponField />}
              <div className="bg-brand-light rounded-lg p-3 flex flex-col gap-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>MRP total</span>
                  <span className="line-through">Rs. {subtotalMrp.toLocaleString("en-IN")}</span>
                </div>
                {discount > 0 && coupon && (
                  <div className="flex justify-between text-sm text-green-700 font-medium">
                    <span>Coupon ({coupon.code})</span>
                    <span>- Rs. {discount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {collectionCharge > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Collection charges</span>
                      <span>Rs. {collectionCharge.toLocaleString("en-IN")}</span>
                    </div>
                    <p className="text-xs text-gray-500">Add Rs. {(FREE_COLLECTION_MIN - subtotalPrice).toLocaleString("en-IN")} more to get free home collection.</p>
                  </>
                )}
                <div className="flex justify-between font-bold text-brand-dark text-lg">
                  <span>You pay</span>
                  <span>Rs. {total.toLocaleString("en-IN")}</span>
                </div>
                {subtotalMrp > total - collectionCharge && (
                  <div className="flex justify-between text-sm text-brand-accent font-medium">
                    <span>Total savings</span>
                    <span>Rs. {(subtotalMrp - (total - collectionCharge)).toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <button onClick={clear} className="text-sm text-gray-500 hover:underline shrink-0">Clear cart</button>
                <Link
                  href="/checkout"
                  onClick={closeCartDrawer}
                  className="flex-1 text-center bg-brand text-white px-4 py-3 rounded-md font-medium hover:bg-brand-dark transition"
                >
                  Proceed to book collection →
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
