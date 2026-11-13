// Statuses for a visit (the whole home collection), its payment, and each member's
// report - and the WhatsApp wording for each. Pure and dependency-free (safe to import
// from client components); the sending lives in lib/whatsapp.ts and
// lib/order-notifications.ts.

// ---- visit status ---------------------------------------------------------------
export const ORDER_STATUSES = [
  "booked",
  "visit_scheduled",
  "samples_collected",
  "reached_lab",
  "partially_complete",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const DEFAULT_ORDER_STATUS: OrderStatus = "booked";

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

// What the admin sees in the status dropdown.
export const STATUS_LABELS: Record<OrderStatus, string> = {
  booked: "Booked",
  visit_scheduled: "Visit scheduled",
  samples_collected: "Samples collected",
  reached_lab: "Reached lab",
  partially_complete: "Partially complete",
  completed: "Completed",
  cancelled: "Cancelled",
};

// ---- payment status -------------------------------------------------------------
export const PAYMENT_STATUSES = ["pending", "paid", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return typeof value === "string" && (PAYMENT_STATUSES as readonly string[]).includes(value);
}

export const PAYMENT_LABELS: Record<PaymentStatus, string> = { pending: "Pending", paid: "Paid", refunded: "Refunded" };

// ---- report status (per member) -------------------------------------------------
// "none" until a report is ready; then a partial one (some tests), then the full one.
// A member has one report at a time: the full report replaces the partial one.
export const REPORT_STATUSES = ["none", "partial", "full"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export function isReportStatus(value: unknown): value is ReportStatus {
  return typeof value === "string" && (REPORT_STATUSES as readonly string[]).includes(value);
}

export const REPORT_LABELS: Record<ReportStatus, string> = { none: "No report yet", partial: "Partial report", full: "Full report" };

// ---- who is told ----------------------------------------------------------------
// "booked" is the starting state (the on-screen confirmation already covers it), so it
// sends nothing. Every other visit status goes to the patient and to the prescribing
// doctors (only those a member chose from the registered-doctors list).
export const NOTIFY_VISIT: Record<OrderStatus, boolean> = {
  booked: false,
  visit_scheduled: true,
  samples_collected: true,
  reached_lab: true,
  partially_complete: true,
  completed: true,
  cancelled: true,
};

export type StatusContext = {
  // "2026-11-12" and "07:00 - 07:30", as stored on the order.
  date: string;
  slot: string;
  // The number patients are told to contact (display form).
  contactPhone: string;
};

// "2026-11-12" -> "Thu, 12 Nov"
export function readableDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

// The sentence that fills the template's last variable, written to the patient.
export function patientLine(status: OrderStatus, c: StatusContext): string {
  switch (status) {
    case "booked":
      return `We have received your booking for ${readableDate(c.date)}, ${c.slot}.`;
    case "visit_scheduled":
      return `Your sample collection is scheduled for ${readableDate(c.date)}, ${c.slot}. Our phlebotomist will arrive within your slot start and end time.`;
    case "samples_collected":
      return "Your sample has been collected and is on its way to the lab.";
    case "reached_lab":
      return "Your sample has reached the lab and is being processed.";
    case "partially_complete":
      return "Some of your results are ready. The rest are still being processed.";
    case "completed":
      return "All your results are ready.";
    case "cancelled":
      return `Your booking has been cancelled. To book again, call us on ${c.contactPhone}.`;
  }
}

// The same news, written to a prescribing doctor about their patient(s).
export function doctorLine(status: OrderStatus, c: StatusContext): string {
  switch (status) {
    case "booked":
      return `The booking is scheduled for ${readableDate(c.date)}, ${c.slot}.`;
    case "visit_scheduled":
      return `Sample collection is scheduled for ${readableDate(c.date)}, ${c.slot}.`;
    case "samples_collected":
      return "The sample has been collected and is on its way to the lab.";
    case "reached_lab":
      return "The sample has reached the lab and is being processed.";
    case "partially_complete":
      return "Some of the results are ready; the rest are still being processed.";
    case "completed":
      return "All the results are ready.";
    case "cancelled":
      return "The booking has been cancelled.";
  }
}

export function paymentLine(status: PaymentStatus, amount: number): string | null {
  const rs = `Rs. ${amount.toLocaleString("en-IN")}`;
  switch (status) {
    case "paid":
      return `We have received your payment of ${rs}. Thank you.`;
    case "refunded":
      return `Your payment of ${rs} has been refunded.`;
    case "pending":
      return null; // Going back to pending is a correction, not news.
  }
}

// `link` is the member's report (only when a file has been uploaded).
export function reportLine(status: ReportStatus, forDoctor: boolean, link: string | null): string | null {
  if (status === "none") return null;
  const kind = status === "partial" ? "partial report" : "full report";
  const tail = link ? ` View it here: ${link}` : " It will be shared with you shortly.";
  return forDoctor ? `The ${kind} is ready.${tail}` : `Your ${kind} is ready.${tail}`;
}
