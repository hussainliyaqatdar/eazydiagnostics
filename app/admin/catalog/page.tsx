import type { Metadata } from "next";
import CatalogAdmin from "@/components/admin/catalog/CatalogAdmin";
import { adminListPackages, adminListTests, listLabs, type LabSummary } from "@/lib/catalog-store";
import { getAffiliateDoctors } from "@/lib/affiliate-doctors";
import type { PackageItem, TestItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tests and packages", robots: { index: false, follow: false } };

export default async function AdminCatalogPage() {
  let tests: TestItem[] = [];
  let packages: PackageItem[] = [];
  let doctors: { id: string; name: string; clinic: string }[] = [];
  let labs: LabSummary[] = [];
  let loadError = "";
  try {
    [tests, packages, doctors, labs] = await Promise.all([adminListTests(), adminListPackages(), getAffiliateDoctors(), listLabs()]);
  } catch (err) {
    console.error("Admin: the catalog could not be loaded:", err);
    loadError = `Couldn't load the catalog: ${err instanceof Error ? err.message : "unknown error"}`;
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tests and packages</h1>
        <p className="text-sm text-gray-500">
          Everything patients can search and book. Each test and package has our own permanent internal id, mapped to the partner lab's id for it (Partner labs tab). Deactivate a test or package to hide it from the site without deleting it; orders already placed keep showing it.
        </p>
      </div>
      {loadError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}
      <CatalogAdmin tests={tests} packages={packages} doctors={doctors} labs={labs} />
    </div>
  );
}
