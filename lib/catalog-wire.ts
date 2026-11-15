// The compact form of the catalog the browser downloads once (GET /api/catalog), and how the browser turns it back
// into a Catalog. It leaves out the long text (descriptions, FAQs, SEO copy) that only the server-rendered pages
// need, which keeps it small: searching and the cart only need names, aliases, prices, codes and what a package
// includes. Isomorphic: the server builds it, the browser reads it.
import { Catalog } from "./catalog";
import type { PackageConstituent, PackageItem, TestItem } from "./types";

export type WireTest = Pick<TestItem, "id" | "externalId" | "slug" | "name" | "aliases" | "labName" | "rawName" | "price" | "mrp" | "type" | "popular" | "category" | "sampleType" | "eta">;
export type WirePackage = Pick<PackageItem, "id" | "externalId" | "slug" | "name" | "category" | "price" | "mrp" | "tagline" | "needsContent" | "eta"> & {
  constituents: PackageConstituent[];
  custom?: boolean;
  ownerDoctorId?: string;
};
export type WireCatalog = { version: number; tests: WireTest[]; packages: WirePackage[] };

export function toWire(catalog: Catalog, version: number): WireCatalog {
  return {
    version,
    tests: catalog.tests.map((t) => ({
      id: t.id, ...(t.externalId ? { externalId: t.externalId } : {}), slug: t.slug, name: t.name, aliases: t.aliases, labName: t.labName, rawName: t.rawName, price: t.price,
      // The strikethrough price is worked out on both sides, so a test without one is sent as null.
      mrp: t.mrp, type: t.type, popular: t.popular, category: t.category, sampleType: t.sampleType, eta: t.eta,
    })),
    packages: catalog.packages.map((p) => ({
      id: p.id, ...(p.externalId ? { externalId: p.externalId } : {}), slug: p.slug, name: p.name, category: p.category, price: p.price, mrp: p.mrp, tagline: p.tagline, needsContent: p.needsContent,
      eta: p.eta, constituents: p.constituents, ...(p.custom ? { custom: true, ownerDoctorId: p.ownerDoctorId } : {}),
    })),
  };
}

export function fromWire(w: WireCatalog): Catalog {
  return new Catalog({
    tests: w.tests.map((t) => ({ ...t, curated: false, description: "" })),
    packages: w.packages.map((p) => ({ ...p, description: "" })),
  });
}
