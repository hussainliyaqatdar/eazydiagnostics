import { NextRequest, NextResponse } from "next/server";
import { amountDue } from "@/lib/booking-totals";
import { logEvent } from "@/lib/order-events";
import { notifyPaymentRequest } from "@/lib/order-notifications";
import { listMembers } from "@/lib/order-admin";
import { getBooking } from "@/lib/orders";
import { paymentRequestBlocker } from "@/lib/payment-request";
import { lastPaymentRequestAt } from "@/lib/whatsapp-log";

// Admin-only: the Request payment button. Sends the patient the payment request (QR code) again - an explicit
// action, so resending is allowed. Refused when the clinic collects payment, when payment is no longer
// pending, or when one went out in the last half minute (a double click).
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!/^BK-[A-Z0-9]{1,20}$/.test(id)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    const booking = await getBooking(id);
    if (!booking) return NextResponse.json({ error: "That order no longer exists. Refresh the page." }, { status: 404 });
    const blocker = paymentRequestBlocker(booking);
    if (blocker) return NextResponse.json({ error: blocker }, { status: 409 });
    const last = await lastPaymentRequestAt(id);
    if (last && Date.now() - last.getTime() < 30_000) return NextResponse.json({ error: "A payment request was just sent. Wait a moment before sending another." }, { status: 429 });

    const members = (await listMembers([id])).get(id) ?? [];
    const notifications = await notifyPaymentRequest(booking, members, amountDue(booking), `payment-request:manual:${Date.now()}`);
    await logEvent(id, "payment", "Payment request sent by an admin");
    return NextResponse.json({ ok: true, notifications });
  } catch (err) {
    console.error(`Admin: payment request for ${id} could not be sent:`, err);
    return NextResponse.json({ error: "Couldn't send the payment request. Please try again." }, { status: 502 });
  }
}
