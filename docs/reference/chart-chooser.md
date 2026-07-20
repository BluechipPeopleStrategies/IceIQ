# Chart Chooser — form-selection framework

Source: "Chart Chooser" by Stephanie Evergreen (Evergreen Data), downloaded
2026-07-11. Image copy: [chart-chooser.png](chart-chooser.png).

Standing framework for **picking the chart form** (not the styling) anywhere
RinkReads shows a chart — coach analytics (`coachAnalytics.jsx`), training log
(`trainingLogCoach.jsx`), progress snapshots, Game Sense Score trends. Answers
"what should this even be?" before any color/mark work.

## How this fits with the `dataviz` skill

The `dataviz` skill owns execution (color formula, mark specs, interaction,
accessibility, dark mode) — run it for any chart that ships. Its step 1, "Pick
the form," is where this framework plugs in:

1. **Name the communication job** using the categories below (what does the
   coach/parent/player need to walk away understanding?).
2. **Pick the chart type** Evergreen lists for that job.
3. Hand off to the `dataviz` skill for color, marks, interaction, and the
   accessibility pass — RinkReads' red/green colorblind rule (never color-alone,
   see `src/OverlayLayer.jsx` accessibility note) applies to charts too.

If a row says "Don't Visualize," that's the answer — a stat tile or plain text
beats a forced chart.

## The framework

| Communication job | Chart types (pick one) |
|---|---|
| **When a single number is important** | Big Number, Icon Array, Pie/Donut, Bar/Column |
| **How 2+ numbers are alike (or not)** | Side by Side, Slopegraph, Back-to-Back, Dot Plot, Dumbbell Dot, Small Multiples |
| **How we are better than a benchmark** | Benchmark Line, Combo, Bullet Chart, Indicator Dots, Overlapping Bar |
| **What the survey says** | Stacked Bar, Diverging Bar, Aggregated Bar, Bump Chart, Lollipop, Nested |
| **When there are parts of a whole** | Don't Visualize, Pie/Donut, Stacked Bar, Histogram, Tree Map, Map |
| **How things changed over time** | Line, Stacked Column, Deviation Bar, Slopegraph, Vertical Dots, Sankey |
| **How this changes when that does** | Scatterplot, Connected, Draw It, Don't Visualize |

## Notes for RinkReads use

- Game Sense Score over the season, streaks → "how things changed over time"
  (line, or vertical dots per session).
- Player vs. team average, or vs. age-group benchmark → "better than a
  benchmark" (bullet chart / benchmark line) — fits the `COMPETENCY_LADDER`
  normative-anchor pattern already used in text (`src/data/constants.js`).
- Coach roster comparing multiple players' GS → "2+ numbers are alike (or not)"
  — small multiples or dot plot over a grouped bar, so no player's mark reads as
  a rank/threat.
- Skill-category breakdown (e.g. skating/passing/shooting mix) → "parts of a
  whole" — stacked bar preferred over pie per the `dataviz` non-negotiables.
