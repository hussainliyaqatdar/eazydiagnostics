// The B2B value of a member's tests at their doctor's discounts (routine tests, special tests and
// packages each have their own percentage, set per doctor). A custom panel has its own B2B price instead
// (set on the panel), which is used as it is. Informational for now: there is no automatic invoicing or
// reconciliation.
import type { BookingLineItem } from "./types";

export type Discounts = { routine: number; special: number; package: number };

export type B2BLine = { kind: "routine" | "special" | "package" | "custom"; list: number; pct: number; payable: number };

// `testTypeOf` says whether a test (by slug) is "Routine" or "Specialised": take it from the catalog
// (`(slug) => catalog.getTest(slug)?.type`).
export function b2bBreakdown(items: BookingLineItem[], d: Discounts, testTypeOf: (slug: string) => string | undefined): { lines: B2BLine[]; list: number; payable: number } {
  const totals = { routine: 0, special: 0, package: 0 };
  let customList = 0;
  let customPayable = 0;
  for (const i of items) {
    if (i.b2bPrice !== undefined) {
      customList += i.price * i.qty;
      customPayable += i.b2bPrice * i.qty;
      continue;
    }
    const kind = i.kind === "package" ? "package" : testTypeOf(i.slug) === "Routine" ? "routine" : "special";
    totals[kind] += i.price * i.qty;
  }
  const lines: B2BLine[] = (Object.keys(totals) as (keyof typeof totals)[])
    .filter((k) => totals[k] > 0)
    .map((k) => ({ kind: k, list: totals[k], pct: d[k], payable: Math.round(totals[k] * (1 - d[k] / 100)) }));
  if (customList > 0) lines.push({ kind: "custom", list: customList, pct: Math.round((1 - customPayable / customList) * 100), payable: customPayable });
  return { lines, list: lines.reduce((s, l) => s + l.list, 0), payable: lines.reduce((s, l) => s + l.payable, 0) };
}
