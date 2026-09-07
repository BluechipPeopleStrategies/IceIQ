// Pull playtest_feedback from Supabase -> a markdown worklist + saved screenshots.
// Run: npm run pull-feedback   (needs VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env)
// Mirrors scripts/pull-reviews.mjs (service-role read bypasses RLS).
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (m) env[m[1]] = m[2];
    }
  } catch { /* no .env */ }
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

const LIMIT = Number(process.argv[2]) || 50;
const { data, error } = await sb
  .from("playtest_feedback")
  .select("id,screen,drill,category,note,context,screenshot,app_version,created_at")
  .order("created_at", { ascending: false })
  .limit(LIMIT);
if (error) { console.error(error.message); process.exit(1); }

const shotsDir = join(ROOT, "docs/feedback-shots");
const lines = ["# Playtest feedback worklist", "", `Pulled ${data.length} most recent (limit ${LIMIT}).`, ""];
let saved = 0;
for (const r of data) {
  let shotLine = "";
  if (typeof r.screenshot === "string" && r.screenshot.startsWith("data:image")) {
    try {
      mkdirSync(shotsDir, { recursive: true });
      const b64 = r.screenshot.split(",")[1] || "";
      const ext = (r.screenshot.slice(5, r.screenshot.indexOf(";")).split("/")[1]) || "jpg";
      writeFileSync(join(shotsDir, `${r.id}.${ext}`), Buffer.from(b64, "base64"));
      shotLine = `shot: docs/feedback-shots/${r.id}.${ext}`;
      saved += 1;
    } catch { /* skip a bad image */ }
  }
  lines.push(`## ${r.created_at} — [${r.category || "?"}] ${r.screen || ""}${r.drill ? " / " + r.drill : ""}`);
  lines.push("");
  lines.push(r.note || "(no note)");
  if (r.context) lines.push("", "context: `" + JSON.stringify(r.context) + "`");
  if (shotLine) lines.push("", shotLine);
  lines.push("");
}
const out = join(ROOT, "docs/playtest-feedback-worklist.md");
writeFileSync(out, lines.join("\n"));
console.log(`Wrote ${out} (${data.length} entries, ${saved} screenshots saved to docs/feedback-shots/).`);
