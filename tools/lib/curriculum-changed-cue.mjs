// Explicit rule for classifying a "changed-cue" reasoning question, written
// for docs/factory/claude-ten-hour-project Task B (2026-09-07) to replace the
// prior return's "Imagine/Suppose" keyword count, which the assignment
// itself flags as "a language statistic, not evidence of reasoning depth."
//
// RULE (stated once, applied everywhere): a question is a genuine
// changed-cue reasoning question only if its prompt does BOTH of:
//   (1) STATE-CHANGE -- it hypothesizes or narrates a concrete change to the
//       scene's actors or puck relative to the base freeze (a named actor
//       moving/turning/gaining or losing the puck), via an explicit
//       hypothetical opener ("Imagine", "Suppose", "If <actor> ...") or a
//       declarative narration of an event after the freeze ("D1 turns...",
//       "F1 carries farther...").
//   (2) READ-UPDATE -- it asks the learner to revise, reconsider or re-derive
//       a tactical read/decision in light of that change (reconsider,
//       reassess, revisit, "what changes/becomes an option", "what should
//       you check/update/confirm now", "which option deserves a new look",
//       "how does your approach change"), rather than asking a plain fact
//       about the base freeze, a communication-wording question with no
//       narrated change, or a placement instruction.
//
// EXCLUDED even when a hypothetical marker word is present:
//   - "position" type "Move YOU..." placement instructions (they are base-
//     freeze spatial tasks, not reasoning about a stated change).
//   - "sequence" type "Arrange/Order this..." continuation-planning prompts.
//   - basis:'scene' fact questions about an event already fixed in the
//     picture ("What has changed the task even though the puck remains
//     loose?") -- these have one objectively correct answer from the drawn
//     freeze, not open reasoning about a hypothetical continuation.
//   - "explain the value of your movement even if X never happens" prompts
//     -- these test off-puck value independent of a stated new state, a
//     different (adjacent) skill, not a changed-cue update.
//
// This automated pattern is necessarily approximate. For U11 in the
// experimental bank the assignment specifically asks to recheck, every one
// of the 400 questions was read by hand and the true/false calls below in
// U11_MANUAL_VERIFICATION are the authoritative source; the regex is kept
// only as a documented, re-runnable approximation for the other five age
// bands and other catalogs, where no manual read was performed (see
// TASK-B-SUMMARY.md "sampled vs exhaustive" disclosure).

const STATE_CHANGE = /\b(imagine|suppose)\b/i;
const CONDITIONAL_ACTOR_CHANGE = /\bif\b[^.?!]*\b(d1|d2|f1|f2|c\b|gold|navy|goalie|pass|puck)\b/i;
const NARRATED_ACTOR_CHANGE = /\b(d1|d2|f1|f2|c|gold|navy|goalie)\s+(turns?|moves?|steps?|carries?|cuts?|wins?|regains?|gains?|closes?|releases?|drifts?|reaches?|slows?|drops?)\b/i;
const READ_UPDATE = /\b(reconsider|reassess|revisit|what (would|should).*(reconsider|reassess|revisit|update|change|check|confirm|discuss)|what (changes?|has changed|becomes an option|would help)|which (option|update|carrier|reception).*(new look|matches|fits)|approach change|what do you (do next|re-?read)|changed (cue|reception)|updated? job|new job|what should update|what update|which update|update your read|how should your approach change|what is worth checking|useful next check)\b/i;

const EXCLUDE_PLACEMENT = q => q.type === 'position' && /^move\s+/i.test((q.prompt || '').trim());
const EXCLUDE_SEQUENCE = q => q.type === 'sequence' && /^(arrange|order)\s+this\b/i.test((q.prompt || '').trim());
const EXCLUDE_SCENE_FACT = q => q.basis === 'scene' && /^what has changed\b/i.test((q.prompt || '').trim());
const EXCLUDE_VALUE_REGARDLESS = q => /explain the value of your movement|might your movement accomplish even if|can help f1 even if/i.test(q.prompt || '');

export function hasNarratedStateChange(prompt) {
  return STATE_CHANGE.test(prompt) || CONDITIONAL_ACTOR_CHANGE.test(prompt) || NARRATED_ACTOR_CHANGE.test(prompt);
}
export function hasReadUpdateAsk(prompt) {
  return READ_UPDATE.test(prompt);
}

// q: { type, basis, prompt }. Returns { genuine, change, update } -- an
// automated best-effort application of the rule above.
export function classifyChangedCue(q) {
  if (EXCLUDE_PLACEMENT(q) || EXCLUDE_SEQUENCE(q) || EXCLUDE_SCENE_FACT(q) || EXCLUDE_VALUE_REGARDLESS(q)) {
    return { genuine: false, change: false, update: false, excludedBy: 'explicit-exclusion-rule' };
  }
  const change = hasNarratedStateChange(q.prompt || '');
  const update = hasReadUpdateAsk(q.prompt || '');
  return { genuine: change && update, change, update, excludedBy: null };
}

// Authoritative hand-verification for U11 in the experimental bank (all 400
// U11 questions read once each on 2026-09-07 against the rule above; every ID
// below overrides the automated regex result for that one question because
// the regex either under- or over-matched idiomatic phrasing the rule still
// covers in spirit). Genuine = true means a human read confirmed both
// STATE-CHANGE and READ-UPDATE are actually present; false means a human read
// rejected it even though a keyword matched.
export const U11_MANUAL_VERIFICATION = {
  'exp26-u11-001-q8': true, 'exp26-u11-001-q10': true, 'exp26-u11-002-q5': true,
  'exp26-u11-002-q7': false, 'exp26-u11-002-q10': true, 'exp26-u11-003-q5': true,
  'exp26-u11-003-q10': false, 'exp26-u11-004-q5': true, 'exp26-u11-004-q6': false,
  'exp26-u11-004-q10': true, 'exp26-u11-005-q5': true, 'exp26-u11-005-q10': true,
  'exp26-u11-006-q5': true, 'exp26-u11-006-q10': true, 'exp26-u11-008-q9': false,
  'exp26-u11-008-q10': true, 'exp26-u11-009-q5': true, 'exp26-u11-010-q5': true,
  'exp26-u11-011-q5': true, 'exp26-u11-011-q10': true, 'exp26-u11-012-q5': true,
  'exp26-u11-012-q10': true, 'exp26-u11-013-q7': true, 'exp26-u11-014-q5': true,
  'exp26-u11-014-q8': false, 'exp26-u11-015-q5': true, 'exp26-u11-016-q5': true,
  'exp26-u11-016-q10': true, 'exp26-u11-017-q5': true, 'exp26-u11-017-q10': true,
  'exp26-u11-018-q5': true, 'exp26-u11-019-q5': true, 'exp26-u11-019-q7': true,
  'exp26-u11-019-q10': true, 'exp26-u11-020-q2': false, 'exp26-u11-020-q10': true,
  'exp26-u11-021-q5': true, 'exp26-u11-022-q4': false, 'exp26-u11-022-q5': true,
  'exp26-u11-023-q2': false, 'exp26-u11-023-q5': true, 'exp26-u11-023-q10': true,
  'exp26-u11-024-q5': true, 'exp26-u11-025-q1': false, 'exp26-u11-025-q5': true,
  'exp26b-u11-001-q5': true, 'exp26b-u11-001-q6': true, 'exp26b-u11-002-q1': false,
  'exp26b-u11-002-q5': true, 'exp26b-u11-003-q5': true, 'exp26b-u11-003-q6': false,
  'exp26b-u11-005-q5': true, 'exp26b-u11-006-q5': true, 'exp26b-u11-008-q5': true,
  'exp26b-u11-009-q5': true, 'exp26b-u11-013-q5': true, 'exp26b-u11-014-q5': true,
  'exp26b-u11-015-q5': true, 'exp26b-u11-016-q5': true, 'exp26b-u11-017-q5': true,
  'exp26b-u11-018-q5': true, 'exp26b-u11-019-q5': true, 'exp26b-u11-020-q5': true,
  'exp26b-u11-023-q5': true,
};
