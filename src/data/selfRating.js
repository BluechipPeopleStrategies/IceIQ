// Which age bands self-rate.
//
// Thomas's call, 2026-08-03: U7 and U9 do not; U11 is the first band that does.
// Hockey Canada plays U7 cross-ice and U9 half-ice with no standings, and asking
// a six- or eight-year-old to rank themselves against peers is the wrong
// instrument regardless of how the scale is worded.
//
// This also removes a live defect rather than papering over it: RATING_SCALES
// had no U7 entry at all, and getSelfScale() returns [] for an unknown level, so
// a U7 player opening "Rate yourself" was shown an empty ladder with nothing to
// tap. Now the flow is simply never offered to them.
//
// Coach rating of a young player is a separate question and is unaffected.

export const SELF_RATING_MIN_BAND = 11;

// Levels look like "U11 / Atom". Anything we cannot parse returns false: failing
// closed keeps a young player out of a flow that is not meant for them, whereas
// failing open would put a seven-year-old in front of a ranking scale.
export function canSelfRate(level) {
  const m = /^U(\d+)/.exec(String(level || "").trim());
  if (!m) return false;
  return Number(m[1]) >= SELF_RATING_MIN_BAND;
}
