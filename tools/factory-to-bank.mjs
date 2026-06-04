#!/usr/bin/env node
// Factory SHIP stage. Converts a factory-run JSON (docs/factory/<run>.json)
// into the app's question-bank schema and writes src/data/factoryQuestions.json,
// which qbLoader.js merges into the live banks by `levels[]`.
//
// Maps each coach-passed question to the app shape:
//   mc  -> { type:"mc", sit, opts, ok:<index>, why, tip, media, levels, ... }
//   tf  -> { type:"tf", sit, ok:<bool>, why, tip, media, levels, ... }
// All non-tf formats (multiple-choice, what-happens-next, spot-the-mistake,
// tap-the-target, emoji) render as MC; tap targets become MC options.
//
// Images are expected at /assets/images/<run>/<tileId>.png — produce them with
// tools/slice-contact-sheet.mjs.
//
// Usage: node tools/factory-to-bank.mjs [runFile] [outFile]
//   defaults: docs/factory/factory-run-01.json -> src/data/factoryQuestions.json

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const runFile = resolve(ROOT, process.argv[2] || "docs/factory/factory-run-02.json");
const outFile = resolve(ROOT, process.argv[3] || "src/data/factoryQuestions.json");
const runName = (process.argv[2] || "factory-run-02").replace(/.*[\\/]/, "").replace(/\.json$/, "");
// Images live in this folder regardless of which run file authored the questions.
const IMAGE_RUN = "factory-run-01";

const AGE_LABEL = {
  U7: "U7 / Initiation", U9: "U9 / Novice", U11: "U11 / Atom",
  U13: "U13 / Peewee", U15: "U15 / Bantam", U18: "U18 / Midget",
};
const AGE_D = { U7: 1, U9: 1, U11: 2, U13: 3, U15: 3, U18: 3 };

// Per-tile annotation overlays (normalized 0..1 over the image): a gold ring on
// the puck, a gold arrow for the read, a green ring on the open target. Hand-placed
// for run-02; Phase 2 has the vision stage emit these coordinates automatically.
const G = "#C9A24B";
const OVERLAYS = {
  "tile-12": [{ kind: "ring", color: G, x: 0.34, y: 0.80, r: 0.045 }, { kind: "arrow", x1: 0.34, y1: 0.78, x2: 0.60, y2: 0.34 }, { kind: "ring", x: 0.62, y: 0.31, r: 0.07 }],
  "tile-16": [{ kind: "ring", color: G, x: 0.46, y: 0.72, r: 0.045 }],
  "tile-17": [{ kind: "ring", color: G, x: 0.50, y: 0.74, r: 0.045 }],
  "tile-18": [{ kind: "ring", color: G, x: 0.46, y: 0.80, r: 0.045 }, { kind: "arrow", x1: 0.46, y1: 0.78, x2: 0.66, y2: 0.30 }, { kind: "ring", x: 0.67, y: 0.26, r: 0.06 }],
  "tile-20": [{ kind: "ring", color: G, x: 0.50, y: 0.56, r: 0.045 }],
  "tile-21": [{ kind: "ring", color: G, x: 0.44, y: 0.70, r: 0.045 }],
  "tile-22": [{ kind: "ring", color: G, x: 0.46, y: 0.74, r: 0.045 }],
  "tile-23": [{ kind: "ring", color: G, x: 0.50, y: 0.80, r: 0.045 }, { kind: "arrow", x1: 0.50, y1: 0.78, x2: 0.50, y2: 0.34 }, { kind: "ring", x: 0.50, y: 0.31, r: 0.07 }],
  "tile-24": [{ kind: "ring", color: G, x: 0.34, y: 0.70, r: 0.045 }, { kind: "arrow", x1: 0.34, y1: 0.68, x2: 0.60, y2: 0.50 }, { kind: "ring", x: 0.62, y: 0.48, r: 0.06 }],
};

const run = JSON.parse(readFileSync(runFile, "utf8"));
const out = [];
const warnings = [];

// run-02 already excludes failed tiles; no per-id skip list needed here.
for (const scn of run.shippable || []) {
  const imageUrl = `/assets/images/${IMAGE_RUN}/${scn.id}.png`;
  for (const q of scn.questions || []) {
    const age = String(q.age || "U11").toUpperCase().split("-")[0];
    const level = AGE_LABEL[age] || AGE_LABEL.U11;
    const base = {
      id: `${runName}-${scn.id}-${q.qid}`,
      cat: scn.archetype,
      pos: ["F", "C", "D", "G"],
      d: AGE_D[age] || 2,
      sit: q.prompt,
      why: q.explanation,
      tip: String(q.explanation || "").split(/(?<=\.)\s/)[0],
      media: { type: "image", url: imageUrl, alt: scn.archetype, ratio: "266 / 394" },
      overlays: OVERLAYS[scn.id] || [],
      levels: [level],
      imageId: scn.id,
      archetype: scn.archetype,
      cognitiveSkill: "Decision-Making",
      concepts: q.concepts || [],
      _factoryRun: runName,
    };
    const isTF = /true|false|^tf$/i.test(q.format) || (Array.isArray(q.options) && q.options.length === 2 && /^(true|false)$/i.test(q.options[0]));
    if (isTF) {
      out.push({ ...base, type: "tf", ok: /^true$/i.test(q.answer) });
    } else {
      const idx = (q.options || []).indexOf(q.answer);
      if (idx < 0) warnings.push(`${base.id}: answer not found in options`);
      out.push({ ...base, type: "mc", opts: q.options, ok: idx < 0 ? 0 : idx });
    }
  }
}

writeFileSync(outFile, JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote ${out.length} questions from ${run.shippable?.length || 0} image-scenarios -> ${outFile}`);
if (warnings.length) console.warn("Warnings:\n - " + warnings.join("\n - "));
console.log(`Images expected at: public/assets/images/${runName}/<tile-id>.png`);
