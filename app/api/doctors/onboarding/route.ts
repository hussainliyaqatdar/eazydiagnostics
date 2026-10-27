import { NextRequest, NextResponse } from "next/server";
import { validateDoctorSignup } from "@/lib/doctor-onboarding";
import { istTimestamp, registerDoctor } from "@/lib/doctors";
import { sendDoctorConfirmation, sendOwnerDoctorAlert } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 20_000;

// A doctor (or the sales team) submits the registration form. The details are
// validated, saved, and only then confirmed by email - so
// nobody is told we have the details when we do not.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const limit = rateLimit(`doctor-signup:${ip}`, 6, 60 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many submissions from this connection. Please try again in a while." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "That submission is too large." }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Something went wrong with that submission. Please try again." }, { status: 400 });
  }

  // Hidden field that people never see or fill in; bots usually do. Look like
  // a success so they do not learn to adapt.
  if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ ok: true });

  const result = validateDoctorSignup(body);
  if (!result.ok) {
    return NextResponse.json({ error: "Please fix the highlighted fields.", errors: result.errors }, { status: 400 });
  }
  const signup = result.value;

  const now = new Date();
  const submittedAt = istTimestamp(now);
  // The id doubles as the doctor's affiliate-link code, so it is kept URL-safe.
  const id = `DR-${now.getTime().toString(36).toUpperCase()}`;

  try {
    registerDoctor(id, signup, submittedAt);
  } catch (err) {
    console.error("Doctor sign-up could not be saved:", err);
    return NextResponse.json(
      { error: "We couldn't save the details just now. Please try again in a few minutes." },
      { status: 502 }
    );
  }

  // The registration is safely recorded; a failed email must not turn it into an error.
  await Promise.allSettled([sendDoctorConfirmation(signup, id), sendOwnerDoctorAlert(signup, id, submittedAt)]);

  return NextResponse.json({ ok: true });
}
