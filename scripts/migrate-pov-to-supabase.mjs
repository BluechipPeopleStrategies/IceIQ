// One-shot migration: Notion JSON export → public.pov_images + public.questions.
//
// Skeleton: ready to consume the JSON shape produced by the Notion export
// (see ADMIN_BUILD_BRIEF.md for the expected structure). When the export
// file is missing the script exits with a friendly note explaining where to
// drop it.
//
// Usage:
//   node scripts/migrate-pov-to-supabase.mjs                       # uses data/pov-export.json
//   node scripts/migrate-pov-to-supabase.mjs --file=path/to.json   # custom path
//   node scripts/migrate-pov-to-supabase.mjs --dry-run             # preview, no writes
//
// Requires in .env:
//   VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
// Default matches the path that scripts/export-pov-from-notion.mjs writes to.
// Override with --file=<path> for a one-off run against a different export.
const DEFAULT_PATH = join(ROOT, "src/data/povQuestions.json");

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

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fileArg = args.find(a => a.startsWith("--file="));
const filePath = fileArg ? fileArg.slice("--file=".length) : DEFAULT_PATH;

if (!existsSync(filePath)) {
  console.log(`No export file found at:\n  ${filePath}\n`);
  console.log("To run this migration:");
  console.log(`  1. Save the Notion export JSON to ${DEFAULT_PATH}`);
  console.log("     (or pass --file=<path>)");
  console.log("  2. Re-run this script.");
  console.log("\nExpected JSON shape (see ADMIN_BUILD_BRIEF.md → Data migration):");
  console.log(`  {
    "version": "1.0",
    "lastSynced": "...",
    "counts": { "images": N, "questions": N },
    "images": [
      {
        "id": "IMG-2v1-001",
        "archetype": "2-on-1 Rush",
        "variant": "A",
        "cognitiveSkill": "Decision-Making",
        "ageGroups": ["U7","U9","U11","U13"],
        "position": ["Forward","Defense"],
        "povType": "Puck Carrier",
        "zone": "OZ",
        "numericalState": "+1 Advantage",
        "readTrigger": "...",
        "distractors": "...",
        "fullPrompt": "...",
        "negativePrompt": "...",
        "generationTool": "Midjourney",
        "toolSettings": "...",
        "imageUrl": "https://...",
        "variantsGenerated": 4,
        "readClarity": "Pass",
        "status": "Live",
        "notes": "...",
        "questions": [
          {
            "id": "Q-2v1-001-A1-U7",
            "ageGroups": ["U7"],
            "format": "Multiple Choice",
            "difficulty": "Beginner",
            "questionText": "...",
            "options": [{"label":"A","text":"..."}],
            "correctAnswer": "B",
            "explanation": "...",
            "concepts": ["Pass vs Shoot"],
            "isAutoGraded": true,
            "hotspotCoords": null,
            "sequenceItems": null
          }
        ]
      }
    ]
  }`);
  process.exit(0);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

let payload;
try {
  payload = JSON.parse(readFileSync(filePath, "utf8"));
} catch (e) {
  console.error(`Failed to parse ${filePath}:`, e.message);
  process.exit(1);
}

if (!Array.isArray(payload?.images)) {
  console.error(`Invalid export shape: expected payload.images to be an array. Got: ${typeof payload?.images}`);
  process.exit(1);
}

// ─────────────────────────────────────────────
// Build rows
// ─────────────────────────────────────────────
function asArray(v) { return Array.isArray(v) ? v : (v == null ? [] : [v]); }
function nullish(v) { return v == null ? null : v; }

const imageRows = [];
const questionRows = [];
const skippedQuestions = [];

for (const img of payload.images) {
  if (!img?.id || !img?.archetype) {
    console.warn(`Skipping image without id/archetype:`, img?.id);
    continue;
  }

  // Notion exporter writes `imageUrls` (array of file URLs) — pick the first.
  // Fields like fullPrompt / generationTool aren't in the exporter output yet;
  // they'll be null in Supabase and editable from the admin dashboard later.
  const imageUrl = nullish(img.imageUrl) || (Array.isArray(img.imageUrls) ? img.imageUrls[0] : null);
  imageRows.push({
    id: img.id,
    archetype: img.archetype,
    variant: nullish(img.variant),
    cognitive_skill: nullish(img.cognitiveSkill),
    age_groups: asArray(img.ageGroups),
    position: asArray(img.position),
    pov_type: nullish(img.povType),
    zone: nullish(img.zone),
    numerical_state: nullish(img.numericalState),
    read_trigger: nullish(img.readTrigger),
    distractors: nullish(img.distractors),
    full_prompt: nullish(img.fullPrompt),
    negative_prompt: nullish(img.negativePrompt),
    generation_tool: nullish(img.generationTool),
    tool_settings: nullish(img.toolSettings),
    image_url: imageUrl,
    variants_generated: Number.isFinite(img.variantsGenerated) ? img.variantsGenerated : 0,
    read_clarity: img.readClarity || "Untested",
    status: img.status || "Draft",
    notes: nullish(img.notes),
  });

  for (const q of img.questions || []) {
    if (!q?.id) { skippedQuestions.push({ reason: "no id", img: img.id }); continue; }
    if (!q.questionText) { skippedQuestions.push({ reason: "no questionText", id: q.id }); continue; }
    if (!q.format) { skippedQuestions.push({ reason: "no format", id: q.id }); continue; }

    // Notion exporter writes `ageGroup` (single string) per question; the
    // brief schema expects `age_groups` (array). Accept either.
    const ages = asArray(q.ageGroups).length
      ? asArray(q.ageGroups)
      : (q.ageGroup ? [q.ageGroup] : asArray(img.ageGroups));

    questionRows.push({
      id: q.id,
      type: "pov_image",
      linked_image_id: img.id,
      age_groups: ages,
      format: q.format || q.rawFormat || "Multiple Choice",
      difficulty: nullish(q.difficulty),
      question_text: q.questionText,
      options: Array.isArray(q.options) ? q.options : [],
      correct_answer: nullish(q.correctAnswer),
      explanation: nullish(q.explanation),
      concepts: asArray(q.concepts),
      // Notion's status enum doesn't match Supabase's exactly. Map the closest
      // ones so the migration produces valid rows; admin can adjust later.
      // Defaults to 'Draft' — keeps RLS read-Live policy from showing them
      // in the live app until the admin promotes them.
      status: ({
        "Approved":     "Approved",
        "Live in App":  "Live",
        "Needs Revision": "Flagged",
        "Rejected":     "Killed",
        "Draft":        "Draft",
      })[q.status] || "Draft",
      is_auto_graded: q.isAutoGraded !== false,
      hotspot_coords: q.hotspotCoords || null,
      sequence_items: q.sequenceItems || null,
      flagged_reason: nullish(q.flaggedReason),
      legacy_source: null,
    });
  }
}

console.log(`Prepared ${imageRows.length} image rows and ${questionRows.length} question rows.`);
if (skippedQuestions.length) console.warn(`Skipped ${skippedQuestions.length} questions:`, skippedQuestions.slice(0, 5));

if (dryRun) {
  console.log("\n(dry-run) Sample image row:");
  console.log(JSON.stringify(imageRows[0], null, 2));
  console.log("\n(dry-run) Sample question row:");
  console.log(JSON.stringify(questionRows[0], null, 2));
  process.exit(0);
}

// ─────────────────────────────────────────────
// Insert: images first (questions FK to pov_images.id)
// ─────────────────────────────────────────────
async function upsertBatch(table, rows, label) {
  if (!rows.length) return 0;
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error, count } = await sb
      .from(table)
      .upsert(slice, { onConflict: "id", ignoreDuplicates: true, count: "exact" });
    if (error) { console.error(`${label} batch ${i / BATCH} failed:`, error.message); process.exit(1); }
    inserted += count || 0;
    process.stdout.write(`  ${label} batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(rows.length / BATCH)} ok (${slice.length} rows)\n`);
  }
  return inserted;
}

const insImg = await upsertBatch("pov_images", imageRows, "pov_images");
const insQ = await upsertBatch("questions", questionRows, "questions");

console.log(`\nDone. New pov_images: ${insImg}. New questions: ${insQ}. Existing rows left untouched.`);
console.log("Re-running this script is safe.");
