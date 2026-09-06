# Packet 19 independent Luna review

**Scope:** all 30 questions, reviewed against the current baseline and the serialized replacement payloads separately. Source return SHA-256: `a1e98f86b24cfd4f590ccbf9b29e6d0b051f336ca0df58f339f4095af699a23d`; snapshot: `rr-20260905-c8403be16748c919`. Prior calibration remains known-case regression evidence, not unseen blind evidence.

## Baseline versus final payload

The baseline contains the reported grammar and geometry defects. The final payload corrects some grammar and the Navy defended end in exp26b-u11-015, but several final issues remain. Most serious is exp26b-u11-015-q4: its explanation leaks repair-process notes and its reference is not between F1 and the left net. Other final concerns are exp26b-u11-016’s goal-side/inside framing and unsupported slot/half-wall language, plus exp26b-u11-018’s need to keep away carrier and home support roles distinct.

All five final position references are on ice; measured actor-to-reference movements are 3.081m, 1.803m, 1.581m, 3.041m and 2.163m. These measurements do not establish timing, containment or successful execution.

| Question | Baseline content hash | Finding |
|---|---|---|
| exp26b-u11-014-q1 | `5b4db7ba450e12b56cb903533122be968b8829a43226098b6052ffaa71b95985` | PASS final payload: roles, possession, answers/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-014-q2 | `a3a4735a2c754d2ad8e9f2f98a2cda572c43cc66d3cdc8cdcc85fc30070a5ca5` | PASS final payload: roles, possession, answers/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-014-q3 | `7ccecd87899a14f22a897d5de2726f188c963b9067e3d617eece4da264760bf6` | PASS final payload: roles, possession, answers/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-014-q4 | `cbb879f6681c37bffcdf650cd4f72f93567f9979788d33cd1ae04a3b0c63ce0a` | FLAG final replacement is geometrically an example on ice (3.081m move), but D1 at (22,4) is not on the exact F1-to-net middle line; keep “clear of D1” conditional rather than certifying coverage. |
| exp26b-u11-014-q5 | `700dcdd5b4a99b15586d8c4459dfda89c9a0678d0b2b7005581f15c8c572d4e4` | PASS final payload: roles, possession, answers/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-014-q6 | `f017eb37506df92305c8de514419df4930a4ca01645b6a040a1e51589846e8a9` | PASS final payload: roles, possession, answers/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-015-q1 | `2e865ea513a78f21ef0e83a5942c17f50d0ba37b7d8a975a180902e1e9f8d8e8` | PASS final replacement correctly changes Navy defended end to left net; goalie is home at x=-26. |
| exp26b-u11-015-q2 | `71e7958c196c75ce9c28631dcfcb26c8109092ac6ddf5178ef0c1ee0951d6afd` | PASS final payload: roles, possession, answers/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-015-q3 | `72ce9032829ff6fbc743ab122d4596ccb7c09081d2507439bbad130b269d1f30` | PASS final payload: roles, possession, answers/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-015-q4 | `1b140d4cad7e6d6d08e0764511e46e9f22f9f73c37117ca964dffca95982a6d5` | FLAG final payload openly leaks repair notes in learner feedback (“corrected net position”, “outside this fix’s authorized scope”). Also reference x=14 remains on the YOU side of F1 x=9, not between F1 and left net x=-26; reject until rewritten with a valid relationship. |
| exp26b-u11-015-q5 | `a381f7be3a0cbea5f74c44e22ec20d218202cad4a031fbe5e4c26567c0a495e7` | PASS final payload: roles, possession, answers/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-015-q6 | `3928352ef90f619a36ac1c834dc0b7b5ed729377ab8430f054fc83916f6b96f7` | PASS final payload: roles, possession, answers/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-016-q1 | `b49591268b919d581c73be159d7a1a5e041fa96f898c64b7d55d6f7473ea5275` | FLAG final prompt keys “inside F1,” but YOU x=11 is up-ice of F1 x=9 toward Gold’s left-net attack; across-rink y=2 is middle-side. Do not call this goal-side/inside without defining the relationship. |
| exp26b-u11-016-q2 | `f220ec47677031d6e0515e633a9b5eac80f2c8025be7a8614d32bff9795cf739` | FLAG final scene supports an inside/middle read, but option/explanation should avoid implying a fixed route; F2 is an opponent and remains a conditional scan. |
| exp26b-u11-016-q3 | `41ebe4258b78d9e6874b953ef8da3beb3bb6be8c22e3af966f31d54881c7609a` | PASS final payload: roles, possession, answers/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-016-q4 | `70d3fa80da853120c57aee74634320cbdb2572592b523e822b016f694134f189` | FLAG reference (10.5,3.5) is on ice and moves 1.581m; “between F1 and the middle” is plausible across-rink, but should be stated with explicit rink-width coordinates. |
| exp26b-u11-016-q5 | `7d7aaddfc847c7fa423833747765d5b7a8292005ac150a340e87b4d847f9a2c8` | PASS final payload: roles, possession, answers/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-016-q6 | `427c21196ae0f89ec945b5b025427bab1a92f9705657607425fb53b40513c512` | FLAG “slot and half wall” are not established landmarks in this scene; ground feedback in the actual middle/side-board coordinates and conditional route. |
| exp26b-u11-017-q1 | `9e7b2d6182163f7d7565e0457ebc1421db72220c10e74202fb55f53c99f0b2d9` | PASS final payload: roles, possession, answers/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-017-q2 | `315011b712059d98391c0d37b572eae4fdb375eede5d41490338cd16e7a1fe96` | PASS final payload: roles, possession, answers/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-017-q3 | `3884e7ea62af6dbf5305e0788754a17f51c3cd71eeefcbb37f12bfc24293e559` | FLAG final sequence says recognize, recover, re-check; acceptable as a scoped routine, but do not imply a rigid stop-start order. |
| exp26b-u11-017-q4 | `c6df92c3461182c01d561f25122afef69eabc96adba107bba34c2193ea85c8a4` | PASS reference (10,2.5) is on ice, 3.041m from YOU, and lies toward the defended left-net side of F1/F2; outcome remains unproven. |
| exp26b-u11-017-q5 | `258fa08c37839c77b186a4225806642b258f6110c61700a38036a8ab3d34801b` | PASS final payload: roles, possession, answers/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-017-q6 | `adeefb23974cf7ac32aca34df63266d7309baa41ad638985ecac03d353d419fa` | FLAG final explanation says the net-side relationship limits the lane; retain conditional language because static positions do not prove containment. |
| exp26b-u11-018-q1 | `1c6a63c1cded46877ef3c4881aa6a2470f16f83b6ef9511085416dfc04a104ff` | FLAG final replacement correctly identifies home D1 as the pressure teammate; goalie is away and not the pressure actor. |
| exp26b-u11-018-q2 | `01ee168bf7b7d847637d0a8f8f4f6222bfdea83b423d64c2b5e4f80336f4669e` | PASS final payload: roles, possession, answers/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-018-q3 | `b5e5261b14a3b31af7995bed03dee94e042cdf7753838f28c364583f9dc82b2f` | FLAG scoped sequence is usable, but “skate into” must not imply a guaranteed interception or fixed order. |
| exp26b-u11-018-q4 | `5fcb72170586fb79812df8861e39d731fa322d251aa796d122ce3faf0def0b7a` | PASS reference (14.01,-2.8) is on ice and moves YOU 2.163m toward F2; explanation correctly avoids claiming one spot solves the play. |
| exp26b-u11-018-q5 | `b1c1fbc93e6b20147e3edafa7b9c6fb57e62dfab2b0d0a428b8e38f5408695f0` | FLAG feedback must distinguish the away puck carrier F1 from home support D1; “support the more dangerous lane” should name the conditional teammate-pressure read without treating F1 as support. |
| exp26b-u11-018-q6 | `8277b72a1b05d19f75b27012d5e76999dc60d2daa32f152db946db79fe314909` | PASS final payload: roles, possession, answers/feedback, alternatives, age and grammar checked; no additional concrete defect found. |

## Limits

No bank, source return or proposal files were modified. No browser-rendered flow was tested. AI review does not constitute human coach approval, curriculum admission or deployment approval.
