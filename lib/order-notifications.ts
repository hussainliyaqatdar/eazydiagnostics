// SERVER-ONLY. Works out who should hear about an order's new status, sends them a
// WhatsApp message, and records what happened (shown on /admin/orders).
import { getDb } from "./db";
import { recordNotification } from "./orders";
import { BOOKING_PHONE } from "./site-config";
import { doctorLine, NOTIFY, patientLine, type OrderStatus } from "./order-status";
import { DOCTOR_TEMPLATE, PATIENT_TEMPLATE, sendTemplate, toWhatsappNumber, type DeliveryResult } from "./whatsapp";
import type { Booking } from "./types";

export type NotificationOutcome = DeliveryResult & { recipient: string; to: string };

type Message = { recipient: string; to: string; template: string; params: string[] };

async function doctorContact(doctorId: string): Promise<{ name: string; mobile: string } | undefined> {
  const db = await getDb();
  const [d] = await db.query<{ name: string; mobile: string }>("SELECT name, mobile FROM doctors WHERE id = $1", [doctorId]);
  return d;
}

// The messages for this status. Everyone named on the visit with a WhatsApp number
// (the contact, plus any member who asked for reports on their own number) hears
// about it once, and so does the referring doctor when they are on the doctors list.
async function buildMessages(booking: Booking, status: OrderStatus): Promise<Message[]> {
  const rules = NOTIFY[status];
  const ctx = { date: booking.date, slot: booking.slot, contactPhone: BOOKING_PHONE };
  const messages: Message[] = [];
  const seen = new Set<string>();

  if (rules.patient) {
    const line = patientLine(status, ctx);
    const people = [{ name: booking.patient.name, whatsapp: booking.patient.whatsapp as string | undefined }, ...(booking.members ?? [])];
    for (const p of people) {
      const to = toWhatsappNumber(p.whatsapp);
      if (!to || seen.has(to)) continue;
      seen.add(to);
      messages.push({ recipient: `Patient: ${p.name}`, to, template: PATIENT_TEMPLATE, params: [p.name, booking.id, line] });
    }
    // Checkout may hold a number we cannot message (not an Indian mobile): say so rather than skip silently.
    if (messages.length === 0) messages.push({ recipient: `Patient: ${booking.patient.name}`, to: booking.patient.whatsapp ?? "", template: PATIENT_TEMPLATE, params: [] });
  }

  if (rules.doctor && booking.referral?.doctorId) {
    const doctor = await doctorContact(booking.referral.doctorId).catch(() => undefined);
    const to = toWhatsappNumber(doctor?.mobile);
    if (doctor && to && !seen.has(to)) {
      const who = booking.members && booking.members.length > 1 ? `${booking.patient.name} (+${booking.members.length - 1} more)` : booking.patient.name;
      messages.push({ recipient: `Doctor: ${doctor.name}`, to, template: DOCTOR_TEMPLATE, params: [doctor.name, who, booking.id, doctorLine(status, ctx)] });
    }
  }
  return messages;
}

// Never throws: a WhatsApp problem must not undo a status change that is already saved.
export async function notifyStatusChange(booking: Booking, status: OrderStatus): Promise<NotificationOutcome[]> {
  const messages = await buildMessages(booking, status).catch((err) => {
    console.error(`[whatsapp] Could not work out recipients for ${booking.id}:`, err);
    return [] as Message[];
  });

  return Promise.all(
    messages.map(async (m): Promise<NotificationOutcome> => {
      // An unusable number is recorded as a failure instead of being sent.
      const result: DeliveryResult = m.params.length === 0 ? { ok: false, detail: "Not a valid Indian mobile number, so nothing was sent." } : await sendTemplate(m.to, m.template, m.params);
      await recordNotification({ orderId: booking.id, status, recipient: m.recipient, to: m.to, ok: result.ok, detail: result.detail }).catch((err) =>
        console.error(`[whatsapp] Could not record the message for ${booking.id}:`, err)
      );
      return { ...result, recipient: m.recipient, to: m.to };
    })
  );
}
