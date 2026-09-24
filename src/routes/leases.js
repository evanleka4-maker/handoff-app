const express = require("express");
const fs = require("node:fs");
const repo = require("../db/repo");
const signature = require("../providers/signature");
const notify = require("../providers/notify");
const { requireOperator, requireResident } = require("../middleware/auth");

const router = express.Router();

// ---- Operator: list all leases for their property ----
router.get("/", requireOperator, (req, res) => {
  const leases = repo.listLeasesForProperty(req.session.propertyId);
  res.json({ leases });
});

// ---- Resident routes (registered before the /:id/* operator routes below,
// since "mine" would otherwise be captured as an :id param) ----
router.get("/mine", requireResident, (req, res) => {
  const lease = repo.getLeaseByResident(req.session.residentId);
  res.json({ lease });
});

router.get("/mine/pdf", requireResident, (req, res) => {
  const lease = repo.getLeaseByResident(req.session.residentId);
  if (!lease) return res.status(404).json({ error: "No lease found" });
  const pdfPath = signature.pdfPathFor(lease.id);
  if (!fs.existsSync(pdfPath)) return res.status(404).json({ error: "Lease document not generated yet" });
  res.sendFile(pdfPath);
});

router.post("/mine/sign", requireResident, async (req, res) => {
  const lease = repo.getLeaseByResident(req.session.residentId);
  if (!lease) return res.status(404).json({ error: "No lease found" });
  if (lease.status === "signed") return res.json({ lease });

  const unit = repo.getUnit(lease.unit_id);
  const resident = repo.getResident(lease.resident_id);
  const property = repo.getProperty(req.session.propertyId);
  const signedAt = new Date().toISOString();

  await signature.markSigned({ lease, unit, resident, property, signedAt });
  const updated = repo.updateLease(lease.id, { status: "signed", signed_at: signedAt });

  await notify.notify({
    propertyId: property.id,
    to: "Operator",
    subject: `${resident.name} signed their lease`,
    message: `${resident.name} (${unit.label}) just signed their lease.`,
    type: "lease_signed",
  });

  res.json({ lease: updated });
});

// ---- Operator: generate + "send" a lease to a resident ----
router.post("/:id/send", requireOperator, async (req, res) => {
  const lease = repo.getLease(req.params.id);
  if (!lease) return res.status(404).json({ error: "Lease not found" });

  const unit = repo.getUnit(lease.unit_id);
  const resident = repo.getResident(lease.resident_id);
  const property = repo.getProperty(req.session.propertyId);
  if (unit.property_id !== req.session.propertyId) return res.status(403).json({ error: "Forbidden" });

  await signature.generateLeaseDocument({ lease, unit, resident, property });
  const updated = repo.updateLease(lease.id, {
    status: "sent",
    sent_at: new Date().toISOString(),
  });

  await notify.notify({
    propertyId: property.id,
    to: resident.name,
    subject: "Your lease is ready to sign",
    message: `Lease for ${unit.label} is ready. Sign it in the resident portal.`,
    type: "lease_reminder",
  });

  res.json({ lease: updated });
});

// ---- Operator: send a reminder for an unsigned lease ----
router.post("/:id/remind", requireOperator, async (req, res) => {
  const lease = repo.getLease(req.params.id);
  if (!lease) return res.status(404).json({ error: "Lease not found" });
  const unit = repo.getUnit(lease.unit_id);
  if (unit.property_id !== req.session.propertyId) return res.status(403).json({ error: "Forbidden" });
  const resident = repo.getResident(lease.resident_id);

  const updated = repo.updateLease(lease.id, {
    reminder_count: (lease.reminder_count || 0) + 1,
    last_reminder_at: new Date().toISOString(),
  });

  await notify.notify({
    propertyId: req.session.propertyId,
    to: resident.name,
    subject: "Reminder: sign your lease",
    message: `Your lease for ${unit.label} is still unsigned. Please sign it in the resident portal.`,
    type: "lease_reminder",
  });

  res.json({ lease: updated });
});

// ---- Operator: download the current lease PDF ----
router.get("/:id/pdf", requireOperator, (req, res) => {
  const lease = repo.getLease(req.params.id);
  if (!lease) return res.status(404).json({ error: "Lease not found" });
  const unit = repo.getUnit(lease.unit_id);
  if (unit.property_id !== req.session.propertyId) return res.status(403).json({ error: "Forbidden" });
  const pdfPath = signature.pdfPathFor(lease.id);
  if (!fs.existsSync(pdfPath)) return res.status(404).json({ error: "Lease document not generated yet" });
  res.sendFile(pdfPath);
});

module.exports = router;
