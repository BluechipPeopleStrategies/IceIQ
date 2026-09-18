# RinkReads: fresh visual pass and first 3D rink

Reviewed September 18, 2026. Older motion layouts are references, not assumed-current standards. Local pilot only; no deployment or paid service use.

## Implemented now

- First actual 3D rink in the foundations flow: dimensional board shell/base and goal frames, with the existing rink drawings mapped onto its surface. All 22 landmark, six lineup and 24 responsibility-map states reuse the current content. Player labels and map overlays are flat surface graphics; this is not a new 3D player simulation.
- Constrained orbit, overhead/angled views, zoom and reset. Camera changes do not mark a lesson complete or alter an answer. Attack-right orientation stays consistent. Labelled selection buttons remain outside the canvas.
- Manual 2D view remains available, including after drawing/WebGL failure. No autoplay camera motion. Rendering runs on demand, capped at 1.5 device-pixel ratio.
- Pilot Home now uses the preserved Frozen Trails artwork with a clear heading, one main action and dimensional cards. Lesson headings and gear cards use brief, optional movement. Reduced-motion preference disables decorative transitions.
- Exact content review pack regenerated against the changed renderer fingerprint. Its printable drawings are 2D; they cannot approve a 3D viewpoint. Review the interactive view separately.

## What I inspected locally

- BlueChip remotion style vault and branded-motion-background design from August 24: historical options, not current approved RinkReads standards.
- BlueChip September visual-reopen queue motion sheet: observed dimensional objects, quiet backgrounds, clear short headings, contact shadows and a gold focal object. Candidate status retained; not described as approved production artwork.
- Existing `remotion/src/qualityPilots/HeadcountQueueV2.tsx`: verified source uses ThreeCanvas and a studio-lighting/material system. This establishes an existing technical path, not asset quality or cross-project approval.
- Existing gallery motion implementation notes: historical source for small settle-in motion, not evidence the current app implements it.
- RinkReads six-world master image and world-art-style guidance: inspected actual image and reused its existing first-world crop. No replacement artwork or BlueChip brand transplant.
- The September 17 Motion-reference discovery note. Live reference URL failed both browser and web inspection today; its current appearance and reuse terms remain unverified. No source pixels/assets copied from it.

## Fresh capability checks and decisions

| Current source checked | What it establishes | RinkReads decision |
|---|---|---|
| [React Three Fiber performance guidance](https://r3f.docs.pmnd.rs/advanced/scaling-performance) | Supports on-demand rendering and resource/performance controls. | Use on-demand rendering for a mostly still learning object. Physical phone performance still needs measurement. |
| [W3C reduced-motion technique](https://www.w3.org/WAI/WCAG21/Techniques/css/C39.html) | Describes respecting the system motion preference. | Decorative card/chapter motion turns off; no automatic camera movement. This is not a complete accessibility audit. |
| [Rise modular authoring](https://www.articulate.com/features/modular-authoring/) and [current Rise version history](https://cdn.articulate.com/assets/kb/360/en-Rise-360-Version-History.html) | Current product includes modular interaction and custom HTML/CSS/JS blocks; AI authoring options exist. | Keep each activity as a small interactive block. No need to migrate this React pilot or assume AI-authored hockey content is qualified. |
| [Meshy Image to 3D](https://docs.meshy.ai/en/api/image-to-3d) and [Remesh](https://docs.meshy.ai/en/api/remesh) | Vendor documents image-driven model generation, remeshing and web-friendly exports. | Candidate for a bounded future helmet/gear comparison. No account, entitlement, cost, topology, accuracy or device-performance claims verified; no generation run or purchase performed. |

Installed versions verified: Three 0.185.1, React Three Fiber 8.18.0, Drei 9.122.0. These are installed versions, not a claim that they are the latest. The browser reports a Three.Clock deprecation from the existing stack. No packages were upgraded to silence it; rendering checks pass.

Recommendation: retain exact authored geometry for the rink. Compare newer AI-assisted assets against an authored helmet sample before selecting the gear workflow. Evaluate silhouette, hidden surfaces, scale, file size, visible fit cues, loading and touch manipulation on an actual family device. For referees, validate the hands/arms and teaching camera with an official. These are proposed evaluation criteria, not completed benchmarks.

## Verification

28 focused route/home/checkpoint/camera tests passed. Production build passed with the existing chunk-size warning. Browser checks passed for orbit, camera controls, no progress mutation from viewing, all six positions, map controls, 2D/3D switching, 390/320px layouts, reduced motion, return/resume and simulated graphics-context loss followed by 2D recovery. All 52 generated rink SVGs parse and load as image textures. Full U7 six-stage flow, gear and recap reload, age isolation and storage-failure handling passed.

One real defect found and fixed: an HTML-style boolean `data-heat-area` attribute was invalid when the same drawing became an XML/SVG image texture. It now has an explicit value. These checks do not qualify the hockey content, prove physical-device performance or provide a screen-reader audit.

Evidence in this task's `work/`: rink3d-verification.json, verify-rink3d-interactions.cjs, verify-rink-textures.cjs, rink3d-build.log and rink3d-desktop/mobile screenshots. Synthetic browser checks did not contact live account services.

## Local draft critique

Model: installed qwen3.8-huihui:27b, loopback Ollama only. Input: compact proposal, visual characteristics and constraints, no private account data. First 350-token call exhausted its output budget without a final answer. One corrective retry disabled thinking and capped output at 400 tokens. Files: work/rink-motion-qwen-request/result.json and work/rink-motion-qwen-retry-request/result.json.

Accepted its suggestion to explain constrained rotation (already reflected in the controls text). Rejected the unsupported claim that stretching animations to 400ms is safer; reduced-motion instead removes them. No claim of high-fidelity output or educational approval is accepted from this critique. No Claude/Codex worker dispatched. Savings unmeasured.

## Next milestone

Review the visible rink candidate, then build one helmet and one referee pose using this fresh assessment. Compare real assets and real devices before choosing a larger production workflow. September 22–25 reference-set target remains provisional; September 27 assesses 3D suitability, October 7 is pilot go/no-go, October 12 remains the intended family-pilot start.
