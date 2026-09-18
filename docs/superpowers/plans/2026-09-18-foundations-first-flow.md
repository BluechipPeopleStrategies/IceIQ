# First integrated foundations flow

Approved direction: September 18 conversation; first integrated world learning path and access/progress verification. Implements the foundations slice of the September 17 Thanksgiving plan, without completing the wider world-unlock design.

- Existing PracticeHub / LearningWorlds entry, Frozen Trails, U7–U11. One Start/Continue launches landmarks → positions → gear → referee study → practice → recap.
- Native React controls reuse the exact owner-approved prototype content and SVG drawing functions. No iframe, new dependencies, new tactical claims, mastery awards or unlock rules.
- Development-only review availability until named human content reviews and pilot entitlement decisions are complete. Existing production navigation and account gates stay intact.
- Device-local checkpoint by player ID + normalized age band + content revision. Store stage and activity state. Resume after reload/re-entry; show honest unavailable-storage feedback. No child name/email in new records.
- Tests first for scoped progress, malformed/revised records, blocked premature completion and failure handling. Browser checks cover all stages, resume, age isolation, drag/tap/keyboard and phone width. Run access regressions, practice suite and build.
- Local Qwen supplies bounded edge-case critique; coordinator implements and verifies. No model hockey review.

Implementation: foundationFlowCore.js + tests; foundationContent.json and foundationRink.js / foundationSignals.js derived from dated prototype; FoundationFlow.jsx/.css; minimal PracticeHub/LearningWorlds entry wiring. No Supabase writes, invitations, push or deployment.
