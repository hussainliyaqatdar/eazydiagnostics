// The catalog as the site uses it: a `Catalog` is an immutable, indexed set of tests and packages. It is built from
// data the database holds (see lib/catalog-store.ts on the server, and CatalogProvider in the browser) and does all
// the looking-up and searching in memory, so neither a search nor a booking waits on a query.
// Pure and dependency-light, so the very same code runs on the server and in the browser.
import type { TestItem, PackageItem } from "./types";
import { aliasMatchSlugs } from "./aliases";
import { CC_SPRF_TEST_SLUGS } from "./cc-sprf-tests";

// Strikethrough reference price for individual tests: +20%, rounded up to
// the next multiple of 50, minus 1 (e.g. 100 -> 120 -> 150 -> 149). The
// actual charged price is untouched - this only sets the crossed-out MRP.
export function computeStrikethroughMrp(price: number): number {
  const inflated = price * 1.2;
  const roundedUp = Math.ceil(inflated / 50) * 50;
  return roundedUp - 1;
}

// Categories a business wants surfaced first (e.g. a current marketing push),
// in priority order; everything else follows alphabetically.
const PRIORITY_CATEGORIES = ["Full Body Checkups", "Women's Health"];
function sortWithPriority(categories: string[]): string[] {
  const priority = PRIORITY_CATEGORIES.filter((c) => categories.includes(c));
  const rest = categories.filter((c) => !PRIORITY_CATEGORIES.includes(c)).sort();
  return [...priority, ...rest];
}

export type SearchResult =
  | { kind: "test"; item: TestItem; score: number }
  | { kind: "package"; item: PackageItem; score: number };

// Names inside parentheses, e.g. "(CBC)" in "Complete Blood Count (CBC)" - these
// are the abbreviations customers actually type, so they count as aliases.
const PAREN_TOKENS = /\(([^)]+)\)/g;

function lowerAll(values: string[]): string[] {
  return values.map((v) => v.toLowerCase().trim()).filter(Boolean);
}

// Aliases worth showing as "Also known as" - drops ones the name already
// says (e.g. "CBC" for "Complete Blood Count (CBC)").
export function displayAliases(test: Pick<TestItem, "name" | "aliases">): string[] {
  const name = test.name.toLowerCase();
  return test.aliases.filter((a) => !name.includes(a.toLowerCase()));
}

// Simple, fast relevance score: exact match > starts-with > contains > word overlap.
// `q` must already be lowercased and trimmed; `qWords` are its whitespace-split words.
function scoreLower(n: string, q: string, qWords: string[]): number {
  if (n === q) return 100;
  if (n.startsWith(q)) return 80;
  if (n.includes(q)) return 60;
  let matched = 0;
  for (const w of qWords) if (n.includes(w)) matched++;
  if (matched === 0) return 0;
  return 20 + (matched / qWords.length) * 30;
}

type TestSearchKeys = { name: string; aliases: string[]; lab: string; ids: string[] };

export type CatalogData = { tests: TestItem[]; packages: PackageItem[]; lab?: { id: string; name: string } | null };

export class Catalog {
  // Everything below is already limited to what this visitor may see: active tests, the standard packages, and -
  // on a doctor's own affiliate link - that doctor's own custom panels.
  readonly tests: TestItem[];
  readonly packages: PackageItem[];
  // The standard packages only (what the home page, the package pages' categories, the sitemap and the like list).
  readonly standardPackages: PackageItem[];
  // The custom panels this visitor can see (empty unless they came through a doctor's link that has some).
  readonly customPackages: PackageItem[];
  // The partner lab whose ids (`externalId`) the items carry. Null in the browser, where they are not needed.
  readonly lab: { id: string; name: string } | null;
  private readonly testBySlug: Map<string, TestItem>;
  private readonly packageBySlug: Map<string, PackageItem>;
  private readonly testById: Map<string, TestItem>;
  // Search strings are lowercased ONCE here, instead of on every keystroke for every test.
  private readonly keys: Map<string, TestSearchKeys>;
  private readonly pkgKeys: Map<string, { name: string; tagline: string; category: string }>;

  constructor(data: CatalogData) {
    this.tests = data.tests.map((t) => ({ ...t, mrp: t.mrp ?? computeStrikethroughMrp(t.price) }));
    this.packages = data.packages;
    this.lab = data.lab ?? null;
    this.standardPackages = data.packages.filter((p) => !p.custom);
    this.customPackages = data.packages.filter((p) => p.custom);
    this.testBySlug = new Map(this.tests.map((t) => [t.slug, t]));
    this.packageBySlug = new Map(this.packages.map((p) => [p.slug, p]));
    this.testById = new Map(this.tests.map((t) => [t.id, t]));
    this.keys = new Map(
      this.tests.map((t) => {
        const parenTokens = Array.from(t.name.matchAll(PAREN_TOKENS), (m) => m[1]);
        const aliases = Array.from(new Set(lowerAll([...t.aliases, ...parenTokens])));
        return [t.slug, { name: t.name.toLowerCase(), aliases, lab: t.rawName.toLowerCase(), ids: [t.id.toLowerCase(), ...(t.externalId ? [t.externalId.toLowerCase()] : [])] }];
      })
    );
    this.pkgKeys = new Map(this.packages.map((p) => [p.slug, { name: p.name.toLowerCase(), tagline: p.tagline.toLowerCase(), category: p.category.toLowerCase() }]));
  }

  getTest(slug: string): TestItem | undefined {
    return this.testBySlug.get(slug);
  }
  // By internal_test_id.
  getTestById(id: string): TestItem | undefined {
    return this.testById.get(id);
  }
  getPackage(slug: string): PackageItem | undefined {
    return this.packageBySlug.get(slug);
  }
  // A cart / order line: the test or package it names, if it exists for this visitor.
  getLine(kind: "test" | "package", slug: string): TestItem | PackageItem | undefined {
    return kind === "test" ? this.testBySlug.get(slug) : this.packageBySlug.get(slug);
  }

  // The tests doctors prescribe most often (Agilus' "CC SPRF" list), ranked by prescribing frequency - used as the
  // search modal's default Tests listing and to lead the "All Tests" page, in place of a plain popularity flag.
  frequentlyPrescribedTests(): TestItem[] {
    return CC_SPRF_TEST_SLUGS.map((slug) => this.testBySlug.get(slug)).filter((t): t is TestItem => t !== undefined);
  }

  // Full catalog, frequently-prescribed tests first (in rank order), then everything else in its catalog order.
  testsOrderedByPrescribingFrequency(): TestItem[] {
    const ranked = this.frequentlyPrescribedTests();
    const rankedSlugs = new Set(ranked.map((t) => t.slug));
    return [...ranked, ...this.tests.filter((t) => !rankedSlugs.has(t.slug))];
  }

  testCategories(): string[] {
    return Array.from(new Set(this.tests.map((t) => t.category))).sort();
  }

  // Categories of the standard packages (custom panels have their own group, see customPackages).
  packageCategories(): string[] {
    return sortWithPriority(Array.from(new Set(this.standardPackages.map((p) => p.category))));
  }

  search(query: string, limit = 20): SearchResult[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const qWords = q.split(/\s+/).filter(Boolean);
    const results: SearchResult[] = [];

    // Abbreviations and lay terms (e.g. "FBS", "HbA1c") that don't literally appear in the catalog's own test names
    // get a top-tier score so they surface first, ahead of loose text matches.
    const aliasSlugs = new Set(aliasMatchSlugs(q));

    for (const p of this.packages) {
      const k = this.pkgKeys.get(p.slug)!;
      let score = Math.max(scoreLower(k.name, q, qWords), scoreLower(k.tagline, q, qWords) * 0.6, scoreLower(k.category, q, qWords) * 0.5);
      if (aliasSlugs.has(p.slug)) score = Math.max(score, 95);
      // A clinic's own panel ranks first on an equal match: it is what that clinic's patients came for.
      if (score > 0 && p.custom) score *= 1.05;
      if (score > 0) results.push({ kind: "package", item: p, score });
    }
    for (const t of this.tests) {
      const keys = this.keys.get(t.slug)!;
      let score = scoreLower(keys.name, q, qWords);
      // An exact alias hit ("cbc", "hemogram") ranks as high as an exact name hit; looser alias matches rank just
      // below the same match on the name.
      for (const a of keys.aliases) {
        const s = scoreLower(a, q, qWords);
        score = Math.max(score, s === 100 ? 100 : s * 0.95);
      }
      // The lab's own name still works, for someone typing what's on a report.
      score = Math.max(score, scoreLower(keys.lab, q, qWords) * 0.75);
      // So do our internal id and the partner lab's id (the admin and the lab refer to tests by them).
      if (keys.ids.includes(q)) score = Math.max(score, 100);
      score *= t.popular ? 1.1 : 1;
      if (aliasSlugs.has(t.slug)) score = Math.max(score, 95);
      if (score > 0) results.push({ kind: "test", item: t, score });
    }

    // On equal scores prefer the shorter name - the plain "Complete Blood Count" should come before
    // "Complete Blood Count with ESR" when both match equally.
    results.sort((a, b) => b.score - a.score || a.item.name.length - b.item.name.length);
    return results.slice(0, limit);
  }

  // Used by the search bar: if there's one clearly best match, we can send the user straight to its product page
  // instead of a results list.
  findConfidentMatch(query: string): SearchResult | null {
    const results = this.search(query, 5);
    if (results.length === 0) return null;
    const [best, second] = results;
    if (best.score >= 80 && (!second || best.score - second.score >= 15)) return best;
    return null;
  }
}

export const EMPTY_CATALOG = new Catalog({ tests: [], packages: [] });

// The name of the group a doctor's custom panels are listed under in the package lists.
export const CUSTOM_PANELS_LABEL = "Your clinic's panels";
