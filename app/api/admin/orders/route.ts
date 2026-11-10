import { NextRequest, NextResponse } from "next/server";
import { getBooking, setOrderPaymentStatus, setOrderStatus } from "@/lib/orders";
import { listMembers } from "@/lib/order-admin";
import { isOrderStatus, isPaymentStatus, PAYMENT_LABELS, STATUS_LABELS } from "@/lib/order-status";
import { logEvent } from "@/lib/order-events";
import { notifyPayment, notifyVisitStatus } from "@/lib/order-notifications";
import { amountDue } from "@/lib/booking-totals";

// Admin-only (see middleware.ts): change a visit's status or its payment status, and WhatsApp the
// patient (and the prescribing doctors) about it. PATCH, so a page on another site cannot trigger it
// with a plain form post. Setting the status a visit is already at changes nothing and sends nothing.
export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const { id, status, paymentStatus } = body;
  if (typeof id !== "string" || !/^BK-[A-Z0-9]{1,20}$/.test(id)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const wantsStatus = status !== undefined;
  const wantsPayment = paymentStatus !== undefined;
  if (wantsStatus === wantsPayment || (wantsStatus && !isOrderStatus(status)) || (wantsPayment && !isPaymentStatus(paymentStatus))) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  try {
    const before = await getBooking(id);
    if (!before) return NextResponse.json({ error: "That order no longer exists. Refresh the page." }, { status: 404 });
    // Only the request that really changes the value gets a time back (and so a notification).
    const changedAt = wantsStatus ? await setOrderStatus(id, status as never) : await setOrderPaymentStatus(id, paymentStatus as never);
    if (!changedAt) return NextResponse.json({ ok: true, changed: false, notifications: [] });

    if (wantsStatus) await logEvent(id, "visit", `Visit status changed: ${STATUS_LABELS[before.status ?? "booked"]} → ${STATUS_LABELS[status as keyof typeof STATUS_LABELS]}`);
    else await logEvent(id, "payment", `Payment changed: ${PAYMENT_LABELS[before.paymentStatus]} → ${PAYMENT_LABELS[paymentStatus as keyof typeof PAYMENT_LABELS]}`);

    // Re-read so the message uses what is stored. The change is already saved, so a WhatsApp
    // failure is reported in `notifications` rather than failing the request.
    const booking = await getBooking(id);
    const members = (await listMembers([id])).get(id) ?? [];
    if (!booking) return NextResponse.json({ ok: true, changed: true, notifications: [] });
    const notifications = wantsStatus
      ? await notifyVisitStatus(booking, members, status as never, changedAt)
      : await notifyPayment(booking, members, paymentStatus as never, amountDue(booking), changedAt);
    return NextResponse.json({ ok: true, changed: true, notifications });
  } catch (err) {
    console.error(`Admin: ${id} could not be updated:`, err);
    return NextResponse.json({ error: "Couldn't save the change. Please try again." }, { status: 502 });
  }
}
