# Wrestle AI teardown — what transfers to RinkReads

Requested by Thomas, 2026-08-01. Question: what in Wrestle AI could we
incorporate into our engine.

**Caveat up front, because it changes how much weight to put on this.** There
are at least four near-identically-named apps (Wrestle AI, Wrestle AI:
Wrestling Trainer, WrestleKit, Greco AI). I read the landing page
(`wrestleai.app`) and the App Store listing for *Wrestle AI: Wrestling
Trainer*. That is marketing copy, not the product — I have not used the app,
and the pages are deliberately vague about mechanics ("the webpage lacks
technical depth on AI methodology"). Treat the feature list as real and the
implementation claims as unverified.

## The honest headline

**There is very little here for our engine.** Wrestle AI is a content-and-
coaching-loop product whose AI appears to be an LLM giving feedback on uploaded
clips. Our scenario engine is doing something structurally harder — sourced
physics profiles, kinematic validation, immutable provenance, blind two-pass
adversarial judgment. Nothing in Wrestle AI's public material suggests rigor at
that level.

So the useful transfer is **product-loop ideas, not engine architecture.** I'd
rather say that than manufacture engine parallels that aren't there.

## What they do

- **Upload a clip, get step-by-step feedback** on stance, setups, finishes,
  chain options.
- **Declare goals** — position focus (neutral / top / bottom), weight class,
  and *schedule* — and the app builds a plan for your season.
- **Log sport-native events**: attempts, finishes, riding time, escapes,
  near-falls, pins.
- Technique library, interval timers, a shot clock, "Impossible Mode"
  conditioning, streaks / targets / milestones.
- Pricing: $4.99 weekly, $9.99 monthly, $49.99 yearly, free base app.

## Worth taking

### 1. Chain sequences — the strongest idea, and we're half-built for it

Wrestle AI coaches *chains*: if the first shot fails, what's the second option.
That is exactly the shape of a hockey read — the pass is taken away, now what?
It maps directly onto our existing multi-step work (`MultiStepPlayer`, and the
parked "Multi-step Phase 2: gauntlet generation" in LATER).

Right now almost every scenario terminates in a single decision. The chain
framing says the *second* read is where the teaching is, because the first
option being denied is the normal case in a real game. That's a content-design
principle with engine support already partly in place, and it argues for
promoting gauntlet generation above where it currently sits.

### 2. Season phase as a real input

They personalize on position + weight class + **schedule**. We personalize on
age band and position but have no notion of *where you are in the season*.
`SEASONS` exists in `App.jsx` purely as a label ("2025-26"), never as a driver.

Pre-season, mid-season, and playoffs want different content — installing
concepts versus sharpening reads versus staying loose. This is cheap to add as
a dimension and it feeds NEXT #4 (Daily Faceoff) and the Brain Gym "Today's
Practice" picker directly.

### 3. Sport-native event tracking — the real gap

This is the one I'd think hardest about. They track *what happened in the
sport*: attempts, finishes, escapes. We track **how you did in the app** —
accuracy by concept and competency.

Nothing in RinkReads currently measures whether a player who scores 82% on
d-zone reads actually makes better d-zone reads on Saturday. Our
`training_sessions` table logs off-ice minutes, not in-game events. That's a
transfer-validation gap, and it's the same gap the LATER "evidence-led
curriculum" item already names ("player testing validates comprehension and
transfer") without a mechanism.

A light version: let a parent or coach log a handful of game events against the
concepts we teach. It closes the loop from "knows the read" to "made the read,"
which is the only claim that actually matters commercially.

## Worth noting, not taking

- **Upload-your-own-video analysis.** Their headline feature, and I'd argue
  against copying it. Wrestling is a technique sport, so per-athlete mechanics
  review is the product. Hockey game sense is about decisions made off the puck
  — the thing you'd need to see is usually not in the frame, and youth game
  footage rarely shows it. This is also a large new surface (the "player-footage
  review portal" TASKS.md already keeps distinct from coach authoring), not an
  engine feature. Different product, not a missing piece of ours.
- **Pricing.** $4.99/wk, $9.99/mo, $49.99/yr is useful comparative intel for our
  FREE/TEAM/PRO tiers, but a pricing move is an advisory-panel decision, not an
  engineering one.
- **Timers, streaks, milestones, conditioning modes.** We already have or have
  planned nearly all of it — streaks in Daily Faceoff, combo and hot-streak
  audio, a shot clock in Shootout.

## Recommendation

One idea is worth acting on soon and it isn't the AI: **chain sequences**.
It fits our thesis, our existing multi-step engine, and the physics validation
we just fixed. The season-phase input is a cheap follow-on. Event tracking is
the strategically important one but needs a design pass, since it depends on
someone reliably logging games.

Nothing here should displace NEXT #1.

Sources: [wrestleai.app](https://wrestleai.app/) ·
[App Store listing](https://apps.apple.com/us/app/wrestle-ai-wrestling-trainer/id6753085689)
