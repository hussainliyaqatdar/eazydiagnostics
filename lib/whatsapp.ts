// SERVER-ONLY. Sends WhatsApp messages through Meta's WhatsApp Cloud API.
//
// Messages we start (an order update the customer did not just ask for) must use a
// pre-approved TEMPLATE; free-form text is only allowed inside 24 hours of the
// customer's own message. So every update goes out as one of two generic
// templates (patient / doctor) whose last variable carries the status sentence -
// see docs/whatsapp-setup.md for the exact template text to submit to Meta.
import { normalizeMobile } from "./doctor-onboarding";

// Overridable only so the flow can be tested against a stand-in server.
const API_BASE = process.env.WHATSAPP_API_BASE || "https://graph.facebook.com";
const API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

export const PATIENT_TEMPLATE = process.env.WHATSAPP_PATIENT_TEMPLATE || "order_status_patient";
export const DOCTOR_TEMPLATE = process.env.WHATSAPP_DOCTOR_TEMPLATE || "order_status_doctor";
const TEMPLATE_LANGUAGE = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en";

export type DeliveryResult = { ok: boolean; detail: string };

export function whatsappConfigStatus() {
  return {
    tokenSet: !!ACCESS_TOKEN,
    phoneNumberIdSet: !!PHONE_NUMBER_ID,
    patientTemplate: PATIENT_TEMPLATE,
    doctorTemplate: DOCTOR_TEMPLATE,
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
export async function sendTemplate(to: string, template: string, params: string[]): Promise<DeliveryResult> {
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
      language: { code: TEMPLATE_LANGUAGE },
      components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text: cleanParam(text) })) }],
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
        return { ok: true, detail: "Sent." };
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
