// The B2B value of a member's tests at their doctor's discounts (routine tests, special tests and
// packages each have their own percentage, set per doctor). Informational for now: there is no
// automatic invoicing or reconciliation.
import { allTests } from "./catalog";
import type { BookingLineItem } from "./types";

export type Discounts = { routine: number; special: number; package: number };

const testType = new Map(allTests.map((t) => [t.slug, t.type]));

export type B2BLine = { kind: "routine" | "special" | "package"; list: number; pct: number; payable: number };

export function b2bBreakdown(items: BookingLineItem[], d: Discounts): { lines: B2BLine[]; list: number; payable: number } {
  const totals = { routine: 0, special: 0, package: 0 };
  for (const i of items) {
    const kind = i.kind === "package" ? "package" : testType.get(i.slug) === "Routine" ? "routine" : "special";
    totals[kind] += i.price * i.qty;
  }
  const lines: B2BLine[] = (Object.keys(totals) as (keyof typeof totals)[])
    .filter((k) => totals[k] > 0)
    .map((k) => ({ kind: k, list: totals[k], pct: d[k], payable: Math.round(totals[k] * (1 - d[k] / 100)) }));
  return { lines, list: lines.reduce((s, l) => s + l.list, 0), payable: lines.reduce((s, l) => s + l.payable, 0) };
}
