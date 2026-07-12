# Animated Retrofit Batch 01

Purpose: choose the first existing IceIQ/RinkReads questions or scenarios to retrofit into animated plays.

## Recommended First Conversions

### 1. src\data\bank.json

- **Score:** 94
- **Suggested use:** Convert into full animated scenario
- **Matched terms:** 2-on-1, 2v1, odd-man, rush, gap control, gap-control, angling, steer, forecheck, backcheck, off-puck, support, passing lane, shot lane, defender, puck carrier, pressure, breakout, entry, transition, middle lane, weak side, back door, backdoor
- **Snippet:** line 4: "id": "rr-u11-gap-control-1",
- **Decision:** TODO - full animated scenario / variant / keep static

### 2. docs\ai-pipeline\_reviewed-bank.json

- **Score:** 86
- **Suggested use:** Convert into full animated scenario
- **Matched terms:** 2-on-1, odd-man, rush, gap control, gap-control, angling, steer, forecheck, backcheck, off-puck, support, passing lane, shot lane, defender, puck carrier, pressure, breakout, entry, transition, middle lane, weak side, back door, backdoor
- **Snippet:** line 15: "Whether a late teammate is joining the rush for a pass after you cross the blue line",
- **Decision:** TODO - full animated scenario / variant / keep static

### 3. docs\ai-pipeline\image-bound.json

- **Score:** 76
- **Suggested use:** Convert into full animated scenario
- **Matched terms:** 2-on-1, odd-man, rush, gap control, gap-control, angling, steer, forecheck, backcheck, off-puck, support, passing lane, shot lane, defender, puck carrier, pressure, breakout, entry, transition, middle lane, weak side
- **Snippet:** line 3: "id": "img_u13_odd-man-reads_01",
- **Decision:** TODO - full animated scenario / variant / keep static

### 4. docs\ai-pipeline\_qa-image-batch.json

- **Score:** 73
- **Suggested use:** Convert into full animated scenario
- **Matched terms:** 2-on-1, odd-man, rush, gap control, gap-control, angling, steer, forecheck, backcheck, off-puck, support, passing lane, shot lane, defender, puck carrier, pressure, breakout, transition, middle lane, weak side
- **Snippet:** line 13: "image_spec": "Clean top-down rink diagram. Gold attacks bottom to top. The gold puck carrier is on the left boards under pressure from two white defenders. A second gold player is skating into the same crowded corner wh
- **Decision:** TODO - full animated scenario / variant / keep static

### 5. src\data\povQuestions.json

- **Score:** 71
- **Suggested use:** Convert into full animated scenario
- **Matched terms:** 2-on-1, 2v1, rush, gap control, steer, forecheck, backcheck, off-puck, support, passing lane, defender, puck carrier, pressure, breakout, entry, transition, weak side, back door, backdoor
- **Snippet:** line 10: "id": "IMG-2v1-001",
- **Decision:** TODO - full animated scenario / variant / keep static

### 6. docs\ai-pipeline\_qa-u13-batch.json

- **Score:** 64
- **Suggested use:** Convert into full animated scenario
- **Matched terms:** odd-man, rush, gap control, gap-control, angling, steer, forecheck, backcheck, off-puck, support, passing lane, defender, puck carrier, pressure, breakout, transition, middle lane, weak side
- **Snippet:** line 3: "id": "img_u13_gap-control_01",
- **Decision:** TODO - full animated scenario / variant / keep static

### 7. src\data\backups\questions-2026-05-04T00-42-41-947Z.json

- **Score:** 62
- **Suggested use:** Convert into full animated scenario
- **Matched terms:** 2-on-1, 2v1, rush, gap control, gap-control, forecheck, backcheck, support, passing lane, shot lane, defender, puck carrier, pressure, breakout, entry, middle lane, backdoor
- **Snippet:** line 4: "id": "Q-2v1-001-A2-U7",
- **Decision:** TODO - full animated scenario / variant / keep static

### 8. src\data\scene-manifest.json

- **Score:** 60
- **Suggested use:** Convert into full animated scenario
- **Matched terms:** 2v1, odd-man, rush, gap-control, angling, steer, forecheck, backcheck, off-puck, support, defender, puck carrier, pressure, breakout, entry, transition, middle lane, backdoor
- **Snippet:** line 16: "alt": "You carry the puck through the neutral zone with speed. One defender waits far ahead with a big gap, watching you.",
- **Decision:** TODO - full animated scenario / variant / keep static

### 9. src\data\backups\questions-2026-05-04T00-45-29-354Z.json

- **Score:** 59
- **Suggested use:** Convert into full animated scenario
- **Matched terms:** 2-on-1, 2v1, rush, gap control, gap-control, forecheck, backcheck, support, passing lane, shot lane, defender, puck carrier, pressure, breakout, entry, middle lane
- **Snippet:** line 4: "id": "Q-2v1-001-A2-U7",
- **Decision:** TODO - full animated scenario / variant / keep static

### 10. src\data\backups\questions-2026-05-04T01-32-06-431Z.json

- **Score:** 59
- **Suggested use:** Convert into full animated scenario
- **Matched terms:** 2-on-1, 2v1, rush, gap control, gap-control, forecheck, backcheck, support, passing lane, shot lane, defender, puck carrier, pressure, breakout, entry, middle lane
- **Snippet:** line 4: "id": "Q-2v1-001-A2-U7",
- **Decision:** TODO - full animated scenario / variant / keep static

### 11. src\data\backups\questions-2026-05-04T01-36-55-506Z.json

- **Score:** 59
- **Suggested use:** Convert into full animated scenario
- **Matched terms:** 2-on-1, 2v1, rush, gap control, gap-control, forecheck, backcheck, support, passing lane, shot lane, defender, puck carrier, pressure, breakout, entry, middle lane
- **Snippet:** line 4: "id": "Q-2v1-001-A2-U7",
- **Decision:** TODO - full animated scenario / variant / keep static

### 12. src\data\backups\questions-2026-05-04T01-39-17-914Z.json

- **Score:** 59
- **Suggested use:** Convert into full animated scenario
- **Matched terms:** 2-on-1, 2v1, rush, gap control, gap-control, forecheck, backcheck, support, passing lane, shot lane, defender, puck carrier, pressure, breakout, entry, middle lane
- **Snippet:** line 4: "id": "Q-2v1-001-A2-U7",
- **Decision:** TODO - full animated scenario / variant / keep static


## Recommended Variant Candidates

### 1. docs\specs\2026-06-16-scenario-variation-generator-design.md

- **Score:** 5
- **Suggested use:** Use as a harder variant of an existing animated play
- **Matched animation terms:** defender
- **Matched variant terms:** late, blocked
- **Snippet:** line 18: reads) to drive traffic INTO the app. Worth doing later; not this project.
- **Decision:** TODO - attach to existing play / create new variant family / keep static

### 2. docs\superpowers\plans\2026-06-11-mobile-scenario-review.md

- **Score:** 5
- **Suggested use:** Use as a harder variant of an existing animated play
- **Matched animation terms:** entry
- **Matched variant terms:** fall, late
- **Snippet:** line 7: **Architecture:** A lazy-loaded screen in the existing React SPA (custom hash/`screen`-state routing in `src/App.jsx`). Pure logic lives in a Vite-free `src/review/reviewCore.js` so it's unit-testable with plain `node` (
- **Decision:** TODO - attach to existing play / create new variant family / keep static

### 3. docs\superpowers\specs\2026-06-13-rinkreads-doctor-design.md

- **Score:** 5
- **Suggested use:** Use as a harder variant of an existing animated play
- **Matched animation terms:** entry
- **Matched variant terms:** late, trailer
- **Snippet:** line 10: get added and removed. It runs a deterministic health pass at most once every 24
- **Decision:** TODO - attach to existing play / create new variant family / keep static

### 4. src\scenario\ScenarioEditor.jsx

- **Score:** 5
- **Suggested use:** Use as a harder variant of an existing animated play
- **Matched animation terms:** defender
- **Matched variant terms:** late, blocked
- **Snippet:** line 4: // all with LIVE validation (the same schema + hockey rules that gate a seed)
- **Decision:** TODO - attach to existing play / create new variant family / keep static


## Selection Notes

Pick 5–10 from this list for the first retrofit build. Prioritize scenarios where the correct answer depends on spacing, pressure, lanes, timing, or body position.


## Selected For Conversion

These were selected as the first retrofit conversions because they are spatial, coachable, and require reading pressure, lanes, or body position.

- Gap control: Hold the middle
- Forecheck pressure: Force the wall
- Backcheck recovery: Pick up the middle
