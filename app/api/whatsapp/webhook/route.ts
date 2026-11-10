import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { APP_SECRET, WEBHOOK_VERIFY_TOKEN } from "@/lib/whatsapp";
import { applyDelivery } from "@/lib/whatsapp-log";
import { applyTemplateStatus } from "@/lib/whatsapp-templates";

// Meta's webhook for the WhatsApp number. In the app's WhatsApp > Configuration page set the callback URL
// to <SITE_URL>/api/whatsapp/webhook and the verify token to WHATSAPP_WEBHOOK_VERIFY_TOKEN, and subscribe to
// "messages" (delivery receipts) and "message_template_status_update" (approvals).

// Meta calls this once when the webhook is saved: echo the challenge if the token matches.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  if (WEBHOOK_VERIFY_TOKEN && q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === WEBHOOK_VERIFY_TOKEN) {
    return new Response(q.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

function signatureOk(raw: string, header: string | null): boolean {
  if (!APP_SECRET) return process.env.NODE_ENV !== "production"; // unsigned calls are only accepted in development
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", APP_SECRET).update(raw).digest("hex");
  const given = header.slice(7);
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

type Status = { id?: string; status?: string; errors?: { title?: string; message?: string; error_data?: { details?: string } }[] };
type Change = {
  field?: string;
  value?: {
    statuses?: Status[];
    event?: string;
    message_template_name?: string;
    message_template_language?: string;
    reason?: string;
  };
};

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!signatureOk(raw, req.headers.get("x-hub-signature-256"))) return new Response("Forbidden", { status: 403 });

  let body: { entry?: { changes?: Change[] }[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  try {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const v = change.value;
        if (!v) continue;
        // Delivery receipts for messages we sent.
        for (const s of v.statuses ?? []) {
          if (!s.id || !s.status) continue;
          const err = s.errors?.[0];
          await applyDelivery(s.id, s.status, err ? `${err.title ?? "Failed"}${err.message || err.error_data?.details ? `: ${err.message ?? err.error_data?.details}` : ""}` : undefined);
        }
        // A template's review finished.
        if (change.field === "message_template_status_update" && v.message_template_name && v.event) {
          await applyTemplateStatus(v.message_template_name, v.message_template_language, v.event, v.reason);
        }
      }
    }
  } catch (err) {
    // Answer 5xx so Meta retries, rather than dropping the receipt.
    console.error("[whatsapp] webhook could not be processed:", err);
    return new Response("Error", { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
