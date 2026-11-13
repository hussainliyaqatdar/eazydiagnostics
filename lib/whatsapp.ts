// SERVER-ONLY. Sends WhatsApp messages through Meta's WhatsApp Cloud API.
//
// Messages we start (an order update the customer did not just ask for) must use a
// pre-approved TEMPLATE; free-form text is only allowed inside 24 hours of the
// customer's own message. So every update goes out as an approved template mapped to the
// status on /admin/whatsapp (see docs/whatsapp-setup.md).
import { normalizeMobile } from "./doctor-onboarding";

// Overridable only so the flow can be tested against a stand-in server.
const API_BASE = process.env.WHATSAPP_API_BASE || "https://graph.facebook.com";
const API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

export const TEMPLATE_LANGUAGE = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en";
// Needed to create / list / delete templates (the WhatsApp Business Account the number belongs to).
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
// The Meta app's id: needed to upload the sample image a template with an image header is reviewed with.
const APP_ID = process.env.WHATSAPP_APP_ID;
// Webhook: the token Meta is told to echo back when subscribing, and the app secret its calls are signed with.
export const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
export const APP_SECRET = process.env.WHATSAPP_APP_SECRET;

export type DeliveryResult = { ok: boolean; detail: string; messageId?: string };

export function whatsappConfigStatus() {
  return {
    tokenSet: !!ACCESS_TOKEN,
    phoneNumberIdSet: !!PHONE_NUMBER_ID,
    businessAccountIdSet: !!WABA_ID,
    appIdSet: !!APP_ID,
    verifyTokenSet: !!WEBHOOK_VERIFY_TOKEN,
    appSecretSet: !!APP_SECRET,
    language: TEMPLATE_LANGUAGE,
  };
}

export function whatsappConfigured(): boolean {
  return !!ACCESS_TOKEN && !!PHONE_NUMBER_ID;
}

// Free-text numbers from checkout ("+91 98450 12345", "098450-12345") -> "919845012345"
// (the digits-only international form the API wants). null if it is not an Indian mobile.
export function toWhatsappNumber(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const mobile = normalizeMobile(raw);
  return mobile ? `91${mobile}` : null;
}

// Template variables may not contain newlines, tabs or runs of 4+ spaces (Meta rejects
// the message), and are capped in length.
function cleanParam(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 500) || "-";
}

// Sends one template message and reports what happened. Retries once on a network
// error or a 5xx; a 4xx (bad token, unapproved template, number not on WhatsApp)
// will not fix itself, so its reason is returned as-is for the admin to see.
export async function sendTemplate(to: string, template: string, params: string[], opts: { language?: string; headerImageUrl?: string } = {}): Promise<DeliveryResult> {
  if (!whatsappConfigured()) {
    const detail = "WhatsApp is not set up (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID missing), so nothing was sent.";
    if (process.env.NODE_ENV === "production") console.error(`[whatsapp] ${detail} (${template} to ${to})`);
    else console.log(`[whatsapp:dev] ${template} to ${to}: ${params.join(" | ")}`);
    return { ok: false, detail };
  }

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: template,
      language: { code: opts.language || TEMPLATE_LANGUAGE },
      // A template with no variables and no image takes no components. An image header is sent by link: WhatsApp
      // fetches it when the message goes out.
      ...(params.length > 0 || opts.headerImageUrl
        ? {
            components: [
              ...(opts.headerImageUrl ? [{ type: "header", parameters: [{ type: "image", image: { link: opts.headerImageUrl } }] }] : []),
              ...(params.length > 0 ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text: cleanParam(text) })) }] : []),
            ],
          }
        : {}),
    },
  };

  let detail = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/${API_VERSION}/${PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        console.log(`[whatsapp] Sent ${template} to ${to}.`);
        // WhatsApp's id for the message; the webhook reports delivered / read / failed against it.
        const messageId = ((await res.json().catch(() => null)) as { messages?: { id?: string }[] } | null)?.messages?.[0]?.id;
        return { ok: true, detail: "Sent.", messageId };
      }
      const text = await res.text().catch(() => "");
      let reason = text;
      try {
        reason = JSON.parse(text)?.error?.message ?? text;
      } catch {
        // Not JSON - keep the raw text.
      }
      detail = `WhatsApp rejected it (HTTP ${res.status}): ${reason}`.slice(0, 400);
      console.error(`[whatsapp] ${template} to ${to}: ${detail}`);
      if (res.status < 500) break;
    } catch (err) {
      detail = `Could not reach WhatsApp: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[whatsapp] ${template} to ${to}: ${detail}`);
    }
  }
  return { ok: false, detail };
}

// ---- Graph API: connection and template management -------------------------------------
export type GraphResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function graph<T>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<GraphResult<T>> {
  if (!ACCESS_TOKEN) return { ok: false, error: "WHATSAPP_ACCESS_TOKEN is not set." };
  try {
    const res = await fetch(`${API_BASE}/${API_VERSION}/${path}`, {
      method,
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Not JSON.
    }
    if (res.ok) return { ok: true, data: json as T };
    const err = (json as { error?: { message?: string; error_user_msg?: string; error_user_title?: string } } | null)?.error;
    return { ok: false, error: `${err?.error_user_msg || err?.message || text || `HTTP ${res.status}`}`.slice(0, 500) };
  } catch (err) {
    return { ok: false, error: `Could not reach WhatsApp: ${err instanceof Error ? err.message : String(err)}` };
  }
}

const needWaba = (): GraphResult<never> | null =>
  WABA_ID ? null : { ok: false, error: "WHATSAPP_BUSINESS_ACCOUNT_ID is not set (needed to manage templates)." };

// The number messages go out from: confirms the token and phone number id work.
export async function metaPhoneInfo(): Promise<GraphResult<{ display_phone_number?: string; verified_name?: string; quality_rating?: string }>> {
  if (!PHONE_NUMBER_ID) return { ok: false, error: "WHATSAPP_PHONE_NUMBER_ID is not set." };
  return graph("GET", `${PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,quality_rating`);
}

export type MetaTemplate = {
  id: string;
  name: string;
  language: string;
  status: string;
  category?: string;
  rejected_reason?: string;
  components?: { type: string; text?: string; format?: string }[];
};

export async function metaListTemplates(): Promise<GraphResult<MetaTemplate[]>> {
  const missing = needWaba();
  if (missing) return missing;
  const all: MetaTemplate[] = [];
  let path: string | null = `${WABA_ID}/message_templates?fields=name,language,status,category,rejected_reason,components&limit=100`;
  for (let page = 0; page < 10 && path; page++) {
    const res: GraphResult<{ data?: MetaTemplate[]; paging?: { next?: string } }> = await graph("GET", path);
    if (!res.ok) return res;
    all.push(...(res.data.data ?? []));
    // The "next" link is a full URL: keep only what follows the version.
    const next: string | undefined = res.data.paging?.next;
    path = next ? next.replace(/^https?:\/\/[^/]+\/v[\d.]+\//, "") : null;
  }
  return { ok: true, data: all };
}

type TemplateSubmission = { name: string; language: string; category: string; body: string; footer?: string; examples: string[]; headerHandle?: string };

function components(t: TemplateSubmission) {
  return [
    ...(t.headerHandle ? [{ type: "HEADER", format: "IMAGE", example: { header_handle: [t.headerHandle] } }] : []),
    { type: "BODY", text: t.body, ...(t.examples.length > 0 ? { example: { body_text: [t.examples] } } : {}) },
    ...(t.footer ? [{ type: "FOOTER", text: t.footer }] : []),
  ];
}

export async function metaCreateTemplate(t: TemplateSubmission): Promise<GraphResult<{ id: string; status?: string }>> {
  const missing = needWaba();
  if (missing) return missing;
  return graph("POST", `${WABA_ID}/message_templates`, { name: t.name, language: t.language, category: t.category, components: components(t) });
}

// Edits a template Meta already holds (only allowed for approved / rejected / paused ones, and the
// category cannot change). The edit goes back for review.
export async function metaUpdateTemplate(metaId: string, t: TemplateSubmission): Promise<GraphResult<{ success?: boolean }>> {
  return graph("POST", metaId, { components: components(t) });
}

export async function metaDeleteTemplate(name: string): Promise<GraphResult<{ success?: boolean }>> {
  const missing = needWaba();
  if (missing) return missing;
  return graph("DELETE", `${WABA_ID}/message_templates?name=${encodeURIComponent(name)}`);
}

// Uploads the image a template with an image header is reviewed with (Meta's resumable upload) and returns the
// handle to put in the template. Needs WHATSAPP_APP_ID. The image sent to patients can differ; this is the sample.
export async function metaUploadSample(bytes: Buffer, contentType: string, fileName: string): Promise<GraphResult<string>> {
  if (!APP_ID) return { ok: false, error: "WHATSAPP_APP_ID is not set (needed to attach an image to a template)." };
  if (!ACCESS_TOKEN) return { ok: false, error: "WHATSAPP_ACCESS_TOKEN is not set." };
  const safeName = fileName.replace(/[^\w.\-]/g, "_").slice(0, 80) || "image";
  try {
    // 1. Open an upload session for a file of this size and type.
    const session = await graph<{ id?: string }>("POST", `${APP_ID}/uploads?file_name=${encodeURIComponent(safeName)}&file_length=${bytes.length}&file_type=${encodeURIComponent(contentType)}`);
    if (!session.ok) return session;
    if (!session.data.id) return { ok: false, error: "Meta did not open an upload session." };
    // 2. Send the bytes. (This call authenticates with "OAuth", not "Bearer".)
    const res = await fetch(`${API_BASE}/${API_VERSION}/${session.data.id}`, {
      method: "POST",
      headers: { Authorization: `OAuth ${ACCESS_TOKEN}`, file_offset: "0", "Content-Type": "application/octet-stream" },
      body: new Uint8Array(bytes),
      signal: AbortSignal.timeout(30_000),
    });
    const json = (await res.json().catch(() => null)) as { h?: string; error?: { message?: string } } | null;
    if (!res.ok || !json?.h) return { ok: false, error: `${json?.error?.message ?? `Meta rejected the image (HTTP ${res.status}).`}`.slice(0, 400) };
    return { ok: true, data: json.h };
  } catch (err) {
    return { ok: false, error: `Could not reach WhatsApp: ${err instanceof Error ? err.message : String(err)}` };
  }
}
