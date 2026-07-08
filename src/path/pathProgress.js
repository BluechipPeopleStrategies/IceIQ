// Skill Path progress — per player + age band, localStorage.
//
// Philosophy matches the RinkReads gamification spec: REWARD-ONLY.
// No hearts, no lives, no losing progress. A rough lesson never
// punishes — the node simply stays active with an encouraging retry.
//
// LS shape (rinkreads_path_v1):
// { [playerId]: { [band]: {
//     xp: number,
//     done: { [nodeId]: { stars, bestPct, reps, ts } }
// } } }

import { lsGetJSON, lsSetJSON } from "../utils/storage.js";

const LS_KEY = "rinkreads_path_v1";

// A lesson "clears" the node at 50%+. Stars are the mastery ladder
// (Duolingo-crown analog): replay any cleared node to raise stars.
export const CLEAR_PCT = 0.5;
export function starsFor(pct) {
  if (pct >= 1) return 3;
  if (pct >= 0.8) return 2;
  if (pct >= CLEAR_PCT) return 1;
  return 0;
}

// XP: 10 per correct read, +20 perfect-lesson bonus, +10 anchor-concept
// bonus on first clear. Reward-only — wrong answers earn 0, never negative.
export function xpFor({ correct, total, firstClear, anchor }) {
  let xp = (correct || 0) * 10;
  if (total > 0 && correct === total) xp += 20;
  if (firstClear && anchor) xp += 10;
  return xp;
}

function readAll() {
  return lsGetJSON(LS_KEY, {});
}
function writeAll(m) {
  lsSetJSON(LS_KEY, m);
}

export function getBandProgress(playerId, band) {
  const all = readAll();
  return (all[playerId] && all[playerId][band]) || { xp: 0, done: {} };
}

export function getTotalXP(playerId) {
  const all = readAll();
  const bands = all[playerId] || {};
  return Object.values(bands).reduce((s, b) => s + (b.xp || 0), 0);
}

/**
 * Record a lesson result for a node.
 * Returns { cleared, firstClear, stars, xpEarned, pct }.
 */
export function recordNodeResult(playerId, band, node, { correct, total }) {
  const pct = total > 0 ? correct / total : 0;
  const stars = starsFor(pct);
  const cleared = stars > 0;

  const all = readAll();
  if (!all[playerId]) all[playerId] = {};
  if (!all[playerId][band]) all[playerId][band] = { xp: 0, done: {} };
  const bp = all[playerId][band];

  const prev = bp.done[node.id];
  const firstClear = cleared && !prev;
  const xpEarned = xpFor({ correct, total, firstClear, anchor: node.anchor });
  bp.xp += xpEarned;

  if (cleared) {
    bp.done[node.id] = {
      stars: Math.max(stars, prev?.stars || 0),
      bestPct: Math.max(pct, prev?.bestPct || 0),
      reps: (prev?.reps || 0) + 1,
      ts: new Date().toISOString(),
    };
  }
  try { writeAll(all); } catch {}
  return { cleared, firstClear, stars, xpEarned, pct };
}

/**
 * Compute node states for a path (from pathData.getPath).
 * Linear unlock: node N is unlocked when node N-1 is cleared.
 * First node is always unlocked. Cleared nodes stay replayable.
 * Returns { states: Map(nodeId -> "done"|"active"|"locked"),
 *           activeNode, clearedCount, totalCount, xp }
 */
export function getPathState(playerId, band, path) {
  const bp = getBandProgress(playerId, band);
  const states = new Map();
  let activeNode = null;
  let clearedCount = 0;
  let prevCleared = true; // first node unlocked

  for (const n of path.nodes) {
    const rec = bp.done[n.id];
    if (rec) {
      states.set(n.id, "done");
      clearedCount++;
      prevCleared = true;
    } else if (prevCleared && !activeNode) {
      states.set(n.id, "active");
      activeNode = n;
      prevCleared = false;
    } else {
      states.set(n.id, "locked");
      prevCleared = false;
    }
  }
  return { states, activeNode, clearedCount, totalCount: path.nodes.length, xp: bp.xp, done: bp.done };
}
