// Pull open question_requests from Supabase → a worklist I generate from.
// Run: npm run pull-requests   (needs VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env)
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

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
const url = env.VITE_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await sb.from("question_requests")
  .select("id,scenario_id,stem_id,preset,note,status,created_at")
  .eq("status", "open").order("created_at", { ascending: true });
if (error) { console.error(error.message); process.exit(1); }

const rows = data || [];
const PRESET = { one_each: "one of each type", couple: "a couple", surprise: "surprise — boost the pool" };
const lines = ["# Question requests (open)", "", `_Pulled ${rows.length} open request(s)._`, ""];
for (const r of rows) {
  lines.push(`- [ ] **${r.stem_id || r.scenario_id}** — ${PRESET[r.preset] || r.preset}${r.note ? ` — ${r.note}` : ""}  \`(from ${r.scenario_id})\``);
}
writeFileSync(join(ROOT, "docs/ai-pipeline/_question-requests.md"), lines.join("\n"));
console.log(`pulled ${rows.length} open request(s) → docs/ai-pipeline/_question-requests.md`);
