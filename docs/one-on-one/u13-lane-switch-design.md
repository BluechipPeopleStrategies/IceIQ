# U13 connected reads: Read the lane switch

**Status:** Implemented local coach-review draft under the owner's overnight age-expansion direction; the new version is not yet verified as deployed. Production-preview save, reload, recall and download checks are complete for the U13 implementation before the new 3D presentation. The 3D presentation is under release review. Not age-validated, tactically graded or admitted to the curriculum.

**Drafted:** 2026-09-05. Implementation decision: use option 1 below, a clearly described worked Shoot/Carry comparison with four complete paths. Carry teaches a changed lane; Shoot continues with loose-puck support. Completion records reflection, not mastery of a shared objective. Preserve the existing U9/U11 definitions, saved outputs and U11 optional judging/comparison. No change to curriculum admission or the ledger.

The local implementation contains a U13 scenario definition and recall captions in the existing connected-read catalog, age-aware presentation, phone age-picker wrapping and disabled unsupported review controls. Geometry, branch and persistence tests are passing, and all four paths have completed in the production-preview browser at a 390 px phone viewport. The verification record below separates the completed pre-3D checks from the later presentation update and physical-device review. Root owns UI/browser integration, a data agent owns scenario/core/recall, and an independent reviewer checks source and state claims. No new physics, AI connection or production character system is introduced.

## Teaching purpose

Read the lane that the defender actually removes, then look again after the play changes. In the opening picture D1 occupies the cross-ice pass lane, leaving the route toward the net clear of D1. In the Carry continuation D1 moves into the shot route, the goalie shifts toward F1 and F2 advances across the ice. The learner must update the read instead of carrying the opening answer forward.

The progression beyond the current U11 sequence is the visible reversal of which lane D1 removes. U11 already has partly shaded shot coverage, slightly flat support and goalie movement. More complex wording about those same cues would not establish a new U13 lesson. Here, the defender's lane changes across two observable states, alongside changed goalie alignment and forward support.

The goalkeeper's movement is an observable change in position. The lesson must not claim to measure a set stance, recovery speed, reaction time or an inevitable opening. Current connected-read states represent position and facing, not a validated goalie recovery state.

## Sources and what they support

| Repository source | Use in this draft | Boundary |
|---|---|---|
| [Odd-Man Reads](../library/odd-man-reads.md) | Read defender commitment; its U13 calibration connects defender commitment and goalie movement as one sequence. | The specific cross-ice pass answer in that note applies to its own authored scene. Do not transfer its answer to an opening where D1 occupies the pass lane. |
| [2-on-1: Pass Lane Removed](../library/two-on-one-pass-lane-removed.md) | A 2-on-1 does not automatically require a pass. When D1 removes that lane, consider the open shot lane or attack space. | It does not guarantee that a shot scores or that a carry forces a particular defender response. |
| [2-on-1: Support Too Flat](../library/two-on-one-support-too-flat.md) | Availability alone does not make a pass useful. F2's advance after Carry gives the learner a new support relationship to discuss. | Do not turn any lateral alignment into an automatic wrong answer. The note supports comparing usefulness, not grading one coordinate. |
| [Off-Puck Support, Offense](../library/off-puck-support-offense.md) | Discuss open ice, support angle, distance and an available passing lane when an attacker possesses the puck. | Its approximately 0.035 lane threshold belongs to the normalized static seed context. It is not a metre-based reach or interception threshold for this sequence. The note does not establish a graded loose-puck recovery rule. |
| [Curriculum ledger](../../src/data/curriculum-ledger.json) | U13 odd-man reads: D; decision-making: D; off-puck support: M. | M describes mastery emphasis under semi-controlled conditions, with predictable tempo for reads. These tags do not validate this lesson or justify adding a timer. |

These repository notes support the teaching concepts. All coordinates, transitions and outcomes below are newly authored illustrations, not movements supplied or certified by those sources. The linked notes' source lineage does not independently validate these new states.

## Worked comparison and contract tradeoff

Offer **Shoot / Carry** as a transparent worked comparison. The implemented introduction is always visible, including at the phone viewport:

> This worked example compares Shoot and Carry. Carry shows a lane change; Shoot leads to loose-puck support. Watch your chosen play, then explain how the other attacker could help.

This deliberately limits the offered first choices; it is not an exhaustive list of hockey actions. The opening pass is visibly occupied by D1. Do not add a successful straight pass through that defender just to retain three action buttons. If a future version requires Pass as a third opening action, it needs an independently authored and reviewed consequence rather than automatic arrival at F2.

The **Carry branch carries the lane-switch objective**. Its next freeze supports a new puck decision because D1 has changed lanes while the goalie and F2 have moved.

The **Shoot branch becomes loose-puck support**. Its second read is about where F2 should support, followed by a plan for F1. It does not provide the same second shot/pass decision as Carry. No goalie save, rebound or pickup is assumed.

If the curriculum requirement is that every completed attempt demonstrates the defender-and-goalie lane-switch read, the full three-read contract weakens that objective on Shoot. Implementation selected option 1 from the following treatments; the alternatives remain here as the design decision record:

1. Keep both complete branches, explicitly describing this as a worked Shoot/Carry comparison with different follow-up reads. Record completion as participation/reflection, not proof that every learner met the lane-switch objective.
2. Present Carry as a worked continuation after the opening discussion, so everyone observes the lane switch. This changes the current action-dependent consequence contract and must be labelled as a separate example rather than pretending the learner chose Carry.
3. Let Shoot finish earlier with discussion. This changes the current fixed three-read completion contract.

The authored states below implement option 1. Options 2 and 3 remain unimplemented alternatives. A fabricated rebound, guaranteed recovery or unrelated return pass would conceal the tradeoff rather than solve it.

## Authored state geometry

Use the canonical rink frame in metres, attacking toward positive x. F1 is labelled `YOU`; F2, D1 and G may retain their U13 labels. F1 owns the opening puck. All actors remain inside the attacking zone.

For these freezes, F1 and F2 face 0 radians and D1 faces pi radians. Implementation review found that a fixed goalie facing pi looked away from the actual puck; G now faces the helper-derived puck at each authored freeze. Interpolated facing is illustrative, not a measured set stance, tracking or recovery state. Owned puck positions use the shared state helper, not the carrier's centre. An unowned puck uses the explicit loose position below. Independent geometry review and the browser checks below cover this local marker presentation; they do not establish a validated player or goalie model.

| State ID | F1 / YOU (x, y) | F2 (x, y) | D1 (x, y) | G (x, y) | Puck |
|---|---|---|---|---|---|
| `opening` | (17, 5) | (17, -5) | (17.5, 0.35) | (25, -1.2) | Owned by F1 |
| `after-carry` | (20, 5) | (22, -4.5) | (23.8, 3.5) | (25, 1.5) | Owned by F1 |
| `carry-pass-f2` | (21, 5) | (22, -4.5) | (24, 3) | (25, -0.4) | Owned by F2 |
| `carry-outside` | (22, 6.5) | (22, -4) | (24, 3.5) | (25, 2) | Owned by F1 |
| `after-shoot` | (18.5, 5) | (19, -4.5) | (19, 0.5) | (25, 1.5) | Unowned at (23.2, 3.2) |
| `shoot-inside-support` | (19, 4.6) | (22, -1) | (20, 0.4) | (25, 2) | Unowned at (23.2, 3.2) |
| `shoot-wide-support` | (19, 4.6) | (20, -5) | (20, 0.4) | (25, 2) | Unowned at (23.2, 3.2) |

All other state attributes use the existing shared actor/state contracts. The shared interpolation adds a small lateral curve to unowned-puck transitions, including transitions whose loose-puck endpoints match. Therefore describe the puck as remaining loose, not staying motionless; do not change existing U9/U11 interpolation in this slice. The table names identify the authored freezes within the registered scenario; runtime selects the opening, branch state or target state through the existing session contract. No transition duration has been validated as a physical measurement. Do not derive a claim about skating speed, puck speed, defender reach or goalie recovery from the interpolation duration.

## Read 1: action and reason

**Prompt:** "You have the puck. Would you shoot or carry here? What on the ice supports your choice?"

**Choices:** Shoot; Carry.

**Reason label:** "What did you notice?"

Do not front-load an answer in the prompt. Discussion after the response can compare D1's position between F1 and F2, the route toward the net, F2's current support position and the goalie's alignment. Neither choice receives an automatic grade.

| Choice | Consequence | What the illustration does not establish |
|---|---|---|
| Carry | Animate `opening` to `after-carry`. F1 retains the puck, F2 advances, D1 moves into the shot route, and G shifts toward F1's side. | Carrying does not necessarily make D1 or G respond this way. Say "In this example, D1 moves...", not "Your carry forces D1...". |
| Shoot | Animate `opening` to `after-shoot`. The puck travels into the shown net-front space and remains unowned short of the goalie. | No goal, save, rebound or possession recovery has been shown. Do not describe any of them. |

The opening is a static freeze in the current contract. Do not claim the learner saw a pre-opening commitment or goalie movement. The relevant visible movement occurs after the first choice.

## Read 2: branch-specific target

### After Carry

**Prompt:** "The players have moved. Where should the puck go next?"

**Optional cue:** "Look again at D1, the goalie and F2. What changed?"

| Target ID | Label / kind | Target coordinate | Resulting state | Authored outcome |
|---|---|---|---|---|
| `pass-f2` | F2 / receiver | (22, -4.5) | `carry-pass-f2` | F1's pass reaches F2; F1 becomes the off-puck support player. |
| `outside-space` | Outside space / space | (22, 6.5) | `carry-outside` | F1 keeps the puck and carries into the chosen space; F2 remains off the puck. |

The source-supported observation is that D1 now occupies the route toward net centre while the pass to F2 has separation from D1. F2 is farther forward and across the ice, and G has shifted toward F1. A successful authored pass is not proof that the pass always arrives or is the only defensible action. The outside continuation must not be framed as a punishment.

### After Shoot

**Prompt:** "The puck is still loose. Which space should F2 support?"

**Optional cue:** "Look at the loose puck, your position and D1 before choosing a space."

| Target ID | Label / kind | Target coordinate | Resulting state | Authored outcome |
|---|---|---|---|---|
| `inside-support` | Inside support space / space | (22, -1) | `shoot-inside-support` | F2 moves into the selected space. The puck remains unowned. |
| `wide-support` | Wider support space / space | (20, -5) | `shoot-wide-support` | F2 moves into the selected space. The puck remains unowned. |

These are positions to discuss, not source-certified recovery answers. Do not say either route wins possession, arrives first or guarantees a future passing option. Do not animate the puck back out from the goalie: the current two-endpoint transition has not depicted an impact and rebound.

## Read 3: placement or route and reason

Use the existing free placement / optional route interaction. The route must start at the selected branch's actual off-puck actor position, with its endpoint equal to the saved final placement. Preserve the selected puck owner or unowned puck; moving support must not move the puck or rewrite the earlier answers.

| Path | Movable actor | Fixed route origin | Prompt |
|---|---|---|---|
| Carry -> F2 | F1 | (21, 5) | "Where should the highlighted player go to offer useful support? Explain the space and passing lane." |
| Carry -> outside space | F2 | (22, -4) | Same possession-support prompt. |
| Shoot -> inside support | F1 | (19, 4.6) | "Where should the highlighted player go while the puck is loose? Explain how that fits the other players." |
| Shoot -> wider support | F1 | (19, 4.6) | Same loose-puck prompt. |

**Reason label:** "Why does this position help?"

For possession branches, discuss usable support space, a passing line and separation. For loose-puck branches, discuss the player's plan and relationship to the visible players without treating the carrier-based support rule as a recovery grade. A coordinate or a route is evidence of the learner's intended plan, not proof of a sound read. Do not require matching one authored ideal point.

## Implemented runtime contract and retained boundaries

- `u13-lane-switch-three-reads-v1` is registered locally with an explicit U13 age band and separate storage scope. It does not reuse the legacy U11 key or reinterpret existing U9/U11 saves.
- Keep the original action/reason, target, support point/route and support reason immutable once completed. Replays must show the actual selected branch.
- Existing per-scenario action lists can express the worked Shoot/Carry comparison. Preserve normal Carry possession and Shoot's unowned puck semantics.
- The first branch and each target must supply its own consequence, prompt, target list and final off-puck actor. Do not let generic copy call a loose-puck situation a completed pass or possession support.
- Keep prompts neutral. Observed movement may inform a decision; unknown opponent intent cannot support a prediction answer.
- The current U11-only changed-cue and final-position AI boundaries remain unchanged. U13 adds no AI call, key, automatic tactical grade, XP, timer or guaranteed outcome.
- Optional recall reconstructs the selected three authored freezes with U13-specific captions. Tests verify that it does not substitute the Carry lane-switch sequence for a learner who chose Shoot. Production-preview completion, reload, recall and download checks passed before the 3D presentation update.
- Preserve pause/replay, reduced-motion inspection, readable phone prompts, coordinate input and route controls. Browser checks at a 390 px phone viewport are recorded below; physical phone or iPad testing has not been established by these checks.

## Historical checks performed while drafting

Read-only Node checks used `createSequenceState` and the current shared puck offset. The seven candidate freezes were accepted by the existing geometry validator. That establishes accepted state shape and rink bounds, not physics or tactical validity.

- At the opening, F1's actual puck position is (18, 5.7). D1 is on the segment from that puck to F2's centre. D1 is approximately 4.77 m from the segment to net centre at (26.89, 0).
- After Carry, D1 is approximately 2.57 m from the puck-to-F2 segment and 0.37 m from the segment to net centre. These illustrate the intended change in lane coverage; they are not certified reach thresholds.
- Sampling the current Carry-to-pass puck interpolation at 1,001 evenly spaced progress values gave approximately 2.26 m minimum separation between puck and D1's centre. This includes the shared owned-puck offset and the current interpolation's small lateral arc. It is a visual geometry check, not an interception or reaction-time test.

Those initial proposal checks were read-only: no browser review, physical-device test, new runtime test or implementation had been performed at that drafting stage. The subsequent local implementation and verification are recorded separately below. The lesson remains an ungraded worked comparison under option 1.

## Completed production-preview verification before 3D — 2026-09-05

- **Automated checks:** Eight new U13 tests pass, covering the actual offset puck's lane geometry, all four state/possession/support-actor paths, rejected opening Pass, route origins, point/route save and restore, replay identity, age-separated storage and recall, and unavailable U13 AI/comparison. The full practice suite passes **233 tests**, and the production build passes. The existing U11 golden fixture remains unchanged; existing U9/U11 behavior and saved-output tests pass.
- **Independent source and geometry review:** The reviewer checked the exact authored module against the four source notes and curriculum ledger, confirmed all four puck owners and route origins, and verified that G faces the actual offset puck at all seven freezes. Sampling six transitions at 1,001 points each found no puck overlap with the reviewed defender/goalie body or facing markers. Source wording separates Carry possession support from ungraded Shoot loose-puck positioning. These are source and diagram checks, not tactical, collision-physics or age validation.
- **Four phone-viewport paths:** Root completed Carry → F2, Carry → outside space, Shoot → inside support and Shoot → wider support in the production-preview browser at **390 px** with reduced motion. Each showed the correct puck owner or loose-puck state, correct movable support actor, and no U13 AI or changed-cue controls. No page errors or horizontal overflow were observed.
- **Playback and keyboard:** Normal-motion Carry paused at **58%** and resumed correctly. Keyboard age selection and focus passed. These are browser checks, not a physical-device performance claim.
- **Native rink and route controls:** A native touch on F2 reached Carry → F2. A touch route point at approximately **(20, 2)** followed by a numeric point at exactly **(22, 0)** retained the exact implicit origin **(21, 5)**. Route preview paused at **31%**.
- **Completion and persistence:** The completed reflection and recall were saved and reopened after reload; the saved reflection remained exact, and download checks passed. Both prior U11 records remained unchanged. These completed browser checks supplement the automated save/restore and recall tests.

## Later 3D presentation update — release review

The main connected-read board now has a navy/gold 3D rink and a Tactical board choice; recall and changed-cue comparison retain their flat boards. This is a presentation change over the canonical scenario state. The practice suite now passes **243 tests**, including the scene-frame and camera tests and public review asset checks. Final 3D browser and deployment verification remain part of the release review. Do not describe the pre-3D browser checks above as evidence for untested 3D controls or fallback behavior. The new version's deployment has not yet been verified, and no physical phone/iPad, skating-physics or curriculum-admission validation is claimed.

A passing build, geometry check or completed phone-viewport path must not be described as age or hockey validation.

## Release verification — September 5, 05:34 Edmonton

Code cf96277 is deployed on the public Practice Arena. The final suite passes 243 tests after the narrow-screen target-clamping regression. Live 390 px checks completed Carry → F2 using native touch, a touch route point from the exact origin plus a numeric endpoint, reduced-motion inspection, explanation, exact download and full-reload restoration. Three prior U9/U11 records remain unchanged; U13 recall opens and switching Tactical board/3D removes/restores its sole canvas. No errors, failed requests or overflow in this live flow. The earlier pending release statement is superseded by this record; physical-device and hockey-validation boundaries remain. Details: verification.md and phone-preview.md.
