// Customer-friendly names and "also known as" aliases for the lab catalog.
//
// The lab's own test names (e.g. "CBC-5, EDTA Whole Blood") are what the lab
// needs on an order, but they are hard for a customer to recognise or search
// for. This file is the single source of truth mapping a lab name (`rawName`,
// exactly as it appears in the catalog) to what the customer sees.
//
// - `name`:    the display name shown everywhere on the site.
// - `aliases`: other names a customer might search for or have heard from a
//              doctor (abbreviations, lay terms, older names). Shown as
//              "Also known as" and matched by search.
//
// Slugs are NOT derived from these names - they stay based on the original
// catalog name so existing URLs, carts, and bookings keep working.
//
// Only tests a customer is likely to look for are curated by hand. Everything
// else (histology stains, HLA typing, gene panels...) gets a conservative
// mechanical cleanup in friendlyFallback() rather than an invented name.
// Add or edit entries here, then run `node build.js`.

const CURATED = {
  // ---- Thyroid ----
  "TSH 3rd Gen Ultrasensitive, Serum": { name: "Thyroid Stimulating Hormone (TSH)", aliases: ["TSH", "Thyroid Stimulating Hormone", "Thyroid Test"] },
  "Thyroid Panel – TSH, Serum": { name: "Thyroid Function Test (T3,T4,TSH)", aliases: ["TFT", "Thyroid Profile", "Thyroid Test", "TSH Panel"] },
  "Thyroid Panel II (FT3, FT4, TSH), Serum": { name: "Free Thyroid Profile (FT3, FT4, TSH)", aliases: ["Thyroid Profile", "TFT", "Thyroid Panel", "Free T3 Free T4 TSH"] },
  "Free Thyroxine (FT4), Serum": { name: "Free T4 Test (Thyroxine)", aliases: ["FT4", "Free Thyroxine", "T4"] },
  "Free Triiodothyronine (FT3), Serum": { name: "Free T3 Test (Triiodothyronine)", aliases: ["FT3", "Free Triiodothyronine", "T3"] },
  "Anti-Thyroid Peroxidase Antibodies, Serum": { name: "Anti-TPO Test (Thyroid Antibodies)", aliases: ["Anti TPO", "TPO Antibodies", "Thyroid Peroxidase Antibodies"] },
  "Anti-Thyroglobulin Antibodies, Serum": { name: "Anti-Thyroglobulin Test (Anti-TG)", aliases: ["Anti TG", "Thyroglobulin Antibodies"] },
  "TSH Receptor Antibodies, Serum": { name: "TSH Receptor Antibody Test (TRAb)", aliases: ["TRAb", "TSH Receptor Antibodies"] },

  // ---- Diabetes / blood sugar ----
  "Glycosylated Hemoglobin (HbA1c)": { name: "HbA1c Test (3-Month Average Blood Sugar)", aliases: ["HbA1c", "A1C", "Glycosylated Hemoglobin", "Glycated Hemoglobin", "Diabetes Test"] },
  "Glucose Fasting,Fluoride Plasma": { name: "Fasting Blood Sugar (FBS)", aliases: ["FBS", "Fasting Glucose", "Fasting Sugar", "Sugar Test"] },
  "Glucose, Post-Prandial, Plasma": { name: "Post-Meal Blood Sugar (PPBS)", aliases: ["PPBS", "PP Sugar", "Post Prandial Glucose", "Postprandial Blood Sugar"] },
  "Glucose Random, Plasma": { name: "Random Blood Sugar (RBS)", aliases: ["RBS", "Random Glucose", "Random Sugar"] },
  "Blood Glucose- Fasting & Post Prandial": { name: "Fasting & Post-Meal Blood Sugar (FBS + PPBS)", aliases: ["FBS PPBS", "Sugar Fasting and PP"] },
  "Insulin, Fasting Serum": { name: "Fasting Insulin Test", aliases: ["Insulin Fasting", "Insulin Level"] },
  "Insulin, Serum (post-Prandial)": { name: "Post-Meal Insulin Test", aliases: ["PP Insulin", "Insulin Post Prandial"] },
  "Glucose Tolerance Test (GTT-2),Plasma": { name: "Glucose Tolerance Test (GTT) - 2 Hour", aliases: ["GTT", "OGTT", "Sugar Tolerance Test"] },
  "Glucose Tolerance Test, Plasma Fluoride": { name: "Glucose Tolerance Test (GTT)", aliases: ["GTT", "OGTT", "Sugar Tolerance Test"] },
  "Oral Glucose Tolerance Test - Gestational": { name: "Pregnancy Diabetes Test (Gestational GTT)", aliases: ["GTT", "OGTT", "GDM Test", "Gestational Diabetes Test", "Glucose Tolerance Test", "Pregnancy Sugar Test"] },
  "Gestational Glucose Tolerance (GTT) -3, Plasma": { name: "Pregnancy Diabetes Test - 3 Hour (Gestational GTT)", aliases: ["GTT", "OGTT", "GDM Test", "Gestational Diabetes Test", "Glucose Tolerance Test"] },
  "Glucose Challenge Test": { name: "Glucose Challenge Test (GCT)", aliases: ["GCT", "50g Glucose Test", "Pregnancy Sugar Screening"] },
  "Two Step Strategy for OGTT in GDM": { name: "Two-Step Pregnancy Diabetes Test (OGTT)", aliases: ["OGTT", "GDM Test", "Gestational Diabetes Test"] },
  "C Peptide, Serum": { name: "C-Peptide Test", aliases: ["C Peptide", "Insulin Production Test"] },
  "Homeostatic Model Assessment (homa) 2, Serum": { name: "Insulin Resistance Test (HOMA-IR)", aliases: ["HOMA", "HOMA2", "Insulin Resistance"] },
  "Glutamic Acid Decarboxylase Antibody": { name: "GAD Antibody Test (Type 1 Diabetes)", aliases: ["GAD", "Anti GAD", "GAD65"] },
  "Microalbumin, Urine": { name: "Urine Microalbumin Test (Kidney & Diabetes Screen)", aliases: ["Microalbumin", "Urine Albumin", "MAU"] },

  // ---- Blood count, anaemia, clotting ----
  "CBC with ESR (CBC+PS+ESR)": { name: "Complete Blood Count with ESR (CBC + ESR)", aliases: ["CBC ESR", "CBC with ESR", "Hemogram with ESR", "Full Blood Count with ESR"] },
  "CBC-5, EDTA Whole Blood": { name: "Complete Blood Count (CBC)", aliases: ["CBC", "Hemogram", "Full Blood Count", "FBC", "Blood Count", "CBC 5 Part"] },
  "CBC with Ps": { name: "Complete Blood Count with Blood Smear (CBC + PS)", aliases: ["CBC PS", "CBC with Peripheral Smear", "Peripheral Smear"] },
  "Hemoglobin by Cyanmethaemoglobin": { name: "Hemoglobin (Hb) Test", aliases: ["Hb", "Hemoglobin", "Haemoglobin", "Hgb", "Anaemia Test"] },
  "Hemoglobin Variant Analysis, Blood": { name: "Hemoglobin Variant Analysis (Thalassemia Screening)", aliases: ["Hb Electrophoresis", "Hemoglobin Electrophoresis", "Thalassemia Test"] },
  "Hemoglobin Variant Analysis - EDTA Whole Blood": { name: "Hemoglobin Variant Analysis - Whole Blood (Thalassemia Screening)", aliases: ["Hb Electrophoresis", "Hemoglobin Electrophoresis", "Thalassemia Test"] },
  "Serum Iron and TIBC Studies": { name: "Iron Studies (Iron & TIBC)", aliases: ["Iron Profile", "Iron Test", "TIBC", "Iron Deficiency Test"] },
  "Iron, Serum": { name: "Serum Iron Test", aliases: ["Iron", "Iron Level"] },
  "Total Iron Binding Capacity, Serum": { name: "TIBC Test (Total Iron Binding Capacity)", aliases: ["TIBC"] },
  "Ferritin, Serum": { name: "Ferritin Test (Iron Stores)", aliases: ["Ferritin", "Iron Storage Test"] },
  "ABO Group & Rh Type, EDTA Whole Blood": { name: "Blood Group Test (ABO & Rh)", aliases: ["Blood Group", "Blood Type", "Blood Grouping", "ABO Rh"] },
  "Platelet Count, EDTA Whole Blood": { name: "Platelet Count Test", aliases: ["Platelets", "Platelet Test", "PLT"] },
  "Erythrocyte Sedimentation Rate (ESR)": { name: "ESR Test (Erythrocyte Sedimentation Rate)", aliases: ["ESR", "Sed Rate"] },
  "Peripheral Smear Exam, EDTA Whole Blood": { name: "Peripheral Blood Smear Test", aliases: ["PS", "Blood Smear", "Peripheral Smear"] },
  "Reticulocyte Count, EDTA Whole Blood": { name: "Reticulocyte Count Test", aliases: ["Retic Count", "Retic"] },
  "RBC Count, Blood": { name: "Red Blood Cell (RBC) Count", aliases: ["RBC", "Red Cell Count"] },
  "Total Leukocyte Count": { name: "White Blood Cell Count (TLC)", aliases: ["TLC", "WBC Count", "Total Leucocyte Count", "WBC"] },
  "White Cell Count and Differential, EDTA Wb": { name: "White Blood Cell Count with Differential (TLC + DLC)", aliases: ["TLC DLC", "DLC", "WBC Differential"] },
  "Coombs Test, Direct, EDTA Whole Blood": { name: "Direct Coombs Test (DCT)", aliases: ["DCT", "Direct Antiglobulin Test", "DAT"] },
  "Indirect Coombs Test": { name: "Indirect Coombs Test (ICT)", aliases: ["ICT", "Indirect Antiglobulin Test"] },
  "G-6-Pd, Quantitative, Blood": { name: "G6PD Test (Enzyme Deficiency)", aliases: ["G6PD", "G-6-PD"] },
  "Sickling Test, EDTA Whole Blood": { name: "Sickle Cell Test (Sickling Test)", aliases: ["Sickling", "Sickle Cell"] },
  "Bleeding Time": { name: "Bleeding Time Test (BT)", aliases: ["BT"] },
  "Clotting Time, Blood": { name: "Clotting Time Test (CT)", aliases: ["CT", "Coagulation Time"] },
  "Bleeding Time & Clotting Time, EDTA Whole Blood": { name: "Bleeding & Clotting Time (BT + CT)", aliases: ["BT CT"] },
  "Prothrombin Time (PT/INR), Citrate Plasma": { name: "PT/INR Test (Blood Clotting Time)", aliases: ["PT", "INR", "Prothrombin Time", "Clotting Test", "Blood Thinner Test"] },
  "Activated Partial Thromboplastin Time (APTT)": { name: "APTT Test (Blood Clotting)", aliases: ["APTT", "aPTT", "PTT"] },
  "D-Dimer, Citrate Plasma": { name: "D-Dimer Test", aliases: ["D Dimer", "Blood Clot Test"] },
  "Quantitative D-Dimer, Citrate Plasma": { name: "D-Dimer Test (Quantitative)", aliases: ["D Dimer", "Blood Clot Test"] },
  "Fibrinogen, Citrate Plasma": { name: "Fibrinogen Test (Clotting Factor)", aliases: ["Fibrinogen"] },
  "Blood Coagulation Profile": { name: "Blood Coagulation Profile (Clotting Tests)", aliases: ["Coagulation Profile", "Coag Profile", "PT APTT"] },

  // ---- Vitamins ----
  "Folic Acid, Serum": { name: "Folic Acid Test (Vitamin B9)", aliases: ["Folate", "Vitamin B9", "Folic Acid"] },
  "Vitamin B12 (Cyanocobalamine), Serum": { name: "Vitamin B12 Test", aliases: ["B12", "Cobalamin", "Cyanocobalamin"] },
  "Vitamin D Total (25-Hydroxyvitamin D), Serum": { name: "Vitamin D Test (25-OH)", aliases: ["Vitamin D", "Vit D", "25 Hydroxy Vitamin D", "Vitamin D3", "25 OH Vitamin D"] },
  "25 Hydroxy Vitamin D Total (vitamin D2+vitamin D3)": { name: "Vitamin D Total Test (D2 + D3)", aliases: ["Vitamin D", "Vit D", "25 OH Vitamin D"] },
  "1, 25 Dihydroxy Vitamin D, Serum": { name: "Active Vitamin D Test (1,25-Dihydroxy)", aliases: ["1 25 Dihydroxy Vitamin D", "Calcitriol"] },

  // ---- Liver & pancreas ----
  "Liver Function Profile, Serum": { name: "Liver Function Test (LFT)", aliases: ["LFT", "Liver Panel", "Liver Profile", "Liver Test"] },
  "Liver Function Test (without Ggt)": { name: "Liver Function Test (LFT) - Without GGT", aliases: ["LFT", "Liver Test"] },
  "Bilirubin (Total, Direct, Indirect), Serum": { name: "Bilirubin Test (Total, Direct & Indirect)", aliases: ["Jaundice Test", "Bilirubin"] },
  "Bilirubin, Total, Serum": { name: "Total Bilirubin Test", aliases: ["Jaundice Test", "Bilirubin"] },
  "Bilirubin, Direct, Serum": { name: "Direct Bilirubin Test", aliases: ["Bilirubin"] },
  "Alanine Aminotransferase (ALT/SGPT), Serum": { name: "SGPT / ALT Test (Liver Enzyme)", aliases: ["ALT", "SGPT", "Alanine Aminotransferase", "Alanine Transaminase"] },
  "Aspartate Aminotransferase (AST/SGOT), Serum": { name: "SGOT / AST Test (Liver Enzyme)", aliases: ["AST", "SGOT", "Aspartate Aminotransferase"] },
  "Alkaline Phosphatase, Serum": { name: "Alkaline Phosphatase Test (ALP)", aliases: ["ALP", "Alk Phos"] },
  "Gamma Glutamyl Transferase, Serum": { name: "GGT Test (Liver Enzyme)", aliases: ["GGT", "Gamma GT", "GGTP"] },
  "Total Protein,Albumin,Globulin, Serum": { name: "Protein, Albumin & Globulin Test (A/G Ratio)", aliases: ["A/G Ratio", "AG Ratio", "Total Protein"] },
  "Fatty Liver Index,Serum": { name: "Fatty Liver Test (Fatty Liver Index)", aliases: ["FLI", "Fatty Liver"] },
  "Amylase, Serum": { name: "Amylase Test (Pancreas)", aliases: ["Amylase", "Pancreatitis Test"] },
  "Lipase, Serum": { name: "Lipase Test (Pancreas)", aliases: ["Lipase", "Pancreatitis Test"] },

  // ---- Kidney & electrolytes ----
  "Kidney Function Test": { name: "Kidney Function Test (KFT)", aliases: ["KFT", "RFT", "Renal Function Test", "Kidney Profile", "Kidney Panel"] },
  "Creatinine, Serum": { name: "Serum Creatinine Test", aliases: ["Creatinine", "Kidney Test"] },
  "Blood Urea Nitrogen (BUN), Serum": { name: "Blood Urea Nitrogen (BUN) Test", aliases: ["BUN", "Urea Nitrogen"] },
  "Uric Acid, Serum": { name: "Uric Acid Test", aliases: ["Gout Test", "Uric Acid"] },
  "Electrolytes (Na/K/Cl), Serum": { name: "Electrolytes Test (Sodium, Potassium, Chloride)", aliases: ["Electrolytes", "Na K Cl", "Serum Electrolytes"] },
  "Calcium, Serum": { name: "Calcium Test", aliases: ["Calcium"] },
  "Sodium, Serum": { name: "Sodium Test", aliases: ["Sodium", "Na"] },
  "Potassium, Serum": { name: "Potassium Test", aliases: ["Potassium", "K"] },
  "Chloride, Serum": { name: "Chloride Test", aliases: ["Chloride"] },
  "Magnesium, Serum": { name: "Magnesium Test", aliases: ["Magnesium"] },
  "Phosphorus, Serum": { name: "Phosphorus Test", aliases: ["Phosphorus", "Phosphate"] },
  "Bicarbonate, Serum": { name: "Bicarbonate Test", aliases: ["Bicarbonate", "HCO3"] },
  "Creatinine Egfr": { name: "Creatinine with eGFR (Kidney Filtration Rate)", aliases: ["eGFR", "GFR"] },
  "Creatinine Clearance, Serum and Urine": { name: "Creatinine Clearance Test", aliases: ["Creatinine Clearance"] },
  "Urinary Protein Creatinine Ratio": { name: "Urine Protein-Creatinine Ratio (UPCR)", aliases: ["UPCR", "Urine Protein"] },
  "Albumin/Creatinine Ratio, Random, Urine": { name: "Urine Albumin-Creatinine Ratio (ACR)", aliases: ["ACR", "UACR", "Microalbumin Creatinine Ratio"] },
  "Urine Protein (24 Hrs / Spot Urine)": { name: "Urine Protein Test (24 Hr / Spot)", aliases: ["Urine Protein", "Proteinuria Test"] },
  "Protein, 24hrs Urine": { name: "24-Hour Urine Protein Test", aliases: ["24 Hr Urine Protein"] },
  "Glucose, Urine": { name: "Urine Glucose Test (Urine Sugar)", aliases: ["Urine Sugar", "Urine Glucose"] },
  "Calculus Analysis By Automated Ftir": { name: "Kidney Stone Analysis (FTIR)", aliases: ["Stone Analysis", "Calculus Analysis", "Kidney Stone Test"] },

  // ---- Heart & cholesterol ----
  "Lipid Profile, Serum": { name: "Lipid Profile (Cholesterol Test)", aliases: ["Lipid Profile", "Cholesterol Test", "Lipid Panel", "Cholesterol Panel"] },
  "Lipid Profile - Non Fasting, Serum": { name: "Lipid Profile - Non-Fasting (Cholesterol Test)", aliases: ["Lipid Profile", "Cholesterol Test", "Lipid Panel"] },
  "Cholesterol, Serum": { name: "Total Cholesterol Test", aliases: ["Cholesterol"] },
  "Triglycerides, Serum": { name: "Triglycerides Test", aliases: ["TG", "Triglyceride"] },
  "HDL Cholesterol, Serum": { name: "HDL Cholesterol Test (Good Cholesterol)", aliases: ["HDL", "Good Cholesterol"] },
  "Direct LDL Cholesterol, Serum": { name: "LDL Cholesterol Test (Bad Cholesterol)", aliases: ["LDL", "Bad Cholesterol", "Direct LDL"] },
  "Apolipoprotein A1 (ApoA1)": { name: "Apolipoprotein A1 (ApoA1) Test", aliases: ["Apo A1", "Apo (A1)", "ApoA1", "Apo A-I", "Apolipoprotein A-I", "Apolipoprotein A1", "HDL Protein Test"] },
  "Apolipoprotein B (ApoB)": { name: "Apolipoprotein B (ApoB) Test", aliases: ["Apo B", "Apo (B)", "ApoB", "Apo B-100", "Apolipoprotein B-100", "Apolipoprotein B", "LDL Particle Count Test"] },
  "Lipoprotein (a), Serum": { name: "Lipoprotein(a) Test (Lp(a))", aliases: ["Lp(a)", "Lipoprotein A"] },
  "Homocysteine, Serum/Plasma": { name: "Homocysteine Test", aliases: ["Homocysteine", "Heart Risk Test"] },
  "H S Troponin I, Serum": { name: "Troponin I Test (High Sensitivity)", aliases: ["Troponin", "hs-Troponin I", "Heart Attack Test"] },
  "Troponin T - Hs, Serum": { name: "Troponin T Test (High Sensitivity)", aliases: ["Troponin", "hs-Troponin T", "Heart Attack Test"] },
  "Creatine Kinase - Mb, Serum": { name: "CK-MB Test (Heart Enzyme)", aliases: ["CK MB", "CKMB", "Cardiac Enzyme"] },
  "Creatine Kinase (CPK), Serum": { name: "CPK Test (Creatine Kinase)", aliases: ["CPK", "CK", "Creatine Phosphokinase"] },
  "N-Terminal Pro B-Type Natriuretic Peptide, Serum": { name: "NT-proBNP Test (Heart Failure Marker)", aliases: ["NT proBNP", "BNP", "Heart Failure Test"] },
  "Cardiac Enzyme Panel, Serum": { name: "Cardiac Enzyme Panel (Heart Enzymes)", aliases: ["Cardiac Markers", "Heart Attack Panel"] },
  "Lactate Dehydrogenase, Serum": { name: "LDH Test (Lactate Dehydrogenase)", aliases: ["LDH"] },

  // ---- Hormones & fertility ----
  "LH, FSH, Prolactin, Serum": { name: "Fertility Hormone Panel (LH, FSH, Prolactin)", aliases: ["LH FSH Prolactin", "Hormone Profile", "Infertility Hormones"] },
  "AMH / MIS, Serum": { name: "AMH / MIS Test (Ovarian Reserve)", aliases: ["AMH", "Anti Mullerian Hormone", "Ovarian Reserve Test", "Egg Reserve", "Fertility Test"] },
  "Anti Mullerian Hormone": { name: "AMH Test (Ovarian Reserve)", aliases: ["AMH", "Anti Mullerian Hormone", "Ovarian Reserve Test", "Egg Reserve", "Fertility Test"] },
  "Luteinizing Hormone (LH), Serum": { name: "LH Test (Luteinizing Hormone)", aliases: ["LH", "Ovulation Hormone"] },
  "Follicle Stimulating Hormone (FSH), Serum": { name: "FSH Test (Follicle Stimulating Hormone)", aliases: ["FSH"] },
  "FSH & LH Evaluation, Serum": { name: "FSH & LH Test (Fertility Hormones)", aliases: ["FSH LH", "Fertility Hormones"] },
  "Prolactin, Serum": { name: "Prolactin Test", aliases: ["PRL"] },
  "Estradiol (E2), Serum": { name: "Estradiol Test (E2)", aliases: ["E2", "Oestradiol", "Estrogen Test"] },
  "Testosterone, Total, Serum": { name: "Total Testosterone Test", aliases: ["Testosterone"] },
  "Free Testosterone, Serum": { name: "Free Testosterone Test", aliases: ["Testosterone"] },
  "Testosterone,Free/Total, Serum": { name: "Testosterone Test (Free & Total)", aliases: ["Testosterone"] },
  "Progesterone, Serum": { name: "Progesterone Test", aliases: ["P4"] },
  "17-a-Hydroxyprogesterone, Serum": { name: "17-OH Progesterone Test (17-OHP)", aliases: ["17 OHP", "17-Hydroxyprogesterone"] },
  "Cortisol, Serum": { name: "Cortisol Test (Stress Hormone)", aliases: ["Cortisol"] },
  "Dehydroepiandrosterone-S, Serum": { name: "DHEA-S Test", aliases: ["DHEAS", "DHEA Sulphate"] },
  "Adrenocorticotropic Hormone, Plasma": { name: "ACTH Test (Adrenocorticotropic Hormone)", aliases: ["ACTH"] },
  "Insulin Like Growth Factor - I, Serum": { name: "IGF-1 Test (Growth Hormone Marker)", aliases: ["IGF1", "IGF 1", "Somatomedin C"] },
  "Pth(intact),EDTA & Calcium, Serum": { name: "PTH & Calcium Test (Parathyroid Hormone)", aliases: ["PTH", "Parathyroid Test", "Intact PTH"] },
  "Erythropoietin, Serum": { name: "EPO Test (Erythropoietin)", aliases: ["EPO"] },
  "PCOS Basic": { name: "PCOS Basic Panel", aliases: ["PCOD", "PCOS Test", "PCOD Test"] },
  "PCOS Total": { name: "PCOS Total Panel", aliases: ["PCOD", "PCOS Test", "PCOD Test"] },
  "Pcod Panel": { name: "PCOD Panel", aliases: ["PCOS", "PCOS Test", "PCOD Test"] },
  "Semen Analysis": { name: "Semen Analysis (Sperm Count Test)", aliases: ["Sperm Test", "Sperm Count", "Male Fertility Test", "Semen Test"] },
  "Y-Chromosome Microdeletion PCR, EDTA Blood": { name: "Y-Chromosome Microdeletion Test (Male Infertility)", aliases: ["Y Microdeletion", "Male Infertility Genetic Test"] },
  "Couple Karyotyping (pblc)": { name: "Couple Karyotyping (Chromosome Test)", aliases: ["Karyotype", "Chromosome Test", "Infertility Genetic Test"] },

  // ---- Pregnancy ----
  "HCG, Serum": { name: "Pregnancy Blood Test (Beta hCG)", aliases: ["hCG", "Beta hCG", "Pregnancy Test", "Preg Test"] },
  "Pregnancy Test, Spot Urine (upt)": { name: "Urine Pregnancy Test (UPT)", aliases: ["UPT", "Pregnancy Test", "Home Pregnancy Test"] },
  "Double Marker Test, Serum": { name: "Double Marker Test (First Trimester Screening)", aliases: ["Double Marker", "Dual Marker", "First Trimester Screening", "Down Syndrome Screening", "Combined Screening"] },
  "Dual Marker (fmf) By Trf Method,Serum": { name: "Dual Marker Test - FMF (First Trimester Screening)", aliases: ["Dual Marker", "Double Marker", "FMF"] },
  "Quadruple Marker Test, Serum": { name: "Quadruple Marker Test (Second Trimester Screening)", aliases: ["Quad Marker", "Quadruple Marker", "Second Trimester Screening", "Down Syndrome Screening"] },
  "Quadruple Marker, Serum": { name: "Quad Marker Test - Serum (Second Trimester)", aliases: ["Quadruple Marker", "Second Trimester Screening", "Down Syndrome Screening"] },
  "Triple Marker Test By Trf Method, Serum": { name: "Triple Marker Test (Second Trimester Screening)", aliases: ["Triple Marker", "Triple Test", "Down Syndrome Screening"] },
  "Triple Test": { name: "Triple Test (Pregnancy Screening)", aliases: ["Triple Marker", "Down Syndrome Screening"] },
  "Efts (1st Trimester Quad) with Preeclampsia, Serum": { name: "First Trimester Screening with Preeclampsia Risk (EFTS)", aliases: ["EFTS", "Preeclampsia Test", "First Trimester Screening"] },
  "NIPT": { name: "NIPT Test (Non-Invasive Prenatal Test)", aliases: ["NIPT", "NIPS", "Non Invasive Prenatal Test", "Prenatal Genetic Screening", "Down Syndrome Blood Test", "Baby Chromosome Test"] },
  "NIPT with Microdeletion": { name: "NIPT Test with Microdeletion Screening", aliases: ["NIPT Microdeletion", "NIPT Plus", "Non Invasive Prenatal Test"] },
  "TORCH IgG & IgM Evaluation, Serum": { name: "TORCH Test (IgG & IgM) - Pregnancy Infection Screen", aliases: ["TORCH", "TORCH Profile", "TORCH Panel", "Toxoplasma Rubella CMV Herpes"] },
  "TORCH IgM [5 Parameters]": { name: "TORCH IgM Test (5 Parameters)", aliases: ["TORCH", "TORCH Panel"] },
  "TORCH IgG Evaluation, Serum": { name: "TORCH IgG Test", aliases: ["TORCH", "TORCH Panel"] },
  "TORCH IGG & IGM Abs (eia)": { name: "TORCH IgG & IgM Antibodies Test (EIA)", aliases: ["TORCH", "TORCH Panel"] },
  "Rubella IGG & IGM, Serum": { name: "Rubella Test (IgG & IgM)", aliases: ["Rubella", "German Measles Test"] },
  "Rubella IGG Antibodies, Serum": { name: "Rubella Immunity Test (IgG)", aliases: ["Rubella", "German Measles Test"] },
  "Toxoplasma IGG & IGM Antibodies, Serum": { name: "Toxoplasma Test (IgG & IgM)", aliases: ["Toxoplasma", "Toxoplasmosis Test"] },
  "Cytomegalovirus IGG & IGM, Serum": { name: "CMV Test (IgG & IgM)", aliases: ["CMV", "Cytomegalovirus"] },
  "Herpes Simplex Virus 1&2 IGG & IGM, Serum": { name: "Herpes (HSV 1 & 2) Test (IgG & IgM)", aliases: ["HSV", "Herpes Test"] },
  "Ante-Natal Panel": { name: "Antenatal Panel (Pregnancy Checkup)", aliases: ["ANC Panel", "Antenatal Profile", "Pregnancy Panel"] },
  "Antenatal Panel Advance": { name: "Advanced Antenatal Panel (Pregnancy Checkup)", aliases: ["ANC Panel", "Antenatal Profile", "Pregnancy Panel"] },
  "Antenatal Screen": { name: "Antenatal Screening Panel (Pregnancy Checkup)", aliases: ["ANC Panel", "Antenatal Profile", "Pregnancy Panel"] },

  // ---- Women's & men's health screening, cancer markers ----
  "Papanicolaou Smear": { name: "Pap Smear Test (Cervical Cancer Screening)", aliases: ["Pap Test", "Pap Smear", "Cervical Cancer Screening"] },
  "Liquid-Based Cytology": { name: "Liquid-Based Cytology (Cervical Cancer Screening)", aliases: ["LBC", "Pap Test", "Cervical Screening"] },
  "Pap Duo-Lbc+hpv DNA Detector": { name: "Pap Smear + HPV Test (Cervical Cancer Screening)", aliases: ["Pap Duo", "HPV Test", "Cervical Screening"] },
  "HPV DNA Detector": { name: "HPV DNA Test (Cervical Cancer Screening)", aliases: ["HPV", "HPV Test"] },
  "Prostate Specific Antigen (PSA), Serum": { name: "PSA Test (Prostate Screening)", aliases: ["PSA", "Prostate Test", "Prostate Specific Antigen"] },
  "PSA Free & Total, Serum": { name: "PSA Test - Free & Total (Prostate Screening)", aliases: ["PSA", "Prostate Test"] },
  "CA 125 (Ovarian Cancer Monitor), Serum": { name: "CA 125 Test (Ovarian Cancer Marker)", aliases: ["CA125", "Ovarian Cancer Marker"] },
  "CA 15-3, Serum": { name: "CA 15-3 Test (Breast Cancer Marker)", aliases: ["CA153", "Breast Cancer Marker"] },
  "CA 19-9, Serum": { name: "CA 19-9 Test (Pancreatic Cancer Marker)", aliases: ["CA199", "Pancreatic Cancer Marker"] },
  "Alpha-Fetoprotein (AFP), Serum": { name: "AFP Test (Alpha-Fetoprotein)", aliases: ["AFP", "Liver Cancer Marker"] },
  "Carcino Embryonic Antigen, Serum": { name: "CEA Test (Carcinoembryonic Antigen)", aliases: ["CEA", "Cancer Marker"] },
  "Small Tissue Biopsy": { name: "Biopsy - Small Tissue (Histopathology)", aliases: ["Biopsy", "HPE", "Histopathology"] },
  "Fine Needle Aspiration Cytology, Smears": { name: "FNAC Test (Fine Needle Aspiration Cytology)", aliases: ["FNAC", "FNA", "Lump Test"] },

  // ---- Infections ----
  "HCV Antibodies, Serum": { name: "Hepatitis C Test (HCV Antibodies)", aliases: ["HCV", "Hepatitis C", "Hep C"] },
  "Hepatitis C Antibodies, Serum": { name: "Hepatitis C Test (Anti-HCV)", aliases: ["HCV", "Hepatitis C", "Hep C"] },
  "HIV Antibodies, Serum": { name: "HIV Test (HIV 1 & 2 Antibodies)", aliases: ["HIV", "AIDS Test", "HIV 1 2"] },
  "HIV Screening 4th Gen Assay, Serum": { name: "HIV Test - 4th Generation (Antigen + Antibody)", aliases: ["HIV", "AIDS Test", "HIV Combo"] },
  "Hepatitis B Surface Antigen (HBsAg), Serum": { name: "Hepatitis B Test (HBsAg)", aliases: ["HBsAg", "Hepatitis B", "Hep B", "Australia Antigen"] },
  "Hepatitis B Surface Antigen, Serum": { name: "Hepatitis B Surface Antigen Test (HBsAg)", aliases: ["HBsAg", "Hepatitis B", "Hep B"] },
  "Hepatitis B Surface Abs (quant), Serum": { name: "Hepatitis B Immunity Test (Anti-HBs)", aliases: ["Anti HBs", "HBsAb", "Hep B Antibody"] },
  "Hepatitis a IGM, Serum": { name: "Hepatitis A Test (IgM)", aliases: ["Hepatitis A", "Hep A"] },
  "Hepatitis E IGM, Serum": { name: "Hepatitis E Test (IgM)", aliases: ["Hepatitis E", "Hep E"] },
  "Widal Test, Serum": { name: "Widal Test (Typhoid Fever)", aliases: ["Widal", "Typhoid Test", "Typhoid Fever Test"] },
  "Rapid Typhi IGM, Serum/Plasma EDTA/EDTA Wb": { name: "Typhoid Rapid Test (Typhi IgM)", aliases: ["Typhidot", "Typhoid Test"] },
  "Dengue Duo Rapid Screening Test": { name: "Dengue Rapid Test (NS1 + Antibodies)", aliases: ["Dengue", "Dengue Test", "Dengue Fever Test", "Dengue Duo"] },
  "Dengue Duo Rapid Screening Test, Serum": { name: "Dengue Rapid Test - Serum (NS1 + Antibodies)", aliases: ["Dengue", "Dengue Test", "Dengue Fever Test", "Dengue Duo"] },
  "Dengue Ns1 Antigen Test, Serum": { name: "Dengue NS1 Antigen Test", aliases: ["Dengue NS1", "Dengue Test", "Dengue Fever Test"] },
  "Malaria Antigen Detection, Whole Blood": { name: "Malaria Rapid Test (Antigen)", aliases: ["Malaria", "Malaria Test", "MP Antigen"] },
  "Malarial Parasite (m.p), EDTA Whole Blood/Smear": { name: "Malaria Parasite Test (MP Smear)", aliases: ["MP", "Malaria Test", "Malaria Smear"] },
  "Chikungunya IGM Antibodies Rapid, Serum": { name: "Chikungunya Rapid Test (IgM)", aliases: ["Chikungunya"] },
  "Scrub Typhus IGM, Serum": { name: "Scrub Typhus Test (IgM)", aliases: ["Scrub Typhus"] },
  "Leptospira IGM, Serum": { name: "Leptospirosis Test (IgM)", aliases: ["Leptospira", "Rat Fever"] },
  "Brucella IGG & IGM, Serum": { name: "Brucella Test (IgG & IgM)", aliases: ["Brucella", "Brucellosis Test"] },
  "VDRL (modified),Serum": { name: "VDRL Test (Syphilis Screening)", aliases: ["VDRL", "Syphilis Test", "STD Test"] },
  "T. Pallidum Hemagglutination, Serum": { name: "Syphilis Confirmatory Test (TPHA)", aliases: ["TPHA", "Syphilis Test"] },
  "Helicobacter Pylori Antigen Detection": { name: "H. Pylori Test (Antigen)", aliases: ["H Pylori", "Helicobacter Pylori", "Stomach Infection Test", "Ulcer Bacteria Test"] },
  "Stool: Ova & Parasite": { name: "Stool Test for Worms & Parasites (Ova & Parasite)", aliases: ["Stool Routine", "Stool Ova and Cyst", "Stool Test", "Worms Test"] },
  "Stool for Occult Blood": { name: "Stool Occult Blood Test", aliases: ["FOBT", "Hidden Blood in Stool", "Occult Blood"] },
  "Fecal Calprotectin, Stool": { name: "Stool Calprotectin Test (Gut Inflammation)", aliases: ["Calprotectin", "IBD Test"] },
  "Urinalysis": { name: "Urine Routine Test (Urinalysis)", aliases: ["Urine Routine", "Urine R/M", "Urine Routine and Microscopy", "Complete Urine Examination", "CUE", "Urine Test"] },
  "Culture, Urine with Susceptibility": { name: "Urine Culture & Sensitivity Test", aliases: ["Urine Culture", "Urine C/S", "UTI Test", "Urine Infection Test"] },
  "Urine Culture and Sensitivity": { name: "Urine Culture & Sensitivity (C/S)", aliases: ["Urine Culture", "Urine C/S", "UTI Test", "Urine Infection Test"] },
  "Stool for Culture & Sensitivity, Aerobic": { name: "Stool Culture & Sensitivity Test", aliases: ["Stool C/S", "Stool Culture"] },
  "Throat Swab Culture + Susceptibility": { name: "Throat Swab Culture & Sensitivity Test", aliases: ["Throat Culture", "Throat Infection Test"] },
  "Pus Culture & Sensitivity, Aerobic": { name: "Pus Culture & Sensitivity Test", aliases: ["Pus Culture", "Wound Culture"] },
  "Culture,Blood and Susceptibility": { name: "Blood Culture & Sensitivity Test", aliases: ["Blood Culture", "Blood C/S"] },
  "Blood Culture & Susceptibility": { name: "Blood Culture & Sensitivity (Bacterial Infection)", aliases: ["Blood Culture", "Blood C/S"] },
  "Skin Test Mantoux": { name: "Mantoux Test (TB Skin Test)", aliases: ["Mantoux", "TB Test", "Tuberculin Skin Test", "PPD"] },
  "Tbferon (m Tuberculosis Igra)": { name: "TB Blood Test (IGRA)", aliases: ["Tbferon", "TB Test", "Tuberculosis Test", "Quantiferon"] },
  "Acid Fast Bacilli Smear": { name: "TB Smear Test (AFB)", aliases: ["AFB", "Sputum AFB", "TB Test"] },
  "AFB Culture": { name: "TB Culture Test (AFB Culture)", aliases: ["AFB", "TB Culture", "TB Test"] },
  "Xpert Mtb/Rif - Pulmonary": { name: "TB PCR Test - Lungs (CBNAAT / GeneXpert)", aliases: ["CBNAAT", "GeneXpert", "Xpert MTB RIF", "TB PCR", "TB Test"] },
  "Flu Real Time PCR": { name: "Flu PCR Test (Influenza)", aliases: ["Influenza", "Flu Test"] },
  "H1n1 /Swine Flu By PCR": { name: "Swine Flu Test (H1N1 PCR)", aliases: ["H1N1", "Swine Flu"] },
  "HIV Viral Load By Real Time PCR": { name: "HIV Viral Load Test (PCR)", aliases: ["HIV RNA", "Viral Load"] },
  "Hbv Viral Load By Real Time PCR": { name: "Hepatitis B Viral Load Test (PCR)", aliases: ["HBV DNA", "Hep B Viral Load"] },
  "HCV Viral Load By Real Time PCR": { name: "Hepatitis C Viral Load Test (PCR)", aliases: ["HCV RNA", "Hep C Viral Load"] },
  "CMV Viral Load Real Time PCR": { name: "CMV Viral Load Test (PCR)", aliases: ["CMV", "Viral Load"] },
  "Procalcitonin, Serum": { name: "Procalcitonin Test (Bacterial Infection Marker)", aliases: ["PCT", "Sepsis Marker"] },
  "C-Reactive Protein (CRP), Serum (Quantitative)": { name: "CRP Test (C-Reactive Protein)", aliases: ["CRP", "Inflammation Test", "C Reactive Protein"] },
  "High Sensitivity C-Reactive Protein, Serum": { name: "hs-CRP Test (Heart Risk & Inflammation)", aliases: ["hsCRP", "High Sensitivity CRP", "Cardiac CRP"] },
  "CRP, Semi-Quantitative, Serum": { name: "CRP Test (Semi-Quantitative)", aliases: ["CRP", "Inflammation Test"] },
  "Adenosine Deaminase": { name: "ADA Test (Adenosine Deaminase)", aliases: ["ADA", "TB Marker"] },
  "Lymphocyte Subset(cd4% & Absolute Count), Blood": { name: "CD4 Count Test (HIV Immune Status)", aliases: ["CD4", "CD4 Count", "CD4 Absolute"] },

  // ---- Arthritis & autoimmune, allergy ----
  "Antistreptolysin O, Serum": { name: "ASO Test (Antistreptolysin O)", aliases: ["ASO", "ASLO", "ASO Titre"] },
  "Antistreptolysin - O, Serum Quantitative": { name: "ASO Test - Quantitative (Antistreptolysin O)", aliases: ["ASO", "ASLO", "ASO Titre"] },
  "Rheumatoid Factor, Serum": { name: "Rheumatoid Factor Test (RA Factor)", aliases: ["RF", "RA Factor", "RA Test", "Arthritis Test"] },
  "Rheumatoid Factor Quantitative, Serum": { name: "Rheumatoid Factor Test - Quantitative (RA Factor)", aliases: ["RF", "RA Factor", "RA Test", "Arthritis Test"] },
  "Anti - Ccp Antibodies, Serum": { name: "Anti-CCP Test (Rheumatoid Arthritis)", aliases: ["Anti CCP", "CCP", "Arthritis Test"] },
  "Anti Nuclear Antibody (ANA), IFA, Serum": { name: "ANA Test (Antinuclear Antibody)", aliases: ["ANA", "ANA IFA", "Lupus Test", "Autoimmune Test"] },
  "Double Stranded DNA, IFA, Serum": { name: "Anti-dsDNA Test (Lupus)", aliases: ["dsDNA", "Anti ds DNA", "Lupus Test"] },
  "Total IgE, Serum": { name: "Total IgE Test (Allergy Marker)", aliases: ["IgE", "Allergy Test"] },
  "Tissue Transglutaminase IGA, Serum": { name: "Celiac Disease Test (tTG IgA)", aliases: ["tTG", "Anti tTG", "Gluten Allergy Test", "Celiac Test", "Coeliac Test"] },
  "Protein Electrophoresis, Serum": { name: "Serum Protein Electrophoresis (SPEP)", aliases: ["SPEP", "M Band", "Myeloma Screening", "Protein Electrophoresis"] },
  "HLA B27 By PCR": { name: "HLA-B27 Test (PCR)", aliases: ["HLA B27", "B27", "Ankylosing Spondylitis Test"] },
  "HLA-B27, Flow Cytometry, Blood": { name: "HLA-B27 Test (Flow Cytometry)", aliases: ["HLA B27", "B27", "Ankylosing Spondylitis Test"] },
  "Mthfr Gene Mutation": { name: "MTHFR Gene Mutation Test", aliases: ["MTHFR"] },
  "Factor V Mutation Detection, EDTA Blood": { name: "Factor V Mutation Test", aliases: ["Factor V Leiden", "Clotting Gene Test"] },

  // ---- General ----
  "Preoperative Panel": { name: "Pre-Operative Panel (Surgery Checkup)", aliases: ["Pre Op Profile", "Pre Surgery Tests", "PAC"] },
};

// Words that already make a name read as a complete test/package, so the
// fallback shouldn't tack " Test" onto it.
const COMPLETE_NAME = /\b(test|panel|profile|screen|screening|count|time|study|studies|analysis|evaluation|culture|smear|stain|ratio|typing|sequencing|detection|assay|check ?up|package|monitor|antibodies?|antigen|index|exome|biopsy|cytology|fluid|examination|enumeration|genotyping|next)\b/i;

// Specimen suffixes that mean nothing to a customer and only add noise.
const IGNORABLE_SPECIMEN = /,\s*(Serum|Plasma|Citrate Plasma|Plasma Fluoride|EDTA Whole Blood|EDTA Blood|EDTA Wb|Whole Blood|Blood|Serum\/Plasma|Serum\/EDTA Plasma)\s*$/i;

// Conservative mechanical cleanup for tests that aren't curated: it only
// fixes formatting and drops meaningless specimen suffixes - it never invents
// a medical meaning for a name it doesn't understand.
function friendlyFallback(displayName) {
  let out = displayName.trim();
  const hadIgnorableSpecimen = IGNORABLE_SPECIMEN.test(out);
  out = out.replace(IGNORABLE_SPECIMEN, "");
  out = out
    .replace(/,(?=\S)/g, ", ") // "Fasting,Fluoride" -> "Fasting, Fluoride"
    .replace(/\s+,/g, ",")
    .replace(/\bIG([GMAED]\d*)\b/gi, (_, t) => `Ig${t.toUpperCase()}`) // IGG -> IgG
    // "Abs" is "Absolute" before a blood-cell type ("Abs Eosinophil Count") but
    // "Antibodies" everywhere else ("HIV Abs", "Abs to Extractable Nuclear...").
    .replace(/\bAbs\b(?=\s+(?:Eosinophil|Basophil|Lymphocyte|Monocyte|Neutrophil)\b)/g, "Absolute")
    .replace(/\bAbs\b/g, "Antibodies")
    .replace(/\bAb\b/g, "Antibody")
    .replace(/\b(\d+)\s*hrs?\b/gi, "$1 Hr")
    .replace(/\bHrs\b/g, "Hr")
    .replace(/\bIii\b/g, "III")
    .replace(/\bIi\b/g, "II")
    .replace(/\b(Hbv|Hcv|Hiv|Hpv|Hla|Cmv|Pcr|Dna|Rna)\b/g, (m) => m.toUpperCase())
    .replace(/\s{2,}/g, " ")
    .trim();
  // A bare analyte that lost its specimen reads better as "Calcium Test".
  if (hadIgnorableSpecimen && out.split(/\s+/).length <= 3 && !COMPLETE_NAME.test(out)) out += " Test";
  return out;
}

// The catalog stores many lab names in ALL CAPS ("CBC-5, EDTA WHOLE BLOOD"), so
// curated keys are matched ignoring case and extra whitespace.
function normKey(s) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}
const CURATED_BY_KEY = new Map(Object.entries(CURATED).map(([k, v]) => [normKey(k), v]));

function friendlyNameFor(rawName, displayName) {
  const curated = CURATED_BY_KEY.get(normKey(rawName));
  if (curated) return { name: curated.name, aliases: curated.aliases || [], curated: true };
  return { name: friendlyFallback(displayName), aliases: [], curated: false };
}

module.exports = { CURATED, normKey, friendlyNameFor, friendlyFallback };
