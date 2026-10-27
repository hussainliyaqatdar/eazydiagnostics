export type ProductFaq = { q: string; a: string };

export type TestItem = {
  id: string;
  slug: string;
  // Customer-friendly display name (e.g. "Complete Blood Count (CBC)").
  name: string;
  // Other names a customer might search for or have heard from a doctor.
  aliases: string[];
  // The lab's own catalog name (e.g. "CBC-5, EDTA Whole Blood"), title-cased
  // for display. Shown to the lab on orders and searchable by customers.
  labName: string;
  // The lab's catalog name exactly as stored (often ALL CAPS); the key used
  // to match the source data.
  rawName: string;
  code: string;
  price: number;
  mrp: number | null;
  type: "Routine" | "Specialised";
  popular: boolean;
  curated: boolean;
  category: string;
  sampleType: string;
  description: string;
  eta: string;
  // SEO FAQs, present only for the tests the business named for this (see
  // scripts/product-faqs.js) - most tests won't have this.
  faqs?: ProductFaq[];
};

export type PackageConstituent = {
  name: string;
  slug: string | null;
  price: number | null;
};

export type PackageItem = {
  id: string;
  slug: string;
  name: string;
  code: string;
  category: string;
  price: number;
  mrp: number | null;
  tagline: string;
  description: string;
  constituents: PackageConstituent[];
  needsContent: boolean;
  eta: string;
  // SEO FAQs - every package gets these (see scripts/product-faqs.js).
  faqs?: ProductFaq[];
};

// Attached to a package that was added from one of the two consultation-offer
// comparison pages (lib/consult-offers.ts). "addon": the usual price, plus a
// follow-up consultation the customer can add in the cart. "included": the
// consultation is bundled into a higher package price.
export type CartLineOffer = {
  variant: "addon" | "included";
  // Add-on only: the customer added the consultation (in the cart).
  consult?: boolean;
  // The doctor, chosen at checkout once a consultation is part of the order.
  doctorId?: string;
};

export type CartLine = {
  kind: "test" | "package";
  slug: string;
  qty: number;
  offer?: CartLineOffer;
};

export type BookingPatient = {
  name: string;
  whatsapp: string;
  addressLine: string;
  locality: string;
  pincode: string;
  city: string;
  gender: string;
  age: string;
  notes?: string;
  lat?: number;
  lng?: number;
};

export type BookingLineItem = {
  kind: "test" | "package";
  slug: string;
  name: string;
  // The lab's catalog name for a test, so fulfillment sees what the lab
  // actually knows it as (older bookings won't have this).
  labName?: string;
  qty: number;
  mrp: number;
  price: number;
  // Present when the package came from a consultation-offer page. The doctor's
  // name is copied in so the booking stays readable if the doctor list changes.
  offer?: CartLineOffer & { doctorName?: string };
};

export type BookingReferral = {
  // Set when the referrer is a registered affiliate doctor; absent for a name
  // the patient typed in themselves.
  doctorId?: string;
  name: string;
  // Copied from the affiliate record so the booking stays readable if it changes.
  clinic?: string;
};

export type Booking = {
  id: string;
  createdAt: string;
  patient: BookingPatient;
  // Who referred the patient (optional field at checkout).
  referral?: BookingReferral;
  items: BookingLineItem[];
  subtotalMrp: number;
  // Sum of item prices BEFORE any coupon. The amount the customer actually owes
  // is subtotalPrice - couponDiscount; use amountDue() from lib/booking-totals.
  subtotalPrice: number;
  // Total saved versus MRP, including any coupon discount.
  savings: number;
  // Present only when a coupon was applied (older bookings won't have these).
  couponCode?: string;
  couponDiscount?: number;
  date: string;
  slot: string;
  paymentStatus: "due";
};

// A doctor registered through /for-doctors. `id` is also their affiliate-link code.
export type Doctor = {
  id: string;
  registeredAt: string; // India time, for display
  name: string;
  clinic: string;
  mobile: string;
  email: string;
  specialty: string;
  degree: string;
};
