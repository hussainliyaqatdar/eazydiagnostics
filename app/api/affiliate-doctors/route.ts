import { NextResponse } from "next/server";
import { getAffiliateDoctors } from "@/lib/affiliate-doctors";

// Registered affiliate doctors for the checkout "Prescribed by" dropdown.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getAffiliateDoctors());
  } catch (err) {
    // "Prescribed by" still works as a typed field, so an unreadable list is not fatal.
    console.error("Affiliate doctor list could not be loaded:", err);
    return NextResponse.json([]);
  }
}
