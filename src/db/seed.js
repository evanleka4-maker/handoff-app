// Seeds one demo property so the app is immediately usable after deploy.
// Safe to re-run: it checks for the demo operator email first and no-ops
// if it already exists.
require("dotenv").config();
const bcrypt = require("bcryptjs");
const repo = require("./repo");

async function seed() {
  const existing = repo.getOperatorByEmail("operator@handoff.demo");
  if (existing) {
    console.log("Demo data already seeded (operator@handoff.demo exists). Skipping.");
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

  const demoResidents = [
    { unitLabel: "Unit 101", residentName: "Maya Chen", code: "MAYA-101", rent: 725, signed: true },
    { unitLabel: "Unit 102", residentName: "Devon Ruiz", code: "DEVON-102", rent: 725, signed: false },
    { unitLabel: "Unit 201", residentName: "Priya Patel", code: "PRIYA-201", rent: 799, signed: false },
    { unitLabel: "Unit 214", residentName: "Sam Okafor", code: "SAM-214", rent: 799, signed: true },
  ];

  for (const d of demoResidents) {
    const unit = repo.createUnit({ propertyId: property.id, label: d.unitLabel, bedCount: 1 });
    const resident = repo.createResident({ unitId: unit.id, name: d.residentName, accessCode: d.code });
    const lease = repo.createLease({
      unitId: unit.id,
      residentId: resident.id,
      monthlyRent: d.rent,
      termStart: "2026-08-01",
      termEnd: "2027-07-31",
    });
    if (d.signed) {
      repo.updateLease(lease.id, {
        status: "signed",
        sent_at: new Date().toISOString(),
        signed_at: new Date().toISOString(),
      });
    } else {
      repo.updateLease(lease.id, { status: "sent", sent_at: new Date().toISOString() });
    }

    if (d.unitLabel === "Unit 214") {
      const classifier = require("../providers/classifier");
      const desc = "Wifi has been down in my room since Saturday, router lights are all red.";
      const { category, urgency } = classifier.classify(desc);
      const contact = repo.getRoutingContact(property.id, category);
      repo.createTicket({
        propertyId: property.id,
        unitId: unit.id,
        residentId: resident.id,
        description: desc,
        category,
        urgency,
        assignee: contact ? contact.contact_name : null,
      });
    }
  }

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
