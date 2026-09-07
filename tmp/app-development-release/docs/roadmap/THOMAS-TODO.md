# Everything that needs Thomas — 2026-08-03

Ordered by leverage. Each item says exactly what to do, roughly how long, and
what stays stuck until it happens. Nothing here needs a coding session.

Three kinds of item, and they are genuinely different:

- **DO** — I cannot do it from this machine. Access, not permission.
- **DECIDE** — a short answer. No work, but real work waits on it.
- **LOOK** — only a human eye settles it.

---

## 1. ~~DO · Apply five migrations~~ · **DONE 2026-08-04**

All five applied. Every table the app touches is present, verified by REST
probe. `goals` exists, so SMART Goals was never at risk. `smoke:training` and
`smoke:challenge` both pass against the live database for the first time.

One line still outstanding, whenever you are at a desk — it removes a policy
that is currently unused, so nothing is broken while it waits:

```sql
drop policy if exists "challenge_results teammate read" on public.challenge_results;
```

<details><summary>Original entry</summary>


The migration files and the live database drifted. `migration_0022` recorded the
verification itself on 2026-08-02: **five tables that the migration history
creates do not exist in production.** Not one. `training_sessions` was just the
one somebody noticed.

**Two of them are throwing 404s on every single app load right now**
(`question_reports`, `question_results`), and nobody is chasing that.

### Why I can't do this

Checked rather than assumed: `SUPABASE_SERVICE_ROLE_KEY` is in `.env`, but it is
a PostgREST token and PostgREST does not execute DDL — it cannot create a table.
The Supabase CLI is installed (2.109.1) but the project is not linked: no
`supabase/config.toml`, no access token, `supabase projects list` fails. There is
no direct Postgres connection string. `schema.sql`'s own header says "Paste this
into Supabase Dashboard → SQL Editor," which is how this project has always run.

So the dashboard is the only path, and only you have it.

### Steps

1. Supabase Dashboard → **SQL Editor** → New query.
2. Paste and run each file's contents, **in this order**:

   | Order | File | Creates | Why it matters |
   |---|---|---|---|
   | 1 | `supabase/migration_0007_training_sessions.sql` | `training_sessions` | Every training-log sync has failed silently since it was written |
   | 2 | `supabase/migration_0002_question_reports.sql` | `question_reports` | **Live 404 on app load** |
   | 3 | `supabase/migration_0010_question_results.sql` | `question_results` | **Live 404 on app load** |
   | 4 | `supabase/migration_0008_team_challenges.sql` | `team_challenges`, `challenge_results` | Team challenges cannot persist |
   | 5 | `supabase/migration_0011_quiz_feedback.sql` | `quiz_feedback` | Quiz feedback is dropped |

3. Then run this read-only check and paste me the result. It settles `goals` —
   where SMART Goals saves — which appeared on neither the present nor the absent
   list, so its status is genuinely unknown:

```sql
select t.name, to_regclass('public.' || t.name) is not null as exists
from (values ('profiles'),('teams'),('team_members'),('quiz_sessions'),('goals'),
             ('self_ratings'),('coach_ratings'),('training_sessions'),
             ('question_reports'),('question_results'),('team_challenges'),
             ('quiz_feedback'),('question_stats'),('review_questions'),
             ('assignments'),('assignment_completions'),('questions'),
             ('pov_images'),('scenario_reviews'),('coach_reviews'),
             ('feedback_log'),('question_requests'),('question_overrides'),
             ('playtest_feedback')) as t(name)
order by exists, t.name;
```

**Optional, and it removes this whole item permanently:** run `supabase login`
then `supabase link` once. After that I could apply migrations myself — though I
would still ask before touching production schema.

</details>

---

## 2. DECIDE · Your own account's role · ~10 seconds

This morning's dead-end fix healed `thomas@bluechip-people-strategies.com` with
**`role: "player"`** during live verification. Nobody chose that; it was a test
artifact, and it is in the live database now.

Pick one:

- **"I'm a coach"** → I correct the row (needs the service-role key, which I have).
- **"Player is right"** → nothing to do, I close it.
- **"Delete my profile row"** → cleanest. You then self-heal through the same
  finish-setup screen every other user gets, and pick your own role. Takes you
  about 20 seconds next sign-in.

Two other stranded accounts: `donkey@gmail.com` (leave it — it self-heals now, no
decision needed) and `rinkreads-crash-1783623581262@example.com` (a self-admitted
crash-test artifact; deleting it invents nothing — say the word).

---

## 3. LOOK · Brain Gym playtest on production · ~10 min · **oldest open item**

PR #3 merged 2026-07-19 and the drill fixes have never been visually confirmed.
It has been sitting in NOW ever since.

ice-iq.vercel.app → Brain Gym → play through the drills. File anything broken.

**Do this AFTER item 1**, so the training-log writes actually land while you are
in there. And note a lot changed today: all twelve drills now have the Action
Rail and a rewritten results card, Run the Play happens in one end zone, and the
Shootout net was rebuilt. Those are exactly the things worth your eye.

**One specific thing to check while you are there — SHELL-9.** You reported a tap
question with a single visible target that could not be answered wrong. That was
fixed 2h37m *before* your recording, which means you were probably served stale
code from the parked worktree on port 5176. Open `u7_time_space_open_ice_mc_v1`
from a **fresh** dev server on `main` and confirm no target is drawn before you
tap. If it is clean, it closes. If the target still appears, the bug is in what
the browser is being served, not in the source.

---

## 4. DECIDE · Player naming convention (S2-16) · ~2 min · **blocks 13 plays**

One Read-the-Play screen currently uses **six** different ways of naming players
at once — a token reading "YOU", a token reading "F2", an unlabelled defender,
button copy saying "support teammate", prompt prose saying "the lone defender",
and feedback saying "F1" for the player whose token says "YOU".

That last one is the hard contradiction and it hits on tiles 6-10.

Pick one:

- **(A) YOU + role words at U11/U13.** Codes never shown below U15; tokens read
  YOU / Support / D / Carrier. *My recommendation* — it also closes the
  unlabelled-defender hole in the same change.
- **(B) Codes everywhere, consistently.** Cheapest (one function), but F1/D1 is
  film-room shorthand for a 10-year-old.
- **(C) Substitute everywhere and relabel the tokens to match.** Largest copy
  sweep.

---

## 5. DECIDE · Two forecheck plays where the words and the ice disagree · ~5 min

Both are hockey judgment, both are in the first three tiles a player sees, and
each has two honest fixes. I will not pick.

**`play_forecheck_pressure_force_wall_u13_v1`** — the prompt says you are first
in, but at the entry frame YOU are 48.7 units from the puck while your own D1 is
25.6, and you are *behind the blue line* while D1 stands deep in the zone. That
frame re-shows every 4.2 seconds while the player reads.
→ **Move D1 up-ice behind you**, or **reword to "you are the second forechecker"**.

Same play, second half: the copy says you "forced a predictable wall play," but
the puck ends 1.0 unit from the faceoff-circle centre and 7.9 from the wall.
→ **Move the endpoint into the wall band**, or **reword to describe a corner**.

**`play_forecheck_pressure_take_away_reverse_u13_v1`** — the answer says "angle in
behind the carrier," but you start 16.4 units up-ice on the wrong side, and the
drawn route crosses straight through the puck carrier's path.
→ **Move the ice to the words** (pull the carrier to the wall, start you
goal-side), or **move the words to the ice** ("stay above the puck and seal the
reverse", which is what the coordinates actually show).

---

## 6. LOOK · Coach ruling on three stick-blade questions · ~5 min

You flagged one with "I'd be surprised if it would hold up to scrutiny." It turns
out three questions across two bands teach adjacent things, and one contradicts
the others:

- `gen_u7_puck_skills_pas01` — keys **"Tap your stick blade flat on the ice where
  you want the puck"** as correct, standing still in open ice.
- `gen_u7_reading-the-play_rdp05` — keys **"Keep your stick blade flat on the ice
  as a target"** as correct, at the net front.
- `gen_u9_reading-the-play_rdp05` — keys **"Stay exactly where you are and tap
  your stick"** as **wrong**; correct is "skate to an open pocket of ice."

The situations differ (the U9 one has a defender in the lane) so they are not
strictly contradictory — but a player aging U7 → U9 sees the same action rewarded
and then penalised. One ruling covers all three.

The specific thing to rule on: **"where you want the puck"** implies pointing at a
remote spot, but a tap marks where your blade already is. Should the puck come to
your blade, or should you lead into space?

---

## 7. DECIDE · Scenario-engine, 8 questions · ~15 min · only if you want Phase 9/10 to start

Full detail with a default per row:
`docs/superpowers/plans/2026-08-03-scenario-engine-phase-9-10-plan.md` — the
decisions table is the second section, deliberately.

**Every row has a stated default, so silence is safe.** The two that most change
what gets built:

- **D1** — does a headless `claude` CLI count as "a supported Claude session" for
  judgment? *Default: no*, meaning the overnight runner can only prepare and
  stage, never judge. If that is right, the runner is a smaller thing than it
  sounds and may not be worth building at all — worth saying so early.
- **D2** — gate 5 (novelty review) needs paid API spend, is currently deferred,
  and the spec's full scale bar cannot honestly be claimed without it. *Default:
  run it attended and free.*

**Read the uncertainty section before deciding anything.** It says plainly that
the 200-state bar may not be reachable: one mature family collapses to 12 real
combinations, and exactly **one** approved tactical claim exists. If the ceiling
is claim authoring rather than compute, that changes what Phase 10 is even for.

---

## 8. LOOK · Copy you should veto or approve · ~10 min · in flight now

Agents are drafting these right now and I will hand you the list when they land.
All of it is content I invented and none should ship unread:

- **SMART Goals starter options** — U13 and U18 currently have zero examples
  across every category, so those players face five blank boxes. Roughly 25
  category/band combinations × 5 fields.
- **U7 goal categories** — U7 players cannot set a goal at all today (no category
  list exists, so a save would write an empty category). I am proposing 3-4.
- **Two cue labels** on Read-the-Play plays that currently render as bare
  one-word pills ("Step", "Covered").
- **Distractor rewrites** for the six questions where every wrong option is an
  absolute ("Never", "Always") and the right one is the only hedged option —
  answerable with no hockey at all.

---

## What is NOT waiting on you

For contrast, so this list does not read longer than it is. All shipped today and
needing nothing from you: the QA gate can now fail, the seed catalog is at 0
warnings from 8, Run the Play is confined to one end zone, the engine checks the
speed a skater accelerates to, all twelve gym drills have the Action Rail, a coach
can no longer be silently downgraded to a player at signup, the Daily Drill crash
is fixed, the anonymous defender is no longer "he" 261 times, and the old
`--dangerously-skip-permissions` overnight script refuses to run.

The question bank's longest-answer tell (66% of questions key the longest option)
is measured and ratcheted so it cannot get worse — but **fixing** it is item 8's
distractor work.
