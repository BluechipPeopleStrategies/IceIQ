# RinkReads Thanksgiving MVP — player/family pilot

**Target:** pilot begins over October 10–12, 2026, with Monday, October 12 as the start date. Canadian Thanksgiving is October 12 ([Government of Canada](https://www.canada.ca/en/revenue-agency/services/tax/public-holidays.html)). **Readiness decision: October 7.** October 8–9 are reserved for fixes and release preparation.

Thomas selected a small player/family pilot and Thanksgiving as the ideal start. Dates below are planning targets, not a claim that work is scheduled, staffed or guaranteed. No invitations, release or database changes have been performed by this plan.

## What this MVP needs to prove

A family can enter RinkReads, find an age-appropriate activity, complete a short lesson, understand the feedback and return to useful practice without a developer guiding them. The pilot tests usability, content clarity and repeat use; it does not establish improved on-ice performance.

**Proposed cohort:** 6–10 families, covering U7, U9 and U11, including parent-assisted U7 sessions. Aim for at least two families per band. Confirm the actual age mix by September 21; the owner has requested gear and referee learning across all three bands. Do not treat full-ice position diagrams as the required U7/U9 game format.

**Proposed use:** three 5–8 minute sessions during the first pilot week. These are targets to test, not measured current lesson times. Children can stop earlier. Parents help with access and observation; the app should explain the learning flow.

## MVP boundary

Include:

- A reliable access path using the existing account/invite mechanism, with verified missing-profile recovery, sign-in/re-entry and clear error handling.
- One obvious Start/Continue learning path inside the existing worlds direction. Do not expose the four comparison layouts as permanent player modes.
- Know the Ice: landmark exploration and a simple introduction to positions. Add responsibilities and illustrative maps to the pilot only after named human coaching review of the exact version.
- Pack Your Gear: 13 skater equipment categories, drag or tap/keyboard packing, removal/reset and adult fitting guidance. Review the exact content with an equipment-qualified adult.
- Read the Referee: six starter signals, age-adjusted choice counts, retry/reveal and short explanations. A qualified official reviews drawings, captions and applicable age/program framing. Teach recognition without assuming penalty lengths or full-ice U7/U9 rules.
- A small curated set from existing content: proposed minimum six short sessions for each agreed pilot band, with enough distinct reviewed examples for three visits. Count usable sessions, not raw bank totals. If this inventory cannot be justified, agree a scope change before the rehearsal; do not silently drop the requested U7–U11 foundation coverage.
- Guided practice with explanations and retries. Keep completion, challenge unlocking and spaced mastery distinct. Unreviewed experimental items earn no mastery credit.
- Reliable save/resume within the declared storage boundary. If records are device-local, say so and test the same device/browser; do not promise cross-device sync.
- A simple parent feedback route and a repeatable process for fixing reported problems. Verify the route outside local development; the existing local feedback endpoint is not automatically a production service.

Defer from the pilot critical path: payment or pricing changes; team/coach dashboards; broad U7–U18 curriculum completion; full 3D character redesign; automated scenario generation; new video export; live AI tactical grading; advanced simulations; app-store releases. Existing features can remain in the product, but should not be prerequisites for the pilot path.

Pilot pricing/access entitlement and the parent-facing invitation wording are an explicit owner decision before invitations are prepared. This plan does not assume free versus paid access or change existing limits.

## Milestones and dates

| Target | Milestone | Concrete exit evidence | Owner / dependency |
|---|---|---|---|
| **Sept 18–21** | M1 — Scope and access verified | Confirm cohort bands, one pilot route, entitlement and review availability. Inspect current remote/release state. Exercise real signup/invite, missing-profile recovery and return sign-in with authorized test identities. Inventory eligible lessons by age. | Codex coordinates; Thomas chooses cohort/access and names a coach. Remote access may require an owner action. |
| **Sept 22–25** | M2 — One complete learning path | One age band goes from entry → world → mission → feedback → recap → return visit. Integrate the tour, gear and referee activities behind that path. Preserve source IDs and existing practice records. Verify a phone and desktop flow. | Engineering; depends on M1. No public push without release approval. |
| **Sept 22–27** | M3 — Small content set cleared | Named human coach reviews the actual landmarks, role copy, each heat-map state and curated lessons. An equipment-qualified adult checks the gear checklist; a qualified official checks all six referee signals and age framing. Record accept/revise/hold by exact version. Include surface/age fit. Select the default guided layout; branching remains bounded. | Thomas/named coach, qualified official and equipment helper plus coordinator. Runs alongside M2. |
| **Sept 28–Oct 2** | M4 — Pilot candidate | Complete agreed age coverage. Check phone/tablet/desktop, keyboard/touch, save/reload, retries, profile separation, sign-out/re-entry and actual feedback delivery. Run release build and relevant regressions. All critical defects closed. | Engineering and physical-device help from Thomas/families. Depends on M2 and M3. |
| **Oct 3–6** | M5 — Small rehearsal | Observe 2–3 families using the real pilot candidate. Capture where they need help, whether cues/feedback make sense and whether a later session resumes correctly. Fix blocking issues. | Thomas recruits/coordinates; family participation is an external dependency. |
| **Oct 7** | M6 — Go/no-go | Review exact release candidate, open issues, cohort instructions, support owner and rollback procedure. Decide proceed, narrow or delay. | Thomas owns decision; Codex supplies evidence. |
| **Oct 8–9** | M7 — Buffer and release preparation | Fix only release-blocking issues; rerun affected checks. Approved deployment verified on the actual live URL. Parent note and access instructions are ready for review. | Engineering; deployment and outreach approval remain explicit. |
| **Oct 10–12** | M8 — Begin pilot | Approved families gain access; each has one clear starting activity and a way to report trouble. Start first-week observation. | Thomas authorizes outreach and cohort access. |
| **Oct 19** | M9 — First-week review | Review repeat use, navigation help, content misunderstandings and defects. Choose the next small iteration before widening the cohort. | Thomas, coordinator and coach as needed. |

## Go/no-go criteria

1. No unresolved blocker in access, lesson completion, progress recovery or profile separation in the tested pilot path.
2. Every item surfaced as teaching in the pilot has the required exact-version review. Unreviewed maps can remain in this design prototype but must be omitted from the pilot.
3. At least two rehearsal families complete the core flow and return to it on a later session. Record adult help instead of treating assisted completion as independent success.
4. Layout works on an actual phone and tablet plus desktop; browser emulation alone is not the physical-device gate.
5. A real feedback/support route is confirmed, alongside a named responder and a tested rollback or disable path.
6. The release candidate, access mechanics and invitation are reviewed before public action. Calendar pressure does not waive these criteria.

Suggested first-week signals: at least 80% of observed players find and begin the assigned activity without navigation help; at least 70% of enrolled families return for a second session; all blocking issues are triaged within one working day. With 6–10 families, report the underlying counts and observations, not statistically significant claims. Ask a coach to judge changed-example reasoning; automatic scores alone are not evidence of learning transfer.

## Capacity, risks and cutbacks

Planning assumption: roughly **10–14 focused engineering days**, two short owner checkpoints per week, a named coach able to review by September 27 (allow approximately 2–3 hours plus corrections), plus an official/equipment review slot, and 2–3 families available for rehearsal. These are provisional estimates after local inspection, not measured task durations. There are about 16 weekdays from September 18 through October 9, so slow external decisions can consume the buffer.

Critical path: **access/release verification → one integrated route → reviewed content → device/persistence checks → family rehearsal → release approval**.

- If access is not understood by September 21, prioritize diagnosis and review the date before expanding the UI. Do not silently switch to an unapproved account/data model.
- If content review slips, reduce the lesson set; any change to U7–U11 foundation coverage needs an explicit scope decision. Hold the maps out of the pilot; do not present a diagram as qualified teaching because it looks finished.
- If integration slips, keep one guided layout and use existing readable rink assets. Optional branches, extra visual effects and broad world unlocking can wait. Any change to the approved unlock design needs an explicit scope decision.
- If the October 7 gates fail, use October 8–9 only for bounded fixes. Otherwise run an explicitly labeled supervised demonstration over Thanksgiving or move the pilot date; do not call an unfinished release an MVP.

## Verified starting point and limits

Current local branch: `qa/2026-09-10-pass`; starting tip for this planning work was `ad12314`. Earlier this session, 61 existing test commands and the build passed; the added curriculum suite passed 21 checks. That evidence is local and dated September 17, not live-release validation.

The four layout storyboards, Know the Ice tour, gear packing and referee signals are standalone prototypes. Their integration into the React app remains work. The approved worlds-container design still differs from the current multi-menu interface. `src/utils/authRouting.js` and `App.jsx` already implement a finish-setup path; the roadmap's older assertion that recovery needs to be built is stale. Verify that implementation and its remote behavior rather than recreate it. No current production account defect is asserted without a fresh check.

Project references: `docs/roadmap/TASKS.md`; `docs/superpowers/specs/2026-09-07-world-container-progression-design.md`; `docs/research/2026-09-17-articulate-layout-lab-verification.md`; `docs/factory/companion-lessons-8/RELEASE.md`; `docs/hockey-authority/PAUSED-HANDOFF.md`. Hockey Authority qualification and shared 3D production remain paused; the named human coaching review is not delegated to an unqualified model.

## Planning review

Local Qwen (`qwen3.8-huihui:27b`, loopback only) supplied a bounded schedule critique. Accepted: access and coaching review are dependencies, one layout keeps scope manageable, and October 7 allows a two-day buffer. Rejected: reducing the rehearsal to one family or arbitrarily restricting device checks to two named phone models. Qwen's output is a draft critique, not validation of feasibility. Requests/results are in this task's `work/mvp-qwen-*.json`; no retry or Claude/Codex worker. Time/token savings are unmeasured.

## Foundation module acceptance checklist

- U7: adult-assisted names and equipment packing; two referee choices. U9: independent recognition with three choices. U11: explain gear purpose and match among four choices. These are proposed difficulty settings, not validated age norms.
- 13 gear categories can be packed by drag, tap or keyboard; remove/reset work; packing all items never certifies safe fit.
- Six starter calls: holding, roughing, head contact, goal scored, interference and slashing. Motion descriptions accompany the still illustrations. Include more signals only after the first set is reviewed.
- All three ages can retry, reveal and restart without a timer or loss of earned progress. Prototype results are session-only and have no mastery value.
- Reference: Hockey Canada 2026–2028 rulebook, printed pages 2–3, and Hockey Canada parent equipment/fitting guidance linked in the prototype. Drawings are original draft schematics, not copied photographs.
