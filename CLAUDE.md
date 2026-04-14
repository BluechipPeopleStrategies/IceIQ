# IceIQ — Claude Code Instructions

## Auto-deploy rule
After every change to src/App.jsx, automatically run:
git add . && git commit -m "Auto: [brief description of change]" && git push

## Project overview
IceIQ is a youth hockey player development app built by Thomas (BlueChip People Strategies).
- Live: ice-iq.vercel.app
- GitHub: BluechipPeopleStrategies/IceIQ
- Stack: React + Vite + Vercel
- Single file app: src/App.jsx (~410KB)
- Do NOT touch: index.html, src/main.jsx, package.json, vite.config.js

## Question bank structure
QB is an object keyed by level: "U7 / Initiation", "U9 / Novice", "U11 / Atom", "U13 / Peewee"

Each question has:
- id, type, cat, concept, d (1/2/3), pos (["F"], ["D"], ["F","D"], or ["G"])
- sit (game situation), opts (array of 4 options), ok (index of correct answer)
- why (explanation), tip (one-line coaching tip)

New format questions also need: type ("mc" / "seq" / "mistake" / "next" / "tf")
Seq questions use: items (array of strings) and correct_order (array of indices) instead of opts/ok
Mistake questions also need: question (the specific question asked about the situation)

## Question ID conventions
- Skater questions: u7q1–u7q100, u9q1–u9q100, u11q1–u11q100, u13q1–u13q100
- Goalie questions: u7g1–u7g10, u9g1–u9g15, u11g1–u11g20, u13g1–u13g20
- New format questions: u{level}seq{n} (seq), u{level}mis{n} (mistake), u{level}next{n} (next), u{level}tf{n} (tf)

## Question writing voice
- Situations written in second person ("You're on a 2-on-1...")
- Options are plain English — no jargon, no trick answers
- The correct answer should feel inevitable once explained
- why: explains the reasoning, not just restates the answer
- tip: one sentence, punchy, actionable ("D takes you? Pass. Every time.")
- Difficulty 1 = foundational concept, 2 = developing read, 3 = elite anticipation
- No corporate buzzwords, no therapy-speak, no easy absolutes
- Match the directness and confidence of existing questions

## Design rules
- All colors use the C object — do not hardcode hex values
- Fonts: Barlow Condensed for display (FONT.display), DM Sans for body (FONT.body)
- Never add inline styles that contradict the design token system
- Keep colorblind mode working — never use color as the only indicator
- Cards use C.bgCard background, C.border borders, borderRadius 16
- StickyHeader uses backdropFilter blur(16px)
- PrimaryBtn uses C.gold background, C.bg text

## Version bumping
When adding features, bump VERSION constant following semver:
- Bug fix: patch (e.g. 2.0.1)
- New feature: minor (e.g. 2.1.0)
- Full rebuild: major (e.g. 3.0.0)
Always add a CHANGELOG entry at the top of the CHANGELOG array describing what changed.
Current version: 2.0.0

## Build validation — check before every push
- No double commas at QB level boundaries (],, is a syntax error)
- All question arrays properly closed with ],
- No unclosed JSX tags
- No template literals with broken ${} expressions
- VERSION and CHANGELOG updated if features were added
- Run a mental grep for ],, before committing

## Critical — do not break these features
- Coach invite URL uses query params: ?coach=1&pk=&name=&level=
- makePlayerKey() generates the shared storage key for coach ratings
- Coach ratings stored in window.storage (shared: true) under "coach_ratings:[playerKey]"
- Coach team quiz data stored in window.storage under "team:[coachCode]:[season]"
- Position "Not Sure Yet" is valid for U7/U9 only — routes to skater question pool
- Streak data stored in localStorage under "iceiq_streak"
- Player profile stored in localStorage under "iceiq_player"
- IQ score stored in localStorage under "iceiq_score"
- Session count stored in localStorage under "iceiq_sessions"
- Adaptive engine: 2 correct in a row = step up difficulty, 2 wrong = step down
- D_WEIGHT: {1:1, 2:1.5, 3:2.2} — do not change these values
- QUIZ_LENGTH default is 10 — player can set 10/15/20 in settings

## Score tiers (do not change labels)
- 80%+: Hockey Sense 🏒
- 60–79%: Two-Way Player ⚡
- 0–59%: Tape to Tape 🎯

## Screens and navigation
Home → Quiz → Results → Home
Home → Goals (SMART goal setting)
Home → Skills (self-assessment)
Home → Report (self vs coach comparison + IQ history)
Home → Profile (settings)
BottomNav covers: Home, Quiz, Goals, Skills, Report
Coach dashboard accessed via Home (separate flow, no bottom nav)
Coach rating screen accessed via URL params (no player login required)

## Planned features — do not build unless explicitly instructed
- Supabase backend for persistent cross-device coach dashboard
- Parent dashboard (read-only view, Year 2)
- Season history IQ arc chart in Report screen
- Daily streak display on Home screen hero card
- Position-weighted leaderboard (anonymous, team-level)
- More rink SVG diagram types (currently: 2on1, coverage, blueline, forecheck, goalie_angle, goalie_2on1)

## Owner
Thomas — BlueChip People Strategies
Edmonton, Alberta, Canada
bluechip-people-strategies.com
Do not add ads, tracking, or third-party analytics without explicit instruction.
