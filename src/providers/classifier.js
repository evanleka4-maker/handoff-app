// ClassifierProvider — takes a plain-language issue report and returns
// { category, urgency }. This is the free implementation: the same
// keyword/regex logic from the clickable prototype, ported server-side.
//
// --- Swapping to a real LLM classifier later ---
// Implement classify(text) against an LLM API (e.g. the Claude API) and
// export it in place of this module from src/providers/index.js. Every
// caller (src/routes/tickets.js) only calls `classify(text)` and reads
// { category, urgency } — nothing else needs to change.

const RULES = [
  { category: "Internet", urgency: "high", re: /\b(wifi|wi-fi|internet|router|modem|ethernet|network)\b/i },
  { category: "Plumbing", re: /\b(leak|pipe|toilet|clog|drain|faucet|water damage|flooding|flood)\b/i, urgency: "high" },
  { category: "HVAC", re: /\b(heat|heater|heating|a\/?c|air condition|hvac|thermostat|cold|freezing|no heat)\b/i, urgency: "high" },
  { category: "Pest", re: /\b(roach|bug|pest|mice|mouse|rat|ant|infestation|cockroach|spider)\b/i, urgency: "medium" },
  { category: "Electrical", re: /\b(outlet|electrical|power|breaker|wiring|light(s)? (won'?t|not) work|sparking)\b/i, urgency: "high" },
  { category: "Appliance", re: /\b(fridge|refrigerator|stove|oven|microwave|dishwasher|washer|dryer|appliance)\b/i, urgency: "medium" },
  { category: "Safety", re: /\b(lock|door won'?t|broken lock|smoke detector|fire alarm|gas smell|structural|hole in|ceiling|mold)\b/i, urgency: "urgent" },
];

const URGENT_OVERRIDE = /\b(no hot water|no water|can'?t lock|gas smell|smoke|fire|flooding|emergency|unsafe)\b/i;

function classify(text) {
  const t = (text || "").toLowerCase();

  for (const rule of RULES) {
    if (rule.re.test(t)) {
      const urgency = URGENT_OVERRIDE.test(t) ? "urgent" : rule.urgency;
      return { category: rule.category, urgency };
    }
  }

  return { category: "Other", urgency: URGENT_OVERRIDE.test(t) ? "urgent" : "low" };
}

module.exports = { classify };
