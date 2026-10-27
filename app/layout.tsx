import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import { CartProvider } from "@/lib/cart-context";
import { UIProvider } from "@/lib/ui-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchModal from "@/components/SearchModal";
import CartDrawer from "@/components/CartDrawer";
import ReferralCapture from "@/components/ReferralCapture";
import { getFeaturedCoupon } from "@/lib/coupon-config";
import { BUSINESS_NAME, PARTNER_NAME, SITE_URL, BOOKING_PHONE, SERVICE_AREAS, GMB_RATING, GMB_PROFILE_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `Pregnancy Test & NIPT At Home in Bangalore | ${BUSINESS_NAME}`,
    template: `%s | ${BUSINESS_NAME}`,
  },
  description: `Book NIPT, Double Marker & pregnancy blood tests for home collection in Bangalore - plus full body checkups and routine blood work. NABL-accredited testing, and an authorised partner of Agilus (SRL) Diagnostics. Pay only after your sample is collected.`,
  keywords: [
    "pregnancy test near me",
    "pregnancy test at home",
    "pregnancy tests home collection",
    "pregnancy blood test at home Bangalore",
    "NIPT test near me",
    "NIPT test at home",
    "NIPT test home collection Bangalore",
    "Double Marker test near me",
    "Double Marker test at home",
    "Quadruple Marker test at home",
    "Triple Marker test at home Bangalore",
    "TORCH test at home",
    "prenatal blood test at home Bangalore",
    "antenatal test home collection",
    "gestational diabetes test at home",
    "glucose tolerance test at home Bangalore",
    "book pregnancy test for wife",
    "home blood test Bangalore",
    "Eazy Diagnostics",
    "Eazy Diagnostics Bangalore",
    "Agilus Diagnostics",
    "SRL Diagnostics",
    "Agilus Diagnostics near me",
    "SRL Diagnostics Bangalore",
    "full body checkup at home Bangalore",
  ],
  openGraph: {
    type: "website",
    siteName: BUSINESS_NAME,
    title: `${BUSINESS_NAME} - Pregnancy Tests & Blood Test Collection At Home in Bangalore`,
    description: `Book NIPT, Double Marker, Quadruple Marker and other pregnancy tests for home collection - plus full body checkups and routine blood work - across Bangalore. An authorised partner of Agilus (SRL) Diagnostics, in partnership with Fortis Hospitals. Pay only after your sample is collected.`,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The one coupon we advertise publicly; other codes stay server-side.
  const featuredCoupon = getFeaturedCoupon();
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: BUSINESS_NAME,
    telephone: BOOKING_PHONE,
    areaServed: SERVICE_AREAS.map((a) => ({ "@type": "Place", name: `${a}, Bangalore` })),
    url: SITE_URL,
    medicalSpecialty: "Pathology",
    address: {
      "@type": "PostalAddress",
      streetAddress: "8, 19th Cross, 20th Main Rd, near Mohammedi Masjid",
      addressLocality: "Bengaluru",
      addressRegion: "Karnataka",
      postalCode: "560078",
      addressCountry: "IN",
    },
    geo: { "@type": "GeoCoordinates", latitude: 12.9026322, longitude: 77.5882842 },
    aggregateRating: { "@type": "AggregateRating", ratingValue: GMB_RATING.value, reviewCount: GMB_RATING.count },
    sameAs: [GMB_PROFILE_URL],
    parentOrganization: [{ "@type": "MedicalOrganization", name: PARTNER_NAME, alternateName: ["Agilus Diagnostics", "SRL Diagnostics"] }, { "@type": "Hospital", name: "Fortis Hospitals" }],
  };

  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "ypv0iaj9lx");`,
          }}
        />
        <CartProvider>
          <UIProvider>
            <Header featuredCoupon={featuredCoupon} />
            <main className="max-w-6xl mx-auto px-4 py-8 min-h-[70vh]">{children}</main>
            <Footer />
            <SearchModal />
            <CartDrawer featuredCoupon={featuredCoupon} />
            <ReferralCapture />
          </UIProvider>
        </CartProvider>
      </body>
    </html>
  );
}
