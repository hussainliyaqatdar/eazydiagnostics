import { NextRequest, NextResponse } from "next/server";
import { readForm } from "@/lib/admin-input";
import { MEDIA_MAX_BYTES, saveMedia, sniffImageType } from "@/lib/whatsapp-media";

// Admin-only: add an image to the library (JPEG or PNG, up to 5 MB - WhatsApp's limits for a template header).
export async function POST(req: NextRequest) {
  const form = await readForm(req);
  const file = form?.get("file");
  if (!form || !(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  if (file.size > MEDIA_MAX_BYTES) return NextResponse.json({ error: "That image is over 5 MB, which WhatsApp does not accept." }, { status: 413 });
  const bytes = Buffer.from(await file.arrayBuffer());
  // Judge by the bytes, not the file name or the type the browser claims.
  const type = sniffImageType(bytes);
  if (!type) return NextResponse.json({ error: "WhatsApp template images must be JPEG or PNG." }, { status: 400 });
  try {
    const media = await saveMedia(file.name || "image", bytes, type);
    return NextResponse.json({ ok: true, media });
  } catch (err) {
    console.error("Admin: image could not be saved:", err);
    return NextResponse.json({ error: "Couldn't save the image. Please try again." }, { status: 502 });
  }
}
