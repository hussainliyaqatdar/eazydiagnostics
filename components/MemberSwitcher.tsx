"use client";
import { MAX_MEMBERS, useCart } from "@/lib/cart-context";

// "Adding for: [You] [Priya] [+ Add member]" - the chips that say whose cart
// the next test or package goes into. Used in the search modal and in the bar
// pinned to the bottom of the page while a visit has more than one member.
export default function MemberSwitcher({ onAddMember, className = "" }: { onAddMember?: () => void; className?: string }) {
  const { members, activeId, setActive, addMember } = useCart();

  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`} role="tablist" aria-label="Who are you adding tests for?">
      <span className="shrink-0 text-xs font-medium text-gray-500">Adding for:</span>
      {members.map((m) => {
        const selected = m.id === activeId;
        const n = m.lines.reduce((s, l) => s + l.qty, 0);
        return (
          <button
            key={m.id}
            role="tab"
            aria-selected={selected}
            onClick={() => setActive(m.id)}
            className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition ${
              selected ? "bg-brand text-white border-brand" : "bg-white text-gray-700 border-gray-300 hover:border-brand"
            }`}
          >
            {m.label}
            {n > 0 && (
              <span className={`inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold ${selected ? "bg-white/25" : "bg-gray-200 text-gray-700"}`}>
                {n}
              </span>
            )}
          </button>
        );
      })}
      {members.length < MAX_MEMBERS && (
        <button
          onClick={() => {
            addMember();
            onAddMember?.();
          }}
          className="shrink-0 rounded-full border border-dashed border-brand px-3 py-1 text-xs font-medium text-brand-dark whitespace-nowrap hover:bg-brand-light"
        >
          + Add member
        </button>
      )}
    </div>
  );
}
