import { NextRequest, NextResponse } from "next/server";
import { allTests, allPackages } from "@/lib/catalog";
import { getSlotsForDate } from "@/lib/slots";
import { saveBooking } from "@/lib/orders";
import { sendOwnerNotification } from "@/lib/email";
import { BOOKING_PHONE } from "@/lib/site-config";
import { findCoupon } from "@/lib/coupon-config";
import { blockedByPackage, computeDiscount } from "@/lib/coupon-rules";
import { hasConsult, isOfferEligible, priceWithOffer } from "@/lib/consult-offers";
import { getConsultDoctor } from "@/lib/consult-doctors";
import { cleanReferralName, findAffiliateDoctor } from "@/lib/affiliate-doctors";
import type { Booking, BookingLineItem, BookingReferral, CartLine } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { patient, cart, date, slot, couponCode, referredBy } = body as {
    patient: Booking["patient"];
    cart: CartLine[];
    date: string;
    slot: string;
    couponCode?: string;
    referredBy?: { doctorId?: string; name?: string };
  };

  if (!patient?.name || !patient?.whatsapp || !patient?.addressLine || !patient?.pincode) {
    return NextResponse.json({ error: "Missing required patient details" }, { status: 400 });
  }
  // The pinned map location is required so the phlebotomist can find the address.
  const validCoord = (n: unknown, limit: number) => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= limit;
  if (!validCoord(patient.lat, 90) || !validCoord(patient.lng, 180)) {
    return NextResponse.json({ error: "Please share your location (current location or a Google Maps link)." }, { status: 400 });
  }
  if (!cart?.length) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  if (!date || !slot) return NextResponse.json({ error: "Please choose a collection date and time" }, { status: 400 });

  const availableSlots = await getSlotsForDate(date).catch(() => null);
  if (!availableSlots) return NextResponse.json({ error: `We couldn't check the time slots just now. Please try again, or call us on ${BOOKING_PHONE}.` }, { status: 503 });
  const chosen = availableSlots.find((s) => s.slot === slot);
  if (!chosen || !chosen.available) {
    return NextResponse.json({ error: "That slot was just booked, please pick another" }, { status: 409 });
  }

  // Consultation offers come from the browser, so check them before trusting
  // them: only the comparison-page packages qualify, an order with a
  // consultation needs a doctor, and that doctor must exist.
  for (const line of cart) {
    if (!line.offer) continue;
    const { variant, doctorId } = line.offer;
    if (!isOfferEligible(line.kind, line.slug) || (variant !== "addon" && variant !== "included")) {
      return NextResponse.json({ error: "An item in your cart is no longer available with that offer. Please remove it and add it again." }, { status: 400 });
    }
    if (hasConsult(line.offer) && !doctorId) {
      return NextResponse.json({ error: "Please choose a doctor for your follow-up consultation." }, { status: 400 });
    }
    if (doctorId && !getConsultDoctor(doctorId)) {
      return NextResponse.json({ error: "The doctor you chose is no longer available. Please choose another." }, { status: 400 });
    }
  }

  const items: BookingLineItem[] = cart.map((line) => {
    const source = line.kind === "test" ? allTests : allPackages;
    const found = source.find((x) => x.slug === line.slug);
    if (!found) throw new Error(`Unknown ${line.kind} ${line.slug}`);
    // Keep only the fields we validated above, plus a copy of the doctor's name.
    const offer = line.offer
      ? {
          variant: line.offer.variant,
          ...(line.offer.variant === "addon" && line.offer.consult === true ? { consult: true } : {}),
          // A doctor only means something when the order has a consultation.
          ...(hasConsult(line.offer) ? { doctorId: line.offer.doctorId!, doctorName: getConsultDoctor(line.offer.doctorId)!.name } : {}),
        }
      : undefined;
    const { price, mrp } = priceWithOffer(found, offer);
    // Tests are shown to customers under a friendly name, but the lab knows
    // them by their catalog name - keep that on the booking for fulfillment.
    const labName = "labName" in found ? found.labName : undefined;
    return { kind: line.kind, slug: found.slug, name: found.name, labName, qty: line.qty, mrp, price, ...(offer ? { offer } : {}) };
  });

  const subtotalMrp = items.reduce((s, i) => s + i.mrp * i.qty, 0);
  const subtotalPrice = items.reduce((s, i) => s + i.price * i.qty, 0);

  // The discount is decided HERE from the server's own prices and coupon list -
  // never from an amount sent by the browser. If the customer's coupon no longer
  // applies (switched off, or the cart dropped below the minimum), reject the
  // order rather than silently charging a different price than they were shown.
  let appliedCode: string | undefined;
  let couponDiscount = 0;
  if (couponCode) {
    // The consultation-offer packages are priced with no room for a coupon.
    if (cart.some((line) => line.offer)) {
      return NextResponse.json({ error: "Coupons can't be used with this offer. Please remove the coupon and try again." }, { status: 400 });
    }
    const coupon = findCoupon(couponCode);
    if (!coupon) {
      return NextResponse.json({ error: "That coupon code is no longer valid. Please remove it and try again." }, { status: 400 });
    }
    if (blockedByPackage(coupon, cart.some((line) => line.kind === "package"))) {
      return NextResponse.json({ error: `${coupon.code} is for individual tests only. Please remove the coupon, or the packages from your cart.` }, { status: 400 });
    }
    const result = computeDiscount(coupon, subtotalPrice);
    if (!result.eligible) {
      return NextResponse.json(
        { error: `${coupon.code} needs a cart of at least Rs. ${coupon.minCartValue.toLocaleString("en-IN")}. Add more individual tests or remove the coupon.` },
        { status: 400 }
      );
    }
    appliedCode = coupon.code;
    couponDiscount = result.discount;
  }

  // "Prescribed by" is optional. A registered doctor is looked up by id so the
  // stored name/clinic are ours, not the browser's; anything else is free text.
  let referral: BookingReferral | undefined;
  const refDoctor = await findAffiliateDoctor(referredBy?.doctorId).catch(() => undefined);
  if (refDoctor) {
    referral = { doctorId: refDoctor.id, name: refDoctor.name, clinic: refDoctor.clinic };
  } else {
    const name = cleanReferralName(referredBy?.name);
    if (name) referral = { name };
  }

  // No payment is collected at booking time - the site's promise is "pay
  // only after sample collection." Payment is taken in person (cash/UPI) or
  // via a link sent after the phlebotomist visit, outside this flow.
  const booking: Booking = {
    id: `BK-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    patient,
    ...(referral ? { referral } : {}),
    items,
    subtotalMrp,
    subtotalPrice,
    savings: subtotalMrp - subtotalPrice + couponDiscount,
    ...(appliedCode ? { couponCode: appliedCode, couponDiscount } : {}),
    date,
    slot,
    paymentStatus: "due",
  };

  // Never tell the customer an order went through when it was not saved.
  try {
    await saveBooking(booking);
  } catch (err) {
    console.error(`[orders] Order ${booking.id} could not be saved:`, err);
    return NextResponse.json({ error: `We couldn't save your order just now. Please try again in a minute, or call us on ${BOOKING_PHONE}.` }, { status: 503 });
  }
  // The owner email is what starts fulfillment. A failed email must not fail an
  // order that is already saved (deliver() logs the reason).
  await sendOwnerNotification(booking).catch((err) => console.error(`[email] Owner notification for ${booking.id} failed:`, err));

  return NextResponse.json({ id: booking.id });
}
