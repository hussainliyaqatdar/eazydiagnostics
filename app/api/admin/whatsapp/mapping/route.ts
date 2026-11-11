import { NextRequest, NextResponse } from "next/server";
import { mapEvent } from "@/lib/whatsapp-templates";
import { AUDIENCES, type Audience } from "@/lib/whatsapp-events";

// Admin-only: choose which existing template an event uses for patients or doctors.
// Body: { event: "visit.completed", audience: "patient" | "doctor", templateId: number | null }
// (null = back to the generic update template).
export async function POST(req: NextRequest) {
  let body: { event?: unknown; audience?: unknown; templateId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const { event, audience, templateId } = body;
  if (typeof event !== "string" || !AUDIENCES.includes(audience as Audience) || !(templateId === null || (typeof templateId === "number" && Number.isInteger(templateId)))) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  try {
    const res = await mapEvent(event, audience as Audience, templateId as number | null);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin: template mapping could not be saved:", err);
    return NextResponse.json({ error: "Couldn't save the mapping. Please try again." }, { status: 502 });
  }
}
