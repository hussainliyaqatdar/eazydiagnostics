import { NextRequest, NextResponse } from "next/server";
import { deleteMedia, getMediaBytes } from "@/lib/whatsapp-media";

function idOf(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Admin-only: the image itself, for thumbnails and previews on /admin/whatsapp.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = idOf(params.id);
  const media = id ? await getMediaBytes(id).catch(() => undefined) : undefined;
  if (!media) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return new Response(new Uint8Array(media.data), { headers: { "Content-Type": media.contentType, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = idOf(params.id);
  if (!id) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    const res = await deleteMedia(id);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin: image could not be deleted:", err);
    return NextResponse.json({ error: "Couldn't delete the image. Please try again." }, { status: 502 });
  }
}
