// Move POV image bytes from Notion's expiring S3 URLs to Supabase Storage,
// where they get a permanent public URL.
//
// What it does, end to end:
//   1. Reads pov_images rows from Supabase
//   2. For each row whose image_url is empty or a Notion S3 URL:
//        - Downloads the image bytes from the current URL (server-side, no CORS)
//        - Uploads to the `pov-images` Storage bucket at `pov-images/{id}.{ext}`
//        - Writes the permanent Storage URL back to pov_images.image_url
//        - Mirrors the change into src/data/povQuestions.json so the next
//          `npm run seed:pov` picks up the permanent URL in the bundled bank
//   3. Skips rows whose image_url already points at the Supabase project
//      (those have already been migrated)
//
// Usage:
//   node scripts/upload-pov-images-to-storage.mjs               # do it
//   node scripts/upload-pov-images-to-storage.mjs --dry-run     # preview
//
// Requires in .env:
//   VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// First-run side effect: ensures the `pov-images` bucket exists and is public.
// Idempotent — re-runs are safe; rows with permanent URLs are no-ops.

import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const POVQ_PATH = join(ROOT, "src/data/povQuestions.json");
const BUCKET = "pov-images";

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

// ─────────────────────────────────────────────
// Bucket setup
// ─────────────────────────────────────────────
async function ensureBucket() {
  const { data: list, error: listErr } = await sb.storage.listBuckets();
  if (listErr) { console.error("listBuckets:", listErr.message); process.exit(1); }
  if (list?.some(b => b.name === BUCKET)) return;
  if (dryRun) { console.log(`(dry-run) Would create public bucket: ${BUCKET}`); return; }
  const { error } = await sb.storage.createBucket(BUCKET, { public: true });
  if (error && !/already exists/i.test(error.message)) {
    console.error("createBucket:", error.message); process.exit(1);
  }
  console.log(`Created public bucket: ${BUCKET}`);
}

// ─────────────────────────────────────────────
// URL classification
// ─────────────────────────────────────────────
function isNotionS3(u) {
  return typeof u === "string" && /prod-files-secure\.s3[.-]/.test(u);
}
function isSupabaseStorage(u) {
  // url ends with .supabase.co; storage path includes /storage/v1/object/public/
  return typeof u === "string" && u.includes("/storage/v1/object/public/");
}
function extFor(url, contentType) {
  // Prefer content-type when present; fall back to URL path extension.
  if (contentType) {
    if (/png/i.test(contentType))  return "png";
    if (/jpe?g/i.test(contentType)) return "jpg";
    if (/webp/i.test(contentType)) return "webp";
    if (/gif/i.test(contentType))  return "gif";
  }
  const m = url.match(/\.(png|jpe?g|webp|gif)(?:\?|$)/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "png";
}

// ─────────────────────────────────────────────
// Per-image migration
// ─────────────────────────────────────────────
async function migrateOne(row) {
  const id = row.id;
  const src = row.image_url;
  if (!src)              return { id, skipped: "no image_url" };
  // Already on Storage → expose the URL so we can mirror it into the JSON.
  // Even if upload was done in a prior run, the export script may have
  // refreshed povQuestions.json with the now-stale Notion URL — keeping
  // these in idToUrl ensures the JSON realigns to the permanent URL.
  if (isSupabaseStorage(src)) return { id, skipped: "already on Storage", existingUrl: src };
  if (!isNotionS3(src))  return { id, skipped: `unrecognised URL host` };

  // Download bytes
  let bytes, contentType;
  try {
    const res = await fetch(src);
    if (!res.ok) return { id, error: `download ${res.status}` };
    contentType = res.headers.get("content-type");
    bytes = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    return { id, error: `download exception: ${e.message}` };
  }

  const ext = extFor(src, contentType);
  const path = `${id}.${ext}`;

  if (dryRun) return { id, wouldUpload: `${(bytes.length / 1024).toFixed(1)} KB → ${BUCKET}/${path}` };

  // Upload — upsert in case a previous run wrote a partial file.
  const { error: upErr } = await sb.storage.from(BUCKET).upload(path, bytes, {
    contentType: contentType || "image/png",
    upsert: true,
  });
  if (upErr) return { id, error: `upload: ${upErr.message}` };

  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
  const permanentUrl = pub?.publicUrl;
  if (!permanentUrl) return { id, error: "getPublicUrl returned empty" };

  // Write the permanent URL back to pov_images.image_url
  const { error: updErr } = await sb
    .from("pov_images")
    .update({ image_url: permanentUrl })
    .eq("id", id);
  if (updErr) return { id, error: `update pov_images: ${updErr.message}` };

  return { id, uploaded: permanentUrl, sizeKB: (bytes.length / 1024).toFixed(1) };
}

// ─────────────────────────────────────────────
// Mirror permanent URLs back into the JSON export
// ─────────────────────────────────────────────
function mirrorIntoJson(idToUrl) {
  if (!existsSync(POVQ_PATH)) return false;
  const json = JSON.parse(readFileSync(POVQ_PATH, "utf8"));
  let touched = 0;
  for (const img of json.images || []) {
    const newUrl = idToUrl.get(img.id);
    if (!newUrl) continue;
    img.imageUrls = [newUrl];
    touched++;
  }
  if (!touched) return false;
  if (dryRun) { console.log(`(dry-run) Would update imageUrls for ${touched} images in povQuestions.json`); return true; }
  writeFileSync(POVQ_PATH, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(`Updated imageUrls for ${touched} images in povQuestions.json`);
  return true;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
console.log("");
console.log("POV images → Supabase Storage");
console.log("==============================");

await ensureBucket();

// Read the freshly-synced JSON so we can prefer non-stale URLs over whatever
// is in pov_images (which may have an expired Notion S3 URL from a prior run).
const freshUrls = new Map();
try {
  if (existsSync(POVQ_PATH)) {
    const json = JSON.parse(readFileSync(POVQ_PATH, "utf8"));
    for (const img of json.images || []) {
      const u = Array.isArray(img.imageUrls) ? img.imageUrls[0] : null;
      if (u) freshUrls.set(img.id, u);
    }
  }
} catch (e) { console.warn("Couldn't read povQuestions.json:", e.message); }

const { data: rows, error } = await sb
  .from("pov_images")
  .select("id, image_url")
  .order("id");

if (error) { console.error("listing pov_images:", error.message); process.exit(1); }
console.log(`Found ${rows.length} pov_images rows.`);

let uploaded = 0, skipped = 0, errors = 0;
const idToUrl = new Map();
for (const row of rows) {
  // If the DB has a stale Notion URL but JSON has a fresh one, use the fresh
  // one for the download attempt — both point at the same Notion file, but
  // the fresh one has a non-expired presigned token.
  const fresh = freshUrls.get(row.id);
  const effectiveRow = (isNotionS3(row.image_url) && fresh && fresh !== row.image_url)
    ? { ...row, image_url: fresh }
    : row;
  const result = await migrateOne(effectiveRow);
  if (result.uploaded) {
    uploaded++;
    idToUrl.set(result.id, result.uploaded);
    console.log(`  ✓ ${result.id} (${result.sizeKB} KB)`);
  } else if (result.wouldUpload) {
    uploaded++;
    console.log(`  · ${result.id} ${result.wouldUpload}`);
  } else if (result.skipped) {
    skipped++;
    // Quiet about already-on-Storage skips — the common case after first run.
    if (result.skipped !== "already on Storage") {
      console.log(`  - ${result.id} (${result.skipped})`);
    } else if (result.existingUrl) {
      // Add to the mirror map so the JSON re-aligns to the permanent URL
      // after a fresh Notion export overwrote it with an expiring S3 URL.
      idToUrl.set(result.id, result.existingUrl);
    }
  } else if (result.error) {
    errors++;
    console.error(`  ✗ ${result.id} (${result.error})`);
  }
}

if (idToUrl.size) mirrorIntoJson(idToUrl);

console.log(`\nDone. Uploaded: ${uploaded}. Skipped: ${skipped}. Errors: ${errors}.`);
if (dryRun) console.log("(dry-run — no Storage writes, no DB updates, no JSON changes)");
