import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import NoResultsSupport from "@/components/NoResultsSupport";
import PackageCard from "@/components/PackageCard";
import SectionSearch from "@/components/SectionSearch";
import { allPackages, getPackageCategories, search } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "All Health Packages",
  description: "Browse every health checkup package - Full Body Checkups, Women's Health, Diabetes, Thyroid, and more - for home sample collection in Bangalore.",
};

export default function PackagesPage({ searchParams }: { searchParams: { category?: string; q?: string } }) {
  const categories = getPackageCategories();
  const active = searchParams.category;
  const q = searchParams.q?.trim() || "";

  // Search by name or alias, scoped to packages only, using the same
  // alias-aware engine as the global search bar.
  let packages = q ? search(q, 200).filter((r) => r.kind === "package").map((r) => r.item) : allPackages;
  if (active) packages = packages.filter((p) => p.category === active);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Health Packages</h1>
        <p className="text-sm text-gray-600 mt-1">
          {q ? `${packages.length} package${packages.length === 1 ? "" : "s"} matching "${q}"` : `${packages.length} package${packages.length === 1 ? "" : "s"} available for home collection.`}
        </p>
      </div>

      <Suspense fallback={null}>
        <SectionSearch placeholder="Search packages by name or alias (e.g. Full Body, PCOS, Thyroid)" />
      </Suspense>

      <div className="flex flex-wrap gap-2">
        <Link
          href={q ? `/packages?q=${encodeURIComponent(q)}` : "/packages"}
          className={`text-sm px-3 py-1.5 rounded-full border ${!active ? "bg-brand text-white border-brand" : "bg-white text-gray-700 hover:border-brand"}`}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={`/packages?category=${encodeURIComponent(c)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`text-sm px-3 py-1.5 rounded-full border ${active === c ? "bg-brand text-white border-brand" : "bg-white text-gray-700 hover:border-brand"}`}
          >
            {c}
          </Link>
        ))}
      </div>

      {packages.length === 0 ? (
        q ? <NoResultsSupport query={q} /> : <p className="text-gray-500">No packages found in this category.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {packages.map((p) => (
            <PackageCard key={p.slug} pkg={p} showContents />
          ))}
        </div>
      )}
    </div>
  );
}
