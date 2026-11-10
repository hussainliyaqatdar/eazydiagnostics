import Link from "next/link";
import PriceTag from "./PriceTag";
import AddToCartButton from "./AddToCartButton";
import PackageContents from "./PackageContents";
import type { PackageItem } from "@/lib/types";

// `showContents` lists the included tests in the card (used in search results).
export default function PackageCard({ pkg, showContents = false }: { pkg: PackageItem; showContents?: boolean }) {
  return (
    <div className="bg-white border rounded-lg p-4 flex flex-col gap-2 shadow-sm">
      <span className="text-xs uppercase tracking-wide text-brand-accent font-semibold">Package &middot; {pkg.constituents.length} tests</span>
      <Link href={`/packages/${pkg.slug}`} className="font-semibold text-gray-900 hover:text-brand">
        {pkg.name}
      </Link>
      <p className="text-xs text-gray-500">{pkg.tagline}</p>
      {showContents ? <PackageContents slug={pkg.slug} className="my-1" /> : <p className="text-sm text-gray-600 line-clamp-3">{pkg.description}</p>}
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
        </svg>
        <span>Reports in {pkg.eta}</span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <PriceTag mrp={pkg.mrp} price={pkg.price} size="sm" />
        <AddToCartButton kind="package" slug={pkg.slug} />
      </div>
    </div>
  );
}
