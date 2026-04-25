// Read-only audit of visual rink questions in src/data/questions.json.
// Reports violations of the rink-question conventions agreed in the
// 2026-04-25 session:
//
//   • U7 / U9: marker labels stripped (the marker type — teammate /
//     attacker / defender / goalie — already differentiates visually).
//     Only "YOU" / "ME" identity labels allowed.
//   • U11+:   labels must be positional (C, LW, RW, LD, RD, D), role
//     (F1, F2, F3, T, X, X-D, X-W, X-F, X-LW, X-RW, X-D1, X-D2), or
//     identity (YOU, ME, G). Locational shorthand like S/N/P/B is
//     forbidden — too easily confused with positions.
//   • Puck position: puckStart (and any puck markers) must NOT overlap
//     a player position. ≥ 8px separation.
//
//   node tools/audit-rink.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const qPath = path.join(here, "..", "src", "data", "questions.json");
const qb = JSON.parse(fs.readFileSync(qPath, "utf8"));

const YOUNG = new Set(["U7 / Initiation", "U9 / Novice"]);
const IDENTITY_LABELS = new Set(["YOU", "ME", "G"]);
// Labels that are unambiguously OK at U11+. Anything else is suspicious.
const ALLOWED_U11_LABELS = new Set([
  "YOU", "ME", "G",
  "C", "LW", "RW", "LD", "RD", "D", "D1", "D2",
  "F", "F1", "F2", "F3",
  "T",                          // trailer
  "W", "W1", "W2",              // generic winger
  "SW",                         // strong-side wing (descriptive, allowed)
  "P",                          // partner
  "A", "B",                     // option identifiers in pov-pick / multi-tap
  "X", "X1", "X2", "X3",        // generic opponents (numbered for multi-attacker scenes)
  "X-D", "X-W", "X-F",
  "X-D1", "X-D2", "X-LW", "X-RW", "X-W1", "X-W2",
  "X-C",
  "shooter", "PC", "QB", "F1-screen", // descriptive role labels — allowed
]);

const PLAYER_TYPES = new Set(["teammate", "attacker", "defender", "player"]);
const isVisual = (q) => q && (q.rink || q.pov || q.scene);
const collectMarkers = (q) => {
  const out = [];
  if (q.rink?.markers) out.push(...q.rink.markers);
  if (q.pov?.markers)  out.push(...q.pov.markers);
  return out;
};
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const issues = {
  youngLabels: [],         // U7/U9 with stripped labels needed
  badU11Labels: [],        // U11+ with locational/random labels
  puckOnPlayer: [],        // puck overlap within 8px
  duplicateLabels: [],     // two markers same label same question
};

let totalVisual = 0;

for (const [level, qs] of Object.entries(qb)) {
  for (const q of qs) {
    if (!isVisual(q)) continue;
    totalVisual++;

    const markers = collectMarkers(q);
    const labels = [];

    for (const m of markers) {
      if (!m.label) continue;
      labels.push(m.label);

      if (YOUNG.has(level)) {
        // U7/U9: only identity labels (YOU/ME/G) allowed.
        if (!IDENTITY_LABELS.has(m.label)) {
          issues.youngLabels.push({ id: q.id, level, label: m.label, type: m.type });
        }
      } else {
        // U11+: must be in the allowed set. Flag anything not.
        if (!ALLOWED_U11_LABELS.has(m.label)) {
          issues.badU11Labels.push({ id: q.id, level, label: m.label, type: m.type });
        }
      }
    }

    // Duplicate labels in the same question.
    const dupes = labels.filter((x, i) => labels.indexOf(x) !== i);
    for (const d of new Set(dupes)) {
      issues.duplicateLabels.push({ id: q.id, level, label: d });
    }

    // Puck-on-player: check puckStart and any puck markers vs every player.
    const puckPositions = [];
    if (q.puckStart && Number.isFinite(q.puckStart.x)) puckPositions.push(q.puckStart);
    for (const m of markers) if (m.type === "puck") puckPositions.push(m);

    const playerPositions = markers.filter(m => PLAYER_TYPES.has(m.type));
    for (const p of puckPositions) {
      for (const pl of playerPositions) {
        if (dist(p, pl) < 8) {
          issues.puckOnPlayer.push({
            id: q.id, level,
            puck: { x: p.x, y: p.y },
            player: { type: pl.type, label: pl.label || "(no label)", x: pl.x, y: pl.y },
            dist: dist(p, pl).toFixed(1),
          });
        }
      }
    }
  }
}

// ─── Report ─────────────────────────────────────────────────────────────
console.log(`Audited ${totalVisual} visual questions across ${Object.keys(qb).length} levels.`);
console.log("");

console.log(`U7/U9 marker labels to strip: ${issues.youngLabels.length}`);
for (const x of issues.youngLabels.slice(0, 20)) {
  console.log(`  ${x.id} (${x.level}) — ${x.type} "${x.label}"`);
}
if (issues.youngLabels.length > 20) console.log(`  ...and ${issues.youngLabels.length - 20} more`);
console.log("");

console.log(`U11+ suspicious labels (locational or random): ${issues.badU11Labels.length}`);
const byLabel = {};
for (const x of issues.badU11Labels) byLabel[x.label] = (byLabel[x.label] || 0) + 1;
for (const [lbl, n] of Object.entries(byLabel).sort((a,b) => b[1] - a[1])) {
  console.log(`  "${lbl}" × ${n}`);
}
console.log("");

console.log(`Puck overlapping a player (< 8px): ${issues.puckOnPlayer.length}`);
for (const x of issues.puckOnPlayer.slice(0, 20)) {
  console.log(`  ${x.id} (${x.level}) — puck@(${x.puck.x},${x.puck.y}) vs ${x.player.type} ${x.player.label}@(${x.player.x},${x.player.y})  dist=${x.dist}`);
}
if (issues.puckOnPlayer.length > 20) console.log(`  ...and ${issues.puckOnPlayer.length - 20} more`);
console.log("");

console.log(`Duplicate labels in the same question: ${issues.duplicateLabels.length}`);
for (const x of issues.duplicateLabels.slice(0, 10)) {
  console.log(`  ${x.id} (${x.level}) — duplicate "${x.label}"`);
}

console.log("");
const total = issues.youngLabels.length + issues.badU11Labels.length + issues.puckOnPlayer.length + issues.duplicateLabels.length;
console.log(total === 0 ? "✓ clean" : `${total} issues found. Run tools/fix-rink.mjs to apply safe fixes.`);
