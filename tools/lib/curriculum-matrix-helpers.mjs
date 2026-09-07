// Pure helpers for tools/build-full-curriculum-matrix.mjs. Kept separate so
// tools/build-full-curriculum-matrix.test.mjs can unit-test the classification
// rules without composing every catalog.

// Context/zone signal: rink-area keywords over whatever text a catalog
// exposes (tags/topic/family/objective/cat/themes/stage.zone/prompt). This is
// a text signal, same caveat as the domain matcher -- 'unknown' when no
// keyword is present rather than guessing.
const ZONE_RULES = [
  { id: 'offensive-zone', tokens: ['offensive zone', 'offensive-zone', 'oz', 'attacking zone', 'net front', 'slot', 'cycle'] },
  { id: 'defensive-zone', tokens: ['defensive zone', 'defensive-zone', 'dz', 'own zone', 'breakout', 'behind the net'] },
  { id: 'neutral-zone', tokens: ['neutral zone', 'neutral-zone', 'nz', 'regroup', 'centre ice', 'center ice'] },
  { id: 'wall-boards', tokens: ['boards', 'half-wall', 'half wall', 'corner', 'wall'] },
  { id: 'rush-transition', tokens: ['rush', 'odd-man', 'odd man', 'transition', 'breakaway'] },
];

export function contextZoneForText(text) {
  const haystack = String(text || '').toLowerCase();
  const match = ZONE_RULES.find(rule => rule.tokens.some(token => haystack.includes(token)));
  return match ? match.id : 'unknown';
}

// Cognitive-demand rule, stated explicitly (no ledger equivalent exists yet):
//   - 'explain' type -> analyze (asks the learner to justify/compare in prose)
//   - 'position' type -> apply-spatial (place/move under the current freeze)
//   - 'sequence' type -> apply-sequence (order steps under the current freeze)
//   - 'choice'/'multi' with basis:'scene' -> recall (one visible fact)
//   - 'choice'/'multi' with basis:'coaching' -> apply, upgraded to
//     analyze-changed-cue when the changed-cue rule (see
//     curriculum-changed-cue.mjs) confirms the prompt narrates a state change
//     AND asks for an updated read.
//   - anything else / missing type -> unknown
export function cognitiveDemandFor({ type, basis, changedCueGenuine }) {
  if (type === 'explain') return 'analyze';
  if (type === 'position') return 'apply-spatial';
  if (type === 'sequence') return 'apply-sequence';
  if (type === 'choice' || type === 'multi') {
    if (basis === 'scene') return 'recall';
    if (changedCueGenuine) return 'analyze-changed-cue';
    if (basis === 'coaching') return 'apply';
    return 'unknown';
  }
  // Legacy-bank / seed / pov type codes.
  if (type === 'mc') return basis === 'scene' ? 'recall' : (changedCueGenuine ? 'analyze-changed-cue' : 'apply');
  if (type === 'tf') return 'recall';
  if (type === 'mistake') return 'analyze';
  if (type === 'next' || type === 'seq') return 'apply-sequence';
  return 'unknown';
}

export function evidenceStrength({ mappingMethod, hasObjective, hasSource, reviewStatus }) {
  if (mappingMethod === 'explicit-nodeId-binding' || mappingMethod === 'explicit-scene-binding') {
    if (hasObjective && (hasSource || reviewStatus !== 'not-in-review-pipeline')) return 'high';
    return 'medium';
  }
  if (mappingMethod === 'keyword-signal-match') return 'low';
  return 'unknown';
}
