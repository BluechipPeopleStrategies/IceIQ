// Export curated "keep" rows from review_questions back into src/data/questions.json.
// Preserves the level-keyed top-level shape. Adds a "U5 / Timbits" bucket if
// any U5 rows are kept.
//
// Usage:
//   node scripts/pull-review-to-bank.mjs              # writes questions.json
//   node scripts/pull-review-to-bank.mjs --dry-run    # prints stats, writes nothing
//
// Requires in .env:
//   VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BANK_PATH = join(ROOT, "src/data/questions.json");

const LEVEL_ORDER = [
  "U5 / Timbits",
  "U7 / Initiation",
  "U9 / Novice",
  "U11 / Atom",
  "U13 / Peewee",
  "U15 / Bantam",
  "U18 / Midget",
];

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(join(ROOT, ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (m) env[m[1]] = m[2];
    }
  } catch {}
  return env;
}

const env = { ...loadEnv(), ...process.env };
const url = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

// Pull in batches (Supabase default range cap is 1000; keep safe).
async function fetchAll() {
  const out = [];
  let from = 0;
  const PAGE = 500;
  while (true) {
    const { data, error } = await sb
      .from("review_questions")
      .select("*")
      .range(from, from + PAGE - 1);
    if (error) { console.error(error); process.exit(1); }
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

const all = await fetchAll();
console.log(`Fetched ${all.length} rows from review_questions.`);

// Group kept rows by level
const kept = all.filter(r => r.status === "keep");
const grouped = {};
for (const r of kept) {
  (grouped[r.level] ||= []).push(r);
}

// Build the new bank in canonical level order (skipping empty levels)
const newBank = {};
for (const level of LEVEL_ORDER) {
  if (!grouped[level] || grouped[level].length === 0) continue;
  // Sort by numeric suffix where possible so output is deterministic.
  const sorted = grouped[level].slice().sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  newBank[level] = sorted.map(r => r.current);
}

// Also capture any unfamiliar levels (defensive)
for (const level of Object.keys(grouped)) {
  if (!LEVEL_ORDER.includes(level)) {
    console.warn(`Unrecognized level "${level}" — appending`);
    newBank[level] = grouped[level].map(r => r.current);
  }
}

// Stats
const byStatus = { unreviewed: 0, keep: 0, flag: 0, kill: 0 };
for (const r of all) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
const editedCount = all.filter(r => r.original && JSON.stringify(r.original) !== JSON.stringify(r.current)).length;
const newCount = all.filter(r => r.created_in_tool).length;

console.log("\n=== Stats ===");
console.log(`  unreviewed: ${byStatus.unreviewed}`);
console.log(`  keep:       ${byStatus.keep}`);
console.log(`  flag:       ${byStatus.flag}`);
console.log(`  kill:       ${byStatus.kill}`);
console.log(`  edited:     ${editedCount}`);
console.log(`  new (tool): ${newCount}`);
console.log("\n=== Kept by level ===");
for (const level of Object.keys(newBank)) {
  console.log(`  ${level}: ${newBank[level].length}`);
}

if (dryRun) {
  console.log("\n(dry-run) No files written.");
  process.exit(0);
}

// Back up existing bank first
if (existsSync(BANK_PATH)) {
  const backup = BANK_PATH + "." + new Date().toISOString().replace(/[:.]/g, "-") + ".bak";
  copyFileSync(BANK_PATH, backup);
  console.log(`\nBackup: ${backup}`);
}

writeFileSync(BANK_PATH, JSON.stringify(newBank) + "\n", "utf8");
console.log(`Wrote ${BANK_PATH}.`);
console.log("Next: run `npm run build` and commit + push.");
