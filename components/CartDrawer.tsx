"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MAX_MEMBERS, useCart, useCartSummary, type MemberSummary } from "@/lib/cart-context";
import { useUI } from "@/lib/ui-context";
import { CONSULT_FEE, describeConsult, hasConsult } from "@/lib/consult-offers";
import PriceTag from "./PriceTag";
import StepActions from "./StepActions";
import CouponNudge from "./CouponNudge";
import type { CouponRule } from "@/lib/coupon-rules";
import { FREE_COLLECTION_MIN } from "@/lib/booking-totals";

const rs = (n: number) => `Rs. ${n.toLocaleString("en-IN")}`;

export default function CartDrawer({ featuredCoupon = null }: { featuredCoupon?: CouponRule | null }) {
  const { cartDrawerOpen, closeCartDrawer, openSearchModal } = useUI();
  const { members: cartMembers, activeId, setActive, addMember, removeMember, renameMember, copyMember, copyToNewMember, clear } = useCart();
  const {
    members, emptyMembers, count, subtotalMrp, remove, setConsult, couponsAllowed, coupon, discount, total, collectionCharge, subtotalPrice,
  } = useCartSummary();
  const multi = members.length > 1;

  // Which member's "Copy tests" menu / rename box / remove prompt is open.
  const [copyFor, setCopyFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

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

  useEffect(() => {
    if (!cartDrawerOpen) {
      setCopyFor(null);
      setRenaming(null);
      setConfirmRemove(null);
    }
  }, [cartDrawerOpen]);

  if (!cartDrawerOpen) return null;

  // Start adding tests for this member: make them the active member and go to search.
  function addTestsFor(id: string) {
    setActive(id);
    closeCartDrawer();
    openSearchModal();
  }

  function startRename(m: MemberSummary) {
    setRenaming(m.id);
    setRenameValue(m.label);
  }

  function finishRename(id: string) {
    renameMember(id, renameValue);
    setRenaming(null);
  }

  const blocked = multi && emptyMembers.length > 0;
  const nothing = count === 0 && !multi;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={closeCartDrawer} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        className="relative w-full sm:w-[440px] h-dvh bg-white shadow-xl flex flex-col animate-[cart-drawer-in_0.2s_ease-out]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{multi ? "Your visit" : "Your cart"}</h2>
            {multi && <p className="text-xs text-gray-500">{members.length} members &middot; one address, one time slot</p>}
          </div>
          <div className="flex items-center gap-3">
            {count > 0 && (
              <button onClick={clear} className="text-xs text-gray-500 hover:text-red-600 hover:underline">Clear all</button>
            )}
          <button onClick={closeCartDrawer} aria-label="Close cart" className="text-gray-400 hover:text-gray-700 p-1">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          </div>
        </div>

        {count > 0 && couponsAllowed && <CouponNudge featured={featuredCoupon} />}

        {nothing ? (
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
            <div className="flex-1 min-h-[12rem] overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {members.map((m) => {
                const isActive = m.id === activeId;
                const others = members.filter((o) => o.id !== m.id);
                const lines = cartMembers.find((p) => p.id === m.id)!.lines;
                return (
                  <section
                    key={m.id}
                    aria-label={multi ? `${m.label}'s tests` : "Your tests"}
                    className={`shrink-0 rounded-xl ${multi ? `border-2 ${isActive ? "border-brand" : "border-gray-200"}` : ""}`}
                  >
                    {multi && (
                      <header className={`flex items-start justify-between gap-2 rounded-t-[0.65rem] px-3 py-2 ${isActive ? "bg-brand-light" : "bg-gray-50"}`}>
                        <div className="min-w-0">
                          {renaming === m.id ? (
                            <input
                              autoFocus
                              value={renameValue}
                              maxLength={24}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={() => finishRename(m.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") finishRename(m.id);
                                if (e.key === "Escape") setRenaming(null);
                              }}
                              aria-label="Name for this member"
                              className="w-36 rounded border px-2 py-0.5 text-sm font-semibold"
                            />
                          ) : (
                            <button onClick={() => startRename(m)} title="Tap to rename" className="flex items-center gap-1 text-left font-semibold text-gray-900 hover:text-brand">
                              {m.label}
                              <svg viewBox="0 0 24 24" className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M4 20h4L19 9l-4-4L4 16v4z" strokeLinejoin="round" />
                              </svg>
                            </button>
                          )}
                          <p className="text-xs text-gray-500">
                            {m.count === 0 ? "No tests yet" : `${m.count} item${m.count === 1 ? "" : "s"}`}
                            {isActive && <span className="ml-1.5 rounded bg-brand px-1.5 py-px text-[10px] font-semibold text-white">Adding here</span>}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-bold text-brand-dark">{rs(m.subtotalPrice)}</p>
                          <p className="text-[11px] text-gray-500">{m.count > 0 ? "subtotal" : ""}</p>
                        </div>
                      </header>
                    )}

                    <div className={`flex flex-col gap-2 ${multi ? "p-2" : ""}`}>
                      {m.items.length === 0 && (
                        <div className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-gray-500">
                          Nothing added for {m.label} yet.
                          <div className="mt-2 flex flex-wrap justify-center gap-2">
                            <button onClick={() => addTestsFor(m.id)} className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark">
                              Add tests
                            </button>
                            {others.filter((o) => o.count > 0).map((o) => (
                              <button key={o.id} onClick={() => copyMember(o.id, m.id)} className="rounded-md border border-brand px-3 py-1.5 text-xs font-medium text-brand-dark hover:bg-brand-light">
                                Copy from {o.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {m.items.map((i) => (
                        <div key={`${i.kind}-${i.slug}`} className="border rounded-lg overflow-hidden bg-white">
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
                                onClick={() => remove(i.kind, i.slug, m.id)}
                                aria-label={`Remove ${i.name}${multi ? ` for ${m.label}` : ""} from cart`}
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
                                onChange={(e) => setConsult(i.slug, e.target.checked, m.id)}
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

                      {/* Per-member actions. With one member only "Add tests" makes sense. */}
                      {multi && m.items.length > 0 && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 pt-0.5 text-xs">
                          <button onClick={() => addTestsFor(m.id)} className="font-semibold text-brand hover:underline">+ Add tests</button>
                          <button
                            onClick={() => setCopyFor(copyFor === m.id ? null : m.id)}
                            aria-expanded={copyFor === m.id}
                            className="font-medium text-gray-700 hover:text-brand hover:underline"
                          >
                            Copy these tests to…
                          </button>
                          <button onClick={() => (confirmRemove === m.id ? setConfirmRemove(null) : setConfirmRemove(m.id))} className="ml-auto text-gray-500 hover:text-red-600 hover:underline">
                            Remove {m.label}
                          </button>
                        </div>
                      )}
                      {multi && m.items.length === 0 && (
                        <div className="px-1 text-right text-xs">
                          <button onClick={() => (confirmRemove === m.id ? setConfirmRemove(null) : setConfirmRemove(m.id))} className="text-gray-500 hover:text-red-600 hover:underline">
                            Remove {m.label}
                          </button>
                        </div>
                      )}

                      {copyFor === m.id && (
                        <div className="rounded-lg border bg-white p-2 text-xs shadow-sm">
                          <p className="mb-1 font-medium text-gray-600">Copy {m.label}&apos;s {m.count} item{m.count === 1 ? "" : "s"} to:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {others.map((o) => (
                              <button
                                key={o.id}
                                onClick={() => {
                                  copyMember(m.id, o.id);
                                  setCopyFor(null);
                                }}
                                className="rounded-full border border-gray-300 px-3 py-1 hover:border-brand hover:bg-brand-light"
                              >
                                {o.label}
                              </button>
                            ))}
                            {members.length < MAX_MEMBERS && (
                              <button
                                onClick={() => {
                                  copyToNewMember(m.id);
                                  setCopyFor(null);
                                }}
                                className="rounded-full border border-dashed border-brand px-3 py-1 text-brand-dark hover:bg-brand-light"
                              >
                                + New member
                              </button>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] text-gray-500">Tests they already have are kept; nothing is added twice.</p>
                        </div>
                      )}

                      {confirmRemove === m.id && (
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                          <span>Remove {m.label} and their {m.count} item{m.count === 1 ? "" : "s"}?</span>
                          <span className="flex shrink-0 gap-2">
                            <button
                              onClick={() => {
                                removeMember(m.id);
                                setConfirmRemove(null);
                              }}
                              className="rounded bg-red-600 px-2 py-1 font-semibold text-white"
                            >
                              Remove
                            </button>
                            <button onClick={() => setConfirmRemove(null)} className="rounded border px-2 py-1">Keep</button>
                          </span>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}

              {/* The way into a multi-member visit. */}
              {members.length < MAX_MEMBERS && (
                <button
                  onClick={() => {
                    addMember();
                    closeCartDrawer();
                    openSearchModal();
                  }}
                  className="shrink-0 rounded-xl border-2 border-dashed border-brand/50 px-3 py-3 text-left hover:bg-brand-light"
                >
                  <span className="block text-sm font-semibold text-brand-dark">+ Add another member to this visit</span>
                  <span className="block text-xs text-gray-600">
                    Family at the same address? One visit, one time slot, separate tests for each member.
                  </span>
                </button>
              )}
            </div>

            <div className="shrink-0 border-t px-4 py-2.5 flex flex-col gap-2 bg-white">
              {blocked && (
                <p role="alert" className="rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
                  Add tests for {emptyMembers.map((m) => m.label).join(", ")}, or remove {emptyMembers.length > 1 ? "them" : "this member"}, to continue.
                </p>
              )}
              <div className="bg-brand-light rounded-lg px-3 py-2 flex flex-col gap-0.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{multi ? `Visit total (${members.length} members)` : "MRP total"}</span>
                  <span>
                    {subtotalMrp > subtotalPrice && <span className="line-through text-gray-400 mr-1.5">{rs(subtotalMrp)}</span>}
                    <span className="font-medium text-gray-900">{rs(subtotalPrice)}</span>
                  </span>
                </div>
                {discount > 0 && coupon && (
                  <div className="flex justify-between text-sm text-green-700 font-medium">
                    <span>Coupon ({coupon.code})</span>
                    <span>- {rs(discount)}</span>
                  </div>
                )}
                {collectionCharge > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Collection charges{multi ? " (one visit)" : ""}</span>
                      <span>{rs(collectionCharge)}</span>
                    </div>
                    <p className="text-xs text-gray-500">Add {rs(FREE_COLLECTION_MIN - subtotalPrice)} more to get free home collection.</p>
                  </>
                )}
                <div className="flex justify-between font-bold text-brand-dark text-lg">
                  <span>You pay</span>
                  <span>{rs(total)}</span>
                </div>
                {subtotalMrp > total - collectionCharge && (
                  <div className="flex justify-between text-sm text-brand-accent font-medium">
                    <span>Total savings</span>
                    <span>{rs(subtotalMrp - (total - collectionCharge))}</span>
                  </div>
                )}
              </div>
              <StepActions
                primary={{ label: "Continue", href: "/checkout" }}
                secondary={{
                  label: "Add more tests",
                  onClick: () => {
                    closeCartDrawer();
                    openSearchModal();
                  },
                }}
                disabled={blocked}
                onPrimaryNavigate={closeCartDrawer}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
