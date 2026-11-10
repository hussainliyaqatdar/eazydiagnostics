import type { ProductFaq } from "@/lib/types";
import { getBrand } from "@/lib/brand-server";
import { brandText, mentionsPartnerBrand } from "@/lib/brand";

// Per-product FAQ block for test/package pages - same accordion + FAQPage
// schema pattern as the homepage's FAQSection, but driven by data generated
// per item (scripts/product-faqs.js) instead of a fixed list.
export default async function ProductFaqSection({ faqs: allFaqs }: { faqs: ProductFaq[] }) {
  // A clinic's version drops questions about the lab partner's brand and rewrites the rest.
  const brand = await getBrand();
  const faqs = brand
    ? allFaqs.filter((f) => !mentionsPartnerBrand(f.q)).map((f) => ({ q: brandText(f.q, brand), a: brandText(f.a, brand) }))
    : allFaqs;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section className="bg-white border rounded-xl p-6 md:p-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h2 className="text-lg font-bold text-gray-900 mb-3">Frequently asked questions</h2>
      <div className="flex flex-col divide-y">
        {faqs.map((f) => (
          <details key={f.q} className="group py-3">
            <summary className="flex items-center justify-between cursor-pointer list-none font-medium text-gray-900 gap-4">
              <span>{f.q}</span>
              <span className="text-brand transition-transform group-open:rotate-45 text-xl leading-none shrink-0" aria-hidden="true">+</span>
            </summary>
            <p className="text-sm text-gray-600 mt-2">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
