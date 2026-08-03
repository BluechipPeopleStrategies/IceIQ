// Semantic zone IDs → normalized 0..1 (cx, cy) center + default tolerance.
// Authors and the LLM author against zone IDs ("oz-slot") so they don't
// guess pixel coords. Renderers/scorers resolve to coords here. Adding a
// zone is one entry; changing a zone's coords keeps every scenario that
// references it correct.
//
// Coord conventions (mirrors the existing rink): x is left-to-right with
// the defending end at x=0..0.5 and offensive end at x=0.5..1. Half-views
// flip handedness in the renderer, not in the zone def.

export const ZONES = {
  // ─── DEFENSIVE ZONE
  "dz-corner-strong":      { x: 0.07, y: 0.85, tol: 0.07 },
  "dz-corner-weak":        { x: 0.07, y: 0.15, tol: 0.07 },
  "dz-net-front":          { x: 0.10, y: 0.50, tol: 0.05 },
  "dz-slot":               { x: 0.18, y: 0.50, tol: 0.07 },
  // Half-wall depth comes from ANCHORS.wallTopRight/wallBottomRight = 168 ft on
  // a 200 ft sheet -> 0.84 in the offensive end, mirrored to 32 ft -> 0.16 here.
  // These were 0.10 / 0.90, IDENTICAL to net-front depth. A half-wall at
  // net-front depth is not a half-wall, and it was not cosmetic: it put every
  // weak-side relocation target directly across the front of the crease, so the
  // keyed "correct" pass crossed within 1.0 m of the goalie — inside the
  // engine's own 0.035 intercept radius. Four boards taught that, including one
  // that had a U13 passing across the front of their OWN net. See
  // docs/references/rink-area-vocabulary.md open question 4 (settled 2026-08-03,
  // ANCHORS adopted) and docs/manual-playtest/audits/2026-08-03-prompt-vs-coordinates.md.
  "dz-half-wall-strong":   { x: 0.16, y: 0.78, tol: 0.06 },
  "dz-half-wall-weak":     { x: 0.16, y: 0.22, tol: 0.06 },
  "dz-point-strong":       { x: 0.30, y: 0.78, tol: 0.06 },
  "dz-point-weak":         { x: 0.30, y: 0.22, tol: 0.06 },

  // ─── NEUTRAL ZONE
  "neutral-strong":        { x: 0.50, y: 0.78, tol: 0.07 },
  "neutral-weak":          { x: 0.50, y: 0.22, tol: 0.07 },
  "neutral-center":        { x: 0.50, y: 0.50, tol: 0.06 },

  // ─── OFFENSIVE ZONE
  "oz-corner-strong":      { x: 0.93, y: 0.85, tol: 0.07 },
  "oz-corner-weak":        { x: 0.93, y: 0.15, tol: 0.07 },
  "oz-net-front":          { x: 0.90, y: 0.50, tol: 0.05 },
  "oz-slot":               { x: 0.82, y: 0.50, tol: 0.07 },
  "oz-high-slot":          { x: 0.75, y: 0.50, tol: 0.07 },
  "oz-half-wall-strong":   { x: 0.84, y: 0.78, tol: 0.06 }, // 168 ft — see dz note above
  "oz-half-wall-weak":     { x: 0.84, y: 0.22, tol: 0.06 },
  "oz-point-strong":       { x: 0.70, y: 0.78, tol: 0.06 },
  "oz-point-weak":         { x: 0.70, y: 0.22, tol: 0.06 },
  "oz-bumper":             { x: 0.78, y: 0.50, tol: 0.05 }, // 1-3-1 power-play spot
};

export function resolveTarget(target) {
  // Already a numeric point — pass through.
  if (target && typeof target.x === "number" && typeof target.y === "number") {
    return { x: target.x, y: target.y, tolerance: target.tolerance ?? 0.05 };
  }
  // Zone id reference.
  if (target && typeof target.zoneId === "string") {
    const z = ZONES[target.zoneId];
    if (!z) throw new Error(`Unknown zoneId: ${target.zoneId}`);
    return { x: z.x, y: z.y, tolerance: target.tolerance ?? z.tol };
  }
  throw new Error("target must have either {x,y} or {zoneId}");
}
