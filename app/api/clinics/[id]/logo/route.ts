import { NextRequest, NextResponse } from "next/server";
import { getClinicLogo } from "@/lib/clinics";
import { fileResponse } from "@/lib/admin-input";

const CLINIC_ID_RE = /^CL-[A-Z0-9]{3,24}$/;

// Public: a clinic's logo, for the clinic-branded site. The URL carries a version (?v=), so a
// new logo is picked up straight away while an unchanged one is cached.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!CLINIC_ID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const logo = await getClinicLogo(params.id).catch(() => null);
  if (!logo) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return fileResponse(logo, "image/png", "logo.png", "public, max-age=31536000, immutable");
}
