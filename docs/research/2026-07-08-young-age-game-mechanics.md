# Young-Age Game Mechanics for the Rink Engine (U7/U9, some U11)

Date: 2026-07-08
Scope: research catalog only. No code changed. Companion to
`2026-07-08-mvp-engine-gaps.md` (question-type abstraction) and the final synthesis
report `2026-07-08-question-engine-research.md`.

Owner decision this serves: younger bands (U7/U9, some U11) get game-like SPATIAL
mechanics, not more question types. The engine today supports tap zones
(`lane-pick` with `zone [x,y,r]`), text buttons, and one animate-freeze-ask loop.
It has NO drag support, NO drop zones, NO timing windows, NO real-time loop.

---

## 1. What the kid-app landscape actually uses (ages ~5-11)

Recurring interaction mechanics across the reference products:

| Mechanic | Where it shows up |
|---|---|
| Tap-to-pick (large targets) | PBS Kids, Khan Academy Kids, Duolingo ABC; matches our existing lane-pick |
| Drag-to-target / drag-to-sort | Khan Kids ("match, drag, tap, trace"), Duolingo ABC drag-and-drop prompts, Osmo physical manipulation |
| Path tracing | Duolingo ABC and Khan Kids letter tracing (stylus/finger) |
| Tap-timing / rhythm | casual sports mini-games (penalty shootouts, goalie save games) |
| Put-things-in-the-right-place | Osmo Pizza Co. (layered placement complexity), sorting games in Khan Kids |
| Celebration feedback | universal: instant multisensory response to every action, big end-of-round celebrations |

Design findings that constrain us:

- Kids often EXPECT drag-and-drop: in usability studies ~89% of children handled
  drag mechanics without problems, though one study found point-and-click was
  faster with fewer errors. Practical read: offer drag where it IS the play
  (goalie slides, player placement), keep tap where a tap is enough.
- Children under ~12 need immediate, visual/multisensory feedback; abstract or
  delayed evaluation does not land (deep-research corpus, fruto.design +
  thisisglance sources). Our per-answer consequence animation already does this;
  mini-games must keep response latency near zero.
- Session shape for 6-11: roughly 15-20 minutes max, chunked into short tasks
  with step-by-step challenges; teens sustain 20-30.
- Failure design: Toca Boca's whole brand is "no rules, no levels, no losing" for
  3-8. Games in this band should stay in the "zone of effort": challenge without
  fail-state punishment. Retry should be instant and friendly; a miss shows the
  consequence, never a "you failed" screen. Rewards should confirm effort, not
  distract from the learning moment.
- Age-styling cliff: kids reject content styled even one school grade below them
  (NN/g children's usability). U11 must NOT get the U7 playground skin.

What makes casual sports mini-games feel like play, not a quiz (penalty/goalie
game analysis, CrazyGames/Poki/Google doodle patterns):

1. The input IS the sport action (you aim, you dive, you time the save), not a
   question about the action.
2. One clear verb per game ("stop the shot", "pick the corner").
3. Escalating opponent (keeper "remembers" your shots) instead of harder text.
4. Instant restart; a round is 10-30 seconds.
5. Tension comes from timing windows, not from grading.

---

## 2. Mini-game mechanic catalog (rink engine)

Build-size legend: S = fits current renderer with small additions; M = needs one
new interaction primitive (drag OR timing window); L = needs a real-time loop.

The two unlocking primitives, named once:

- **DRAG primitive**: SVG pointer capture, constrained drag (along a track or into
  drop zones with tolerance radii), drop validation. Unlocks mechanics 1, 4, 6, 9, 10.
- **TIMING primitive**: animation-clock hit windows (event fires at t, input judged
  against window), already half-implied by the unused `timer` profile field.
  Unlocks mechanics 2, 3, 5, 8.

### Mechanic 1 — Cover the Pass (drag-defend)

- **Interaction:** the 2-on-1 animates toward the net; the learner presses and
  drags the defender (or goalie) along a constrained track across the crease to
  take away the backdoor pass BEFORE the pass fires. Intersect the pass lane at
  pass-time = blocked-pass celebration; miss = the goal happens, instant retry.
- **Hockey read taught:** defender's job on a 2-on-1 (take the pass, goalie takes
  the shooter); far-post coverage.
- **Product precedent:** goalie-save timing games; Osmo-style direct manipulation.
- **Age fit:** U7-U11.
- **Engine needs:** DRAG (constrained track) + collision test of token vs pass
  line at time t; reuses existing motions and terminal reveal.
- **Build size:** M.
- **Fun factor:** highest agency in the catalog; the learner physically makes the
  save. The lesson is literally the drag.

### Mechanic 2 — Goalie Says Stop (tap-timing save)

- **Interaction:** shooter winds up and releases; the learner taps (or taps
  LEFT/RIGHT half for glove/blocker side) inside the timing window at release to
  make the save. Cue variants telegraph the side (stick blade angle).
- **Hockey read taught:** reading the release; shot anticipation cues.
- **Product precedent:** penalty shootout / goalkeeper mini-games (Poki, Google
  doodle); rhythm-tap games.
- **Age fit:** U7-U9 (U11 variant: tighter window + side read).
- **Engine needs:** TIMING window + 2 large tap zones; existing shot motion.
- **Build size:** S-M.
- **Fun factor:** classic arcade save moment; naturally replayable rounds.

### Mechanic 3 — Freeze Frame Spotlight (find-the-cue tap)

- **Interaction:** play freezes; "Tap the checker you have to watch" / "Tap who's
  open". Tapping dims the rink and spotlights the choice; right answer lights
  gold and the play resumes showing why.
- **Hockey read taught:** cue identification (defender commitment, open support),
  the atomic skill under every other read.
- **Product precedent:** hidden-object / find-it games (PBS Kids); extends our
  existing lane-pick zones from spots to actors.
- **Age fit:** U7-U11 (U11 wording gets tactical).
- **Engine needs:** actor hit-targets (zones already exist in data, currently
  rendered only for the figure profile) + spotlight overlay.
- **Build size:** S — the cheapest item in the catalog.
- **Fun factor:** detective feel; low arousal, good "breather" game.

### Mechanic 4 — Set the Forecheck (drag players to spots, then watch)

- **Interaction:** empty-ish zone with 3 glowing drop zones; drag three teammates
  to the right forecheck spots (1-2-3), press PLAY, and watch the play run: right
  placement = turnover forced, wrong = breakout escapes, with a gentle "try
  moving F2" hint.
- **Hockey read taught:** positional structure (1-2-3 forecheck, D-zone coverage,
  faceoff alignments) — THE young-age read per coaching curricula.
- **Product precedent:** Osmo Pizza Co. put-things-in-place layering;
  set-your-lineup casual games.
- **Age fit:** U9-U13 (structure is taught from U9 up; U13 gets harder zones).
- **Engine needs:** DRAG (multi-token, drop zones with tolerance) + a watch chain
  to run the consequence (the `autoNext` primitive from the gaps doc, reused).
- **Build size:** M-L.
- **Fun factor:** "coach mode" godview + a payoff animation you caused. Strong
  parent-visible artifact ("my kid sets a forecheck").

### Mechanic 5 — Trace the Pass (path tracing)

- **Interaction:** finger-draw a line from the puck carrier toward a teammate;
  the engine snaps the trace to the nearest lane and fires the pass along it;
  open lane = tape-to-tape celebration, covered lane = intercepted (friendly
  retry).
- **Hockey read taught:** picking the passing lane; covered vs open lane
  (directly reuses the gray-dotted covered-lane vocabulary).
- **Product precedent:** Duolingo ABC / Khan Kids tracing; whiteboard play-drawing.
- **Age fit:** U7-U11.
- **Engine needs:** pointer path sampling + lane snapping; reuses pass motion +
  covered-lane rendering.
- **Build size:** M.
- **Fun factor:** feels like drawing on the coach's whiteboard; motor-skill
  satisfaction of the trace itself.

### Mechanic 6 — Race to the Loose Puck (route pick under time)

- **Interaction:** puck is dumped in; you and an opponent converge; two route
  cards (or swipe gestures) — around the net vs direct; pick fast, then watch
  both skaters race; right angle wins the puck.
- **Hockey read taught:** angling and route efficiency to loose pucks.
- **Product precedent:** path-choice runner games; PBS Kids maze games.
- **Age fit:** U9-U11.
- **Engine needs:** tap-route version is nearly free (two lane-pick zones +
  alternate consequence animations); swipe version needs gesture detection.
- **Build size:** S (tap version), M (swipe).
- **Fun factor:** race tension + "I chose the smart path" payoff.

### Mechanic 7 — Keep-Away Rally (rapid-fire lane-pick streak)

- **Interaction:** five one-tap reads from the same family back-to-back, each
  under ~8 seconds, with a rising celebration meter; a miss just shows the
  consequence and the rally continues (no fail state at U7/U9).
- **Hockey read taught:** fluency/automaticity on already-learned reads.
- **Product precedent:** Duolingo Match Madness; math rapid rounds (99math-style).
- **Age fit:** U9-U11 (U7 gets 3 reads, slower).
- **Engine needs:** a session wrapper over existing plays + TIMING for the soft
  clock; no new rink interaction.
- **Build size:** S-M. (This is really a young-age skin of the arcade layer —
  see the synthesis report's mode specs.)
- **Fun factor:** streak adrenaline, safe at young ages because misses don't end it.

### Mechanic 8 — Goalie Slide (continuous drag tracking)

- **Interaction:** three attackers pass the puck around the horn; the learner
  holds and drags the goalie side-to-side staying square to the puck; when the
  shot comes, being square = save.
- **Hockey read taught:** tracking the puck, staying square, anticipating the
  one-timer.
- **Product precedent:** paddle/pong-style defense games; air hockey.
- **Age fit:** U7-U9.
- **Engine needs:** REAL-TIME loop (continuous input sampling against live puck
  position) — a genuinely new engine paradigm beyond DRAG.
- **Build size:** L.
- **Fun factor:** very high, but the cost says "later".

### Mechanic 9 — Sort the Reads (drag-to-bucket)

- **Interaction:** 4-6 frozen scene cards; drag each into PASS or SHOOT buckets;
  instant per-card feedback, end-of-round recap.
- **Hockey read taught:** pattern discrimination across family variants (the
  same discrimination verdict questions train at U11/U13, in kid form).
- **Product precedent:** sorting/categorizing games in Khan Kids and Duolingo ABC.
- **Age fit:** U9-U11.
- **Engine needs:** card UI + DRAG buckets; rink engine only supplies the frozen
  frames (cheap frame-capture reuse).
- **Build size:** M (mostly outside the rink renderer).
- **Fun factor:** tidy-up satisfaction; slower-paced complement to timing games.

### Mechanic 10 — Build the Play (sequence tiles)

- **Interaction:** three picture tiles (skate / pass / shoot) to arrange in the
  order that beats the defense, then watch it run.
- **Hockey read taught:** play sequencing (support before pass, pass before shot).
- **Product precedent:** sequencing puzzles in early-learning apps.
- **Age fit:** U7-U9.
- **Engine needs:** tile UI + watch chain. NOTE: the kernel gap analysis
  deliberately excluded "order-the-reads" from the QUESTION schema; this version
  lives outside the kernel validator as a mini-game, so the exclusion holds.
- **Build size:** M.
- **Fun factor:** moderate; ranks below the physical-verb games.

---

## 3. Ranked top 3

1. **Mechanic 1 — Cover the Pass (drag-defend).** The strongest fusion of agency
   and pedagogy: the drag IS the defensive read, it reuses the flagship 2-on-1
   family, and it justifies building the DRAG primitive that unlocks four other
   mechanics. Ship it first as the primitive's proving ground.
2. **Mechanic 4 — Set the Forecheck (drag-to-spots + watch).** Teaches the single
   most coach-valued young read (positioning/structure), produces a
   parent-visible "my kid can set a forecheck" artifact, and reuses the same DRAG
   primitive plus the `autoNext` watch chain already planned for verdict
   questions. Build second, once DRAG exists.
3. **Mechanic 2 — Goalie Says Stop (tap-timing save).** Cheapest high-fun item;
   proves the TIMING primitive that the arcade layer (time attack, rally modes)
   needs anyway, so the mini-game and the arcade infrastructure pay for each
   other. (If a zero-new-primitive quick win is wanted even earlier, Mechanic 3
   Freeze Frame Spotlight is an S-size weekend item.)

Build-order logic: DRAG primitive -> Mechanic 1 -> Mechanic 4; TIMING primitive ->
Mechanic 2 -> arcade modes. Mechanics 3 and 6 (tap variants) are S-size fillers
that can slot in anytime; defer 8 (real-time loop) and 10.

---

## 4. Sources (Task B)

- Duolingo ABC (App Store / Google Play listings): tap, trace, listen, speak,
  drag-and-drop mini-games. https://apps.apple.com/us/app/learn-to-read-duolingo-abc/id1440502568
- Khan Academy Kids (App Store; Khan blog): match/drag/tap/trace interaction set.
  https://apps.apple.com/us/app/khan-academy-kids/id1378467217
- Toca Boca design philosophy (no fail states, ages 3-8):
  https://apps.apple.com/us/app/toca-boca-world-game-play/id1208138685 ;
  https://screenwiseapp.com/guides/the-best-toca-boca-games-for-kids-and-creativity
- Osmo (Tangible Play) hands-on manipulation + layered complexity:
  https://en.wikipedia.org/wiki/Osmo_(game_system) ; https://www.playosmo.com/
- Penalty/goalie mini-game patterns: https://poki.com/en/g/penalty-shooters-2 ;
  https://www.crazygames.com/t/penalty ; Google World Cup doodle coverage
  https://mumble.nationalgeographic.com/google-doodle-football/how-to-play-googles-world-cup-mini-game
- Drag-and-drop vs point-and-click for children (mixed evidence; kids expect drag):
  https://www.researchgate.net/publication/220286323_Drag-and-Drop_versus_Point-and-Click_Mouse_Interaction_Styles_for_Children ;
  https://www.researchgate.net/publication/221518946_Children_may_expect_drag-and-drop_instead_of_point-and-click
- Game-based learning in early childhood, systematic review/meta-analysis:
  https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1307881/full
- Reward/feedback design for 8-11 (end-of-game feedback attention; rewards confirm
  effort): https://www.academia.edu/68125229/Efficacy_of_Reward_Allotment_on_Childrens_Motivation_and_Learning ;
  https://game-ace.com/blog/how-to-design-learning-games/
- Session length by age band (6-11: ~15-20 min):
  https://thisisglance.com/learning-centre/what-age-groups-should-i-target-when-building-an-educational-app
- Age-styling cliff (content one grade too young is rejected):
  https://www.nngroup.com/articles/childrens-websites-usability-issues/
