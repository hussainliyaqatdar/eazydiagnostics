import { NextRequest, NextResponse } from "next/server";
import { getReportById } from "@/lib/order-admin";
import { fileResponse } from "@/lib/admin-input";

// Admin-only: open a member's report. ?original=1 gives the lab's file without the clinic header.
export async function GET(req: NextRequest, { params }: { params: { mid: string } }) {
  const memberId = Number(params.mid);
  if (!Number.isInteger(memberId)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const report = await getReportById(memberId, req.nextUrl.searchParams.get("original") === "1").catch(() => null);
  if (!report) return NextResponse.json({ error: "No report uploaded." }, { status: 404 });
  return fileResponse(report.file, "application/pdf", report.filename);
}
