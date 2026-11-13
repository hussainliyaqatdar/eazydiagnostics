// SERVER-ONLY. Works out who should hear about a change on an order, sends them a WhatsApp
// message, and records what happened (shown on /admin/orders and /admin/whatsapp).
//
//  - Visit status changes and payment changes go to the patient(s) and to each prescribing
//    doctor. A report becoming partial / full goes to that member and their doctor.
//  - A doctor is messaged ONLY if the patient chose them as "Prescribed by" for a member from the
//    registered-doctors list at booking (the member's doctor_id), on the WhatsApp number the doctor
//    gave at /for-doctors. A typed-in name, or no doctor, means no doctor message.
//  - Which template carries a message: the switched-on template mapped to the event on
//    /admin/whatsapp ("Template - Status Mapping"). There is NO fallback: an event with no template mapped
//    for that audience, or whose template is not approved / fully mapped yet, sends nothing, and the
//    outcome says why so the admin can be told.
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
  paymentRequestLine,
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
import { sendTemplate, toWhatsappNumber, type DeliveryResult } from "./whatsapp";
import { logEvent } from "./order-events";
import { findMappedTemplate, headerImageUrlFor, resolveParams, unusableReason, type TemplateContext } from "./whatsapp-templates";
import type { Audience } from "./whatsapp-events";
import type { OrderMember } from "./order-admin";
import type { Booking } from "./types";

// `skipped`: already sent for this change. `notSent`: nothing was sent because no usable template is mapped
// ("unmapped": none; "unusable": one is mapped but not approved / not fully set up).
export type NotificationOutcome = DeliveryResult & { recipient: string; to: string; skipped?: boolean; notSent?: "unmapped" | "unusable"; what?: string };

type Message = {
  recipient: string;
  to: string;
  audience: Audience;
  // What the message is about, as an events key ("visit.completed"); picks the template.
  event: string;
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
      ctx: { ...base, recipient_name: firstName(name), patient_names: name },
    });
  }
  // Checkout may hold a number we cannot message (not an Indian mobile): say so rather than skip silently.
  if (out.length === 0) out.push({ recipient: `Patient: ${booking.patient.name}`, to: contact ?? "", audience: "patient", event, ctx: {} });
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
      ctx: { ...base, recipient_name: doctor.name, patient_names: names.join(", ") },
    });
  }
  return out;
}

const AUDIENCE_NOUN: Record<Audience, string> = { patient: "patients", doctor: "doctors" };

// Sends one audience's messages with the template mapped to the event, or sends nothing and says why. Each
// message is reserved under its event key first, so a retry can never send twice. Never throws: a WhatsApp
// problem must not undo a change that is already saved.
async function deliverTo(orderId: string, eventKey: string, label: string, audience: Audience, messages: Message[]): Promise<NotificationOutcome[]> {
  const noun = AUDIENCE_NOUN[audience];
  const mapped = await findMappedTemplate(messages[0].event, audience).catch(() => undefined);
  const problem = mapped ? unusableReason(mapped) : null;

  if (!mapped || problem) {
    const detail = !mapped
      ? `No template is mapped to "${label}" for ${noun}, so no message was sent.`
      : `The template "${mapped.name}" cannot be sent yet (${problem}), so no message was sent to ${noun}.`;
    await logEvent(orderId, "whatsapp", detail, audience === "patient" ? "Patients" : "Doctors");
    return [{ ok: false, notSent: mapped ? "unusable" : "unmapped", detail, recipient: audience === "patient" ? "Patients" : "Doctors", to: "", what: label }];
  }

  // A template with an image header sends its image by link.
  const headerImageUrl = await headerImageUrlFor(mapped);
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

      const result: DeliveryResult = m.to
        ? await sendTemplate(m.to, mapped.name, resolveParams(mapped, m.ctx), { language: mapped.language, headerImageUrl })
        : { ok: false, detail: "Not a valid Indian mobile number, so nothing was sent." };
      await finishNotification(claimed, result.ok, result.detail, { template: mapped.name, messageId: result.messageId }).catch((err) =>
        console.error(`[whatsapp] Could not record the message for ${orderId}:`, err)
      );
      return { ...result, recipient: m.recipient, to: m.to, what: label };
    })
  );
}

async function deliver(orderId: string, eventKey: string, label: string, messages: Message[]): Promise<NotificationOutcome[]> {
  const audiences = (["patient", "doctor"] as Audience[]).filter((a) => messages.some((m) => m.audience === a));
  const results = await Promise.all(audiences.map((a) => deliverTo(orderId, eventKey, label, a, messages.filter((m) => m.audience === a))));
  return results.flat();
}

// ---- the three kinds of event -----------------------------------------------------
// `changedAt` is the time the status was changed (from the UPDATE that really changed it); it names the event.

export async function notifyVisitStatus(booking: Booking, members: OrderMember[], status: OrderStatus, changedAt: string): Promise<NotificationOutcome[]> {
  if (!NOTIFY_VISIT[status]) return [];
  return sendVisitStatus(booking, members, status, `visit:${status}:${changedAt}`);
}

// "Visit booked": sent once, when the order is placed. (Moving an order back to Booked in the admin is a
// correction, not news, so that never sends it - see NOTIFY_VISIT.) Like every event, it only goes out if a
// template is mapped to it for that audience; otherwise the admin sees a note in the order's audit log.
export async function notifyVisitBooked(booking: Booking, members: OrderMember[]): Promise<NotificationOutcome[]> {
  return sendVisitStatus(booking, members, "booked", "visit:booked:created");
}

async function sendVisitStatus(booking: Booking, members: OrderMember[], status: OrderStatus, eventKey: string): Promise<NotificationOutcome[]> {
  const sc = { date: booking.date, slot: booking.slot, contactPhone: BOOKING_PHONE };
  const event = `visit.${status}`;
  const toPatient = patientLine(status, sc);
  const toDoctor = doctorLine(status, sc);
  const messages = [
    ...patientMessages(members, booking, event, baseContext(booking, { label: STATUS_LABELS[status], line: toPatient }), toPatient),
    ...(await doctorMessages(members, booking, event, baseContext(booking, { label: STATUS_LABELS[status], line: toDoctor }), toDoctor).catch(() => [] as Message[])),
  ];
  return deliver(booking.id, eventKey, STATUS_LABELS[status] === "Booked" ? "Visit booked" : STATUS_LABELS[status], messages);
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

// "Please pay": the patient is sent the payment request template (with its QR code image, if the template has
// one). `eventKey` names the occasion so the same request is never sent twice to the same number: the
// automatic one uses a fixed key (once per order); each press of Request payment uses its own.
export async function notifyPaymentRequest(booking: Booking, members: OrderMember[], amount: number, eventKey: string): Promise<NotificationOutcome[]> {
  const line = paymentRequestLine(amount);
  const base = { ...baseContext(booking, { label: "Payment requested", line }), amount: `Rs. ${amount.toLocaleString("en-IN")}` };
  const messages = patientMessages(members, booking, "payment.request", base, line);
  return deliver(booking.id, eventKey, "Payment requested", messages);
}
