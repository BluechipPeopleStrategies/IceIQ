# Tier 3 merge reconciliation: provisional content-adjudication calls (2026-09-07)

**Status: PROVISIONAL. Every pick below needs human/coach sign-off before this content
ships.** Per `docs/hockey-authority/qualification.json` (`status: unqualified`,
`mayIssueApprovalRecommendation: false`), this reviewer cannot certify a winning side
as correct hockey. What follows is a git-conflict resolution plus a documented,
reasoned pick per disagreement, not an approval.

**Scope note on file count:** the launching task said "these 10 conflicted files" but
then listed 15 paths (5 `experimental-bank` json files plus 10
`experimental-expansion` additions/scenarios json files). All 15 listed files were
processed; the "10" appears to be a miscount in the task text, not a narrower list.

**Commits:** local `main` tip `d85b02c` (the HEAD side of every conflict) vs
`origin/main` tip `cd200c6` (the origin/incoming side), per
`docs/superpowers/plans/2026-09-07-main-merge-reconciliation-plan.md`.

## What was mechanically done

- 112 raw conflict-marker blocks existed across the 15 files. All 112 were resolved by
  taking the origin side of the block and deleting the markers.
- Of those 112: 84 were pure metadata (a `version` or `scenarioVersion` integer bump
  only, content otherwise byte-identical after whitespace normalization). Origin s
  number was equal to or higher than local s number in every one of these 84 cases
  (verified by script, zero exceptions), consistent with origin being incremented
  further as the later of two independent repair passes. These needed no hockey
  judgment: same content, higher or equal version counter, origin taken.
- The remaining 28 conflict blocks carried an actual text or content difference
  (different prompt, different options, different answer, or a rewritten explanation).
  These are the real judgment calls, listed individually below.
- All 15 files parse as valid JSON with zero remaining conflict markers, and have been
  staged with git add. No git commit, merge --abort, reset, or push was run.

## The pattern behind every one of the 28 real disagreements

Every one of the 28 follows the same shape, with no exception found: local kept an
earlier "coaching" style prompt that asks an open, subjective judgment question (for
example, "What should YOU do?", answered by a vague best-practice option like "keep the
carrier in view and adjust your lane"), while origin rewrote the same slot into a
"scene" style prompt that makes a specific, numerically checkable spatial claim (for
example, "Which direct passing line stays farther from D1: the line to YOU, or the line
to F2?"). This is exactly the correction `docs/factory/CLAUDE-REVIEW-UPDATE.md` already
prescribes for this project: "Calculate the claimed relationship... compare the
appropriate distances/coordinates" instead of an unfalsifiable coaching-judgment
prompt. Origin's commit history is literally titled "fix: release independently
repaired packet N," consistent with this being a later, more rigorous pass over the
same content local had already adjudicated once.

Independent verification performed on a sample, not on all 28: four of origin's
specific numeric claims were recomputed directly from each scenario's setup.actors
coordinates, independent of the authored explanation text, covering four different
claim shapes:

1. exp26b-u9-004-q5: claim "Navy 2 is nearer Navy's net than Gold 1; YOU are farther
   from it than Gold 1." Coordinates: YOU x=17, Navy2 x=10, Gold1 x=13, Navy defends the
   low-x end. 10 < 13 < 17: claim holds.
2. exp26b-u11-002-q2: claim "F1 is behind YOU toward Navy's defending end" and "D1 is
   ahead of YOU and nearer the middle." Coordinates: YOU x=-7, F1 x=-14, D1 x=-5,y=1
   (YOU y=4), Navy defends the low-x end. F1's x=-14 is farther toward the defending end
   than YOU's -7 (holds); D1's absolute y of 1 is nearer the y=0 middle line than YOU's
   absolute y of 4 (holds).
3. exp26b-u15-002-q2: claim "Gold 1 is nearer the direct line to F3 than the line to
   F2" and "Gold 2 is closer to F3 than to F2." Computed perpendicular point-to-line
   distances: Gold1 to line YOU-F3 = 0.77, Gold1 to line YOU-F2 = 2.68 (holds); Gold2 to
   F3 = 2.83, Gold2 to F2 = 5.10 (holds).
4. exp26b-u15-014-q5: claim "Gold 3 is the defender behind YOU toward Navy's net."
   Coordinates: YOU x=-1, Gold1(A1) x=2, Gold2(A2) x=6, Gold3(A3) x=-4, Navy attacks
   plus-x and defends minus-x. Only Gold3's x=-4 is farther toward the defended end than
   YOU's -1 (holds).

All four held exactly as claimed. This is supporting evidence for the general pattern,
not a certification of the other 24: the other 24 were not independently recomputed,
and a human coach should recompute them before this ships, per the review contract's
"derive the plausible answer, then try to disprove it" standard.

## The 28 real content-adjudication picks (all resolved to ORIGIN)

### src/one-on-one/experimental-bank/u15.json (1)

1. exp26-u15-009-q5, option "c". HEAD: "Shoot automatically because YOU are high"
   (names an action, breaks the a/b/c "name a Gold skater" pattern, and duplicates a
   point already in the question's own explanation). ORIGIN: "Gold 3" (well formed,
   matches sibling options, plausible distractor). Picked ORIGIN. This is the
   already-known defect from Finding 3 of
   docs/hockey-authority/one-on-one-tactics-review-2026-09-07.md; fixing it here closes
   that finding. The graded answer ("b", Gold 2) is unaffected either way.

### src/one-on-one/experimental-expansion/u9-scenarios.json (2)

2. exp26b-u9-004-q5. HEAD: "Gold1 cuts wide, toward the boards. What should YOU
   update?" / answer "Keep the carrier in view and adjust your lane" (unfalsifiable).
   ORIGIN: "Which defensive picture should guide YOUR recovery toward Navy's net in this
   freeze?" / answer "Navy 2 is nearer Navy's net than Gold 1; YOU are farther from it
   than Gold 1" (numerically verified true, see above). Picked ORIGIN.
3. exp26b-u9-010-q5. HEAD: "Gold1 moves into YOUR outlet lane. What might Navy2 use?"
   / answer "Navy3 or another clear side." ORIGIN: "Navy 2 is comparing the two
   outlets. Which pass is shorter to assess...?" / answer "The pass to YOU." Picked
   ORIGIN for the same pattern reason; not independently distance-verified this pass.

### src/one-on-one/experimental-expansion/u11-additions.json (2)

4. exp26-u11-001-q10. HEAD: "D1 closes on the puck while F2 moves behind the
   defender. How could YOUR first action change?" ORIGIN: "D1 closes on the loose puck
   while F2 moves behind the defender. How could YOUR approach to the puck change?"
   Minor wording precision only (adds "loose," narrows "first action" to "approach to
   the puck"); not a substantive disagreement. Picked ORIGIN.
5. exp26-u11-003-q7. HEAD: 3-option communication-call question, answer "I will offer
   a different angle; check whether you can reach me." ORIGIN: rewritten as a 2-option
   scene comparison, answer "F2 has a different angle across the ice; D1 is close to
   the line to me." Picked ORIGIN, same pattern; not independently verified.

### src/one-on-one/experimental-expansion/u11-scenarios.json (6)

6. exp26b-u11-002-q2. Numerically verified true, see item 2 above. Picked ORIGIN.
7. exp26b-u11-004-q5. HEAD coaching prompt vs ORIGIN scene claim ("line from F2's
   puck to F1 stays farther from D1 than the line back to YOU"). Picked ORIGIN, not
   independently verified.
8. exp26b-u11-011-q5. Same pattern ("line to F2 stays farther from D1 than the line
   to YOU"). Picked ORIGIN, not independently verified.
9. exp26b-u11-018-q5. HEAD: "D1 cannot stay with F1 and calls for help. What should
   YOU reassess?" ORIGIN: "which attacker is currently on YOUR side of the middle and
   must stay in the read?" (answer "F2"). Picked ORIGIN, not independently verified.
10. exp26b-u11-019-q5. HEAD coaching vs ORIGIN scene claim ("Navy F1 has the puck and
    attacks toward the right net"). Picked ORIGIN, not independently verified.
11. exp26b-u11-021-q5. HEAD coaching vs ORIGIN scene claim ("line from the puck to F2
    stays farther from D1 than the direct shooting line"). Picked ORIGIN, not
    independently verified.

### src/one-on-one/experimental-expansion/u13-additions.json (2)

12. exp26-u13-011-q8. HEAD: "Which two changes could alter the shooting picture?"
    with a distractor "D2 moves laterally" (player movement without puck control).
    ORIGIN: "Which two stated changes would directly change the position from which
    Navy could next shoot?" with the corrected distinction that only a carry or a
    completed-and-controlled pass moves the puck; "D2 moves while YOU keep the puck"
    does not. This matches docs/factory/CLAUDE-REVIEW-UPDATE.md check 4 (separate
    states and transitions; movement alone is not a puck-control event). Picked
    ORIGIN.
13. exp26-u13-014-q8. HEAD coaching vs ORIGIN scene claim ("C is still farther from
    Navy's net than Gold 1"). Picked ORIGIN, not independently verified.

### src/one-on-one/experimental-expansion/u13-scenarios.json (6 marker blocks, 5 distinct items)

14. exp26b-u13-006-q1 prompt wording. HEAD: "Which opponent is nearest the direct
    line from D2 toward the net?" with the option list including "D2" itself (a Navy
    teammate, not an opponent) as a candidate answer. ORIGIN: "Which Gold skater is
    nearest..." (same options, same answer "a" = Gold 1, same explanation). Picked
    ORIGIN: this is a genuine, if minor, role-labeling fix (a teammate should not be
    offered as a candidate "opponent"), not just a style preference.
15. exp26b-u13-007-q1 prompt wording. Same "opponent" to "Gold skater" fix, same
    answer and explanation unchanged. Picked ORIGIN, same reasoning as item 14.
16. exp26b-u13-014 setup, goalie x-coordinate. HEAD x=-27, ORIGIN x=-26 for the Navy
    goalie actor (id: nga). A 1-unit cosmetic repositioning, not tied to any scored
    claim in the sampled questions. Picked ORIGIN for consistency with the rest of the
    file's resolution; flagging that this one specific coordinate was not
    independently re-verified against the goalie-crease geometry rules in
    docs/hockey-authority/sources.md.
17. exp26b-u13-014-q2 (rebound scenario), full rewrite. HEAD: "Which two cues shape
    your second job?" coaching options. ORIGIN: "Which two relationships matter before
    YOU choose a second rebound job?" scene claims ("the goalie is closer to the loose
    puck than D1 is"; "YOU are nearer Navy's net than Gold 2 is"). Picked ORIGIN, not
    independently verified.
18. exp26b-u13-019 briefing, additive clause. ORIGIN appends "The goalie remains
    behind the net, outside the mesh on D1's side" to an otherwise-identical briefing.
    Purely additive, does not contradict the HEAD text. Picked ORIGIN.

### src/one-on-one/experimental-expansion/u15-additions.json (4 marker blocks, 2 distinct items)

19. exp26-u15-002-q7. HEAD: 3-option coaching call, answer "Gold 1 is near the inside
    route; check F2 and F3." ORIGIN: 2-option scene comparison, answer "Gold 1 is
    nearer the line to F3 than the line to F2; check both options." Note: this is the
    sibling exp26- (non-b) scenario family, a different scenario object from the
    geometrically verified exp26b-u15-002-q2 in item 6's family; its own coordinates
    were not separately recomputed this pass despite the similar wording. Picked
    ORIGIN, pattern-consistent, not independently verified for this specific
    scenario's own coordinates.
20. exp26-u15-015-q7. HEAD: 3-option coaching call. ORIGIN: 2-option scene comparison,
    answer "Gold 1 is nearer the line to F2 than the line to F1; compare the low
    outlet." Picked ORIGIN, not independently verified.

### src/one-on-one/experimental-expansion/u15-scenarios.json (remaining items)

21. exp26b-u15-002-q2. Numerically verified true, see item 3 above. Picked ORIGIN.
22. exp26b-u15-003-q2, exp26b-u15-005-q2, exp26b-u15-007-q5, exp26b-u15-009-q5,
    exp26b-u15-011 (briefing addition), exp26b-u15-012 (setup puck-position addition),
    exp26b-u15-014-q2, exp26b-u15-014-q5, exp26b-u15-015-q5. All follow the same
    coaching-to-scene pattern (or, for the two briefing/setup items, are purely
    additive: an extra goalie-position clause or an explicit puck x/y added to a
    previously implicit owner-only puck). exp26b-u15-014-q5's claim ("Gold 3 is behind
    YOU toward Navy's net") was numerically verified true, see item 4 above. Picked
    ORIGIN for all, with only that one item independently re-verified by coordinate.

## The two already-known defects from the prior review

- Finding 3 (exp26-u15-009-q5 option c, u15.json bank): resolved as item 1 above by
  picking ORIGIN's "Gold 3" text during conflict resolution. Confirmed in the final
  file: the answer remains ["b"], option c now reads "Gold 3."
- Finding 2 (exp26-u15-001 briefing and cues[1], u15.json bank): this scenario sits
  entirely outside any conflict region (both HEAD and origin carried the same false
  clause), so it required a direct text fix rather than a conflict pick. Changed "F3 is
  currently closer to Gold's net than the puck" to "...than YOU" in both the briefing
  string and cues[1], matching the already-correct cues[0] and the q1 explanation.
  Verified: 2 occurrences found, 2 replaced, the file still parses.

## Observation: real content divergence exists beyond the git conflict markers

A full comparison of each file's complete local (d85b02c) blob against its complete
origin (cd200c6) blob, independent of where git's line-based 3-way merge happened to
detect an overlap, surfaces additional question-level content differences that never
produced a conflict marker, because only one side's edit touched that specific
question and git's merge auto-applies a non-overlapping change without flagging it. At
least 31 such additional questions exist across
src/one-on-one/experimental-bank/u9.json, u11.json, u13.json, u18.json and
src/one-on-one/experimental-expansion/u18-scenarios.json, u18-additions.json, plus
several more inside files that also had explicit conflicts. More than ten of these were
spot-checked (for example exp26-u9-003-q3, exp26-u9-007-q5, exp26-u11-013-q5,
exp26-u11-020-q5, exp26-u13-002-q5, exp26-u13-013-q2, exp26-u13-023-q5,
exp26-u18-001-q5, exp26-u18-009-q2) across every one of these files, and the current
working tree, without any edit made here, already contains ORIGIN's rewritten
scene-based version in 100 percent of the sampled cases. None of these were edited in
this pass (they were never conflicted, so they fall outside "resolve the conflict
markers"), and the full set of 31-plus was not exhaustively audited. Flagging this
because it means the true scope of "both branches independently re-adjudicated the
same packets" is larger than the 28 items that happened to collide as git conflicts,
and whoever does the human sign-off pass should know the same coaching-to-scene
rewrite pattern runs through the bank files too, not only the 15 files this task
scoped.

## What still needs a human or coach look before this ships

Every "Picked ORIGIN" line above is provisional. None of it is a hockey-correctness
certification; docs/hockey-authority/qualification.json bars that. Specifically still
open:

- Recompute the remaining roughly 24 of 28 scene claims against their actual
  setup.actors coordinates (only 4 were independently recomputed this pass).
- Confirm the exp26b-u13-014 goalie x-coordinate change (-27 to -26) against any
  crease or net-geometry rule in docs/hockey-authority/sources.md.
- Decide whether the 31-plus already-auto-merged (non-conflicted) rewrites noted above
  need their own explicit review pass, since they were never flagged as a conflict for
  anyone to look at.
- A named human coach's sign-off on the whole "coaching prompt to scene prompt"
  rewrite direction as a template, not just the individual answers: is a closed,
  numerically comparative multiple-choice question pedagogically better than an open
  "what should you do" prompt at these age bands. That is a curriculum-design
  question, not one this reviewer can settle.
