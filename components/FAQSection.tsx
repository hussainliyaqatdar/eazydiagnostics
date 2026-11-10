import { BUSINESS_NAME } from "@/lib/site-config";
import { getReferral } from "@/lib/brand-server";
import { PAY_AT_CLINIC, brandText, mentionsPartnerBrand } from "@/lib/brand";

const FAQS = [
  {
    q: "Can I get an NIPT test done at home in Bangalore?",
    a: `Yes. NIPT (Non-Invasive Prenatal Testing) is available for home collection anywhere we cover in Bangalore - our phlebotomist visits you, so there's no need to search for "NIPT test near me" and travel to a lab. Results are shared via WhatsApp once ready.`,
  },
  {
    q: "Where can I book a Double Marker test near me?",
    a: `You can book it right here for home collection - no need to visit a center. The Double Marker test is a routine week 11-13 pregnancy screen, and ${BUSINESS_NAME} sends a phlebotomist to your doorstep across Bangalore.`,
  },
  {
    q: "Is a pregnancy blood test at home as reliable as visiting a lab?",
    a: `Yes. Every sample we collect at home is processed in the same NABL-accredited labs run by Agilus (SRL) Diagnostics that walk-in patients use - the only difference is convenience. This applies to routine pregnancy blood tests as well as specialised ones like NIPT.`,
  },
  {
    q: "What pregnancy tests are recommended in each trimester, and can they be done at home?",
    a: "Yes - we offer trimester-wise home collection: First Trimester panels (week 12) including Double Marker, Second/Third Trimester panels (week 28) for gestational diabetes and anaemia, plus NIPT, Quadruple Marker, TORCH, and the Glucose Tolerance Test as needed through your pregnancy.",
  },
  {
    q: "Can my husband book a home blood test for his pregnant wife?",
    a: `Absolutely. Many of our bookings are made by husbands or family members on behalf of a pregnant wife or daughter-in-law - just enter her details and address at checkout, and we'll take care of the rest with a comfortable, home sample collection.`,
  },
  {
    q: "Do you offer the Glucose Tolerance Test (GTT) for gestational diabetes at home?",
    a: "Yes. Our Pregnancy Diabetes Test (Gestational GTT) is available for home collection, typically recommended between weeks 24-28 to screen for gestational diabetes.",
  },
  {
    q: "Is home sample collection safe for pregnant women?",
    a: "Yes. Our phlebotomists are trained professionals who follow standard hygiene and safety protocols for every visit, using a fully equipped, professional collection kit - the same standards you'd expect at a lab, brought to your home for your comfort and safety.",
  },
  {
    q: "How much do NIPT and Double Marker tests cost in Bangalore?",
    a: "Pricing varies by test - you can see the exact price for NIPT, Double Marker, Quadruple Marker, and every other pregnancy test on its product page before you book, with no hidden charges and no advance payment.",
  },
  {
    q: "Are you an authorised home-collection partner of Agilus (SRL) Diagnostics?",
    a: `Yes. ${BUSINESS_NAME} is an authorised partner of Agilus (SRL) Diagnostics, providing home sample collection, and works in partnership with Fortis Hospitals. Every sample we collect is processed in Agilus' NABL-accredited labs.`,
  },
  {
    q: "How do I find SRL Diagnostics near me?",
    a: `You don't need to search for "SRL Diagnostics near me" and travel to a centre - as ${BUSINESS_NAME}, an authorised partner of Agilus (SRL) Diagnostics, we send a phlebotomist to collect your sample at home, anywhere we cover in Bangalore.`,
  },
  {
    q: "How do I find Agilus Diagnostics near me for a home visit?",
    a: `You've found it - ${BUSINESS_NAME} is an authorised home-collection partner of Agilus (SRL) Diagnostics in Bangalore. Just book online and a phlebotomist visits your address; there's no need to locate a physical centre nearby.`,
  },
  {
    q: "Do you offer SRL Diagnostics home collection in Bangalore?",
    a: `Yes. SRL Diagnostics now operates as Agilus (SRL) Diagnostics, and ${BUSINESS_NAME} is an authorised partner that does home collection - book any test or package here and a trained phlebotomist comes to you, with your sample processed at Agilus' NABL-accredited lab.`,
  },
  {
    q: "What's the process for Agilus Diagnostics home collection?",
    a: "Search for your test or package, add it to your cart, and pick a time slot that works for you. A trained phlebotomist visits your home to collect the sample, which is then processed at Agilus (SRL) Diagnostics' NABL-accredited lab - with reports typically ready the same day.",
  },
  {
    q: "Which areas in Bangalore do you cover for home sample collection?",
    a: "We currently collect across JP Nagar, Jayanagar, BTM Layout, Banashankari, and Kanakpura Road - and we'll gladly try to reach other parts of Bangalore too, just ask at checkout or by phone.",
  },
  {
    q: "Do I need to pay in advance to book a test?",
    a: "No. You only pay after your sample has been collected - there's no advance payment required to confirm a booking.",
  },
];

export default async function FAQSection() {
  // A clinic's version drops the questions about the lab partner's brand and
  // rewrites the rest; anyone who came from a doctor's link is told to pay at the
  // clinic front desk instead of after collection.
  const { brand, payAtClinic: referred } = await getReferral();
  const FAQS_SHOWN = FAQS.filter((f) => !brand || !mentionsPartnerBrand(f.q))
    .map((f) =>
      referred && f.q === "Do I need to pay in advance to book a test?"
        ? { q: "How do I pay for my test?", a: `${PAY_AT_CLINIC}. There is nothing to pay online when you book.` }
        : { q: brandText(f.q, brand), a: brandText(f.a, brand) }
    );
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS_SHOWN.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section className="bg-white border rounded-xl p-6 md:p-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h2 className="text-xl font-bold text-gray-900 mb-4">Frequently asked questions</h2>
      <div className="flex flex-col divide-y">
        {FAQS_SHOWN.map((f) => (
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
