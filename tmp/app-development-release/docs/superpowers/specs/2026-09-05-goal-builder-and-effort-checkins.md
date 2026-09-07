# Goal builder and effort check-ins

Date: 2026-09-05. Owner direction: Thomas requested stronger goal-setting quality, perceived exertion, and the navy/gold glass treatment. This is the bounded modular implementation handoff; App integration and browser QA belong to the root task.

## Decisions and evidence

- The existing [SMART goals expert review](../../manual-playtest/2026-08-03-smart-goals-expert-review.md) identifies disappearing placeholder guidance, borrowed reasons, distant deadlines, coach-verdict measures, perfection targets and too many simultaneous goals. Its U7 developmental concerns and missing progress loop inform this implementation. It is a structured review through expert lenses, not a clinician's sign-off.
- The new builder keeps guidance visible after typing, offers editable action/measure/practice starters, leaves the player's reason blank, uses a short review date, and shows a readable preview plus check-in history. It recommends one active focus for U7/U9, two for U11/U13, and three for U15/U18; existing extra goals remain intact and can be parked Up next.
- U7 receives an adult-assisted phrase of six words or fewer for the next practice and a simple tried/not yet/not observed check-in. It has no SMART checklist, count ratio, or numeric RPE form. U9 uses simpler starter phrases and optional help; counts are optional from U11. The existing U7 route gate is unchanged by this module and must be handled explicitly by the integrating owner.
- Plan readiness is a drafting check, not proof that the goal is effective, safe, or tactically correct. It checks required fields, a valid present/future review date and the player's confirmation that the action is controllable, observable and feasible. Editing action/measure/schedule resets the corresponding confirmation. An incomplete plan can always be saved explicitly as Draft. The app does not automatically mark a goal achieved after a check-in.
- New starter text is original practice-planning copy. It does not certify a universal gap, checking technique, skating standard, or competitive outcome. The player chooses a cue that fits their actual practice and can request help.

## Perceived exertion source and limits

Primary source opened on 2026-09-05: CDC, [How to Measure Physical Activity Intensity](https://www.cdc.gov/physical-activity-basics/measuring/index.html), dated December 4, 2025, section **Relative intensity**. The page describes person-relative effort and a 0–10 scale with sitting-effort and maximum-effort endpoints. The UI paraphrases those endpoints; it does not label the scale a licensed Borg instrument or a validated pediatric measurement protocol.

RPE is optional and self-reported, with a blank “Not reported” state. A reported 0 remains 0. Session minutes are independent optional context. The module does not prescribe intensity bands, multiply duration by RPE, create an improvement score, infer readiness/recovery, or reward higher effort. The U9 helper reads the prompt; the number remains the player's answer. U7 does not receive this numeric question.

## Integration and persistence contract

- Default export: `GoalBuilder({ player, onSave, onBack })` from `src/goals/GoalBuilder.jsx`.
- Main save invokes `onSave(fullGoals, { navigate: true })`. A check-in invokes `onSave(fullGoals, { navigate: false })` so the existing App handler can retain the screen. `onBack` returns to the existing home route. The component remounts its state on player ID changes.
- Existing category names are persisted keys. All unrelated categories, unknown object fields, and untouched `goal/S/M/A/R/T/completed` strings are preserved. Editing action writes `S` and the summary `goal`; measure writes `M`, practice schedule `A`, personal reason `R`, and chosen review date `T`. An old freeform `T` is displayed and retained until a date is chosen. A raw legacy text-only category is retained as `legacyGoal` if edited.
- Existing App saves locally before syncing. `src/supabase.js` currently syncs only `goal/S/M/A/R/T/completed`. The richer `plan` contains status, support, checks and check-in history; there is no database migration.
- Dedicated supplement key: `rinkreads_goal_plans_v1:<encoded player ID>`, with `{version:1, playerId, goals:{category:fullSavedGoal}}`. Only categories edited/saved through the builder are written. On mount, that player's saved device entries merge over the incoming goals map, preserving remote-only categories. This is the same local-wins policy used by the existing player cache, and keeps metadata/drafts through a normal authenticated reload even when cloud rows omit it. The supplement is per player, independent of the player-cache clearing on sign-out; its UI says device-only. Cross-device metadata sync is not implemented.
- Device writes happen before `onSave`; invalid local data or storage failure blocks a false success message and leaves a visible error. Writes across several edited categories are sequential, so an error can leave earlier categories durably saved; retry is safe. Successful local writes followed by callback failure are described as a saved device copy with an app-save failure.
- Check-ins preserve missing as `null`, never a false zero. “Not observed” clears observation counts. Explicit counted actions cannot exceed observed attempts. Each check-in retains the goal action and measure at that time, so revising a plan does not silently relabel past observations. Recent training sessions can supply date/label/minutes as copied context; no duplicate training-log entry is created.

## Scoped validation

- `node --test src/goals/goalPlanCore.test.mjs`: 11/11 passed. Tests cover immutable legacy preservation, complete and incomplete saves, U7, active focus limits, invalidated self-checks, dates, null/zero effort and observations, per-player reload, storage errors, and no automatic achievement. Initial missing-module RED and a later stale-check RED were observed before their passing implementations.
- esbuild JSX transform and dependency bundle: passed.
- React server rendering passed for U7, U9, U11 and U18, including expected absence/presence of numeric RPE. A first temporary render-check script used an undefined filename with a private Node loader API and failed; the corrected isolated script used the compiled module normally. This was a check-harness error, not an app finding.
- Declared solid-color contrast checks: body text 13.62:1, guidance 9.08:1, gold-button text 10.49:1, input border against input fill 4.15:1. Buttons/selects/text inputs and checkbox/radio label targets are at least 44 CSS pixels. Actual glass compositing, mobile layout, interaction persistence and keyboard traversal still require the integrating owner's browser QA.
- Young-bank wording correction: U7 has 10 scenes/60 questions; U9 has 15 scenes/90 questions. Prose now uses Navy/Gold player names and camera-neutral attacking/defending ends. Actor labels remain `H#`/`A#`/`YOU` for renderer compatibility. Backups are under `%TEMP%/rink-camera-facing-20260905`.

No changes to App.jsx, goalBands.js, trainingLog.js, Supabase schema, TASKS or commits were made by this subtask.
