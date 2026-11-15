import type { Metadata } from "next";
import PackageComparison from "@/components/PackageComparison";
import { getCatalog } from "@/lib/catalog-server";
import { COMPARE_PACKAGE_SLUGS } from "@/lib/checkup-compare";
import type { PackageItem } from "@/lib/types";

// Experiment variant A: follow-up consultation is an optional Rs. 500 add-on.
// Not indexed - it is an ad landing page, and near-duplicates the other variant.
export const metadata: Metadata = {
  title: "Exclusive Full Body Checkup Packages",
  description: "Compare our Full Body Checkup plans side by side and add an optional follow-up consultation with a doctor.",
  robots: { index: false, follow: false },
};

export default async function ConsultAddonPage() {
  const catalog = await getCatalog();
  const packages = COMPARE_PACKAGE_SLUGS.map((s) => catalog.getPackage(s)).filter((p): p is PackageItem => !!p);
  return <PackageComparison variant="addon" packages={packages} />;
}
