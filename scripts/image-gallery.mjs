// image-gallery.mjs — render every IMAGE question (type:mc + media + overlays)
// as it actually looks: the board SVG inlined, the read overlays (arrow/ring)
// drawn on top exactly like OverlayLayer does, plus the question text + answer.
// Opens via file:// (SVGs are inlined). The one surface that shows image
// questions visually — the dashboard/review-sheet only show their text.
//
// Usage:  node scripts/image-gallery.mjs [out.html]

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const bank = JSON.parse(readFileSync("src/data/bank.json", "utf8"));
const stash = existsSync("docs/ai-pipeline/image-figurine-pulled.json")
  ? JSON.parse(readFileSync("docs/ai-pipeline/image-figurine-pulled.json", "utf8")) : [];

const items = [];
for (const lv in bank) for (const q of bank[lv]) if (q.media) items.push({ ...q, _status: "LIVE" });
for (const q of stash) if (q.media) items.push({ ...q, _status: "PULLED" });

const svgInline = (url) => {
  const f = "public" + url;
  if (!existsSync(f)) return `<div class="missing">missing ${esc(url)}</div>`;
  const isFig = readFileSync(f, "utf8").includes("rotate(");
  return { svg: readFileSync(f, "utf8").replace(/<svg /, '<svg style="width:100%;height:auto;display:block" '), isFig };
};

function overlayLayer(overlays) {
  if (!Array.isArray(overlays) || !overlays.length) return "";
  const parts = overlays.map((o, i) => {
    if (o.kind === "arrow") {
      const x1 = o.x1 * 100, y1 = o.y1 * 100, x2 = o.x2 * 100, y2 = o.y2 * 100;
      const cx = (x1 + x2) / 2, cy = Math.min(y1, y2) - 8, col = o.color || "#C9A24B";
      return `<marker id="ga${i}" markerWidth="5" markerHeight="5" refX="2.4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="${col}"/></marker>
        <path d="M${x1},${y1} Q ${cx},${cy} ${x2},${y2}" fill="none" stroke="${col}" stroke-width="2.4" stroke-dasharray="5 3" stroke-linecap="round" marker-end="url(#ga${i})" vector-effect="non-scaling-stroke"/>`;
    }
    if (o.kind === "ring") {
      return `<circle cx="${o.x * 100}" cy="${o.y * 100}" r="${(o.r ?? 0.05) * 100}" fill="none" stroke="${o.color || "#36d17a"}" stroke-width="2.2" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>`;
    }
    return "";
  }).join("");
  return `<svg class="ovl" viewBox="0 0 100 100" preserveAspectRatio="none"><defs></defs>${parts}</svg>`;
}

const card = (q) => {
  const r = svgInline(q.media.url);
  const fig = r.isFig;
  const opts = (q.opts || []).map((o, i) => `<div class="opt${i === q.ok ? " ok" : ""}"><span class="k">${"ABCD"[i]}</span>${esc(o)}</div>`).join("");
  return `<div class="card">
    <div class="top"><span class="badge ${q._status === "LIVE" ? "live" : "pulled"}">${q._status}</span>${fig ? `<span class="fig">⚠ figurine art</span>` : `<span class="clean">clean board</span>`}<span class="id">${esc(q.id)}</span><span class="lv">${esc((q.levels && q.levels[0]) || q.level || "")} · d${esc(q.d ?? "")}</span></div>
    <div class="frame">${r.svg || r}${overlayLayer(q.overlays)}</div>
    <div class="stem">${esc(q.sit)}</div>
    <div class="opts">${opts}</div>
    ${q.explain ? `<div class="why"><b>Why</b> ${esc(q.explain)}</div>` : ""}
  </div>`;
};

const live = items.filter((q) => q._status === "LIVE").length;
const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>RinkReads — Image Questions (${items.length})</title>
<style>
:root{--bg:#041E42;--card:#0a2850;--orange:#FC4C02;--green:#22c55e;--amber:#eab308;--white:#f8fafc;--dim:rgba(248,250,252,.6);--dimmer:rgba(248,250,252,.35);--border:rgba(255,255,255,.08);--greenDim:rgba(34,197,94,.1);--greenBorder:rgba(34,197,94,.45)}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--white);font-family:'DM Sans',system-ui,Arial,sans-serif;padding:20px 14px 70px}
h1{max-width:520px;margin:0 auto 4px;font-size:20px}.sub{max-width:520px;margin:0 auto 18px;color:var(--dim);font-size:12.5px}
.card{max-width:520px;margin:0 auto 18px;background:var(--card);border:1px solid var(--border);border-radius:16px;padding:13px 14px 14px}
.top{display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:10.5px;margin-bottom:9px}
.badge{font-weight:800;border-radius:7px;padding:2px 8px}.badge.live{background:var(--greenDim);color:var(--green);border:1px solid var(--greenBorder)}.badge.pulled{background:rgba(234,179,8,.12);color:var(--amber);border:1px solid rgba(234,179,8,.4)}
.fig{color:var(--amber);font-weight:800}.clean{color:var(--green);font-weight:800}
.id{font-family:ui-monospace,monospace;color:var(--dimmer)}.lv{margin-left:auto;color:var(--dimmer);font-weight:700}
.frame{position:relative;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:#f6fbff;margin-bottom:11px}
.frame svg{display:block}.ovl{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.stem{font-size:14.5px;font-weight:600;line-height:1.5;margin-bottom:10px}
.opts{display:grid;gap:7px}.opt{display:flex;gap:9px;background:rgba(248,250,252,.04);border:1.5px solid var(--border);border-radius:11px;padding:9px 12px;font-size:13.5px;color:var(--dim)}
.opt .k{font-weight:800;color:var(--dimmer)}.opt.ok{background:var(--greenDim);border-color:var(--greenBorder);border-left:4px solid var(--green);color:#eafff3;font-weight:600}.opt.ok::after{content:"✓";margin-left:auto;color:var(--green);font-weight:800}
.why{margin-top:10px;font-size:12.5px;color:var(--dim);line-height:1.5}.why b{color:var(--green)}
.missing{padding:30px;text-align:center;color:#b91c1c}
</style></head><body>
<h1><span style="color:var(--orange)">Rink</span>Reads — Image Questions</h1>
<div class="sub">${items.length} image questions · ${live} live (clean) · ${items.length - live} pulled (figurine art) · overlays drawn on top, ✓ = answer</div>
${items.map(card).join("")}
</body></html>`;

const out = process.argv[2] || "docs/ai-pipeline/image-gallery.html";
writeFileSync(out, html, "utf8");
console.log(`wrote ${items.length}-image gallery → ${out} (${live} live, ${items.length - live} pulled)`);
