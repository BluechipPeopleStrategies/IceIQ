#!/usr/bin/env node
// Run: node tools/gauntlet/source-prefilter.test.mjs
import { preFilter } from "./source-prefilter.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const skipCases = [
  "Chipotle-USA Hockey Nationals ｜ Shattuck-St. Mary's Claim Youth Tier I 15O Championship",
  "Team USA Falls in Overtime to Czechia, 3-2",
  "UNCLE PAV vs. KANE VAN GATE ｜ Surprise Shootout Challenge",
  "I TRIED BLIND HOCKEY!",
  "THE MARSBLADE R1 ｜ Game Rollerblade",
  "NEW STICKHANDLING VIDEO GAME!？ ｜ Sense Arena",
];
for (const title of skipCases) {
  const r = preFilter({ title });
  ok(`pre-filters obvious non-candidate: "${title}"`, r.skip === true && typeof r.reason === "string" && r.reason.length > 0);
}

const keepCases = [
  "Go from the grassroots to the Games with Shawn Burnett",
  "College Hockey Recruiting & New NCAA Rules with Guest Mike McMahon, College Hockey Insider - EP 416",
  "SHORT SHIFTS - QUICKSAND",
  "FRIDAY FACEOFF - MENTAL HEALTH IN HOCKEY",
  "HOW TO MICHIGAN (But it gets progressively harder...)",
  "Skate Push vs. Stride Length: Technique Breakdown",
  "I tried this stickhandling drill for 30 days, here's what changed",
];
for (const title of keepCases) {
  const r = preFilter({ title });
  ok(`does NOT pre-filter an ambiguous/on-topic title: "${title}"`, r.skip === false && r.reason === null);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
