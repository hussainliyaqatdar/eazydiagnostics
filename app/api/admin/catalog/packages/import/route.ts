import { NextResponse } from "next/server";
import { addPendingFilePackages, pendingFilePackages } from "@/lib/catalog-store";
import { catalogFailure } from "@/lib/catalog-http";

// Admin-only. GET lists the standard packages in the catalogue file that this database doesn't have yet; POST adds them
// (each with its lab id, price, tests and wording). Nothing already in the database is changed.
export async function GET() {
  try {
    return NextResponse.json({ packages: await pendingFilePackages() });
  } catch (err) {
    return catalogFailure(err, "pending packages could not be listed");
  }
}

export async function POST() {
  try {
    return NextResponse.json({ ok: true, ...(await addPendingFilePackages()) });
  } catch (err) {
    return catalogFailure(err, "packages could not be added");
  }
}
