import { NextRequest, NextResponse } from "next/server";
import { adminMappings, exportMappingsCsv, importMappings, setMappings, unmappedFor, type ItemKind } from "@/lib/catalog-store";
import { catalogFailure, readBody } from "@/lib/catalog-http";

const kindOf = (v: unknown): ItemKind => (v === "package" ? "package" : "test");

// Admin-only: the mapping between our internal ids and this lab's ids.
//   GET ?kind=test|package        every item with this lab's id for it (null when unmapped)
//   GET ?format=csv               every test and package as CSV (to hand to the lab, or fill in and import back)
//   GET ?gaps=1                   what this lab has no id for
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const q = req.nextUrl.searchParams;
  try {
    if (q.get("format") === "csv") {
      return new NextResponse(await exportMappingsCsv(params.id), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="lab-ids-${params.id}.csv"` } });
    }
    if (q.get("gaps")) return NextResponse.json(await unmappedFor(params.id));
    return NextResponse.json({ mappings: await adminMappings(params.id, kindOf(q.get("kind"))) });
  } catch (err) {
    return catalogFailure(err, "mappings could not be read");
  }
}

// Save ids: `{ "kind": "test", "rows": [{ "internalId": "T-000001", "externalId": "3250", "cost": 300 }] }`, or paste a CSV:
// `{ "kind": "test", "csv": "T-000001,3250,300\n..." }`. An empty externalId removes the mapping. Rows that fail are
// reported; the rest are saved.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await readBody(req);
  if (!body) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    const kind = kindOf(body.kind);
    const result = typeof body.csv === "string" ? await importMappings(params.id, kind, body.csv) : await setMappings(params.id, kind, Array.isArray(body.rows) ? (body.rows as never) : []);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return catalogFailure(err, "mappings could not be saved");
  }
}
