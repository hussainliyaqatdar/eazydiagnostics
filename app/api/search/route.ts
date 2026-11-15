import { NextRequest, NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog-server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const catalog = await getCatalog();
  const results = catalog.search(q, 12).map((r) => ({
    kind: r.kind,
    slug: r.item.slug,
    name: r.item.name,
    price: r.item.price,
    category: r.kind === "test" ? r.item.category : r.item.category,
    tagline: r.kind === "package" ? r.item.tagline : undefined,
  }));
  return NextResponse.json(results);
}
