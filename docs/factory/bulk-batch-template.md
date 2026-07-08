# Bulk-Assisted Scenario Batch Template

Use this before generating a batch of new animated RinkReads plays.

## Batch Rule

Current maximum batch size: **3 plays**.

Do not increase batch size until two consecutive 3-play batches pass validation, build, telemetry, and manual playtest review.

## Batch Name

Example:

- Batch 001: 2-on-1 and recovery reads

## Batch Goal

What player decision pattern is this batch strengthening?

Example:

- Help players recognize when a 2-on-1 is not an automatic pass.

## Batch Size

- Planned plays:
- Scenario families included:
- Age bands supported:

## Variant 1

- Title:
- Scenario family:
- Cue:
- Correct decision:
- Common mistake:
- Format:
  - single question + reveal
  - route choice
  - true re-read
- U7/U9 question:
- U11/U13 question:
- U15/U18 question:
- Correct answer text:
- Wrong answer text:
- Reveal text:
- Cue label:
- Telemetry expectation:

## Variant 2

- Title:
- Scenario family:
- Cue:
- Correct decision:
- Common mistake:
- Format:
- U7/U9 question:
- U11/U13 question:
- U15/U18 question:
- Correct answer text:
- Wrong answer text:
- Reveal text:
- Cue label:
- Telemetry expectation:

## Variant 3

- Title:
- Scenario family:
- Cue:
- Correct decision:
- Common mistake:
- Format:
- U7/U9 question:
- U11/U13 question:
- U15/U18 question:
- Correct answer text:
- Wrong answer text:
- Reveal text:
- Cue label:
- Telemetry expectation:

## Required Checks

Before committing the batch, run:

```powershell
npm run check:bulk
```

## Commit Rule

Do not use:

```powershell
git add .
```

Stage only the files created or intentionally changed by the batch.
