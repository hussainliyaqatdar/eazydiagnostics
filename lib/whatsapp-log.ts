// SERVER-ONLY. The record of WhatsApp messages sent about orders, and how far each one got.
// order_notifications is written when a message is sent (lib/order-notifications.ts); WhatsApp's webhook
// then reports sent / delivered / read / failed against the message id it gave back.
import { getDb } from "./db";

export type MessageRow = {
  id: number;
  orderId: string;
  what: string;
  recipient: string;
  to: string;
  template: string | null;
  // "sent" | "delivered" | "read" | "failed" | null (older rows)
  delivery: string | null;
  detail: string;
  at: string;
};

export async function recentMessages(limit = 300): Promise<MessageRow[]> {
  const db = await getDb();
  const rows = await db.query<{
    id: number | string; order_id: string; status: string; recipient: string; to_number: string; template: string | null;
    delivery_status: string | null; ok: boolean; detail: string; created_at: Date | string;
  }>(
    "SELECT id, order_id, status, recipient, to_number, template, delivery_status, ok, detail, created_at FROM order_notifications ORDER BY created_at DESC, id DESC LIMIT $1",
    [limit]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    orderId: r.order_id,
    what: r.status,
    recipient: r.recipient,
    to: r.to_number,
    template: r.template,
    delivery: r.delivery_status ?? (r.ok ? "sent" : "failed"),
    detail: r.detail,
    at: new Date(r.created_at).toISOString(),
  }));
}

const RANK: Record<string, number> = { sent: 1, delivered: 2, read: 3 };

// A delivery receipt from the webhook. Receipts can arrive out of order, so a message never moves
// backwards (read -> delivered), and a read message is never marked failed. Returns whether a row changed.
export async function applyDelivery(messageId: string, status: string, errorText?: string): Promise<boolean> {
  if (!["sent", "delivered", "read", "failed"].includes(status)) return false;
  const db = await getDb();
  const [row] = await db.query<{ id: number | string; delivery_status: string | null }>("SELECT id, delivery_status FROM order_notifications WHERE wa_message_id = $1", [messageId]);
  if (!row) return false;
  const current = row.delivery_status ?? "sent";
  if (status === "failed" ? current === "read" || current === "delivered" : (RANK[status] ?? 0) <= (RANK[current] ?? 0)) return false;
  if (status === "failed") {
    await db.query("UPDATE order_notifications SET delivery_status = 'failed', ok = false, detail = $2, delivery_updated_at = now() WHERE id = $1", [row.id, (errorText || "WhatsApp could not deliver the message.").slice(0, 400)]);
  } else {
    await db.query("UPDATE order_notifications SET delivery_status = $2, delivery_updated_at = now() WHERE id = $1", [row.id, status]);
  }
  return true;
}
