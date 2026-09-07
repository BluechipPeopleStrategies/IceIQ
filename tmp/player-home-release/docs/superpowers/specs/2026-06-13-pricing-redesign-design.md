# RinkReads Pricing Redesign

Date: 2026-06-13
Status: Design approved, ready for implementation plan
Author: brainstorming session (Thomas + Claude)

## Context

RinkReads (IceIQ) currently runs a "free forever but feature limited" model with four
seasonal one time passes (Free, Pro, Family, Team) defined in `src/config/pricing.js` and
enforced by `src/utils/tierGate.js`. There is no payment or account infrastructure yet:
`getCurrentTier()` always returns `FREE`, and the Cognitive Gym (a 10 drill training pillar
under `src/cognitive-gym/`) is completely ungated.

This redesign changes the business model, not just the prices. We move to a thin permanent
free floor, a short full access trial, and an annual subscription with a two rung paid ladder
built to push users toward the higher rung.

## Goals

1. Make the free experience deliberately thin but permanent, so it keeps working as the
   top of funnel growth engine (Daily Read + a daily Gym drill).
2. Give new users a real taste of the full product, then gate heavily once they pass it.
3. Offer two paid rungs (a develop rung and a compete rung) and actively incentivize the
   upsell to the higher rung.
4. Switch the paid model from seasonal one time passes to an annual subscription.

## Non goals (out of scope for this design)

- Real payment processing and accounts are described as a later phase, not built here.
- The Family / multi profile tier is dropped for now (can return later if demand appears).
- No change to the underlying scenario engine, solver, or content pipeline.

## The shift in one line

From "free forever, feature limited (4 seasonal passes)" to
"thin permanent free floor + 14 day / 30 read full access trial + annual subscription with a
Prospect and Pro upsell ladder."

## Tier ladder

Names use a hockey climb that reads as age appropriate for a U7 to U18 audience, with the top
rung being the thing every young player wants (which serves the upsell).

| Tier | Name | Price (CAD, tunable) | Billing | Who |
|------|------|------|---------|-----|
| Free floor | **Rookie** | $0 | permanent | Everyone, top of funnel |
| Develop | **Prospect** | ~$79.99 / yr | annual subscription | Rec player, busy family |
| Compete | **Pro** | ~$99.99 / yr (Recommended) | annual subscription | Committed player chasing AA/AAA |
| Coaches | **Team** | ~$249.99 / season | seasonal | Coaches and associations |

Prices are starting anchors. The small delta between Prospect and Pro (about $20 / yr) is
intentional (see Upsell mechanics). Pro is the visually recommended default.

## Rookie: the permanent free floor

Free forever, deliberately thin. This is the growth engine, not a crippled demo.

Included:
- One Daily Read set per day (the existing 3 to 5 read set) with the streak counter.
- One rotating Cognitive Gym drill per day (rotates through the 10 drills by day, so a free
  user samples variety across a week) with its streak.
- One player profile.
- The "why" coaching card after each answer.
- Basic result screen.
- Setting a first development goal during onboarding (the First Six onboarding hook).

Not included (these belong to Prospect and above):
- Session history beyond the last few.
- Adaptive engine, all age access, position filter, full smart goals.
- Progress snapshots and reports.
- The other nine Gym drills that day, and Gym level progression.
- Weekly challenge, coach feedback, full skill rating.

## The trial: taste the top

- On first run, the user gets full **Pro level** access to everything.
- The trial ends at **14 days OR 30 completed reads, whichever trips first**.
  - A "read" is one completed scenario.
  - Gym sessions do not burn read credits; the Gym is open for the 14 day window.
- Tasting the best tier (not the middle one) is intentional: when it decays, the user misses
  the Pro only competitive and mastery layer specifically, which is the rung we want them to buy.
- On trip: the app decays to the Rookie floor (not a blank wall). It then presents both paid
  tiers with **Pro badged "Most Popular"** and a persistent "your free trial ended" prompt at
  every gated touchpoint.
- The trial is one time and account bound (see Enforcement).

## Feature matrix

| Capability | Rookie (free) | Prospect | Pro | Team |
|---|---|---|---|---|
| Daily Read set (1/day) | yes | unlimited | unlimited | unlimited |
| Daily rotating Gym drill (1/day) | yes | full gym | full gym | full gym |
| Set first goal (onboarding) | yes | yes | yes | yes |
| All age groups | no | yes | yes | yes |
| All question formats | no | yes | yes | yes |
| Position filter | no | yes | yes | yes |
| Adaptive engine | no | yes | yes | yes |
| Full smart goals | no | yes | yes | yes |
| Progress snapshots | no | yes | yes | yes |
| Full session history | no | yes | yes | yes |
| All 10 Gym drills, standard levels | no | yes | yes | yes |
| Weekly challenge | no | yes | yes | yes |
| Coach feedback / skill rating | no | yes | yes | yes |
| **Competitive: Puzzle Rush, leaderboards, leagues, head to head** | no | no | **yes** | yes |
| **Mastery: advanced Gym levels, mastery heatmap, performance graphs, deep reports** | no | no | **yes** | yes |
| Coach dashboard + roster | no | no | no | yes |

The two bold Pro only rows are the upsell magnets the user selected (Competitive layer and
Mastery and analytics). Real game transfer and volume / early access were considered and
deferred.

## Upsell mechanics (the "make them go higher" part)

1. **Small price delta plus recommended badge.** About $20 / yr separates Prospect and Pro.
   "Pro is everything, only $20 more." Pro is the visually anchored default pick (decoy effect).
   Monthly equivalent framing helps ("about $8.33 / mo for Pro").
2. **Trial equals Pro.** Users taste the top, so the thing they lose on decay is exactly the
   thing we want them to buy.
3. **In app teasers at high intent moments.** Prospect users see locked leaderboard and
   mastery heatmap previews after a strong Gym session, or when they hit a level cap, with an
   "Unlock with Pro" prompt.
4. **Soft ceiling in Prospect.** Gym levels cap at a standard ceiling and analytics stay
   shallow. The obsessed kid hits the wall and upgrades to raise it.

## Enforcement, phased

### Phase 1: localStorage prototype (validation only)
- Trial timestamp and read counter stored in localStorage.
- `tierGate` gains a trial state (active / expired), a `ROOKIE` floor allow list, and the
  third paid level (split Prospect vs Pro).
- The Cognitive Gym gets gated for the first time (one rotating free drill, rest gated).
- Paywall and tier picker UI (Prospect vs Pro, Pro recommended).
- Honest caveat: trivially reset by clearing storage or using a private window. This phase is
  for validating the flow and conversion UX, not for collecting revenue.

### Phase 2: real enforcement
- Tie tier and trial to a Supabase account (the project already has `src/supabase.js`).
- Move trial timing and entitlement server side.
- Add an annual subscription via a payment processor (Stripe is the assumed default).
- A billing webhook sets the account entitlement; `getCurrentTier()` reads that entitlement
  instead of always returning `FREE`.

## Code touchpoints

- `src/config/pricing.js`: restructure tiers. Rename FREE to ROOKIE, replace PRO/FAMILY with
  PROSPECT and PRO as annual subscriptions, keep TEAM as seasonal, remove FAMILY. Add trial
  constants (TRIAL_DAYS = 14, TRIAL_READS = 30). Prices in CAD.
- `src/utils/tierGate.js`: add the ROOKIE floor allow list, PROSPECT and PRO allow lists, the
  new Pro only feature keys (competitive + mastery), and make `canAccess()` trial aware (an
  active trial is treated as Pro). Update UPGRADE_TARGET and UPGRADE_MESSAGES.
- New `src/utils/trialState.js`: start the trial, read it, record a read, and compute the trip
  (14 days OR 30 reads). localStorage in Phase 1, swappable for Supabase in Phase 2.
- `src/cognitive-gym/CognitiveGym.jsx` (and the drill registry): pick the single free drill for
  the day by a date index rotation, gate the rest through `canAccess`.
- Daily Read serving logic: enforce one set per day for Rookie.
- New paywall and tier picker UI component: shows Prospect vs Pro with Pro recommended, used at
  decay and at every gated touchpoint.
- `getCurrentTier()`: Phase 2 reads the Supabase entitlement.

## Data flow

1. First run: onboarding sets age, position, and first goal; trial starts (timestamp + read
   counter = 0).
2. Each scenario completion increments the read counter.
3. Every gated feature check goes through `tierGate.canAccess(feature)`, which allows access if
   the tier permits it OR the trial is active.
4. When the counter hits 30 or 14 days pass, the trial flips to expired.
5. Access drops to the Rookie floor; paywall prompts appear at gated touchpoints.
6. The user subscribes (Phase 2: Stripe to webhook to entitlement); `getCurrentTier()` returns
   Prospect or Pro; gates open accordingly.

## Testing strategy

Follow the existing Cognitive Gym pattern of plain, unit testable core files (for example
`src/cognitive-gym/lateReadCore.js` is "unit testable in plain Node").

- `trialState` unit tests: trip on day count, trip on read count, whichever comes first, and a
  reset path.
- `tierGate.canAccess` tests across ROOKIE, PROSPECT, PRO, and TEAM, plus the trial active case
  (active trial behaves as Pro) and the trial expired case (drops to Rookie floor).
- Gym gating tests: the daily free drill rotates by date, and the other drills are gated for
  Rookie and open for Prospect and above.

## Open items to settle during planning

- Final prices (the $79.99 / $99.99 / $249.99 figures are starting anchors).
- Whether to add a founder or intro discount for the first season.
- Confirm Team stays strictly seasonal (rosters reset yearly) while individuals are annual.
- Confirm the daily free Gym drill rotates rather than being fixed.
- Phase 1 vs Phase 2 split: how much of the real Supabase + Stripe enforcement is in the first
  implementation versus a follow up.
