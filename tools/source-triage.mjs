#!/usr/bin/env node
// Transcript source triage. Walks the scraped-transcript channels, runs the
// three-stage funnel (title pre-filter -> capped excerpt -> full-read
// escalation on MAYBE) over every unique video, and writes ONE grouped
// report to docs/factory/coach-runs/. It NEVER writes into Obsidian or the
// Acquisition Log, and never edits/deletes a transcript — it only assesses.
//
// Usage:
//   node tools/source-triage.mjs                    # all channels, real judge (inherits sonnet)
//   node tools/source-triage.mjs --mock              # no claude calls (smoke)
//   node tools/source-triage.mjs --limit 5 --dry-run
//   node tools/source-triage.mjs --channel pavel-barber
//   node tools/source-triage.mjs --coach-model claude-fable-5
//   node tools/source-triage.mjs --concurrency 5
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseVtt } from "./gauntlet/vtt-parse.mjs";
import { preFilter } from "./gauntlet/source-prefilter.mjs";
import { triageTranscript } from "./gauntlet/source-triage-gate.mjs";
import { runPool } from "./gauntlet/pool.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const defaultTranscriptRoot = resolve(root, "tools/tcs-scraper/transcripts");

// "YYYYMMDD__Title__videoId.en.vtt" -> { date, title, videoId }. Splits on
// the FIRST "__" (date boundary) and the LAST "__" (videoId boundary), so a
// title containing "__" itself (unseen in practice, but not assumed away)
// still parses correctly.
export function parseFilename(file) {
  const base = file.replace(/\.en\.vtt$/, "");
  const firstSep = base.indexOf("__");
  const lastSep = base.lastIndexOf("__");
  const date = base.slice(0, firstSep);
  const videoId = base.slice(lastSep + 2);
  const title = base.slice(firstSep + 2, lastSep);
  return { date, title, videoId };
}

// Enumerate every *.en.vtt under root/*/raw/ (skipping *.en-orig.vtt
// siblings). Returns [] if root doesn't exist (fresh clone with no scraped
// data — this corpus is gitignored on purpose).
export function loadTranscripts({ root: transcriptRoot }) {
  if (!existsSync(transcriptRoot)) return [];
  const out = [];
  for (const channel of readdirSync(transcriptRoot)) {
    const rawDir = resolve(transcriptRoot, channel, "raw");
    if (!existsSync(rawDir) || !statSync(rawDir).isDirectory()) continue;
    for (const file of readdirSync(rawDir)) {
      if (!file.endsWith(".en.vtt")) continue;
      const { date, title, videoId } = parseFilename(file);
      out.push({ channel, file, title, date, videoId, path: resolve(rawDir, file) });
    }
  }
  return out;
}

export function renderReport(rows, date) {
  const channels = {};
  for (const r of rows) (channels[r.channel] ||= []).push(r);
  let md = `# Source Triage — ${date}\n\nTitle/excerpt/full-read funnel over ${rows.length} scraped transcript(s). Verdicts: PURSUE / SKIP.\n`;
  const tally = rows.reduce((m, r) => ((m[r.verdict] = (m[r.verdict] || 0) + 1), m), {});
  md += `\n**Tally:** ` + Object.entries(tally).map(([k, n]) => `${k} ${n}`).join(" · ") + `\n`;
  for (const channel of Object.keys(channels).sort()) {
    md += `\n## ${channel}\n\n| Title | Verdict | Tier | Escalated | Notes |\n|---|---|---|---|---|\n`;
    for (const r of channels[channel]) {
      const flag = channel === "coaches-site-glass-and-out" && r.verdict === "PURSUE"
        ? " **[re-acquire via the authenticated TCS manifest before citing — this copy was not acquired through that process]**"
        : "";
      const title = String(r.title || "").replace(/\|/g, "/");
      md += `| ${title} | ${r.verdict} | ${r.tier ?? "—"} | ${r.escalated ? "yes" : "no"} | ${(r.notes || []).join("; ").replace(/\|/g, "/")}${flag} |\n`;
    }
  }
  return md;
}

function parseArgs(argv) {
  const a = { mock: false, dryRun: false, limit: Infinity, channel: null, coachModel: "sonnet", concurrency: 3 };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--mock") a.mock = true;
    else if (t === "--dry-run") a.dryRun = true;
    else if (t === "--limit") a.limit = parseInt(argv[++i], 10);
    else if (t === "--channel") a.channel = argv[++i];
    else if (t === "--coach-model") a.coachModel = argv[++i];
    else if (t === "--concurrency") a.concurrency = parseInt(argv[++i], 10);
  }
  return a;
}

// One transcript through the pre-filter -> read -> parse -> triage chain.
// `transcript` is one entry shaped like loadTranscripts()'s output
// ({channel, file, title, date, videoId, path}). Extracted out of main()'s
// runPool worker so the pre-filter short-circuit, the read/parse/triage
// happy path, and the error-isolation try/catch (a batch-crash-isolation
// fix) are all directly testable instead of only exercised during a real
// paid run. Returns the row shape pushed into the report.
export async function triageOne({ transcript: t, opts }) {
  const pf = preFilter({ title: t.title });
  if (pf.skip) {
    console.log(`SKIP    ${t.channel}/${t.title} (pre-filtered: ${pf.reason})`);
    return { channel: t.channel, title: t.title, verdict: "SKIP", tier: null, notes: [`pre-filtered: ${pf.reason}`], escalated: false };
  }
  try {
    const raw = readFileSync(t.path, "utf8");
    const lines = parseVtt(raw);
    const r = await triageTranscript({ title: t.title, channel: t.channel, date: t.date, lines, opts });
    console.log(`${r.verdict.padEnd(6)}  ${t.channel}/${t.title}${r.escalated ? " (full read)" : ""}`);
    return { channel: t.channel, title: t.title, verdict: r.verdict, tier: r.tier, notes: r.notes, escalated: r.escalated };
  } catch (e) {
    console.error(`ERROR   ${t.channel}/${t.title}: ${e.message}`);
    return { channel: t.channel, title: t.title, verdict: "SKIP", tier: null, notes: [`error: ${e.message}`], escalated: false };
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  let transcripts = loadTranscripts({ root: defaultTranscriptRoot });
  if (opts.channel) transcripts = transcripts.filter((t) => t.channel === opts.channel);
  if (Number.isFinite(opts.limit)) transcripts = transcripts.slice(0, opts.limit);
  if (!transcripts.length) { console.log("No transcripts found."); return; }

  console.log(`Triaging ${transcripts.length} transcript(s) on ${opts.coachModel}${opts.mock ? " [mock]" : ""}…\n`);
  const rows = await runPool(transcripts, opts.concurrency, (t) => triageOne({ transcript: t, opts }));

  const date = new Date().toISOString().slice(0, 10);
  const outDir = resolve(root, "docs/factory/coach-runs");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, `source-triage-${date}.md`);
  if (!opts.dryRun) writeFileSync(outFile, renderReport(rows, date), "utf8");
  const pursued = rows.filter((r) => r.verdict === "PURSUE").length;
  console.log(`\nDone. ${rows.length} assessed; ${pursued} PURSUE.${opts.dryRun ? " (dry-run: no writes)" : ` Report: ${outFile}`}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
