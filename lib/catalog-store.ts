// SERVER-ONLY. The catalog in the database: every test and package ("panel"), the partner labs, and the mapping from
// our ids to each lab's ids. And how the site reads it.
//
// IDS. Every test has an internal_test_id (T-000001, ...) and every package an internal_package_id (P-000001, ...).
// They are ours: generated once, never reused, never shown to a lab, and what everything else (carts, packages, orders)
// refers to. A partner lab has its own ids for the same things (its external_test_id / external_package_id); those live
// in the catalog_lab_ids table, one row per item per lab. Moving to a different partner lab therefore means adding that
// lab's mappings and making it the current lab - no item is renamed and no order loses its meaning.
// Adding a test or standard package requires the CURRENT lab's id for it (see createTest / createPackage).
//
// READING is done from memory. The whole catalog is loaded once per server process, and after that a request only
// pays for one tiny "has the version changed?" query at most every few seconds (not one per request). Every admin edit
// bumps the version and clears this server's copy straight away, so the person who made the change sees it at once, and
// other servers pick it up within CHECK_EVERY_MS. So a search or a booking never waits on a catalog query.
import { getDb } from "./db";
import { Catalog } from "./catalog";
import type { PackageConstituent, PackageItem, ProductFaq, TestItem, TestSeo } from "./types";

// How long a server trusts its copy before asking the database whether the catalog changed.
const CHECK_EVERY_MS = 5_000;

export type Lab = { id: string; name: string };
export type ItemKind = "test" | "package";

// ---- rows <-> items -------------------------------------------------------------------
type TestRow = {
  internal_id: string;
  external_id: string | null;
  slug: string;
  name: string;
  lab_name: string;
  raw_name: string;
  aliases: string[] | null;
  price: number | string;
  mrp: number | string | null;
  type: string;
  popular: boolean;
  curated: boolean;
  category: string;
  sample_type: string;
  description: string;
  eta: string;
  faqs: ProductFaq[] | null;
  seo: TestSeo | null;
  active: boolean;
};
type PackageRow = {
  internal_id: string;
  external_id: string | null;
  slug: string;
  name: string;
  category: string;
  price: number | string;
  mrp: number | string | null;
  tagline: string;
  description: string;
  constituents: PackageConstituent[] | null;
  needs_content: boolean;
  eta: string;
  faqs: ProductFaq[] | null;
  active: boolean;
  owner_doctor_id: string | null;
  template_slug: string | null;
  b2b_price: number | string | null;
};

const num = (v: number | string | null | undefined): number | null => (v === null || v === undefined ? null : Number(v));

function testFromRow(r: TestRow): TestItem {
  return {
    id: r.internal_id,
    ...(r.external_id ? { externalId: r.external_id } : {}),
    slug: r.slug,
    name: r.name,
    aliases: r.aliases ?? [],
    labName: r.lab_name,
    rawName: r.raw_name,
    price: Number(r.price),
    mrp: num(r.mrp),
    type: r.type === "Specialised" ? "Specialised" : "Routine",
    popular: r.popular,
    curated: r.curated,
    category: r.category,
    sampleType: r.sample_type,
    description: r.description,
    eta: r.eta,
    ...(r.faqs ? { faqs: r.faqs } : {}),
    ...(r.seo ? { seo: r.seo } : {}),
    active: r.active,
  };
}

function packageFromRow(r: PackageRow): PackageItem {
  return {
    id: r.internal_id,
    ...(r.external_id ? { externalId: r.external_id } : {}),
    slug: r.slug,
    name: r.name,
    category: r.category,
    price: Number(r.price),
    mrp: num(r.mrp),
    tagline: r.tagline,
    description: r.description,
    constituents: r.constituents ?? [],
    needsContent: r.needs_content,
    eta: r.eta,
    ...(r.faqs ? { faqs: r.faqs } : {}),
    active: r.active,
    ...(r.owner_doctor_id ? { custom: true, ownerDoctorId: r.owner_doctor_id, b2bPrice: num(r.b2b_price), templateSlug: r.template_slug } : {}),
  };
}

// Each item with the CURRENT lab's id for it (null when that lab has none).
const CURRENT_LAB = "(SELECT id FROM labs WHERE is_current)";
const TEST_COLS = "t.internal_id, m.external_id, t.slug, t.name, t.lab_name, t.raw_name, t.aliases, t.price, t.mrp, t.type, t.popular, t.curated, t.category, t.sample_type, t.description, t.eta, t.faqs, t.seo, t.active";
const TEST_FROM = `FROM catalog_tests t LEFT JOIN catalog_lab_ids m ON m.lab_id = ${CURRENT_LAB} AND m.kind = 'test' AND m.internal_id = t.internal_id`;
const PACKAGE_COLS = "p.internal_id, m.external_id, p.slug, p.name, p.category, p.price, p.mrp, p.tagline, p.description, p.constituents, p.needs_content, p.eta, p.faqs, p.active, p.owner_doctor_id, p.template_slug, p.b2b_price";
const PACKAGE_FROM = `FROM catalog_packages p LEFT JOIN catalog_lab_ids m ON m.lab_id = ${CURRENT_LAB} AND m.kind = 'package' AND m.internal_id = p.internal_id`;

// ---- first run: fill the tables from the catalog files --------------------------------
// data/tests.json and data/packages.json (built from the spreadsheet by `npm run build:catalog`) are only the
// starting point: they are copied in once, when the tables are empty. Their codes are SRL's, so they become SRL's
// external ids; every item is given a fresh internal id. After that the database is the catalog, and those files are
// no longer read.
let seeding: Promise<void> | null = null;
const ensureSeeded = () => (seeding ??= seedIfEmpty().catch((err) => { seeding = null; throw err; }));

async function seedIfEmpty(): Promise<void> {
  const db = await getDb();
  const [{ n }] = await db.query<{ n: number | string }>("SELECT count(*) AS n FROM catalog_tests");
  if (Number(n) > 0) return;
  const [tests, packages] = await Promise.all([import("@/data/tests.json"), import("@/data/packages.json")]);
  const testRows = (tests.default as unknown as (TestItem & { code?: string })[]).map((t, i) => ({
    code: String(t.code), slug: t.slug, name: t.name, lab_name: t.labName ?? "", raw_name: t.rawName ?? "", aliases: t.aliases ?? [],
    price: t.price, mrp: t.mrp ?? null, type: t.type, popular: !!t.popular, curated: !!t.curated, category: t.category,
    sample_type: t.sampleType ?? "", description: t.description ?? "", eta: t.eta ?? "", faqs: t.faqs ?? null, seo: t.seo ?? null, sort_order: i,
  }));
  const packageRows = (packages.default as unknown as (PackageItem & { code?: string })[]).map((p, i) => ({
    code: String(p.code), slug: p.slug, name: p.name, category: p.category, price: p.price, mrp: p.mrp ?? null, tagline: p.tagline ?? "",
    description: p.description ?? "", constituents: p.constituents ?? [], needs_content: !!p.needsContent, eta: p.eta ?? "", faqs: p.faqs ?? null, sort_order: i,
  }));
  // One statement per table (not one per row), and ON CONFLICT so two servers starting together cannot clash.
  await db.query(
    `INSERT INTO catalog_tests (internal_id, slug, name, lab_name, raw_name, aliases, price, mrp, type, popular, curated, category, sample_type, description, eta, faqs, seo, sort_order)
     SELECT 'T-' || lpad(nextval('catalog_test_seq')::text, 6, '0'), x.slug, x.name, x.lab_name, x.raw_name, COALESCE(x.aliases, '[]'::jsonb), x.price, x.mrp, x.type, x.popular, x.curated, x.category, x.sample_type, x.description, x.eta, x.faqs, x.seo, x.sort_order
     FROM (SELECT * FROM jsonb_to_recordset($1::jsonb) AS r(code text, slug text, name text, lab_name text, raw_name text, aliases jsonb, price integer, mrp integer, type text, popular boolean, curated boolean, category text, sample_type text, description text, eta text, faqs jsonb, seo jsonb, sort_order integer) ORDER BY sort_order) x
     ON CONFLICT DO NOTHING`,
    [JSON.stringify(testRows)]
  );
  await db.query(
    `INSERT INTO catalog_packages (internal_id, slug, name, category, price, mrp, tagline, description, constituents, needs_content, eta, faqs, sort_order)
     SELECT 'P-' || lpad(nextval('catalog_package_seq')::text, 6, '0'), x.slug, x.name, x.category, x.price, x.mrp, x.tagline, x.description, COALESCE(x.constituents, '[]'::jsonb), x.needs_content, x.eta, x.faqs, x.sort_order
     FROM (SELECT * FROM jsonb_to_recordset($1::jsonb) AS r(code text, slug text, name text, category text, price integer, mrp integer, tagline text, description text, constituents jsonb, needs_content boolean, eta text, faqs jsonb, sort_order integer) ORDER BY sort_order) x
     ON CONFLICT DO NOTHING`,
    [JSON.stringify(packageRows)]
  );
  // The files' codes are SRL's own ids: they become SRL's external ids for the items just created.
  await db.query(
    `INSERT INTO catalog_lab_ids (lab_id, kind, internal_id, external_id)
     SELECT 'srl', 'test', t.internal_id, x.code FROM jsonb_to_recordset($1::jsonb) AS x(code text, slug text) JOIN catalog_tests t ON t.slug = x.slug
     ON CONFLICT DO NOTHING`,
    [JSON.stringify(testRows.map((r) => ({ code: r.code, slug: r.slug })))]
  );
  await db.query(
    `INSERT INTO catalog_lab_ids (lab_id, kind, internal_id, external_id)
     SELECT 'srl', 'package', p.internal_id, x.code FROM jsonb_to_recordset($1::jsonb) AS x(code text, slug text) JOIN catalog_packages p ON p.slug = x.slug
     ON CONFLICT DO NOTHING`,
    [JSON.stringify(packageRows.map((r) => ({ code: r.code, slug: r.slug })))]
  );
  await db.query("UPDATE catalog_meta SET version = version + 1 WHERE id = 1");
  console.log(`[catalog] Loaded ${testRows.length} tests and ${packageRows.length} packages into the database (with SRL's ids as their external ids).`);
}

// ---- the in-memory copy ----------------------------------------------------------------
type Cache = {
  version: number;
  checkedAt: number;
  lab: Lab | null;
  tests: TestItem[];
  standard: PackageItem[];
  customsByOwner: Map<string, PackageItem[]>;
  standardCatalog: Catalog;
  // A doctor's view (standard + their custom panels), built the first time that doctor's link is used.
  byOwner: Map<string, Catalog>;
};

let cache: Cache | null = null;
let loading: Promise<Cache> | null = null;

async function readVersion(): Promise<number> {
  const db = await getDb();
  const rows = await db.query<{ version: number | string }>("SELECT version FROM catalog_meta WHERE id = 1");
  return Number(rows[0]?.version ?? 1);
}

async function load(): Promise<Cache> {
  await ensureSeeded();
  const db = await getDb();
  const version = await readVersion();
  const [tests, packages, labs] = await Promise.all([
    db.query<TestRow>(`SELECT ${TEST_COLS} ${TEST_FROM} WHERE t.active ORDER BY t.sort_order, t.internal_id`),
    db.query<PackageRow>(`SELECT ${PACKAGE_COLS} ${PACKAGE_FROM} WHERE p.active ORDER BY p.sort_order, p.internal_id`),
    db.query<{ id: string; name: string }>("SELECT id, name FROM labs WHERE is_current"),
  ]);
  const lab = labs[0] ? { id: labs[0].id, name: labs[0].name } : null;
  const testItems = tests.map(testFromRow);
  const all = packages.map(packageFromRow);
  const standard = all.filter((p) => !p.custom);
  const customsByOwner = new Map<string, PackageItem[]>();
  for (const p of all.filter((x) => x.custom)) customsByOwner.set(p.ownerDoctorId!, [...(customsByOwner.get(p.ownerDoctorId!) ?? []), p]);
  return { version, checkedAt: Date.now(), lab, tests: testItems, standard, customsByOwner, standardCatalog: new Catalog({ tests: testItems, packages: standard, lab }), byOwner: new Map() };
}

async function fresh(): Promise<Cache> {
  const now = Date.now();
  if (cache && now - cache.checkedAt < CHECK_EVERY_MS) return cache;
  if (!loading) {
    loading = (async () => {
      // Have we been told it changed? Only then reload everything.
      if (cache) {
        const v = await readVersion();
        if (v === cache.version) {
          cache.checkedAt = Date.now();
          return cache;
        }
      }
      cache = await load();
      return cache;
    })().finally(() => {
      loading = null;
    });
  }
  return loading;
}

// The catalog a visitor sees. `ref` is the doctor id of the affiliate link they came through, if any: on that link
// the doctor's own custom panels are included (and nobody else's). Every other visitor sees the standard catalog.
export async function loadCatalog(ref?: string | null): Promise<Catalog> {
  const c = await fresh();
  const customs = ref ? c.customsByOwner.get(ref) : undefined;
  if (!ref || !customs) return c.standardCatalog;
  let cat = c.byOwner.get(ref);
  if (!cat) {
    cat = new Catalog({ tests: c.tests, packages: [...customs, ...c.standard], lab: c.lab });
    c.byOwner.set(ref, cat);
  }
  return cat;
}

export async function catalogVersion(): Promise<number> {
  return (await fresh()).version;
}

// After a write: bump the version (so every server reloads) and drop this server's copy right away.
async function changed(): Promise<void> {
  const db = await getDb();
  await db.query("UPDATE catalog_meta SET version = version + 1 WHERE id = 1");
  cache = null;
}

// ---- validation helpers -------------------------------------------------------------------
export class CatalogError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");
const longText = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim().slice(0, max) : "");
function money(v: unknown, field: string, { required = true, min = 0 }: { required?: boolean; min?: number } = {}): number | null {
  if (v === null || v === undefined || v === "") {
    if (required) throw new CatalogError(`Enter the ${field}.`);
    return null;
  }
  const n = typeof v === "number" ? v : Number(String(v).replace(/[,\s]/g, ""));
  if (!Number.isInteger(n) || n < min || n > 10_000_000) throw new CatalogError(`The ${field} must be a whole number of rupees${min > 0 ? ` of at least ${min}` : ""}.`);
  return n;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(table: "catalog_tests" | "catalog_packages", base: string): Promise<string> {
  const db = await getDb();
  const root = slugify(base) || "item";
  let candidate = root;
  for (let n = 2; n < 100; n++) {
    const rows = await db.query<{ slug: string }>(`SELECT slug FROM ${table} WHERE slug = $1`, [candidate]);
    if (rows.length === 0) return candidate;
    candidate = `${root}-${n}`;
  }
  throw new CatalogError("Couldn't make a unique web address for that name. Choose another name.");
}

const isUniqueViolation = (err: unknown) => err instanceof Error && /unique|duplicate/i.test(err.message);

// The next internal id: T-000001 for a test, P-000001 for a package. A sequence, so an id is never reused, even after
// its item is deleted.
async function nextInternalId(kind: ItemKind): Promise<string> {
  const db = await getDb();
  const [r] = await db.query<{ n: number | string }>(`SELECT nextval('${kind === "test" ? "catalog_test_seq" : "catalog_package_seq"}') AS n`);
  return `${kind === "test" ? "T" : "P"}-${String(r.n).padStart(6, "0")}`;
}

const itemTable = (kind: ItemKind) => (kind === "test" ? "catalog_tests" : "catalog_packages");

// ---- labs and the id mappings -------------------------------------------------------------------
export async function getCurrentLab(): Promise<Lab> {
  await ensureSeeded();
  const db = await getDb();
  const [lab] = await db.query<Lab>("SELECT id, name FROM labs WHERE is_current");
  if (!lab) throw new CatalogError("No partner lab is set as the current lab. Choose one on the Labs tab.", 409);
  return lab;
}

async function getLab(id: string): Promise<{ id: string; name: string; isCurrent: boolean; active: boolean }> {
  const db = await getDb();
  const [lab] = await db.query<{ id: string; name: string; is_current: boolean; active: boolean }>("SELECT id, name, is_current, active FROM labs WHERE id = $1", [id]);
  if (!lab) throw new CatalogError("That lab no longer exists. Refresh the page.", 404);
  return { id: lab.id, name: lab.name, isCurrent: lab.is_current, active: lab.active };
}

// What a lab's id must look like: anything printable, up to 60 characters (labs differ in format: numbers, codes, UUIDs).
function readExternalId(v: unknown, what: string): string {
  const id = clean(v, 60);
  if (!id) throw new CatalogError(`Enter the partner lab's ${what}. It is required.`);
  return id;
}

// Is this lab id already used by another item of the same kind at this lab?
async function externalIdTaken(labId: string, kind: ItemKind, externalId: string, exceptInternalId?: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.query("SELECT 1 FROM catalog_lab_ids WHERE lab_id = $1 AND kind = $2 AND external_id = $3 AND internal_id <> $4", [labId, kind, externalId, exceptInternalId ?? ""]);
  return rows.length > 0;
}

async function upsertMapping(lab: { id: string; name: string }, kind: ItemKind, internalId: string, externalId: string, cost?: number | null): Promise<void> {
  if (await externalIdTaken(lab.id, kind, externalId, internalId)) {
    throw new CatalogError(`${externalId} is already ${lab.name}'s id for another ${kind}. A lab's ids must be unique.`, 409);
  }
  const db = await getDb();
  try {
    await db.query(
      `INSERT INTO catalog_lab_ids (lab_id, kind, internal_id, external_id, cost) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (lab_id, kind, internal_id) DO UPDATE SET external_id = EXCLUDED.external_id,
         cost = CASE WHEN $6::boolean THEN EXCLUDED.cost ELSE catalog_lab_ids.cost END, updated_at = now()`,
      [lab.id, kind, internalId, externalId, cost ?? null, cost !== undefined]
    );
  } catch (err) {
    if (isUniqueViolation(err)) throw new CatalogError(`${externalId} is already ${lab.name}'s id for another ${kind}. A lab's ids must be unique.`, 409);
    throw err;
  }
}

export type LabSummary = {
  id: string;
  name: string;
  isCurrent: boolean;
  active: boolean;
  notes: string;
  // How many items have an id at this lab, out of how many there are (custom panels are not counted: they are sent as their tests).
  mapped: { tests: number; packages: number };
  totals: { tests: number; packages: number };
};

export async function listLabs(): Promise<LabSummary[]> {
  await ensureSeeded();
  const db = await getDb();
  const labs = await db.query<{ id: string; name: string; is_current: boolean; active: boolean; notes: string }>("SELECT id, name, is_current, active, notes FROM labs ORDER BY is_current DESC, name");
  const [totals] = await db.query<{ tests: number | string; packages: number | string }>(
    "SELECT (SELECT count(*) FROM catalog_tests WHERE active) AS tests, (SELECT count(*) FROM catalog_packages WHERE active AND owner_doctor_id IS NULL) AS packages"
  );
  const counts = await db.query<{ lab_id: string; kind: string; n: number | string }>(
    `SELECT m.lab_id, m.kind, count(*) AS n FROM catalog_lab_ids m
     LEFT JOIN catalog_tests t ON m.kind = 'test' AND t.internal_id = m.internal_id
     LEFT JOIN catalog_packages p ON m.kind = 'package' AND p.internal_id = m.internal_id
     WHERE (m.kind = 'test' AND t.active) OR (m.kind = 'package' AND p.active AND p.owner_doctor_id IS NULL)
     GROUP BY m.lab_id, m.kind`
  );
  return labs.map((l) => ({
    id: l.id,
    name: l.name,
    isCurrent: l.is_current,
    active: l.active,
    notes: l.notes,
    mapped: {
      tests: Number(counts.find((c) => c.lab_id === l.id && c.kind === "test")?.n ?? 0),
      packages: Number(counts.find((c) => c.lab_id === l.id && c.kind === "package")?.n ?? 0),
    },
    totals: { tests: Number(totals.tests), packages: Number(totals.packages) },
  }));
}

export async function createLab(input: { name?: unknown; id?: unknown; notes?: unknown }): Promise<LabSummary> {
  const name = clean(input.name, 80);
  if (name.length < 2) throw new CatalogError("Enter the lab's name.");
  const id = slugify(clean(input.id, 40) || name).slice(0, 40);
  if (!id) throw new CatalogError("Enter a name made of letters or numbers.");
  const db = await getDb();
  try {
    await db.query("INSERT INTO labs (id, name, notes) VALUES ($1, $2, $3)", [id, name, longText(input.notes, 1000)]);
  } catch (err) {
    if (isUniqueViolation(err)) throw new CatalogError(`A lab with the id "${id}" already exists.`, 409);
    throw err;
  }
  return (await listLabs()).find((l) => l.id === id)!;
}

export async function updateLab(id: string, input: { name?: unknown; notes?: unknown; active?: unknown }): Promise<LabSummary> {
  const lab = await getLab(id);
  const name = input.name === undefined ? lab.name : clean(input.name, 80);
  if (name.length < 2) throw new CatalogError("Enter the lab's name.");
  if (input.active === false && lab.isCurrent) throw new CatalogError("This is the current lab. Make another lab current before switching this one off.", 409);
  const db = await getDb();
  await db.query("UPDATE labs SET name = $2, active = $3, notes = COALESCE($4, notes) WHERE id = $1", [id, name, input.active === undefined ? lab.active : input.active === true, input.notes === undefined ? null : longText(input.notes, 1000)]);
  await changed();
  return (await listLabs()).find((l) => l.id === id)!;
}

// Items of the standard catalog that this lab has no id for: they could not be ordered from it.
export async function unmappedFor(labId: string): Promise<{ tests: { id: string; name: string }[]; packages: { id: string; name: string }[]; testCount: number; packageCount: number }> {
  const db = await getDb();
  const tests = await db.query<{ id: string; name: string }>(
    "SELECT t.internal_id AS id, t.name FROM catalog_tests t WHERE t.active AND NOT EXISTS (SELECT 1 FROM catalog_lab_ids m WHERE m.lab_id = $1 AND m.kind = 'test' AND m.internal_id = t.internal_id) ORDER BY t.sort_order",
    [labId]
  );
  const packages = await db.query<{ id: string; name: string }>(
    "SELECT p.internal_id AS id, p.name FROM catalog_packages p WHERE p.active AND p.owner_doctor_id IS NULL AND NOT EXISTS (SELECT 1 FROM catalog_lab_ids m WHERE m.lab_id = $1 AND m.kind = 'package' AND m.internal_id = p.internal_id) ORDER BY p.sort_order",
    [labId]
  );
  return { tests: tests.slice(0, 10), packages: packages.slice(0, 10), testCount: tests.length, packageCount: packages.length };
}

// Switches the partner lab. From then on, new orders are for this lab, new tests and packages need THIS lab's ids,
// and the site's items carry its ids. Refused while any active test or standard package has no id at the new lab,
// unless `force` (then those items simply cannot be sent to it until they are mapped).
export async function setCurrentLab(id: string, { force = false }: { force?: boolean } = {}): Promise<LabSummary[]> {
  const lab = await getLab(id);
  if (lab.isCurrent) return listLabs();
  if (!lab.active) throw new CatalogError(`${lab.name} is switched off. Switch it on first.`, 409);
  const gap = await unmappedFor(id);
  if (!force && gap.testCount + gap.packageCount > 0) {
    const names = [...gap.tests, ...gap.packages].slice(0, 3).map((i) => i.name).join(", ");
    throw new CatalogError(`${lab.name} has no id for ${gap.testCount} test${gap.testCount === 1 ? "" : "s"} and ${gap.packageCount} package${gap.packageCount === 1 ? "" : "s"} (for example ${names}). Map them first (Labs tab), or switch anyway.`, 409);
  }
  const db = await getDb();
  await db.query("UPDATE labs SET is_current = false WHERE is_current");
  await db.query("UPDATE labs SET is_current = true WHERE id = $1", [id]);
  await changed();
  return listLabs();
}

export type MappingRow = {
  kind: ItemKind;
  internalId: string;
  slug: string;
  name: string;
  category: string;
  active: boolean;
  custom: boolean;
  externalId: string | null;
  cost: number | null;
};

// Every item with this lab's id for it (null when unmapped), for the mapping screen. Custom panels are left out.
export async function adminMappings(labId: string, kind: ItemKind): Promise<MappingRow[]> {
  await ensureSeeded();
  await getLab(labId);
  const db = await getDb();
  const rows = await db.query<{ internal_id: string; slug: string; name: string; category: string; active: boolean; external_id: string | null; cost: number | null }>(
    `SELECT i.internal_id, i.slug, i.name, i.category, i.active, m.external_id, m.cost FROM ${itemTable(kind)} i
     LEFT JOIN catalog_lab_ids m ON m.lab_id = $1 AND m.kind = $2 AND m.internal_id = i.internal_id
     ${kind === "package" ? "WHERE i.owner_doctor_id IS NULL" : ""} ORDER BY i.sort_order, i.internal_id`,
    [labId, kind]
  );
  return rows.map((r) => ({ kind, internalId: r.internal_id, slug: r.slug, name: r.name, category: r.category, active: r.active, custom: false, externalId: r.external_id, cost: r.cost === null ? null : Number(r.cost) }));
}

export type MappingInput = { internalId: string; externalId: string; cost?: number | null };
export type MappingResult = { saved: number; removed: number; errors: { row: string; message: string }[] };

// Saves a lab's ids for items of one kind. An empty id removes the mapping (refused for the current lab's standard
// items: the current lab must always have an id for what is on sale). One bad row does not stop the others.
export async function setMappings(labId: string, kind: ItemKind, rows: MappingInput[]): Promise<MappingResult> {
  const lab = await getLab(labId);
  const db = await getDb();
  const known = new Map((await db.query<{ internal_id: string; slug: string; custom: boolean }>(`SELECT internal_id, slug, ${kind === "package" ? "owner_doctor_id IS NOT NULL" : "false"} AS custom FROM ${itemTable(kind)}`)).map((r) => [r.internal_id, r]));
  const result: MappingResult = { saved: 0, removed: 0, errors: [] };
  for (const row of rows.slice(0, 5000)) {
    const internalId = clean(row.internalId, 40);
    const item = known.get(internalId);
    try {
      if (!item) throw new CatalogError(`No ${kind} has the internal id ${internalId || "(blank)"}.`, 404);
      const externalId = clean(row.externalId, 60);
      if (!externalId) {
        if (lab.isCurrent && !item.custom) throw new CatalogError(`${lab.name} is the current lab: every ${kind} on sale needs its id.`, 409);
        await db.query("DELETE FROM catalog_lab_ids WHERE lab_id = $1 AND kind = $2 AND internal_id = $3", [labId, kind, internalId]);
        result.removed++;
      } else {
        const cost = row.cost === undefined || row.cost === null ? row.cost : money(row.cost, "cost", { required: false, min: 0 });
        await upsertMapping(lab, kind, internalId, externalId, cost);
        result.saved++;
      }
    } catch (err) {
      result.errors.push({ row: internalId, message: err instanceof Error ? err.message : "Could not be saved." });
    }
  }
  if (result.saved + result.removed > 0) await changed();
  return result;
}

// Bulk import: one line per item, "internal_id,external_id[,cost]" (commas, tabs or semicolons; a header line is skipped).
// A line may name the item by its web address (slug) instead of its internal id.
export async function importMappings(labId: string, kind: ItemKind, text: string): Promise<MappingResult> {
  await getLab(labId);
  const db = await getDb();
  const bySlug = new Map((await db.query<{ internal_id: string; slug: string }>(`SELECT internal_id, slug FROM ${itemTable(kind)}`)).map((r) => [r.slug, r.internal_id]));
  const rows: MappingInput[] = [];
  const errors: MappingResult["errors"] = [];
  for (const [i, line] of text.replace(/\r/g, "").split("\n").entries()) {
    if (!line.trim()) continue;
    const cells = line.split(/[,\t;]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (i === 0 && /internal|slug|^id$/i.test(cells[0]) && !/^[TP]-\d+$/.test(cells[0])) continue;
    if (cells.length < 2) {
      errors.push({ row: `line ${i + 1}`, message: "Expected: internal id, lab id[, cost]." });
      continue;
    }
    const internalId = /^[TP]-\d+$/.test(cells[0]) ? cells[0] : bySlug.get(cells[0]) ?? cells[0];
    rows.push({ internalId, externalId: cells[1], ...(cells[2] ? { cost: Number(cells[2].replace(/[,\s]/g, "")) } : {}) });
  }
  const res = await setMappings(labId, kind, rows);
  return { ...res, errors: [...errors, ...res.errors] };
}

// Every test and standard package with this lab's id (blank when unmapped), as CSV: what to hand a new lab, or to fill in
// from its price list and import back.
export async function exportMappingsCsv(labId: string): Promise<string> {
  const q = (v: string | number | null) => (v === null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const lines = ["kind,internal_id,slug,name,external_id,cost"];
  for (const kind of ["test", "package"] as ItemKind[]) {
    for (const r of await adminMappings(labId, kind)) lines.push([kind, r.internalId, r.slug, r.name, r.externalId, r.cost].map((v) => q(v as string | number | null)).join(","));
  }
  return lines.join("\n") + "\n";
}

// A lab's ids for some items, by internal id: what is sent to that lab for an order.
export async function labIdsFor(labId: string, kind: ItemKind, internalIds: string[]): Promise<Map<string, string>> {
  if (internalIds.length === 0) return new Map();
  const db = await getDb();
  const rows = await db.query<{ internal_id: string; external_id: string }>("SELECT internal_id, external_id FROM catalog_lab_ids WHERE lab_id = $1 AND kind = $2 AND internal_id = ANY($3::text[])", [labId, kind, internalIds]);
  return new Map(rows.map((r) => [r.internal_id, r.external_id]));
}

// The internal ids, and the current lab's ids, of items by slug (for the admin order page: orders placed before ids
// were saved on each line have only the slug). Inactive and custom items count too.
export async function adminItemIdsBySlug(slugs: string[]): Promise<Map<string, { internalId: string; externalId?: string }>> {
  const unique = Array.from(new Set(slugs));
  if (unique.length === 0) return new Map();
  const db = await getDb();
  const [tests, packages] = await Promise.all([
    db.query<{ slug: string; internal_id: string; external_id: string | null }>(`SELECT t.slug, t.internal_id, m.external_id ${TEST_FROM} WHERE t.slug = ANY($1::text[])`, [unique]),
    db.query<{ slug: string; internal_id: string; external_id: string | null }>(`SELECT p.slug, p.internal_id, m.external_id ${PACKAGE_FROM} WHERE p.slug = ANY($1::text[])`, [unique]),
  ]);
  return new Map([...tests, ...packages].map((r) => [r.slug, { internalId: r.internal_id, ...(r.external_id ? { externalId: r.external_id } : {}) }]));
}

// ---- admin: reading (everything, active or not) -----------------------------------------
export async function adminListTests(): Promise<TestItem[]> {
  await ensureSeeded();
  const db = await getDb();
  // The long text (description, FAQs, SEO) is left out of the list; it is fetched when a test is opened.
  const cols = TEST_COLS.replace("t.description", "'' AS description").replace("t.faqs, t.seo", "NULL::jsonb AS faqs, NULL::jsonb AS seo");
  return (await db.query<TestRow>(`SELECT ${cols} ${TEST_FROM} ORDER BY t.sort_order, t.internal_id`)).map(testFromRow);
}

export async function adminGetTest(internalId: string): Promise<TestItem | undefined> {
  const db = await getDb();
  const rows = await db.query<TestRow>(`SELECT ${TEST_COLS} ${TEST_FROM} WHERE t.internal_id = $1`, [internalId]);
  return rows[0] ? testFromRow(rows[0]) : undefined;
}

export async function adminListPackages(ownerDoctorId?: string | null): Promise<PackageItem[]> {
  await ensureSeeded();
  const db = await getDb();
  const where = ownerDoctorId === undefined ? "" : ownerDoctorId === null ? "WHERE p.owner_doctor_id IS NULL" : "WHERE p.owner_doctor_id = $1";
  const rows = await db.query<PackageRow>(`SELECT ${PACKAGE_COLS} ${PACKAGE_FROM} ${where} ORDER BY p.owner_doctor_id NULLS FIRST, p.sort_order, p.internal_id`, ownerDoctorId ? [ownerDoctorId] : []);
  return rows.map(packageFromRow);
}

export async function adminGetPackage(internalId: string): Promise<PackageItem | undefined> {
  const db = await getDb();
  const rows = await db.query<PackageRow>(`SELECT ${PACKAGE_COLS} ${PACKAGE_FROM} WHERE p.internal_id = $1`, [internalId]);
  return rows[0] ? packageFromRow(rows[0]) : undefined;
}

// ---- admin: tests ---------------------------------------------------------------------------
export type TestInput = {
  // The CURRENT partner lab's id for this test (its external_test_id). Required when adding a test.
  externalId?: unknown;
  name?: unknown;
  labName?: unknown;
  aliases?: unknown;
  price?: unknown;
  mrp?: unknown;
  type?: unknown;
  category?: unknown;
  sampleType?: unknown;
  description?: unknown;
  eta?: unknown;
  popular?: unknown;
  active?: unknown;
};

function readAliases(v: unknown): string[] {
  const list = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,\n]/) : [];
  return Array.from(new Set(list.map((a) => clean(a, 80)).filter(Boolean))).slice(0, 40);
}

export async function createTest(input: TestInput): Promise<TestItem> {
  // The partner lab's id for the test is required: a test that cannot be ordered from the lab must not be on sale.
  const lab = await getCurrentLab();
  const externalId = readExternalId(input.externalId, "test id");
  const name = clean(input.name, 160);
  if (name.length < 2) throw new CatalogError("Enter the test name.");
  const price = money(input.price, "price", { min: 1 })!;
  const mrp = money(input.mrp, "crossed-out price (MRP)", { required: false, min: 1 });
  const category = clean(input.category, 60) || "Other";
  const type = input.type === "Specialised" ? "Specialised" : "Routine";
  if (await externalIdTaken(lab.id, "test", externalId)) throw new CatalogError(`${externalId} is already ${lab.name}'s id for another test. A lab's ids must be unique.`, 409);
  const db = await getDb();
  const slug = await uniqueSlug("catalog_tests", name);
  const internalId = await nextInternalId("test");
  const [{ next }] = await db.query<{ next: number | string }>("SELECT COALESCE(max(sort_order), 0) + 1 AS next FROM catalog_tests");
  await db.query(
    `INSERT INTO catalog_tests (internal_id, slug, name, lab_name, raw_name, aliases, price, mrp, type, popular, category, sample_type, description, eta, active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [internalId, slug, name, clean(input.labName, 160) || name, (clean(input.labName, 160) || name).toUpperCase(), JSON.stringify(readAliases(input.aliases)), price, mrp, type, input.popular === true, category, clean(input.sampleType, 60), longText(input.description, 4000), clean(input.eta, 40), input.active !== false, Number(next)]
  );
  try {
    await upsertMapping(lab, "test", internalId, externalId);
  } catch (err) {
    await db.query("DELETE FROM catalog_tests WHERE internal_id = $1", [internalId]);
    throw err;
  }
  await changed();
  return (await adminGetTest(internalId))!;
}

export async function updateTest(internalId: string, input: TestInput): Promise<TestItem> {
  const current = await adminGetTest(internalId);
  if (!current) throw new CatalogError("That test no longer exists. Refresh the page.", 404);
  const name = input.name === undefined ? current.name : clean(input.name, 160);
  if (name.length < 2) throw new CatalogError("Enter the test name.");
  const price = input.price === undefined ? current.price : money(input.price, "price", { min: 1 })!;
  const mrp = input.mrp === undefined ? current.mrp : money(input.mrp, "crossed-out price (MRP)", { required: false, min: 1 });
  const labName = input.labName === undefined ? current.labName : clean(input.labName, 160) || name;
  // The current lab's id for this test can be corrected here; it can never be left empty.
  if (input.externalId !== undefined && clean(input.externalId, 60) !== (current.externalId ?? "")) {
    await upsertMapping(await getCurrentLab(), "test", internalId, readExternalId(input.externalId, "test id"));
  }
  const db = await getDb();
  // The internal id and the web address never change: carts, packages, orders and links refer to them.
  await db.query(
    `UPDATE catalog_tests SET name = $2, lab_name = $3, raw_name = $4, aliases = $5::jsonb, price = $6, mrp = $7, type = $8, popular = $9,
            category = $10, sample_type = $11, description = $12, eta = $13, active = $14, updated_at = now() WHERE internal_id = $1`,
    [
      internalId, name, labName, input.labName === undefined ? current.rawName : labName.toUpperCase(),
      JSON.stringify(input.aliases === undefined ? current.aliases : readAliases(input.aliases)), price, mrp,
      input.type === undefined ? current.type : input.type === "Specialised" ? "Specialised" : "Routine",
      input.popular === undefined ? current.popular : input.popular === true,
      input.category === undefined ? current.category : clean(input.category, 60) || "Other",
      input.sampleType === undefined ? current.sampleType : clean(input.sampleType, 60),
      input.description === undefined ? current.description : longText(input.description, 4000),
      input.eta === undefined ? current.eta : clean(input.eta, 40),
      input.active === undefined ? current.active !== false : input.active === true,
    ]
  );
  await changed();
  return (await adminGetTest(internalId))!;
}

export async function setTestActive(internalId: string, active: boolean): Promise<void> {
  const db = await getDb();
  const rows = await db.query("UPDATE catalog_tests SET active = $2, updated_at = now() WHERE internal_id = $1 RETURNING internal_id", [internalId, active]);
  if (rows.length === 0) throw new CatalogError("That test no longer exists. Refresh the page.", 404);
  await changed();
}

// A test that a package still lists cannot be deleted (it would leave the package pointing at nothing). Deactivate
// it instead, or take it out of those packages first.
export async function deleteTest(internalId: string): Promise<void> {
  const t = await adminGetTest(internalId);
  if (!t) return;
  const db = await getDb();
  const used = await db.query<{ name: string }>("SELECT name FROM catalog_packages WHERE constituents @> $1::jsonb ORDER BY name LIMIT 5", [JSON.stringify([{ slug: t.slug }])]);
  if (used.length > 0) {
    throw new CatalogError(`${t.name} is part of ${used.map((u) => u.name).join(", ")}. Take it out of those packages first, or deactivate it instead.`, 409);
  }
  await db.query("DELETE FROM catalog_lab_ids WHERE kind = 'test' AND internal_id = $1", [internalId]);
  await db.query("DELETE FROM catalog_tests WHERE internal_id = $1", [internalId]);
  await changed();
}

// ---- admin: packages and custom panels ---------------------------------------------------------
export type PackageInput = {
  // The CURRENT partner lab's id for this package (its external_package_id). Required when adding a standard package.
  externalId?: unknown;
  name?: unknown;
  category?: unknown;
  price?: unknown;
  mrp?: unknown;
  tagline?: unknown;
  description?: unknown;
  eta?: unknown;
  // Slugs of the tests the package includes (in order).
  tests?: unknown;
  needsContent?: unknown;
  active?: unknown;
  // Custom panels only.
  b2bPrice?: unknown;
};

// The tests a package includes: the ones named (by slug) are looked up, with their current name and price copied in.
async function readConstituents(v: unknown, keep: PackageConstituent[] = []): Promise<PackageConstituent[]> {
  if (v === undefined) return keep;
  if (!Array.isArray(v)) throw new CatalogError("The tests in the package must be a list.");
  const slugs = Array.from(new Set(v.filter((s): s is string => typeof s === "string")));
  if (slugs.length > 200) throw new CatalogError("A package can include at most 200 tests.");
  const db = await getDb();
  const rows = slugs.length ? await db.query<{ slug: string; name: string; price: number }>("SELECT slug, name, price FROM catalog_tests WHERE slug = ANY($1::text[])", [slugs]) : [];
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const missing = slugs.filter((s) => !bySlug.has(s));
  if (missing.length > 0) throw new CatalogError(`These tests are not in the catalog: ${missing.slice(0, 3).join(", ")}.`);
  return slugs.map((s) => ({ name: bySlug.get(s)!.name, slug: s, price: Number(bySlug.get(s)!.price) }));
}

export async function createPackage(input: PackageInput): Promise<PackageItem> {
  const lab = await getCurrentLab();
  const externalId = readExternalId(input.externalId, "package id");
  const name = clean(input.name, 160);
  if (name.length < 2) throw new CatalogError("Enter the package name.");
  const price = money(input.price, "price", { min: 1 })!;
  const mrp = money(input.mrp, "crossed-out price (MRP)", { required: false, min: 1 });
  const constituents = await readConstituents(input.tests);
  if (await externalIdTaken(lab.id, "package", externalId)) throw new CatalogError(`${externalId} is already ${lab.name}'s id for another package. A lab's ids must be unique.`, 409);
  const db = await getDb();
  const slug = await uniqueSlug("catalog_packages", name);
  const internalId = await nextInternalId("package");
  const [{ next }] = await db.query<{ next: number | string }>("SELECT COALESCE(max(sort_order), 0) + 1 AS next FROM catalog_packages");
  await db.query(
    `INSERT INTO catalog_packages (internal_id, slug, name, category, price, mrp, tagline, description, constituents, needs_content, eta, active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13)`,
    [internalId, slug, name, clean(input.category, 60) || "Other", price, mrp, clean(input.tagline, 160), longText(input.description, 4000), JSON.stringify(constituents), input.needsContent === true, clean(input.eta, 40), input.active !== false, Number(next)]
  );
  try {
    await upsertMapping(lab, "package", internalId, externalId);
  } catch (err) {
    await db.query("DELETE FROM catalog_packages WHERE internal_id = $1", [internalId]);
    throw err;
  }
  await changed();
  return (await adminGetPackage(internalId))!;
}

// ---- standard packages in data/packages.json that this database doesn't have yet ---------------------
// The files only seed an EMPTY database, so a package added to them later (for example the lab's new offers) never
// reaches a live one on its own. Admin -> Tests & packages -> Packages offers to add them. Only packages with the
// lab's own ids (not our "PKG-" codes) are offered, and only when neither that lab id nor the name is already in use,
// so nothing is duplicated and nothing is changed. A package you deleted on purpose is not offered again unless it is
// one of these.
export type PendingPackage = { code: string; name: string; price: number; tests: number };
type FilePackage = PackageItem & { code?: string };

async function filePackages(): Promise<FilePackage[]> {
  const mod = await import("@/data/packages.json");
  return (mod.default as unknown as FilePackage[]).filter((p) => p.code && !/^PKG-/i.test(String(p.code)));
}

async function pendingFilePackageItems(): Promise<FilePackage[]> {
  const lab = await getCurrentLab();
  const db = await getDb();
  const out: FilePackage[] = [];
  for (const p of await filePackages()) {
    if (await externalIdTaken(lab.id, "package", String(p.code))) continue;
    const sameName = await db.query("SELECT 1 FROM catalog_packages WHERE lower(name) = lower($1) AND owner_doctor_id IS NULL", [p.name]);
    if (sameName.length > 0) continue;
    out.push(p);
  }
  return out;
}

export async function pendingFilePackages(): Promise<PendingPackage[]> {
  return (await pendingFilePackageItems()).map((p) => ({ code: String(p.code), name: p.name, price: p.price, tests: p.constituents.length }));
}

export async function addPendingFilePackages(): Promise<{ added: string[]; skipped: { name: string; reason: string }[] }> {
  const db = await getDb();
  const added: string[] = [];
  const skipped: { name: string; reason: string }[] = [];
  for (const p of await pendingFilePackageItems()) {
    try {
      const made = await createPackage({
        externalId: String(p.code), name: p.name, category: p.category, price: p.price, mrp: p.mrp ?? undefined, tagline: p.tagline,
        description: p.description, eta: p.eta, tests: p.constituents.map((c) => c.slug),
      });
      if (p.faqs) await db.query("UPDATE catalog_packages SET faqs = $1::jsonb WHERE internal_id = $2", [JSON.stringify(p.faqs), made.id]);
      added.push(p.name);
    } catch (err) {
      skipped.push({ name: p.name, reason: err instanceof Error ? err.message : "Couldn't be added." });
    }
  }
  if (added.length > 0) await changed();
  return { added, skipped };
}

export async function updatePackage(internalId: string, input: PackageInput): Promise<PackageItem> {
  const current = await adminGetPackage(internalId);
  if (!current) throw new CatalogError("That package no longer exists. Refresh the page.", 404);
  const name = input.name === undefined ? current.name : clean(input.name, 160);
  if (name.length < 2) throw new CatalogError("Enter the package name.");
  const price = input.price === undefined ? current.price : money(input.price, "price", { min: 1 })!;
  const mrp = input.mrp === undefined ? current.mrp : money(input.mrp, "crossed-out price (MRP)", { required: false, min: 1 });
  const b2b = input.b2bPrice === undefined ? current.b2bPrice ?? null : money(input.b2bPrice, "B2B price", { required: false, min: 0 });
  if (current.custom && b2b === null) throw new CatalogError("Enter the B2B price for this panel.");
  const constituents = await readConstituents(input.tests, current.constituents);
  // A standard package's id at the current lab can be corrected (never left empty); a custom panel's is optional.
  if (input.externalId !== undefined && clean(input.externalId, 60) !== (current.externalId ?? "")) {
    const given = clean(input.externalId, 60);
    if (given || !current.custom) await upsertMapping(await getCurrentLab(), "package", internalId, readExternalId(given, "package id"));
  }
  const db = await getDb();
  await db.query(
    `UPDATE catalog_packages SET name = $2, category = $3, price = $4, mrp = $5, tagline = $6, description = $7, constituents = $8::jsonb,
            needs_content = $9, eta = $10, active = $11, b2b_price = $12, updated_at = now() WHERE internal_id = $1`,
    [
      internalId, name, input.category === undefined ? current.category : clean(input.category, 60) || "Other", price, mrp,
      input.tagline === undefined ? current.tagline : clean(input.tagline, 160),
      input.description === undefined ? current.description : longText(input.description, 4000), JSON.stringify(constituents),
      input.needsContent === undefined ? current.needsContent : input.needsContent === true,
      input.eta === undefined ? current.eta : clean(input.eta, 40),
      input.active === undefined ? current.active !== false : input.active === true, current.custom ? b2b : null,
    ]
  );
  await changed();
  return (await adminGetPackage(internalId))!;
}

export async function setPackageActive(internalId: string, active: boolean): Promise<void> {
  const db = await getDb();
  const rows = await db.query("UPDATE catalog_packages SET active = $2, updated_at = now() WHERE internal_id = $1 RETURNING internal_id", [internalId, active]);
  if (rows.length === 0) throw new CatalogError("That package no longer exists. Refresh the page.", 404);
  await changed();
}

export async function deletePackage(internalId: string): Promise<void> {
  const db = await getDb();
  // Custom panels copied from this package keep their own contents, so they are not affected.
  await db.query("DELETE FROM catalog_lab_ids WHERE kind = 'package' AND internal_id = $1", [internalId]);
  await db.query("DELETE FROM catalog_packages WHERE internal_id = $1", [internalId]);
  await changed();
}

// A custom panel for one doctor's patients: it can start as a copy of a standard package (its tests, category,
// description and report time), then has its own name, patient price and B2B price. It is shown only on that
// doctor's own affiliate link. A lab id for it is optional: without one it is sent to the lab as the tests it includes.
export async function createCustomPanel(input: PackageInput & { ownerDoctorId?: unknown; templateSlug?: unknown }): Promise<PackageItem> {
  const owner = clean(input.ownerDoctorId, 40);
  const db = await getDb();
  const doctor = owner ? (await db.query<{ id: string; slug: string }>("SELECT id, slug FROM doctors WHERE id = $1", [owner]))[0] : undefined;
  if (!doctor) throw new CatalogError("Choose the doctor this panel is for.");
  const templateSlug = clean(input.templateSlug, 100);
  const template = templateSlug ? (await db.query<PackageRow>(`SELECT ${PACKAGE_COLS.replace("m.external_id", "NULL::text AS external_id")} FROM catalog_packages p WHERE p.slug = $1 AND p.owner_doctor_id IS NULL`, [templateSlug]))[0] : undefined;
  if (templateSlug && !template) throw new CatalogError("That standard package no longer exists. Refresh the page.", 404);

  const name = clean(input.name, 160) || template?.name || "";
  if (name.length < 2) throw new CatalogError("Enter the panel's name.");
  const price = money(input.price, "patient price", { min: 1 })!;
  const b2b = money(input.b2bPrice, "B2B price", { min: 0 })!;
  const constituents = input.tests === undefined ? template?.constituents ?? [] : await readConstituents(input.tests);
  const lab = await getCurrentLab();
  const externalId = clean(input.externalId, 60);
  if (externalId && (await externalIdTaken(lab.id, "package", externalId))) throw new CatalogError(`${externalId} is already ${lab.name}'s id for another package. A lab's ids must be unique.`, 409);
  const slug = await uniqueSlug("catalog_packages", `${doctor.slug}-${name}`);
  const internalId = await nextInternalId("package");
  const [{ next }] = await db.query<{ next: number | string }>("SELECT COALESCE(max(sort_order), 0) + 1 AS next FROM catalog_packages");
  await db.query(
    `INSERT INTO catalog_packages (internal_id, slug, name, category, price, mrp, tagline, description, constituents, needs_content, eta, active, sort_order, owner_doctor_id, template_slug, b2b_price)
     VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, $8::jsonb, false, $9, $10, $11, $12, $13, $14)`,
    [
      internalId, slug, name, clean(input.category, 60) || template?.category || "Other", price,
      input.tagline === undefined ? template?.tagline ?? "" : clean(input.tagline, 160),
      input.description === undefined ? template?.description ?? "" : longText(input.description, 4000), JSON.stringify(constituents),
      input.eta === undefined ? template?.eta ?? "" : clean(input.eta, 40), input.active !== false, Number(next), doctor.id, template?.slug ?? null, b2b,
    ]
  );
  if (externalId) {
    try {
      await upsertMapping(lab, "package", internalId, externalId);
    } catch (err) {
      await db.query("DELETE FROM catalog_packages WHERE internal_id = $1", [internalId]);
      throw err;
    }
  }
  await changed();
  return (await adminGetPackage(internalId))!;
}
