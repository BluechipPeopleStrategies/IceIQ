# Judgment Questions & the Coaching-Tradition Panel

**Date:** 2026-06-11
**Status:** Design (extends the formation factory; pairs with the value model)

## Context — why this exists

Clean reads (the formation factory) have **one** geometrically-best answer and are
fully deterministic — zero AI. But the highest hockey IQ lives in **judgment**
reads: dump vs. carry, shoot vs. pass, step up vs. contain — where several plays
are defensible and the "best" depends on context and coaching philosophy. These
are exactly where non-deterministic AI adds the most, and where a single "right
answer" is actually *wrong content*.

**Key realization:** judgment questions are a **separate content stream**, not a
by-product of formations. Formations are built to be unambiguous (cardinality 1),
so the value-model router rarely flags them. Judgment scenarios are *authored* by
the panel. The value model's cardinality is a **detector/router**, not the source.

**The differentiator:** your curriculum ledger already encodes **5 sourced
development traditions** (Hockey Canada, USA ADM, Tarasov/Soviet, Swedish,
Finnish). They become the panel. Judgment questions teach *the spectrum of expert
thought* — something no other youth-hockey app does.

## Two-stream model

```
Stream 1 — Clean questions:    formation factory → cardinality 1 → ship (zero AI)
Stream 2 — Judgment questions: nuanced scenario → coaching-tradition PANEL (batch)
                               → tiered answers + reasoning → coach sign-off → ship
Router: the value model tags any scenario with cardinality >1 (options within
        margin) as `judgment` — these get the panel instead of failing the gate.
```

## How the panel sees the scenario (this is the point)

The panel reviews the **actual rendered diagram** — the same board a kid sees, not
an abstraction. Each panelist gets **two inputs**:
1. **The rendered board image** (`board-svg` → PNG, the existing QC pipeline) —
   read with **vision**, so the coach judges the real positions and spacing.
2. **The structured data** — exact coordinates, puck carrier, candidate options,
   and the value-model ranking — so it reasons about the picture *with perfect
   knowledge of the geometry* (never has to guess "is that defender goal-side?").

This is the same self-QC pass already done by hand (Read the rendered grid →
evaluate), formalized across coaching lenses. The gauntlet already proves text
models can read a board (`ascii-rink.mjs` + the spatial/proxemics lens); vision on
the PNG makes it sharper. Every scenario is rendered first, then judged.

## Panel composition

- **Tradition coaches (4–5, the core):** one persona per ledger model — Canadian
  (structure/percentage play), American/ADM (small-area creativity), Tarasov
  (deception/skill), Swedish (scan/delay), Finnish (individual skill). Agreement →
  clean; split → the teaching content (who favors what, and why).
- **Position lenses (2–3):** forward / defense / goalie read the same play
  differently.
- **Adversary (1):** steelmans the unpopular option — is a "wrong" answer truly
  wrong, or just unfashionable? (mirrors the gauntlet's antagonistic lens.)
- **Age advocate (1):** answers the scenario **per age band** (U11 plays it safe;
  U15 can attempt the skilled option).
- **Head coach (synthesizer):** reconciles into the tiered answer + the "it
  depends" + a consensus level.

Cost control: panelists can be **personas of one model** in a single batched call
(cheap) or split across external free-tier models. Runs **only** on judgment
scenarios, **batch**, stored, served free.

## What the panel produces — the judgment-question schema

Extends a scenario with:
```jsonc
{
  "judgment": true,
  "options": [
    { "id": "carry", "tier": "best|acceptable|risky|wrong",
      "rationale": "…", "traditions": ["swedish","adm"], "positionView": "forward" },
    …
  ],
  "dependsOn": ["score", "time-left", "backchecker", "your-skill"],
  "consensus": { "level": "strong|split", "note": "Canadian vs Tarasov disagree" },
  "ageAnswers": { "U11": "dump", "U13": "carry", "U15": "carry" },
  "feedback": { "best": "…", "acceptable": "defensible, but…", "wrong": "…" },
  "realismFlag": null
}
```
Distractor quality and a realism red-flag are checked before ship.

## Integration with what exists

- **Deterministic rules still gate coherence** — offsides, goal-side, overlap,
  curriculum alignment all apply. The panel supplies *judgment*; rules supply the
  *correctness floor*.
- **Value gate** — judgment questions skip the strict single-best assertion;
  instead the panel's `tier` set is the answer key (`expectCorrect` = count of
  best/acceptable). The value model's ranking still informs the tiers.
- **Coach sign-off (Slice 3)** — judgment questions have no geometric ground
  truth, so the human coach validates the panel's call here. The contact sheet
  shows the dissent map + consensus level so the coach reviews the *reasoning*.
- **Curriculum** — judgment questions tag to decision-making / hockey-sense
  nodes; `ageAnswers` carries the age calibration.
- **Self-improvement** — when the coach overrides the panel, that override is a
  lesson: if it's a general truth → a new validator rule; if it's calibration →
  tune the panel prompt.

## Cost posture (fits normal plans)
- Routed only to the judgment subset (~20%); batch; amortized across all users;
  served deterministically. Tradition panel can run on free-tier external models.

## Build slices
1. **Router + schema (zero-token):** value-model cardinality >1 → tag
   `judgment: true` instead of failing the gate; define + validate the
   tiered-answer JSON shape; a `judgment` flavour in the validators/golden tests.
2. **Panel harness (bounded AI):** batch-run the tradition panel on judgment
   scenarios → tiered answers + dissent + dependsOn + age calibration; park for
   coach sign-off.
3. **Render + serve:** app renders judgment questions with tiered feedback and
   the "it depends" teaching layer; scoring accepts best/acceptable.
4. **Sign-off surface:** contact sheet shows dissent map + consensus for the
   coach to validate; overrides feed the self-improvement loop.

## Verification
- Router: a hand-built ambiguous scenario (two options within margin) gets tagged
  `judgment: true`, not failed; a clean one stays cardinality 1.
- Schema: a sample judgment question validates (tiers present, ageAnswers cover
  the node's ages, ≥1 best).
- Panel (slice 2): on a known dump-vs-carry scenario, the panel returns a split
  with tradition-tagged rationales; coherence rules still pass.
