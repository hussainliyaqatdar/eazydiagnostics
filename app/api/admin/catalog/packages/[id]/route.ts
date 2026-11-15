import { NextRequest, NextResponse } from "next/server";
import { adminGetPackage, deletePackage, updatePackage } from "@/lib/catalog-store";
import { catalogFailure, readBody } from "@/lib/catalog-http";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pkg = await adminGetPackage(params.id);
    return pkg ? NextResponse.json({ package: pkg }) : NextResponse.json({ error: "That package no longer exists." }, { status: 404 });
  } catch (err) {
    return catalogFailure(err, "package could not be read");
  }
}

// Change a package or custom panel, or switch it on or off (`{ "active": false }` hides it on the site; for a custom
// panel, only on that doctor's link).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await readBody(req);
  if (!body) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, package: await updatePackage(params.id, body) });
  } catch (err) {
    return catalogFailure(err, "package could not be updated");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await deletePackage(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return catalogFailure(err, "package could not be deleted");
  }
}
