import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import TestCard from "@/components/TestCard";
import ProductFaqSection from "@/components/ProductFaqSection";
import { SPECIALTIES, getSpecialty, getSpecialtyTests } from "@/lib/specialties";
import { BUSINESS_NAME, PARTNER_NAME, SERVICE_AREAS, SITE_URL } from "@/lib/site-config";
import { getBrand } from "@/lib/brand-server";
import { brandText, homeHref } from "@/lib/brand";
import { COLLECTION_CHARGE, FREE_COLLECTION_MIN } from "@/lib/booking-totals";

export function generateStaticParams() {
  return SPECIALTIES.filter((s) => getSpecialtyTests(s.slug).length > 0).map((s) => ({ specialty: s.slug }));
}

export function generateMetadata({ params }: { params: { specialty: string } }): Metadata {
  const specialty = getSpecialty(params.specialty);
  if (!specialty) return {};
  const url = `${SITE_URL}/specialised-tests/${specialty.slug}`;
  const description = brandText(specialty.description, getBrand());
  return {
    title: specialty.heading,
    description,
    alternates: { canonical: url },
    openGraph: { title: specialty.heading, description },
  };
}

const rs = (n: number) => `Rs. ${n.toLocaleString("en-IN")}`;

export default function SpecialtyPage({ params }: { params: { specialty: string } }) {
  const specialty = getSpecialty(params.specialty);
  if (!specialty) notFound();
  const tests = getSpecialtyTests(specialty.slug);
  if (tests.length === 0) notFound();
  const brand = getBrand();
  const t = (text: string) => brandText(text, brand);

  const names = tests.map((t) => t.seo!.short);
  const faqs = [
    {
      q: `Which ${specialty.name} tests can I get at home in Bangalore?`,
      a: t(`${BUSINESS_NAME} offers home collection for ${names.join(", ")}. Each is processed at ${PARTNER_NAME} NABL-accredited labs, and the report is sent on WhatsApp.`),
    },
    {
      q: `How much do these ${specialty.name} tests cost?`,
      a: t(`Prices range from ${rs(Math.min(...tests.map((t) => t.price)))} to ${rs(Math.max(...tests.map((t) => t.price)))}, shown on each test page. There is no advance payment: you pay after the sample is collected. Home collection is free on orders of ${rs(FREE_COLLECTION_MIN)} or more; a flat ${rs(COLLECTION_CHARGE)} charge applies to smaller orders.`),
    },
    {
      q: "Where in Bangalore is home collection available?",
      a: `We collect samples at home across ${SERVICE_AREAS.join(", ")}, and other parts of Bangalore on request.`,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: specialty.heading,
        description: t(specialty.description),
        url: `${SITE_URL}/specialised-tests/${specialty.slug}`,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: tests.map((t, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: t.name,
            url: `${SITE_URL}/tests/${t.slug}`,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Specialised tests", item: `${SITE_URL}/specialised-tests` },
          { "@type": "ListItem", position: 3, name: specialty.name, item: `${SITE_URL}/specialised-tests/${specialty.slug}` },
        ],
      },
    ],
  };

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href={homeHref(brand)} className="hover:text-brand">Home</Link> {" / "}
        <Link href="/specialised-tests" className="hover:text-brand">Specialised tests</Link> {" / "}
        <span className="text-gray-700">{specialty.name}</span>
      </nav>

      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{specialty.heading}</h1>
        <p className="text-gray-700 leading-relaxed">
          {brand
            ? `These tests are commonly ordered by ${specialty.doctors}. ${brand.name} arranges for the sample to be collected at your home in Bangalore, it is processed at NABL-accredited partner labs, and the report arrives on WhatsApp. Pay now at the clinic front desk.`
            : `These tests are commonly ordered by ${specialty.doctors}. ${BUSINESS_NAME}, an authorised partner of ${PARTNER_NAME}, collects the sample at your home in Bangalore, the sample is processed at ${PARTNER_NAME} NABL-accredited labs, and the report arrives on WhatsApp. You pay only after the sample is collected.`}
        </p>
      </header>

      <section className="flex flex-col gap-4" aria-label="Tests">
        <h2 className="text-lg font-bold text-gray-900">{tests.length} {specialty.name} tests available at home</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {tests.map((t) => (
            <TestCard key={t.slug} test={t} />
          ))}
        </div>
      </section>

      <ProductFaqSection faqs={faqs} />

      <p className="text-xs text-gray-500">
        This page is general information and does not replace professional medical advice. Please consult your doctor to decide which tests
        you need and to interpret your results.
      </p>
    </div>
  );
}
