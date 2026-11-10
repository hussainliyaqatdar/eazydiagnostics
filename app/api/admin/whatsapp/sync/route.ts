import { NextResponse } from "next/server";
import { syncTemplates } from "@/lib/whatsapp-templates";

// Pull every template's current status from Meta, and import ones that exist only there.
export async function POST() {
  try {
    const res = await syncTemplates();
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });
    return NextResponse.json(res);
  } catch (err) {
    console.error("Admin: templates could not be synced:", err);
    return NextResponse.json({ error: "Couldn't sync with Meta. Please try again." }, { status: 502 });
  }
}
