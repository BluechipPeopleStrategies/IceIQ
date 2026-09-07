# Player Home and sustained practice

Implemented the approved bounded Home plan. The six learning worlds replace the duplicate legacy journey and skill-path blocks on Home. Goals, training, quiz history, subscriptions and the existing reports retain their current routes and records. The old activity journey remains available through Activity history.

## Behavior

- Uses the original six-world image, scoped navy/gold glass styling and the selected player's age curriculum. World focus counts describe available curriculum, not completion.
- Learning opens inside the player session with Back to Home. The separate public review route retains its preview identity. No player ID is put in the URL.
- Eligible library answers build a separate device-local ledger. A group is age + concept + response format. The current policy requires five different questions, 80% current accuracy, five practice dates, a seven-day span and two Monday-based calendar weeks for 100 points. There is no speed, streak or paid-tier multiplier.
- The first answer to a question on each local date is retained. Same-day retries cannot erase a miss; later dates can show improvement. Answers to changed question revisions no longer count toward current requirements.
- Experimental sources, including both exp26 and exp26b IDs, and draft guided starters earn no mastery credit. Existing legacy points remain historical records. No migration fabricates dated evidence from old quiz scores.
- Home only reads evidence. Submissions reread the latest stored player ledger before writing, and report storage failure without claiming a save. Invalid ledger envelopes are preserved instead of overwritten. This is browser storage, not a cloud-synced or tamper-proof achievement service.

## Verification, September 5

- Isolated candidate assembled from commit 88fe014 and the explicitly scoped Home/mastery changes. Unrelated coach, goals, renderer and workshop work was excluded.
- 33 focused tests pass: Home loading and age/profile races; six-world navigation; current-content eligibility; repeated answers; calendar/time-zone boundaries; historical records; malformed/unavailable storage; and player-specific evidence.
- Production build passes (8.36 seconds). Existing large-bundle and mixed static/dynamic import warnings remain.
- Actual rendered Home inspected at 1440 x 1000 and 390 x 844. No horizontal overflow; all new Home buttons at least 44 px high. All six world illustrations display. Original sheet SHA256 remains `2008c6d669ba9a9e4885046cebebbb089d3ad56c7483a79854447e78410bb478`.
- Browser test using the built-in sample player: open library, answer `rr-u11-gap-control-1`, confirm device save, return Home. Result is one practised group and zero groups meeting mastery requirements. Reload preserves it. Repeated in the production bundle, where evidence remains under `__preview__`, not the public `practice-preview` identity.
- World selection, Goals, Training and existing progress report navigation checked. The sample's eight quiz sessions, six training entries and existing goals remain available. No real player account or remote record was edited.
- Independent, bounded Luna code review found no concrete important defects in player/age scoping, navigation, async loading or evidence eligibility.
- No browser console errors during the checked flow. Broader coaching/goal redesigns, on-ice validation and cloud sync are outside this release.

Preview of the built candidate: `http://127.0.0.1:5179/?demo=player`. This local preview is separate from the public deployment.
