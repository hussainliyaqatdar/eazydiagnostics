// SERVER-ONLY. Works out who should hear about a change on an order, sends them a WhatsApp
// message, and records what happened (shown on /admin/orders and /admin/whatsapp).
//
//  - Visit status changes and payment changes go to the patient(s) and to each prescribing
//    doctor. A report becoming partial / full goes to that member and their doctor.
//  - A doctor is messaged ONLY if the patient chose them as "Prescribed by" for a member from the
//    registered-doctors list at booking (the member's doctor_id), on the WhatsApp number the doctor
//    gave at /for-doctors. A typed-in name, or no doctor, means no doctor message.
//  - Which template carries a message: the APPROVED, switched-on template bound to the event on
//    /admin/whatsapp, or - when there is none - the generic template from the environment
//    (see docs/whatsapp-setup.md).
//  - No double sends: the caller only gets here when a status really changed (see
//    setOrderStatus & co.), and every message is reserved in order_notifications under a unique
//    (order, number, event) key before it is sent.
import { getDoctor } from "./doctors";
import { claimNotification, finishNotification } from "./orders";
import { BOOKING_PHONE, BUSINESS_NAME, SITE_URL } from "./site-config";
import {
  doctorLine,
  NOTIFY_VISIT,
  paymentLine,
  patientLine,
  readableDate,
  reportLine,
  STATUS_LABELS,
  PAYMENT_LABELS,
  REPORT_LABELS,
  type OrderStatus,
  type PaymentStatus,
  type ReportStatus,
} from "./order-status";
import { DOCTOR_TEMPLATE, PATIENT_TEMPLATE, sendTemplate, toWhatsappNumber, type DeliveryResult } from "./whatsapp";
import { findTemplateFor, resolveParams, type TemplateContext } from "./whatsapp-templates";
import type { Audience } from "./whatsapp-events";
import type { OrderMember } from "./order-admin";
import type { Booking } from "./types";

export type NotificationOutcome = DeliveryResult & { recipient: string; to: string; skipped?: boolean };

type Message = {
  recipient: string;
  to: string;
  audience: Audience;
  // What the message is about, as an events key ("visit.completed"); picks the template.
  event: string;
  // The generic template's parameters, used when no template is bound to the event.
  fallback: string[];
  // Values a bound template can fill its variables with.
  ctx: Partial<TemplateContext>;
};

// The first name is plenty for a greeting.
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

// What every message about this booking can say.
function baseContext(booking: Booking, event: { label: string; line: string }): Partial<TemplateContext> {
  return {
    booking_id: booking.id,
    status_label: event.label,
    status_message: event.line,
    collection_date: readableDate(booking.date),
    collection_slot: booking.slot,
    contact_phone: BOOKING_PHONE,
    business_name: BUSINESS_NAME,
  };
}

// Patients: one message per distinct WhatsApp number (a family sharing the contact's number hears
// once), addressed to the first member on that number. A member without a usable number of their own
// uses the visit's.
function patientMessages(members: OrderMember[], booking: Booking, event: string, base: Partial<TemplateContext>, line: string): Message[] {
  const contact = booking.patient.whatsapp;
  const byNumber = new Map<string, string>();
  for (const m of members) {
    const to = toWhatsappNumber(m.whatsapp) || toWhatsappNumber(contact);
    if (to && !byNumber.has(to)) byNumber.set(to, m.name);
  }
  const out: Message[] = [];
  for (const [to, name] of byNumber) {
    out.push({
      recipient: `Patient: ${name}`,
      to,
      audience: "patient",
      event,
      fallback: [firstName(name), booking.id, line],
      ctx: { ...base, recipient_name: firstName(name), patient_names: name },
    });
  }
  // Checkout may hold a number we cannot message (not an Indian mobile): say so rather than skip silently.
  if (out.length === 0) out.push({ recipient: `Patient: ${booking.patient.name}`, to: contact ?? "", audience: "patient", event, fallback: [], ctx: {} });
  return out;
}

// Doctors: one message per prescribing doctor (listing their patients on this visit), only for
// members whose doctor is registered. Their number is the WhatsApp number from /for-doctors.
async function doctorMessages(members: OrderMember[], booking: Booking, event: string, base: Partial<TemplateContext>, line: string): Promise<Message[]> {
  const byDoctor = new Map<string, string[]>();
  for (const m of members) {
    if (!m.doctorId) continue;
    byDoctor.set(m.doctorId, [...(byDoctor.get(m.doctorId) ?? []), m.name]);
  }
  const out: Message[] = [];
  for (const [doctorId, names] of byDoctor) {
    const doctor = await getDoctor(doctorId).catch(() => undefined);
    const to = toWhatsappNumber(doctor?.mobile);
    if (!doctor || !doctor.approved || !to) continue;
    out.push({
      recipient: `Doctor: ${doctor.name}`,
      to,
      audience: "doctor",
      event,
      fallback: [doctor.name, names.join(", "), booking.id, line],
      ctx: { ...base, recipient_name: doctor.name, patient_names: names.join(", ") },
    });
  }
  return out;
}

// Reserve each message under its event key, then send it. Never throws: a WhatsApp problem must
// not undo a change that is already saved.
async function deliver(orderId: string, eventKey: string, label: string, messages: Message[]): Promise<NotificationOutcome[]> {
  return Promise.all(
    messages.map(async (m): Promise<NotificationOutcome> => {
      let claimed: number | null;
      try {
        claimed = await claimNotification({ orderId, eventKey, label, recipient: m.recipient, to: m.to });
      } catch (err) {
        // Without the reservation a retry could send twice, so nothing is sent.
        console.error(`[whatsapp] Could not reserve the message for ${orderId}:`, err);
        return { ok: false, detail: "Couldn't record the message, so it was not sent.", recipient: m.recipient, to: m.to };
      }
      // Already sent (or being sent) for this event: send nothing.
      if (claimed === null) return { ok: true, skipped: true, detail: "Already sent for this change.", recipient: m.recipient, to: m.to };

      // The template bound to this event, else the generic one.
      const bound = await findTemplateFor(m.event, m.audience).catch(() => undefined);
      const template = bound?.name ?? (m.audience === "doctor" ? DOCTOR_TEMPLATE : PATIENT_TEMPLATE);
      const params = bound ? resolveParams(bound, m.ctx) : m.fallback;
      const result: DeliveryResult =
        !bound && params.length === 0
          ? { ok: false, detail: "Not a valid Indian mobile number, so nothing was sent." }
          : await sendTemplate(m.to, template, params, bound ? { language: bound.language } : {});
      await finishNotification(claimed, result.ok, result.detail, { template, messageId: result.messageId }).catch((err) =>
        console.error(`[whatsapp] Could not record the message for ${orderId}:`, err)
      );
      return { ...result, recipient: m.recipient, to: m.to };
    })
  );
}

// ---- the three kinds of event -----------------------------------------------------
// `changedAt` is the time the status was changed (from the UPDATE that really changed it); it names the event.

export async function notifyVisitStatus(booking: Booking, members: OrderMember[], status: OrderStatus, changedAt: string): Promise<NotificationOutcome[]> {
  if (!NOTIFY_VISIT[status]) return [];
  const sc = { date: booking.date, slot: booking.slot, contactPhone: BOOKING_PHONE };
  const event = `visit.${status}`;
  const toPatient = patientLine(status, sc);
  const toDoctor = doctorLine(status, sc);
  const messages = [
    ...patientMessages(members, booking, event, baseContext(booking, { label: STATUS_LABELS[status], line: toPatient }), toPatient),
    ...(await doctorMessages(members, booking, event, baseContext(booking, { label: STATUS_LABELS[status], line: toDoctor }), toDoctor).catch(() => [] as Message[])),
  ];
  return deliver(booking.id, `visit:${status}:${changedAt}`, STATUS_LABELS[status], messages);
}

export async function notifyPayment(booking: Booking, members: OrderMember[], status: PaymentStatus, amount: number, changedAt: string): Promise<NotificationOutcome[]> {
  const line = paymentLine(status, amount);
  if (!line) return [];
  // Payment is the patient's business (and the clinic's, which took it); doctors are not messaged.
  const base = { ...baseContext(booking, { label: `Payment: ${PAYMENT_LABELS[status]}`, line }), amount: `Rs. ${amount.toLocaleString("en-IN")}` };
  const messages = patientMessages(members, booking, `payment.${status}`, base, line);
  return deliver(booking.id, `payment:${status}:${changedAt}`, `Payment: ${PAYMENT_LABELS[status]}`, messages);
}

// A member's report became partial / full. `hasFile`: a report file is stored, so the message
// can carry its link.
export async function notifyReport(booking: Booking, member: OrderMember, status: ReportStatus, hasFile: boolean, token: string | null, changedAt: string): Promise<NotificationOutcome[]> {
  const link = hasFile && token ? `${SITE_URL}/api/reports/${token}` : null;
  const toPatient = reportLine(status, false, link);
  const toDoctor = reportLine(status, true, link);
  if (!toPatient || !toDoctor) return [];
  const event = `report.${status}`;
  const extra = { report_type: status === "partial" ? "partial report" : "full report", report_link: link ?? "" };
  const messages = [
    ...patientMessages([member], booking, event, { ...baseContext(booking, { label: REPORT_LABELS[status], line: toPatient }), ...extra }, toPatient),
    ...(await doctorMessages([member], booking, event, { ...baseContext(booking, { label: REPORT_LABELS[status], line: toDoctor }), ...extra }, toDoctor).catch(() => [] as Message[])),
  ];
  return deliver(booking.id, `report:${member.id}:${status}:${changedAt}`, `${REPORT_LABELS[status]}: ${member.name}`, messages);
}
