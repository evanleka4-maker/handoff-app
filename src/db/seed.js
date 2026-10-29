// Seeds one demo property so the app is immediately usable after deploy.
// Safe to re-run: it checks for the demo operator email first and no-ops
// if it already exists.
require("dotenv").config();
const bcrypt = require("bcryptjs");
const repo = require("./repo");

async function seed() {
  const existing = repo.getOperatorByEmail("operator@handoff.demo");
  if (existing) {
    console.log("Demo data already seeded (operator@handoff.demo exists).");
    await require("./demo").ensureScale(existing.property_id);
    return;
  }

  const property = repo.createProperty({
    name: "Riverbend Commons",
    address: "412 College Ave, Athens, GA",
    turnoverStart: "2026-08-01",
    turnoverEnd: "2026-08-16",
  });

  const passwordHash = await bcrypt.hash("handoff123", 10);
  const operator = repo.createOperator({
    propertyId: property.id,
    name: "Jordan (Property Manager)",
    email: "operator@handoff.demo",
    passwordHash,
  });

  const routing = [
    { category: "Internet", contactName: "Jordan + ISP rep", contactMethod: "email" },
    { category: "Plumbing", contactName: "Athens Plumbing Co.", contactMethod: "phone" },
    { category: "HVAC", contactName: "Coastal HVAC Services", contactMethod: "phone" },
    { category: "Pest", contactName: "Terminix Athens", contactMethod: "phone" },
    { category: "Electrical", contactName: "Jordan (Property Manager)", contactMethod: "phone" },
    { category: "Appliance", contactName: "Jordan (Property Manager)", contactMethod: "email" },
    { category: "Safety", contactName: "Jordan (Property Manager) — urgent", contactMethod: "phone" },
    { category: "Other", contactName: "Jordan (Property Manager)", contactMethod: "email" },
    { category: "Escalation", contactName: "Jordan (Property Manager) — escalation", contactMethod: "phone" },
  ];
  routing.forEach((r) => repo.upsertRoutingRule({ propertyId: property.id, ...r }));

  await require("./demo").resetDemoFull(property.id);

  console.log("Seeded demo property 'Riverbend Commons'.");
  console.log("Operator login: operator@handoff.demo / handoff123");
  console.log("Resident access codes: MAYA-101, DEVON-102, PRIYA-201, SAM-214");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
