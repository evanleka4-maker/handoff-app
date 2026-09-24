// Database layer — deliberately isolated behind these functions so the
// storage engine can be swapped later (e.g. to Postgres via `pg` or an ORM)
// without touching any route or provider code. Every function here is the
// contract; only this file needs to change on a provider swap.
//
// Right now it's backed by node's built-in `node:sqlite` (zero-cost, zero
// native-binary downloads, ships with Node 22.5+) so the whole app runs for
// free with no external database service. On Railway, point DB_PATH at a
// mounted Volume so the file survives redeploys.
//
// --- Swapping to Postgres later ---
// 1. `npm install pg`
// 2. Replace the DatabaseSync calls in this file with `pg` Pool queries,
//    keeping every exported function's name and return shape identical.
// 3. Everything in src/routes/** and src/providers/** is unchanged, because
//    they only ever call the functions exported from this file.

const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const fs = require("node:fs");
const { nanoid } = require("nanoid");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../../data/handoff.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  turnover_start TEXT,
  turnover_end TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS operators (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id),
  label TEXT NOT NULL,
  bed_count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS residents (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id),
  name TEXT NOT NULL,
  access_code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leases (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id),
  resident_id TEXT NOT NULL REFERENCES residents(id),
  status TEXT NOT NULL DEFAULT 'draft', -- draft | sent | signed
  monthly_rent INTEGER,
  term_start TEXT,
  term_end TEXT,
  provider_ref TEXT,
  pdf_path TEXT,
  sent_at TEXT,
  signed_at TEXT,
  reminder_count INTEGER NOT NULL DEFAULT 0,
  last_reminder_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS routing_rules (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id),
  category TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_method TEXT,
  UNIQUE(property_id, category)
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id),
  unit_id TEXT NOT NULL REFERENCES units(id),
  resident_id TEXT NOT NULL REFERENCES residents(id),
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  urgency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open | in_progress | resolved
  assignee TEXT,
  escalated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ticket_events (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  type TEXT NOT NULL, -- created | status_change | note | escalated
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id),
  to_label TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- lease_reminder | ticket_assigned | ticket_escalated | lease_signed
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

function id(prefix) {
  return `${prefix}_${nanoid(12)}`;
}

function row(stmt, ...params) {
  return stmt.get(...params) || null;
}

module.exports = { db, id, row };
