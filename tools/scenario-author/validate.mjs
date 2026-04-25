// Validation pass for a freshly-authored scenario. Wraps the engine's
// own validateScenario + runs the registered scorer with the LLM-declared
// "correct" answer as the user input — if the scorer disagrees, the
// scenario is internally inconsistent and we reject it.

import { validateScenario } from "../../src/scenario/schema.js";
import { resolveTarget } from "../../src/scenario/zones.js";
import { scorePath } from "../../src/scenario/primitives/path-scorer.js";

export function lintScenario(scenario) {
  const v = validateScenario(scenario);
  if (!v.ok) return { ok: false, errs: v.errs, warns: v.warns };

  // Self-test: simulate a "perfect" user answer and confirm the scorer
  // agrees. Currently only the path primitive is implemented, so this
  // only fires when interaction.kind === "path".
  if (scenario.interaction.kind === "path") {
    const fromActor = scenario.actors.find(a => a.id === scenario.interaction.from);
    if (!fromActor) {
      return { ok: false, errs: [`interaction.from "${scenario.interaction.from}" not found in actors`], warns: v.warns };
    }
    const target = resolveTarget(scenario.correct.end);
    const userPath = [
      { x: fromActor.x, y: fromActor.y },
      { x: target.x, y: target.y },
    ];
    const defenders = scenario.actors
      .filter(a => a.kind === "defender")
      .map(a => ({ id: a.id, x: a.x, y: a.y }));
    const result = scorePath(userPath, scenario.correct, { defenders });
    if (!result.ok) {
      return {
        ok: false,
        errs: [`scorer self-test failed: reason=${result.reason} — the LLM-declared correct answer doesn't actually score as correct`],
        warns: v.warns,
      };
    }
  }

  return { ok: true, errs: [], warns: v.warns };
}
