// The audit trail of a visit: what changed on an order and when. WhatsApp sends have their own table
// (order_notifications); auditTrail() merges both into one list, newest first.
import { getDb } from "./db";
import { listNotifications } from "./orders";

export type AuditKind = "visit" | "payment" | "report-status" | "report-file" | "whatsapp";

export type AuditRow = {
  at: string; // ISO time
  kind: AuditKind;
  // Who or what it was about: "Visit", a member's name, or the WhatsApp recipient.
  subject: string;
  // What happened, in a sentence.
  detail: string;
  // WhatsApp rows only: whether the message got through.
  ok?: boolean;
};

// Best effort: an audit entry that cannot be written must never fail the change it describes.
export async function logEvent(orderId: string, kind: Exclude<AuditKind, "whatsapp">, summary: string, memberName?: string): Promise<void> {
  try {
    const db = await getDb();
    await db.query("INSERT INTO order_events (order_id, kind, member_name, summary) VALUES ($1, $2, $3, $4)", [orderId, kind, memberName ?? null, summary.slice(0, 400)]);
  } catch (err) {
    console.error("Audit event could not be written:", err);
  }
}

export async function auditTrail(orderId: string): Promise<AuditRow[]> {
  const db = await getDb();
  const events = await db.query<{ kind: string; member_name: string | null; summary: string; created_at: Date | string }>(
    "SELECT kind, member_name, summary, created_at FROM order_events WHERE order_id = $1 ORDER BY created_at, id",
    [orderId]
  );
  const messages = (await listNotifications([orderId])).get(orderId) ?? [];
  const rows: AuditRow[] = [
    ...events.map((e) => ({ at: new Date(e.created_at).toISOString(), kind: e.kind as AuditKind, subject: e.member_name || "Visit", detail: e.summary })),
    ...messages.map((n) => ({
      at: n.createdAt,
      kind: "whatsapp" as const,
      subject: `${n.recipient} (${n.to})`,
      detail: n.ok ? `${n.label} message sent` : `${n.label} message not sent - ${n.detail}`,
      ok: n.ok,
    })),
  ];
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}
