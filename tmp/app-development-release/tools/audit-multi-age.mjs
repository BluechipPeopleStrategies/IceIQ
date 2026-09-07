#!/usr/bin/env node
// Multi-age audit. Scans src/data/questions.json and proposes a `levels: [...]`
// array for each question that could reasonably run at more than one age.
//
// Rules are CONSERVATIVE — we'd rather under-tag than push a question above
// or below its vocab / concept range. Run `node tools/audit-multi-age.mjs`
// for the markdown report. Run with `--apply` to write the proposed levels
// array into each question in place (idempotent — skips if already present).

import fs from "node:fs";
import path from "node:path";

const BANK = path.resolve("src/data/questions.json");
const bank = JSON.parse(fs.readFileSync(BANK, "utf8"));
const APPLY = process.argv.includes("--apply");

const AGE_ORDER = [
  "U7 / Initiation", "U9 / Novice", "U11 / Atom",
  "U13 / Peewee", "U15 / Bantam", "U18 / Midget",
];
const idx = (lvl) => AGE_ORDER.indexOf(lvl);

// Categories that mostly teach behavior / mindset / values. Travel up AND
// down the age ladder if the vocab is kid-safe (d <= 1).
const EVERGREEN = new Set([
  "Teamwork", "Compete", "Coachability", "Coach-ability",
  "Listening", "Safety", "Practice", "Roles", "Orientation", "Leadership",
]);

// Categories that teach mechanics / fundamentals. Span ages but only one
// step (d <= 1) and usually upward from the source age (harder ages still
// need fundamentals but easier ages may not have vocab for the answer).
const MECHANICAL = new Set([
  "Puck Skills", "Passing", "Shooting", "Skating", "Starts",
  "Positioning", "Zone Awareness", "Game Awareness",
]);

// Categories that are tactical / system-specific. Usually stay within one
// age bucket. Extend only at d <= 1 to the adjacent age UP if the source
// is U11+ (U7/U9 don't run systems).
const TACTICAL = new Set([
  "Rush Reads", "Zone Entry", "Breakout", "Breakouts",
  "Gap Control", "Coverage", "Defense", "Support",
  "Cycle Play", "Net-Front", "2-on-1", "Decision Timing",
  "Decision-Making", "Decision Making", "Game IQ", "Game Management",
  "Game Awareness", "Systems Play", "Special Teams",
  "Transition Game", "Exiting the Zone", "Puck Management", "Puck Support",
  "Blue Line Decisions", "Advanced Tactics", "Neutral Zone Play",
  "Breakout Execution", "Finishing", "Physical Play",
]);

// Absolute guardrails — never extend these ages:
const NEVER_EXTEND_DOWN_FROM = new Set(["U7 / Initiation", "U9 / Novice"]);
const NEVER_EXTEND_UP_FROM   = new Set(["U18 / Midget"]);

function proposedLevels(q, sourceLevel) {
  const d = q.d ?? q.diff === "E" ? 1 : q.diff === "M" ? 2 : q.diff === "H" ? 3 : (q.d || 1);
  const i = idx(sourceLevel);
  if (i < 0) return null;
  const targets = new Set([sourceLevel]);
  const cat = q.cat || "";

  // Evergreen — d<=1 travels one step UP and one step DOWN (within bounds).
  if (EVERGREEN.has(cat) && d <= 1) {
    if (i + 1 < AGE_ORDER.length && !NEVER_EXTEND_UP_FROM.has(sourceLevel)) {
      targets.add(AGE_ORDER[i + 1]);
    }
    if (i - 1 >= 0 && !NEVER_EXTEND_DOWN_FROM.has(AGE_ORDER[i])) {
      // Don't push a U9 question into U7 unless the vocab is clearly tiny;
      // too risky to auto-rule. So extend DOWN only from U11+.
      if (i >= 2) targets.add(AGE_ORDER[i - 1]);
    }
  }
  // Mechanical — one step UP at d<=1.
  if (MECHANICAL.has(cat) && d <= 1) {
    if (i + 1 < AGE_ORDER.length && !NEVER_EXTEND_UP_FROM.has(sourceLevel)) {
      targets.add(AGE_ORDER[i + 1]);
    }
  }
  // Tactical — one step UP from U11+ at d<=2.
  if (TACTICAL.has(cat) && d <= 2 && i >= 2) {
    if (i + 1 < AGE_ORDER.length && !NEVER_EXTEND_UP_FROM.has(sourceLevel)) {
      targets.add(AGE_ORDER[i + 1]);
    }
  }

  if (targets.size <= 1) return null;
  return [...targets].sort((a, b) => idx(a) - idx(b));
}

// ─────────────────────────────────────────────
// Scan
// ─────────────────────────────────────────────
const proposals = []; // { sourceLevel, id, cat, existing, propose }
for (const [level, qs] of Object.entries(bank)) {
  for (const q of qs) {
    // Skip questions already listed under another level (multi-age duplicates).
    // Only the "primary" row (the one owning this position in its source age)
    // should propose levels.
    if (Array.isArray(q.levels) && q.levels.length) continue;
    const propose = proposedLevels(q, level);
    if (!propose) continue;
    proposals.push({ sourceLevel: level, id: q.id, cat: q.cat, q: q, propose });
  }
}

// ─────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────
if (!APPLY) {
  const byLevel = {};
  for (const p of proposals) {
    byLevel[p.sourceLevel] = byLevel[p.sourceLevel] || [];
    byLevel[p.sourceLevel].push(p);
  }
  console.log(`# Multi-age audit — ${proposals.length} proposals`);
  console.log(`(Run \`node tools/audit-multi-age.mjs --apply\` to write.)\n`);
  for (const level of AGE_ORDER) {
    const rows = byLevel[level] || [];
    if (!rows.length) continue;
    console.log(`## ${level} — ${rows.length} candidate${rows.length === 1 ? "" : "s"}`);
    // Group by new-audience summary: "+U9", "+U11", "+U9,+U13" etc.
    const byExpansion = {};
    for (const p of rows) {
      const add = p.propose.filter(l => l !== level).map(l => l.split(" / ")[0]).join(", ");
      byExpansion[add] = byExpansion[add] || [];
      byExpansion[add].push(p);
    }
    for (const [add, ps] of Object.entries(byExpansion)) {
      console.log(`\n### Extend to +${add} (${ps.length})`);
      const byCat = {};
      for (const p of ps) {
        byCat[p.cat] = byCat[p.cat] || [];
        byCat[p.cat].push(p);
      }
      for (const [cat, qs2] of Object.entries(byCat)) {
        console.log(`- **${cat}** (${qs2.length}): ${qs2.map(q => q.id).join(", ")}`);
      }
    }
    console.log();
  }
  console.log(`\n**Total expansions:** ${proposals.length} questions. Net added impressions: approx ${proposals.reduce((s, p) => s + (p.propose.length - 1), 0)} (a single question can appear at up to ${Math.max(...proposals.map(p => p.propose.length))} ages).`);
  process.exit(0);
}

// ─────────────────────────────────────────────
// Apply
// ─────────────────────────────────────────────
let wrote = 0;
for (const [level, qs] of Object.entries(bank)) {
  for (const q of qs) {
    if (Array.isArray(q.levels) && q.levels.length) continue;
    const propose = proposedLevels(q, level);
    if (!propose) continue;
    q.levels = propose;
    wrote++;
  }
}
fs.writeFileSync(BANK, JSON.stringify(bank, null, 2) + "\n", "utf8");
console.log(`Wrote levels[] on ${wrote} questions.`);
