#!/usr/bin/env node
// Run: node tools/gauntlet/source-triage-gate.test.mjs
import { triageTranscript } from "./source-triage-gate.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const base = { title: "T", channel: "hockey-canada", date: "20260101", lines: ["hello world, this is a transcript about gap control and reading the play"] };

// Confident PURSUE from the excerpt stage -> no escalation
const r1 = await triageTranscript({ ...base, opts: { mock: true, mockExcerpt: { verdict: "PURSUE", tier: 2, notes: ["on-topic tactics content"] } } });
ok("confident excerpt PURSUE resolves without escalation", r1.verdict === "PURSUE" && r1.tier === 2 && r1.escalated === false);

// Confident SKIP from the excerpt stage -> no escalation
const r2 = await triageTranscript({ ...base, opts: { mock: true, mockExcerpt: { verdict: "SKIP", tier: null, notes: ["off-topic"] } } });
ok("confident excerpt SKIP resolves without escalation", r2.verdict === "SKIP" && r2.escalated === false);

// MAYBE from the excerpt stage -> escalates to a full read, single-chunk case
const manyLines = Array.from({ length: 50 }, (_, i) => `line ${i} about hockey tactics`);
const r3 = await triageTranscript({
  title: "T", channel: "hockey-canada", date: "20260101", lines: manyLines,
  opts: { mock: true, mockExcerpt: { verdict: "MAYBE", tier: null, notes: ["unclear from excerpt"] }, mockFullRead: { verdict: "PURSUE", tier: 3, notes: ["turned out relevant on full read"] } },
});
ok("excerpt MAYBE escalates to a full read", r3.escalated === true);
ok("escalated verdict comes from the full-read mock", r3.verdict === "PURSUE" && r3.tier === 3);
ok("escalated verdict is never MAYBE", r3.verdict === "PURSUE" || r3.verdict === "SKIP");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
