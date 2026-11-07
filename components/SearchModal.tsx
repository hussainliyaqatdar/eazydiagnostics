"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { allPackages, getFrequentlyPrescribedTests, getPackageCategories, search, displayAliases } from "@/lib/catalog";
import { useCartSummary } from "@/lib/cart-context";
import { useUI } from "@/lib/ui-context";
import AddToCartButton from "./AddToCartButton";
import type { TestItem } from "@/lib/types";

const RESULT_LIMIT = 30; // cap on the default (not searching) package list
// Sorted with "Full Body Checkups" first (see lib/catalog.ts's PRIORITY_CATEGORIES) -
// that ordering is also what makes it the sub-tab's default selection below.
const PACKAGE_CATEGORIES = getPackageCategories();

const ClockIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
  </svg>
);

type Row = { kind: "test" | "package"; slug: string; name: string; price: number; mrp: number | null; eta: string; sub?: string; aka?: string };

function testRow(t: TestItem): Row {
  const aka = displayAliases(t).join(", ");
  return { kind: "test", slug: t.slug, name: t.name, price: t.price, mrp: t.mrp, eta: t.eta, sub: t.category, aka: aka || undefined };
}

export default function SearchModal() {
  const { searchModalOpen, closeSearchModal, openCartDrawer } = useUI();
  const { count, total, discount, coupon } = useCartSummary();
  const [tab, setTab] = useState<"tests" | "packages">("tests");
  const [query, setQuery] = useState("");
  const [packageCategory, setPackageCategory] = useState(PACKAGE_CATEGORIES[0]);

  useEffect(() => {
    if (!searchModalOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeSearchModal();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [searchModalOpen, closeSearchModal]);

  useEffect(() => {
    if (searchModalOpen) setQuery("");
  }, [searchModalOpen]);

  const searching = query.trim().length >= 1;

  // While searching, look across every test and package (no category filter)
  // so the counts on the two tabs are the full number of matches.
  const matches = useMemo(() => (searching ? search(query, Infinity) : []), [searching, query]);
  const counts = useMemo(
    () => ({ tests: matches.filter((m) => m.kind === "test").length, packages: matches.filter((m) => m.kind === "package").length }),
    [matches]
  );

  const rows: Row[] = useMemo(() => {
    const kind = tab === "tests" ? "test" : "package";
    if (searching) {
      return matches
        .filter((r) => r.kind === kind)
        .map((r) =>
          r.kind === "test"
            ? testRow(r.item)
            : { kind: "package" as const, slug: r.item.slug, name: r.item.name, price: r.item.price, mrp: r.item.mrp, eta: r.item.eta, sub: r.item.tagline }
        );
    }
    if (kind === "test") {
      // Tests doctors prescribe most often (Agilus' "CC SPRF" list) lead the
      // default listing - shown in full rather than capped to RESULT_LIMIT.
      return getFrequentlyPrescribedTests().map(testRow);
    }
    return allPackages
      .filter((p) => !p.needsContent && p.category === packageCategory)
      .slice(0, RESULT_LIMIT)
      .map((p) => ({ kind: "package" as const, slug: p.slug, name: p.name, price: p.price, mrp: p.mrp, eta: p.eta, sub: p.tagline }));
  }, [tab, searching, matches, packageCategory]);

  if (!searchModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={closeSearchModal} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search tests and packages"
        className="relative bg-white w-full h-dvh sm:h-auto sm:max-h-[85vh] sm:max-w-xl sm:rounded-xl shadow-xl flex flex-col animate-[search-modal-in_0.15s_ease-out]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Search tests and packages</h2>
          <button onClick={closeSearchModal} aria-label="Close search" className="text-gray-400 hover:text-gray-700 p-1">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 pt-3 shrink-0 flex flex-col gap-3">
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "tests" ? "Search tests (e.g. Thyroid, Vitamin D, NIPT)" : "Search packages (e.g. Full Body Checkup, PCOS)"}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
            aria-label="Search"
          />
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {(["tests", "packages"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition capitalize ${
                  tab === t ? "bg-white text-brand-dark shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t}
                {searching && (
                  <span
                    aria-label={`${counts[t]} ${t} found`}
                    className={`ml-1.5 inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                      counts[t] > 0 ? "bg-brand text-white" : "bg-gray-300 text-gray-600"
                    }`}
                  >
                    {counts[t]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === "packages" && !searching && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Package category">
              {PACKAGE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  role="tab"
                  aria-selected={packageCategory === c}
                  onClick={() => setPackageCategory(c)}
                  className={`shrink-0 px-3 py-1 rounded-full border text-xs font-medium whitespace-nowrap transition ${
                    packageCategory === c ? "bg-brand text-white border-brand" : "bg-white text-gray-600 border-gray-300 hover:border-brand"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 min-h-0">
          {rows.length === 0 && (
            <p className="text-sm text-gray-500 py-8 text-center">
              {searching
                ? `No ${tab} match "${query}". Try a shorter or more general term.`
                : `No packages in ${packageCategory} yet.`}
            </p>
          )}
          {rows.map((r) => (
            <div key={`${r.kind}-${r.slug}`} className="border rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Link href={r.kind === "test" ? `/tests/${r.slug}` : `/packages/${r.slug}`} onClick={closeSearchModal} className="font-medium text-gray-900 hover:text-brand truncate block">
                  {r.name}
                </Link>
                {r.aka ? (
                  <p className="text-xs text-gray-500 truncate">
                    <span className="font-medium">Also known as:</span> {r.aka}
                  </p>
                ) : (
                  r.sub && <p className="text-xs text-gray-500 truncate">{r.sub}</p>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                  <ClockIcon />
                  <span>Reports in {r.eta}</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-bold text-brand-dark text-sm">Rs. {r.price.toLocaleString("en-IN")}</span>
                  {r.mrp !== null && r.mrp > r.price && (
                    <span className="text-xs text-gray-400 line-through">Rs. {r.mrp.toLocaleString("en-IN")}</span>
                  )}
                </div>
              </div>
              <AddToCartButton kind={r.kind} slug={r.slug} />
            </div>
          ))}
        </div>

        {count > 0 && (
          <div className="shrink-0 border-t px-4 py-3 flex items-center justify-between gap-3 bg-brand-light">
            <div className="text-sm">
              <span className="font-bold text-brand-dark">{count} item{count > 1 ? "s" : ""}</span>
              <span className="text-gray-600"> &middot; Rs. {total.toLocaleString("en-IN")}</span>
              {discount > 0 && coupon && <span className="block text-xs text-green-700">{coupon.code} applied</span>}
            </div>
            <button
              onClick={() => {
                closeSearchModal();
                openCartDrawer();
              }}
              className="bg-brand text-white px-5 py-2.5 rounded-md font-medium hover:bg-brand-dark transition text-sm"
            >
              View Cart →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
