# Gauntlet v2 — Head Coach, Expert-Keyer, and the Ship-Readiness Loop

**Status:** design, ready for review · **Date:** 2026-06-04
**Extends:** `docs/factory/SPEC.md` §15 (THE GAUNTLET) — this does not replace it, it revises it.
**Goal:** close the gaps between "good content engine" and "cutting-edge adaptive app" (Duolingo-grade), by (a) giving the coach panel a head coach who decides, (b) covering concepts the geometry solver can't key, and (c) closing the loop after ship so the bank self-corrects from real learner data.

---

## 1. Why this exists

The G0–G9 gauntlet in `SPEC.md` is most of the way there. This design closes six gaps, ordered by how much they separate a good content engine from a cutting-edge adaptive app:

1. **No empirical difficulty + no post-ship feedback loop.** The gauntlet ends at ship. Nothing watches live items and pulls the duds; difficulty is age-band only, not measured. *(biggest gap)*
2. **Distractors aren't tied to misconceptions.** Wrong options score "lower" but aren't *specific, teachable wrong reads*. Wrong answers should be diagnostic.
3. **Solver can't key non-geometric concepts.** G1 is geometry-only. Support timing, off-puck, deception, compete won't `solve()`. "All concepts" silently shrinks to solvable ones.
4. **No learner-model-driven generation.** Generator fills the *ledger*, not *a learner's* gaps. *(backlog — depends on #1 shipping first)*
5. **Diversity filter isn't a gate.** §12's "meaningfully different?" filter isn't in the gauntlet. Near-identical items reach learners.
6. **Reading-level isn't verified.** Interaction profiles set a target; no gate checks the text hits it.

The 4th coach the gauntlet was missing: G7 (3 specialists) had **no one who reconciles them**. Three coaches disagree, then a mechanical confidence formula decides. That's how marginal items slip through and good items die to one nitpicker.

**Design principle:** add as few *new agents* as possible. Most gap-fixes are a new *responsibility* on a stage that already exists, or a deterministic gate. **Net new agents: 3** — Expert-Keyer, its corroborator, and the Head Coach.

---

## 2. The revised gauntlet

Changed/new gates are marked. Unmarked gates are unchanged from `SPEC.md` §15.

| # | Gate | Type | Change | Pass condition |
|---|------|------|--------|----------------|
| G0 | **Create (3-agent consensus)** | agents | **+misconception distractors** | All three creators agree the concept is sound and the diagram represents it. Each proposes distractors **mapped to named misconceptions** (a wrong *read*, not just a wrong option). The misconception catalog joins the curriculum ledger. |
| G1 | **Solver (extended)** | deterministic | **+kinematics** | `solve()` computes a clear best read. **Now includes kinematics vocabulary** — arrival-time, lane-viability-over-time, space-value — so support-timing / off-puck-fill are solved deterministically. Correct by construction; the LLM never decides it. Concepts it still can't key → flagged `non-geometric-residue`, route to G1b. |
| G1b | **Expert-Keyer (residue only)** ⭐NEW | agents | new | For the true residue (compete, deception, feel) where no board state decides the answer: a high-trust expert agent produces the key + justification, and **an independent second expert must corroborate** (2-of-2). No deterministic backstop produces these, so correctness requires agreement; these items lean toward human-review at G9. |
| G1c | **Veto layer** ⭐NEW | deterministic | new | Extends `validators.js`. Geometry can **reject** an expert key it contradicts (blocked passing lane, absent/keyed player not present, geometrically-refuted read) — even though it can't *produce* one. Geometry keeps the final "no" on the residue. |
| G2 | **Validation gate** | deterministic | **+misconception tags** | `validateItem()` as before, **plus** every distractor carries a distinct, non-empty `misconception` tag. |
| G3 | **Generator fit** | deterministic | — | Format is on the approved list for that age band. |
| G3.5 | **Diversity gate** ⭐NEW | deterministic | new | Promotes §12's "meaningfully different?" filter into a real gate: structural + semantic similarity vs already-shipped items for that concept/age. Too similar → drop (logged, never silent). |
| G4 | **Curriculum confirmers (2 agents)** | pedagogy | **+reading-level** | Both approve: learning-design lens + assessment-integrity lens, **plus** the text hits the age band's reading-level target (U7 ≈ no reading … U18 tactical). |
| G5 | **Render** | deterministic | — | Renders the play (figures/tokens/symbols per age, motion, overlays). |
| G6 | **Graphic designer (1 agent)** | visual | — | Improves and re-renders before the coaches: composition, legibility, spacing, brand, contrast, colorblind-safety. |
| G7 | **Coach panel (3 agents)** | hockey | — | Tactical / hockey-pedagogy / adversarial each confirm the hockey AND that the render shows the read. Each returns a verdict + notes. |
| G7.5 | **Head Coach** ⭐NEW | agent | new | **Decider + reconciler.** Expert across all ages and all concepts. Reads the 3 panel verdicts + the render + the solved/expert-keyed answer; reconciles disagreement; **sets the final composite confidence**; makes the single **GO-to-rationale / SEND-BACK** call. The accountable owner of the G7→G8 handoff. |
| G8 | **Rationale** | LLM (prose) | **+per-distractor remediation** | Writes the explanation from the solver `breakdown`, **plus** a per-distractor "why this is wrong" keyed to each misconception tag. Never overrides the answer. |
| G9 | **Ship / queue** | confidence policy | **confidence from G7.5** | Composite confidence above threshold (now set by the **Head Coach**, not a mechanical formula) AND curriculum tag present AND every gate green → auto-post. Else → human-review queue. Residue items lean to review. Batch spot-check sampling. |
| G10 | **Live telemetry loop** ⭐NEW | deterministic, post-ship | new | Reads existing `question_stats` (attempts/correct → empirical difficulty + answer-disagreement) and `question_reports` (report rate). Flags: too-easy (p > ~0.95), too-hard (p < chance), high report/disagreement → auto-route to `review_questions` / unpublish. **Writes empirical difficulty back** for the adaptive engine and (later) learner-targeted generation. |

**Rework loop (unchanged from §15):** a gate failure sends the item back with that gate's notes, reworked, re-entered — up to a cap (default 3 rounds), then human-review. Applies to the new gates too: a Head Coach SEND-BACK returns the item for further work, not out.

**Meta-backstop (extended):** the golden tests (`tools/solver-golden.mjs`) now also cover the **new kinematic solver rules** (G1). If they regress, the gauntlet pauses — the answer-key engine itself is wrong.

---

## 3. The three new agents

### G1b Expert-Keyer (+ corroborator)
- **Scope:** only `non-geometric-residue` concepts — compete-level, deception (look-off / fake), "feel." Everything kinematically reducible was triaged back into G1.
- **Contract:** expert agent returns `{ answer, justification, confidence }`. An **independent** second expert agent returns the same shape *without seeing the first's answer*. They must agree on the answer; disagreement → human-review.
- **Backstop:** G1c veto can still kill an agreed answer that geometry refutes.

### G7.5 Head Coach
- **Mandate:** decider + reconciler (confirmed). Not a tiebreaker, not a pure switch.
- **Inputs:** the 3 G7 verdicts + notes, the G6 render, the G1/G1b answer + breakdown, the curriculum tag.
- **Outputs:** `{ decision: "go" | "send-back", compositeConfidence: 0–1, reconciliationNote, sendBackTarget? }`.
- **Authority:** owns the final confidence number that G9 keys on. Reconciles split panels (e.g., one adversarial nitpick vs. two passes) rather than letting the math decide.

---

## 4. What this unlocks (and what stays backlog)

- **G10 produces *measured* difficulty.** That is the input the generator needs to target *learner* gaps (gap #4) instead of just ledger cells.
- **Learner-model-driven generation is explicitly backlog (phase 2).** It depends on G10 running long enough to accumulate data. Building it now is premature.
- **Out of scope:** engagement/motivation content generation (streak-save copy, nudges, leagues) and localization/voice A-B testing. Noted, not designed here.

---

## 5. Data sink — already exists

The telemetry loop (G10) needs almost no new plumbing. `src/supabase.js` already has:

- `question_stats` (attempts, correct per `question_id`) → `recordQuestionAnswer`, `recordQuestionAnswersBatch`, `getQuestionStats` — gives p-value (difficulty proxy) + disagreement.
- `question_reports` (user-reported duds) → `reportQuestion`, `getQuestionReports`, `resolveReport` — gives report rate.
- `question_results` (per-answer, per-player) → fuller signal for later IRT/learner-model work.
- `review_questions` (the human-review queue) → where G10 routes flagged items.

G10 is thresholds + routing over tables that already collect the data.

---

## 6. Implementation surface (where each piece lands)

- **G0 / G2 misconception tags:** generator workflow (G0 agents) + `src/scenario/validators.js` (tag validation).
- **G1 kinematics + G1c veto:** `src/playSolver.js` (new solver rules) + `src/scenario/validators.js` (veto/refutation), `tools/solver-golden.mjs` (golden coverage).
- **G1b Expert-Keyer:** generator workflow (two agent calls + agreement check).
- **G3.5 diversity gate:** generator workflow / a `tools/` step (structural + semantic dedupe vs shipped bank).
- **G4 reading-level:** folded into the existing G4 confirmer prompts.
- **G7.5 Head Coach:** generator workflow (one agent call between G7 and G8).
- **G8 remediation:** rationale stage prompt.
- **G10 telemetry loop:** a `tools/` job reading `getQuestionStats` + `getQuestionReports`, writing difficulty back + routing to `review_questions`. Scheduling per §6 of SPEC (manual `npm run` or `/schedule`; `Register-ScheduledTask` may be sandbox-blocked).

---

## 7. Build phases

1. **Head Coach (G7.5) + misconception distractors (G0/G2/G8).** Smallest, highest immediate quality lift; no new infra.
2. **Solver triage + veto (G1/G1c) + Expert-Keyer (G1b).** Unblocks non-geometric concepts; extend golden tests alongside.
3. **Diversity + reading-level gates (G3.5/G4).** Deterministic, cheap.
4. **Telemetry loop (G10).** Closes the loop; reads existing tables.
5. *(backlog)* **Learner-targeted generation** — once G10 has data.

---

## 8. Decisions locked (2026-06-04)

- **Head Coach mandate:** decider + reconciler; sets final composite confidence.
- **Scope this doc:** misconception distractors, expert-keyer, telemetry loop, diversity + reading-level gates — all in.
- **Solver backstop:** **both** — triage kinematically-reducible concepts into the solver, AND add a geometric veto layer on the residue. Shrinks the untrusted surface to compete/deception/feel only.
- **Expert residue:** 2-agent corroboration + veto; leans to human-review (not *always* human-review).
- **Learner-targeted generation:** backlog, depends on G10.
