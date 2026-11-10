import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allPackages, getPackageBySlug } from "@/lib/catalog";
import PriceTag from "@/components/PriceTag";
import AddToCartButton from "@/components/AddToCartButton";
import PackageCard from "@/components/PackageCard";
import ProductFaqSection from "@/components/ProductFaqSection";
import { SITE_URL, BOOKING_PHONE, BOOKING_PHONE_TEL } from "@/lib/site-config";
import { getBrand } from "@/lib/brand-server";
import { homeHref } from "@/lib/brand";

export function generateStaticParams() {
  return allPackages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const pkg = getPackageBySlug(params.slug);
  if (!pkg) return {};
  return {
    title: `${pkg.name} - Book Home Collection`,
    description: pkg.description,
    alternates: { canonical: `${SITE_URL}/packages/${pkg.slug}` },
    openGraph: { title: pkg.name, description: pkg.description },
  };
}

export default async function PackagePage({ params }: { params: { slug: string } }) {
  const pkg = getPackageBySlug(params.slug);
  if (!pkg) notFound();

  const relatedPackages = allPackages.filter((p) => p.category === pkg.category && p.slug !== pkg.slug).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pkg.name,
    description: pkg.description,
    offers: { "@type": "Offer", price: pkg.price, priceCurrency: "INR" },
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href={homeHref(await getBrand())} className="hover:text-brand">Home</Link> {" / "}
        <Link href={`/search?q=${encodeURIComponent(pkg.category)}`} className="hover:text-brand">{pkg.category}</Link> {" / "}
        <span className="text-gray-700">{pkg.name}</span>
      </nav>

      <div className="bg-white border rounded-xl p-6 md:p-8 flex flex-col gap-4">
        <span className="text-xs uppercase tracking-wide text-brand-accent font-semibold">{pkg.category} &middot; {pkg.tagline}</span>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{pkg.name}</h1>
        <p className="text-gray-700 leading-relaxed">{pkg.description}</p>

        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span><strong>Reports in:</strong> {pkg.eta}</span>
        </div>

        <div className="flex items-center justify-between border-t pt-4 mt-2">
          <PriceTag mrp={pkg.mrp} price={pkg.price} size="lg" />
          <AddToCartButton kind="package" slug={pkg.slug} size="lg" />
        </div>
      </div>

      <section className="bg-white border rounded-xl p-6 md:p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">What's included ({pkg.constituents.length} tests)</h2>
        {pkg.needsContent ? (
          <p className="text-sm text-gray-600">
            We're finalising the full test list for this package. Call us at{" "}
            <a href={`tel:${BOOKING_PHONE_TEL}`} className="text-brand font-medium hover:underline">{BOOKING_PHONE}</a> and our team will
            confirm exactly what's covered before you book.
          </p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {pkg.constituents.map((c) => (
              <li key={c.name} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-brand mt-0.5" aria-hidden>{"✓"}</span>
                {c.slug ? (
                  <Link href={`/tests/${c.slug}`} className="hover:text-brand hover:underline">{c.name}</Link>
                ) : (
                  <span>{c.name}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {relatedPackages.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">More {pkg.category} packages</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {relatedPackages.map((p) => (
              <PackageCard key={p.slug} pkg={p} />
            ))}
          </div>
        </section>
      )}

      {pkg.faqs && pkg.faqs.length > 0 && <ProductFaqSection faqs={pkg.faqs} />}
    </div>
  );
}
