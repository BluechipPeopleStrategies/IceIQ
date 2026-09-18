# Pilot home, content review pack and interactive visuals

September 18, 2026. Owner approved simpler home + review pack, then chose interactive movement now and full 3D as the next milestone.

## Implemented local scope

- PilotHome: one Start/Continue/View recap action, next-step title, six-step outline and collapsed parent options. Connected to local U7/U9/U11 Home and the existing review arena's `arena=pilot` entry. Existing production routing remains unchanged.
- Pilot progress is read from the existing per-player/per-age foundations checkpoint. No new progression or entitlement model.
- MovableIllustration: pointer drag, keyboard arrows, zoom/reset. Rink marker selection remains separate. Referee motion captions stay outside the transformed picture. Gear retains packing and gains closer inspection. These are interactive 2D illustrations.
- Standalone review pack: 71 source-derived items; named reviewer, date, role, age, format, decision, notes; JSON export; item hashes + aggregate source-file fingerprint. Partial exports list pending IDs. It cannot publish content or award approval in the app.
- Full 3D follows the bounded reference-set milestone in 2026-09-18-foundations-3d-milestones.md. No new 3D model delivered in this change.

No dependencies installed, database writes, messages sent, push or deployment.
