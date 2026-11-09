"use client";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useUI } from "@/lib/ui-context";
import { useBrand } from "./BrandProvider";
import { homeHref } from "@/lib/brand";
import { BOOKING_PHONE, BOOKING_PHONE_TEL } from "@/lib/site-config";
import { getPackageCategories } from "@/lib/catalog";
import Logo from "./Logo";
import CouponBanner from "./CouponBanner";
import type { CouponRule } from "@/lib/coupon-rules";

const PACKAGE_CATEGORIES = getPackageCategories();

export default function Header({ featuredCoupon = null }: { featuredCoupon?: CouponRule | null }) {
  const { count } = useCart();
  const { brand } = useBrand();
  const { openCartDrawer } = useUI();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-white border-b sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href={homeHref(brand)} className="shrink-0">
          <Logo brand={brand} />
        </Link>

        <div className="flex items-center gap-6 ml-auto">
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/tests" className="text-gray-700 hover:text-brand">Tests</Link>

            <div className="relative group">
              <Link href="/packages" className="text-gray-700 hover:text-brand flex items-center gap-1 py-3 -my-3">
                Packages
                <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
                  <path d="M5.25 7.5L10 12.25l4.75-4.75H5.25z" />
                </svg>
              </Link>
              <div className="absolute right-0 top-full hidden group-hover:block group-focus-within:block bg-white border rounded-lg shadow-lg py-2 w-56 z-40">
                <Link href="/packages" className="block px-4 py-2 text-sm text-gray-700 hover:bg-brand-light hover:text-brand-dark font-medium">
                  All packages
                </Link>
                <div className="border-t my-1" />
                {PACKAGE_CATEGORIES.map((c) => (
                  <Link
                    key={c}
                    href={`/packages?category=${encodeURIComponent(c)}`}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-brand-light hover:text-brand-dark"
                  >
                    {c}
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          <div className="flex items-center gap-4 shrink-0">
            <a href={`tel:${BOOKING_PHONE_TEL}`} className="hidden sm:flex items-center gap-1 text-sm font-medium text-brand-dark hover:underline">
              <span aria-hidden>{"\u{1F4DE}"}</span> {BOOKING_PHONE}
            </a>
            <button
              onClick={() => {
                setMobileOpen(false);
                openCartDrawer();
              }}
              className="relative text-gray-700 hover:text-brand text-sm font-medium"
            >
              Cart
              {count > 0 && (
                <span className="absolute -top-2 -right-3 bg-brand-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
            <button className="md:hidden text-gray-700" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
              {"☰"}
            </button>
          </div>
        </div>
      </div>
      <CouponBanner coupon={featuredCoupon} />
      {mobileOpen && (
        <nav className="md:hidden border-t px-4 py-3 flex flex-col gap-3 text-sm bg-white">
          <Link href="/tests" onClick={() => setMobileOpen(false)} className="font-medium">Tests</Link>
          <Link href="/packages" onClick={() => setMobileOpen(false)} className="font-medium">Packages</Link>
          <div className="pl-3 flex flex-col gap-2 border-l">
            {PACKAGE_CATEGORIES.map((c) => (
              <Link key={c} href={`/packages?category=${encodeURIComponent(c)}`} onClick={() => setMobileOpen(false)} className="text-gray-600">
                {c}
              </Link>
            ))}
          </div>
          <a href={`tel:${BOOKING_PHONE_TEL}`} className="font-medium text-brand-dark pt-2 border-t">Call {BOOKING_PHONE}</a>
        </nav>
      )}
    </header>
  );
}
