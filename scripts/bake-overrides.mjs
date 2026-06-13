// Bake DB question_overrides back into the source files (scenario seeds + the
// text bank), then clear the baked rows so the source stays canonical and
// version-controlled. Run: npm run bake-overrides [--dry-run]
// Needs VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { applyOverride } from "../src/review/overrides.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const SEEDS_DIR = path.join(ROOT, "src/scenario/seeds");
const BANK_PATH = path.join(ROOT, "src/data/bank.json");
const dryRun = process.argv.includes("--dry-run");

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
const url = env.VITE_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: rows, error } = await sb.from("question_overrides").select("question_id,patch");
if (error) { console.error(error.message); process.exit(1); }
if (!rows?.length) { console.log("No overrides to bake."); process.exit(0); }

const bank = JSON.parse(fs.readFileSync(BANK_PATH, "utf8"));
let bankDirty = false;
const baked = [];

for (const { question_id, patch } of rows) {
  const seedPath = path.join(SEEDS_DIR, `${question_id}.json`);
  if (fs.existsSync(seedPath)) {
    const base = JSON.parse(fs.readFileSync(seedPath, "utf8"));
    const merged = applyOverride(base, patch);
    if (!dryRun) fs.writeFileSync(seedPath, JSON.stringify(merged, null, 2) + "\n", "utf8");
    baked.push(question_id);
    console.log(`${dryRun ? "~" : "✓"} seed  ${question_id}`);
    continue;
  }
  // else find in the bank (keyed by level → questions[])
  let found = false;
  for (const lvl of Object.keys(bank)) {
    const arr = bank[lvl];
    if (!Array.isArray(arr)) continue;
    const i = arr.findIndex(q => q && q.id === question_id);
    if (i >= 0) { arr[i] = applyOverride(arr[i], patch); bankDirty = true; found = true; baked.push(question_id); console.log(`${dryRun ? "~" : "✓"} bank  ${question_id}`); break; }
  }
  if (!found) console.log(`✗ ${question_id}: not found in seeds or bank — leaving override in place`);
}

if (bankDirty && !dryRun) fs.writeFileSync(BANK_PATH, JSON.stringify(bank, null, 2) + "\n", "utf8");

if (!dryRun && baked.length) {
  const { error: delErr } = await sb.from("question_overrides").delete().in("question_id", baked);
  if (delErr) console.error(`baked ${baked.length} but failed to clear rows: ${delErr.message}`);
  else console.log(`\ncleared ${baked.length} baked override row(s)`);
}
console.log(`\n${dryRun ? "[dry-run] would bake" : "baked"} ${baked.length} of ${rows.length}. Commit the seed/bank changes.`);
