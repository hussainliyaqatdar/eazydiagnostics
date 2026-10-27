import { NextResponse } from "next/server";
import { sendTestEmail } from "@/lib/email";

// Admin-only (see middleware.ts): sends a test email to OWNER_EMAIL and says
// what Resend answered, so a wrong key, sender or recipient shows up straight away.
export async function POST() {
  const result = await sendTestEmail();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
