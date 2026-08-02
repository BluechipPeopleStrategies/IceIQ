# RinkReads security review — 2026-08-01

Whole-app review, requested by Thomas after two RLS gaps surfaced during the
coach-authoring verification pass. Scope: every Postgres RLS policy and
SECURITY DEFINER function in `supabase/`, secret handling across the client
bundle, and injection sinks in `src/`.

**Headline: one critical privilege-escalation chain, two high findings, one
medium, one low. All five are fixed in
`supabase/migration_0022_rls_privilege_hardening.sql`, which is written and
reviewed but NOT applied — applying it is Thomas's call.** One of the fixes
needs a matching client change, which is included in the same commit.

Verified against the SQL itself, not against code comments. The repo is
**public** (`BluechipPeopleStrategies/IceIQ`), which raises the stakes on
everything below: the weaknesses were discoverable by reading the repo, and
two files describing them have been on `origin` since before today.

---

## CRITICAL — any signed-in user could make themselves an admin

**Where:** `schema.sql:143` + `migration_0012_admin_schema.sql:19,138-165`

`"update own profile"` is `for update using (auth.uid() = id)` with no
`WITH CHECK` and no column restriction. Postgres falls back to the `USING`
expression as the check, so `id` is pinned — but every other column on
`profiles` is freely writable by its owner. Two of those columns are privilege
bits:

- `profiles.is_admin` gates `questions_admin_all` and `pov_images_admin_all`,
  both `for all` (select/insert/update/delete).
- `profiles.tier` drives `canAccess()` paywall gating.

**Exploit, in full:** sign up for a free account, then
`update profiles set is_admin = true where id = auth.uid()`. You now have
read/write/delete over the entire live question bank and the POV image
library. RLS *is* enabled on both tables (`migration_0012:119-120`), so those
admin policies are live, not dormant. The same one-liner with `tier` grants
TEAM or PRO for free.

That is a free account to full content control of the product in one
statement, from the browser, using the anon key that ships in the bundle.

**Fixed by:** a `before update` trigger on `profiles` that rejects changes to
`is_admin` or `tier` when the caller's JWT role is `authenticated` or `anon`.
The service-role key and the SQL editor are unaffected, so
`scripts/grant-admin.mjs` and manual tier grants keep working.

**Why a trigger and not column GRANTs:** a column-level `REVOKE` does not
override an existing table-level `UPDATE` grant. Doing it properly would mean
revoking `UPDATE` on the table and re-granting each non-privileged column by
name, which silently makes every *future* column non-updatable. The trigger
states the rule once and survives schema growth. It also matches the existing
house pattern (`migration_0020`'s finalized-draft guard, `migration_0018`'s
pinned `search_path`).

**Confirmed safe to apply:** the client never writes either column. `is_admin`
is read-only in `src/admin.jsx:61-65` and `src/App.jsx:7951`; `tier` has no
client write path at all.

---

## HIGH — any signed-in user could rewrite the question bank

**Where:** `migration_0017_question_overrides.sql:36-42`

```sql
create policy question_overrides_write_auth on public.question_overrides
  for insert with check (auth.role() = 'authenticated');
create policy question_overrides_update_auth on public.question_overrides
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
```

The check is "are you logged in" — no ownership, no admin gate. Overrides are
applied on top of live questions for every player, so a single free account
could silently change what the product teaches, and `editor_email` could be
set to anyone.

This is a second, independent path to the same outcome as the critical finding
— it does not even require the escalation step.

**Fixed by:** writes restricted to `profiles.is_admin` **or** the two owner
emails already hardcoded in `migration_0019`. Both are accepted deliberately,
so this cannot lock Thomas out if `is_admin` is not set on his profile.
`WITH CHECK` also pins `editor_email` to the caller's JWT email, so the audit
column can no longer be forged.

---

## HIGH — any user could join any team and read minors' rosters

**Where:** `schema.sql:152` + `schema.sql:157`

Two policies combine into a children's-PII exposure:

- `"authenticated can lookup team by code"` is
  `for select using (auth.role() = 'authenticated')`. Despite the name it
  checks no code at all — every signed-in user could read **every** team row,
  including its join `code`.
- `"player manages own membership"` is `for all using (auth.uid() =
  player_id)`. For `INSERT`, that only requires the row be about yourself, not
  that you knew the team's code — so a user could insert themselves into any
  `team_id` directly, without even needing the leaked code.

Once on a team, `"read teammates profile"` (`schema.sql:119`) exposes those
teammates' profile rows. The rosters are youth hockey players, so this is
names and birth years of minors, readable by any account that signs up.

**Fixed by:** a `SECURITY DEFINER` `join_team_by_code(p_code text)` that
requires the real code and derives the player from `auth.uid()`. The blanket
team-read policy is replaced with coach-or-member, and the direct client
`INSERT` path on `team_members` is withdrawn (select and delete stay, so
players can still see and leave their own memberships).

**This one needs the client change**, included in the same commit:
`joinTeamByCode()` in `src/supabase.js` now calls the RPC instead of doing
select-then-insert. Applying the migration *without* that change breaks team
joining. The only client insert into `team_members` was that one call site —
every other insert is in `scripts/` using the service-role key, which bypasses
RLS and is unaffected.

---

## MEDIUM — internal review tables were readable by the whole internet

**Where:** `migration_0014_coach_reviews.sql:22`,
`migration_0015_feedback_log.sql:22`

Both are `for select using (true)` with no `to authenticated` clause, so they
were readable with the **anon** key — which ships in the client bundle and is
public by design. That exposed internal review verdicts, confidence scores,
reviewer notes, and the full iteration feedback log to anyone who looked.

**Fixed by:** restricted to admin-or-owner-email. The client only reads these
from the owner dashboard (`listCoachReviews`, `listFeedbackLog`), and both
return `[]` on error, so a non-owner now sees an empty list rather than an
error.

---

## LOW — report attribution could be forged

**Where:** `migration_0002_question_reports.sql:22-23`

Insert checks only `auth.role() = 'authenticated'`, so `user_id` could be set
to another user's id, planting reports under their name. Reads are already
own-only, so this is attribution integrity, not disclosure.

**Fixed by:** `with check (auth.uid() = user_id)`.

---

## Checked and clean

- **No service-role key reachable from the browser.** `SERVICE_ROLE` appears
  nowhere in `src/`; it is confined to `scripts/` and `remotion/`, which run
  server-side. The only `VITE_`-prefixed values are `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY` (both public by design), `VITE_ENABLE_DEV_BYPASS`,
  and `VITE_REVIEW_OWNERS`.
- **No injection sinks.** No `dangerouslySetInnerHTML` in any `.jsx`/`.js`
  source. The only matches are inside a checked-in minified React bundle
  (`src/cognitive-gym/cognitive-gym-demo.html`), which is generated, not
  authored.
- **Dev auth bypass is correctly fenced.** `src/utils/devBypass.js` is inert
  unless `VITE_ENABLE_DEV_BYPASS=1` is set at build time, and its identities
  (`__dev_coach__` etc.) are not UUIDs, so they cannot satisfy any FK.
- **`record_question_answer` is properly hardened** — `migration_0018` already
  revoked it from `public`/`anon` and granted execute only to `authenticated`,
  with `search_path` pinned. `SECURITY DEFINER` is intentional there.
- **Per-player data policies are sound.** `quiz_sessions`, `goals`,
  `self_ratings`, `training_sessions`, `question_results`,
  `assignment_completions`, `challenge_results` all correctly scope to
  `auth.uid() = player_id` with coach reads gated through a `teams` join.

## Noted, not changed

- **`profiles.role` stays client-writable.** A user can self-promote to coach,
  but that grants nothing: every coach-side policy is keyed on
  `teams.coach_id = auth.uid()`, so they would only ever see their own teams.
  Locking it would be tidier; it is not a vulnerability. Say the word and I
  will add it to the same trigger.
- **Admin identity is expressed two ways** — `profiles.is_admin`
  (`migration_0012`) and hardcoded owner emails (`migration_0004`, `0011`,
  `0019`). Migration 0022 accepts both rather than picking, so nothing locks
  you out. Consolidating onto `is_admin` is a follow-up worth doing.
- **`migration_0004` and `migration_0011` hardcode `mtslifka@gmail.com`.**
  Works, but it means an admin change is a schema change.
- **The repo is public.** Worth a deliberate decision rather than a default:
  it exposes the full schema, every policy, and the product's content pipeline.
  Nothing in it is a credential, but it does hand an attacker the map.

## To apply

1. Review `supabase/migration_0022_rls_privilege_hardening.sql`.
2. Run it in Supabase Dashboard → SQL Editor. Idempotent, safe to re-run.
3. Deploy the `src/supabase.js` change **together with** the migration —
   section 3 breaks team joining if the migration lands without it.
4. Smoke test: join a team by code as a player, confirm an admin can still
   save a question override, confirm a non-admin gets an empty owner dashboard
   rather than an error.

Nothing in this review touched the live database.
