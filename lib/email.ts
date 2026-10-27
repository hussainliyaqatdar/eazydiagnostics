import { saveEmail } from "./store";
import { amountDue } from "./booking-totals";
import { describeConsult, hasConsult } from "./consult-offers";
import { BUSINESS_NAME, CONSULT_BOOKING_URL, SUPPORT_EMAIL } from "./site-config";
import { formatMobile, type DoctorSignup } from "./doctor-onboarding";
import { affiliateLink } from "./affiliate-link";
import type { Booking } from "./types";

const OWNER_EMAIL = process.env.OWNER_EMAIL || "owner@example.com";
const FROM_EMAIL = process.env.FROM_EMAIL || "bookings@example.com";
// Shown to recipients as "Eazy Diagnostics <address>" unless FROM_EMAIL already carries a name.
const FROM_ADDRESS = FROM_EMAIL.includes("<") ? FROM_EMAIL : `${BUSINESS_NAME} <${FROM_EMAIL}>`;

function money(n: number) {
  return `Rs. ${n.toLocaleString("en-IN")}`;
}

function itemsRows(booking: Booking) {
  return booking.items
    .map(
      (i) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;">${i.name} ${i.qty > 1 ? `x ${i.qty}` : ""}${
        i.labName && i.labName.toLowerCase() !== i.name.toLowerCase()
          ? `<br><span style="color:#777;font-size:12px;">Lab test name: ${i.labName}</span>`
          : ""
      }${describeConsult(i.offer) ? `<br><span style="color:#0F6E6E;font-size:12px;">${describeConsult(i.offer)}</span>` : ""}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">
        <span style="color:#999;text-decoration:line-through;margin-right:6px;">${money(i.mrp * i.qty)}</span>
        <strong>${money(i.price * i.qty)}</strong>
      </td>
    </tr>`
    )
    .join("");
}

const OFFER_PAGE_LABELS = {
  addon: "Add-on page (consultation offered in the cart, +Rs. 500)",
  included: "Bundled page (consultation included in the package price)",
} as const;

// Flags orders that opted for a follow-up consultation (the team sends the
// booking link by hand once the report is ready), and records which experiment
// page the order came from - including orders that skipped the consultation.
function consultSection(booking: Booking) {
  const offered = booking.items.filter((i) => i.offer);
  if (offered.length === 0) return "";
  const consultLines = offered
    .filter((i) => hasConsult(i.offer))
    .map((i) => `<li>${i.name}: ${describeConsult(i.offer)}</li>`)
    .join("");
  const pages = Array.from(new Set(offered.map((i) => OFFER_PAGE_LABELS[i.offer!.variant]))).join("; ");
  const action = consultLines
    ? `<div style="background:#FFF4EC;border-left:4px solid #FF7A45;padding:10px 14px;margin:16px 0;">
      <strong>Follow-up consultation requested</strong>
      <ul style="margin:6px 0 8px 18px;padding:0;">${consultLines}</ul>
      Once the report is ready, WhatsApp ${booking.patient.whatsapp} this link to book a slot:<br>
      <a href="${CONSULT_BOOKING_URL}">${CONSULT_BOOKING_URL}</a>
    </div>`
    : `<p><strong>No follow-up consultation chosen.</strong></p>`;
  return `${action}<p style="color:#999;font-size:12px;">Ordered via: ${pages}</p>`;
}

// There is no patient email in the checkout flow anymore - the on-screen
// confirmation page is the patient's confirmation, and report delivery is via
// WhatsApp (handled manually by the team, per current process). This owner
// notification is what actually kicks off fulfillment.
export function renderOwnerNotification(booking: Booking) {
  const subject = `New order - ${booking.patient.name} - ${booking.date} ${booking.slot}`;
  const mapsLink =
    booking.patient.lat != null && booking.patient.lng != null
      ? `<p><strong>Pinned location:</strong> <a href="https://www.google.com/maps?q=${booking.patient.lat},${booking.patient.lng}">Open in Google Maps</a></p>`
      : "";
  const html = `
  <div style="font-family:sans-serif;max-width:560px;margin:auto;color:#222;">
    <h2 style="color:#FF7A45;">New booking - start fulfillment</h2>
    <p><strong>Patient:</strong> ${booking.patient.name} (${booking.patient.age}, ${booking.patient.gender})</p>
    <p><strong>WhatsApp:</strong> ${booking.patient.whatsapp}</p>
    <p><strong>Address:</strong> ${booking.patient.addressLine}, ${booking.patient.locality}, ${booking.patient.city} - ${booking.patient.pincode}</p>
    ${mapsLink}
    <p><strong>Collection window:</strong> ${booking.date}, ${booking.slot}</p>
    ${booking.patient.notes ? `<p><strong>Notes:</strong> ${booking.patient.notes}</p>` : ""}
    ${booking.referral ? `<p><strong>Prescribed by:</strong> ${esc(booking.referral.name)}${booking.referral.clinic ? ` (${esc(booking.referral.clinic)})` : ""}${booking.referral.doctorId ? "" : " <em>(typed by patient, not a registered doctor)</em>"}</p>` : ""}
    <h3>Tests / packages ordered</h3>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">${itemsRows(booking)}</table>
    ${consultSection(booking)}
    ${
      booking.couponCode && booking.couponDiscount
        ? `<p style="text-align:right;margin:0;">Subtotal: ${money(booking.subtotalPrice)}</p>
    <p style="text-align:right;margin:0;color:#0F6E6E;">Coupon ${booking.couponCode}: -${money(booking.couponDiscount)}</p>`
        : ""
    }
    <p style="text-align:right;font-weight:bold;">Amount due on collection: ${money(amountDue(booking))}</p>
    <p style="color:#999;font-size:12px;">Booking ID: ${booking.id}</p>
  </div>`;
  return { subject, html };
}

async function deliver(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
    });
    // Resend answers a rejected email (bad key, unverified sender) with an error
    // status rather than throwing - make that visible in the server log.
    if (!res.ok) console.error(`Email to ${to} was rejected (HTTP ${res.status}): ${await res.text().catch(() => "")}`);
  } catch (err) {
    console.error("Email delivery failed, kept in dev inbox only:", err);
  }
}

export async function sendOwnerNotification(booking: Booking) {
  const { subject, html } = renderOwnerNotification(booking);
  saveEmail({ id: `${booking.id}-owner`, to: OWNER_EMAIL, toLabel: "owner", subject, html, sentAt: new Date().toISOString() });
  await deliver(OWNER_EMAIL, subject, html);
}

// ---- Doctor sign-up (/for-doctors) ----

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Typed in by the doctor or the sales team, so it is escaped before going into the email.
function signupRows(signup: DoctorSignup) {
  const rows: [string, string][] = [
    ["Name", esc(signup.fullName)],
    ["Clinic", esc(signup.clinicName)],
    ["Specialty", esc(signup.specialty)],
    ["Degree", esc(signup.degree)],
  ];
  if (signup.mobile) rows.push(["WhatsApp", esc(formatMobile(signup.mobile))]);
  if (signup.email) rows.push(["Email", esc(signup.email)]);
  return rows
    .map(
      ([label, value]) => `
    <tr>
      <td style="padding:6px 12px 6px 0;vertical-align:top;color:#777;white-space:nowrap;">${label}</td>
      <td style="padding:6px 0;vertical-align:top;">${value}</td>
    </tr>`
    )
    .join("");
}

// Dev-inbox copies of these emails (/admin/inbox) hold doctors' personal details
// and that page has no login, so they are only kept when running locally.
function keepInDevInbox(email: Parameters<typeof saveEmail>[0]) {
  if (process.env.NODE_ENV !== "production") saveEmail(email);
}

export function renderDoctorConfirmation(signup: DoctorSignup) {
  const subject = `You're registered as a partner doctor with ${BUSINESS_NAME}`;
  const html = `
  <div style="font-family:sans-serif;max-width:560px;margin:auto;color:#222;line-height:1.5;">
    <h2 style="color:#0F6E6E;">Thank you, ${esc(signup.fullName)}!</h2>
    <p>You're registered as a partner doctor with ${esc(BUSINESS_NAME)}, so your patients can book trusted diagnostics at home.</p>
    <p><strong>Our team will share your personal booking link shortly.</strong> Patients who book through it are linked to you.</p>
    <h3 style="margin-bottom:4px;">What we have</h3>
    <table style="border-collapse:collapse;font-size:14px;">${signupRows(signup)}</table>
    <p>Spotted a mistake? Just email us at <a href="mailto:${esc(SUPPORT_EMAIL)}">${esc(SUPPORT_EMAIL)}</a>.</p>
    <p style="color:#999;font-size:12px;">You're receiving this because this email address was used to register a doctor on ${esc(BUSINESS_NAME)}.</p>
  </div>`;
  return { subject, html };
}

export function renderOwnerDoctorAlert(signup: DoctorSignup, id: string, submittedAt: string) {
  const subject = `New doctor registered - ${signup.fullName}, ${signup.clinicName}`;
  const link = affiliateLink(id);
  const html = `
  <div style="font-family:sans-serif;max-width:560px;margin:auto;color:#222;line-height:1.5;">
    <h2 style="color:#FF7A45;">New doctor registered</h2>
    <p>Submitted ${esc(submittedAt)} (IST). Doctor ID: <strong>${esc(id)}</strong>. They are in the Google Sheet and in the checkout "Prescribed by" list.</p>
    <table style="border-collapse:collapse;font-size:14px;">${signupRows(signup)}</table>
    <p><strong>Affiliate booking link to share:</strong><br><a href="${esc(link)}">${esc(link)}</a></p>
  </div>`;
  return { subject, html };
}

// The doctor's email is optional - with none given there is nobody to confirm to.
export async function sendDoctorConfirmation(signup: DoctorSignup, id: string) {
  if (!signup.email) return;
  const { subject, html } = renderDoctorConfirmation(signup);
  keepInDevInbox({ id: `${id}-doctor`, to: signup.email, toLabel: "doctor", subject, html, sentAt: new Date().toISOString() });
  await deliver(signup.email, subject, html);
}

export async function sendOwnerDoctorAlert(signup: DoctorSignup, id: string, submittedAt: string) {
  const { subject, html } = renderOwnerDoctorAlert(signup, id, submittedAt);
  keepInDevInbox({ id: `${id}-owner`, to: OWNER_EMAIL, toLabel: "owner", subject, html, sentAt: new Date().toISOString() });
  await deliver(OWNER_EMAIL, subject, html);
}
