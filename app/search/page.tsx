import type { Metadata } from "next";
import SearchBar from "@/components/SearchBar";
import TestCard from "@/components/TestCard";
import NoResultsSupport from "@/components/NoResultsSupport";
import PackageCard from "@/components/PackageCard";
import { search, allPackages } from "@/lib/catalog";
import type { SearchResult } from "@/lib/catalog";

type Props = { searchParams: { q?: string; category?: string } };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const category = searchParams.category;
  const q = searchParams.q || "";
  if (category) {
    return {
      title: `${category} packages`,
      description: `Browse ${category} test packages for home sample collection in Bangalore.`,
    };
  }
  return {
    title: q ? `Search results for "${q}"` : "Search tests and packages",
    description: `Find and book blood tests and health packages${q ? ` matching "${q}"` : ""} for home sample collection in Bangalore.`,
  };
}

export default function SearchPage({ searchParams }: Props) {
  const category = searchParams.category;
  const q = searchParams.q || "";

  // Exact category match against the CMS catalog's own Category field, rather
  // than fuzzy text search - used by nav links like "Women's Health" so the
  // listing only ever shows packages actually tagged with that category.
  const results: SearchResult[] = category
    ? allPackages.filter((p) => p.category === category).map((item) => ({ kind: "package" as const, item, score: 1 }))
    : search(q, 60);

  const heading = category ? `${category} packages` : q ? `Results for "${q}"` : "Search tests and packages";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">{heading}</h1>
      <div className="max-w-2xl">
        <SearchBar />
      </div>

      {results.length === 0 && category && <p className="text-gray-500">{`No packages are currently tagged "${category}".`}</p>}
      {results.length === 0 && !category && q && <NoResultsSupport query={q} />}

      <div className="grid md:grid-cols-3 gap-4">
        {results.map((r) =>
          r.kind === "test" ? <TestCard key={`t-${r.item.slug}`} test={r.item} /> : <PackageCard key={`p-${r.item.slug}`} pkg={r.item} showContents />
        )}
      </div>
    </div>
  );
}
