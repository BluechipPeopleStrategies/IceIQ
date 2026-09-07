// Gate 8 -- Claude hockey/pedagogy judgment. Fixed, versioned rubric text and
// prompt builder, following the same pattern gate 5 (Semantic Sibling Review)
// already established: a fixed rubric embedded verbatim into every judgment
// call, hashed into the judgment record, never re-worded per-call.
//
// Scope, per the canonical spec's gate order:
//   "8. Claude judgment: hockey accuracy, ambiguity, pedagogy, and
//    adversarial failure modes pass."
// (docs/superpowers/specs/2026-07-29-scenario-engine-design.md)
//
// This module does not decide HOW gate 8 is invoked (attended-session-only,
// per framework-fit decision 8) or what happens after a verdict -- see
// gate8BlindSecondPass.js for the two-pass combination rule this rubric feeds.
//
// docs/superpowers/specs/2026-07-30-tactical-judgment-trust-design.md,
// Priority 1.

export const RUBRIC_VERSION = "gate8-hockey-judgment-v1";

// Embedded verbatim from docs/scenario-family-standards.md, the same source
// gate 5's rubric quotes from -- one governing standard for both gates, not
// two independently-drifting copies.
export const DECISION_TRAINING_PRINCIPLES = `- Constrain first, don't open first. The base read must be a single, clearly-forced decision -- not an ambiguous "many things could be right" situation.
- Constraint-openness is its own axis, separate from difficulty. A family's variants should progress from a tightly-forced read toward a genuinely more open one -- not just accumulate cue variety at the same openness level.
- Every rep looks like the game. No isolated concept labels -- only live animated decisions.
- Mistakes are data. Wrong-answer feedback must explain the mechanism (why the chosen option fails, in hockey terms), never just mark it incorrect.`;

export const VARIANT_RULES = `Good variant changes: defender steps up vs holds middle; backchecker is closing vs not closing; goalie is square vs late to slide; support teammate is high vs flat; puck carrier has space vs pressure; teammate takes puck vs does not take puck.
Weak variant changes: moving tokens slightly without changing the read; changing labels only; asking the same question with different wording; adding a second question without a new visible cue.`;

const SYSTEM_PROMPT = `You are gate 8 of the RinkReads scenario engine: the hockey accuracy, ambiguity, pedagogy, and adversarial-failure-modes judge. This candidate has already passed physics validation (every skating path, pass, and lane geometry is confirmed physically legal) and the tactical-invariant/novelty gates -- you are not re-checking whether the play is physically possible. You are checking whether it is hockey-correct and well-taught.

Governing standard (docs/scenario-family-standards.md, quoted verbatim -- apply exactly, do not paraphrase your own version):

${DECISION_TRAINING_PRINCIPLES}

${VARIANT_RULES}

Judge across exactly four dimensions:

1. HOCKEY ACCURACY -- Is the declared correct answer actually the tactically correct read, per real hockey principles? Is every wrong-answer explanation ("no"/"why") factually accurate about what actually fails and why?
2. AMBIGUITY -- Is there genuinely one forced best read (per "Constrain first"), or could a skilled, honest hockey coach defend a different answer as equally or more correct? Name the alternative if one exists.
3. PEDAGOGY -- Does this scenario actually teach the stated concept well? Does every wrong-answer explanation state the mechanism (why it fails in hockey terms), not just that it's wrong?
4. ADVERSARIAL FAILURE MODES -- Could a player reach the correct answer for the WRONG reason -- guessing via elimination, exploiting a UI/visual pattern (e.g. the correct option's icon, position, or phrasing standing out), or any cue that leaks the answer before the read is actually made?

Be a real, skeptical judge, not a rubber stamp. A candidate with a clean read across all four dimensions is rare, not the default expectation.`;

export function buildJudgmentPrompt(play) {
  const playJson = JSON.stringify(play, null, 2);
  return {
    rubricVersion: RUBRIC_VERSION,
    system: SYSTEM_PROMPT,
    user: `Judge this RinkReads play against all four dimensions above.\n\nPLAY DATA:\n${playJson}\n\nReturn your verdict in the required schema. Quote the exact field/text you're referencing when you flag an issue -- do not describe a problem you can't point to in the data above.`,
  };
}
