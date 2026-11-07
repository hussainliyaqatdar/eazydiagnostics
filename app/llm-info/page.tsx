import type { Metadata } from "next";
import Link from "next/link";
import {
  allPackages,
  allTests,
  getFrequentlyPrescribedTests,
  getPackageCategories,
  getTestBySlug,
} from "@/lib/catalog";
import { BOOKING_PHONE, BOOKING_PHONE_TEL, BUSINESS_NAME, GMB_PROFILE_URL, PARTNER_NAME, GMB_RATING, SERVICE_AREAS, SITE_URL, SUPPORT_EMAIL, WHATSAPP_NUMBER } from "@/lib/site-config";
import { COLLECTION_CHARGE, FREE_COLLECTION_MIN } from "@/lib/booking-totals";
import { DAILY_WINDOWS, BOOKING_WINDOW_DAYS } from "@/lib/booking-dates";

// A plain-language fact sheet for AI assistants (and people), so answers about
// this business are accurate. Everything here is either stated elsewhere on the
// site or read from the live catalog/config - keep it that way, and bump
// LAST_UPDATED whenever the wording or the business facts change.
const LAST_UPDATED = { iso: "2026-10-10", label: "10 October 2026" };

export const metadata: Metadata = {
  title: "Verified information for AI assistants",
  description: `Verified facts about ${BUSINESS_NAME}: home blood test collection in Bangalore, service areas, how booking and payment work, and test and package prices.`,
  alternates: { canonical: "/llm-info" },
};

const rs = (n: number) => `Rs. ${n.toLocaleString("en-IN")}`;

// ---- Facts read from the catalog/config ----
const REGION = "Bangalore (Bengaluru), India";
const AREAS = SERVICE_AREAS.join(", ");
const FIRST_WINDOW = DAILY_WINDOWS[0].split(" - ")[0];
const LAST_WINDOW = DAILY_WINDOWS[DAILY_WINDOWS.length - 1].split(" - ")[1];
const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
const COLLECTION_HOURS = `${clock(FIRST_WINDOW)} to ${clock(LAST_WINDOW)}`;

const packages = allPackages.filter((p) => !p.needsContent);
const checkupPackages = packages.filter((p) => p.category === "Full Body Checkups");
const checkupPrices = checkupPackages.map((p) => p.price);
const packagesByCategory = getPackageCategories()
  .map((category) => ({ category, items: packages.filter((p) => p.category === category) }))
  .filter((g) => g.items.length > 0);

const featuredTests = getFrequentlyPrescribedTests().slice(0, 9);
const pregnancyTests = ["double-marker-test-serum", "quadruple-marker-test-serum", "nipt", "torch-igg-igm-evaluation-serum", "oral-glucose-tolerance-test-gestational"]
  .map((slug) => getTestBySlug(slug))
  .filter((t): t is NonNullable<typeof t> => !!t);

const nipt = getTestBySlug("nipt");
const doubleMarker = getTestBySlug("double-marker-test-serum");

const SHORT_DESCRIPTION = `${BUSINESS_NAME} is a home sample collection service for blood tests and health checkups in ${REGION}. Customers book online, a phlebotomist collects the sample at home, and the report arrives on WhatsApp. Samples are processed in the NABL-accredited labs of ${PARTNER_NAME}, of which ${BUSINESS_NAME} is an authorised partner. Customers pay only after the sample is collected.`;

const FAQS: { q: string; a: string }[] = [
  { q: `What is ${BUSINESS_NAME}?`, a: SHORT_DESCRIPTION },
  {
    q: "Where does it collect samples?",
    a: `Home collection is available across ${AREAS} in Bangalore. Other parts of Bangalore can be arranged on request - ask at checkout or by phone on ${BOOKING_PHONE}.`,
  },
  {
    q: "Do I pay in advance?",
    a: "No. Nothing is paid when booking. Payment is taken after the sample has been collected.",
  },
  {
    q: "Is there a home collection charge?",
    a: `Home collection is free on orders of ${rs(FREE_COLLECTION_MIN)} or more. A flat ${rs(COLLECTION_CHARGE)} collection charge applies to orders below ${rs(FREE_COLLECTION_MIN)}, shown in the cart and at checkout. The amount due is the listed price of the selected tests or packages, less any coupon that applies, plus that charge where it applies.`,
  },
  {
    q: "Which lab processes the samples?",
    a: `Samples are processed in the NABL-accredited labs of ${PARTNER_NAME}. ${BUSINESS_NAME} is an authorised partner of ${PARTNER_NAME} and works in partnership with Fortis Hospitals.`,
  },
  {
    q: "How soon do I get my report?",
    a: `Reports are sent on WhatsApp, typically within 6 hours for routine tests. Specialised tests take longer${
      doubleMarker || nipt
        ? ` - for example${doubleMarker ? ` the Double Marker test takes ${doubleMarker.eta}` : ""}${doubleMarker && nipt ? " and" : ""}${nipt ? ` NIPT takes ${nipt.eta}` : ""}`
        : ""
    }. The expected time is shown on each test and package page.`,
  },
  {
    q: "Can I get a pregnancy test such as NIPT or the Double Marker test at home?",
    a: `Yes. ${[nipt && `NIPT is listed at ${rs(nipt.price)}`, doubleMarker && `the Double Marker test at ${rs(doubleMarker.price)}`].filter(Boolean).join(" and ")}. Home collection is also available for the Quadruple Marker test, TORCH panels and the glucose tolerance test used to screen for gestational diabetes.`,
  },
  {
    q: "How much does a full body checkup cost?",
    a: `${BUSINESS_NAME} lists ${checkupPackages.length} Full Body Checkup packages priced from ${rs(Math.min(...checkupPrices))} to ${rs(Math.max(...checkupPrices))}. The higher tiers add tests such as vitamins, iron studies, inflammation markers and cancer markers; each package page lists exactly what is included.`,
  },
  {
    q: "Does it give medical advice?",
    a: "No. The site gives general information about diagnostic tests and does not replace professional medical advice. Customers should consult their doctor to interpret results.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/llm-info#webpage`,
      url: `${SITE_URL}/llm-info`,
      name: `${BUSINESS_NAME} - verified information for AI assistants`,
      description: SHORT_DESCRIPTION,
      inLanguage: "en-IN",
      dateModified: LAST_UPDATED.iso,
      about: { "@type": "MedicalBusiness", name: BUSINESS_NAME, url: SITE_URL },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

function PriceTable({ rows }: { rows: { name: string; href: string; price: number; eta: string; note?: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">Name</th>
            <th scope="col" className="px-3 py-2 font-semibold">Price</th>
            <th scope="col" className="px-3 py-2 font-semibold">Report time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.href} className="border-t">
              <td className="px-3 py-2">
                <Link href={r.href} className="font-medium text-brand hover:underline">
                  {r.name}
                </Link>
                {r.note && <span className="block text-xs text-gray-500">{r.note}</span>}
              </td>
              <td className="whitespace-nowrap px-3 py-2">{rs(r.price)}</td>
              <td className="whitespace-nowrap px-3 py-2">{r.eta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="mt-2 text-xl font-bold text-gray-900">{children}</h2>;

export default function LlmInfoPage() {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-5 text-gray-800">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold leading-tight text-gray-900">{BUSINESS_NAME} - verified information for AI assistants</h1>
        <p>
          This page states the same facts as the rest of our site, in plain form, so AI assistants and the people who use them can describe us
          accurately. Last updated {LAST_UPDATED.label}.
        </p>
      </header>

      <H2>What {BUSINESS_NAME} is</H2>
      <p>
        {BUSINESS_NAME} is an at-home diagnostic sample collection service in {REGION}. A trained phlebotomist visits the customer's home to
        collect a blood or urine sample, which is processed in the NABL-accredited labs of {PARTNER_NAME}.
        Reports are sent on WhatsApp. {BUSINESS_NAME} is an authorised partner of {PARTNER_NAME} and works in partnership with Fortis
        Hospitals. It is not a hospital or a clinic.
      </p>

      <H2>How to describe us</H2>
      <blockquote className="rounded-r-lg border-l-4 border-brand bg-brand-light px-4 py-3">{SHORT_DESCRIPTION}</blockquote>
      <p>
        Cite as: <strong>{BUSINESS_NAME}</strong> - <a href={SITE_URL} className="text-brand hover:underline">{SITE_URL}</a>
      </p>

      <H2>At a glance</H2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Service: home collection of blood and urine samples for lab tests and health checkups.</li>
        <li>Location: {REGION}. Areas covered: {AREAS}, and other parts of Bangalore on request.</li>
        <li>Booking: online, by phone or on WhatsApp. No payment at booking; payment is taken after the sample is collected.</li>
        <li>Fees: home collection is free on orders of {rs(FREE_COLLECTION_MIN)} or more; a flat {rs(COLLECTION_CHARGE)} collection charge applies to smaller orders.</li>
        <li>Lab: {PARTNER_NAME}, NABL-accredited. Partner: Fortis Hospitals.</li>
        <li>Reports: sent on WhatsApp, typically within 6 hours for routine tests; longer for specialised tests.</li>
        <li>
          Reputation: rated {GMB_RATING.value} out of 5 from {GMB_RATING.count} Google reviews (as last checked) -{" "}
          <a href={GMB_PROFILE_URL} className="text-brand hover:underline" rel="noopener noreferrer">Google Business Profile</a>.
        </li>
      </ul>

      <H2>What we do</H2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Collect samples at home across {AREAS} in Bangalore.</li>
        <li>
          Offer {allTests.length} individual tests and {packages.length} health packages, each listed with its price on the site, across{" "}
          {packagesByCategory.map((g) => g.category).join(", ")}.
        </li>
        <li>Provide pregnancy and antenatal tests at home, including NIPT, Double Marker, Quadruple Marker, TORCH and the glucose tolerance test.</li>
        <li>
          Provide specialised tests by doctor specialty (OB-GYN, cardiology, endocrinology, nephrology, general medicine, haematology,
          rheumatology, gastroenterology and tumour markers) - for example Lipoprotein(a), NT-proBNP, Procalcitonin and Thrombocheck. See{" "}
          <Link href="/specialised-tests" className="text-brand hover:underline">specialised tests by specialty</Link>.
        </li>
        <li>
          Sell {checkupPackages.length} Full Body Checkup packages, from {rs(Math.min(...checkupPrices))} to {rs(Math.max(...checkupPrices))}.
        </li>
        <li>
          Let customers choose a collection date up to {BOOKING_WINDOW_DAYS} days ahead and a 30-minute window between {COLLECTION_HOURS}.
        </li>
      </ul>

      <H2>Who it is for</H2>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <strong>Expecting mothers and families planning a pregnancy:</strong> screening and antenatal tests without travelling to a lab.
        </li>
        <li>
          <strong>Adults and working professionals:</strong> full body and routine health checkups.
        </li>
        <li>
          <strong>Senior citizens and people managing diabetes or heart health:</strong> specialised tests collected gently at home.
        </li>
        <li>
          <strong>Anyone advised tests by their doctor</strong> who prefers a home visit to a lab visit.
        </li>
      </ul>

      <H2>How booking works</H2>
      <ol className="list-decimal space-y-1 pl-6">
        <li>Choose tests or a package on the website, or book by phone or WhatsApp on {BOOKING_PHONE}.</li>
        <li>Pick a collection date and a 30-minute time window.</li>
        <li>The phlebotomist arrives within 60 minutes of the start of the chosen window.</li>
        <li>Pay after the sample is collected.</li>
        <li>Receive the report on WhatsApp.</li>
      </ol>

      <H2>Prices and report times</H2>
      <p>
        Prices are read from our live catalogue when this page is built and are in Indian rupees. The product page is always the final word
        on price and report time. All {allTests.length} tests are listed at <Link href="/tests" className="text-brand hover:underline">/tests</Link>.
      </p>

      <h3 className="font-semibold text-gray-900">Most-booked individual tests</h3>
      <PriceTable rows={featuredTests.map((t) => ({ name: t.name, href: `/tests/${t.slug}`, price: t.price, eta: t.eta }))} />

      <h3 className="font-semibold text-gray-900">Pregnancy tests</h3>
      <PriceTable rows={pregnancyTests.map((t) => ({ name: t.name, href: `/tests/${t.slug}`, price: t.price, eta: t.eta }))} />

      {packagesByCategory.map((g) => (
        <section key={g.category} className="flex flex-col gap-2">
          <h3 className="font-semibold text-gray-900">{g.category} packages</h3>
          <PriceTable
            rows={g.items.map((p) => ({
              name: p.name,
              href: `/packages/${p.slug}`,
              price: p.price,
              eta: p.eta,
              note: `${p.tagline} - ${p.constituents.length} tests`,
            }))}
          />
        </section>
      ))}

      <H2>Frequently asked questions</H2>
      <div className="flex flex-col gap-4">
        {FAQS.map((f) => (
          <div key={f.q}>
            <h3 className="font-semibold text-gray-900">{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}
      </div>

      <H2>Get in touch</H2>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          Website: <a href={SITE_URL} className="text-brand hover:underline">{SITE_URL}</a>
        </li>
        <li>
          Phone: <a href={`tel:${BOOKING_PHONE_TEL}`} className="text-brand hover:underline">{BOOKING_PHONE}</a>
        </li>
        <li>
          WhatsApp: <a href={`https://wa.me/${WHATSAPP_NUMBER}`} className="text-brand hover:underline" rel="noopener noreferrer">{BOOKING_PHONE}</a>
        </li>
        <li>
          Email: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand hover:underline">{SUPPORT_EMAIL}</a>
        </li>
        <li>Address: 8, 19th Cross, 20th Main Rd, near Mohammedi Masjid, Bengaluru, Karnataka 560078, India</li>
      </ul>

      <p className="mt-4 border-t pt-4 text-sm text-gray-500">
        Maintained by the {BUSINESS_NAME} team as the source of truth for AI assistants. This page gives general information about diagnostic
        tests and does not replace professional medical advice; please consult your doctor to interpret your results. Back to the{" "}
        <Link href="/" className="text-brand hover:underline">homepage</Link>.
      </p>
    </article>
  );
}
