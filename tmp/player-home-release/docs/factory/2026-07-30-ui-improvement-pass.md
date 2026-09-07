# UI improvement pass — summary, research, and what shipped

**Status:** two changes live, tested, committed (`ecdc700`), not pushed.

## The last couple of days, in brief

Everything below is `feature/shareable-beta`, 2026-07-29 to 2026-07-30, 15
commits:

- **Foundation (7/29):** scenario-engine research corpus, the 11-phase
  implementation plan (still unapproved — planning only, not authorized),
  and the framework-fit decisions that govern it (free-only, attended-
  session-only Claude judgment, conservative safety-first).
- **The breakout scenario (7/30):** wired the flagship D-zone breakout play
  into the catalog; fixed a real 11.5-unit "behind the net" position drift
  (real bug, not stylistic); fixed a false-positive validator gate that had
  been silently reporting every play clean regardless of actual errors.
- **Trust infrastructure (7/30):** built `validateAnchorFidelity` (catches
  position drift against named rink landmarks, point and line-segment
  both); built the gate-8 blind second-pass judgment mechanism (two
  independent Claude reviews, zero cross-visibility, both must agree clean
  — modeled on double-reading mammography, never auto-promotes on
  agreement alone); ran a live proof of both.
- **Closing the guessability gap (7/30):** the breakout's correct tap zone
  was also the zone farthest from any opposing icon — guessable with zero
  hockey reading. Two geometric fixes closed two of three ways to exploit
  that; the third needed a genuine mitigation, not geometry: a
  justification-step follow-up question, gated by the SAME
  content-answer-quality process built this session — four rounds of blind
  adversarial review, three of which each caught something real (a cue that
  leaked the answer, a distractor set solvable by word-counting, letter
  codes that silently broke for two of four target age bands) before
  landing clean.
- **The catalog-wide sweep (7/30):** reviewing a 3-play kernel batch for
  promotion through that same gate-8 process surfaced two systemic defects
  that traced back into the *live* catalog, not just the candidates under
  review — full detail in
  `docs/factory/2026-07-30-kernel-batch-001-gate8-review.md`:
  - The correct answer sat at a **fixed button position** across most of
    the catalog (62% of question nodes first, the entire 2-on-1 family
    second) — 85% of real question nodes solvable by "try button 1, then
    button 2," zero hockey reading. Fixed at the renderer level (shuffles
    per question), protecting the whole catalog going forward.
  - Mirroring a play to its far-side variant silently skipped two
    coordinate fields, with no validator catching it. Harmless today, real
    the moment anyone mirrors a play using those fields. Fixed.
  - Plus a family-classification gap (13 of 25 plays were correctly
    categorized by accident, not by design) and 4 small live copy bugs
    (grammar, a mispositioned cue) the same review caught.

None of this was "add more content" — every fix this session tightened
something already shipped or already queued to ship. The kernel batch that
started this (3 new plays) is still held, not promoted: both blind review
passes rejected all three, for reasons documented in that file. That's the
gate working, not a setback.

## Tonight's task: find and fix real UI problems

Before touching anything, I opened the actual running app (Playwright,
mobile viewport, the real dev-bypass flow) rather than reasoning from data
alone — the previous fixes were all backend/content; this was the first
time this session anyone actually looked at the rendered product.

**What's already there and working well, worth naming:** a full Duolingo-
style world map (8 worlds, streak counter, daily/weekly challenges, a
"Brain Gym"), a Game Sense spider chart, coach dashboard preview, and a
button-based scenario screen that's already well-laid-out (the 2-on-1 read
screenshot below fills its space cleanly). The app is further along than a
quick read of the scenario-engine code alone would suggest.

**What wasn't:**

1. The "Read the Play" list — 20+ scenario cards — showed the raw internal
   concept slug as the category tag on every single card:
   `off-puck-support-offense`, `backcheck-recovery`, `2-on-1-support-flat`,
   `odd-man-reads` all visible verbatim to players and parents.
2. Tap-zone ("lane-pick") scenarios — the flagship interaction type, no
   button list by design — had nothing on screen telling a first-time
   player *how* to answer beyond four small numbered dashed circles, and
   visibly under-used the screen's height next to button-based scenarios.

## What other platforms do about it (researched, not assumed)

Three parallel research passes, public sources only:

- **Category labels:** Duolingo, Khan Academy, and Codecademy all
  translate internal taxonomy to a distinct human-facing name — none
  surfaces a raw slug to a user. Duolingo's own home-screen redesign
  specifically moved away from terse internal-feeling labels ("City 3")
  toward natural language ("get directions").
- **Diagram-based decision screens:** chess.com, Duolingo, and Wordle all
  size the diagram to the viewport width and then make the *interaction
  mechanism itself* — not decoration — fill the remaining space (Wordle's
  keyboard, Duolingo's stretchy answer rows). Chess.com's own forum has
  active complaints about a mascot crowding the board instead — evidence
  this is a real, not hypothetical, failure mode.
- **Friend/foe clarity in a diagram** (researched, informed the check but
  didn't change anything): the standard convention is shape/fill, not
  color alone — RinkReads' existing X-mark-on-defenders system already
  matches this.

## What shipped

**1. Category labels now use the real family name**
(`src/play/ReadThePlay.jsx`) — reuses the `SCENARIO_FAMILIES` titles
already fixed catalog-wide earlier tonight, so this also incidentally
fixes the three-different-names-for-one-family problem
("2-on-1 reads"/"2-on-1-support-flat"/"odd-man-reads" all now read
"2-On-1 Reads"). Confirmed live: every card in the list now shows a clean
name, zero raw slugs remaining.

**2. A "tap the ice" instruction for lane-pick scenarios**
(`src/play/AnimatedPlay.jsx`) — states the interaction explicitly instead
of leaving it implied, styled to visually match the gold dashed zone
markers it refers to. Age-aware copy (simpler for the youngest band).

**Bonus, found by the same live inspection:** the justification-step cue
built earlier tonight (`dzBreakoutEscapePressure.js`) was rendering
clipped and overlapping the net-corner actor tokens — its 20-unit-wide
pill was centered 2.5 units past the edge of the visible rink. Caught only
because I looked at a screenshot instead of trusting the data; fixed and
re-verified visually.

All three confirmed via actual before/after screenshots in the live app,
not just code review. Full test suite green (149 tests), production build
clean, committed (`ecdc700`), not pushed.

## What I didn't touch, and why

- The general Quiz screen (`src/App.jsx:2254`) has the identical raw-slug
  pattern (`{q.concept}`, no cleanup at all) for its own, separate
  question-bank taxonomy (290+ questions, loaded dynamically — the static
  `bank.json` is empty, so the real data lives somewhere I haven't
  investigated this session). Flagging it as the same bug, not fixing it
  blind.
- Didn't attempt a deeper layout rebuild of the lane-pick screen (bigger
  rink, restructured card). The empty space below the card is real, but
  the "card in a dark background" pattern is the whole app's established
  visual language, not unique to this screen — a much bigger diagram would
  read as inconsistent with everything else rather than better, and I
  don't have a way to user-test that judgment call tonight.
