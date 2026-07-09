# Scenario Inspiration Harvest

Status: inspiration only — not production-ready.

These concepts came from the untracked scenario/image expansion batch. They should not be treated as clean ports into the current RinkReads library. The current RinkReads format has stronger structure, screen presentation, answer logic, and factory standards.

## How to use this backlog

For each idea:

1. Keep the hockey concept.
2. Rewrite the scenario in current RinkReads voice.
3. Decide whether it should be static, animated, or play-token based.
4. Build answer choices around the actual read, not just terminology.
5. Run the normal gates before committing.

## High-Priority Native Rebuild Candidates

### 1. U13 Gap Control — Hold the inside lane

Concept: Defender is backing in against a puck carrier with speed.

RinkReads-native read: Does the defender protect the middle first, or chase the puck too early?

Likely format: Animated play.

Good wrong answers:
- Step straight at the puck and get beaten wide.
- Back in too deep and give up the slot.
- Turn hips too early and open the middle.

Why it fits: Strong visual spacing read. Great for animation.

---

### 2. U13 Angling — Steer wide instead of reaching

Concept: Defender approaches from inside-out and guides the attacker toward the boards.

RinkReads-native read: What body angle takes away the dangerous lane?

Likely format: Animated or diagrammed scenario.

Good wrong answers:
- Reach with the stick while feet stop.
- Skate directly at the puck carrier.
- Overcommit to the boards and give up a cutback.

Why it fits: Clean teaching concept and very coachable.

---

### 3. U13 Backcheck Recovery — Take inside ice first

Concept: Backchecker is chasing a rush and must recover defensive position.

RinkReads-native read: Does the player chase the puck or recover through the middle?

Likely format: Animated play.

Good wrong answers:
- Chase from behind.
- Coast into the play.
- Drift to the boards and leave the middle open.

Why it fits: This connects nicely to our existing backcheck/recovery family.

---

### 4. U13 Forecheck Pressure — F1 angle decides the play

Concept: First forechecker pressures the puck carrier on retrieval.

RinkReads-native read: Which pressure angle forces the puck carrier into a bad option?

Likely format: Animated play or predict-next.

Good wrong answers:
- Skate straight behind the puck.
- Overrun the puck carrier.
- Pressure without taking away the reverse or middle.

Why it fits: Great decision-making scenario because the route matters more than speed.

---

### 5. U13 Off-Puck Support — Be available, not just nearby

Concept: Supporting player must find useful space away from the puck.

RinkReads-native read: Where should the support player move to become a real option?

Likely format: Static or animated.

Good wrong answers:
- Stand beside the puck carrier.
- Drift behind coverage.
- Skate into the same lane as a teammate.

Why it fits: Strong hockey IQ concept and good for “see the next pass” training.

---

### 6. U9 Time and Space — Use the extra second

Concept: Player receives the puck with more time than they realize.

RinkReads-native read: Should they panic-chip, skate, scan, or pass?

Likely format: Static scenario.

Good wrong answers:
- Throw puck away immediately.
- Skate into pressure.
- Stare only at the puck.

Why it fits: Good younger-age decision-making without needing complex tactics.

---

### 7. U9 Reading the Play — Identify the open teammate

Concept: Player must recognize pressure and support options.

RinkReads-native read: Which teammate is actually open based on lane and pressure?

Likely format: Static or simple animated.

Good wrong answers:
- Pass through a defender.
- Pass to a covered teammate.
- Shoot from a poor angle with support available.

Why it fits: Simple read, high teaching value.

---

### 8. U7 Time and Space — Look up before deciding

Concept: Young player has the puck and needs to scan before acting.

RinkReads-native read: What is the first smart habit?

Likely format: Static, beginner-friendly.

Good wrong answers:
- Shoot from anywhere.
- Chase into traffic.
- Keep skating with head down.

Why it fits: Good foundation-level hockey IQ.

## Not Ready for Direct Port

The current untracked images and generated docs may help with ideas, but they should not be considered production-ready because:

- presentation format may not match current RinkReads screens;
- answer logic may need stronger distractors;
- scenario families need current metadata;
- animated/play-token compatibility needs to be rebuilt;
- age-level language needs review.

## Recommended First Build Batch

Build 3 native scenarios first:

1. U13 Gap Control — Hold the inside lane
2. U13 Backcheck Recovery — Take inside ice first
3. U13 Forecheck Pressure — F1 angle decides the play

Then run these gates:

    npm run test:scenario-families
    npm run test:play-catalog
    npm run test:play-factory
    npm run check:bulk
    npm run build
