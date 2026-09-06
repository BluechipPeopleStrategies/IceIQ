# App completion while Claude reviews questions

Owner direction: leave question review and repairs with Claude; complete the other app priorities. Preserve all question-bank data and review packets in this work.

## Release 1: coaching, goals and reliable training

1. Finish the existing `src/goals` module against its approved goal/effort specification. Preserve legacy categories and unknown fields, optional check-ins, age-appropriate support and missing-versus-zero effort. Integrate only its App routes and save handler; retain subscription gates.
2. Finish `src/coach` assessment and lineup modules. Ratings need observed evidence, not compulsory completion. Scope editor loads to the specific coach/player, preserve existing values and distinguish shared discussion from private notes.
3. Repair the Supabase adapter: explicit failures, author-scoped coach edits, a dedicated private-note table, a restrictive guard on legacy note rows, stable training IDs and acknowledged upserts. Prepare an idempotent migration and exercise its access boundaries with synthetic identities. Never use actual child records for verification.
4. Add durable local training saves, pending/synced status, explicit retry, safe remote merge and unit-correct summaries. Retain old unidentified entries without automatically re-uploading them and risking duplicates. Keep zero cost distinct from missing cost. Test failure/retry, duplicate acknowledgments and profile isolation.
5. Verify actual Goals/Training/Coach flows in isolated local sample sessions at phone and desktop sizes. An unavailable remote capability must stay visibly unavailable, never be presented as working because its demo works.

## Release 2: shared 3D behavior

Read engine authority and visual standards before editing. Integrate existing renderer/game drafts in dependency order, retaining current authored positions and answers. Check facing and stick possession, player/goalie animation, camera touch ownership, zoom framing, question interaction locks, overhead clarity and WebGL fallback. Cover all rink-background games, not non-rink games. Keep the original six-world artwork unchanged. Test each actual game at phone/desktop sizes before committing its dependency closure.

## Release 3: coverage and handoff

Refresh the curriculum coverage report from actual question/scenario catalogs and captured practice data. Identify gaps by age, concept, situation and response format without treating shuffled answers as new situations or inventing learner evidence. Produce a concise gap handoff for Claude without modifying its active question packets.

## Integration rules

Use scoped commits and clean release copies to keep unrelated work out. Run meaningful focused tests, build, and inspect real browser behavior. Record verification limits and update `docs/roadmap/TASKS.md` after each release. A database migration being ready locally is not proof it is deployed; inspect remote metadata only and disclose any access needed after all independent work is concrete.
