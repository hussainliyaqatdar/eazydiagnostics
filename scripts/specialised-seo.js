// SEO / AEO content for the specialised tests that few labs offer at home.
//
// Each entry is keyed by the test's catalog slug and carries only plain,
// clinically conservative facts - what the test measures, when doctors order
// it, and any well-known preparation. build.js merges this into data/tests.json
// as `seo`, adds `terms` to the test's aliases (so "Apo B", "Lp(a)", "pro BNP"
// and the like find it), and writes the answer-ready FAQs (AEO: short, direct
// answers an AI assistant can quote) the test page renders.
//
// Nothing here claims a price, rank, accuracy figure or availability beyond
// what the catalog and the site already state. Review the clinical wording
// with the lab/medical lead before relying on it as medical advice.
//
// specialties: slugs from lib/specialties.ts. The FIRST one is the specialty that
//   usually prescribes the test: it is the group the test is listed under on
//   /specialised-tests (each test appears once). The rest are other specialties
//   that also order it (used in the structured data only).
//   short  - the name patients and doctors type ("NIPT", "Lp(a)").
//   what   - one or two plain sentences: what it measures / screens for.
//   when   - the usual reasons a doctor orders it.
//   prep   - optional, only where preparation is well established.
//   terms  - extra search names (added to the test's aliases).
const SEO = {
  // ---------------------------------------------------------------- OB-GYN
  nipt: {
    specialties: ["obgyn-pregnancy"],
    short: "NIPT",
    what: "NIPT (non-invasive prenatal testing) reads fragments of your baby's DNA that circulate in your blood to screen for Down syndrome (trisomy 21), Edwards syndrome (trisomy 18), Patau syndrome (trisomy 13) and, depending on the panel, sex-chromosome conditions. It is a screening test, not a diagnosis, and it poses no risk to the pregnancy.",
    when: [
      "You want the most accurate blood-based screening for chromosomal conditions, from about 10 weeks of pregnancy",
      "A double or quadruple marker result showed a higher-than-expected risk",
      "Maternal age is 35 or above, or there is a family history of a chromosomal condition",
      "You want to avoid, or decide about, an invasive test such as amniocentesis",
    ],
    prep: "No fasting is needed. Tell us your weeks of gestation when booking; the sample is a routine blood draw. In India the baby's sex is not disclosed in NIPT reports (it is restricted under the PCPNDT Act).",
    terms: ["NIPS", "Non Invasive Prenatal Screening", "Cell Free DNA Test", "cfDNA Test", "Down Syndrome Screening Test", "Prenatal DNA Test"],
    extraFaq: {
      q: "Is a positive NIPT result a diagnosis?",
      a: "No. NIPT is a screening test. A high-risk (positive) result should be confirmed by a diagnostic test such as amniocentesis or CVS, which your gynaecologist or fetal-medicine specialist will discuss with you.",
    },
  },
  "nipt-with-microdeletion": {
    specialties: ["obgyn-pregnancy"],
    short: "NIPT with Microdeletion",
    what: "An extended NIPT that, along with the common trisomies (21, 18 and 13), also screens for selected microdeletion syndromes such as 22q11.2 deletion (DiGeorge syndrome). It is a screening test run on a blood sample from the mother.",
    when: [
      "Your doctor wants a broader genetic screen than standard NIPT",
      "An ultrasound finding or family history suggests a microdeletion condition",
      "Maternal age is higher or a previous pregnancy was affected",
    ],
    prep: "No fasting is needed. Tell us your weeks of gestation when booking.",
    terms: ["Extended NIPT", "NIPT Plus", "NIPT Microdeletion Panel", "22q11 Deletion Screening"],
  },
  "double-marker-test-serum": {
    specialties: ["obgyn-pregnancy"],
    short: "Double Marker test",
    what: "The Double Marker test is a first-trimester blood test that measures free beta-hCG and PAPP-A. Combined with the nuchal translucency (NT) ultrasound and your age, it estimates the chance of Down syndrome, Edwards syndrome and Patau syndrome.",
    when: [
      "Routine first-trimester screening, usually between 11 and 13 weeks 6 days of pregnancy",
      "Your gynaecologist has asked for combined first-trimester screening with the NT scan",
    ],
    prep: "No fasting is needed. The blood sample should be taken around the time of your NT scan, so keep your scan date and gestational age ready.",
    terms: ["Dual Marker", "First Trimester Screening", "Combined First Trimester Screen", "PAPP-A and Free Beta hCG"],
  },
  "dual-marker-fmf-by-trf-method-serum": {
    specialties: ["obgyn-pregnancy"],
    short: "Dual Marker (FMF) test",
    what: "A first-trimester blood test (free beta-hCG and PAPP-A by the TRF method) that feeds the Fetal Medicine Foundation (FMF) risk calculation, together with the NT scan, for Down, Edwards and Patau syndromes.",
    when: [
      "Your doctor or fetal-medicine centre uses FMF-based first-trimester risk calculation",
      "Screening between 11 and 13 weeks 6 days of pregnancy",
    ],
    prep: "No fasting is needed. Keep your scan report and gestational age ready.",
    terms: ["FMF Dual Marker", "Dual Marker Test", "Double Marker FMF", "First Trimester Screening FMF"],
  },
  "efts-1st-trimester-quad-with-preeclampsia-serum": {
    specialties: ["obgyn-pregnancy"],
    short: "First Trimester Screening with Preeclampsia Risk (EFTS)",
    what: "An extended first-trimester screen that, along with the usual chromosomal-risk markers, also estimates the risk of preeclampsia (high blood pressure in pregnancy) so that your doctor can plan closer monitoring if needed.",
    when: [
      "You want chromosomal screening and a preeclampsia risk estimate in the first trimester",
      "Risk factors for preeclampsia such as a first pregnancy, high blood pressure, diabetes or a previous preeclampsia",
    ],
    prep: "No fasting is needed. Keep your scan details and blood pressure reading handy.",
    terms: ["EFTS", "Preeclampsia Screening", "First Trimester Screening Preeclampsia"],
  },
  "quadruple-marker-test-serum": {
    specialties: ["obgyn-pregnancy"],
    short: "Quadruple Marker test",
    what: "The Quadruple (Quad) Marker test is a second-trimester blood test that measures AFP, hCG, uE3 and inhibin A to estimate the chance of Down syndrome, Edwards syndrome and open neural tube defects such as spina bifida.",
    when: [
      "Screening was missed in the first trimester",
      "Routine second-trimester screening, generally between 15 and 20 weeks of pregnancy",
      "Your doctor wants an additional screen after the first-trimester result",
    ],
    prep: "No fasting is needed. Tell us your weeks of pregnancy and weight when booking; both are used in the risk calculation.",
    terms: ["Quad Marker", "Quad Test", "Quadruple Test", "Second Trimester Screening", "AFP hCG uE3 Inhibin A"],
  },
  "quadruple-marker-serum": {
    specialties: ["obgyn-pregnancy"],
    short: "Quad Marker test",
    what: "A second-trimester blood screen (AFP, hCG, uE3 and inhibin A) that estimates the risk of Down syndrome, Edwards syndrome and neural tube defects.",
    when: [
      "Second-trimester screening, generally between 15 and 20 weeks of pregnancy",
      "First-trimester screening was not done",
    ],
    prep: "No fasting is needed. Tell us your weeks of pregnancy and weight when booking.",
    terms: ["Quadruple Marker", "Quad Test", "Quadruple Test Pregnancy"],
  },
  "triple-marker-test-by-trf-method-serum": {
    specialties: ["obgyn-pregnancy"],
    short: "Triple Marker test",
    what: "The Triple Marker test measures AFP, hCG and uE3 in the second trimester to estimate the chance of Down syndrome, Edwards syndrome and neural tube defects.",
    when: [
      "Second-trimester screening, generally between 15 and 20 weeks of pregnancy",
      "First-trimester screening was not done",
    ],
    prep: "No fasting is needed. Tell us your weeks of pregnancy and weight when booking.",
    terms: ["Triple Test", "Triple Marker Screening", "AFP hCG uE3", "Triple Marker Test Bangalore"],
  },
  "triple-test": {
    specialties: ["obgyn-pregnancy"],
    short: "Triple Test",
    what: "A second-trimester blood screen (AFP, hCG and uE3) that estimates the chance of Down syndrome, Edwards syndrome and neural tube defects.",
    when: ["Second-trimester screening, generally between 15 and 20 weeks of pregnancy"],
    prep: "No fasting is needed. Tell us your weeks of pregnancy and weight when booking.",
    terms: ["Triple Marker", "Triple Test Pregnancy"],
  },
  "amh-mis-serum": {
    specialties: ["obgyn-pregnancy", "endocrinology"],
    short: "AMH test",
    what: "Anti-Mullerian Hormone (AMH) is made by the small follicles in the ovaries, so the level reflects your ovarian reserve - roughly how many eggs remain. It is one of the most useful fertility markers because it can be tested on any day of the cycle.",
    when: [
      "Fertility assessment and planning, including before IUI or IVF",
      "Irregular cycles or suspected PCOS (AMH is often high) ",
      "Concern about early menopause or premature ovarian insufficiency",
      "Before egg freezing",
    ],
    prep: "No fasting is needed and it can be done on any day of the cycle. AMH shows egg quantity, not quality, and cannot predict pregnancy on its own.",
    terms: ["Anti Mullerian Hormone", "Ovarian Reserve Test", "AMH Level", "AMH test for fertility", "Egg Reserve Test"],
  },
  "anti-mullerian-hormone": {
    specialties: ["obgyn-pregnancy", "endocrinology"],
    short: "AMH test",
    what: "Anti-Mullerian Hormone (AMH) reflects your ovarian reserve - roughly how many eggs remain - and can be tested on any day of the cycle.",
    when: [
      "Fertility assessment and planning, including before IUI or IVF",
      "Suspected PCOS or early menopause",
    ],
    prep: "No fasting is needed and it can be done on any day of the cycle.",
    terms: ["Anti Mullerian Hormone", "Ovarian Reserve Test", "AMH Level"],
  },
  "torch-igg-igm-evaluation-serum": {
    specialties: ["obgyn-pregnancy"],
    short: "TORCH test",
    what: "The TORCH panel checks antibodies (IgG and IgM) against Toxoplasma, Rubella, Cytomegalovirus (CMV) and Herpes simplex virus - infections that can harm a developing baby if caught during pregnancy.",
    when: [
      "Planning a pregnancy or in early pregnancy, to know your immunity",
      "Recurrent miscarriage or a previous pregnancy complication",
      "Fever with rash or flu-like illness during pregnancy",
    ],
    prep: "No fasting is needed.",
    terms: ["TORCH Panel", "TORCH Profile", "TORCH Screening", "TORCH IgG IgM"],
  },
  "lupus-anticoagulant": {
    specialties: ["haematology", "obgyn-pregnancy", "rheumatology"],
    short: "Lupus Anticoagulant test",
    what: "Looks for lupus anticoagulant, an antiphospholipid antibody that can make blood clot abnormally. It is one part of the work-up for antiphospholipid syndrome.",
    when: [
      "Recurrent miscarriage or pregnancy loss",
      "Unexplained blood clots (DVT, stroke) or a prolonged aPTT",
      "Autoimmune conditions such as lupus",
    ],
    prep: "Tell your doctor and our team if you take blood thinners, as they can affect this test.",
    terms: ["LA Test", "Antiphospholipid Antibody Test", "Lupus Anticoagulant Screen"],
  },
  "anti-cardiolipin-antibodies-igm-serum": {
    specialties: ["rheumatology", "haematology", "obgyn-pregnancy"],
    short: "Anti-Cardiolipin Antibodies IgM test",
    what: "Detects IgM antibodies against cardiolipin, one of the antiphospholipid antibodies linked to abnormal clotting and pregnancy loss.",
    when: [
      "Recurrent miscarriage",
      "Unexplained blood clots",
      "Suspected antiphospholipid syndrome or lupus",
    ],
    terms: ["Anticardiolipin Antibody", "ACA IgM", "Antiphospholipid Antibodies"],
  },
  "17-a-hydroxyprogesterone-serum": {
    specialties: ["endocrinology", "obgyn-pregnancy"],
    short: "17-OH Progesterone test",
    what: "Measures 17-hydroxyprogesterone, the hormone that is raised in congenital adrenal hyperplasia (CAH), including the milder late-onset form that can look like PCOS.",
    when: [
      "Irregular periods, acne or excess hair growth in women",
      "Suspected congenital adrenal hyperplasia",
      "Evaluation of infertility",
    ],
    prep: "This hormone varies through the day and cycle; your doctor may ask for an early-morning sample or a specific cycle day. Confirm with us when booking.",
    terms: ["17-OHP", "17 OH Progesterone", "17 Hydroxyprogesterone", "CAH Test"],
  },
  "testosterone-free-total-serum": {
    specialties: ["endocrinology", "obgyn-pregnancy"],
    short: "Free and Total Testosterone test",
    what: "Measures both total testosterone and the free (active) portion. It helps assess PCOS, excess hair growth and irregular periods in women, and low testosterone in men.",
    when: [
      "PCOS work-up, acne, hirsutism or irregular periods",
      "Low libido, fatigue or infertility in men",
    ],
    prep: "Testosterone is usually highest in the morning, so an early-morning sample is often preferred; confirm with us when booking.",
    terms: ["Free Testosterone Total Testosterone", "Testosterone Free and Total", "PCOS Hormone Test"],
  },
  "free-testosterone-serum": {
    specialties: ["endocrinology", "obgyn-pregnancy"],
    short: "Free Testosterone test",
    what: "Measures the free, biologically active testosterone in the blood, useful when total testosterone does not tell the full story.",
    when: ["PCOS or excess hair growth in women", "Low testosterone symptoms in men"],
    prep: "An early-morning sample is often preferred; confirm with us when booking.",
    terms: ["Free T Test", "Free Testosterone Level"],
  },
  "dehydroepiandrosterone-s-serum": {
    specialties: ["endocrinology", "obgyn-pregnancy"],
    short: "DHEA-S test",
    what: "Measures DHEA-S, a hormone made mainly by the adrenal glands. Raised levels point towards adrenal causes of excess androgens.",
    when: ["PCOS and excess hair growth or acne", "Early puberty in children", "Suspected adrenal disorders"],
    terms: ["DHEAS", "DHEA Sulphate", "Dehydroepiandrosterone Sulfate"],
  },

  // ------------------------------------------------------------- Cardiology
  "apolipoprotein-a1-apoa1": {
    specialties: ["cardiology", "endocrinology"],
    short: "Apolipoprotein A1 (ApoA1) test",
    what: "Apolipoprotein A1 (ApoA1) is the main protein in HDL, the so-called good cholesterol. Measuring it shows how many protective HDL particles you carry; a low level is linked to a higher risk of heart disease, even when total cholesterol looks normal.",
    when: [
      "Cardiac risk assessment alongside a lipid profile, especially with a family history of heart disease",
      "Low HDL cholesterol or metabolic syndrome",
      "Part of an advanced heart checkup, often together with ApoB and Lp(a)",
      "Calculating the ApoB/ApoA1 ratio, which doctors use as a risk marker",
    ],
    prep: "Fasting is generally not required for ApoA1, but your doctor may prefer a fasting sample if a lipid profile is done at the same time; confirm with us when booking.",
    terms: ["Apo A1 test", "ApoA1 blood test"],
  },
  "apolipoprotein-b-apob": {
    specialties: ["cardiology", "endocrinology"],
    short: "Apolipoprotein B (ApoB) test",
    what: "Apolipoprotein B (ApoB) is the protein carried on every cholesterol particle that can clog arteries (LDL, VLDL and others), with one ApoB on each. So ApoB counts the harmful particles directly, and it can flag risk that LDL cholesterol alone misses, particularly with high triglycerides, diabetes or metabolic syndrome.",
    when: [
      "Cardiac risk assessment when LDL cholesterol looks normal but risk is high",
      "High triglycerides, diabetes, insulin resistance or metabolic syndrome",
      "Deciding on or tracking cholesterol-lowering treatment, as advised by your doctor",
      "Part of an advanced heart checkup, often together with ApoA1 and Lp(a)",
    ],
    prep: "Fasting is generally not required for ApoB, but your doctor may prefer a fasting sample if a lipid profile is done at the same time; confirm with us when booking.",
    terms: ["Apo B test", "ApoB blood test"],
  },
  "lipoprotein-a-serum": {
    specialties: ["cardiology"],
    short: "Lipoprotein(a) test",
    what: "Lipoprotein(a), written Lp(a), is a cholesterol-carrying particle whose level is largely set by your genes. A high level raises the lifetime risk of heart attack, stroke and aortic valve disease even when ordinary cholesterol looks normal.",
    when: [
      "Family history of early heart disease or stroke",
      "A heart attack or stroke at a younger age without clear risk factors",
      "High cholesterol that does not respond as expected to treatment",
      "A one-time check to complete your cardiac risk profile",
    ],
    prep: "Fasting is generally not required for Lp(a). Because the level is mostly genetic, it is often tested once.",
    terms: ["Lp(a)", "Lipoprotein a", "Lipoprotein little a", "Lp a Test"],
  },
  "n-terminal-pro-b-type-natriuretic-peptide-serum": {
    specialties: ["cardiology", "nephrology", "general-internal-medicine"],
    short: "NT-proBNP test",
    what: "NT-proBNP is a hormone fragment released by the heart when it is under strain. A raised level supports a diagnosis of heart failure, and tracking it helps doctors judge how well treatment is working.",
    when: [
      "Breathlessness, ankle swelling or fatigue where heart failure is suspected",
      "Monitoring known heart failure and response to treatment",
      "Cardiac risk assessment alongside kidney disease or after chemotherapy",
    ],
    prep: "No fasting is needed. Kidney function and age can affect the level, so your doctor interprets it with your history.",
    terms: ["NT pro BNP", "NTproBNP", "Pro BNP", "BNP Test", "Heart Failure Blood Test"],
  },
  "h-s-troponin-i-serum": {
    specialties: ["cardiology"],
    short: "High-Sensitivity Troponin I test",
    what: "Troponin I is a protein released when heart muscle is damaged. The high-sensitivity assay detects very small rises, helping doctors assess heart injury.",
    when: [
      "Follow-up of a cardiac event as advised by your cardiologist",
      "Evaluation of suspected heart muscle injury or inflammation under medical guidance",
    ],
    prep: "If you have chest pain, pressure or breathlessness right now, go to the nearest emergency department; do not wait for a home sample.",
    terms: ["hs Troponin I", "Troponin I", "High Sensitivity Troponin", "Cardiac Troponin"],
  },
  "troponin-t-hs-serum": {
    specialties: ["cardiology"],
    short: "High-Sensitivity Troponin T test",
    what: "Troponin T is a protein released from injured heart muscle. The high-sensitivity assay picks up very small rises that help doctors assess heart injury.",
    when: [
      "Follow-up of a cardiac event as advised by your cardiologist",
      "Evaluation of suspected heart muscle injury under medical guidance",
    ],
    prep: "If you have chest pain, pressure or breathlessness right now, go to the nearest emergency department; do not wait for a home sample.",
    terms: ["hs Troponin T", "Troponin T", "hsTnT", "Cardiac Troponin T"],
  },
  "high-sensitivity-c-reactive-protein-serum": {
    specialties: ["cardiology", "general-internal-medicine"],
    short: "hs-CRP test",
    what: "High-sensitivity CRP detects low-grade inflammation in the blood vessels. When you are free of infection, a persistently raised hs-CRP is linked to a higher risk of heart disease.",
    when: [
      "Cardiac risk assessment, especially with borderline cholesterol",
      "Part of an advanced heart checkup",
      "Tracking inflammation over time",
    ],
    prep: "Avoid testing during a cold, fever or other infection, as it raises the value. No fasting is needed.",
    terms: ["hsCRP", "High Sensitivity CRP", "Cardiac CRP", "CRP for heart risk"],
  },
  "homocysteine-serum-plasma": {
    specialties: ["cardiology", "general-internal-medicine", "obgyn-pregnancy"],
    short: "Homocysteine test",
    what: "Measures homocysteine, an amino acid. High levels are linked to vitamin B12 and folate deficiency and to a higher risk of blood-vessel disease and clots.",
    when: [
      "Cardiac and stroke risk assessment",
      "Suspected vitamin B12 or folate deficiency",
      "Unexplained blood clots or recurrent pregnancy loss",
    ],
    prep: "Your doctor may ask for an overnight fast before the sample; confirm with us when booking.",
    terms: ["Homocysteine Level", "Homocystine", "Hcy Test"],
  },
  "creatine-kinase-mb-serum": {
    specialties: ["cardiology"],
    short: "CK-MB test",
    what: "CK-MB is an enzyme that is released when heart muscle is injured. It is used to support the assessment of heart muscle damage.",
    when: ["Follow-up after a suspected cardiac event, as advised by your doctor"],
    prep: "If you have chest pain right now, go to the nearest emergency department.",
    terms: ["CKMB", "CPK-MB", "Creatine Kinase MB"],
  },
  "d-dimer-citrate-plasma": {
    specialties: ["haematology", "cardiology", "general-internal-medicine"],
    short: "D-Dimer test",
    what: "D-Dimer is a fragment produced when a blood clot breaks down. A normal level helps doctors rule out an active clot (DVT or pulmonary embolism); a raised level needs further evaluation because many conditions can raise it.",
    when: [
      "Swelling or pain in a leg where a DVT is suspected",
      "Sudden breathlessness or chest pain where a lung clot is suspected (seek emergency care first)",
      "Monitoring clotting problems and some infections",
    ],
    prep: "No fasting is needed. Pregnancy, surgery, infection and age can raise the value.",
    terms: ["D Dimer", "D-Dimer Quantitative", "Fibrin Degradation Test", "DVT Blood Test"],
  },
  "quantitative-d-dimer-citrate-plasma": {
    specialties: ["haematology", "cardiology", "general-internal-medicine"],
    short: "D-Dimer (Quantitative) test",
    what: "A quantitative D-Dimer measures a clot-breakdown fragment. A normal level helps rule out an active clot; a raised level needs further evaluation.",
    when: ["Suspected DVT or pulmonary embolism under medical guidance", "Monitoring clotting disorders"],
    terms: ["D Dimer Quantitative", "D-Dimer"],
  },

  // ------------------------------------------------------------ Haematology
  "thrombocheck-total": {
    specialties: ["haematology", "obgyn-pregnancy", "cardiology"],
    short: "Thrombocheck Total",
    what: "Thrombocheck Total is the lab's comprehensive thrombophilia work-up, covering both inherited (genetic) and acquired causes of abnormal blood clotting. The exact components are listed on the lab's test sheet, which we share when you book.",
    when: [
      "A blood clot (DVT, pulmonary embolism or stroke) at a young age or without a clear cause",
      "Recurrent miscarriage or pregnancy complications",
      "A strong family history of clots",
      "Before certain surgeries, hormone therapy or IVF when your doctor advises",
    ],
    prep: "Blood thinners such as warfarin or heparin can affect some components, so tell your doctor and our team what you take. Do not stop any medicine without your doctor's advice.",
    terms: ["Thrombophilia Profile", "Thrombophilia Panel", "Clotting Disorder Test", "Thrombophilia Screening"],
  },
  "thrombocheck-panel": {
    specialties: ["haematology", "obgyn-pregnancy"],
    short: "Thrombocheck Panel",
    what: "A thrombophilia panel that checks for causes of abnormal blood clotting. The exact components are listed on the lab's test sheet, shared when you book.",
    when: ["Unexplained or recurrent blood clots", "Recurrent miscarriage", "Family history of clotting disorders"],
    prep: "Tell your doctor and our team about any blood thinners you take.",
    terms: ["Thrombophilia Panel", "Thrombophilia Profile", "Clotting Disorder Panel"],
  },
  "thrombocheck-hereditary": {
    specialties: ["haematology", "obgyn-pregnancy"],
    short: "Thrombocheck Hereditary",
    what: "A thrombophilia panel focused on inherited (genetic) causes of abnormal blood clotting. The exact components are listed on the lab's test sheet, shared when you book.",
    when: ["Clots at a young age", "Strong family history of clots", "Recurrent pregnancy loss"],
    terms: ["Hereditary Thrombophilia Test", "Inherited Clotting Disorder Test"],
  },
  "protein-c-activity-plasma": {
    specialties: ["haematology"],
    short: "Protein C Activity test",
    what: "Protein C is a natural anticoagulant. Low activity raises the tendency to form blood clots.",
    when: ["Unexplained or recurrent clots", "Family history of clotting disorders"],
    prep: "Warfarin, acute clots and liver disease can lower the result, so your doctor chooses the right time to test.",
    terms: ["Protein C", "Protein C Functional"],
  },
  "protein-s-activity-plasma": {
    specialties: ["haematology"],
    short: "Protein S Activity test",
    what: "Protein S is a natural anticoagulant. Low activity raises the tendency to form blood clots.",
    when: ["Unexplained or recurrent clots", "Family history of clotting disorders", "Recurrent pregnancy loss"],
    prep: "Warfarin, pregnancy and acute clots can lower the result, so your doctor chooses the right time to test.",
    terms: ["Protein S", "Protein S Functional"],
  },
  "factor-v-mutation-detection-edta-blood": {
    specialties: ["haematology", "obgyn-pregnancy"],
    short: "Factor V Leiden mutation test",
    what: "A genetic test for the Factor V mutation (Factor V Leiden), the most common inherited cause of a raised tendency to blood clots.",
    when: ["Unexplained clots", "Recurrent miscarriage", "Family history of Factor V Leiden or clots"],
    prep: "No fasting is needed. Being a genetic test, it is not affected by blood thinners.",
    terms: ["Factor V Leiden", "FVL Mutation", "Factor 5 Leiden"],
  },
  "ferritin-serum": {
    specialties: ["obgyn-pregnancy", "haematology", "general-internal-medicine"],
    short: "Ferritin test",
    what: "Ferritin shows how much iron your body has stored. It falls early in iron deficiency, often before haemoglobin drops, and rises in inflammation and iron overload.",
    when: ["Tiredness, hair fall or pale skin", "Suspected iron deficiency or iron overload", "Pregnancy and heavy periods"],
    prep: "Your doctor may prefer a fasting morning sample; iron supplements can affect results, so mention them when booking.",
    terms: ["Serum Ferritin", "Iron Stores Test", "Ferritin Level"],
  },

  // ------------------------------------------- General and Internal Medicine
  "procalcitonin-serum": {
    specialties: ["general-internal-medicine", "nephrology"],
    short: "Procalcitonin test",
    what: "Procalcitonin (PCT) rises sharply in serious bacterial infections and sepsis but stays low in most viral illnesses. Doctors use it to help decide whether antibiotics are needed and to follow how an infection is responding.",
    when: [
      "Suspected serious bacterial infection or sepsis under a doctor's care",
      "Deciding whether to start, continue or stop antibiotics",
      "Monitoring response to treatment of a severe infection",
    ],
    prep: "No fasting is needed. If someone has a high fever with confusion, fast breathing or low blood pressure, seek emergency care instead of waiting for a home sample.",
    terms: ["PCT", "Procalcitonin Level", "Sepsis Marker", "Bacterial Infection Marker"],
  },
  "dengue-ns1-antigen-test-serum": {
    specialties: ["general-internal-medicine"],
    short: "Dengue NS1 Antigen test",
    what: "Detects the NS1 protein of the dengue virus, which appears in the blood from the first days of fever, before antibodies develop.",
    when: ["Fever for 1 to 5 days during dengue season", "Fever with body ache, rash or low platelets"],
    prep: "Best done in the first five days of fever. Keep hydrated and see a doctor if you have severe abdominal pain, bleeding or persistent vomiting.",
    terms: ["Dengue NS1", "Dengue Antigen Test", "Dengue Test at Home", "Dengue Fever Blood Test"],
  },
  "malaria-antigen-detection-whole-blood": {
    specialties: ["general-internal-medicine"],
    short: "Malaria Rapid Antigen test",
    what: "A rapid blood test that detects malaria parasite antigens, helping confirm malaria in someone with fever.",
    when: ["Fever with chills and sweats", "Fever after travel to a malaria-affected area"],
    terms: ["Malaria Antigen", "Malaria Rapid Test", "Malaria Test at Home", "MP Antigen"],
  },
  "hiv-screening-4th-gen-assay-serum": {
    specialties: ["general-internal-medicine"],
    short: "HIV 4th Generation test",
    what: "A fourth-generation HIV screen that detects both HIV antibodies and the p24 antigen, so infection can be picked up earlier than with antibody-only tests.",
    when: ["After a possible exposure, as advised by your doctor", "Routine screening, before surgery, in pregnancy or for pre-marital checks"],
    prep: "Results are most reliable once the window period has passed; your doctor will advise on timing and any repeat test. Your result is confidential and shared only with you via WhatsApp.",
    terms: ["HIV Duo", "HIV Ag/Ab Combo", "HIV 4th Gen", "HIV Test at Home", "HIV Antigen Antibody Test"],
  },
  "cortisol-serum": {
    specialties: ["endocrinology", "general-internal-medicine"],
    short: "Cortisol test",
    what: "Cortisol is the body's main stress hormone, made by the adrenal glands. Levels follow a daily rhythm, highest in the morning, and are abnormal in conditions such as Cushing's syndrome and Addison's disease.",
    when: ["Unexplained fatigue, weight change or low blood pressure", "Suspected adrenal or pituitary disorders", "Part of an advanced heart or stress-related checkup"],
    prep: "Usually collected in the morning (often around 8 to 9 AM). Confirm the timing your doctor wants when booking.",
    terms: ["Serum Cortisol", "Morning Cortisol", "Stress Hormone Test"],
  },

  // --------------------------------------------------------- Endocrinology
  "anti-thyroid-peroxidase-antibodies-serum": {
    specialties: ["endocrinology"],
    short: "Anti-TPO test",
    what: "Anti-TPO antibodies are raised in autoimmune thyroid disease, especially Hashimoto's thyroiditis, and sometimes Graves' disease.",
    when: ["Abnormal thyroid results (TSH, T3, T4)", "Suspected Hashimoto's thyroiditis", "Pregnancy planning with thyroid concerns or recurrent miscarriage"],
    prep: "No fasting is needed.",
    terms: ["Anti TPO", "TPO Antibodies", "Thyroid Peroxidase Antibody", "Hashimoto Test"],
  },
  "tsh-receptor-antibodies-serum": {
    specialties: ["endocrinology"],
    short: "TSH Receptor Antibody (TRAb) test",
    what: "TRAb detects antibodies that stimulate the thyroid and cause Graves' disease. It helps confirm the cause of an overactive thyroid and tracks response to treatment.",
    when: ["Hyperthyroidism where the cause is unclear", "Suspected Graves' disease or Graves' eye disease", "Thyroid problems in pregnancy"],
    terms: ["TRAb", "TSH Receptor Antibodies", "Graves Disease Test", "TSI Test"],
  },
  "thyroglobulin-serum": {
    specialties: ["endocrinology", "oncology-markers"],
    short: "Thyroglobulin test",
    what: "Thyroglobulin is a protein made by thyroid tissue. After thyroid surgery for cancer it is used as a tumour marker to watch for any return of disease.",
    when: ["Follow-up after thyroidectomy and radioiodine for thyroid cancer", "As advised by your endocrinologist or oncologist"],
    prep: "It is usually interpreted together with anti-thyroglobulin antibodies.",
    terms: ["Tg Test", "Serum Thyroglobulin", "Thyroid Cancer Marker"],
  },
  "anti-thyroglobulin-antibodies-serum": {
    specialties: ["endocrinology"],
    short: "Anti-Thyroglobulin (Anti-TG) test",
    what: "Detects antibodies against thyroglobulin, seen in autoimmune thyroid disease and needed to interpret thyroglobulin results after thyroid cancer treatment.",
    when: ["Suspected autoimmune thyroid disease", "Follow-up of thyroid cancer together with thyroglobulin"],
    terms: ["Anti TG", "Thyroglobulin Antibodies", "Anti Tg Antibody", "ATG Test"],
  },
  "pth-intact-edta-calcium-serum": {
    specialties: ["endocrinology", "nephrology"],
    short: "PTH and Calcium test",
    what: "Measures intact parathyroid hormone (PTH) along with calcium. Together they show whether the parathyroid glands are over- or under-active and are essential in kidney disease and bone-mineral disorders.",
    when: ["High or low calcium", "Chronic kidney disease and dialysis follow-up", "Low vitamin D with bone pain or fractures"],
    prep: "Your doctor may prefer a fasting morning sample; confirm with us when booking.",
    terms: ["Intact PTH", "Parathyroid Hormone", "PTH Test", "Parathormone"],
  },
  "c-peptide-serum": {
    specialties: ["endocrinology"],
    short: "C-Peptide test",
    what: "C-peptide is made alongside insulin, so measuring it shows how much insulin your own pancreas is producing. It helps tell type 1 from type 2 diabetes and assess insulin resistance.",
    when: ["Newly diagnosed diabetes where the type is unclear", "Unexplained low blood sugar", "Assessing how much insulin the body still makes"],
    prep: "Your doctor may ask for a fasting sample or a paired fasting and post-meal sample; confirm when booking.",
    terms: ["C Peptide", "Connecting Peptide", "Insulin Production Test"],
  },
  "insulin-like-growth-factor-i-serum": {
    specialties: ["endocrinology"],
    short: "IGF-1 test",
    what: "IGF-1 reflects growth-hormone activity. It is raised in growth hormone excess (acromegaly) and low in growth hormone deficiency.",
    when: ["Suspected acromegaly or gigantism", "Short stature or slow growth in children", "Pituitary disorders"],
    terms: ["Insulin Like Growth Factor 1", "IGF1", "Somatomedin C", "Growth Hormone Marker"],
  },
  "1-25-dihydroxy-vitamin-d-serum": {
    specialties: ["nephrology", "endocrinology"],
    short: "1,25-Dihydroxy Vitamin D test",
    what: "Measures the active hormone form of vitamin D (calcitriol). It is not the usual test for vitamin D deficiency (that is 25-OH vitamin D); it is used in kidney disease, calcium disorders and some granulomatous diseases.",
    when: ["Chronic kidney disease with bone-mineral problems", "Unexplained high or low calcium", "As advised by your nephrologist or endocrinologist"],
    terms: ["Calcitriol", "Active Vitamin D", "1 25 OH Vitamin D", "Vitamin D 1,25"],
  },
  "glutamic-acid-decarboxylase-antibody": {
    specialties: ["endocrinology"],
    short: "GAD Antibody test",
    what: "Detects antibodies against GAD, a marker of autoimmune (type 1 and LADA) diabetes.",
    when: ["Diabetes diagnosed in a young or lean person", "Adults whose type 2 diabetes control fails early (suspected LADA)", "Family history of autoimmune diabetes"],
    terms: ["GAD65 Antibody", "Anti GAD", "Type 1 Diabetes Antibody", "LADA Test"],
  },
  "homeostatic-model-assessment-homa-2-serum": {
    specialties: ["endocrinology"],
    short: "HOMA-IR (Insulin Resistance) test",
    what: "HOMA-IR estimates insulin resistance from your fasting glucose and fasting insulin levels. Insulin resistance often comes before type 2 diabetes and is common in PCOS.",
    when: ["PCOS, prediabetes or fatty liver", "Weight gain with a family history of diabetes"],
    prep: "An overnight fast of 8 to 12 hours is usually needed.",
    terms: ["HOMA IR", "HOMA2", "Insulin Resistance Test", "Insulin Resistance Index"],
  },
  "insulin-fasting-serum": {
    specialties: ["endocrinology"],
    short: "Fasting Insulin test",
    what: "Measures insulin in the blood after an overnight fast. High values suggest insulin resistance, often before blood sugar rises.",
    when: ["PCOS, prediabetes or fatty liver", "Unexplained weight gain or acanthosis nigricans"],
    prep: "An overnight fast of 8 to 12 hours is usually needed.",
    terms: ["Fasting Insulin", "Insulin Level", "Insulin Fasting Test"],
  },
  "metanephrine-free-plasma": {
    specialties: ["endocrinology"],
    short: "Plasma Free Metanephrines test",
    what: "Measures free metanephrines, the breakdown products of adrenaline and noradrenaline. It is the key blood test for pheochromocytoma and paraganglioma, rare adrenal tumours.",
    when: ["Resistant or sudden-spikes high blood pressure with sweating, headache and palpitations", "An adrenal nodule found on imaging"],
    prep: "Preparation (rest, fasting, avoiding certain medicines and caffeine) matters for this test; our team will confirm it with you when booking.",
    terms: ["Plasma Metanephrines", "Free Metanephrine", "Pheochromocytoma Test"],
  },

  // ------------------------------------------------------------ Nephrology
  "microalbumin-urine": {
    specialties: ["nephrology", "endocrinology"],
    short: "Urine Microalbumin test",
    what: "Detects tiny amounts of albumin in urine - the earliest sign of kidney damage from diabetes and high blood pressure, often before serum creatinine changes.",
    when: ["Yearly screening for people with diabetes or high blood pressure", "Family history of kidney disease"],
    prep: "A spot (random) or early-morning urine sample is used. Avoid heavy exercise and testing during a urinary infection or periods, as these can raise the value.",
    terms: ["Microalbuminuria", "Urine Albumin", "MAU", "Urine Albumin Creatinine Ratio", "UACR"],
  },
  "urinary-protein-creatinine-ratio": {
    specialties: ["nephrology", "obgyn-pregnancy"],
    short: "Urine Protein-Creatinine Ratio (UPCR) test",
    what: "Estimates how much protein you lose in urine from a single spot sample, a simpler alternative to a 24-hour urine collection.",
    when: ["Kidney disease follow-up", "Swelling or foamy urine", "Suspected preeclampsia or protein in urine in pregnancy"],
    prep: "A spot urine sample is used; no 24-hour collection is needed.",
    terms: ["UPCR", "Urine PCR", "Urine Protein Creatinine Ratio", "Spot Urine Protein"],
  },

  // ---------------------------------------------------------- Rheumatology
  "anti-nuclear-antibody-ana-ifa-serum": {
    specialties: ["rheumatology"],
    short: "ANA test",
    what: "The ANA test looks for antibodies that attack the body's own cell nuclei. It is the usual first screen for lupus and other autoimmune connective-tissue diseases.",
    when: ["Joint pain with fatigue, rash or fever", "Suspected lupus, Sjogren's or scleroderma"],
    terms: ["ANA IFA", "Antinuclear Antibody", "ANA Profile"],
  },
  "double-stranded-dna-ifa-serum": {
    specialties: ["rheumatology"],
    short: "Anti-dsDNA test",
    what: "Anti-double-stranded DNA antibodies are highly specific for lupus (SLE). Levels often track disease activity.",
    when: ["A positive ANA with lupus symptoms", "Monitoring known lupus"],
    terms: ["Anti dsDNA", "dsDNA Antibody", "Lupus Test", "Anti Double Stranded DNA"],
  },
  "abs-to-extractable-nuclear-antigen-ana-blot-serum": {
    specialties: ["rheumatology"],
    short: "ENA / ANA Blot test",
    what: "Identifies which specific antibodies a positive ANA contains (for example SSA, SSB, Sm, RNP, Scl-70), which helps tell lupus, Sjogren's, scleroderma and related diseases apart.",
    when: ["After a positive ANA", "Suspected Sjogren's, scleroderma or mixed connective-tissue disease"],
    terms: ["ENA Profile", "ENA Panel", "ANA Blot", "Extractable Nuclear Antigen"],
  },
  "hla-b27-by-pcr": {
    specialties: ["rheumatology"],
    short: "HLA-B27 test",
    what: "HLA-B27 is a genetic marker strongly linked to ankylosing spondylitis and related spondyloarthritis. A positive result supports the diagnosis but does not confirm it, since many healthy people carry it.",
    when: ["Chronic lower-back pain and morning stiffness in younger adults", "Recurrent eye inflammation (uveitis)", "Suspected spondyloarthritis"],
    prep: "No fasting is needed. Being a genetic test, it is usually done once.",
    terms: ["HLA B27", "B27 Test", "Ankylosing Spondylitis Test", "HLA-B27 PCR"],
  },
  "hla-b27-flow-cytometry-blood": {
    specialties: ["rheumatology"],
    short: "HLA-B27 (Flow Cytometry) test",
    what: "Detects the HLA-B27 marker linked to ankylosing spondylitis using flow cytometry on a blood sample.",
    when: ["Chronic back pain and stiffness in younger adults", "Recurrent uveitis"],
    terms: ["HLA B27 Flow", "B27 Flow Cytometry", "Ankylosing Spondylitis Test"],
  },
  "anti-ccp-antibodies-serum": {
    specialties: ["rheumatology"],
    short: "Anti-CCP test",
    what: "Anti-CCP antibodies are highly specific for rheumatoid arthritis and can appear years before joint damage, so the test supports early diagnosis and helps judge outlook.",
    when: ["Joint pain and swelling, especially morning stiffness in the hands", "A positive or borderline rheumatoid factor"],
    terms: ["Anti CCP", "CCP Antibody", "Cyclic Citrullinated Peptide", "Rheumatoid Arthritis Test"],
  },
  "anca-positive-reflex-mpo-pr3-antibodies": {
    specialties: ["rheumatology", "nephrology"],
    short: "ANCA with MPO and PR3 reflex test",
    what: "Looks for ANCA antibodies, and if positive, automatically identifies whether they are MPO or PR3 type. These help diagnose vasculitis, which can affect the kidneys, lungs and nerves.",
    when: ["Suspected vasculitis", "Unexplained kidney failure with blood or protein in urine"],
    terms: ["ANCA", "p-ANCA c-ANCA", "MPO PR3 Antibodies", "Vasculitis Test"],
  },

  // -------------------------------------------------------- Gastroenterology
  "tissue-transglutaminase-iga-serum": {
    specialties: ["gastroenterology"],
    short: "Celiac (tTG IgA) test",
    what: "Tissue transglutaminase IgA is the main blood screen for celiac disease, an immune reaction to gluten.",
    when: ["Chronic diarrhoea, bloating or unexplained weight loss", "Iron-deficiency anaemia that does not respond to treatment", "Family history of celiac disease"],
    prep: "Keep eating gluten until tested; going gluten-free beforehand can give a falsely normal result.",
    terms: ["tTG IgA", "Celiac Test", "Coeliac Disease Test", "Gluten Allergy Test", "Anti tTG"],
  },
  "fecal-calprotectin-stool": {
    specialties: ["gastroenterology"],
    short: "Stool Calprotectin test",
    what: "Calprotectin in stool rises with inflammation of the bowel. It helps separate inflammatory bowel disease (Crohn's, ulcerative colitis) from irritable bowel syndrome and monitors flare-ups.",
    when: ["Long-standing diarrhoea or abdominal pain", "Monitoring known inflammatory bowel disease"],
    prep: "A stool sample is needed; we give you a collection container when you book.",
    terms: ["Faecal Calprotectin", "Fecal Calprotectin", "IBD Stool Test", "Calprotectin"],
  },
  "helicobacter-pylori-antigen-detection": {
    specialties: ["gastroenterology"],
    short: "H. pylori Antigen test",
    what: "Detects H. pylori antigen in stool, the bacteria behind many stomach ulcers and gastritis, and can also show whether treatment worked.",
    when: ["Recurrent acidity, upper-abdominal pain or ulcer symptoms", "To confirm the infection has cleared after treatment"],
    prep: "Antibiotics, acid-suppressing medicines (PPIs) and bismuth can affect the result, so mention them when booking.",
    terms: ["H Pylori Stool Antigen", "Helicobacter Pylori", "H pylori Test", "Stomach Infection Test"],
  },

  // ----------------------------------------------------- Oncology / markers
  "ca-125-ovarian-cancer-monitor-serum": {
    specialties: ["oncology-markers", "obgyn-pregnancy"],
    short: "CA 125 test",
    what: "CA 125 is a protein that is often raised in ovarian cancer. It is used to monitor treatment and recurrence, not as a stand-alone screening test, because fibroids, endometriosis and menstruation can also raise it.",
    when: ["Monitoring ovarian cancer treatment", "Evaluating a pelvic mass together with imaging", "As advised by your gynaecologist or oncologist"],
    terms: ["CA125", "Ovarian Cancer Marker", "CA 125 Ovarian"],
  },
  "ovarian-malignancy-risk-algorithm-roma-he4ca125": {
    specialties: ["oncology-markers", "obgyn-pregnancy"],
    short: "ROMA (HE4 + CA 125) test",
    what: "ROMA combines HE4 and CA 125 with menopausal status into a single score estimating the likelihood that a pelvic mass is ovarian cancer.",
    when: ["A pelvic or ovarian mass found on imaging, to help decide on referral to a specialist"],
    terms: ["ROMA", "HE4 and CA125", "HE4 Test", "Ovarian Malignancy Risk"],
  },
  "ca-15-3-serum": {
    specialties: ["oncology-markers"],
    short: "CA 15-3 test",
    what: "CA 15-3 is used to monitor treatment response and recurrence in breast cancer. It is not a screening test.",
    when: ["Monitoring known breast cancer as advised by your oncologist"],
    terms: ["CA15-3", "Breast Cancer Marker", "CA 15 3"],
  },
  "ca-19-9-serum": {
    specialties: ["oncology-markers", "gastroenterology"],
    short: "CA 19-9 test",
    what: "CA 19-9 is used to monitor pancreatic and some bile-duct and gut cancers. It can also rise in benign conditions, so it is not a screening test.",
    when: ["Monitoring known pancreatic or biliary cancer as advised by your oncologist"],
    terms: ["CA19-9", "Pancreatic Cancer Marker", "CA 19 9"],
  },
  "carcino-embryonic-antigen-serum": {
    specialties: ["oncology-markers", "gastroenterology"],
    short: "CEA test",
    what: "Carcinoembryonic antigen (CEA) is mainly used to monitor colorectal cancer treatment and recurrence. Smoking and some benign conditions can raise it.",
    when: ["Follow-up of colorectal cancer as advised by your oncologist"],
    terms: ["CEA", "Carcinoembryonic Antigen", "Colon Cancer Marker"],
  },
  "psa-free-total-serum": {
    specialties: ["oncology-markers"],
    short: "Free and Total PSA test",
    what: "Measures total PSA and the free fraction. The free-to-total ratio helps your doctor judge whether a mildly raised PSA is more likely to be benign prostate enlargement or something needing further work-up.",
    when: ["PSA in the borderline range", "Prostate screening in men over 50, as advised by a doctor"],
    prep: "Avoid ejaculation, cycling and prostate procedures for a day or two before the test, as they can raise PSA.",
    terms: ["Free PSA", "Total PSA", "PSA Free and Total", "Prostate Test"],
  },
};

module.exports = { SEO };
