const express = require("express");
const bcrypt = require("bcryptjs");
const repo = require("../db/repo");
const { setSessionCookie, clearSessionCookie, readSession } = require("../middleware/auth");

const router = express.Router();

router.post("/operator/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const operator = repo.getOperatorByEmail(email);
  if (!operator) return res.status(401).json({ error: "Invalid email or password" });

  const ok = await bcrypt.compare(password, operator.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  setSessionCookie(res, {
    role: "operator",
    operatorId: operator.id,
    propertyId: operator.property_id,
  });
  res.json({ operator: { id: operator.id, name: operator.name, email: operator.email, propertyId: operator.property_id } });
});

router.post("/resident/login", (req, res) => {
  const { accessCode } = req.body || {};
  if (!accessCode) return res.status(400).json({ error: "Access code required" });

  const resident = repo.getResidentByAccessCode(accessCode.trim().toUpperCase());
  if (!resident) return res.status(401).json({ error: "Invalid access code" });

  const unit = repo.getUnit(resident.unit_id);

  setSessionCookie(res, {
    role: "resident",
    residentId: resident.id,
    unitId: unit.id,
    propertyId: unit.property_id,
  });
  res.json({ resident: { id: resident.id, name: resident.name, unitLabel: unit.label } });
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/me", (req, res) => {
  const session = readSession(req);
  if (!session) return res.json({ session: null });
  res.json({ session });
});

module.exports = router;
