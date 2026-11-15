"use client";
import { useEffect, useRef, useState } from "react";
import type { PackageItem } from "@/lib/types";
import { useCart } from "@/lib/cart-context";
import { useUI } from "@/lib/ui-context";
import {
  CANCER_MARKER,
  CANCER_MARKER_PLANS,
  COMPARE_FOOTNOTE,
  COMPARE_PLANS,
  COMPARE_ROWS,
  type ComparePlan,
  type Gender,
  type PlanId,
} from "@/lib/checkup-compare";
import { CONSULT_DOCTORS, doctorInitials } from "@/lib/consult-doctors";
import { quoteOffer } from "@/lib/consult-offers";
import { OrganBadge } from "./OrganIcon";

// "addon": plain package prices; the cart then offers a +Rs. 500 consultation.
// "included": every plan bundles the consultation, at a higher bundled price
// (see bundledPrice in lib/consult-offers). On both, the doctor is chosen at checkout.
export type ComparisonVariant = "addon" | "included";

// The plan columns and the pinned bar share these widths, so the bar lines up
// with the table however far it is scrolled sideways.
const GRID_COLS = "grid-cols-[9.5rem_repeat(5,minmax(0,1fr))] sm:grid-cols-[11.5rem_repeat(5,minmax(0,1fr))]";
const MIN_WIDTH = "min-w-[700px]";

function rupees(n: number) {
  return `Rs. ${n.toLocaleString("en-IN")}`;
}

function joinNames(names: string[]) {
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// A plan column's header: full name, price and a select button. `compact` is
// the shortened version (name + price) used in the bar pinned while scrolling.
function PlanButton({
  plan,
  display,
  selected,
  included,
  compact = false,
  onSelect,
}: {
  plan: ComparePlan;
  display: { price: number; mrp: number } | null;
  selected: boolean;
  included: boolean;
  compact?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`group h-full w-full rounded-lg border bg-white px-1.5 text-center transition hover:border-brand ${compact ? "py-1" : "py-2"} ${
        selected ? "border-brand ring-2 ring-brand" : "border-gray-200"
      }`}
    >
      <span className="block text-[10px] leading-tight text-gray-500">Full Body Checkup</span>
      <span className="block font-bold leading-tight text-gray-900">{plan.name}</span>
      {!compact && <span className="block text-xs text-gray-500">{plan.parameters} parameters</span>}
      {display && (
        <>
          {!compact && <span className="mt-1 block text-xs text-gray-400 line-through">{rupees(display.mrp)}</span>}
          <span className="block text-sm font-bold text-brand-dark sm:text-base">{rupees(display.price)}</span>
        </>
      )}
      {included && !compact && <span className="block text-[11px] font-medium text-brand-accent">incl. consultation</span>}
      {/* A filled button, so it is clear the whole card can be tapped to choose it. */}
      <span
        className={`block rounded-md font-semibold text-white transition ${
          compact ? "mt-1 px-1 py-0.5 text-[11px]" : "mt-2 px-2 py-1.5 text-xs sm:text-sm"
        } ${selected ? "bg-brand-dark" : "bg-brand group-hover:bg-brand-dark"}`}
      >
        {selected ? (
          <>&#10003; Selected</>
        ) : compact ? (
          "Select"
        ) : (
          <>
            <span className="sm:hidden">Select</span>
            <span className="hidden sm:inline">Select package</span>
          </>
        )}
      </span>
    </button>
  );
}

// Shown on the "included" page: what the bundled consultation is and who it is with.
function IncludedConsultCard() {
  return (
    <section aria-label="Follow-up doctor consultation" className="rounded-2xl border-2 border-brand bg-brand-light p-4 md:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">Included in every plan</p>
          <h2 className="text-lg font-bold text-gray-900">Follow-up doctor consultation included</h2>
          <p className="text-sm text-gray-700">
            Go through your report with a doctor. You'll choose your doctor at checkout, and we'll send you a WhatsApp link to schedule it once
            your report is ready.
          </p>
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Doctors">
        {CONSULT_DOCTORS.map((d) => (
          <li key={d.id} className="flex items-center gap-2 rounded-full border bg-white py-1 pl-1 pr-3 text-xs text-gray-700">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white" aria-hidden="true">
              {doctorInitials(d.name)}
            </span>
            <span>
              <span className="font-semibold text-gray-900">{d.name}</span> &middot; {d.qualification}, {d.experience}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// `packages`: the packages the plans point to (the page looks them up in the catalog and passes them in).
export default function PackageComparison({ variant, packages }: { variant: ComparisonVariant; packages: PackageItem[] }) {
  const PACKAGE_BY_SLUG = new Map(packages.map((p) => [p.slug, p]));
  const { addWithOffer } = useCart();
  const { openCartDrawer } = useUI();
  const included = variant === "included";

  const [gender, setGender] = useState<Gender>("men");
  const [planId, setPlanId] = useState<PlanId | null>(null);

  // Pinned plan bar: once the table's own header has scrolled away, a compact
  // copy (plan name + price) is shown fixed just under the site header, so you
  // keep the context while reading down the parameters. It is a separate fixed
  // element - not the header made sticky - so the page below never jumps. The
  // site header's height varies (coupon banner, open mobile menu), so measure it.
  const [siteHeaderH, setSiteHeaderH] = useState(0);
  const [pinned, setPinned] = useState(false);
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const pinnedScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const siteHeader = document.querySelector("header");
    if (!siteHeader) return;
    const update = () => setSiteHeaderH(Math.round(siteHeader.getBoundingClientRect().height));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(siteHeader);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const check = () => {
      const head = theadRef.current;
      const body = bodyScrollRef.current;
      if (!head || !body) return setPinned(false);
      // Show the bar while the table's header is above the site header and the
      // end of the table is still far enough down to leave room for the bar.
      setPinned(head.getBoundingClientRect().bottom <= siteHeaderH && body.getBoundingClientRect().bottom > siteHeaderH + 80);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [siteHeaderH]);

  // A freshly shown pinned bar starts at the table's current sideways position.
  useEffect(() => {
    if (pinned && pinnedScrollRef.current && bodyScrollRef.current) pinnedScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft;
  }, [pinned]);

  // The pinned bar and the table scroll sideways together, from either one.
  // Setting `to` fires its own scroll event, which finds the two already equal and stops.
  function syncScroll(from: HTMLDivElement | null, to: HTMLDivElement | null) {
    if (!from || !to || Math.abs(to.scrollLeft - from.scrollLeft) < 1) return;
    to.scrollLeft = from.scrollLeft;
  }

  const plans = COMPARE_PLANS.map((plan) => {
    const slug = plan.slugs[gender];
    const pkg = PACKAGE_BY_SLUG.get(slug);
    // Column prices are the package alone (add-on page) or with the bundled
    // consultation (included page).
    const display = pkg ? quoteOffer(pkg, variant, false) : null;
    return { plan, slug, pkg, display };
  });
  const selected = plans.find((p) => p.plan.id === planId) ?? null;

  // The catalog name (e.g. "Full Body Checkup - Pro Max (Men)") is what the cart shows too.
  const fullName = selected ? (selected.pkg?.name ?? `Full Body Checkup ${selected.plan.name}`) : "";

  const footnotes = COMPARE_ROWS.filter((r) => r.altNote).map((r) => {
    const names = COMPARE_PLANS.filter((_, i) => r.cells[i] === "alt").map((p) => p.name);
    return `${r.label} in ${joinNames(names)}: ${r.altNote}.`;
  });

  function addToCart() {
    if (!selected) return;
    addWithOffer(selected.slug, { variant });
    openCartDrawer();
  }

  return (
    <div className={`flex flex-col gap-8 ${selected ? "pb-28" : "pb-8"}`}>
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Exclusive Full Body Checkup Packages</h1>
        <p className="max-w-2xl text-gray-700">
          {included
            ? "Pick the checkup that fits you. Every plan includes a follow-up consultation with a doctor to go through your report."
            : "Pick the checkup that fits you and see exactly what each plan covers."}
        </p>
        <ul className="flex flex-wrap gap-2 text-xs font-medium text-brand-dark">
          <li className="rounded-full bg-brand-light px-3 py-1">No home collection charges</li>
          <li className="rounded-full bg-brand-light px-3 py-1">Pay only after collection</li>
          {included && <li className="rounded-full bg-brand-light px-3 py-1">Doctor consultation included</li>}
        </ul>
      </div>

      {included && <IncludedConsultCard />}

      <section aria-labelledby="who-for" className="flex flex-wrap items-center gap-3">
        <h2 id="who-for" className="text-sm font-semibold text-gray-900">
          Checkup for
        </h2>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1" role="group" aria-label="Checkup for">
          {(["men", "women"] as const).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={gender === g}
              onClick={() => setGender(g)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition ${
                gender === g ? "bg-white text-brand-dark shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">Pro Max and Ultra add one cancer marker that depends on this.</p>
      </section>

      <section aria-label="Plan comparison" className="flex flex-col gap-2">
        <p className="text-xs text-gray-500 sm:hidden">Swipe sideways to compare all plans &rarr;</p>

        <div
          ref={bodyScrollRef}
          onScroll={() => syncScroll(bodyScrollRef.current, pinnedScrollRef.current)}
          className="overflow-x-auto rounded-xl border bg-white"
        >
          <table className={`w-full ${MIN_WIDTH} table-fixed border-collapse text-sm`}>
            <caption className="sr-only">Tests included in each Full Body Checkup package</caption>
            <colgroup>
              <col className="w-[9.5rem] sm:w-[11.5rem]" />
              {COMPARE_PLANS.map((plan) => (
                <col key={plan.id} />
              ))}
            </colgroup>
            <thead ref={theadRef}>
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-white p-2 text-left align-bottom text-xs font-semibold uppercase tracking-wide text-gray-500 sm:p-3">
                  Tests
                </th>
                {plans.map(({ plan, display }) => (
                  <th key={plan.id} scope="col" className={`p-1.5 align-top font-normal ${plan.id === planId ? "bg-brand-light" : ""}`}>
                    <PlanButton plan={plan} display={display} selected={plan.id === planId} included={included} onSelect={() => setPlanId(plan.id)} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.label} className="border-t first:border-t-0">
                  <th scope="row" className="sticky left-0 z-10 bg-white p-2 text-left font-medium text-gray-900 sm:p-3">
                    <span className="flex items-center gap-2">
                      <OrganBadge name={row.organ} />
                      <span className="min-w-0">
                        {row.label}
                        <span className="block text-xs font-normal text-gray-500">{row.hint}</span>
                      </span>
                    </span>
                  </th>
                  {row.cells.map((cell, i) => (
                    <td key={COMPARE_PLANS[i].id} className={`px-2 py-2.5 text-center ${COMPARE_PLANS[i].id === planId ? "bg-brand-light/60" : ""}`}>
                      {cell === "no" ? (
                        <span className="text-gray-300" aria-label="Not included">
                          &#10005;
                        </span>
                      ) : (
                        <span className="font-bold text-green-600" aria-label={cell === "alt" ? "Included, see note" : "Included"}>
                          &#10003;
                          {cell === "alt" && <sup className="ml-0.5 text-brand-accent">&#9830;</sup>}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              <tr className="border-t">
                <th scope="row" className="sticky left-0 z-10 bg-white p-2 text-left font-medium text-gray-900 sm:p-3">
                  <span className="flex items-center gap-2">
                    <OrganBadge name="ribbon" />
                    <span className="min-w-0">
                      Cancer marker
                      <span className="block text-xs font-normal text-gray-500">{gender === "men" ? "For men" : "For women"}</span>
                    </span>
                  </span>
                </th>
                {COMPARE_PLANS.map((plan) => (
                  <td key={plan.id} className={`px-2 py-2.5 text-center ${plan.id === planId ? "bg-brand-light/60" : ""}`}>
                    {CANCER_MARKER_PLANS.includes(plan.id) ? (
                      <span className="text-xs font-semibold text-green-700">{CANCER_MARKER[gender]}</span>
                    ) : (
                      <span className="text-gray-300" aria-label="Not included">
                        &#10005;
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {included && (
                <tr className="border-t bg-orange-50/40">
                  <th scope="row" className="sticky left-0 z-10 bg-orange-50 p-2 text-left font-medium text-gray-900 sm:p-3">
                    <span className="flex items-center gap-2">
                      <OrganBadge name="doctor" />
                      <span className="min-w-0">
                        Follow-up doctor consultation
                        <span className="block text-xs font-normal text-gray-500">Included</span>
                      </span>
                    </span>
                  </th>
                  {COMPARE_PLANS.map((plan) => (
                    <td key={plan.id} className={`px-2 py-2.5 text-center ${plan.id === planId ? "bg-brand-light/60" : ""}`}>
                      <span className="font-bold text-green-600" aria-label="Included">
                        &#10003;
                      </span>
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ul className="flex flex-col gap-0.5 text-xs text-gray-500">
          {footnotes.map((f) => (
            <li key={f}>
              <sup className="text-brand-accent">&#9830;</sup> {f}
            </li>
          ))}
          <li>{COMPARE_FOOTNOTE}</li>
        </ul>
      </section>

      {pinned && (
        <div className="fixed inset-x-0 z-20" style={{ top: siteHeaderH }}>
          <div className="mx-auto max-w-6xl px-4">
            <div
              ref={pinnedScrollRef}
              onScroll={() => syncScroll(pinnedScrollRef.current, bodyScrollRef.current)}
              className="overflow-x-auto rounded-b-xl border border-t-0 bg-white shadow-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div role="group" aria-label="Choose a plan" className={`grid w-full ${MIN_WIDTH} ${GRID_COLS}`}>
                <div className="sticky left-0 z-10 flex items-end bg-white p-2 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:p-3">
                  Plans
                </div>
                {plans.map(({ plan, display }) => (
                  <div key={plan.id} className={`p-1.5 ${plan.id === planId ? "bg-brand-light" : ""}`}>
                    <PlanButton plan={plan} display={display} selected={plan.id === planId} included={included} compact onSelect={() => setPlanId(plan.id)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selected?.display && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-semibold leading-tight text-gray-900">
                {fullName}
                {included ? " + consultation" : ""}
              </p>
              <p className="flex items-baseline gap-2 whitespace-nowrap">
                <span className="text-lg font-bold text-brand-dark">{rupees(selected.display.price)}</span>
                <span className="text-xs text-gray-400 line-through">{rupees(selected.display.mrp)}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={addToCart}
              className="shrink-0 rounded-md bg-brand px-5 py-3 font-medium text-white transition hover:bg-brand-dark"
            >
              Add to cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
