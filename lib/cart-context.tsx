"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import type { CartLine, CartLineOffer } from "./types";
import { allTests, allPackages } from "./catalog";
import { blockedByPackage, computeDiscount, type CouponRule } from "./coupon-rules";
import { hasConsult, priceWithOffer } from "./consult-offers";

// `transient` marks failures that say nothing about the code itself (offline,
// rate-limited), so a saved coupon shouldn't be dropped because of them.
export type ApplyCouponResult = { ok: true; coupon: CouponRule } | { ok: false; message: string; transient?: boolean };

type CartContextType = {
  lines: CartLine[];
  add: (kind: "test" | "package", slug: string) => void;
  // Adds a package from a consultation-offer comparison page, or switches an
  // existing line for that package to this offer (quantity is kept, and so is
  // a consultation already added to the same offer).
  addWithOffer: (slug: string, offer: CartLineOffer) => void;
  // Add-on offers only: adds or removes the follow-up consultation on a cart line.
  setConsult: (slug: string, on: boolean) => void;
  // Picks the doctor for the consultation(s) in the order (done at checkout).
  setConsultDoctor: (doctorId: string) => void;
  decrement: (kind: "test" | "package", slug: string) => void;
  remove: (kind: "test" | "package", slug: string) => void;
  clear: () => void;
  count: number;
  // The coupon the customer has entered (its rules, as confirmed by the server).
  // Whether it currently gives a discount depends on the cart - see useCartSummary.
  coupon: CouponRule | null;
  applyCoupon: (code: string) => Promise<ApplyCouponResult>;
  removeCoupon: () => void;
};

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = "diagnostics-cart-v2";
const COUPON_KEY = "diagnostics-coupon-v1";

async function checkCoupon(code: string): Promise<ApplyCouponResult> {
  try {
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (data.valid) return { ok: true, coupon: data.coupon as CouponRule };
    return { ok: false, message: data.message || "That coupon code isn't valid.", transient: res.status === 429 };
  } catch {
    return { ok: false, message: "Couldn't check that code. Please check your connection and try again.", transient: true };
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [coupon, setCoupon] = useState<CouponRule | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    let stored: CouponRule | null = null;
    try {
      const raw = localStorage.getItem(COUPON_KEY);
      if (raw) stored = JSON.parse(raw);
    } catch {}
    if (stored) {
      setCoupon(stored);
      // The coupon may have been switched off or changed since it was saved, so
      // re-check it. A transient failure keeps it (the server re-checks at booking).
      checkCoupon(stored.code).then((result) => {
        if (result.ok) setCoupon(result.coupon);
        else if (!result.transient) setCoupon(null);
      });
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (coupon) localStorage.setItem(COUPON_KEY, JSON.stringify(coupon));
    else localStorage.removeItem(COUPON_KEY);
  }, [coupon, loaded]);

  async function applyCoupon(code: string): Promise<ApplyCouponResult> {
    const result = await checkCoupon(code);
    if (result.ok && blockedByPackage(result.coupon, lines.some((l) => l.kind === "package"))) {
      return { ok: false, message: "This code is for individual tests only. Remove any packages from your cart to use it." };
    }
    if (result.ok) setCoupon(result.coupon);
    return result;
  }

  function removeCoupon() {
    setCoupon(null);
  }

  function add(kind: "test" | "package", slug: string) {
    setLines((prev) => {
      const existing = prev.find((l) => l.kind === kind && l.slug === slug);
      if (existing) {
        return prev.map((l) => (l.kind === kind && l.slug === slug ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { kind, slug, qty: 1 }];
    });
  }

  function addWithOffer(slug: string, offer: CartLineOffer) {
    setLines((prev) => {
      const exists = prev.some((l) => l.kind === "package" && l.slug === slug);
      if (!exists) return [...prev, { kind: "package", slug, qty: 1, offer }];
      return prev.map((l) => {
        if (!(l.kind === "package" && l.slug === slug)) return l;
        const sameOffer = l.offer?.variant === offer.variant;
        return { ...l, offer: sameOffer ? { ...l.offer, ...offer } : offer };
      });
    });
  }

  function setConsult(slug: string, on: boolean) {
    setLines((prev) =>
      prev.map((l) => {
        if (!(l.kind === "package" && l.slug === slug && l.offer?.variant === "addon")) return l;
        // Taking the consultation off also forgets the doctor picked for it.
        return { ...l, offer: on ? { ...l.offer, consult: true } : { variant: "addon" as const } };
      })
    );
  }

  function setConsultDoctor(doctorId: string) {
    setLines((prev) => prev.map((l) => (l.offer && hasConsult(l.offer) ? { ...l, offer: { ...l.offer, doctorId } } : l)));
  }

  function decrement(kind: "test" | "package", slug: string) {
    setLines((prev) =>
      prev.flatMap((l) => {
        if (!(l.kind === kind && l.slug === slug)) return [l];
        return l.qty <= 1 ? [] : [{ ...l, qty: l.qty - 1 }];
      })
    );
  }

  function remove(kind: "test" | "package", slug: string) {
    setLines((prev) => prev.filter((l) => !(l.kind === kind && l.slug === slug)));
  }

  function clear() {
    setLines([]);
  }

  const count = lines.reduce((sum, l) => sum + l.qty, 0);

  return (
    <CartContext.Provider
      value={{ lines, add, addWithOffer, setConsult, setConsultDoctor, decrement, remove, clear, count, coupon, applyCoupon, removeCoupon }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export type CartSummaryItem = {
  kind: "test" | "package";
  slug: string;
  name: string;
  qty: number;
  price: number;
  mrp: number;
  offer?: CartLineOffer;
};

// Resolves cart lines (kind+slug+qty) against the catalog, used anywhere the
// cart's contents need to be displayed (drawer, search modal footer, cart page).
export function useCartSummary() {
  const { lines, remove, clear, setConsult, setConsultDoctor, coupon, applyCoupon, removeCoupon } = useCart();

  const items: CartSummaryItem[] = lines
    .map((l) => {
      const source = l.kind === "test" ? allTests : allPackages;
      const found = source.find((x) => x.slug === l.slug);
      if (!found) return null;
      const { price, mrp } = priceWithOffer(found, l.offer);
      return { kind: l.kind, slug: l.slug, name: found.name, qty: l.qty, price, mrp, offer: l.offer };
    })
    .filter(Boolean) as CartSummaryItem[];

  const subtotalMrp = items.reduce((s, i) => s + i.mrp * i.qty, 0);
  const subtotalPrice = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  // Packages from the consultation-offer pages are priced to include the
  // consultation, so there is no room for a coupon on top: a cart holding one
  // gets no coupon discount (a coupon already entered stays saved, and applies
  // again if that package is taken out).
  // A coupon marked tests-only is off while the cart holds any package, too.
  const hasPackage = items.some((i) => i.kind === "package");
  const couponsAllowed = !items.some((i) => i.offer) && !(coupon && blockedByPackage(coupon, hasPackage));

  // Live preview of the coupon. The server recomputes this when the order is
  // placed; this is the same pure function, so the two always agree.
  const result = coupon && couponsAllowed ? computeDiscount(coupon, subtotalPrice) : null;
  const discount = result?.discount ?? 0;
  const total = subtotalPrice - discount;

  return {
    items, subtotalMrp, subtotalPrice, count, remove, clear, setConsult, setConsultDoctor,
    coupon, applyCoupon, removeCoupon,
    hasPackage, // true when the cart holds any package
    couponsAllowed, // false when the cart holds a consultation-offer package, or a package with a tests-only coupon
    discount, // rupees off from the coupon right now (0 if none, or not yet eligible)
    couponShortfall: result && !result.eligible ? result.shortfall : 0, // rupees to add to unlock it
    total, // what the customer pays after the coupon
  };
}
