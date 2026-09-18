# Authorization review — 2026-09-18

Status: NOT cleared for the family pilot. No database policies, accounts or records changed.

## Current findings
1. **Session-state race reproduced locally.** `src/App.jsx` loadUser awaits a profile and later writes profile/player state without checking whether the authenticated identity changed while it waited. SIGNED_OUT clears the state, but an already pending response can reinstall it. The source harness reproduced a delayed coach profile arriving after sign-out clearing. This is stale client state and potential shared-device exposure; it is not evidence of bypassing Supabase RLS. Needs cancellation/identity generation guards and regression checks for sign-out, A-to-B switching, delayed enrichment and retries.
2. **Live backend unavailable from this environment.** Anonymous auth-settings and minimal profiles/invite-code reads returned DNS/connect failures (ENOTFOUND / UND_ERR_CONNECT_TIMEOUT), not authorization responses. Do not interpret them as permission denials or missing tables.
3. **Disposable SQL validation unavailable.** Docker daemon is running (29.6.1), correcting the September 6 environment record. No local Postgres/Supabase image or container is available. Supabase CLI shim exists but its supabase-go binary is missing. No install/download was attempted.

## Recovered historical evidence
- September 10: comprehensive frontend QA fixed nine defects and passed the test/build sweep; TASKS.md explicitly deferred Supabase.
- August 1: security review identified privilege escalation, content-override and team-policy problems. Migration 0022 contains hardening, including privilege-change rejection and narrower policies. Source existence alone does not prove live installation.
- August 4: migration-drift audit records five migrations applied and training/challenge role smoke tests passing then. Treat this as dated evidence, not a fresh full authorization clearance.
- September 6: authenticated-feedback release plan remains prepared/deferred. Its backend draft is outside automatic migrations.
- September 7 onward: migration 0025 creates an authenticated invite redemption RPC and removes client profile insertion. Both signup and missing-profile recovery call that RPC. Verify deployed client/migration compatibility before inviting families.

## Required controlled test matrix
| Boundary | Positive proof | Negative proof |
|---|---|---|
| Signup/recovery | Valid invitation creates own profile; retry does not consume twice; missing-profile user recovers | Invalid/expired/exhausted invite, direct profile insertion and forged identity rejected |
| Player data | A reads/writes own seeded progress | Anonymous and B cannot read or change A; forged player_id rejected |
| Coach/team | Owning coach reads intended team data | Unrelated coach and nonmember cannot read; team-code guessing does not enumerate teams |
| Private coaching notes | Author retains private notes | Player and unrelated coach cannot read |
| Admin/content | Intended admin can perform approved action | Player cannot self-promote, change tier or edit overrides; revoked admin loses access |
| Session lifecycle | Sign-in, refresh, password recovery and re-entry work | Delayed old requests cannot restore signed-out or previous-user state |
| Feedback backend | Owner sees own public updates; admin sees internal review | Other player cannot read; player cannot create internal events or publish updates |

Use a disposable database and purpose-made identities. Service-role access may provision fixtures but must not substitute for role JWTs in assertions. Keep both allowed and denied receipts, migration fingerprint and tested commit. Existing live smoke scripts create accounts and rows; they were not run against production during this read-only audit.

## Review routes and usage
Qwen: installed qwen3.8-huihui:27b verified; one local request received only compact excerpts from three historical audit/release documents. Timed out at 240 seconds without a review. No retry, accepted result or savings claim.
Claude: existing authenticated Claude subscription; one read-only review restricted to Read/Grep/Glob, no MCP servers and 16-turn cap. Existing native workers checked; no jobs interrupted. Latest aggregate usage digest was September 14 and could not establish current remaining allowance. Final result/usage appended after completion. No Codex worker launched.

Frontend tour commit: fb0bb3e. Frontend checks are recorded separately and do not clear this backend gate.

## Independent review reconciliation
Claude completed successfully (session d8e9573c-9393-48da-9199-8e6525098e7a). Main reviewer inspected the cited SQL and code rather than treating its output as an approval.
- **Accepted conditional deployment hazard:** base schema replay recreates three policies later removed by 0022/0025. Added an explicit historical-bootstrap-only warning to schema.sql. This documents the hazard; it does not technically prevent replay or prove current deployed exposure.
- **Accepted source-level hardening concern:** generateTeamCode uses Math.random; team-code joining is an authenticated RPC without a database rate limit in the inspected function. No successful guessing/prediction attack was demonstrated, and external rate controls were not audited. Do not report a proven exploit.
- **Accepted release dependency:** signup and missing-profile recovery require redeem_invite_code from migration 0025. Missing migration would break those paths. Live installation could not be checked.
- **Not promoted to vulnerabilities:** self-selected coach role was already an intentional historical decision; actual team data reads depend on team ownership. Public search_path alone was not shown exploitable in the fully qualified invite function.
- **Corrected reviewer overclaim:** signOut after failed redemption clears the session, not the auth.users account. It does not establish that an auth account without a profile cannot exist. The profile/invite transaction is distinct from auth signup. Confirmation-email and failed-redemption recovery remain test cases.
- **Main review adds the independently reproduced loadUser race:** Claude's statement of no confirmed session defect was narrower than the coordinator's local reproduction. Keep this issue open.
- Removed the unsupported 'no accounts exist yet' premise from the 0025 comment. No executable SQL changed.

Terminal usage: Claude primary model claude-opus-5[1m], input 22, cache-read 653,204, cache-created 87,109, output 13,203 (thinking 7,632 included). Receipt also lists a small Haiku auxiliary call (1,232 input, 14 output). Returned num_turns=22 despite requested --max-turns 16; no follow-up expansion was launched. Calls and turns are not interchangeable. Usage is processing volume, not remaining subscription allowance or demonstrated savings. Raw result and usage receipt are saved under this task's work/auth-claude-review.json and work/auth-review-usage.json. Qwen failure receipt is this log; its auth-qwen-review.json is empty and is not a review.

## Next work, in order
1. Fix and regress identity/cancellation handling of loadUser, including delayed profile/enrichment, queued retries, sign-out, account switches and local preview entry.
2. Establish a reachable disposable Supabase environment and test identities; repair CLI only with permission for any needed installation/download. Confirm live project availability separately before drawing database conclusions.
3. Verify migrations 0022/0024/0025 and execute the positive/negative matrix, then actual first-login/welcome, recovery and re-entry browser paths.
4. Only after receipts pass, include authenticated family access in the Thanksgiving pilot go/no-go.
