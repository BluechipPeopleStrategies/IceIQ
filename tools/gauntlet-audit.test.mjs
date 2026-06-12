#!/usr/bin/env node
// Run: node tools/gauntlet-audit.test.mjs
import { loadSeeds, renderReport, verdictToRoute } from "./gauntlet-audit.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const seeds = loadSeeds();
ok("loadSeeds returns the post-wipe seeds (>= 20)", Array.isArray(seeds) && seeds.length >= 20);
ok("each seed has id + nodeId", seeds.every((s) => s.seed.id && s.seed.nodeId));

const rows = [
  { id: "a", level: "U9 / Novice", verdict: "KEEP", confidence: 0.9, notes: [], convened: false },
  { id: "b", level: "U13 / Peewee", verdict: "REVISE", confidence: 0.5, notes: ["fix the label"], convened: true },
];
const md = renderReport(rows, "2026-06-11");
ok("report groups by band", md.includes("U9 / Novice") && md.includes("U13 / Peewee"));
ok("report shows verdicts", md.includes("KEEP") && md.includes("REVISE"));

ok("KEEP does not route", verdictToRoute("KEEP") === false);
ok("REVISE routes", verdictToRoute("REVISE") === true);
ok("RETIRE routes", verdictToRoute("RETIRE") === true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
