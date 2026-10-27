"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, useCartSummary } from "@/lib/cart-context";
import { describeConsult, hasConsult } from "@/lib/consult-offers";
import { getUpcomingDates, formatDateLabel } from "@/lib/booking-dates";
import DoctorPicker from "@/components/DoctorPicker";
import ReferralCombobox, { type ReferralValue } from "@/components/ReferralCombobox";
import { REFERRAL_STORAGE_KEY } from "@/lib/referral-storage";

const UPCOMING_DATES = getUpcomingDates();

export default function CheckoutPage() {
  const { lines, clear, setConsultDoctor } = useCart();
  // Priced items come from the cart summary so offer pricing (e.g. an included
  // consultation) is shown the same way here as in the cart drawer.
  const { items, coupon, discount, total, removeCoupon } = useCartSummary();
  const router = useRouter();

  // A follow-up consultation (added in the cart, or bundled into the package)
  // needs a doctor - picked here, after the collection details.
  const needsDoctor = lines.some((l) => hasConsult(l.offer));
  const doctorId = lines.find((l) => hasConsult(l.offer) && l.offer?.doctorId)?.offer?.doctorId ?? null;

  const [form, setForm] = useState({
    name: "", whatsapp: "",
    addressLine: "", locality: "", pincode: "", city: "Bengaluru",
    gender: "", age: "", notes: "",
  });
  const [referral, setReferral] = useState<ReferralValue>({ name: "" });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLocationInput, setManualLocationInput] = useState("");
  const [manualLocationError, setManualLocationError] = useState("");
  const [resolvingLink, setResolvingLink] = useState(false);

  const [date, setDate] = useState(UPCOMING_DATES[0]);
  const [slots, setSlots] = useState<{ slot: string; available: boolean }[]>([]);
  const [slot, setSlot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Arrived through a doctor's affiliate link: pre-fill "Prescribed by" (the
  // patient can still change it).
  useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem(REFERRAL_STORAGE_KEY); } catch {}
    if (!stored) return;
    fetch("/api/affiliate-doctors")
      .then((r) => r.json())
      .then((list: { id: string; name: string }[]) => {
        const d = list.find((x) => x.id === stored);
        if (d) setReferral((cur) => (cur.name ? cur : { doctorId: d.id, name: d.name }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/slots?date=${date}`).then((r) => r.json()).then(setSlots);
    setSlot("");
  }, [date]);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Location isn't supported on this browser.");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError("Couldn't access your location. Please allow location access, or fill the address manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Fast, local parse for plain coordinates or an already-expanded Maps URL.
  // Shortened share links (maps.app.goo.gl/..., goo.gl/maps/...) don't carry
  // coordinates in the link itself - those are resolved server-side, since a
  // browser can't read the final URL of a cross-origin redirect.
  function parseManualLocation(input: string): { lat: number; lng: number } | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const plain = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (plain) return { lat: parseFloat(plain[1]), lng: parseFloat(plain[2]) };
    const patterns = [
      /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,
      /\/search\/(-?\d+\.\d+),\+?(-?\d+\.\d+)/,
      /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    ];
    for (const p of patterns) {
      const m = trimmed.match(p);
      if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
    }
    return null;
  }

  function isShortLink(input: string) {
    return /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl)\//.test(input.trim());
  }

  async function submit() {
    setError("");
    if (!form.name || !form.whatsapp || !form.age || !form.gender || !form.addressLine || !form.pincode) {
      setError("Please fill in all required fields: name, age, gender, WhatsApp number, and address.");
      return;
    }
    if (!coords) {
      setError("Please share your location: tap \"Use current location\", or paste a Google Maps link.");
      return;
    }
    if (!date || !slot) {
      setError("Please choose a collection date and time slot.");
      return;
    }
    if (needsDoctor && !doctorId) {
      setError("Please choose a doctor for your follow-up consultation.");
      return;
    }
    setSubmitting(true);
    try {
      const patient = { ...form, lat: coords.lat, lng: coords.lng };
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only the code is sent - the server works out the discount itself.
        body: JSON.stringify({ patient, cart: lines, date, slot, couponCode: discount > 0 && coupon ? coupon.code : undefined, referredBy: referral.name.trim() ? referral : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setSubmitting(false);
        return;
      }
      clear();
      removeCoupon();
      // The affiliate link has done its job for this order.
      try { localStorage.removeItem(REFERRAL_STORAGE_KEY); } catch {}
      router.push(`/confirmation/${data.id}`);
    } catch {
      setError("Could not submit booking. Please try again.");
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return <p className="text-gray-500">Your cart is empty. <a href="/search" className="text-brand">Browse tests</a></p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
      <div className="md:col-span-2 flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-gray-900">Book your home collection</h1>

        <div className="bg-white border rounded-lg p-4 flex flex-col gap-3">
          <h2 className="font-semibold text-gray-900">Patient details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Full name*" value={form.name} onChange={(e) => update("name", e.target.value)} className="border rounded-md px-3 py-2 text-sm sm:col-span-2" />
            <input placeholder="WhatsApp number* (for report delivery)" value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} className="border rounded-md px-3 py-2 text-sm sm:col-span-2" />
            <select value={form.gender} onChange={(e) => update("gender", e.target.value)} className="border rounded-md px-3 py-2 text-sm">
              <option value="">Gender*</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
            <input placeholder="Age*" value={form.age} onChange={(e) => update("age", e.target.value)} className="border rounded-md px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4 flex flex-col gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">Prescribed by <span className="text-sm font-normal text-gray-500">(optional)</span></h2>
            <p className="text-sm text-gray-600">Which doctor prescribed this test? Pick them from the list, or type their name.</p>
          </div>
          <ReferralCombobox value={referral} onChange={setReferral} />
        </div>

        <div className="bg-white border rounded-lg p-4 flex flex-col gap-3">
          <h2 className="font-semibold text-gray-900">Collection address</h2>

          <div className="bg-brand-light rounded-md px-3 py-2 flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Location (Google Maps)*</span>
                {!coords && <span className="block text-xs text-gray-600">Required - so our phlebotomist can find you.</span>}
                {coords && (
                  <span className="block text-xs text-brand-dark">
                    Location captured &mdash; <a className="underline" href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`} target="_blank" rel="noopener noreferrer">view on map</a>
                  </span>
                )}
                {locationError && <span className="block text-xs text-red-600">{locationError}</span>}
              </div>
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={locating}
                className="text-xs font-medium bg-white border border-brand text-brand-dark px-3 py-1.5 rounded-md hover:bg-brand hover:text-white transition disabled:opacity-60 whitespace-nowrap shrink-0 self-start sm:self-auto"
              >
                {locating ? "Locating…" : coords ? "Update location" : "Use current location"}
              </button>
            </div>

            {!showManualLocation ? (
              <button
                type="button"
                onClick={() => setShowManualLocation(true)}
                className="text-xs text-brand-dark underline text-left w-fit"
              >
                Current location not working? Paste a Google Maps link instead
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  placeholder="Paste a Google Maps link, or lat,lng (e.g. 12.9081, 77.5831)"
                  value={manualLocationInput}
                  onChange={(e) => setManualLocationInput(e.target.value)}
                  className="flex-1 border rounded-md px-3 py-2 text-sm bg-white min-w-0"
                />
                <button
                  type="button"
                  disabled={resolvingLink}
                  onClick={async () => {
                    setManualLocationError("");
                    const parsed = parseManualLocation(manualLocationInput);
                    if (parsed) {
                      setLocationError("");
                      setCoords(parsed);
                      return;
                    }
                    // Shortened share links (maps.app.goo.gl, goo.gl/maps) don't carry
                    // coordinates in the link itself - resolve the redirect server-side.
                    if (isShortLink(manualLocationInput)) {
                      setResolvingLink(true);
                      try {
                        const res = await fetch("/api/resolve-location", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ url: manualLocationInput.trim() }),
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          setManualLocationError(data.error || "Couldn't resolve that link.");
                        } else {
                          setLocationError("");
                          setCoords(data);
                        }
                      } catch {
                        setManualLocationError("Couldn't resolve that link. Please check your connection and try again.");
                      } finally {
                        setResolvingLink(false);
                      }
                      return;
                    }
                    setManualLocationError("Couldn't read a location from that. Try pasting the full Google Maps link, or exact coordinates like 12.9081, 77.5831.");
                  }}
                  className="text-xs font-medium bg-white border border-brand text-brand-dark px-3 py-1.5 rounded-md hover:bg-brand hover:text-white transition disabled:opacity-60 whitespace-nowrap shrink-0"
                >
                  {resolvingLink ? "Resolving link…" : "Set location"}
                </button>
              </div>
            )}
            {manualLocationError && <span className="text-xs text-red-600">{manualLocationError}</span>}
          </div>

          <input placeholder="House/flat, street, landmark*" value={form.addressLine} onChange={(e) => update("addressLine", e.target.value)} className="border rounded-md px-3 py-2 text-sm" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="Locality (e.g. JP Nagar)" value={form.locality} onChange={(e) => update("locality", e.target.value)} className="border rounded-md px-3 py-2 text-sm" />
            <input placeholder="City" value={form.city} onChange={(e) => update("city", e.target.value)} className="border rounded-md px-3 py-2 text-sm" />
            <input placeholder="Pincode*" value={form.pincode} onChange={(e) => update("pincode", e.target.value)} className="border rounded-md px-3 py-2 text-sm" />
          </div>
          <textarea placeholder="Anything our phlebotomist should know? (e.g. gate code, fasting confirmation)" value={form.notes} onChange={(e) => update("notes", e.target.value)} className="border rounded-md px-3 py-2 text-sm" rows={2} />
        </div>

        <div className="bg-white border rounded-lg p-4 flex flex-col gap-3">
          <h2 className="font-semibold text-gray-900">Choose collection time</h2>

          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {UPCOMING_DATES.map((d) => {
              const { weekday, day, month } = formatDateLabel(d);
              const active = d === date;
              return (
                <button
                  key={d}
                  onClick={() => setDate(d)}
                  className={`shrink-0 flex flex-col items-center justify-center w-16 py-2 rounded-lg border text-sm ${
                    active ? "bg-brand text-white border-brand" : "bg-white text-gray-700 hover:border-brand"
                  }`}
                >
                  <span className="text-xs uppercase opacity-80">{weekday}</span>
                  <span className="text-lg font-bold leading-tight">{day}</span>
                  <span className="text-xs opacity-80">{month}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {slots.map((s) => (
              <button
                key={s.slot}
                disabled={!s.available}
                onClick={() => setSlot(s.slot)}
                className={`text-xs sm:text-sm px-2 sm:px-3 py-2 rounded-md border ${
                  !s.available ? "bg-gray-100 text-gray-400 cursor-not-allowed" : slot === s.slot ? "bg-brand text-white border-brand" : "bg-white text-gray-700 hover:border-brand"
                }`}
              >
                {s.slot}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">Our phlebotomist arrives within 60 minutes of your slot start time.</p>
        </div>

        {needsDoctor && (
          <div className="bg-white border rounded-lg p-4 flex flex-col gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">Choose your doctor</h2>
              <p className="text-sm text-gray-600">
                For your follow-up consultation. Once your report is ready, we'll send you a link on WhatsApp to schedule it.
              </p>
            </div>
            <DoctorPicker value={doctorId} onChange={setConsultDoctor} />
          </div>
        )}
      </div>

      <div className="md:col-span-1">
        <div className="bg-brand-light rounded-lg p-4 flex flex-col gap-2 md:sticky md:top-20">
          <h2 className="font-semibold text-gray-900">Order summary</h2>
          {items.map((i) => (
            <div key={`${i.kind}-${i.slug}`} className="flex justify-between gap-3 text-sm">
              <span>
                {i.name} {i.qty > 1 ? `× ${i.qty}` : ""}
                {describeConsult(i.offer) && <span className="block text-xs text-brand-dark">{describeConsult(i.offer)}</span>}
              </span>
              <span className="shrink-0">Rs. {(i.price * i.qty).toLocaleString("en-IN")}</span>
            </div>
          ))}
          {discount > 0 && coupon && (
            <div className="border-t pt-2 flex justify-between items-center text-sm text-green-700 font-medium">
              <span>
                Coupon ({coupon.code}){" "}
                <button type="button" onClick={removeCoupon} className="text-xs font-normal text-gray-500 underline hover:text-gray-700">
                  Remove
                </button>
              </span>
              <span>- Rs. {discount.toLocaleString("en-IN")}</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between font-bold text-brand-dark">
            <span>Amount due on collection</span>
            <span>Rs. {total.toLocaleString("en-IN")}</span>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button onClick={submit} disabled={submitting} className="bg-brand text-white px-4 py-3 rounded-md font-medium hover:bg-brand-dark transition disabled:opacity-60">
            {submitting ? "Processing…" : "Confirm Order"}
          </button>
          <p className="text-xs text-gray-500 text-center">No payment now - pay only after your sample is collected.</p>
        </div>
      </div>
    </div>
  );
}
