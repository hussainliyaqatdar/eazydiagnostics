import { NextRequest, NextResponse } from "next/server";
import { getSlotsForDate } from "@/lib/slots";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });
  try {
    return NextResponse.json(await getSlotsForDate(date));
  } catch (err) {
    console.error("Slots could not be loaded:", err);
    return NextResponse.json({ error: "Time slots are unavailable right now. Please try again shortly." }, { status: 503 });
  }
}
