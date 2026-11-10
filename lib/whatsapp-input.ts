// SERVER-ONLY. Reads and checks a template from a request body.
import { AUDIENCES, CATEGORIES, isVariableSource, validateTemplate, variableCount, type Audience, type TemplateCategory, type TemplateErrors, type TemplateInput, type VariableSource } from "./whatsapp-events";

const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export function readTemplateInput(body: Record<string, unknown>): TemplateInput {
  const audience = AUDIENCES.includes(body.audience as Audience) ? (body.audience as Audience) : ("patient" as Audience);
  const text0 = text(body.body, 2000);
  const n = variableCount(text0);
  const given = Array.isArray(body.variables) ? body.variables : [];
  return {
    name: text(body.name, 80).trim(),
    language: text(body.language, 10).trim() || "en",
    category: (CATEGORIES as readonly string[]).includes(body.category as string) ? (body.category as TemplateCategory) : "UTILITY",
    audience,
    events: Array.isArray(body.events) ? body.events.filter((e): e is string => typeof e === "string").slice(0, 20) : [],
    body: text0,
    footer: text(body.footer, 200),
    // One entry per {{n}} in the body; anything not a known source is left empty and reported.
    variables: Array.from({ length: n }, (_, i) => (isVariableSource(given[i]) ? (given[i] as VariableSource) : ("" as VariableSource))),
  };
}

export function firstError(errors: TemplateErrors): string | null {
  const first = Object.values(errors).find(Boolean);
  return first ?? null;
}

export { validateTemplate };
