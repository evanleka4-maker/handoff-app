// NotifyProvider — sends a notification. Free implementation: writes to
// the `notifications` table, which the operator dashboard polls/displays
// as an in-app feed. No outbound service, no cost, works today.
//
// --- Swapping to real SMS/email later ---
// Implement the same `notify({ propertyId, to, subject, message, type })`
// signature using Twilio (SMS — needs A2P 10DLC registration first) or
// SendGrid/Postmark (email), and export it from src/providers/index.js in
// place of this module. Callers never change.

const repo = require("../db/repo");

async function notify({ propertyId, to, subject, message, type }) {
  // In-app: just persist it. A real provider would also make a network call
  // here (e.g. `await twilioClient.messages.create(...)`) and could throw,
  // so callers already await this and should be written to tolerate that.
  return repo.createNotification({ propertyId, to, subject, message, type });
}

module.exports = { notify };
