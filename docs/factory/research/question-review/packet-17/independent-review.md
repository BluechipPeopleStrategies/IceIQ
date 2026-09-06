# Packet 17 independent Luna review

**Scope:** all 30 packet-17 questions across exp26b-u11-004 through -008, including retained exp26b-u11-008. This is JSON/current-bank and coordinate review; no browser-rendered flow was tested. The prior eight-case calibration remains a known-case regression exercise, not a genuinely blind test.

Source return SHA-256: `d0b82c24b6f06d7264f8501b0b04ff7884f11b915de0c8be7fa0d0b549b52bdd`; snapshot: `rr-20260905-c8403be16748c919`. Current composed-bank questions were hashed with `questionContentHash`.

## Findings

The replacement payloads contain shared grammar defects: exp26b-u11-004 says “YOU has”, exp26b-u11-005 says “YOU is”, exp26b-u11-006 says “YOU is”, and exp26b-u11-007 says “YOU carries” in the briefing/cue. These affect every linked question hash. Retained exp26b-u11-008 also has “YOU has” in its briefing.

Additional concrete issues: exp26b-u11-004-q4 uses camera-ambiguous “above”; exp26b-u11-005 has inaccurate half-wall and screen-relative D2 briefing plus q5 feedback that redundantly names F1 as both carrier and “F1”; exp26b-u11-006-q1 calls a puck inside the right circle “below the circle”, and q5 must distinguish reaching first from gaining control. The remaining role assignments and keyed states were checked against the roster and puck owners.

| Question | Current content hash | Independent finding |
|---|---|---|
| exp26b-u11-004-q1 | `0a32d5dc10af5f73432a5dd926a16a4daf42373b5686cc96881e24bc6f860900` | FLAG: shared briefing has “YOU has”; q1 explanation also says “YOU’s job”. Use “YOU have” and “your job”. Puck owner h2/F2 is otherwise correct. |
| exp26b-u11-004-q2 | `fbc9416572f44c5b9459a94431c07620adcb62229e1eb3a8ca15d78838ea1a47` | FLAG: shared briefing grammar only; a/b correctly identify F2’s puck and D1’s line. |
| exp26b-u11-004-q3 | `2008a5d801cf4976a624d7d6844a3504b9bb3c8f42a5a48745bc2562b2863c7f` | FLAG: shared briefing grammar only; scoped post-pass sequence is defensible. |
| exp26b-u11-004-q4 | `b1bcf86382859bfd08db888c9859624b1847c85ae25b258ba7454e6f5a27bdcc` | FLAG: shared briefing grammar; “above” is coordinate-valid here but camera-ambiguous. Use rink-relative side-board/middle wording. |
| exp26b-u11-004-q5 | `e748c7b7dbe418a9964ab58a98f45efbf9c46591888d2228ad6f7ce610700d53` | FLAG: shared briefing grammar only; distractors are distinct. |
| exp26b-u11-004-q6 | `db22cf5c58c2e64aaf0c014c76ada13cdb8ca5632e2ba9e42f201c0e26505a4e` | FLAG: shared briefing grammar only; benefit remains conditional. |
| exp26b-u11-005-q1 | `b91cb25974dbc365e797b354ee14cdca10bf24af839f7be56c0ea111364c2cca` | FLAG: shared briefing has “YOU is”; use “YOU are”. Puck owner h2/F1 is correct. |
| exp26b-u11-005-q2 | `40ae39abd604760dd8bfbd76b425eb77e400d500823d9b5aa999919cdf050485` | FLAG: shared briefing grammar only; reachability/separation cues are sound. |
| exp26b-u11-005-q3 | `2f16b60d6da3d9d28fdfef287957a6bf64ce6c3ebe22a3901e793eb00861e289` | FLAG: shared briefing grammar only; scoped reset sequence is sound. |
| exp26b-u11-005-q4 | `f43ffd35864eef7aa093421fc7073397ed77d70c0acf2fa83800d58e7ddfff66` | FLAG: briefing says F1 is at the right half wall, but F1=(17,5) is far from the rounded side boundary; D2 “above” is screen/coordinate ambiguous. Correct briefing before relying on it. |
| exp26b-u11-005-q5 | `89a45caccbf0f08587a94b2de4f7072c76686425dc3d9b1da54d5f4b599607cf` | FLAG: shared grammar plus feedback says “carrier’s space, F1”; F1 is the carrier, and no other support is shown. Rewrite feedback to name the remaining support/lane without duplicating the carrier. |
| exp26b-u11-005-q6 | `32cac2df344f15ae232488582edf4eefc0aaf2ce572622ebfa3ce0ad7625458b` | FLAG: shared briefing grammar only; conditional reset is sound. |
| exp26b-u11-006-q1 | `7f8ae94cf533cb7cc609a346bc944602d4a4cfb83cb137a422da4dcf0bf91a1f` | FLAG: shared briefing has “YOU is”; additionally puck (23,-5) is inside the right faceoff circle, not “below the circle”. Correct landmark wording. |
| exp26b-u11-006-q2 | `aedece8de15ae3dbcaf1936a4dd6d8dfe553ec1e7330bed77f47b7be3fc352ec` | FLAG: shared briefing grammar only; D1/net and F1 support are valid cues. |
| exp26b-u11-006-q3 | `06e73655c17bae62d4a97d2f629207b83bce0f3e5d054ebc841d6ef73aa97af6` | FLAG: shared briefing grammar only; scoped routine is defensible. |
| exp26b-u11-006-q4 | `ab567220f437810a07ae7e52b3c34d43c23c994cced9e95f514e9bb38b59e64e` | FLAG: shared briefing grammar only; reference (22.1,-4.1) moves YOU toward the puck and stays on ice. |
| exp26b-u11-006-q5 | `91354db0f231cd93c447f7393f287ef8253e663995cc584e080fbd097a326794` | FLAG: shared grammar; “reaches first” must be paired with control before declaring possession/job change. |
| exp26b-u11-006-q6 | `912f1552625161a4bac8f62f792f4a468c5921e61dcb75f8ab9795d9edd7e02c` | FLAG: shared briefing grammar only; second shot remains unproven. |
| exp26b-u11-007-q1 | `08f1d8bedaa4148b4adc1e3cdb860b4b0191f2911d6aa35fcc0a71aa26691c55` | FLAG: shared briefing/cue have “YOU carries”; use “YOU carry”. D1 is 2.828m from YOU; F2 8.485m. |
| exp26b-u11-007-q2 | `d83a2771c05a51e41cd38664dba61d451d5147e760106ed2d84d6d61fa66023c` | FLAG: shared grammar only; cues are sound. |
| exp26b-u11-007-q3 | `6ee4d2dd40c77bde1c6db74cd9fb70abc7f7de8afc8cdeae230b7ed1bace8592` | FLAG: shared grammar only; one-touch constraint is explicit. |
| exp26b-u11-007-q4 | `47c516d417401cf494415741d228d894c9c28ccdb7758f96e0baa8b2dea0b16e` | FLAG: shared grammar only; reference moves outside and away from D1. |
| exp26b-u11-007-q5 | `6676a76d3ce8b48512eff2bda4a613bb12ec438535bfe8ee96ca721191a05cf7` | FLAG: shared grammar only; hypothetical conditions are explicit. |
| exp26b-u11-007-q6 | `f07d99ec7e81f7260b449e7257d08f9a79dd6d4151e51409d4618d8c16d11fa0` | FLAG: shared grammar only; pass remains conditional. |
| exp26b-u11-008-q1 | `b58fe5c68b09023613d39be4567494177bf066db9ee779b23b39e4d91c160ec5` | PASS: retained/current content checked for roster, possession, geometry, alternatives, feedback, age and grammar. |
| exp26b-u11-008-q2 | `248fb61aa335b66a52d1a05eda7e4820d6bd49f531ff824e8dd3cdf1078a2706` | PASS: retained/current content checked for roster, possession, geometry, alternatives, feedback, age and grammar. |
| exp26b-u11-008-q3 | `485cbc81b4acecaabf8bf0de4114e083b2a8786b2baa91ca7b4b7aedfb2362ed` | PASS: retained/current content checked for roster, possession, geometry, alternatives, feedback, age and grammar. |
| exp26b-u11-008-q4 | `32bc79c2601c04da299e6d5deb4695890e43c5309363ac0c84ffe06abf0a632a` | PASS: retained/current content checked for roster, possession, geometry, alternatives, feedback, age and grammar. |
| exp26b-u11-008-q5 | `c19dbe7967364d39ad230a4d6f95846f1068df33650a33b47d1b73ad6e807f83` | PASS: retained/current content checked for roster, possession, geometry, alternatives, feedback, age and grammar. |
| exp26b-u11-008-q6 | `2d251dfd1312562387ba05ab758cc02dd0f4e6da43bef917c1cc64c9bb3f7577` | PASS: retained/current content checked for roster, possession, geometry, alternatives, feedback, age and grammar. |

## Limits

This review does not approve human coaching content, curriculum placement or deployment. Static coordinates do not prove skating speed, arrival order, stick reach, gaze, pass completion or outcome. The packet self-check labels were treated as claims to verify, not evidence.

## Root reconciliation of this initial review (2026-09-06)

The opening attribution is incorrect: the four grammar errors listed for b004–b007 belong to the current baseline, and Claude's source replacement payloads already repair them. The initial reviewer conflated those versions. Preserve that error here for accountability rather than treating it as a new Claude failure.

The six b008 PASS rows are also too broad: its shared briefing still had both YOU has and an incorrect neutral-zone claim (x=-8 versus defensive blue line -7.62). Root identified the zone error and amended all six affected hashes. Those initial PASS labels are superseded by the final exact-hash receipt, which covers the actual corrected proposal. Root measured all five reference positions separately in root-geometry.json and read the serialized final questions. Neither review establishes human coach approval.
