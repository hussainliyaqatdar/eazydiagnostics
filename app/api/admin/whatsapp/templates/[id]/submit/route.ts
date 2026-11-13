import { NextRequest, NextResponse } from "next/server";
import { getTemplate, submitTemplate } from "@/lib/whatsapp-templates";
import { firstError, validateTemplate } from "@/lib/whatsapp-input";

// Send a template to Meta for approval (or back for review after an edit / a rejection).
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const t = Number.isInteger(id) ? await getTemplate(id).catch(() => undefined) : undefined;
  if (!t) return NextResponse.json({ error: "That template no longer exists. Refresh the page." }, { status: 404 });
  if (t.status === "PENDING") return NextResponse.json({ error: "Already submitted - Meta is reviewing it." }, { status: 409 });
  const problem = firstError(
    validateTemplate({ name: t.name, language: t.language, category: t.category, audience: t.audience, events: t.events, body: t.body, footer: t.footer, variables: t.variables as never, buttons: t.buttons }, true)
  );
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  try {
    const res = await submitTemplate(id);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });
    return NextResponse.json({ ok: true, template: res.template });
  } catch (err) {
    console.error("Admin: template could not be submitted:", err);
    return NextResponse.json({ error: "Couldn't submit the template. Please try again." }, { status: 502 });
  }
}
