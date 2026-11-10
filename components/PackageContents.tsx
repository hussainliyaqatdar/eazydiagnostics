"use client";
import { useState } from "react";
import { getPackageBySlug, getTestBySlug } from "@/lib/catalog";
import type { PackageConstituent } from "@/lib/types";

// How many included tests show before "+N more".
const VISIBLE = 6;

// The short name a patient or doctor knows a test by ("KFT", "Lp(a)", "HbA1c"):
// the shortest alias that reads like a name, else the catalog name tidied up.
export function includedTestLabel(c: PackageConstituent): string {
  const test = c.slug ? getTestBySlug(c.slug) : undefined;
  const aliases = (test?.aliases ?? []).filter((a) => a.length >= 2 && a.length <= 16 && a.split(/\s+/).length <= 2);
  if (aliases.length > 0) return aliases.reduce((best, a) => (a.length < best.length ? a : best));
  // "Kidney Function Test (KFT)" -> "KFT"; "Cortisol, Serum" -> "Cortisol"
  const paren = c.name.match(/\(([^)]{2,12})\)\s*$/);
  if (paren) return paren[1];
  return c.name.replace(/,\s*(serum|plasma|blood|urine|edta whole blood)(\/\w+)?$/i, "").trim();
}

// The tests a package includes, as bullets, so a patient or doctor can see what is in it
// without opening the page. Long lists are cut after a few and expand in place.
export default function PackageContents({ slug, className = "" }: { slug: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const pkg = getPackageBySlug(slug);
  if (!pkg || pkg.constituents.length === 0) return null;

  const items = pkg.constituents;
  const shown = open ? items : items.slice(0, VISIBLE);
  const hidden = items.length - VISIBLE;

  return (
    <div className={`text-xs ${className}`}>
      <p className="font-medium text-gray-700">Includes {items.length} test{items.length === 1 ? "" : "s"}:</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-gray-600 sm:columns-2 sm:gap-x-4">
        {shown.map((c) => (
          <li key={c.name} title={c.name} className="break-inside-avoid">
            {includedTestLabel(c)}
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mt-1 font-medium text-brand hover:underline"
        >
          {open ? "Show less" : `+${hidden} more test${hidden === 1 ? "" : "s"} - view all`}
        </button>
      )}
    </div>
  );
}
