#!/usr/bin/env node
// Run: node tools/source-triage.test.mjs
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { parseFilename, loadTranscripts, renderReport } from "./source-triage.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

ok(
  "parseFilename splits date/title/videoId on a real-shaped filename",
  (() => {
    const r = parseFilename("20260329__Chipotle-USA Hockey Nationals ｜ Shattuck-St. Mary's Claim Youth Tier I 15O Championship__qd6hB97h-oo.en.vtt");
    return r.date === "20260329" && r.videoId === "qd6hB97h-oo" && r.title.includes("Chipotle-USA Hockey Nationals");
  })()
);

// loadTranscripts against a small temp fixture tree (never depends on the
// real, gitignored tools/tcs-scraper/transcripts corpus, so this passes on
// a fresh clone / CI with no scraped data present).
const fixtureRoot = mkdtempSync(join(tmpdir(), "source-triage-fixture-"));
for (const channel of ["chan-a", "chan-b"]) {
  const dir = resolve(fixtureRoot, channel, "raw");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "20260101__Some Title__abc123.en.vtt"), "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nhello\n");
  writeFileSync(resolve(dir, "20260101__Some Title__abc123.en-orig.vtt"), "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nhello\n");
}
const transcripts = loadTranscripts({ root: fixtureRoot });
ok("loadTranscripts finds one .en.vtt per fixture channel (2 total)", transcripts.length === 2);
ok("loadTranscripts excludes .en-orig.vtt siblings", transcripts.every((t) => !t.file.endsWith(".en-orig.vtt")));
ok("loadTranscripts tags each entry with its channel folder name", transcripts.some((t) => t.channel === "chan-a") && transcripts.some((t) => t.channel === "chan-b"));
rmSync(fixtureRoot, { recursive: true, force: true });

ok("loadTranscripts on a missing root returns an empty array", loadTranscripts({ root: resolve(fixtureRoot, "does-not-exist") }).length === 0);

const rows = [
  { channel: "hockey-canada", title: "A", verdict: "PURSUE", tier: 2, notes: ["good"], escalated: false },
  { channel: "hockey-canada", title: "B", verdict: "SKIP", tier: null, notes: ["off-topic"], escalated: false },
  { channel: "coaches-site-glass-and-out", title: "C", verdict: "PURSUE", tier: 3, notes: ["interesting"], escalated: true },
  { channel: "coaches-site-glass-and-out", title: "D", verdict: "SKIP", tier: null, notes: ["off-topic"], escalated: false },
];
const md = renderReport(rows, "2026-07-11");
ok("report groups by channel", md.includes("hockey-canada") && md.includes("coaches-site-glass-and-out"));
ok("report shows verdicts", md.includes("PURSUE") && md.includes("SKIP"));
ok("report tallies verdict counts", /PURSUE\s+2/.test(md) || md.includes("PURSUE 2"));
ok(
  "report flags ONLY the coaches-site-glass-and-out PURSUE row for re-acquisition, not the same-channel SKIP row",
  (md.match(/re-acquir/gi) || []).length === 1
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
