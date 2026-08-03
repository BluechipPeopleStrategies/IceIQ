# Cognitive Gym — drill change spec

**Source of requirements:** [`2026-08-03-playtest-findings-session2.md`](../2026-08-03-playtest-findings-session2.md),
sections S2-21 → S2-30 plus "Cross-cutting patterns".
**Scope:** `src/cognitive-gym/` only. Nothing in `src/scenario/` is touched — a
separate audit owns prompt-vs-coordinate mismatches in the scenario seeds. Where
this spec finds the same *class* of defect inside the gym, it says so and defers
the seed work.
**Status:** every change below is a **proposal**. No source file has been modified.

---

## 0. Read this first — two corrections to the findings doc

### 0.1 "Baller's Pick" is **Baylor's Pick**, and it is `TrackingDrill.jsx`

S2-28 was filed against Best Option. It is not. `Baller's Pick` is a
faster-whisper mis-transcription of **Baylor's Pick**, which is the drill
registered as `{ id: "tracking", name: "Baylor's Pick", component: TrackingDrill }`
in `CognitiveGym.jsx:33-43`.

Three independent confirmations:

| S2-28 item | Where it actually lives |
|---|---|
| "open man" | `TrackingDrill.jsx:531`, `CognitiveGym.jsx:40` (the tracking drill's `why` copy) |
| "the lock-in pill" | `TrackingDrill.jsx:553` — `<button className="gym-btn" onClick={lockIn}>Lock in</button>` |
| "somewhere that doesn't have any spots" | the tracking drill is the only drill where you tap **three** moving dots and then confirm |

`BestOptionDrill.jsx` has no "open man" string, no lock-in control, and a single
tap resolves the rep. **Everything under S2-28 in this spec is written against
`TrackingDrill.jsx`.** Confirm before building.

### 0.2 S2-30 is unusable as a requirement

The point-scheme sentence was cut mid-recording. Section C below **describes** the
current scheme and **diagnoses** what is incoherent — that part is evidence, not
opinion — but every fix is presented as an option and **none of them should be
built until Thomas finishes the sentence.** The exact question to put to him is at
the end of section C.

---

## 1. The mechanical / decision split

This is the part worth reading if you read nothing else.

### Safe mechanical changes — no product judgment, build these

| # | Change | Files |
|---|---|---|
| M1 | Five reps per session, via one shared constant | `gymEngine.js` + 11 drills |
| M2 | Snapshot: draw the whole formation on the wrong-answer reveal | `SnapshotDrill.jsx` |
| M3 | Snapshot: stop auto-advancing after 2.4 s; add a Next look control | `SnapshotDrill.jsx` |
| M4 | Snapshot: correct the ft-per-pixel inconsistency between axes | `snapshotCore.js`, `SnapshotDrill.jsx` |
| M5 | Read the Pass: trim the answer bar to the ice actually inside the rounded boards | `AnticipationDrill.jsx` |
| M6 | Baylor's Pick: keyboard input (digits, Enter, Backspace) | `TrackingDrill.jsx` |
| M7 | "open man" → "open player"; "where he was" → "where they were" | `TrackingDrill.jsx`, `CognitiveGym.jsx`, `SnapshotDrill.jsx` |
| M8 | Shootout: one consistent target shape for all six cells | `ShootoutDrill.jsx` |
| M9 | Shootout: the poke check actually pokes the puck away | `ShootoutDrill.jsx` |
| M10 | Results card: show `Level N → Level N+1` instead of a bare `Level 9. New best.` | `gymFx.jsx` + all drills |
| M11 | Remove the duplicated best-label (`sessionRankLabel` **and** `" New best."`) | 8 drills |
| M12 | Every drill's end card is headed "Session complete" | `ShootoutDrill.jsx` |

### Needs Thomas's decision — do not pick one of these unilaterally

| # | Decision | Why it is not mechanical |
|---|---|---|
| **D1** | **The point scheme** (section C) | Requirement is literally half a sentence |
| **D2** | **Action Rail anchor: top or bottom of the play surface** (section A) | He said "middle", "top", and "away from the spots" in three different places. One anchor has to win. |
| **D3** | **Shootout rendering approach: patch 2D / sprite art / real 3D** (section E) | Option C needs a new dependency, which is a standing hard stop |
| **D4** | **Canvas aspect: keep 0.62 or move to the real 0.425** (section F) | Changes the look of all 12 drills, and re-tunes every difficulty curve that is a fraction of `min(W,H)` |
| **D5** | **Two Things: does a half-success still count as a miss for levelling?** (section G) | Changes what "level" means in that drill |
| **D6** | **Run the Play / Late Read: rotate the play, or rotate the rink?** (section J) | One is correct, the other is cheap |
| **D7** | **Reaction drill: 5 trials, or keep a higher count?** (section B) | 5 samples is a statistically meaningless reaction time |

### Riskiest proposal

**D4 / M4 — changing the canvas aspect ratio from 0.62 to the real 0.425.** It is
the correct fix and it is the only thing that makes S2-26's "consistent with the
actual rink dimensions" true. But `setupCanvas`'s `aspect` argument feeds `H`,
and *eleven* difficulty parameters across six drills are expressed as fractions
of `min(W, H)` or of `H` — marker radius, hit radius, spacing gaps, corner
radius, lane bands, net scale. Changing the aspect silently re-tunes all of them
at once, and the shape of every drill on screen changes. It should be staged
behind a per-drill opt-in, not flipped globally in one commit. Full analysis in
section F.

---

## A. CONTROL PLACEMENT — the **Action Rail** standard

### A.1 The six complaints, and what they have in common

| Instance | Where the control is now |
|---|---|
| S2-18 — the unexplained angle pill | Read the Play (scenario), **out of scope** — but the standard covers it |
| S2-23 — "Read It button to more of the middle of the page" | `LateReadDrill.jsx:600ish` — a `.gym-row` **below** the canvas |
| S2-24 — "button at the top so you don't have to scroll" | `ReadNumbersDrill.jsx:401-407` — Watch, **below** the canvas |
| S2-25 — "the pill in the middle" | `TwoThingsDrill.jsx:557-563` and `565-592` — Go and the **shape buttons**, below the canvas |
| S2-28 — "lock-in pill somewhere that doesn't have any spots" | `TrackingDrill.jsx:551-557` — Lock in, **above** the canvas |
| Session 1 — the `+ Log` button | training log |

Two of these say "put it further up", two say "put it further down", one says
"put it in the middle". Taken literally they contradict. Taken as a group they do
not: **in every single case the control is outside the play surface, and the hand
is inside it.** That is the standard.

The secondary observation: the controls are also not in the *same* place drill to
drill. Tracking puts its buttons above the canvas; the other eleven put them
below. Read the Numbers puts Watch below the canvas but the *hint* below that,
so on a phone the button is under the fold. Two Things puts the shape cue at
`H * 0.2` (top of the rink) and the shape buttons below the canvas — roughly
500 px apart on a phone, on a drill that gives you 600 ms to use both.

### A.2 The standard

> **The Action Rail.** Every gym drill has exactly one action rail: a fixed,
> centred band **inside the play surface**, in the same place in every drill and
> in every stage, that holds every control the player needs to progress. Nothing
> the player must press to advance is ever outside the play surface, and no drill
> ever places a tap target inside the rail band.

Seven rules:

1. **One primary action visible at a time.** Exactly one gold `.gym-btn` in the
   rail per stage. Its position never changes between stages — only its label
   (`Watch` → `Next rep`, `Go` → `Next shot`, `Read it` → `Next rep`).
2. **The rail lives inside the play surface**, absolutely positioned over the
   canvas, horizontally centred, anchored by one CSS custom property so it can
   be moved in one edit (see D2).
3. **The rail band is target-free.** Every generator that places tap targets
   clamps into `[0, H * GYM_TARGET_MAX_Y]` with `GYM_TARGET_MAX_Y = 0.86`. Any
   moving target bounces off that boundary rather than the canvas edge.
4. **Multi-choice controls use the same rail.** SHOOT/PASS/CARRY, the shape
   buttons, and Lock in all render as one centred row in the band. This is the
   change that actually fixes Two Things.
5. **Nothing below the canvas is ever required.** Level / rep / points chips and
   Back / Restart stay in `.gym-drill-bar` at the top. They are read-only.
6. **The hint moves above the canvas**, so the rail is the last thing on screen
   and the page never needs to scroll to reach a control.
7. **Every rail control has a keyboard binding**, shown as a small key cap.
   `Space` = the primary action, everywhere.

**Name:** the Action Rail. Referred to in code as `.gym-rail`.

### A.3 Patch — CSS (`cognitive-gym.css`)

The canvas is sized in explicit CSS pixels by `setupCanvas` and centred by
`margin: 0 auto`, so the rail needs a positioned wrapper around it.

```css
/* --- Action Rail (control-placement standard) -------------------------------
   One centred band INSIDE the play surface holding every control the player
   needs to progress. Anchor is a single custom property so top/bottom is one
   edit (see D2 in the gym drill spec). */
.gym-root {
  /* ... existing custom properties ... */
  --gym-rail-anchor: bottom;   /* "bottom" | "top" — flip in ONE place */
  --gym-rail-inset: 3.5%;      /* distance from that edge of the play surface */
  --gym-rail-band: 14%;        /* reserved, target-free fraction of the surface */
}

/* Positioned wrapper: exactly the canvas's box, so the rail can sit over it. */
.gym-stage {
  position: relative;
  width: fit-content;
  margin: 0 auto;
}

.gym-rail {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: var(--gym-rail-inset);
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  max-width: 94%;
  z-index: 2;
}

/* Flip the whole gym to a top rail by setting --gym-rail-anchor: top. */
.gym-root[style*="--gym-rail-anchor: top"] .gym-rail,
.gym-rail.is-top {
  bottom: auto;
  top: var(--gym-rail-inset);
}

/* Rail buttons carry a shadow so they read as floating over the ice. */
.gym-rail .gym-btn {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.34);
}

/* Keyboard hint cap on a rail control. */
.gym-key {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 6px;
  border-radius: 5px;
  border: 1px solid rgba(11, 27, 43, 0.35);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.72em;
  opacity: 0.75;
}

/* .gym-fab is superseded by .gym-rail. Keep the class as an alias during the
   migration so no drill breaks mid-rollout, then delete. */
.gym-fab { display: block; margin: 12px auto 0; box-shadow: 0 4px 14px rgba(0,0,0,0.3); }
```

### A.4 Patch — the shared constant (`gymEngine.js`)

```js
// --- Action Rail ------------------------------------------------------------
// The rail occupies a reserved band of the play surface. No drill may place a
// tap target inside it, and moving targets bounce off this boundary rather than
// the canvas edge. Keep in sync with --gym-rail-band in cognitive-gym.css.
export const GYM_RAIL_BAND = 0.14;
export const GYM_TARGET_MAX_Y = 1 - GYM_RAIL_BAND; // 0.86

// Largest y a tap target may occupy on a canvas of height H.
export function targetMaxY(H) {
  return H * GYM_TARGET_MAX_Y;
}
```

### A.5 Patch — per-drill wiring (the shape is identical in all twelve)

Shown for `ReadNumbersDrill.jsx`; the other eleven are the same three edits.

```jsx
// BEFORE — ReadNumbersDrill.jsx:393-419
      <canvas
        ref={canvasRef}
        className="gym-canvas"
        style={{ display: phase === "playing" ? "block" : "none" }}
        onMouseDown={handleTap}
        onTouchStart={handleTap}
      />

      {phase === "playing" && stage === "ready" && (
        <div className="gym-row" style={{ marginBottom: 10 }}>
          <button className="gym-btn" onClick={beginWatch}>
            Watch
          </button>
        </div>
      )}

      {phase === "playing" && (
        <p className="gym-hint" aria-live="polite">
          {hint}
        </p>
      )}

      {phase === "playing" && stage === "feedback" && (
        <button className="gym-btn gym-fab" onClick={advanceRep}>
          Next rep
        </button>
      )}
```

```jsx
// AFTER
      {/* Rule 6: the hint sits ABOVE the play surface so the rail is the last
          thing on screen and nothing needs scrolling to reach. */}
      {phase === "playing" && (
        <p className="gym-hint" aria-live="polite">
          {hint}
        </p>
      )}

      <div className="gym-stage" style={{ display: phase === "playing" ? "block" : "none" }}>
        <canvas
          ref={canvasRef}
          className="gym-canvas"
          onMouseDown={handleTap}
          onTouchStart={handleTap}
        />

        {/* Rule 1: ONE primary action, same position every stage. */}
        {phase === "playing" && stage === "ready" && (
          <div className="gym-rail">
            <button className="gym-btn" onClick={beginWatch}>
              Watch<kbd className="gym-key">space</kbd>
            </button>
          </div>
        )}
        {phase === "playing" && stage === "feedback" && (
          <div className="gym-rail">
            <button className="gym-btn" onClick={advanceRep}>
              Next rep<kbd className="gym-key">space</kbd>
            </button>
          </div>
        )}
      </div>
```

Plus rule 3 in the generator — `ReadNumbersDrill.jsx:136-155`:

```js
// BEFORE
    const r = Math.max(13, Math.round(W * 0.045));
    const pad = r + 12;
    const minGap = r * 2.4;

    const spots = [];
    let guard = 0;
    while (spots.length < formation.numbers.length && guard < 4000) {
      guard += 1;
      const x = pad + Math.random() * (W - 2 * pad);
      const y = pad + Math.random() * (H - 2 * pad);
```

```js
// AFTER — the rail band is target-free (Action Rail rule 3)
    const r = Math.max(13, Math.round(W * 0.045));
    const pad = r + 12;
    const minGap = r * 2.4;
    const yMax = targetMaxY(H) - pad;   // import { targetMaxY } from "./gymEngine"

    const spots = [];
    let guard = 0;
    while (spots.length < formation.numbers.length && guard < 4000) {
      guard += 1;
      const x = pad + Math.random() * (W - 2 * pad);
      const y = pad + Math.random() * (yMax - pad);
```

Plus rule 7 — one keyboard effect per drill:

```jsx
// Rule 7: Space fires the primary rail action, everywhere in the gym.
useEffect(() => {
  if (phase !== "playing") return;
  const onKey = (e) => {
    if (e.code !== "Space" && e.key !== " ") return;
    if (stage === "ready") { e.preventDefault(); beginWatch(); }
    else if (stage === "feedback") { e.preventDefault(); advanceRep(); }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [phase, stage]);
```

### A.6 Per-drill inventory of what changes

| Drill | Control(s) moving into the rail | Extra work |
|---|---|---|
| Read the Pass | (none — tap-only) | rail holds `Next` on reveal |
| **Baylor's Pick** | `Start shift`, **`Lock in`**, `Next shift` — currently **above** the canvas | dots must bounce off `targetMaxY(H)`, not `H - r` |
| Shoot or Hold | the light IS the control | rail unused; exempt, document it |
| Eyes Up | `Go` | clamp flash positions |
| **Snapshot** | `Show me`, new `Next look` | clamp `makeFormation` markers |
| Find the Lane | `Read it`, `Next rep` | clamp lanes |
| Best Option | `Read it`, **SHOOT/PASS/CARRY**, `Next rep` | clamp `makeSituation` bodies |
| **Read the Numbers** | `Watch`, `Next rep` | clamp spots (shown above) |
| **Late Read** | **`Read it`**, `Next rep` | clamp `makeTrial`; `you` currently sits at `H*0.86` — exactly the band edge, so YOU moves up to `H*0.80` |
| **Two Things** | `Go`, **the shape buttons** | the shape *cue* moves from `H*0.2` to just above the rail |
| **Shootout** | `Go`, `Next shot` | `netAt` already keeps the net above `H*0.8`; the rail sits over the POV stick, which is fine |
| Run the Play | `Go`, `Next play` | clamp `makeSkaters` |

### A.7 Risks

- **Occlusion.** In Snapshot and Baylor's Pick the whole surface is tappable
  today; reserving 14 % shrinks the answer space and marginally changes
  difficulty. Snapshot's `hitRadius` is a fraction of `min(W, H)` and does not
  change, so the *relative* difficulty shifts slightly easier.
- **Alternative considered and rejected:** reserve the band only in stages where
  a rail control is visible. Cheaper on answer space, but the band boundary moves
  during a rep, which is worse than a slightly smaller rink.
- **`.gym-fab` is used by 5 drills.** Keep it as an alias through the migration
  rather than a big-bang rename.

### A.8 **D2 — the one open decision**

He said the control should be "more of the **middle** of the page" (Late Read),
"at the **top** so you don't have to scroll" (Read the Numbers), and "somewhere
that doesn't have any **spots**" (Baylor's Pick). The rail satisfies all three
intents, but it has to physically sit somewhere.

- **Bottom anchor** (this spec's default): thumb-natural on a phone, matches the
  five drills that already put their advance button below the play. Costs the
  bottom of the ice.
- **Top anchor**: literally matches "at the top", and in Baylor's Pick the dots
  bunch low as often as high so it is no safer either way. Costs a reach on a
  tall phone.

It is one CSS custom property (`--gym-rail-anchor`). Build it bottom, show him
both, let him flip it. **Do not guess.**

---

## B. FIVE REPS

> "why don't we do five reps on all of these games, for now, ten is a lot" (S2-24)
> "five trials" (S2-21, Shootout)

### B.1 Where the counts live — all twelve

| Drill | File | Line | Constant | Now | → |
|---|---|---|---|---|---|
| Read the Pass | `AnticipationDrill.jsx` | 22 | `ROUNDS` | 8 | 5 |
| Baylor's Pick | `TrackingDrill.jsx` | 22 | `SHIFTS` | 6 | 5 |
| Shoot or Hold | `ReactionDrill.jsx` | 20 | `TRIALS` | 16 | **see D7** |
| Eyes Up | `EyesUpDrill.jsx` | 25 | `TRIALS` | 12 | 5 |
| Snapshot | `SnapshotDrill.jsx` | 23 | `REPS` | 8 | 5 |
| Find the Lane | `FindLaneDrill.jsx` | 23 | `REPS` | 8 | 5 |
| Best Option | `BestOptionDrill.jsx` | 25 | `REPS` | 8 | 5 |
| Read the Numbers | `ReadNumbersDrill.jsx` | 16 | `REPS` | **10** | 5 |
| Late Read | `LateReadDrill.jsx` | 26 | `REPS` | 9 | 5 |
| Two Things | `TwoThingsDrill.jsx` | 33 | `REPS` | 9 | 5 |
| **Shootout** | `ShootoutDrill.jsx` | 25 | `REPS` | **10** | 5 |
| Run the Play | `RunThePlayDrill.jsx` | 23 | `REPS` | 6 | 5 |

### B.2 Patch — one shared constant

`gymEngine.js`:

```js
// --- Session length ---------------------------------------------------------
// Reps in one gym session. Deliberately short: a session should be finishable
// in a couple of minutes so it gets played often, not once. Thomas, 2026-08-03:
// "why don't we do five reps on all of these games, for now, ten is a lot."
export const REPS_PER_SESSION = 5;
```

Then in each drill, keep the local name so nothing else in the file changes:

```js
// BEFORE — ShootoutDrill.jsx:25
const REPS = 10;
```
```js
// AFTER
import { REPS_PER_SESSION } from "./gymEngine";
const REPS = REPS_PER_SESSION;
```

```js
// BEFORE — TrackingDrill.jsx:22
const SHIFTS = 6;
```
```js
// AFTER
const SHIFTS = REPS_PER_SESSION;
```

…and the same one-line substitution in the other nine. **This is the whole
change.** Every drill already derives its progress chip, its score, and its
`advanceRep` boundary from the constant, so nothing else needs touching.

### B.3 Knock-on effects — all checked, all benign except two

- **Score granularity.** `score = round(hits / REPS * 100)` becomes 0/20/40/60/
  80/100. Acceptable, and arguably clearer than 12.5 % steps.
- **Levelling rate.** `createAdaptiveLevel` promotes on `upStreak = 3`. In a
  5-rep session you can promote **at most once**. That is a feature, not a bug:
  it makes section D's "Level 8 → Level 9" story true instead of "Level 6 →
  Level 9, what happened?" Streaks persist across sessions via
  `startUps`/`startDowns`, so nothing is lost.
- **Shootout can no longer tie** (5 is odd). `const tied = goals === saves` at
  `ShootoutDrill.jsx:639` becomes dead. Leave it — it costs nothing and a future
  count change may resurrect it. The pip row `Array.from({ length: REPS })`
  renders 5 pips, which is *better*: he explicitly said he likes the O/X row and
  five reads at a glance beats ten.
- **`earnedBadges` "Goalie Beater"** counts shootout *sessions* ≥ 10, not shots.
  Unaffected.
- **`meta.saves: REPS - hits`** still correct.

### B.4 **D7 — Shoot or Hold (`ReactionDrill`) is the exception**

It measures reaction time and reports `meta.avgRt`, which surfaces on the hub as
`fastest ms`. Five samples of a reaction time is noise — a single flinch moves
the mean by 20 %. Three options, his call:

1. Take it to 5 anyway; accept that `fastest ms` gets noisy.
2. Hold it at 12 and treat "five reps" as a rule for the *read* drills, which is
   the context in which he said it (he was on Read the Numbers).
3. Restructure it as **5 rounds of 3 flashes** — five reps on the scoreboard,
   fifteen samples in the statistics. Costs a small rework of the trial loop.

Option 3 is the honest one. It is not mechanical.

---

## C. THE POINT SCHEME — description, diagnosis, options (**needs his input**)

> "when you go 'number two' and then '+2', it just looks kind of amateurish" (S2-24)
> "I want the point scheme to make sense, I want the point scheme to be—" *[recording ends]* (S2-30)

### C.1 What the scheme does today

The whole of `gymPoints.js`:

```js
export const MAX_REP = 1000; // points for a perfect, bang-on rep
export const DECAY = 0.12;   // smaller = points fall off faster with error

export function gradedPoints(normError, { maxRep = MAX_REP, decay = DECAY } = {}) {
  const e = Math.min(Math.max(normError, 0), 1);
  return Math.round(maxRep * Math.exp(-e / decay));
}
```

One rep is worth `1000 · e^(−error / 0.12)`, where `error` is a 0-to-1 number
that **every drill defines differently**:

| Drill | What the 0-1 "error" measures | Source |
|---|---|---|
| Shootout | `tapMs / shotClockMs` — pure speed | `shootoutCore.js:191` |
| Read the Numbers | `answerMs / 3200` — pure speed | `readNumbersCore.js:88` |
| Late Read | `(tapMs − settleMs) / (clockMs − settleMs)` — speed after the switch | `lateReadCore.js:205` |
| Snapshot | `distPx / canvasDiagonal` — spatial accuracy | `snapshotCore.js:94` |
| Read the Pass | `errorFt / 40` — spatial accuracy in **real feet** | `anticipationCore.js:40` |
| Run the Play | `1 − correctPrefix / seqLen` — proportion recalled | `runThePlayCore.js:83` |
| Two Things | two half-scales, `×0.5` each | `twoThingsCore.js:140,159` |
| **Baylor's Pick** | **does not use `gradedPoints` at all** — flat `200/target + 150 + 250` | `trackingCore.js` |

### C.2 What is incoherent — six findings, all verifiable

**1. The `+2` is real, and it is worse than it looks.**
Read the Numbers uses `ANSWER_WINDOW_MS = 3200`. Solving
`1000 · e^(−(t/3200)/0.12)` for the printed value:

| Correct answer taken in… | Points printed |
|---|---|
| 0.4 s | 355 |
| 1.0 s | 76 |
| 1.5 s | 20 |
| 2.0 s | 7 |
| **2.4 s** | **+2** |
| 2.7 s | +1 |
| **≥ 2.81 s** | **0 — a correct read worth nothing** |

Reading a jersey number off a formation, holding it, and tapping the right
skater in 2.4 s is a **good** read. It prints `+2`. And because the drill shows
jersey numbers on screen, "which one was #2?" answered correctly can print
"+2" — which is exactly what he saw. `Math.round` then hands a *correct* answer a
literal zero past 2.8 s. That is the whole complaint, and it is a bug-grade
defect, not a taste issue.

**2. The unit means nothing.** There is no stated cap, no floor, no relation to
level, no relation to anything the player can see. `xpFromPoints` quietly divides
by 10 (`gymProgressCore.js:15`) to feed the rank ladder, so there is a *second*
hidden currency at a different scale.

**3. Same word, incomparable scales.** The hub sums everything into one
`careerPoints` stat. But a perfect 5-rep Baylor's Pick session pays a flat
**5,000** (`shiftPoints` has no decay at all), while a *good* 5-rep Read the
Numbers session realistically pays **under 300**. The hub presents these as the
same number. A kid optimising "points" should just play Baylor's Pick forever.

**4. The curve makes points effectively binary.** With `DECAY = 0.12`, 87 % of
all points available in a rep are earned in the first 25 % of the window.
Everything after that rounds toward zero. So the number on screen mostly reports
*reflex*, not read quality — on drills that are explicitly about reading.

**5. Levels are unpriced.** A bang-on rep at level 2 and a bang-on rep at level
18 both pay 1000. There is no reward for playing where it is hard, which
undercuts the entire adaptive-level system.

**6. Two competing "best" labels.** `sessionRankLabel` prints "Personal best!"
(`gymProgressCore.js:70`) *and* every results card separately prints `" New
best."` when `(saved.bestPoints || 0) <= points` — note `<=`, so **tying** your
best prints "New best." Both appear on the same card.

### C.3 Four options

None of these should be built yet. Ordered cheapest → deepest.

**Option 1 — floor and flatten.** Keep the 1000-point rep. Raise `DECAY` 0.12 →
0.35 and add a floor so a correct rep is never worth less than 10 % of max.

```js
export const MAX_REP = 1000;
export const DECAY = 0.35;         // was 0.12 — 87% of points were in the first quarter
export const MIN_CORRECT = 100;    // a correct rep is never worth "+2"

export function gradedPoints(normError, { maxRep = MAX_REP, decay = DECAY, floor = MIN_CORRECT } = {}) {
  const e = Math.min(Math.max(normError, 0), 1);
  return Math.max(floor, Math.round(maxRep * Math.exp(-e / decay)));
}
```
Fixes finding 1 outright. Leaves 2, 3, 5. Smallest possible change. **~15 min.**

**Option 2 — tiers (recommended if he wants "make sense").** Kill the continuous
curve at the display layer. Each rep pays one of five tiers, and the *word* does
the teaching while the *number* does the counting:

| Tier | Points | Shown as |
|---|---|---|
| Perfect | 100 | "Perfect +100" |
| Great | 75 | "Great read +75" |
| Good | 50 | "On target +50" |
| Correct | 25 | "Got it +25" |
| Miss | 0 | "Missed" |

A 5-rep session tops out at a clean **500**. Nothing ever prints a single digit,
so nothing ever collides with a jersey number. `anticipationCore.rateMiss`
already has exactly this vocabulary (`perfect / great / good / miss`) — promote
it into `gymPoints.js` and use it gym-wide. Fixes 1, 2, 3, 4, 6. **~1 day** to
re-point all twelve drills onto one scale.

**Option 3 — tiers plus a level multiplier.** `points = tier × (1 + level / 10)`.
A perfect rep at level 1 pays 110, at level 20 pays 300. Fixes 5 as well.
Presenting "500 × your level bonus" is a story a 12-year-old understands. Adds
one line on top of option 2.

**Option 4 — two currencies.** Per-rep feedback becomes a *quality* word plus a
percentage and no points at all. The only "points" are earned at session scale:
100 for finishing, 50 per level gained, 25 per personal best. Cleanest model,
biggest rewrite, and it changes the hub, the badges, the rank ladder, and
`xpFromPoints`.

### C.4 **The question to put to him**

> "The point scheme sentence cut off at 20:21. Two things I need from you:
> **(a)** what should one good rep be worth, roughly — 100, 1000, or 'I don't
> care about the number, just the word'? **(b)** should points be comparable
> *across* drills, so 3,000 in Snapshot means the same effort as 3,000 in
> Baylor's Pick? Right now they don't, by about 15×.
> Separately, confirmed defect regardless of your answer: a *correct* Read the
> Numbers answer taken in 2.4 s prints `+2`, and one taken in 2.9 s prints `0`."

---

## D. PROGRESSION LEGIBILITY

> "it says level nine, new best. So does that mean I've gone to level nine now?
> What was I before? Maybe we show some sort of sliding improvement from where
> they were before to the next level… we need to have it be session complete." (S2-27)

### D.1 What the card shows now

Every drill's end card is a variation of `ReadNumbersDrill.jsx:421-442`:

```jsx
<h2>Session complete</h2>
<ScoreCount value={points} />
<ConfettiBurst fire={!!bestLabel} />
{bestLabel && <p className="gym-best">{bestLabel}</p>}
<p>
  {points} points. {hits} of {REPS} numbers found. Level {level}.
  {saved && (saved.bestPoints || 0) <= points && points > 0 ? " New best." : ""}
</p>
```

So the player sees a number, a "Personal best!", and `Level 9. New best.` — and
is never shown the level they **started** at. That is the whole of his question.

### D.2 The data is already there

- `getDrill(playerId, id).level` at `start()` — the level he came in at. Read
  today, then thrown away.
- `engineRef.current.level` — the level he leaves at.
- `engineRef.current.toPromote` — clean reps still needed for the next level.
- `saved.sessions[length - 2].points` — last session's points, for a delta.
- `saved.bestPoints` — the career best.

No storage change is needed. This is a rendering change.

### D.3 Patch — a shared `SessionSummary` in `gymFx.jsx`

Adding it to the existing `gymFx.jsx` avoids a new file.

```jsx
// Session progression: where you started, where you finished, and how far the
// next level is. Answers "level nine — what was I before?" (S2-27). Pure
// presentation; all values come from state the drill already holds.
export function LevelProgress({ from, to, toPromote, upStreak = 3 }) {
  const moved = to !== from;
  const filled = Math.max(0, upStreak - (toPromote ?? upStreak));
  return (
    <div className="gym-progress" aria-label={`Level ${from} to level ${to}`}>
      <div className="gym-progress-levels">
        <span className={moved ? "gym-progress-from was" : "gym-progress-from"}>Level {from}</span>
        {moved && <span className="gym-progress-arrow" aria-hidden="true">→</span>}
        {moved && <span className="gym-progress-to">Level {to}</span>}
      </div>
      {moved ? (
        <p className="gym-progress-note">You moved up a level this session.</p>
      ) : (
        <>
          <div className="gym-progress-bar" role="img"
               aria-label={`${filled} of ${upStreak} clean reps toward level ${to + 1}`}>
            {Array.from({ length: upStreak }, (_, i) => (
              <span key={i} className={i < filled ? "gym-pip on" : "gym-pip"} />
            ))}
          </div>
          <p className="gym-progress-note">
            {toPromote} more clean rep{toPromote === 1 ? "" : "s"} to reach Level {to + 1}.
          </p>
        </>
      )}
    </div>
  );
}

// Points this session against the previous one. Returns null when there is no
// previous session, rather than a hollow "+0".
export function PointsDelta({ points, sessions }) {
  const all = sessions || [];
  if (all.length < 2) return null;
  const prev = all[all.length - 2].points || 0;
  const d = Math.round(points) - prev;
  if (d === 0) return <p className="gym-progress-note">Same as your last session.</p>;
  return (
    <p className="gym-progress-note">
      {d > 0 ? `${d} more` : `${Math.abs(d)} fewer`} than your last session ({prev}).
    </p>
  );
}
```

CSS:

```css
.gym-progress { margin: 6px 0 14px; }
.gym-progress-levels { display: flex; align-items: baseline; justify-content: center; gap: 8px; font-weight: 700; }
.gym-progress-from.was { color: var(--gym-muted); text-decoration: line-through; text-decoration-thickness: 1px; }
.gym-progress-to { color: var(--gym-gold); font-size: 1.15em; }
.gym-progress-arrow { color: var(--gym-muted); }
.gym-progress-bar { display: flex; gap: 6px; justify-content: center; margin: 8px 0 4px; }
.gym-pip { width: 26px; height: 6px; border-radius: 999px; background: #1e3f5f; }
.gym-pip.on { background: var(--gym-gold); }
.gym-progress-note { color: var(--gym-muted); font-size: 0.85rem; margin: 0; }
```

### D.4 Patch — per drill (shown for Read the Numbers)

Capture the starting level:

```js
// BEFORE — ReadNumbersDrill.jsx:255-261
  function start() {
    const d = getDrill(playerId, "readnumbers");
    engineRef.current = createAdaptiveLevel(d.level, {
```
```js
// AFTER
  const startLevelRef = useRef(1);   // level the player came in at, for the summary
  function start() {
    const d = getDrill(playerId, "readnumbers");
    startLevelRef.current = d.level;
    engineRef.current = createAdaptiveLevel(d.level, {
```

Then the card:

```jsx
// BEFORE — ReadNumbersDrill.jsx:421-432
      {phase === "done" && (
        <div className="gym-card">
          <h2>Session complete</h2>
          <ScoreCount value={points} />
          <ConfettiBurst fire={!!bestLabel} />
          {bestLabel && <p className="gym-best">{bestLabel}</p>}
          <p>
            {points} points. {hits} of {REPS} numbers found. Level {level}.
            {saved && (saved.bestPoints || 0) <= points && points > 0
              ? " New best."
              : ""}
          </p>
```
```jsx
// AFTER — M10 + M11. The duplicate " New best." goes: sessionRankLabel already
// says it, and its `<=` printed "New best" on a TIE.
      {phase === "done" && (
        <div className="gym-card">
          <h2>Session complete</h2>
          <ScoreCount value={points} />
          <ConfettiBurst fire={!!bestLabel} />
          {bestLabel && <p className="gym-best">{bestLabel}</p>}
          <LevelProgress
            from={startLevelRef.current}
            to={level}
            toPromote={engineRef.current ? engineRef.current.toPromote : 3}
          />
          {saved && <PointsDelta points={points} sessions={saved.sessions} />}
          <p>{hits} of {REPS} numbers found.</p>
```

### D.5 "we need to have it be session complete"

Two readings; only one is mechanical.

- **(a) Literal — every end card is headed "Session complete."** Ten of twelve
  already are. **Shootout is not**: `ShootoutDrill.jsx:771` heads its card with
  `{won ? "You win the shootout!" : tied ? "Shootout tied" : "The goalie takes this one"}`.
  Baylor's Pick is, but has no best-line at all. Patch — keep the flavour as a
  subhead:

```jsx
// BEFORE — ShootoutDrill.jsx:771
          <h2>{won ? "You win the shootout!" : tied ? "Shootout tied" : "The goalie takes this one"}</h2>
```
```jsx
// AFTER
          <h2>Session complete</h2>
          <p className="gym-best" style={{ marginTop: 0 }}>
            {won ? "You win the shootout!" : tied ? "Shootout tied" : "The goalie takes this one"}
          </p>
```

- **(b) Structural — a session must be a discrete, non-repeating unit.** This is
  **S2-SESSIONS** (`saveQuizSession` firing twice, run-on sessions inflating the
  count), which lives outside the gym. If that is what he meant, it belongs with
  the save-path work, not here. **Ask.**

---

## E. SHOOTOUT (S2-21)

### E.1 Keep

The approach camera. `netAt(W, H, p)` interpolates net scale `FAR_SCALE 0.42` →
`NEAR_SCALE 1.0` and the ground line `H*0.44` → `H*0.8` over the shot clock,
eased by `approachEase(p) = p·(0.55 + 0.45p)`, with converging board lines and
sweeping speed lines in `drawArena`. **Do not touch `netAt`, `approachEase`,
`drawArena`, or `HORIZON` in any rendering option below.** ([11:51] "I do like
how it zooms in, and you're actually moving it into attack.")

Also keep the O/X pip row (`ShootoutDrill.jsx:667-685`) — [12:33] "I do like the
O and X up top." With five reps it becomes five pips, which is better.

### E.2 The rendering problem, scoped concretely — **do not design this here**

Per the brief, this section describes what is wrong and lays out approaches. It
does not pick one.

**Fault 1 — the target shapes are inconsistent, and the inconsistency is
meaningless.** This is literally his "five green circles and one black square."

- Open cells are drawn by `drawOpenCell` (`:99-107`) as a **green stroked
  circle** at 0.28 × the cell's short side.
- Covered cells are drawn by `drawSavePiece` (`:132-197`), whose shape is chosen
  by *which goalie body part* covers that cell (`CELL_PART`, `:76-83`):

  | Cell | Part | Shape drawn |
  |---|---|---|
  | `gloveHi`, `gloveLo`… | `glove` | `arc` — a circle |
  | `midHi` | `head` | `rect` |
  | `blkrHi`, `blkrLo` | `blocker` | **`rect` — a square** |
  | `fiveHole` | `stick` | `rect` |
  | `padL` / `padR` | leg pad | rounded rect |

  So a shot where the blocker side is the covered cell renders exactly one dark
  square among five green circles. The player reads "one of these is different"
  as meaning, and it means nothing about the read.
- Worse: the two channels use **different visual grammar for the same
  information**. Open is communicated by an outline; covered by a filled body
  part. And green-means-go inverts the gym's convention everywhere else, where
  **gold** is the thing you want (Snapshot's open teammate, Late Read's cue,
  Baylor's gold targets).

**Fault 2 — the goalie is too small to read as a goalie.**
`u = Math.min(net.w/3, net.h/2) * 0.36` (`:336`), i.e. `u` ≈ 0.36 of one cell.
`drawGoalieCore` then draws a body ellipse `0.7u × 0.85u` and a head of radius
`0.48u`. Total silhouette height ≈ `2.3u` ≈ **0.83 of one cell**, inside a net
that is **two cells tall**. So the goalie occupies roughly **35 % of the net's
height**. A real goalie in a real net occupies 65-75 %. It reads as a small dark
blob floating in a rectangle — his "the goalie reads as too small/unclear."

**Fault 3 — nothing says "net".** The net is `ctx.strokeRect(net.x, net.y,
net.w, net.h)` plus two vertical grid lines and one horizontal
(`:301-315`). No posts, no crossbar, no mesh, no depth. It is a rectangle with a
tic-tac-toe grid, which is why it reads as a "target grid" rather than a goal.

**Fault 4 — the net does not sit in the scene.** `drawArena` establishes a
perspective floor with converging boards, but `netAt` returns an
**axis-aligned, flat rectangle** that just scales. So the one object the player
is aiming at is the only object not obeying the scene's perspective.

**Fault 5 — the crease is an ellipse behind nothing.** `:318-321` draws a
`0.42w × 0.12h` ellipse *under* the net rect, but the net has no depth for it to
belong to.

### E.3 Three approaches — tradeoffs, for a human decision

| | **A. Fix the 2D canvas renderer** | **B. Pre-rendered sprite art** | **C. Real 3D** |
|---|---|---|---|
| **What it is** | One consistent target grammar; a real net (posts/crossbar/mesh/depth trapezoid); goalie scaled to ~0.72 × net height with a proper silhouette | Author or license a goalie sprite sheet (butterfly / glove-up / blocker-up / poke) + a perspective net PNG at N depth steps; the renderer picks a pose and blits at the current scale | Minimal WebGL scene: net mesh, rigged goalie, camera dollying along the approach |
| **Fixes faults** | 1, 2, 3, 5 fully; 4 partially (fake perspective) | 1, 2, 3, 4, 5 | all of them |
| **Effort** | ~250 lines of canvas in one file | ~80 lines of code + a real art task | new scene, new asset pipeline |
| **New deps** | **none** | none (assets only) | **three.js ≈ 150 KB gz — a standing hard stop, needs explicit approval** |
| **Keeps the zoom he liked** | yes, untouched | yes, untouched | yes, and better |
| **"Attack from different angles" ([12:05])** | hard — every angle is hand-drawn | hard — one sprite set per angle | **nearly free** — move the camera |
| **Risk** | low; reversible; nothing else in the gym changes | medium; blocked on art, and art quality *is* the outcome | high; largest surface, and the only option that can regress performance on a phone |
| **Unblocks the other four Shootout fixes today?** | **yes** | no (blocked on art) | no |

**Framing for the decision, not a recommendation:** A is the only option that can
ship this week and it does not foreclose B or C — the cell/goalie/net drawing is
three functions behind one `render()`. B is the best visual return per line of
code but its outcome is entirely determined by whoever draws the art. C is what
"something we can model from the internet for the 3D rendering" actually points
at, is the only one that makes "attack from different angles" cheap, and is the
only one that trips the new-dependency hard stop.

### E.4 The four mechanical Shootout fixes

**M8 — one consistent target shape.** Independent of which rendering option
wins. All six cells always draw the same plate; state is carried by fill and
outline, not by shape:

```js
// BEFORE — ShootoutDrill.jsx:99-107
  function drawOpenCell(ctx, r) {
    ctx.save();
    ctx.strokeStyle = "#1f9d55";
    ctx.lineWidth = Math.max(2, r.w * 0.045);
    ctx.beginPath();
    ctx.arc(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
```
```js
// AFTER — every cell is the same rounded plate at the same size, in every state.
// Open = gold outline (the gym's "this is the one you want" colour everywhere
// else); covered = flat slate. Shape NEVER carries meaning, so five circles and
// one square can no longer happen. The goalie limb draws ON TOP of a covered
// plate rather than replacing it. (S2-21, "the shapes aren't really consistent")
  function drawCellPlate(ctx, r, state) {
    const pad = Math.min(r.w, r.h) * 0.14;
    const x = r.x + pad;
    const y = r.y + pad;
    const w = r.w - pad * 2;
    const h = r.h - pad * 2;
    const rr = Math.min(w, h) * 0.18;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    if (state === "open") {
      ctx.strokeStyle = "#f2b705";
      ctx.lineWidth = Math.max(2.5, r.w * 0.05);
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(43,58,71,0.30)";
      ctx.fill();
    }
    ctx.restore();
  }
```

and at the call site:

```js
// BEFORE — ShootoutDrill.jsx:347-352
    rects.forEach((r) => {
      if (target && r.id === target.id) return;
      if (isCellOpenAt(shot, r.id, elapsed)) drawOpenCell(ctx, r);
    });
```
```js
// AFTER — every cell always draws, so the grid never gains or loses members
    rects.forEach((r) => {
      if (target && r.id === target.id) return;
      drawCellPlate(ctx, r, isCellOpenAt(shot, r.id, elapsed) ? "open" : "covered");
    });
```

**Five trials** — section B.

**"Only a back button" ([12:33]).** Verified: during `stage === "live"` and
`stage === "shooting"` **no button renders at all**. `Go` only shows at `ready`
(`:749-755`), `Next shot` only at `reveal` (`:763-767`), and the bar holds Back +
Restart. So for the entire time the drill is actually running, the only control
on screen is Back. Fix, consistent with the Action Rail's "the rail is never
empty":

```jsx
// AFTER — inside .gym-stage, the rail always holds something.
        {phase === "playing" && stage === "ready" && (
          <div className="gym-rail">
            <button className="gym-btn" onClick={go}>Go<kbd className="gym-key">space</kbd></button>
          </div>
        )}
        {phase === "playing" && (stage === "live" || stage === "shooting") && (
          <div className="gym-rail">
            {/* the remaining-ice bar, promoted out of the canvas into the rail so
                the control area is never empty mid-shot (S2-21, "only a back button") */}
            <div className="gym-ice-bar" aria-label="Ice remaining">
              <span style={{ width: `${Math.round(iceLeftPct)}%` }} />
            </div>
          </div>
        )}
        {phase === "playing" && stage === "reveal" && (
          <div className="gym-rail">
            <button className="gym-btn" onClick={advanceRep}>
              {rep + 1 >= REPS ? "See the result" : "Next shot"}<kbd className="gym-key">space</kbd>
            </button>
          </div>
        )}
```
(and delete the in-canvas bar at `:420-427`.)

**M9 — the poke check must actually poke the puck away.** Today, when the clock
expires: `sc.expired = true`, stage jumps straight to `reveal`, `drawPov` is
called with `puckVisible: !target && !sc.expired` so **the puck simply
disappears**, and a "POKE CHECK" banner prints. Nothing pokes anything.

```js
// BEFORE — ShootoutDrill.jsx:522-531
      if (cellId == null) {
        // never released: the goalie pokes it away, straight to the reveal
        sc.expired = true;
        sc.stage = "reveal";
        setStage("reveal");
        setLast({ success: false, repPoints: 0, expired: true });
        render();
        resolveRep(false);
        return;
      }
```
```js
// AFTER — animate the poke instead of teleporting to the banner (S2-21, [12:10]
// "the poke check should actually poke the puck away").
      if (cellId == null) {
        sc.expired = true;
        sc.pokeAnimStart = performance.now();
        sc.stage = "poking";
        setStage("poking");
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
```

New constant, new tick branch, new draw, and a finisher:

```js
const POKE_ANIM_MS = 520; // goalie stick sweep + puck skid

// in tick(), alongside the "live" and "shooting" branches:
    } else if (sc.stage === "poking") {
      render();
      if (performance.now() - sc.pokeAnimStart >= POKE_ANIM_MS) {
        finishPokeAnim();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

function finishPokeAnim() {
  const sc = sceneRef.current;
  sc.stage = "reveal";
  setStage("reveal");
  setLast({ success: false, repPoints: 0, expired: true });
  render();
  resolveRep(false);
}
```

and in `render()`, before `drawPov`:

```js
    // The poke check: the goalie's stick sweeps out of the crease down to the
    // puck on your blade, and the puck skids off to the side. Two eased phases —
    // reach (0 -> 0.45) then knock (0.45 -> 1).
    const isPoking = sc.stage === "poking";
    let pokeF = 0;
    if (isPoking && sc.pokeAnimStart != null) {
      pokeF = Math.min(1, (performance.now() - sc.pokeAnimStart) / POKE_ANIM_MS);
    } else if (isReveal && sc.expired) {
      pokeF = 1;
    }
    if (pokeF > 0) {
      const reach = Math.min(pokeF / 0.45, 1);
      const knock = Math.max(0, (pokeF - 0.45) / 0.55);
      const puckHome = { x: W * 0.49, y: H * 0.955 };
      // the stick: from the goalie's core out toward the puck
      const tipX = coreBase.x + (puckHome.x - coreBase.x) * reach;
      const tipY = coreBase.y + (puckHome.y - coreBase.y) * reach;
      ctx.save();
      ctx.strokeStyle = "#2b3a47";
      ctx.lineWidth = Math.max(4, u * 0.34);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(coreBase.x, coreBase.y);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      // the blade
      ctx.lineWidth = Math.max(6, u * 0.5);
      ctx.beginPath();
      ctx.moveTo(tipX - u * 0.5, tipY);
      ctx.lineTo(tipX + u * 0.5, tipY - u * 0.12);
      ctx.stroke();
      ctx.restore();
      // the puck, knocked off the blade and skidding away to the shooter's left
      const skidX = puckHome.x - W * 0.34 * knock * knock;
      const skidY = puckHome.y - H * 0.06 * knock;
      drawPuck(ctx, skidX, skidY, Math.max(5, W * 0.016 * (1 - 0.25 * knock)));
    }
```

and the POV call keeps the puck on the blade until the knock lands:

```js
// BEFORE — ShootoutDrill.jsx:366-371
    drawPov(ctx, W, H, {
      sway,
      windUp: isAnimating && animFrac < 0.2,
      puckVisible: !target && !sc.expired,
    });
```
```js
// AFTER — the puck is on the blade right up to the moment it is poked, and is
// drawn separately (skidding) after. It never just vanishes.
    drawPov(ctx, W, H, {
      sway,
      windUp: isAnimating && animFrac < 0.2,
      puckVisible: !target && pokeF === 0,
    });
```

### E.5 Parked

**"Attack from different angles" ([12:05])** is not scoped here. It is
approach-dependent: cheap under option C (move the camera), expensive under A
(hand-draw each angle) and B (one sprite set per angle). Revisit after D3.

---

## F. SNAPSHOT (S2-26)

### F.1 M2 — show where the players actually were

> "when we click and get the answer wrong, I want to see where the players
> actually were, just to confirm that I got it wrong."

Today the reveal draws only **one** marker. `render()`'s reveal branch
(`SnapshotDrill.jsx:141-187`) draws the dashed success ring, the open teammate,
the tap marker, and the line between them. `sc.markers` — the other 3-11 skaters
he was reading past — is drawn **only while `sc.showFormation` is true**, which
is false by the time he answers. So after a miss he sees one gold dot and his
own X, and no way to confirm what the picture actually was.

```jsx
// BEFORE — SnapshotDrill.jsx:141-155
    if (sc.result && sc.open) {
      const o = sc.open;
      // success window around the true spot
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = "#1b6cb0";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.hitR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // the true open teammate (gold double ring)
      drawMarker(ctx, { x: o.x, y: o.y, kind: "open" }, sc.r);
```
```jsx
// AFTER — replay the WHOLE formation on the reveal, ghosted, so a miss can be
// checked against the real picture (S2-26). The open teammate then redraws at
// full opacity on top, so it still stands out.
    if (sc.result && sc.open) {
      const o = sc.open;

      // every skater who was on the ice, ghosted back in
      if (sc.markers) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        sc.markers.forEach((mk, i) => {
          if (i === sc.openIndex) return; // the open one draws at full opacity below
          drawMarker(ctx, mk, sc.r);
        });
        ctx.restore();
      }

      // success window around the true spot
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = "#1b6cb0";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.hitR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // the true open teammate (gold double ring), full opacity, on top
      drawMarker(ctx, { x: o.x, y: o.y, kind: "open" }, sc.r);
```

`openIndex` is not currently stored on the scene — `startRep` keeps only the
open **position**. One-line fix at `SnapshotDrill.jsx:204-219`:

```js
// BEFORE
    sceneRef.current = {
      ctx,
      W,
      H,
      markers: form.markers,
      open,
```
```js
// AFTER
    sceneRef.current = {
      ctx,
      W,
      H,
      markers: form.markers,
      openIndex: form.openIndex,   // needed to skip the open marker in the ghost pass
      open,
```

### F.2 M3 — stop auto-advancing

`resolveRep` (`:242-260`) schedules the next rep `REVEAL_HOLD_MS = 2400` ms
after the tap. 2.4 seconds is not enough to study a formation of up to twelve
skaters, and it is the only drill left in the gym that auto-advances — Read the
Numbers, Best Option, Shootout and Run the Play all wait for a button.

```js
// BEFORE — SnapshotDrill.jsx:242-260
  const resolveRep = useCallback(
    (success) => {
      pointsRef.current += sceneRef.current.repPoints || 0;
      setPoints(pointsRef.current);
      const lvl = engineRef.current.record(success);
      setLevel(lvl);
      if (success) setHits((h) => h + 1);
      const next = sceneRef.current.repIndex + 1;
      schedule(() => {
        if (next >= REPS) {
          setPhase("done");
        } else {
          setRep(next);
          startRep(next);
        }
      }, REVEAL_HOLD_MS);
    },
    [startRep]
  );
```
```js
// AFTER — the reveal holds until the player is done looking at it (S2-26).
// Matches ReadNumbers / BestOption / Shootout / RunThePlay, which already do this.
  const resolveRep = useCallback((success) => {
    pointsRef.current += sceneRef.current.repPoints || 0;
    setPoints(pointsRef.current);
    const lvl = engineRef.current.record(success);
    setLevel(lvl);
    if (success) setHits((h) => h + 1);
  }, []);

  function advanceRep() {
    const next = sceneRef.current.repIndex + 1;
    if (next >= REPS) setPhase("done");
    else { setRep(next); startRep(next); }
  }
```

…with `REVEAL_HOLD_MS` deleted and a `Next look` control added to the rail.

### F.3 M4 + **D4** — rink dimensions and distance

> "have the answers be consistent with the rink dimensions, based on what the
> actual rink dimensions are, and make sure that we are capturing the distance."

**Two separate defects, one of which is safe and one of which is not.**

**Defect (a) — the canvas is not rink-shaped.** `setupCanvas(canvas, host)` is
called with no `aspect` in **all twelve drills** (verified: 20 call sites, none
pass a third argument), so every one uses the default `aspect = 0.62`. A
regulation NHL sheet is 200 × 85 ft → **0.425**. The drawn ice is ~46 % too tall
for its length.

**Defect (b) — feet-per-pixel differs by axis, so distances are wrong.**
`scoreTap` (`snapshotCore.js:88-101`) converts x by `200 / W` and y by `85 / H`,
but `success` is decided by a **circular pixel radius** `openPos.hitR`:

```js
  const success = distPx <= openPos.hitR;
  const distFt = Math.sqrt(
    Math.pow(dx * (RINK_LENGTH_FT / (W || 1)), 2) +
    Math.pow(dy * (RINK_WIDTH_FT / (H || 1)), 2)
  );
```

With `H = 0.62 W`, one horizontal pixel is `200/W` ft and one vertical pixel is
`85/(0.62W) = 137/W` ft — a **1.46× difference**. Consequences, all of which the
player can feel:

- Two misses that look identical on screen report **different footage** depending
  on direction.
- The success window is a **circle in pixels but an ellipse in feet** — a
  horizontal miss is 46 % harder than an equal-looking vertical one.
- `normError = distPx / diag` for points inherits the same distortion.

**The safe half (M4) — fix the scoring without touching the aspect.** Express
the hit window and the points reference in **feet**, and derive everything from
one ft-per-pixel figure per axis. This is correct at *any* aspect, so it can land
before D4 is decided:

```js
// BEFORE — snapshotCore.js:22-24, 36-38, 88-101
export const EASY_HIT_FRAC = 0.16;
export const HARD_HIT_FRAC = 0.06;

export function hitRadius(level, W, H) {
  return Math.min(W, H) * lerp(EASY_HIT_FRAC, HARD_HIT_FRAC, levelT(level));
}
```
```js
// AFTER — the window is a real distance on a real rink, not a fraction of a
// canvas, so it means the same thing whatever the canvas shape (S2-26).
export const EASY_HIT_FT = 18;   // "same spot" for a U7 — about a faceoff circle
export const HARD_HIT_FT = 6;    // "same spot" for a U18 — a stick length

export function hitRadiusFt(level) {
  return lerp(EASY_HIT_FT, HARD_HIT_FT, levelT(level));
}

// Pixels per foot on each axis. Exported so the renderer can draw the window as
// the ELLIPSE it really is until the canvas becomes rink-proportioned (D4).
export function pxPerFoot(W, H) {
  return { x: W / RINK_LENGTH_FT, y: H / RINK_WIDTH_FT };
}
```
```js
// AFTER — scoreTap: success and points both measured in feet, so a miss of a
// given real distance always scores the same in every direction.
export const REFERENCE_FT = 40;  // matches anticipationCore — ONE distance scale for the gym

export function scoreTap(tap, openPos, W, H) {
  const s = pxPerFoot(W, H);
  const dxFt = (tap.x - openPos.x) / s.x;
  const dyFt = (tap.y - openPos.y) / s.y;
  const distFt = Math.hypot(dxFt, dyFt);
  const distPx = Math.hypot(tap.x - openPos.x, tap.y - openPos.y);
  const success = distFt <= openPos.hitFt;
  const normError = Math.min(1, distFt / REFERENCE_FT);
  const points = gradedPoints(normError);
  return { success, normError, distPx, distFt, points };
}
```

`makeFormation` returns `hitFt: hitRadiusFt(level)` instead of `hitR`, the drill
stores `open.hitFt`, and the dashed reveal ring becomes an ellipse
(`ctx.ellipse(o.x, o.y, hitFt * s.x, hitFt * s.y, 0, 0, Math.PI*2)`) — which is
the *honest* drawing of the window under a non-rink aspect, and silently becomes
a circle again the moment D4 lands.

**Defect (c), bonus — markers can be drawn outside the ice.** `makeFormation`
samples uniformly in `[pad, W-pad] × [pad, H-pad]`, a **rectangle**, while
`drawRink` clips the ice to a rounded rect with corner radius
`min(W,H) * 0.22`. So the open teammate can be placed in a corner, outside the
boards. Same class of bug as the Read the Pass corner problem (section I).
Proposed shared helper in `gymEngine.js`, used by every rejection sampler in the
gym:

```js
// Board geometry, shared so every generator agrees with what drawRink draws.
export const BOARD_MARGIN = 2;
export const BOARD_CORNER_FRAC = 0.22;   // see D4 — a real sheet is 0.329 of the WIDTH

export function boardCornerRadius(W, H) {
  return Math.min(W, H) * BOARD_CORNER_FRAC;
}

// Is (x, y) inside the rounded boards, with `inset` px of clearance? Mirrors
// roundRectPath() in drawRink exactly, so nothing is ever drawn off the ice.
export function insideBoards(x, y, W, H, inset = 0) {
  const m = BOARD_MARGIN + inset;
  const R = Math.max(0, boardCornerRadius(W, H) - inset);
  const x0 = m, y0 = m, x1 = W - m, y1 = H - m;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + R), x1 - R);
  const cy = Math.min(Math.max(y, y0 + R), y1 - R);
  return Math.hypot(x - cx, y - cy) <= R || (x >= x0 + R && x <= x1 - R) || (y >= y0 + R && y <= y1 - R);
}
```

**The unsafe half — D4.** Actually changing the aspect:

```js
// gymEngine.js — the correct value, but see the risk below before shipping it
export const RINK_ASPECT = 85 / 200;   // 0.425 — regulation NHL sheet
export function setupCanvas(canvas, host, aspect = RINK_ASPECT) { /* ... */ }
```

**Why this is the riskiest item in the spec.** `aspect` sets `H`, and at least
eleven difficulty parameters are expressed as fractions of `H` or
`min(W, H)`. Changing 0.62 → 0.425 changes `H` by −31 % and silently re-tunes
every one of them:

| Parameter | File | Effect of the change |
|---|---|---|
| `hitRadius` | `snapshotCore.js:37` | −31 % — Snapshot gets **harder** (fixed by M4, which is why M4 should land first) |
| board corner radius | `gymEngine.js:125` | −31 % — corners get *tighter*, not looser |
| marker `minGap` | 4 drills | unchanged (uses `W`) but the ice is shorter, so packing density rises |
| `netAt`'s `(H * 0.42) / 0.55` | `ShootoutDrill.jsx:67` | net gets smaller |
| `HORIZON = 0.3` | `ShootoutDrill.jsx:73` | horizon moves |
| Two Things lane band `H*(0.35..0.65)` | `TwoThingsDrill.jsx:252` | narrower lane spread |
| Eyes Up flash radius | `EyesUpDrill.jsx` | narrower |
| Late Read `you` at `H*0.86`, mates `< H*0.62` | `lateReadCore.js:82,104` | crowds together |
| `MAX_W` / `VH_FRACTION` capping | `gymEngine.js:86-91` | on a phone `W` is binding, so the rink gets **shorter**, not wider — every drill loses vertical space |

**Recommendation:** land M4 (feet-based scoring) first, since it is correct at
any aspect. Then opt drills into `RINK_ASPECT` **one at a time**, starting with
Snapshot, re-checking each drill's difficulty curve as it goes. Do not flip the
default in `setupCanvas` in one commit.

---

## G. TWO THINGS AT ONCE (S2-25)

> "it says 'miss the crossing' — this game is way too hard at level four, so we
> need to nerf this difficulty." / "I don't know what I'm supposed to do."

### G.1 The arithmetic at level 4

`levelT(4, 20) = 3/19 = 0.1579`. Feeding that through `twoThingsCore.js`:

| Parameter | Formula | Value at L4 |
|---|---|---|
| `travelMs` | `lerp(2600, 1300, t)` | **2 395 ms** |
| `crossWindowMs` | `lerp(650, 320, t)` | **598 ms** → **±299 ms** |
| `cueWindowMs` | `lerp(1500, 650, t)` | 1 366 ms |
| `cueFrac` | `lerp(0.20, 0.48, t)` | 0.244 |
| `cueAtMs` | `travel × cueFrac` | 585 ms |
| `crossAtMs` | `travel / 2` | 1 197 ms |

So: the shape flashes at **585 ms**. The puck must be tapped between **898 ms**
and **1 496 ms**. That leaves roughly **600 ms** to read a shape, move the hand
**off the canvas and down to a button row below it**, tap, and get back onto the
canvas to hit a moving puck within a 299 ms window.

**That is a motor-travel problem wearing a cognitive-load costume.** The drill is
not hard because holding two tasks is hard; it is hard because the two controls
are ~500 px apart on a phone and there is 600 ms to cover the distance twice.
This is the single strongest piece of evidence for the Action Rail.

Compounding it: `calibratedStartLevel` (`gymEngine.js:222`) seeds an untouched
drill from the age band — `{ U11: 6, U13: 7, U15: 8, U18: 8 }`. So a U13 player's
**first ever rep** of Two Things is at **level 7**, not level 1. He reported level
4, which means the adaptive engine had already relegated him three times.

### G.2 The retune — five changes, with numbers

**(i) Move the shape buttons into the Action Rail, and the cue with them.**
Estimated worth ~2 levels of difficulty on its own. `TwoThingsDrill.jsx:565-592`
moves inside `.gym-stage` as `.gym-rail`, and the cue moves from `H * 0.2` to
just above the rail so the eye and the hand are in the same place:

```js
// BEFORE — TwoThingsDrill.jsx:142-149
    if (sc.stage === "live" && sc.cueShowing) {
      const cueY = H * 0.2;
```
```js
// AFTER — the cue flashes directly above the shape buttons, not at the far end
// of the rink from them (Action Rail; S2-25)
    if (sc.stage === "live" && sc.cueShowing) {
      const cueY = H * (GYM_TARGET_MAX_Y - 0.08);   // ~0.78 H, just over the rail
```

**(ii) Widen every window.**

```js
// BEFORE — twoThingsCore.js:18-31
export const EASY_TRAVEL_MS = 2600;
export const HARD_TRAVEL_MS = 1300;
export const EASY_CROSS_WINDOW_MS = 650;
export const HARD_CROSS_WINDOW_MS = 320;
export const EASY_CUE_WINDOW_MS = 1500;
export const HARD_CUE_WINDOW_MS = 650;
```
```js
// AFTER — nerf (S2-25, "way too hard at level four"). Every window widens, and
// the ramp exponent below keeps the low levels near the easy end for longer.
export const EASY_TRAVEL_MS = 3200;
export const HARD_TRAVEL_MS = 1700;
export const EASY_CROSS_WINDOW_MS = 900;
export const HARD_CROSS_WINDOW_MS = 420;
export const EASY_CUE_WINDOW_MS = 2200;
export const HARD_CUE_WINDOW_MS = 900;
```

**(iii) Separate the cue from the crossing, at every level.**

```js
// BEFORE — twoThingsCore.js:66-67
export const EASY_CUE_FRAC = 0.2;
export const HARD_CUE_FRAC = 0.48;
```
```js
// AFTER — at HARD_CUE_FRAC 0.48 the cue fired essentially ON the crossing, which
// made the two tasks physically impossible to do in sequence. 0.34 keeps real
// interference while leaving the cue readable before the crossing window opens.
export const EASY_CUE_FRAC = 0.14;
export const HARD_CUE_FRAC = 0.34;
```

**(iv) A ramp exponent, so the early levels stay easy.** Same trick
`shootoutCore.holeOpenMs` already uses (`Math.pow(levelT(level), 1.5)`):

```js
// BEFORE — twoThingsCore.js:38-51
export function travelMs(level) {
  return Math.round(lerp(EASY_TRAVEL_MS, HARD_TRAVEL_MS, levelT(level)));
}
export function crossWindowMs(level) {
  return Math.round(lerp(EASY_CROSS_WINDOW_MS, HARD_CROSS_WINDOW_MS, levelT(level)));
}
export function cueWindowMs(level) {
  return Math.round(lerp(EASY_CUE_WINDOW_MS, HARD_CUE_WINDOW_MS, levelT(level)));
}
```
```js
// AFTER — the linear ramp meant level 4 already sat 16% of the way to the
// hardest setting. The exponent holds the low levels near the easy end and puts
// the real squeeze in the top third, where a player has earned it. (S2-25)
export const RAMP_EXP = 1.6;
function ramp(level) {
  return Math.pow(levelT(level), RAMP_EXP);
}

export function travelMs(level) {
  return Math.round(lerp(EASY_TRAVEL_MS, HARD_TRAVEL_MS, ramp(level)));
}
export function crossWindowMs(level) {
  return Math.round(lerp(EASY_CROSS_WINDOW_MS, HARD_CROSS_WINDOW_MS, ramp(level)));
}
export function cueWindowMs(level) {
  return Math.round(lerp(EASY_CUE_WINDOW_MS, HARD_CUE_WINDOW_MS, ramp(level)));
}
```
…and the same `ramp(level)` in `shapeChoiceCount` and the `cueFrac` lerp in
`makeRound`.

**Level 4 before vs after:**

| | now | proposed |
|---|---|---|
| travel | 2 395 ms | **3 113 ms** |
| crossing window | ±299 ms | **±436 ms** |
| cue window | 1 366 ms | **2 125 ms** |
| cue fires at | 585 ms (49 % of the way to the crossing) | **252 ms** (16 %) |
| gap between the cue closing and the crossing window opening | overlapping | cue readable, then ~1.2 s of clear runway |

**(v) Cap the ceiling and soften relegation.**

```js
// BEFORE — TwoThingsDrill.jsx:378-383
    engineRef.current = createAdaptiveLevel(d.level, {
      startUps: d.streak.ups,
      startDowns: d.streak.downs,
      ...gymCueHooks(),
    });
```
```js
// AFTER — dual-task load saturates well before the generic 20-level ceiling, and
// two bad reps in a row is a harsh relegation on a drill this demanding (S2-25).
    engineRef.current = createAdaptiveLevel(d.level, {
      maxLevel: 12,
      downStreak: 3,
      startUps: d.streak.ups,
      startDowns: d.streak.downs,
      ...gymCueHooks(),
    });
```

### G.3 **D5 — should a half-success still count as a miss?**

`combine` (`twoThingsCore.js:167-171`) sets `success` only when **both** sub-tasks
hit, and that boolean drives `engineRef.current.record(...)`. So catching the
crossing perfectly and picking the wrong shape is scored exactly the same as
doing nothing at all, and two of those in a row demote you.

Option: make a half-success **neutral** for levelling — it neither promotes nor
relegates. Points already give partial credit, so the scoreboard is unaffected.

```js
// PROPOSED, needs Thomas's call (D5)
export function combine(primary, secondary) {
  const points = (primary.points || 0) + (secondary.points || 0);
  const both = !!(primary.hit && secondary.hit);
  const neither = !primary.hit && !secondary.hit;
  return {
    success: both,
    // null = "do not move the level either way": one of two jobs done is not a
    // failure, and demoting for it is what drove the level-4 spiral.
    levelSignal: both ? true : neither ? false : null,
    points,
  };
}
```
This needs a matching `record(signal)` that no-ops on `null` in
`createAdaptiveLevel`. **It changes what "level" means in this drill** — a
player could sit at a level indefinitely without ever fully succeeding. His call.

### G.4 **Also his call: should Two Things opt out of the age seed?**

Visual acuity and reaction speed track age. Dual-task capacity does not, nearly
as cleanly. Starting a U13 at level 7 on this specific drill is what put him in
the relegation spiral. Proposed: `BAND_SEED` gains a per-drill override, or
`twothings` simply skips `calibrateDrill`. One line either way, but it is a
product judgment about who this drill is for.

### G.5 The instructions

> [16:24] "I don't know what I'm supposed to do."

The intro is a **178-word single paragraph** (`TwoThingsDrill.jsx:520-531`) and
the in-play hint is one 26-word sentence
(`"Tap Go. Watch the puck, tap it as it crosses the red center line, and tap the
shape that flashes up top."`). Neither survives contact with a game where you
have 600 ms to act.

Three changes:

**(a) Numbered steps, not prose.**
```jsx
// AFTER — replace the single <p> "The game:" block
          <ol className="gym-steps">
            <li><strong>Job 1.</strong> Tap the puck the moment it hits the red line.</li>
            <li><strong>Job 2.</strong> A shape flashes. Tap the button that matches it.</li>
            <li>Both jobs count. Doing one is not enough.</li>
          </ol>
```

**(b) A free practice rep.** Rep 0 is unscored, the cue holds on screen until it
is answered, and the crossing window is doubled. He has said the instructions do
not land; a rep that cannot be failed is how you land them.

**(c) A stage-specific hint, one job at a time.**
```js
// BEFORE — TwoThingsDrill.jsx:465
    ready: "Tap Go. Watch the puck, tap it as it crosses the red center line, and tap the shape that flashes up top.",
    live: "Tap the puck right as it hits center, and pick the shape that just flashed. Both count.",
```
```js
// AFTER — one instruction at a time, tied to what is actually on screen (S2-25)
    ready: "Two jobs at once. Tap Go when you're set.",
    live: sceneRef.current.cueShowing
      ? "Shape! Tap the matching button."
      : sceneRef.current.inWindow
      ? "Now — tap the puck."
      : "Watch the puck. A shape will flash.",
```

---

## H. READ THE NUMBERS (S2-24)

Four asks. Three are covered elsewhere: the **watch button** is section A
(`ReadNumbersDrill.jsx:401-407`, the worked example), **five reps** is section B
(`REPS = 10 → 5`), and the **`+2`** is section C (and it originates *here* — see
C.2 finding 1). The fourth is new.

### H.1 The difficulty ladder

> "have these numbers moving, have them be covered up by other players… where we
> make it complicated and add in different aspects to continue to increase the
> difficulty"

Today `readNumbersCore.js` has three axes, all monotone lerps: skaters 4→9,
watch window 2600→1000 ms, digits 1→3. Everything is static. He named two new
axes explicitly (movement, occlusion), and the shape of his ask — "add in
different aspects" — is a **staged** ladder, not a fourth lerp.

Proposed four-stage ladder:

| Stage | Levels | Skaters | Watch | Digits | New mechanic |
|---|---|---|---|---|---|
| **1 — Read** | 1-5 | 4 → 6 | 2600 → 1800 ms | 1 | today's drill |
| **2 — Drift** | 6-10 | 6 → 7 | 1800 → 1500 ms | 2 from L8 | skaters **drift** during recall; you tap where they are **now** |
| **3 — Traffic** | 11-15 | 7 → 8 | 1500 → 1200 ms | 2 | 0 → 4 unnumbered opponents **occlude** numbers during the watch window |
| **4 — Both** | 16-20 | 8 → 9 | 1200 → 1000 ms | 3 | drift ×2.5, occluders move, so a number is briefly hidden then briefly shown |

Core additions:

```js
// --- Difficulty ladder ------------------------------------------------------
// Stage 1 (L1-5) read. Stage 2 (L6-10) the skaters drift after the numbers hide,
// so a remembered SPOT is not enough — you have to update it. Stage 3 (L11-15)
// opposition bodies stand in front of the numbers during the look. Stage 4
// (L16-20) both, faster. (S2-24)
export const DRIFT_START_LEVEL = 6;
export const OCCLUDE_START_LEVEL = 11;

// Drift speed in px/sec as a fraction of canvas width. 0 below the drift stage.
export function driftSpeed(level, W) {
  if (level < DRIFT_START_LEVEL) return 0;
  const t = (level - DRIFT_START_LEVEL) / (20 - DRIFT_START_LEVEL);
  return W * lerp(0.05, 0.14, Math.min(1, Math.max(0, t)));
}

// Unnumbered opposition skaters that stand in front of the numbers during the
// watch window. 0 below the traffic stage.
export function occluderCount(level) {
  if (level < OCCLUDE_START_LEVEL) return 0;
  const t = (level - OCCLUDE_START_LEVEL) / (20 - OCCLUDE_START_LEVEL);
  return Math.round(lerp(0, 4, Math.min(1, Math.max(0, t))));
}

// Do the occluders move during the watch window? Stage 4 only — a number is
// briefly hidden and briefly revealed, so WHEN you look matters.
export function occludersMove(level) {
  return level >= 16;
}
```

`makeFormation` gains two return fields:

```js
// AFTER — makeFormation returns the motion and traffic plan for the level.
  const speed = driftSpeed(level, W);
  const velocities = numbers.map(() => {
    const ang = rng() * Math.PI * 2;
    return { vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed };
  });
  const occluders = occluderCount(level);

  return { numbers, targetIndex, watchMs: watchMs(level), velocities, occluders, occludersMove: occludersMove(level) };
```

And the drill gains a rAF loop during the `pick` stage. Note `rafRef` is
**already declared** (`ReadNumbersDrill.jsx:25`) and **currently unused** — this
is what it was reserved for.

**Risks to flag:**
- `scoreRead` grades by **index**, not position, and `hitSkater` reads live
  positions — so drift needs no scoring change at all. Verified.
- Drift must bounce off `targetMaxY(H)` (Action Rail rule 3), not `H`.
- Occluders during the *watch* window change what "watch time" means. If a
  number is hidden for 60 % of a 1 200 ms window, the effective look is 480 ms.
  Constrain each occluder to cover **at most one** numbered marker and by at most
  ~40 %, or the drill becomes luck. This tuning is a feel call, not a mechanical
  one.

---

## I. READ THE PASS — corner physics (S2-29)

> "depending on where the line is, it would never cross — so if it's up against
> the wall, it would never cross that line. I want us to be mindful of the
> physics in the corners, as something might not just bounce off of the corner,
> it might actually ride the corner."

### I.1 What the code does

`buildTrajectory` (`AnticipationDrill.jsx:36-89`) integrates the puck at
1/120 s and reflects it off exactly two flat walls:

```js
    // bounce off the boards parallel to travel
    if (c < r) {
      c = 2 * r - c;
      vCross = -vCross;
    } else if (c > crossSpan - r) {
      c = 2 * (crossSpan - r) - c;
      vCross = -vCross;
    }
```

Three consequences, and he identified all three:

1. **The answer bar covers ice that does not exist.** The gold bar spans the full
   exit edge at `exitM`, and `crossPos` can land anywhere on it. But `drawRink`
   clips the ice to a rounded rect with corner radius `min(W, H) * 0.22`. At
   `exitM` — which is `motionSpan − 36`, i.e. right at the end boards — most of
   that edge is **inside the corner arc**. So the "true crossing" is regularly at
   a coordinate that is off the sheet. That is his "if it's up against the wall,
   it would never cross that line", exactly.
2. **Square-corner reflection.** The puck banks off a flat wall and kicks back
   out, at a corner that is drawn as a curve.
3. **Perfectly elastic.** `vCross = -vCross` loses nothing. A puck rimmed hard at
   a shallow angle should **shed** its normal component into the boards and keep
   its tangential component — which is what "ride the corner" physically *is*.

### I.2 The fix, in three parts

**M5 (safe) — trim the answer space to the real ice.** This alone removes the
impossible answers, and requires no physics change:

```js
// Half-width of ice available at motion-axis coordinate m, from the same rounded
// -rect geometry drawRink draws. Outside the corner arcs this is the full span;
// inside them it narrows to the arc. (S2-29 — "if it's up against the wall, it
// would never cross that line")
function iceHalfSpanAt(m, motionSpan, crossSpan, R, r) {
  const half = crossSpan / 2;
  const d = Math.min(m, motionSpan - m);        // distance to the nearer end board
  if (d >= R) return half - r;                  // straight section: full width
  const dx = R - d;                             // depth into the corner arc
  const inset = R - Math.sqrt(Math.max(0, R * R - dx * dx));
  return Math.max(r, half - inset - r);
}
```
…applied when choosing `crossPos`, when clamping the guess, and when drawing the
gold bar so the bar visually stops where the ice does.

**Part 2 — reflect off the corner arc, not the flat board.** Replace the two-wall
test in the integration loop:

```js
// AFTER — a corner is a curve, so reflect about the ARC normal there. For a
// shallow-angle rim this naturally curls the puck around the boards instead of
// kicking it out like a billiard cushion. (S2-29)
    const halfHere = iceHalfSpanAt(m, motionSpan, crossSpan, R, r);
    const off = c - crossSpan / 2;
    if (Math.abs(off) > halfHere) {
      // surface normal: straight boards point purely across; in a corner it
      // points from the arc centre, which is what makes the puck ride.
      const d = Math.min(m, motionSpan - m);
      let nx = 0;
      let ny = Math.sign(off);
      if (d < R) {
        const centreM = m < motionSpan / 2 ? R : motionSpan - R;
        const centreC = crossSpan / 2 + Math.sign(off) * (crossSpan / 2 - R);
        const len = Math.hypot(m - centreM, c - centreC) || 1;
        nx = (m - centreM) / len;
        ny = (c - centreC) / len;
      }
      // split velocity into normal + tangential, damp the normal, keep the
      // tangential: a shallow rim HUGS the wall, a hard bank still comes off it.
      const vn = vMotion * nx + vCross * ny;
      const tMx = vMotion - vn * nx;
      const tCy = vCross - vn * ny;
      vMotion = tMx - vn * nx * BOARD_RESTITUTION;
      vCross = tCy - vn * ny * BOARD_RESTITUTION;
      // push back onto the ice
      c = crossSpan / 2 + Math.sign(off) * halfHere;
    }
```
(`vMotion` must become `let`; it is currently `const` at `:52`.)

**Part 3 — the restitution number is a feel call, not a fact.**

```js
export const BOARD_RESTITUTION = 0.45;  // < 1 = the puck sheds energy into the
                                        // boards. Near 1 it billiards; near 0 it
                                        // dies on the wall. 0.45 makes a shallow
                                        // rim ride the corner, which is the
                                        // behaviour described in S2-29.
```

### I.3 Two things to flag

- **This re-tunes every existing level.** Trimming the answer space narrows the
  distribution of true crossings, and damped boards change trajectory shapes.
  `toleranceFt = lerp(6, 1.5, t)` (`:79`) will need re-checking against real
  hit rates after the change. Do not ship the physics without replaying it.
- **The drawn corner radius is not a real corner.** `BOARD_CORNER_FRAC = 0.22`
  of `min(W, H)`. A regulation sheet's corner radius is **28 ft of an 85 ft
  width = 0.329 of the width**. Under the current 0.62 aspect these differ by
  ~35 %. Correcting it is coupled to **D4** — do the aspect first, then set the
  corner from the width, then tune. Doing them out of order means tuning twice.

---

## J. RUN THE PLAY (S2-22) AND LATE READ (S2-23) — offside

> "we've got a bunch of numbers on the ice, don't know where the puck is… the
> concept here is fine, but it would actually be offside, and we don't really
> want to shoot something 200 feet." (S2-22)
> "again we have a couple of players offside… the positioning of the players
> doesn't really make sense." (S2-23)

### J.1 One root cause, and it is a coordinate-system mismatch

**`drawRink` renders the sheet in landscape.** Ends are left and right: goal
lines at `x = 0.08 W` and `0.92 W` (`gymEngine.js:153`), creases at those ends
(`:191-196`), **blue lines vertical** at `x = 0.33 W` and `0.67 W` (`:142-143`),
red centre line vertical at `0.5 W`. The attacking axis is **X**.

**Both drills lay their plays out along Y.**
- `lateReadCore.makeTrial`: `you = { x: W/2, y: H * 0.86 }` (`:82`), teammates
  sampled in `y ∈ [pad, H * 0.62]` (`:104`) — the carrier is at the bottom,
  targets are at the top.
- `RunThePlayDrill`: the first pass originates at `{ x: W/2, y: H + 20 }`
  (`:122`), i.e. off the **bottom** edge; `makeSkaters` scatters uniformly across
  the whole canvas with **no zone awareness at all** (`runThePlayCore.js:33-48`).

So the drills' attack direction is bottom→top while the rink's is left→right —
**a 90° mismatch.** Everything he saw follows from it:

- Teammates get any `x`, so relative to blue lines at `0.33 W` / `0.67 W` they
  scatter on **both sides**. Any rep where a teammate's `x` is past the
  attacking blue line while the carrier's is not renders a textbook offside.
- Run the Play's sequence can hop from `x ≈ 0.1 W` to `x ≈ 0.9 W` — on a
  200-ft-long drawn sheet, a **180-foot pass**. That is "we don't really want to
  shoot something 200 feet", precisely.
- "Don't know where the puck is" (S2-22): during `recall` the puck is not drawn
  at all (`RunThePlayDrill.jsx:125-129` draws only skaters). The puck exists in
  `watch` and vanishes for the answer.

This is the same **class** as S2-11 — "the diagram says something the words
don't" — but a different mechanism and a different codebase. The scenario seeds
are **authored JSON** being audited by another agent; these are **procedural
generators** producing a fresh violation every rep. See J.4.

### J.2 **D6 — two fixes, and they are not equivalent**

**Fix 1 — rotate the play into rink coordinates (correct, more work).**

```js
// gymEngine.js — rink landmarks as canvas fractions, so every generator agrees
// with what drawRink actually draws. (S2-22 / S2-23)
export const BLUE_LINE_NEAR = 0.33;
export const BLUE_LINE_FAR = 0.67;
export const GOAL_LINE_FAR = 0.92;

// The attacking zone: between the far blue line and the end boards. An o-zone
// play legally lives here, and nowhere else.
export function attackingZone(W, H, { pad = 0 } = {}) {
  return {
    x0: W * BLUE_LINE_FAR + pad,
    x1: W * GOAL_LINE_FAR - pad,
    y0: pad,
    y1: targetMaxY(H) - pad,
  };
}

// Would this teammate be offside for this carrier? True when the teammate has
// crossed the attacking blue line and the carrier has not.
export function isOffside(carrier, mate, W) {
  const blue = W * BLUE_LINE_FAR;
  return mate.x > blue && carrier.x <= blue;
}
```
Then in `lateReadCore.makeTrial`: `you` moves from `{ W/2, 0.86 H }` to just
inside the attacking blue line, `{ W * 0.62, H * 0.5 }`; teammates sample from
`attackingZone(W, H, { pad })` instead of `y ∈ [pad, 0.62 H]`; and the generator
asserts `!isOffside(you, mate, W)` for every teammate, resampling if it fails.
Same treatment for `runThePlayCore.makeSkaters` — plus a max pass length so no
single pass exceeds ~60 ft on the drawn scale.

**Fix 2 — rotate the rink instead (cheap, partial).** Give `drawRink` an
`orientation: "portrait"` mode that swaps the axes of the markings, so the ends
are top and bottom. **Zero change to any drill's geometry**; the picture
immediately stops contradicting itself. Does **not** fix the 180-ft pass, does
**not** fix offside relationships, does not fix "don't know where the puck is".

**Recommendation:** ship Fix 2 to stop the bleeding, then do Fix 1 properly.
Which is his call because Fix 2 alone may be enough for now, and Fix 1 changes
how both drills feel.

### J.3 The two smaller Late Read items

**"Read It button to more of the middle of the page" ([13:45])** — section A.
`LateReadDrill`'s `Read it` sits in a `.gym-row` below the canvas. Note that
`you` at `H * 0.86` is exactly the Action Rail band edge, so YOU moves to
`H * 0.80` if Fix 2 is taken (Fix 1 relocates it anyway).

**"it's really tough to comprehend, it's too fast" ([14:14]).** The arithmetic,
at the age-seeded starting level for U13 (level 7, `t = 6/19 = 0.3158`):

| | value |
|---|---|
| `clockMs(7)` = `lerp(4200, 1800, t)` | 3 442 ms |
| `changeDelay(7)` = `clock × lerp(0.32, 0.62, t)` | **1 427 ms** |
| time left to re-read and tap after the switch | **2 015 ms** |

Two seconds to notice a cue has teleported to a different skater, re-read the
ice, and tap — on a first exposure, with no animation marking the change.
Proposed:

```js
// BEFORE — lateReadCore.js:24-25
export const EASY_CLOCK_MS = 4200;
export const HARD_CLOCK_MS = 1800;
```
```js
// AFTER — S2-23, "it's too fast". Also apply the same RAMP_EXP treatment used in
// twoThingsCore so the low levels stay near the easy end.
export const EASY_CLOCK_MS = 5500;
export const HARD_CLOCK_MS = 2200;
```
…plus a **250 ms change animation**: the defender visibly skates into the old
lane and the gold arrow sweeps to the new teammate, rather than both snapping.
The change should be *legible*, not merely *fast* — right now it is a teleport,
which is why it reads as "too fast" rather than "too hard".

### J.4 Overlap with the scenario-seed audit — **do not duplicate**

Another agent is auditing prompt-vs-coordinate mismatches across `src/scenario/`
seeds (S2-11 and session 1's CONTENT-5). Nothing in this spec touches
`src/scenario/`.

The shared finding worth handing them: **it is the same invariant, enforced in
two different places.**

| | Gym drills | Scenario seeds |
|---|---|---|
| Geometry comes from | procedural generators at runtime | authored JSON |
| A violation is | generated fresh every rep | baked into one seed |
| Enforcement point | a runtime assertion in the generator | a lint pass over the seed files |

Proposal: **one shared invariant list, two enforcement points.** `isOffside`,
`insideBoards`, and a max-pass-length check are the same rules in both
codebases. Write them once (`gymEngine.js` is the natural home, or lift to a
shared `rinkRules.js` if the seed tooling can import from `src/`), then have the
gym generators assert them and the seed lint check them. Coordinate before
either side writes a second copy.

Also for their list, found here but living in their files — the "open man" sweep
(section K) hits `data/bank.json:3661`, `scenario/seeds/u11_dz_coverage_place_v1.json:101,104`,
and `scenario/seeds/u13_oz_entry_trailer_branch.json:86,206`. **Not patched
here.**

---

## K. BAYLOR'S PICK (S2-28) — see §0.1 for the name correction

### K.1 M7 — "open man" → "open player", and one "he"

> "let's not have it gendered unless we absolutely have to."

In scope (`src/cognitive-gym/`), four user-visible strings:

```jsx
// TrackingDrill.jsx:530-532
  you find the open man, break out cleanly, and see the check before
// → you find the open player, break out cleanly, and see the check before
```
```js
// CognitiveGym.jsx:40  (the tracking drill's `why`)
  why: "Knowing where your options are without staring at the puck is how you find the open man, ...",
// → "... is how you find the open player, ..."
```
```js
// CognitiveGym.jsx:106  (Read the Numbers' `why`)
  ... "is how you find the open man and put the puck on the right tape ..."
// → "... is how you find the open player and put the puck on the right tape ..."
```
```js
// SnapshotDrill.jsx:349
        ? `Found the open man! +${last.repPoints} (${last.distFt} ft off)`
// → `Found the open player! +${last.repPoints} (${last.distFt} ft off)`
```

**Plus one he missed, same class** — `SnapshotDrill.jsx:350`:

```js
        : `Not quite, ${last.distFt} ft away. The gold ring shows where he was.`
// → `Not quite, ${last.distFt} ft away. The gold ring shows where they were.`
```

And a comment for consistency (`SnapshotDrill.jsx:24`): "study where the open
man was" → "open player".

Out of scope, listed for the other audit: `data/bank.json:3661`,
`scenario/seeds/u11_dz_coverage_place_v1.json:101,104`,
`scenario/seeds/u13_oz_entry_trailer_branch.json:86,206`.

### K.2 M6 — keyboard input

> "if there's a way we can have a keyboard piece in here that would be ideal"

The drill is pointer-only today (`onMouseDown` / `onTouchStart` → `handlePick`).
Proposed bindings, which also become the gym-wide pattern under Action Rail
rule 7:

| Key | Action |
|---|---|
| `1`-`9` | select the Nth skater in reading order (left→right, then top→bottom) |
| same digit twice | call that pick the soccer ball (mirrors the existing double-tap) |
| `Backspace` | undo the last pick |
| `Enter` | Lock in |
| `Space` | the primary rail action (`Start shift` / `Next shift`) |

```jsx
// Keyboard control (S2-28). Digits index skaters in READING order, which is
// stable within a shift because the dots stop moving at the "pick" stage.
useEffect(() => {
  if (phase !== "playing") return;
  const onKey = (e) => {
    const sc = sceneRef.current;
    if (!sc || !sc.dots) return;

    if (e.code === "Space") {
      if (stage === "ready") { e.preventDefault(); beginWatch(); }
      else if (stage === "feedback") { e.preventDefault(); advanceShift(); }
      return;
    }
    if (stage !== "pick") return;

    if (e.key === "Enter") { e.preventDefault(); lockIn(); return; }
    if (e.key === "Backspace") {
      e.preventDefault();
      const last = [...sc.picks].pop();
      if (last == null) return;
      sc.picks.delete(last);
      if (sc.ballCall === last) { sc.ballCall = null; setBallCall(null); }
      setRemaining(TARGETS - sc.picks.size);
      return;
    }

    const n = parseInt(e.key, 10);
    if (!Number.isInteger(n) || n < 1) return;
    const order = sc.dots
      .map((d, i) => ({ i, x: d.x, y: d.y }))
      .sort((a, b) => (Math.abs(a.y - b.y) > sc.dots[0].r * 2 ? a.y - b.y : a.x - b.x));
    const target = order[n - 1];
    if (!target) return;
    e.preventDefault();
    const idx = target.i;
    if (sc.picks.has(idx)) {
      // second press of the same digit = the soccer-ball call (mirrors double-tap)
      sc.ballCall = idx;
      setBallCall(idx);
      return;
    }
    if (sc.picks.size >= TARGETS) return;
    sc.picks.add(idx);
    setRemaining(TARGETS - sc.picks.size);
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [phase, stage]);
```

To make it usable, draw the index on each dot **during the `pick` stage only**,
in the `sc.dots.forEach` block of `loop()`:

```js
        // keyboard index, shown ONLY at "pick" — after tracking has stopped, so
        // it can never help you follow a dot during the tracking phase (S2-28)
        if (sc.stage === "pick") {
          ctx.fillStyle = "#0b1b2b";
          ctx.font = `700 ${Math.round(d.r * 0.9)}px system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(orderIndexOf(idx) + 1), d.x, d.y);
        }
```

**Verify this reasoning before shipping:** the claim is that numbering the dots
after motion stops cannot leak information, because by then the player has
already had to hold the three targets through the whole tracking phase. It looks
sound, but it is the kind of thing that is obvious right up until it isn't.

### K.3 Lock-in placement

> "I want the lock-in pill somewhere on the screen that doesn't have any spots,
> so I don't want to move too far to click"

`TrackingDrill` is the **only** drill whose controls render **before** the
`<canvas>` in the DOM (`:543-565` vs `:567-573`), so `Lock in` sits **above**
the rink. After tapping three dots on the ice, the hand travels up and out of
the play surface — the longest control travel in the gym.

Action Rail (section A), with two drill-specific notes:

1. The rail must be positioned relative to the canvas inside `.gym-track-main`,
   not the page — `TrackingDrill` has the `.gym-track-layout` sidebar
   (`:471-486`), so `.gym-stage` wraps the canvas *inside* `.gym-track-main`.
2. **This is the drill where "no spots under the pill" is a hard requirement**,
   and it needs two edits, not one. `makeDots` samples
   `y ∈ [r+6, H-r-6]` (`:38`), and the bounce clamps at `H - d.r` (`:177-180`):

```js
// BEFORE — TrackingDrill.jsx:38
    const dot = { x: rand(r + 6, W - r - 6), y: rand(r + 6, H - r - 6), r };
```
```js
// AFTER — keep every skater out of the Action Rail band, so the Lock in pill
// never sits on top of a tap target (S2-28)
    const dot = { x: rand(r + 6, W - r - 6), y: rand(r + 6, targetMaxY(H) - r - 6), r };
```
```js
// BEFORE — TrackingDrill.jsx:177-180
          if (d.y > H - d.r) {
            d.y = H - d.r;
            d.vy = -d.vy;
          }
```
```js
// AFTER — skaters bounce off the rail band, not the canvas edge
          const yFloor = targetMaxY(H) - d.r;
          if (d.y > yFloor) {
            d.y = yFloor;
            d.vy = -d.vy;
          }
```

Without the second edit a dot drifts under the pill mid-shift and the complaint
comes straight back.

### K.4 Two other things found while in here, neither reported

- **Baylor's Pick uses a completely different point scale.** `trackingCore.js`
  pays a flat `200/target + 150 perfect + 250 ball` with **no decay at all**,
  while every other drill runs `gradedPoints` with `DECAY = 0.12`. A perfect
  5-shift session here pays **5 000**; a good 5-rep Read the Numbers session pays
  under **300**. The hub sums both into one `careerPoints`. This is section C
  finding 3, and Baylor's Pick is the clearest instance of it.
- **Its results card has no best-label at all** — no `sessionRankLabel` line and
  no "New best". It is the only drill missing it, so it will look inconsistent
  the moment M10 lands. Add `LevelProgress` + `PointsDelta` here too.

---

## L. Build order

1. **M7** (gendered language) — five strings, zero risk, ship immediately.
2. **M1** (five reps) — one constant, twelve one-line substitutions.
3. **M2 / M3** (Snapshot reveal + no auto-advance) — self-contained, and it is
   cross-cutting pattern #2 from the findings doc, which recurs across sessions.
4. **Section A** (Action Rail) behind D2. Land the CSS and `gymEngine` constants
   first, then migrate drills one at a time. Two Things last, since its retune
   depends on it.
5. **M10 / M11 / M12** (progression legibility) — needs no decision and directly
   answers S2-27.
6. **M8 / M9** (Shootout shapes + poke check) — independent of the D3 rendering
   decision, so they do not wait on it.
7. **Section G** (Two Things retune) — after the rail, since the rail is worth
   ~2 levels on its own and re-tuning before it would over-correct.
8. **M4** (Snapshot feet-based scoring) — correct at any aspect, so it lands
   before D4.
9. **M5** (Read the Pass answer-space trim) — the safe third of section I.
10. **J.2 Fix 2** (portrait rink) if D6 goes that way — stops the offside picture
    the same day.
11. Everything else waits on D1, D3, D4, D5, D6, D7.

### Open decisions, consolidated

| | Decision | Blocks |
|---|---|---|
| **D1** | The point scheme — **the requirement is half a sentence** | all of §C, and the `+2` defect stays live meanwhile |
| **D2** | Action Rail anchor: top or bottom | §A rollout |
| **D3** | Shootout rendering: 2D patch / sprites / 3D (**3D = new dependency**) | §E.3, and "attack from different angles" |
| **D4** | Canvas aspect 0.62 → 0.425 (**riskiest item in this spec**) | §F.3, §I.3 |
| **D5** | Two Things: is a half-success a miss for levelling? | §G.3 |
| **D6** | Rotate the play, or rotate the rink? | §J.2 |
| **D7** | Shoot or Hold: 5 trials, keep 12, or 5×3? | §B.4 |

---

## Implementation status — 2026-08-03 (PARTIAL)

The implementing agent was terminated mid-run by an expired auth session, while
working on the Two Things drill. It never wrote its own implementation log, so this
section was reconstructed by inspecting the working tree. Treat it as the source of
truth over anything above.

**State: coherent but incomplete.** Build clean; `test:gym` all passed,
`test:gym-progress` 7/7, `test:gym-phase1` 9/9, `test:best-option-offside` 17/17.

### Done — 5 drills

`ReadNumbersDrill` · `ShootoutDrill` · `SnapshotDrill` · `TrackingDrill` ·
`TwoThingsDrill`, plus the shared `gymEngine.js`, `gymPoints.js`, `gymFx.jsx`,
`cognitive-gym.css`, `readNumbersCore.js`, `snapshotCore.js`, `twoThingsCore.js`.

- `REPS_PER_SESSION = 5` in `gymEngine.js`, consumed by all five.
- The Action Rail: `GYM_RAIL_BAND` / `GYM_TARGET_MAX_Y = 0.86`, consumed by all five
  plus the stylesheet, so no tap target can sit under the control band.
- `open man` → `open player` — gone from all gym source (the one remaining hit is in
  `cognitive-gym-demo.html`, a built artifact, not source).
- **The Read the Numbers points curve, which was the concrete defect.** `gradedPoints`
  now takes per-call `decay` and `floor`, and the drill uses `ANSWER_DECAY = 0.62` with
  `ANSWER_FLOOR = 150` because its "error" is a reaction time, not a spatial miss. The
  spatial drills are unchanged (`floor` defaults to 0). Verified by running it:

  | Correct answer in | Was | Now |
  |---|---|---|
  | 0.50s | 272 | 777 |
  | 1.00s | 74 | 604 |
  | 1.50s | 20 | 470 |
  | 2.40s | **2** | 298 |
  | 2.92s+ | **0** | ~210 |

  A correct answer now always scores, and a bang-on read is still worth ~4.5× a
  last-instant one. The `+2` Thomas saw is gone.

### Not done

- **7 drills untouched:** `AnticipationDrill`, `BestOptionDrill`, `EyesUpDrill`,
  `FindLaneDrill`, `LateReadDrill`, `ReactionDrill`, `RunThePlayDrill`. They still run
  their old rep counts and have no Action Rail, so rep count is currently inconsistent
  across the gym — 5 drills at five reps, 7 at their originals.
- **The Late Read / Run the Play offside fix was never started.** This is the one with
  real teaching consequences: both drills sample positions uniformly over the canvas
  while `gymEngine` draws blue lines at 0.33W/0.67W, and Late Read plays on a vertical
  axis over a horizontally drawn rink — roughly 96% of Late Read trials contain an
  offside receiver.
- No test was added for the new points curve. `answerPoints()` was deliberately split
  out of `scoreRead` to make it unit-testable; the test itself is still owed.

### Next

1. The offside fix for Late Read and Run the Play — highest value of what remains.
2. A unit test pinning the points curve.
3. Extend reps + rail to the other 7 drills so the gym is consistent.
