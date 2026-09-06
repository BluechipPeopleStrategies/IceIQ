# Packet 20 independent Luna review

**Scope:** all 30 questions, independently compared with both current baseline and serialized replacement payloads. Source return SHA-256: `3cb55aed17b12c0d05908ca682e89e2854298c3c9fc03cf36831af75230f55c6`; snapshot: `rr-20260905-c8403be16748c919`. Prior calibration remains known-case regression evidence, not unseen blind evidence.

## Findings

The final payload preserves several baseline landmark errors: packet 19’s screen-relative “below” wording; packet 20’s unsupported “right half wall” for D1=(20,7); packet 21’s claim that D1=(18,2) is between attackers at x=12 and x=16; packet 22’s “F2 is wider” despite equal y coordinates and camera-relative “above”; and packet 23’s camera-relative “above F2”. Role and possession checks otherwise resolve correctly: away D1/D2 and F2 are not confused with Navy support, loose puck states remain unowned, and explicit turnover hypotheticals are conditional.

The five position references in the final replacement payloads are on ice. Their actor-to-reference movements are 4.031m, 3.202m, 2.154m, 1.803m and 0.800m respectively; these do not prove arrival, containment or execution.

| Question | Baseline content hash | Finding |
|---|---|---|
| exp26b-u11-019-q1 | `6abeb73e5e8562903b8dcb5d66c02165c2525d724dbf77be02fecc23f93249a4` | FLAG final still uses “F2 is below the play”; this is screen/renderer dependent. Use a rink-relative route or net/side-board relationship. D1 is the away puck owner and the turnover key is otherwise correct. |
| exp26b-u11-019-q2 | `7d5a379a39a654349babfdf009006fcca2a7e59a2e3247ba57324a5c47f47e6b` | FLAG shared screen-relative “below” briefing issue; defensive cues (D1 carrier and F2 route) are otherwise role-correct. |
| exp26b-u11-019-q3 | `ae8626234d9d540b30a45a60556ce87b595af25c198a90815962350e8907c4e6` | PASS: possession transition is explicit and the recovery choice remains conditional. |
| exp26b-u11-019-q4 | `5ebe8177c2e847fb6defd9b826e53cfcc0a96d0d3eeeed5d23cc1d5b95e6e894` | PASS: reference (1,3.5) is on ice and moves YOU 4.031m toward the defended left net; it is an example, not arrival proof. |
| exp26b-u11-019-q5 | `84bb94e40bf3e5516ed41e2cdc96bfd58ad8d663c3bfecc339a30477ea3df817` | PASS: hypothetical F1 regain explicitly changes the support read; no guaranteed outcome. |
| exp26b-u11-019-q6 | `6df79018c475b33ff243dcabb597bd7a19f2ced39c2038cfcc56ecfc69f3b2ae` | PASS: explanation distinguishes jobs by turnover and direction. |
| exp26b-u11-020-q1 | `60d6a22c096f5dc73003a7a2cd6fd0dadb0e6c5e7620e324b8cffcae930693d7` | FLAG final briefing calls D1’s location “right half wall”, but D1=(20,7) is well inside the side boundary and near the faceoff-circle width; use accurate landmark wording. |
| exp26b-u11-020-q2 | `038873015abf3514aa185e9999e97a17e2f01ab93566084bd04b48c00412eb2e` | FLAG shared landmark issue; D1 facing/route and D2 outlet remain valid conditional cues. |
| exp26b-u11-020-q3 | `99461ccf693b56b0c91f5c03b31f717af0043bec158a9cd65f1af1e3748ce1b4` | FLAG shared landmark issue only; scoped forecheck sequence is defensible. |
| exp26b-u11-020-q4 | `e9482fbf6832d0abf56a813e7e38c7d08b7bbc0f70d70c5826c0501d2470e972` | FLAG reference (16,3.5) is on ice, but “between D1’s half-wall route and D2’s outlet” depends on the inaccurate half-wall framing; state the measured lane relationship directly. |
| exp26b-u11-020-q5 | `3afd29220a7d8ceb62b4bbe6784672c860d06ef7658e49b416d912e0e50981df` | FLAG shared landmark issue only; D1 turn is an explicit hypothetical and response is conditional. |
| exp26b-u11-020-q6 | `dbbc8932f8c4a9d826d210da6a27647043db890c9a7050137f265f95baef56c3` | FLAG final prompt repeats unsupported half-wall/blue-line labels; replace with rink-relative carrier/outlet coordinates or relationships. |
| exp26b-u11-021-q1 | `3b378a6f4796d5519f72bdce8a2d07850ddf318dba3ba02e3d77f0cec1f627dd` | PASS: one gold skater D1 is shown; goalie is separate. |
| exp26b-u11-021-q2 | `d36d282c4439799b9b2fc33785d787a1eb31bb2053e882706db4c34cc969072c` | PASS: D1 and F2 are correctly treated as conditional cues; no forced pass rule. |
| exp26b-u11-021-q3 | `4bee430697957c067c84b461d7b9a09b0ad552a6f5bfb46d3d4fa4272b568718` | FLAG briefing says D1 is “between the attackers”, but D1 x=18 is beyond YOU x=12 and F2 x=16 toward the +x net, not between them. Correct scene relationship before retaining dependent wording. |
| exp26b-u11-021-q4 | `83404613a1b9dc399a8ce420fdcd9dd33242c433ca50141ddc640fa2c83620ad` | FLAG shared D1-position issue; reference (14,5.8) is on ice and moves YOU 2.154m, but explanation should not imply a cross-ice relationship proved by the false between-attackers briefing. |
| exp26b-u11-021-q5 | `6e4b1cd252dc761e44ca6329533ee545c385cc2067af77a9cda24fec1487ba68` | FLAG shared D1-position issue only; explicit movement and reachable F2 make the conditional pass read sound. |
| exp26b-u11-021-q6 | `2fbd56359a447d5f90a4e68a4f28f024ad3ff46290f1c51a890a385442545e7a` | FLAG shared D1-position issue only; conditional lane language is otherwise sound. |
| exp26b-u11-022-q1 | `d9deb83764bd11295e8933531de6a299504ec1e11553c2d16c963d55a52d38f7` | PASS: owner null correctly yields loose puck; centres’ teams are home Navy and away Gold. |
| exp26b-u11-022-q2 | `efd35d47317d5a1b77990681ed1dcbf37110de224e19aee42dae3a8dd52899d0` | FLAG “F2 is wider” is false/ambiguous: F2=(3,4) has the same y as YOU=(-3,4), so it is not wider across rink width. Keep support conditional on which centre gains control. |
| exp26b-u11-022-q3 | `c003bb23d9ea17998f28a89b319cb91b78282e9ffa51af2181d8e3a5dfb316b9` | FLAG “above the dot” is screen/coordinate ambiguous in the baseline/final briefing; use neutral-zone/side relationship. Sequence itself is sound. |
| exp26b-u11-022-q4 | `f3fd898b7ce432df58895d60afa4cdf2f9d6a1ef7042b96021c55449244471a4` | FLAG “above the contest” is camera-dependent; reference (-2,5.5) is on ice but should use a defined rink-width relationship. |
| exp26b-u11-022-q5 | `039cb0da558d6aad21166cad70fc34d73405863404f34c4295634c8b75df8fe1` | PASS: Gold C2 control explicitly changes direction/job; defensive route is conditional. |
| exp26b-u11-022-q6 | `9b7f3d743bab3aaeaf6c63af4d0520519a4d9b9d801a516b837cdcb19d958428` | PASS: explanation correctly makes team possession determine support/recovery. |
| exp26b-u11-023-q1 | `7ac8e5ed34f06ec79ace82b34992071ba0dd8dd3df817ec2d3b4dcfdf0fbf796` | PASS: puck is loose and F2 is the closer Navy skater (4m versus YOU about 5.657m); no ownership is inferred. |
| exp26b-u11-023-q2 | `ec0010fb461da33b9d339d233254c6554baf304f68391a083fbc8be290b82b73` | PASS: support checks correctly distinguish carrier view, defender response and crowding. |
| exp26b-u11-023-q3 | `f234ffe1cb2d1990c568c4614e75e32849b17f7e568819fcc07da64a5b3f22e9` | PASS: sequence explicitly waits for F2 control before re-checking the exit. |
| exp26b-u11-023-q4 | `14ba1842275b9daa07421ece884b08b8a46d25c7de418af0fb0b92005c27b4af` | FLAG “above F2” remains screen/coordinate ambiguous; reference is on ice and slot-side, but use side-board/middle wording. |
| exp26b-u11-023-q5 | `29155005cac16d27948ed6d383c50864fd9f980a15642e5f72817fadbb35fbf2` | PASS: D1 winning possession explicitly changes the carrier and direction. |
| exp26b-u11-023-q6 | `b439d741d4c78961661a8792c0978ba3b2071ffbf1883a2eb5c79b3010bee565` | PASS: explanation keeps outlet conditional on D1 coverage. |

## Limits

No bank, source return or proposal files were modified. No browser-rendered flow was tested. AI review does not constitute human coach approval, curriculum admission or deployment approval.
