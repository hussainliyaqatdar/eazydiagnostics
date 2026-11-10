"use client";
import { useState } from "react";
import { getPackageBySlug } from "@/lib/catalog";

// How many included tests show before "view all".
const VISIBLE = 4;

// The tests a package includes, as bullets with the full test name and its alias in brackets (the same
// wording as "What's included" on the package page). Long lists are cut after a few and expand in place.
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
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-gray-600">
        {shown.map((c) => (
          <li key={c.name}>{c.name}</li>
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
