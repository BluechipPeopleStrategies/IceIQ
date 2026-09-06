# Choice ordering release

Released `e8e31fc3511b3d4511d8c8aec9f20b7491c9d396` to origin/main on September 6. Vercel deployment HdEkaJoLvWpwQg5DhfHtUwD462GJ reports success. Public alias: https://ice-iq.vercel.app .

Verification: 52 regression tests, production build and local-feedback release boundary passed. At 390px viewport (375px document excluding scrollbar), document scroll width matched client width. The sequence controls remained usable and correctly recognized the authored suggested order. Prior single/multi checks preserved ID-based answers through reload and view switches.

A disposable local browser feedback submission captured shownOptionIds [b,c,a], choice-order-v1, selected answer [b], exact question identity and scene positions. Only the receipt bearing the unique CODEX_RELEASE_CHECK_20260906_CHOICE_ORDER marker was removed after verification; user notes were preserved.

Live browser selection/check succeeded. Following the actual production entry/PracticeHub imports confirmed ExperimentalPractice-CI86hfpG.js includes choice-order-v1 and shownOptionIds, and excludes the local feedback API. Production bundle hashes differ from the local build, so byte-for-byte build equality is not claimed. Vercel's success is tied to the exact released source commit.

Local feedback/admin, draft placement grading and Supabase remain deferred. The five U13 content drafts were not included as applied repairs.
