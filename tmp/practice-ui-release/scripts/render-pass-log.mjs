// Render feedback_log → docs/factory/feedback-pass-log.md (grouped by question type),
// and fold new owner feedback into tools/gauntlet/visual-lessons.json so the coaches
// + generator learn. Run: npm run render-pass-log
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { groupByNode } from "../tools/lib/coach-core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
function loadEnv() {
  const env = {};
  try { for (const line of readFileSync(join(ROOT, ".env"), "utf8").split(/\r?\n/)) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i); if (m) env[m[1]] = m[2]; } } catch {}
  return env;
}
const env = { ...loadEnv(), ...process.env };
const url = env.VITE_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: rows, error } = await sb.from("feedback_log").select("scenario_id,node,iteration,source,feedback,change,created_at").order("created_at", { ascending: true });
if (error) { console.error(error.message); process.exit(1); }

// markdown grouped by node
const grouped = groupByNode(rows || []);
const lines = ["# Feedback pass log", "", `_Rendered from feedback_log (${(rows || []).length} entries)._`, ""];
for (const node of Object.keys(grouped).sort()) {
  lines.push(`## ${node}`, "");
  for (const r of grouped[node]) lines.push(`- ${(r.created_at || "").slice(0, 10)} · \`${r.scenario_id}\` (iter ${r.iteration}, ${r.source}) — ${r.feedback || ""}${r.change ? ` → ${r.change}` : ""}`);
  lines.push("");
}
const outDir = join(ROOT, "docs/factory");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "feedback-pass-log.md"), lines.join("\n"));

// fold owner feedback into visual-lessons.json (existing {lessons:[{text,count}]} shape)
const lessonsPath = join(ROOT, "tools/gauntlet/visual-lessons.json");
let lessons = { lessons: [] };
try { lessons = JSON.parse(readFileSync(lessonsPath, "utf8")); } catch {}
const seen = new Set(lessons.lessons.map(l => l.text));
let added = 0;
for (const r of (rows || []).filter(r => r.source === "owner" && r.feedback)) {
  const text = `[${r.node || "general"}] ${r.feedback}`;
  if (!seen.has(text)) { lessons.lessons.push({ text, count: 1 }); seen.add(text); added++; }
}
writeFileSync(lessonsPath, JSON.stringify(lessons, null, 2));
console.log(`wrote docs/factory/feedback-pass-log.md (${(rows || []).length} entries); folded ${added} new lesson(s) into visual-lessons.json`);
