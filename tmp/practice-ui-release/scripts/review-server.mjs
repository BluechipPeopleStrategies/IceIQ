// review-server.mjs — local review server for a question batch. Serves the
// interactive review sheet and persists decisions live, so flagging a question
// "Needs work" instantly stages it into rework.json (with your note) for the
// next Gemini->ChatGPT pass. APPROVED stays as-is; the live bank is never
// touched here (keep-until-replacement: a reworked version swaps in by id only
// once it passes the merge).
//
// Usage:  node scripts/review-server.mjs [questions.json] [port]
//   then open the printed URL (default http://localhost:5174).
//
// No dependencies (node:http). Decisions persist in docs/ai-pipeline/_review-state.json.

import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { renderHtml } from "./preview-bank.mjs";

const questionsPath = process.argv[2] || "docs/ai-pipeline/reviewed-incoming.json";
const port = Number(process.argv[3]) || 5174;
const STATE = "docs/ai-pipeline/_review-state.json";
const REWORK = "docs/ai-pipeline/rework.json";

const items = JSON.parse(readFileSync(questionsPath, "utf8"));
const byId = new Map(items.map((q) => [q.id, q]));
const readJson = (p, d) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : d);
const writeJson = (p, d) => writeFileSync(p, JSON.stringify(d, null, 2) + "\n");

function rebuildRework(state) {
  // rework.json = every currently-flagged question, full object + your note.
  const out = [];
  for (const [id, s] of Object.entries(state)) {
    if (s.verdict === "rework" && byId.has(id)) out.push({ ...byId.get(id), _reviewNote: s.note || "(flagged, no note)" });
  }
  writeJson(REWORK, out);
  return out.length;
}

function body(req) {
  return new Promise((res) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => res(b)); });
}

const server = createServer(async (req, res) => {
  const json = (o, code = 200) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
  try {
    if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(renderHtml(items, questionsPath));
    }
    if (req.method === "GET" && req.url === "/api/state") return json(readJson(STATE, {}));
    if (req.method === "POST" && req.url === "/api/decision") {
      const { id, verdict, note } = JSON.parse((await body(req)) || "{}");
      if (!byId.has(id)) return json({ ok: false, error: "unknown id" }, 400);
      const state = readJson(STATE, {});
      if (!verdict && !note) delete state[id];
      else state[id] = { verdict: verdict || null, note: note || "" };
      writeJson(STATE, state);
      const reworkCount = rebuildRework(state);
      const staged = verdict === "rework";
      if (staged) console.log(`  staged for rework: ${id}${note ? ` — ${note}` : ""}  (rework.json now ${reworkCount})`);
      return json({ ok: true, staged, reworkCount });
    }
    json({ ok: false, error: "not found" }, 404);
  } catch (e) { json({ ok: false, error: String(e) }, 500); }
});

server.listen(port, () => {
  console.log(`RinkReads review server`);
  console.log(`  batch:  ${questionsPath} (${items.length} questions)`);
  console.log(`  open:   http://localhost:${port}`);
  console.log(`  rework lands in: ${REWORK} (live, as you click)`);
  console.log(`  Ctrl+C to stop. The live bank is never modified here.`);
});
