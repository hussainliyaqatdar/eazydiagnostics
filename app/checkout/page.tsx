"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, useCartSummary } from "@/lib/cart-context";
import { useUI } from "@/lib/ui-context";
import { describeConsult, hasConsult } from "@/lib/consult-offers";
import { getUpcomingDates, formatDateLabel } from "@/lib/booking-dates";
import DoctorPicker from "@/components/DoctorPicker";
import StepActions from "@/components/StepActions";
import ReferralCombobox, { type ReferralValue } from "@/components/ReferralCombobox";
import { REFERRAL_STORAGE_KEY } from "@/lib/referral-storage";
import { FREE_COLLECTION_MIN } from "@/lib/booking-totals";

const UPCOMING_DATES = getUpcomingDates();

export default function CheckoutPage() {
  const { members: cartMembers, allLines, clear, setConsultDoctor } = useCart();
  const { openCartDrawer } = useUI();
  // Priced items come from the cart summary so offer pricing (e.g. an included
  // consultation) is shown the same way here as in the cart drawer.
  const { items, members, emptyMembers, coupon, discount, total, collectionCharge, removeCoupon } = useCartSummary();
  const router = useRouter();

  // A visit with more than one member has three steps - confirm the prices for
  // each member and the visit, then who is being tested, then address and time.
  // A single member fills one page, as before.
  const multi = members.length > 1;
  type Stage = "members" | "visit";
  const [stage, setStage] = useState<Stage>("members");
  const showMembers = !multi || stage === "members";
  const showVisit = !multi || stage === "visit";

  // A follow-up consultation (added in the cart, or bundled into the package)
  // needs a doctor - picked here, after the collection details.
  const needsDoctor = allLines.some((l) => hasConsult(l.offer));
  const doctorId = allLines.find((l) => hasConsult(l.offer) && l.offer?.doctorId)?.offer?.doctorId ?? null;

  // The contact number for the visit, and the address. Each member's own details
  // (name, age, gender) are in `details`.
  const [form, setForm] = useState({
    whatsapp: "",
    addressLine: "", locality: "", pincode: "", city: "Bengaluru",
    notes: "",
  });
  type Member = { name: string; age: string; gender: string; whatsapp: string };
  const [details, setDetails] = useState<Record<string, Member>>({});
  const memberOf = (id: string, label: string): Member => {
    if (details[id]) return details[id];
    // A nickname given in the cart ("Priya") is a good first guess at the name.
    const nick = /^(You|Member \d+|Person \d+)$/.test(label) ? "" : label;
    return { name: nick, age: "", gender: "", whatsapp: "" };
  };
  function updateMember(id: string, label: string, field: keyof Member, value: string) {
    setDetails((p) => ({ ...p, [id]: { ...memberOf(id, label), ...p[id], [field]: value } }));
    const key = `checkout-${id}-${field}`;
    if (missing.includes(key)) setMissing((m) => m.filter((k) => k !== key));
  }
  const [referral, setReferral] = useState<ReferralValue>({ name: "" });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  // A pasted Google Maps link we couldn't read coordinates from. It still counts
  // as the location: our phlebotomist opens the link directly.
  const [mapsLink, setMapsLink] = useState<string | null>(null);
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
  // The payment breakup in the sticky bar starts collapsed (only the amount shows).
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [error, setError] = useState("");
  // Required patient fields left empty at the last attempt to confirm; each is
  // outlined in red until it is filled in.
  const [missing, setMissing] = useState<string[]>([]);

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
    fetch(`/api/slots?date=${date}`)
      .then((r) => r.json())
      // An error answer is an object, not a list of slots.
      .then((data) => setSlots(Array.isArray(data) ? data : []))
      .catch(() => setSlots([]));
    setSlot("");
  }, [date]);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    const key = `checkout-${field}`;
    if (missing.includes(key)) setMissing((m) => m.filter((k) => k !== key));
  }

  // Red outline for a required field that was left empty (keyed by its element id).
  const fieldClass = (id: string, extra = "") =>
    `border rounded-md px-3 py-2 text-sm ${extra} ${missing.includes(id) ? "border-red-500 bg-red-50" : ""}`;

  // Marks the empty ones red and scrolls to the first; returns true when all are filled.
  function requireFilled(checks: { id: string; label: string; value: string }[]): boolean {
    const empty = checks.filter((c) => !c.value.trim());
    setMissing(empty.map((c) => c.id));
    if (empty.length === 0) return true;
    setError(`Please complete: ${empty.map((c) => c.label).join(", ")}.`);
    const el = document.getElementById(empty[0].id);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus({ preventScroll: true });
    return false;
  }

  // Checks the details on the current step, then moves on (multi-member visits).
  function memberChecks() {
    const out: { id: string; label: string; value: string }[] = [];
    members.forEach((m, i) => {
      const p = memberOf(m.id, m.label);
      const who = multi ? `${p.name.trim() || m.label}'s ` : "";
      out.push({ id: `checkout-${m.id}-name`, label: multi ? `${m.label}'s full name` : "Full name", value: p.name });
      out.push({ id: `checkout-${m.id}-gender`, label: `${who}gender (select one)`.replace(/^./, (c) => c.toUpperCase()), value: p.gender });
      out.push({ id: `checkout-${m.id}-age`, label: `${who}age`.replace(/^./, (c) => c.toUpperCase()), value: p.age });
      void i;
    });
    out.splice(multi ? 0 : 1, 0, { id: "checkout-whatsapp", label: "WhatsApp number", value: form.whatsapp });
    return out;
  }

  function goToVisitStep() {
    setError("");
    if (!requireFilled(memberChecks())) return;
    setStage("visit");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        setMapsLink(null);
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
    if (multi && emptyMembers.length > 0) {
      setError(`${emptyMembers.map((m) => m.label).join(", ")} has no tests yet. Add tests or remove them from the cart.`);
      return;
    }
    // Address, location and slot (and, on a single-member page, the member too).
    const checks = [
      ...(multi ? [] : memberChecks()),
      { id: "checkout-addressLine", label: "Address (house/flat and street)", value: form.addressLine },
      { id: "checkout-pincode", label: "Pincode", value: form.pincode },
    ];
    if (!requireFilled(checks)) return;
    if (!coords && !mapsLink) {
      setError("Please share your location: tap \"Use current location\", or choose \"Add Manually\" to paste a Google Maps link.");
      return;
    }
    if (!date || !slot) {
      setError(!date ? "Please choose a collection date, then a time slot." : "Please choose a time slot for your collection date.");
      return;
    }
    if (needsDoctor && !doctorId) {
      setError("Please choose a doctor for your follow-up consultation.");
      return;
    }
    setSubmitting(true);
    try {
      const first = memberOf(members[0].id, members[0].label);
      const patient = {
        name: first.name.trim(), age: first.age.trim(), gender: first.gender,
        whatsapp: form.whatsapp, addressLine: form.addressLine, locality: form.locality, pincode: form.pincode, city: form.city, notes: form.notes,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : { mapsUrl: mapsLink! }),
      };
      // One entry per member, each with their own cart. A single member is sent
      // as a plain cart, exactly as before.
      const visitMembers = cartMembers.map((m) => {
        const p = memberOf(m.id, m.label);
        return { name: p.name.trim(), age: p.age.trim(), gender: p.gender, ...(p.whatsapp.trim() ? { whatsapp: p.whatsapp.trim() } : {}), cart: m.lines };
      });
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only the code is sent - the server works out the discount itself.
        body: JSON.stringify({
          patient,
          ...(multi ? { members: visitMembers } : { cart: cartMembers[0].lines }),
          date, slot,
          couponCode: discount > 0 && coupon ? coupon.code : undefined,
          referredBy: referral.name.trim() ? referral : undefined,
        }),
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

const rs = (n: number) => `Rs. ${n.toLocaleString("en-IN")}`;

  if (items.length === 0) {
    return <p className="text-gray-500">Your cart is empty. <a href="/search" className="text-brand">Browse tests</a></p>;
  }

  // Prices are confirmed in the cart drawer, so a multi-member visit goes
  // straight from the cart to patient details, then address & time.
  const STEPS: { id: Stage; label: string }[] = [
    { id: "members", label: "Patient details" },
    { id: "visit", label: "Address & time" },
  ];
  const stageIndex = STEPS.findIndex((x) => x.id === stage);

  // One member's lines and prices, used in the payment breakup.
  const memberLines = (m: (typeof members)[number]) =>
    m.items.map((i) => (
      <div key={`${i.kind}-${i.slug}`} className="flex justify-between gap-3 text-sm">
        <span>
          {i.name} {i.qty > 1 ? `× ${i.qty}` : ""}
          {describeConsult(i.offer) && <span className="block text-xs text-brand-dark">{describeConsult(i.offer)}</span>}
        </span>
        <span className="shrink-0">
          {i.mrp > i.price && <span className="mr-1 text-gray-400 line-through">{rs(i.mrp * i.qty)}</span>}
          {rs(i.price * i.qty)}
        </span>
      </div>
    ));

  // The full payment breakup, shown when the summary is expanded.
  const breakup = (
    <div id="payment-breakup" className="flex max-h-[45vh] flex-col gap-2 overflow-y-auto rounded-lg bg-brand-light p-3">
      {multi ? (
        members.map((m) => (
          <div key={m.id} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm font-semibold text-gray-900">
              <span>{m.label}</span>
              <span>{rs(m.subtotalPrice)}</span>
            </div>
            <div className="flex flex-col gap-0.5 pl-2 text-xs text-gray-600">
              {m.items.map((i) => (
                <div key={`${i.kind}-${i.slug}`} className="flex justify-between gap-2">
                  <span>{i.name}{i.qty > 1 ? ` × ${i.qty}` : ""}</span>
                  <span className="shrink-0">{rs(i.price * i.qty)}</span>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        memberLines(members[0])
      )}
      <div className="flex flex-col gap-2 border-t pt-2">
        {discount > 0 && coupon && (
          <div className="flex items-center justify-between text-sm font-medium text-green-700">
            <span>
              Coupon ({coupon.code}){" "}
              <button type="button" onClick={removeCoupon} className="text-xs font-normal text-gray-500 underline hover:text-gray-700">
                Remove
              </button>
            </span>
            <span>- {rs(discount)}</span>
          </div>
        )}
        {collectionCharge > 0 && (
          <div className="flex justify-between text-sm text-gray-700">
            <span>
              Collection charges <span className="text-xs text-gray-500">({multi ? "one visit, " : ""}free on orders of {rs(FREE_COLLECTION_MIN)}+)</span>
            </span>
            <span>{rs(collectionCharge)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-brand-dark">
          <span>{multi ? "Visit total" : "Amount due"}</span>
          <span>{rs(total)}</span>
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-xs font-medium text-green-800">
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        No payment now - pay only after your sample is collected.
      </p>
    </div>
  );

  const first = members[0];
  const firstMember = memberOf(first.id, first.label);

  // The primary and secondary actions for the current step. A single member
  // fills one page, so its primary is the final "Confirm order".
  const onLastStep = !multi || stage === "visit";
  const primary = onLastStep
    ? { label: submitting ? "Processing…" : "Confirm order", onClick: submit }
    : { label: "Continue", onClick: goToVisitStep };
  const secondary = multi && stage === "visit"
    ? { label: "Back", onClick: () => { setStage("members"); window.scrollTo({ top: 0, behavior: "smooth" }); } }
    : { label: "Back to cart", onClick: openCartDrawer };

  return (
    <div className="flex max-w-2xl flex-col gap-6 pb-44">
      <h1 className="text-2xl font-bold text-gray-900">{multi ? `Book one home visit for ${members.length} members` : "Book your home collection"}</h1>

      {multi && (
        <ol className="flex items-center gap-2 text-xs sm:text-sm" aria-label="Booking steps">
          {STEPS.map((st, idx) => {
            const done = idx < stageIndex;
            const current = idx === stageIndex;
            return (
              <li key={st.id} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  disabled={!done}
                  onClick={() => setStage(st.id)}
                  aria-current={current ? "step" : undefined}
                  className={`flex items-center gap-1.5 ${done ? "cursor-pointer text-brand-dark hover:underline" : "cursor-default"} ${current ? "font-semibold text-gray-900" : "text-gray-500"}`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${current ? "bg-brand text-white" : done ? "bg-brand-light text-brand-dark" : "bg-gray-200 text-gray-600"}`}>
                    {done ? "✓" : idx + 1}
                  </span>
                  {st.label}
                </button>
                {idx < STEPS.length - 1 && <span className="h-px flex-1 bg-gray-200" aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      )}

      {showMembers && (
        <>
          {/* Visit contact: where reports go unless a member has their own number. For a single member this is the whole "Patient details" card. */}
          <div className="bg-white border rounded-lg p-4 flex flex-col gap-3">
            <h2 className="font-semibold text-gray-900">{multi ? "Contact for this visit" : "Patient details"}</h2>
            {!multi && (
              <input id={`checkout-${first.id}-name`} placeholder="Full name*" value={firstMember.name} onChange={(e) => updateMember(first.id, first.label, "name", e.target.value)} className={fieldClass(`checkout-${first.id}-name`)} />
            )}
            <input id="checkout-whatsapp" placeholder="WhatsApp number* (for report delivery)" value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} className={fieldClass("checkout-whatsapp")} />
            {multi && <p className="text-xs text-gray-500">Everyone&apos;s reports are sent here unless you add a separate number for a member.</p>}
            {!multi && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select id={`checkout-${first.id}-gender`} value={firstMember.gender} onChange={(e) => updateMember(first.id, first.label, "gender", e.target.value)} className={fieldClass(`checkout-${first.id}-gender`)}>
                  <option value="">Gender*</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Other</option>
                </select>
                <input id={`checkout-${first.id}-age`} placeholder="Age*" value={firstMember.age} onChange={(e) => updateMember(first.id, first.label, "age", e.target.value)} className={fieldClass(`checkout-${first.id}-age`)} />
              </div>
            )}
          </div>

          {multi &&
            members.map((m) => {
              const p = memberOf(m.id, m.label);
              return (
                <div key={m.id} className="bg-white border rounded-lg p-4 flex flex-col gap-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-semibold text-gray-900">{m.label}</h2>
                    <span className="text-xs text-gray-500">
                      {m.items.map((i) => i.name).slice(0, 2).join(", ")}
                      {m.items.length > 2 ? ` +${m.items.length - 2} more` : ""} &middot; {rs(m.subtotalPrice)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input id={`checkout-${m.id}-name`} placeholder="Full name*" value={p.name} onChange={(e) => updateMember(m.id, m.label, "name", e.target.value)} className={fieldClass(`checkout-${m.id}-name`, "sm:col-span-2")} />
                    <select id={`checkout-${m.id}-gender`} value={p.gender} onChange={(e) => updateMember(m.id, m.label, "gender", e.target.value)} className={fieldClass(`checkout-${m.id}-gender`)}>
                      <option value="">Gender*</option>
                      <option>Female</option>
                      <option>Male</option>
                      <option>Other</option>
                    </select>
                    <input id={`checkout-${m.id}-age`} placeholder="Age*" value={p.age} onChange={(e) => updateMember(m.id, m.label, "age", e.target.value)} className={fieldClass(`checkout-${m.id}-age`)} />
                    <input placeholder="Different WhatsApp for this report (optional)" value={p.whatsapp} onChange={(e) => updateMember(m.id, m.label, "whatsapp", e.target.value)} className="border rounded-md px-3 py-2 text-sm sm:col-span-2" />
                  </div>
                </div>
              );
            })}

        <div className="bg-white border rounded-lg p-4 flex flex-col gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">Prescribed by <span className="text-sm font-normal text-gray-500">(optional)</span></h2>
            <p className="text-sm text-gray-600">Which doctor prescribed these tests? Pick them from the list, or type their name.</p>
          </div>
          <ReferralCombobox value={referral} onChange={setReferral} />
        </div>


        </>
      )}

      {showVisit && (
        <>
        <div className="bg-white border rounded-lg p-4 flex flex-col gap-3">
          <h2 className="font-semibold text-gray-900">Collection address</h2>

          <div className="bg-brand-light rounded-md px-3 py-2 flex flex-col gap-2">
            <div className="flex flex-col gap-2">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Google Maps Location*</span>
                {!coords && !mapsLink && <span className="block text-xs text-gray-600">Required - so our phlebotomist can find you.</span>}
                {(coords || mapsLink) && (
                  <span className="block text-xs text-brand-dark">
                    Location captured &mdash; <a className="underline" href={coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : mapsLink!} target="_blank" rel="noopener noreferrer">view on map</a>
                  </span>
                )}
                {locationError && <span className="block text-xs text-red-600">{locationError}</span>}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Primary: one tap, uses the phone's location. */}
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={locating}
                  className="text-sm font-semibold bg-brand text-white px-4 py-2.5 rounded-md hover:bg-brand-dark transition disabled:opacity-60 sm:flex-1"
                >
                  {locating ? "Locating…" : coords || mapsLink ? "Update current location" : "Use current location"}
                </button>
                {/* Secondary: paste a Google Maps link or coordinates instead. */}
                <button
                  type="button"
                  onClick={() => setShowManualLocation((v) => !v)}
                  aria-expanded={showManualLocation}
                  className="text-sm font-medium bg-white border border-brand text-brand-dark px-4 py-2.5 rounded-md hover:bg-brand-light transition sm:flex-1"
                >
                  Add Manually
                </button>
              </div>
            </div>

            {showManualLocation && (
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
                      setMapsLink(null);
                      return;
                    }
                    // Any Google Maps link: shortened share links (maps.app.goo.gl, goo.gl/maps)
                    // don't carry coordinates in the link itself, and some place links have none
                    // at all - the server reads what it can, and the link is accepted either way.
                    if (/^https?:\/\//.test(manualLocationInput.trim())) {
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
                          if (typeof data.lat === "number" && typeof data.lng === "number") {
                            setCoords({ lat: data.lat, lng: data.lng });
                            setMapsLink(null);
                          } else {
                            // No coordinates in the link: keep the link itself as the location.
                            setCoords(null);
                            setMapsLink(data.link || manualLocationInput.trim());
                          }
                        }
                      } catch {
                        setManualLocationError("Couldn't resolve that link. Please check your connection and try again.");
                      } finally {
                        setResolvingLink(false);
                      }
                      return;
                    }
                    setManualLocationError("Please paste a Google Maps link (use Share in Google Maps and copy the link), or coordinates like 12.9081, 77.5831.");
                  }}
                  className="text-xs font-medium bg-white border border-brand text-brand-dark px-3 py-1.5 rounded-md hover:bg-brand hover:text-white transition disabled:opacity-60 whitespace-nowrap shrink-0"
                >
                  {resolvingLink ? "Resolving link…" : "Set location"}
                </button>
              </div>
            )}
            {manualLocationError && <span className="text-xs text-red-600">{manualLocationError}</span>}
          </div>

          <input id="checkout-addressLine" placeholder="House/flat, street, landmark*" value={form.addressLine} onChange={(e) => update("addressLine", e.target.value)} className={fieldClass("checkout-addressLine")} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="Locality (e.g. JP Nagar)" value={form.locality} onChange={(e) => update("locality", e.target.value)} className="border rounded-md px-3 py-2 text-sm" />
            <input placeholder="City" value={form.city} onChange={(e) => update("city", e.target.value)} className="border rounded-md px-3 py-2 text-sm" />
            <input id="checkout-pincode" placeholder="Pincode*" value={form.pincode} onChange={(e) => update("pincode", e.target.value)} className={fieldClass("checkout-pincode")} />
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
        </>
      )}
      {/* Sticky bottom bar: the amount payable (tap to see the breakup) and the
          step's actions, laid out the same as the cart's. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex max-w-2xl flex-col gap-2 py-2.5">
            {summaryOpen && breakup}
            <button
              type="button"
              onClick={() => setSummaryOpen((o) => !o)}
              aria-expanded={summaryOpen}
              aria-controls="payment-breakup"
              className="flex items-center justify-between gap-3 text-left"
            >
              <span>
                <span className="block text-xs text-gray-500">{multi ? `Amount due on collection - ${members.length} members` : "Amount due on collection"}</span>
                <span className="text-xl font-bold leading-tight text-brand-dark">{rs(total)}</span>
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-brand">
                {summaryOpen ? "Hide breakup" : "View breakup"}
                <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform ${summaryOpen ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <StepActions primary={primary} secondary={secondary} busy={submitting} />
          </div>
        </div>
      </div>
    </div>
  );
}
