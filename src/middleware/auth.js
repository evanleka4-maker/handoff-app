const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const COOKIE_NAME = "handoff_session";

function issueToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

function setSessionCookie(res, payload) {
  const token = issueToken(payload);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function readSession(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

function requireOperator(req, res, next) {
  const session = readSession(req);
  if (!session || session.role !== "operator") {
    return res.status(401).json({ error: "Not authenticated as an operator" });
  }
  req.session = session;
  next();
}

function requireResident(req, res, next) {
  const session = readSession(req);
  if (!session || session.role !== "resident") {
    return res.status(401).json({ error: "Not authenticated as a resident" });
  }
  req.session = session;
  next();
}

module.exports = {
  setSessionCookie,
  clearSessionCookie,
  readSession,
  requireOperator,
  requireResident,
  COOKIE_NAME,
};
