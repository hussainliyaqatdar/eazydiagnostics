// SERVER-ONLY. The catalog for the request being served: the standard one, plus - on a doctor's own affiliate link -
// that doctor's custom panels. Use this in server components and route handlers; browser code uses useCatalog().
import type { Catalog } from "./catalog";
import { getRef } from "./brand-server";
import { loadCatalog } from "./catalog-store";

export async function getCatalog(): Promise<Catalog> {
  return loadCatalog(getRef());
}

// The standard catalog, whatever link the visitor came through (for pages that must never list a doctor's panels,
// such as the sitemap).
export async function getStandardCatalog(): Promise<Catalog> {
  return loadCatalog(null);
}
