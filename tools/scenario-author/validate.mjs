// Validation pass for a freshly-authored scenario. Wraps the engine's
// own validateScenario + runs the registered scorer with the LLM-declared
// "correct" answer as the user input — if the scorer disagrees, the
// scenario is internally inconsistent and we reject it.

import { validateScenario } from "../../src/scenario/schema.js";
import { resolveTarget } from "../../src/scenario/zones.js";
import { scorePath } from "../../src/scenario/primitives/path-scorer.js";
import { scoreSelection } from "../../src/scenario/primitives/selection-scorer.js";
import { scorePoint } from "../../src/scenario/primitives/point-scorer.js";
import { scoreSequence } from "../../src/scenario/primitives/sequence-scorer.js";

export function lintScenario(scenario) {
  const v = validateScenario(scenario);
  if (!v.ok) return { ok: false, errs: v.errs, warns: v.warns };

  // Overlap guard: two skaters sharing essentially the same spot render on top
  // of each other, so the kid can't tell who's who or which one to tap. (Pucks
  // are exempt — a puck riding its carrier is intentional and the renderer
  // nudges it to the carrier's edge.) Forces meaningful separation.
  const skaters = (scenario.actors || []).filter(a => a.kind !== "puck");
  for (let i = 0; i < skaters.length; i++) {
    for (let j = i + 1; j < skaters.length; j++) {
      const a = skaters[i], b = skaters[j];
      if (Math.abs(a.x - b.x) < 0.05 && Math.abs(a.y - b.y) < 0.05) {
        return { ok: false, warns: v.warns, errs: [
          `actors "${a.id}" and "${b.id}" overlap (within 0.05 on both axes) and will render on top of each other. ` +
          `Separate every pair of players by at least ~0.10 on one axis so each reads as distinct and tappable.`,
        ] };
      }
    }
  }

  // Self-test per primitive: simulate the LLM's own "correct" answer as
  // a user input and confirm the registered scorer grades it ok=true.
  // If the scorer disagrees the scenario is internally inconsistent.
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
  } else if (scenario.interaction.kind === "selection") {
    const result = scoreSelection(
      scenario.correct.ids,
      scenario.correct.ids,
      { ordered: scenario.interaction.order === "ordered" },
    );
    if (!result.ok) {
      return {
        ok: false,
        errs: [`selection scorer self-test failed — correct.ids isn't a valid set match`],
        warns: v.warns,
      };
    }
  } else if (scenario.interaction.kind === "point") {
    // Use the resolved target as the user's "perfect" tap.
    const target = resolveTarget(scenario.correct);
    const result = scorePoint({ x: target.x, y: target.y }, scenario.correct);
    if (!result.ok) {
      return {
        ok: false,
        errs: [`point scorer self-test failed — perfect tap doesn't grade ok=true (reason=${result.reason})`],
        warns: v.warns,
      };
    }
  } else if (scenario.interaction.kind === "sequence") {
    const result = scoreSequence(scenario.correct.ids, scenario.correct.ids);
    if (!result.ok) {
      return {
        ok: false,
        errs: [`sequence scorer self-test failed — correct.ids isn't a valid ordered match`],
        warns: v.warns,
      };
    }
  }

  return { ok: true, errs: [], warns: v.warns };
}
