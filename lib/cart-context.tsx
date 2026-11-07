"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import type { CartLine, CartLineOffer, CartMember } from "./types";
import { allTests, allPackages } from "./catalog";
import { blockedByPackage, computeDiscount, type CouponRule } from "./coupon-rules";
import { collectionChargeFor, MAX_MEMBERS } from "./booking-totals";
import { hasConsult, priceWithOffer } from "./consult-offers";

// A "visit" is one home collection: one address and one time slot, with one or
// more members (members), each with their own cart. Most visits have a single
// member, and then everything behaves exactly like a plain cart.
export { MAX_MEMBERS };

// `transient` marks failures that say nothing about the code itself (offline,
// rate-limited), so a saved coupon shouldn't be dropped because of them.
export type ApplyCouponResult = { ok: true; coupon: CouponRule } | { ok: false; message: string; transient?: boolean };

type Kind = "test" | "package";

type CartContextType = {
  // ---- members (members in this visit) ----
  members: CartMember[];
  // The member new items are added to (the one the customer is "adding for").
  activeId: string;
  active: CartMember;
  setActive: (id: string) => void;
  // Adds a member to the visit (and makes them the active member). Returns the new id,
  // or null at the limit.
  addMember: () => string | null;
  removeMember: (id: string) => void;
  renameMember: (id: string, label: string) => void;
  // Copies everything in one member's cart into another's (tests already there are kept).
  copyMember: (fromId: string, toId: string) => void;
  // Adds a new member with a copy of this member's cart; returns the new id, or null at the limit.
  copyToNewMember: (fromId: string) => string | null;

  // ---- items. `memberId` defaults to the active member ----
  // The ACTIVE member's lines (what the add/stepper buttons act on).
  lines: CartLine[];
  // Every line in the visit, across members.
  allLines: CartLine[];
  add: (kind: Kind, slug: string, memberId?: string) => void;
  // Adds a package from a consultation-offer comparison page, or switches an
  // existing line for that package to this offer (quantity is kept, and so is
  // a consultation already added to the same offer).
  addWithOffer: (slug: string, offer: CartLineOffer, memberId?: string) => void;
  // Add-on offers only: adds or removes the follow-up consultation on a cart line.
  setConsult: (slug: string, on: boolean, memberId?: string) => void;
  // Picks the doctor for the consultation(s) in the order (done at checkout).
  setConsultDoctor: (doctorId: string) => void;
  decrement: (kind: Kind, slug: string, memberId?: string) => void;
  remove: (kind: Kind, slug: string, memberId?: string) => void;
  clear: () => void;
  // Total quantity across the whole visit.
  count: number;
  // The coupon the customer has entered (its rules, as confirmed by the server).
  // Whether it currently gives a discount depends on the cart - see useCartSummary.
  coupon: CouponRule | null;
  applyCoupon: (code: string) => Promise<ApplyCouponResult>;
  removeCoupon: () => void;
};

const CartContext = createContext<CartContextType | null>(null);
const OLD_STORAGE_KEY = "diagnostics-cart-v2"; // single-member carts, before visits
const STORAGE_KEY = "diagnostics-visit-v1";
const COUPON_KEY = "diagnostics-coupon-v1";

const FIRST_MEMBER: CartMember = { id: "m1", label: "You", lines: [] };

function newMemberId(existing: CartMember[]): string {
  let n = existing.length + 1;
  while (existing.some((m) => m.id === `m${n}`)) n++;
  return `m${n}`;
}

// "Member 2", "Member 3"... skipping any name already in use.
function defaultLabel(existing: CartMember[]): string {
  let n = existing.length + 1;
  while (existing.some((m) => m.label === `Member ${n}`)) n++;
  return `Member ${n}`;
}

function mergeLines(base: CartLine[], extra: CartLine[]): CartLine[] {
  const out = [...base];
  for (const l of extra) {
    if (!out.some((b) => b.kind === l.kind && b.slug === l.slug)) out.push({ ...l, ...(l.offer ? { offer: { ...l.offer } } : {}) });
  }
  return out;
}

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
  const [members, setMembers] = useState<CartMember[]>([FIRST_MEMBER]);
  const [activeId, setActiveId] = useState<string>(FIRST_MEMBER.id);
  const [coupon, setCoupon] = useState<CouponRule | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { members?: CartMember[]; activeId?: string };
        if (saved.members?.length) {
          // Carts saved while members were still called "Person N" get the new default names.
          setMembers(saved.members.map((m) => ({ ...m, label: m.label.replace(/^Person (\d+)$/, "Member $1") })));
          setActiveId(saved.members.some((m) => m.id === saved.activeId) ? saved.activeId! : saved.members[0].id);
        }
      } else {
        // A cart saved before visits existed becomes the first member's cart.
        const old = localStorage.getItem(OLD_STORAGE_KEY);
        if (old) setMembers([{ ...FIRST_MEMBER, lines: JSON.parse(old) }]);
      }
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ members, activeId }));
  }, [members, activeId, loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (coupon) localStorage.setItem(COUPON_KEY, JSON.stringify(coupon));
    else localStorage.removeItem(COUPON_KEY);
  }, [coupon, loaded]);

  const active = members.find((m) => m.id === activeId) ?? members[0];
  const allLines = members.flatMap((m) => m.lines);

  async function applyCoupon(code: string): Promise<ApplyCouponResult> {
    const result = await checkCoupon(code);
    if (result.ok && blockedByPackage(result.coupon, allLines.some((l) => l.kind === "package"))) {
      return { ok: false, message: "This code is for individual tests only. Remove any packages from your cart to use it." };
    }
    if (result.ok) setCoupon(result.coupon);
    return result;
  }

  function removeCoupon() {
    setCoupon(null);
  }

  // ---- members ----
  function addMember(): string | null {
    if (members.length >= MAX_MEMBERS) return null;
    const id = newMemberId(members);
    setMembers((prev) => [...prev, { id, label: defaultLabel(prev), lines: [] }]);
    setActiveId(id);
    return id;
  }

  function removeMember(id: string) {
    setMembers((prev) => {
      if (prev.length <= 1) return prev.map((m) => ({ ...m, lines: [] }));
      const next = prev.filter((m) => m.id !== id);
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  }

  function renameMember(id: string, label: string) {
    const clean = label.replace(/\s+/g, " ").trim().slice(0, 24);
    if (!clean) return;
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, label: clean } : m)));
  }

  function copyMember(fromId: string, toId: string) {
    if (fromId === toId) return;
    setMembers((prev) => {
      const from = prev.find((m) => m.id === fromId);
      if (!from) return prev;
      return prev.map((m) => (m.id === toId ? { ...m, lines: mergeLines(m.lines, from.lines) } : m));
    });
  }

  function copyToNewMember(fromId: string): string | null {
    if (members.length >= MAX_MEMBERS) return null;
    const from = members.find((m) => m.id === fromId);
    if (!from) return null;
    const id = newMemberId(members);
    setMembers((prev) => [...prev, { id, label: defaultLabel(prev), lines: mergeLines([], from.lines) }]);
    setActiveId(id);
    return id;
  }

  // ---- items ----
  function updateLines(memberId: string | undefined, fn: (lines: CartLine[]) => CartLine[]) {
    const target = memberId ?? activeId;
    setMembers((prev) => prev.map((m) => (m.id === target ? { ...m, lines: fn(m.lines) } : m)));
  }

  function add(kind: Kind, slug: string, memberId?: string) {
    updateLines(memberId, (prev) => {
      const existing = prev.find((l) => l.kind === kind && l.slug === slug);
      if (existing) return prev.map((l) => (l.kind === kind && l.slug === slug ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { kind, slug, qty: 1 }];
    });
  }

  function addWithOffer(slug: string, offer: CartLineOffer, memberId?: string) {
    updateLines(memberId, (prev) => {
      const exists = prev.some((l) => l.kind === "package" && l.slug === slug);
      if (!exists) return [...prev, { kind: "package", slug, qty: 1, offer }];
      return prev.map((l) => {
        if (!(l.kind === "package" && l.slug === slug)) return l;
        const sameOffer = l.offer?.variant === offer.variant;
        return { ...l, offer: sameOffer ? { ...l.offer, ...offer } : offer };
      });
    });
  }

  function setConsult(slug: string, on: boolean, memberId?: string) {
    updateLines(memberId, (prev) =>
      prev.map((l) => {
        if (!(l.kind === "package" && l.slug === slug && l.offer?.variant === "addon")) return l;
        // Taking the consultation off also forgets the doctor picked for it.
        return { ...l, offer: on ? { ...l.offer, consult: true } : { variant: "addon" as const } };
      })
    );
  }

  function setConsultDoctor(doctorId: string) {
    setMembers((prev) =>
      prev.map((m) => ({ ...m, lines: m.lines.map((l) => (l.offer && hasConsult(l.offer) ? { ...l, offer: { ...l.offer, doctorId } } : l)) }))
    );
  }

  function decrement(kind: Kind, slug: string, memberId?: string) {
    updateLines(memberId, (prev) =>
      prev.flatMap((l) => {
        if (!(l.kind === kind && l.slug === slug)) return [l];
        return l.qty <= 1 ? [] : [{ ...l, qty: l.qty - 1 }];
      })
    );
  }

  function remove(kind: Kind, slug: string, memberId?: string) {
    updateLines(memberId, (prev) => prev.filter((l) => !(l.kind === kind && l.slug === slug)));
  }

  // Empties the whole visit: back to one member with no tests.
  function clear() {
    setMembers([FIRST_MEMBER]);
    setActiveId(FIRST_MEMBER.id);
  }

  const count = allLines.reduce((sum, l) => sum + l.qty, 0);

  return (
    <CartContext.Provider
      value={{
        members, activeId: active.id, active, setActive: setActiveId, addMember, removeMember, renameMember, copyMember, copyToNewMember,
        lines: active.lines, allLines, add, addWithOffer, setConsult, setConsultDoctor, decrement, remove, clear, count,
        coupon, applyCoupon, removeCoupon,
      }}
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
  kind: Kind;
  slug: string;
  name: string;
  qty: number;
  price: number;
  mrp: number;
  offer?: CartLineOffer;
};

export type MemberSummary = {
  id: string;
  label: string;
  items: CartSummaryItem[];
  count: number;
  subtotalMrp: number;
  subtotalPrice: number;
};

// Resolves cart lines (kind+slug+qty) against the catalog, used anywhere the
// cart's contents need to be displayed (drawer, search modal footer, checkout).
// Prices are per member (memberSummaries) and for the whole visit. The coupon
// and the collection charge belong to the VISIT, since it is one trip and one
// order: the coupon's minimum is checked against everyone's tests combined.
export function useCartSummary() {
  const { members, remove, clear, setConsult, setConsultDoctor, coupon, applyCoupon, removeCoupon } = useCart();

  const memberSummaries: MemberSummary[] = members.map((m) => {
    const items = m.lines
      .map((l) => {
        const source = l.kind === "test" ? allTests : allPackages;
        const found = source.find((x) => x.slug === l.slug);
        if (!found) return null;
        const { price, mrp } = priceWithOffer(found, l.offer);
        return { kind: l.kind, slug: l.slug, name: found.name, qty: l.qty, price, mrp, offer: l.offer };
      })
      .filter(Boolean) as CartSummaryItem[];
    return {
      id: m.id,
      label: m.label,
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      subtotalMrp: items.reduce((s, i) => s + i.mrp * i.qty, 0),
      subtotalPrice: items.reduce((s, i) => s + i.price * i.qty, 0),
    };
  });

  const items = memberSummaries.flatMap((m) => m.items);
  const subtotalMrp = memberSummaries.reduce((s, m) => s + m.subtotalMrp, 0);
  const subtotalPrice = memberSummaries.reduce((s, m) => s + m.subtotalPrice, 0);
  const count = memberSummaries.reduce((s, m) => s + m.count, 0);

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
  const collectionCharge = collectionChargeFor(subtotalPrice);
  const total = subtotalPrice - discount + collectionCharge;

  return {
    members: memberSummaries,
    // Members who have nothing in their cart yet (a visit can't be booked with one).
    emptyMembers: memberSummaries.filter((m) => m.count === 0),
    items, subtotalMrp, subtotalPrice, count, remove, clear, setConsult, setConsultDoctor,
    coupon, applyCoupon, removeCoupon,
    hasPackage, // true when the cart holds any package
    couponsAllowed, // false when the cart holds a consultation-offer package, or a package with a tests-only coupon
    discount, // rupees off from the coupon right now (0 if none, or not yet eligible)
    couponShortfall: result && !result.eligible ? result.shortfall : 0, // rupees to add to unlock it
    collectionCharge, // flat home-collection charge on visits under FREE_COLLECTION_MIN (0 otherwise)
    total, // what the customer pays: all items, less the coupon, plus any collection charge
  };
}
