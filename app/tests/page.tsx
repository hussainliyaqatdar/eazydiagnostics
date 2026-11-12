import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import NoResultsSupport from "@/components/NoResultsSupport";
import TestCard from "@/components/TestCard";
import SectionSearch from "@/components/SectionSearch";
import { search, getTestsOrderedByPrescribingFrequency } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "All Tests",
  description: "Browse our full menu of individual diagnostic tests for home sample collection in Bangalore, with our most commonly booked tests listed first.",
};

const PAGE_SIZE = 30;

// Tests doctors prescribe most often lead the list (ranked by prescribing
// frequency), then the rest of the catalog in its existing order.
const sortedTests = getTestsOrderedByPrescribingFrequency();

export default function TestsPage({ searchParams }: { searchParams: { page?: string; q?: string } }) {
  const q = searchParams.q?.trim() || "";

  // Search by name or alias (e.g. "FBS", "HbA1c") using the same alias-aware
  // engine as the global search bar, scoped to tests only.
  const matched = q ? search(q, 200).filter((r) => r.kind === "test").map((r) => r.item) : sortedTests;

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const totalPages = Math.ceil(matched.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const pageTests = matched.slice(start, start + PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Tests</h1>
        <p className="text-sm text-gray-600 mt-1">
          {q
            ? `${matched.length} test${matched.length === 1 ? "" : "s"} matching "${q}"`
            : `${matched.length} tests available - our most commonly booked tests are listed first.`}
        </p>
      </div>

      <Suspense fallback={null}>
        <SectionSearch placeholder="Search tests by name or alias (e.g. FBS, HbA1c, LFT)" />
      </Suspense>

      {matched.length === 0 ? (
        q ? <NoResultsSupport query={q} /> : <p className="text-gray-500">No tests are listed yet.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {pageTests.map((t) => (
            <TestCard key={t.slug} test={t} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 pt-4" aria-label="Pagination">
          <Link
            href={`/tests?page=${Math.max(1, page - 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            aria-disabled={page === 1}
            className={`px-3 py-1.5 text-sm rounded-md border ${page === 1 ? "pointer-events-none text-gray-300 border-gray-200" : "text-gray-700 hover:border-brand"}`}
          >
            Previous
          </Link>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <Link
            href={`/tests?page=${Math.min(totalPages, page + 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            aria-disabled={page === totalPages}
            className={`px-3 py-1.5 text-sm rounded-md border ${page === totalPages ? "pointer-events-none text-gray-300 border-gray-200" : "text-gray-700 hover:border-brand"}`}
          >
            Next
          </Link>
        </nav>
      )}
    </div>
  );
}
