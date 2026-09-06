# Blade/puck geometric diagnostic

Current U11 rounded-study geometry; this is technical evidence, not hockey approval.

| Pose | View | Lowest blade above ice (mm) | Blade-to-puck separation bound (mm) | Including tape (mm) |
|---|---|---:|---:|---:|
| neutral | world | 30.000 | 4.600–4.600 | 4.600–4.600 |
| neutral | first-person | 30.000 | 4.600–4.600 | 4.600–4.600 |
| turn-lean | world | 30.000 | 4.600–4.600 | 4.600–4.600 |
| turn-lean | first-person | 30.000 | 4.600–4.600 | 4.600–4.600 |
| turn-lean-stride | world | 30.000 | 4.600–4.600 | 4.600–4.600 |
| turn-lean-stride | first-person | 30.000 | 4.600–4.600 | 4.600–4.600 |

The perspective puck occupies y=0–25.4 mm. The marker uses y=52 mm; it is not the puck centre. Point-to-marker proximity must not substitute for finite-volume contact. Exact part triangles are evaluated after skinning and world transformation; positive lower bounds certify non-contact. The diagnostic injects vertex-range metadata into a tmp-only source copy and verifies unchanged mesh attributes plus identical posed blade vertices against the original imported rig.

Files: blade-contact-report.json (source hashes, methods, bounds, coordinates, pose/view comparison), blade-contact-diagnostic.mjs (repeatable measurement), blade-contact-instrumented-rig.mjs (tmp-only range instrumentation).

No production source changed, no broad tests, no bank reads, no browser or hockey approval.

Measured result: the current blade does not sit on the ice and cannot touch the grounded perspective puck at the carried XY location. Its lower surface is 30 mm high, leaving 4.6 mm clear air above the puck. The carry marker is only 1.179 mm from the blade surface, despite the physical separation. All six posed blade triangle hashes are identical: these torso/stride poses do not reposition the blade; world and first-person geometry agree exactly. Three analytic control cases (vertical separation, horizontal separation and actual intersection) passed. The physical ice mesh is at y=0 in the inspected PracticeScene.jsx.
