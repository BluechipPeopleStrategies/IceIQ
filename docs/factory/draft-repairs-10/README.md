# Ten staged draft repairs

Status: repaired drafts, not admitted to the live bank. Updated 2026-09-07.

Open through the running Vite server: `/docs/factory/draft-repairs-10/index.html`.

## Delivered

- Ten revised questions in eight shared scenes. Nine choice questions and one optional reflection.
- Direction, finite passing-lane distance, grammar, visible rink landmarks, player labels and hypothetical wording corrected.
- `repairs.json` preserves original and revised payloads, option rationales and canonical SHA-256 hashes. Original Claude returns remain untouched.
- `blind.json` and `independent-blind.json` retain the initial review, including its limitations. `independent-keyed-before-corrections.json` records the wording defect; `independent-final.json` binds the corrected provisional review to final hashes.
- `scenes.json` is a staging export, not a production bank import.

## Checks and evidence

Run `node tools/validate-draft-repairs-10.mjs` from this checkout. The validator uses the application scene builder, ice bounds and bank validator. Only companion-count and type-variety admission failures are expected. `validation.json` records 16 such blockers across eight scenes.

The preview uses the existing ScenarioRinkView and CoachRouteBoard. Initial captures are retained in `screenshots/`; corrected captures are in `screenshots-final/`. Browser interaction receipts are recorded separately in `browser-checks.json`. Screenshots are evidence of this staged preview, not a production deployment.

## Remaining admission work

Each scene needs six to ten coherent questions with at least four types. Do not pad them with repetitive questions merely to satisfy the validator. Reassess the U15/U18 skating objectives: these static drafts test related reads, not observed skating execution. Before admission, replace coordinate-language attack directions with player-readable orientation and verify the defended net remains understandable at the initial camera framing. Qualified coaching admission remains separate from the provisional AI review.

## Source boundaries

Hockey Canada U9 skills and its vision/scanning coaching principle support developmental themes only. They do not certify these exact questions, options or geometries. URLs and uses accompany each revised payload. The U7 FAQ reference is inherited source context and was not freshly reverified during this repair pass; line/circle placement was checked against the repository renderer. No purchased book text was copied. Static freezes do not establish speed, recovery time, future pass completion or an animated turn/pivot.
