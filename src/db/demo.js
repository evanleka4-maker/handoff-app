// Synthetic demo data for "Riverbend Commons": 40 units in move-in week.
// Every name, lease and ticket here is invented for demonstration. It is not
// evidence from real operators or residents.
const { db } = require("./index");
const repo = require("./repo");
const readiness = require("./readiness");
const classifier = require("../providers/classifier");

const LABELS = [];
for (let n = 1; n <= 12; n++) LABELS.push(`Unit ${100 + n}`);
for (let n = 1; n <= 14; n++) LABELS.push(`Unit ${200 + n}`);
for (let n = 1; n <= 14; n++) LABELS.push(`Unit ${300 + n}`);

const FIXED = {
  "Unit 101": { name: "Maya Chen", code: "MAYA-101", rent: 725, lease: "signed" },
  "Unit 102": { name: "Devon Ruiz", code: "DEVON-102", rent: 725, lease: "sent" },
  "Unit 201": { name: "Priya Patel", code: "PRIYA-201", rent: 799, lease: "sent" },
  "Unit 214": { name: "Sam Okafor", code: "SAM-214", rent: 799, lease: "signed" },
};

const NAMES = [
  "Ava Thompson", "Marcus Bell", "Lena Ortiz", "Jamal Carter", "Sofia Reyes", "Noah Kim", "Grace Nguyen",
  "Elijah Foster", "Hannah Brooks", "Caleb Price", "Zoe Alvarez", "Isaac Moore", "Mia Hughes", "Tyler Grant",
  "Nora Singh", "Owen Walsh", "Layla Hassan", "Ethan Rivera", "Chloe Dixon", "Andre Washington", "Ruby Park",
  "Liam Sullivan", "Tessa Morgan", "Darius Cole", "Emma Lopez", "Jonah Patel", "Kayla Freeman", "Miles Bennett",
  "Sienna Ford", "Wesley Tran", "Alana Reid", "Bryce Coleman", "Daniela Cruz", "Felix Wagner", "Imani Jackson",
  "Julian Hayes", "Keira Powell", "Landon Pierce",
];

function resetDemo(propertyId) {
  const q = (sql, ...p) => db.prepare(sql).run(...p);
  db.exec("BEGIN");
  try {
    q(`DELETE FROM ticket_events WHERE ticket_id IN (SELECT id FROM tickets WHERE property_id = ?)`, propertyId);
    q(`DELETE FROM tickets WHERE property_id = ?`, propertyId);
    q(`DELETE FROM notifications WHERE property_id = ?`, propertyId);
    q(`DELETE FROM readiness_events WHERE property_id = ?`, propertyId);
    q(`DELETE FROM unit_checks WHERE unit_id IN (SELECT id FROM units WHERE property_id = ?)`, propertyId);
    q(`DELETE FROM unit_flags WHERE unit_id IN (SELECT id FROM units WHERE property_id = ?)`, propertyId);
    q(`DELETE FROM leases WHERE unit_id IN (SELECT id FROM units WHERE property_id = ?)`, propertyId);
    q(`DELETE FROM residents WHERE unit_id IN (SELECT id FROM units WHERE property_id = ?)`, propertyId);
    q(`DELETE FROM units WHERE property_id = ?`, propertyId);

    // Put the turnover window around today so the dashboard reads as "mid move-in week".
    const day = 86400000;
    const iso = (t) => new Date(t).toISOString().slice(0, 10);
    q(`UPDATE properties SET turnover_start = ?, turnover_end = ? WHERE id = ?`, iso(Date.now() - 9 * day), iso(Date.now() + 6 * day), propertyId);

    const by = { cleaned: "Cleaning crew", maintenance: "Maintenance", inspected: "Jordan" };
    const ago = (h) => `-${h} hours`;
    const unitByLabel = {};
    let nameIdx = 0;

    LABELS.forEach((label, i) => {
      const unit = repo.createUnit({ propertyId, label, bedCount: i % 4 === 0 ? 2 : 1 });
      unitByLabel[label] = unit;
      const fixed = FIXED[label];
      const name = fixed ? fixed.name : NAMES[nameIdx++ % NAMES.length];
      const code = fixed ? fixed.code : `${name.split(" ")[0].toUpperCase()}-${label.slice(-3)}`;
      const resident = repo.createResident({ unitId: unit.id, name, accessCode: code });
      const lease = repo.createLease({
        unitId: unit.id,
        residentId: resident.id,
        monthlyRent: fixed ? fixed.rent : 689 + (i % 5) * 25,
        termStart: "2026-08-01",
        termEnd: "2027-07-31",
      });
      const signed = fixed ? fixed.lease === "signed" : i % 7 !== 3;
      const stamp = new Date(Date.now() - (30 + i) * 3600 * 1000).toISOString();
      repo.updateLease(lease.id, signed ? { status: "signed", sent_at: stamp, signed_at: stamp } : { status: "sent", sent_at: stamp });

      // Where each unit is in the turnover pipeline.
      let cleaned = true, maint = true, insp = true;
      if (i >= 22 && i <= 31) insp = false;
      if (i >= 32 && i <= 37) { maint = false; insp = false; }
      if (i >= 38) { cleaned = false; maint = false; insp = false; }
      if (label === "Unit 112") insp = false; // demo: inspector fails this one live
      readiness.ensureChecks(unit.id);
      const hrs = 5 + ((i * 7) % 40);
      if (cleaned) readiness.setCheck(unit.id, "cleaned", true, by.cleaned);
      if (maint) readiness.setCheck(unit.id, "maintenance", true, by.maintenance);
      if (insp) readiness.setCheck(unit.id, "inspected", true, by.inspected);
      db.prepare(`UPDATE unit_checks SET done_at = datetime('now', ?) WHERE unit_id = ? AND done = 1`).run(ago(hrs), unit.id);
    });

    // One unit already sent back by the inspector.
    const u108 = unitByLabel["Unit 108"];
    readiness.setCheck(u108.id, "cleaned", false);
    readiness.setCheck(u108.id, "inspected", false);
    readiness.setFlag(u108.id, "Inspection failed: oven and bathroom grout not clean");
    readiness.logEvent(propertyId, u108.id, "Unit 108: inspection failed, sent back to cleaning (oven and bathroom grout)");

    const openTicket = (label, text) => {
      const unit = unitByLabel[label];
      const resident = db.prepare(`SELECT * FROM residents WHERE unit_id = ?`).get(unit.id);
      const { category, urgency } = classifier.classify(text);
      const contact = repo.getRoutingContact(propertyId, category);
      const t = repo.createTicket({
        propertyId, unitId: unit.id, residentId: resident.id, description: text, category, urgency,
        assignee: contact ? contact.contact_name : null,
      });
      if (contact) repo.addTicketEvent(t.id, "note", `Routed to ${contact.contact_name}`);
      readiness.logEvent(propertyId, unit.id, `${label}: new ${category} ticket, unit marked blocked`);
    };
    openTicket("Unit 214", "Wifi has been down in my room since Saturday, router lights are all red.");
    openTicket("Unit 205", "The thermostat is stuck at 85 and the AC will not turn on.");
    readiness.logEvent(propertyId, null, "Move-in week started: 40 units, synthetic demo data loaded");

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

// Reset, then render a signed PDF for every signed demo lease so
// "View signed lease" works for each resident.
async function resetDemoFull(propertyId) {
  resetDemo(propertyId);
  const signature = require("../providers/signature");
  const property = repo.getProperty(propertyId);
  for (const l of repo.listLeasesForProperty(propertyId)) {
    if (l.status !== "signed") continue;
    await signature.markSigned({
      lease: l,
      unit: repo.getUnit(l.unit_id),
      resident: repo.getResident(l.resident_id),
      property,
      signedAt: l.signed_at,
    });
  }
}

// Called on startup: if the demo property still has only the original four
// units, load the full 40-unit scenario. Safe to run repeatedly.
async function ensureScale(propertyId) {
  const n = db.prepare(`SELECT COUNT(*) AS c FROM units WHERE property_id = ?`).get(propertyId).c;
  if (n < 30) {
    await resetDemoFull(propertyId);
    console.log("Loaded 40-unit synthetic demo scenario.");
  }
}

module.exports = { resetDemo, resetDemoFull, ensureScale };
