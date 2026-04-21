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
Seasonal pricing model (aligns with hockey season cycle Sept–Mar + summer off-season Apr–Aug).

- **Free:** positionFilter ✓, multipleChoice + **3 rink scenarios per age group (teaser)**, 5 session history, 1 profile, 1 age group, **3 quizzes/week cap** (localStorage, resets Monday).
  - Rink teaser counter lives in `src/utils/rinkProgress.js` — `RINK_FREE_PER_AGE = 3`, localStorage key `iceiq_rink_seen` (`{ u7: n, u9: n, ... }`). After the cap, `buildQueue` in `App.jsx` injects a `rinkLocked` sentinel that routes to the `rinkQuestions` upgrade prompt.
- **Pro:** All question formats (5 types), adaptive engine, SMART goals, progress snapshots/radar, full session history, weekly challenge.
  - Hockey Season (Sept–Mar): **$89.99 CAD** — primary competitive season
  - Summer Off-Season (Apr–Aug): **$44.99 CAD** — development & training focus, lower friction
  - Full Year (Sept–Aug): **$124.99 CAD** — continuous access, saves $10.98
- **Family:** All Pro features + 3 profiles.
  - Hockey Season (Sept–Mar): **$139.99 CAD**
  - Summer Off-Season (Apr–Aug): **$69.99 CAD**
  - Full Year (Sept–Aug): **$199.99 CAD** — saves $10.98
- **Team:** All features + coach dashboard. Hockey season only (Sept–Mar, hard expiry Apr 1, read-only after).
  - Hockey Season (Sept–Mar): **$249.99 CAD** — typically covers 15–20 players on a roster

## Pricing Rationale (Seasonal Model)
**Strategy:** Aggressive Summer Growth — lower friction for off-season learners.

| Metric | Rationale |
|--------|-----------|
| **Hockey Season ($89.99/$139.99/$249.99)** | Peak competitive season (Sept–Mar); game sense is most relevant; full-feature parity with historical pricing. |
| **Summer Off-Season ($44.99/$69.99)** | ~49–50% discount vs hockey season; targets coaches/parents running summer camps & development programs; lower barrier to trial. |
| **Full Year ($124.99/$199.99)** | ~$10.98 savings per tier; incentivizes annual commitment & continuous progress tracking Sept–Aug. |
| **No Team Summer option** | Coaches rarely run team programs Apr–Aug; seasonal hard stop (Apr 1) reduces confusion. |

**Expected outcomes:**
- **Activation:** Summer discounts capture off-season learners (development camps, July clinics).
- **Retention:** Full-year bundles extend LTV beyond single season; reduce churn at April 1 hard stop.
- **Revenue:** $89.99 (hockey) + $44.99 (summer) = $134.98 (if both purchased separately) vs $124.99 full-year bundle = ~$10/user rebate for commitment. Annual revenue ~$90K per 500 Pro users (blended ~$180/user/year).

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
- `iceiq_rink_seen`: `{ seen: {u7:n,u9:n,...}, ids: {u7:[id,...],...} }` — FREE tier rink teaser counter, caps at `RINK_FREE_PER_AGE` (3) per age group.
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
