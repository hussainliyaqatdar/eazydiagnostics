import { NextRequest, NextResponse } from "next/server";
import { getDoctorCertificate, setDoctorCertificate } from "@/lib/doctors";
import { fileResponse, readForm, readUpload } from "@/lib/admin-input";
import { DOCTOR_ID_RE } from "@/lib/referral-storage";

const MAX_BYTES = 5 * 1024 * 1024;

// Admin-only: upload the doctor's degree / KMC registration certificate (optional; PDF or image).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!DOCTOR_ID_RE.test(params.id)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const form = await readForm(req);
  if (!form) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const upload = await readUpload(form, "file", MAX_BYTES, ["application/pdf", "image/png", "image/jpeg"]);
  if ("error" in upload) return NextResponse.json({ error: upload.error }, { status: 400 });
  try {
    const found = await setDoctorCertificate(params.id, upload.buffer, upload.type, upload.name);
    if (!found) return NextResponse.json({ error: "That doctor no longer exists. Refresh the page." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Admin: certificate for ${params.id} could not be saved:`, err);
    return NextResponse.json({ error: "Couldn't save the file. Please try again." }, { status: 502 });
  }
}

// Admin-only: open the stored certificate.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!DOCTOR_ID_RE.test(params.id)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const cert = await getDoctorCertificate(params.id).catch(() => null);
  if (!cert) return NextResponse.json({ error: "No certificate uploaded." }, { status: 404 });
  return fileResponse(cert.file, cert.type, cert.name);
}
