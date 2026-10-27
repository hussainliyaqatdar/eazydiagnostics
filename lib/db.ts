// SERVER-ONLY. The database: Postgres, reached through DATABASE_URL (Render
// Postgres in production). With no DATABASE_URL, local development uses an
// embedded Postgres (PGlite) that keeps its files in .data/pgdata, so nothing has
// to be installed to run the site. Production without DATABASE_URL fails loudly.
import path from "path";

export type Db = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS doctors (
  id          text PRIMARY KEY,
  -- URL-friendly name from the clinic, unique: the hook for a doctor's own
  -- branded version of the site later (e.g. /c/<slug>).
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  clinic      text NOT NULL,
  mobile      text NOT NULL DEFAULT '',
  email       text NOT NULL DEFAULT '',
  specialty   text NOT NULL,
  degree      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id              text PRIMARY KEY,
  created_at      timestamptz NOT NULL DEFAULT now(),
  patient         jsonb NOT NULL,
  items           jsonb NOT NULL,
  subtotal_mrp    integer NOT NULL,
  subtotal_price  integer NOT NULL,
  savings         integer NOT NULL,
  coupon_code     text,
  coupon_discount integer,
  collection_date text NOT NULL,
  collection_slot text NOT NULL,
  payment_status  text NOT NULL DEFAULT 'due',
  -- The prescribing doctor. doctor_id links to a registered doctor (and is
  -- cleared if they are deleted); the name and clinic are copied so the order
  -- stays readable either way. A typed-in doctor has only referral_name.
  doctor_id       text REFERENCES doctors(id) ON DELETE SET NULL,
  referral_name   text,
  referral_clinic text
);

CREATE INDEX IF NOT EXISTS orders_collection_idx ON orders (collection_date, collection_slot);
CREATE INDEX IF NOT EXISTS orders_doctor_idx ON orders (doctor_id);
`;

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { Pool } = await import("pg");
    // Render's internal URL has no dots in its host and needs no SSL; the external
    // one (and other hosted Postgres) does. An explicit ?sslmode= in the URL wins.
    const host = new URL(url).hostname;
    const wantsSsl = host.includes(".") && host !== "localhost" && !url.includes("sslmode=");
    const pool = new Pool({ connectionString: url, ssl: wantsSsl ? { rejectUnauthorized: false } : undefined, max: 5 });
    await pool.query(SCHEMA);
    return { query: async (text, params) => (await pool.query(text, params as unknown[])).rows };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is not set. Create a Postgres database (e.g. on Render) and set DATABASE_URL on the server.");
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const local = new PGlite(path.join(process.cwd(), ".data", "pgdata"));
  await local.exec(SCHEMA);
  return { query: async (text, params) => (await local.query(text, params)).rows as never };
}

// One connection (pool) per server process, created on first use. A failed
// connection is not cached, so the next request tries again.
let ready: Promise<Db> | null = null;
export function getDb(): Promise<Db> {
  if (!ready) {
    ready = connect().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}
