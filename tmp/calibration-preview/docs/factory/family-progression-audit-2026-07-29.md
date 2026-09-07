# Family Progression Audit — 2026-07-29

**Status:** read-only analysis. No code, play data, or family definitions were changed in the course of this audit.

**2026-07-29 follow-up (fixed):** the `off_puck_support` classifier leak this audit
found and independently verified (`src/play/plays/supportAngleFlat.js`'s `concept`
field colliding with the `off_puck_support` family's `"off-puck"` matchTerm) has been
fixed — `concept` changed from `"off-puck-support"` to `"2-on-1-support-flat"`,
verified via a direct `classifyPlayFamily()` check (now correctly resolves to
`two_on_one`) and the full test suite (42/42 passing, no regressions). The stale
`docs/factory/next-scenario-variants.md` was regenerated afterward and now reports
the corrected counts: `off_puck_support` 2/4 (down from the buggy 3/4 — base play +
mirror clone only, the misclassified play correctly excluded), `two_on_one` 13/6 (up
one, correctly gaining the play). This fix does not change the audit's other findings
below — the ladder-check failures, the 0-of-6 kernel coverage, the mirror-clone
double-counting pattern itself (still real and still worth tracking separately from
raw catalog counts), and the teachingArc/content mismatches all stand exactly as
found, since they are content/design gaps, not bugs a code fix resolves.

**Scope:** all 7 RinkReads scenario families (`two_on_one`, `backcheck_recovery`, `forecheck_pressure`, `gap_control`, `off_puck_support`, `dz_breakout`, `defensive_angling`), scored against the Progression Rubric defined in `docs/scenario-family-standards.md` ("Decision-Training Principles" + "Progression Rubric" sections, added 2026-07-29): **constrain-first**, **ladder** (Blocked→Random / constrain-to-open progression), **live-rep**, **mistake-mechanism**, and **kernel-coverage**.

`two_on_one` was audited earlier as the rubric's own worked example, in `docs/superpowers/specs/2026-07-29-decision-training-curriculum-philosophy-design.md`. This report reuses that finding rather than re-deriving it, and adds fresh, independently-verified findings for the other 6 families — checked against the real `ALL_ANIMATED_PLAYS` catalog via `classifyPlayFamily()`, not guessed from filenames or from the automated `buildScenarioFamilyReport` counts alone.

---

## Summary table

| Family | Constrain-first | Ladder | Live-rep | Mistake-mechanism | Kernel-coverage | Honest one-line summary |
|---|---|---|---|---|---|---|
| **two_on_one** | PASS | FAIL — "one decision tested six ways" | PASS | NOT VERIFIED | PARTIAL — 2/6 variants kernel-backed (only family with any) | Two parallel forced reads plus four robustness wrinkles, not a genuine constrain→open ladder; this is the rubric's own worked example of the failure mode. |
| **backcheck_recovery** | PARTIAL — base read is forced, but doesn't match its arc label | FAIL — 2/4 built, both same openness level | PASS | PASS | FAIL — 0 kernel | Half-built (2/4 target), the two real plays are a flat cue-variant pair, not a ladder; the checked-in arc reads better than what's actually built. |
| **forecheck_pressure** | PASS | FAIL — 2/4 built, both same openness level | PASS | PASS | FAIL — 0 kernel | Same pattern as backcheck_recovery: 2/4 built, both single-forced-read MC at identical openness, arc text doesn't line up with the real builds either. |
| **gap_control** | PASS | FAIL — 3/4 built, all closed-shape | PASS | PASS (family's clear strength) | FAIL — 0 kernel | 3/4 built and every one is a closed, single-correct-answer decision (including the "verdict" one); strong mistake-mechanism writing, no path to genuine openness yet. |
| **off_puck_support** | PASS (for the one real base read) | FAIL — effectively only 1 real decision | PASS | PASS | FAIL — 0 kernel | Reports 3/4 but is really 1 authored decision: the "mirror" is a pure coordinate flip, the third counted play is a two_on_one play swept in by a string-matching classifier accident. |
| **dz_breakout** | PASS (narrow) | FAIL — 1/4 built, 3 arc steps are unbuilt prose | PASS | PASS (candidate model for other families) | FAIL — 0 kernel (though the play's own code comment self-flags as a kernel candidate) | Thinnest family in the catalog (1/4); the one play that exists is exemplary, but the arc's steps 2–4, including the genuinely-open closer, are text only. |
| **defensive_angling** | PARTIAL — narrow pass, wrong arc-label match | FAIL — really 1 decision, counted twice via a mirror clone | PASS | PASS | FAIL — 0 kernel | 1 authored decision, catalogued twice by a geometry-mirror utility; the automated "building" (2/4) label meaningfully overstates real progress. |

---

## Per-family detail

### two_on_one (reference — worked example, not re-derived here)

Full reasoning lives in `docs/superpowers/specs/2026-07-29-decision-training-curriculum-philosophy-design.md`, which used this family as the Progression Rubric's own worked example. Reusing its finding rather than re-deriving it:

- **Constrain-first:** PASS.
- **Ladder:** FAIL. The arc reads as "one decision tested six ways" — two parallel forced reads, followed by four robustness wrinkles — not a genuine constrain-to-open ladder. This is the exact pattern this audit went on to find, in various shades, in every one of the other 6 families.
- **Live-rep:** PASS.
- **Mistake-mechanism:** NOT VERIFIED in that pass (no finding either way; flagged here so it doesn't get silently assumed as a pass).
- **Kernel-coverage:** 2-of-6 variants are kernel-generated (`twoOnOneKernel.js`) — the only family with any kernel backing at all, though still partial even here.

Included in the summary table above for a complete 7-family view; see the source design doc for the full derivation.

---

### backcheck_recovery

**Constrain-first — PARTIAL PASS, with a mapping caveat.** The play that best serves as the family's base read, `play_backcheck_recovery_pick_up_middle_u13_v1` ("Choose your lane"), is a genuinely single forced read: the decision actor (BC1) faces 4 lane options, exactly one correct (pick middle/inside), the other 3 each wrong for a distinct hockey reason — no ambiguity, no "several right answers." Taken alone it satisfies constrain-first. But it does not correspond to the teachingArc's actual first entry ("Teammate takes puck → cover support lane") — that specific cue/decision doesn't exist as an implemented play at all. What exists is a generic "recover into the rush" scenario, not "teammate takes puck." So the arc's item 1 is unimplemented; the play standing in as the de facto base read is constrained, but mismatched to its label.

**Ladder — FAILS.** Only 2 of 4 arc entries are implemented (items 1 and 2 have zero matching plays; item 3, "Defender gets beat," is implemented; item 4, "Late recovery → protect inside first," is also unimplemented — the closest existing play doesn't frame timing/lateness at all). The two real plays are structurally identical in openness: both are single-correct-answer lane-picks among 3–4 distractors. `buildScenarioFamilyReport` confirms both share the exact same `kindCounts` entry (`"lane-pick": 2`) — same interaction shape, different triggering cue. Per the rubric's own definition of a weak family ("well-formed cue changes that never open past the base read"), this is that pattern in miniature: two cue variants at one openness level, no open-ended entry anywhere, and only half-built (2/4) besides.

**Live-rep — PASSES** for both plays. Both are full animated-play nodes with actors, enter/pos coordinates, motions (skate/pass/blocked), a decisionActor, and an ask/opts block — not static concept labels. Verified directly by reading `src/play/plays/backcheckRecovery.js` and `src/play/plays/backcheckRecoveryDefenderGetsBeat.js`.

**Mistake-mechanism — PASSES** for both. Every wrong option carries a `no` (and where present `why`/`youngWhy`) string that states a hockey mechanism, not just "incorrect." Examples: `go_wall` → "Recovering wide leaves the dangerous inside lane available."; `behind_puck` → "Chasing from directly behind does not take away the support option."; `stay_support` → "The puck carrier is now the immediate danger because your teammate lost that lane." All explain what stays open/dangerous as a result of the wrong choice.

**Kernel-coverage — FAILS / not covered.** `src/play/kernels/` contains only `twoOnOneKernel.js`. No kernel exists for this family — entirely hand-authored, matching the expected honest baseline for every family besides `two_on_one`.

**Real implemented plays found:**
- `play_backcheck_recovery_pick_up_middle_u13_v1` — "Backcheck recovery: Choose your lane" (`src/play/plays/backcheckRecovery.js`) — single forced lane-pick, 1 correct / 3 wrong-with-mechanism, ageBands U11–U18
- `play_backcheck_recovery_defender_gets_beat_u13_v1` — "Backcheck recovery: Defender gets beat" (`src/play/plays/backcheckRecoveryDefenderGetsBeat.js`) — single forced lane-pick after a "teammate beaten" cue, 1 correct / 2 wrong-with-mechanism, ageBands U7–U18 (matches teachingArc item 3 by name)

**Honest summary:** exactly 2 plays are implemented (progressRatio 0.5, confirmed by `buildScenarioFamilyReport`'s own "family has 2/4 target variants" warning). Of the 4 documented teachingArc entries, only item 3 has a clean 1:1 implemented match; items 1, 2, and 4 have no implemented play at all — the closest existing content (the generic "Choose your lane" play) is really serving as an ad hoc base read rather than a match for any specific arc entry. Both real plays individually pass constrain-first, live-rep, and mistake-mechanism cleanly. But the family fails the ladder check outright: the two plays that exist are the same openness level (identical "lane-pick" kind), so there is no constrain→open progression. Kernel coverage is absent, as expected. Net: half-built, a flat cue-variety pair rather than a ladder, and the label/story mapping between the checked-in teachingArc and the actual content is loose.

---

### forecheck_pressure

**Constrain-first — PASS** (for what exists). The play mapping to the arc's opening beats, `play_forecheck_pressure_force_wall_u13_v1` ("Force the wall"), is a genuinely single, forced read: exactly one correct option (`angle_wall` → forcedWall) and three wrong options that all funnel to the SAME failure terminal (`middlePass`, "the middle opens"). No ambiguity about what "right" looks like.

**Ladder — FAILS.** Only 2 plays are actually implemented (2/4 target), and both are the SAME openness level — single-forced-read multiple-choice (`kindCounts` reports `{"read-mc": 2}`, no other kind present). `play_forecheck_pressure_take_away_reverse_u13_v1` ("Take away the reverse") changes the cue (a later moment: carrier already up the wall with a trailer) but is exactly as constrained as play 1 — one correct option among four, three wrong options each funneling to a distinct-but-equally-forced failure terminal. This is "cue variety at one openness level," which the rubric explicitly names as failing the ladder even when individually well-formed. Neither play is a genuinely open, multiple-viable-reads variant. The family's own teachingArc names 4 beats ("Approach inside-out," "Take away middle," "Force wall," "Recover if puck carrier escapes") but only 2 plays exist total: the first 3 arc labels all compress into ONE play's single decision node, the 4th arc label has ZERO implementation anywhere, and play 2's actual beat ("seal the reverse lane on the finish") isn't named in the teachingArc at all. Even the family's own narrated arc doesn't match what got built, on top of the ladder never opening past the base read.

**Live-rep — PASS.** Both plays are real animated decisions: actors array with roles (defender/puckCarrier/support/goalie), enter/pos coordinate keyframes, motions arrays (skate/pass/blocked with from/to coordinates and labels), freeze overlays, and a full ask/opts decision node. No static concept-label entries.

**Mistake-mechanism — PASS.** Every wrong option in both plays carries a `no:` string naming the hockey mechanism, paired with a distinct `outcome:` consequence. Examples from play 1: "Straight pressure lets the puck carrier choose either side." / "Chasing gives the puck carrier time to scan." From play 2: "A straight rush lets the carrier turn back and escape the way they came." / "Committing to the wall early leaves the middle open." Play 2 additionally routes each wrong choice to its OWN distinct terminal rather than one shared failure state, reinforcing the mechanism with a differentiated visual outcome.

**Kernel-coverage — FAILS / no coverage.** `src/play/kernels/` contains only `twoOnOneKernel.js`. No forecheck-pressure kernel of any kind — both plays are fully hand-authored literal objects with hardcoded coordinate arrays, same as every family except `two_on_one`.

**Real implemented plays found:**
- `src/play/plays/forecheckPressure.js` → `play_forecheck_pressure_force_wall_u13_v1` ("Forecheck pressure: Force the wall")
- `src/play/plays/forecheckTakeAwayReverse.js` → `play_forecheck_pressure_take_away_reverse_u13_v1` ("Forecheck pressure: Take away the reverse")

**Honest summary:** 2 real implemented plays against a target of 4 (`buildScenarioFamilyReport` confirms 2/4; `familyCompletionLabel` = "building"). Both individually are well-built, live, animated, single-forced-read decisions with genuine mistake-mechanism feedback — constrain-first, live-rep, and mistake-mechanism all hold up on real evidence. But the ladder check fails outright: both plays sit at the identical openness level, so this is "one decision tested two ways," not a Blocked-to-Random progression. No pressure/timing variant distinct from a cue swap, no common-mistake-trap variant, and no genuinely open variant exist. The teachingArc text is also out of sync with the real builds — 3 of its 4 named steps fold into play 1's single node, its 4th named step is entirely unbuilt, and play 2's real content isn't named in the arc at all. Kernel-coverage fails cleanly, as expected for every family besides `two_on_one`.

---

### gap_control

**Constrain-first — PASS.** Confirmed via `classifyPlayFamily(play).id==='gap_control'` against `ALL_ANIMATED_PLAYS` (25 total plays, 3 match this family) — exactly matches `playFamilies.js`'s own count logic, no missed/misclassified files. The arc's first entry, "Hold middle," maps to `play_gap_control_hold_middle_u13_v1`'s entry node: one ok option ("Hold inside gap and protect the middle") against three explicitly wrong distractors, each a genuinely different failure mode. A real, single, clearly-forced base read.

**Ladder — FAIL**, and more clearly than `two_on_one`'s own worked-example precedent. All 3 real plays share the identical closed structure — one correct MC answer against 2–3 wrong distractors — none more open than the base: (1) Hold the middle = forced choice among 4 at entry; (2) Match the rush speed = forced choice among 4, same shape, different cue (speed vs. position); (3) Judge the backing-in defender = a verdict+justify format, but still funnels to one correct verdict and one correct justify pick — structurally still single-forced-answer, not "multiple viable reads requiring live discrimination." No play reaches the "genuinely open variant" the Family Completion criteria call for. Family is also short a variant (3/4 target). The stale `docs/factory/next-scenario-variants.md` recommends exactly one more variant ("Too much backing in," kind `predict-next`) which appears already built — but as the verdict play (a different kind than recommended), and in the SAME closed-openness shape as the others. So even filling the family out to 4/4 as currently planned would not complete the ladder; there is no plan on record for a genuinely open closing variant. Separately, the 4-entry teachingArc doesn't cleanly map onto the 3 real plays: arc #1 maps cleanly to play 1; arc #2 ("Close space before blue line") is only touched secondhand by play 3's justify answer text, not its own live rep; arc #3 ("Do not overcommit") has no dedicated play at all — it survives only as wrong-answer flavor text inside play 2; arc #4 ("Recover if attacker changes speed") is approximated by play 2 but that play is an attacker-approaching read, not a recovery-after-the-read-changed-mid-rep scenario.

**Live-rep — PASS** for all 3. Every matched play is `type: "animated-play"` with real actor arrays, enter/pos coordinates, and motions (skate/blocked/shot). Play 3 adds a "watch" node (autoNext after 2600ms) before its judge/ask node, but that's still a live animated setup, not a text-only prompt.

**Mistake-mechanism — PASS, cleanly, across all 3 plays** — checked every `opts[].no` / `opts[].why` string directly. Examples: "Reaching early can open the middle lane," "Backing in gives the attacker time and space," "A fast attacker can beat a flat-footed defender," "Backing straight in hands the attacker time and the whole middle." Every wrong option names a specific hockey mechanism, never just marking the choice incorrect. A genuine strength of the family regardless of the ladder gap above.

**Kernel-coverage — NOT COVERED.** `src/play/kernels/` contains exactly one file, `twoOnOneKernel.js` — grepped the whole `kernels/` dir for gap-control terms and found nothing. All 3 plays are hand-authored-only.

**Real implemented plays found:**
- `play_gap_control_hold_middle_u13_v1` — "Gap control: Hold the middle" — `src/play/plays/gapControlHold.js` — kind: read-mc
- `play_gap_control_pivot_match_speed_u13_v1` — "Gap control: Match the rush speed" — `src/play/plays/gapControlPivotMatch.js` — kind: read-mc
- `verdict_gap_control_backing_in_u11_v1` — "Gap control: Judge the backing-in defender" — `src/play/plays/verdictGapControlBackingIn.js` — kind: verdict

**Honest summary:** 3 real, well-built animated plays against a target of 4. The family's genuine strength is mistake-mechanism feedback — every wrong answer in all 3 plays explains the hockey reason it fails — and the base read is legitimately single and forced, so constrain-first and live-rep both pass cleanly. The real gap is the ladder: all 3 plays are the same closed shape, so the family is "one decision tested three ways" rather than a progression, and the teachingArc's 4 labels overstate how many have a dedicated live rep. The stale factory report still lists this family as needing its 4th variant even though that variant appears already built (in a different kind than recommended) — worth reconciling, and worth deciding on purpose whether the still-missing element is a 4th cue variant or the genuinely-open closer the Family Completion criteria call for, since nothing built or planned reaches that yet. No kernel exists.

---

### off_puck_support

**Constrain-first — PASS** (for the one real base read that exists). `play_off_puck_support_window_u11_v1` ("Find the window," node `supportRead`) is a genuinely single, clearly-forced read: 4 options, exactly one correct, and the 3 wrong options (stand still, skate toward puck, hide behind defender) are unambiguously wrong, not "also reasonable" alternatives. A well-built constrain-first base read.

**Ladder — FAIL** — there is no ladder, because there is effectively only one authored decision in this family. Programmatic classification returns exactly 3 plays, but two of the three are not real additional variants: (1) `play_off_puck_support_window_u11_v1_mirror` is produced by `mirrorPlayY()` — a pure geometric Y-axis flip of the base play's nodes (same actors, same 4 options, same feedback text, same terminals — only coordinates change). That is exactly the Variant Rules' called-out weak pattern ("moving tokens slightly without changing the read"), not a new cue. (2) `supportangle_2v1_flat_support_u11_v1` ("2-on-1: Create the passing angle") is a real, distinct, well-built play — but it isn't authored as part of this family's teaching arc at all. It's a 2-on-1 passing-angle question (sourceRef `docs/library/two-on-one-support-too-flat.md`, concept "off-puck-support") that lands here only because `classifyPlayFamily`'s concept-match checks `off_puck_support`'s matchTerm ("off-puck") as a substring of its concept string — a `two_on_one`-family play swept in by a string-matching coincidence, not a genuine rung in this family's progression. **Independently re-verified for this report: `src/play/plays/supportAngleFlat.js` line 5 reads `concept: "off-puck-support"`, and `"off-puck-support".includes("off-puck")` is trivially true — the leak is real, not a misreading.** Net: of the 4 teachingArc entries ("Find open window," "Do not stand behind coverage," "Move as pressure changes," "Give puck carrier a safe option"), only the first has an implemented play; the 2nd is covered only as one wrong-answer branch inside the SAME base node; the 3rd and 4th have no implemented content at all. Zero pressure/timing variant, zero common-mistake-trap variant, zero genuinely-open variant.

**Live-rep — PASS** for what exists. All 3 matched plays are real animated decision nodes — but this only speaks to 1 real base decision plus 1 non-variant mirror plus 1 misfiled import, not to a real progression of live reps.

**Mistake-mechanism — PASS** for the content that exists. Base play wrong-answer feedback is genuinely mechanism-based: "Standing still keeps you covered." → "The passing lane stays closed."; "That brings your defender into the puck carrier's space." → "Pressure gets tighter."; "The puck carrier cannot pass through the defender." → "You are not available." The borrowed 2v1 play is similarly mechanism-based. The gap in this family is quantity/progression, not feedback quality.

**Kernel-coverage — FAIL / no coverage.** `src/play/kernels/` contains exactly one file, `twoOnOneKernel.js`. No `offPuckKernel.js` or equivalent exists.

**Real implemented plays found:**
- `play_off_puck_support_window_u11_v1` — `src/play/plays/offPuckSupport.js` — the true base read ("Find the window"); single forced decision, well-built, mechanism-based feedback
- `play_off_puck_support_window_u11_v1_mirror` — generated via `mirrorPlayY(OFF_PUCK_SUPPORT_PLAY, ...)` in `playCatalog.js` — a pure geometric Y-flip of the base play, not a new cue/read; identical options and feedback text
- `supportangle_2v1_flat_support_u11_v1` — `src/play/plays/supportAngleFlat.js` ("2-on-1: Create the passing angle") — a real, distinct, well-built play, but a `two_on_one`-family play that lands here only because its concept string "off-puck-support" contains the matchTerm "off-puck"; not an authored rung in this family's arc

**Honest summary:** reports 3/4 target variants via the raw `buildScenarioFamilyReport` count, which looks close to complete — but that count is misleading. The family in truth has exactly ONE authored decision. It passes constrain-first cleanly. The other two counted entries are not real additional rungs: the "mirror" is a mechanical geometry flip of the exact same play; the third is a genuinely good but misclassified `two_on_one` play (confirmed real, not a misreading). Of the family's own 4-step teachingArc, only step 1 has an implemented play; step 2 exists only as a wrong-answer option inside that same node; steps 3–4 have no implemented content whatsoever. Live-rep and mistake-mechanism pass for the content that does exist; kernel coverage is absent. Bottom line: this family is functionally a single well-built base read wearing a 3-variant reported count; it needs 3 genuinely new plays before it satisfies its own Progression Rubric, and its matchTerm overlap with `two_on_one` is worth tightening so accidental cross-family classification doesn't recur.

---

### dz_breakout

**Constrain-first — PASS** for the one play that exists. The single node ("retrieval") in `play_dz_breakout_escape_pressure_u13_v1` presents 4 tap-zone options with exactly one marked correct and three distinct wrong terminals. A genuinely single, clearly-forced read, matching the arc's first entry. The play's own code comment even frames it as "correct-by-construction," structurally comparable to `two_on_one`'s kernel-forced base reads.

**Ladder — FAIL**, and not narrowly — there is no ladder to check. Only 1 of the 4 teachingArc entries has any implemented play behind it. Entries 2–4 ("Pressure-side outlet is a red herring," "Escape lane taken away," "Outlet covered → middle support or glass-and-out") exist ONLY as prose strings in `playFamilies.js` — confirmed none of the one real play's 4 options secretly covers entry 2's "red herring" framing. Constraint-openness cannot even be assessed moving through the arc, because there is nothing after entry 1. This is a worse finding than `two_on_one`'s "same-openness-level" problem: `two_on_one` at least has 6 real plays to judge a (flawed) ladder against; `dz_breakout` has 1 real play and 3 aspirational labels. Critically, the rung meant to close the ladder — the genuinely-open discrimination variant — is entirely absent.

**Live-rep — PASS.** The one implemented play is a full animated node: named actors (D1/W1/F1/F2/G) with enter/pos coordinates, skate/pass/blocked/shot motion arrays, a freeze frame, and a lane-pick choiceMode with real zone-based tap targets and distinct terminal outcome nodes, each with its own actor positions and motions.

**Mistake-mechanism — PASS**, and this is the strongest part of the family. All three wrong options carry mechanism-based feedback: "They are arriving with speed you do not have yet, and behind your own net is the worst place to lose a puck battle."; "The slot is the most dangerous ice on the sheet, and the second forechecker is already reading it."; "The second forechecker is already coming, so waiting turns one problem into two." Each also has a distinct "outcome" line describing the concrete consequence.

**Kernel-coverage — NO kernel exists.** `src/play/kernels/` contains exactly one file, `twoOnOneKernel.js` — nothing matching dz_breakout, breakout, or retrieval. Notably, the one implemented play's own source comment explicitly flags itself as a kernel candidate ("which is what makes this a kernel candidate rather than a one-off"), meaning the author already identified the parameterizable axis (which side the forechecker commits to) but no kernel was ever built to generate variants from it.

**Real implemented plays found:**
- `play_dz_breakout_escape_pressure_u13_v1` (`src/play/plays/dzBreakoutEscapePressure.js`) — concept: dz-breakout, ageBands U11/U13/U15/U18, single retrieval node with 4 tap-zone options (1 correct, 3 wrong with distinct terminal outcomes)

**Honest summary:** the thinnest family in the catalog — 1 real play against a target of 4 (25% coverage), versus 2–3 real plays for other families. The single implemented play is genuinely good on its own terms — cleanly passing constrain-first, live-rep, and mistake-mechanism, with mechanism-specific coach feedback that may be a model for other families to match. But the family as a whole fails the ladder check outright: 3 of the 4 teachingArc entries (including critically the genuinely-open closing variant) are pure prose with zero backing implementation. No cue-change, pressure/timing, common-mistake, or open-discrimination variant exists. Kernel coverage is absent, though the play's own authoring comment already identifies the exact parameter a kernel would need, making this a strong, well-scoped candidate for the next kernel built after `two_on_one`'s. Net: not a flawed progression like `two_on_one`'s "one decision tested six ways" — a progression that stops after step one, with the label text for steps two through four already written but nothing built behind them.

---

### defensive_angling

**Constrain-first — narrow pass, with a mismatch flagged.** The one real decision node (in `play_defensive_angling_steer_wide_u11_v1`) IS a single, clearly-forced read: exactly one correct option and three wrong options, each routed to a distinct "no" outcome. As a standalone read it satisfies constrain-first. BUT it does not correspond to the teachingArc's actual first entry. `teachingArc[0]` is "Inside shoulder wins" — the implemented node instead presupposes inside position as a given ("you have inside position") rather than testing the decision to win/hold inside shoulder; its actual content maps to `teachingArc[1]` ("Steer wide"). `teachingArc[0]` has no implemented play isolating it as its own forced decision.

**Ladder — FAILS outright** — there is no second decision. `classifyPlayFamily` matches exactly 2 catalog entries, but both come from ONE authored file (`src/play/plays/defensiveAngling.js`): the base play and a `mirrorPlayY()` clone ("far side"). Reading `mirrorPlayY`/`mirrorNodeY` in `src/play/playVariants.js` directly: it only flips x/y coordinates on enter/pos/puck/freeze/motions/overlays/cue — it never touches the question, options, ok/no flags, feedback text, or decisionActor. Constraint-openness does not increase from entry 1 to entry 2 — it doesn't even change. This is the Variant Rules doc's own "weak variant" example ("moving tokens slightly without changing the read") playing out at the family level: 2 catalog rows, 1 real decision. teachingArc entries 3 ("Do not chase from behind") and 4 ("Finish with good stick position") have zero implemented plays — not even a wrinkle-variant or common-mistake-only version. `playFamilies.js`'s own `familyCompletionLabel()` would call this "building" (count=2 ≥ ceil(4/2)=2) — that automated label overstates real progress, since the ground truth is 1 authored decision, not 2.

**Live-rep — PASSES cleanly.** Both catalog entries are real animated-play nodes: actors (A1 puck carrier, D1 defender/YOU, A2 support, G goalie) with enter/pos coordinates, a skate motion and a "blocked" motion into the goalie's protected middle, a freeze-frame overlay, and a live ask{} decision block. This holds for the mirror too — it's the same live node, just coordinate-flipped.

**Mistake-mechanism — PASSES** — the family's genuine strength. Reading the actual opts array: "Reaching can open the middle lane." → "The attacker cuts inside."; "Backing straight in gives the attacker too much middle ice."; "Stopping gives the attacker speed advantage." Each wrong answer gets a distinct, hockey-specific mechanism, not a generic "incorrect" — genuinely satisfies mistake-mechanism for the one decision that exists (it just covers one decision, three times over, not four distinct arc steps).

**Kernel-coverage — no kernel exists.** `src/play/kernels/` contains only `twoOnOneKernel.js` — nothing for defensive_angling. This play is entirely hand-authored, and its only "variant" was produced by a geometric mirror utility, not a kernel-driven decision axis like `two_on_one`'s commit/holdsMiddle parameters.

**Real implemented plays found:**
- `play_defensive_angling_steer_wide_u11_v1` (`src/play/plays/defensiveAngling.js`) — the one authored decision: single forced read, steer_wide vs 3 mechanistically-explained wrong options
- `play_defensive_angling_steer_wide_u11_v1_mirror` (generated via `mirrorPlayY(DEFENSIVE_ANGLING_PLAY, ...)` in `src/play/playCatalog.js`) — a pure coordinate-flip clone of the same play; identical q/opts/feedback/decisionActor, only positions and motion paths are mirrored

**Honest summary:** has a targetVariants of 4 and a 4-step teachingArc, but the real implemented content is exactly ONE authored decision, catalogued twice because `playCatalog.js` runs it through `mirrorPlayY()` to produce a geometrically-flipped duplicate. This is not "2 of 4 variants built" in any meaningful sense; it is 1 forced read, counted twice by a bookkeeping artifact. Constrain-first narrowly passes for the one real node, but that node's content maps to `teachingArc[1]`, not `teachingArc[0]` — the arc's labeled first step is unimplemented. The ladder check fails outright: there is no second, more-open decision anywhere; arc entries 3 and 4 have zero implemented plays. Live-rep passes trivially. Mistake-mechanism passes genuinely — three wrong options each get a distinct, hockey-specific "why," real strength worth preserving when this family is expanded. Kernel-coverage is none, as expected. Bottom line: currently a 1-play family wearing a 4-entry teachingArc and a 2/4-variants label it doesn't substantively earn.

---

## Cross-family patterns

- **Kernel coverage is 0-of-6 for every audited family, and only partial (2-of-6 variants) even in `two_on_one`, the one family with any at all.** This is the single most consistent finding in this audit and should be stated plainly rather than buried per-family: the generation pipeline currently cannot reach 6 of the 7 families. Every play in `backcheck_recovery`, `forecheck_pressure`, `gap_control`, `off_puck_support`, `dz_breakout`, and `defensive_angling` is a fully hand-authored literal object, with `src/play/kernels/` containing exactly one file (`twoOnOneKernel.js`) across the entire catalog.

- **The ladder check fails in every single family, with no exception, including the reference family `two_on_one`.** Not one family has a genuinely open, multiple-viable-reads variant anywhere in the catalog. Every family currently tops out at closed, single-correct-answer decisions — whether that's expressed as "one decision tested six ways" (`two_on_one`), a flat cue-variant pair (`backcheck_recovery`, `forecheck_pressure`), three closed-shape plays (`gap_control`), or a single decision inflated by a bookkeeping artifact (`off_puck_support`, `defensive_angling`). The "constrain-to-open" curriculum design described in `docs/scenario-family-standards.md` is, as of this audit, aspirational everywhere in the codebase, not partially realized in some families and missing in others.

- **Live-rep and mistake-mechanism pass almost universally wherever real content exists.** Every family's hand-authored plays are genuine animated decision nodes (actors, coordinates, motions, freeze frames, ask/opts blocks) with hockey-specific "why it fails" copy on every wrong option, not bare "incorrect" markings or static concept labels. This is a real, consistent strength of the content that does exist, independent of how much of each family's arc is actually built. (`two_on_one`'s mistake-mechanism was left unverified in its original pass, so it's the one open item on this front rather than a confirmed pass.)

- **Most families are meaningfully below their own `targetVariants`, and the true shortfall is often larger than the automated report shows.** `buildScenarioFamilyReport`'s raw counts can overstate real progress: `off_puck_support` reports 3/4 but has 1 real authored decision (a geometry-mirror clone and a misclassified `two_on_one` play inflate the count — independently re-verified for this report); `defensive_angling` reports 2/4 by the same mirror-clone mechanism but also has 1 real authored decision. `dz_breakout` (1/4) and `backcheck_recovery`/`forecheck_pressure` (2/4 each) are honestly reported but still well short.

- **Documented `teachingArc` text is an unreliable map of built content across nearly every family, not just an isolated slip.** In every audited family, at least one arc entry describes a step with zero implemented play behind it (`backcheck_recovery` items 1, 2, 4; `forecheck_pressure` item 4 plus a 3-into-1 compression of items 1–3; `gap_control` items 2 and 3 with no dedicated play; `off_puck_support` items 2–4; `dz_breakout` items 2–4; `defensive_angling` items 1, 3, 4). This is systemic across the catalog, worth a dedicated reconciliation pass regardless of what content work follows.

- **`classifyPlayFamily`'s substring matchTerm logic causes at least one confirmed cross-family leak.** `off_puck_support`'s matchTerm ("off-puck") matched against a `two_on_one`-authored play's concept string ("off-puck-support"), pulling a well-built but unrelated play into the wrong family's count. Independently re-verified for this report by reading `src/play/plays/supportAngleFlat.js` directly. Worth a tightening pass on matchTerm specificity independent of any content work.

- **Where a stale automated report and the real catalog diverge, the report can already be wrong.** `docs/factory/next-scenario-variants.md` still recommends a 4th `gap_control` variant that appears to already be built (as the verdict play, in a different `kind` than the report recommended) — a reconciliation gap worth flagging on its own.

---

## What this does not do

This is a read-only audit. It does not change any family's scenario content, teachingArc text, play catalog entries, kernels, or any source file — nothing under `src/play/` or `docs/scenario-family-standards.md` was modified in producing it. It does not fix the arc/content mismatches, build any missing variants, correct the `off_puck_support` classifier leak, reconcile the stale `next-scenario-variants.md` report, or build any new kernel. Any of that retrofitting — new plays, kernel builds, matchTerm tightening, arc-text corrections, or report regeneration — is a separate, not-yet-authorized follow-on task, consistent with the standing pattern from tonight's other design docs (design/analysis first, build only on explicit go-ahead).
