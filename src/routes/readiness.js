const express = require("express");
const repo = require("../db/repo");
const readiness = require("../db/readiness");
const demo = require("../db/demo");
const notify = require("../providers/notify");
const { requireOperator, requireResident } = require("../middleware/auth");

const router = express.Router();
const ACTOR = { cleaned: "Cleaning crew", maintenance: "Maintenance", inspected: "Jordan (inspection)" };
const WHAT = { cleaned: "cleaned", maintenance: "cleared by maintenance", inspected: "passed inspection" };

router.get("/", requireOperator, (req, res) => {
  res.json(readiness.listBoard(req.session.propertyId));
});

// Resident: where is my unit in turnover prep, in plain language.
router.get("/mine", requireResident, (req, res) => {
  const board = readiness.listBoard(req.session.propertyId);
  const u = board.units.find((x) => x.id === req.session.unitId);
  if (!u) return res.status(404).json({ error: "Unit not found" });
  const text = {
    ready: "Your unit is ready for move-in.",
    reclean: "Final cleaning is in progress.",
    blocked: "We are fixing an issue before move-in.",
    progress: u.reason,
  }[u.status];
  res.json({
    status: u.status,
    message: text,
    steps: [
      { label: "Cleaned", done: u.checks.cleaned.done },
      { label: "Repairs and maintenance", done: u.checks.maintenance.done },
      { label: "Final inspection", done: u.checks.inspected.done },
      { label: "Lease signed", done: !!u.lease && u.lease.status === "signed" },
    ],
  });
});

// Restore the scripted demo scenario (wipes this property's demo data).
router.post("/demo/reset", requireOperator, async (req, res) => {
  await demo.resetDemoFull(req.session.propertyId);
  res.json({ ok: true });
});

function loadUnit(req, res) {
  const unit = repo.getUnit(req.params.unitId);
  if (!unit || unit.property_id !== req.session.propertyId) {
    res.status(404).json({ error: "Unit not found" });
    return null;
  }
  return unit;
}

router.post("/:unitId/check", requireOperator, (req, res) => {
  const unit = loadUnit(req, res);
  if (!unit) return;
  const { key, done } = req.body || {};
  if (!readiness.CHECKS.includes(key)) return res.status(400).json({ error: "Unknown check" });
  const checks = readiness.getChecks(unit.id);

  if (key === "inspected" && done && !(checks.cleaned.done && checks.maintenance.done)) {
    return res.status(400).json({ error: "A unit can only be inspected after cleaning and maintenance are done" });
  }

  readiness.setCheck(unit.id, key, !!done, ACTOR[key]);
  if (done && key === "cleaned") readiness.clearFlag(unit.id);
  if (!done && (key === "cleaned" || key === "maintenance")) readiness.setCheck(unit.id, "inspected", false);
  if (done && key === "inspected") readiness.clearFlag(unit.id);

  readiness.logEvent(
    req.session.propertyId,
    unit.id,
    done ? `${unit.label}: ${WHAT[key]} (${ACTOR[key]})` : `${unit.label}: ${key} check undone`
  );
  res.json(readiness.listBoard(req.session.propertyId));
});

router.post("/:unitId/fail-inspection", requireOperator, async (req, res) => {
  const unit = loadUnit(req, res);
  if (!unit) return;
  const note = ((req.body && req.body.note) || "").trim() || "Did not meet the move-in standard";
  readiness.setCheck(unit.id, "cleaned", false);
  readiness.setCheck(unit.id, "inspected", false);
  readiness.setFlag(unit.id, `Inspection failed: ${note}`);
  readiness.logEvent(req.session.propertyId, unit.id, `${unit.label}: inspection failed, sent back to cleaning (${note})`);
  await notify.notify({
    propertyId: req.session.propertyId,
    to: "Cleaning crew",
    subject: `Re-clean needed: ${unit.label}`,
    message: note,
    type: "ticket_assigned",
  });
  res.json(readiness.listBoard(req.session.propertyId));
});

module.exports = router;
