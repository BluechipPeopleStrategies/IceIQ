# RinkReads (IceIQ) — Project Map

Where everything lives in your own codebase. Written 2026-07-09.
Everything below is under `src/`. Open any file in VS Code to see it.

RinkReads is a hockey-IQ training app: it teaches players to *read the play* through
questions, animated scenarios, and reaction drills, with coach and parent tools on top.

---

## THE CONTENT — where your questions and hockey material live

All in **`src/data/`**. This is what you edit when you want to change what players see.

| File | What's in it |
|------|--------------|
| `data/bank.json` (256 KB) | **The main question bank** — the core set of questions. |
| `data/povQuestions.json` (355 KB) | **Point-of-view questions** — your biggest content file. |
| `data/hockeyInsights.js` (72 KB) | **Hockey teaching content / insights.** |
| `data/studyContent.js` | Study material (the small file you looked at earlier). |
| `data/curriculum-ledger.json` | Tracks the curriculum / what's been covered. |
| `data/constants.js` | Shared constants (categories, labels, settings). |
| `data/rinkFeatures.js` | Definitions of rink features (zones, lines, etc.). |
| `data/scene-manifest.json` | List of animated scenes. |
| `data/backups/` | Automatic backups of your content. Leave alone unless recovering. |

**Scenario content** lives separately in **`src/scenario/seeds/`** — JSON files named by
age + skill, e.g. `gvis_u11_reading-the-play_c9qi.json`, `u11_dz_breakout...json`.
Each is one animated teaching scenario.

---

## THE FEATURES — the screens and game modes

These are the big pieces players and coaches actually use. Mostly in `src/` directly:

| File / folder | The feature |
|---------------|-------------|
| `App.jsx` (huge — 522 KB) | **The heart of the app** — ties everything together, routing, main logic. |
| `screens.jsx` (141 KB) | Most of the **screens/pages** players move between. |
| `RinkReadsRink.jsx` + `RinkReadsRinkQuestion.jsx` | The **rink diagram** and questions asked on it. |
| `RinkPlay.jsx`, `OverlayLayer.jsx` | Drawing plays on the rink. |
| `questionOfDay.jsx` | **Question of the Day** feature. |
| `speedRound.jsx` | **Speed Round** game mode. |
| `teamChallenges.jsx` | **Team Challenges.** |
| `assignments.jsx` | **Assignments** — coaches assigning work to players. |
| `cognitive-gym/` | **The Cognitive Gym** — reaction/vision drills (Anticipation, Eyes Up, Find Lane, Reaction, Snapshot, Shootout, etc. — one file each). |
| `play/` | The **animated play system** — play catalog, families, variants, motion. `play/plays/` = individual plays (forecheck, backcheck, gap control, 2-on-1…). |
| `scenario/` | The **scenario engine** — multi-step animated teaching scenarios, plus an editor and playground. |
| `path/` | The **learning path** — progression screen + challenges hub. |
| `review/` | Tools to **add / edit / review / browse questions**. |

---

## THE COACH / ADMIN SIDE

| File | What it does |
|------|--------------|
| `coachAnalytics.jsx` | Coach analytics dashboard. |
| `trainingLogCoach.jsx` | Coach training log. |
| `admin.jsx` | Admin panel. |
| `config/pricing.js` | Pricing / plans config. |

---

## THE PLUMBING — you rarely touch these

| File | What it does |
|------|--------------|
| `main.jsx` | App entry point (boots everything). |
| `supabase.js` (43 KB) | Connection to **Supabase** — login, saving data, syncing. |
| `playSolver.js`, `qbLoader.js` | Logic for solving plays / loading the question bank. |
| `speak.js`, `ReadAloudToggle.jsx` | Read-aloud (text-to-speech). |
| `widgets.jsx`, `shared.jsx`, `toast.jsx` | Reusable UI bits used everywhere. |
| `utils/` | Helper logic — scoring, age groups, mastery, player profiles, game-sense, etc. |
| `devtools/` | The in-app feedback widget. |

---

## "WHERE DO I GO TO CHANGE ___ ?"

| I want to change... | Go to |
|---------------------|-------|
| The actual questions | `src/data/bank.json` or `src/data/povQuestions.json` |
| Hockey teaching content | `src/data/hockeyInsights.js` |
| An animated teaching scenario | `src/scenario/seeds/` (find the right JSON) |
| A reaction drill | `src/cognitive-gym/` (one file per drill) |
| Pricing | `src/config/pricing.js` |
| How a whole screen works | `src/screens.jsx` or `src/App.jsx` |
| Login / data saving | `src/supabase.js` |

---

## The honest tip

`App.jsx` and `screens.jsx` are enormous — don't try to read them top to bottom, and don't
expect the small local AI models to summarize them (they'll choke). When you want to understand
or change something in a big file, **ask Claude Code** — point it at the file and describe what
you're after. That's the tool for navigating your own codebase.
