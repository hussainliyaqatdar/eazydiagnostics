// Builds docs/specialised-tests-keywords.csv: the target search phrases for every
// specialised test page (the ones with curated SEO content), grouped by intent and
// priority. Run with: node scripts/keyword-map.js
//
// The phrases follow how patients and doctors search: "<test> home collection
// Bangalore", "<test> Agilus / SRL Diagnostics", price, "near me", the areas we
// serve, and the informational questions AI assistants answer ("what is...",
// "when is it done", "how to prepare"). Search VOLUMES are not in here - the list
// is a tracking set to load into Search Console / a rank tracker, which is where
// the real impressions and positions show up.
const fs = require("fs");
const path = require("path");

const tests = require("../data/tests.json").filter((t) => t.seo);
const AREAS = ["JP Nagar", "Jayanagar", "BTM Layout", "Banashankari", "Kanakpura Road"];

// "NIPT test" -> "NIPT"; the patterns add " test" themselves.
// A trailing "(ApoB)" is dropped from the main name (it becomes an alias below); a
// tight "Lipoprotein(a)" stays whole.
function core(short) {
  return short.replace(/\s+test$/i, "").replace(/\s+\([^)]*\)\s*$/, "").trim();
}

// The names people use for the same test (short name first, then aliases that
// read like real search terms).
function names(t) {
  const out = [core(t.seo.short)];
  const paren = t.seo.short.match(/\s+\(([^)]{2,12})\)(?:\s+test)?$/);
  if (paren) out.push(paren[1]);
  for (const a of t.aliases) {
    const n = a.replace(/\s+test$/i, "").trim();
    if (n.length < 3 || n.length > 40) continue;
    if (/near me|blood test|at home|level|screening test/i.test(n)) continue;
    if (!out.some((o) => o.toLowerCase() === n.toLowerCase())) out.push(n);
    if (out.length >= 5) break;
  }
  return out;
}

const rows = [["slug", "test", "page", "primary_specialty", "priority", "intent", "keyword"]];
for (const t of tests) {
  const [main, ...alts] = names(t);
  const add = (priority, intent, keyword) =>
    rows.push([t.slug, t.name, `/tests/${t.slug}`, t.seo.specialties[0], priority, intent, keyword]);

  // P1: the head phrases the page must win - local transactional + the lab brand.
  add("P1", "local-transactional", `${main} test home collection Bangalore`);
  add("P1", "local-transactional", `${main} test at home Bangalore`);
  add("P1", "local-transactional", `${main} test in Bangalore`);
  add("P1", "price", `${main} test price Bangalore`);
  add("P1", "brand", `${main} test Agilus Diagnostics`);
  add("P1", "brand", `${main} test SRL Diagnostics`);

  // P2: close variants, "near me", cost, brand + price, and each area we serve.
  add("P2", "local-transactional", `book ${main} test online Bangalore`);
  add("P2", "local-transactional", `${main} test near me`);
  add("P2", "price", `${main} test cost`);
  add("P2", "brand", `Agilus ${main} test price`);
  add("P2", "brand", `SRL ${main} test Bangalore`);
  for (const a of AREAS) add("P2", "local-area", `${main} test ${a}`);

  // Other names for the same test: same local + price intent, so a search by an
  // alias (e.g. "Apo B", "PCT") lands here too.
  for (const alt of alts) {
    add("P2", "alias", `${alt} test home collection Bangalore`);
    add("P2", "alias", `${alt} test price Bangalore`);
  }

  // P3: informational / AI-assistant questions (answered by the page's FAQs).
  add("P3", "informational", `what is ${main} test`);
  add("P3", "informational", `when to do ${main} test`);
  add("P3", "informational", `${main} test preparation fasting`);
  add("P3", "informational", `${main} test report time`);
  add("P3", "informational", `which doctor prescribes ${main} test`);
}

const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
const out = path.join(__dirname, "..", "docs", "specialised-tests-keywords.csv");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, csv);
const byPriority = rows.slice(1).reduce((m, r) => ((m[r[4]] = (m[r[4]] || 0) + 1), m), {});
console.log(`${tests.length} tests, ${rows.length - 1} keywords`, byPriority, "->", out);
