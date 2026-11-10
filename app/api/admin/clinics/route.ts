import { NextRequest, NextResponse } from "next/server";
import { CLINIC_LIMITS, cleanClinicText, createClinic } from "@/lib/clinics";

// Admin-only (see middleware.ts): register a new clinic from /admin/doctors.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const name = cleanClinicText(body.name, CLINIC_LIMITS.name.max);
  if (name.length < CLINIC_LIMITS.name.min) return NextResponse.json({ error: "Enter the clinic name." }, { status: 400 });
  const address = cleanClinicText(body.address, CLINIC_LIMITS.address.max);

  try {
    const clinic = await createClinic({ name, address, branded: true });
    return NextResponse.json({ ok: true, id: clinic.id });
  } catch (err) {
    console.error("Admin: clinic could not be created:", err);
    return NextResponse.json({ error: "Couldn't create the clinic. Please try again." }, { status: 502 });
  }
}
