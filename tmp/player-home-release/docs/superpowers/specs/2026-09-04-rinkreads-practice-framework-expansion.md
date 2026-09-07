# RinkReads practice framework expansion

Date: 2026-09-04. Active owner direction, supplied while the first 1v1 preview was being implemented. This extends the approved one-on-one design; it does not cancel that work.

## Owner requirements

- Integrate the existing RinkReads source work, scenarios, multiple-choice questions and coach personas into the new practice framework.
- Adapt RinkReads to this template and support 2-on-2, 3-on-3, 4-on-4 and larger reusable team configurations.
- Let Thomas move players anywhere on the playable ice, freeze individual players, and animate their movement as a play develops.
- Keep the approved Play, Read & React and Coach Lab modes, tablet/computer browser targets, and high visual ambition.
- Supply free alternatives alongside paid character/animation assets; no purchases without price review.
- Bring all twelve Brain Gym games into a contemporary visual system, including substantial graphics upgrades to the goalie shootout and decision games. Owner viewed the original/new shootout and requested a second quality pass on the goalie and overall menu aesthetic.
- Create coherent, age-appropriate curriculum lessons and questions, with matching visual cues, answers and explanations. Integrating the old bank alone is not sufficient. New teaching content remains clearly authored draft until the existing curriculum/coach gates pass.

## Integration principles

The existing source bank, catalog, age bands, correct answers, rationale and coach persona definitions remain authoritative. Import and adapt them rather than cloning or rewriting their truth. Never infer animation paths from a text question as though the source authored them. Existing interactive question types keep the current renderer/scorer until a new rendering adapter proves parity. Sources that do not have spatial data remain source lessons inside the new shell.

Development preview is a safe integration surface. Production art, hockey review, player-transfer claims and actual iPad testing remain distinct open gates. Source lessons must show source identity, age and provenance. Existing lessons can be selected by age/concept/type; source notes link to their real files rather than being bulk rewritten.

## Concrete framework pieces

1. **Source library:** inventory the live bank and scenario catalog from existing imports, retain IDs and references, expose existing MC/TF/sequence/mistake/next/scenario/animated-play items and their authentic renderers. Reuse the coach persona records, images, age-tier voice and feedback mechanisms. Clearly indicate adapted versus original presentation.
2. **Team templates:** parameterized side sizes, stable actor IDs and roles, scalable rendering and replay. Minimum presets 1v1, 2v2, 3v3 and 4v4, with separately represented goalies. Live multi-player work needs real support/opponent movement, possession and passing; additional static players alone do not count as supported gameplay.
3. **Coach director:** an authoring scene with per-player selection and dragging anywhere inside rink bounds, an independent frozen flag, timeline position keys, play/pause/scrub and reset. Frozen players stay in their authored positions while unfrozen actors move. Editing an existing timeline does not overwrite the live curriculum. Coach drafts save/reopen locally with versions and validation.
4. **Scenario bridge:** source scenarios can seed a coach draft only where coordinate and role mappings are explicit. Preserve source IDs and mark edits as draft. A visual demonstration and a validated teaching question are distinct artifacts; edited drafts do not inherit approved answers automatically.

## Staging order and review

Finish and review the current pure 1v1 contract, then build the source adapter and generic actor/director contracts. Root owns the shared shell/scene integration; an implementer may own the independent generic simulation extension. Add meaningful tests for source-answer preservation, team-size/ID/possession invariants, frozen actor motion, keyframe interpolation, and save/reopen. Browser-check the complete library-to-lesson and coach-edit-to-play paths, including small screens. Update the canonical roadmap with actual completion and remaining gates.

The original one-on-one implementation plan remains the record of the first slice. This expansion is now required work, not a parked idea.

## Live comparison requested during implementation

Thomas supplied the correct live app URL, `https://ice-iq.vercel.app/`. Its demo, existing question types, journey/progression, Brain Gym and Read the Play informed this work. Local comparison routes preserve an original 2-on-1 and the original shootout renderer from commit `87fa3dd`, beside the new interactive versions. Comparison screenshots are evidence of actual local rendering, not target-quality mockups.


## Bedtime direction and review scope (September 4)

Thomas confirmed a **7:00 a.m. Edmonton, September 5** first review. Prioritize an untimed U11 sequence with three connected reads, then extend the framework across ages. This expressly supersedes the August 2 deferral and U13-only consequence-chain restriction for this development preview. Preserve existing features and original source answer keys.

The organizing unit is a hockey sequence, with a response appropriate to each read: choose an action and explain the visible cue; tap a receiver or space; move a player; draw a route; predict or repair a change; compare alternatives; or use MC/TF when the situation supports a forced answer. A partly covered shot and imperfect support can support several defensible choices. Movement must follow the selected action, and a simulated goal/save or coordinate match must never be mistaken for sound hockey reasoning.

Coach questions have independent initial and reference snapshots plus learner attempts and explanations. Ready examples and a complete twelve-note concept/interaction inventory live under `docs/one-on-one/`. Optional AI feedback must use the source, visible geometry and observation rubric. The local server adapter remains explicitly unavailable without a server credential; mocked tests are not live AI verification.

The final brand direction supersedes black/yellow: BlueChip navy #0B1A33, gold #C9A24B, bone #F5EFE6, Playfair Display headings and Inter body, one navy jersey team and one gold jersey team. Generated transparent references preserve the lighter visible face. Reference sheets do not constitute rigged models or animation clips.

The owner also requested a full review of every touched surface. Acceptance includes complete navigation/save/reopen flows, clear next actions, keyboard operation, responsive layout, readable contrast, distinct data-series identities, coherent prompts and visible cues, player-isolated progress, honest AI errors and preservation of existing game scoring.
