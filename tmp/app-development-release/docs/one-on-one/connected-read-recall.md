# Recalling the play the learner created

September 5, 2026. Coach-review draft within the authorised overnight framework work.

## Teaching intent and scope

The owner asked for connected hockey decisions and varied ways to show comprehension, rather than a stack of multiple-choice questions. This optional exercise follows a completed U9 or U11 play. The learner puts its actual moments in order and can explain a change. It checks the chronology shown in this app. It does not establish tactical correctness, scanning skill, memory ability, mastery or on-ice improvement.

`docs/library/scanning.md` supports noticing information before and after receiving and simpler U9 cue demands. `off-puck-support-offense.md` supports discussion of the space and passing option after possession changes. `odd-man-reads.md` distinguishes observing a committed event from guessing an opponent's unknown intent. These notes motivate the interaction; they do not validate a recall intervention or its card count.

## Three moments, derived from the chosen branch

`readSequenceRecall.js` validates a completed session through the existing reflection serializer/restorer. It derives exactly the opening, the chosen first consequence and the chosen second consequence. All eleven U9/U11 paths retain their real actors and puck ownership. Short recall-specific captions describe those pictures; teaching prompts containing phase references or new instructions are not reused. Each card offers a larger rink view with the corresponding accessible description.

U9 fixes the opening and reverses the other two pictures. U11 begins with all three pictures out of order. Earlier/Later buttons support touch and keyboard use, with focus following the moved card. The numbers describe the learner's current arrangement. Read aloud follows that arrangement and stops when it changes.

The final support plan is deliberately outside the order check. A valid direct placement can keep the same position; a looped route can return to its origin. Both can duplicate the preceding board. The separate changed-cue exercise is an alternative opening, not a later moment. Neither becomes an extra ordering card. A U11 loose-puck branch can also have very subtle differences between its two consequence boards; text and the larger view avoid relying only on tiny marker changes.

## Feedback, help and local records

Check my order reports whether the arrangement matches the authored chronology. A mismatch invites another look; a match invites discussion of what changed. Neither adds XP, a tactical grade, mastery or an AI request. Optional reasons are up to 600 characters.

Check saves the order and note in a separate device-local `:recall` key scoped by player and scenario. Download recall exports that separate JSON record. Its exact basis contains the existing reflection without its separate changed-cue answer, plus the actual recalled card states and captions. This prevents a stale record from following a changed branch, support plan, original explanation or source picture. It leaves the original reflection and AI payload byte-identical. The record repeats some information already in the local reflection; it is not sent to a server or shared across devices.

Show the order records `usedAnswer: true` immediately so reload cannot turn an assisted attempt into an unassisted one. Subsequent mismatch feedback still describes the current arrangement. Mix again retains the help flag. Unchecked order/note drafts survive replay and age switching while the connected-read view remains open. Editing a checked note marks it unsaved until Check is used again. Start over clears only the current scope's reflection, recall record and in-memory recall draft. Storage failures are reported without claiming a save.

## Verification and limits

Nineteen new recall/storage tests cover all eleven paths and all 66 permutations, fixed U9 openings, malformed/foreign/sparse IDs, immutable snapshots, unchanged/looped support, legacy restore, replay, binding changes, assistance fields and preservation of original reflection/AI data. The integrated practice suite has 208 passing tests.

Browser checks cover U11 wrong → reordered match, JSON download, saved reload, unchanged original reflection, assistance followed by a wrong order, read-aloud cancellation, unfinished notes across replay and age switches, larger-view focus return, U9 actual touch input, fixed opening and same-attempt reset isolation. Production build and live verification are recorded in `verification.md` and `phone-preview.md` when completed.

This remains new draft teaching content. Browser emulation does not replace a physical-device check or coach/child comprehension review. The core play engine, original scenario bank, routes and independent judging boundaries remain unchanged.
