// Pure scorer for the place primitive. The user drags one or more actors
// (interaction.items) to where they belong; we compare each final position
// to its declared target (zone or point) within tolerance. All placements
// must land for the answer to be correct.
//
// positions: { [actorId]: {x,y} normalized }
// correct:   { kind:"place", placements: [{ id, zoneId|x,y, tolerance? }] }

import { resolveTarget } from "../zones.js";

export function scorePlace(positions, correct) {
  if (!positions || typeof positions !== "object") return { ok: false, reason: "noPositions" };
  const placements = (correct && correct.placements) || [];
  if (!placements.length) return { ok: false, reason: "noPlacements" };

  const results = [];
  let allOk = true;
  for (const t of placements) {
    let target;
    try { target = resolveTarget(t); }
    catch (e) { return { ok: false, reason: "badTarget", message: e.message }; }
    const pos = positions[t.id];
    if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") {
      allOk = false;
      results.push({ id: t.id, ok: false, reason: "unplaced", target });
      continue;
    }
    const distance = Math.hypot(pos.x - target.x, pos.y - target.y);
    const ok = distance <= target.tolerance;
    if (!ok) allOk = false;
    results.push({ id: t.id, ok, distance, target });
  }
  return { ok: allOk, reason: allOk ? "ok" : "offTarget", placements: results };
}
