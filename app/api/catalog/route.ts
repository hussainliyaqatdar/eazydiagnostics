import { NextRequest, NextResponse } from "next/server";
import { catalogVersion, loadCatalog } from "@/lib/catalog-store";
import { toWire } from "@/lib/catalog-wire";
import { validRef } from "@/lib/brand";

// The catalog the browser keeps in memory for instant search and for pricing the cart. It is downloaded once per
// catalog version (the version is in the address, so the browser can cache it for good and a change of catalog is a
// new address), not on every page or keystroke. `ref` is the doctor id of the affiliate link the visitor came
// through: their custom panels are added, and only theirs.
export async function GET(req: NextRequest) {
  const ref = validRef(req.nextUrl.searchParams.get("ref"));
  const asked = Number(req.nextUrl.searchParams.get("v"));
  try {
    const [catalog, version] = await Promise.all([loadCatalog(ref), catalogVersion()]);
    const body = toWire(catalog, version);
    // Cached for good only when the address names the version being served; an out-of-date address gets the current
    // catalog but is not remembered.
    const cacheControl = asked === version ? "public, max-age=31536000, immutable" : "public, max-age=30";
    return NextResponse.json(body, { headers: { "Cache-Control": cacheControl } });
  } catch (err) {
    console.error("Catalog could not be loaded:", err);
    return NextResponse.json({ error: "The catalog is unavailable right now." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
