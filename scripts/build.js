const fs = require("fs");
const path = require("path");
const { smartTitleCase, slugify } = require("./text-utils");
const { fallbackDescription, cleanName } = require("./fallback-descriptions");
const curatedDescriptions = require("./test-descriptions");
const packagesContent = require("./packages-content");
const { estimateEta, DEFAULT_ETA } = require("./eta");
const { CURATED: CURATED_FRIENDLY_NAMES, normKey, friendlyNameFor } = require("./friendly-names");
const { PRICED_TEST_CODE_SET, testFaqs, packageFaqs, specialisedFaqs } = require("./product-faqs");
const { SEO: SPECIALISED_SEO } = require("./specialised-seo");

// Spreadsheet rows, plus tests the lab sells that are not in the spreadsheet yet.
const rawTests = [...require("./raw/tests-raw.json"), ...require("./extra-tests")];
// "Thyroid Panel (T3, T4, TSH)" (PKG-TP) removed at the business's request -
// each constituent test remains individually bookable.
const EXCLUDED_PACKAGE_CODES = new Set(["PKG-TP"]);
const rawPackages = require("./raw/packages-raw.json").filter((p) => !EXCLUDED_PACKAGE_CODES.has(p.Code));

// ---- category heuristics for individual tests (xlsx has no category column) ----
const CATEGORY_RULES = [
  [/thyroid|\btsh\b|\bt3\b|\bt4\b/i, "Thyroid"],
  [/glucose|sugar|hba1c|insulin|diabet/i, "Diabetes & Metabolic"],
  [/liver|bilirubin|\balt\b|\bast\b|\bsgot\b|\bsgpt\b|hepat/i, "Liver Health"],
  [/kidney|creatinine|\bbun\b|urea\b/i, "Kidney Health"],
  [/vitamin/i, "Vitamins & Nutrition"],
  [/cbc|haemoglobin|hemoglobin|platelet|anaemia|anemia|iron|ferritin|\besr\b/i, "Blood & Anaemia"],
  [/lipid|cholesterol|triglyceride|cardiac|troponin|\bck\b|heart/i, "Heart Health"],
  [/lh\b|fsh\b|estradiol|testosterone|prolactin|\bamh\b|progesterone|pcos|fertility|semen|hcg/i, "Hormones & Fertility"],
  [/hiv|hbsag|hepatitis|hcv|vdrl|sti\b|std\b|widal|torch|dengue|malaria|typhoid|culture/i, "Infection Screening"],
  [/\bana\b|rheumatoid|autoimmune|lupus|\bcrp\b/i, "Autoimmune & Inflammation"],
  [/allerg|\bige\b/i, "Allergy"],
  [/\bpsa\b|\bca 125\b|\bafp\b|tumour|tumor|\bcea\b|cancer/i, "Cancer Markers"],
  [/urine|urinalysis|urinary/i, "Urine Tests"],
  [/stool|faecal|fecal/i, "Stool Tests"],
  [/pregnan|antenatal|trimester|marker test/i, "Pregnancy Care"],
];

// A handful of tests need a category the general regex rules can't infer
// correctly (e.g. "glucose" would otherwise route the gestational-specific
// GTT into Diabetes & Metabolic instead of Pregnancy Care). Checked first.
const CATEGORY_OVERRIDES = {
  NIPT: "Pregnancy Care",
  "APOLIPOPROTEIN A1 (APOA1)": "Heart Health",
  "APOLIPOPROTEIN B (APOB)": "Heart Health",
  "NIPT WITH MICRODELETION": "Pregnancy Care",
  "ORAL GLUCOSE TOLERANCE TEST - GESTATIONAL": "Pregnancy Care",
  "GESTATIONAL GLUCOSE TOLERANCE (GTT) -3, PLASMA": "Pregnancy Care",
};

function categorize(name) {
  if (CATEGORY_OVERRIDES[name.toUpperCase()]) return CATEGORY_OVERRIDES[name.toUpperCase()];
  for (const [pattern, cat] of CATEGORY_RULES) {
    if (pattern.test(name)) return cat;
  }
  return "General Health";
}

// ---- build tests ----
const seenSlugs = new Map();
function uniqueSlug(base) {
  const count = seenSlugs.get(base) || 0;
  seenSlugs.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

const tests = rawTests.map((row) => {
  const rawName = String(row["Test Name"]).trim();
  const displayName = smartTitleCase(rawName);
  const description = curatedDescriptions[rawName] || fallbackDescription(displayName);
  const isCurated = Boolean(curatedDescriptions[rawName]);
  const friendly = friendlyNameFor(rawName, displayName);
  return {
    id: String(row.Code),
    // Slug stays derived from the original catalog name, NOT the friendly
    // name, so existing URLs, carts, bookings, and the alias table keep working.
    slug: uniqueSlug(slugify(displayName)),
    name: friendly.name,
    aliases: friendly.aliases,
    // The lab's own name, title-cased for display; rawName below stays exact.
    labName: displayName,
    rawName,
    code: String(row.Code),
    price: Number(row["MRP (Rs.)"]) || 0,
    mrp: null, // no separate discounted price exists in source data for individual tests
    type: row.Type,
    popular: row.Type === "Routine",
    curated: isCurated,
    category: categorize(rawName),
    sampleType: "Blood",
    description,
    eta: estimateEta(rawName).label,
  };
});

// lookup index for constituent-test matching
function normalize(s) {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const testsByNormalizedName = new Map();
tests.forEach((t) => {
  const key = normalize(t.rawName);
  if (!testsByNormalizedName.has(key)) testsByNormalizedName.set(key, t);
});

// Known naming mismatches between the PDF's constituent-test bullet text and
// the CMS catalog's exact test names (different spelling/word order/aliasing).
const MANUAL_ALIASES = {
  "fasting blood sugar": "glucose fasting fluoride plasma",
  "hba1c": "glycosylated hemoglobin",
  "hba1c gdm screening": "glycosylated hemoglobin",
  "post prandial blood sugar": "glucose post prandial plasma",
  "crp quantitative serum": "c reactive protein crp serum quantitative",
};

function tokenSet(s) {
  return new Set(normalize(s).split(" ").filter((w) => w.length > 2));
}

function findConstituentMatch(constituentName) {
  const norm = normalize(constituentName);
  if (testsByNormalizedName.has(norm)) return testsByNormalizedName.get(norm);
  if (MANUAL_ALIASES[norm] && testsByNormalizedName.has(MANUAL_ALIASES[norm])) {
    return testsByNormalizedName.get(MANUAL_ALIASES[norm]);
  }
  // fallback: substring containment either direction
  for (const t of tests) {
    const tn = normalize(t.rawName);
    if (tn.includes(norm) || norm.includes(tn)) return t;
  }
  // fallback: strong token-set overlap (handles reordered/re-spelled names)
  const wanted = tokenSet(constituentName);
  let best = null;
  let bestScore = 0;
  for (const t of tests) {
    const have = tokenSet(t.rawName);
    const intersection = [...wanted].filter((w) => have.has(w)).length;
    const score = intersection / Math.max(wanted.size, 1);
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return bestScore >= 0.7 ? best : null;
}

// ---- build packages ----
const unmatchedConstituents = [];
const packagesWithoutContent = [];

const packages = rawPackages.map((row) => {
  const name = String(row["Package Name"]).trim();
  const content = packagesContent[name];
  if (!content) packagesWithoutContent.push(name);

  const constituents = (content?.constituents || []).map((cName) => {
    const match = findConstituentMatch(cName);
    if (!match) unmatchedConstituents.push(`${name} -> ${cName}`);
    return { name: cName, slug: match?.slug || null, price: match?.price ?? null };
  });

  const price = Number(row["Package Price (Rs.)"]) || 0;
  const mrp = content?.mrp && content.mrp > price ? content.mrp : null;

  // A package's report is only complete once its slowest constituent test
  // is done, so its ETA is the widest range among everything it includes.
  const constituentEtas = (content?.constituents || []).map((cName) => estimateEta(cName));
  const packageEta = constituentEtas.length
    ? constituentEtas.reduce((slowest, e) => (e.weight > slowest.weight ? e : slowest), constituentEtas[0])
    : DEFAULT_ETA;

  return {
    id: row.Code,
    slug: slugify(name),
    name,
    code: row.Code,
    category: row.Category,
    price,
    mrp,
    tagline: content?.tagline || row.Category,
    description: content?.description || `A curated ${row.Category.toLowerCase()} test package. Full details coming soon - please call us for the complete list of included tests.`,
    constituents,
    needsContent: !content,
    eta: packageEta.label,
  };
});

// ---- SEO FAQs: the 65 priced tests named by the business, and all packages ----
for (const t of tests) {
  if (PRICED_TEST_CODE_SET.has(t.code.toUpperCase())) t.faqs = testFaqs(t);
}
for (const p of packages) {
  p.faqs = packageFaqs(p);
}

// ---- SEO / AEO content for the specialised tests (scripts/specialised-seo.js) ----
// Adds the search names, the "seo" block the test page renders, and richer
// answer-ready FAQs (replacing the generic ones where both exist).
const testBySlug = new Map(tests.map((t) => [t.slug, t]));
const unmatchedSeoSlugs = [];
for (const [slug, seo] of Object.entries(SPECIALISED_SEO)) {
  const t = testBySlug.get(slug);
  if (!t) {
    unmatchedSeoSlugs.push(slug);
    continue;
  }
  const have = new Set(t.aliases.map((a) => a.toLowerCase()));
  for (const term of seo.terms || []) if (!have.has(term.toLowerCase())) t.aliases.push(term);
  // The curated plain-language summary replaces the generic fallback description everywhere it shows.
  t.description = seo.what;
  t.seo = { specialties: seo.specialties, short: seo.short, what: seo.what, when: seo.when, ...(seo.prep ? { prep: seo.prep } : {}) };
  t.faqs = specialisedFaqs(t, seo);
}
const matchedPricedCodes = new Set(tests.filter((t) => t.faqs).map((t) => t.code.toUpperCase()));
const unmatchedPricedCodes = [...PRICED_TEST_CODE_SET].filter((c) => !matchedPricedCodes.has(c));

// ---- write output ----
const outDir = path.join(__dirname, "..", "data");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "tests.json"), JSON.stringify(tests, null, 2));
fs.writeFileSync(path.join(outDir, "packages.json"), JSON.stringify(packages, null, 2));

// Persisted mapping: original lab test name -> customer-friendly name +
// aliases (+ the slug(s) it resolves to). The lab-facing name stays the source
// of truth for orders; this is how to translate between the two.
const nameMap = {};
for (const t of tests) {
  const entry = (nameMap[t.rawName] ||= { name: t.name, labName: t.labName, aliases: t.aliases, slugs: [] });
  entry.slugs.push(t.slug);
}
fs.writeFileSync(path.join(outDir, "test-name-map.json"), JSON.stringify(nameMap, null, 2));

// ---- friendly-name validation ----
const rawNames = new Set(tests.map((t) => normKey(t.rawName)));
const unmatchedCurated = Object.keys(CURATED_FRIENDLY_NAMES).filter((k) => !rawNames.has(normKey(k)));
const namesSeen = new Map();
for (const t of tests) {
  if (!namesSeen.has(t.name)) namesSeen.set(t.name, new Set());
  namesSeen.get(t.name).add(t.rawName);
}
const nameCollisions = [...namesSeen].filter(([, raws]) => raws.size > 1);

// ---- report ----
const curatedCount = tests.filter((t) => t.curated).length;
console.log(`Tests: ${tests.length} total, ${curatedCount} curated, ${tests.length - curatedCount} auto-generated`);
console.log(`Packages: ${packages.length} total, ${packagesWithoutContent.length} missing PDF content`);
if (packagesWithoutContent.length) console.log("  Missing content for:", packagesWithoutContent);
console.log(`Constituent links: ${unmatchedConstituents.length} unmatched out of ${packages.reduce((s, p) => s + p.constituents.length, 0)}`);
if (unmatchedConstituents.length) console.log("  Unmatched:\n  " + unmatchedConstituents.join("\n  "));
const curatedKeys = new Set(Object.keys(CURATED_FRIENDLY_NAMES).map(normKey));
const friendlyCount = tests.filter((t) => curatedKeys.has(normKey(t.rawName))).length;
console.log(`Friendly names: ${friendlyCount} curated, ${tests.length - friendlyCount} mechanically cleaned`);
if (unmatchedCurated.length) console.log("  Curated names matching no test (check spelling):\n  " + unmatchedCurated.join("\n  "));
if (nameCollisions.length) {
  console.log("  Different lab tests share one friendly name (customers couldn't tell them apart):");
  nameCollisions.forEach(([n, raws]) => console.log(`  "${n}" <- ${[...raws].join(" | ")}`));
}
if (unmatchedSeoSlugs.length) console.log("  Specialised SEO entries matching no test (check the slug): " + unmatchedSeoSlugs.join(", "));
console.log(`Specialised SEO content: ${Object.keys(SPECIALISED_SEO).length - unmatchedSeoSlugs.length} tests`);
console.log(`FAQs: ${matchedPricedCodes.size}/${PRICED_TEST_CODE_SET.size} priced tests + ${packages.length} packages`);
if (unmatchedPricedCodes.length) console.log("  Priced test codes matching no test (check the code list):\n  " + unmatchedPricedCodes.join(", "));
