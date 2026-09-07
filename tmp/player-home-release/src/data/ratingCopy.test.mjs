#!/usr/bin/env node
// Run: node src/data/ratingCopy.test.mjs
import { renderAnchor, bandCopyFor, ageGroupOf } from "./ratingCopy.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

// ---- ageGroupOf -------------------------------------------------------------
ok("pulls U11 out of the level string", ageGroupOf("U11 / Atom") === "U11");
ok("pulls U15 out", ageGroupOf("U15 / Bantam") === "U15");
ok("unknown level yields null", ageGroupOf("nonsense") === null);
ok("null level yields null", ageGroupOf(null) === null);

// ---- renderAnchor: substitution --------------------------------------------
ok("substitutes both tokens",
  renderAnchor("Top of {ageGroup} in {region}.", { ageGroup: "U11", region: "Edmonton" }) === "Top of U11 in Edmonton.");
ok("substitutes a repeated token",
  renderAnchor("{ageGroup} vs {ageGroup}", { ageGroup: "U13" }) === "U13 vs U13");

// ---- renderAnchor: the no-region fallback -----------------------------------
// Most players are on no team, so this is the COMMON path, not an edge case.
// The sentence must not trail off with a dangling preposition.
ok("drops 'in {region}' cleanly mid-sentence",
  renderAnchor("Elite for {ageGroup} in {region}. Raises the standard.", { ageGroup: "U15" })
    === "Elite for U15. Raises the standard.");
ok("drops 'in {region}' at the end of a sentence",
  renderAnchor("Among the best in my age group in {region}.", {})
    === "Among the best in my age group.");
ok("drops 'around {region}' too",
  renderAnchor("One of the stronger players around {region}.", {})
    === "One of the stronger players.");
ok("no dangling preposition survives",
  /\b(in|around|across|for)\s*\.?$/.test(
    renderAnchor("Top of {ageGroup} in {region}.", { ageGroup: "U11" }).replace(/\.$/, "")) === false);
ok("an empty-string region behaves like a missing one",
  renderAnchor("Top of {ageGroup} in {region}.", { ageGroup: "U11", region: "   " }) === "Top of U11.");
ok("a missing ageGroup does not leave a raw token",
  renderAnchor("Above average for {ageGroup}.", {}).includes("{ageGroup}") === false);
ok("text with no tokens is returned unchanged",
  renderAnchor("I do it reliably in practice.", {}) === "I do it reliably in practice.");
ok("never leaves double spaces behind",
  renderAnchor("Top of {ageGroup} in {region}. Next.", { ageGroup: "U11" }).includes("  ") === false);

// ---- band copy --------------------------------------------------------------
ok("U11 and U13 share a band", bandCopyFor("U11 / Atom") === bandCopyFor("U13 / Peewee"));
ok("U15 and U18 share a band", bandCopyFor("U15 / Bantam") === bandCopyFor("U18 / Midget"));
ok("the two bands differ", bandCopyFor("U11 / Atom") !== bandCopyFor("U15 / Bantam"));
ok("coach Introduced is just the label", bandCopyFor("U11 / Atom").introduced.coach === "Introduced.");
ok("U15 coach Introduced is also just the label", bandCopyFor("U15 / Bantam").introduced.coach === "Introduced.");
ok("the top rung carries a region token for coaches",
  bandCopyFor("U11 / Atom").advanced.coach.includes("{region}"));
ok("U11 players get NO peer comparison", bandCopyFor("U11 / Atom").advanced.self.includes("{region}") === false);
ok("U15 players DO get the comparison", bandCopyFor("U15 / Bantam").advanced.self.includes("{region}"));
ok("a band below U11 has no copy", bandCopyFor("U9 / Novice") === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
