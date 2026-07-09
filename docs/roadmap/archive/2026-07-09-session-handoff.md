# Session Handoff — feature/shareable-beta (2026-07-08 → 2026-07-09)

Written for a tool switch (Claude Code → Codex). Covers what happened
yesterday (from git history) and today (this session, live-driven).
Canonical priority doc remains `docs/roadmap/2026-07-09-next-7.md` — this
file is status/context on top of it, not a replacement.

## Where things stand right now

Branch: `feature/shareable-beta`. Item 1 of the next-7 roadmap ("finish the
beta smoke pass and share the link") is functionally done except for the
actual send — auth is confirmed working end-to-end as of this session.

## Yesterday (2026-07-08) — from git log

- `a77a6ce` Skill Path: Duolingo-style curriculum path from the locked ledger
- `8ff8eb0` U11 launch bank: 156 ledger-tagged questions across all 31 concepts
- `c5ba383` Meta layer v1: Challenges hub with path gates, Leak Finder, era identity
- `2ba9554` fix: remove duplicate display style
- `e113b54` **fix: hide dev bypass panel for beta** (16:08) — gated the
  dev-bypass panel (and all three of its unlock methods: LS flag, `?devbypass=`
  URL param, hidden 5-tap pattern) behind `VITE_ENABLE_DEV_BYPASS=1`. This is
  the commit that caused today's "auth wasn't working" report — see below.

Also yesterday: Thomas ran a manual UI smoke test of `feature/shareable-beta`
that wasn't written up anywhere (no doc existed until today — see below).

## Today (2026-07-09) — this session, in order

1. **Surveyed the test suite.** No test framework installed (no vitest/jest/
   playwright). 19 hand-rolled `*.test.mjs` files + ~15 `scripts/test-*.mjs`,
   wired as 21 separate `npm run test:*` scripts in `package.json`. No
   umbrella `npm test`, no CI running any of them. Not changed — just
   documented for whoever picks this up next.

2. **Found the canonical next-step doc**: `docs/roadmap/2026-07-09-next-7.md`
   (dated today). Item 1 = finish the beta smoke pass, gate `#playtest`, then
   send the beta link.

3. **Fixed `#playtest` gating** (was fully open pre-auth — anyone hitting the
   URL on the production build could reach the raw play-test harness):
   - `10cd249` fix(beta): gate #playtest harness route behind dev-bypass
   - `9562420` fix(beta): #playtest gate also requires VITE_ENABLE_DEV_BYPASS=1
     (first pass missed that the real dev-bypass-panel gate at `App.jsx ~6829`
     requires the env flag even under `npm run dev`, not just `import.meta.env.DEV`)
   - Verified in-browser both ways: `#playtest` falls through to the normal
     landing page without the flag, and renders the harness with it set.

4. **Ran the UI smoke pass myself** (Playwright, local dev server) since no
   written record existed: landing page, sign-in/sign-up forms, the no-login
   `?demo=player` preview path, the Skill Path world map, the Challenges hub,
   and one live question per age band (U7 `rev_u7_passing_seam`, U9
   `rev_u9_passing_seam`, U11 played live through the real quiz flow, U13
   `rev_u13_oddman_drive`, U15 `gen_u15_reading-the-play_sokd`, U18
   `gen_u18_reading-the-play_5bjz`). Zero console errors anywhere except one
   harmless `splash.jpg` preload warning.
   - Write-up: `docs/manual-playtest/shareable-beta-smoke-2026-07-09.md`
   - Committed: `dab4e99`
   - Two non-blocking notes in that doc: (a) the quiz question-counter ticks
     up one step ahead of the visible question during the answer-feedback
     beat — cosmetic only, self-corrects on "Next Question"; (b) U18/Midget
     has only 1 live question in `bank.json` vs 156 for U11 — a real content
     depth gap, not a bug.

5. **Side effect caught and fixed**: `docs/manual-playtest/question-kinds-cycle1.md`
   (roadmap item 2) depends on reaching `#playtest` locally under `npm run dev`.
   Added `VITE_ENABLE_DEV_BYPASS=1` to `.env.local` (gitignored, local-only,
   NOT committed — this is machine-local config) so that workflow still works.

6. **Debugged "yesterday the auth wasn't working."** Root-caused via
   systematic debugging (not guessed):
   - First hypothesis (partially right): the dev-bypass panel Thomas normally
     used to skip real login vanished after `e113b54` with no env flag set
     locally. Confirmed and fixed by step 5 above.
   - Thomas clarified he'd actually tried a **real authorized account**
     (`mtslifka@gmail.com`), not just the bypass panel, and hadn't gotten to
     testing it yet as of this conversation.
   - Live-tested real sign-up with `mtslifka@gmail.com` / `12345678!` myself
     (with explicit permission). First attempt failed with
     `net::ERR_NAME_NOT_RESOLVED` on `ozebfpwunrciqhkjeeia.supabase.co` —
     confirmed independently via `nslookup`/`curl` outside the browser too
     (NXDOMAIN), while unrelated domains resolved fine. This ruled out a
     sandbox/network issue and pointed at the Supabase project itself.
   - Thomas checked the Supabase dashboard: **the project was paused**
     (Supabase free-tier auto-pause). He resumed it.
   - Retried: hit a transient Cloudflare `521 Web server is down` (edge back,
     origin still booting — normal right after an unpause) and a
     CORS-shaped error that was really just the 521 error page lacking CORS
     headers, not a real CORS misconfig.
   - Polled `/auth/v1/health` until it returned real responses, then retried
     sign-up: got `422 User already registered` — a genuine app-layer
     response, proving the backend is fully back. Tried sign-in with a
     guessed password: got `400` (invalid credentials, expected) — also a
     real response.
   - **Conclusion: auth is fully working now.** The account
     `mtslifka@gmail.com` already existed in this Supabase project from prior
     dev work (role: player, since the role toggle defaults to `"player"` and
     wasn't touched — the "Parent/Guardian (on behalf of player)" option maps
     to that role).
   - Nothing to fix in code here — this was entirely a Supabase
     pause/resume timing issue, not a bug.

## Commits made this session (branch `feature/shareable-beta`)

```
dab4e99 docs: UI smoke pass record for feature/shareable-beta
9562420 fix(beta): #playtest gate also requires VITE_ENABLE_DEV_BYPASS=1
10cd249 fix(beta): gate #playtest harness route behind dev-bypass
```

None pushed. `.env.local` was edited (added `VITE_ENABLE_DEV_BYPASS=1`) but
that file is gitignored by design — not a commit.

## What's actually left on roadmap item 1

Auth is confirmed working; the smoke pass is done and written up. The only
remaining piece is **sending the beta link to real users** — a judgment call
on timing/channel, not a technical blocker anymore.

## Known non-blocking issues (not touched this session)

- Deferred, separate bug: sign-in "flash" (auth-gate render race) — on
  successful real sign-in, the UI briefly bounces back to the login form
  before recognizing the session. Cosmetic; Thomas chose to defer this
  2026-06-12. Memory: `project-rinkreads-signin-flash`.
- Doctor checkup (`npm run doctor`, last run 2026-07-08 fast pass): 0 bank
  issues, 0 seed errors (10 non-blocking content warnings), 0 broken imports,
  15 unused files + 4 cruft `.bak`/`.tmp` files flagged as cleanup candidates.
- Working tree has a lot of untracked files beyond this session's work
  (image-pipeline output, `docs/ai-pipeline/*`, and a few oddly-named files
  like `hell warning`, `t npmCommand`, `ersmtsliIceIQ` that look like
  accidental terminal/paste artifacts) — not touched, flagged only.

## Next up after item 1 (from docs/roadmap/2026-07-09-next-7.md)

2. Manual playtest gate — `docs/manual-playtest/question-kinds-cycle1.md`.
   Needs Thomas's judgment on two embedded design decisions (predict-next
   red-flash treatment; verdict judge-feedback beat). Requires `#playtest`
   locally, which now needs `VITE_ENABLE_DEV_BYPASS=1` in `.env.local` (see
   step 5 above — already set on this machine).
3. Wire animated plays into the player-facing app (a "Read the Play" tile).
4. Bulk batch 002 through the kind-aware factory.
5. Spot-mistake playtest #2 → opens its factory gate.
6. Cycle 2: Daily Faceoff (arcade shell v1).
7. Parent/coach weekly progress card v1.
