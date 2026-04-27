#!/usr/bin/env node
// Preflight checks for RinkReads. Catches issues that would render visibly broken
// in-app before we ship. Run manually: `npm run preflight`.
//
// Checks:
//  [tailwind-missing]  src/ uses Tailwind classNames but no Tailwind config.
//  [bank]              questions.json structural + schema errors per type.
//  [rink]              q.rink scene bounds, valid view/zone/marker types.
//
// Exit code 1 on any error. Warnings are informational.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const BANK = path.join(SRC, "data", "questions.json");
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// ---------- file walking
function walkSrc() {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(js|jsx)$/.test(e.name)) out.push(full);
    }
  })(SRC);
  return out;
}

// ---------- check 1: tailwind used without tailwind installed
function checkTailwind() {
  const cfgs = ["tailwind.config.js", "tailwind.config.cjs", "tailwind.config.mjs", "tailwind.config.ts"];
  const hasTailwind = cfgs.some((f) => fs.existsSync(path.join(ROOT, f)));
  if (hasTailwind) return;

  // Conservative pattern: require a clear Tailwind signature (bg/text/border with
  // a palette + shade, or hover:/flex-col/rounded-md). Avoids false positives on
  // plain custom class names.
  const TW = /\b(?:bg|text|border)-(?:gray|red|green|blue|amber|yellow|slate|zinc|stone|neutral|emerald|teal|sky|indigo|violet|purple|pink|rose|orange)-\d{2,3}\b|\bhover:(?:bg|text|border)-|\bflex-col\b|\brounded-(?:sm|md|lg|xl|full)\b|\bgrid-cols-\d+\b|\bspace-[xy]-\d+\b/;
  const CN_RE = /className\s*=\s*["'`]([^"'`]+)["'`]/g;

  const hits = [];
  for (const file of walkSrc()) {
    const src = fs.readFileSync(file, "utf8");
    const found = new Set();
    let m;
    while ((m = CN_RE.exec(src))) {
      if (TW.test(m[1])) found.add(m[1].slice(0, 80));
    }
    if (found.size) hits.push({ file: path.relative(ROOT, file), samples: [...found].slice(0, 2) });
  }
  for (const h of hits) {
    err(`[tailwind-missing] ${h.file} — no tailwind.config found but uses Tailwind classes. Example: ${JSON.stringify(h.samples[0])}`);
  }
}

// ---------- check 2 + 3: bank + rink scene
const NEW_TYPES = new Set([
  "drag-target", "drag-place", "multi-tap", "sequence-rink",
  "path-draw", "lane-select", "hot-spots", "rink-label", "rink-drag", "rink-match",
]);
const ALL_KNOWN_TYPES = new Set([
  undefined, "mc", "tf", "seq", "mistake", "zone-click", "rink", "next",
  "true-false", "diagram", "rank", "two-step", "sequence", "fill", "multi",
  "pov-mc",
  ...NEW_TYPES,
]);
const VALID_VIEWS = new Set(["full", "left", "right", "neutral"]);
const VALID_ZONES = new Set([
  "none", "def-zone", "neutral-zone", "off-zone",
  "slot", "low-slot", "def-slot",
  "points-off", "corners-off", "corners-def",
  "shooting-lane-off", "half-wall-off",
]);
const VALID_MARKER_TYPES = new Set([
  "attacker", "defender", "teammate", "player", "coach", "goalie", "puck", "text", "number",
]);

function checkRinkScene(rink, loc) {
  if (!rink || typeof rink !== "object") {
    err(`[rink] ${loc} rink is not an object`);
    return;
  }
  if (rink.view && !VALID_VIEWS.has(rink.view)) {
    err(`[rink] ${loc} invalid view "${rink.view}" (expected one of ${[...VALID_VIEWS].join("|")})`);
  }
  if (rink.zone && rink.zone !== "none" && !VALID_ZONES.has(rink.zone)) {
    err(`[rink] ${loc} invalid zone "${rink.zone}"`);
  }
  if (Array.isArray(rink.overlays)) {
    for (const o of rink.overlays) {
      if (!VALID_ZONES.has(o)) err(`[rink] ${loc} invalid overlay "${o}"`);
    }
  }
  const markers = Array.isArray(rink.markers) ? rink.markers : [];
  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    if (!m || typeof m !== "object") continue;
    const mloc = `${loc} markers[${i}]`;
    if (m.type && !VALID_MARKER_TYPES.has(m.type)) {
      err(`[rink] ${mloc} invalid marker type "${m.type}"`);
    }
    if (typeof m.x !== "number" || m.x < 0 || m.x > 600) {
      err(`[rink] ${mloc} x=${m.x} out of [0,600]`);
    }
    if (typeof m.y !== "number" || m.y < 0 || m.y > 300) {
      err(`[rink] ${mloc} y=${m.y} out of [0,300]`);
    }
    // view-clip warnings
    if (rink.view === "left" && typeof m.x === "number" && m.x > 330) {
      warn(`[rink] ${mloc} at x=${m.x} likely clipped (view:"left" shows x≤300)`);
    }
    if (rink.view === "right" && typeof m.x === "number" && m.x < 270) {
      warn(`[rink] ${mloc} at x=${m.x} likely clipped (view:"right" shows x≥300)`);
    }
    if (rink.view === "neutral" && typeof m.x === "number" && (m.x < 200 || m.x > 400)) {
      warn(`[rink] ${mloc} at x=${m.x} likely clipped (view:"neutral" shows ~213≤x≤387)`);
    }
  }
}

function checkBank() {
  if (!fs.existsSync(BANK)) {
    err(`[bank] ${BANK} not found`);
    return;
  }
  const raw = fs.readFileSync(BANK, "utf8");
  let bank;
  try { bank = JSON.parse(raw); }
  catch (e) { err(`[bank] questions.json is not valid JSON: ${e.message}`); return; }

  const seenIds = new Map(); // id -> level
  for (const level of Object.keys(bank)) {
    const arr = bank[level];
    if (!Array.isArray(arr)) {
      err(`[bank] level "${level}" is not an array`);
      continue;
    }
    for (let i = 0; i < arr.length; i++) {
      const q = arr[i];
      const loc = `${level}[${i}]${q?.id ? ` id=${q.id}` : ""}`;
      if (!q || typeof q !== "object") { err(`[bank] ${loc} not an object`); continue; }
      if (!q.id) { err(`[bank] ${loc} missing id`); continue; }
      if (seenIds.has(q.id)) err(`[bank] duplicate id "${q.id}" (also in ${seenIds.get(q.id)})`);
      else seenIds.set(q.id, level);

      if (q.type !== undefined && !ALL_KNOWN_TYPES.has(q.type)) {
        warn(`[bank] ${loc} unknown type "${q.type}"`);
      }

      const isNew = q.q != null || q.choices != null || q.correct != null || NEW_TYPES.has(q.type) || q.rink != null;
      const isLegacy = q.sit != null || q.opts != null || q.ok !== undefined || q.why != null;

      if (isNew && isLegacy && q.type !== "multi") {
        // `multi` legitimately combines a setup line (sit) + prompt (q) +
        // legacy opts[] + new correct[] (array of indices), so the
        // mixed-schema heuristic doesn't apply.
        warn(`[bank] ${loc} mixes legacy (sit/opts/ok) and new (q/choices/correct) fields — pick one schema`);
      }

      if (isNew) {
        if (!q.q || typeof q.q !== "string") err(`[bank] ${loc} new-schema requires q (question text)`);
        if (!q.type) err(`[bank] ${loc} new-schema requires type`);
        const t = q.type;
        if (t === "mc" || t === "diagram") {
          if (!Array.isArray(q.choices) || q.choices.length < 2) err(`[bank] ${loc} ${t} requires choices[] (len>=2)`);
          if (typeof q.correct !== "number" || q.correct < 0 || q.correct >= (q.choices?.length || 0)) {
            err(`[bank] ${loc} ${t} correct=${q.correct} out of range for choices[${q.choices?.length || 0}]`);
          }
        }
        if (t === "drag-target" && (!Array.isArray(q.targets) || !q.targets.length)) err(`[bank] ${loc} drag-target requires targets[]`);
        if (t === "drag-place") {
          if (!Array.isArray(q.slots) || !q.slots.length) err(`[bank] ${loc} drag-place requires slots[]`);
          if (!Array.isArray(q.chips) || !q.chips.length) err(`[bank] ${loc} drag-place requires chips[]`);
        }
        if (t === "zone-click" && (!Array.isArray(q.zones) || !q.zones.length)) err(`[bank] ${loc} zone-click requires zones[]`);
        if ((t === "multi-tap" || t === "sequence-rink") && (!Array.isArray(q.markers) || !q.markers.length)) err(`[bank] ${loc} ${t} requires markers[]`);
        if (t === "hot-spots" && (!Array.isArray(q.spots) || !q.spots.length)) err(`[bank] ${loc} hot-spots requires spots[]`);
        if (t === "lane-select" && (!Array.isArray(q.lanes) || !q.lanes.length)) err(`[bank] ${loc} lane-select requires lanes[]`);
      }

      if (isLegacy) {
        const t = q.type;
        if (t === "tf") {
          if (typeof q.ok !== "boolean") err(`[bank] ${loc} tf requires boolean ok`);
        } else if (t === undefined || t === "mc" || t === "mistake" || t === "next") {
          if (!Array.isArray(q.opts) || q.opts.length < 2) err(`[bank] ${loc} legacy mc requires opts[] (len>=2)`);
          if (typeof q.ok !== "number" || q.ok < 0 || q.ok >= (q.opts?.length || 0)) {
            err(`[bank] ${loc} legacy ok=${q.ok} out of range for opts[${q.opts?.length || 0}]`);
          }
        }
      }

      if (q.rink) checkRinkScene(q.rink, loc);
    }
  }
}

// ---------- run
checkTailwind();
checkBank();

if (warnings.length) {
  console.log(`\n⚠  ${warnings.length} warning(s):`);
  for (const w of warnings) console.log("  " + w);
}
if (errors.length) {
  console.log(`\n✗ ${errors.length} error(s):`);
  for (const e of errors) console.log("  " + e);
  process.exit(1);
}
console.log(`\n✓ preflight clean${warnings.length ? ` (${warnings.length} warning(s))` : ""}`);
