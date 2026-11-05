// Plain-language guides at /guides/<slug>, written to answer the questions people
// actually search before booking a blood test.
//
// Keep them factual and general: they explain, they do not diagnose or promise
// results, and every one tells the reader to follow their own doctor's advice.
// Prices are never typed in here - they come from the catalog on the page, so
// they cannot go out of date (see the cost guide's `costTable`).
export type GuideSection = { heading: string; paragraphs?: string[]; bullets?: string[] };

export type Guide = {
  slug: string;
  title: string;
  // Meta description and the card text on /guides.
  description: string;
  updated: string; // ISO date (YYYY-MM-DD) of the last review; shown to readers
  intro: string;
  sections: GuideSection[];
  faqs: { q: string; a: string }[];
  relatedTests: string[];
  relatedPackages: string[];
  // The cost guide shows a live table of the Full Body Checkup packages.
  costTable?: boolean;
};

export const GUIDES: Guide[] = [
  {
    slug: "how-to-prepare-for-a-fasting-blood-test",
    title: "How to prepare for a fasting blood test",
    description: "How long to fast, what you can drink, whether to take your medicines, and which blood tests need fasting - a plain guide before a home blood test.",
    updated: "2026-11-05",
    intro:
      "A fasting blood test means you have nothing to eat or drink, except plain water, for a set time before your sample is taken. Food and drink change some results, especially blood sugar and blood fats, so fasting helps make the result a fair picture of your usual levels. This guide is general information: always follow the instructions your doctor gives you or the ones shown for your test.",
    sections: [
      {
        heading: "How long should you fast?",
        paragraphs: [
          "For most fasting tests, labs ask for about 8 to 12 hours without food. Your doctor may give you a different time for your situation, so follow that if it differs.",
          "The easiest way is to fast overnight and book an early slot, so most of the fast is spent asleep. Our home collection slots run from 7:00 AM to 1:00 PM, and a morning slot keeps the fast short.",
        ],
      },
      {
        heading: "What you can and cannot have",
        bullets: [
          "Plain water is fine, and it helps: being well hydrated can make it easier to take the sample.",
          "Avoid tea, coffee, milk, juice, soft drinks and anything with sugar until after your sample.",
          "Avoid chewing gum and sweets, which can also affect a sugar reading.",
          "Avoid alcohol for at least 24 hours before the test, and if you can, skip smoking on the morning of the test.",
        ],
      },
      {
        heading: "What about your medicines?",
        paragraphs: [
          "Do not stop or skip a medicine on your own. Ask your doctor whether you should take your usual medicines before the test.",
          "This matters especially if you take insulin or tablets for diabetes: taking them without eating can cause your blood sugar to drop too low, so ask your doctor how to handle the morning of your test. If you are pregnant, also ask your doctor how long you can safely fast.",
        ],
      },
      {
        heading: "Which tests usually need fasting?",
        bullets: [
          "Fasting blood sugar (FBS) - needs a fast.",
          "Lipid profile (cholesterol) - often done fasting; a non-fasting version is also available, and your doctor will tell you which one they want.",
          "Fasting insulin - needs a fast.",
          "Tests that usually do not need fasting include HbA1c, thyroid tests and Vitamin D, but check with your doctor or the test's instructions if you are unsure.",
          "A full body checkup package usually includes tests that need fasting, so plan to fast for the whole package.",
        ],
      },
      {
        heading: "The day before and the morning of",
        bullets: [
          "Have a light, early dinner, and avoid alcohol.",
          "Skip heavy exercise on the morning of the test.",
          "Keep drinking water, and keep your prescription handy.",
          "Wear a top with sleeves that roll up easily.",
          "If you ate or drank something by mistake, tell the phlebotomist. Some results can be affected, and your doctor may suggest repeating the test.",
        ],
      },
      {
        heading: "What happens at the home visit",
        paragraphs: [
          "Book a slot online, and a trained phlebotomist arrives within 60 minutes of the start of your slot. Collecting the sample takes only a few minutes. You pay only after the sample has been collected, and your report is sent to you on WhatsApp. Report times are shown on every test page.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I drink water before a fasting blood test?",
        a: "Yes. Plain water is allowed and usually encouraged. Avoid tea, coffee, milk, juice and sugary drinks until your sample has been taken.",
      },
      {
        q: "Can I have black coffee or tea before a fasting blood test?",
        a: "It is best to avoid them, even without sugar or milk. Stick to plain water, unless your doctor has told you otherwise.",
      },
      {
        q: "Do I need to fast for an HbA1c test?",
        a: "HbA1c reflects your average blood sugar over the past few months, so it usually does not need fasting. Check with your doctor if they have asked for it along with other fasting tests.",
      },
      {
        q: "Should I take my regular medicines before a fasting blood test?",
        a: "Ask your doctor. Do not stop or skip medicines on your own, particularly diabetes medicines or insulin, which can lower blood sugar if taken without food.",
      },
    ],
    relatedTests: ["glucose-fasting-fluoride-plasma", "lipid-profile-serum", "lipid-profile-non-fasting-serum", "glycosylated-hemoglobin-hba1c"],
    relatedPackages: ["full-body-checkup-mini", "diabetes-basic"],
  },
  {
    slug: "which-health-tests-after-40",
    title: "Which health tests should you consider after 40?",
    description: "The blood tests commonly discussed with a doctor for adults in their 40s and beyond - sugar, cholesterol, thyroid, liver, kidney, vitamins and more - explained simply.",
    updated: "2026-11-05",
    intro:
      "There is no single list of tests that is right for everyone. What you need depends on your age, sex, family history, weight, medicines and any symptoms, and your doctor is the right person to decide. This guide explains the checks that are commonly discussed with adults in their 40s and beyond, so you can have a more useful conversation at your next visit. It is general information, not medical advice.",
    sections: [
      {
        heading: "Blood sugar: fasting sugar and HbA1c",
        paragraphs: [
          "Type 2 diabetes becomes more common with age and can have no obvious early symptoms. Fasting blood sugar shows your level at one moment, while HbA1c shows your average over roughly the past three months. Doctors often look at both.",
        ],
      },
      {
        heading: "Cholesterol and heart health",
        paragraphs: [
          "A lipid profile measures the fats in your blood, including total, LDL and HDL cholesterol and triglycerides. High levels can raise the risk of heart disease over time.",
          "If heart disease runs in your family, or your doctor wants a closer look, they may add further markers such as ApoB, Lipoprotein(a) or hs-CRP. Ask your doctor whether these would help in your case.",
        ],
      },
      {
        heading: "Liver and kidney function",
        paragraphs: [
          "Liver function (LFT) and kidney function (KFT) tests show how well these organs are working. They are also useful if you take any medicine for a long time, because some can affect the liver or kidneys.",
        ],
      },
      {
        heading: "Thyroid",
        paragraphs: [
          "A thyroid test (TSH, often with T3 and T4) checks whether your thyroid is working normally. Thyroid problems are common and can cause tiredness, weight change and other symptoms that are easy to put down to something else.",
        ],
      },
      {
        heading: "Blood count, iron, Vitamin D and B12",
        bullets: [
          "A complete blood count (CBC) checks for anaemia and signs of infection.",
          "Iron tests help find the cause of anaemia, which is more common in women.",
          "Low Vitamin D and low Vitamin B12 are common. A test shows whether you actually need a supplement, so it is better to test than to guess.",
        ],
      },
      {
        heading: "Urine routine",
        paragraphs: ["A simple urine test can give early clues about the kidneys, urinary infections and blood sugar."],
      },
      {
        heading: "Checks specific to men and women",
        bullets: [
          "Men: your doctor may discuss a PSA test, which relates to the prostate. Whether and when to have it is a decision to make with your doctor.",
          "Women: a Pap smear, with or without an HPV test, is used for cervical screening, and your doctor will advise how often.",
          "Scans such as mammograms are done at imaging centres, not through home sample collection, so ask your doctor about those separately.",
        ],
      },
      {
        heading: "How often, and when not to wait",
        paragraphs: [
          "Many doctors suggest a general review once a year for adults in their 40s and beyond, and more often if you already have a condition. Ask yours what suits you.",
          "Blood tests are not a substitute for care when you are unwell. If you have chest pain, sudden weakness, difficulty breathing or any symptom that worries you, see a doctor or go to an emergency department rather than waiting for a test.",
        ],
      },
      {
        heading: "One visit, many tests",
        paragraphs: [
          "A full body checkup package bundles many of these tests into a single home collection, which is usually simpler and better value than booking each one separately. You can compare them on our packages page.",
        ],
      },
    ],
    faqs: [
      {
        q: "What blood tests are commonly done after 40?",
        a: "Commonly discussed ones are blood sugar (fasting and HbA1c), a lipid profile, liver and kidney function, thyroid, a complete blood count, Vitamin D and B12, and a urine test. Your doctor decides which are right for you.",
      },
      {
        q: "How often should I get a health checkup after 40?",
        a: "Many doctors suggest a general review once a year, and more often if you have a condition such as diabetes or high blood pressure. Ask your own doctor.",
      },
      {
        q: "Do I need to fast for a full body checkup?",
        a: "Usually yes, because it often includes fasting blood sugar and a lipid profile. Fast for about 8 to 12 hours, drink plain water, and ask your doctor about any medicines.",
      },
      {
        q: "Can I get these tests done at home?",
        a: "Yes. A trained phlebotomist collects the sample at your home, it is tested in an NABL-accredited lab, and your report is sent on WhatsApp. You pay only after the sample has been collected.",
      },
    ],
    relatedTests: ["glycosylated-hemoglobin-hba1c", "lipid-profile-serum", "thyroid-panel-tsh-serum", "kidney-function-test"],
    relatedPackages: ["full-body-checkup-essential", "full-body-checkup-advanced", "advanced-heart-checkup"],
  },
  {
    slug: "full-body-checkup-cost-in-bangalore",
    title: "How much does a full body checkup cost in Bangalore?",
    description: "What a full body checkup costs with home collection in Bangalore, what changes the price, and what to ask before you book any health checkup.",
    updated: "2026-11-05",
    intro:
      "The price of a full body checkup depends mostly on how many tests it includes and how specialised they are. Below are our Full Body Checkup packages with current prices, and a short guide to comparing any checkup fairly, whoever you book it with.",
    costTable: true,
    sections: [
      {
        heading: "What changes the price of a checkup",
        bullets: [
          "The number of tests: a basic screen covers the core markers, while advanced packages add more.",
          "How specialised the tests are: hormones, vitamins and heart-risk markers cost more than routine blood counts.",
          "Whether the package is for men or women, since some include sex-specific tests.",
          "Whether home collection, taxes or a doctor consultation are included or charged separately.",
        ],
      },
      {
        heading: "Questions to ask before booking any checkup",
        bullets: [
          "Exactly which tests are included? Ask for the full list.",
          "Is the lab NABL-accredited?",
          "Is there any charge for home collection?",
          "When will I get my report, and how?",
          "Do I need to fast, and for how long?",
        ],
      },
      {
        heading: "How we handle these",
        paragraphs: [
          "Every package lists its tests on its page. Samples are tested in NABL-accredited labs, and our collection is free of any extra home-visit charge. You pay only after your sample has been collected, and the report is shared on WhatsApp. Most checkups include fasting tests, so plan on an overnight fast; our fasting guide explains how.",
        ],
      },
      {
        heading: "Choosing between packages",
        paragraphs: [
          "If you are under 40 with no health concerns, a basic or essential package is a sensible start. Advanced and Pro packages add more organ and hormone tests and suit people with a family history, symptoms or a doctor's recommendation. Your doctor can tell you which tests are worth having.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is there an extra charge for home collection?",
        a: "No. The price shown for a package covers the home collection, and you pay only after your sample has been collected.",
      },
      {
        q: "Do I need to fast for a full body checkup?",
        a: "Usually yes. Packages normally include fasting blood sugar and a lipid profile, so fast for about 8 to 12 hours, drinking only plain water.",
      },
      {
        q: "How long does a full body checkup report take?",
        a: "The report is ready once the slowest test in the package is done. Full body checkups are typically ready in 12 to 24 hours, and the time is shown on each package page.",
      },
      {
        q: "Which full body checkup is right for me?",
        a: "It depends on your age, health history and what your doctor advises. Compare the included tests on each package page, and ask your doctor if you are unsure.",
      },
    ],
    relatedTests: ["glucose-fasting-fluoride-plasma", "lipid-profile-serum", "thyroid-panel-tsh-serum"],
    relatedPackages: ["full-body-checkup-mini", "full-body-checkup-essential", "full-body-checkup-advanced"],
  },
];

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
