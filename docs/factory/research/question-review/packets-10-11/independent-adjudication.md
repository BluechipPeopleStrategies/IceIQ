# Independent adjudication: packets 10–11

Status: review complete with flags. This is an independent hockey-content and hash review of the complete replacement payloads. It is not a bank approval, coach approval, mastery decision, or write receipt.

Source return SHA-256:

- packet-10: `ed19aa48918dfb1636217e7eaf0266462d6d8dade210ecd0b454b7767a64b349`
- packet-11: `cf00c67f1046345088c8ec03fe9f670ff76ea0acc37b3f09ba711aae6914730f`

The five replacement scenarios contain 30 affected questions. No separate retained high-risk IDs were supplied in these returns. Current scenario versions are 1; every replacement proposes version 2. Exact current/replacement scenario and question hashes are in the companion JSON.

## Decisions

| Scenario | Decision | Review finding |
|---|---|---|
| `exp26b-u9-008` | flag | Q1 still explains that YOU is “by the boards”; q3 moves from `(21,7)` to `(23,7)` without changing side-board distance, so “closer to the boards” is unsupported. The replacement’s neutral briefing is otherwise a useful correction. |
| `exp26b-u9-010` | pass | Ownership, pressure, outlet, and conditional support language match the authored coordinates. The lower-side reference is a coaching option and is not presented as the only valid point. |
| `exp26b-u9-011` | pass | The replacement correctly removes the false nearest-puck/open-support implications from the scored content, preserves the loose-puck ownership state, and keeps the recovery choices conditional. |
| `exp26b-u9-012` | flag | The shared replacement briefing still calls Gold1’s `(8,5)` position “along the lower boards.” Above/below/lower wording is camera-dependent in this coordinate convention and should be neutralized before accepting the scene context. The player ownership and conditional away-side questions otherwise read soundly. |
| `exp26b-u9-013` | flag | The replacement correctly states the loss, Gold1’s turn, and the defensive role change, but still says Navy3 is “behind” YOU. Navy3 `(9,-4)` is not behind YOU `(13,5)` relative to YOU’s facing `3 rad`; use a neutral closer-to-the-navy-end/lateral relation. Q2 and q6 inherit that defect. |

The review accepts explicitly supplied history as scene basis where the prompt asks about that stated event. Flags above concern unsupported spatial or ownership claims, not a blanket scene-versus-coaching recategorization. No medical, readiness, or guaranteed-outcome claims were used as approval grounds.

See `independent-adjudication.json` for all 30 exact question rows, before/after content hashes, source snapshot, and limits.
