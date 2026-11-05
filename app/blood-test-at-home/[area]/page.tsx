import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AREAS, getAreaBySlug } from "@/lib/areas";
import { getPackageBySlug, getTestBySlug } from "@/lib/catalog";
import { DAILY_WINDOWS } from "@/lib/booking-dates";
import PackageCard from "@/components/PackageCard";
import TestCard from "@/components/TestCard";
import ProductFaqSection from "@/components/ProductFaqSection";
import { GUIDES } from "@/lib/guides";
import { BOOKING_PHONE, BOOKING_PHONE_TEL, BUSINESS_NAME, GMB_RATING, PARTNER_NAME, SITE_URL } from "@/lib/site-config";
import type { PackageItem, TestItem } from "@/lib/types";

export function generateStaticParams() {
  return AREAS.map((a) => ({ area: a.slug }));
}

export async function generateMetadata({ params }: { params: { area: string } }): Promise<Metadata> {
  const area = getAreaBySlug(params.area);
  if (!area) return {};
  const title = `Blood test at home in ${area.name}, Bangalore`;
  return {
    title,
    description: area.summary,
    alternates: { canonical: `${SITE_URL}/blood-test-at-home/${area.slug}` },
    openGraph: { title, description: area.summary },
  };
}

export default function AreaPage({ params }: { params: { area: string } }) {
  const area = getAreaBySlug(params.area);
  if (!area) notFound();

  const packages = area.featuredPackages.map((s) => getPackageBySlug(s)).filter((p): p is PackageItem => !!p);
  const tests = area.featuredTests.map((s) => getTestBySlug(s)).filter((t): t is TestItem => !!t);
  const otherAreas = AREAS.filter((a) => a.slug !== area.slug);
  // "07:00 - 07:30" ... "12:30 - 13:00" -> collection runs from the first start to the last end.
  const to12Hour = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };
  const firstSlot = to12Hour(DAILY_WINDOWS[0].slice(0, 5));
  const lastSlot = to12Hour(DAILY_WINDOWS[DAILY_WINDOWS.length - 1].slice(-5));

  const steps = [
    { title: "Choose your tests", text: "Pick individual tests or a package, and add them to your cart." },
    { title: "Pick a slot and share your location", text: `Slots run from ${firstSlot} to ${lastSlot}. Add a Google Maps location pin so we can find you.` },
    { title: "We come to you", text: "A trained phlebotomist arrives within 60 minutes of the start of your slot and collects the sample. You pay only after collection." },
    { title: "Get your report on WhatsApp", text: `Your sample is tested in the NABL-accredited labs of ${PARTNER_NAME}, and the report is sent to you on WhatsApp.` },
  ];

  const pageLd = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: BUSINESS_NAME,
    url: `${SITE_URL}/blood-test-at-home/${area.slug}`,
    telephone: BOOKING_PHONE,
    description: area.summary,
    areaServed: { "@type": "Place", name: `${area.name}, Bangalore` },
    aggregateRating: { "@type": "AggregateRating", ratingValue: GMB_RATING.value, reviewCount: GMB_RATING.count },
  };

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageLd) }} />

      <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand">Home</Link> {" / "}
        <Link href="/blood-test-at-home" className="hover:text-brand">Blood test at home</Link> {" / "}
        <span className="text-gray-700">{area.name}</span>
      </nav>

      <header className="flex flex-col gap-3 rounded-xl border bg-white p-6 md:p-8">
        <h1 className="text-2xl font-bold leading-tight text-gray-900 md:text-3xl">Blood test at home in {area.name}, Bangalore</h1>
        <p className="text-gray-700">{area.summary}</p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/packages" className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">Book a home collection</Link>
          <a href={`tel:${BOOKING_PHONE_TEL}`} className="rounded-lg border border-brand bg-white px-5 py-2.5 text-sm font-semibold text-brand-dark hover:bg-brand-light">
            Call {BOOKING_PHONE}
          </a>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-gray-900">Home blood tests in {area.name}</h2>
        {area.about.map((p) => (
          <p key={p} className="leading-relaxed text-gray-700">{p}</p>
        ))}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">{area.parts.label}</h3>
          <div className="flex flex-wrap gap-2">
            {area.parts.items.map((item) => (
              <span key={item} className="rounded-full bg-brand-light px-3 py-1 text-sm text-brand-dark">{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-gray-900">How it works in {area.name}</h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-xl border bg-white p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white" aria-hidden="true">{i + 1}</span>
              <div>
                <p className="font-semibold text-gray-900">{s.title}</p>
                <p className="text-sm text-gray-600">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-gray-900">Good to know if you live in {area.name}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {area.goodToKnow.map((g) => (
            <div key={g.title} className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold text-gray-900">{g.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{g.text}</p>
            </div>
          ))}
        </div>
      </section>

      {packages.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">Popular packages for {area.name}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {packages.map((p) => (
              <PackageCard key={p.slug} pkg={p} />
            ))}
          </div>
        </section>
      )}

      {tests.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">Frequently booked tests</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {tests.map((t) => (
              <TestCard key={t.slug} test={t} />
            ))}
          </div>
        </section>
      )}

      <ProductFaqSection faqs={area.faqs} />

      <section className="grid gap-6 text-sm sm:grid-cols-2">
        <div>
          <h2 className="mb-1 font-semibold text-gray-900">Also collecting in</h2>
          <ul className="flex flex-col gap-1">
            {otherAreas.map((a) => (
              <li key={a.slug}>
                <Link href={`/blood-test-at-home/${a.slug}`} className="text-brand hover:underline">Blood test at home in {a.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-1 font-semibold text-gray-900">Helpful guides</h2>
          <ul className="flex flex-col gap-1">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`} className="text-brand hover:underline">{g.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
