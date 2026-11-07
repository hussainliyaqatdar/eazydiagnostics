import { allTests } from "./catalog";
import type { TestItem } from "./types";

// The doctor specialties our specialised tests are grouped under. Each one gets
// a landing page (/specialised-tests/<slug>) aimed at what patients and doctors
// search for ("NIPT test in Bangalore", "cardiology blood tests at home"). A
// test lists its specialties in its `seo.specialties` (scripts/specialised-seo.js).
export type Specialty = {
  slug: string;
  name: string; // short label, e.g. "Cardiology"
  heading: string; // page H1
  description: string; // meta description + intro
  doctors: string; // who orders these tests, for the intro
};

export const SPECIALTIES: Specialty[] = [
  {
    slug: "obgyn-pregnancy",
    name: "OB-GYN & Pregnancy",
    heading: "Pregnancy, fertility and OB-GYN tests at home in Bangalore",
    description:
      "NIPT, Double Marker, Quadruple Marker, TORCH, AMH, ferritin and other specialised pregnancy and fertility tests with home sample collection in Bangalore, processed at Agilus (SRL) Diagnostics labs.",
    doctors: "obstetricians, gynaecologists, fetal-medicine and fertility specialists",
  },
  {
    slug: "cardiology",
    name: "Cardiology",
    heading: "Specialised heart and cardiology blood tests at home in Bangalore",
    description:
      "Lipoprotein(a), ApoA1, ApoB, NT-proBNP, high-sensitivity troponin, hs-CRP, homocysteine and other advanced cardiac blood tests with home collection in Bangalore, processed at Agilus (SRL) Diagnostics labs.",
    doctors: "cardiologists, physicians and preventive-health doctors",
  },
  {
    slug: "endocrinology",
    name: "Endocrinology",
    heading: "Endocrinology and hormone tests at home in Bangalore",
    description:
      "Anti-TPO, TRAb, PTH, C-peptide, IGF-1, cortisol, HOMA-IR and other specialised hormone and diabetes tests with home collection in Bangalore, processed at Agilus (SRL) Diagnostics labs.",
    doctors: "endocrinologists, diabetologists and physicians",
  },
  {
    slug: "nephrology",
    name: "Nephrology",
    heading: "Kidney and nephrology tests at home in Bangalore",
    description:
      "Urine microalbumin, urine protein-creatinine ratio, 1,25-dihydroxy vitamin D and other specialised kidney-related tests with home collection in Bangalore, processed at Agilus (SRL) Diagnostics labs.",
    doctors: "nephrologists and physicians managing kidney disease, diabetes and blood pressure",
  },
  {
    slug: "general-internal-medicine",
    name: "General & Internal Medicine",
    heading: "Specialised tests for general and internal medicine at home in Bangalore",
    description:
      "Procalcitonin, dengue NS1, malaria antigen, HIV 4th generation and other specialised tests ordered by physicians, with home collection in Bangalore and Agilus (SRL) Diagnostics lab processing.",
    doctors: "general physicians and internal-medicine specialists",
  },
  {
    slug: "haematology",
    name: "Haematology & Clotting",
    heading: "Clotting and haematology tests at home in Bangalore",
    description:
      "Thrombocheck (Total, Panel, Hereditary), Protein C, Protein S, Factor V Leiden, D-dimer and lupus anticoagulant with home collection in Bangalore, processed at Agilus (SRL) Diagnostics labs.",
    doctors: "haematologists, physicians and obstetricians",
  },
  {
    slug: "rheumatology",
    name: "Rheumatology & Autoimmune",
    heading: "Rheumatology and autoimmune tests at home in Bangalore",
    description:
      "ANA, anti-dsDNA, ENA profile, anti-CCP, HLA-B27, ANCA, anti-cardiolipin and other autoimmune tests with home collection in Bangalore, processed at Agilus (SRL) Diagnostics labs.",
    doctors: "rheumatologists and physicians",
  },
  {
    slug: "gastroenterology",
    name: "Gastroenterology",
    heading: "Gastroenterology tests at home in Bangalore",
    description:
      "Celiac (tTG IgA), stool calprotectin, H. pylori antigen and other gut-related tests with home collection in Bangalore, processed at Agilus (SRL) Diagnostics labs.",
    doctors: "gastroenterologists and physicians",
  },
  {
    slug: "oncology-markers",
    name: "Tumour Markers",
    heading: "Tumour marker tests at home in Bangalore",
    description:
      "CA 125, ROMA, CA 15-3, CA 19-9, CEA, free and total PSA and thyroglobulin tumour markers with home collection in Bangalore, processed at Agilus (SRL) Diagnostics labs.",
    doctors: "oncologists, gynaecologists, urologists and physicians",
  },
];

export function getSpecialty(slug: string): Specialty | undefined {
  return SPECIALTIES.find((s) => s.slug === slug);
}

// The tests this specialty usually prescribes: a test belongs to the FIRST
// specialty in its `seo.specialties`, so each test is listed under exactly one
// group. Cheapest first, de-duplicated by short name so near-identical catalog
// entries (two "AMH" tests) show once.
export function getSpecialtyTests(slug: string): TestItem[] {
  const seen = new Set<string>();
  return allTests
    .filter((t) => t.seo?.specialties[0] === slug)
    .sort((a, b) => a.price - b.price)
    .filter((t) => {
      const key = t.seo!.short.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// Every specialty that orders the test (the first is the main one).
export function getTestSpecialties(test: TestItem): Specialty[] {
  return (test.seo?.specialties ?? []).map(getSpecialty).filter((s): s is Specialty => !!s);
}
