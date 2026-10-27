import type { Metadata } from "next";
import Link from "next/link";

// An internal map of the site for the team - not part of the patient-facing
// site's search presence. Keep it in step when a page is added or removed.
export const metadata: Metadata = {
  title: "Site index",
  description: "Every major page on the site and what you can do there.",
  robots: { index: false, follow: false },
};

type Entry = { href: string; label: string; note: string };
type Section = { title: string; blurb?: string; entries: Entry[] };

const SECTIONS: Section[] = [
  {
    title: "Patients: browse and book",
    entries: [
      { href: "/", label: "Home", note: "Landing page: search for a test, see packages, trust markers, reviews and the current offer banner." },
      { href: "/tests", label: "All tests", note: "Browse every individual test with its price and report time, and add tests to the cart." },
      { href: "/tests/cbc-5-edta-whole-blood", label: "Test page (example)", note: "One test: what it checks, sample type, price, FAQs, and an Add to cart button. Every test has its own /tests/<name> page." },
      { href: "/packages", label: "All packages", note: "Health packages (Full Body Checkups, women's health, heart, diabetes and more) with a comparison view." },
      { href: "/packages/full-body-checkup-mini", label: "Package page (example)", note: "One package: the tests it includes, price and savings, and an Add to cart button. Every package has its own /packages/<name> page." },
      { href: "/search", label: "Search", note: "Search tests and packages by name, or by the other names a doctor may have used." },
      { href: "/cart", label: "Cart", note: "Review the items, apply a coupon code, and continue to checkout." },
      { href: "/checkout", label: "Checkout", note: "Enter patient details, who prescribed the test (optional), the address with a pinned Google Maps location (required) and a collection slot. Payment is after the sample is collected." },
      { href: "/confirmation/BK-EXAMPLE", label: "Order confirmation", note: "Shown after an order is placed (/confirmation/<booking id>): the booking summary and amount due. This example id shows the not-found state." },
    ],
  },
  {
    title: "Doctors and sales team",
    entries: [
      { href: "/for-doctors#signup", label: "Register a doctor", note: "Doctors or the sales team register a doctor (name, clinic, WhatsApp number, specialty, degree). Registered doctors get an affiliate booking link and appear in the checkout \"Prescribed by\" list." },
      { href: "/?ref=DR-EXAMPLE", label: "Affiliate booking link (format)", note: "What a doctor's personal link looks like: the home page with ?ref=<doctor id>. Patients who book through it have the doctor pre-filled as \"Prescribed by\". Real links are in the admin doctors page." },
    ],
  },
  {
    title: "Offer experiments",
    blurb: "Two versions of the follow-up consultation offer, for comparing which converts better. Not linked from the main site.",
    entries: [
      { href: "/compare/consult-addon", label: "Consultation as an add-on", note: "Packages at the usual price, with a follow-up doctor consultation the customer can add in the cart." },
      { href: "/compare/consult-included", label: "Consultation included", note: "The same packages at a higher price with the follow-up consultation bundled in." },
    ],
  },
  {
    title: "Admin (login required)",
    blurb: "Behind a browser login (ADMIN_PASSWORD). Locked in production until that is set.",
    entries: [
      { href: "/admin/doctors", label: "Registered doctors", note: "See every registered doctor with their clinic and contact details, copy their affiliate booking link, or delete a doctor (with a confirmation)." },
      { href: "/admin/email", label: "Email delivery", note: "Check that order and doctor-registration emails are set up (Resend key, owner and sender addresses) and send a test email." },
      { href: "/admin/inbox", label: "Dev inbox", note: "Local development only: emails the site would have sent (order notifications, doctor sign-ups) when no email service is configured." },
    ],
  },
  {
    title: "For search engines and AI assistants",
    entries: [
      { href: "/llm-info", label: "Fact sheet for AI assistants", note: "Plain-language facts about the business, areas served, how booking and payment work, FAQs and live prices." },
      { href: "/llms.txt", label: "llms.txt", note: "A short machine-readable summary that points AI assistants to the fact sheet and catalog." },
      { href: "/sitemap.xml", label: "Sitemap", note: "Every page listed for search engines." },
      { href: "/robots.txt", label: "robots.txt", note: "Tells search engines which pages not to crawl." },
      { href: "/api/health", label: "Health check", note: "Returns {\"status\":\"ok\"}; used by the uptime pinger that keeps the server awake." },
    ],
  },
];

export default function SiteIndexPage() {
  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Site index</h1>
        <p className="text-sm text-gray-600">The major pages on the site and what you can do on each.</p>
      </header>

      {SECTIONS.map((section) => (
        <section key={section.title} aria-labelledby={`s-${section.title}`} className="flex flex-col gap-3">
          <div>
            <h2 id={`s-${section.title}`} className="text-lg font-semibold text-gray-900">
              {section.title}
            </h2>
            {section.blurb && <p className="text-sm text-gray-500">{section.blurb}</p>}
          </div>
          <ul className="divide-y rounded-lg border bg-white">
            {section.entries.map((e) => (
              <li key={e.href} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
                <div className="shrink-0 sm:w-72">
                  <Link href={e.href} className="font-medium text-brand hover:underline">
                    {e.label}
                  </Link>
                  <code className="block break-all text-xs text-gray-400">{e.href}</code>
                </div>
                <p className="text-sm text-gray-700">{e.note}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
