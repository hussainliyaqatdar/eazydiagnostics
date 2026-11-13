// SERVER-ONLY. The WhatsApp template registry: templates are written here, submitted to Meta for
// approval, kept in step with Meta's own list, and - once APPROVED - looked up by the notification flow
// for the event it is sending. The Graph API calls themselves live in lib/whatsapp.ts.
import { getDb } from "./db";
import {
  EVENT_BY_KEY,
  isVariableSource,
  renderExample,
  SOURCE_BY_KEY,
  variableCount,
  type Audience,
  type TemplateCategory,
  type TemplateInput,
  type VariableSource,
} from "./whatsapp-events";
import { metaCreateTemplate, metaDeleteTemplate, metaListTemplates, metaUpdateTemplate, type MetaTemplate } from "./whatsapp";

export type WaTemplate = {
  id: number;
  name: string;
  language: string;
  category: TemplateCategory;
  audience: Audience;
  events: string[];
  body: string;
  footer: string;
  // variables[i] fills {{i+1}}; "" for one that has not been mapped (e.g. a template imported from Meta).
  variables: (VariableSource | "")[];
  metaId: string | null;
  status: string;
  rejectedReason: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
};

type Row = {
  id: number | string;
  name: string;
  language: string;
  category: string;
  audience: string;
  events: string[];
  body: string;
  footer: string | null;
  variables: string[];
  meta_id: string | null;
  status: string;
  rejected_reason: string | null;
  enabled: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  synced_at: Date | string | null;
};

const iso = (d: Date | string) => new Date(d).toISOString();

function toTemplate(r: Row): WaTemplate {
  return {
    id: Number(r.id),
    name: r.name,
    language: r.language,
    category: r.category === "MARKETING" ? "MARKETING" : "UTILITY",
    audience: r.audience === "doctor" ? "doctor" : "patient",
    events: r.events ?? [],
    body: r.body,
    footer: r.footer ?? "",
    variables: (r.variables ?? []).map((v) => (isVariableSource(v) ? v : "")),
    metaId: r.meta_id,
    status: r.status,
    rejectedReason: r.rejected_reason,
    enabled: r.enabled,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    syncedAt: r.synced_at ? iso(r.synced_at) : null,
  };
}

const COLUMNS = "id, name, language, category, audience, events, body, footer, variables, meta_id, status, rejected_reason, enabled, created_at, updated_at, synced_at";

export async function listTemplates(): Promise<WaTemplate[]> {
  const db = await getDb();
  return (await db.query<Row>(`SELECT ${COLUMNS} FROM whatsapp_templates ORDER BY created_at DESC, id DESC`)).map(toTemplate);
}

export async function getTemplate(id: number): Promise<WaTemplate | undefined> {
  const db = await getDb();
  const rows = await db.query<Row>(`SELECT ${COLUMNS} FROM whatsapp_templates WHERE id = $1`, [id]);
  return rows[0] ? toTemplate(rows[0]) : undefined;
}

// The template mapped to an event for an audience (switched on), whatever state it is in at Meta. The caller
// decides whether it can be sent: only an APPROVED one with every variable mapped can.
export async function findMappedTemplate(event: string, audience: Audience): Promise<WaTemplate | undefined> {
  const db = await getDb();
  const rows = await db.query<Row>(
    `SELECT ${COLUMNS} FROM whatsapp_templates
     WHERE enabled AND audience = $1 AND events @> $2::jsonb
     ORDER BY updated_at DESC LIMIT 1`,
    [audience, JSON.stringify([event])]
  );
  return rows[0] ? toTemplate(rows[0]) : undefined;
}

// Why a mapped template cannot be sent yet, or null if it can.
export function unusableReason(t: WaTemplate): string | null {
  if (t.status !== "APPROVED") return `its Meta status is ${t.status.toLowerCase().replace("_", " ")}, not approved`;
  if (t.variables.length !== variableCount(t.body) || t.variables.some((v) => v === "")) return "a variable has nothing mapped to it";
  return null;
}

// Events of this audience that another switched-on template already handles.
export async function bindingConflicts(audience: Audience, events: string[], exceptId?: number): Promise<{ event: string; template: string }[]> {
  if (events.length === 0) return [];
  const others = (await listTemplates()).filter((t) => t.enabled && t.audience === audience && t.id !== exceptId);
  const out: { event: string; template: string }[] = [];
  for (const ev of events) {
    const other = others.find((t) => t.events.includes(ev));
    if (other) out.push({ event: ev, template: other.name });
  }
  return out;
}

export async function createTemplate(input: TemplateInput): Promise<WaTemplate> {
  const db = await getDb();
  const rows = await db.query<Row>(
    `INSERT INTO whatsapp_templates (name, language, category, audience, events, body, footer, variables)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8::jsonb) RETURNING ${COLUMNS}`,
    [input.name, input.language, input.category, input.audience, JSON.stringify(input.events), input.body.trim(), input.footer.trim() || null, JSON.stringify(input.variables)]
  );
  return toTemplate(rows[0]);
}

export type TemplatePatch = Partial<Omit<TemplateInput, "name" | "language">> & { enabled?: boolean };

export async function updateTemplate(id: number, patch: TemplatePatch): Promise<WaTemplate | undefined> {
  const sets: string[] = [];
  const values: unknown[] = [id];
  const add = (col: string, value: unknown, cast = "") => {
    values.push(value);
    sets.push(`${col} = $${values.length}${cast}`);
  };
  if (patch.category !== undefined) add("category", patch.category);
  if (patch.audience !== undefined) add("audience", patch.audience);
  if (patch.events !== undefined) add("events", JSON.stringify(patch.events), "::jsonb");
  if (patch.body !== undefined) add("body", patch.body.trim());
  if (patch.footer !== undefined) add("footer", patch.footer.trim() || null);
  if (patch.variables !== undefined) add("variables", JSON.stringify(patch.variables), "::jsonb");
  if (patch.enabled !== undefined) add("enabled", patch.enabled);
  if (sets.length === 0) return getTemplate(id);
  const db = await getDb();
  const rows = await db.query<Row>(`UPDATE whatsapp_templates SET ${sets.join(", ")}, updated_at = now() WHERE id = $1 RETURNING ${COLUMNS}`, values);
  return rows[0] ? toTemplate(rows[0]) : undefined;
}

async function setMeta(id: number, f: { metaId?: string | null; status: string; reason?: string | null }): Promise<void> {
  const db = await getDb();
  await db.query(
    "UPDATE whatsapp_templates SET meta_id = COALESCE($2, meta_id), status = $3, rejected_reason = $4, synced_at = now(), updated_at = now() WHERE id = $1",
    [id, f.metaId ?? null, f.status, f.reason ?? null]
  );
}

// What Meta needs: the body with example values for each variable (so it can judge the template).
function submission(t: WaTemplate) {
  return {
    name: t.name,
    language: t.language,
    category: t.category,
    body: t.body,
    footer: t.footer || undefined,
    examples: t.variables.map((v) => (v ? SOURCE_BY_KEY.get(v)?.example ?? "example" : "example")),
  };
}

export type ActionResult<T = undefined> = { ok: true; template: WaTemplate; data?: T } | { ok: false; error: string };

// Sends the template to Meta for approval (a new one is created; one Meta already holds is edited and
// goes back for review). Its state then follows Meta's: PENDING until the webhook or a sync says otherwise.
export async function submitTemplate(id: number): Promise<ActionResult> {
  const t = await getTemplate(id);
  if (!t) return { ok: false, error: "That template no longer exists." };
  if (t.variables.some((v) => v === "")) return { ok: false, error: "Choose what fills every variable first." };

  if (t.metaId) {
    const res = await metaUpdateTemplate(t.metaId, submission(t));
    if (!res.ok) return { ok: false, error: res.error };
    await setMeta(id, { status: "PENDING", reason: null });
  } else {
    const res = await metaCreateTemplate(submission(t));
    if (!res.ok) return { ok: false, error: res.error };
    await setMeta(id, { metaId: res.data.id, status: normaliseStatus(res.data.status) || "PENDING", reason: null });
  }
  return { ok: true, template: (await getTemplate(id))! };
}

// Removes the template from Meta (if it was ever submitted) and from here. If Meta no longer has it, it is
// just removed here.
export async function deleteTemplate(id: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = await getTemplate(id);
  if (!t) return { ok: true };
  if (t.metaId) {
    const res = await metaDeleteTemplate(t.name);
    if (!res.ok && !/does not exist|not found|no template/i.test(res.error)) return { ok: false, error: res.error };
  }
  const db = await getDb();
  await db.query("DELETE FROM whatsapp_templates WHERE id = $1", [id]);
  return { ok: true };
}

const normaliseStatus = (s: string | undefined) => (s ? s.toUpperCase() : "");

// Who a template is for, judged from its name (Meta does not record this): "order_confirmed_doctor" is for doctors,
// anything else for patients. Only a starting point - the audience can be changed when editing the template.
export function guessAudience(name: string): Audience {
  return explicitAudience(name) ?? "patient";
}

// The audience a name plainly says ("..._doctor", "..._patient"), or null when it says nothing.
function explicitAudience(name: string): Audience | null {
  if (/(^|[_\-\s])(doctors?|dr|physicians?)([_\-\s]|$)/i.test(name)) return "doctor";
  if (/(^|[_\-\s])(patients?|customers?)([_\-\s]|$)/i.test(name)) return "patient";
  return null;
}

function bodyOf(m: MetaTemplate) {
  return m.components?.find((c) => c.type === "BODY")?.text ?? "";
}

// Brings every template's status in line with Meta, and imports ones that exist only at Meta (they have
// no events or variable mapping yet, so they are not used until someone sets those).
export async function syncTemplates(): Promise<{ ok: true; updated: number; imported: number; missing: number } | { ok: false; error: string }> {
  const res = await metaListTemplates();
  if (!res.ok) return res;
  const remote = new Map(res.data.map((m) => [`${m.name}|${m.language}`, m]));
  const local = await listTemplates();
  let updated = 0;
  let missing = 0;

  for (const t of local) {
    const m = remote.get(`${t.name}|${t.language}`);
    if (m) {
      const status = normaliseStatus(m.status);
      if (status !== t.status || (m.rejected_reason ?? null) !== (t.rejectedReason ?? null) || t.metaId !== m.id) updated++;
      await setMeta(t.id, { metaId: m.id, status, reason: m.rejected_reason && m.rejected_reason !== "NONE" ? m.rejected_reason : null });
      remote.delete(`${t.name}|${t.language}`);
    } else if (t.metaId) {
      // It was at Meta and is gone: back to a draft that can be submitted again.
      const db = await getDb();
      await db.query("UPDATE whatsapp_templates SET meta_id = NULL, status = 'DRAFT', rejected_reason = 'No longer on Meta.', synced_at = now(), updated_at = now() WHERE id = $1", [t.id]);
      missing++;
    }
  }

  let imported = 0;
  const db = await getDb();
  for (const m of remote.values()) {
    const body = bodyOf(m);
    if (!body) continue;
    const footer = m.components?.find((c) => c.type === "FOOTER")?.text ?? null;
    await db.query(
      `INSERT INTO whatsapp_templates (name, language, category, audience, events, body, footer, variables, meta_id, status, rejected_reason, enabled, synced_at)
       VALUES ($1, $2, $3, $10, '[]'::jsonb, $4, $5, $6::jsonb, $7, $8, $9, false, now())
       ON CONFLICT (name, language) DO NOTHING`,
      [m.name, m.language, m.category === "MARKETING" ? "MARKETING" : "UTILITY", body, footer, JSON.stringify(Array(variableCount(body)).fill("")), m.id, normaliseStatus(m.status), m.rejected_reason && m.rejected_reason !== "NONE" ? m.rejected_reason : null, guessAudience(m.name)]
    );
    imported++;
  }
  return { ok: true, updated, imported, missing };
}

// From Meta's webhook: a template's review finished.
export async function applyTemplateStatus(name: string, language: string | undefined, status: string, reason?: string): Promise<void> {
  const db = await getDb();
  await db.query(
    `UPDATE whatsapp_templates SET status = $3, rejected_reason = $4, synced_at = now(), updated_at = now()
     WHERE name = $1 AND ($2::text IS NULL OR language = $2)`,
    [name, language ?? null, normaliseStatus(status), reason && reason !== "NONE" ? reason : null]
  );
}

// ---- filling a template ---------------------------------------------------------------
export type TemplateContext = Record<VariableSource, string>;

export function resolveParams(t: Pick<WaTemplate, "variables">, ctx: Partial<TemplateContext>): string[] {
  return t.variables.map((v) => (v ? ctx[v] || "-" : "-"));
}

// The template's text with sample values, as a test message or preview would show it.
export function sampleText(t: Pick<WaTemplate, "body" | "variables">): string {
  return renderExample(t.body, t.variables);
}

export function sampleParams(t: Pick<WaTemplate, "variables">): string[] {
  return t.variables.map((v) => (v ? SOURCE_BY_KEY.get(v)?.example ?? "example" : "example"));
}

// ---- mapping events to existing templates ---------------------------------------------
// Chooses which template an event uses for an audience (or none: nothing is sent). Only one
// switched-on template can hold an event per audience, so the previous holder lets go of it. A template that
// is switched off is switched on by being chosen.
export async function mapEvent(event: string, audience: Audience, templateId: number | null): Promise<{ ok: true } | { ok: false; error: string }> {
  const def = EVENT_BY_KEY.get(event);
  if (!def || !def.audiences.includes(audience)) return { ok: false, error: "That event is not sent to that audience." };

  const all = await listTemplates();
  const chosen = templateId === null ? null : all.find((t) => t.id === templateId);
  if (templateId !== null && !chosen) return { ok: false, error: "That template no longer exists. Refresh the page." };
  if (chosen && chosen.audience !== audience) return { ok: false, error: `That template is for ${chosen.audience}s.` };

  for (const t of all) {
    if (t.audience === audience && t.id !== templateId && t.events.includes(event)) {
      await updateTemplate(t.id, { events: t.events.filter((e) => e !== event) });
    }
  }
  if (chosen) {
    await updateTemplate(chosen.id, { events: chosen.events.includes(event) ? chosen.events : [...chosen.events, event], enabled: true });
  }
  return { ok: true };
}
