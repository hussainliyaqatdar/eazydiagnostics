import { NextRequest, NextResponse } from "next/server";
import { firstError, readTemplateInput, validateTemplate } from "@/lib/whatsapp-input";
import { bindingConflicts, deleteTemplate, getTemplate, submitTemplate, updateTemplate } from "@/lib/whatsapp-templates";
import { eventLabel } from "@/lib/whatsapp-events";

function idOf(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Change a template: who gets it and for which events, switch it on/off, or reword it. Rewording one
// Meta already holds sends it back for review (and it is not used until approved again).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = idOf(params.id);
  const current = id ? await getTemplate(id).catch(() => undefined) : undefined;
  if (!id || !current) return NextResponse.json({ error: "That template no longer exists. Refresh the page." }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  // Merge what was sent over what is stored, then check the whole thing.
  const merged = readTemplateInput({ ...current, ...body, name: current.name, language: current.language });
  const wording = merged.body.trim() !== current.body || merged.footer.trim() !== current.footer || merged.category !== current.category;
  const enabled = typeof body.enabled === "boolean" ? body.enabled : current.enabled;
  const resubmit = wording && !!current.metaId;

  if (wording && current.status === "PENDING") {
    return NextResponse.json({ error: "This template is being reviewed by Meta. Wait for the result before changing its wording." }, { status: 409 });
  }
  const errors = validateTemplate(merged, resubmit || current.status !== "DRAFT");
  const problem = firstError(errors);
  if (problem) return NextResponse.json({ error: problem, errors }, { status: 400 });

  try {
    if (enabled) {
      const clash = await bindingConflicts(merged.audience, merged.events, id);
      if (clash.length > 0) return NextResponse.json({ error: `${eventLabel(clash[0].event)} already uses the template "${clash[0].template}". Remove it from that template first.` }, { status: 409 });
    }
    let template = await updateTemplate(id, {
      category: merged.category,
      audience: merged.audience,
      events: merged.events,
      body: merged.body,
      footer: merged.footer,
      variables: merged.variables,
      enabled,
    });
    let submitError: string | undefined;
    if ((resubmit || body.submit === true) && template) {
      const res = await submitTemplate(id);
      if (res.ok) template = res.template;
      else submitError = res.error;
    }
    return NextResponse.json({ ok: true, template, submitError });
  } catch (err) {
    console.error("Admin: template could not be updated:", err);
    return NextResponse.json({ error: "Couldn't save the template. Please try again." }, { status: 502 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = idOf(params.id);
  if (!id) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    const res = await deleteTemplate(id);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin: template could not be deleted:", err);
    return NextResponse.json({ error: "Couldn't delete the template. Please try again." }, { status: 502 });
  }
}
