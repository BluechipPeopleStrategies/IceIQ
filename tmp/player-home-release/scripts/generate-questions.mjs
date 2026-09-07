// Turn a queued question_request (a scene + a preset) into draft questions on
// that scene — Decision-Test-constrained, then linted. Reuses the scenario-author
// LLM stack. RUNNING THIS SPENDS metered LLM calls, so it's owner-initiated only.
//
//   npm run generate-questions                      # all open requests
//   npm run generate-questions -- --id <requestId>  # one request
//   npm run generate-questions -- --scene u13_oz_structure_place_v1 --preset couple  # ad-hoc, no row
//   ...add --dry-run to generate + lint but NOT write files or mark requests done
//
// Needs VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env (for request rows).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { buildSystemPrompt } from "../tools/scenario-author/prompt.js";
import { lintScenario } from "../tools/scenario-author/validate.mjs";
import { runAgent } from "../tools/lib/claude-agent.mjs";
import { assertNotFrozen } from "../tools/lib/frozen-tools.mjs";

// FROZEN (Phase 9 Task 1). This script spends metered LLM calls and writes the
// results straight into src/scenario/seeds/. Guarded before any env, Supabase,
// or LLM work happens, so a stray invocation costs nothing.
assertNotFrozen("scripts/generate-questions.mjs");

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const SEEDS_DIR = path.join(ROOT, "src/scenario/seeds");

function loadEnv() {
  const env = {};
  try {
    for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (m) env[m[1]] = m[2];
    }
  } catch { /* no .env */ }
  return env;
}
const env = { ...loadEnv(), ...process.env };

function parseArgs(argv) {
  const a = { id: null, scene: null, preset: null, dryRun: false, model: "sonnet" };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--id") a.id = argv[++i];
    else if (t === "--scene") a.scene = argv[++i];
    else if (t === "--preset") a.preset = argv[++i];
    else if (t === "--dry-run") a.dryRun = true;
    else if (t === "--model") a.model = argv[++i];
  }
  return a;
}
const args = parseArgs(process.argv.slice(2));

// preset → ordered list of question TYPES to generate
const PRESET_TYPES = {
  one_each: ["mc", "true-false", "place"],
  couple: ["mc", "place"],
  surprise: ["true-false", "mc", "place"],
};
const TYPE_LABEL = { mc: "4-option multiple choice", "true-false": "true/false (2-option mc)", place: "positioning (drag a player)" };

function loadScene(scenarioId) {
  try { return JSON.parse(fs.readFileSync(path.join(SEEDS_DIR, `${scenarioId}.json`), "utf8")); }
  catch { return null; }
}

function suffix(i) { return ["a", "b", "c", "d", "e", "f"][i] || `x${i}`; }

function buildPrompt(scene, type, stemId) {
  const sceneJson = JSON.stringify({ stage: scene.stage, actors: scene.actors, level: scene.level, nodeId: scene.nodeId }, null, 2);
  const typeRules = type === "place"
    ? `Make it a POSITIONING question: interaction.kind="place" with items=[the actor id(s) the player drags] and correct.placements (use zoneId from the zone vocabulary, or x/y/tolerance). The dragged player(s) must START off their target spot.`
    : type === "true-false"
    ? `Make it a TRUE/FALSE question: a valid interaction.kind (e.g. "point") + a correct field of that kind, PLUS an mc with EXACTLY 2 opts ["True","False"] and the right ok index.`
    : `Make it a MULTIPLE CHOICE question: a valid interaction.kind (e.g. "point" or "selection") + a matching correct field, PLUS an mc with EXACTLY 4 plausible opts and the right ok index.`;
  return (
`Author ONE new question on the EXISTING scene below. Keep the SAME stage and keep the situation
recognisable (you may add or nudge actors only as the question type needs — e.g. a decoy
defender — but do not redraw a different play).

SCENE:
${sceneJson}

${typeRules}

THE DECISION TEST (required): the question must be a real read, not recall.
  - There must be a CUE on the board such that, if it changed, the answer would change.
  - There must be a tempting WRONG answer a non-reader would pick.
  - Include a top-level "read": { "cue": "<the cue in one line>", "decoy": { "x": <n>, "y": <n> } }
    where the decoy is the tempting wrong spot, and a DEFENDER sits within 0.18 of it (contested).
Calibrate the decoy to the age band, not to an expert.

Output ONLY the scenario JSON object (no prose).`
  );
}

async function genOne(scene, type, stemId, idx) {
  const system = buildSystemPrompt();
  const prompt = buildPrompt(scene, type, stemId);
  let scenario;
  try { scenario = await runAgent({ system, prompt, model: args.model }); }
  catch (e) { return { ok: false, type, errs: [`agent failed: ${e.message}`] }; }
  // Force scene-shared metadata so the new question joins the stem cleanly.
  scenario.stemId = stemId;
  if (scene.stemLabel) scenario.stemLabel = scene.stemLabel;
  scenario.type = "scenario";
  scenario.nodeId = scene.nodeId;
  scenario.level = scene.level;
  scenario.levels = scene.levels || (scene.level ? [scene.level] : undefined);
  scenario.id = `${stemId}_${type.replace("-", "")}_${suffix(idx)}`;
  // Enforce the Decision Test on place boards (lint only warns).
  if (type === "place" && !(scenario.read && scenario.read.decoy && typeof scenario.read.decoy.x === "number")) {
    return { ok: false, type, errs: ["no read{cue,decoy} declared — Decision Test not met"], scenario };
  }
  const lint = lintScenario(scenario);
  if (!lint.ok) return { ok: false, type, errs: lint.errs, scenario };
  return { ok: true, type, scenario, warns: lint.warns };
}

async function handle(req, sb) {
  const scene = loadScene(req.scenario_id);
  if (!scene) { console.log(`✗ ${req.scenario_id}: scene seed not found — skipping`); return; }
  const stemId = req.stem_id || scene.stemId || req.scenario_id;
  const types = PRESET_TYPES[req.preset] || ["mc"];
  console.log(`\n→ ${stemId} (${req.preset}): generating ${types.map(t => TYPE_LABEL[t]).join(", ")}`);
  let wrote = 0;
  for (let i = 0; i < types.length; i++) {
    const r = await genOne(scene, types[i], stemId, i);
    if (!r.ok) { console.log(`   ✗ ${types[i]}: ${r.errs.join("; ")}`); continue; }
    if (args.dryRun) { console.log(`   ~ ${types[i]} → ${r.scenario.id} (dry-run, not written)`); wrote++; continue; }
    fs.writeFileSync(path.join(SEEDS_DIR, `${r.scenario.id}.json`), JSON.stringify(r.scenario, null, 2) + "\n", "utf8");
    console.log(`   ✓ ${types[i]} → wrote ${r.scenario.id}.json${r.warns?.length ? ` (${r.warns.length} warn)` : ""}`);
    wrote++;
  }
  if (!args.dryRun && req.id && sb && wrote > 0) {
    await sb.from("question_requests").update({ status: "done" }).eq("id", req.id);
    console.log(`   · request ${req.id} marked done`);
  }
}

async function main() {
  let sb = null;
  const url = env.VITE_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) sb = createClient(url, key, { auth: { persistSession: false } });

  let requests;
  if (args.scene && args.preset) {
    requests = [{ id: null, scenario_id: args.scene, stem_id: null, preset: args.preset }];
  } else {
    if (!sb) { console.error("Need .env (VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) to read requests, or pass --scene + --preset."); process.exit(1); }
    let q = sb.from("question_requests").select("id,scenario_id,stem_id,preset").eq("status", "open").order("created_at");
    if (args.id) q = sb.from("question_requests").select("id,scenario_id,stem_id,preset").eq("id", args.id);
    const { data, error } = await q;
    if (error) { console.error(error.message); process.exit(1); }
    requests = data || [];
  }
  if (!requests.length) { console.log("No open requests."); return; }
  console.log(`${requests.length} request(s)${args.dryRun ? " [dry-run]" : ""} on ${args.model}…`);
  for (const req of requests) await handle(req, sb);
  console.log("\nDone. Review the new seeds, then run the coach gate before they go live:");
  console.log("  node tools/gauntlet-audit.mjs --ids <new ids> --sink supabase");
}
main();
