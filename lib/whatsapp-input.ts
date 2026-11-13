// SERVER-ONLY. Reads and checks a template from a request body.
import { AUDIENCES, CATEGORIES, isVariableSource, validateTemplate, variableCount, type Audience, type TemplateCategory, type TemplateErrors, type TemplateButton, type TemplateInput, type VariableSource } from "./whatsapp-events";

const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

function readButtons(raw: unknown): TemplateButton[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 10)
    .filter((b): b is Record<string, unknown> => !!b && typeof b === "object")
    .map((b) => ({
      text: text(b.text, 200).trim(),
      url: text(b.url, 2100).trim(),
      variable: isVariableSource(b.variable) ? (b.variable as VariableSource) : ("" as VariableSource | ""),
    }));
}

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
    buttons: readButtons(body.buttons),
  };
}

export function firstError(errors: TemplateErrors): string | null {
  const first = Object.values(errors).find(Boolean);
  return first ?? null;
}

export { validateTemplate };
