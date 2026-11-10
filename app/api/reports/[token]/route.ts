import { NextRequest, NextResponse } from "next/server";
import { getReportByToken } from "@/lib/order-admin";
import { fileResponse } from "@/lib/admin-input";

// The link in the WhatsApp message: a member's report. The address is a long random token, so only
// someone who was sent it can open it. It serves the clinic-branded copy when there is one.
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const report = await getReportByToken(params.token).catch(() => null);
  if (!report) return NextResponse.json({ error: "This report link is not valid." }, { status: 404 });
  return fileResponse(report.file, "application/pdf", report.filename, "private, no-store");
}
