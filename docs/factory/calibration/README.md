# Skating movement calibration pack — 2026-09-06

This is a staged, coach-review-only pack of four **original static 3D scene candidates**: one each for U7, U9, U11 and U13. It is not imported into `src/one-on-one/experimental-bank/`, the live experimental bank, `src/data/bank.json`, or `src/scenario/seeds/`.

The candidates progress from naming open space before a simple change of direction (U7), through wall-side turning (U9), pressure/support before a pivot idea (U11), to pressure/support/open-ice comparison before a pace-change or turn idea (U13). Each has six questions in the required order: choice, multi, sequence, position, choice, explain. The position references are starting points for discussion and do not make a single coordinate the universal answer.

Every candidate carries separate `metadata` with:

- `status: "draft-awaiting-coach-calibration"`
- age-specific `conceptIds` and `teachingClaim`
- `visibleEvidence` limited to locations, relationships and stated puck ownership
- `notAssessed` covering speed, acceleration, edge technique, stopping/pivot execution, scanning behaviour, puck control, success and transfer
- `reviewQuestions` for the coach's age-fit, legibility and wording pass

## Source boundary

The age progression and movement themes are grounded in Hockey Canada’s [Skill Development | Skating](https://hockeycanada.ca/en-ca/hockey-programs/players/essentials/positions-skills/skating), especially “The Skating Pathway” and its eight skills. Hockey Canada says basic skating is introduced at Timbits U7/U9 and developed further at U11/U13; that supports the progression, not any authored answer or measurement.

For the younger candidates, [USA Hockey’s FUNdamentals Stage](https://portal.usahockey.com/cx/vice-president/hockey-development/8u_fundamentals_stage-adm.pdf) supports age-appropriate agility, balance, coordination, forward turns and controlled stops. For U11/U13, [USA Hockey’s Learn to Train Stage](https://portal.usahockey.com/cx/vice-president/hockey-development/12u_learn_to_train_stage-adm.pdf) supports continued coordination, skating and puck-control development without early position specialization. These official references do not certify the static scene answers, route quality, speed, edge use or live-ice success.

## Review catalog and boundaries

Open [index.html](./index.html) from an HTTP served copy of this folder. The catalog loads this JSON through a relative `fetch`, shows each question's suggested answer and rationale, links each scene/question to the planned 3D preview route, and provides age filters. Feedback is held in page state keyed by question ID, so changing the age filter does not discard edits; the optional Save draft control also stores it in browser-local storage when available and reports when that storage is unavailable. The feedback button downloads every question, including filtered-out questions, with scene ID, scenario version, question ID, coach verdict and note. It never sends feedback automatically.

The pack remains `draft-awaiting-coach-calibration`. These candidates are not admitted to the live experimental bank or any approved bank. A static freeze can support discussion of visible locations, puck ownership and conditional decisions; it cannot assess speed, acceleration, edge technique, stopping or pivot execution, scanning behaviour, puck control, success or learning transfer. Position references are discussion starting points, and more than one clear space may be reasonable.

Root's independent validation should rerun `validateExperimentalBank` against `pack.candidates`, verify the current shared carried-puck placement and rink bounds, and perform the rendered 3D legibility review. The catalog's source links are official Hockey Canada and USA Hockey references; their age progression and movement themes do not certify this pack's authored answers or technique claims.
