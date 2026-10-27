// SERVER-ONLY. Orders ("bookings") in the database (lib/db.ts).
import { getDb } from "./db";
import type { Booking } from "./types";

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
  collection_date: string;
  collection_slot: string;
  doctor_id: string | null;
  referral_name: string | null;
  referral_clinic: string | null;
};

export async function saveBooking(b: Booking): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO orders (id, created_at, patient, items, subtotal_mrp, subtotal_price, savings,
                         coupon_code, coupon_discount, collection_date, collection_slot, payment_status,
                         doctor_id, referral_name, referral_clinic)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
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
    ]
  );
}

export async function getBooking(id: string): Promise<Booking | undefined> {
  const db = await getDb();
  const [r] = await db.query<OrderRow>("SELECT * FROM orders WHERE id = $1", [id]);
  if (!r) return undefined;
  return {
    id: r.id,
    createdAt: new Date(r.created_at).toISOString(),
    patient: r.patient,
    items: r.items,
    ...(r.referral_name ? { referral: { name: r.referral_name, ...(r.doctor_id ? { doctorId: r.doctor_id } : {}), ...(r.referral_clinic ? { clinic: r.referral_clinic } : {}) } } : {}),
    subtotalMrp: r.subtotal_mrp,
    subtotalPrice: r.subtotal_price,
    savings: r.savings,
    ...(r.coupon_code ? { couponCode: r.coupon_code, couponDiscount: r.coupon_discount ?? 0 } : {}),
    date: r.collection_date,
    slot: r.collection_slot,
    paymentStatus: "due",
  };
}

// The slots already taken on a date.
export async function getBookedSlots(date: string): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.query<{ collection_slot: string }>("SELECT collection_slot FROM orders WHERE collection_date = $1", [date]);
  return new Set(rows.map((r) => r.collection_slot));
}
