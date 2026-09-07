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

// --- Multi-chunk sequential escalation (Important finding 1) ---------------
// 24000 single-word lines, chunked at 8000 words/chunk, always yields
// exactly 3 chunks (8000 + 8000 + 8000) — enough to prove the loop itself
// (not just the mockFullRead shortcut) drives multiple sequential calls.
const threeChunksOfLines = Array.from({ length: 24000 }, (_, i) => `w${i}`);

const r4 = await triageTranscript({
  title: "T", channel: "hockey-canada", date: "20260101", lines: threeChunksOfLines,
  opts: {
    mock: true,
    mockExcerpt: { verdict: "MAYBE", tier: null, notes: ["needs full read"] },
    mockChunkResponses: [
      { leaning: "PURSUE", notes: ["chunk1 note"] },
      { leaning: "UNSURE", notes: ["chunk2 note"] },
      { verdict: "PURSUE", tier: 2, notes: ["chunk3 note final"] },
    ],
  },
});
ok("3-chunk mock escalates", r4.escalated === true);
ok(
  "notes accumulate and carry forward across all 3 chunks in order",
  r4.notes.indexOf("chunk1 note") !== -1 &&
    r4.notes.indexOf("chunk2 note") !== -1 &&
    r4.notes.indexOf("chunk3 note final") !== -1 &&
    r4.notes.indexOf("chunk1 note") < r4.notes.indexOf("chunk2 note") &&
    r4.notes.indexOf("chunk2 note") < r4.notes.indexOf("chunk3 note final")
);
ok("terminal verdict/tier come from the LAST chunk's response, not an earlier one", r4.verdict === "PURSUE" && r4.tier === 2);

// A chunk error mid-sequence is caught, recorded, and the loop continues to
// later chunks — the terminal verdict still resolves from the last chunk.
const r5 = await triageTranscript({
  title: "T", channel: "hockey-canada", date: "20260101", lines: threeChunksOfLines,
  opts: {
    mock: true,
    mockExcerpt: { verdict: "MAYBE", tier: null, notes: [] },
    mockChunkResponses: [
      new Error("boom"),
      { leaning: "UNSURE", notes: ["chunk2 note"] },
      { verdict: "SKIP", tier: null, notes: ["final note"] },
    ],
  },
});
ok("mid-chunk error is caught and recorded, not thrown", r5.notes.some((n) => n.includes("chunk 1 error") && n.includes("boom")));
ok("loop continues past a mid-chunk error to later chunks", r5.notes.some((n) => n.includes("chunk2 note")));
ok("terminal verdict still resolves from the final chunk despite an earlier error", r5.verdict === "SKIP");

// --- Verdict/tier normalization (Important finding 3) -----------------------
const r6 = await triageTranscript({ ...base, opts: { mock: true, mockExcerpt: { verdict: "pursue", tier: 2, notes: ["ok"] } } });
ok("lowercase excerpt verdict normalizes to uppercase", r6.verdict === "PURSUE" && r6.escalated === false);

const r7 = await triageTranscript({
  ...base,
  opts: { mock: true, mockExcerpt: { verdict: "garbage", tier: null, notes: ["unparseable"] }, mockFullRead: { verdict: "SKIP", tier: null, notes: ["resolved on full read"] } },
});
ok("off-schema excerpt verdict defaults to MAYBE and escalates (safe direction)", r7.escalated === true);

const r8 = await triageTranscript({ ...base, opts: { mock: true, mockExcerpt: { verdict: "PURSUE", tier: "2", notes: ["ok"] } } });
ok("string tier normalizes to a number", r8.tier === 2 && typeof r8.tier === "number");

const r9 = await triageTranscript({
  ...base,
  opts: { mock: true, mockExcerpt: { verdict: "MAYBE", tier: null, notes: [] }, mockFullRead: { verdict: "MAYBE_WEIRD", tier: 5, notes: ["disobedient final verdict"] } },
});
ok("out-of-enum final-chunk verdict coerces to SKIP", r9.verdict === "SKIP");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
