import { NextRequest, NextResponse } from "next/server";
import { adminGetTest, deleteTest, updateTest } from "@/lib/catalog-store";
import { catalogFailure, readBody } from "@/lib/catalog-http";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const test = await adminGetTest(params.id);
    return test ? NextResponse.json({ test }) : NextResponse.json({ error: "That test no longer exists." }, { status: 404 });
  } catch (err) {
    return catalogFailure(err, "test could not be read");
  }
}

// Change a test, or switch it on or off (`{ "active": false }` deactivates it: it disappears from the site and can no
// longer be booked, but old orders keep showing it). The code never changes.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await readBody(req);
  if (!body) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, test: await updateTest(params.id, body) });
  } catch (err) {
    return catalogFailure(err, "test could not be updated");
  }
}

// Remove a test for good. Refused while a package still includes it (deactivate it instead).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await deleteTest(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return catalogFailure(err, "test could not be deleted");
  }
}
