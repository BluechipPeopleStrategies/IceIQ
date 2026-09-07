# Eight companion lessons

Status: staged, not admitted to the live bank. September 7, 2026.

The ten repaired drafts now have 38 companion questions: eight lessons with six questions each. The 48 questions include choices, multiple selections, suggested sequences, player placements and six optional reflections (12.5%). Each lesson has at least four types.

## Review the lessons

Open `/docs/factory/companion-lessons-8/index.html` through the development server. This mounts the actual ExperimentalPractice interface with the staged bank. Draft attempts use a separate player storage key. These IDs are absent from the live analytics manifest, so this preview does not count them as normal curriculum activity. Existing feedback controls remain available; no automated test submits notes to the real inbox.

## Evidence and reproduction

- `youth.json` and `older.json`: authoring inputs, including historical author audits. They are not independent clearances.
- `*-first-return.json`: preserved returns before root corrections.
- `scenes.json`: compiled staged lessons.
- `validation.json`: exact question-plus-scene hashes, counts and response validation.
- `review.json`: first independent keyed challenge, with findings preserved.
- `review-corrections.json`: explicit before/after corrections, including two changes to the previously repaired ten. Original repair artifacts remain unchanged.
- `SOURCES.md`: freshly retrieved public-source scope and limitations.

Run `node tools/validate-companion-lessons-8.mjs`. The actual bank validator must return zero errors. The script verifies scene geometry preservation, original-question preservation or explicit adjudication, valid responses and 12.5% optional reflection coverage.

## Integration repair

The practice interface previously assumed Navy always attacked +x. It now accepts a scene's `attackDirection: -1` for zone context and the overhead board's accessible description, while existing scenes default to +x. A regression test reproduced the reversed-zone failure before the correction.

## Admission boundary

The companion count/type gap is closed. This is not qualified coaching approval, a new calibration run, mastery admission, or a production deployment. The static U15/U18 lessons connect described skating situations to decisions; they do not assess skating technique or successful execution. Position examples remain non-unique coaching comparisons. Repeated observation routines are useful scaffolding but should not be counted as separate evidence of advanced tactical mastery. Independent review is procedurally keyed, not blind.

## Final verification

- 48 version-2 question hashes match the final independent keyed review in `final-review.json`.
- 19 targeted tests pass, covering direction, missing coordinates, response feedback, bank validation and optional reflection selection.
- All 48 initial UI submissions were confirmed from persisted browser attempts. The long automation exceeded its return timeout; `browser-initial-attempts.json` records the subsequent verification rather than inventing a successful tool return.
- The ten changed question payloads were rechecked in the final desktop interface. All eight final placements were tested at 390px with no document overflow; screenshots cover 3D and overhead views.
- Phone inspection caught the remaining hardcoded SVG attack arrow. `browser-arrow-checks.json` and the two `corrected-arrow.png` images confirm both directions after repair. Earlier screenshots deliberately preserve the finding.
- `coverage.json` records this staged batch separately from live coverage. Original scene geometry and historical artifacts remain preserved.
