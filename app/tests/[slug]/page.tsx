import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allTests, allPackages, getTestBySlug, displayAliases } from "@/lib/catalog";
import PriceTag from "@/components/PriceTag";
import AddToCartButton from "@/components/AddToCartButton";
import TestCard from "@/components/TestCard";
import PackageCard from "@/components/PackageCard";
import ProductFaqSection from "@/components/ProductFaqSection";
import { getTestSpecialties, getSpecialtyTests } from "@/lib/specialties";
import { SERVICE_AREAS } from "@/lib/site-config";
import { BUSINESS_NAME, PARTNER_NAME, SITE_URL } from "@/lib/site-config";

export function generateStaticParams() {
  return allTests.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const test = getTestBySlug(params.slug);
  if (!test) return {};
  // Specialised tests carry curated copy (scripts/specialised-seo.js): a title
  // and description that name the test the way people search for it.
  if (test.seo) {
    const label = testLabel(test.seo.short);
    // "<test> in Bangalore | Home Collection | Agilus (SRL)": the phrases people type
    // (home collection, Bangalore, Agilus, SRL) in the order they matter. Absolute so
    // the site name isn't appended and pushed past what Google shows.
    const title = `${label} in Bangalore | Home Collection | Agilus (SRL)`;
    const description = `${label} at home in Bangalore from Rs. ${test.price.toLocaleString("en-IN")}. Sample collected at home, tested at ${PARTNER_NAME} NABL labs, report in ${test.eta} on WhatsApp. Pay after collection.`;
    return {
      title: { absolute: title },
      description,
      alternates: { canonical: `${SITE_URL}/tests/${test.slug}` },
      openGraph: { title, description },
    };
  }
  return {
    title: `${test.name} - Book Home Collection`,
    description: test.description,
    alternates: { canonical: `${SITE_URL}/tests/${test.slug}` },
    openGraph: { title: test.name, description: test.description },
  };
}

// "NIPT" -> "NIPT test"; names that already say test/panel/profile stay as they are.
function testLabel(short: string): string {
  return /test|panel|profile|screen|checkup/i.test(short) ? short : `${short} test`;
}

export default function TestPage({ params }: { params: { slug: string } }) {
  const test = getTestBySlug(params.slug);
  if (!test) notFound();

  const relatedTests = allTests.filter((t) => t.category === test.category && t.slug !== test.slug).slice(0, 3);
  const inPackages = allPackages.filter((p) => p.constituents.some((c) => c.slug === test.slug)).slice(0, 3);

  const aliases = displayAliases(test);
  // Show the lab's own name only when it says something the friendly name doesn't.
  const showLabName = test.labName.toLowerCase() !== test.name.toLowerCase();

  const specialties = getTestSpecialties(test);
  const sameSpecialty = test.seo
    ? getSpecialtyTests(test.seo.specialties[0])
        .filter((t) => t.slug !== test.slug)
        .slice(0, 3)
    : [];

  // Answers to the questions people actually type or ask an AI assistant, on top of the
  // standard six: who offers it (Agilus / SRL), who orders it, what else it is called,
  // and how to book. Each is specific to this test.
  const label = test.seo ? testLabel(test.seo.short) : test.name;
  const doctors = specialties.map((s) => s.doctors);
  const extraFaqs = test.seo
    ? [
        {
          q: `Is the ${test.seo.short} available at Agilus Diagnostics (SRL)?`,
          a: `Yes. ${BUSINESS_NAME} is an authorised partner of ${PARTNER_NAME}, and the ${test.seo.short} sample is processed at its NABL-accredited labs. Agilus Diagnostics was earlier known as SRL Diagnostics, so reports carry the Agilus (SRL) name. You can book it here with home collection in Bangalore.`,
        },
        ...(doctors.length > 0
          ? [{ q: `Which doctor orders the ${test.seo.short}?`, a: `It is usually ordered by ${doctors[0]}${doctors.length > 1 ? `, and also by ${doctors.slice(1).join("; ")}` : ""}. If you are unsure whether you need it, ask your doctor before booking.` }]
          : []),
        ...(aliases.length > 0
          ? [{ q: `What is the ${test.seo.short} also called?`, a: `It is also known as ${aliases.slice(0, 8).join(", ")}. All of these names refer to the same test (${test.labName} at the lab).` }]
          : []),
        {
          q: `How do I book the ${test.seo.short} at home in Bangalore?`,
          a: `Add it to your cart, enter the patient's details and your address with a Google Maps location, and choose a collection time. A trained phlebotomist collects the sample at your home, the sample goes to ${PARTNER_NAME}, and the report is sent on WhatsApp. You pay only after the sample is collected.`,
        },
      ]
    : [];
  const allFaqs = [...(test.faqs ?? []), ...extraFaqs];

  const medicalTest = {
    "@type": "MedicalTest",
    "@id": `${SITE_URL}/tests/${test.slug}#test`,
    name: test.name,
    ...(aliases.length > 0 ? { alternateName: aliases } : {}),
    description: test.seo ? test.seo.what : test.description,
    usedToDiagnose: test.category,
    ...(test.seo ? { relevantSpecialty: specialties.map((s) => s.name) } : {}),
  };
  // A product/offer block so the price and availability can be read by search
  // engines and AI assistants (INR, bookable now, pay after collection).
  const product = {
    "@type": "Product",
    name: test.name,
    description: test.seo ? test.seo.what : test.description,
    url: `${SITE_URL}/tests/${test.slug}`,
    sku: test.code,
    category: test.category,
    offers: {
      "@type": "Offer",
      price: test.price,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/tests/${test.slug}`,
      seller: { "@type": "MedicalBusiness", name: BUSINESS_NAME, url: SITE_URL },
    },
  };
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      ...(specialties[0]
        ? [{ "@type": "ListItem", position: 2, name: specialties[0].name, item: `${SITE_URL}/specialised-tests/${specialties[0].slug}` }]
        : []),
      { "@type": "ListItem", position: specialties[0] ? 3 : 2, name: test.name, item: `${SITE_URL}/tests/${test.slug}` },
    ],
  };
  const jsonLd = { "@context": "https://schema.org", "@graph": test.seo ? [medicalTest, product, breadcrumb] : [medicalTest] };

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand">Home</Link> {" / "}
        {specialties[0] ? (
          <Link href={`/specialised-tests/${specialties[0].slug}`} className="hover:text-brand">{specialties[0].name}</Link>
        ) : (
          <Link href={`/search?q=${encodeURIComponent(test.category)}`} className="hover:text-brand">{test.category}</Link>
        )}{" / "}
        <span className="text-gray-700">{test.name}</span>
      </nav>

      <div className="bg-white border rounded-xl p-6 md:p-8 flex flex-col gap-4">
        <span className="text-xs uppercase tracking-wide text-brand font-semibold">{specialties[0] ? specialties[0].name : test.category} &middot; Individual Test</span>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{test.name}</h1>
          {test.seo && (
            <p className="mt-1 text-sm font-medium text-brand-dark">
              Home collection in Bangalore &middot; Tested at {PARTNER_NAME} labs
            </p>
          )}
          {aliases.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-medium">Also known as:</span> {aliases.join(", ")}
            </p>
          )}
        </div>
        <p className="text-gray-700 leading-relaxed">{test.seo ? test.seo.what : test.description}</p>
        {specialties[0] && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Usually prescribed by:</span>
            <Link href={`/specialised-tests/${specialties[0].slug}`} className="rounded-full border border-brand/30 bg-brand-light px-3 py-0.5 text-xs font-medium text-brand-dark hover:border-brand">
              {specialties[0].name}
            </Link>
          </p>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span><strong>Sample:</strong> {test.sampleType}</span>
          <span><strong>Test code:</strong> {test.code}</span>
          {showLabName && <span><strong>Lab test name:</strong> {test.labName}</span>}
          <span><strong>Reports in:</strong> {test.eta}</span>
        </div>

        <div className="flex items-center justify-between border-t pt-4 mt-2">
          <PriceTag mrp={test.mrp} price={test.price} size="lg" />
          <AddToCartButton kind="test" slug={test.slug} size="lg" />
        </div>
      </div>

      {test.seo && (
        <section className="bg-white border rounded-xl p-6 md:p-8 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-gray-900">When is the {test.seo.short} done?</h2>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            {test.seo.when.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          {test.seo.prep && (
            <div>
              <h3 className="font-semibold text-gray-900">Preparation</h3>
              <p className="text-gray-700 mt-1">{test.seo.prep}</p>
            </div>
          )}
          <p className="text-sm text-gray-600 border-t pt-4">
            Home sample collection across Bangalore, processed at {PARTNER_NAME} NABL-accredited labs. The report arrives on WhatsApp, and you pay
            only after the sample is collected. This page is general information, not medical advice; please discuss your result with your doctor.
          </p>
        </section>
      )}

      {test.seo && (
        <section className="bg-white border rounded-xl p-6 md:p-8 flex flex-col gap-4" aria-labelledby="book-heading">
          <h2 id="book-heading" className="text-lg font-bold text-gray-900">
            {label} at home in Bangalore: price, lab and report time
          </h2>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div><dt className="text-gray-500">Test</dt><dd className="font-medium text-gray-900">{test.name}</dd></div>
            <div><dt className="text-gray-500">Price</dt><dd className="font-medium text-gray-900">Rs. {test.price.toLocaleString("en-IN")} (pay after collection)</dd></div>
            <div><dt className="text-gray-500">Report time</dt><dd className="font-medium text-gray-900">{test.eta}, on WhatsApp</dd></div>
            <div><dt className="text-gray-500">Processed at</dt><dd className="font-medium text-gray-900">{PARTNER_NAME} NABL-accredited labs</dd></div>
            {specialties[0] && (
              <div><dt className="text-gray-500">Usually ordered by</dt><dd className="font-medium text-gray-900">{specialties.map((s) => s.name).join(", ")}</dd></div>
            )}
            <div><dt className="text-gray-500">Home collection areas</dt><dd className="font-medium text-gray-900">{SERVICE_AREAS.join(", ")}, and other parts of Bangalore on request</dd></div>
          </dl>
          <p className="text-sm text-gray-700 leading-relaxed">
            {BUSINESS_NAME} is an authorised partner of {PARTNER_NAME}. Agilus Diagnostics was earlier known as SRL Diagnostics, so if you
            searched for the {test.seo.short} at SRL or Agilus, this is the same lab network - with a phlebotomist coming to your home in
            Bangalore instead of you travelling to a collection centre.
          </p>
        </section>
      )}

      {inPackages.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">This test is also included in these packages</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {inPackages.map((p) => (
              <PackageCard key={p.slug} pkg={p} />
            ))}
          </div>
        </section>
      )}

      {sameSpecialty.length > 0 && specialties[0] && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            More {specialties[0].name} tests at home{" "}
            <Link href={`/specialised-tests/${specialties[0].slug}`} className="text-sm font-medium text-brand hover:underline">See all</Link>
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {sameSpecialty.map((t) => (
              <TestCard key={t.slug} test={t} />
            ))}
          </div>
        </section>
      )}

      {relatedTests.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Related tests in {test.category}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {relatedTests.map((t) => (
              <TestCard key={t.slug} test={t} />
            ))}
          </div>
        </section>
      )}

      {allFaqs.length > 0 && <ProductFaqSection faqs={allFaqs} />}
    </div>
  );
}
