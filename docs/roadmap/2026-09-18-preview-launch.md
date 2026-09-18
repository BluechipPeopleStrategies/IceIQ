# September 18 public preview launch

Owner direction: fix the outstanding issues; provide a code for a quick preview **without an account**; restore RinkReads.com; review OMHA/Hockey Canada curriculum; refresh project skills and philosophy.

## Candidate
- Public code: `FIRST-SHIFT`. Root entry is selected by `npm run build:preview` and vercel.json. This is public sample access, not a private authorization gate.
- U7/U9/U11 age choices; isolated preview identity and browser progress; skippable/replayable introduction; existing rink/role/gear/referee activities. Explicit early-preview/content-review labels remain.
- OMHA/Hockey Canada-inspired Explore/Try/Revisit framing and age-specific guidance. See the source-linked research crosswalk. No copied drills, endorsement, tactical clearance or on-ice percentage-to-screen-time conversion.
- Full account application remains available with `npm run build` but is not the artifact being published. No Supabase/admin code or unrelated public tools are in the preview-only build (22 assets, approximately 4.1 MB).
- Session hydration invalidates stale profile/enrichment/retry responses on identity change, sign-out, unmount and local preview entry. Finish-setup no longer sets a returned profile before the identity guard.

## Fresh checks
- Seven regression cases reproduced six failures before the auth fix; all seven now pass.
- All 68 registered `test:*` scripts passed.
- Full application and preview-only production builds passed; existing chunk-size warning remains.
- Production-built preview browser checks passed: invalid/valid code, U7/U9/U11 entry, first-visit tour, rink interaction, reload/resume, explicit exit, isolated storage and 320/390/768/1280px layouts. Zero account-server requests and zero page errors.
- Full-app sample Home, return Home, emulated touch pan and DEV-only pilot fence passed separately. Initial harness failure was an obsolete expectation against the new preview-only artifact; rerun against the separately built full app passed.
- Both updated project skills passed quick_validate with UTF-8. Initial Windows default-encoding failure was corrected by invoking Python with -X utf8; no package installed.
- Physical-device and qualified hockey/equipment/official review remain open. This launch is an early preview, not a cleared account-based family pilot.

## Hosting evidence before release
- RinkReads.com resolves to Vercel but returns 404 DEPLOYMENT_NOT_FOUND.
- Existing ice-iq project is visible in the authenticated Vercel dashboard and points to the GitHub repository. Previous production deployment: 6RUqkMPeNBWE7LNjmMxgPNF2NiKc, source 532124e (September 7).
- Only ice-iq.vercel.app was mapped to the project. The connector's filtered project list did not show IceIQ; this was not proof of deletion.
- Hobby dashboard shows deployment storage above its free allocation. No upgrade, paid action or deletion authorized/performed; any deployment failure must be reported, not bypassed through destructive cleanup.

## Skills/philosophy update
`docs/rinkreads-product-principles.md` is current product guidance. AGENTS.md and ROUTING.md route to it. CLAUDE.md reconciles contradictory publishing instructions and separates current task authorization from old standing-go language. Project frontend-design and webapp-testing skills preserve accepted art/layout, explicit preview/account boundaries, meaningful UI readiness checks and exact-mode verification. No global skills or memory files were edited; the paused Hockey Authority was not resumed or qualified.

## Research review record
Qwen qwen3.8-huihui:27b received a compact official-source brief, one 120-second attempt, no useful response. Claude then received the brief with no tools; it returned a fabricated file-write transcript and unsupported U7/U9 framing. No claimed file existed. Its draft was not adopted. Terminal Claude usage: input 2, cache-created 21,201, output 9,117 (thinking 6,592 included), cache-read 0. No subscription savings inferred.
After disclosure, Codex worker /root/omha_curriculum_review independently checked official sources and wrote only `docs/research/2026-09-18-omha-pathway-crosswalk.md`. Coordinator reviewed the crosswalk and integrated conservative age guidance; source access/currency limits are retained. Worker token counters unavailable.

## Live result
- **Live:** https://rinkreads.com/ with public sample code `FIRST-SHIFT`, verified September 18 at approximately 18:06 UTC (12:06 MDT).
- Tested release source: `5bdf017143fa537dfe68927f0c32f358b4ffc21c`, fast-forwarded to remote main after hosted-candidate verification. Production deployment: `3nYa8vcT8T8j9tQE1PSkKgVaGfxn`, Ready, build 49 seconds.
- Added the existing apex domain to ice-iq Production. Vercel reports Valid Configuration. Existing DNS already pointed to Vercel; no DNS records, email records, paid plans or security controls were changed. No redirect to an unverified www hostname was added.
- Unauthenticated HTTPS request returned 200. On the actual domain, code entry opened the U7 home and walkthrough; Start loaded the 3D rink; selecting Nets updated its explanation and explored count to 1/3.
- Previous deployment `6RUqkMPeNBWE7LNjmMxgPNF2NiKc` remains available as a rollback reference, but it contains the older account application. Review access/content implications before rolling it back under the public domain.
- Full account authorization remains uncleared: Supabase dashboard requires owner sign-in, live role-matrix/migration checks are still outstanding. Preview does not depend on that backend. Qualified content and physical-device/family checks remain open.
