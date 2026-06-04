# Daily Read — Parent Weekly Digest (design)

Date: 2026-06-04
Status: approved for planning
Owner: Thomas

## Summary

Add a **parent-facing, opt-in weekly email digest** of the Daily Read (the existing
Question of the Day). Parents subscribe with their email and an age level; once a week a
Vercel Cron job composes that level's seven daily reads for the past week and sends them
via the Resend REST API. Double opt-in and one-click unsubscribe make it CASL-compliant.

This is the email amplifier layered on top of the existing in-app daily loop. A browser app
has no reliable push channel (iOS PWA notifications are effectively dead), so email is the
only owned re-engagement lever, and doubles as the owned audience for future Free → Pro
conversion.

## Goals

- A parent can opt in (email + age level), confirm, and start receiving a weekly digest.
- A parent can unsubscribe in one click from any email.
- The digest is generated server-side, deterministically, from the same picker the in-app
  Daily Read uses — no drift between what the app shows and what the email contains.
- The whole flow is CASL-compliant and parent-facing only.

## Non-goals (explicitly out of scope)

- **Content seeding.** The digest is only as valuable as the question bank, which is empty
  until the gauntlet ships ledger-tagged content. This pipeline can ship and be tested with
  a handful of seed questions, but real-world value is gated on the separate content
  workstream. See "Dependency: content" below.
- **Personalization to a specific player** (e.g. "your kid's streak this week"). v1 sends
  the week's reads for the chosen age level, identical to every parent on that level. Player
  personalization needs localStorage progress synced to the server keyed to the subscriber;
  deferred to a later phase.
- **Daily send.** Weekly only until content depth supports daily without running dry.
- **Rebrand QotD → "Daily Read" across the whole app.** Trivial copy work folded in where it
  touches the digest/opt-in surfaces; a full app-wide rename is not part of this spec.

## Background / current state

- `src/questionOfDay.jsx` already implements the daily mechanic: `hashString(date|level)` picks
  one MC/TF question deterministically per `(date, level)` from `loadQB()`, tracks done-state in
  localStorage (`rinkreads_qotd_done_v1`), shows post-answer community % via
  `SB.getQuestionStats()`, and has a `navigator.share` sheet. It renders nothing while the bank
  is empty (`if (!pool.length) return null`).
- `src/supabase.js` is wired (anon key, RLS, migrations under `supabase/`). Established
  conventions: writes throw, reads return empty + `warn()`, telemetry is silent. New tables get a
  numbered migration and helper functions here.
- `src/qbLoader.js` composes the live bank from `src/data/bank.json` (keyed by the 6 age-level
  display names) + globbed `src/scenario/seeds/*.json`. Currently empty post-wipe.
- Stack: React + Vite, plain JS/JSX, deployed on Vercel. **No `api/` dir and no `vercel.json`
  exist yet** — serverless functions + cron are net-new infra. Runtime deps today: only
  `@supabase/supabase-js`.
- User is in Alberta (Mountain Time) → CASL governs commercial email.

## Architecture

```text
Parent (browser)                 Supabase                      Vercel (server)            Resend
─────────────────                ────────                      ───────────────            ──────
opt-in form  ──insert pending──▶ daily_read_subscribers
   │                                   │
   │            confirm email ◀──(server composes + sends via Resend)──────────────────────┘
   ▼
click confirm ──▶ /api/confirm ──update status=active──▶
                                                          Vercel Cron (weekly)
                                                                │
                                                          /api/weekly-digest
                                                                │ reads active subs (service role)
                                                                │ composes digest (shared picker + bank.json)
                                                                └─ sends per recipient via Resend REST
click unsubscribe ──▶ /api/unsubscribe ──update status=unsubscribed──▶
```

### Components and their boundaries

1. **Shared deterministic picker — `src/daily/picker.js` (new)**
   - Pure functions, no React, no network, importable by both the client and `/api/*`.
   - Extract from `questionOfDay.jsx`: `hashString`, `todayYmd`, and `todaysQuestion(qb, level, ymd)`
     (generalized to take an explicit date so the server can compute past days).
   - Add `weekDates(anchorYmd)` → the seven `YYYY-MM-DD` strings for the digest window, and
     `weeklyDigest(qb, level, anchorYmd)` → `[{ ymd, question }]` (skips days with no question).
   - `questionOfDay.jsx` is refactored to import these instead of defining them locally. Behavior
     unchanged; covered by tests.

2. **Subscriber store — Supabase `daily_read_subscribers` (new table + migration)**
   - Columns: `id uuid pk default gen_random_uuid()`, `email text not null`, `level text not null`,
     `status text not null default 'pending'` (`pending` | `active` | `unsubscribed`),
     `confirm_token uuid not null default gen_random_uuid()`,
     `unsub_token uuid not null default gen_random_uuid()`,
     `created_at timestamptz default now()`, `confirmed_at timestamptz`, `unsubscribed_at timestamptz`.
   - Unique index on `lower(email)` + `level` (one sub per email per level; re-opt-in of an
     unsubscribed row resets it to `pending` rather than erroring).
   - **RLS:** anon has **no** access at all (no SELECT/INSERT/UPDATE). Every operation —
     opt-in insert, confirm, unsubscribe, send — runs server-side in `api/*` with the
     service-role key (RLS-exempt). The subscriber list is never touched from the browser.
   - The client opt-in calls `api/subscribe.js` (below) rather than writing to Supabase
     directly, so the anon-key client module (`src/supabase.js`) gains no subscriber-table
     surface area.

3. **Serverless functions — `api/` (new dir; Vercel auto-detects)**
   Each creates its own service-role Supabase client from `process.env` (never `VITE_`).
   - `api/confirm.js` — `GET ?token=<confirm_token>`: set `status='active'`, `confirmed_at=now()`;
     redirect to an in-app confirmation page (`/?subscribed=1`). Idempotent.
   - `api/unsubscribe.js` — `GET ?token=<unsub_token>`: set `status='unsubscribed'`,
     `unsubscribed_at=now()`; redirect to `/?unsubscribed=1`. Idempotent; works without auth
     (one-click requirement).
   - `api/weekly-digest.js` — invoked by Vercel Cron. Rejects unless header
     `Authorization: Bearer ${CRON_SECRET}` matches. Steps: load `active` subscribers; group by
     level; for each level compute `weeklyDigest(qb, level, today)` once (qb from importing
     `src/data/bank.json` + the shared picker — same source the client bundles); render HTML +
     text; send one Resend message per recipient with that recipient's `unsub_token` in the
     footer link. Returns `{ sent, skipped, errors }` JSON for observability.

4. **Email transport — Resend via `fetch` (no SDK)**
   - Small helper `api/_lib/email.js`: `sendEmail({ to, subject, html, text })` POSTs to
     `https://api.resend.com/emails` with `Authorization: Bearer ${RESEND_API_KEY}`,
     `from: ${RESEND_FROM}`. No npm dependency added.
   - Templates: confirmation email and weekly digest. Both include sender identification and a
     physical/contact line (CASL) and an unsubscribe link. Digest lists each day's read
     (date, category, the question text) with a "Play today's read →" CTA deep-linking to the app.

5. **Opt-in UI — `src/daily/SubscribeCard.jsx` (new)**
   - Email input + age-level select + consent microcopy ("For parents — we'll email you your
     player's weekly reads. Unsubscribe anytime."). Calls `subscribeDailyRead`, shows a
     "Check your email to confirm" success state.
   - Mounted on the `#parents` surface (`ParentsPage` in `screens.jsx`) and as a compact card on
     the Daily Read screen. Both are parent-facing surfaces.

6. **Scheduling — `vercel.json` (new)**
   - One cron entry hitting `/api/weekly-digest`. **Sunday 6:00 PM Mountain** = `0 0 * * 1` UTC
     (00:00 UTC Monday = 18:00 MDT Sunday; note MST/MDT shift — see Open Questions). Cron sends
     no auth header by default, so the function also accepts Vercel's cron user-agent OR the
     `CRON_SECRET` bearer; document the chosen guard in the plan.

## Data flow: opt-in (double opt-in)

1. Parent submits email + level → `subscribeDailyRead` inserts `pending` row (or resets an
   `unsubscribed` row to `pending` with a fresh `confirm_token`).
2. Client cannot send email (no service-role); so confirmation send happens via a tiny
   `api/subscribe.js` endpoint the client calls instead of inserting directly — **decision:**
   route the insert through `api/subscribe.js` (server-side) so the confirmation email fires in
   the same request and the anon client never needs even INSERT rights. This tightens RLS to
   "no anon access at all." (Supersedes the anon-insert option above; the plan should implement
   the server-route version.)
3. `api/subscribe.js`: validate email, upsert `pending` row, send confirmation email with
   `/api/confirm?token=`.
4. Parent clicks → `active`. Only `active` rows receive the weekly digest.

## Security / secrets

- Server-only env vars on Vercel (never `VITE_`-prefixed): `RESEND_API_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_FROM`. Add to `.env.example` with comments,
  document that they are set in the Vercel dashboard.
- The service-role key must only ever be read inside `api/*`; never imported into `src/*`
  (which is bundled to the browser). Add a one-line guard comment in each API file.
- Tokens are unguessable UUIDs; confirm/unsubscribe are idempotent and rate-agnostic.

## Compliance (CASL + COPPA)

- **Parent-facing only.** Opt-in copy and placement target parents; never solicit a child's email.
- Double opt-in (express consent).
- Every email: sender identification + a contact/physical mailing line + a working one-click
  unsubscribe. Unsubscribe honored immediately (status flip, excluded from next send).
- **Mailing address is a clearly-marked placeholder** in the email templates
  (`{{CASL_MAILING_ADDRESS}}`) for now. A real address exists and is dropped in before the
  first public send — it does not block building or testing the pipeline. The hard rule: no
  real send to strangers until the placeholder is replaced.
- Retain proof of consent (`created_at`, `confirmed_at`, source level).

## Dependency: content

The bank (`src/data/bank.json` + scenario seeds) is empty as of the 2026-06-04 wipe. With an
empty bank, `weeklyDigest` returns `[]` and `weekly-digest` will skip every level (logs
`skipped`, sends nothing). The pipeline is built and tested against a small fixture bank, but
**a meaningful first send requires the gauntlet/curriculum workstream to land real questions
for at least the launch age levels.** Flag this as the gating item before announcing the
newsletter publicly.

## Testing

- **Picker (`src/daily/picker.test` or existing test runner):** deterministic — same
  `(date, level)` always yields the same question; `weekDates` returns 7 correct ordered days;
  `weeklyDigest` skips empty days; identical output to the pre-refactor `questionOfDay` picker
  for a fixture bank (guards the refactor).
- **Digest composer:** given a fixture bank + fixed date, produces expected questions and
  correctly embeds each recipient's `unsub_token` in the unsubscribe link. No network.
- **Email transport:** `sendEmail` is a thin fetch wrapper; mock `fetch`, assert the Resend
  payload shape and auth header. No live sends in tests.
- **API guards:** `weekly-digest` rejects calls without the cron secret; `confirm`/`unsubscribe`
  are idempotent on repeat tokens.
- Manual: a `scripts/send-test-digest.mjs` that runs the composer for one level and sends a
  single email to a test address (mirrors the existing `scripts/smoke-*.mjs` pattern).

## Open questions (resolve during planning, sensible defaults chosen)

1. **Send time across MST/MDT.** `0 0 * * 1` UTC = 18:00 MDT (summer) but 17:00 MST (winter).
   Acceptable drift, or pin to a fixed local hour (would need the function to early-return unless
   it's the right local hour, since Vercel cron is UTC-only)? Default: accept the one-hour
   seasonal drift.
2. **Resend sending domain.** Requires a verified domain (`rinkreads.com`?) for good
   deliverability and a real `RESEND_FROM`. Confirm the domain to verify in Resend.
3. **Physical mailing address for the CASL footer.** RESOLVED: ship as a marked placeholder
   (`{{CASL_MAILING_ADDRESS}}`); a real address exists and is dropped in before the first
   public send. Does not block the plan.
4. **One level per email, or allow a parent to pick multiple levels** (siblings)? Default: one
   level per opt-in row; a parent can opt in twice for two kids.
