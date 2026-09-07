# Scenario-Family Templating — FINAL Viable Design

**Status: DESIGN document, not authorization.** Nothing in this document is approved,
scheduled, or in progress until Thomas reviews it. No code has been written or changed
to produce this document; every schema, function signature, and file path below is a
proposal for Phase 5, not a diff.

**Supersedes:** sections (b) (the existing "Task-Model + NoveltySignature" proposal)
and (c) (four-artifact-bundle reconciliation notes) of `docs/superpowers/specs/2026-07-29-scenario-family-templating-design.md`,
Deliverable B, specifically. Deliverable A (the external research) and sections (a)
(the measured 48→4 grounding numbers) and (d) (the acceptance bar) of that document
**stand, unchanged, and are the grounding this document builds on.**

Dated 2026-07-29.

---

## How this was determined

Four candidate architectures were evaluated for the one piece every prior
scenario-engine design attempt left underspecified — the mechanism that decides which
axis of a kernel's parameter space is "answer-determining" versus "decorative," and
what to do about the resulting waste (measured: RinkReads' `twoOnOneKernel.js` expands
48 candidates, only 4 survive `noveltyGate.js`, a 92% waste rate). The four candidates:

1. **Candidate 0** — Task-Model + NoveltySignature (the existing, previously-critiqued proposal)
2. **LatticeGen** — Constraint-Directed Sibling Lattice (build-time cell enumeration)
3. **Persistent Kernel Archive** — Archive-First Illumination Loop (cross-session MAP-Elites grid)
4. **Semantic Sibling Review (SSR)** — Claim-Grounded Batch Novelty Judgment

Each candidate was scored 1–5 by an independent judge on each of three lenses, with a
required viable/not-viable call and a named, specific flaw to fix:

- **Safety & Conservatism** — does the mechanism weaken the per-instance pipeline for
  even one sibling? Any family-level shortcut that lets a classification substitute
  for a per-instance correctness check is disqualifying regardless of other merits.
- **Concreteness & Implementability** — is this a real, codeable algorithm (typed
  schemas, worked examples, literal decision procedures), or named-but-undefined
  policy?
- **Fit With Measured Reality & Existing Architecture** — does it reconcile with the
  actual repo (`playFamilies.js`, `noveltyGate.js`, the real `kernel-expansion-report.md`
  numbers, the real `docs/scenario-family-standards.md`), verified by reading the real
  files, not by trusting a candidate's own claims about them?

One round of judging ran (no candidate got a second draft-and-rejudge pass). The rule
that mattered most: a disqualifying Safety-lens finding zeroes a candidate's overall
score regardless of its raw numeric average on the other two lenses — this is why
**LatticeGen**, whose raw per-lens scores (2, 5, 2) average to ~3, is reported as an
average score of **0**: its Safety-lens flaw (its mirror-symmetry rule lets a real,
user-facing sibling be produced by a live geometric transform instead of independent
construction and validation — never built, never gated) is exactly the kind of
per-instance shortcut the acceptance bar forbids outright.

Final ranking (average score, disqualification-aware):

| Candidate | Avg score | Viable on all 3 lenses? |
|---|---|---|
| Persistent Kernel Archive | 4 | **No** — failed Fit lens |
| Semantic Sibling Review (SSR) | 4 | **Yes** |
| Candidate 0 | 3 | No — failed Concreteness and Fit lenses |
| LatticeGen | 0 (disqualified) | No — failed Safety lens |

Persistent Kernel Archive and SSR tied on raw average, but only SSR passed every
lens. Persistent Kernel Archive's Fit-lens failure was not a matter of taste: the
judge traced its own worked example against the real source files and found a
checkable arithmetic error (detailed below). In preparing this document, that same
tracing was independently re-verified against the live repo — `src/play/noveltyGate.js`,
`src/play/kernels/twoOnOneKernel.js`, `src/play/playFamilies.js`,
`docs/scenario-family-standards.md`, `docs/factory/kernel-expansion-report.md`, and
`docs/superpowers/specs/2026-07-29-scenario-engine-design.md` were all read directly
(not assumed from any candidate's prose) to confirm the facts this final design relies
on, per the standing rule of verifying against the artifact itself rather than a
report about it.

**Result: SSR is the base design, as the only unanimously viable candidate.** One
mechanism is grafted in from Persistent Kernel Archive — its cross-session
persistence idea, rebuilt to avoid the exact defect that disqualified it. Full
attribution is in "Where this came from" below.

---

## The Final Design

### 0. What does not change

- **The four-artifact bundle** (`ScenarioDefinition → SimulationTrace →
  DecisionEvaluation → CompiledTeachingPlay`) is untouched. Nothing here is a fifth
  bundle artifact; everything new sits upstream/alongside, the same placement
  Candidate 0 correctly used and this design keeps.
- **`src/play/kernels/twoOnOneKernel.js`** — **zero changes.** SSR treats the kernel
  as an opaque generator. Unlike Candidate 0 (which wanted `parameterRole` tags on
  every axis) or LatticeGen (which wanted hoisted constants and a closed-form
  cell-predictor), this design needs no kernel edits at all, because novelty judgment
  moves from geometry to semantics.
- **`src/play/playFamilies.js`** — **zero changes.** `SCENARIO_FAMILIES`,
  `teachingArc`, `targetVariants`, and `classifyPlayFamily` are read-only inputs.
- **`docs/scenario-family-standards.md`** — **zero changes needed.** This file is
  real (verified: 80 lines, committed 2026-07-08), already contains a "Variant Rules"
  section (good-vs-weak variant-change examples) and a "Family Completion" checklist
  (1 base + 2 cue-change + 1 pressure/timing + 1 mistake + 1 mixed = 6, matching
  `playFamilies.js`'s real `targetVariants: 6` for `two_on_one`). This design consumes
  that content directly rather than assuming the file is blank, which the digest this
  document was handed incorrectly asserted, and two of the four candidates repeated
  without checking.
- **`src/play/noveltyGate.js`'s existing exports** (`answerTarget`, `answerSignature`,
  `answerDistance`, `layoutDistance`, `filterNovel`, `DEFAULTS`) — kept exactly as
  written, reused as a backstop (below), never replaced.
- **Gates 1–4** (environment/provenance, schema/domain, physics, tactical invariants)
  and **gates 6–10** (question/age standards, visual validation, Claude judgment,
  promotion policy, app gate) per the real gate order in
  `docs/superpowers/specs/2026-07-29-scenario-engine-design.md` — completely
  unchanged. This design occupies **gate 5 (Novelty)** only.

### 1. Claim-text adapter

```js
// src/play/tactics/claimText.js (new)
export function loadClaimText(claimId) {
  // v0: a small explicit lookup table, e.g.
  //   two_on_one_odd_man_read -> docs/library/odd-man-reads.md
  // (verified real today: "Objective Read" section + explicit wrong-answer
  // reasons, matching the kernel's own sourceRef.note/cite).
  // Reads the file, returns:
  //   { text, sourcePath, sourceVersion }
  // where sourceVersion is a content hash of the file taken at read time,
  // pinned into the judgment record below so a later doc edit invalidates
  // stale calibration rather than silently drifting.
  // v1: once src/data/tactics/claims/<claim-id>.json exists (per the
  // canonical spec's planned machine-readable claims layer), this function
  // switches its source, same call site, same { text, sourcePath,
  // sourceVersion } shape — no rubric change required at the migration point.
}
```

### 2. Digest builders (added to `noveltyGate.js`)

```js
// src/play/noveltyGate.js — two new pure functions, everything else unchanged

// Renders one play into a short templated string reusing this module's own
// answerTarget(). Never sends raw pixel/(x,y) tables to the model — this is
// the only per-candidate data a judgment call sees.
export function buildCandidateDigest(play) {
  // e.g. "commit=holdsMiddle, shape=trailer, depth=0, mirror=false,
  //       answer=shoot_lane (Attack the open shot lane), defender geometry:
  //       sits on the F1->F2 lane, shot lane clear."
}

// Same rendering for an already-admitted sibling (catalog play or earlier
// batch admit), cached at admission time so it is never recomputed.
export function buildArchiveDigest(sibling) { /* ... */ }
```

### 3. `SiblingReviewVerdict` — the judgment schema

```ts
type SiblingReviewVerdict = {
  candidateId: string;
  verdict: "distinct_teaching_point" | "reskin_of_existing" | "reskin_within_batch"
          | "claim_drift" | "ambiguous_needs_human";
  matchedArcSlot: string | null;      // MUST be a literal entry from
                                        // SCENARIO_FAMILIES[familyId].teachingArc,
                                        // e.g. "Defender steps up → pass to support"
  newArcSlotProposed: boolean;         // true only if distinct_teaching_point AND
                                        // matchedArcSlot is null — flags a possible
                                        // teaching point the family's own arc never named
  nearestSiblingId: string | null;     // required if verdict is a reskin_*
  claimQuote: string;                  // <=25 words, MUST appear verbatim (case/
                                        // whitespace-normalized) in the claim text
                                        // supplied this call
  cueDelta: string;                    // one clause: the coach-observable thing
                                        // that differs from the nearest sibling
  rationale: string;                   // <=2 sentences
  confidence: "high" | "medium" | "low";
};
```

**Deterministic post-processing (code, not model trust):** any response that fails to
parse, is missing a required field for its verdict type, or whose `claimQuote` does
not appear in the exact claim text sent that call is **force-downgraded to
`ambiguous_needs_human`** regardless of what the model said. This is the
reproducibility mechanism: nothing is trusted as "the model said so" without a
deterministic, replayable check against real source text.

### 4. Prompt structure (fixed, versioned)

`rubricVersion: "semantic-novelty-v1"`, hashed into the judgment record.

- **SYSTEM:** "You are reviewing a BATCH of hockey teaching scenarios that already
  passed physics and tactical-invariant validation — you are not being asked whether
  any candidate is correct, only whether a coach would recognize it as teaching
  something new, a duplicate, or something off-claim." Followed by
  `docs/scenario-family-standards.md`'s real **Variant Rules** section, embedded
  verbatim as the fixed definition of a good vs. weak variant change. Schema and
  quote-grounding requirement stated explicitly.
- **USER:** (a) claim prose from `loadClaimText()`; (b) `SCENARIO_FAMILIES[familyId].teachingArc`
  + `targetVariants` verbatim, read directly from `playFamilies.js`; (c) archive
  digests (below — sourced from the persisted ledger, capped at `targetVariants`
  entries, plus anything admitted earlier in the same run's prior chunks); (d)
  candidate digests for this batch, each tagged with a stable id; (e) the existing
  `answerDistance()`/`layoutDistance()`/`answerSignature()` outputs, labeled
  **"cross-check only, not the deciding rule"** — a near-zero geometric distance
  doesn't silently override a judgment call, but a sharp disagreement is flagged for
  the model to double-check its own rationale.

### 5. Batching

One Claude call per batch (~40-candidate cap), never per-candidate, never per-pair.
Today's 48-candidate `two_on_one` expansion needs exactly 2 calls. If a batch exceeds
the cap, chunk sequentially; **the carried-forward context between chunks is
concretely specified here** (this closes SSR's own self-flagged gap, see §7 below):
it is exactly the same archive-digest set built for chunk 1 — the persisted ledger's
digests (capped at `targetVariants`) plus every admit from earlier chunks in this same
run — never re-summarized, never re-compressed, because `targetVariants` (6 for
`two_on_one`, 4 for every other current family) already bounds it to a handful of
entries.

### 6. Gate-5 call site

```js
// src/play/semanticNoveltyGate.js (new)

// Drop-in replacement for noveltyGate.js's filterNovel() at gate 5.
// Same { kept, rejected } contract, plus a needsHuman bucket that maps
// directly onto the architecture's existing review-required state.
export function applySemanticNoveltyGate(candidates, { familyId, claimId, existingCatalog }) {
  // 1. loadClaimText(claimId)
  // 2. read SCENARIO_FAMILIES[familyId].teachingArc / .targetVariants (read-only)
  // 3. read the persisted ledger (docs/factory/coverage/<familyId>.json) —
  //    §7 below — to seed archive digests
  // 4. reviewFamilyBatch(): one Claude call per <=40-candidate chunk
  // 5. deterministic post-processing (schema + quote verification) per verdict
  // 6. decision table:
  //      distinct_teaching_point (verified quote, open matchedArcSlot OR
  //        newArcSlotProposed) -> admit; append digest for next chunk
  //      reskin_* -> reject, reason = model's cueDelta/rationale
  //      claim_drift -> reject, reason names the failed claim clause
  //      ambiguous_needs_human (incl. any schema/quote failure) -> queued,
  //        never silently dropped, never silently promoted
  // 7. FREE SAFETY NET: run the existing, unmodified filterNovel() on the
  //    admitted set only. It can VETO an admission (move it to needsHuman,
  //    with a note: "semantic gate admitted, geometric backstop disagrees —
  //    human call") but it can never promote anything the semantic pass
  //    rejected. This veto-only direction is this document's explicit
  //    specification of the "backstop" SSR's own text named but did not fully
  //    pin down.
  return { kept, rejected, needsHuman };
}
```

Every kept candidate still goes to gates 6–10 exactly as today — including gate 8,
Claude hockey/pedagogy judgment, run per-instance, unchanged. **Explicit contract,
stated in code comments at this call site and enforced by never branching gate 8's
logic on an SSR verdict:** an SSR verdict is a novelty/redundancy classification only.
It can never be read downstream as a positive correctness signal that lightens or
skips gate 8 for that candidate. (This was the Safety lens's one non-disqualifying
tightening note on SSR — resolved here as an explicit design rule, not left as a
future temptation.)

### 7. Teaching-Arc Coverage Ledger — the grafted mechanism

**This is the piece pulled from Persistent Kernel Archive**, rebuilt to avoid the
defect that disqualified it (§"Where this came from" has the full accounting).

```json
// docs/factory/coverage/two_on_one.json (new, one file per family, checked into git)
{
  "schemaVersion": 1,
  "familyId": "two_on_one",
  "claimId": "two_on_one_odd_man_read",
  "targetVariants": 6,
  "arcCoverage": [
    {
      "arcSlot": "Defender steps up → pass to support",
      "status": "kernel-covered",
      "admittedCandidateIds": ["k2v1_steps_up_d0_trailer_s1", "k2v1_steps_up_d0_trailer_far_s1"],
      "handAuthored": ["play_2v1_backdoor_read_u11_v1", "play_2v1_backdoor_read_u11_v1_mirror"]
    },
    {
      "arcSlot": "Defender holds middle → attack open shot lane",
      "status": "kernel-covered",
      "admittedCandidateIds": ["k2v1_holds_middle_d0_backpost_far_s1", "k2v1_holds_middle_d0_trailer_s1"],
      "handAuthored": ["play_2v1_defender_holds_middle_u11_v1"]
    },
    {
      "arcSlot": "Backchecker closing → move puck before lane closes",
      "status": "hand-authored-only",
      "admittedCandidateIds": [],
      "handAuthored": ["twoOnOneGoalieLateAfterPass.js's play id — reconcile exact id at implementation"]
    },
    { "arcSlot": "Goalie late → quick shot outcome", "status": "hand-authored-only", "admittedCandidateIds": [], "handAuthored": ["twoOnOneGoalieLateAfterPass.js"] },
    { "arcSlot": "Support too flat → avoid forcing a low-value pass", "status": "hand-authored-only", "admittedCandidateIds": [], "handAuthored": ["twoOnOneSupportTooFlat.js"] },
    { "arcSlot": "Pass lane removed → puck carrier keeps attack", "status": "hand-authored-only", "admittedCandidateIds": [], "handAuthored": ["twoOnOnePassLaneRemoved.js"] }
  ],
  "runs": [
    { "runId": "2026-07-29-01", "date": "2026-07-29", "batches": 2, "kept": 4, "rejected": 44, "needsHuman": 0 }
  ]
}
```

Seeded once, at implementation time, from the **real** `kernel-expansion-report.md`
(4 survivors, verified above) and the **real** two hand-authored catalog plays — with
one hard rule that directly fixes Persistent Kernel Archive's disqualifying bug:

> **`admitToLedger()` must resolve every entry's coverage status by calling the real,
> unmodified `answerSignature()`/`answerTarget()` functions in `noveltyGate.js` against
> the actual play object — never by hand-computing or assuming a band value in prose.**

This single rule is why the graft is safe where the original wasn't. Persistent
Kernel Archive's worked example assumed `play_2v1_backdoor_read_u11_v1`'s F2 position
(verified today: `[162, 24]`) falls in noveltyGate's `"mid"` band; the real formula
(`y < 85/3 → "high"`) puts `y=24` in `"high"`, not `"mid"` — a real, checkable
arithmetic error the Fit-lens judge found by reading the actual file. Because this
ledger never predicts a cell independently — it only **records what SSR's own,
already-viable semantic verdict already decided**, after the fact — that class of bug
cannot recur here: there is no second, parallel geometric-cell-prediction codepath to
drift out of sync with the real functions.

It also sidesteps Persistent Kernel Archive's second flaw (a hard 1-elite-per-cell cap
that would have silently dropped a real survivor — `k2v1_holds_middle_d0_trailer_s1`
coexists with the hand-authored `play_2v1_defender_holds_middle_u11_v1` under the same
coarse `shoot_lane:mid` signature only because `filterNovel`'s per-pair
`layoutDistance` check admits it, not because of any single-elite occupancy rule).
This ledger imposes **no elite cap of its own** — it lists every admitted candidate
under its matched arc slot, and the pre-existing `filterNovel`/`capPerSignature`
semantics (already in `noveltyGate.js`, unchanged) remain the sole volume limiter.

**What the ledger is used for — and, per the Safety lens, what it must never be used
for:**

- **Used for:** (a) supplying `applySemanticNoveltyGate`'s archive-digest context,
  replacing SSR's originally under-specified "carry the growing digest forward"
  language with an actual, bounded rule (§5); (b) a coverage report — comparing
  `arcCoverage` against the family's real `teachingArc`/`targetVariants` — that makes
  the "2 of 6 `two_on_one` reads have a kernel decision axis at all" fact (independently
  surfaced by both LatticeGen and Persistent Kernel Archive, and worth keeping even
  though neither candidate's generation mechanism is adopted) an explicit, checked-in
  fact instead of something buried in a 44-line pruned list; (c) an **advisory** signal
  to a human or orchestration script deciding whether it's even worth invoking another
  generation run for a family that's already at `targetVariants`.
- **Never used for:** skipping construction of any candidate, or skipping any gate for
  any candidate that is constructed. The ledger is read-and-advise only, before a run
  starts or between chunks within a run; it never sits inside the per-candidate
  decision path gates 1–10 exercise. This is the exact line LatticeGen crossed and was
  disqualified for; this design draws it explicitly to make sure the graft doesn't
  reintroduce it.

### 8. File/module layout (complete)

| File | Status | Role |
|---|---|---|
| `src/play/kernels/twoOnOneKernel.js` | **unchanged** | opaque candidate generator |
| `src/play/noveltyGate.js` | **add 2 functions** | `buildCandidateDigest`, `buildArchiveDigest`; all existing exports reused as-is (incl. as the veto-only backstop) |
| `src/play/semanticNoveltyGate.js` | **new** | `reviewFamilyBatch()`, `applySemanticNoveltyGate()`, verdict schema + validator |
| `src/play/tactics/claimText.js` | **new** | `loadClaimText(claimId)` |
| `src/play/coverageLedger.js` | **new** | `loadLedger`, `saveLedger`, `admitToLedger`, `arcCoverageReport` |
| `docs/factory/coverage/<familyId>.json` | **new per family** | the persisted ledger |
| `docs/factory/coverage-runs/<familyId>-<date>.md` | **new per run** | human-readable run report (same convention as `kernel-expansion-report.md`) |
| `scripts/report-kernel-expansion.mjs` | **one call-site swap** | `filterNovel()` → `applySemanticNoveltyGate()`; add "Teaching-arc coverage" report section |
| `src/play/playFamilies.js` | **unchanged, read-only** | `SCENARIO_FAMILIES`, `teachingArc`, `targetVariants`, `classifyPlayFamily` |
| `docs/scenario-family-standards.md` | **unchanged, read-only** | "Variant Rules" embedded verbatim into the rubric prompt |
| `docs/library/odd-man-reads.md` | **unchanged, read-only** | claim-text source via `loadClaimText()` today |
| `src/data/tactics/claims/<claim-id>.json` | **future, not built yet** | `loadClaimText()`'s planned v1 source; same call-site shape |
| existing judgment record (per `docs/superpowers/specs/2026-07-29-scenario-engine-design.md`, `config/scenario-promotion-policy.json` when it exists) | **extended** | new `gateId: "semantic-novelty"` entries; same required fields already mandated (provider/session id, model+version, reasoning config, rubric hash, prompt/context manifest, tool manifest, engine commit, calibration-corpus version) |

### 9. Phase 5 task list

1. Implement `loadClaimText(claimId)` reading `docs/library/odd-man-reads.md`'s real
   Objective-Read + wrong-answer prose today; pin the file's content hash into the
   judgment-record's prompt manifest; document the v1 switch-over to
   `src/data/tactics/claims/<claim-id>.json` once that artifact exists.
2. Add `buildCandidateDigest(play)` / `buildArchiveDigest(sibling)` to
   `noveltyGate.js`; pin unit tests on the two real hand-authored survivor plays'
   digest strings (`play_2v1_backdoor_read_u11_v1`, `play_2v1_defender_holds_middle_u11_v1`)
   and the four real kernel survivors from `kernel-expansion-report.md`.
3. Write and hash the fixed rubric text (`semantic-novelty-v1`), embedding
   `docs/scenario-family-standards.md`'s real "Variant Rules" section verbatim.
4. Implement the `SiblingReviewVerdict` schema, its strict validator, and the
   deterministic `claimQuote` substring-verification check (case/whitespace-normalized).
5. Implement `reviewFamilyBatch()` (batch orchestrator, ≤40-candidate cap, sequential
   chunking) and `applySemanticNoveltyGate()` (the gate-5 call-site replacement),
   including the veto-only geometric backstop rule (§6).
6. Implement `coverageLedger.js` (`loadLedger`/`saveLedger`/`admitToLedger`); seed
   `docs/factory/coverage/two_on_one.json` by calling the **real**
   `answerSignature()`/`answerTarget()` against the real 4 kernel survivors + 2
   hand-authored catalog plays — never hand-assumed band values (the explicit fix for
   Persistent Kernel Archive's disqualifying bug).
7. Wire `report-kernel-expansion.mjs`: swap `filterNovel()` for
   `applySemanticNoveltyGate()`; keep every other line (`validateAnimatedPlay`,
   `validateFactoryStandards`, `artLint`) verbatim; add the "Teaching-arc coverage vs
   `teachingArc`" report section from the ledger; log (never enforce) the
   already-at-`targetVariants` advisory.
8. Extend the existing judgment-record writer with `gateId: "semantic-novelty"`
   entries (rubric hash, prompt/context manifest hash, model/session metadata,
   per-candidate verdict, confidence) — an added enum value, not a new schema.
9. Wire `newArcSlotProposed` verdicts into the existing review-required/human-queue
   path as an explicit "possible new arc slot" note.
10. Run the real 48-candidate `two_on_one` expansion through the new gate end to end;
    diff its kept/rejected/needsHuman sets against today's real `filterNovel()` output
    (4 kept, 44 rejected, verified above) as the calibration smoke test; record the
    diff in the run envelope before relying on the gate for anything else.
11. Extend the Conservative Promotion calibration bar (≥50 reviewed decisions, ≥20 per
    template class, ≥20% holdout with ≥10 decisions for the template class, zero
    wrong-answer false approvals) — exactly as already required for gate 8 in
    `docs/superpowers/specs/2026-07-29-scenario-engine-design.md` — to cover this
    gate's admit/reject calls before it is allowed to run unattended.
12. Confirm (do not invent) that `docs/scenario-family-standards.md` and
    `playFamilies.js` need no edits for this phase; the only new committed content is
    the per-family coverage ledger and its run reports.

---

## Where this came from

**Base mechanism: Semantic Sibling Review (SSR), adopted near-verbatim.** SSR is the
only one of the four candidates that scored viable on all three lenses. It won
because: (Safety) novelty misjudgment can only waste review budget or discard a
genuinely novel candidate, never promote an incorrect one, since gate 8 (hockey
accuracy/pedagogy) remains a fully independent, per-instance check on every survivor;
(Concreteness) it supplies a fully typed verdict schema, a fixed prompt structure, a
deterministic quote-verification check, and an exact decision table converting
verdicts to admit/reject/queue actions — not hand-waved policy; (Fit) its own
"grounding facts verified in-repo" were independently re-confirmed against the real
files during this document's preparation — `docs/scenario-family-standards.md` really
exists with real Variant Rules and Family Completion content, `playFamilies.js`'s real
`teachingArc` wording matches what SSR quotes, the real 10-gate order and calibration
bar match exactly what SSR designs around. No other candidate's grounding held up this
well when checked.

**One mechanism grafted from Persistent Kernel Archive: the persisted, cross-session,
per-family record (§7, the Teaching-Arc Coverage Ledger).** Persistent Kernel Archive
tied SSR on raw average score (4) and its core insight — that a family shouldn't
re-derive its own history from zero on every run, because the system executes in
discontinuous Claude sessions with no other memory — is genuinely valuable and SSR's
own text flagged that it needed something like this (its "chunk-carry-forward...
named but not designed" gap, and the Fit-lens observation that it "leaves the
Cartesian-sweep construction cost untouched" and "should be paired with a build-time
pruning idea"). But Persistent Kernel Archive itself was **not** unanimously viable:
its Fit-lens failure was a real, checkable arithmetic error in its own worked example
(a hand-authored play's F2 position placed in the wrong geometric band), plus an
unaddressed collision rule that would have silently dropped a real survivor. This
design takes **only** the persistence idea — a small, checked-in JSON per family — and
rebuilds it around SSR's own already-viable semantic verdict fields
(`matchedArcSlot`, `admittedCandidateIds`) rather than Persistent Kernel Archive's
independent geometric cell-prediction machinery, and requires it to call the real
`answerSignature()`/`answerTarget()` functions rather than hand-assume band values —
which is precisely what the original design failed to do. The graft closes SSR's own
named gap without importing the defect that disqualified its donor.

**Explicitly rejected as generation mechanisms:**

- **LatticeGen** — disqualified outright on the Safety lens (its mirror-symmetry rule
  produces a real, user-facing sibling via a live geometric reflection instead of
  independent construction and validation — "regardless of its other merits" per that
  lens's own disqualification rule) and independently found, when traced against the
  real `kernel-expansion-report.md`, to reproduce only 1 of the 4 real survivors, not
  4-for-4 as claimed. None of its generation mechanism is used. Its one verified-correct,
  non-generation contribution — hoisting `SHAPE_F2_Y`/`COMMIT_OK_OPT_ID` as named kernel
  constants — is a safe, zero-risk refactor an implementer could still do purely for
  legibility when writing `buildCandidateDigest`, but it is optional and not part of
  this design's actual mechanism.
- **Candidate 0** — not adopted. Its `parameterRole`/`NoveltySignature` scheme named
  fields (`decisionTopologyClass`, `cueTopologyClass`, `timeBand`, a near-boundary
  epsilon) with no types, no derivation logic, and no worked example — an implementer
  handed only that document would have had to invent the exact algorithm the document
  claims to supply. It also deferred reconciliation with `scenario-family-standards.md`
  under the false premise that the file doesn't exist. Its one durable, correctly-kept
  contribution — tactical claims and family-level metadata live outside `src/`,
  alongside claims, never as a fifth bundle artifact — is pre-existing, already-settled
  architecture (decision #3) that Candidate 0 correctly followed rather than
  originated; this design keeps that same boundary (the ledger sits in
  `docs/factory/`, not in `src/`) because it was already the right call, not because
  Candidate 0 gets credit for inventing it.

---

## Honest residual risk

**The base mechanism (SSR) was unanimously viable — this section is short because of
that, not despite it.** No judge flagged a disqualifying flaw on any lens. SSR's own
self-flagged, non-disqualifying weaknesses stand as real and are inherited here rather
than resolved:

- **Not free.** Roughly 1–2 Claude calls per run at today's scale, low tens per day
  once more families are running — a real cost, not the zero it replaces (though
  likely net-neutral against gate 8 running on fewer surviving duplicates).
- **Reproducibility is weaker in kind than deterministic code.** A pinned model,
  temperature, and rubric hash reduce but don't eliminate the risk of a provider-side
  model update silently shifting verdicts over time; this leans on the architecture's
  existing recalibration/holdout machinery rather than claiming a new guarantee.
- **A real quote applied with subtly wrong reasoning** passes the deterministic
  quote-verification check; that check stops fabrication, not motivated misreading.
- **Batch-boundary risk**, mitigated by generous batch sizing and the geometric
  backstop, not eliminated by design.
- **Prerequisite cost**: SSR's grounding is only as good as the human-authored claim
  prose and teaching-arc text it reads. For `two_on_one` both already exist and agree
  with each other (verified); a brand-new family with thin documentation gives the
  judge little to quote from — a real "someone has to write it down first" cost.

**The one piece that is genuinely new to this document, and has not itself been
through three-lens adversarial review, is the Teaching-Arc Coverage Ledger (§7).** It
is built narrowly — reusing only SSR's already-viable verdict data, and explicitly
required to call the real geometry functions rather than repeat Persistent Kernel
Archive's arithmetic mistake — but that mitigation is this document's own reasoning,
not an independently panel-scored result the way SSR's core mechanism is. Phase 5 task
6 (seed the ledger, verify against real `answerSignature()` output, not assumed values)
and task 10 (diff the full run against the real 4/44 split) are the concrete checks
that should catch it early if the graft has a flaw of its own kind.

---

## What Thomas needs to decide

This design is ready to fold into Phase 5 of the scenario-engine implementation plan —
but that is his call, not this document's. Specifically open for his decision:

- Whether to authorize Phase 5 at all, and on what timeline, against the rest of the
  roadmap.
- Whether the Teaching-Arc Coverage Ledger (§7) — the one mechanism synthesized here
  rather than adopted whole from a viable candidate — should ship in the same phase as
  SSR's core mechanism, or be held back a phase so SSR alone gets calibration mileage
  first before a second, unreviewed piece rides alongside it.
- Whether `config/scenario-promotion-policy.json` (currently only "provisional" in the
  canonical spec, not yet a real file) gets created as part of this work or stays
  deferred to whoever builds the promotion-policy artifact generally.
- The remaining, honestly-uncovered gap this design surfaces rather than closes:
  `two_on_one`'s kernel only has decision axes for 2 of its own 6 named teaching-arc
  reads (the other 4 — backchecker closing, goalie late, support too flat, pass lane
  removed — exist only as separate hand-authored plays). Closing that gap means adding
  new decision axes to the kernel, which is real kernel-design work outside this
  document's scope, made visible and named rather than left implicit.
