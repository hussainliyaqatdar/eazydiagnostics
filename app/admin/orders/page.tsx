import type { Metadata } from "next";
import Link from "next/link";
import OrderControls from "@/components/admin/OrderControls";
import { amountDue, paidAtClinic } from "@/lib/booking-totals";
import { listBookings } from "@/lib/orders";
import { listMembers } from "@/lib/order-admin";
import { readableDate } from "@/lib/order-status";
import { ReportPill } from "@/components/admin/StatusPill";
import { whatsappConfigStatus } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Orders", robots: { index: false, follow: false } };

const IST = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

export default async function AdminOrdersPage() {
  let loadError = "";
  let orders: Awaited<ReturnType<typeof listBookings>> = [];
  let members = new Map<string, Awaited<ReturnType<typeof listMembers>> extends Map<string, infer V> ? V : never>();
  try {
    orders = await listBookings();
    members = await listMembers(orders.map((o) => o.id));
  } catch (err) {
    console.error("Admin: orders could not be loaded:", err);
    loadError = `Couldn't load the orders: ${err instanceof Error ? err.message : "unknown error"}`;
  }
  const wa = whatsappConfigStatus();
  const waReady = wa.tokenSet && wa.phoneNumberIdSet;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500">
          Each order is a visit with one or more members. Change the visit or payment status here, or open an order to manage each member&apos;s report.
          Patients and prescribing doctors get a WhatsApp update when a status changes (<Link href="/admin/whatsapp" className="text-brand hover:underline">manage templates</Link>).
        </p>
      </div>

      {!waReady && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          WhatsApp is not set up yet ({!wa.tokenSet && "WHATSAPP_ACCESS_TOKEN"}
          {!wa.tokenSet && !wa.phoneNumberIdSet && " and "}
          {!wa.phoneNumberIdSet && "WHATSAPP_PHONE_NUMBER_ID"} missing). Changes are still saved, but no messages are sent. See docs/whatsapp-setup.md.
        </p>
      )}
      {loadError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}
      {!loadError && orders.length === 0 && <p className="text-gray-500">No orders yet.</p>}

      {orders.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full min-w-[64rem] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Order</th>
                <th className="px-3 py-2 font-semibold">Members</th>
                <th className="px-3 py-2 font-semibold">Collection</th>
                <th className="px-3 py-2 font-semibold">Amount</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Reports</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => {
                const list = members.get(o.id) ?? [];
                return (
                  <tr key={o.id} className="align-top">
                    <td className="px-3 py-3">
                      <Link href={`/admin/orders/${o.id}`} className="block font-medium text-brand hover:underline">{o.id}</Link>
                      <span className="block text-xs text-gray-500">{IST(o.createdAt)}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-800">
                      {list.map((m) => (
                        <span key={m.id} className="block">
                          {m.name}
                          {m.doctorId ? <span className="text-xs text-gray-400"> &middot; {m.referralName}</span> : m.referralName ? <span className="text-xs text-gray-400"> &middot; {m.referralName} (not registered)</span> : null}
                        </span>
                      ))}
                      <span className="block text-xs text-gray-500">{o.patient.whatsapp}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-gray-800">
                      {readableDate(o.date)}
                      <span className="block text-xs text-gray-500">{o.slot}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="block text-lg font-extrabold leading-tight text-gray-900">Rs. {amountDue(o).toLocaleString("en-IN")}</span>
                      <span className="block text-[11px] text-gray-500">
                        {o.paymentStatus === "paid" ? "paid" : o.paymentStatus === "refunded" ? "refunded" : "to collect"} &middot; {paidAtClinic(o) ? "at clinic" : "by Eazy"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <OrderControls id={o.id} status={o.status ?? "booked"} paymentStatus={o.paymentStatus} compact />
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">
                      {list.map((m) => (
                        <span key={m.id} className="mb-1 flex flex-wrap items-center gap-1.5">
                          <span className="text-gray-700">{m.name}</span>
                          <ReportPill status={m.reportStatus} />
                        </span>
                      ))}
                      <Link href={`/admin/orders/${o.id}`} className="mt-1 inline-block font-medium text-brand hover:underline">Manage members &amp; reports</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
