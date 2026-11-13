// Pure and dependency-free (safe to import from client components). What WhatsApp can tell people about,
// what a template can fill its {{variables}} with, and the rules a template must meet before Meta will
// take it. The sending lives in lib/whatsapp.ts, the template store in lib/whatsapp-templates.ts.

export type Audience = "patient" | "doctor";
export const AUDIENCES: Audience[] = ["patient", "doctor"];
export const AUDIENCE_LABELS: Record<Audience, string> = { patient: "Patient", doctor: "Doctor" };

// ---- events ---------------------------------------------------------------------
export type EventDef = { key: string; label: string; group: "Visit status" | "Payment" | "Report"; audiences: Audience[] };

export const EVENTS: EventDef[] = [
  { key: "visit.visit_scheduled", label: "Visit scheduled", group: "Visit status", audiences: ["patient", "doctor"] },
  { key: "visit.samples_collected", label: "Samples collected", group: "Visit status", audiences: ["patient", "doctor"] },
  { key: "visit.reached_lab", label: "Reached lab", group: "Visit status", audiences: ["patient", "doctor"] },
  { key: "visit.partially_complete", label: "Partially complete", group: "Visit status", audiences: ["patient", "doctor"] },
  { key: "visit.completed", label: "Completed", group: "Visit status", audiences: ["patient", "doctor"] },
  { key: "visit.cancelled", label: "Cancelled", group: "Visit status", audiences: ["patient", "doctor"] },
  { key: "payment.paid", label: "Payment received", group: "Payment", audiences: ["patient"] },
  { key: "payment.refunded", label: "Payment refunded", group: "Payment", audiences: ["patient"] },
  { key: "report.partial", label: "Partial report ready", group: "Report", audiences: ["patient", "doctor"] },
  { key: "report.full", label: "Full report ready", group: "Report", audiences: ["patient", "doctor"] },
];

export const EVENT_BY_KEY = new Map(EVENTS.map((e) => [e.key, e]));
export const eventLabel = (key: string) => EVENT_BY_KEY.get(key)?.label ?? key;

// ---- variables ------------------------------------------------------------------
// What a template's {{n}} can be filled with.
export type VariableSource =
  | "recipient_name"
  | "patient_names"
  | "booking_id"
  | "status_label"
  | "status_message"
  | "collection_date"
  | "collection_slot"
  | "amount"
  | "report_type"
  | "report_link"
  | "contact_phone"
  | "business_name";

export const VARIABLE_SOURCES: { key: VariableSource; label: string; example: string }[] = [
  { key: "recipient_name", label: "Recipient's first name (patient, or the doctor)", example: "Priya" },
  { key: "patient_names", label: "Patient name(s) on the visit", example: "Priya, Arjun" },
  { key: "booking_id", label: "Booking id", example: "BK-M3X9K2" },
  { key: "status_label", label: "Status name (e.g. Samples collected)", example: "Samples collected" },
  { key: "status_message", label: "Ready-made sentence about the change", example: "Your sample has been collected and is on its way to the lab." },
  { key: "collection_date", label: "Collection date", example: "Thu, 12 Nov" },
  { key: "collection_slot", label: "Collection time slot", example: "07:00 - 07:30" },
  { key: "amount", label: "Amount (e.g. Rs. 1,130)", example: "Rs. 1,130" },
  { key: "report_type", label: "Report type (partial / full)", example: "full report" },
  { key: "report_link", label: "Report link", example: "https://example.com/api/reports/abc123" },
  { key: "contact_phone", label: "Our contact number", example: "+91 70197 64500" },
  { key: "business_name", label: "Business name", example: "Eazy Diagnostics" },
];
export const SOURCE_BY_KEY = new Map(VARIABLE_SOURCES.map((v) => [v.key, v]));
export function isVariableSource(value: unknown): value is VariableSource {
  return typeof value === "string" && SOURCE_BY_KEY.has(value as VariableSource);
}

// ---- template shape and rules -----------------------------------------------------
export const CATEGORIES = ["UTILITY", "MARKETING"] as const;
export type TemplateCategory = (typeof CATEGORIES)[number];
export const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "en_US", label: "English (US)" },
  { code: "hi", label: "Hindi" },
  { code: "kn", label: "Kannada" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "mr", label: "Marathi" },
];

// Meta's states, plus DRAFT (written here, not submitted yet).
export type TemplateStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "PAUSED" | "DISABLED" | "IN_APPEAL" | "FLAGGED";

export type TemplateInput = {
  name: string;
  language: string;
  category: TemplateCategory;
  audience: Audience;
  events: string[];
  body: string;
  footer: string;
  // variables[i] fills {{i+1}}.
  variables: VariableSource[];
};

export const LIMITS = { body: 1024, footer: 60, name: 60 };

// The numbers used in {{n}} placeholders, in order of appearance.
export function placeholders(body: string): number[] {
  return [...body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((m) => Number(m[1]));
}

// How many distinct variables the body uses (its highest number).
export function variableCount(body: string): number {
  const nums = placeholders(body);
  return nums.length ? Math.max(...nums) : 0;
}

// Fills the placeholders with each variable's example, for the preview and the test message.
export function renderExample(body: string, variables: (VariableSource | "")[]): string {
  return body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_m, n: string) => {
    const src = variables[Number(n) - 1];
    return (src && SOURCE_BY_KEY.get(src)?.example) || `{{${n}}}`;
  });
}

export type TemplateErrors = Partial<Record<keyof TemplateInput | "form", string>>;

// Everything that can be checked without asking Meta. (A template with no events is fine: it can be the
// template that is not mapped to any status yet.)
export function validateTemplate(t: TemplateInput, submitting: boolean): TemplateErrors {
  const e: TemplateErrors = {};
  if (!/^[a-z][a-z0-9_]*$/.test(t.name) || t.name.length > LIMITS.name) e.name = "Use lowercase letters, numbers and underscores only, starting with a letter (e.g. visit_update_patient).";
  if (!LANGUAGES.some((l) => l.code === t.language)) e.language = "Choose a language.";
  if (!(CATEGORIES as readonly string[]).includes(t.category)) e.category = "Choose a category.";
  if (!AUDIENCES.includes(t.audience)) e.audience = "Choose who receives it.";

  const body = t.body.trim();
  if (!body) e.body = "Write the message.";
  else if (body.length > LIMITS.body) e.body = `At most ${LIMITS.body} characters.`;
  else {
    const nums = placeholders(body);
    const max = nums.length ? Math.max(...nums) : 0;
    const distinct = new Set(nums);
    if (max > 0 && [...Array(max).keys()].some((i) => !distinct.has(i + 1))) e.body = "Number the variables {{1}}, {{2}}, ... with no gaps.";
    else if (/^\s*\{\{/.test(body) || /\}\}\s*$/.test(body)) e.body = "WhatsApp does not allow a variable at the very start or end of the message. Add a few words around it.";
    else if (/\{\{[^}\d]|\{\{\s*\}\}/.test(body) || (body.match(/\{\{/g) || []).length !== (body.match(/\}\}/g) || []).length) e.body = "A variable must look like {{1}}.";
    else if (max > 0 && body.replace(/\{\{\s*\d+\s*\}\}/g, "").trim().length < max * 8) e.body = "Add more fixed wording around the variables: WhatsApp rejects messages that are mostly variables.";
  }

  if (t.footer && t.footer.length > LIMITS.footer) e.footer = `At most ${LIMITS.footer} characters.`;
  if (t.footer && /\{\{/.test(t.footer)) e.footer = "The footer cannot hold variables.";

  const needed = variableCount(body);
  // A draft may leave the variables unmapped (a template brought in from Meta starts that way); sending it to Meta needs them all.
  if (submitting && (t.variables.length !== needed || t.variables.some((v) => !isVariableSource(v)))) e.variables = needed === 0 ? undefined : "Choose what fills each variable.";

  for (const ev of t.events) {
    const def = EVENT_BY_KEY.get(ev);
    if (!def) e.events = "Unknown event.";
    else if (!def.audiences.includes(t.audience)) e.events = `"${def.label}" is not sent to ${AUDIENCE_LABELS[t.audience].toLowerCase()}s.`;
  }
  return e;
}
