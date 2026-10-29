// Unit readiness: which units are actually ready for move-in, and why not.
// A unit is "ready" only when it has been cleaned, cleared by maintenance,
// passed inspection, has a signed lease, and has no open resident ticket.
// Everything is derived here so cleaning, maintenance and leasing all see
// the same answer instead of keeping their own list.
const { db, id } = require("./index");
const repo = require("./repo");

const CHECKS = ["cleaned", "maintenance", "inspected"];
const LABELS = { cleaned: "cleaning", maintenance: "maintenance", inspected: "inspection" };

function logEvent(propertyId, unitId, text) {
  db.prepare(`INSERT INTO readiness_events (id, property_id, unit_id, text) VALUES (?,?,?,?)`).run(
    id("rev"), propertyId, unitId || null, text
  );
}

function ensureChecks(unitId) {
  const ins = db.prepare(`INSERT OR IGNORE INTO unit_checks (unit_id, check_key, done) VALUES (?,?,0)`);
  CHECKS.forEach((k) => ins.run(unitId, k));
}

function setCheck(unitId, key, done, by) {
  ensureChecks(unitId);
  db.prepare(
    `UPDATE unit_checks SET done = ?, done_by = ?, done_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END
     WHERE unit_id = ? AND check_key = ?`
  ).run(done ? 1 : 0, done ? by : null, done ? 1 : 0, unitId, key);
}

function getChecks(unitId) {
  ensureChecks(unitId);
  const rows = db.prepare(`SELECT * FROM unit_checks WHERE unit_id = ?`).all(unitId);
  const out = {};
  rows.forEach((r) => (out[r.check_key] = r));
  return out;
}

function setFlag(unitId, note) {
  db.prepare(`INSERT OR REPLACE INTO unit_flags (unit_id, note, created_at) VALUES (?,?,datetime('now'))`).run(unitId, note);
}
function clearFlag(unitId) {
  db.prepare(`DELETE FROM unit_flags WHERE unit_id = ?`).run(unitId);
}

function listBoard(propertyId) {
  const units = db.prepare(`SELECT id, label, bed_count FROM units WHERE property_id = ? ORDER BY label`).all(propertyId);
  const checkRows = db
    .prepare(`SELECT c.* FROM unit_checks c JOIN units u ON u.id = c.unit_id WHERE u.property_id = ?`)
    .all(propertyId);
  const flagRows = db
    .prepare(`SELECT f.* FROM unit_flags f JOIN units u ON u.id = f.unit_id WHERE u.property_id = ?`)
    .all(propertyId);
  const leases = repo.listLeasesForProperty(propertyId);
  const tickets = db
    .prepare(
      `SELECT id, unit_id, category, urgency, description, status FROM tickets
       WHERE property_id = ? AND status != 'resolved' ORDER BY created_at DESC`
    )
    .all(propertyId);

  const checksBy = {};
  checkRows.forEach((r) => {
    (checksBy[r.unit_id] = checksBy[r.unit_id] || {})[r.check_key] = r;
  });
  const flagBy = {};
  flagRows.forEach((f) => (flagBy[f.unit_id] = f));
  const leaseBy = {};
  leases.forEach((l) => (leaseBy[l.unit_id] = l));
  const ticketsBy = {};
  tickets.forEach((t) => (ticketsBy[t.unit_id] = ticketsBy[t.unit_id] || []).push(t));

  const summary = { total: units.length, ready: 0, progress: 0, reclean: 0, blocked: 0 };
  const out = units.map((u) => {
    const c = checksBy[u.id] || {};
    const lease = leaseBy[u.id] || null;
    const open = ticketsBy[u.id] || [];
    const flag = flagBy[u.id] || null;
    const checks = {};
    CHECKS.forEach((k) => {
      const r = c[k];
      checks[k] = { done: !!(r && r.done), by: r ? r.done_by : null, at: r ? r.done_at : null };
    });
    const leaseSigned = !!lease && lease.status === "signed";

    let status;
    let reason;
    if (open.length) {
      status = "blocked";
      reason = `Open ${open[0].category} ticket`;
    } else if (flag) {
      status = "reclean";
      reason = flag.note;
    } else {
      const missing = [];
      if (!checks.cleaned.done) missing.push("cleaning");
      if (!checks.maintenance.done) missing.push("maintenance");
      if (checks.cleaned.done && checks.maintenance.done && !checks.inspected.done) missing.push("inspection");
      if (!leaseSigned) missing.push("lease signature");
      if (missing.length) {
        status = "progress";
        reason = `Waiting on ${missing.join(", ")}`;
      } else {
        status = "ready";
        reason = "Cleaned, cleared, inspected and leased";
      }
    }
    summary[status] += 1;
    return {
      id: u.id,
      label: u.label,
      status,
      reason,
      checks,
      lease: lease ? { status: lease.status, resident: lease.resident_name } : null,
      tickets: open.map((t) => ({ id: t.id, category: t.category, urgency: t.urgency, description: t.description })),
    };
  });

  const events = db
    .prepare(`SELECT text, created_at FROM readiness_events WHERE property_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 10`)
    .all(propertyId);
  return { summary, units: out, events };
}

module.exports = { CHECKS, LABELS, logEvent, ensureChecks, setCheck, getChecks, setFlag, clearFlag, listBoard };
