# Ice-IQ Context (v2026.4)

## Core Specs
- **Goal:** Youth hockey game sense development — 880+ adaptive questions, SMART goals, progress tracking U7–U18.
- **Stack:** React + Vite. Main files: `src/App.jsx`, `src/shared.jsx`, `src/screens.jsx`, `src/data/constants.js`, `src/utils/tierGate.js`, `src/utils/weeklyChallenge.js`, `src/config/pricing.js`.
- **Platform:** Vercel (auto-deploy on `main`).
- **Environment:** Claude Code (PS/Windows).
- **Architecture:** All logic/UI in `src/App.jsx`. NO `/components` or refactoring. CSS: inline/style-block.

## Branding
- App name: **Ice-IQ** (hyphenated everywhere in UI, including "Ice-IQ Pro", "Ice-IQ Team").
- Score metric: **Game Sense Score** (not "IQ Score", not "Hockey IQ"). Short form: **GS**.
- Logo: `IceIQLogo` component in `shared.jsx` — modern stick + puck with motion lines + outer ring.
- Coach dashboard stat label: "Team Avg GS".

## Pricing & Gating (`src/utils/tierGate.js`, `src/config/pricing.js`)
- **Free:** positionFilter ✓, multipleChoice only, 5 session history, 1 profile, 1 age group, **3 quizzes/week cap** (localStorage, resets Monday).
- **Pro ($12.99/mo · $89.99/yr CAD):** All question formats (5 types), adaptive engine, SMART goals, progress snapshots/radar, full session history, weekly challenge.
- **Family ($19.99/mo · $139.99/yr CAD):** All Pro features + 3 profiles.
- **Team ($49.99/mo · $249.99 season pass CAD):** All features + coach dashboard. Season Sept–Mar, hard expiry Apr 1 (read-only after).

## Free Weekly Quiz Cap
- `src/utils/weeklyChallenge.js` — `FREE_WEEKLY_QUIZ_CAP = 3`, `isAtFreeQuizCap()`, `incrementFreeQuizCount()`.
- Incremented in `handleQuizFinish` when `tier === "FREE"`.
- Gated at quiz screen routing: if FREE and at cap → `<FreeQuizCapScreen>` with countdown to Monday reset.
- localStorage key: `iceiq_free_cap` — JSON keyed by week key (`2026_W16`).

## Storage Schema (localStorage)
- `iceiq_device_id`: UUID.
- `iceiq_age_group_lock`: Free-tier selection.
- `iceiq_switch_count`: Track switches (limit: 1).
- `iceiq_season_reset_year`: Current reset cycle.
- `iceiq_child_profiles`: JSON array (max 3).
- `iceiq_season_pass`: {purchaseDate, expiryDate}.
- `iceiq_weekly`: Weekly challenge completion record (8-week pruning).
- `iceiq_free_cap`: Free tier weekly quiz count keyed by week (4-week pruning).
- `iceiq_milestone5_shown`: Flag — shown once when free user completes 5th quiz.

## Tier Resolution (`resolveTier`)
- Demo coach → **TEAM** (sees full coach dashboard).
- Demo player → **FREE** (sees free experience).
- Override: `iceiq_tier_override` in localStorage.

## Coach Ratings Anti-Inflation
- `src/data/constants.js` — `COMPETENCY_LADDER` `sub_coach` strings include normative % anchors (e.g., "~top 5%").
- Anchor text rendered in `C.dimmest` colour after a `·` separator in `CoachRatingScreenAuthed`.
- **Exceptional for Age Group** flag (⭐): stored as `ratings[skillId + "__star"]` boolean — planned but not yet implemented.

## Splash / Auth Page (AuthScreen)
- Dark SVG rink background (`RinkBackground dark={true}`) — night ice `#03090f`, glowing red/blue lines with SVG blur filters.
- Hero: "Train smarter. Play sharper." + stat chips (880+, 6 age groups, 5 question types).
- Demo player buttons: Name + #jersey (prominent), team name, position (subtle). No redundant age group label.
- Demo coach button: mini roster preview showing first 3 players with position, name, GS score.

## Demo Profiles (`DEMO_PROFILES` in App.jsx)
Each has: `name`, `position`, `jersey` (number), `team`. Levels: U7/U9/U11/U13/U15/U18.
Demo coach roster: `DEMO_COACH_ROSTER` — 5 U11 players with `iq` field (displayed as `GS {n}`).

## Question Gating
- FREE: MC only + 1 `formatPreview` sentinel per session (teaser for other formats).
- PRO+: All 5 formats (mc, tf, seq, mistake, next).
- Position filter: FREE and up.
- Adaptive difficulty: PRO+ only (checked in `buildQueue`).

## Weekly Challenge
- `src/utils/weeklyChallenge.js` — ISO week seed, Mulberry32 RNG, seeded shuffle.
- Same 10 questions for every player at same level/position each week.
- Gated: PRO/FAMILY/TEAM only. FREE sees teaser card on Home.

## What's New Card (Home screen)
- `CHANGELOG` in App.jsx uses `{icon, title, desc}` objects (not plain strings).
- Renders as gradient card with gold "NEW" badge, icon tiles, title + description per item.

## Conversion UX Triggers
- Goals tab: 🔒 gold pip badge on BottomNav for FREE users.
- Goals screen: blurred sample goal preview behind gate card.
- Session #5: milestone banner fires once (localStorage flag `iceiq_milestone5_shown`).
- Quiz format preview: 1 locked-format sentinel mid-quiz for FREE.
- Weekly quiz cap: `FreeQuizCapScreen` with countdown + upgrade CTA.
- Upgrade prompt surface: positionFilter, >1 age switch, session 6+, weekly cap hit, weekly challenge tap.

## Token Optimization
- `App.jsx` contains 880+ questions. Do NOT read large question bank sections unless editing content.
- Provide modified snippets only. Use `// ... existing code` placeholders.
- Run `/compact` after every UI/CSS tweak session.
