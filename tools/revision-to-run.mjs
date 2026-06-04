#!/usr/bin/env node
// Extracts the re-vision workflow output into a curated run file
// (docs/factory/factory-run-02.json) for the ship stage. Keeps only the tiles a
// human verified as coherent + teams-distinct; queues the rest with reasons.
//
// Usage: node tools/revision-to-run.mjs <revisionOutput.json>

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const srcPath = process.argv[2];
if (!srcPath) { console.error("Usage: node tools/revision-to-run.mjs <revisionOutput.json>"); process.exit(1); }

// Human-verified keepers (each opened and checked against the real image).
const KEEP = new Set(["tile-12", "tile-16", "tile-17", "tile-18", "tile-20", "tile-21", "tile-22", "tile-23", "tile-24"]);
const QUEUE_REASONS = {
  "tile-10": "Coherent black-vs-gold drive, but the authored read ('protect and delay for support') is weak — no teammate is visible to wait for.",
  "tile-11": "The gold puck carrier is driving at a gold goalie / his own net — incoherent scene.",
  "tile-13": "Possession ambiguous and scene cluttered; the vision read possession opposite to what the image appears to show.",
  "tile-14": "All players wear the same black jersey — teams not distinguishable (auto-queued by vision).",
  "tile-15": "Cluttered 1-vs-3, possession unclear; only a generic read available.",
  "tile-19": "Net-front drive but no goalie in the crease — an odd edge-case scene for youth teaching.",
};

const data = JSON.parse(readFileSync(resolve(process.cwd(), srcPath), "utf8"));
const results = (data.result && data.result.results) || data.results || [];

const shippable = [];
const queued = [];
for (const r of results) {
  if (KEEP.has(r.id) && r.shippable && Array.isArray(r.finalBank) && r.finalBank.length) {
    shippable.push({ id: r.id, archetype: r.archetype, decision: r.decision, questions: r.finalBank });
  } else {
    queued.push({ id: r.id, archetype: r.archetype, reason: QUEUE_REASONS[r.id] || r.reason || "Queued in human review." });
  }
}

const out = {
  run: "factory-run-02",
  _comment: "Re-vision output, human-curated. Vision read the REAL tile images; only coherent, teams-distinct scenes kept. Images live in /assets/images/factory-run-01/.",
  summary: { total: results.length, shippable: shippable.length, queued: queued.length },
  shippable,
  queued,
};
writeFileSync(resolve(ROOT, "docs/factory/factory-run-02.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote factory-run-02.json: ${shippable.length} shippable, ${queued.length} queued`);
