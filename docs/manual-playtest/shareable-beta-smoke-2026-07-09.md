# UI Smoke Pass — feature/shareable-beta (2026-07-09)

Status: DONE. Ref: `docs/roadmap/2026-07-09-next-7.md` item 1.

Driven automated (Playwright, local `npm run dev`, branch `feature/shareable-beta`
at commit `9562420`). No manual pass was previously recorded for this branch.

## Result: no console errors on any screen tested

One pre-existing, harmless warning throughout: `splash.jpg` preloaded but
unused within a few seconds of load (perf hint only, not a functional issue —
not investigated further here).

## Covered

- [x] Landing page — hero, stat strip, 4 audience CTAs, pricing link, sign-in
      form, sign-up form (via the sample-card prefill), coach-dashboard teaser.
- [x] Sign-in flow — landing sign-in/sign-up toggle renders correctly; full
      credentialed sign-in not exercised (no test account), but the ephemeral
      `?demo=player` preview path (ex-`enterPlayerPreview`) was used as the
      no-login equivalent and works cleanly.
- [x] Skill path (RinkReads Journey) — world map (8 worlds, correct
      locked/unlocked state), node detail panel, "Take a quiz" entry.
- [x] Challenges hub — Daily Drill unlocked; Speed Round / Weekly Challenge
      correctly locked with clear unlock copy.
- [x] Question bank, one seed per age band (all 6 bands present in
      `src/data/bank.json`), via the pre-auth `#q=<id>` preview route:
      - U7 `rev_u7_passing_seam` — clean
      - U9 `rev_u9_passing_seam` — clean
      - U11 `rr-u11-gap-control-1` band, played live (MC + animated
        "Read the Play" kind) through the skill-path quiz flow — clean
      - U13 `rev_u13_oddman_drive` — clean
      - U15 `gen_u15_reading-the-play_sokd` — clean
      - U18 `gen_u18_reading-the-play_5bjz` — clean

## Findings

1. **Fixed as part of this pass**: `#playtest` (the raw play-test harness) was
   completely ungated pre-auth — anyone hitting the URL on the production beta
   build could reach it. Gated to match the dev-bypass panel's real condition
   (`VITE_ENABLE_DEV_BYPASS=1` AND (LS flag or `npm run dev`)) — App.jsx
   commits `10cd249`, `9562420`.
   - **Side effect flagged and fixed**: `docs/manual-playtest/question-kinds-cycle1.md`
     (the next roadmap item) depends on reaching `#playtest` locally under
     `npm run dev`. Added `VITE_ENABLE_DEV_BYPASS=1` to `.env.local`
     (gitignored, local-only) so that workflow still works for the owner.
2. **Cosmetic, not a functional bug**: during the U11 live quiz, the header
   counter ("Question 2 of 7") advances one step ahead of the visible question
   while the answer-feedback panel for the question you just answered is still
   showing. Content is correct once you click "Next Question" — the counter is
   just optimistic. Not blocking; worth a look if it reads as confusing in
   practice.
3. **Content depth note, not a bug**: U18 / Midget has only 1 live question in
   `bank.json` (vs. 156 for U11). Not a smoke-test failure, but a real player
   in that band would run out of content immediately after signing up.

## Not covered (needs a human)

- A real credentialed sign-in / sign-up round-trip against Supabase (no test
  account was available to this pass).
- Visual/design QA (spacing, mobile viewport, animation feel) — this pass
  checked functional correctness and console health only.

## Verdict

Nothing found here should block sending the beta link, aside from the
`#playtest` gap, which is now fixed. Item 1 is clear to close.
