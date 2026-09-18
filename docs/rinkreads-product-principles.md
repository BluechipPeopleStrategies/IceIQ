# RinkReads product principles and current operating decisions

Updated September 18, 2026 at Thomas's request. This is the current product guide; dated audits remain evidence, not automatic clearance.

## Product and audience
RinkReads helps young players recognize hockey situations and talk about what they notice. Begin with a small U7–U11 player/family preview. Use short, clear activities, supportive feedback and easy repetition. Device-local activity completion is not proof of hockey mastery, equipment fit or rules competence.

## Access and release modes
- Thomas chose a quick preview without an account on September 18. The public code opens sample content, not private data or paid entitlements. It is a convenience entry, not a security boundary.
- `npm run build:preview` makes the public site: code entry, age selection, welcome guidance, native foundations, separate device-local progress. It does not import App/Supabase. `vercel.json` selects this build for the current preview launch.
- `npm run build` retains the full account application for development and future release. Do not treat preview success as authenticated signup, recovery, RLS or cross-device-sync success.
- The current share code is `FIRST-SHIFT`; implementation is `src/player/previewAccess.js`. It is intentionally public sample access. A future confidential/private preview needs a separately designed server authorization boundary.
- Restoring RinkReads.com was explicitly requested for this launch. This is not standing permission for future unrelated publishing, purchases, DNS changes or destructive operations. Keep a verified previous deployment/commit for rollback.

## Learning philosophy
Use **Explore → Try → Revisit**, with age-specific language and optional reflection. Show recognition/activity checklists without ranking talent. Preserve requested landmarks, role labels, illustrative maps, gear and signals; do not invent age locks or force early position specialization.
U7 emphasizes simple shared discovery; U9 revisits basics and explores roles; U11 connects observations to decisions and a conversation with a coach. Full-rink maps teach vocabulary and do not assert that every age plays full-ice. Heatmaps are illustrations, not tracking data or fixed tactical prescriptions.
The OMHA/Hockey Canada crosswalk is `docs/research/2026-09-18-omha-pathway-crosswalk.md`. Distinguish national guidance, dated Ontario rules and our original adaptations. Do not copy drills, imply endorsement, or convert on-ice practice percentages into digital quotas. Broader skating/puck-skill coverage remains a curriculum gap, not something the vocabulary preview fulfills.

## Visual and interaction principles
Preserve the approved six-world artwork and navy/gold direction. Standardize markers, pills and containers; test wrapping and spacing at narrow widths. Interactive movement serves the lesson: pan/zoom/reset, accessible alternatives and clear labels. Three-dimensional rink/helmet/referee samples are available; catalog-wide 3D and polished production characters remain later work. Avoid autoplay as a requirement. Respect reduced motion and preserve 2D fallback.
Use a skippable, replayable first-visit tour. Explain actual sections and storage limits. Remember tour choices per player and variant; do not write learning progress from a walkthrough.

## Engineering and evidence
Use existing dependencies. Test the actual release mode on phone-width and desktop layouts, keyboard/touch where available, reload/exit, blocked storage and separated preview/real-player identities. Inspect screenshots, not just DOM assertions. Distinguish automated browser tests from physical-device checks.
Authentication work must invalidate delayed profile, enrichment and retry responses on sign-out, identity changes, unmount and preview entry. RLS needs positive and negative tests under real role identities; client gating and service-role tests do not prove authorization. Do not replay historical schema.sql over hardened production policies.
Verify current hosting, DNS, project and deployment independently. A connector's filtered project list is not proof a project was deleted. A DNS/connect error is not an authorization denial. A successful local build is not a live deployment receipt.

## Human review and MVP
Keep early-preview content labelled as under review. The unqualified/paused Hockey Authority role remains research-only; this update does not resume it. Human review of tactics, referee gestures/rule examples and equipment guidance remains required before treating content as cleared instruction.
Thanksgiving target remains October 12, 2026, with October 7 go/no-go. The no-account preview is an earlier access milestone, not automatic completion of authenticated family-pilot or content gates. See the dated MVP plan and latest roadmap.

## Maintenance
AGENTS.md routes here and to TASKS.md. Update TASKS.md after work. Refresh source-specific claims and tool availability instead of treating old reports as current. Review model output as draft evidence; invented tool actions, files or unsupported source claims are failures. Record Qwen → Claude → Codex escalation and measured usage; never infer subscription savings.
