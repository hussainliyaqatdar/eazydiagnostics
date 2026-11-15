"use client";
import { useMemo, useState } from "react";
import PackagesPanel, { type DoctorOption } from "./PackagesPanel";
import TestsPanel from "./TestsPanel";
import LabsPanel from "./LabsPanel";
import type { LabSummary } from "@/lib/catalog-store";
import { inputClass } from "../api";
import type { PackageItem, TestItem } from "@/lib/types";

type Tab = "tests" | "packages" | "panels" | "labs";

// /admin/catalog: the tests, the standard packages, and each doctor's custom panels.
export default function CatalogAdmin({ tests, packages, doctors, labs }: { tests: TestItem[]; packages: PackageItem[]; doctors: DoctorOption[]; labs: LabSummary[] }) {
  const currentLab = labs.find((l) => l.isCurrent);
  const lab = currentLab ? { id: currentLab.id, name: currentLab.name } : null;
  const [tab, setTab] = useState<Tab>("tests");
  const standard = useMemo(() => packages.filter((p) => !p.custom), [packages]);
  const customs = useMemo(() => packages.filter((p) => p.custom), [packages]);
  // Doctors who already have panels come first in the picker.
  const ordered = useMemo(() => [...doctors].sort((a, b) => Number(customs.some((p) => p.ownerDoctorId === b.id)) - Number(customs.some((p) => p.ownerDoctorId === a.id)) || a.name.localeCompare(b.name)), [doctors, customs]);
  const [doctorId, setDoctorId] = useState(ordered[0]?.id ?? "");
  const doctor = ordered.find((d) => d.id === doctorId);
  const pickable = useMemo(() => tests.map((t) => ({ slug: t.slug, name: t.name, code: [t.id, t.externalId].filter(Boolean).join(" "), price: t.price, active: t.active })), [tests]);
  const testCategories = useMemo(() => Array.from(new Set(tests.map((t) => t.category))).sort(), [tests]);
  const packageCategories = useMemo(() => Array.from(new Set(standard.map((p) => p.category))).sort(), [standard]);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "tests", label: "Tests", count: tests.length },
    { id: "packages", label: "Packages", count: standard.length },
    { id: "panels", label: "Doctor panels", count: customs.length },
    { id: "labs", label: "Partner labs", count: labs.length },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Catalog" className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${tab === t.id ? "bg-white text-brand-dark shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            {t.label} <span className="ml-1 text-xs text-gray-400">{t.count}</span>
          </button>
        ))}
      </div>

      {tab === "tests" && <TestsPanel tests={tests} categories={testCategories} lab={lab} />}
      {tab === "packages" && <PackagesPanel packages={standard} standard={standard} tests={pickable} categories={packageCategories} lab={lab} />}
      {tab === "labs" && <LabsPanel labs={labs} />}
      {tab === "panels" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">
            A custom panel is made for one doctor&apos;s patients and appears only on that doctor&apos;s own affiliate link. Make one from a standard package, give it the doctor&apos;s own name, and set the patient price and the B2B price.
          </p>
          {doctors.length === 0 ? (
            <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-600">No doctors yet. Register a doctor first (Clinics &amp; doctors).</p>
          ) : (
            <>
              <label className="flex max-w-md flex-col gap-1 text-xs font-medium text-gray-600">
                Doctor
                <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={inputClass} aria-label="Doctor">
                  {ordered.map((d) => {
                    const n = customs.filter((p) => p.ownerDoctorId === d.id).length;
                    return <option key={d.id} value={d.id}>{d.name} - {d.clinic}{n ? ` (${n} panel${n === 1 ? "" : "s"})` : ""}</option>;
                  })}
                </select>
              </label>
              {doctor && <PackagesPanel key={doctor.id} packages={customs.filter((p) => p.ownerDoctorId === doctor.id)} standard={standard} tests={pickable} categories={packageCategories} doctor={doctor} lab={lab} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}
