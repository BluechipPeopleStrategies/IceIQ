#!/usr/bin/env node
// Coach auto-revise. Reads open coach_reviews (verdict revise|retire) and acts:
//   REVISE -> generate a constrained edit, validate, apply to the seed file (zero hard
//             errors; warnings allowed but marked), append feedback_log(source coach),
//             wipe the board's coach_reviews + scenario_reviews (verdict reset).
//   RETIRE -> archive the seed to seeds/_retired/, then record + reset the same way.
// Writes a per-run report and auto-commits seed changes in one commit (never pushes).
//
// Usage:
//   node scripts/coach-revise.mjs --dry-run --limit 3
//   node scripts/coach-revise.mjs --ids a,b
//   node scripts/coach-revise.mjs --mock --dry-run     # no claude, no writes (smoke)
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { loadSeeds } from "../tools/gauntlet-audit.mjs";
import { loadLedger, nodeById, conceptById } from "../tools/lib/curriculum-ledger.mjs";
import { asciiRink } from "../tools/gauntlet/ascii-rink.mjs";
import { runAgent } from "../tools/lib/claude-agent.mjs";
import { runHockeyValidators } from "../src/scenario/validators.js";
import { buildRevisePrompt } from "../tools/gauntlet/revise-prompt.mjs";
import { applyEdit, decideApply, buildReviseLogRow, reviseReport } from "../tools/lib/auto-revise-core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const seedDir = resolve(ROOT, "src/scenario/seeds");
const retiredDir = resolve(seedDir, "_retired");

function loadEnv() {
  const env = {};
  try {
    for (const l of readFileSync(join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (m) env[m[1]] = m[2];
    }
  } catch { /* no .env */ }
  return env;
}

function parseArgs(argv) {
  const a = { dryRun: false, mock: false, ids: null, limit: Infinity, model: "sonnet" };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--dry-run") a.dryRun = true;
    else if (t === "--mock") a.mock = true;
    else if (t === "--ids") a.ids = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (t === "--limit") a.limit = parseInt(argv[++i], 10);
    else if (t === "--coach-model") a.model = argv[++i];
  }
  return a;
}

async function generateEdit({ seed, ascii, node, concept, notes, errs, warns, opts }) {
  if (opts.mock) return { change: "mock: tightened the coaching tip", edit: { tip: "Mock auto-revise tip." } };
  return await runAgent({ ...buildRevisePrompt({ scenario: seed, ascii, node, concept, notes, errs, warns }), model: opts.model });
}

async function priorMaxIteration(sb, id) {
  const { data } = await sb.from("feedback_log").select("iteration").eq("scenario_id", id);
  return (data || []).reduce((m, r) => Math.max(m, r.iteration || 0), 0);
}

// Append the permanent record then wipe the board's open verdicts (reset to blank).
async function recordAndReset(sb, { id, node, change, coachNotes, dryRun }) {
  if (dryRun) return;
  const row = buildReviseLogRow({ scenario_id: id, node, change, coachNotes, priorMaxIteration: await priorMaxIteration(sb, id) });
  const { error: insErr } = await sb.from("feedback_log").insert(row);
  if (insErr) throw new Error(`feedback_log insert: ${insErr.message}`);
  await sb.from("coach_reviews").delete().eq("scenario_id", id);
  await sb.from("scenario_reviews").delete().eq("scenario_id", id);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const env = { ...loadEnv(), ...process.env };
  const url = env.VITE_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"); process.exit(1); }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: reviewsRaw, error } = await sb.from("coach_reviews").select("scenario_id,verdict,notes").in("verdict", ["revise", "retire"]).order("scenario_id", { ascending: true });
  if (error) { console.error(`coach_reviews read: ${error.message}`); process.exit(1); }
  let reviews = reviewsRaw || [];
  if (opts.ids) reviews = reviews.filter((r) => opts.ids.includes(r.scenario_id));
  if (Number.isFinite(opts.limit)) reviews = reviews.slice(0, opts.limit);
  if (!reviews.length) { console.log("No open coach REVISE/RETIRE rows."); return; }

  const byId = new Map(loadSeeds().map(({ file, seed }) => [seed.id, { file, seed }]));
  const ledger = loadLedger();
  const entries = [];
  let changedFiles = false;
  const touchedIds = [];

  for (const rev of reviews) {
    const id = rev.scenario_id;
    const hit = byId.get(id);
    if (!hit) { entries.push({ id, action: "error", error: "seed not found on disk" }); continue; }
    const { file, seed } = hit;
    const seedPath = resolve(seedDir, file);
    const coachNotes = rev.notes || "";
    const node = nodeById(ledger, seed.nodeId) || { id: seed.nodeId };
    const concept = (node && node.conceptId && conceptById(ledger, node.conceptId)) || { name: node?.conceptId, definition: "" };

    if (rev.verdict === "retire") {
      try {
        if (!opts.dryRun) {
          if (!existsSync(retiredDir)) mkdirSync(retiredDir, { recursive: true });
          renameSync(seedPath, resolve(retiredDir, file));
          changedFiles = true;
        }
        await recordAndReset(sb, { id, node: seed.nodeId, change: "RETIRED — archived to seeds/_retired/ per coach.", coachNotes, dryRun: opts.dryRun });
        entries.push({ id, action: "retired", change: "archived to seeds/_retired/" });
        touchedIds.push(id);
      } catch (e) { entries.push({ id, action: "error", error: e.message }); }
      continue;
    }

    // REVISE: generate -> validate -> apply (retry once on hard errors)
    try {
      const ascii = asciiRink(seed);
      const v0 = runHockeyValidators(seed);
      let result, edited, decision = "reject", errs = [], warns = [];
      for (let attempt = 0; attempt < 2; attempt++) {
        result = await generateEdit({ seed, ascii, node, concept, notes: coachNotes, errs: v0.errs || [], warns: v0.warns || [], opts });
        edited = applyEdit(seed, result.edit || {});
        if (JSON.stringify(edited) === JSON.stringify(seed)) { decision = "noop"; break; }
        const v = runHockeyValidators(edited);
        errs = v.errs || []; warns = v.warns || [];
        decision = decideApply({ errs, warns });
        if (decision !== "reject") break;
      }
      if (decision === "apply" || decision === "apply-marked") {
        if (!opts.dryRun) { writeFileSync(seedPath, JSON.stringify(edited, null, 2) + "\n", "utf8"); changedFiles = true; }
        await recordAndReset(sb, { id, node: seed.nodeId, change: result.change || "coach revision", coachNotes, dryRun: opts.dryRun });
        entries.push({ id, action: decision === "apply-marked" ? "applied-marked" : "applied", change: result.change, errs, warns });
        touchedIds.push(id);
      } else {
        entries.push({ id, action: "flagged", change: result?.change, errs, warns, error: decision === "noop" ? "no actionable edit — left flagged" : "hard errors after retry — left flagged" });
      }
    } catch (e) { entries.push({ id, action: "error", error: e.message }); }
  }

  const date = new Date().toISOString().slice(0, 10);
  const outDir = resolve(ROOT, "docs/factory/coach-revise");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, opts.dryRun ? `revise-${date}.dryrun.md` : `revise-${date}.md`);
  writeFileSync(outFile, reviseReport(entries, date), "utf8");

  if (!opts.dryRun && changedFiles) {
    try {
      execSync(`git add "${seedDir}"`, { cwd: ROOT, stdio: "ignore" });
      execSync(`git commit -m "chore(seeds): coach auto-revise ${date} (${touchedIds.join(", ")})"`, { cwd: ROOT, stdio: "ignore" });
    } catch (e) { console.error(`git commit skipped: ${e.message}`); }
  }

  const tally = entries.reduce((m, e) => ((m[e.action] = (m[e.action] || 0) + 1), m), {});
  console.log(`\nDone. ` + Object.entries(tally).map(([k, n]) => `${k} ${n}`).join(" · ") + `. Report: ${outFile}${opts.dryRun ? " (dry-run)" : ""}`);
  process.exit(entries.some((e) => e.action === "error") ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
