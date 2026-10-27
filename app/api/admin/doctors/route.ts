import { NextRequest, NextResponse } from "next/server";
import { removeDoctor } from "@/lib/doctors";
import { DOCTOR_ID_RE } from "@/lib/referral-storage";

// Admin-only (see middleware.ts): remove a registered doctor. Their affiliate
// link stops matching and they leave the checkout "Prescribed by" list. Past
// bookings keep the doctor's name, which was copied onto each one.
export async function DELETE(req: NextRequest) {
  let id: unknown;
  try {
    ({ id } = await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (typeof id !== "string" || !DOCTOR_ID_RE.test(id)) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  try {
    removeDoctor(id);
  } catch (err) {
    console.error("Admin: doctor could not be deleted:", err);
    return NextResponse.json({ error: "Couldn't delete that doctor. They may already be removed - refresh and try again." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
