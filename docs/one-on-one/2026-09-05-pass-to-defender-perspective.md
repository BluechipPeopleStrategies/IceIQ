# Pass, visible result, defender perspective

This local implementation adds a bounded U11 exercise to the existing connected 2-on-1. It does not replace the saved three-read sequence or claim a general role-branching engine.

1. The player chooses Pass in the original read. The existing animation moves the puck from F1 to F2; possession is unclaimed during flight and belongs to F2 at the completed freeze.
2. At that freeze, **Read D1’s next move** makes the question focus explicit. The new view highlights named **D1** and identifies the original passer as F1. It does not cast every question in the first person. Actor IDs, team, source labels, facing, and puck state remain preserved in the saved source snapshot. Shared renderers accept `focusActorId` so a later authored question can focus on D4 or another named player; focus is independent of selection and puck ownership, and omitted focus retains the older YOU marker.
3. The learner drags D1, taps the ice, uses coordinates or chooses **Stay at the starting spot**. A position is required. **Why did you choose that spot?** is optional; saving, reloading and exporting work with an empty explanation and add no penalty.
4. The defender reflection saves in its own player-scoped browser key. It can be reopened after a reload even when the original attacking session has returned to its opening screen. The JSON download contains the original pass choice, exact before/after snapshots, D1 placement, input method, optional reason and local source references.

The UI states the current boundary explicitly: **Return to original attacking play** resumes the existing attacking continuation. The new D1 placement does **not** change that continuation. This is a separate perspective reflection, with no tactical grade or AI verdict. A later engine extension must generate or select the next action from the learner's actual D1 result before claiming a continuous multi-role branch.

Teaching sources are [Odd-Man Reads](../library/odd-man-reads.md), including its F1/F2/D1 perspective contract, and [Gap Control](../library/gap-control.md). The user's current direction permits named third-person questions as well as first-person prompts, overriding the source note's older always-YOU wording. These sources justify asking about the visible change and inside space; they do not certify a coordinate as an ideal answer.

Verification: focused pure-core and actual-render tests cover pre-arrival blocking, exact F2 ownership, explicit D1 identity, sole-actor movement, optional-reason saves, restore tampering, and unchanged original v1 reflection bytes. Browser interaction, narrow-phone appearance and deployment remain the integration owner's checks.

## Named focus and puck visibility

`focusActorId` is now an optional presentation contract on the shared rink, QuestionBoard, legacy read scene and practice scene. A named D4 focus is tested separately from the currently selected actor and the puck carrier. An unknown or explicitly cleared focus never falls back to puck ownership. Omitting the field retains existing authored YOU/controlled-role behavior. Focus adds a ring, not edit permission.

The shared puck rendering uses a dark core, white/navy halo and a small PUCK label with a leader. Its legibility scale is bounded, while its center follows the exact supplied puck coordinates through possession and flight. Shared scenarios, the legacy 3D reads and practice use that rendering; tactical QuestionBoard, legacy reads and guided curriculum use the matching SVG locator. Tests retain exact 3v3–5v5 flight snapshot coordinate checks and the curriculum's existing puck offset. This is a visual aid, not a change to ownership, puck attachment or play outcomes.

The stay action is validated against D1's exact source position. Changing a saved moved position's input method to “hold” is rejected rather than recorded as evidence that D1 stayed.

## Local integration evidence

The browser played the actual U11 pass until F2 received it, then opened the named D1 exercise. A desktop pointer drag moved D1 from `(15.4, 0.7)` to `(19.08420684161345, -1.2273185344346047)`. Saving with a blank explanation succeeded. Full reload and **Reopen saved defender read** preserved the exact record. At 390px, the tactical board contained one focus locator labelled D1 and a puck locator at the exact source puck point `(17.684164385204525, -3.258422112971171)`, with no horizontal overflow.

The actual downloaded JSON and the saved browser string shared SHA-256 `7e04629dc45f7648a67363721c02f5855feb250a24d74bf597a5928269c029e2`. The checked action was a drag, not a claimed stay. Screenshot: [defender perspective](evidence/defender-perspective-desktop.png). This is local browser evidence, not a physical-phone or live-deployment claim.
