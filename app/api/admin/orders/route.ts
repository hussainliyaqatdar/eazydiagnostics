import { NextRequest, NextResponse } from "next/server";
import { getBooking, setOrderStatus } from "@/lib/orders";
import { isOrderStatus } from "@/lib/order-status";
import { notifyStatusChange } from "@/lib/order-notifications";

// Admin-only (see middleware.ts): change an order's status and WhatsApp the patient
// (and the referring doctor, for the milestones that matter to them). PATCH, so a
// page on another site cannot trigger it with a plain form post.
export async function PATCH(req: NextRequest) {
  let id: unknown, status: unknown;
  try {
    ({ id, status } = await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (typeof id !== "string" || !/^BK-[A-Z0-9]{1,20}$/.test(id) || !isOrderStatus(status)) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  let changed: boolean;
  try {
    if (!(await getBooking(id))) return NextResponse.json({ error: "That order no longer exists. Refresh the page." }, { status: 404 });
    changed = await setOrderStatus(id, status);
  } catch (err) {
    console.error(`Admin: status of ${id} could not be changed:`, err);
    return NextResponse.json({ error: "Couldn't change the status. Please try again." }, { status: 502 });
  }
  // Already at this status (a double-click, or someone else just set it): say so, send nothing.
  if (!changed) return NextResponse.json({ ok: true, changed: false, notifications: [] });

  // Re-read so the message uses what is stored, then notify. The status is already saved,
  // so a WhatsApp failure is reported in `notifications` rather than failing the request.
  const booking = await getBooking(id);
  const notifications = booking ? await notifyStatusChange(booking, status) : [];
  return NextResponse.json({ ok: true, changed: true, notifications });
}
