import { NextRequest, NextResponse } from "next/server";
import { adminListPackages, createCustomPanel, createPackage } from "@/lib/catalog-store";
import { catalogFailure, readBody } from "@/lib/catalog-http";

// Admin-only. `?owner=standard` lists the standard packages, `?owner=<doctor id>` that doctor's custom panels, and
// no `owner` lists everything.
export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner");
  try {
    const packages = await adminListPackages(owner === null ? undefined : owner === "standard" ? null : owner);
    return NextResponse.json({ packages });
  } catch (err) {
    return catalogFailure(err, "packages could not be listed");
  }
}

// Add a standard package, or - with `ownerDoctorId` - a custom panel for that doctor's patients (optionally copied
// from a standard package with `templateSlug`).
export async function POST(req: NextRequest) {
  const body = await readBody(req);
  if (!body) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    const pkg = body.ownerDoctorId ? await createCustomPanel(body) : await createPackage(body);
    return NextResponse.json({ ok: true, package: pkg });
  } catch (err) {
    return catalogFailure(err, "package could not be created");
  }
}
