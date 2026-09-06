# Packet 05 independent adjudication — 2026-09-05

This is an independent coaching/content review of the complete `repairs[].replacement` payload. It does not approve, apply, or publish a bank edit. I reviewed every affected sibling question and the replacement scene geometry.

## Identity and hashes

- Packet `packet-05`, snapshot `rr-20260905-c8403be16748c919`.
- Coverage is complete: 34/34 current questions; all base hashes match the current composed experimental bank.
- Five v2 replacement scenes are present. All 34 replacement-review `contentHash` values match the exact replacement questions and all five affected lists equal the actual hash-diff closure. The four U7 six-question blocks and the U9 ten-question block are fully accounted for.
- Replacement scenes preserve the authored actors, puck ownership, IDs, and non-question setup. The current source remains v1; no proposal is applied.
- Static coordinate checks do not establish skating, timing, sight lines, or pass completion.

## Exact replacement adjudication

| Scenario / questions | Decision | Finding |
|---|---|---|
| `exp26b-u7-007` q1–q6 | **Accept with curriculum hold** | The block consistently starts with Navy2 carrying, then asks YOU to create and reread support. q1–q4 are scene-fit and the hypothetical q5 is conditional; q6 explains a quiet lane without making a guaranteed-outcome claim. The content is sound, but the packet's own evidence notes that U7 has no `off-puck-support-offense` curriculum node. Keep this as a banding decision, not a hidden content approval. |
| `exp26b-u7-008` q1–q6 | **Accept with curriculum hold** | The replacement identifies the new puck owner after the stated pass, asks for a fresh owner/pressure scan, and uses an illustrative receiving spot. It removes the uncheckable scene claim and avoids rigid placement. U7 `receiving`/carrier-options coverage remains a curriculum binding question. |
| `exp26b-u7-009` q1–q6 | **Accept with render check** | The named blue-line landmark is used as a search cue rather than a required location. q2–q5 keep Gold1's movement hypothetical/conditional and q6 explains re-reading. Verify the camera-independent rendering of “named blue line” and the reference position; the text itself does not claim a guaranteed pass. |
| `exp26b-u7-010` q1–q6 | **Accept** | The block correctly starts after the missed pass, preserves Gold1 as the current puck owner, and makes the recovery sequence an update rather than a fixed route. q5 explicitly asks for a new read and q6 explains why the earlier plan is stale. |
| `exp26-u9-001` q1–q10 | **Accept** | Gold1 is actually between Navy2 and YOU in the replacement geometry. The q3 and q9 positions are illustrative support spots, q4 is a suggested routine, and q5/q7/q8/q10 teach checking the current lane rather than treating the circle as a mandatory place. The alternatives are defensible and no source-free rule or contact claim is introduced. |

## Cross-question findings

- All five replacement blocks agree with their scene owners and preserve their question IDs. The U7 blocks now use conditional movement and scanning language rather than reporting imagined defender movement as a visible fact.
- The U7 support/receiving content is a real curriculum placement issue surfaced by the packet's own report: it should be resolved by the curriculum owner (re-band, add an age-appropriate introductory binding, or narrow the framing), not silently treated as a hash or geometry defect.
- The full-rink orientation and +y disagreement is handled by the replacements with relative landmarks. Any remaining visual ambiguity needs application/render verification.

## Release disposition

Accept the exact replacement content, with the U7 curriculum-band holds and the listed render check. No question is blocked on the supplied static evidence. This remains an independent review artifact, not human coach approval, rendered-scene certification, or admission to the approved bank. No production bank, packet, scenario seed, TASKS file, or application source was changed.

## Root verification correction

The row for exp26b-u7-010 incorrectly describes Gold1 as the puck owner. The actual replacement has `puck.owner: null`: the puck is loose, and q1 correctly answers nobody. Root verified the replacement directly; the earlier sentence is a report error, not a source change. Its recovery advice was rechecked against the loose-puck state.
