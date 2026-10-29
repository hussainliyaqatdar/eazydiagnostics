// Package descriptions, MRP (actual price), and constituent-test lists sourced
// from "Agilus_Specialty_Packages 20th June 2026.pdf", cross-matched by name to
// the canonical package list (name/category/code/price) in CMS Catalog.xlsx.
// Descriptions are written for a layman, benefit-first, under 70 words.
// "Advanced Heart Checkup" is not in the PDF; its tests and copy were supplied
// by the business directly (and it has no MRP, as no separate list price exists).
module.exports = {
  "Advanced Heart Checkup": {
    tagline: "Advanced Cardiac Risk Screen",
    description:
      "A normal cholesterol report can still miss hidden heart risk. This advanced screen goes deeper: the particles that carry cholesterol (ApoA1, ApoB, Lp(a)), artery inflammation (hs-CRP), homocysteine, your stress hormone cortisol, and your 3-month sugar average (HbA1c) - a fuller picture of your heart health, from home.",
    constituents: [
      "Lipid Profile, Serum",
      "Apolipoprotein A1 (ApoA1)",
      "Apolipoprotein B (ApoB)",
      "Lipoprotein (a), Serum",
      "High Sensitivity C-Reactive Protein, Serum",
      "Homocysteine, Serum/Plasma",
      "Cortisol, Serum",
      "HbA1c (Glycosylated Haemoglobin)",
    ],
  },
  "Diabetes Basic": {
    tagline: "Glucose Control Screen",
    mrp: 760,
    description:
      "Not sure if your blood sugar is under control? This screen checks your 3-month average (HbA1c) plus fasting and after-meal glucose - everything you need for a first diabetes check or routine monitoring, in one affordable draw.",
    constituents: ["HbA1c (Glycosylated Haemoglobin)", "Fasting Blood Sugar (FBS)", "Post Prandial Blood Sugar (PPBS)"],
  },
  "Infection Basic": {
    tagline: "Infection & Inflammation Screen",
    mrp: 1200,
    description:
      "Feeling feverish or unwell with no clear cause? This panel checks your blood count, inflammation levels, and urine together to help pinpoint whether an infection is behind it, and how serious it is.",
    constituents: ["CBC with ESR + Peripheral Smear", "CRP - Quantitative, Serum", "Urinalysis"],
  },
  "Vitamin Checkup": {
    tagline: "Micronutrient Deficiency Screen",
    mrp: 3100,
    description:
      "Tired all the time, or dealing with bone or muscle aches? Vitamin D and B12 deficiency are two of the most common, and most fixable, causes in India. This quick screen checks both in one draw.",
    constituents: ["Vitamin D Total (25-Hydroxyvitamin D), Serum", "Vitamin B12 (Cyanocobalamin), Serum"],
  },
  "Full Body Checkup Mini": {
    tagline: "Essential Metabolic Screen",
    mrp: 3410,
    description:
      "A smart starting point for anyone over 25. Covers blood sugar, cholesterol, liver, kidneys, thyroid, and urine - the core markers every annual checkup should include, at an easy entry price.",
    constituents: [
      "Fasting Blood Sugar (FBS)",
      "Lipid Profile",
      "Liver Function Profile (LFT)",
      "Kidney Function Test (KFT)",
      "Thyroid Panel (T3, T4, TSH)",
      "Urinalysis",
    ],
  },
  "Full Body Checkup Essential": {
    tagline: "Comprehensive Annual Screen",
    mrp: 4410,
    description:
      "A thorough annual checkup that goes beyond the basics, adding your 3-month sugar average (HbA1c) and full thyroid check to core organ and metabolic tests. A solid yearly health baseline.",
    constituents: [
      "CBC-5",
      "Fasting Blood Sugar (FBS)",
      "HbA1c (Glycosylated Haemoglobin)",
      "Lipid Profile",
      "Liver Function Profile (LFT)",
      "Kidney Function Test (KFT)",
      "Thyroid Panel (T3, T4, TSH)",
      "Urinalysis",
    ],
  },
  "Fever & Infection Panel": {
    tagline: "Most Ordered - Seasonal High Volume",
    mrp: 1550,
    description:
      "Our most-booked panel, for good reason. When fever won't quit, this checks your blood count, inflammation markers, a typhoid screen, and urine together - giving your doctor a fast, complete picture.",
    constituents: ["CBC with ESR + Peripheral Smear", "CRP - Quantitative, Serum", "Widal Test, Serum", "Urinalysis"],
  },
  "Full Body Checkup Advanced": {
    tagline: "Premium Full-Body Screen",
    mrp: 7610,
    description:
      "Our most complete annual checkup. Everything in our Essential package, plus Vitamin B12 and D - two deficiencies so common they're worth checking every year. Ideal for corporate wellness or a thorough yearly review.",
    constituents: [
      "CBC with ESR",
      "Fasting Blood Sugar (FBS)",
      "Liver Function Profile (LFT)",
      "Kidney Function Test (KFT)",
      "Lipid Profile",
      "Thyroid Panel (T3, T4, TSH)",
      "HbA1c (Glycosylated Haemoglobin)",
      "Vitamin B12 (Cyanocobalamin), Serum",
      "Vitamin D Total (25-Hydroxyvitamin D), Serum",
      "Urinalysis",
    ],
  },
  // ---- Complete Care tier upgrades (source: Agilus "Complete Care" comparison
  // chart, Vital Pro / Active / Active Pro columns - renamed to fit our Pro /
  // Pro Max / Ultra naming). Active and Active Pro each split into a Men's
  // (PSA) and Women's (CA 125) version since the cancer marker differs by sex;
  // every other constituent is identical between the two. ----
  "Full Body Checkup - Pro": {
    tagline: "92-Parameter Comprehensive Screen",
    mrp: 8150,
    description:
      "Our most thorough annual screen yet - everything in Full Body Checkup Advanced, plus iron and an inflammation marker (CRP), giving your doctor a fuller picture of your heart, bone, and blood health in one visit.",
    constituents: [
      "CBC-5, EDTA Whole Blood",
      "Fasting Blood Sugar (FBS)",
      "Calcium, Serum",
      "Urinalysis",
      "Thyroid Panel (T3, T4, TSH)",
      "HbA1c (Glycosylated Haemoglobin)",
      "Lipid Profile",
      "Kidney Function Test (KFT)",
      "Liver Function Profile (LFT)",
      "Vitamin D Total (25-Hydroxyvitamin D), Serum",
      "Vitamin B12 (Cyanocobalamin), Serum",
      "Iron, Serum",
      "CRP - Quantitative, Serum",
    ],
  },
  "Full Body Checkup - Pro Max (Men)": {
    tagline: "97-Parameter Screen with Prostate Marker",
    mrp: 11040,
    description:
      "A deeper annual workup for men who want more than the basics. Adds bone and muscle minerals (phosphorus, magnesium), fuller iron studies, and a PSA prostate screen to our Pro checkup - a smart step up once you're past 40.",
    constituents: [
      "CBC-5, EDTA Whole Blood",
      "Fasting Blood Sugar (FBS)",
      "Calcium, Serum",
      "Urinalysis",
      "Free Triiodothyronine (FT3), Serum",
      "Free Thyroxine (FT4), Serum",
      "TSH 3rd Gen Ultrasensitive, Serum",
      "HbA1c (Glycosylated Haemoglobin)",
      "Lipid Profile",
      "Kidney Function Test (KFT)",
      "Liver Function Profile (LFT)",
      "Vitamin D Total (25-Hydroxyvitamin D), Serum",
      "Vitamin B12 (Cyanocobalamin), Serum",
      "Iron, Serum",
      "CRP - Quantitative, Serum",
      "Phosphorus, Serum",
      "Total Iron Binding Capacity, Serum",
      "Magnesium, Serum",
      "Prostate Specific Antigen (PSA), Serum",
    ],
  },
  "Full Body Checkup - Pro Max (Women)": {
    tagline: "97-Parameter Screen with Ovarian Marker",
    mrp: 11040,
    description:
      "A deeper annual workup for women who want more than the basics. Adds bone and muscle minerals (phosphorus, magnesium), fuller iron studies, and a CA 125 ovarian screen to our Pro checkup - a smart step up once you're past 40.",
    constituents: [
      "CBC-5, EDTA Whole Blood",
      "Fasting Blood Sugar (FBS)",
      "Calcium, Serum",
      "Urinalysis",
      "Free Triiodothyronine (FT3), Serum",
      "Free Thyroxine (FT4), Serum",
      "TSH 3rd Gen Ultrasensitive, Serum",
      "HbA1c (Glycosylated Haemoglobin)",
      "Lipid Profile",
      "Kidney Function Test (KFT)",
      "Liver Function Profile (LFT)",
      "Vitamin D Total (25-Hydroxyvitamin D), Serum",
      "Vitamin B12 (Cyanocobalamin), Serum",
      "Iron, Serum",
      "CRP - Quantitative, Serum",
      "Phosphorus, Serum",
      "Total Iron Binding Capacity, Serum",
      "Magnesium, Serum",
      "CA 125 (Ovarian Cancer Monitor), Serum",
    ],
  },
  "Full Body Checkup - Ultra (Men)": {
    tagline: "100-Parameter Ultimate Screen with Prostate Marker",
    mrp: 13600,
    description:
      "Our most complete annual checkup for men. Everything in Pro Max, plus folic acid, rheumatoid factor, cortisol, and true high-sensitivity CRP - a comprehensive, doctor-grade workup for a thorough yearly review.",
    constituents: [
      "CBC-5, EDTA Whole Blood",
      "Fasting Blood Sugar (FBS)",
      "Calcium, Serum",
      "Urinalysis",
      "Free Triiodothyronine (FT3), Serum",
      "Free Thyroxine (FT4), Serum",
      "TSH 3rd Gen Ultrasensitive, Serum",
      "HbA1c (Glycosylated Haemoglobin)",
      "Lipid Profile",
      "Kidney Function Test (KFT)",
      "Liver Function Profile (LFT)",
      "Vitamin D Total (25-Hydroxyvitamin D), Serum",
      "Vitamin B12 (Cyanocobalamin), Serum",
      "Iron, Serum",
      "High Sensitivity C-Reactive Protein, Serum",
      "Phosphorus, Serum",
      "Total Iron Binding Capacity, Serum",
      "Magnesium, Serum",
      "Folic Acid, Serum",
      "Rheumatoid Factor, Serum",
      "Cortisol, Serum",
      "Prostate Specific Antigen (PSA), Serum",
    ],
  },
  "Full Body Checkup - Ultra (Women)": {
    tagline: "100-Parameter Ultimate Screen with Ovarian Marker",
    mrp: 13600,
    description:
      "Our most complete annual checkup for women. Everything in Pro Max, plus folic acid, rheumatoid factor, cortisol, and true high-sensitivity CRP - a comprehensive, doctor-grade workup for a thorough yearly review.",
    constituents: [
      "CBC-5, EDTA Whole Blood",
      "Fasting Blood Sugar (FBS)",
      "Calcium, Serum",
      "Urinalysis",
      "Free Triiodothyronine (FT3), Serum",
      "Free Thyroxine (FT4), Serum",
      "TSH 3rd Gen Ultrasensitive, Serum",
      "HbA1c (Glycosylated Haemoglobin)",
      "Lipid Profile",
      "Kidney Function Test (KFT)",
      "Liver Function Profile (LFT)",
      "Vitamin D Total (25-Hydroxyvitamin D), Serum",
      "Vitamin B12 (Cyanocobalamin), Serum",
      "Iron, Serum",
      "High Sensitivity C-Reactive Protein, Serum",
      "Phosphorus, Serum",
      "Total Iron Binding Capacity, Serum",
      "Magnesium, Serum",
      "Folic Acid, Serum",
      "Rheumatoid Factor, Serum",
      "Cortisol, Serum",
      "CA 125 (Ovarian Cancer Monitor), Serum",
    ],
  },
  "Pre-Surgical Panel": {
    tagline: "Pre-Op / Hospital Referral",
    mrp: 5795,
    description:
      "The standard checklist before any planned surgery. Covers blood clotting, blood group, liver and kidney function, and mandatory infection screening - everything your surgical team needs to clear you safely.",
    constituents: [
      "CBC-5",
      "Prothrombin Time (PT/INR)",
      "Activated Partial Thromboplastin Time (APTT)",
      "ABO Group & Rh Type",
      "Liver Function Profile (LFT)",
      "Kidney Function Test (KFT)",
      "Hepatitis B Surface Antigen (HBsAg)",
      "HIV Antibodies",
      "HCV Antibodies",
    ],
  },
  "First Trimester Antenatal Panel": {
    tagline: "Booking Visit Screen - Week 12",
    mrp: 3920,
    description:
      "Your first-visit essentials, in one panel. Covers infection screening, blood group, thyroid, kidney function, and early diabetes risk - everything your doctor needs to build your pregnancy care plan around week 12.",
    constituents: [
      "CBC with ESR",
      "ABO Group & Rh Type",
      "Hepatitis B Surface Antigen (HBsAg)",
      "HIV Antibodies",
      "VDRL (Syphilis Screen)",
      "Thyroid Panel (T3, T4, TSH)",
      "Creatinine, Serum",
      "Fasting Blood Sugar (FBS)",
      "HbA1c - GDM Screening",
      "Urinalysis",
    ],
  },
  "Second / Third Trimester Panel": {
    tagline: "GDM + Anaemia Screen - Week 28",
    mrp: 1930,
    description:
      "Built for week 28. Focuses on what matters most at this stage - blood sugar control, iron levels, and haemoglobin - to catch gestational diabetes or anaemia early, when they're easiest to manage.",
    constituents: [
      "CBC with ESR",
      "HbA1c - GDM Screening",
      "Fasting Blood Sugar (FBS)",
      "Serum Iron and TIBC Studies",
      "Urinalysis",
    ],
  },
  "PCOS Workup Panel": {
    tagline: "High Demand - Women 18-35",
    mrp: 7660,
    description:
      "Irregular periods, unwanted hair growth, or trouble losing weight? This panel checks the key hormones behind PCOS alongside your blood sugar and blood count, giving your doctor a complete hormonal picture.",
    constituents: [
      "Luteinizing Hormone (LH)",
      "Follicle Stimulating Hormone (FSH)",
      "Prolactin, Serum",
      "Testosterone, Total, Serum",
      "AMH / MIS, Serum",
      "Insulin, Fasting Serum",
      "Fasting Blood Sugar (FBS)",
      "Thyroid Panel (T3, T4, TSH)",
      "HbA1c (Glycosylated Haemoglobin)",
      "CBC with ESR",
    ],
  },
  "Menopause & Perimenopause Panel": {
    tagline: "Women 40-55",
    mrp: 2730,
    description:
      "Hot flushes, mood swings, or periods that have gone unpredictable? This panel checks the core hormones behind the menopausal transition, helping your doctor confirm what's happening and how best to manage it.",
    constituents: [
      "Follicle Stimulating Hormone (FSH), Serum",
      "Luteinizing Hormone (LH), Serum",
      "Estradiol (E2), Serum",
      "Thyroid Panel (T3, T4, TSH)",
    ],
  },
  "Female Infertility Workup": {
    tagline: "Couples Planning Conception",
    mrp: 5930,
    description:
      "Trying to conceive and want answers? This panel checks your ovarian reserve, key fertility hormones, thyroid, and blood sugar together - the essential hormone workup for couples planning a pregnancy.",
    constituents: [
      "AMH / MIS, Serum",
      "Follicle Stimulating Hormone (FSH), Serum",
      "Luteinizing Hormone (LH), Serum",
      "Prolactin, Serum",
      "Thyroid Panel (T3, T4, TSH)",
      "HbA1c (Glycosylated Haemoglobin)",
      "CBC with ESR",
    ],
  },
  "TORCH Comprehensive Panel": {
    tagline: "Pre-Conception / Recurrent Pregnancy Loss",
    mrp: 6380,
    description:
      "Recommended before you conceive, or after a pregnancy loss. Checks for infections - Toxoplasma, Rubella, CMV, Herpes - that can affect a pregnancy, plus key autoimmune markers, so you can plan with confidence.",
    constituents: [
      "TORCH IgG & IgM Evaluation, Serum",
      "Anti Nuclear Antibody (ANA), IFA, Serum",
      "Thyroid Panel (T3, T4, TSH)",
      "Homocysteine, Serum/Plasma",
    ],
  },
  "Diabetes Monitoring Panel": {
    tagline: "Quarterly Review - Most Ordered",
    mrp: 5060,
    description:
      "Already managing diabetes? This is your quarterly check-in - blood sugar control, kidney and liver health, cholesterol, and thyroid, all in one panel, so nothing slips through the cracks between doctor visits.",
    constituents: [
      "HbA1c (Glycosylated Haemoglobin)",
      "Fasting Blood Sugar (FBS)",
      "Insulin, Fasting Serum",
      "Lipid Profile",
      "Kidney Function Test",
      "Liver Function Profile",
      "Urinalysis",
      "Thyroid Panel (T3, T4, TSH)",
    ],
  },
  "Thyroid Panel (T3, T4, TSH)": {
    tagline: "Very High Volume Across All Ages",
    mrp: 580,
    description:
      "Fatigue, weight changes, or feeling the cold more than usual? This is the complete thyroid check - T3, T4, and TSH together - fast, affordable, and useful at any age.",
    constituents: ["Free Triiodothyronine (FT3), Serum", "Free Thyroxine (FT4), Serum", "TSH 3rd Gen Ultrasensitive, Serum"],
  },
  "Insulin Resistance Panel": {
    tagline: "PCOS / Pre-Diabetes / Metabolic Syndrome",
    mrp: 4035,
    description:
      "For when blood sugar is borderline and weight won't budge. This panel measures insulin resistance directly, alongside blood sugar, cholesterol, and heart-risk markers - useful in PCOS, pre-diabetes, or metabolic syndrome.",
    constituents: [
      "Insulin, Fasting Serum",
      "Fasting Blood Sugar (FBS)",
      "HbA1c (Glycosylated Haemoglobin)",
      "Lipid Profile",
      "Homocysteine, Serum/Plasma",
      "Uric Acid, Serum",
    ],
  },
  "Comprehensive Endocrine Screen": {
    tagline: "New Patient / Annual Workup",
    mrp: 6460,
    description:
      "A broad hormone health check for anyone with multiple, hard-to-place symptoms. Covers thyroid, reproductive hormones, blood sugar, cholesterol, and Vitamin D - a strong starting point for a new patient workup.",
    constituents: [
      "Thyroid Panel (T3, T4, TSH)",
      "Prolactin, Serum",
      "Follicle Stimulating Hormone (FSH), Serum",
      "Luteinizing Hormone (LH), Serum",
      "Testosterone, Total, Serum",
      "Fasting Blood Sugar (FBS)",
      "HbA1c (Glycosylated Haemoglobin)",
      "Lipid Profile",
      "Vitamin D Total (25-Hydroxyvitamin D), Serum",
    ],
  },
  "Anaemia Workup Panel": {
    tagline: "Very High Volume Referral",
    mrp: 3600,
    description:
      "Constantly tired or looking pale? This panel checks the three most common causes of anaemia in India - low iron, low B12, and inherited blood disorders - so treatment can target the real cause.",
    constituents: [
      "CBC with ESR + Peripheral Smear",
      "Vitamin B12 (Cyanocobalamin), Serum",
      "Serum Iron and TIBC Studies",
      "Hemoglobin Variant Analysis, Blood",
    ],
  },
  "Liver Disease Panel": {
    tagline: "Hepatology Workup",
    mrp: 3565,
    description:
      "For jaundice, high liver enzymes, or known hepatitis exposure. This panel gives a complete liver health picture, plus clotting and hepatitis screening - the full workup your doctor needs to investigate further.",
    constituents: [
      "Liver Function Profile, Serum",
      "Hepatitis B Surface Antigen (HBsAg), Serum",
      "HCV Antibodies, Serum",
      "Prothrombin Time (PT/INR)",
      "Activated Partial Thromboplastin Time (APTT)",
    ],
  },
  "HIV Monitoring Panel": {
    tagline: "Infectious Disease / ART Monitoring",
    mrp: 4830,
    description:
      "For patients already on HIV treatment. This six-monthly check tracks your immune cell count (CD4) alongside blood and liver health, helping your doctor confirm treatment is working and staying safe.",
    constituents: [
      "HIV Antibodies, Serum",
      "Lymphocyte Subset Enumeration, Blood",
      "CBC with ESR",
      "Liver Function Profile, Serum",
    ],
  },
  "Hair Loss & Hormonal Panel": {
    tagline: "Alopecia Workup - Most Ordered",
    mrp: 5680,
    description:
      "Hair thinning that won't stop? This is our most-booked dermatology panel, checking the five most common, and treatable, causes: thyroid issues, Vitamin D & B12 deficiency, hormone imbalance, and anaemia.",
    constituents: [
      "Thyroid Panel (T3, T4, TSH)",
      "Vitamin D Total (25-Hydroxyvitamin D), Serum",
      "Vitamin B12 (Cyanocobalamin), Serum",
      "Testosterone, Total, Serum",
      "Prolactin, Serum",
      "CBC with ESR",
    ],
  },
  "Autoimmune Skin Panel": {
    tagline: "Psoriasis / Lupus / Pemphigus",
    mrp: 3455,
    description:
      "For ongoing skin inflammation or blistering that hasn't responded to usual treatment. Screens for underlying autoimmune causes, and is often recommended before starting stronger immune-suppressing treatment.",
    constituents: [
      "Anti Nuclear Antibody (ANA), IFA, Serum",
      "Rheumatoid Factor, Serum",
      "CBC with ESR",
      "C-Reactive Protein (CRP), Serum (Quantitative)",
      "Uric Acid, Serum",
    ],
  },
  "Allergy & Urticaria Panel": {
    tagline: "Urticaria / Eczema - High Demand",
    mrp: 2280,
    description:
      "Recurring hives, eczema, or itching with no obvious trigger? This panel checks your allergy markers and inflammation levels, and rules out a parasitic cause, helping your doctor get to the root of it.",
    constituents: ["Total IgE, Serum", "CBC-5, EDTA Whole Blood", "C-Reactive Protein (CRP), Serum (Quantitative)", "Stool: Ova & Parasite"],
  },
  "STI / Infection Screen": {
    tagline: "Sexual Health / Dermatology",
    mrp: 2780,
    description:
      "A confidential check for the four infections that matter most after a high-risk exposure or unexplained symptoms. Straightforward, private, and a responsible step for your sexual health.",
    constituents: ["HIV Antibodies, Serum", "Hepatitis B Surface Antigen (HBsAg), Serum", "HCV Antibodies, Serum", "CBC-5, EDTA Whole Blood"],
  },
};
