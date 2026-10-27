"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { AffiliateDoctor } from "@/lib/affiliate-doctors";

export type ReferralValue = { doctorId?: string; name: string };

// Searchable dropdown of registered affiliate doctors (name + clinic). Anything
// typed that isn't in the list is kept as free text, so a patient can still name
// a doctor we don't know yet.
export default function ReferralCombobox({ value, onChange }: { value: ReferralValue; onChange: (v: ReferralValue) => void }) {
  const [doctors, setDoctors] = useState<AffiliateDoctor[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    fetch("/api/affiliate-doctors").then((r) => r.json()).then(setDoctors).catch(() => setDoctors([]));
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const query = value.name.trim().toLowerCase();
  const matches = useMemo(
    () => doctors.filter((d) => !query || d.name.toLowerCase().includes(query) || d.clinic.toLowerCase().includes(query)),
    [doctors, query]
  );
  // Offer the typed text as its own option unless it already is a doctor's name.
  const showCustom = query !== "" && !doctors.some((d) => d.name.toLowerCase() === query);
  const optionCount = matches.length + (showCustom ? 1 : 0);

  function pick(d: AffiliateDoctor) {
    onChange({ doctorId: d.id, name: d.name });
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, optionCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      if (active < matches.length) pick(matches[active]);
      else setOpen(false); // the "use what I typed" option - text is already set
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        maxLength={80}
        placeholder="Search your doctor, or type a name"
        value={value.name}
        onChange={(e) => {
          // Typing makes it free text again until a list option is picked.
          onChange({ name: e.target.value });
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-full border rounded-md px-3 py-2 text-sm"
      />
      {open && optionCount > 0 && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow-lg">
          {matches.map((d, i) => (
            <li
              key={d.id}
              role="option"
              aria-selected={value.doctorId === d.id}
              onMouseDown={(e) => { e.preventDefault(); pick(d); }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-brand-light" : ""}`}
            >
              <span className="block font-medium text-gray-900">{d.name}</span>
              <span className="block text-xs text-gray-500">{d.clinic}</span>
            </li>
          ))}
          {showCustom && (
            <li
              role="option"
              aria-selected={false}
              onMouseDown={(e) => { e.preventDefault(); setOpen(false); }}
              onMouseEnter={() => setActive(matches.length)}
              className={`cursor-pointer border-t px-3 py-2 text-sm text-gray-700 ${active === matches.length ? "bg-brand-light" : ""}`}
            >
              Use &ldquo;{value.name.trim()}&rdquo;
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
