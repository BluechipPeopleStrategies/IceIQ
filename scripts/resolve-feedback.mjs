// Resolve implemented feedback: append it to feedback_log (permanent), then wipe the
// board's open scenario_reviews + coach_reviews rows. Reads a {id: change|{change,node}} map.
// Run: npm run resolve-feedback -- --from docs/ai-pipeline/_resolutions.json
//   or: npm run resolve-feedback -- --id u13_x --change "added a second read"
import { readFileSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { buildLogRows } from "../tools/lib/coach-core.mjs";

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

function parseArgs(argv) {
  const a = { from: null, id: null, change: "" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--from") a.from = argv[++i];
    else if (argv[i] === "--id") a.id = argv[++i];
    else if (argv[i] === "--change") a.change = argv[++i];
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
const resolutions = args.from
  ? JSON.parse(readFileSync(resolvePath(ROOT, args.from), "utf8"))
  : (args.id ? { [args.id]: args.change } : {});
const ids = Object.keys(resolutions);
if (!ids.length) { console.error("Nothing to resolve. Pass --from <json> or --id <id> --change <text>."); process.exit(1); }

const env = { ...loadEnv(), ...process.env };
const url = env.VITE_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

for (const scenario_id of ids) {
  const entry = resolutions[scenario_id];
  const change = typeof entry === "string" ? entry : (entry?.change || "");
  const explicitNode = typeof entry === "object" && entry ? entry.node : null;
  const { data: srRows } = await sb.from("scenario_reviews").select("verdict,note").eq("scenario_id", scenario_id);
  const { data: crRows } = await sb.from("coach_reviews").select("verdict,notes").eq("scenario_id", scenario_id);
  const ownerReview = srRows && srRows[0] ? { verdict: srRows[0].verdict, note: srRows[0].note } : null;
  const coachReview = crRows && crRows[0] ? { notes: crRows[0].notes } : null;
  const { data: priorRows } = await sb.from("feedback_log").select("iteration,node").eq("scenario_id", scenario_id);
  const priorMaxIteration = (priorRows || []).reduce((m, r) => Math.max(m, r.iteration || 0), 0);
  const node = explicitNode || (priorRows || []).find(r => r.node)?.node || null;
  const logRows = buildLogRows({ scenario_id, node, change, priorMaxIteration, ownerReview, coachReview });
  if (logRows.length) {
    const { error: insErr } = await sb.from("feedback_log").insert(logRows);
    if (insErr) { console.error(`feedback_log insert failed for ${scenario_id}: ${insErr.message}`); continue; }
  }
  await sb.from("scenario_reviews").delete().eq("scenario_id", scenario_id);
  await sb.from("coach_reviews").delete().eq("scenario_id", scenario_id);
  console.log(`resolved ${scenario_id} → logged ${logRows.length} row(s), wiped open feedback`);
}
console.log(`done: ${ids.length} board(s)`);
