# Question-Kind Engine — Cycle 1 Design

Date: 2026-07-08
Status: DRAFT — awaiting owner approval
Branch context: feature/shareable-beta

Research basis: `docs/research/2026-07-08-question-engine-research.md` (verified
evidence + mechanic menu), `docs/research/2026-07-08-mvp-engine-gaps.md` (engine
gap analysis). Owner picks locked 2026-07-08: predict-next, verdict, spatial
answers, spot-the-mistake; build order kinds → arcade → young-age.

---

## 1. Goal

Take the animated play kernel (one loop: animate → freeze → ask → consequence,
12 plays, 6 scenario families) from one question shape to five, at U11/U13,
without changing how plays are authored or breaking the factory's safety gates.

**Success criteria**

- All 5 kinds render correctly at U11 and U13 from declarative play data alone.
- Every existing play still passes every existing check unchanged (kind defaults
  to today's behavior).
- The factory can validate, telemetry-snapshot, family-report, and bulk-gate a
  play of any kind; a play with an unknown or malformed kind fails validation,
  never renders broken.
- At least one authored play per new kind ships as proof (verdict items may be
  recycled from existing wrong branches).

**Non-goals (later cycles):** arcade modes and timers (Cycle 2), DRAG/timing
mini-games (Cycle 3), mascot/sound/parent cards (Cycle 4), U7/U9 or U15/U18
rollout of the new kinds, spaced-repetition scheduling.

---

## 2. Kind registry

New module `src/play/questionKinds.js`, the single source of truth:

```js
export const QUESTION_KINDS = {
  "read-mc":      { playback: "freeze",      answer: "buttons",   reveal: "consequence" },
  "lane-pick":    { playback: "freeze",      answer: "rink-zones", reveal: "consequence" },
  "predict-next": { playback: "occlusion",   answer: "buttons",   reveal: "truth" },
  "verdict":      { playback: "watch-full",  answer: "buttons",   reveal: "coaching", justify: true },
  "spot-mistake": { playback: "watch-full",  answer: "rink-actors", reveal: "rewind-highlight" },
};
```

- `ask.kind` is optional on play data; missing kind = `"read-mc"` (or
  `"lane-pick"` when `choiceMode: "lane-pick"` is present, for back-compat).
  `choiceMode` is deprecated in favor of `kind` but keeps working.
- The renderer (`AnimatedPlay.jsx`) branches on the registry's three contracts:
  **playback** (what runs before the question), **answer** (how the player
  responds), **reveal** (what runs after).
- `validateAnimatedPlay.js` rejects unknown kinds and kind/data mismatches
  (e.g. `lane-pick` without zones, `predict-next` without `truthNext`).

## 3. Watch-chain primitive

Nodes gain `autoNext: { next: "<nodeId>", ms: <duration> }`. A watch node plays
its motions/positions with no question, then advances automatically. Rules:

- A watch chain is 1-3 nodes ending in an `ask` node or a terminal.
- The existing per-node animation cycle (enter → motion → settle) is reused;
  only the advance trigger is new.
- A skip affordance ("Skip to the question") appears after the first full play
  of the chain at U13; U11 always watches once through.

This is the only new engine primitive in Cycle 1. Verdict and spot-mistake sit
on it; Cycle 2 arcade consequence playback reuses it.

## 4. The four new kinds

### 4.1 predict-next (U13 first, U11 after telemetry review)

- Play freezes at an occlusion point chosen so the correct continuation is
  objective (Animation Runway Rule applies).
- `ask.truthNext` names the node holding the true continuation. ALL options
  route there; the option chosen is recorded, then the truth plays.
- Reveal frame is informational, never punitive: "You predicted X. Watch what
  actually happens." A new **Prediction Reveal Rule** goes into
  `docs/play-kernel-standards.md`: wrong predictions are information; no
  red-flash, no "wrong" framing; the option's `why` copy explains the cue that
  signaled the true outcome.
- Evidence anchor: temporal occlusion training, d = 1.21 with field transfer
  (research report §2, VERIFIED).

### 4.2 verdict (+ justify) (U11: 2 options; U13: 3 options)

- Watch chain shows a complete play, including the read the skater made.
- Question 1: judge the read. U11 options: "Right read" / "Better option was
  there". U13 adds "Right idea, wrong timing".
- Question 2 (justify): pick WHY from 2-3 evidence statements, each anchored to
  something visible on the rink (defender commitment, lane state, goalie
  position). No abstract options.
- Content source: each existing play's authored wrong branches (`no`, `outcome`,
  wrong-path terminal nodes) become verdict items — the watched play IS the
  wrong path, and the existing coaching copy becomes the justify evidence.
- New **Verdict Voice Rule** in the standards doc: judge the read, never the
  player. Copy says "the read" / "the play", never "you were wrong". Growth
  voice per existing brand rules.

### 4.3 spatial answers (lane-pick promoted to U11/U13)

- Remove the `profile.token === "figure"` gate in `AnimatedPlay.jsx` (line
  ~350); render zones whenever `kind: "lane-pick"` (or legacy `choiceMode`).
- Zone styling per band: U11/U13 zones use the gold token aesthetic (smaller
  radius, numbered ring per Freeze Marker Rule) instead of the U7/U9 playground
  style. Text options remain rendered below the rink as an accessible fallback,
  per the existing standards (Young Player Interaction Rule already requires
  this backup — extend the same wording to U11/U13).
- Evidence anchor: action-response transfer ES 0.87 vs verbal 0.41 (research
  report §2 #8, VERIFIED with CI caveat).

### 4.4 spot-mistake (U11/U13)

- Watch chain plays a play containing exactly ONE wrong read.
- Answer contract `rink-actors`: tappable hit zones on actors (and optionally a
  moment marker), not text buttons. Tap the actor who made the wrong read.
- Reveal `rewind-highlight`: the chain rewinds to the mistake moment, freezes,
  and highlights the cue that was missed, with coaching copy.
- New **One Defensible Mistake Rule** in the standards doc: a spot-mistake play
  must have exactly one wrong read that a coach would flag; every other actor's
  behavior must be defensibly correct. The validator enforces the data shape
  (exactly one `mistakeActor` + `mistakeNode`); the judgment call stays in
  manual playtest, which is why this kind ships last in the cycle.
- Precedent: the static bank's 16 `mistake` questions pre-validate the pedagogy.

## 5. Age gating

`interactionProfiles.js` gains `kinds`: an ordered list of available kinds per
band. Cycle 1 values:

| Band | kinds |
|---|---|
| U7/U9 | read-mc, lane-pick (unchanged behavior) |
| U11 | read-mc, lane-pick, verdict, spot-mistake |
| U13 | read-mc, lane-pick, verdict, spot-mistake, predict-next |
| U15/U18 | all (renders with film-room styling; no new work beyond not-crashing) |

A play whose `ask.kind` is unavailable for the viewer's band falls back to
`read-mc` presentation when the data supports it (options exist), otherwise the
play is filtered out of that band's rotation. The validator warns when a play's
`ageBands` include a band that can't render its kind.

## 6. Factory integration

Every factory gate learns about kinds:

- **Validators** (`validateAnimatedPlay.js`, `validateFactoryStandards.js`):
  registry membership, kind/data contracts, One Defensible Mistake shape,
  `truthNext` reachability, watch-chain length 1-3, justify options anchored
  (each has an `evidence` field naming an actor or motion).
- **Telemetry** (`prototypeTelemetry.js`): snapshots gain `kind`, and per-kind
  fields (chosen prediction vs truth, verdict + justify pair, tapped actor).
  Question signatures change when any player-facing kind field changes.
- **Family reports** (`playFamilies.js` / report script): per-family kind
  coverage ("two_on_one: 8 plays — 6 read-mc, 1 verdict, 1 predict-next"), and
  a warning when a family at target variant count has fewer than 2 kinds.
- **Next-variant queue**: recommendations name a kind, chosen from family gaps
  (the format field it already emits maps onto kinds).
- **Bulk gate** (`check:bulk`): batch cap stays at 3; the batch template gains a
  kind column; manual playtest checklist gains per-kind items (occlusion point
  objective? exactly one defensible mistake? justify evidence visible?).
- **Standards doc**: adds Prediction Reveal Rule, Verdict Voice Rule, One
  Defensible Mistake Rule, Watch Chain Rule (skip affordance, 1-3 nodes).

## 7. Build order within Cycle 1

1. Kind registry + back-compat defaulting + validator membership checks. All
   existing tests green with zero play-data changes.
2. Spatial answers (gate removal + band styling) — smallest new surface, proves
   the registry.
3. Watch-chain primitive + its validator/telemetry support.
4. Verdict + justify, with 2-3 items recycled from existing wrong branches.
5. Predict-next, with 1-2 authored occlusion variants from the next-variant
   queue's existing backlog.
6. Spot-mistake, last (authoring-judgment risk), 1 proof play.
7. Standards doc + reports + bulk-batch template updates land with each step,
   not as a final documentation pass.

Each step is separately commit-able and keeps `npm run check:bulk` green.

## 8. Risks

- **Ambiguous spot-mistake items** — mitigated by the One Defensible Mistake
  Rule + shipping it last + manual playtest gate. If items still play
  ambiguous, the kind stays factory-locked (no bulk production) without
  blocking the other kinds.
- **Verdict recycling produces stilted copy** — wrong-branch text was written as
  answer feedback, not narration. Budget a copy pass per recycled item; the
  telemetry signature will catch silent drift.
- **Watch chains bore U11s** — chains capped at 3 nodes; skip affordance at
  U13; telemetry logs watch-time so Cycle 2 can tune.
- **Kind sprawl in the factory** — the registry is the only place a kind can be
  born; validators reject anything not in it. New kinds require a standards-doc
  entry by rule.

## 9. Testing

- Extend `test:play-tokens` / `test:prototype-telemetry` /
  `test:scenario-families` fixtures to cover one play per kind at U11 + U13.
- New contract tests per kind in the existing script style
  (`scripts/test-question-kinds.mjs`): registry completeness, back-compat
  defaulting, validator rejections (unknown kind, missing truthNext, two
  mistakes, unanchored justify).
- Manual playtest doc per kind (`docs/manual-playtest/`) before its factory
  gate opens, same as today's batch process.
