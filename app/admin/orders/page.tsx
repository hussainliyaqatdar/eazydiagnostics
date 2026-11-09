import type { Metadata } from "next";
import OrderStatusSelect from "@/components/OrderStatusSelect";
import { amountDue } from "@/lib/booking-totals";
import { listBookings, listNotifications, type OrderNotification } from "@/lib/orders";
import { NOTIFY, readableDate, STATUS_LABELS } from "@/lib/order-status";
import { whatsappConfigStatus } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Orders", robots: { index: false, follow: false } };

const IST = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

export default async function AdminOrdersPage() {
  let loadError = "";
  let orders: Awaited<ReturnType<typeof listBookings>> = [];
  let notifications = new Map<string, OrderNotification[]>();
  try {
    orders = await listBookings();
    notifications = await listNotifications(orders.map((o) => o.id));
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
          Change an order&apos;s status and the patient (and, for collected / report ready / cancelled, the referring doctor) get a WhatsApp update straight away.
        </p>
      </div>

      {!waReady && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          WhatsApp is not set up yet ({!wa.tokenSet && "WHATSAPP_ACCESS_TOKEN"}
          {!wa.tokenSet && !wa.phoneNumberIdSet && " and "}
          {!wa.phoneNumberIdSet && "WHATSAPP_PHONE_NUMBER_ID"} missing). Status changes are still saved, but no messages are sent. See docs/whatsapp-setup.md.
        </p>
      )}
      {waReady && (
        <p className="text-xs text-gray-500">
          WhatsApp on. Templates: <code>{wa.patientTemplate}</code> (patients), <code>{wa.doctorTemplate}</code> (doctors), language <code>{wa.language}</code>.
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
                <th className="px-3 py-2 font-semibold">Patient</th>
                <th className="px-3 py-2 font-semibold">Collection</th>
                <th className="px-3 py-2 font-semibold">Referred by</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">WhatsApp log</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => {
                const status = o.status ?? "booked";
                const log = notifications.get(o.id) ?? [];
                return (
                  <tr key={o.id} className="align-top">
                    <td className="px-3 py-3">
                      <span className="block font-medium text-gray-900">{o.id}</span>
                      <span className="block text-xs text-gray-500">{IST(o.createdAt)}</span>
                      <span className="block text-xs text-gray-500">Rs. {amountDue(o).toLocaleString("en-IN")}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-800">
                      <span className="block">{o.patient.name}{o.members ? ` (+${o.members.length - 1})` : ""}</span>
                      <span className="block text-xs text-gray-500">{o.patient.whatsapp}</span>
                      <span className="block text-xs text-gray-500">{o.items.length} item{o.items.length === 1 ? "" : "s"}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-800">
                      {readableDate(o.date)}
                      <span className="block text-xs text-gray-500">{o.slot}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-800">
                      {o.referral ? (
                        <>
                          <span className="block">{o.referral.name}</span>
                          {o.referral.clinic && <span className="block text-xs text-gray-500">{o.referral.clinic}</span>}
                          {!o.referral.doctorId && <span className="block text-xs text-gray-400">not a registered doctor - not messaged</span>}
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <OrderStatusSelect id={o.id} current={status} />
                      <span className="mt-1 block text-xs text-gray-400">
                        Now: {STATUS_LABELS[status]}{o.statusUpdatedAt ? ` since ${IST(o.statusUpdatedAt)}` : ""}
                        {NOTIFY[status].patient ? "" : " (no message for this status)"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {log.length === 0 && <span className="text-gray-400">-</span>}
                      <ul className="flex flex-col gap-1">
                        {log.map((n, i) => (
                          <li key={i} className={n.ok ? "text-green-700" : "text-red-700"}>
                            {n.ok ? "✓" : "✗"} {STATUS_LABELS[n.status]} → {n.recipient}
                            <span className="block text-gray-400">{IST(n.createdAt)}{n.ok ? "" : ` - ${n.detail}`}</span>
                          </li>
                        ))}
                      </ul>
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
