import type { Metadata } from "next";
import Link from "next/link";
import { SPECIALTIES, getSpecialtyTests } from "@/lib/specialties";
import { BUSINESS_NAME, PARTNER_NAME, SITE_URL } from "@/lib/site-config";
import { getBrand } from "@/lib/brand-server";
import { brandText } from "@/lib/brand";

const TITLE = "Specialised Blood Tests at Home in Bangalore";
const DESCRIPTION = `NIPT, Double Marker, Lipoprotein(a), NT-proBNP, Procalcitonin, Thrombocheck and more specialised tests by doctor specialty, with home collection in Bangalore and ${PARTNER_NAME} lab processing.`;

export async function generateMetadata(): Promise<Metadata> {
  const description = brandText(DESCRIPTION, await getBrand());
  return {
    title: TITLE,
    description,
    alternates: { canonical: `${SITE_URL}/specialised-tests` },
    openGraph: { title: TITLE, description },
  };
}

const rs = (n: number) => `Rs. ${n.toLocaleString("en-IN")}`;

export default async function SpecialisedTestsPage() {
  const brand = await getBrand();
  const groups = SPECIALTIES.map((s) => ({ s, tests: getSpecialtyTests(s.slug) })).filter((g) => g.tests.length > 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: brandText(DESCRIPTION, brand),
    url: `${SITE_URL}/specialised-tests`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: groups.map((g, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: g.s.name,
        url: `${SITE_URL}/specialised-tests/${g.s.slug}`,
      })),
    },
  };

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{TITLE}</h1>
        <p className="text-gray-700 leading-relaxed">
          {brand
            ? `Many specialised tests are hard to find at a neighbourhood lab. ${brand.name} arranges these tests at your home in Bangalore, processed at NABL-accredited partner labs. Pick a specialty to see the tests, what each one is for, the price and the report time. ${brand.payAtClinic !== false ? "Pay now at the clinic front desk." : "You pay only after the sample is collected."}`
            : `Many specialised tests are hard to find at a neighbourhood lab. ${BUSINESS_NAME} is an authorised partner of ${PARTNER_NAME}, so these tests are collected at your home in Bangalore and processed at ${PARTNER_NAME} NABL-accredited labs. Pick a specialty to see the tests, what each one is for, the price and the report time. You pay only after the sample is collected.`}
        </p>
      </header>

      {groups.map(({ s, tests }) => (
        <section key={s.slug} aria-labelledby={`h-${s.slug}`} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id={`h-${s.slug}`} className="text-lg font-bold text-gray-900">
              <Link href={`/specialised-tests/${s.slug}`} className="hover:text-brand">{s.name}</Link>
            </h2>
            <Link href={`/specialised-tests/${s.slug}`} className="shrink-0 text-sm font-medium text-brand hover:underline">
              All {tests.length} tests
            </Link>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {tests.map((t) => (
              <li key={t.slug} className="rounded-lg border bg-white px-3 py-2">
                <Link href={`/tests/${t.slug}`} className="font-medium text-gray-900 hover:text-brand">{t.seo!.short}</Link>
                <span className="block text-xs text-gray-500">{rs(t.price)} &middot; Report in {t.eta}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="text-xs text-gray-500">
        This page is general information about diagnostic tests and does not replace professional medical advice. Please consult your doctor
        to decide which tests you need and to interpret your results.
      </p>
    </div>
  );
}
