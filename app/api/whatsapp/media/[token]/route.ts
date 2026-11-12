import { NextRequest, NextResponse } from "next/server";
import { getMediaByToken } from "@/lib/whatsapp-media";

// Public: the image WhatsApp fetches when it sends a template with an image header. The address carries a long
// random token, so only an image we sent a link for can be fetched. (It is deliberately outside /api/admin,
// which sits behind the admin login that WhatsApp's servers cannot pass.)
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const media = await getMediaByToken(params.token).catch(() => undefined);
  if (!media) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return new Response(new Uint8Array(media.data), {
    headers: {
      "Content-Type": media.contentType,
      "Content-Length": String(media.data.length),
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
