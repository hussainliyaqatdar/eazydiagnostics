import { NextRequest, NextResponse } from "next/server";
import { createLab, listLabs } from "@/lib/catalog-store";
import { catalogFailure, readBody } from "@/lib/catalog-http";

// Admin-only: the partner labs, each with how many items have an id at that lab.
export async function GET() {
  try {
    return NextResponse.json({ labs: await listLabs() });
  } catch (err) {
    return catalogFailure(err, "labs could not be listed");
  }
}

export async function POST(req: NextRequest) {
  const body = await readBody(req);
  if (!body) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, lab: await createLab(body) });
  } catch (err) {
    return catalogFailure(err, "lab could not be created");
  }
}
