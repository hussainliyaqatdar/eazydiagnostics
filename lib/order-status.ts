// Order statuses and the WhatsApp wording for each. Pure and dependency-free
// (safe to import from client components); the sending lives in
// lib/whatsapp.ts and lib/order-notifications.ts.

export const ORDER_STATUSES = ["booked", "confirmed", "on_the_way", "collected", "processing", "report_ready", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const DEFAULT_ORDER_STATUS: OrderStatus = "booked";

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

// What the admin sees in the status dropdown.
export const STATUS_LABELS: Record<OrderStatus, string> = {
  booked: "Booked (new)",
  confirmed: "Confirmed",
  on_the_way: "Phlebotomist on the way",
  collected: "Sample collected",
  processing: "At the lab - processing",
  report_ready: "Report ready",
  cancelled: "Cancelled",
};

// Who is told when an order moves to a status. "booked" is the initial state (the
// on-screen confirmation already covers it), so it sends nothing. The referring
// doctor hears about the milestones that matter to them, not every step.
export const NOTIFY: Record<OrderStatus, { patient: boolean; doctor: boolean }> = {
  booked: { patient: false, doctor: false },
  confirmed: { patient: true, doctor: false },
  on_the_way: { patient: true, doctor: false },
  collected: { patient: true, doctor: true },
  processing: { patient: true, doctor: false },
  report_ready: { patient: true, doctor: true },
  cancelled: { patient: true, doctor: true },
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
    case "confirmed":
      return `Your booking is confirmed. Sample collection is scheduled for ${readableDate(c.date)}, ${c.slot}.`;
    case "on_the_way":
      return "Our phlebotomist is on the way to collect your sample. Please keep your phone handy.";
    case "collected":
      return "Your sample has been collected and is on its way to the lab.";
    case "processing":
      return "Your sample has reached the lab and is being processed.";
    case "report_ready":
      return "Your report is ready. Our team will share it with you on WhatsApp.";
    case "cancelled":
      return `Your booking has been cancelled. To book again, call us on ${c.contactPhone}.`;
  }
}

// The same news, written to the referring doctor about their patient.
export function doctorLine(status: OrderStatus, c: StatusContext): string {
  switch (status) {
    case "booked":
      return `The booking is scheduled for ${readableDate(c.date)}, ${c.slot}.`;
    case "confirmed":
      return `The booking is confirmed for ${readableDate(c.date)}, ${c.slot}.`;
    case "on_the_way":
      return "Our phlebotomist is on the way for sample collection.";
    case "collected":
      return "The sample has been collected and is on its way to the lab.";
    case "processing":
      return "The sample is at the lab and being processed.";
    case "report_ready":
      return "The report is ready and is being shared with the patient.";
    case "cancelled":
      return "The booking has been cancelled.";
  }
}
