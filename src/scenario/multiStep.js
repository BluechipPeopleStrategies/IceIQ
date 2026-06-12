// Multi-step scenario support. A scenario MAY carry a steps[] array (each entry
// a full frame: actors / interaction / correct / feedback / outcome). The whole
// design rests on one idea: each step is validated and rendered as a synthetic
// FLAT scenario (top-level fields + the step's fields, minus steps), so all the
// existing single-step machinery is reused per frame. A flat scenario is a
// one-step play. This module is pure (no React) so it is unit-testable.

// The steps of a scenario: its steps[] if present, else the flat scenario as one step.
export function normalizeSteps(scenario) {
  if (Array.isArray(scenario.steps) && scenario.steps.length) return scenario.steps;
  const { actors, interaction, correct, feedback, tip, why } = scenario;
  return [{ actors, interaction, correct, feedback, tip, why }];
}

// Build the synthetic flat scenario for step i: top-level fields (minus steps)
// overlaid with the step's own fields. Used by validation, lint, and the player.
export function stepToScenario(scenario, i) {
  const step = normalizeSteps(scenario)[i];
  const { steps, ...top } = scenario;
  return { ...top, ...step };
}

// ---- progression state machine (immutable; each fn returns a new state) ----
export function start(scenario) {
  return { scenario, steps: normalizeSteps(scenario), index: 0, results: [] };
}
export function currentStep(state) { return state.steps[state.index]; }
export function record(state, result) {
  const results = state.results.slice();
  results[state.index] = result;
  return { ...state, results };
}
export function next(state) { return { ...state, index: state.index + 1 }; }
export function isComplete(state) { return state.index >= state.steps.length; }
export function summary(state) {
  const perStep = state.steps.map((_, i) => !!(state.results[i] && state.results[i].ok));
  return { total: state.steps.length, correct: perStep.filter(Boolean).length, perStep };
}
