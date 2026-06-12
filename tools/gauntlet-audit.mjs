#!/usr/bin/env node
// Retroactive coach audit. Runs the Head-Coach-gates panel over the existing
// post-wipe seeds and assesses each KEEP / REVISE / RETIRE. Writes a grouped
// report to docs/factory/coach-runs/ and routes REVISE/RETIRE to the #review queue.
// It NEVER edits or deletes a seed — it only assesses and queues.
//
// Usage:
//   node tools/gauntlet-audit.mjs                 # all seeds, real coaches (inherits sonnet)
//   node tools/gauntlet-audit.mjs --mock          # no claude calls (smoke)
//   node tools/gauntlet-audit.mjs --limit 3 --dry-run
//   node tools/gauntlet-audit.mjs --band U13
//   node tools/gauntlet-audit.mjs --coach-model claude-fable-5
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadLedger, nodeById, conceptById } from "./lib/curriculum-ledger.mjs";
import { asciiRink } from "./gauntlet/ascii-rink.mjs";
import { auditScenario } from "./gauntlet/coach-gate.mjs";
import { enqueue } from "./review-store.mjs";
import { PANEL_LENSES } from "./gauntlet/prompts.mjs";
import { VISUAL_LENSES, buildVisualHockeyCoachPrompt, buildVisualCoachPrompt, buildVisualHeadCoachPrompt } from "./gauntlet/visual-prompts.mjs";
import { runAgent } from "./lib/claude-agent.mjs";
import { createCoachSink } from "./lib/coach-sink.mjs";
import { coachRow } from "./lib/coach-core.mjs";
import { runHockeyValidators } from "../src/scenario/validators.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const seedDir = resolve(root, "src/scenario/seeds");
const paths = { queue: resolve(root, "src/data/review-queue.json"), bank: resolve(root, "src/data/bank.json") };

export function loadSeeds() {
  const out = [];
  for (const f of readdirSync(seedDir)) {
    if (!f.endsWith(".json")) continue;
    try { out.push({ file: f, seed: JSON.parse(readFileSync(resolve(seedDir, f), "utf8")) }); } catch {}
  }
  return out;
}

export function verdictToRoute(v) { return v === "REVISE" || v === "RETIRE"; }

export function renderReport(rows, date) {
  const bands = {};
  for (const r of rows) (bands[r.level || "(unknown)"] ||= []).push(r);
  let md = `# Coach Audit — ${date}\n\nRetroactive Head-Coach panel over ${rows.length} post-wipe seed(s). Verbs: KEEP / REVISE / RETIRE.\n`;
  const tally = rows.reduce((m, r) => ((m[r.verdict] = (m[r.verdict] || 0) + 1), m), {});
  md += `\n**Tally:** ` + Object.entries(tally).map(([k, n]) => `${k} ${n}`).join(" · ") + `\n`;
  for (const band of Object.keys(bands).sort()) {
    md += `\n## ${band}\n\n| Seed | Verdict | Conf | Room | Notes |\n|------|---------|------|------|-------|\n`;
    for (const r of bands[band]) {
      md += `| ${r.id} | ${r.verdict} | ${r.confidence ?? "—"} | ${r.convened ? "convened" : "solo"} | ${(r.notes || []).join("; ").replace(/\|/g, "/")} |\n`;
    }
  }
  return md;
}

// Standalone scenario-panel runner (the audit CLI has no gauntlet-run in scope).
// Mirrors runScenarioPanel in gauntlet-run.mjs but lives here so the CLI is
// self-contained. Returns { ok, critiques }.
function makeScenarioPanel(lenses, makePrompt) {
  return async (scenario, node, concept, opts) => {
    const ascii = asciiRink(scenario);
    if (opts.mock) return { ok: true, critiques: [] };
    const reviews = await Promise.all(lenses.map(async (lens) => {
      try { const r = await runAgent({ ...makePrompt({ scenario, ascii, node, concept, lens, others: null }), model: opts.coachModel }); return { verdict: r.verdict, critique: r.critique || [] }; }
      catch (e) { return { verdict: "REVISE", critique: [`${lens.key} error: ${e.message}`] }; }
    }));
    return reviews.every((r) => r.verdict === "PASS") ? { ok: true, critiques: [] } : { ok: false, critiques: reviews.filter((r) => r.verdict !== "PASS").flatMap((r) => r.critique) };
  };
}
async function visualHeadCoachReconcile(scenario, node, concept, opts) {
  if (opts.mock) return { ok: true, notes: [] };
  try { const r = await runAgent({ ...buildVisualHeadCoachPrompt({ scenario, node, concept }), model: opts.coachModel }); return { ok: r.verdict === "APPROVE", notes: r.notes || [] }; }
  catch (e) { return { ok: false, notes: [`head coach error: ${e.message}`] }; }
}

function parseArgs(argv) {
  const a = { mock: false, dryRun: false, limit: Infinity, band: null, ids: null, coachModel: "sonnet", sink: null };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--mock") a.mock = true;
    else if (t === "--dry-run") a.dryRun = true;
    else if (t === "--limit") a.limit = parseInt(argv[++i], 10);
    else if (t === "--band") a.band = argv[++i];
    else if (t === "--ids") a.ids = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (t === "--coach-model") a.coachModel = argv[++i];
    else if (t === "--sink") a.sink = argv[++i];
  }
  return a;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const ledger = loadLedger();
  let seeds = loadSeeds();
  if (opts.ids) seeds = seeds.filter((s) => opts.ids.includes(s.seed.id));
  if (opts.band) seeds = seeds.filter((s) => (s.seed.level || "").split(" ")[0] === opts.band);
  if (Number.isFinite(opts.limit)) seeds = seeds.slice(0, opts.limit);
  if (!seeds.length) { console.log("No seeds matched."); return; }

  const runHockeyPanel = makeScenarioPanel(PANEL_LENSES, buildVisualHockeyCoachPrompt);
  const runVisualPanel = makeScenarioPanel(VISUAL_LENSES, buildVisualCoachPrompt);
  const rows = [];
  console.log(`Auditing ${seeds.length} seed(s) on ${opts.coachModel}${opts.mock ? " [mock]" : ""}…\n`);
  const coachSink = opts.sink === "supabase" ? createCoachSink() : null;
  if (coachSink) console.log("→ writing coach verdicts to Supabase coach_reviews");
  for (const { seed } of seeds) {
    const node = nodeById(ledger, seed.nodeId) || { id: seed.nodeId, ageId: (seed.nodeId || "").split(".")[0], conceptId: (seed.nodeId || "").split(".")[1] };
    const concept = (node && node.conceptId && conceptById(ledger, node.conceptId)) || { name: node.conceptId, definition: "" };
    const ascii = asciiRink(seed);
    const _v = runHockeyValidators(seed);
    const _checks = [..._v.errs, ..._v.warns];
    const asciiPlus = _checks.length
      ? `${ascii}\n\nMACHINE GEOMETRY CHECKS (deterministic, treat as verified fact):\n${_checks.map((c) => `- ${c}`).join("\n")}`
      : ascii;
    const r = await auditScenario({ scenario: seed, ascii: asciiPlus, node, concept, opts, runHockeyPanel, runVisualPanel, runVisualHeadCoach: visualHeadCoachReconcile });
    rows.push({ id: seed.id, level: seed.level || seed.levels?.[0], verdict: r.verdict, confidence: r.confidence, notes: r.notes, convened: r.convened });
    if (coachSink) {
      try { await coachSink.upsert(coachRow({ seed, result: r, model: opts.coachModel })); }
      catch (e) { console.error(`coach_reviews upsert failed for ${seed.id}: ${e.message}`); }
    }
    console.log(`${r.verdict.padEnd(7)} ${seed.id}${r.convened ? " (room)" : ""}`);
    if (!opts.dryRun && verdictToRoute(r.verdict)) {
      const item = { question: seed, audit: { verdict: r.verdict, confidence: r.confidence, notes: r.notes }, queuedAt: new Date().toISOString().slice(0, 10) };
      enqueue(paths, item);
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  const outDir = resolve(root, "docs/factory/coach-runs");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, `audit-${date}.md`);
  if (!opts.dryRun) writeFileSync(outFile, renderReport(rows, date), "utf8");
  const routed = rows.filter((r) => verdictToRoute(r.verdict)).length;
  console.log(`\nDone. ${rows.length} assessed; ${routed} routed to #review.${opts.dryRun ? " (dry-run: no writes)" : ` Report: ${outFile}`}`);
}

// Only run main when invoked directly (so the test can import the helpers).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
