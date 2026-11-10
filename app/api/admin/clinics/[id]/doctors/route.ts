import { NextRequest, NextResponse } from "next/server";
import { getClinic } from "@/lib/clinics";
import { addDoctorToClinic, newDoctorId } from "@/lib/doctors";
import { parseDoctorFields } from "@/lib/admin-input";

const CLINIC_ID_RE = /^CL-[A-Z0-9]{3,24}$/;

// Admin-only: add a doctor to a clinic (a clinic can have several).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!CLINIC_ID_RE.test(params.id)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const parsed = parseDoctorFields(body);
  if (!parsed.ok) return NextResponse.json({ error: Object.values(parsed.errors)[0], errors: parsed.errors }, { status: 400 });
  if (!(await getClinic(params.id))) return NextResponse.json({ error: "That clinic no longer exists. Refresh the page." }, { status: 404 });

  try {
    const id = newDoctorId();
    await addDoctorToClinic(id, params.id, parsed.value);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error(`Admin: doctor could not be added to ${params.id}:`, err);
    return NextResponse.json({ error: "Couldn't add the doctor. Please try again." }, { status: 502 });
  }
}
