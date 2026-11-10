import { NextRequest, NextResponse } from "next/server";
import { clearClinicLogo, normalizeLogo, setClinicLogo } from "@/lib/clinics";
import { readForm, readUpload } from "@/lib/admin-input";

const CLINIC_ID_RE = /^CL-[A-Z0-9]{3,24}$/;
const MAX_LOGO_BYTES = 3 * 1024 * 1024;

// Admin-only: upload the clinic's logo (PNG, JPG or WebP). It is converted to a PNG of at most
// 480px, so the site header and the report header can both use it.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!CLINIC_ID_RE.test(params.id)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const form = await readForm(req);
  if (!form) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const upload = await readUpload(form, "file", MAX_LOGO_BYTES, ["image/png", "image/jpeg", "image/webp"]);
  if ("error" in upload) return NextResponse.json({ error: upload.error }, { status: 400 });

  let png: Buffer;
  try {
    png = await normalizeLogo(upload.buffer);
  } catch {
    return NextResponse.json({ error: "That image could not be read. Try a PNG or JPG." }, { status: 400 });
  }
  try {
    const found = await setClinicLogo(params.id, png);
    if (!found) return NextResponse.json({ error: "That clinic no longer exists. Refresh the page." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Admin: logo for ${params.id} could not be saved:`, err);
    return NextResponse.json({ error: "Couldn't save the logo. Please try again." }, { status: 502 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!CLINIC_ID_RE.test(params.id)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    await clearClinicLogo(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Admin: logo for ${params.id} could not be removed:`, err);
    return NextResponse.json({ error: "Couldn't remove the logo. Please try again." }, { status: 502 });
  }
}
