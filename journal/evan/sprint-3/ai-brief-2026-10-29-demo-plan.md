# AI demo plan and build summary — Evan — Sprint 3 — 2026-10-29

AI-generated starting material; the student has not endorsed it. Snapshot of the demo plan Claude wrote in the project on Oct 29, 2026, before the Sprint 3 presentation. Do not edit. The code described here is in commit f42d6a2a446841e70fb3f4f0cbb978cc531b3c50 of this repository.

---


What was built for this demo: a move-in readiness board in Handoff, with 40 synthetic units, a failed-inspection flow, a resident "Move-in status" card, and a live-refreshing operator screen. All demo data is invented and labeled as synthetic in the app. The board is the build response to what the leasing agent at The Maxxen described on Oct 12: units marked clean that were not, and weak coordination between cleaning, maintenance and leasing. That is one conversation at a large operator, so treat it as a lead, not a finding.

Commit: f42d6a2 in evanleka4-maker/handoff-app (needs `git push` to reach the live site).

## Before class (5 minutes)
1. Push and let Railway redeploy. Open https://handoff-app-production-6ee2.up.railway.app, log in as operator@handoff.demo / handoff123. You should see a "Move-in readiness" card with 40 tiles.
2. Click "Reset demo data" twice (second click confirms). Do this BEFORE logging in the resident, because a reset invalidates resident sessions.
3. On a phone or second browser window, log in as resident with code MAYA-101 (Unit 101).
4. Start: 14 of 40 ready.

## Spoken structure (about 3 minutes)
1. Opening pitch, 30 to 40 seconds (draft, edit in your own words): Every August a student housing property has a few days when dozens of units all have to go from empty to move-in ready. At the downtown complex I visited, a leasing agent told me the hardest part is physical prep and getting cleaning, maintenance and leasing on the same page, and that units get marked clean when they are not. Handoff gives those teams one live answer to "which units can a resident actually move into today?"
2. Goals and what you learned: Goal was to find a pain that operators have and existing software does not cover. So far: two in-person conversations, both large corporate-managed properties that use Entrata, and the pain they described was physical turnover and team coordination. Not tested yet: small operators (the target), whether anyone would use or pay for Handoff.
3. Live demo (below), then one closing line on what changed for the user.

## Demo click path (about 90 seconds)
1. Operator screen: "14 of 40 units ready." Point at the gray in-progress tiles and the red blocked ones. Click the "Not ready" filter, then "All."
2. Click Unit 112. "Cleaning marked this done. Inspector walks it." Click Fail inspection, type "oven not cleaned," click Send back to cleaning. The tile turns amber, the feed logs it, and a notification goes to the cleaning crew. Say: a unit that was marked clean cannot silently stay ready.
3. Show the resident phone (Maya, Unit 101): status says Ready. Type "Water is leaking under my bathroom sink" and send. It routes to the plumber and her status flips to Blocked.
4. Back on the operator screen within a few seconds: Unit 101 turns red and the count drops to 13. Scroll to the Issue queue, change that ticket to "Mark resolved." Unit 101 returns to Ready.
5. Optional if time: Unit 214 (wifi ticket) and 205 (thermostat) show how open tickets block a unit.

## Say plainly
- The data is synthetic, built to test and explain the experience. It is not evidence from customers.
- The classifier is keyword-based, not an AI model. The e-signature is a mock, not legally binding.
- The demo shows the idea working. It does not show that operators want it.

## If something breaks
- Live site not updated: run locally with `cd ~/ENTR/Work/handoff-app && npm install && npm start` (needs Node 22.5 or newer), then open http://localhost:3000.
- Board looks wrong: click "Reset demo data" twice, then re-login the resident.
