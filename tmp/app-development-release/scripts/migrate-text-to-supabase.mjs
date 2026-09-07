// One-shot migration: src/data/questions.json → public.questions table.
//
// Runs alongside the legacy review_questions table — does NOT touch it.
// Migrated rows are inserted with status='Live' (these questions are already
// shipping in the app). Idempotent via on conflict (id) do nothing.
//
// Usage:
//   node scripts/migrate-text-to-supabase.mjs              # run migration
//   node scripts/migrate-text-to-supabase.mjs --dry-run    # preview, no writes
//
// Requires in .env:
//   VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

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

// Map levels in questions.json keys → age tag stored in age_groups[].
const LEVEL_TO_AGE = {
  "U5 / Timbits":    "U5",
  "U7 / Initiation": "U7",
  "U9 / Novice":     "U9",
  "U11 / Atom":      "U11",
  "U13 / Peewee":    "U13",
  "U15 / Bantam":    "U15",
  "U18 / Midget":    "U18",
};

// Difficulty: questions.json uses d=1|2|3 (max observed). Map to brief enum.
const DIFFICULTY_MAP = { 1: "Beginner", 2: "Intermediate", 3: "Advanced", 4: "Elite" };

// Question type → format. Anything not listed falls back to "Multiple Choice"
// and the original row goes into legacy_source for session-4 rehydration.
const TYPE_TO_FORMAT = {
  undefined:    "Multiple Choice", // no `type` field == legacy MC
  null:         "Multiple Choice",
  mc:           "Multiple Choice",
  next:         "Multiple Choice", // "what happens next?" MC variant
  mistake:      "Multiple Choice", // "spot the mistake" MC variant
  "pov-pick":   "Multiple Choice",
  "pov-mc":     "Multiple Choice",
  tf:           "True/False",
  seq:          "Sequence",
  "sequence-rink": "Sequence",
  multi:        "Multi-Select",
  "hot-spots":  "Hotspot",
  // Rink interaction types — stored as "Multiple Choice" placeholder; full
  // shape preserved in legacy_source.
  "zone-click":   "Multiple Choice",
  "drag-target":  "Multiple Choice",
  "drag-place":   "Multiple Choice",
  "multi-tap":    "Multiple Choice",
  "lane-select":  "Multiple Choice",
  "path-draw":    "Multiple Choice",
};

// Convert ['A skate close', 'B skate away', ...] OR [{ text }] OR plain strings
// into the brief's [{label,text}, ...] jsonb shape.
function normalizeOptions(opts) {
  if (!Array.isArray(opts)) return [];
  return opts.map((o, i) => {
    const label = String.fromCharCode(65 + i); // A, B, C, ...
    if (typeof o === "string") return { label, text: o };
    if (o && typeof o === "object") return { label, text: o.text || o.label || JSON.stringify(o) };
    return { label, text: String(o) };
  });
}

// `ok` is the 0-based index of the correct option for MC; for multi it's an
// array of indices; for tf it's 0/1 (true/false); for sequence it's the
// expected order. We translate to letters for MC/multi, "True"/"False" for tf,
// and a comma-joined letter list for sequence/multi.
function deriveCorrectAnswer(q) {
  const t = q.type;
  const ok = q.ok;
  if (t === "tf") {
    if (ok === 0 || ok === true) return "True";
    if (ok === 1 || ok === false) return "False";
    return null;
  }
  if (t === "multi") {
    const arr = Array.isArray(ok) ? ok : [];
    return arr.map(i => String.fromCharCode(65 + Number(i))).join(",");
  }
  if (t === "seq" || t === "sequence-rink") {
    const arr = Array.isArray(ok) ? ok : [];
    return arr.map(i => String.fromCharCode(65 + Number(i))).join(",");
  }
  if (Number.isFinite(ok)) return String.fromCharCode(65 + Number(ok));
  return null;
}

// Combine `why` (correct-answer rationale) and `tip` (one-liner takeaway) into
// a single explanation field, separated by a blank line. Brief schema doesn't
// have a tip field; legacy_source preserves both verbatim if needed later.
function buildExplanation(q) {
  const parts = [];
  if (q.why) parts.push(String(q.why).trim());
  if (q.tip) parts.push(`Tip: ${String(q.tip).trim()}`);
  return parts.join("\n\n") || null;
}

// Pull the unique multi-age tags from `levels` array, then normalize to the
// short codes used in age_groups[]. Falls back to the bucket level when a
// question is missing the levels array.
function deriveAgeGroups(q, bucketLevel) {
  const levels = Array.isArray(q.levels) && q.levels.length ? q.levels : [bucketLevel];
  const ages = [];
  for (const lv of levels) {
    const age = LEVEL_TO_AGE[lv];
    if (age && !ages.includes(age)) ages.push(age);
  }
  return ages;
}

function deriveConcepts(q) {
  const out = [];
  if (q.cat) out.push(String(q.cat).trim());
  return out;
}

const qb = JSON.parse(readFileSync(join(ROOT, "src/data/questions.json"), "utf8"));

const rows = [];
const skipped = [];
const formatCounts = {};
const seenIds = new Set();

for (const [bucketLevel, arr] of Object.entries(qb)) {
  if (!LEVEL_TO_AGE[bucketLevel]) {
    console.warn(`Skipping unrecognized level "${bucketLevel}"`);
    continue;
  }
  for (const q of arr) {
    if (!q.id) { skipped.push({ reason: "no id", q }); continue; }
    if (seenIds.has(q.id)) { skipped.push({ reason: "duplicate id in JSON", id: q.id }); continue; }
    seenIds.add(q.id);

    const typeKey = q.type === undefined ? "undefined" : q.type === null ? "null" : q.type;
    const format = TYPE_TO_FORMAT[typeKey] || TYPE_TO_FORMAT[q.type] || "Multiple Choice";
    formatCounts[format] = (formatCounts[format] || 0) + 1;

    const ageGroups = deriveAgeGroups(q, bucketLevel);
    if (!ageGroups.length) { skipped.push({ reason: "no recognized age", id: q.id }); continue; }

    const row = {
      id: q.id,
      type: "text",
      linked_image_id: null,
      age_groups: ageGroups,
      format,
      difficulty: DIFFICULTY_MAP[q.d] || null,
      question_text: q.sit || q.question_text || q.q || "(missing question text)",
      options: normalizeOptions(q.opts),
      correct_answer: deriveCorrectAnswer(q),
      explanation: buildExplanation(q),
      concepts: deriveConcepts(q),
      status: "Live",
      is_auto_graded: true,
      hotspot_coords: null,
      sequence_items: null,
      flagged_reason: null,
      legacy_source: q,           // preserve original row for session-4 rehydration
    };

    rows.push(row);
  }
}

console.log(`Prepared ${rows.length} rows from ${Object.keys(qb).length} age buckets.`);
console.log("By format:", formatCounts);
if (skipped.length) console.warn(`Skipped ${skipped.length}:`, skipped.slice(0, 5));

if (dryRun) {
  console.log("\n(dry-run) No writes. Sample row:");
  console.log(JSON.stringify(rows[0], null, 2));
  process.exit(0);
}

const BATCH = 200;
let inserted = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const slice = rows.slice(i, i + BATCH);
  const { error, count } = await sb
    .from("questions")
    .upsert(slice, { onConflict: "id", ignoreDuplicates: true, count: "exact" });
  if (error) {
    console.error(`Batch ${i / BATCH} failed:`, error.message);
    process.exit(1);
  }
  inserted += count || 0;
  process.stdout.write(`  batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(rows.length / BATCH)} ok (${slice.length} rows)\n`);
}

console.log(`\nDone. New rows inserted: ${inserted}. Existing rows left untouched.`);
console.log("Re-running this script is safe — already-imported questions skip via on conflict do nothing.");
