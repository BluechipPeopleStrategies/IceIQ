// contact-sheet.mjs — review layer (stage 3) of the scenario factory.
// Renders every pending seed onto one HTML contact sheet: board diagram with
// the correct read revealed, stem, lint warnings, and an approve checkbox.
// "Download approved.json" collects checked ids client-side (Blob download).
//
// Usage: node scripts/contact-sheet.mjs [--dir docs/ai-pipeline/_pending-seeds]

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { renderBoard } from "./board-svg.mjs";
import { resolveTarget } from "../src/scenario/zones.js";
import { lintScenario } from "../tools/scenario-author/validate.mjs";
import { rankByZone, correctSet } from "../src/scenario/value.js";

const args = process.argv.slice(2);
const dirIx = args.indexOf("--dir");
const DIR = dirIx >= 0 ? args[dirIx + 1] : "docs/ai-pipeline/_pending-seeds";
const OUT = "docs/ai-pipeline/_contact-sheet.html";

if (!existsSync(DIR)) {
  console.error(`No pending-seeds folder at ${DIR} — nothing to review.`);
  process.exit(1);
}
const files = readdirSync(DIR).filter(f => f.endsWith(".json"));
if (files.length === 0) {
  console.error(`No *.json seeds in ${DIR} — nothing to review.`);
  process.exit(1);
}

const KIND = { player: "home", teammate: "home", defender: "opp", goalie: "goalie", puck: "puck" };

function specFor(seed) {
  const actors = (seed.actors || []).map(a =>
    ({ kind: KIND[a.kind] || "home", x: a.x, y: a.y, ...(a.tag ? { tag: a.tag } : {}) }));
  const arrows = [], rings = [];
  const k = seed.interaction?.kind;
  let read = "";
  const find = id => (seed.actors || []).find(a => a.id === id);
  if (k === "point") {
    const t = resolveTarget(seed.correct);
    rings.push({ x: t.x, y: t.y });
    read = `point → ring at (${t.x.toFixed(2)}, ${t.y.toFixed(2)})`;
  } else if (k === "path") {
    const from = find(seed.interaction.from);
    const t = resolveTarget(seed.correct.end);
    if (from) arrows.push({ x1: from.x, y1: from.y, x2: t.x, y2: t.y });
    read = `path (${seed.interaction.verb || "move"}) from "${seed.interaction.from}" → (${t.x.toFixed(2)}, ${t.y.toFixed(2)})`;
  } else if (k === "selection" || k === "sequence") {
    for (const id of seed.correct?.ids || []) {
      const a = find(id);
      if (a) rings.push({ x: a.x, y: a.y });
    }
    read = `${k} → ${ (seed.correct?.ids || []).join(", ") }`;
  } else if (k === "place") {
    for (const p of seed.correct?.placements || []) {
      const t = resolveTarget(p.target);
      rings.push({ x: t.x, y: t.y });
    }
    read = `place → ${ (seed.correct?.placements || []).length } target(s)`;
  }
  const zone = seed.stage?.zone;
  const nets = zone === "off-zone" ? ["right"] : zone === "def-zone" ? ["left"] : [];
  return { spec: { actors, arrows, rings, nets }, read };
}

const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cards = [];
let rendered = 0;

for (const f of files.sort()) {
  let seed;
  try { seed = JSON.parse(readFileSync(join(DIR, f), "utf8")); }
  catch (e) { cards.push(`<div class="card bad"><b>${esc(f)}</b><br>parse error: ${esc(e.message)}</div>`); continue; }
  let svg = "", read = "", err = "";
  try { const r = specFor(seed); svg = renderBoard(r.spec); read = r.read; rendered++; }
  catch (e) { err = e.message; }
  let lint = { ok: true, errs: [], warns: [] };
  try { lint = lintScenario(seed); } catch (e) { lint = { ok: false, errs: [e.message], warns: [] }; }
  const notes = [...(lint.errs || []), ...(lint.warns || [])];
  // Value-proven answer set (selection reads): how many answers are genuinely
  // correct, and the ranking — the basis a coach signs off on.
  let proven = "";
  if (seed.interaction?.kind === "selection") {
    try {
      const ranked = rankByZone(seed);
      const cs = correctSet(ranked);
      const rankStr = ranked.map(r => `${r.id} ${r.value}`).join(" · ");
      proven = `<div class="proven">✓ value-proven: <b>${cs.length} correct answer${cs.length === 1 ? "" : "s"}</b> [${esc(cs.join(", "))}]<br><span class="rank">${esc(rankStr)}</span></div>`;
    } catch { /* non-selection or missing data */ }
  }
  cards.push(`<div class="card">
    <div class="board">${svg || `<p class="bad">render failed: ${esc(err)}</p>`}</div>
    <div class="meta"><b>${esc(seed.id)}</b> · ${esc(seed.nodeId || "?")} · ${esc(seed.level || (seed.levels || []).join(", "))}</div>
    <div class="stem">${esc(seed.mc?.stem || seed.interaction?.prompt || "(no stem)")}</div>
    <div class="read">${esc(read)}</div>
    ${proven}
    ${notes.length ? `<div class="warn">${notes.map(esc).join("<br>")}</div>` : ""}
    <label class="approve"><input type="checkbox" class="ok" data-id="${esc(seed.id)}"> sign off</label>
  </div>`);
}

const html = `<!doctype html><html><head><meta charset="utf-8"><title>RinkReads — seed contact sheet</title>
<style>
body{font-family:Inter,Arial,sans-serif;margin:0;background:#0e1620;color:#e8eef4}
.bar{position:sticky;top:0;background:#16243a;padding:10px 16px;display:flex;gap:12px;align-items:center;z-index:5;border-bottom:2px solid #C9A24B}
.bar button{padding:6px 14px;border-radius:6px;border:0;background:#C9A24B;color:#1a1100;font-weight:700;cursor:pointer}
.bar .hint{font-size:12px;opacity:.8}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:16px;padding:16px}
.card{background:#16243a;border-radius:10px;padding:12px}
.card svg{width:100%;height:auto;border-radius:6px;background:#f6fbff}
.meta{margin-top:8px;font-size:13px}
.stem{margin-top:4px;font-size:14px}
.read{margin-top:4px;font-size:12px;color:#8fd8ff}
.proven{margin-top:6px;font-size:12px;color:#9ff0b8;background:#10301c;padding:6px;border-radius:6px}
.proven .rank{color:#7fcf9a;font-size:11px}
.warn{margin-top:6px;font-size:12px;color:#ffd34d;background:#3a2f10;padding:6px;border-radius:6px}
.bad{color:#ff8a8a}
.approve{display:block;margin-top:8px;font-weight:700}
.approve input{transform:scale(1.4);margin-right:8px}
.bar input{padding:6px 10px;border-radius:6px;border:0;font-size:13px}
</style></head><body>
<div class="bar">
  <label>Coach: <input id="coach" placeholder="your name"></label>
  <button id="all">Sign off all</button><button id="none">Clear all</button>
  <button id="dl">Download approved.json</button>
  <span class="hint">Each card shows the <b>value-proven</b> correct-answer count. Enter your name, sign off the good ones, Download approved.json into docs/ai-pipeline/, then run: <code>node scripts/batch-approve.mjs</code></span>
</div>
<div class="grid">${cards.join("\n")}</div>
<script>
const boxes=()=>[...document.querySelectorAll("input.ok")];
document.getElementById("all").onclick=()=>boxes().forEach(b=>b.checked=true);
document.getElementById("none").onclick=()=>boxes().forEach(b=>b.checked=false);
document.getElementById("dl").onclick=()=>{
  const ids=boxes().filter(b=>b.checked).map(b=>b.dataset.id);
  const coach=(document.getElementById("coach").value||"").trim();
  if(!coach && !confirm("No coach name entered — sign off anyway?")) return;
  const payload={coach:coach||"(unsigned)",signedAt:new Date().toISOString(),approved:ids};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="approved.json";a.click();
};
</script></body></html>`;

writeFileSync(OUT, html, "utf8");
console.log(`Rendered ${rendered}/${files.length} seeds → ${OUT}`);
