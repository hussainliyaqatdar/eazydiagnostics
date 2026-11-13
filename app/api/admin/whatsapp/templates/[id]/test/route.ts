import { NextRequest, NextResponse } from "next/server";
import { sendTemplate, toWhatsappNumber } from "@/lib/whatsapp";
import { getTemplate, headerImageUrlFor, sampleParams } from "@/lib/whatsapp-templates";

// Send an approved template, filled with sample values, to a number - to see it on a real phone.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const t = Number.isInteger(id) ? await getTemplate(id).catch(() => undefined) : undefined;
  if (!t) return NextResponse.json({ error: "That template no longer exists. Refresh the page." }, { status: 404 });
  let body: { to?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const to = toWhatsappNumber(typeof body.to === "string" ? body.to : "");
  if (!to) return NextResponse.json({ error: "Enter a 10-digit Indian mobile number." }, { status: 400 });
  if (t.status !== "APPROVED") return NextResponse.json({ error: `WhatsApp only sends templates Meta has approved. This one is ${t.status.toLowerCase()}.` }, { status: 409 });
  const result = await sendTemplate(to, t.name, sampleParams(t), { language: t.language, headerImageUrl: await headerImageUrlFor(t) });
  if (!result.ok) return NextResponse.json({ error: result.detail }, { status: 502 });
  return NextResponse.json({ ok: true, to, messageId: result.messageId });
}
