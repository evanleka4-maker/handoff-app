require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("node:path");

const repo = require("./db/repo");
const notify = require("./providers/notify");

const authRoutes = require("./routes/auth");
const leaseRoutes = require("./routes/leases");
const ticketRoutes = require("./routes/tickets");
const propertyRoutes = require("./routes/property");
const readinessRoutes = require("./routes/readiness");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/leases", leaseRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/property", propertyRoutes);
app.use("/api/readiness", readinessRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Serve the frontend
app.use(express.static(path.join(__dirname, "../public")));
app.get("/*splat", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ---- Escalation sweep ----
// Any open ticket older than ESCALATION_HOURS with no status change gets
// bumped to the property's fallback contact. This is what closes the
// "erased work orders" failure mode the vision brief is built around —
// nothing sits silently forever.
const ESCALATION_HOURS = Number(process.env.ESCALATION_HOURS || 24);

async function runEscalationSweep() {
  const { db } = require("./db/index");
  const properties = db.prepare("SELECT id FROM properties").all();
  for (const { id: propertyId } of properties) {
    const stale = repo.listStaleOpenTickets(propertyId, ESCALATION_HOURS);
    for (const ticket of stale) {
      repo.updateTicket(ticket.id, { escalated: 1 });
      repo.addTicketEvent(ticket.id, "escalated", `No update in ${ESCALATION_HOURS}h — escalated`);
      const fallback = repo.getRoutingContact(propertyId, "Escalation");
      await notify.notify({
        propertyId,
        to: fallback ? fallback.contact_name : "Property manager",
        subject: `Ticket escalated: ${ticket.category}`,
        message: `Ticket ${ticket.id} (${ticket.category}, ${ticket.urgency}) has had no update in ${ESCALATION_HOURS}h.`,
        type: "ticket_escalated",
      });
    }
  }
}

if (process.env.NODE_ENV !== "test") {
  setInterval(() => {
    runEscalationSweep().catch((err) => console.error("Escalation sweep failed:", err));
  }, 15 * 60 * 1000); // every 15 minutes
}

app.listen(PORT, () => {
  console.log(`Handoff server listening on port ${PORT}`);
});

module.exports = app;
