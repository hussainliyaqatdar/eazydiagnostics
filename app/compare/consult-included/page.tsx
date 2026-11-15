import type { Metadata } from "next";
import PackageComparison from "@/components/PackageComparison";
import { getCatalog } from "@/lib/catalog-server";
import { COMPARE_PACKAGE_SLUGS } from "@/lib/checkup-compare";
import type { PackageItem } from "@/lib/types";

// Experiment variant B: every plan bundles a follow-up consultation, at a price
// rounded up to the next Rs. 1,000. Not indexed - see the add-on variant.
export const metadata: Metadata = {
  title: "Exclusive Full Body Checkup Packages",
  description: "Compare our Full Body Checkup plans side by side - every plan includes a follow-up consultation with a doctor.",
  robots: { index: false, follow: false },
};

export default async function ConsultIncludedPage() {
  const catalog = await getCatalog();
  const packages = COMPARE_PACKAGE_SLUGS.map((s) => catalog.getPackage(s)).filter((p): p is PackageItem => !!p);
  return <PackageComparison variant="included" packages={packages} />;
}
