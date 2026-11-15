import { NextRequest, NextResponse } from "next/server";
import { adminListTests, createTest } from "@/lib/catalog-store";
import { catalogFailure, readBody } from "@/lib/catalog-http";

// Admin-only (see middleware.ts). Every test, active or not (without the long text, which is fetched per test).
export async function GET() {
  try {
    return NextResponse.json({ tests: await adminListTests() });
  } catch (err) {
    return catalogFailure(err, "tests could not be listed");
  }
}

// Add a test. The lab's test code is required and must be unique: it is the test's id.
export async function POST(req: NextRequest) {
  const body = await readBody(req);
  if (!body) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, test: await createTest(body) });
  } catch (err) {
    return catalogFailure(err, "test could not be created");
  }
}
