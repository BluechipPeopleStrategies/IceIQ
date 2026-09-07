# Team Communication Portal — MVP Design

**Status:** Approved by Thomas 2026-08-01, then PARKED by Thomas the same day
(fast-tracked: scope was proposed and approved in one pass, not iterated
question-by-question — then parked before any implementation started, in
favor of focusing on the core play-diagram/quiz review experience). See
`docs/roadmap/TASKS.md` Parking Lot for resume state.
**Branch:** new branch off `feature/shareable-beta` (this is unrelated to the
scenario-engine/coach-authoring work; do not build it on that branch or
worktree).

## Problem

Teams currently coordinate over scattered group texts (or nothing at all).
There's no shared, persistent place for "practice moved to 6pm" or "who's
coming Saturday." This is the RinkReads answer to TeamSnap/TeamLinked-style
team portals, done narrower and built into the product teams are already
using for training.

## Scope

MVP ships exactly two features. Everything else TeamSnap-style apps do
(payments, carpooling, photo sharing, file storage, real-time chat) is
explicitly out of scope for this pass — each would need its own design.

1. **Team announcements.** Coach posts a short message; everyone on the
   roster sees it on the team dashboard. One-way, no replies/threads (that's
   chat, which is cut).
2. **Event calendar with RSVP.** Coach creates an event (title, date/time,
   location, optional notes) for a practice, game, or team activity. Each
   roster member RSVPs yes/no/maybe. Coach sees a roll-up of who's coming.

No editing history, no recurring events, no reminders/notifications in this
pass — an event is created once and RSVP'd against; edits overwrite in place
(no audit trail needed at MVP scale).

## Membership bundling

Follows the exact gating pattern already used for `CoachPlayAuthoringSection`
(`canAccess("coachDashboard", subscriptionTier)`): a TEAM-tier team gets both
features automatically for its whole roster — no separate paywall or
allowlist inside the feature itself. The coach authors (posts, creates
events); every player/parent on that team's roster views and RSVPs for free,
as part of being on a TEAM-tier team. This differs from the coach-authoring
video-export feature (which additionally required a manual allowlist for its
initial rollout) — that gate existed because video-export was a brand-new,
unreviewed pipeline; team communication is a much lower-risk feature and
doesn't need the same rollout caution.

## Data model

Two independent feature areas, each mirroring the existing
`team_challenges`/`challenge_results` pattern (coach-owned row + team-scoped
read via `team_members`) rather than inventing a new RLS shape.

### `team_posts` (announcements)

```sql
create table public.team_posts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
```
- RLS: coach (`auth.uid() = coach_id`) has full CRUD. Any `team_members` row
  for `team_id` can `select`. No update/delete for players (read-only).

### `team_events` + `event_rsvps` (calendar/RSVP)

```sql
create table public.team_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  event_type text not null check (event_type in ('practice','game','other')),
  starts_at timestamptz not null,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_rsvps (
  event_id uuid not null references public.team_events(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('yes','no','maybe')),
  updated_at timestamptz not null default now(),
  primary key (event_id, player_id)
);
```
- `team_events` RLS: coach full CRUD (`auth.uid() = coach_id`); team members
  read-only, same `exists (select 1 from team_members ...)` pattern as
  `team_challenges`.
- `event_rsvps` RLS: player owns their own row (`auth.uid() = player_id`,
  full CRUD — an RSVP can change). Coach reads every RSVP for events they
  own (mirrors `challenge_results coach read`). Teammates do NOT read each
  other's RSVPs in MVP (no social visibility into who's in/out — coach-only
  roll-up avoids peer pressure dynamics with kids' schedules; can revisit
  later if wanted).

Both tables index on `team_id`/`event_id` the same way existing tables do.

## UI

Two new sections inside the existing coach team-dashboard card, next to
`CoachAssignmentsSection`/`CoachChallengeSection` (same mount point, same
`canAccess("coachDashboard", ...)` gate as the rest of that block in
`App.jsx`):
- `TeamPostsSection` — coach post composer + reverse-chron list, players see
  read-only list.
- `TeamEventsSection` — coach event creator + upcoming-events list with an
  RSVP roll-up (`3 yes / 1 no / 2 no-response`); players see the same list
  with a yes/no/maybe control for their own row.

No new top-level route or navigation entry — this lives inside the team
dashboard players/coaches already open.

## Testing

Follow the project's plain-`node --test` convention. Minimum coverage:
RLS-shape unit tests are not directly testable outside a live Supabase
instance (consistent with how `team_challenges`/`coach_play_drafts` are
handled — SQL correctness is reviewed by inspection + live verification,
not unit-tested), but the UI components and any client-side validation
(e.g. RSVP status must be one of the three allowed values before the request
is even sent) get standard component/unit tests.

## What this explicitly does not cover

- Payments, carpooling, photo/file sharing, real-time chat — separate future
  features, each needing its own design if pursued.
- Recurring events, reminders/push notifications, edit history — cut for
  MVP simplicity, revisit if usage shows they're needed.
- Peer visibility into RSVP status — coach-only roll-up by design (see RLS
  note above), not a placeholder for a later change unless explicitly asked.
