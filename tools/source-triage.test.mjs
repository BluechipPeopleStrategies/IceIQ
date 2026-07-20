#!/usr/bin/env node
// Run: node tools/source-triage.test.mjs
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { parseFilename, loadTranscripts, renderReport, triageOne } from "./source-triage.mjs";

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

// A title containing "|" would otherwise break the markdown table's column
// alignment, the same way an unescaped note would.
const pipeRows = [{ channel: "hockey-canada", title: "Gap Control | Advanced", verdict: "SKIP", tier: null, notes: [], escalated: false }];
const pipeMd = renderReport(pipeRows, "2026-07-11");
ok("report escapes a pipe character in the title", pipeMd.includes("Gap Control / Advanced") && !pipeMd.includes("Gap Control | Advanced"));

// --- triageOne: CLI worker chain, end-to-end (Important finding 2) ---------
const workerFixtureRoot = mkdtempSync(join(tmpdir(), "source-triage-worker-fixture-"));
const workerDir = resolve(workerFixtureRoot, "chan-a", "raw");
mkdirSync(workerDir, { recursive: true });
const realFile = resolve(workerDir, "20260101__Gap Control Fundamentals__vid001.en.vtt");
writeFileSync(realFile, "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nhello world about gap control\n");

// (a) pre-filter trip: SKIP with a pre-filtered reason, no file read attempted.
const prefilterTranscript = { channel: "chan-a", file: "x", title: "Team A falls to Team B 5-3", date: "20260101", videoId: "vidX", path: resolve(workerDir, "does-not-exist-either.en.vtt") };
const preRow = await triageOne({ transcript: prefilterTranscript, opts: { mock: true } });
ok("triageOne: pre-filtered title resolves to SKIP without reading the file", preRow.verdict === "SKIP" && preRow.notes.some((n) => n.includes("pre-filtered:")));
ok("triageOne: pre-filtered row carries no read/parse error", !preRow.notes.some((n) => n.includes("error:")));

// (b) reaches the mock triage gate: verdict flows through correctly.
const realTranscript = { channel: "chan-a", file: "20260101__Gap Control Fundamentals__vid001.en.vtt", title: "Gap Control Fundamentals", date: "20260101", videoId: "vid001", path: realFile };
const okRow = await triageOne({ transcript: realTranscript, opts: { mock: true, mockExcerpt: { verdict: "PURSUE", tier: 2, notes: ["on-topic"] } } });
ok("triageOne: a transcript that reaches the mock gate returns the mocked verdict", okRow.verdict === "PURSUE" && okRow.tier === 2);

// (c) a transcript whose path doesn't exist: caught by the try/catch, not thrown.
const missingTranscript = { channel: "chan-a", file: "missing.en.vtt", title: "A Totally Normal Title", date: "20260101", videoId: "vid002", path: resolve(workerDir, "missing.en.vtt") };
const errRow = await triageOne({ transcript: missingTranscript, opts: { mock: true } });
ok("triageOne: a missing file produces an error-SKIP row instead of throwing", errRow.verdict === "SKIP" && errRow.notes.some((n) => n.includes("error:")));

rmSync(workerFixtureRoot, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
