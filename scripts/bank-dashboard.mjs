// bank-dashboard.mjs — generate a filterable dashboard over the WHOLE composed
// bank: the text questions (src/data/bank.json) + the drawn-rink scenarios
// (src/scenario/seeds/*.json), exactly what qbLoader merges at runtime. Filter
// by age x type x concept x visual(picture/text). Text renders as the in-app
// card; rink scenarios render via the real app through an iframe to /#q=<id>,
// so the dashboard must be opened UNDER `npm run dev`:
//
//   1) npm run dev          (Vite serves /public at http://localhost:5173)
//   2) node scripts/bank-dashboard.mjs   (writes public/bank-dashboard.html)
//   3) open  http://localhost:5173/bank-dashboard.html
//
// Text cards work even via file://; rink renders need the dev server.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { esc, bodyFor, TYPE } from "./preview-bank.mjs";

const LEVELS = ["U7 / Initiation", "U9 / Novice", "U11 / Atom", "U13 / Peewee", "U15 / Bantam", "U18 / Midget"];

// ── load both sources, the way qbLoader does
const bank = JSON.parse(readFileSync("src/data/bank.json", "utf8"));
const all = [];
for (const level in bank) for (const q of bank[level]) all.push({ ...q, _level: level });
const seedDir = "src/scenario/seeds/";
for (const f of readdirSync(seedDir).filter((f) => f.endsWith(".json"))) {
  const s = JSON.parse(readFileSync(seedDir + f, "utf8"));
  if (s && s.type === "scenario") all.push(s);
}

const levelOf = (q) => (q.levels && q.levels[0]) || q.level || q._level || "(no age)";
const conceptOf = (q) => { const n = q.nodeId || ""; return n.includes(".") ? n.split(".")[1] : "(no concept)"; };
const hasPhoto = (q) => !!(q.image || q.img || q.media);
const isScenario = (q) => q.type === "scenario";
const isVisual = (q) => isScenario(q) || hasPhoto(q);
const SCbadge = { label: "Rink Scenario", color: "#22c55e", icon: "🏒" };

// ── facets
const ages = LEVELS.filter((L) => all.some((q) => levelOf(q) === L));
const types = [...new Set(all.map((q) => q.type || "mc"))].sort();
const concepts = [...new Set(all.map(conceptOf))].sort();

function card(q) {
  const lvl = levelOf(q), type = q.type || "mc", concept = conceptOf(q), vis = isVisual(q);
  const ti = isScenario(q) ? SCbadge : (TYPE[type] || TYPE.mc);
  const kind = isScenario(q) && q.interaction ? " · " + q.interaction.kind + (q.interaction.verb ? "/" + q.interaction.verb : "") : "";
  const dpill = `<span class="d">d${esc(q.difficulty ?? q.d ?? "")}</span>`;
  const head = `<div class="top">
      <span class="badge" style="color:${ti.color};background:${ti.color}1f;border-color:${ti.color}55">${ti.icon} ${esc(ti.label)}${kind}</span>
      <span class="chip">${esc(lvl)}</span>${vis ? `<span class="vtag">🖼 visual</span>` : ""}${dpill}</div>
    <div class="sub">${esc(q.nodeId || "(no nodeId)")} · ${esc(q.cat || "")} · <span class="id">${esc(q.id)}</span></div>`;
  let body;
  if (isScenario(q)) {
    body = `<div class="frame" data-q="${esc(q.id)}"><div class="ph">▶ rink render — open this page at <code>localhost:5173</code> under <code>npm run dev</code></div></div>
      <div class="stem sc">${esc((q.interaction && q.interaction.prompt) || "")}</div>`;
  } else {
    body = bodyFor(q);
  }
  return `<div class="card${vis ? " vis" : ""}" data-age="${esc(lvl)}" data-type="${esc(type)}" data-concept="${esc(concept)}" data-visual="${vis ? 1 : 0}">${head}${body}</div>`;
}

const sel = (id, label, opts) => `<label class="f"><span>${label}</span><select id="${id}"><option value="">All</option>${opts.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}</select></label>`;

const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>RinkReads — Bank Dashboard (${all.length})</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#041E42;--card:#0a2850;--orange:#FC4C02;--green:#22c55e;--amber:#eab308;--white:#f8fafc;--dim:rgba(248,250,252,.6);--dimmer:rgba(248,250,252,.35);--border:rgba(255,255,255,.08);--greenDim:rgba(34,197,94,.1);--greenBorder:rgba(34,197,94,.45)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--white);font-family:'DM Sans',system-ui,sans-serif;padding:0 14px 80px}
.bar{position:sticky;top:0;z-index:9;background:rgba(4,30,66,.96);backdrop-filter:blur(8px);border-bottom:1px solid var(--border);margin:0 -14px 18px;padding:12px 14px}
.barTop{display:flex;align-items:baseline;gap:10px;margin-bottom:9px}
.barTop .t{font-family:'Anton',sans-serif;font-size:20px}.barTop .t .rr{color:var(--orange)}
.barTop .count{font-size:12px;color:var(--dim)}.barTop .count b{color:var(--white)}
.filters{display:flex;flex-wrap:wrap;gap:9px;align-items:end}
.f{display:flex;flex-direction:column;gap:3px;font-size:10.5px;color:var(--dimmer);font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.f select,.f input{background:var(--card);color:var(--white);border:1px solid var(--border);border-radius:9px;padding:7px 9px;font-family:inherit;font-size:13px;min-width:120px}
.f input{min-width:170px}
.reset{align-self:end;background:transparent;border:1px solid var(--border);color:var(--dim);border-radius:9px;padding:8px 12px;font-family:inherit;font-weight:700;font-size:12px;cursor:pointer}
.grid{column-count:1;column-gap:16px}@media(min-width:740px){.grid{column-count:2}}@media(min-width:1160px){.grid{column-count:3}}
.card{break-inside:avoid;display:inline-block;width:100%;margin:0 0 16px;background:var(--card);border:1px solid var(--border);border-radius:16px;padding:13px 14px 12px;box-shadow:0 6px 20px rgba(0,0,0,.3)}
.card.vis{border-color:var(--greenBorder)}
.card.hidden{display:none}
.top{display:flex;align-items:center;gap:7px;margin-bottom:6px;flex-wrap:wrap}
.badge{font-size:10.5px;font-weight:800;border:1px solid;border-radius:999px;padding:3px 9px}
.chip{font-size:10px;font-weight:800;color:#2a0f02;background:var(--orange);border-radius:7px;padding:3px 8px}
.vtag{font-size:9.5px;font-weight:800;color:var(--green);background:var(--greenDim);border:1px solid var(--greenBorder);border-radius:6px;padding:2px 6px}
.d{font-size:10px;color:var(--dimmer);font-weight:700;margin-left:auto}
.sub{font-size:10px;color:var(--dimmer);margin-bottom:10px}.sub .id{font-family:ui-monospace,monospace}
.stem{font-size:14.5px;font-weight:600;line-height:1.45;color:#fff;margin-bottom:11px}.stem.sc{margin-top:9px;margin-bottom:0}
.qline{margin-top:6px;font-size:13px;font-weight:700;color:var(--orange)}
.seqhint{font-size:10.5px;color:var(--dimmer);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;font-weight:700}
.opts{display:grid;gap:7px}.opts.tf{grid-template-columns:1fr 1fr}
.opt{display:flex;align-items:center;gap:9px;background:rgba(248,250,252,.04);border:1.5px solid var(--border);border-radius:11px;padding:10px 12px;font-size:13.5px;color:var(--dim)}
.opt .k{font-weight:800;color:var(--dimmer);font-size:12px;min-width:13px}
.opt.correct{background:var(--greenDim);border-color:var(--greenBorder);border-left:4px solid var(--green);color:#eafff3;font-weight:600}
.opt.correct .k{color:var(--green)}.opt.correct .ot{flex:1}.opt.correct::after{content:"✓";margin-left:auto;color:var(--green);font-weight:800}
.fb{margin-top:11px;background:var(--greenDim);border:1px solid var(--greenBorder);border-radius:11px;padding:10px 12px}
.fb-why{font-size:12px;line-height:1.45;color:#dff7e7}.fb-why b{color:var(--green);margin-right:4px}.fb-tip{font-size:11.5px;color:var(--dim);margin-top:6px}
.frame{border:1px solid var(--border);border-radius:11px;overflow:hidden;background:#020f22;min-height:200px;display:flex}
.frame iframe{width:100%;height:230px;border:0;background:#020f22}
.frame .ph{margin:auto;padding:18px;text-align:center;font-size:11.5px;color:var(--dimmer);line-height:1.6}
.frame .ph code{background:rgba(255,255,255,.08);padding:1px 5px;border-radius:4px;color:var(--dim)}
.empty{max-width:480px;margin:40px auto;text-align:center;color:var(--dim);font-size:14px;display:none}
</style></head><body>
<div class="bar">
  <div class="barTop"><span class="t"><span class="rr">Rink</span>Reads Bank</span><span class="count" id="count"></span></div>
  <div class="filters">
    ${sel("fAge", "Age", ages)}
    ${sel("fType", "Type", types)}
    ${sel("fConcept", "Concept", concepts)}
    <label class="f"><span>Visual</span><select id="fVisual"><option value="">All</option><option value="1">Has picture</option><option value="0">Text only</option></select></label>
    <label class="f"><span>Search</span><input id="fSearch" placeholder="text, id, nodeId…"></label>
    <button class="reset" id="reset">Reset</button>
  </div>
</div>
<div class="grid" id="grid">${all.map(card).join("")}</div>
<div class="empty" id="empty">No questions match these filters.</div>
<script>
const SERVER = location.protocol.indexOf("http") === 0;
const grid = document.getElementById("grid"), cards = [...grid.children];
const F = { age:fAge, type:fType, concept:fConcept, visual:fVisual, search:fSearch };
function apply(){
  const a=F.age.value, t=F.type.value, c=F.concept.value, v=F.visual.value, s=F.search.value.trim().toLowerCase();
  let shown=0;
  for(const el of cards){
    let ok = (!a||el.dataset.age===a) && (!t||el.dataset.type===t) && (!c||el.dataset.concept===c) && (v===""||el.dataset.visual===v);
    if(ok && s) ok = el.textContent.toLowerCase().includes(s);
    el.classList.toggle("hidden", !ok);
    if(ok){ shown++; loadFrame(el); }
  }
  document.getElementById("count").innerHTML = "<b>"+shown+"</b> of "+cards.length+" shown";
  document.getElementById("empty").style.display = shown? "none":"block";
}
function loadFrame(el){
  if(!SERVER) return;
  const f = el.querySelector(".frame[data-q]");
  if(f && !f.dataset.loaded){ f.dataset.loaded="1"; const id=f.dataset.q;
    f.innerHTML = '<iframe loading="lazy" src="/#q='+encodeURIComponent(id)+'"></iframe>'; }
}
Object.values(F).forEach(e=>e.addEventListener("input",apply));
document.getElementById("reset").onclick=()=>{ Object.values(F).forEach(e=>e.value=""); apply(); };
apply();
</script>
</body></html>`;

writeFileSync("public/bank-dashboard.html", html, "utf8");
const vis = all.filter(isVisual).length;
console.log(`wrote dashboard → public/bank-dashboard.html`);
console.log(`  ${all.length} questions: ${all.length - vis} text, ${vis} visual · ${ages.length} ages · ${types.length} types · ${concepts.length} concepts`);
console.log(`  open under npm run dev: http://localhost:5173/bank-dashboard.html`);
