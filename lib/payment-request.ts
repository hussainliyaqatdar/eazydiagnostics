// Pure and dependency-free (safe to import from client components). When may a payment request ("please pay",
// with the payment QR code) be sent for an order? Only when Eazy Diagnostics - not the clinic - collects the
// payment, and the payment is still pending.
import { paidAtClinic } from "./booking-totals";
import { PAYMENT_LABELS } from "./order-status";
import type { Booking } from "./types";

// Why a payment request must not be sent, or null when it may.
export function paymentRequestBlocker(b: Pick<Booking, "paymentCollector" | "referral" | "paymentStatus" | "status">): string | null {
  if (paidAtClinic(b)) return "The clinic collects payment for this order, so no payment request is sent.";
  if (b.paymentStatus !== "pending") return `Payment is already ${PAYMENT_LABELS[b.paymentStatus].toLowerCase()}.`;
  if (b.status === "cancelled") return "This visit is cancelled.";
  return null;
}
