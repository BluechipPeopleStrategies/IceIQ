#!/usr/bin/env node
// Usage: node render-worker.mjs <artifact.json> <output.mp4> [--watermark]
// Consumes a CompiledTeachingPlay or DraftTeachingPlay JSON file (design §6:
// diagnostic exports pass a DraftTeachingPlay with --watermark; clean exports
// pass a finalized draft row's cached CompiledTeachingPlay without it).
//
// Renders locally, then (only if SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are
// both set) uploads the MP4 to the private `coach-play-exports` Storage
// bucket and prints a signed URL to stdout for the caller (Task 9's export
// button) to store on the draft row. Without those env vars the worker
// still succeeds -- it just leaves the render as a local file, per design §5.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { createClient } from "@supabase/supabase-js";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days, per design §5 retention
const STORAGE_BUCKET = "coach-play-exports";

async function main() {
  const [, , artifactPath, outputPath, flag] = process.argv;
  if (!artifactPath || !outputPath) {
    console.error("Usage: node render-worker.mjs <artifact.json> <output.mp4> [--watermark]");
    process.exit(1);
  }
  const watermark = flag === "--watermark";
  const compiledPlay = JSON.parse(readFileSync(artifactPath, "utf8"));

  // fileURLToPath (not `.pathname`) so this resolves correctly on Windows too
  // -- a raw URL pathname is POSIX-shaped (`/C:/Users/...`), which Node's
  // Windows path resolver then mis-joins with the cwd drive into
  // `C:\C:\Users\...` (verified against the installed @remotion/bundler by
  // running this worker end to end during Task 8's dry-run).
  const entryPoint = fileURLToPath(new URL("./src/index.jsx", import.meta.url));
  const bundleLocation = await bundle({ entryPoint });
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "CoachPlay",
    inputProps: { compiledPlay, watermark },
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: { compiledPlay, watermark },
  });

  console.log(`Rendered ${outputPath}`);

  await uploadAndSign(outputPath);
}

// Uploads outputPath to the private coach-play-exports bucket and prints a
// signed URL. Skips gracefully (no throw, no upload attempt) when Supabase
// credentials aren't configured -- a local-only render is a valid outcome,
// not an error, for e.g. local development or CI without live credentials.
async function uploadAndSign(outputPath) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set -- skipping upload, local MP4 only.");
    return;
  }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const fileBuffer = readFileSync(outputPath);
  const storagePath = `${Date.now()}-${outputPath.split(/[/\\]/).pop()}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, { contentType: "video/mp4" });
  if (uploadError) throw uploadError;

  const { data: signed, error: signError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (signError) throw signError;

  console.log(`Signed URL: ${signed.signedUrl}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
