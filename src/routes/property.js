const express = require("express");
const repo = require("../db/repo");
const { requireOperator } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireOperator, (req, res) => {
  const property = repo.getProperty(req.session.propertyId);
  res.json({ property });
});

router.get("/stats", requireOperator, (req, res) => {
  const propertyId = req.session.propertyId;
  const property = repo.getProperty(propertyId);
  const leases = repo.listLeasesForProperty(propertyId);
  const tickets = repo.listTicketsForProperty(propertyId);

  const signedCount = leases.filter((l) => l.status === "signed").length;
  const leaseSignedPct = leases.length ? Math.round((signedCount / leases.length) * 100) : 0;
  const openTickets = tickets.filter((t) => t.status !== "resolved").length;
  const overdueTickets = tickets.filter((t) => t.escalated === 1 && t.status !== "resolved").length;

  let dayLabel = null;
  if (property?.turnover_start && property?.turnover_end) {
    const start = new Date(property.turnover_start);
    const end = new Date(property.turnover_end);
    const today = new Date();
    const totalDays = Math.max(1, Math.round((end - start) / 86400000));
    const elapsed = Math.min(totalDays, Math.max(0, Math.round((today - start) / 86400000)));
    dayLabel = `Day ${elapsed}/${totalDays}`;
  }

  res.json({
    turnoverDay: dayLabel,
    leaseSignedPct,
    leasesTotal: leases.length,
    leasesSigned: signedCount,
    openTickets,
    overdueTickets,
  });
});

router.get("/notifications", requireOperator, (req, res) => {
  res.json({ notifications: repo.listNotifications(req.session.propertyId) });
});

module.exports = router;
