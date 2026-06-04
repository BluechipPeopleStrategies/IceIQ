# RinkReads Context (v2026.6)

> Maintenance note: this file is verified against code as of 2026-06-03. When a
> section cites a file/identifier, grep to confirm it still exists before relying
> on it — the codebase moves faster than this doc.

## Direction (2026-06-03)
**Starting fresh on the unified scenario engine** (`src/scenario/`). The legacy question bank is archived (`src/data/questions.legacy*.json`) then being **wiped — NOT migrated forward**. Don't invest in repairing/converting legacy questions. New content = engine scenario seeds (`src/scenario/seeds/`) + content-factory overlay questions. Treat the old MC bank as a frozen, read-only archive.

## Core Specs
- **Goal:** Youth hockey game-sense development — adaptive question bank, SMART goals, progress tracking U7–U18.
- **Stack:** React + Vite, plain JS/JSX (no TypeScript). Vercel auto-deploy on `main`.
- **Environment:** Claude Code on Windows / PowerShell.
- **Entry:** `src/main.jsx` → `src/App.jsx`.

## Architecture (modular — NOT a single file)
`src/App.jsx` is the ~7,900-line core (routing, screens, quiz engine, tier gating), but the app is **modularized** — App.jsx imports ~25 sibling modules. Do not assume "everything lives in App.jsx," and feel free to add/extend modules where it fits the existing split:
- **UI modules:** `shared.jsx` (primitives + `RinkReadsLogo`), `screens.jsx`, `widgets.jsx`, `assignments.jsx`, `coachAnalytics.jsx`, `teamChallenges.jsx`, `trainingLogCoach.jsx`, `questionOfDay.jsx`, `speedRound.jsx`, `admin.jsx`, `toast.jsx`, `OverlayLayer.jsx`, `RinkPlay.jsx`.
- **Rink renderers:** `RinkReadsRink.jsx` + `RinkReadsRinkQuestion.jsx` (legacy v2 renderer, still live) and the newer unified engine in `src/scenario/` (see below).
- **`src/utils/*`:** tier gating, gameSense, season pass, weekly challenge, storage, mastery, streaks, device lock, question overrides, reflections, etc.
- **`src/data/*`:** question banks + constants + insights.
- **`src/config/pricing.js`:** single source of truth for tier contents/prices.
- CSS: inline / style-block (no CSS framework).

## Branding
- App name: **RinkReads** (one word, hyphen-free brand; UI shows "RinkReads Pro", "RinkReads Family", "RinkReads Team"). Repo/folder/deploy name is **IceIQ** (`ice-iq.vercel.app`).
- Score metric: **Game Sense Score** (not "IQ"/"Hockey IQ"). Short form: **GS**. Computed in `src/utils/gameSense.js` (`calcGameSenseScore`, `GAME_SENSE_UNLOCK_SESSIONS`).
- Logo: `RinkReadsLogo` in `shared.jsx`.
- Coach dashboard stat label: "Team Avg GS".

## Pricing & Tiers (`src/config/pricing.js`, `src/utils/seasonPass.js`)
**Current model is HOCKEY-SEASON-ONLY** (Sept–Mar). The older "seasonal" model with summer off-season and full-year bundles has been removed — do not reintroduce summer/full-year prices unless asked. Prices in CAD.

| Tier | Price (Sept–Mar) | Includes |
|------|------------------|----------|
| **Free** | $0 | 1 profile, 1 age group, MC format + core scenarios, 5-session history, position filter, **3 quizzes/week** cap. |
| **Pro** | **$89.99** | 1 profile, all age groups, all 5 formats, adaptive engine, SMART goals, progress snapshots, weekly challenge. |
| **Family** | **$139.99** | Pro features + **3 profiles**. |
| **Team** | **$249.99** | All features + coach dashboard, up to **20 players**. |

- **Season:** Sept 1 – Mar 31. **Hard expiry April 1** → paid tiers go read-only (historical data visible, no new focus areas/reports). **Re-enrollment nudge Aug 15** (once/year). Logic in `seasonPass.js` (`getSeasonPassStatus`, `activateSeasonPass`, `checkReenrollmentPrompt`, `isReadOnly`).

## Free-Tier Limits & Gating (`src/utils/tierGate.js`)
- FREE: 1 age group, **MC format only** + 1 `formatPreview` sentinel/session (teaser for locked formats), position filter, 5-session history.
- **Free weekly quiz cap:** `src/utils/weeklyChallenge.js` — `FREE_WEEKLY_QUIZ_CAP = 3`, key `rinkreads_free_cap` (JSON keyed by ISO week, e.g. `2026_W16`). Gate routes to `FreeQuizCapScreen` with a countdown to Monday reset.
- PRO+: all 5 formats (mc, tf, seq, mistake, next), adaptive difficulty (checked in `buildQueue`).
- **Note:** the old per-age "3 rink scenarios" teaser counter (`src/utils/rinkProgress.js`, `RINK_FREE_PER_AGE`, `rinkreads_rink_seen`) **was removed** — that file and those keys no longer exist.

## Question Bank & Loading (`src/qbLoader.js`)
**BLANK SLATE as of 2026-06-04.** The entire old bank was deleted (legacy archives, `questions.json`, all `src/scenario/seeds/*`, `factoryQuestions.json`). New content comes ONLY from the gauntlet generator, tagged to the curriculum ledger (`src/data/curriculum-ledger.json`). The app currently ships an empty bank — `SessionScreen` renders `EmptyBankScreen` ("new content is on the way") until the gauntlet ships ledger-tagged questions.

The live bank is **composed at runtime** by `loadQB()`, caching the result in `sessionStorage` under `rinkreads_qb_cache_v27` (bump the version when bank shape changes). It always returns an object keyed by all 6 `LEVELS` (even when empty), merging:

1. **`src/data/bank.json`** — the gauntlet's output bank, keyed by age-group display name (`"U7 / Initiation"` … `"U18 / Midget"`). Currently `{}`. Questions without an explicit `type` default to `mc`.
2. **`src/scenario/seeds/*.json`** — unified-engine scenarios, **auto-globbed at build time** (`import.meta.glob`). The seeds dir is currently absent (glob resolves to empty); the gauntlet may drop seeds here, merged under their `level`/`levels[]`.

## Unified Scenario Engine (`src/scenario/`)
Newer interactive-question system (Perseus-widget pattern). Import only from `src/scenario/index.js`.
- **Schema (`schema.js`):** one `Scenario` shape for every interactive type. **Coordinates are normalized 0–1** (renderers convert to the 600×300 rink at draw time). Actors have `id/kind/x/y/[tag]/[label]/[facing]`. Optional IntelliGym fields: `timer` (hard fail), `scanWindow` (hide defenders after `showMs` — working memory), `preview` (lock input for `lockMs` — pattern recognition).
- **Four interaction primitives** (`registry.js` + `primitives/`): `point`, `path` (SPADL verbs: skate/carry/pass/shoot/screen/check/backcheck), `selection`, `sequence`. Adding a kind = one primitive folder + one registry entry (no central switch).
- **Semantic zones (`zones.js`):** authors reference zone IDs (e.g. `oz-slot`, `dz-corner-strong`); resolved to coords at scoring time. Numeric coords win when supplied.
- **Validation (`schema.js` `validateScenario` + `validators.js`):** schema-shape errors + hockey-logic rules (e.g. rejects a "correct" pass lane a defender would intercept). Returns `{ ok, errs, warns }`.
- **Render:** `ScenarioRenderer` (from `index.js`), `RinkStage.jsx`.

## Overlay System (`src/OverlayLayer.jsx`)
Renders `q.overlays[]` (normalized 0–1 coords) on top of an image — the house style for making "the read" unmistakable on factory/POV questions.
- Kinds: `puck` (glow), `text` (bold cue label), sprite (player from sheet + optional focus ring). Planned extensions per the factory spec: `arrow` (gold = the correct lane/read), `ring` (green dashed = open target), `dim` (shade covered options).
- Sprite sheets expected at `/assets/sprites/{player-yellow.png, player-black.png, goalie.png}`.
- **Accessibility:** never color-alone (red/green colorblind rule) — pair with arrow/shape/label.

## Content Factory (`docs/factory/`, `tools/factory-*.mjs`)
Image-first pipeline that turns hockey images into coach-graded, age-laddered, multi-format question banks at scale (rink scenarios are a paid teaser → more/better content = conversion).
- **Spec:** `docs/factory/SPEC.md` (current build-out: overlay annotation system, coverage ledger, stricter verdict bar). Proven runs: `factory-run-01.json` / `-02.json` + summaries.
- **Pipeline:** curriculum spine → image (ChatGPT Team inbox, zero-API for now) → vision reads real file + normalized coords → author multi-age/format bank → auto-place overlays → 3-coach panel (tactical / pedagogy / adversarial + overlay-accuracy) → verdict → ship to `factoryQuestions.json` or queue.
- **CLI tools:** `tools/factory-index.mjs`, `tools/factory-to-bank.mjs`, `tools/revision-to-run.mjs` (next to `tools/scenario-author.mjs`).

## Rink Visualization (legacy v2 — `RinkReadsRink.jsx` / `RinkReadsRinkQuestion.jsx`)
Olympic IIHF top-down renderer. Still live for `q.rink` questions; the unified engine above is the newer path.

### Coordinate system (v2 renderer)
- 1 SVG unit = 0.1 m. Rink **600 × 300** units (60 m × 30 m). Origin top-left.
- Landmarks: left goal line `x=40`, left blue `x=213`, center red `x=300`, right blue `x=387`, right goal line `x=560`. Top boards `y=0`, center `y=150`, bottom `y=300`.
- End-zone faceoff dots: `(100,80)`, `(100,220)`, `(500,80)`, `(500,220)`. NZ dots: `(228,80)`, `(228,220)`, `(372,80)`, `(372,220)`.

### v2 question types (dispatcher in `RinkReadsRinkQuestion.jsx`)
`mc`/`diagram` (optional `q.rink`), `drag-target`, `drag-place`, `zone-click`, `multi-tap`, `sequence-rink`, `path-draw`, `lane-select`, `hot-spots`. Legacy `type:"rink"` (`q.scene`) and old `zone-click` dispatch to original `Rink.jsx`/`ZoneClickQuestion`. New-schema detection via `q.rink` presence or `NEW_RINK_TYPES`/`isRinkQ` in `App.jsx`.

### Self-healing (both renderers)
Validate + auto-fix bad data (coord clamping, unknown marker/line/zone fallbacks, NaN→defaults, non-array→`[]`). Auto-fixes `console.warn` with `[RinkReadsRink]` / `[RinkReadsRinkQuestion]`. Unrecoverable questions render an amber **Skip this question** card — never crash the session.

## Tier Resolution (`resolveTier` in `App.jsx`)
Priority: dev/preview LS override (`rinkreads_tier_override`, only honored when dev-bypass/`__preview`/`__dev`) → coach in any non-prod session = **TEAM** → demo mode (coach=TEAM, player=FREE) → `profile.tier` → default **FREE**. Production users can't self-promote.

## Storage Schema (localStorage / sessionStorage)
Keys are namespaced `rinkreads_*`. Verified-current keys include:
- `rinkreads_tier_override` — dev/preview tier override.
- `rinkreads_free_cap` — FREE weekly quiz count keyed by week (in `weeklyChallenge.js`).
- `rinkreads_season_pass` + `rinkreads_reenrollment_prompt_shown` — Team season pass (`seasonPass.js`).
- `rinkreads_milestone5_shown` — fires once when a FREE user finishes their 5th quiz.
- `rinkreads_parents_card_dismissed` — "For parents" home card dismissal (`widgets.jsx`).
- `rinkreads_qb_cache_v27` — **sessionStorage** composed-bank cache (`qbLoader.js`); bumped from v26 at the 2026-06-04 blank-slate wipe.
- `rinkreads_dev_bypass`, `rinkreads_has_signed_in_before`, `rinkreads_training_log`, `rinkreads_streak`, plus many onboarding/quest flags suffixed `_v1` (e.g. `rinkreads_quest_dismissed_v1`, `rinkreads_whatsnew_dismissed_v1`).

When adding a key, follow the `rinkreads_<thing>[_vN]` convention and grep before reusing a name.

## Coach Ratings Anti-Inflation
- `src/data/constants.js` — `COMPETENCY_LADDER` `sub_coach` strings carry normative % anchors ("~top 5%"). Rendered in `C.dimmest` after a `·` separator in `CoachRatingScreenAuthed`.
- **Exceptional for Age Group** flag (⭐): `ratings[skillId + "__star"]` boolean — planned, verify before relying on it.

## Demo Profiles
`DEMO_PROFILES` / `DEMO_COACH_ROSTER` in `App.jsx` — each has `name`, `position`, `jersey`, `team`; levels U7/U9/U11/U13/U15/U18. Coach roster: 5 U11 players with `iq` shown as `GS {n}`.

## First-Time Parents Surface
- Route `#parents` (`ParentsPage` in `screens.jsx`, lazy-loaded), reachable pre/post-auth.
- `HomeStartHereCard` in `widgets.jsx` — dismissible home card (persists via `rinkreads_parents_card_dismissed`).
- Entry points: AuthScreen footer, Home card, `#parents` URL.

## Conversion UX Triggers
Goals tab gold pip for FREE; blurred sample-goal preview behind gate; session-#5 milestone banner; mid-quiz locked-format sentinel; weekly-cap `FreeQuizCapScreen`. Upgrade surfaces: position filter, >1 age switch, session 6+, weekly cap, weekly-challenge tap.

## Token Discipline (when working this repo)
- `App.jsx` is huge and the JSON banks are large — **do not read them in full** unless editing that exact content. Read targeted ranges; grep first.
- Show modified snippets with `// ... existing code` placeholders, not whole files.
- Authoring workflow for v2 rink questions: build in the Rink Editor artifact → paste JSON into the right age array in `questions.json` → verify in dev (watch console for `[RinkReadsRink*]` warnings; clean = no auto-fixes). For unified-engine scenarios, drop a seed in `src/scenario/seeds/` (auto-merged).
