import { NextRequest, NextResponse } from "next/server";
import { updateDoctor } from "@/lib/doctors";
import { parseDoctorUpdate } from "@/lib/admin-input";
import { DOCTOR_ID_RE } from "@/lib/referral-storage";

// Admin-only: edit a doctor's name, qualifications, specialty, WhatsApp number, email, clinic,
// approval and B2B discounts (per doctor, not per clinic).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!DOCTOR_ID_RE.test(params.id)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const parsed = parseDoctorUpdate(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const found = await updateDoctor(params.id, parsed.value);
    if (!found) return NextResponse.json({ error: "That doctor no longer exists. Refresh the page." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "clinic-not-found") return NextResponse.json({ error: "That clinic no longer exists." }, { status: 400 });
    console.error(`Admin: doctor ${params.id} could not be updated:`, err);
    return NextResponse.json({ error: "Couldn't save. Please try again." }, { status: 502 });
  }
}
