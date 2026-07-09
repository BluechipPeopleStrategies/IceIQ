// Pure geometry + choreography helpers for animated-play motions.
// Kept renderer-free so node --test can cover them without a DOM.

const round2 = (n) => Math.round(n * 100) / 100;

export function motionPoints(motion) {
  const via = Array.isArray(motion.via) ? motion.via : [];
  return [motion.from, ...via, motion.to];
}

// SVG path for a motion. Two-point motions keep the legacy rendering exactly
// (straight skate/blocked, single upward bump for pass/shot) so existing
// plays are pixel-identical. Three or more points (via waypoints) draw a
// smooth Catmull-Rom spline through every point, for any kind — this is what
// makes behind-the-net reverses, wraps, curls, and angling arcs authorable.
export function motionPathD(motion) {
  const pts = motionPoints(motion);

  if (pts.length === 2) {
    const [[x1, y1], [x2, y2]] = pts;
    if (motion.kind === "skate" || motion.kind === "blocked") {
      return `M${x1},${y1} L${x2},${y2}`;
    }
    const mx = (x1 + x2) / 2;
    const my = Math.min(y1, y2) - 7;
    return `M${x1},${y1} Q ${mx},${my} ${x2},${y2}`;
  }

  // Catmull-Rom -> cubic Bezier through all points (endpoints duplicated).
  const p = [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${round2(pts[0][0])},${round2(pts[0][1])}`;
  for (let i = 1; i < p.length - 2; i++) {
    const [x0, y0] = p[i - 1];
    const [x1, y1] = p[i];
    const [x2, y2] = p[i + 1];
    const [x3, y3] = p[i + 2];
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;
    d += ` C${round2(c1x)},${round2(c1y)} ${round2(c2x)},${round2(c2y)} ${round2(x2)},${round2(y2)}`;
  }
  return d;
}

// Deterministic reveal choreography. Motions reveal staggered in authored
// order by default; `seq` groups motions into explicit beats and `delayMs`
// overrides outright. Returned delays are relative to the renderer's
// motion-reveal moment (the +500ms showMotion gate), not to node entry.
export function motionTimings(motions = [], { stepMs = 450 } = {}) {
  return motions.map((motion, index) => {
    if (typeof motion.delayMs === "number") return { delayMs: Math.max(0, motion.delayMs) };
    const beat = typeof motion.seq === "number" ? motion.seq : index;
    return { delayMs: Math.max(0, beat) * stepMs };
  });
}

// Which motions render on a node, and how. Question nodes hide skate and
// shot lines so the picture never leaks the answer. Terminal nodes keep
// pass/shot/blocked as before AND now render skate motions as ghost trails
// (telestration-style faded routes) so the consequence of the chosen answer
// is visible, not just described.
export function visibleMotions(node) {
  const motions = node?.motions || [];
  if (node?.terminal) {
    return motions.map((motion) => ({ motion, trail: motion.kind === "skate" }));
  }
  return motions
    .filter((motion) => motion.kind !== "skate" && motion.kind !== "shot")
    .map((motion) => ({ motion, trail: false }));
}
