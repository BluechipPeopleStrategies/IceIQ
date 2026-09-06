# Packet 18 independent Luna review

**Scope:** all 30 questions, checking current baseline and serialized Claude replacements separately. Source return SHA-256: `c7b6e228036f8b59567d3f9c9743ea51d16a8a1e4c61de5502c9a4a737f87142`; snapshot: `rr-20260905-c8403be16748c919`. Prior calibration remains known-case regression, not unseen blind evidence.

## Baseline versus final payload

The baseline contains recurring grammar/landmark defects, including “YOU is”/“YOU controls” and inaccurate half-wall/right-side descriptions. The final replacements correct some grammar, but the final payload still contains the q009/q010 possessives and retains several geometry/framing problems. The findings below are scoped to the final payload where stated.

Concrete final-payload concerns are: q009-q1 and q010-q1 possessive grammar; q010-q2 narrowing F2 to a later read; q011’s F1/half-wall and wall-reference geometry; q012 camera-relative below wording and arrival-versus-control; and q013 inaccurate right-side/low F2 framing, unnecessary waiting language and an unsupported half-wall comparison.

| Question | Baseline content hash | Finding |
|---|---|---|
| exp26b-u11-009-q1 | `7813cfcbb5c632ae1c62e681dcec0b3287f52a07cd2a7da3eadf1338f7e6e855` | FLAG final payload still uses nonstandard “YOU’s”; use “your” or “YOU” possessive wording. |
| exp26b-u11-009-q2 | `eeff1b990272a1d479742958e0057dfd5836303f26246f9775f2420afaec64e4` | PASS final payload: roles, possession, answer/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-009-q3 | `90d1c9b5c8837cf7867591fa774a7b0aed5b67c033e536bbe409cde98ad5aa9a` | PASS final payload: roles, possession, answer/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-009-q4 | `bcc7f8fcf2a67cb0640c66b3a70bf1f6a11a339c0e1b32ffcd5dcc7c3b4058b0` | PASS final payload: roles, possession, answer/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-009-q5 | `d995764d155903b4516959b0a4cd2c648f784d09c8de068bef68ef75320770b7` | PASS final payload: roles, possession, answer/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-009-q6 | `c1073eaedb18fe20b43b07bacb29017a7b112c5657bc754b522c90b8fd97e3c9` | PASS final payload: roles, possession, answer/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-010-q1 | `2e31b50fb42f6ffc0c4ef52770b9fda9dca9156df33cd7abf72d519b9638f4ce` | FLAG final payload still uses “YOU’s inside shoulder”; correct possessive grammar. |
| exp26b-u11-010-q2 | `6b17f8964d839e4973b95555ce08f0cba84b9a54f2a47fc9cd4ec74eadaec949` | FLAG feedback says F2 is only a later read, which may exclude a valid pre-scan; keep F2 as a conditional supporting cue without making it decisive. |
| exp26b-u11-010-q3 | `c431be138784205591d3548edd1250abfda54b22d78f7ace2af542ddd87d9652` | PASS final payload: roles, possession, answer/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-010-q4 | `0bf39d61a150a5cd07a227b35b2177e9bbafde10ed5b93314d12f7682d70ad06` | PASS final payload: roles, possession, answer/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-010-q5 | `a0e365d3286e70ff7665173ca2c80af7a62c88cee83be7594f5b6c49c8e37d9e` | PASS final payload: roles, possession, answer/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-010-q6 | `3bde071d09410d72261a0a66f87b77e3ccab113691e87a6a3d27558e99ecd9b4` | PASS final payload: roles, possession, answer/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-011-q1 | `8f767212126696a050defc43392d36d479a818510d414599b83ccfecbd8270d5` | FLAG final scene says F1 at the left half wall, but F1=(12,7) is well inside from the side boundary; D1 is near, not exactly on, the F1-YOU line (about 0.566m offset). Use accurate/conditional relationship wording. |
| exp26b-u11-011-q2 | `b917f075c14df36b2a053fedb8564a637e49caca0d90ed40f2e1f2abb3895a6f` | FLAG shared scene geometry issue: “left half wall” and wall framing are inaccurate for F1=(12,7); keep bank route conditional. |
| exp26b-u11-011-q3 | `66929ba51903edc113b737658c35c9ec07e9dae1845633f73f57ed7258cf9744` | FLAG shared geometry issue; bank point should be described conditionally rather than as a wall route grounded by a half-wall puck. |
| exp26b-u11-011-q4 | `5940b8934371257ca25c111fa7747427710da6b09b6b1ebdabf6842a28d813d2` | FLAG reference (20.2,8.5) is about 4.45m from the side boundary, so “along the wall” is unsupported; use an on-ice wide receiving point and conditional wording. |
| exp26b-u11-011-q5 | `b7a8f7307a252afa5db306a425fa6fa6f66e64d9d55040e88b89efe6b1fed4e4` | FLAG shared geometry issue; D1 turn is hypothetical, but comparison should not rely on an inaccurate wall starting landmark. |
| exp26b-u11-011-q6 | `9bd905d23b81bb9227c3a9fd75349049cc2bf25e664fd0d3aabe7e77277de78b` | FLAG shared geometry issue; retain conditional rebound/support language after correcting the landmark. |
| exp26b-u11-012-q1 | `8f780dae282a7a2553e2eb2088d95cf09539ed5a48ca4ca9fdfdc41576d08767` | FLAG “below YOU”/“below intended line” is camera-dependent; use side-board or rink-width relation. q5 must distinguish arrival from control. |
| exp26b-u11-012-q2 | `f9864800dde565ab343c05f106427cb2d441a26a2c4986c2f901344c0bde19cb` | PASS: option c is a valid check about the intended spot becoming stale, while a/b address the live recovery. |
| exp26b-u11-012-q3 | `01419f8784ed4f32b60b75471f7fc6525764130bf48e688836dd2b77e262338f` | PASS final payload: roles, possession, answer/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-012-q4 | `a82a8348fae16edb029d98f2fa4c688eddc784cf6a7da18186ac4b75abc72e13` | PASS final payload: roles, possession, answer/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-012-q5 | `3778c4f52d45373fd4c4cc5712b47a61deac49a2637a5d3a27d5444c2dd77b67` | FLAG “reaches first” alone does not establish possession; prompt should say D1 reaches and controls the puck. |
| exp26b-u11-012-q6 | `9e33b82f58a7d460ae04f43c6c2858e70d2002801e485a1fab491c219d08ea38` | PASS final payload: roles, possession, answer/feedback, alternatives, age and grammar checked; no additional concrete defect found. |
| exp26b-u11-013-q1 | `ec692968bfc4a323cd90ee7bfb936c0729c7d499d69cea54ccdda36d13f51b2c` | FLAG final briefing says YOU is in a right-side lane, but YOU=(16,0) is central across rink width; use accurate central/right-net wording. |
| exp26b-u11-013-q2 | `39392870f733b7744cc352670d954683c15a5d2bb75848a7c3302352ce03d4b8` | FLAG shared geometry wording: F2=(18,8) is wide toward the side boards, not low; correct briefing before relying on cues. |
| exp26b-u11-013-q3 | `28b20a41369fcd9c9a4243a1e279658ab8736daa0dac60d854065b92edb9c763` | FLAG “carrier waits for the updated lane” overstates a pause; frame as scanning/rechecking while moving or before choosing. |
| exp26b-u11-013-q4 | `c8fc1150791d0567a02df6eefd6f967e4e5f4a3bc387a13ff9f9080d8832ea4e` | FLAG shared geometry wording; reference (16,2.2) is an angle change, but “outside D1” needs rink-relative explanation rather than the inaccurate right-side framing. |
| exp26b-u11-013-q5 | `ac82c99519c397957f81734066a1ed2654ac9cc09ccc1c0d9bd9e04254060e61` | FLAG shared geometry wording; conditional D1 movement is explicit, but the final explanation should refer to actual central/wide relationships. |
| exp26b-u11-013-q6 | `73972e541543118eafa92ad7fa91d4d2fe0f38d231adf0abd5df2267ece4e6be` | FLAG asks about “slot and half wall” although the scene does not identify a half-wall position; ground the comparison in the actual central lane, net and F2 position. |

## Limits

No bank, source return or proposal files were modified. Coordinate checks are static and do not establish speed, gaze, reach, arrival order, pass completion or outcome. No browser-rendered flow was tested.
