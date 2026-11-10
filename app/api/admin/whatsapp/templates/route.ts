import { NextRequest, NextResponse } from "next/server";
import { firstError, readTemplateInput, validateTemplate } from "@/lib/whatsapp-input";
import { bindingConflicts, createTemplate, submitTemplate } from "@/lib/whatsapp-templates";
import { eventLabel } from "@/lib/whatsapp-events";

// Admin-only (see middleware.ts): write a new template, and optionally send it to Meta for approval.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const input = readTemplateInput(body);
  const submit = body.submit === true;
  const errors = validateTemplate(input, submit);
  const problem = firstError(errors);
  if (problem) return NextResponse.json({ error: problem, errors }, { status: 400 });

  try {
    const clash = await bindingConflicts(input.audience, input.events);
    if (clash.length > 0) {
      return NextResponse.json({ error: `${eventLabel(clash[0].event)} already uses the template "${clash[0].template}". Remove it from that template first.` }, { status: 409 });
    }
    let template = await createTemplate(input);
    let submitError: string | undefined;
    if (submit) {
      const res = await submitTemplate(template.id);
      if (res.ok) template = res.template;
      else submitError = res.error;
    }
    return NextResponse.json({ ok: true, template, submitError });
  } catch (err) {
    if (err instanceof Error && /unique|duplicate/i.test(err.message)) {
      return NextResponse.json({ error: "A template with that name and language already exists." }, { status: 409 });
    }
    console.error("Admin: template could not be created:", err);
    return NextResponse.json({ error: "Couldn't save the template. Please try again." }, { status: 502 });
  }
}
