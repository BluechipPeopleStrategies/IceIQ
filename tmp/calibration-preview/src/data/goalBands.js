// Which age bands set SMART goals.
//
// U7 does not. U9 is the first band that does.
//
// This mirrors selfRating.js deliberately, because it is the same call for the
// same reason. That file records: "asking a six- or eight-year-old to rank
// themselves against peers is the wrong instrument regardless of how the scale
// is worded." SMART goal setting is that instrument plus a future-time axis
// plus a self-measurement demand — strictly harder than the thing already
// removed. Protecting U7 from a five-rung scale and then handing them a
// five-field goal form is an inconsistency, not a feature.
//
// The concrete evidence, from a three-lens expert review on 2026-08-03
// (docs/manual-playtest/2026-08-03-smart-goals-expert-review.md):
//
//   - Every U7 Time-bound option was a month or longer. The proximal subgoals
//     that actually raise self-efficacy in children do not exist at that
//     horizon; distal goals perform no better than no goal at all.
//   - The U7 measurables demand proportional reasoning ("8 times out of 10"),
//     self-timing ("get up in 3 seconds"), and cross-session tallies — none of
//     which a five-year-old can do.
//   - Every one of the three U7 Teamwork measurables was independently flagged
//     by a reviewer. There was no good option to lead with, because measurement
//     itself is the wrong ask at that age.
//   - The U7 chips are the same length as the U18 chips (8.3 words vs 7.9), so
//     the real reader is a parent reading them aloud — which inverts the
//     ownership the whole mechanism depends on.
//
// The U7 content is NOT deleted. It stays in goalStarters.js so that whatever
// replaces this for the youngest band can reuse the good parts, and so the
// decision is reversible by changing one number.
//
// What U7 should get instead, when someone builds it: a one-field "Try This"
// card — a single picture-tap challenge, horizon of the next practice, and a
// binary "did you try it?" afterwards. Effort, not attainment.

export const GOAL_SETTING_MIN_BAND = 9;

// Levels look like "U11 / Atom". Anything unparseable returns false, matching
// canSelfRate: failing closed keeps a young player out of a flow that is not
// meant for them, whereas failing open puts a five-year-old in front of a
// five-field SMART form.
export function canSetGoals(level) {
  const m = /^U(\d+)/.exec(String(level || "").trim());
  if (!m) return false;
  return Number(m[1]) >= GOAL_SETTING_MIN_BAND;
}
