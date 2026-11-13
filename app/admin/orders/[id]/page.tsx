import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MemberReport from "@/components/admin/MemberReport";
import Tabs from "@/components/admin/Tabs";
import { ReportPill } from "@/components/admin/StatusPill";
import OrderControls from "@/components/admin/OrderControls";
import { amountDue } from "@/lib/booking-totals";
import { getClinic } from "@/lib/clinics";
import { getDoctor, type Doctor } from "@/lib/doctors";
import { getBooking } from "@/lib/orders";
import { auditTrail } from "@/lib/order-events";
import AuditLog from "@/components/admin/AuditLog";
import { listMembers } from "@/lib/order-admin";
import { readableDate } from "@/lib/order-status";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order", robots: { index: false, follow: false } };

const IST = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
const rs = (n: number) => `Rs. ${n.toLocaleString("en-IN")}`;

export default async function AdminOrderPage({ params }: { params: { id: string } }) {
  const booking = await getBooking(params.id).catch(() => undefined);
  if (!booking) notFound();
  const members = (await listMembers([booking.id])).get(booking.id) ?? [];
  const log = await auditTrail(booking.id);

  // Each member's prescribing doctor and clinic (for the report header and the B2B figures).
  const doctors = new Map<string, Doctor>();
  for (const m of members) if (m.doctorId && !doctors.has(m.doctorId)) {
    const d = await getDoctor(m.doctorId).catch(() => undefined);
    if (d) doctors.set(d.id, d);
  }
  const collector = booking.paymentCollector;
  // Each member with their doctor's clinic, worked out before rendering.
  const rows = await Promise.all(
    members.map(async (m) => {
      const doctor = m.doctorId ? doctors.get(m.doctorId) : undefined;
      const clinic = doctor ? await getClinic(doctor.clinicId).catch(() => undefined) : undefined;
      return { m, doctor, clinic };
    })
  );

  const collectedBy = collector === "clinic" ? "The clinic (front desk)" : collector === "eazy" ? "Eazy Diagnostics" : "Eazy Diagnostics (no clinic involved)";
  const address = [booking.patient.addressLine, booking.patient.locality, booking.patient.city].filter(Boolean).join(", ") + (booking.patient.pincode ? ` - ${booking.patient.pincode}` : "");
  const summary: { label: string; value: React.ReactNode; wide?: boolean }[] = [
    { label: "Collected by", value: collectedBy },
    { label: "Booked on", value: IST(booking.createdAt) },
    { label: "Collection", value: `${readableDate(booking.date)}, ${booking.slot}` },
    { label: "WhatsApp number", value: booking.patient.whatsapp || "-" },
    { label: "Visit address", value: address, wide: true },
  ];

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div>
        <Link href="/admin/orders" className="text-sm text-brand hover:underline">&larr; All orders</Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{booking.id}</h1>
        <p className="text-sm text-gray-500">{booking.patient.name}</p>
      </div>

      <section className="flex flex-col gap-4 rounded-lg border bg-white p-5" aria-label="Visit summary">
        <h2 className="text-sm font-semibold text-gray-900">Visit summary</h2>
        <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:gap-10">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {booking.paymentStatus === "paid" ? "Amount paid" : booking.paymentStatus === "refunded" ? "Amount refunded" : "Amount to collect"}
            </span>
            <span className={`text-4xl font-extrabold leading-none tracking-tight ${booking.paymentStatus === "pending" ? "text-gray-900" : "text-gray-500"}`}>{rs(amountDue(booking))}</span>
          </div>
          <OrderControls id={booking.id} status={booking.status ?? "booked"} paymentStatus={booking.paymentStatus} />
        </div>
        <dl className="grid gap-x-8 gap-y-3 border-t pt-4 text-sm sm:grid-cols-2">
          {summary.map((f) => (
            <div key={f.label} className={f.wide ? "sm:col-span-2" : undefined}>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{f.label}</dt>
              <dd className="mt-0.5 text-gray-900">{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-3" aria-label="Members">
        <h2 className="text-lg font-semibold text-gray-900">Members ({members.length})</h2>
        <Tabs
          label="Members of this visit"
          tabs={rows.map(({ m, doctor, clinic }) => {
            // Report updates go to the member's own number, or the visit's when they gave none.
            const own = !!m.whatsapp?.trim();
            return {
              id: String(m.id),
              label: m.name,
              badge: <ReportPill status={m.reportStatus} />,
              content: (
                <article className="flex flex-col gap-3 rounded-lg border bg-white p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {m.name} <span className="text-sm font-normal text-gray-500">{m.age}, {m.gender}</span>
                    </h3>
                    <span className="text-xs text-gray-500">
                      {own ? `WhatsApp ${m.whatsapp}` : `No own number - uses the visit's ${booking.patient.whatsapp}`}
                    </span>
                  </div>
                  <ul className="list-disc pl-5 text-sm text-gray-700">
                    {m.items.map((i) => (
                      <li key={`${i.kind}-${i.slug}`}>
                        {i.name}
                        {i.qty > 1 ? ` x ${i.qty}` : ""} <span className="text-gray-400">{rs(i.price * i.qty)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-gray-700">
                    <span className="text-xs font-medium text-gray-500">Prescribed by: </span>
                    {doctor ? doctor.name : m.referralName ? m.referralName : <span className="text-gray-400">none</span>}
                  </p>
                  <div className="border-t pt-3">
                    <MemberReport
                      orderId={booking.id}
                      memberId={m.id}
                      status={m.reportStatus}
                      hasReport={m.hasReport}
                      branded={m.reportBranded}
                      filename={m.reportFilename}
                      updatedAt={m.reportUpdatedAt}
                      doctorLabel={doctor ? (clinic?.name ?? doctor.clinic) : null}
                      refDoctor={doctor ? doctor.name : m.referralName?.trim() || null}
                      notifyTo={`${m.name} on ${own ? m.whatsapp : booking.patient.whatsapp}${own ? "" : " (the visit's number)"}`}
                    />
                  </div>
                </article>
              ),
            };
          })}
        />
      </section>

      <AuditLog rows={log} />
    </div>
  );
}
