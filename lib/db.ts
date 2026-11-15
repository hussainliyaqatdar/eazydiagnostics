// SERVER-ONLY. The database: Postgres, reached through DATABASE_URL (Render
// Postgres in production). With no DATABASE_URL, local development uses an
// embedded Postgres (PGlite) that keeps its files in .data/pgdata, so nothing has
// to be installed to run the site. Production without DATABASE_URL fails loudly.
import path from "path";

export type Db = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
};

const SCHEMA = `
-- An earlier, never-released shape of the catalog tables (keyed by the lab's code). They hold only what is read
-- from the catalog files, so they are rebuilt in the new shape.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_tests' AND column_name = 'code') THEN
    DROP TABLE catalog_tests;
    DROP TABLE IF EXISTS catalog_packages;
  END IF;
END $$;

-- A clinic can have one or more doctors (multi-speciality clinics). Its logo is kept
-- here as an image (PNG), so there is nothing on disk to lose when the server restarts.
CREATE TABLE IF NOT EXISTS clinics (
  id                text PRIMARY KEY,
  name              text NOT NULL,
  address           text NOT NULL DEFAULT '',
  logo              bytea,
  logo_type         text,
  logo_updated_at   timestamptz,
  -- Who collects the patient's payment for a visit: the clinic (default) or Eazy Diagnostics.
  payment_collector text NOT NULL DEFAULT 'clinic',
  -- Whether the clinic's referral links show the clinic-branded version of the site.
  branded           boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

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

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic_id text REFERENCES clinics(id);
-- A doctor who joined an existing clinic through the public form waits for an admin to
-- approve them before they can be chosen at checkout or messaged.
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT true;
-- B2B discount off the list price, per doctor (not per clinic): routine tests, special
-- tests, packages. Stored for now; there is no automated reconciliation yet.
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS discount_routine integer NOT NULL DEFAULT 35;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS discount_special integer NOT NULL DEFAULT 10;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS discount_package integer NOT NULL DEFAULT 15;
-- Degree / KMC registration certificate (optional).
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS certificate bytea;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS certificate_type text;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS certificate_name text;

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
  payment_status  text NOT NULL DEFAULT 'pending',
  -- The prescribing doctor. doctor_id links to a registered doctor (and is
  -- cleared if they are deleted); the name and clinic are copied so the order
  -- stays readable either way. A typed-in doctor has only referral_name.
  doctor_id       text REFERENCES doctors(id) ON DELETE SET NULL,
  referral_name   text,
  referral_clinic text
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS collection_charge integer;
-- Who each item is for, when a visit has more than one member (null for a single member).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS members jsonb;

-- Where the order is in fulfilment (see lib/order-status.ts). Changed from /admin/orders.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'booked';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_updated_at timestamptz;

ALTER TABLE orders ALTER COLUMN payment_status SET DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status_updated_at timestamptz;
-- Who collects this visit's payment, copied from the prescribing doctor's clinic when
-- the order is placed ('clinic' | 'eazy'); null when no registered doctor is involved.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_collector text;

-- The people in a visit. Every order has at least one (a single-member order has exactly
-- one). Each has their own prescribing doctor and at most one report at a time: a partial
-- one that a full one later replaces. The uploaded file and its branded copy (the clinic's
-- header added) are kept here too.
CREATE TABLE IF NOT EXISTS order_members (
  id              bigserial PRIMARY KEY,
  order_id        text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  position        integer NOT NULL,
  name            text NOT NULL,
  age             text NOT NULL DEFAULT '',
  gender          text NOT NULL DEFAULT '',
  whatsapp        text,
  items           jsonb NOT NULL,
  doctor_id       text REFERENCES doctors(id) ON DELETE SET NULL,
  referral_name   text,
  report_status   text NOT NULL DEFAULT 'none',
  report_status_updated_at timestamptz,
  report_filename text,
  report_original bytea,
  report_branded  bytea,
  report_token    text,
  report_updated_at timestamptz,
  UNIQUE (order_id, position)
);
CREATE INDEX IF NOT EXISTS order_members_order_idx ON order_members (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS order_members_token_idx ON order_members (report_token) WHERE report_token IS NOT NULL;

-- One row per WhatsApp message sent about an order, so the admin can see what reached
-- whom and why a message failed.
CREATE TABLE IF NOT EXISTS order_notifications (
  id          bigserial PRIMARY KEY,
  order_id    text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status      text NOT NULL,
  recipient   text NOT NULL,
  to_number   text NOT NULL,
  ok          boolean NOT NULL,
  detail      text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_notifications_order_idx ON order_notifications (order_id, created_at);
-- Names the event a message is about ("visit:samples_collected:<time>", "report:<member>:full")
-- so the same message cannot be recorded, or sent, twice to the same number.
ALTER TABLE order_notifications ADD COLUMN IF NOT EXISTS event_key text;
CREATE UNIQUE INDEX IF NOT EXISTS order_notifications_event_idx ON order_notifications (order_id, to_number, event_key) WHERE event_key IS NOT NULL;

-- Which template a message used and how far it got (sent / delivered / read / failed), updated from
-- WhatsApp's webhook. wa_message_id is the id WhatsApp gave the message when it accepted it.
ALTER TABLE order_notifications ADD COLUMN IF NOT EXISTS template text;
ALTER TABLE order_notifications ADD COLUMN IF NOT EXISTS wa_message_id text;
ALTER TABLE order_notifications ADD COLUMN IF NOT EXISTS delivery_status text;
ALTER TABLE order_notifications ADD COLUMN IF NOT EXISTS delivery_updated_at timestamptz;
CREATE INDEX IF NOT EXISTS order_notifications_wa_idx ON order_notifications (wa_message_id) WHERE wa_message_id IS NOT NULL;

-- WhatsApp message templates managed from /admin/whatsapp. A template is written here, submitted to
-- Meta for approval, and once APPROVED is used for the events it is bound to. variables[i] says what
-- fills {{i+1}} (a key from lib/whatsapp-events.ts).
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id              bigserial PRIMARY KEY,
  name            text NOT NULL,
  language        text NOT NULL DEFAULT 'en',
  category        text NOT NULL DEFAULT 'UTILITY',
  audience        text NOT NULL,
  events          jsonb NOT NULL DEFAULT '[]',
  body            text NOT NULL,
  footer          text,
  variables       jsonb NOT NULL DEFAULT '[]',
  meta_id         text,
  status          text NOT NULL DEFAULT 'DRAFT',
  rejected_reason text,
  enabled         boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  synced_at       timestamptz,
  UNIQUE (name, language)
);

-- Images uploaded on /admin/whatsapp to use as a template's header (e.g. a payment QR code). Stored here
-- because the host has no persistent disk. token makes the public URL WhatsApp fetches unguessable.
CREATE TABLE IF NOT EXISTS whatsapp_media (
  id           bigserial PRIMARY KEY,
  name         text NOT NULL,
  content_type text NOT NULL,
  data         bytea NOT NULL,
  size         integer NOT NULL,
  token        text NOT NULL UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now()
);
-- A template's header image: which library image is sent with it ("IMAGE" format = it has an image header).
ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS header_format text;
ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS header_media_id bigint REFERENCES whatsapp_media(id) ON DELETE SET NULL;

-- The catalog: every test and package ("panel"), so it can be managed from /admin/catalog.
--  * internal_id is OURS: unique, permanent, never shown to a lab, and what carts, packages and orders refer to.
--  * Each partner lab has its own ids for the same things. They live in catalog_lab_ids (internal id <-> that lab's
--    external id), one row per item per lab, so switching partner labs means adding mappings, not renaming anything.
--  * Packages with an owner_doctor_id are custom panels, shown only on that doctor's affiliate link.
-- The site reads the catalog from memory (see lib/catalog-store.ts); catalog_meta's version changes on every edit so
-- every server picks the change up.
CREATE SEQUENCE IF NOT EXISTS catalog_test_seq;
CREATE SEQUENCE IF NOT EXISTS catalog_package_seq;
CREATE TABLE IF NOT EXISTS labs (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  -- The lab orders are sent to now. Exactly one lab is current (see labs_one_current).
  is_current boolean NOT NULL DEFAULT false,
  active     boolean NOT NULL DEFAULT true,
  notes      text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS labs_one_current ON labs (is_current) WHERE is_current;
INSERT INTO labs (id, name, is_current) VALUES ('srl', 'SRL Diagnostics (Agilus)', true)
  ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS catalog_tests (
  internal_id text PRIMARY KEY,
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  lab_name    text NOT NULL DEFAULT '',
  raw_name    text NOT NULL DEFAULT '',
  aliases     jsonb NOT NULL DEFAULT '[]',
  price       integer NOT NULL,
  mrp         integer,
  type        text NOT NULL DEFAULT 'Routine',
  popular     boolean NOT NULL DEFAULT false,
  curated     boolean NOT NULL DEFAULT false,
  category    text NOT NULL DEFAULT 'Other',
  sample_type text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  eta         text NOT NULL DEFAULT '',
  faqs        jsonb,
  seo         jsonb,
  active      boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS catalog_packages (
  internal_id    text PRIMARY KEY,
  slug           text NOT NULL UNIQUE,
  name           text NOT NULL,
  category       text NOT NULL DEFAULT 'Other',
  price          integer NOT NULL,
  mrp            integer,
  tagline        text NOT NULL DEFAULT '',
  description    text NOT NULL DEFAULT '',
  constituents   jsonb NOT NULL DEFAULT '[]',
  needs_content  boolean NOT NULL DEFAULT false,
  eta            text NOT NULL DEFAULT '',
  faqs           jsonb,
  active         boolean NOT NULL DEFAULT true,
  sort_order     integer NOT NULL DEFAULT 0,
  owner_doctor_id text REFERENCES doctors(id) ON DELETE CASCADE,
  template_slug  text,
  b2b_price      integer,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_packages_owner_idx ON catalog_packages (owner_doctor_id);
-- internal id <-> a lab's own id. kind is 'test' or 'package'. cost is what that lab charges us, if known.
CREATE TABLE IF NOT EXISTS catalog_lab_ids (
  lab_id      text NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('test', 'package')),
  internal_id text NOT NULL,
  external_id text NOT NULL,
  cost        integer,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lab_id, kind, internal_id),
  UNIQUE (lab_id, kind, external_id)
);
CREATE TABLE IF NOT EXISTS catalog_meta (
  id      integer PRIMARY KEY,
  version bigint NOT NULL DEFAULT 1
);
INSERT INTO catalog_meta (id, version) VALUES (1, 1) ON CONFLICT (id) DO NOTHING;

-- Which lab an order was placed for (its lines carry that lab's ids as they were then).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lab_id text;

-- The audit trail of an order: every status change, report upload and removal (WhatsApp sends are
-- in order_notifications and merged in when it is shown).
CREATE TABLE IF NOT EXISTS order_events (
  id          bigserial PRIMARY KEY,
  order_id    text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kind        text NOT NULL,
  member_name text,
  summary     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_events_order_idx ON order_events (order_id, created_at);

CREATE INDEX IF NOT EXISTS orders_collection_idx ON orders (collection_date, collection_slot);
CREATE INDEX IF NOT EXISTS orders_doctor_idx ON orders (doctor_id);
`;

// Brings data saved before clinics, order members and the new statuses onto the new shape.
// Idempotent: each statement only touches rows that are not converted yet.
const MIGRATE = `
-- Every doctor belongs to a clinic: give each existing doctor their own (an admin can merge them).
INSERT INTO clinics (id, name, branded)
  SELECT 'CL-' || substr(id, 4), clinic, false FROM doctors WHERE clinic_id IS NULL
  ON CONFLICT (id) DO NOTHING;
UPDATE doctors SET clinic_id = 'CL-' || substr(id, 4) WHERE clinic_id IS NULL;

-- Order statuses, renamed.
UPDATE orders SET status = 'visit_scheduled' WHERE status IN ('confirmed', 'on_the_way');
UPDATE orders SET status = 'samples_collected' WHERE status = 'collected';
UPDATE orders SET status = 'reached_lab' WHERE status = 'processing';
UPDATE orders SET status = 'completed' WHERE status = 'report_ready';
UPDATE orders SET payment_status = 'pending' WHERE payment_status = 'due';

-- A member row for every order that has none yet.
INSERT INTO order_members (order_id, position, name, age, gender, whatsapp, items, doctor_id, referral_name)
  SELECT o.id, 0, o.patient->>'name', COALESCE(o.patient->>'age', ''), COALESCE(o.patient->>'gender', ''),
         o.patient->>'whatsapp', o.items, o.doctor_id, o.referral_name
  FROM orders o
  WHERE o.members IS NULL AND NOT EXISTS (SELECT 1 FROM order_members m WHERE m.order_id = o.id);
INSERT INTO order_members (order_id, position, name, age, gender, whatsapp, items, doctor_id, referral_name)
  SELECT o.id, (e.ord - 1)::int, e.m->>'name', COALESCE(e.m->>'age', ''), COALESCE(e.m->>'gender', ''),
         e.m->>'whatsapp', e.m->'items', o.doctor_id, o.referral_name
  FROM orders o, jsonb_array_elements(o.members) WITH ORDINALITY AS e(m, ord)
  WHERE o.members IS NOT NULL AND NOT EXISTS (SELECT 1 FROM order_members m WHERE m.order_id = o.id);
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
    await pool.query(MIGRATE);
    return { query: async (text, params) => (await pool.query(text, params as unknown[])).rows };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is not set. Create a Postgres database (e.g. on Render) and set DATABASE_URL on the server.");
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const local = new PGlite(path.join(process.cwd(), ".data", "pgdata"));
  await local.exec(SCHEMA);
  await local.exec(MIGRATE);
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
