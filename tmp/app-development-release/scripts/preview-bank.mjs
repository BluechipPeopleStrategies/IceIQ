// preview-bank.mjs — render a JSON array of RinkReads text questions into a
// standalone, INTERACTIVE HTML review sheet that mirrors the actual in-app
// question card. Approve or flag Needs-work + note per question.
//
// Two modes, one template:
//   • opened as a file:// → decisions persist in localStorage; Export downloads a verdict JSON.
//   • served by review-server.mjs (http) → each click auto-POSTs to the server, which stages
//     rework items into rework.json live (no export step).
//
// CLI:  node scripts/preview-bank.mjs <questions.json> [out.html]
// Also exports renderHtml(items, sourcePath) for review-server.mjs.

import { readFileSync, writeFileSync } from "node:fs";

export const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
export const age = (q) => esc((q.levels && q.levels[0]) || q.level || "");
export const TYPE = {
  mc:      { label: "Multiple Choice", color: "#CF4520", icon: "📝" },
  seq:     { label: "Put in Order", color: "#FC4C02", icon: "🔢" },
  mistake: { label: "Spot the Mistake", color: "#ef4444", icon: "🔍" },
  next:    { label: "What Happens Next", color: "#eab308", icon: "🔮" },
  tf:      { label: "True or False", color: "#5BA4E8", icon: "⚡" },
};
const opt = (text, letter, correct) =>
  `<div class="opt${correct ? " correct" : ""}">${letter ? `<span class="k">${letter}</span>` : ""}<span class="ot">${esc(text)}</span></div>`;
const feedback = (q) => {
  const p = [];
  if (q.explain) p.push(`<div class="fb-why"><b>Why</b> ${esc(q.explain)}</div>`);
  if (q.why) p.push(`<div class="fb-why"><b>Why</b> ${esc(q.why)}</div>`);
  if (q.tip) p.push(`<div class="fb-tip">💡 ${esc(q.tip)}</div>`);
  return p.length ? `<div class="fb">${p.join("")}</div>` : "";
};
export function bodyFor(q) {
  const t = q.type || "mc";
  if (t === "tf") return `<div class="stem">${esc(q.sit)}</div><div class="opts tf">${opt("TRUE", "", q.ok === true)}${opt("FALSE", "", q.ok === false)}</div>${feedback(q)}`;
  if (t === "seq") {
    const ordered = (q.correct_order || []).map((i, n) => `<div class="opt correct"><span class="k">${n + 1}</span><span class="ot">${esc(q.items[i])}</span></div>`).join("");
    return `<div class="stem">${esc(q.sit)}</div><div class="seqhint">correct order shown:</div><div class="opts">${ordered}</div>${feedback(q)}`;
  }
  const stem = t === "mistake" ? `${esc(q.sit)}<div class="qline">${esc(q.question || "What is the player's mistake?")}</div>` : esc(q.sit);
  return `<div class="stem">${stem}</div><div class="opts">${(q.opts || []).map((o, i) => opt(o, "ABCD"[i], i === q.ok)).join("")}</div>${feedback(q)}`;
}

export function renderHtml(items, sourcePath) {
  const cards = items.map((q) => {
    const ti = TYPE[q.type || "mc"] || TYPE.mc;
    return `<div class="card" data-id="${esc(q.id)}">
    <div class="top"><span class="badge" style="color:${ti.color};background:${ti.color}1f;border-color:${ti.color}55">${ti.icon} ${ti.label}</span>
      <span class="chip">${age(q)}</span><span class="d">d${esc(q.d ?? "")}</span></div>
    <div class="sub">${esc(q.nodeId || "")} · ${esc(q.cat || "")} · <span class="id">${esc(q.id)}</span></div>
    ${bodyFor(q)}
    <div class="rev">
      <button class="rv rv-ok" data-v="approve">✓ Approve</button>
      <button class="rv rv-no" data-v="rework">✎ Needs work</button>
      <textarea class="note" rows="1" placeholder="Notes for rework (staged with this question)…"></textarea>
    </div></div>`;
  }).join("");
  const counts = items.reduce((m, q) => ((m[q.type || "mc"] = (m[q.type || "mc"] || 0) + 1), m), {});
  const summary = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(" · ");
  const DATA = JSON.stringify(items.map((q) => ({ id: q.id, nodeId: q.nodeId || "", type: q.type || "mc" }))).replace(/</g, "\\u003c");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>RinkReads — Batch Review (${items.length})</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#041E42;--card:#0a2850;--orange:#FC4C02;--green:#22c55e;--amber:#eab308;--white:#f8fafc;
  --dim:rgba(248,250,252,.6);--dimmer:rgba(248,250,252,.35);--border:rgba(255,255,255,.08);--greenDim:rgba(34,197,94,.1);--greenBorder:rgba(34,197,94,.45)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--white);font-family:'DM Sans',system-ui,sans-serif;padding:0 14px 80px}
.bar{position:sticky;top:0;z-index:9;background:rgba(4,30,66,.94);backdrop-filter:blur(7px);border-bottom:1px solid var(--border);max-width:480px;margin:0 auto;padding:12px 4px;display:flex;align-items:center;gap:10px}
.bar .t{font-family:'Anton',sans-serif;font-size:17px}.bar .t .rr{color:var(--orange)}
.bar .prog{font-size:11.5px;color:var(--dim);margin-left:auto;text-align:right;line-height:1.35}.bar .prog b{color:var(--white)}
.mode{font-size:9.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:2px 7px;border-radius:6px}
.mode.srv{background:var(--greenDim);color:var(--green);border:1px solid var(--greenBorder)}
.mode.file{background:rgba(234,179,8,.12);color:var(--amber);border:1px solid rgba(234,179,8,.4)}
.btnrow{max-width:480px;margin:0 auto 16px;display:flex;gap:8px;padding-top:10px}
.act{flex:1;border:1px solid var(--border);background:rgba(255,255,255,.05);color:var(--white);border-radius:10px;padding:9px;font-family:inherit;font-weight:700;font-size:12.5px;cursor:pointer}
.act.primary{background:linear-gradient(135deg,#FC4C02,#CF4520);border:none;color:#fff}
.card{max-width:480px;margin:0 auto 16px;background:var(--card);border:1px solid var(--border);border-radius:18px;padding:14px 15px 12px;box-shadow:0 8px 26px rgba(0,0,0,.34);transition:border-color .15s}
.card.v-approve{border-color:var(--greenBorder)}.card.v-rework{border-color:rgba(234,179,8,.5)}
.top{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.badge{font-size:11px;font-weight:800;border:1px solid;border-radius:999px;padding:3px 10px}
.chip{font-size:10.5px;font-weight:800;color:#2a0f02;background:var(--orange);border-radius:8px;padding:3px 9px}
.d{font-size:10.5px;color:var(--dimmer);font-weight:700;margin-left:auto}
.sub{font-size:10.5px;color:var(--dimmer);margin-bottom:11px}.sub .id{font-family:ui-monospace,monospace}
.stem{font-size:16px;font-weight:600;line-height:1.5;color:#fff;margin-bottom:13px}
.qline{margin-top:7px;font-size:14px;font-weight:700;color:var(--orange)}
.seqhint{font-size:11px;color:var(--dimmer);text-transform:uppercase;letter-spacing:.1em;margin-bottom:7px;font-weight:700}
.opts{display:grid;gap:9px}.opts.tf{grid-template-columns:1fr 1fr}
.opt{display:flex;align-items:center;gap:11px;background:rgba(248,250,252,.04);border:1.5px solid var(--border);border-radius:13px;padding:13px 15px;font-size:14.5px;color:var(--dim)}
.opt .k{font-weight:800;color:var(--dimmer);font-size:12.5px;min-width:14px}
.opt.correct{background:var(--greenDim);border-color:var(--greenBorder);border-left:4px solid var(--green);color:#eafff3;font-weight:600}
.opt.correct .k{color:var(--green)}.opt.correct .ot{flex:1}.opt.correct::after{content:"✓";margin-left:auto;color:var(--green);font-weight:800;font-size:15px}
.fb{margin-top:13px;background:var(--greenDim);border:1px solid var(--greenBorder);border-radius:13px;padding:11px 13px}
.fb-why{font-size:13px;line-height:1.5;color:#dff7e7}.fb-why b{color:var(--green);margin-right:5px}.fb-tip{font-size:12.5px;color:var(--dim);margin-top:7px}
.rev{margin-top:13px;border-top:1px solid var(--border);padding-top:11px;display:flex;flex-wrap:wrap;gap:8px;align-items:stretch}
.rv{border:1.5px solid var(--border);background:transparent;color:var(--dim);border-radius:10px;padding:8px 13px;font-family:inherit;font-weight:700;font-size:12.5px;cursor:pointer}
.rv-ok.on{background:var(--greenDim);border-color:var(--green);color:#eafff3}
.rv-no.on{background:rgba(234,179,8,.12);border-color:var(--amber);color:#fff4cf}
.note{flex:1 1 100%;display:none;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:10px;color:var(--white);font-family:inherit;font-size:12.5px;padding:9px 11px;resize:vertical;min-height:36px}
.toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:var(--green);color:#06210f;font-weight:800;font-size:13px;padding:10px 18px;border-radius:999px;opacity:0;transition:opacity .2s;pointer-events:none}
.toast.show{opacity:1}
</style></head><body>
<div class="bar"><span class="t"><span class="rr">Rink</span>Reads Review</span><span class="mode" id="mode"></span><span class="prog" id="prog"></span></div>
<div class="btnrow"><button class="act" id="approveAll">Approve all undecided</button><button class="act primary" id="export">Export verdict JSON</button></div>
<div style="max-width:480px;margin:0 auto 14px;color:var(--dim);font-size:12px">${items.length} questions (${esc(summary)}) · shown answered, ✓ = keyed answer</div>
${cards}
<div class="toast" id="toast"></div>
<script>
const DATA = ${DATA};
const SOURCE = ${JSON.stringify(sourcePath)};
const KEY = "rr_review_" + SOURCE;
const SERVER = location.protocol.indexOf("http") === 0;
let state = {};
function toast(m){ const t=document.getElementById("toast"); t.textContent=m; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),1600); }
async function loadState(){
  if(SERVER){ try{ state = await (await fetch("/api/state")).json() || {}; }catch(e){ state={}; } }
  else { try{ state = JSON.parse(localStorage.getItem(KEY)||"{}"); }catch(e){ state={}; } }
  render();
}
async function persist(id){
  if(SERVER){
    const s=state[id]||{};
    try{ const r=await fetch("/api/decision",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id,verdict:s.verdict||null,note:s.note||""})});
      const j=await r.json(); if(j&&j.staged) toast("Staged for rework → rework.json"); }catch(e){ toast("⚠ server unreachable"); }
  } else { localStorage.setItem(KEY, JSON.stringify(state)); }
  render();
}
function render(){
  document.getElementById("mode").textContent = SERVER ? "live · server" : "local · file";
  document.getElementById("mode").className = "mode " + (SERVER?"srv":"file");
  document.getElementById("export").style.display = SERVER ? "none" : "";
  let ok=0,no=0;
  document.querySelectorAll(".card").forEach(c=>{
    const id=c.dataset.id, s=state[id]||{};
    c.classList.toggle("v-approve", s.verdict==="approve");
    c.classList.toggle("v-rework", s.verdict==="rework");
    c.querySelector(".rv-ok").classList.toggle("on", s.verdict==="approve");
    c.querySelector(".rv-no").classList.toggle("on", s.verdict==="rework");
    const ta=c.querySelector(".note"); ta.style.display = s.verdict==="rework" ? "block":"none";
    if(s.note!=null && document.activeElement!==ta && ta.value!==s.note) ta.value=s.note;
    if(s.verdict==="approve")ok++; if(s.verdict==="rework")no++;
  });
  document.getElementById("prog").innerHTML = "<b>"+ok+"</b> approved · <b>"+no+"</b> rework · "+(DATA.length-ok-no)+" left";
}
document.querySelectorAll(".card").forEach(c=>{
  const id=c.dataset.id;
  c.querySelectorAll(".rv").forEach(b=>b.onclick=()=>{ const v=b.dataset.v; state[id]=state[id]||{}; state[id].verdict = state[id].verdict===v?null:v; persist(id); });
  c.querySelector(".note").onchange=e=>{ state[id]=state[id]||{}; state[id].note=e.target.value; persist(id); };
});
document.getElementById("approveAll").onclick=async()=>{
  const todo=DATA.filter(d=>!state[d.id]||!state[d.id].verdict);
  todo.forEach(d=>state[d.id]={...(state[d.id]||{}),verdict:"approve"});
  if(SERVER){ for(const d of todo){ await persist(d.id); } } else { localStorage.setItem(KEY,JSON.stringify(state)); render(); }
};
document.getElementById("export").onclick=()=>{
  const decisions = DATA.map(d=>({id:d.id,nodeId:d.nodeId,verdict:(state[d.id]&&state[d.id].verdict)||"undecided",note:(state[d.id]&&state[d.id].note)||""})).filter(x=>x.verdict!=="undecided"||x.note);
  const out={source:SOURCE,reviewedAt:new Date().toISOString(),summary:{approve:decisions.filter(d=>d.verdict==="approve").length,rework:decisions.filter(d=>d.verdict==="rework").length,total:DATA.length},decisions};
  const txt=JSON.stringify(out,null,2);
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([txt],{type:"application/json"})); a.download="review-verdict.json"; a.click();
  if(navigator.clipboard) navigator.clipboard.writeText(txt).then(()=>toast("Downloaded + copied")).catch(()=>toast("Downloaded"));
  else toast("Downloaded review-verdict.json");
};
loadState();
</script>
</body></html>`;
}

// ── CLI: write a static file (file:// mode). Only when run directly, never on import.
import { pathToFileURL } from "node:url";
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const inPath = process.argv[2];
  if (!inPath) { console.error("usage: node scripts/preview-bank.mjs <questions.json> [out.html]"); process.exit(2); }
  const outPath = process.argv[3] || inPath.replace(/\.json$/, "") + "-review.html";
  const items = JSON.parse(readFileSync(inPath, "utf8"));
  writeFileSync(outPath, renderHtml(items, inPath), "utf8");
  console.log(`wrote ${items.length}-question review sheet → ${outPath}`);
}
