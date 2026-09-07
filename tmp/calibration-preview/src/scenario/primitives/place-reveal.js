// Pure geometry + palette for the place primitive's post-answer reveal.
//
// WHY THIS FILE EXISTS. Two reasons, and they are the same reason
// place-scorer.js exists:
//
//   1. place.jsx cannot be imported from plain node, so any decision that
//      needs a regression lock has to live in a .js file. Every colour and
//      every coordinate of the reveal is decided here; the .jsx only draws
//      what this returns. See ../placeReveal.test.mjs.
//   2. The bug this was written for was a COLOUR decision, not a drawing bug.
//      place.jsx already drew a dashed ellipse at each correct target once the
//      answer landed — but it stroked that ellipse RED whenever the player had
//      got that item wrong, the identical red as the player's own misplaced
//      token. So the answer and the mistake were rendered in the same colour
//      with the same weight, and a wrong placement taught nothing: nothing on
//      the board said "here is where they should have gone."
//      point.jsx never had this problem (its target is always green, just
//      fainter when wrong) and neither did selection.jsx (missed-correct actors
//      get a green dashed glow). place was the only primitive that painted the
//      answer as if it were the error.
//
// The rule this file encodes: THE TARGET IS THE ANSWER, NEVER THE ERROR. Its
// colour never depends on whether the player got that item right — only its
// weight does.

import { RINK_W, RINK_H, denorm } from "../schema.js";

/**
 * Verdict palette. Mirrors verdictColors() in App.jsx, deliberately duplicated
 * rather than imported: App.jsx sits DOWNSTREAM of this file
 * (App -> ScenarioRenderer -> registry -> place.jsx -> here), so importing it
 * would close an import cycle. If the App palette changes, change it here too.
 *
 * `route` is the movement-arrow gold. It is deliberately NEITHER verdict colour
 * — the arrow answers "where should this player have gone", which is not a
 * right/wrong statement — and it matches the gold path reveal ScenarioRenderer
 * already draws for the `path` primitive.
 */
export function verdictPalette(colorblind) {
  return {
    correct: colorblind ? "#2563eb" : "#22c55e",
    wrong: colorblind ? "#ea580c" : "#ef4444",
    route: "#C9A24B",
    untouched: "rgba(255,255,255,.42)",
  };
}

/**
 * Should the reveal be drawn even though the player never tapped Check?
 *
 * The parent (ScenarioRenderer) handles a timeout by calling its own
 * handleAnswer({ok:false, reason:"timeout"}) and re-rendering the primitive
 * with locked=true. It never calls the primitive's check(), so `score` stays
 * null — and the old `reveal = !!score` meant a timed-out player saw NO target
 * at all, on five seeds that carry showTargets:false and depend entirely on
 * this reveal.
 *
 * The trap in "locked && !score" is that `locked` is ALSO true during the
 * IntelliGym preview lock (ScenarioRenderer passes `!!result || previewLocked`),
 * which is true from the very first render. Revealing on that would print the
 * answer on the ice before the player is even allowed to touch it — a strictly
 * worse bug than the one being fixed. So the reveal requires that the primitive
 * has been UNLOCKED at least once: a lock that has never lifted is a preview
 * lock, a lock that arrives after an unlocked window is the end of the question.
 */
export function shouldAutoReveal({ locked, everUnlocked, hasScore }) {
  return !!locked && !!everUnlocked && !hasScore;
}

/**
 * Straight movement arrow from where the player STARTED to the edge of the
 * correct target, in viewBox px.
 *
 * Trimmed at both ends: `tailPad` clears the token/ghost marker at the origin,
 * and the head stops on the ellipse boundary rather than at its centre so it
 * never lands on top of the identity label. Returns null when the two are so
 * close that an arrow would be a smudge (i.e. they barely had to move).
 */
export function arrowFor(startPx, targetPx, rx, ry, { tailPad = 14, minLength = 16 } = {}) {
  if (!startPx || !targetPx) return null;
  const dx = targetPx.x - startPx.x;
  const dy = targetPx.y - startPx.y;
  const len = Math.hypot(dx, dy);
  if (!len) return null;
  const ux = dx / len, uy = dy / len;
  // Distance from the target CENTRE to the ellipse edge along this direction.
  // The tolerance region is an ellipse (rx = tol*600, ry = tol*300) because the
  // scorer measures NORMALIZED distance — same reason point.jsx draws an
  // ellipse and not a circle.
  const denomSq = (ux / rx) ** 2 + (uy / ry) ** 2;
  const edge = denomSq > 0 ? 1 / Math.sqrt(denomSq) : 0;
  const x1 = startPx.x + ux * tailPad, y1 = startPx.y + uy * tailPad;
  const x2 = targetPx.x - ux * edge, y2 = targetPx.y - uy * edge;
  // SIGNED length along the original direction. A plain hypot() would happily
  // accept a segment the two trims have turned inside out — start already
  // inside the target ring gives a backwards arrow that is still "long enough",
  // pointing away from the answer.
  const drawn = (x2 - x1) * ux + (y2 - y1) * uy;
  if (drawn < minLength) return null;
  return { x1, y1, x2, y2, tailX: startPx.x, tailY: startPx.y };
}

/**
 * One reveal entry per item, fully resolved to px and colours.
 *
 * @param {string[]} items          interaction.items
 * @param {object} actorById        { [id]: actor } — carries the authored start x/y and `tag`
 * @param {object} targets          { [id]: resolved target {x,y,tolerance} | null }
 * @param {object} resultById       { [id]: { ok } } from scorePlace
 * @param {object} moved            { [id]: true } — did the player actually drag it
 * @param {boolean} colorblind
 */
export function revealPlan({
  items = [], actorById = {}, targets = {}, resultById = {}, moved = {}, colorblind = false,
} = {}) {
  const P = verdictPalette(colorblind);
  const plan = [];
  for (const id of items) {
    const t = targets[id];
    if (!t) continue;
    const a = actorById[id] || {};
    const ok = !!resultById[id]?.ok;
    const touched = !!moved[id];
    const c = denorm(t);
    const rx = Math.max(7, (t.tolerance || 0) * RINK_W);
    const ry = Math.max(7, (t.tolerance || 0) * RINK_H);
    const start = (typeof a.x === "number" && typeof a.y === "number") ? denorm(a) : null;
    // Label above the ring, flipped below it when the ring is near the top edge
    // of the 0..300 board and the text would clip out of the viewBox.
    const above = c.y - ry - 6;
    plan.push({
      id,
      // Identity. Three unlabelled rings appear on u13_breakout_position_place_v1
      // (RW, C, LW) and without this there is no way to tell which is whose.
      label: a.tag || (a.kind === "goalie" ? "G" : ""),
      cx: c.x, cy: c.y, rx, ry,
      ok, touched,
      // THE ANSWER IS ALWAYS THE "CORRECT" COLOUR. Only weight varies.
      targetStroke: P.correct,
      targetFillOpacity: ok ? 0.2 : 0.09,
      targetOpacity: ok ? 0.95 : 0.72,
      // Always dashed — a dashed ring means "target" in every primitive here,
      // and it is what separates the answer from the player's solid token
      // without relying on hue.
      targetDash: "4 2.5",
      labelX: c.x,
      labelY: above < 10 ? c.y + ry + 11 : above,
      // The token the player left behind.
      ring: ok ? P.correct : (touched ? P.wrong : P.untouched),
      // Redundant, non-colour verdict channel — same device selection.jsx uses.
      // A never-dragged token (only reachable on a timeout) gets no mark: the
      // player made no placement, so calling it wrong would be a lie.
      glyph: ok ? "✓" : (touched ? "✗" : ""),
      // Movement arrow ONLY where the player got it wrong. On a correct item
      // the token already sits inside the ring, so an arrow adds ink and no
      // information — and on the three-item breakout seed that is the
      // difference between one arrow and three.
      arrow: (!ok && start) ? arrowFor(start, { x: c.x, y: c.y }, rx, ry) : null,
      arrowColor: P.route,
    });
  }
  return plan;
}
