// Upload an image to the `question-media` Supabase Storage bucket and print
// its public URL. Used to attach AI-generated game-film stills (or any
// image) to questions in the bank.
//
// Usage:
//   node tools/upload-question-image.mjs <localPath> --id=<questionId>
//   node tools/upload-question-image.mjs <localPath> --id=<questionId> --slot=scene
//   node tools/upload-question-image.mjs <localPath> --id=<questionId> --slot=option-a
//
// The tool:
//   1. Creates the `question-media` bucket if it doesn't exist (public read).
//   2. Uploads to question-media/{questionId}/{slot}.{ext}
//      (slot defaults to "scene")
//   3. Prints the public URL — paste it into questions.json under
//      `media: { url, ... }` (question-level) or any option's `image` field.
//
// Pre-resize/compress your images BEFORE running this. AI-generated images
// at 1024px wide × 80% JPEG quality is a good target (~150KB).
//
// Requires in .env:
//   VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { readFileSync, statSync } from "node:fs";
import { basename, extname, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BUCKET = "question-media";

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

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {};
  const positional = [];
  for (const a of args) {
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      flags[k] = v ?? true;
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

const MIME = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".webp": "image/webp",
  ".gif": "image/gif", ".avif": "image/avif",
};

async function ensureBucket(supabase) {
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) throw new Error(`listBuckets: ${listErr.message}`);
  if (buckets.some(b => b.name === BUCKET)) return;
  console.log(`Creating bucket "${BUCKET}" (public)...`);
  const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: "5MB",
  });
  if (createErr) throw new Error(`createBucket: ${createErr.message}`);
  console.log(`✓ Bucket created.`);
}

async function main() {
  const { flags, positional } = parseArgs();
  const localPath = positional[0];
  const questionId = flags.id;
  const slot = flags.slot || "scene";

  if (!localPath || !questionId) {
    console.error("Usage: node tools/upload-question-image.mjs <localPath> --id=<questionId> [--slot=scene]");
    process.exit(1);
  }

  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const stat = statSync(localPath);
  if (!stat.isFile()) { console.error(`Not a file: ${localPath}`); process.exit(1); }

  const ext = extname(localPath).toLowerCase();
  const contentType = MIME[ext];
  if (!contentType) {
    console.error(`Unsupported file type: ${ext}. Supported: ${Object.keys(MIME).join(", ")}`);
    process.exit(1);
  }

  const buf = readFileSync(localPath);
  const sizeKB = Math.round(buf.length / 1024);
  if (sizeKB > 1500) {
    console.warn(`⚠  ${sizeKB}KB is large — consider resizing to ~1024px wide @ 80% quality.`);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  await ensureBucket(supabase);

  const remotePath = `${questionId}/${slot}${ext}`;
  console.log(`Uploading ${basename(localPath)} (${sizeKB}KB) → ${BUCKET}/${remotePath}`);

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(remotePath, buf, { contentType, upsert: true, cacheControl: "31536000" });
  if (upErr) throw new Error(`upload: ${upErr.message}`);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(remotePath);
  console.log(`\n✓ Uploaded.`);
  console.log(`Public URL:\n  ${pub.publicUrl}\n`);
  console.log(`Paste into questions.json:`);
  if (slot === "scene") {
    console.log(`  "media": { "type": "image", "url": "${pub.publicUrl}", "alt": "..." }`);
  } else {
    console.log(`  "image": "${pub.publicUrl}"`);
  }
}

main().catch(err => { console.error(err.message || err); process.exit(1); });
