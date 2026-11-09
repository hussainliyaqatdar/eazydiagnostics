// SERVER-ONLY. Orders ("bookings") in the database (lib/db.ts).
import { getDb } from "./db";
import type { Booking } from "./types";
import { DEFAULT_ORDER_STATUS, isOrderStatus, type OrderStatus } from "./order-status";

type OrderRow = {
  id: string;
  created_at: Date | string;
  patient: Booking["patient"];
  items: Booking["items"];
  subtotal_mrp: number;
  subtotal_price: number;
  savings: number;
  coupon_code: string | null;
  coupon_discount: number | null;
  collection_charge: number | null;
  members: Booking["members"] | null;
  collection_date: string;
  collection_slot: string;
  doctor_id: string | null;
  referral_name: string | null;
  referral_clinic: string | null;
  status: string;
  status_updated_at: Date | string | null;
};

export async function saveBooking(b: Booking): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO orders (id, created_at, patient, items, subtotal_mrp, subtotal_price, savings,
                         coupon_code, coupon_discount, collection_date, collection_slot, payment_status,
                         doctor_id, referral_name, referral_clinic, collection_charge, members)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      b.id,
      b.createdAt,
      JSON.stringify(b.patient),
      JSON.stringify(b.items),
      b.subtotalMrp,
      b.subtotalPrice,
      b.savings,
      b.couponCode ?? null,
      b.couponDiscount ?? null,
      b.date,
      b.slot,
      b.paymentStatus,
      b.referral?.doctorId ?? null,
      b.referral?.name ?? null,
      b.referral?.clinic ?? null,
      b.collectionCharge ?? null,
      b.members ? JSON.stringify(b.members) : null,
    ]
  );
}

function toBooking(r: OrderRow): Booking {
  return {
    id: r.id,
    createdAt: new Date(r.created_at).toISOString(),
    patient: r.patient,
    items: r.items,
    ...(r.members?.length ? { members: r.members } : {}),
    ...(r.referral_name ? { referral: { name: r.referral_name, ...(r.doctor_id ? { doctorId: r.doctor_id } : {}), ...(r.referral_clinic ? { clinic: r.referral_clinic } : {}) } } : {}),
    subtotalMrp: r.subtotal_mrp,
    subtotalPrice: r.subtotal_price,
    savings: r.savings,
    ...(r.coupon_code ? { couponCode: r.coupon_code, couponDiscount: r.coupon_discount ?? 0 } : {}),
    ...(r.collection_charge ? { collectionCharge: r.collection_charge } : {}),
    date: r.collection_date,
    slot: r.collection_slot,
    paymentStatus: "due",
    status: isOrderStatus(r.status) ? r.status : DEFAULT_ORDER_STATUS,
  };
}

export async function getBooking(id: string): Promise<Booking | undefined> {
  const db = await getDb();
  const [r] = await db.query<OrderRow>("SELECT * FROM orders WHERE id = $1", [id]);
  return r ? toBooking(r) : undefined;
}

// Newest first, for the admin orders page.
export async function listBookings(limit = 200): Promise<(Booking & { statusUpdatedAt?: string })[]> {
  const db = await getDb();
  const rows = await db.query<OrderRow>("SELECT * FROM orders ORDER BY created_at DESC LIMIT $1", [limit]);
  return rows.map((r) => ({ ...toBooking(r), ...(r.status_updated_at ? { statusUpdatedAt: new Date(r.status_updated_at).toISOString() } : {}) }));
}

// Moves an order to a new status. Returns false when nothing changed (same status
// already, or no such order), so a double-click or two admins acting at once
// cannot send the same WhatsApp update twice.
export async function setOrderStatus(id: string, status: OrderStatus): Promise<boolean> {
  const db = await getDb();
  const changed = await db.query<{ id: string }>(
    "UPDATE orders SET status = $2, status_updated_at = now() WHERE id = $1 AND status <> $2 RETURNING id",
    [id, status]
  );
  return changed.length > 0;
}

export type OrderNotification = {
  orderId: string;
  status: OrderStatus;
  recipient: string;
  to: string;
  ok: boolean;
  detail: string;
  createdAt: string;
};

export async function recordNotification(n: Omit<OrderNotification, "createdAt">): Promise<void> {
  const db = await getDb();
  await db.query(
    "INSERT INTO order_notifications (order_id, status, recipient, to_number, ok, detail) VALUES ($1, $2, $3, $4, $5, $6)",
    [n.orderId, n.status, n.recipient, n.to, n.ok, n.detail]
  );
}

// WhatsApp messages sent for these orders, oldest first, grouped by order id.
export async function listNotifications(orderIds: string[]): Promise<Map<string, OrderNotification[]>> {
  const byOrder = new Map<string, OrderNotification[]>();
  if (orderIds.length === 0) return byOrder;
  const db = await getDb();
  const rows = await db.query<{ order_id: string; status: string; recipient: string; to_number: string; ok: boolean; detail: string; created_at: Date | string }>(
    "SELECT order_id, status, recipient, to_number, ok, detail, created_at FROM order_notifications WHERE order_id = ANY($1) ORDER BY created_at, id",
    [orderIds]
  );
  for (const r of rows) {
    const list = byOrder.get(r.order_id) ?? [];
    list.push({
      orderId: r.order_id,
      status: isOrderStatus(r.status) ? r.status : DEFAULT_ORDER_STATUS,
      recipient: r.recipient,
      to: r.to_number,
      ok: r.ok,
      detail: r.detail,
      createdAt: new Date(r.created_at).toISOString(),
    });
    byOrder.set(r.order_id, list);
  }
  return byOrder;
}

// The slots already taken on a date.
export async function getBookedSlots(date: string): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.query<{ collection_slot: string }>("SELECT collection_slot FROM orders WHERE collection_date = $1", [date]);
  return new Set(rows.map((r) => r.collection_slot));
}
