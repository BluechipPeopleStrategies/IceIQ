# Native Scenario Rebuild Plan

Status: planning and QC guide.

This plan is for turning rough/generated scenario concepts into native RinkReads animated plays. The untracked expansion batch should be treated as inspiration, not production-ready content.

## Current Baseline

Already completed:

- Signup completion fix
- Scenario inspiration backlog
- Gap Control: Hold the middle
- Gap Control: Match the rush speed

Before adding more plays, QC the Gap Control pair to make sure they feel different and teach separate reads.

## QC Checklist for Every Native Play

### 1. Teaching Read

Each play must answer one clear question:

- What is the player seeing?
- What is the correct read?
- What mistake are we trying to prevent?

The correct answer should come from the picture/play state, not just from knowing hockey vocabulary.

### 2. Visual Alignment

Check:

- Can the learner tell who "YOU" are?
- Does the freeze frame show the decision moment?
- Does the puck location match the question?
- Do the outcome motions match the explanation?
- Are wrong-answer consequences visible?

### 3. Answer Quality

Each question should have:

- exactly one correct answer;
- three plausible wrong answers;
- wrong answers that represent real player mistakes;
- feedback that explains the read, not just the result.

### 4. Age Translation

For U7 through U13:

- avoid adult tactical shorthand unless `youngT` translates it;
- keep the young-player option simple;
- avoid overloading with systems language.

### 5. Source Reference

Every play should point to a library note that exists and is tracked.

Important current docs to verify:

- docs/library/gap-control.md
- docs/library/backcheck-recovery.md
- docs/library/forecheck-pressure.md

### 6. Gates

After each play:

    npm run test:animated-play
    npm run test:play-catalog
    npm run test:play-factory
    npm run test:prototype-telemetry
    npm run test:scenario-families
    npm run test:question-kinds
    npm run check:bulk
    npm run build

## Rebuild Order

### Phase 1 — QC Existing Gap Control Pair

1. Gap Control: Hold the middle
2. Gap Control: Match the rush speed

Decision point:

- If they feel distinct, keep both.
- If they feel too similar, revise one before building more.

### Phase 2 — Resolve Source Docs

Commit or correct the referenced library notes before more play expansion.

Priority docs:

1. docs/library/gap-control.md
2. docs/library/backcheck-recovery.md
3. docs/library/forecheck-pressure.md

### Phase 3 — Next Native Plays

Recommended order:

1. Forecheck Pressure — F1 angle decides the play
2. Forecheck Pressure — Take away the reverse
3. Gap Control — Step up when attackers are flat-footed
4. Backcheck Recovery — Sort the weak-side trailer
5. Off-Puck Support — Be available, not nearby
6. U9 Time and Space — Use the extra second
7. U9 Reading the Play — Identify the open teammate
8. U7 Time and Space — Look up before deciding

## Next Build Candidate

### Forecheck Pressure — F1 angle decides the play

Core read:

F1 should pressure on an angle that takes away the puck carrier's best escape route, instead of skating straight at the puck or overrunning the play.

Possible correct answer:

- Angle through the inside shoulder and force the puck carrier toward the wall.

Possible wrong answers:

- Skate straight behind the puck carrier.
- Overrun the puck and lose containment.
- Chase the hit instead of controlling the route.
- Drift wide and leave the middle escape open.

Likely format:

- Animated play
- U11/U13/U15/U18
- Half-rink or corner retrieval view

## Commit Strategy

Use small commits:

1. Planning/QC doc
2. Source library docs
3. One native play plus generated reports
4. Next native play plus generated reports

Do not commit the whole untracked expansion batch.
