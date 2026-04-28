// Export POV scenario images and their questions from Notion to a JSON file
// the IceIQ app can consume. Read-only against Notion. Backs up the existing
// output file before overwriting (same pattern as pull-review-to-bank.mjs).
//
// Usage:
//   node scripts/export-pov-from-notion.mjs              # writes povQuestions.json
//   node scripts/export-pov-from-notion.mjs --dry-run    # prints stats + writes nothing
//
// Requires in .env:
//   NOTION_TOKEN   (internal integration token from notion.so/profile/integrations)
//
// Setup:
//   1. Create internal integration at notion.so/profile/integrations
//      - Type: Internal
//      - Capabilities: Read content only
//      - Workspace: the one with the IceIQ Image Library + Image Questions databases
//   2. Copy the Internal Integration Secret (starts with "ntn_") into .env as NOTION_TOKEN
//   3. Connect the integration to BOTH databases:
//      - Open IceIQ Image Library in Notion -> ... menu -> Connections -> add the integration
//      - Open IceIQ Image Questions in Notion -> ... menu -> Connections -> add the integration

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUTPUT_PATH = join(ROOT, "src/data/povQuestions.json");

// Notion DATABASE IDs (the legacy /databases/{id}/query endpoint accepts
// the database ID, not the data source ID. Internal integrations are shared
// with databases, so this is what works against the public REST API.)
const IMAGE_LIBRARY_DS_ID   = "54c022917f7c43d7b0af357408c017a4";
const IMAGE_QUESTIONS_DS_ID = "f5e1886f3e864625acd9dc4f90776245";

// Status values to include in the export.
// For the one-time admin-dashboard migration we accept every status so the
// admin can curate inside Supabase rather than at the Notion boundary.
const ALLOWED_IMAGE_STATUSES    = ["Generated", "Approved", "Testing", "Draft", "Rejected"];
const ALLOWED_QUESTION_STATUSES = ["Generated", "Approved", "Live in App", "Draft", "Needs Revision", "Rejected"];
// Note: "Draft" is included because the initial bulk push set every question
// to Draft. As you move through the approval workflow, tighten this to
// ["Approved", "Live in App"] for production.

const NOTION_API_VERSION = "2022-06-28";
const NOTION_API_BASE    = "https://api.notion.com/v1";

// Minimal .env parser (matches the existing scripts' convention)
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
const notionToken = env.NOTION_TOKEN;

if (!notionToken) {
  console.error("Missing NOTION_TOKEN in .env");
  console.error("Get one from notion.so/profile/integrations (create an Internal integration with Read access).");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Notion API
// ---------------------------------------------------------------------------

async function notionFetch(endpoint, body) {
  const res = await fetch(`${NOTION_API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization":  `Bearer ${notionToken}`,
      "Notion-Version": NOTION_API_VERSION,
      "Content-Type":   "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion API ${res.status} on ${endpoint}: ${text}`);
  }
  return res.json();
}

async function fetchAllPages(dataSourceId, label) {
  const out = [];
  let cursor = undefined;
  let pageNum = 1;
  while (true) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    process.stdout.write(`  ${label} page ${pageNum}... `);
    const resp = await notionFetch(`/databases/${dataSourceId}/query`, body);
    process.stdout.write(`${resp.results.length} rows\n`);

    out.push(...resp.results);
    if (!resp.has_more) break;
    cursor = resp.next_cursor;
    pageNum++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Property extraction
// ---------------------------------------------------------------------------

function readProp(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case "title":
      return (prop.title || []).map(t => t.plain_text).join("");
    case "rich_text":
      return (prop.rich_text || []).map(t => t.plain_text).join("");
    case "select":
      return prop.select ? prop.select.name : null;
    case "multi_select":
      return (prop.multi_select || []).map(o => o.name);
    case "number":
      return prop.number;
    case "checkbox":
      return prop.checkbox;
    case "date":
      return prop.date ? prop.date.start : null;
    case "files":
      return (prop.files || []).map(f =>
        f.type === "external" ? f.external.url :
        f.type === "file"     ? f.file.url     : null
      ).filter(Boolean);
    case "relation":
      return (prop.relation || []).map(r => r.id);
    case "created_time":
      return prop.created_time;
    case "last_edited_time":
      return prop.last_edited_time;
    default:
      return null;
  }
}

// Notion sometimes returns IDs with dashes, sometimes without. Normalize.
const stripDashes = id => (id || "").replace(/-/g, "");

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

// Notion-uploaded files come back as 1-hour presigned S3 URLs whose query
// string includes an AWS Temporary Access Key Id (`X-Amz-Credential=ASIA...`).
// Strip those at export time so they never reach committed JSON — GitHub's
// secret scanner flags the format even though the keys are short-lived.
// Image Library pages must use a stable GitHub raw URL on `Image File`.
function stripPresignedUrls(urls) {
  if (!Array.isArray(urls)) return [];
  return urls.filter(u =>
    typeof u === "string" &&
    !u.includes("prod-files-secure.s3") &&
    !/[?&]X-Amz-(Signature|Credential)=/.test(u)
  );
}

function cleanImage(page) {
  const p = page.properties;
  return {
    notionId:       page.id,
    id:             readProp(p["Image ID"]),
    archetype:      readProp(p["Archetype"]),
    cognitiveSkill: readProp(p["Cognitive Skill"]),
    ageGroups:      readProp(p["Age Group"]) || [],
    position:       readProp(p["Position"]) || [],
    povType:        readProp(p["POV Type"]),
    zone:           readProp(p["Zone"]),
    numericalState: readProp(p["Numerical State"]),
    readTrigger:    readProp(p["Read Trigger"]),
    distractors:    readProp(p["Distractors"]),
    readClarity:    readProp(p["Read Clarity Test"]),
    status:         readProp(p["Status"]),
    imageUrls:      stripPresignedUrls(readProp(p["Image File"])),
    questions:      [],
  };
}

function cleanQuestion(page) {
  const p = page.properties;

  const optA = readProp(p["Option A"]);
  const optB = readProp(p["Option B"]);
  const optC = readProp(p["Option C"]);
  const optD = readProp(p["Option D"]);
  const questionText = readProp(p["Question Text"]) || "";
  const explanation  = readProp(p["Explanation"])  || "";

  // Build options array, skipping empty ones (e.g. T/F questions only have A/B)
  const options = [];
  if (optA) options.push({ label: "A", text: optA });
  if (optB) options.push({ label: "B", text: optB });
  if (optC) options.push({ label: "C", text: optC });
  if (optD) options.push({ label: "D", text: optD });

  // Detect special formats encoded in question text (since the schema only
  // has "Multiple Choice" / "Hotspot" / "Open Response" / "Sequence Prediction")
  const rawFormat = readProp(p["Question Format"]);
  let format = rawFormat;
  if (questionText.match(/^MULTI-SELECT/))    format = "Multi-Select";
  else if (questionText.match(/True or False/i)) format = "True/False";

  // Detect coach-led / non-auto-graded marker
  const isAutoGraded = !(
    questionText.includes("NOT AUTO-GRADED") ||
    explanation.includes("NOT AUTO-GRADED")
  );

  // Age Group on questions: now multi-select. Older POV rows had one age
  // each; newer scenario rows tag multiple (U11 + U13). Keep both shapes
  // exposed for backward compatibility — `ageGroup` is the first one (used
  // by old consumers); `ageGroups` is the full array (used by sync-to-bank).
  const ageGroups = readProp(p["Age Group"]) || [];

  return {
    id:             readProp(p["Question ID"]),
    notionPageId:   page.id,
    ageGroup:       ageGroups[0] || null,
    ageGroups,
    format,
    rawFormat,
    difficulty:     readProp(p["Difficulty"]),
    questionText,
    options,
    correctAnswer:  readProp(p["Correct Answer"]),
    explanation,
    concepts:       readProp(p["Concept Tag"]) || [],
    status:         readProp(p["Status"]),
    isAutoGraded,
    linkedImageIds: readProp(p["Linked Image"]) || [],
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log("");
console.log("IceIQ Notion -> JSON export");
console.log("===========================");

console.log(`\nFetching Image Library...`);
const rawImages = await fetchAllPages(IMAGE_LIBRARY_DS_ID, "image");

console.log(`\nFetching Image Questions...`);
const rawQuestions = await fetchAllPages(IMAGE_QUESTIONS_DS_ID, "question");

console.log(`\nTransforming...`);
const images    = rawImages.map(cleanImage);
const questions = rawQuestions.map(cleanQuestion);

const includedImages    = images.filter(i    => ALLOWED_IMAGE_STATUSES.includes(i.status));
const includedQuestions = questions.filter(q => ALLOWED_QUESTION_STATUSES.includes(q.status));

console.log(`  Images:    ${includedImages.length} of ${images.length} match status filter`);
console.log(`  Questions: ${includedQuestions.length} of ${questions.length} match status filter`);

// Index images by normalized Notion ID for fast lookup
const imagesByNotionId = new Map();
for (const img of includedImages) {
  imagesByNotionId.set(stripDashes(img.notionId), img);
}

// Link questions to their parent images
let linkedCount   = 0;
let orphanedCount = 0;
const orphanedSamples = [];
for (const q of includedQuestions) {
  let linked = false;
  for (const parentId of q.linkedImageIds) {
    const parent = imagesByNotionId.get(stripDashes(parentId));
    if (parent) {
      // eslint-disable-next-line no-unused-vars
      const { linkedImageIds, status, ...clean } = q;
      parent.questions.push(clean);
      linked = true;
      break;
    }
  }
  if (linked) {
    linkedCount++;
  } else {
    orphanedCount++;
    if (orphanedSamples.length < 5) orphanedSamples.push(q.id);
  }
}

console.log(`  Linked ${linkedCount} questions to ${includedImages.filter(i => i.questions.length > 0).length} images`);
if (orphanedCount > 0) {
  console.warn(`  WARN: ${orphanedCount} questions have no matching parent image (skipped)`);
  console.warn(`        First few: ${orphanedSamples.join(", ")}`);
}

// Drop images with no questions, and strip internal fields
const finalImages = includedImages
  .filter(i => i.questions.length > 0)
  .map(img => {
    // eslint-disable-next-line no-unused-vars
    const { notionId, status, ...clean } = img;
    return clean;
  });

// Sort questions within each image by ID (stable output across runs)
for (const img of finalImages) {
  img.questions.sort((a, b) => (a.id || "").localeCompare(b.id || "", undefined, { numeric: true }));
}

// Sort images by ID too
finalImages.sort((a, b) => (a.id || "").localeCompare(b.id || "", undefined, { numeric: true }));

const output = {
  version:    "1.0",
  lastSynced: new Date().toISOString(),
  counts: {
    images:    finalImages.length,
    questions: finalImages.reduce((sum, i) => sum + i.questions.length, 0),
  },
  images: finalImages,
};

// Stats summary
console.log("\n=== Summary ===");
console.log(`  Final images:    ${output.counts.images}`);
console.log(`  Final questions: ${output.counts.questions}`);

// Per-archetype breakdown
const byArchetype = {};
for (const img of finalImages) {
  byArchetype[img.archetype] = (byArchetype[img.archetype] || 0) + img.questions.length;
}
if (Object.keys(byArchetype).length > 0) {
  console.log("\n=== Questions by archetype ===");
  for (const [archetype, count] of Object.entries(byArchetype)) {
    console.log(`  ${archetype}: ${count}`);
  }
}

// Per-age-group breakdown
const byAge = {};
for (const img of finalImages) {
  for (const q of img.questions) {
    byAge[q.ageGroup] = (byAge[q.ageGroup] || 0) + 1;
  }
}
if (Object.keys(byAge).length > 0) {
  console.log("\n=== Questions by age group ===");
  for (const age of ["U7", "U9", "U11", "U13", "U15", "U18"]) {
    if (byAge[age]) console.log(`  ${age}: ${byAge[age]}`);
  }
}

if (dryRun) {
  console.log("\n(dry-run) No files written.");
  process.exit(0);
}

// Back up existing file first (same pattern as pull-review-to-bank.mjs)
if (existsSync(OUTPUT_PATH)) {
  const backup = OUTPUT_PATH + "." + new Date().toISOString().replace(/[:.]/g, "-") + ".bak";
  copyFileSync(OUTPUT_PATH, backup);
  console.log(`\nBackup: ${backup}`);
}

writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(`Wrote ${OUTPUT_PATH}.`);
console.log(`File size: ${(JSON.stringify(output).length / 1024).toFixed(1)} KB`);
console.log("\nNext: review the file, then run `npm run build` if shipping.");
