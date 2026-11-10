import { NextRequest, NextResponse } from "next/server";
import { CLINIC_LIMITS, PAYMENT_COLLECTORS, cleanClinicText, deleteClinic, updateClinic, type ClinicUpdate } from "@/lib/clinics";

const CLINIC_ID_RE = /^CL-[A-Z0-9]{3,24}$/;

// Admin-only: edit a clinic's name, address, who collects payment, and whether its referral
// links show the clinic-branded site.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!CLINIC_ID_RE.test(params.id)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const update: ClinicUpdate = {};
  if (body.name !== undefined) {
    const name = cleanClinicText(body.name, CLINIC_LIMITS.name.max);
    if (name.length < CLINIC_LIMITS.name.min) return NextResponse.json({ error: "Enter the clinic name." }, { status: 400 });
    update.name = name;
  }
  if (body.address !== undefined) update.address = cleanClinicText(body.address, CLINIC_LIMITS.address.max);
  if (body.paymentCollector !== undefined) {
    if (!PAYMENT_COLLECTORS.includes(body.paymentCollector as never)) return NextResponse.json({ error: "Choose who collects the payment." }, { status: 400 });
    update.paymentCollector = body.paymentCollector as ClinicUpdate["paymentCollector"];
  }
  if (typeof body.branded === "boolean") update.branded = body.branded;

  try {
    const found = await updateClinic(params.id, update);
    if (!found) return NextResponse.json({ error: "That clinic no longer exists. Refresh the page." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Admin: clinic ${params.id} could not be updated:`, err);
    return NextResponse.json({ error: "Couldn't save. Please try again." }, { status: 502 });
  }
}

// Only a clinic with no doctors can be deleted.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!CLINIC_ID_RE.test(params.id)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    const result = await deleteClinic(params.id);
    if (result === "has_doctors") return NextResponse.json({ error: "This clinic still has doctors. Delete them, or move them to another clinic, first." }, { status: 409 });
    if (result === "missing") return NextResponse.json({ error: "That clinic no longer exists." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Admin: clinic ${params.id} could not be deleted:`, err);
    return NextResponse.json({ error: "Couldn't delete. Please try again." }, { status: 502 });
  }
}
