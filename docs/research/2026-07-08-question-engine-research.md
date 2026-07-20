# Question Engine Research: Mechanics, Game Modes, and Age-Band Styling

Date: 2026-07-08
Branch context: feature/shareable-beta
Status: research and recommendations only. No code changed.

Companion documents:
- `docs/research/2026-07-08-mvp-engine-gaps.md` — engine/factory gap analysis (schema contracts, validators, build order). Referenced throughout as "the gaps doc".
- `docs/research/2026-07-08-young-age-game-mechanics.md` — full young-age mini-game catalog (10 mechanics). Summarized in section 4.
- `docs/research/_raw-deep-research-claims-2026-07-08.txt` — raw claim list from the interrupted deep-research run; spot-verified in section 2.

Owner decisions this report designs to (locked):
- Pause-and-predict + verdict/judgment question types are IN. This report adds a
  ranked menu of further candidates (owner picks 1-2).
- First target band for new question types: U11/U13. U7/U9 (and some U11) get
  game-like spatial mechanics instead.
- MVP gets real GAME MODES with an arcade identity (time attack, survival/3
  misses, streak fever, daily challenge). No collection/season/social layer.
- Rewards: Duolingo-style streaks + parent/coach visibility (progress cards,
  printable badges). No coin economy.
- Game feel in scope: sound + music, a mascot/coach character, mini-game breaks
  between question sets.

---

## 1. Executive summary

**What to build, in one page.**

The engine today runs one loop (animate, freeze, ask, consequence) over 12 plays.
The evidence and the competitive landscape both say the same thing: keep the
scenario kernel as the single content source, and multiply what the product does
with it along three axes.

**Axis 1 — More question mechanics on the same plays (U11/U13).**
Pause-and-predict is the single best-evidenced mechanic in sport science
(temporal occlusion training: meta-analytic d = 1.21 on anticipation, with
transfer to field tests statistically indistinguishable from screen tests —
VERIFIED, section 2). Verdict/judgment adds error-spotting + self-explanation and
recycles the wrong-path branches already authored in every play. Both are locked.
From the additional-candidates menu (section 3), the top two picks are:
(1) **spatial answers at U11/U13** — render the existing lane-pick tap zones for
the token profile, because on-ice transfer is larger when the response is a
sport-like action rather than a verbal choice (ES 0.87 vs 0.41 — VERIFIED); and
(2) **gentle timed reads** — activate the already-defined `timer: "gentle"`
profile field so the same catalog becomes speed reps (precedent: QB Reads,
IntelliGym time stress, 99math speed rounds). Both are S-size and both feed the
arcade layer directly.

**Axis 2 — A young-age game layer (U7/U9, some U11).**
Kid apps in this band converge on five interactions: tap, drag-to-target, trace,
put-in-place, and timing taps, always with instant multisensory feedback and no
fail states. Building ONE new interaction primitive (drag) plus ONE timing
primitive unlocks a 10-mechanic mini-game catalog on the existing rink renderer.
Top three: **Cover the Pass** (drag the defender to block the 2-on-1 pass),
**Set the Forecheck** (drag players to spots, then watch the play run), and
**Goalie Says Stop** (tap-timing save). Details in section 4.

**Axis 3 — An arcade retention shell (all bands, tuned per band).**
Three modes over the same kernel: **Daily Faceoff** (5 curated reads/day,
calendar streak with earned streak protection), **Rush Hour** (90-second time
attack with an in-run streak multiplier), and **Last Skater Standing**
(survival, 3 misses). Streaks follow the Duolingo playbook adapted for 9-13:
milestone-gated celebrations, automatic "backup goalie" streak protection framed
as a refill, no purchasable repair, "paused" never "lost". A bench-coach mascot
carries sound/celebration moments but never appears on the rink during a live
read. Every mode emits parent/coach-visible artifacts (weekly progress card,
printable badges) — parent-facing progress reporting is the strongest known
retention lever for kids' subscription apps. Specs in section 5.

**Build order recommendation** (extends the gaps doc's MVP-now slice):
1. `ask.kind` registry + watch chains + predict + verdict with factory gates
   (gaps doc items A-D) — unchanged.
2. Spatial-answer promotion + gentle timer (this report's top menu picks; both S).
3. Daily Faceoff + Rush Hour on the U11/U13 catalog (arcade shell v1).
4. DRAG primitive → Cover the Pass → Set the Forecheck (young-age layer v1).
5. Mascot/sound pass across all of the above; parent progress card v1.

---

## 2. Verified competitive landscape (Task A)

Eight load-bearing claims from the interrupted deep-research run were
spot-checked (one independent fetch/search each, 2026-07-08). Labels:
VERIFIED / PLAUSIBLE-UNVERIFIED / WRONG.

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | **Project Hockey** uses predict-then-compare: real NHL clip pauses at key moments, user decides (pass / shoot / hold / move), then sees what the pro actually did | **VERIFIED** | Site copy via search: "At key moments, the video pauses and it's your turn to decide: pass, shoot, hold, or move... make split-second decisions on NHL plays and see what the pros do." [projecthockey.com](https://www.projecthockey.com/) (product page returned 404 direct; copy confirmed via indexed pages + socials) |
| 2 | **Temporal occlusion meta-analysis**: d = 1.21 (95% CI 0.83-1.59) across 12 studies / 25 effect sizes / N = 248 | **VERIFIED** | Fetched [PMC11467115](https://pmc.ncbi.nlm.nih.gov/articles/PMC11467115/): "significant large effect... d = 1.21; 95% CI [0.83, 1.59]", 12 studies, 25 effect sizes, N = 248 |
| 3 | Occlusion gains transfer beyond the screen: field tests d = 0.85 vs video tests d = 1.26, not significantly different | **VERIFIED** | Same source: "Effects did not significantly differ between video tests (d = 1.26) and field tests (d = 0.85... p = 0.211)". Method confirmed as occlude-just-before-outcome + predict + feedback via non-occluded replay — the exact loop of our predict-next kind |
| 4 | **Hockey IntelliGym**: adaptive per-athlete difficulty across unlimited levels; abstract cognitive game, not video replay | **VERIFIED** (adaptive levels), **PLAUSIBLE-UNVERIFIED** (abstract-not-video nuance) | Site: "a series of unlimited levels with multiple sub-levels... tracks each individual athlete's performance and adapts... using artificial intelligence" ([usahockeyintelligym.com](https://www.usahockeyintelligym.com/)); direct product-page fetch truncated, abstract-format wording not independently re-quoted |
| 5 | **Sense Arena** publishes +9% decision making, +11% reaction time, +14% release time, +1% peripheral vision after 20 sessions | **VERIFIED** | Fetched [hockey.sensearena.ca/players](https://hockey.sensearena.ca/players) (redirect from .com): all four figures exact, "based on average user improvement after only 20 sessions". Training is VR drill reps + structured lessons, not quiz formats |
| 6 | **Duolingo method**: one concept, many varied exercise types; on error, hint now + resurface same concept at end of lesson; desirable-difficulty exercises late, adaptively eased | **VERIFIED** | Whitepaper content confirmed via secondary sources + [Duolingo teaching-method blog](https://blog.duolingo.com/duolingo-teaching-method/) ("simpler material in easier exercises... lead you through more challenging examples"; whitepaper: mistake → hint → resurfaced exercise at lesson end; adaptive difficulty selection) |
| 7 | **Chessable MoveTrainer**: learn-then-quiz (moves shown with explanation, quiz immediately follows) + spaced repetition with expanding intervals | **VERIFIED** | [chessable.com/movetrainer](https://www.chessable.com/movetrainer/) + support docs: "The moves to learn are shown on the board along with helpful text. A quiz follows"; "incrementally increases the amount of time between revisions", reset on error |
| 8 | **Team-sport perceptual training transfer**: lab ES 1.51 vs on-court ES 0.65; transfer larger with sport-specific action responses (0.87) than verbal (0.41) | **VERIFIED, with nuance** | Fetched [PMC11505547](https://pmc.ncbi.nlm.nih.gov/articles/PMC11505547/): all four numbers exact. Nuances: action-response ES CI [-0.22, 1.96] crosses zero (small samples); population is elite 14-23+, so youth generalization is an inference |

Not spot-checked (labels stay **PLAUSIBLE-UNVERIFIED**, from the raw claims file):
Be Your Best (real-game scenario kernel, scan-rate metrics), REPS VR (voice-graded
read call-outs + forced retry loop), QB Reads (coverage recognition under time
pressure), Rezzil (scanning/decision focus). None are load-bearing for the
recommendations; they corroborate directions already verified elsewhere.

**What the landscape means for RinkReads:** no competitor combines (a) animated
2D scenarios cheap enough to mass-produce, (b) explicit question mechanics with
teaching feedback, and (c) youth-priced accessibility. IntelliGym is abstract and
subscription-priced, Sense Arena needs a VR rig, Project Hockey depends on
licensed NHL footage of adult pros. The scenario-kernel + question-kind approach
is the defensible middle.

---

## 3. Question-mechanic menu (U11/U13)

### 3.1 Locked mechanics and the evidence behind them

**Pause-and-predict (`kind: "predict-next"`).** The engine freezes at an
occlusion point and asks "what happens next"; all options reveal the same true
continuation (`ask.truthNext`, gaps doc contract 3). Evidence: temporal occlusion
training is the direct lab analog, d = 1.21 on anticipation with field transfer
(section 2, #2-3); Project Hockey ships exactly this loop commercially (#1);
Duolingo frames its whole exercise design as prediction confirmed/denied by
instant feedback (#6). Reveal copy must be non-punitive ("You predicted X. Watch
what actually happens") — a wrong prediction is information, per the gaps doc's
Prediction Reveal Rule.

**Verdict/judgment (`kind: "verdict"` + `justify` step).** Watch a full play
(watch-chain primitive), judge the read (2-3 options, U13 gets "right idea,
wrong timing"), then pick WHY from evidence visible on the rink. Evidence:
error-spotting + self-explanation literatures; MoveTrainer's learn-then-quiz
two-phase loop is the mastery-trainer precedent (#7); huge content leverage since
every play's authored wrong branches become verdict items at ~80% discount
(gaps doc item D). Voice guardrail: judge the read, never the kid.

### 3.2 Ranked menu of additional candidates (owner picks 1-2)

| Rank | Mechanic | Learning mechanism | Product precedent | Engine fit (gaps doc) | Size |
|---|---|---|---|---|---|
| **1** | **Spatial answers at U11/U13** — render existing lane-pick tap zones for the token profile; answer by tapping the rink, not a text button | Action-coupled response; transfer is larger for sport-like actions (ES 0.87) than verbal answers (ES 0.41) — VERIFIED #8 | Every kid app's tap-to-target; our own U7/U9 lane-pick | Zones already exist in play data; today gated to `profile.token === "figure"` (gaps doc 1.3). Promote lane-pick to a first-class kind, drop the profile gate | **S** |
| **2** | **Gentle timed reads** — activate `timer: "gentle"` (shrinking bar, no lockout; answers classified fast / on-time / late) | Fluency/automaticity; reads on ice are time-boxed; desirable difficulty | QB Reads time pressure (plausible), IntelliGym adaptive challenge (VERIFIED #4), 99math speed rounds | `profile.timer` field already defined and unused; `ms` already logged per answer (gaps doc item E) | **S** |
| 3 | **Spot-the-mistake (`kind: "spot-mistake"`)** — watch a play with one wrong read baked in, tap the actor/moment where it went wrong | Error-spotting with a spatial answer; bridges lane-pick and verdict | Static bank `mistake` type (16 questions) pre-validates pedagogy | Needs watch chains + actor tap targets; strict one-defensible-answer authoring rule (gaps doc item G advises: defer behind verdict) | M |
| 4 | **Chained prediction** — two occlusion points in one play (predict, watch, predict again) | Deeper anticipation; forces model updating mid-play | Project Hockey "Full Shift Breakdowns" (site copy); occlusion studies use multiple occlusion windows | Composes predict-next + watch chains; no new primitives, but authoring cost per item roughly doubles | M |
| 5 | **Confidence tag** — rate sureness before the reveal; calibration tracked per family | Metacognitive calibration; streak-wager psychology (Duolingo's wager: +14% day-14 retention, blog-sourced) | Duolingo streak wager; test-prep apps | One extra tap on every question; gaps doc says wait for telemetry evidence of overconfidence | S |

**Top picks flagged: #1 and #2.** Rationale: both are S-size with zero new
content authoring; #1 is the only menu item backed by a verified transfer
differential; #2 turns the entire existing catalog into a second product surface
(speed reps) and is the load-bearing primitive for the arcade layer (section 5).
Picking both still costs less than one M-size item.

---

## 4. Young-age game layer (U7/U9, some U11)

Full catalog (10 mechanics, each with interaction, read taught, precedent, age
fit, engine needs, size, fun note): `2026-07-08-young-age-game-mechanics.md`.

Two unlocking primitives: **DRAG** (pointer capture, constrained tracks, drop
zones) and **TIMING** (animation-clock hit windows). Five mechanics hang off
DRAG, four off TIMING.

Top three (ranked):

1. **Cover the Pass (drag-defend), M.** The 2-on-1 animates; drag the defender
   across the crease to intersect the pass lane before the pass fires. The drag
   IS the defensive read (defender takes the pass, goalie takes the shooter).
   Reuses the flagship family; proves the DRAG primitive.
2. **Set the Forecheck (drag-to-spots + watch), M-L.** Drag three teammates onto
   glowing forecheck spots, press play, watch the play run; right structure
   forces the turnover. Teaches positioning — the most coach-valued young read —
   and reuses the same `autoNext` watch chain being built for verdict.
3. **Goalie Says Stop (tap-timing save), S-M.** Tap in the timing window at the
   shot release (side-read variant: tap glove/blocker half). Proves the TIMING
   primitive the arcade layer needs anyway.

Quick win outside the top three: **Freeze Frame Spotlight** (tap the checker you
must watch) is S-size, needs no new primitive (actor hit zones already exist in
data), and works U7-U11.

Young-band design constraints carried over from the research: no fail states
(Toca Boca pattern), instant multisensory feedback on every action, rounds of
10-30 seconds, sessions chunked well under 15-20 minutes, misses show a
consequence and an instant friendly retry, never a "wrong" screen.

---

## 5. Arcade mode designs (owner-locked identity: arcade, no coin economy)

Retention research anchors: streaks roughly double daily retention via loss
aversion + habit anchoring (Duolingo, blog-quality sourcing); time-limited
challenges create urgency that streaks cannot (a challenge ending Friday is a
reason to open the app Thursday); milestone-gated celebrations keep reward
salience high (day 50 gets a custom animation, day 47 gets a quiet tick);
parent-facing progress reporting is the strongest known churn lever for kids'
subscription apps (kids' ed apps average ~6-9% monthly churn; strong parent
reporting correlates with the low end; parents with visibility are cited as
2-3x likelier to keep subscriptions — directional, blog-quality).

Streak adaptations for 9-13 (differences from Duolingo, deliberate):
- Streak protection ("**Backup Goalie**") is EARNED at milestones and applied
  automatically, framed as a refill. Never purchasable. No repair-for-money.
- A broken streak reads "paused", never "lost"; one make-up session within 48h
  restores it. Loss aversion tuned way down for kids; anxiety is not a feature
  we ship to 10-year-olds (and parents are the buyers).
- Celebrations only at milestones (3, 7, 14, 30, 50, 100) with unique animations
  and a printable badge at 7/30/100 (owner-locked parent visibility hook).

### Mode A — Daily Faceoff (daily challenge; build first)

- **Rules:** 5 curated reads per day per band, same set for everyone in the band
  (shared-experience talk track for teams); one attempt each; mix of 3 read-mc /
  lane-pick + 1 predict + 1 verdict once kinds exist.
- **Scoring:** 0-5 pucks; perfect day = bonus celebration. Completing any Daily
  Faceoff maintains the calendar streak.
- **Streak integration:** THE streak driver. Backup Goalie earned at 7-day
  milestones.
- **Sound/mascot:** coach mascot at the bench opens the day ("Five reads.
  Fresh ice."); horn + crowd swell on 5/5; on a miss the coach taps the board
  ("Watch D1 next time") — growth-oriented, never a buzzer.
- **Parent/coach hooks:** weekly progress card (days played, accuracy by
  concept, streak); printable milestone badges. Team code later shows coach a
  completion board.
- **Engine needs:** session wrapper over existing plays + a daily selection
  table. No new rink primitives. **Size: S-M.**

### Mode B — Rush Hour (time attack)

- **Rules:** 90 seconds, reads drawn from families the player has already seen
  in trainer mode; read-mc + lane-pick only (watch chains are too slow here).
  Correct = next play immediately; wrong = 3-second abbreviated consequence
  (the lesson still lands), then next.
- **Scoring:** +10 per correct, +5 fast-answer bonus inside the gentle-timer
  window; in-run streak multiplier x2 at 3, x3 at 5 ("**Streak Fever**": rink
  lights shift, crowd loop rises — this is the owner's streak-fever mode fused
  in as a state, not a separate mode).
- **Streak integration:** one Rush Hour run/day also credits the calendar
  streak; personal bests tracked per band.
- **Sound/mascot:** tick-free soft clock (no anxiety audio at U11; audible last
  10s at U13+); arena horn on personal best; mascot towel-wave.
- **Parent/coach hooks:** reads-per-minute and accuracy trend on the weekly
  card — the "fluency" metric coaches understand.
- **Engine needs:** gentle timer (menu pick #2) + session wrapper + score HUD.
  **Size: M** (mostly HUD/loop, zero content).

### Mode C — Last Skater Standing (survival / 3 misses)

- **Rules:** unlimited reads, difficulty ramps (deeper variants, tighter timer
  windows, predict-next items mixed in as spice); 3 misses ends the run
  ("three whistles"). U11 variant: 5 misses, no timer tightening.
- **Scoring:** run length; badge tiers at 10/20/40 reads.
- **Streak integration:** does not touch the calendar streak (protects the daily
  habit loop from frustration); feeds its own best-run ladder.
- **Sound/mascot:** tension builds at 2 whistles (low crowd murmur, ice-crack);
  coach mascot signals "next line" at run end with the run stat — never a
  failure animation.
- **Parent/coach hooks:** longest run + "concepts where whistles cluster" line
  on the weekly card (this is genuinely diagnostic: it is per-family error
  concentration, which telemetry already supports per the gaps doc).
- **Engine needs:** Mode B's loop + ramp table. **Size: S on top of B.**
- **Age note:** U13+ only as specced; U9 gets the no-fail "Keep-Away Rally"
  skin from the young-age catalog instead.

**Mini-game breaks (owner-locked):** between question sets in any mode, offer a
20-30s young-band mini-game (Goalie Says Stop or Freeze Frame Spotlight) as a
palate cleanser at U7-U11; at U13 make breaks opt-in (tweens skip toys).

**Mascot dos/don'ts (bench coach character):**
- DO: one simple, expressive silhouette readable at favicon size; present across
  onboarding, empty states, celebrations, and miss screens (the Duo pattern:
  every touchpoint is a character interaction); persistent + supportive
  personality written down in a one-page style guide; motion = personality
  (jump on milestones, board-tap on coaching moments).
- DON'T: guilt-trip notifications (Duo's passive-aggression is an adult meme and
  wrong for 9-13 and for parent trust); never on the rink during a live read
  (the standards' "no decoration" motion rule extends to the mascot); fades to
  near-zero at U15/U18 (film room keeps stats, drops the character); no shame
  frames on misses, ever.

**Sound design defaults:** per-action SFX always (tape click on pass, glove thud
on save, horn on goals/milestones); coach whistle (single, soft) on wrong —
never a buzzer; crowd loop is the streak/fever channel; music is a toggleable
lo-fi arena-organ bed at U7-U13, off by default at U15/U18; all audio
mutable one tap from any screen (rink-side devices live in kitchens and cars).

---

## 6. Age-band styling recommendations

Tied to `src/play/interactionProfiles.js` (single switch point, per the gaps doc
item F). Current profiles already split token/accent/bg/big/celebrate/timer;
extend with `paceMs`, `promptFrame`, `revealStyle`, `kindAvailability`,
`mascotLevel`, `audioLevel`.

| Band | Identity | Question kinds | Game layer | Feel notes |
|---|---|---|---|---|
| **U7/U9** ("Playground" / "Mini-games", figure tokens, celebrate) | Toy, not test | read-mc (young copy) + lane-pick only | Mini-games primary (section 4); Keep-Away Rally instead of survival; no visible clocks, no fail states | Mascot most present; celebration on every correct action; outside labels + Puck/Helper/Checker vocabulary (Young Label Translation Rule); slower `paceMs` |
| **U11/U13** ("The Trainer" / "Read & React", gold token profile) | Junior pro trainer | read-mc + lane-pick (spatial answers promoted, menu pick #1) + verdict (U11+, 2 opts; U13 3 opts) + predict (U13, per the static bank's age map) | Daily Faceoff + Rush Hour (+ Last Skater Standing at U13); gentle timer, informational only | The critical band for the styling cliff: kids reject anything styled a grade below them (NN/g), and tweens specifically reject primary colors and exaggerated animation (deep-research corpus). Keep the gold-on-cream trainer aesthetic, coaching-card reveals with streak lines, mascot restrained to bench moments; "Make the read" prompt framing |
| **U15/U18** ("Pro Reps" / "Film Room", navy symbol profile) | Film room | all kinds + fast timer; annotation-stroke reveals on replay (gaps doc F-full) | Same arcade modes reskinned stats-first (leaderboard vs self, reads/min, accuracy trends); no mini-game breaks | X/O symbols per Film-Room Symbol Rule; mascot ~absent; minimal SFX, no music; "Call it" prompt framing; NN/g teen findings: minimize reading load, fast feedback, low patience for decoration |

Session shape by band (research: 6-11 sustain ~15-20 min, teens 20-30): U7/U9
sessions cap at ~8-10 min of mixed mini-games; U11/U13 Daily Faceoff is a
2-3 min floor with optional arcade runs; U15+ open-ended.

---

## 7. Sources

Verification fetches (Task A, 2026-07-08):
- Temporal occlusion meta-analysis (Sports Medicine 2024): https://pmc.ncbi.nlm.nih.gov/articles/PMC11467115/ (also https://link.springer.com/article/10.1007/s40279-024-02073-6)
- Perceptual-cognitive training transfer meta-analysis (lab vs on-court, response type): https://pmc.ncbi.nlm.nih.gov/articles/PMC11505547/
- Sense Arena player metrics: https://hockey.sensearena.ca/players
- Hockey IntelliGym product/FAQ: https://www.usahockeyintelligym.com/ ; https://www.usahockeyintelligym.com/faq/
- Project Hockey: https://www.projecthockey.com/ (product page 404 on direct fetch; copy via indexed pages)
- Duolingo Method whitepaper: https://duolingo-papers.s3.amazonaws.com/reports/Duolingo_whitepaper_duolingo_method_2023.pdf ; blog summary https://blog.duolingo.com/duolingo-teaching-method/ ; difficulty design https://blog.duolingo.com/right-level-of-difficulty/
- Chessable MoveTrainer: https://www.chessable.com/movetrainer/ ; spaced-repetition scheduling https://support.chessable.com/en/articles/9043598-how-does-the-spaced-repetition-scheduling-work

Task B (young-age mechanics) — full list in `2026-07-08-young-age-game-mechanics.md`;
key items: Duolingo ABC and Khan Academy Kids store listings; Toca Boca design
coverage; Osmo (Wikipedia/playosmo); penalty/goalie mini-games (Poki, CrazyGames,
Google doodle coverage); drag-vs-click child interaction studies (ResearchGate);
game-based learning meta-analysis (Frontiers in Psychology 2024); NN/g children's
usability; thisisglance age-band session lengths.

Task C (arcade/retention):
- Duolingo streak mechanics teardowns: https://duolingo.deconstructoroffun.com/mechanics/streaks ; https://trophy.so/blog/duolingo-gamification-case-study ; https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo (blog-quality; figures directional)
- Live-game feel: https://www.99math.com/ ; https://www.prodigygame.com/main-en ; https://kahoot.com/home/kahoot-kids/
- Arcade calibration: ZType https://zty.pe/ (via Coolmath/Vault reviews); Nitro Type https://www.nitrotype.com/
- Mascot patterns: https://raw.studio/blog/how-mascots-improve-user-experience/ ; https://ziggle.art/best-brand-mascots ; Duolingo brand coverage (Canny Creative, LogoAI) (blog-quality)
- Parent dashboards/retention: Khan Academy parent dashboard https://support.khanacademy.org/hc/en-us/articles/360039664491-Guide-to-the-Parent-Dashboard ; Khan Kids progress reports https://khankids.zendesk.com/hc/en-us/articles/4403614100109-Progress-reports-in-the-Khan-Academy-Kids-app ; Duolingo family plan https://www.duolingo.com/family ; churn benchmarks https://retentioncheck.com/churn-benchmarks/kids-education-apps (blog-quality)

Prior internal work: `docs/research/2026-07-08-mvp-engine-gaps.md`;
`docs/play-kernel-standards.md`; `src/play/interactionProfiles.js`;
`src/play/AnimatedPlay.jsx`; `src/play/plays/twoOnOneRead.js`;
`docs/research/_raw-deep-research-claims-2026-07-08.txt`.
