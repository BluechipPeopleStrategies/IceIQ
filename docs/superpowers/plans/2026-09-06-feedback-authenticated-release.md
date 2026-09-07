# Authenticated feedback release

Owner approved separate administrator/player views and proceeding. Supabase execution remains deferred. This plan prepares that work, without treating local browser tokens as authorization or changing the live database.

## Current evidence

- Existing app: src/admin.jsx AdminRoute uses auth.getUser and profiles.is_admin. This is UI gating; database RLS must enforce access.
- Existing migration_0022_rls_privilege_hardening.sql protects the admin field. Its presence in Git is not evidence it ran in production.
- Local views and seven tests passed. Local API intentionally permits a developer to request the administrator projection. Do not expose that API publicly.
- Docker CLI exists, but its daemon was unavailable during this pass. Draft SQL has not been executed or validated against PostgreSQL.

## Prepared database boundary

Review docs/factory/coaching-panel/backend-draft.sql on a disposable Supabase/PostgreSQL database first. It is not in the auto-migration path.

1. Registry binds scope/question/hash to a source snapshot, populated only by trusted release tooling. No client can certify its own hash.
2. Submission RPC derives owner from auth.uid, validates the registered identity and input bounds. Original feedback is append-only for clients and administrators.
3. Internal review events are admin-only. Public updates are stored separately and visible only to the feedback owner and administrators. Do not project internal summaries into player responses.
4. Admin membership uses protected profiles.is_admin. Verify migration 0022 and self-promotion denial before enabling feedback.

## Required execution order

1. Run the draft in a disposable database with the actual auth schema. Test anonymous, player A, player B and admin identities; no service-role key may stand in for these tests.
2. Assert anonymous submission/read denial; A cannot read B; forged owner impossible; guessed registry hash rejected; player cannot read/write internal events or publish updates; admin can read all and append notes; original notes cannot be edited/deleted. Test revoked-admin and self-promotion attempts.
3. Add an authenticated transport beside the local Vite transport. Choose explicitly by environment. Cloud errors must not silently downgrade into a local received receipt.
4. Connect the actual AdminRoute to a React version of the local administrator desk. Do not iframe the unauthenticated static admin.html as the production admin interface. Subscribe to auth changes; clear sensitive state on sign-out/revocation and let RLS remain authoritative.
5. Move player history to authenticated identity; keep unsent drafts separate per account. Do not import unowned historical local notes into a player's account automatically.
6. Publish approved question registry identities through trusted release tooling before enabling submissions. Registry snapshots contain answer keys; players must not be granted registry SELECT.
7. Verify two-account browser sessions, actual writes, admin/public updates, mobile, failure/retry and sign-out. Only then enable the feature flag and deploy.

## Release outcome required

Provide test receipts, migration ID, account-role matrix, deployed version and browser evidence. A SQL file, successful build or view switch is not a completed backend. No live credentials or database mutation is needed from Thomas until the deferred Supabase phase resumes.
