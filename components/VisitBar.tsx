"use client";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { useUI } from "@/lib/ui-context";
import { useCartSummary } from "@/lib/cart-context";
import MemberSwitcher from "./MemberSwitcher";

// While a visit has more than one member, a bar pinned to the bottom of every
// page says whose cart the "Add" buttons are filling and lets you switch, so
// nobody has to open the cart to change it. Hidden while the cart or search is open
// (they have their own switchers) and when there is only one member.
export default function VisitBar() {
  const { members } = useCart();
  const { total, count } = useCartSummary();
  const { cartDrawerOpen, searchModalOpen, openCartDrawer } = useUI();

  const pathname = usePathname();

  // Once the customer has moved on from the cart (checkout, confirmation) the
  // visit is settled, so the bar goes away.
  if (members.length < 2 || cartDrawerOpen || searchModalOpen || pathname.startsWith("/checkout") || pathname.startsWith("/confirmation")) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
        <MemberSwitcher className="min-w-0 flex-1" />
        <button
          onClick={openCartDrawer}
          className="shrink-0 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
        >
          Visit &middot; {members.length} members &middot; {count} item{count === 1 ? "" : "s"} &middot; Rs. {total.toLocaleString("en-IN")}
        </button>
      </div>
    </div>
  );
}
