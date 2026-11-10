import { NextResponse } from "next/server";
import { listClinicChoices } from "@/lib/clinics";

// Public: the clinics a doctor can choose from on /for-doctors (names only).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listClinicChoices());
  } catch (err) {
    // The form still lets a doctor register a new clinic, so an unreadable list is not fatal.
    console.error("Clinic list could not be loaded:", err);
    return NextResponse.json([]);
  }
}
