# Handoff

A turnover-operations platform for small, independently-owned student
housing properties: automated lease generation and tracking, AI-triaged
issue routing, and a visible status log for every ticket. See the project
vision brief for the "why."

This is a real, working full-stack app — not a clickable mockup. Everything
it does right now runs on **free** infrastructure (no paid API keys
required), and it's built so the three pieces that would normally cost
money can be swapped in later without touching any route or UI code.

## Architecture

```
src/
  db/
    index.js      schema + connection (node:sqlite — built into Node, zero cost)
    repo.js        one function per query — the only file a DB swap touches
    seed.js         creates a demo property so the app is usable immediately
  providers/
    classifier.js  keyword/regex issue classifier (swap: real LLM API)
    notify.js      in-app notification log (swap: Twilio SMS / SendGrid email)
    signature.js   pdf-lib lease generation + local "sign" flow (swap: DocuSign)
  routes/          Express routes — call repo + providers, never touch SQL directly
  middleware/auth.js  JWT-in-httpOnly-cookie sessions for operators and residents
public/index.html  the whole frontend (vanilla JS, no build step, no framework)
```

**Why it's structured this way:** every "this costs money in production"
concern lives behind a single-purpose module with one job. Swapping SQLite
for Postgres only touches `src/db/*`. Swapping the mock e-sign flow for
DocuSign only touches `src/providers/signature.js` (plus one webhook route).
Swapping in-app notifications for real SMS only touches
`src/providers/notify.js`. Nothing else in the app needs to know or care.

## Running locally

```bash
npm install
npm run seed     # creates a demo property, operator login, and residents
npm start
```

Then open http://localhost:3000.

- **Operator login:** `operator@handoff.demo` / `handoff123`
- **Resident access codes:** `MAYA-101`, `DEVON-102`, `PRIYA-201`, `SAM-214`

`npm start` runs the seed script first (it's a no-op if data already
exists), so the app is always usable right after `npm install`.

## What's actually real here

- **Lease generation:** a real PDF is generated server-side with `pdf-lib`
  from the unit/resident/term data on file — not a placeholder.
- **E-signature:** residents click "sign," and the server re-renders the
  PDF with their name and a timestamp burned in. It's a genuine document
  workflow, just without DocuSign's identity verification or legal
  certification layer.
- **Issue classification:** the same keyword/regex classifier from the
  prototype, ported server-side, actually deciding category + urgency for
  every report.
- **Routing:** an operator-editable table maps category → contact; new
  tickets are assigned automatically based on it.
- **Escalation:** a background sweep (every 15 minutes) bumps any ticket
  that's gone `ESCALATION_HOURS` (default 24) without a status change to
  the property's escalation contact — this is the mechanism that directly
  targets the "erased work orders" failure mode from the research.
- **Notifications:** every lease reminder, ticket assignment, and
  escalation writes a real row to a notifications table the operator
  dashboard displays as a feed.

## Swapping in paid services later

### Database: SQLite → Postgres
`src/db/index.js` and `src/db/repo.js` are the only files that touch
storage. Install `pg`, replace the `DatabaseSync` calls with `pg` Pool
queries, keep every exported function's name and return shape the same.
Nothing in `routes/` or `providers/` changes.

Until then: on Railway, attach a **Volume** and point `DB_PATH` /
`LEASE_DIR` at it (see below) — without one, the filesystem is wiped on
every redeploy and you'd lose all data.

### E-signature: local mock → DocuSign
`src/providers/signature.js` exports `generateLeaseDocument` and
`markSigned`. Keep `generateLeaseDocument` (or adapt it to build the source
PDF DocuSign will send), then replace the "sign" flow to call DocuSign's
envelopes API and add a webhook route that flips `status` to `signed` when
DocuSign calls back, instead of the local `/api/leases/mine/sign` endpoint
flipping it directly.

### Notifications: in-app log → SMS/email
`src/providers/notify.js` exports one function: `notify({ propertyId, to,
subject, message, type })`. Point it at Twilio (SMS — needs A2P 10DLC
carrier registration first, which takes real calendar time) or
SendGrid/Postmark (email, faster to stand up). Every caller already awaits
this call and handles it failing.

### Classification: keyword rules → LLM
`src/providers/classifier.js` exports `classify(text) -> {category,
urgency}`. Swap the body for a real API call (e.g. the Claude API) with the
same signature.

## Deploying

### GitHub
```bash
git init   # if not already a repo
git add .
git commit -m "Handoff: working full-stack prototype"
gh repo create handoff-app --private --source=. --push
# or, without gh: create an empty repo on github.com, then
#   git remote add origin <your-repo-url>
#   git push -u origin main
```

### Railway
1. In the Railway dashboard: **New Project → Deploy from GitHub repo**,
   pick this repo. Railway auto-detects Node via Nixpacks and uses
   `railway.json`'s start command (`npm start`).
2. **Add a Volume** (Project → your service → Settings → Volumes) and
   mount it at `/data`.
3. Set these **Variables** on the service:
   - `JWT_SECRET` — any long random string
   - `DB_PATH` = `/data/handoff.db`
   - `LEASE_DIR` = `/data/leases`
   - `NODE_ENV` = `production`
4. Deploy. First boot runs the seed script automatically, so the demo
   operator/resident logins above work immediately on the live URL too.

No Railway CLI is required for this path — everything above is done from
the Railway web dashboard once the code is on GitHub.

## Known limitations (by design, for now)

- No email verification, password reset, or multi-operator support per
  property yet — one seeded operator per property.
- The classifier is deliberately simple keyword matching, same as the
  original prototype; it will misclassify ambiguous reports (see the
  "No hot water... emergency" test case, which lands in "Other" rather
  than a dedicated category — a real LLM classifier fixes this).
- The e-signature flow has no identity verification. It proves the
  workflow, not legal enforceability.
- SQLite via `node:sqlite` is still an experimental Node API. It's fine
  for a class-project / early-validation deployment; the Postgres swap
  above is the path once this needs to be trusted with real leases.
