# Independent technical review before opening the answer key

Reviewer: Codex. Input: the eight supplied historical cases and correction guide.
No answer key opened at this point. This is not the designated Claude judgment,
human coach approval, or an unaided/held-out skill test. No app renders reviewed.

| Case | Verdict | Evidence and required correction |
|---|---|---|
| exp26-u11-006-q7 | REVISE | Puck (23,5), D1 (22,1), right goal beyond x=23: D1 is behind the puck in the goalward x direction, not between puck and goal. "Below the circle" also needs the actual landmark definition and is viewpoint-dependent. Use source-supported rink relationships rather than claiming D1 occupies the puck-goal lane. |
| exp26-u11-006-q9 | REVISE | From (19,-2) to puck (23,5), distance is sqrt(65)=8.0623m. Proposed (22.2,-4.2) gives sqrt(85.28)=9.2347m (Python arithmetic checked before opening the key; corrected the initial rounded decimal). It moves farther despite "toward"; starting at y=-2 also does not establish a boards origin. Visibility is unproved without camera geometry. |
| exp26-u11-006-q10 | REVISE | A covered puck requires distinguishing cover/stoppage from live possession. Feedback jumps to next pressure/reset without stating the whistle/restart condition. Make the stoppage explicit in the hypothetical and respond accordingly; do not carry on pressuring a dead puck. |
| exp26-u11-011-q8 | REVISE | D2=a2 is away/gold, whereas F1 and YOU are home/navy. D2 is an opponent, not opposite-point support. At (23,1), the asserted opposite-point location is also unsupported. Reassess the bank route around both defenders; source does not validate a bounce outcome. |
| exp26-u11-012-q7 | REVISE | Puck (7,-6) is farther from middle y=0 than YOU (5,-3). "Below me" is a screen-dependent call, so specify board-side/wider and inspect the actual pressure relationship. Other options cannot establish D1's future reach. |
| exp26-u11-012-q5 | REVISE | "D1 reaches first" does not establish controlled recovery, but feedback assumes actual opponent possession. Change the hypothetical to explicit control or retain a contested loose-puck state; intended reception never creates ownership. |
| exp26-u11-016-q1 | REVISE | The answer comparison is supported: abs(2)<abs(7). Grammar is "where do YOU start", preserving "Compared with F1". No tactical or geometry change needed. |
| exp26-u11-016-q7 | REVISE | YOU=a1 away/gold; F1=h1 home/navy is the opposing carrier. The prompt gives the opponent a defensive-team communication role. Change recipient to an actual teammate or reframe as the defender's observation, then recheck all options and explanation. "Middle is protected" also overstates unvalidated containment. |

These cases are labelled known defects; rejecting eight of eight does not
demonstrate that this reviewer can correctly accept valid examples.
