// U7/U9 rink policy — ONE place, so a future seed cannot opt out of it.
//
// Hockey Canada plays U7 cross-ice and U9 half-ice (max 100 x 85). There is no
// neutral zone, no point and no blue line in the game those children actually
// play, which is why zone words are banned from U7/U9 question text
// (docs/manual-playtest/2026-08-03-decisions-round3.md, decision 2).
//
// The decision's second half is the load-bearing one: banning the WORD while
// still DRAWING a blue line would leave the picture making a promise the
// language had just withdrawn. So the geometry is gated by the SAME age test as
// the vocabulary. U7/U9 always render half-ice, never a full sheet, and never a
// blue line, centre line, or zone boundary.
//
// This is deliberately a plain .js module with no React import: the rule has to
// be assertable from a node test (src/scenario/youngRinkView.test.mjs) and
// reusable by anything that renders a board, not just RinkStage.

// Matches "U7 / Initiation", "U9 / Novice", "u9", " U7". Case-insensitive and
// leading-space tolerant on purpose — an age band that reads as young to a
// human must never render as full-sheet because of a stray space or a lowercase
// letter in a hand-authored seed.
export const YOUNG_BAND_RE = /^\s*u(7|9)\b/i;

/**
 * Every age band a seed claims. Seeds carry `level`, `levels`, or both, and
 * only reading one of them is a live bypass of every age rule downstream.
 * @param {{level?: string, levels?: string[]}} seed
 * @returns {string[]}
 */
export function levelsOf(seed) {
  if (!seed || typeof seed !== "object") return [];
  const out = [];
  const push = (v) => {
    if (v == null) return;
    const s = String(v).trim();
    if (s && !out.includes(s)) out.push(s);
  };
  if (Array.isArray(seed.levels)) seed.levels.forEach(push);
  else push(seed.levels);
  push(seed.level);
  return out;
}

/**
 * True when ANY claimed band is U7 or U9. "Any", not "all": a board shared with
 * a young band is shown to young players, so the youngest band sets the rules.
 * @param {string[]|string} levels
 */
export function isYoungBand(levels) {
  const ls = Array.isArray(levels) ? levels : levels == null ? [] : [levels];
  return ls.some((l) => YOUNG_BAND_RE.test(String(l)));
}

/**
 * The half-ice view a young board must render, whatever it asked for.
 * @param {{view?: string, zone?: string}} stage
 * @returns {"left"|"right"}
 */
export function halfIceView(stage) {
  const v = stage && typeof stage.view === "string" ? stage.view : "";
  if (v === "left" || v === "right") return v;
  // A young board that asked for "full" or "neutral" (or forgot `view`
  // entirely) is still never shown a full sheet. Fall back to the end its own
  // zone names, and to the attack end when even that is missing — "right" is
  // the attacking end everywhere else in this frame.
  return stage && stage.zone === "def-zone" ? "left" : "right";
}

/**
 * The rink props a board renders with, given its age bands. The single entry
 * point: RinkStage and the test both call this, so what the test asserts is
 * literally what the app draws.
 *
 * @param {{view?: string, zone?: string}} stage
 * @param {string[]|string} levels
 * @returns {{young: boolean, view: string, hideZoneLines: boolean}}
 */
export function rinkRenderFor(stage, levels) {
  const young = isYoungBand(levels);
  const requested = stage && typeof stage.view === "string" ? stage.view : "full";
  return {
    young,
    view: young ? halfIceView(stage) : requested,
    hideZoneLines: young,
  };
}
