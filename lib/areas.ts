// The neighbourhoods we collect in, each with its own page at
// /blood-test-at-home/<slug> (local searches like "blood test at home in JP Nagar").
//
// Each page is written to say something specific to its area, not a template
// with the name swapped in (search engines mark that as thin content). Keep it
// that way: only add facts that are true, and extend an area's text with real
// local knowledge from the team (where phlebotomists go, which communities
// book often) whenever it is available. `name` must match SERVICE_AREAS.
export type Area = {
  slug: string;
  name: string;
  // Shown under the H1 and used for the meta description.
  summary: string;
  // The kind of layout it is, in a couple of paragraphs.
  about: string[];
  // Named parts of the area (phases, blocks, stages), shown as chips.
  parts: { label: string; items: string[] };
  // Practical, area-flavoured notes on booking a home collection here.
  goodToKnow: { title: string; text: string }[];
  // Packages and tests most relevant to the people who tend to book here.
  featuredPackages: string[];
  featuredTests: string[];
  faqs: { q: string; a: string }[];
};

export const AREAS: Area[] = [
  {
    slug: "jp-nagar",
    name: "JP Nagar",
    summary:
      "Skip the lab queue: a trained phlebotomist collects your blood sample at your door in JP Nagar, the sample is tested in NABL-accredited labs, and the report reaches you on WhatsApp. Pay only after collection.",
    about: [
      "J. P. Nagar is a large residential layout in south Bangalore, laid out in nine numbered phases, with a mix of apartment complexes and independent houses. With a lot of residents spread across so many phases, getting to a lab and waiting for a turn can take a big part of a morning.",
      "Our home collection is built for exactly that: choose a morning slot, share your location pin, and we come to you. It also suits families who would rather not take parents, a spouse or children to a lab one after another.",
    ],
    parts: { label: "Phases we collect across", items: ["1st Phase", "2nd Phase", "3rd Phase", "4th Phase", "5th Phase", "6th Phase", "7th Phase", "8th Phase", "9th Phase"] },
    goodToKnow: [
      {
        title: "Apartment communities",
        text: "Add your tower or block, flat number and any gate or security instructions in the notes at checkout, so the phlebotomist does not lose time at the gate.",
      },
      {
        title: "Tests for the whole family",
        text: "Each person is booked separately at checkout. If several family members need tests, call or WhatsApp us and we will help you plan the slots.",
      },
      {
        title: "Fasting tests",
        text: "For tests that need fasting, pick one of the early slots from 7:00 AM so most of your fast is overnight. See our guide to preparing for a fasting blood test.",
      },
    ],
    featuredPackages: ["full-body-checkup-essential", "diabetes-basic", "advanced-heart-checkup"],
    featuredTests: ["cbc-5-edta-whole-blood", "glycosylated-hemoglobin-hba1c", "thyroid-panel-tsh-serum"],
    faqs: [
      {
        q: "Do you collect samples from all phases of JP Nagar?",
        a: "We collect across JP Nagar. Every booking includes a pinned Google Maps location, so we can see exactly where to reach you. If an address is far from our usual route we will tell you when we confirm, rather than leave you waiting.",
      },
      {
        q: "How early can I get a blood test at home in JP Nagar?",
        a: "Collection slots start at 7:00 AM and run until 1:00 PM. Our phlebotomist arrives within 60 minutes of the start of the slot you choose.",
      },
      {
        q: "Is there a charge for home collection in JP Nagar?",
        a: "No separate charge: you pay the price shown for your tests, and you pay only after your sample has been collected.",
      },
    ],
  },
  {
    slug: "jayanagar",
    name: "Jayanagar",
    summary:
      "Blood tests at home in Jayanagar, without the trip to a lab: a phlebotomist visits at the time you choose, samples go to NABL-accredited labs, and your report arrives on WhatsApp. Pay only after collection.",
    about: [
      "Jayanagar is one of south Bangalore's older, well-established residential neighbourhoods, divided into numbered blocks (1st to 9th Block, along with T Block). Many households here have lived in the area for years and include parents and grandparents who may find a morning at a lab tiring.",
      "That is where home collection helps most. For routine monitoring (sugar, cholesterol, thyroid, kidney and liver checks) a visit at home removes the travel, the parking and the wait, and your family doctor gets the report the same way you do: on WhatsApp.",
    ],
    parts: { label: "Blocks we collect across", items: ["1st Block", "2nd Block", "3rd Block", "4th Block", "4th T Block", "5th Block", "6th Block", "7th Block", "8th Block", "9th Block"] },
    goodToKnow: [
      {
        title: "Routine checks for older family members",
        text: "Regular tests such as blood sugar, HbA1c, lipid profile, thyroid, kidney and liver function are popular for ongoing monitoring. Always follow your doctor's advice on which tests to take and how often.",
      },
      {
        title: "Morning slots work best",
        text: "Most routine tests are best done in the morning, and several need an overnight fast. Book a slot early in the window (from 7:00 AM) to keep the fast short.",
      },
      {
        title: "Send the prescription ahead",
        text: "If your doctor has written a list of tests, call or WhatsApp us and we can help you find each one, so you book exactly what was prescribed.",
      },
    ],
    featuredPackages: ["full-body-checkup-advanced", "diabetes-monitoring-panel", "liver-disease-panel"],
    featuredTests: ["glycosylated-hemoglobin-hba1c", "lipid-profile-serum", "kidney-function-test"],
    faqs: [
      {
        q: "Can I book a home blood test in Jayanagar for my parents?",
        a: "Yes. Enter their name, age and gender at checkout and your address as the collection address, and choose a slot. Tell the phlebotomist about any medicines they take, and check with their doctor first if they take diabetes medicines and need to fast.",
      },
      {
        q: "Which blocks of Jayanagar do you cover?",
        a: "We collect across Jayanagar. Share a Google Maps location pin when you book and we will confirm the visit; if anything about the address is difficult to reach we will let you know up front.",
      },
      {
        q: "How soon will I get my report in Jayanagar?",
        a: "Report times depend on the test and are shown on every test and package page; most routine blood tests are ready within hours, and some specialised ones take 12 to 24 hours. Reports are shared on WhatsApp.",
      },
    ],
  },
  {
    slug: "btm-layout",
    name: "BTM Layout",
    summary:
      "Early-morning blood tests at home in BTM Layout: pick a slot from 7:00 AM, a trained phlebotomist comes to you, and the report reaches your phone on WhatsApp. Pay only after your sample is collected.",
    about: [
      "BTM Layout (Byrasandra, Tavarekere and Madiwala) is a dense, busy part of south Bangalore, laid out in two stages, with lots of apartments and rented homes. Plenty of people living here are working professionals with tight mornings and little time to spare for a trip to a lab.",
      "Our collection windows start at 7:00 AM, which is early enough to fit a blood test in before work. You can book it from your phone, pay only after the sample is collected, and have the report delivered to WhatsApp so you can forward it to your doctor.",
    ],
    parts: { label: "Stages we collect across", items: ["1st Stage", "2nd Stage"] },
    goodToKnow: [
      {
        title: "Before work, not instead of it",
        text: "Choose a 7:00 to 8:00 AM slot and your sample is taken at home well before the working day starts. Remember to fast if your test needs it.",
      },
      {
        title: "Flats, PGs and shared homes",
        text: "Put the building name, floor and a landmark in the address, and share a Google Maps pin. A clear pin matters most in tightly packed lanes.",
      },
      {
        title: "Annual checkup in one visit",
        text: "A full body checkup package bundles blood sugar, cholesterol, liver, kidney, thyroid and more into one sample collection, instead of several lab visits.",
      },
    ],
    featuredPackages: ["full-body-checkup-mini", "full-body-checkup-pro", "vitamin-checkup"],
    featuredTests: ["cbc-5-edta-whole-blood", "vitamin-d-total-25-hydroxyvitamin-d-serum", "vitamin-b12-cyanocobalamine-serum"],
    faqs: [
      {
        q: "Can I get a blood test at home in BTM Layout before going to work?",
        a: "Yes. Collection slots begin at 7:00 AM, and the phlebotomist arrives within 60 minutes of the start of your slot. The sample takes only a few minutes.",
      },
      {
        q: "I live in a PG or shared flat in BTM. Can I still book?",
        a: "Yes. Enter your own name and details, add the building and floor to the address, and share your location pin. The result is sent to your own WhatsApp number.",
      },
      {
        q: "Do I need to be at home for the whole slot?",
        a: "Please be reachable throughout your slot, as the phlebotomist arrives within 60 minutes of its start. The collection itself takes only a few minutes.",
      },
    ],
  },
  {
    slug: "banashankari",
    name: "Banashankari",
    summary:
      "Home blood test collection in Banashankari: choose a morning slot, a phlebotomist visits you, samples are processed in NABL-accredited labs, and the report is sent on WhatsApp. Pay only after collection.",
    about: [
      "Banashankari is a long-established residential area of south Bangalore, spread over three stages (1st, 2nd and 3rd Stage) and named after the Banashankari temple at its heart. It has a settled, family character, with households of several generations living close to one another.",
      "For these families, home collection saves several separate trips to a lab. Parents, a spouse and grown-up children can each be booked for the tests that suit them, with the report sent on WhatsApp.",
    ],
    parts: { label: "Stages we collect across", items: ["1st Stage", "2nd Stage", "3rd Stage"] },
    goodToKnow: [
      {
        title: "Whole-family checkups",
        text: "Each person is booked separately at checkout, and each booking needs its own time slot. If you would like to arrange several people together, call or WhatsApp us and we will help.",
      },
      {
        title: "Tests for ongoing conditions",
        text: "If someone at home is already being monitored for diabetes or thyroid, ask the doctor how often to repeat tests, and book the matching ones (HbA1c, TSH) for a convenient time.",
      },
      {
        title: "Women's health and pregnancy tests",
        text: "We offer pregnancy-care panels such as antenatal packages and NIPT, collected at home, which saves expecting mothers a lab visit.",
      },
    ],
    featuredPackages: ["full-body-checkup-essential", "first-trimester-antenatal-panel", "diabetes-basic"],
    featuredTests: ["thyroid-panel-tsh-serum", "glycosylated-hemoglobin-hba1c", "cbc-5-edta-whole-blood"],
    faqs: [
      {
        q: "Can I book tests for several family members in Banashankari?",
        a: "Yes. Make a separate booking for each person; each booking takes its own time slot. If you want to arrange a family together, call or WhatsApp us and we will help you plan it.",
      },
      {
        q: "Is home collection available for pregnancy tests in Banashankari?",
        a: "Yes. Pregnancy blood tests such as the Double Marker test and NIPT, as well as antenatal packages, can be collected at home. Your doctor decides which tests you need and when.",
      },
      {
        q: "Which stages of Banashankari are covered?",
        a: "We collect across Banashankari. Share your location pin at checkout and we will confirm; if an address is outside our usual route, we will tell you before the visit.",
      },
    ],
  },
  {
    slug: "kanakpura-road",
    name: "Kanakpura Road",
    summary:
      "Blood tests at home along Kanakpura Road: skip the long drive to a lab. A phlebotomist visits at your slot, samples go to NABL-accredited labs, and your report arrives on WhatsApp. Pay only after collection.",
    about: [
      "Kanakpura Road runs south out of the city and has become a growing residential corridor, with many newer apartment communities along its length. Because homes here are more spread out, a trip to a lab and back can mean a long drive in traffic.",
      "Home collection removes that trip. You tell us where you are with a Google Maps location pin, which is required at checkout, and we plan the visit around it.",
    ],
    parts: { label: "How to book from along the road", items: ["Share your community name", "Add a nearby landmark", "Send a Google Maps pin"] },
    goodToKnow: [
      {
        title: "A precise location pin",
        text: "Addresses along a long road can be hard to find. The pinned location you share at checkout lets the phlebotomist navigate straight to your gate.",
      },
      {
        title: "Gated communities",
        text: "Add the community name, tower or villa number and gate instructions. If visitors need a prior entry, tell the security desk to expect the phlebotomist.",
      },
      {
        title: "Plan around travel time",
        text: "Our phlebotomist arrives within 60 minutes of the start of your slot. Choose a slot with a little room if you are not at home all morning.",
      },
    ],
    featuredPackages: ["full-body-checkup-mini", "full-body-checkup-advanced", "advanced-heart-checkup"],
    featuredTests: ["lipid-profile-serum", "glycosylated-hemoglobin-hba1c", "kidney-function-test"],
    faqs: [
      {
        q: "Do you collect blood samples along Kanakpura Road?",
        a: "Yes, Kanakpura Road is one of the areas we serve. Because it is a long road, always share a Google Maps pin when you book, so we can confirm we can reach you and when.",
      },
      {
        q: "What if I live further out along the road?",
        a: "Tell us your community name and drop a location pin. We cover Kanakpura Road and will try to reach you elsewhere in Bangalore too; we will confirm before the visit so you are never left waiting.",
      },
      {
        q: "Do I pay anything before the visit?",
        a: "No. You pay only after the sample has been collected.",
      },
    ],
  },
];

export function getAreaBySlug(slug: string): Area | undefined {
  return AREAS.find((a) => a.slug === slug);
}
