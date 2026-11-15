// SERVER-ONLY. How the admin catalog routes turn a failure into a response.
import { NextResponse } from "next/server";
import { CatalogError } from "./catalog-store";

export function catalogFailure(err: unknown, what: string): NextResponse {
  if (err instanceof CatalogError) return NextResponse.json({ error: err.message }, { status: err.status });
  console.error(`Admin: ${what}:`, err);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
}

export async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
