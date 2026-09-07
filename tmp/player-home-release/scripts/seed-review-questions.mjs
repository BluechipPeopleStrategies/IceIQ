// One-shot seed: pushes src/data/questions.json → review_questions table.
// Idempotent (on conflict do nothing), so re-running after adding seed questions
// to questions.json will only insert the new ones.
//
// Usage:
//   node scripts/seed-review-questions.mjs
//
// Requires in .env:
//   VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (NOT the anon key — bypasses RLS)

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Minimal .env parser (avoids adding dotenv dependency)
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

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

const AGE_MAP = {
  "U7 / Initiation": "u7",
  "U9 / Novice":     "u9",
  "U11 / Atom":      "u11",
  "U13 / Peewee":    "u13",
  "U15 / Bantam":    "u15",
  "U18 / Midget":    "u18",
};

const qb = JSON.parse(readFileSync(join(ROOT, "src/data/questions.json"), "utf8"));

const rows = [];
for (const [level, arr] of Object.entries(qb)) {
  const age = AGE_MAP[level];
  if (!age) {
    console.warn(`Skipping unrecognized level "${level}"`);
    continue;
  }
  for (const q of arr) {
    rows.push({
      id: q.id,
      level,
      age,
      original: q,
      current: q,
      status: "unreviewed",
      created_in_tool: false,
    });
  }
}

console.log(`Prepared ${rows.length} rows across ${Object.keys(AGE_MAP).length} age groups.`);

// Upsert in batches to avoid payload limits. on conflict do nothing preserves reviewed state.
const BATCH = 200;
let inserted = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const slice = rows.slice(i, i + BATCH);
  const { error, count } = await sb
    .from("review_questions")
    .upsert(slice, { onConflict: "id", ignoreDuplicates: true, count: "exact" });
  if (error) {
    console.error(`Batch ${i / BATCH} failed:`, error.message);
    process.exit(1);
  }
  inserted += count || 0;
  process.stdout.write(`  batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(rows.length / BATCH)} ok (${slice.length} rows)\n`);
}

console.log(`Done. New rows inserted: ${inserted}. Existing rows left untouched.`);
