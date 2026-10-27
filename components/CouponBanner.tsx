"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { blockedByPackage, compactDescription, describeCoupon, type CouponRule } from "@/lib/coupon-rules";

// Slim promo strip shown on the home page only. It lives inside the sticky
// header, so it stays pinned to the top with the nav as the page scrolls.
export default function CouponBanner({ coupon }: { coupon: CouponRule | null }) {
  const pathname = usePathname();
  const { lines } = useCart();
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  // Tests-only offers aren't advertised to a visitor who has a package in the cart.
  if (!coupon || pathname !== "/" || blockedByPackage(coupon, lines.some((l) => l.kind === "package"))) return null;

  // The async Clipboard API is blocked in some in-app browsers (e.g. links opened
  // inside WhatsApp/Instagram) and on insecure origins, so fall back to the older
  // execCommand route, and say so if both fail rather than doing nothing.
  async function copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }

  async function copyCode() {
    setStatus((await copyText(coupon!.code)) ? "copied" : "failed");
    setTimeout(() => setStatus("idle"), 1800);
  }

  return (
    <div className="bg-brand-dark text-white">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-1.5 flex items-center justify-center gap-x-2 text-xs sm:text-sm leading-snug">
        <span aria-hidden>{"\u{1F389}"}</span>
        {/* Phones get a one-line version so the sticky header stays slim. */}
        <span className="font-semibold sm:hidden">{compactDescription(coupon)}</span>
        <span className="font-semibold hidden sm:inline">{describeCoupon(coupon)}</span>
        <span className="hidden sm:inline text-white/60" aria-hidden>&middot;</span>
        <button
          onClick={copyCode}
          aria-label={`Copy coupon code ${coupon.code}`}
          className="shrink-0 inline-flex items-center gap-1 rounded border border-dashed border-brand-accent bg-white/10 px-2 py-0.5 font-bold tracking-wider text-brand-accent hover:bg-white/20 transition"
        >
          {coupon.code}
          {/* The "tap to copy" hint is desktop-only, but feedback (Copied!) always shows. */}
          <span
            className={`text-[10px] font-medium normal-case tracking-normal text-white/80 ${status === "idle" ? "hidden sm:inline" : ""}`}
            aria-live="polite"
          >
            {status === "copied" ? "Copied!" : status === "failed" ? "Type it in the cart" : "Tap to copy"}
          </span>
        </button>
      </div>
    </div>
  );
}
