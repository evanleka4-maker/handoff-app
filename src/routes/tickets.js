const express = require("express");
const repo = require("../db/repo");
const classifier = require("../providers/classifier");
const notify = require("../providers/notify");
const readiness = require("../db/readiness");
const { requireOperator, requireResident } = require("../middleware/auth");

const router = express.Router();

// ---- Operator: list all tickets for their property ----
router.get("/", requireOperator, (req, res) => {
  const tickets = repo.listTicketsForProperty(req.session.propertyId);
  res.json({ tickets });
});

router.get("/:id/events", requireOperator, (req, res) => {
  const ticket = repo.getTicket(req.params.id);
  if (!ticket || ticket.property_id !== req.session.propertyId) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  res.json({ events: repo.listTicketEvents(ticket.id) });
});

// ---- Operator: update status / assignee ----
router.patch("/:id", requireOperator, async (req, res) => {
  const ticket = repo.getTicket(req.params.id);
  if (!ticket || ticket.property_id !== req.session.propertyId) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  const { status, assignee } = req.body || {};
  const fields = {};
  if (status) fields.status = status;
  if (assignee !== undefined) fields.assignee = assignee;

  const updated = repo.updateTicket(ticket.id, fields);
  if (status && status !== ticket.status) {
    repo.addTicketEvent(ticket.id, "status_change", `Status changed to ${status}`);
    if (status === "resolved") {
      const unit = repo.getUnit(ticket.unit_id);
      readiness.logEvent(ticket.property_id, ticket.unit_id, `${unit.label}: ${ticket.category} ticket resolved, block lifted`);
    }
  }
  if (assignee !== undefined && assignee !== ticket.assignee) {
    repo.addTicketEvent(ticket.id, "note", `Assigned to ${assignee || "unassigned"}`);
  }

  res.json({ ticket: updated });
});

// ---- Operator: routing rules ----
router.get("/routing", requireOperator, (req, res) => {
  res.json({ rules: repo.listRoutingRules(req.session.propertyId) });
});
router.put("/routing", requireOperator, (req, res) => {
  const { category, contactName, contactMethod } = req.body || {};
  if (!category || !contactName) return res.status(400).json({ error: "category and contactName required" });
  const rule = repo.upsertRoutingRule({
    propertyId: req.session.propertyId,
    category,
    contactName,
    contactMethod,
  });
  res.json({ rule });
});

// ---- Resident: list my tickets ----
router.get("/mine", requireResident, (req, res) => {
  const tickets = repo.listTicketsForResident(req.session.residentId);
  res.json({ tickets });
});

// ---- Resident: report an issue (this is the AI-triage entry point) ----
router.post("/mine", requireResident, async (req, res) => {
  const { description } = req.body || {};
  if (!description || !description.trim()) {
    return res.status(400).json({ error: "Description required" });
  }

  const { category, urgency } = classifier.classify(description);
  const contact = repo.getRoutingContact(req.session.propertyId, category);
  const assignee = contact ? contact.contact_name : null;

  const ticket = repo.createTicket({
    propertyId: req.session.propertyId,
    unitId: req.session.unitId,
    residentId: req.session.residentId,
    description: description.trim(),
    category,
    urgency,
    assignee,
  });

  if (assignee) {
    await notify.notify({
      propertyId: req.session.propertyId,
      to: assignee,
      subject: `New ${category} ticket (${urgency})`,
      message: description.trim(),
      type: "ticket_assigned",
    });
    repo.addTicketEvent(ticket.id, "note", `Routed to ${assignee}`);
  } else {
    repo.addTicketEvent(ticket.id, "note", "No routing rule set for this category — needs manual assignment");
  }

  const unitRow = repo.getUnit(req.session.unitId);
  readiness.logEvent(req.session.propertyId, req.session.unitId, `${unitRow.label}: new ${category} ticket from resident, unit marked blocked`);

  res.status(201).json({ ticket });
});

module.exports = router;
