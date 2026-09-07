# Daily Read — Content Options (ideation menu)

Date: 2026-06-13
Status: Divergent ideation. Pick the formats and themes worth building; this is the menu, not the plan.

## What the Daily Read is today

The Question of the Day (`src/questionOfDay.jsx`) serves one item per age group per day,
filtered to plain multiple-choice and true/false from the bank, deterministic by date.
It resets at midnight. That is the whole content surface right now.

The free floor depends on this being fresh and varied every day, so it is the single most
important content engine in the app. Below is a big menu of ways to expand it.

---

## A. Content formats (the biggest lever)

Right now the Daily Read can only be MC or TF. Each new format below is a different shape of
"read" the daily item can rotate through, which multiplies variety without needing more raw
scenarios. Build notes point at engine pieces that already exist.

1. **Classic Read (MC).** The current format. A play freezes, pick the best option. Baseline.
2. **Snap Read (TF / binary).** One yes-no read on the clock ("Is the strong-side lane open?").
   Fast, great for young ages and for streak speed.
3. **What Happens Next.** Show the first beat of a play, ask what develops. Reuses the branching
   `MultiStepPlayer` / `ScenarioRenderer`. Feels like a real shift unfolding.
4. **Spot the Open Player.** Tap the open teammate on the ice instead of picking from text.
   Reuses the `OverlayLayer` hotspot tap. Trains scanning, the most-cited hockey-sense skill.
5. **Find the Pressure.** Tap where the check or the next threat is coming from. The defensive
   mirror of Spot the Open Player.
6. **Scan Snapshot.** Flash the ice for a second, hide it, then ask where the open teammate was.
   Reuses the Brain Gym Snapshot mechanic. Trains the one-glance read.
7. **Freeze Frame: Shoot, Pass, or Carry.** The play stops on your stick; pick the best of three
   under a shrinking clock. Reuses the Gym Best Option drill.
8. **Count the Rush.** Odd-man read: 2-on-1, 3-on-2, back-check coverage. "Take the pass or the
   shooter?" Reuses the Read the Numbers mechanic.
9. **Rank the Options.** Order three plays from best to worst read instead of a single pick.
   Teaches that there is a hierarchy, not just one right answer.
10. **Sequence It.** Two-step read: "first this, then that" (support, then beat your check).
    Reuses `SeqQuestion`.
11. **Coach's Cue.** Show a play and ask which principle applies ("face the puck and support,"
    "close the gap, do not reach"). Turns the why-card into the question.
12. **Mistake Film.** Show a play that went wrong, ask what the player should have read. Kids love
    finding the error, and it teaches the negative space.
13. **Position Swap.** Same frozen play, but "you are the D" one day and "you are the winger" the
    next. The read changes with the role. Doubles the value of every authored play.
14. **Real-Game Tie-In.** A read modeled on a famous or recent pro play ("McDavid's zone entry").
    Aspirational hook, very shareable.
15. **Daily Streak Set.** A 3-read mini-set instead of one item, for the streak/share loop. One
    easy, one medium, one stretch.

---

## B. Themes by age band

What the Daily Read should emphasize at each level, so the picker can weight by age.

- **U7 (Initiation).** Where do I skate? Find the puck. Go to open space. Simple yes-no reads,
  friendly puck and net, no position labels. One idea per read.
- **U9 (Novice).** Support the puck carrier. Skate to a passing lane. Do not all chase the puck.
  Strong-side vs weak-side as a first concept.
- **U11 (Atom).** Breakouts, give-and-go, basic gap control, head up before you get the puck.
  Position-aware reads begin here.
- **U13 (Peewee).** D-zone coverage, offensive-zone support, reading the 2-on-1, when to chip vs
  carry, first scanning habits under pressure.
- **U15 (Bantam).** Layered support, weak-side timing, defensive gap and angling, reading the
  forecheck, special-teams basics.
- **U18 (Midget).** Pace and deception, manipulating defenders, reading coverage shells,
  power-play seams, penalty-kill pressure reads, transition speed.

---

## C. Themes by position

- **Forward.** Support timing, finding the quiet ice, give-and-go, net-front reads, F1/F2/F3 roles
  on the forecheck, when to drive vs delay, reading the back-checker.
- **Defense.** Gap control, closing without reaching, breakout outlet selection, pinch or hold at
  the line, weak-side coverage, boxing out the net front, first pass under forecheck.
- **Goalie.** Depth and angle reads, tracking through traffic, reading a 2-on-1 pass vs shot,
  post-integration, when to play the puck. (Goalie content is a known backlog item; these are
  the read types to seed when it lands.)

---

## D. Game-situation library (the backbone)

A matrix of situations to author reads against. Cross any row with a format from section A and an
age from section B to generate a fresh item.

**Offensive zone:** cycle support, low-to-high, net-front timing, walking the blue line, backdoor,
delay and regroup, working the half-wall.

**Defensive zone:** coverage assignments, boxing out, supporting the corner, weak-side lock,
stick on the puck, breakout under forecheck, blocking a lane.

**Neutral zone:** regroups, timing the entry, supporting the carrier, gap on the rush, neutral-zone
counter, chip and chase vs carry.

**Transition:** turnovers, odd-man rushes for and against, the first three strides, back-pressure,
reloading.

**Special teams:** power-play entries and seams, penalty-kill pressure and lanes, faceoff plays,
6-on-5 and 5-on-6.

**Faceoffs:** assignments off a draw, wall plays, defensive-zone draw coverage.

**Set pieces:** D-to-D, rim retrievals, reverses, stretch passes.

---

## E. Recurring and seasonal hooks

These give the Daily Read a rhythm and a reason to come back.

- **Themed weekdays.** Breakout Monday, D-zone Tuesday, Transition Wednesday, Scan Thursday,
  Special-Teams Friday, Mistake-Film Saturday, Pro-Read Sunday.
- **Theme weeks.** A full week on one concept (for example, "Gap Control Week").
- **Season arcs.** Tryout reads in September, playoff-pressure reads in spring, summer fundamentals.
- **Rivalry / tournament weeks.** Higher-stakes framing for engagement.
- **Pro-game tie-ins.** A read drawn from a notable game that week, surfaced the next morning.
- **Challenge of the Week.** A harder stretch read, for the leaderboard crowd.

---

## F. Concrete prompt bank (starter seeds)

One-line seeds. Each is a situation plus the read. Pair with a format from section A and an age
from section B when authoring. Grouped by zone so the bank is easy to grow.

### Offensive zone
1. You carry below the goal line, two teammates high. Best play?
2. Puck on the half-wall, defender pressuring. Hold, pass low, or pass high?
3. You are the net-front, shot coming from the point. Where do you go?
4. Weak-side winger, puck on the far wall. Stay wide or sneak backdoor?
5. You walk the blue line, lane closing. Shoot, fake, or move it D-to-D?
6. Cycle down low, your check turns his back. Beat him to the net or hold?
7. Trailer on a zone entry, puck carrier drives wide. Fill which lane?
8. Down low with the puck, defender dives to block. Pass or step around?
9. Point shot blocked, puck loose at the wall. First move?
10. You receive at the half-wall facing the boards. Open up to which side?

### Defensive zone
11. Your man sets up net-front, puck on the far wall. Box out or pressure puck?
12. Breakout under forecheck, F1 pressures hard. Outlet to D, center, or rim?
13. Puck in the corner, you are first back. Support or take the body?
14. Weak-side winger in coverage, puck low strong side. How high do you stay?
15. Defending a 2-on-1, you are the lone D. Take the pass or the shooter?
16. Point shot incoming, you are in the slot. Block the lane or find your man?
17. Forecheck beat the first layer, you have the puck behind the net. Wheel or reverse?
18. Defender stepping up at your blue line on the rush. Gap or back off?
19. Loose puck in the slot, two players converging. Clear which way?
20. Your center is covering the front, the puck swings to the weak point. Who rotates?

### Neutral zone and transition
21. Regroup at center, defender pinches. Chip past or pass back to the D?
22. You catch a stretch pass with speed, one defender back. Carry, shoot, or pass?
23. Turnover at your own blue line, 3-on-2 the other way. Take the puck or the closest threat?
24. Rush up ice, your winger is offside-risk early. Wait or hit him now?
25. Back-checking on an odd-man rush. Pick up the late man or the puck?
26. Carrier enters the zone wide, you are the trailer. Drive the net or stop up?
27. Loose puck at center, you and a defender even. Win it which way?
28. Counter-attack starts, your D is caught up ice. Support or backcheck?

### Special teams and faceoffs
29. Power play, you have the puck at the half-wall. Seam, point, or down low?
30. Penalty kill, puck at the point. Pressure or stay in the lane?
31. Offensive-zone draw, your team wins it back. First option?
32. Defensive-zone faceoff, you lose the draw. Who do you take?
33. 6-on-5, net empty, puck at the point. Shoot for traffic or work for the seam?
34. Penalty kill, two passers up top. Take away the one-timer or the seam pass?

### Scanning and awareness (format A4 to A6)
35. Flash: where was the open teammate before the puck arrived?
36. Tap the most dangerous threat closing on the puck carrier.
37. Before you get the pass, where is the back-door option?
38. The defender is puck-watching. Where is the quiet ice to move to?
39. Spot the lane that is open right now (it will close in a second).

### Mistake film (format A12)
40. This breakout got picked off. What should the carrier have read?
41. The D got beat wide. What was the gap mistake?
42. The pass went into a shin pad. Which lane was actually open?
43. The forward got caught puck-watching and lost his man. What was the cue he missed?

### Young ages, simple reads (U7 to U9, formats A2 and A4)
44. The puck is in the corner. Do you all go get it, or does one support?
45. Your teammate has the puck. Skate toward him or find open ice?
46. You do not have the puck. Eyes on the puck or on the open space?
47. The puck is loose in front. Go get it or wait?
48. Find the open teammate to pass to (tap).
49. Skate to a spot where your teammate can pass to you (tap).
50. The other team has the puck. Chase or get between them and your net?

### Position-swap pairs (format A13, same play two ways)
51. As the winger: puck on the wall, defender pinching. Your read?
52. As the D: you are pinching on that same wall play. Hold the line or bail?
53. As the carrier: 2-on-1, you have the puck. Pass or shoot?
54. As the defender: same 2-on-1, you are the lone D. Pass or shooter?
55. As F3: a rush is forming, where do you fill?
56. As the back-checking D on that same rush: who do you take?

### Coach's cue (format A11)
57. Which principle fits: "support the strong side" or "stretch the weak side"?
58. Close the gap or keep your stick in the lane: which does this play call for?
59. Is this a "head up before the puck" moment or a "win the puck first" moment?
60. Drive the net or delay for the trailer: which principle applies here?

---

## How to grow this fast

- The matrix in sections A x B x D is generative: every (format, age, situation) triple is a new
  item. That is hundreds of reads from a small set of authored plays.
- The existing content factory and the project `/new-scenario` skill can turn chosen seeds into
  validated engine items. The image-first model means one diagram can carry several reads.
- Position Swap (A13) and themed weekdays (E) are the cheapest multipliers: they reuse one play
  many ways and give the daily a predictable rhythm.

## Suggested next step

Pick the 3 to 5 formats from section A worth building first (my lean: Spot the Open Player,
Scan Snapshot, What Happens Next, Mistake Film, and the Daily Streak Set), and I can turn those
plus a target slice of the prompt bank into an implementation plan for the Daily Read picker and
renderer.
