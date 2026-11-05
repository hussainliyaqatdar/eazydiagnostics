import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, getGuideBySlug } from "@/lib/guides";
import { allPackages, getPackageBySlug, getTestBySlug } from "@/lib/catalog";
import PackageCard from "@/components/PackageCard";
import TestCard from "@/components/TestCard";
import ProductFaqSection from "@/components/ProductFaqSection";
import { BOOKING_PHONE, BOOKING_PHONE_TEL, BUSINESS_NAME, SITE_URL } from "@/lib/site-config";
import type { PackageItem, TestItem } from "@/lib/types";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const guide = getGuideBySlug(params.slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `${SITE_URL}/guides/${guide.slug}` },
    openGraph: { title: guide.title, description: guide.description, type: "article" },
  };
}

// "2026-11-05" -> "5 November 2026", always in UTC so the day never shifts.
const updatedFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const rs = (n: number) => `Rs. ${n.toLocaleString("en-IN")}`;

export default function GuidePage({ params }: { params: { slug: string } }) {
  const guide = getGuideBySlug(params.slug);
  if (!guide) notFound();

  // Prices come from the catalog, never from the guide text.
  const tests = guide.relatedTests.map((s) => getTestBySlug(s)).filter((t): t is TestItem => !!t);
  const packages = guide.relatedPackages.map((s) => getPackageBySlug(s)).filter((p): p is PackageItem => !!p);
  const checkups = guide.costTable ? allPackages.filter((p) => p.category === "Full Body Checkups") : [];

  const updatedLabel = updatedFormat.format(new Date(guide.updated));

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    dateModified: guide.updated,
    mainEntityOfPage: `${SITE_URL}/guides/${guide.slug}`,
    author: { "@type": "Organization", name: BUSINESS_NAME },
    publisher: { "@type": "Organization", name: BUSINESS_NAME },
  };

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />

      <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand">Home</Link> {" / "}
        <Link href="/guides" className="hover:text-brand">Guides</Link> {" / "}
        <span className="text-gray-700">{guide.title}</span>
      </nav>

      <article className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold leading-tight text-gray-900 md:text-3xl">{guide.title}</h1>
          <p className="text-xs text-gray-500">Last updated {updatedLabel}</p>
        </header>

        <p className="text-lg leading-relaxed text-gray-700">{guide.intro}</p>

        {checkups.length > 0 && (
          <section aria-labelledby="checkup-prices" className="flex flex-col gap-3">
            <h2 id="checkup-prices" className="text-xl font-bold text-gray-900">Our Full Body Checkup prices</h2>
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Package</th>
                    <th className="px-4 py-2 font-semibold">Tests</th>
                    <th className="px-4 py-2 font-semibold">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {checkups.map((p) => (
                    <tr key={p.slug}>
                      <td className="px-4 py-3">
                        <Link href={`/packages/${p.slug}`} className="font-medium text-brand hover:underline">{p.name}</Link>
                        <span className="block text-xs text-gray-500">{p.tagline}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{p.constituents.length}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-gray-900">{rs(p.price)}</span>
                        {p.mrp && <span className="ml-2 text-xs text-gray-400 line-through">{rs(p.mrp)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500">Prices include home collection and may change. The crossed-out figure is the usual list price.</p>
          </section>
        )}

        {guide.sections.map((s) => (
          <section key={s.heading} className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-gray-900">{s.heading}</h2>
            {s.paragraphs?.map((p) => (
              <p key={p} className="leading-relaxed text-gray-700">{p}</p>
            ))}
            {s.bullets && (
              <ul className="ml-5 list-disc space-y-1 text-gray-700">
                {s.bullets.map((b) => (
                  <li key={b} className="leading-relaxed">{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <aside className="flex flex-col gap-2 rounded-xl border border-brand/30 bg-brand-light p-5">
          <h2 className="text-lg font-bold text-brand-dark">Book a home blood test in Bangalore</h2>
          <p className="text-sm text-gray-700">
            A trained phlebotomist collects the sample at your home, it is tested in NABL-accredited labs, and your report arrives on WhatsApp. Pay only after your sample is collected.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/packages" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">View packages</Link>
            <a href={`tel:${BOOKING_PHONE_TEL}`} className="rounded-lg border border-brand bg-white px-4 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-light">
              Call {BOOKING_PHONE}
            </a>
          </div>
        </aside>
      </article>

      {packages.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-gray-900">Related packages</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {packages.map((p) => (
              <PackageCard key={p.slug} pkg={p} />
            ))}
          </div>
        </section>
      )}

      {tests.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-gray-900">Related tests</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {tests.map((t) => (
              <TestCard key={t.slug} test={t} />
            ))}
          </div>
        </section>
      )}

      <ProductFaqSection faqs={guide.faqs} />

      <section className="text-sm text-gray-600">
        <h2 className="mb-1 font-semibold text-gray-900">More guides</h2>
        <ul className="flex flex-col gap-1">
          {GUIDES.filter((g) => g.slug !== guide.slug).map((g) => (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`} className="text-brand hover:underline">{g.title}</Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-gray-400">
        This guide gives general information about diagnostic tests and does not replace professional medical advice. Please consult your doctor to decide which tests you need and to interpret your results.
      </p>
    </div>
  );
}
