import Link from "next/link";
import HeroSearchCTA from "@/components/HeroSearchCTA";
import TrustMarkers from "@/components/TrustMarkers";
import ReviewsCarousel from "@/components/ReviewsCarousel";
import TestCard from "@/components/TestCard";
import PackageCard from "@/components/PackageCard";
import HeroCarousel from "@/components/HeroCarousel";
import MoreWaysToBook from "@/components/MoreWaysToBook";
import FAQSection from "@/components/FAQSection";
import { allTests, allPackages, getFrequentlyPrescribedTests } from "@/lib/catalog";
import { SERVICE_AREAS } from "@/lib/site-config";

const FEATURED_PREGNANCY_TEST_SLUGS = ["double-marker-test-serum", "nipt", "oral-glucose-tolerance-test-gestational"];

export default function Home() {
  const popularPackages = allPackages.filter((p) => !p.needsContent).slice(0, 3);
  const pregnancyPackages = allPackages.filter((p) => /trimester|pcos|torch|infertility|menopause/i.test(p.name)).slice(0, 3);
  const pregnancyTests = FEATURED_PREGNANCY_TEST_SLUGS.map((slug) => allTests.find((t) => t.slug === slug)).filter(Boolean) as typeof allTests;
  // Top 9 tests by prescribing frequency (see lib/cc-sprf-tests.ts) - the
  // ranking already leads with the routine GP/gynaecologist panel (CBC,
  // urine routine, lipid, liver, kidney, HbA1c, thyroid, Vitamin D/B12).
  const popularTests = getFrequentlyPrescribedTests().slice(0, 9);

  return (
    <div className="flex flex-col gap-16">
      <section className="hero-grid bg-brand-light rounded-2xl p-8 md:p-12 overflow-hidden">
        <HeroCarousel />

        <div className="hero-search">
          <HeroSearchCTA />
        </div>

        <div className="hero-moreways">
          <MoreWaysToBook />
        </div>
      </section>

      <TrustMarkers />

      <ReviewsCarousel />

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Popular health packages</h2>
          <Link href="/search?q=full+body+checkup" className="text-sm text-brand hover:underline">See all</Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {popularPackages.map((p) => (
            <PackageCard key={p.slug} pkg={p} />
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Pregnancy Care</h2>
          <Link href="/search?q=pregnancy" className="text-sm text-brand hover:underline">See all</Link>
        </div>
        <p className="text-sm text-gray-600 mb-4 max-w-2xl">
          Curated panels for every stage of pregnancy and family planning, from your first antenatal
          visit to fertility and PCOS workups.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {pregnancyPackages.map((p) => (
            <PackageCard key={p.slug} pkg={p} />
          ))}
        </div>

        {pregnancyTests.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-3">Popular pregnancy tests</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {pregnancyTests.map((t) => (
                <TestCard key={t.slug} test={t} />
              ))}
            </div>
          </>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Frequently booked individual tests</h2>
          <Link href="/search?q=test" className="text-sm text-brand hover:underline">Browse all tests</Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {popularTests.map((t) => (
            <TestCard key={t.slug} test={t} />
          ))}
        </div>
      </section>

      <section className="bg-white border rounded-xl p-6 md:p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Where we collect</h2>
        <p className="text-sm text-gray-600 mb-4">
          We currently collect across {SERVICE_AREAS.join(", ")} - and we'll gladly try to reach you
          elsewhere in Bangalore too, just ask at checkout or by phone.
        </p>
        <div className="flex flex-wrap gap-2">
          {SERVICE_AREAS.map((a) => (
            <span key={a} className="bg-brand-light text-brand-dark text-sm px-3 py-1 rounded-full">{a}</span>
          ))}
        </div>
      </section>

      <FAQSection />
    </div>
  );
}
