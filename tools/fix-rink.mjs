// Applies safe normalizations to visual rink questions in
// src/data/questions.json based on the conventions audited by
// tools/audit-rink.mjs:
//
//   • U7 / U9: strip non-identity teammate/attacker/defender labels.
//     The marker type renders with distinct color/shape so the
//     "offense vs defense" distinction is visual, no text needed.
//     Identity labels (YOU / ME / G) are kept.
//   • U11+: rewrite known locational shorthand to positional labels
//     where the mapping is unambiguous (S/N/P/B → flagged manual).
//     Other unrecognised labels are LEFT AS-IS but reported.
//   • Puck overlap: when puckStart or any puck marker sits within
//     8px of a player, offset it 12px to the player's left (or right,
//     if it would leave the rink).
//
// Pass --dry-run to preview without writing.
//
//   node tools/fix-rink.mjs           # apply
//   node tools/fix-rink.mjs --dry-run # preview only

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const qPath = path.join(here, "..", "src", "data", "questions.json");
const dryRun = process.argv.includes("--dry-run");

const qb = JSON.parse(fs.readFileSync(qPath, "utf8"));

const YOUNG = new Set(["U7 / Initiation", "U9 / Novice"]);
const IDENTITY_LABELS = new Set(["YOU", "ME", "G"]);
const PLAYER_TYPES = new Set(["teammate", "attacker", "defender", "player"]);
const isVisual = (q) => q && (q.rink || q.pov || q.scene);

// Known locational shorthand → positional label (best-effort guesses;
// we don't have enough context to be 100% right, so we flag instead of
// auto-rewriting these. Add entries as decisions get made.)
const LOCATIONAL_FLAG = new Set(["S", "N"]);   // S=slot, N=net-front — ambiguous w.r.t. position

const collectMarkerArrays = (q) => {
  const arrays = [];
  if (q.rink?.markers) arrays.push(q.rink.markers);
  if (q.pov?.markers)  arrays.push(q.pov.markers);
  return arrays;
};

const stats = {
  labelsStripped: 0,
  puckOffsets: 0,
  flagged: [],
};

function offsetPuck(p, players, rinkBoundsX = [0, 600]) {
  // Try left offset first, then right.
  const leftX = p.x - 12;
  const rightX = p.x + 12;
  const tryLeft = { x: leftX, y: p.y };
  const tryRight = { x: rightX, y: p.y };
  function ok(candidate) {
    if (candidate.x < rinkBoundsX[0] || candidate.x > rinkBoundsX[1]) return false;
    return players.every(pl => Math.hypot(candidate.x - pl.x, candidate.y - pl.y) >= 8);
  }
  if (ok(tryLeft)) return tryLeft;
  if (ok(tryRight)) return tryRight;
  // Fallback: 12px diagonal up-left
  return { x: leftX, y: p.y - 12 };
}

for (const [level, qs] of Object.entries(qb)) {
  for (const q of qs) {
    if (!isVisual(q)) continue;

    // ── 1. Label cleanup ───────────────────────────────────────────────
    for (const arr of collectMarkerArrays(q)) {
      for (const m of arr) {
        if (!m.label) continue;
        if (YOUNG.has(level)) {
          if (!IDENTITY_LABELS.has(m.label)) {
            stats.labelsStripped++;
            delete m.label;
          }
        } else {
          if (LOCATIONAL_FLAG.has(m.label)) {
            stats.flagged.push({ id: q.id, level, label: m.label, hint: "locational shorthand — needs positional label" });
          }
        }
      }
    }

    // ── 2. Puck overlap fix ────────────────────────────────────────────
    const allMarkers = [];
    for (const arr of collectMarkerArrays(q)) allMarkers.push(...arr);
    const players = allMarkers.filter(m => PLAYER_TYPES.has(m.type));

    if (q.puckStart && Number.isFinite(q.puckStart.x)) {
      for (const pl of players) {
        if (Math.hypot(q.puckStart.x - pl.x, q.puckStart.y - pl.y) < 8) {
          const fixed = offsetPuck(q.puckStart, players);
          q.puckStart = fixed;
          stats.puckOffsets++;
          break;
        }
      }
    }

    for (const arr of collectMarkerArrays(q)) {
      for (const m of arr) {
        if (m.type !== "puck") continue;
        for (const pl of players) {
          if (pl === m) continue;
          if (Math.hypot(m.x - pl.x, m.y - pl.y) < 8) {
            const fixed = offsetPuck(m, players.filter(p => p !== m));
            m.x = fixed.x; m.y = fixed.y;
            stats.puckOffsets++;
            break;
          }
        }
      }
    }
  }
}

console.log(`Stripped ${stats.labelsStripped} non-identity labels at U7/U9.`);
console.log(`Offset ${stats.puckOffsets} pucks that overlapped a player.`);
console.log(`Flagged ${stats.flagged.length} U11+ labels needing manual review:`);
for (const f of stats.flagged.slice(0, 20)) {
  console.log(`  ${f.id} (${f.level}) — "${f.label}" — ${f.hint}`);
}
if (stats.flagged.length > 20) console.log(`  ...and ${stats.flagged.length - 20} more`);

if (dryRun) {
  console.log("\n(--dry-run) no changes written.");
} else {
  fs.writeFileSync(qPath, JSON.stringify(qb, null, 2) + "\n");
  console.log("\nWrote changes. Run `npm run preflight` to validate.");
}
