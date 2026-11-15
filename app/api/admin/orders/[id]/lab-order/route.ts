import { NextRequest, NextResponse } from "next/server";
import { getBooking } from "@/lib/orders";
import { buildLabOrder } from "@/lib/lab-order";
import { getLabAdapter } from "@/lib/labs";

// Admin-only. The order as a partner lab needs it: the same lines in the LAB's ids. `?lab=<lab id>` builds it for a
// different lab than the one the order was placed for (for example, to move an order to a new partner). `missing`
// lists items that lab has no id for.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const booking = await getBooking(params.id).catch(() => undefined);
  if (!booking) return NextResponse.json({ error: "That order no longer exists." }, { status: 404 });
  try {
    const order = await buildLabOrder(booking, req.nextUrl.searchParams.get("lab") || undefined);
    return NextResponse.json({ order, mode: getLabAdapter(order.labId, order.labName).mode });
  } catch (err) {
    console.error("Admin: the lab order could not be built:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not build the lab order." }, { status: 400 });
  }
}
