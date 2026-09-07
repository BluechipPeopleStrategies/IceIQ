// Self-rating scale copy, by age band and audience.
//
// Wording approved by Thomas 2026-08-03; source of truth for the words is
// docs/references/self-rating-scale-draft.md.
//
// Two audiences, not three: a parent signs up on behalf of the player, so they
// read the same words about the same child. Two bands, because U7 and U9 do not
// self-rate at all (see data/selfRating.js).
//
// Deliberate asymmetry at Advanced: U11-U13 players get NO peer comparison
// ("I could show a teammate how") while their coach's copy does. Younger players
// under-rate themselves when asked to rank against peers. By U15 the player copy
// takes the comparison directly.

// {region} is free text a coach sets on the team. MOST PLAYERS HAVE NO TEAM, so
// the missing-region path is the common one, not an edge case -- the sentences
// have to survive losing the clause without trailing off "... in ."
const U11_U13 = {
  introduced: { self: "I'm learning what this is.",              coach: "Introduced." },
  developing: { self: "I can do it sometimes, with reminders.",  coach: "Progress with prompting or in practice." },
  consistent: { self: "I do it reliably in practice.",           coach: "Reliable in practice, inconsistent in games." },
  proficient: { self: "I do it in games without thinking.",      coach: "Performs reliably in games. Above average for {ageGroup}." },
  advanced:   { self: "I could show a teammate how.",            coach: "Standout for age. Impacts teammates. Top of {ageGroup} in {region}." },
  "n/a":      { self: "Haven't tried this yet.",                 coach: "Not observed / not applicable." },
};

const U15_U18 = {
  introduced: { self: "New to this. Still working out what it means.", coach: "Introduced." },
  developing: { self: "Inconsistent. I need reminders.",               coach: "Developing. Inconsistent under pressure." },
  consistent: { self: "I execute it in practice reliably.",            coach: "Executes in practice, breaks down under game speed." },
  proficient: { self: "I execute it in games under pressure.",         coach: "Reliable under game pressure. Top third of {ageGroup} in {region}." },
  advanced:   { self: "Among the best in my age group in {region}.",   coach: "Elite for {ageGroup} in {region}. Raises the standard around them." },
  "n/a":      { self: "Haven't tried this yet.",                       coach: "Not observed / not applicable." },
};

const BANDS = { 11: U11_U13, 13: U11_U13, 15: U15_U18, 18: U15_U18 };

/** "U11 / Atom" -> "U11". Null when the level cannot be parsed. */
export function ageGroupOf(level) {
  const m = /^U(\d+)/.exec(String(level || "").trim());
  return m ? "U" + m[1] : null;
}

/** The copy table for a level, or null for bands that do not self-rate. */
export function bandCopyFor(level) {
  const m = /^U(\d+)/.exec(String(level || "").trim());
  return m ? (BANDS[Number(m[1])] || null) : null;
}

// A missing value takes its whole clause with it, so "Elite for U15 in {region}."
// becomes "Elite for U15." rather than "Elite for U15 in ." The leading
// connector is part of the match precisely so nothing dangles.
const CLAUSE = (token) =>
  new RegExp(String.raw`\s*\b(?:in|around|across|for|of)\s+\{${token}\}`, "g");

export function renderAnchor(template, { ageGroup, region } = {}) {
  let out = String(template || "");
  for (const [token, value] of [["region", region], ["ageGroup", ageGroup]]) {
    const has = value != null && String(value).trim() !== "";
    if (has) {
      out = out.replace(new RegExp(String.raw`\{${token}\}`, "g"), String(value).trim());
    } else {
      // Drop the connector-plus-token clause first, then any bare token that
      // was not preceded by a connector.
      out = out.replace(CLAUSE(token), "");
      out = out.replace(new RegExp(String.raw`\s*\{${token}\}`, "g"), "");
    }
  }
  return out.replace(/\s{2,}/g, " ").replace(/\s+([.,;])/g, "$1").trim();
}
