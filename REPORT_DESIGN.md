# RinkReads Game Sense Profile Report

## Overview
Multi-dimensional breakdown of player's hockey game sense using a 6-competency radar chart, peer comparison, and monthly trend analysis.

---

## 1. The 6 Competencies (Spider Chart Axes)

Each competency is derived from question categories in the existing question bank:

| Competency | Questions Map | Definition | Effort |
|---|---|---|---|
| **Positioning** | u11q1–u11q7, u13_zc_1–u13_zc_2 | Reading the play, zone awareness, spacing | 25 Qs |
| **Decision-Making** | u11q8–u11q15, u13q1–u13q10 | Speed & quality of choices under pressure | 30 Qs |
| **Awareness** | u13q11–u13q20, u15q1–u15q8 | Field vision, anticipation, predicting opposition | 25 Qs |
| **Tempo Control** | u15q9–u15q16, u18q1–u18q8 | Pace judgment, transition timing, rhythm management | 20 Qs |
| **Physicality** | Mistake type (body contact, intensity errors) | Effort, engagement, competitive edge | 15 Qs |
| **Leadership** | Next type (setting up teammates), Zone-click (passing plays) | Influencing teammates, creating for others | 15 Qs |

**Score Calculation per Competency:**
- Accuracy % of all questions tagged with that competency
- Normalized to 0–100 scale
- Percentile rank vs. all players at that level

---

## 2. UI Layout

### Main Container: 3-Column Layout

```
┌─ Report Header ─────────────────────────────────────────────┐
│ Game Sense Profile · Cole Gretzky (U11 Forward)             │
│ 71 GS Score · Updated today                                │
└─────────────────────────────────────────────────────────────┘

┌─ Left (Spider) ──────┬─ Center (Stats) ──────┬─ Right (Peer) ───┐
│                      │                       │                  │
│   [RADAR CHART]      │ • Positioning: 82%    │ Your Percentile: │
│   6 axes spinning    │ • Decision: 74%       │ 🟢 Top 18%       │
│                      │ • Awareness: 61%      │                  │
│                      │ • Tempo: 78%          │ Peer Comparison: │
│                      │ • Physicality: 88%    │ • Positioning    │
│                      │ • Leadership: 71%     │   Avg: 75%       │
│                      │                       │   You: 82% ✓     │
│                      │                       │                  │
│                      │ Strongest: Physicality│ • Awareness      │
│                      │ Needs Work: Awareness │   Avg: 68%       │
│                      │                       │   You: 61% ↓     │
└──────────────────────┴───────────────────────┴──────────────────┘

┌─ Month-over-Month Trend ────────────────────────────────────┐
│ Game Sense Score Trajectory                                 │
│                                                              │
│ 90 ┤                                                         │
│    │         ╱╲                                              │
│ 70 ┤   ╱╲  ╱  ╲                                              │
│    │  ╱  ╲╱    ╲╱─ 71 (now)                                 │
│ 50 ┤╱                                                        │
│    ├─────────────────────────────────────────────────────    │
│    4wk 3wk 2wk 1wk Now      Trend: +8 pts (↑14% growth)     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Visual Design

### Spider Chart (SVG)
- **Center circle:** Player's average GS across all 6 axes
- **Outer ring:** 100% (perfect score) — gold/green
- **Each axis:** Labeled at top, values at 25/50/75/100 marks
- **Colors:**
  - Fill: Semi-transparent purple (rgba(124,111,205,0.2))
  - Border: Gold (#c9a84c) — 2px
  - Axes: Dimmer lines
  - Strong areas: Green tint on fill
  - Weak areas: Red tint on fill

### Stats Card (Right)
- **Percentile badge:** Green if >60th, yellow if 40–60th, red if <40th
- **Individual competency bars:** Horizontal bar for each, color gradient left→right
- **Peer avg line:** Dashed line at peer mean for comparison
- **Trend mini icons:** 🔺 (improving) / 🔻 (declining) / ➡️ (flat)

### Trend Chart (Bottom)
- Line chart showing GS score last 4 weeks
- Dots at each week with value label
- Smooth curve interpolation
- Growth % and trend direction in corner

---

## 4. Peer Comparison Data

**Cohort Definition:**
- Same level (U9, U11, U13, etc.)
- Same position (Forward, Defense, Goalie, or "All")
- Last 30 days of quiz activity
- Minimum 5 sessions to be included in peer set

**Calculations:**
- Mean GS score per competency
- Std dev + percentile ranking (25th, 50th, 75th, 90th)
- **Your rank:** "Top X%" (e.g., "Top 18%")

**Display:**
- Mini table showing you vs. peer mean for each competency
- Green upward arrow if you're above peer mean
- Red downward arrow if below
- Gray if at mean ± 2%

---

## 5. Data Requirements

### From existing schema:
- `quizHistory[].results[]` — per-question performance (id, ok, d, type, cat)
- `player.level`, `player.position`
- Timestamp of each result (`completedAt`)

### Need to add:
- Question tagging by competency (in QUESTIONS constant)
  ```js
  {
    id: "u11q1",
    competency: "positioning",  // NEW FIELD
    // ... existing fields
  }
  ```

### New calculation functions:
- `calcCompetencyScore(results, competency)` — % correct for competency
- `calcPeerStats(level, position)` — mean/std dev per competency
- `getPercentileRank(playerScore, peerMean, peerStd)` — z-score → percentile

---

## 6. Implementation Phases

**Phase 1 (MVP):** Spider chart + stats, hardcoded peer data
- Radar SVG component
- Stats card with individual competency scores
- Month-over-month GS trend line chart
- ~3–4 hours dev

**Phase 2:** Dynamic peer comparison
- Query session history across all users at level/position
- Real peer stats calculation
- Percentile ranking update
- ~2 hours

**Phase 3:** Competency tagging
- Add `competency` field to all 880 questions
- Batch tag by category patterns (u11q1–7 = positioning, etc.)
- Validation script to ensure coverage
- ~2–3 hours (mostly manual tagging)

---

## 7. Expected Impact

- **Engagement:** Radar chart is 3–4× more engaging than tables
- **Actionability:** Shows clear strengths (reinforce) + weaknesses (coach on it)
- **Motivation:** Percentile rank + peer comparison drives engagement
- **Retention:** Players return to check "Did I improve?" (weekly trend view)

---

## Recommendation

**Start with Phase 1 (MVP):** Radar chart + stats card + hardcoded peer baseline. 
- Takes ~1 sprint
- Deployable immediately
- Can validate if players find it useful before investing in Phase 2 real peer data

Then add Phase 2 (real peer comparison) once we have 100+ active players for statistical validity.
