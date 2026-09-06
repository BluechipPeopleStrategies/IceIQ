# Player release readiness — 2026-09-05

This is a read-only release audit for the four verified commits named for the player experience. It does not claim a deployment and does not change source, migrations, or `docs/roadmap/TASKS.md`.

## Release boundary

The checkout contains the commits in one linear chain:

`576e1c1` → `e6c5c05` → `8428bf7` → `78194fa`

The requested production reference is `4457ee6218185e4300aa8acb0a2893aa27054b50` (`origin/main`, release subject `release: publish reviewed question packets 01 through 09`). The current `HEAD` is `7c2e682`, whose history contains all four named commits. This audit uses the ref as a comparison boundary; it does not claim that any local candidate has been deployed.

| Commit | Scope | Direct migration dependency | Readiness without migration |
|---|---|---:|---|
| `576e1c1` | Player Home, learning worlds and device-local sustained-practice evidence | No | Safe candidate with its documented parent closure, subject to resolving the real production base. Its verification explicitly says the ledger is browser-local and not cloud-synced. |
| `e6c5c05` | Age-tailored world activities and game-decision copy | No | Safe after `576e1c1`; it is a small dependent correction and has no Supabase or migration references. |
| `8428bf7` | Goals, coach assessments, lineup, training persistence and stricter Supabase adapters | Yes | Hold. It adds the remote `coach_private_notes` and `training_sessions` contract and changes coach/training reads and writes. Without migration 0024, cloud save/restore is not a complete release. |
| `78194fa` | Rink discovery scope and 3D game/goalie runtime assets | No coach/goals/training or SQL reference in its own diff | A migration-independent 3D/player closure is feasible, but it must be reconstructed against `576e1c1` → `e6c5c05`: its parent is `8428bf7`, and three learning-world files also contain overlapping age-gating changes from `8428bf7`. Apply the final 781 content/net diff and run its focused tests/build; do not raw-cherry-pick the commit and assume the parent is irrelevant. |

The practical migration-independent slice is `576e1c1` plus `e6c5c05`. `78194fa` adds no runtime dependency on the migration-dependent coach/goals/training work, but its commit ancestry and overlapping learning-world edits require a deliberate rebase/reconstruction before it can join that slice.

## Migration requirement

`supabase/migration_0024_coach_privacy_training.sql` is required before shipping the complete 8428bf7-and-later chain. It:

- adds a restrictive select policy for legacy `coach_ratings.skill_id = '__general_notes__'` rows;
- creates `public.coach_private_notes` with coach-owner and team-player RLS;
- reconciles/creates `public.training_sessions`, its player and coach policies, and its date index.

The migration is written as an idempotent local preparation (`if not exists`, policy replacement, and a transaction), but local application is not evidence that the remote project has it. The verification receipt says the migration has not been applied remotely, legacy private sentinel rows remain governed by existing deployed policies, and authenticated cloud save/restore plus remote schema verification remain pending.

## Tooling and auth check

The Supabase CLI is installed locally at `C:\Users\mtsli\bin\supabase.exe`, version `1.3.13.0`. I attempted only read-oriented CLI checks (`supabase status --output json` and `supabase projects list --output json`), with telemetry disabled for the latter. Both stopped before reporting project or auth state because the CLI tried to write a temporary telemetry file below `C:\Users\mtsli\.supabase` and received `EPERM`.

No token, password, or environment value was printed or inspected. The CLI is available, but current remote authentication and project/migration state are unverified in this environment: the local command failed during telemetry-file setup, before it could report authentication. The historical verification receipt separately records that CLI authentication was unavailable at the time of that receipt; the EPERM result alone is not an authentication failure.

## Verification receipts used

- `docs/one-on-one/2026-09-05-player-home-verification.md`: 33 focused checks, isolated production build, and local browser checks for Home and device-local practice evidence; no cloud sync claim.
- `docs/one-on-one/2026-09-05-coach-goals-training-verification.md`: 35 core/SQL checks, 13 component checks, local PGlite RLS checks and isolated build; explicitly records migration 0024 as not remotely applied and live cloud save/restore as pending.
- `docs/one-on-one/2026-09-05-rink-games-verification.md`: 576 practice checks, gym/shootout/art-lint checks and build; records a 3D release baseline of `8428bf7`, with no migration claim.
- `docs/superpowers/plans/2026-09-05-app-completion.md`: requires remote metadata inspection and explicit disclosure when a locally prepared migration is not deployed.

## Suggested next bounded action

Compare the target against production ref `4457ee6218185e4300aa8acb0a2893aa27054b50`. For the minimal migration-independent player release, use the `576e1c1` → `e6c5c05` closure. If the rink/3D changes from `78194fa` are wanted, reconstruct their final source/assets/tests on top of that closure, resolve the three overlapping learning-world files, and run their focused tests plus the production build. If the target includes the complete `8428bf7` chain, have an authorized operator apply migration 0024 remotely, then run read-only remote migration/schema checks and authenticated synthetic coach/player access tests before release. Do not describe the coach private-note or training cloud path as production-ready from the local PGlite/browser evidence alone.

## Root follow-up

The reconstructed release passed 73 tests with the required esbuild filesystem access and the production build. On September5, root reran the read-only Supabase projects list outside the sandbox: it returned “Access token not provided.” Remote coach/training verification is now specifically blocked on Supabase sign-in, not merely filesystem access. No remote mutation was attempted.
