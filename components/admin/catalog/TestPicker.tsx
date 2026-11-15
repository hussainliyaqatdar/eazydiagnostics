"use client";
import { useMemo, useState } from "react";
import { inputClass } from "../api";

export type PickableTest = { slug: string; name: string; code: string; price: number; active?: boolean };
// `code` here is what the admin searches and sees: our internal id and the current lab's id for the test.

// Chooses the tests a package or panel includes: search the catalog (by name or test code) and add, remove with one click.
export default function TestPicker({ all, value, onChange }: { all: PickableTest[]; value: string[]; onChange: (slugs: string[]) => void }) {
  const [q, setQ] = useState("");
  const bySlug = useMemo(() => new Map(all.map((t) => [t.slug, t])), [all]);
  const chosen = new Set(value);
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return all.filter((t) => !chosen.has(t.slug) && (t.name.toLowerCase().includes(needle) || t.code.toLowerCase().includes(needle))).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, all, value]);
  const total = value.reduce((s, slug) => s + (bySlug.get(slug)?.price ?? 0), 0);

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-center justify-between text-xs font-medium text-gray-600">
        <span>Tests included ({value.length})</span>
        <span className="font-normal text-gray-500">Separate prices add up to Rs. {total.toLocaleString("en-IN")}</span>
      </div>
      {value.length > 0 ? (
        <ul className="flex max-h-44 flex-col gap-1 overflow-y-auto">
          {value.map((slug) => {
            const t = bySlug.get(slug);
            return (
              <li key={slug} className="flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1 text-xs">
                <span className="min-w-0 truncate">
                  {t?.name ?? slug} {t && <span className="font-mono text-gray-400">{t.code}</span>}
                  {t && t.active === false && <span className="ml-1 text-amber-700">(inactive)</span>}
                </span>
                <button type="button" onClick={() => onChange(value.filter((s) => s !== slug))} className="shrink-0 text-gray-500 hover:text-red-600" aria-label={`Remove ${t?.name ?? slug}`}>
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-gray-500">No tests yet. Search below to add some.</p>
      )}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a test to add (name or test code)" className={inputClass} aria-label="Search tests to add" />
      {matches.length > 0 && (
        <ul className="flex flex-col divide-y rounded-md border">
          {matches.map((t) => (
            <li key={t.slug}>
              <button
                type="button"
                onClick={() => {
                  onChange([...value, t.slug]);
                  setQ("");
                }}
                className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-xs hover:bg-brand-light"
              >
                <span className="min-w-0 truncate">
                  {t.name} <span className="font-mono text-gray-400">{t.code}</span>
                </span>
                <span className="shrink-0 text-gray-500">Rs. {t.price.toLocaleString("en-IN")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
