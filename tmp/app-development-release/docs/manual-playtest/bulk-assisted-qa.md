# Bulk-Assisted Scenario QA Checklist

Use this after each controlled bulk batch.

## Automated Gate

Run:

```powershell
npm run check:bulk
```

The batch should not be committed unless the gate passes.

## Manual QA

Test at least one play from the batch in each mode:

- U7/U9
- U11/U13
- U15/U18

## U7/U9 Check

- One clear question.
- No F1, F2, D1, A1, A2, or BC1 language.
- Labels are simple: YOU, Helper, Puck, Open, Goalie.
- Cue label is short and does not cover the play.
- Answer choices are short.
- Reveal text is short.
- The play feels like a visual read, not a written quiz.

## U11/U13 Check

- Uses plain hockey language.
- Avoids film-room shorthand unless clearly taught.
- Answer text matches screen labels.
- Cue and reveal connect logically.
- No disconnected second question.

## U15/U18 Check

- Film-room language is acceptable.
- Tactical shorthand must match rink labels or be clear from context.
- The read is still hockey-accurate.
- The cue change is meaningful.

## Logic Check

For every play:

- The cue creates the decision.
- The correct answer follows from the visible cue.
- Wrong answers teach a real mistake.
- Reveal shows the consequence.
- A second question only exists if a new visible cue appears.
- If no new cue exists, use a terminal reveal instead.

## Visual Check

- Rink is not cluttered.
- Cue label does not cover players.
- Skate trails and arrows do not reveal the answer too early.
- The most important read is visually obvious after reveal.
- Meaning does not rely on color alone.

## Telemetry Check

Open:

```powershell
code docs\prototype-telemetry-report.md
```

Confirm:

- No young-language warnings.
- Snapshots reflect player-facing text.
- Changed questions produce changed signatures.

## Scenario Family Check

Open:

```powershell
code docs\scenario-families-report.md
code docs\factory\next-scenario-variants.md
```

Confirm:

- New plays belong to a family.
- The next-variant queue updates.
- The batch strengthens a planned progression.
