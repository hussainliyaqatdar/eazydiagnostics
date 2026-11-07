// Generates 5 SEO-oriented FAQs for a test or package product page, covering
// the search intents the business asked for: "<name> near me", "<name> price
// in Bangalore", "<name> home collection", "<name> meaning", and "<name> at
// NABL accredited labs". Answers are built from real, already-vetted facts on
// the item (price, eta, description) plus the site's actual service area and
// lab partnership - nothing about a specific test/package is invented here.
//
// Scope: every package gets FAQs; for individual tests, only the ones the
// business named (the 65 tests in the CC SPRF price list) do, so this doesn't
// silently spam 593 near-duplicate FAQ blocks across the whole catalog.

const SERVICE_AREAS_TEXT = "JP Nagar, Jayanagar, BTM Layout, Banashankari, and Kanakpura Road";
const LAB_PARTNER_TEXT = "NABL-accredited labs run by Agilus (SRL) Diagnostics";

// Test codes from the business's CC SPRF price list (Agilus catalog codes,
// matched 1:1 against data/tests.json's own `code` field - see the session
// notes for how these were extracted). Matching by code rather than by slug
// so this keeps working even if a test's slug or friendly name changes later.
const PRICED_TEST_CODES = [
  "8823", "5100", "3895", "1347H", "3109", "1705R", "1100", "1345H", "1527H", "1526H",
  "5814B", "1079H", "3121", "4836H", "5111", "5110G", "3350HD", "1535N", "1320H", "1285CS",
  "1268", "1568HD", "1569B", "3155", "3174", "3228", "3234", "3180", "3184", "2446R",
  "5112DR", "3834", "2470R", "9916R", "3344", "3192", "1342", "2021", "1209AD", "1388",
  "3198", "1657B", "2434", "5160", "3206", "3546", "3892", "1275P", "1328", "3533HD",
  "1500", "2361", "3244", "1499", "TPC", "9901M", "9911M", "9912", "1245E", "3346HD",
  "3250", "1310H", "5200U", "3020", "9076",
];
const PRICED_TEST_CODE_SET = new Set(PRICED_TEST_CODES.map((c) => c.toUpperCase()));

// Keep in step with COLLECTION_CHARGE / FREE_COLLECTION_MIN in lib/booking-totals.ts.
const COLLECTION_NOTE = "Home collection is free on orders of Rs. 1,000 or more; a flat Rs. 250 collection charge applies to smaller orders.";

function money(n) {
  return `Rs. ${n.toLocaleString("en-IN")}`;
}

function priceLine(price, mrp) {
  return mrp != null && mrp > price ? `${money(price)} (down from ${money(mrp)} MRP)` : money(price);
}

function testFaqs(test) {
  const { name, price, mrp, eta, description } = test;
  return [
    {
      q: `Can I get a ${name} test near me in Bangalore?`,
      a: `Yes - ${name} is available for home sample collection anywhere we cover in Bangalore, including ${SERVICE_AREAS_TEXT}. Instead of visiting a lab, book online and a phlebotomist comes to you.`,
    },
    {
      q: `What is the ${name} test price in Bangalore?`,
      a: `${name} costs ${priceLine(price, mrp)} with us, with no advance payment - you only pay after your sample has been collected. ${COLLECTION_NOTE}`,
    },
    {
      q: `Is home collection available for ${name}?`,
      a: `Yes. A trained phlebotomist visits your home to collect the sample for ${name}, using a fully equipped, professional collection kit. Reports are typically ready in ${eta} and shared via WhatsApp.`,
    },
    {
      q: `What does the ${name} test mean?`,
      a: description,
    },
    {
      q: `Is ${name} tested at an NABL-accredited lab?`,
      a: `Yes. Every ${name} sample we collect is processed at ${LAB_PARTNER_TEXT}, our authorised lab partner - the same labs used for walk-in patients.`,
    },
  ];
}

function packageFaqs(pkg) {
  const { name, price, mrp, eta, description, constituents } = pkg;
  const testCount = constituents.length;
  const testsPhrase = testCount > 0 ? `all ${testCount} test${testCount === 1 ? "" : "s"} included` : "everything included";
  // "Everything" and "1 test" both take a singular verb; only 2+ tests take a plural one.
  const testsAreVerb = testCount === 1 || testCount === 0 ? "is" : "are";
  return [
    {
      q: `Can I book the ${name} package near me in Bangalore?`,
      a: `Yes - the ${name} package is available for home sample collection across Bangalore, including ${SERVICE_AREAS_TEXT}. No need to visit a lab; book online and we'll send a phlebotomist to you.`,
    },
    {
      q: `What is the price of the ${name} package in Bangalore?`,
      a: `The ${name} package costs ${priceLine(price, mrp)} for ${testsPhrase}, with no advance payment. ${COLLECTION_NOTE}`,
    },
    {
      q: `Is home collection available for the ${name} package?`,
      a: `Yes. ${testsPhrase[0].toUpperCase() + testsPhrase.slice(1)} in the ${name} package ${testsAreVerb} collected in a single home visit by a trained phlebotomist. Reports are typically ready in ${eta}.`,
    },
    {
      q: `What does the ${name} package include?`,
      a: description,
    },
    {
      q: `Is the ${name} package tested at NABL-accredited labs?`,
      a: `Yes. Every test in the ${name} package is processed at ${LAB_PARTNER_TEXT}, our authorised lab partner.`,
    },
  ];
}

// Answer-ready FAQs for the specialised tests in scripts/specialised-seo.js.
// Short, direct answers (what AI assistants quote) built from the curated facts
// plus the catalog's real price, report time and the site's actual service.
function specialisedFaqs(test, seo) {
  const { name, price, mrp, eta } = test;
  const { short, what, when, prep, extraFaq } = seo;
  const whenText = when.length === 1 ? when[0] : when.slice(0, -1).join("; ") + "; and " + when[when.length - 1];
  const faqs = [
    { q: `What is the ${short}?`, a: what },
    { q: `Who needs the ${short} and when is it done?`, a: `Doctors commonly order it for: ${whenText}.` },
    {
      q: `Can I get the ${short} done at home in Bangalore?`,
      a: `Yes. Book online and a trained phlebotomist collects the sample at your home in ${SERVICE_AREAS_TEXT}. The sample is processed at the ${LAB_PARTNER_TEXT}, and the report is sent to you on WhatsApp, typically within ${eta}. You pay only after the sample is collected.`,
    },
    {
      q: `What is the price of the ${short} in Bangalore?`,
      a: `${name} costs ${priceLine(price, mrp)} with us, with no advance payment. ${COLLECTION_NOTE}`,
    },
    {
      q: `How should I prepare for the ${short}?`,
      a: prep ? prep : `No special preparation is generally needed unless your doctor says otherwise. Share any medicines you take, and our team confirms anything specific when you book.`,
    },
    {
      q: `How long does the ${short} report take?`,
      a: `Reports are typically ready in ${eta} after the sample reaches the lab, and are shared on WhatsApp.`,
    },
  ];
  if (extraFaq) faqs.push(extraFaq);
  return faqs;
}

module.exports = { PRICED_TEST_CODE_SET, testFaqs, packageFaqs, specialisedFaqs };
