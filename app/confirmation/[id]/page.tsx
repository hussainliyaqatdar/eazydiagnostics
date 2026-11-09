import Link from "next/link";
import { getBooking } from "@/lib/orders";
import { amountDue } from "@/lib/booking-totals";
import { describeConsult, hasConsult } from "@/lib/consult-offers";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ params }: { params: { id: string } }) {
  const booking = await getBooking(params.id).catch(() => undefined);

  if (!booking) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Booking not found.</p>
        <Link href="/search" className="text-brand hover:underline">Browse tests →</Link>
      </div>
    );
  }

  const members = booking.members;
  // Booked through a doctor's referral link: the patient pays at the clinic.
  const atClinic = !!booking.referral?.doctorId;
  const consultItem = booking.items.find((i) => hasConsult(i.offer));
  const doctorName = consultItem?.offer?.doctorName;

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <div className="text-center">
        <div className="text-4xl mb-2">✅</div>
        <h1 className="text-2xl font-bold text-gray-900">{members ? `Visit confirmed for ${members.length} members!` : "Booking confirmed!"}</h1>
        <p className="text-gray-600">{members ? "Visit" : "Booking"} ID: {booking.id}</p>
        {members && <p className="text-sm text-gray-500">One phlebotomist, one visit - samples collected from everyone.</p>}
      </div>

      {members &&
        members.map((m) => (
          <div key={m.name + m.age} className="bg-white border rounded-lg p-4 flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold text-gray-900">{m.name}</h2>
              <span className="text-xs text-gray-500">{m.age}, {m.gender}</span>
            </div>
            {m.items.map((i) => (
              <div key={`${i.kind}-${i.slug}`} className="flex justify-between gap-3 text-sm">
                <span>
                  {i.name} {i.qty > 1 ? `\u00d7 ${i.qty}` : ""}
                  {describeConsult(i.offer) && <span className="block text-xs text-brand-dark">{describeConsult(i.offer)}</span>}
                </span>
                <span className="shrink-0">
                  {i.mrp > i.price && <span className="line-through text-gray-400 mr-1">Rs. {(i.mrp * i.qty).toLocaleString("en-IN")}</span>}
                  <strong>Rs. {(i.price * i.qty).toLocaleString("en-IN")}</strong>
                </span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between text-sm font-semibold text-gray-900">
              <span>{m.name}&apos;s subtotal</span>
              <span>Rs. {m.items.reduce((sum, i) => sum + i.price * i.qty, 0).toLocaleString("en-IN")}</span>
            </div>
            {m.whatsapp && <p className="text-xs text-gray-500">Report to WhatsApp {m.whatsapp}</p>}
          </div>
        ))}

      <div className="bg-white border rounded-lg p-4 flex flex-col gap-3">
        <h2 className="font-semibold text-gray-900">{members ? "Visit total" : "What you booked"}</h2>
        {members && (
          <div className="flex justify-between text-sm text-gray-700">
            <span>All {members.length} members</span>
            <span>Rs. {booking.subtotalPrice.toLocaleString("en-IN")}</span>
          </div>
        )}
        {!members && booking.items.map((i) => (
          <div key={`${i.kind}-${i.slug}`} className="flex justify-between gap-3 text-sm">
            <span>
              {i.name} {i.qty > 1 ? `× ${i.qty}` : ""}
              {describeConsult(i.offer) && <span className="block text-xs text-brand-dark">{describeConsult(i.offer)}</span>}
            </span>
            <span className="shrink-0">
              {i.mrp > i.price && <span className="line-through text-gray-400 mr-1">Rs. {(i.mrp * i.qty).toLocaleString("en-IN")}</span>}
              <strong>Rs. {(i.price * i.qty).toLocaleString("en-IN")}</strong>
            </span>
          </div>
        ))}
        {booking.couponCode && booking.couponDiscount ? (
          <div className="border-t pt-2 flex justify-between text-sm text-brand-dark">
            <span>Coupon {booking.couponCode}</span>
            <span>- Rs. {booking.couponDiscount.toLocaleString("en-IN")}</span>
          </div>
        ) : null}
        {booking.collectionCharge ? (
          <div className="flex justify-between text-sm text-gray-700">
            <span>Collection charges</span>
            <span>Rs. {booking.collectionCharge.toLocaleString("en-IN")}</span>
          </div>
        ) : null}
        <div className="border-t pt-2 flex justify-between font-bold text-brand-dark">
          <span>{atClinic ? "Amount payable at the clinic front desk" : "Amount due on collection"}</span>
          <span>Rs. {amountDue(booking).toLocaleString("en-IN")}</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 text-center -mt-4">{atClinic ? "Pay now at the clinic front desk." : "No payment has been taken yet - pay only after your sample is collected."}</p>

      <div className="bg-brand-light rounded-lg p-4 flex flex-col gap-1">
        <h2 className="font-semibold text-gray-900 mb-1">Collection details{members ? " (one visit for everyone)" : ""}</h2>
        <p><strong>Date:</strong> {booking.date}</p>
        <p><strong>Time window:</strong> {booking.slot}</p>
        <p><strong>Address:</strong> {booking.patient.addressLine}, {booking.patient.locality}, {booking.patient.city} - {booking.patient.pincode}</p>
      </div>

      {consultItem && (
        <div className="bg-white border-2 border-brand rounded-lg p-4 flex flex-col gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">Your follow-up doctor consultation</h2>
            {doctorName && (
              <p className="text-sm text-gray-700">
                Doctor: <strong>{doctorName}</strong>
              </p>
            )}
          </div>
          <p className="text-sm text-gray-700">
            Once your report is ready, we'll send you a <strong>link on WhatsApp</strong> (to <strong>{booking.patient.whatsapp}</strong>)
            to schedule your doctor consultation. Just pick a time that suits you - there's nothing more you need to do now.
          </p>
          <ol className="flex flex-col gap-1 text-sm text-gray-600">
            <li>1. Our phlebotomist collects your sample at home.</li>
            <li>2. Your report arrives on WhatsApp.</li>
            <li>3. You get a WhatsApp link to schedule your consultation{doctorName ? ` with ${doctorName}` : ""}.</li>
          </ol>
        </div>
      )}

      <p className="text-sm text-gray-600 text-center">
        Our phlebotomist will arrive within 60 minutes of your slot start time, and your report
        will be sent via WhatsApp to <strong>{booking.patient.whatsapp}</strong>{members ? " (or each member's own number, if given)" : ""} - typically within
        6 hours for routine tests.
      </p>

      <Link href="/search" className="text-center text-brand font-medium hover:underline">Book another test →</Link>
    </div>
  );
}
