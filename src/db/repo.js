// Repository functions — one small function per query, called by routes.
// Keeping these separate from index.js (schema/connection) means a swap to
// a different driver only touches these bodies, never the routes.
const { db, id } = require("./index");

const repo = {
  // ---- properties ----
  createProperty({ name, address, turnoverStart, turnoverEnd }) {
    const pid = id("prop");
    db.prepare(
      `INSERT INTO properties (id, name, address, turnover_start, turnover_end) VALUES (?,?,?,?,?)`
    ).run(pid, name, address || null, turnoverStart || null, turnoverEnd || null);
    return repo.getProperty(pid);
  },
  getProperty(propertyId) {
    return db.prepare(`SELECT * FROM properties WHERE id = ?`).get(propertyId) || null;
  },

  // ---- operators ----
  createOperator({ propertyId, name, email, passwordHash }) {
    const oid = id("op");
    db.prepare(
      `INSERT INTO operators (id, property_id, name, email, password_hash) VALUES (?,?,?,?,?)`
    ).run(oid, propertyId, name, email.toLowerCase(), passwordHash);
    return repo.getOperatorById(oid);
  },
  getOperatorByEmail(email) {
    return db.prepare(`SELECT * FROM operators WHERE email = ?`).get(email.toLowerCase()) || null;
  },
  getOperatorById(opId) {
    return db.prepare(`SELECT * FROM operators WHERE id = ?`).get(opId) || null;
  },

  // ---- units ----
  createUnit({ propertyId, label, bedCount }) {
    const uid = id("unit");
    db.prepare(`INSERT INTO units (id, property_id, label, bed_count) VALUES (?,?,?,?)`).run(
      uid,
      propertyId,
      label,
      bedCount || 1
    );
    return repo.getUnit(uid);
  },
  getUnit(unitId) {
    return db.prepare(`SELECT * FROM units WHERE id = ?`).get(unitId) || null;
  },
  listUnits(propertyId) {
    return db.prepare(`SELECT * FROM units WHERE property_id = ? ORDER BY label`).all(propertyId);
  },

  // ---- residents ----
  createResident({ unitId, name, accessCode }) {
    const rid = id("res");
    db.prepare(`INSERT INTO residents (id, unit_id, name, access_code) VALUES (?,?,?,?)`).run(
      rid,
      unitId,
      name,
      accessCode
    );
    return repo.getResident(rid);
  },
  getResident(residentId) {
    return db.prepare(`SELECT * FROM residents WHERE id = ?`).get(residentId) || null;
  },
  getResidentByAccessCode(code) {
    return db.prepare(`SELECT * FROM residents WHERE access_code = ?`).get(code) || null;
  },

  // ---- leases ----
  createLease({ unitId, residentId, monthlyRent, termStart, termEnd }) {
    const lid = id("lease");
    db.prepare(
      `INSERT INTO leases (id, unit_id, resident_id, monthly_rent, term_start, term_end) VALUES (?,?,?,?,?,?)`
    ).run(lid, unitId, residentId, monthlyRent || null, termStart || null, termEnd || null);
    return repo.getLease(lid);
  },
  getLease(leaseId) {
    return db.prepare(`SELECT * FROM leases WHERE id = ?`).get(leaseId) || null;
  },
  getLeaseByResident(residentId) {
    return (
      db
        .prepare(`SELECT * FROM leases WHERE resident_id = ? ORDER BY created_at DESC LIMIT 1`)
        .get(residentId) || null
    );
  },
  listLeasesForProperty(propertyId) {
    return db
      .prepare(
        `SELECT l.*, u.label as unit_label, r.name as resident_name, r.id as resident_id
         FROM leases l
         JOIN units u ON u.id = l.unit_id
         JOIN residents r ON r.id = l.resident_id
         WHERE u.property_id = ?
         ORDER BY u.label`
      )
      .all(propertyId);
  },
  updateLease(leaseId, fields) {
    const cols = Object.keys(fields);
    if (!cols.length) return repo.getLease(leaseId);
    const set = cols.map((c) => `${c} = ?`).join(", ");
    db.prepare(`UPDATE leases SET ${set} WHERE id = ?`).run(...cols.map((c) => fields[c]), leaseId);
    return repo.getLease(leaseId);
  },

  // ---- routing rules ----
  upsertRoutingRule({ propertyId, category, contactName, contactMethod }) {
    const existing = db
      .prepare(`SELECT * FROM routing_rules WHERE property_id = ? AND category = ?`)
      .get(propertyId, category);
    if (existing) {
      db.prepare(`UPDATE routing_rules SET contact_name = ?, contact_method = ? WHERE id = ?`).run(
        contactName,
        contactMethod || null,
        existing.id
      );
      return { ...existing, contact_name: contactName, contact_method: contactMethod };
    }
    const rid = id("route");
    db.prepare(
      `INSERT INTO routing_rules (id, property_id, category, contact_name, contact_method) VALUES (?,?,?,?,?)`
    ).run(rid, propertyId, category, contactName, contactMethod || null);
    return db.prepare(`SELECT * FROM routing_rules WHERE id = ?`).get(rid);
  },
  listRoutingRules(propertyId) {
    return db
      .prepare(`SELECT * FROM routing_rules WHERE property_id = ? ORDER BY category`)
      .all(propertyId);
  },
  getRoutingContact(propertyId, category) {
    return (
      db
        .prepare(`SELECT * FROM routing_rules WHERE property_id = ? AND category = ?`)
        .get(propertyId, category) || null
    );
  },

  // ---- tickets ----
  createTicket({ propertyId, unitId, residentId, description, category, urgency, assignee }) {
    const tid = id("tkt");
    db.prepare(
      `INSERT INTO tickets (id, property_id, unit_id, resident_id, description, category, urgency, assignee)
       VALUES (?,?,?,?,?,?,?,?)`
    ).run(tid, propertyId, unitId, residentId, description, category, urgency, assignee || null);
    repo.addTicketEvent(tid, "created", `Reported as ${category} (${urgency})`);
    return repo.getTicket(tid);
  },
  getTicket(ticketId) {
    return db.prepare(`SELECT * FROM tickets WHERE id = ?`).get(ticketId) || null;
  },
  listTicketsForProperty(propertyId) {
    return db
      .prepare(
        `SELECT t.*, u.label as unit_label, r.name as resident_name
         FROM tickets t
         JOIN units u ON u.id = t.unit_id
         JOIN residents r ON r.id = t.resident_id
         WHERE t.property_id = ?
         ORDER BY t.created_at DESC`
      )
      .all(propertyId);
  },
  listTicketsForResident(residentId) {
    return db
      .prepare(`SELECT * FROM tickets WHERE resident_id = ? ORDER BY created_at DESC`)
      .all(residentId);
  },
  updateTicket(ticketId, fields) {
    const cols = Object.keys(fields);
    if (!cols.length) return repo.getTicket(ticketId);
    const set = cols.map((c) => `${c} = ?`).join(", ");
    db.prepare(`UPDATE tickets SET ${set}, updated_at = datetime('now') WHERE id = ?`).run(
      ...cols.map((c) => fields[c]),
      ticketId
    );
    return repo.getTicket(ticketId);
  },
  addTicketEvent(ticketId, type, note) {
    const eid = id("evt");
    db.prepare(`INSERT INTO ticket_events (id, ticket_id, type, note) VALUES (?,?,?,?)`).run(
      eid,
      ticketId,
      type,
      note || null
    );
  },
  listTicketEvents(ticketId) {
    return db
      .prepare(`SELECT * FROM ticket_events WHERE ticket_id = ? ORDER BY created_at ASC`)
      .all(ticketId);
  },
  listStaleOpenTickets(propertyId, hoursThreshold) {
    return db
      .prepare(
        `SELECT * FROM tickets
         WHERE property_id = ? AND status != 'resolved' AND escalated = 0
         AND datetime(created_at) <= datetime('now', ?)`
      )
      .all(propertyId, `-${hoursThreshold} hours`);
  },

  // ---- notifications ----
  createNotification({ propertyId, to, subject, message, type }) {
    const nid = id("notif");
    db.prepare(
      `INSERT INTO notifications (id, property_id, to_label, subject, message, type) VALUES (?,?,?,?,?,?)`
    ).run(nid, propertyId, to, subject, message, type);
    return db.prepare(`SELECT * FROM notifications WHERE id = ?`).get(nid);
  },
  listNotifications(propertyId, limit = 50) {
    return db
      .prepare(`SELECT * FROM notifications WHERE property_id = ? ORDER BY created_at DESC LIMIT ?`)
      .all(propertyId, limit);
  },
};

module.exports = repo;
