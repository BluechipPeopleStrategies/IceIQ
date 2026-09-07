# Phone read flow and coach input

September 5, 2026. Bounded overnight quality continuation under the owner direction to review and improve touched surfaces. U9 and U11 content, saved choices, judging boundaries and branch geometry remain unchanged.

## Observed problems

At 390 × 844, submitting a U11 first choice from the lower answer panel left the next rink partly above the viewport and the new question below it. The existing phase focus uses `preventScroll`, and the stacked layout puts the question after the whole board. Independently, Coach Lab captures game keys even when live play is paused, and numeric coordinate fields convert an empty string to zero.

## Narrow implementation

- On the stacked layout only, show the current read prompt and one cue above the rink. Desktop retains its adjacent question panel. Use a single visible heading for the current read and the correct focus destination at each layout.
- Return to the board once after a successful first choice, target choice, replay or reset. Do not scroll for validation errors, automatic playback ticks/freezes, route edits, dragging, pause/resume or age selection. Skip movement when the board is already in view. Completion stays at the reflection. Cancel pending navigation when the lesson unmounts and honour reduced motion.
- Limit Coach Lab game keys to its focused, running play surface. Pause, blur and Escape release held input. Editing a coordinate must not commit a blank field as zero.
- Buffer incomplete coordinate text (including minus signs and negative decimals) until it becomes a finite number. Pause the Coach Lab clock on coordinate focus so the field cannot remount under the user. Resume a paused practice from the same frame; restart only a finished practice.

## Verification

Reproduce and compare actual phone viewports before/after a submitted choice, normal and reduced motion, touch targets, route editing and completion. Confirm desktop focus, age-picker focus and saved reflections still work. Exercise Coach Lab keyboard capture/release and blank-coordinate behavior. Run relevant tests and the production build, scope the commit, publish, then verify the live origin. Browser emulation does not establish physical phone keyboard or GPU behavior.

Implemented and locally verified at 02:37 Edmonton. All 189 practice tests and the production build pass. Independent reviews identified the reduced-motion replay timing and active-coordinate remount issues; both were fixed and checked in the browser. See the current section of `docs/one-on-one/verification.md` for actual flows and limits. Live publication is recorded separately after verification.
