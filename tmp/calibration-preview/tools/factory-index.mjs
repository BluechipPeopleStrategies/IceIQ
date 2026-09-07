#!/usr/bin/env node
// Generates public/factory-index.html — a browsable index of ONLY the
// content-factory questions (everything in src/data/factoryQuestions.json),
// grouped by source image, each with its picture, options (correct marked),
// and a deep link to the in-app single-question preview (/#q=<id>).
//
// View at http://localhost:5173/factory-index.html while `npm run dev` runs.
//
// Usage: node tools/factory-index.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const qs = JSON.parse(readFileSync(resolve(ROOT, "src/data/factoryQuestions.json"), "utf8"));

// Group by source image, preserving first-seen order.
const groups = new Map();
for (const q of qs) {
  if (!groups.has(q.imageId)) groups.set(q.imageId, { imageId: q.imageId, archetype: q.archetype, url: q.media?.url, items: [] });
  groups.get(q.imageId).items.push(q);
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function optionsHtml(q) {
  if (q.type === "tf") {
    return ["True", "False"].map((v, i) => {
      const correct = (v === "True") === (q.ok === true);
      return `<div class="opt ${correct ? "correct" : ""}">${v}${correct ? '<span class="badge">✓ Correct</span>' : ""}</div>`;
    }).join("");
  }
  return (q.opts || []).map((o, i) =>
    `<div class="opt ${i === q.ok ? "correct" : ""}">${esc(o)}${i === q.ok ? '<span class="badge">✓ Correct</span>' : ""}</div>`
  ).join("");
}

let cards = "";
for (const g of groups.values()) {
  const items = g.items.map(q => `
    <div class="q">
      <div class="qhead">${esc(q.levels?.[0] || "")} · ${esc((q.type || "mc").toUpperCase())}
        <a class="open" href="/#q=${esc(q.id)}" target="_blank" rel="noopener">open in app ▸</a>
      </div>
      <div class="qprompt">${esc(q.sit)}</div>
      ${optionsHtml(q)}
      <div class="why">${esc(q.why)}</div>
    </div>`).join("");
  cards += `
  <div class="card">
    <div class="imgcol"><img src="${esc(g.url)}" alt="${esc(g.archetype)}" loading="lazy"></div>
    <div class="qcol">
      <span class="tag">${esc(g.imageId)} · ${g.items.length} questions</span>
      <div class="arch">${esc(g.archetype)}</div>
      ${items}
    </div>
  </div>`;
}

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RinkReads — Questions added today</title>
<style>
:root{--navy:#0B1A33;--gold:#C9A24B;--ink:#1a2433;--muted:#6b7686;--line:#e3e7ee;--ok:#0B6B3A}
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,Arial,sans-serif;color:var(--ink);background:#f4f6fa}
header{background:var(--navy);color:#fff;padding:18px 24px}header h1{margin:0;font-size:18px}header p{margin:4px 0 0;font-size:13px;color:#c7d0e0}
.wrap{padding:18px 24px 60px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;margin:16px 0;overflow:hidden;display:grid;grid-template-columns:320px 1fr}
@media(max-width:820px){.card{grid-template-columns:1fr}}
.imgcol{background:var(--navy);display:flex;align-items:center;justify-content:center;padding:10px;min-height:180px}
.imgcol img{max-width:100%;max-height:420px;border-radius:8px;display:block}
.qcol{padding:16px 20px}
.tag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--navy);background:#f0e6cc;padding:3px 8px;border-radius:20px}
.arch{font-size:16px;font-weight:700;margin:8px 0 4px;color:var(--navy)}
.q{border-top:1px solid var(--line);padding:12px 0}
.qhead{font-size:11px;font-weight:700;color:var(--gold);letter-spacing:.4px;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center;gap:8px}
.open{font-size:11px;color:var(--muted);text-decoration:none;border:1px solid var(--line);border-radius:6px;padding:2px 7px;text-transform:none;letter-spacing:0}
.open:hover{color:var(--navy);border-color:var(--gold)}
.qprompt{font-size:14px;font-weight:600;margin:5px 0 8px}
.opt{font-size:13px;padding:6px 10px;border:1px solid var(--line);border-radius:8px;margin:4px 0;color:#3a4252}
.opt.correct{border-left:4px solid var(--ok);font-weight:700;color:var(--ink);background:#f2faf5}
.opt .badge{display:inline-block;font-size:10px;font-weight:800;color:#fff;background:var(--ok);border-radius:4px;padding:1px 5px;margin-left:6px}
.why{font-size:12.5px;color:var(--muted);margin-top:7px;line-height:1.45}
</style></head><body>
<header><h1>RinkReads · Questions added today</h1>
<p>${qs.length} factory questions across ${groups.size} images (run factory-run-02). Correct answers marked ✓. “open in app” shows it the way a player sees it.</p></header>
<div class="wrap">${cards}</div></body></html>`;

writeFileSync(resolve(ROOT, "public/factory-index.html"), html);
console.log(`Wrote public/factory-index.html: ${qs.length} questions, ${groups.size} images`);
