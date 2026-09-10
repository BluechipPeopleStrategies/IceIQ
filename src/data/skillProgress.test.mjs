#!/usr/bin/env node
// Run: node src/data/skillProgress.test.mjs
import { skillRatingProgress, SKILLS, FREE_SKILL_IDS } from "./constants.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const U11 = "U11 / Atom";
const u11Total = SKILLS[U11].reduce((n, c) => n + c.skills.length, 0);
const u11Free = SKILLS[U11].reduce((n, c) => n + c.skills.filter(s => FREE_SKILL_IDS.has(s.id)).length, 0);

// QA 2026-09-10: a PRO player with no ratings yet saw "0/0 rated" and a full
// progress bar, because the denominator was Object.keys(ratings).length and
// Supabase only returns the skills that have been rated.
ok("a brand-new PRO player has the whole level as the denominator", (() => {
  const p = skillRatingProgress(U11, {}, { fullAccess: true });
  return p.rated === 0 && p.total === u11Total && u11Total > 0;
})());
ok("one rating is 1 of the level, not 1 of 1", (() => {
  const p = skillRatingProgress(U11, { u11s1: "3" }, { fullAccess: true });
  return p.rated === 1 && p.total === u11Total;
})());
ok("null ratings (cleared) do not count as rated", (() => {
  const p = skillRatingProgress(U11, { u11s1: null, u11s2: "2" }, { fullAccess: true });
  return p.rated === 1 && p.total === u11Total;
})());
ok("N/A is a real answer and counts as rated", skillRatingProgress(U11, { u11s1: "n/a" }).rated === 1);
ok("ratings for another level's skills are ignored", (() => {
  const p = skillRatingProgress(U11, { u9s1: "4", u13s1: "4" }, { fullAccess: true });
  return p.rated === 0 && p.total === u11Total;
})());
ok("FREE counts only the visible skills", (() => {
  const p = skillRatingProgress(U11, { u11s1: "3", u11s2: "3" }, { fullAccess: false });
  return p.total === u11Free && p.rated === 1;
})());
ok("FREE denominator is 1 per category for U11", u11Free === SKILLS[U11].length);
ok("all rated means rated === total", (() => {
  const all = Object.fromEntries(SKILLS[U11].flatMap(c => c.skills.map(s => [s.id, "3"])));
  const p = skillRatingProgress(U11, all);
  return p.rated === p.total;
})());
ok("unknown level is 0/0 rather than a crash", (() => {
  const p = skillRatingProgress("U99 / Nope", { x: "1" });
  return p.rated === 0 && p.total === 0;
})());
ok("missing ratings object is tolerated", skillRatingProgress(U11, undefined).rated === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
