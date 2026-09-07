// Pull scenario_reviews from Supabase → a repo fix-list + markdown worklist.
// Run: npm run pull-reviews   (needs VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env)
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { boardHash, groupReviews } from "../src/review/reviewCore.js";

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
const url = env.VITE_SUPABASE_URL, serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) { console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"); process.exit(1); }
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

// Current board hash for every scenario (seeds + any type:"scenario" in bank.json).
function currentHashes() {
  const byId = {};
  const seedDir = join(ROOT, "src/scenario/seeds");
  for (const f of readdirSync(seedDir).filter(f => f.endsWith(".json"))) {
    try { const s = JSON.parse(readFileSync(join(seedDir, f), "utf8")); if (s?.id) byId[s.id] = boardHash(s); } catch { /* skip */ }
  }
  try {
    const bank = JSON.parse(readFileSync(join(ROOT, "src/data/bank.json"), "utf8"));
    for (const level of Object.keys(bank)) for (const q of bank[level] || []) {
      if (q?.id && q.type === "scenario") byId[q.id] = boardHash(q);
    }
  } catch { /* skip */ }
  return byId;
}

const { data, error } = await sb.from("scenario_reviews").select("scenario_id,verdict,note,board_hash,updated_at");
if (error) { console.error(error.message); process.exit(1); }

const grouped = groupReviews(data || [], currentHashes());
writeFileSync(join(ROOT, "docs/ai-pipeline/_review-feedback.json"), JSON.stringify(grouped, null, 2));

const lines = ["# Review worklist", "", `_Pulled ${(data || []).length} reviews._`, ""];
for (const [head, items] of [["Retire", grouped.retire], ["Revise", grouped.revise], ["Keep", grouped.keep]]) {
  lines.push(`## ${head} (${items.length})`, "");
  for (const it of items) lines.push(`- [ ] \`${it.id}\`${it.stale ? " ⚠️ board changed since review" : ""}${it.note ? ` — ${it.note}` : ""}`);
  lines.push("");
}
writeFileSync(join(ROOT, "docs/ai-pipeline/_review-worklist.md"), lines.join("\n"));

console.log(`pulled ${(data || []).length} reviews → keep ${grouped.keep.length}, revise ${grouped.revise.length}, retire ${grouped.retire.length}`);
console.log("wrote docs/ai-pipeline/_review-feedback.json and _review-worklist.md");
