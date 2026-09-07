# Placement feedback pilot

September 6: Implemented a pure geometry evaluator, two explicit draft rubrics bound to exact revised source/version, shared feedback and an ungraded fallback for experimental placement questions. No nearest-reference grading or keyword-inferred rules. All outputs remain ineligible for mastery. The prototype intentionally never turns a self-declared approval field into a calibrated score.

The two U11 pilot questions now display strong/workable/adjust draft geometry with up to three reasons, Try another spot and an expandable example. The earlier duplicate coaching block is removed. Other questions show Placement needs judgment. Six evaluator tests cover alternatives, a blocked required lane, missing/stale/illegal data, mirror invariance, actual pilot bands and malformed thresholds.

Thresholds are authored prototype parameters, not sourced universal coaching distances. They require calibration before normal-bank use. Important failures cannot be averaged away. The current evaluator supports distance, middle relationship and named straight-line clearance; it does not model interception, facing changes, multiple alternative regions or physics.

Browser checks completed on the actual local question UI:

- U13 q5: choosing Navy2 produces the corrected conditional explanation.
- Retrieval q4: numeric move (-18,-10.5), check and overhead switch retain the same three observations.
- Retrieval q8: D1-lane and lost-F2 selections produce the revised explanation; contradictory puck-state distractor is absent.
- Retrieval q9: (-16,0), (-16,.75), (-16,4) produce strong/workable/adjust respectively; no points awarded.
- Retrieval q10: optional response can remain empty and reveal the corrected loose-puck/conditional explanation.
- Inspected the placement result visually. This is not a complete touch/drag or multi-device 3D rendering certification.

Local bounded placement-event history stores content/rubric hashes, fictional coordinates, bands and criteria under rr-placement-preview-events. Consecutive identical results are deduplicated, history capped at 300; no identity/reflection or mastery is recorded. This is prototype instrumentation, not an analytics dashboard or durable shared storage.

Update: the five source repairs have now been applied locally. Shaded draft areas in 3D/overhead and first-versus-latest comparison are implemented. See IMPLEMENTATION-2026-09-06.md for the current verification record. Remaining: calibrated family-specific rubrics, broader coverage, touch testing and production admission. See placement-coverage.json for measured coverage. Do not describe the whole placement project as completed.
