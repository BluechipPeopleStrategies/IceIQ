# Packet 04 independent adjudication — 2026-09-05

This is an independent coaching/content review of the complete `repairs[].replacement` payload. It does not approve, apply, or publish a bank edit. I reviewed every affected sibling question and the replacement scene geometry.

## Identity and hashes

- Packet `packet-04`, snapshot `rr-20260905-c8403be16748c919`.
- Coverage is complete: 30/30 current questions; all base hashes match the current composed experimental bank.
- Five v2 replacement scenes are present. All 30 replacement-review `contentHash` values match the exact replacement questions; all five affected lists equal the actual hash-diff closure. Twenty questions change (4 + 4 + 4 + 4 + 4), while unchanged siblings are preserved in the replacement payload.
- Replacement scenes preserve the authored scenario IDs, actors, puck ownership, and non-question setup fields. The current source remains v1; no proposal is applied.
- Static coordinate checks are evidence against repository geometry only. They do not establish skating, visibility, timing, or pass success.

## Exact replacement adjudication

| Scenario / questions | Decision | Finding |
|---|---|---|
| `exp26b-u7-002` q5 | **Accept** | Ownership stays with YOU. q5 correctly makes Gold1's movement hypothetical and keeps the response conditional; the “new lane or clear pass” response does not claim a guaranteed lane. |
| `exp26b-u7-003` q1–q6 | **Accept with render check** | Navy2 is the stated owner and Gold1 is between the carrier and support read. The replacement consistently distinguishes owner, receiver, pressure, and a hypothetical response; q2's two cues, q3's illustrative support spot, and q4's sequence agree. Verify the “open middle”/relative side language at the default camera; static coordinates do not prove visual separation. |
| `exp26b-u7-004` q1–q6 | **Amend wording, otherwise accept** | Gold1 is the stated owner and the replacement correctly turns YOU toward the navy end, keeps the carrier and Navy2 in view, and conditions the imagined movement. Replace q5's camera-dependent “lower side” wording with a relative prompt such as “Gold1 shifts across the lane. What should guide YOU?” The current +y/upper-lower convention is not reliable across the shipped views. |
| `exp26b-u7-005` q5 | **Accept** | The imagined Gold1 movement is explicitly hypothetical. “Find another clear place” preserves flexible support and does not promise that Navy2 is open. |
| `exp26b-u7-006` q1–q6 | **Accept with render check** | YOU owns the puck and Gold1 is the inside pressure. The repair makes protection a body-and-scan coaching task, avoids contact or safety claims, and keeps all imagined changes conditional. Verify that the wall-side reference and carried-puck separation read clearly in the rendered board. |

## Cross-question findings

- The five scenes now agree with their owners and preserve their authored actor identities; no replacement silently changes an owner or turns an imagined event into a visible fact.
- The q5 hypothetical templates still contain two orientation words (`upper` in `-002`, `lower` in `-004`). That is one wording defect, not a geometry or ownership blocker; `-002` should receive the same relative rewrite for consistency.
- The packet keeps U7 coaching about scanning, room, support, and puck control. It does not add a rule, contact, medical, readiness, or reward-for-higher-exertion claim. The puck-protection framing should remain described as an illustration rather than a universal U7 rule.

## Release disposition

Accept the five replacement payloads subject to the q5 relative-side wording amendment above and the listed render checks. No question is blocked on the supplied static evidence. This remains an independent review artifact, not human coach approval, rendered-scene certification, or admission to the approved bank. No production bank, packet, scenario seed, TASKS file, or application source was changed.
