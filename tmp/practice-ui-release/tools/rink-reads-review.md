# U11 Rink-Reads Review (62 questions)

Scan each one. Reply with a list of IDs to kill (e.g., `u11_rr_15, u11_rr_47`).
Coordinate frame: right-zone view, goalie ~ (560,150), net-front 540–555, slot 490–525, blue line ~400.

---
## lane-select (9)

### `u11_rr_breakout_outlet` — Breakouts (d2) · pos: D
tags: U11 / Atom / U13 / Peewee

**Q:** You're the D, ringing the puck around the boards. Which winger is the open outlet?

**Tip:** The outlet without a forechecker on top is the safe pass. Don't force the strong-side wall.

**Layout:** view=right, zone=def-zone
Markers: teammate "YOU"@(555,175), defender@(510,210), teammate "RW"@(460,95), teammate "LW"@(470,220), defender@(480,215), goalie@(560,150)

**Options:**
  • lane (555,170)→(465,100) [CLEAR]: Clean rim — RW is alone with the wall as a passing line.
  • lane (555,180)→(472,220) [blocked]: Forechecker's already on the LW. That's a turnover at your own blue line.

### `u11_rr_point_feed` — Passing (d2) · pos: F/D
tags: U11 / Atom / U13 / Peewee

**Q:** You're walking the puck at the point. The strong-side feed is shadowed. What's open?

**Tip:** Read both defenders. The lane through the seam — between two coverage triangles — is the chance.

**Layout:** view=right, zone=off-zone
Markers: attacker "YOU"@(410,150), defender@(440,165), teammate "C"@(535,145), defender@(525,140), teammate "LW"@(470,95), goalie@(560,150)

**Options:**
  • lane (415,150)→(530,145) [blocked]: C is shadowed. The defender's stick eats this pass on the way.
  • lane (415,145)→(470,100) [CLEAR]: Clean seam to the LW low in the circle — that's a one-timer angle.

### `u11_rr_nz_regroup` — Breakouts (d2) · pos: D
tags: U11 / Atom / U13 / Peewee

**Q:** Regroup in the neutral zone. Forecheck is pressing the strong side. Where's the safe pass?

**Tip:** When the strong side gets pressured, a quick D-to-D resets the attack on the weak side.

**Layout:** view=right, zone=neutral-zone
Markers: teammate "YOU"@(430,200), defender@(460,195), teammate "D2"@(430,100), teammate "C"@(510,130), defender@(505,135)

**Options:**
  • lane (430,195)→(510,130) [blocked]: C is locked up. This pass goes through three sticks.
  • lane (425,195)→(430,105) [CLEAR]: Clean D-to-D reset. Now D2 attacks the weak side with time.

### `u11_rr_25` — Breakouts (d2) · pos: D
tags: U11 / Atom / U13 / Peewee

**Q:** Forecheck pinning the strong side. Your partner is open across the ice. Best pass?

**Tip:** When the strong side gets sealed, D-to-D resets the breakout to the weak side every time.

**Layout:** view=right, zone=def-zone
Markers: teammate "YOU"@(555,215), defender "F1"@(540,200), teammate "D2"@(555,95), goalie@(560,150)

**Options:**
  • lane (555,200)→(470,220) [blocked]: Up the wall — F2 is already there. Turnover at the goal line.
  • lane (555,195)→(555,105) [CLEAR]: ✓ D-to-D behind your net. Resets the play, partner has time and space.

### `u11_rr_26` — Breakouts (d3) · pos: D
tags: U11 / Atom

**Q:** F1 is on top of you. Two outlets — strong-side wall and reverse to behind the net. Which?

**Tip:** If the wall is bottled up AND you have a partner behind, REVERSE — quick changes of direction beat brute force.

**Layout:** view=right, zone=def-zone
Markers: teammate "YOU"@(545,175), defender "F1"@(525,175), teammate "W1"@(540,100), defender "F2"@(515,110), teammate "D2"@(580,145), goalie@(560,150)

**Options:**
  • lane (545,170)→(540,105) [blocked]: Wing is blanketed. Pass dies in coverage.
  • lane (545,180)→(580,145) [CLEAR]: ✓ Reverse to D2 behind the net. Resets pressure, partner has new angle.

### `u11_rr_29` — Breakouts (d2) · pos: D
tags: U11 / Atom / U13 / Peewee

**Q:** Forechecker between you and your wing on the wall. Wing or middle pass?

**Tip:** When the wall is blocked, look middle. Centre is usually open if the forecheck is committed to the wall.

**Layout:** view=right, zone=def-zone
Markers: teammate "YOU"@(550,195), defender "F1"@(510,175), teammate "W"@(545,95), teammate "C"@(470,150), goalie@(560,150)

**Options:**
  • lane (550,190)→(545,100) [blocked]: F1 is right in this lane. Pick-off, breakaway against.
  • lane (545,195)→(475,150) [CLEAR]: ✓ Centre is open in middle ice. Quick pass, then C transitions up.

### `u11_rr_33` — Cycle Play (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** You've cycled the puck low and want to feed the slot. Two passing lanes — across or up to the point.

**Tip:** If a teammate is unchecked in the slot, that's the chance. The point is the safe reset, not the scoring play.

**Layout:** view=right, zone=off-zone
Markers: teammate "YOU"@(550,220), defender@(530,215), teammate "C"@(500,150), teammate "D"@(415,195), goalie@(560,150)

**Options:**
  • lane (550,220)→(500,155) [CLEAR]: ✓ Cross-ice to the slot — C is unchecked. One-timer chance.
  • lane (555,215)→(420,195) [blocked]: Point is the safe play but the slot was wide open. You bailed on the chance.

### `u11_rr_41` — Cycle Play (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** You're carrying the cycle low. Their forwards have collapsed. Bump it back up to the point or back into the wall?

**Tip:** When their forwards collapse low, the point is wide open. Reset to the D for a clean walk-and-shoot.

**Layout:** view=right, zone=off-zone
Markers: teammate "YOU"@(550,215), defender@(525,200), defender@(515,175), teammate "D"@(415,195), goalie@(560,150)

**Options:**
  • lane (550,210)→(420,195) [CLEAR]: ✓ Up to the D — clean reset. They walk into a quiet point with a shot lane.
  • lane (555,220)→(555,100) [blocked]: Wall pass into a wall of bodies. Turnover at the goal line.

### `u11_rr_42` — Blue Line Decisions (d3) · pos: D
tags: U11 / Atom

**Q:** Walking the line for a shot. The defender's stick is high blocking the slot lane — what's open?

**Tip:** If the centre is taken away, walk into the seam between the D and the boards. That's the wide-side shot lane.

**Layout:** view=right, zone=off-zone
Markers: teammate "YOU"@(420,150), defender@(465,130), goalie@(560,150)

**Options:**
  • lane (425,150)→(558,145) [blocked]: Stick's right in this lane — blocked.
  • lane (430,165)→(555,165) [CLEAR]: ✓ Walk into the wider seam. Shot gets through clean to the goalie's stick side.

---
## hot-spots (17)

### `u11_rr_cycle_f3` — Positioning (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** Your linemate has the puck low on the strong-side wall in a cycle. You're F3. Where do you go?

**Tip:** F3 is the safety net. High slot — close enough to be a pass option, high enough to defend the rush back.

**Layout:** view=right, zone=off-zone
Markers: teammate "F1"@(545,220), defender@(530,215), teammate "F2"@(510,95), goalie@(560,150)

**Options:**
  • spot @(470,150) [CORRECT]: ✓ High-slot F3. Pass option, screen lane, and you're the first one back if it turns over.
  • spot @(540,150) [wrong]: Too low and too central — you're crowding F1's space and out of the play if there's a turnover.
  • spot @(415,110) [wrong]: Way too high. You're a pass option in name only and totally out of the cycle.

### `u11_rr_backcheck_high` — Defense (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** Backchecking on a 3-on-2 against. Your D have the puck carrier and strong-side winger. Where do you pick up?

**Tip:** First forward back picks up the highest open man. That's the late F2 they'll dish back to.

**Layout:** view=right, zone=def-zone
Markers: attacker "X1"@(480,145), defender "D1"@(470,150), attacker "X2"@(510,95), defender "D2"@(500,105), attacker "X3"@(425,165), goalie@(560,150)

**Options:**
  • spot @(425,165) [CORRECT]: ✓ X3 is the trailer with no one on him. Take him away — that's where the puck wants to go.
  • spot @(540,130) [wrong]: Both D already have this side. You'd be doubling up and leaving the trailer wide open.
  • spot @(555,150) [wrong]: Net-front is the goalie's job. You're abandoning the high option to do something already covered.

### `u11_rr_weakside_d` — Coverage (d3) · pos: D
tags: U11 / Atom / U13 / Peewee

**Q:** Puck is in the strong-side corner. Your partner's pinned in the battle. You're weak-side D. Where do you go?

**Tip:** Weak-side D owns the net front when the strong side is locked up. Stick in the backdoor lane, eyes both ways.

**Layout:** view=right, zone=def-zone
Markers: attacker "X1"@(555,220), teammate "D1"@(540,215), attacker "X2"@(545,90), goalie@(560,150)

**Options:**
  • spot @(535,155) [CORRECT]: ✓ Net-front, stick in the backdoor lane. You'll kill any cross-ice feed to X2.
  • spot @(510,95) [wrong]: You just chased X2 to the wall — nobody's at the net and a centring pass is a goal.
  • spot @(460,145) [wrong]: Too high. You're not helping the corner battle and the slot is wide open.

### `u11_rr_14` — Coverage (d2) · pos: D
tags: U11 / Atom / U13 / Peewee

**Q:** Cycle in your D-zone. Their F1 has the puck below the goal line. You're the strong-side D — where?

**Tip:** Stay above the puck, sealed against the boards. Don't get pulled below the goal line.

**Layout:** view=right, zone=def-zone
Markers: attacker "F1"@(560,200), goalie@(560,150)

**Options:**
  • spot @(540,175) [CORRECT]: ✓ Above the puck, between F1 and the slot. You take away the centring lane.
  • spot @(558,215) [wrong]: Below the goal line. You can't defend the slot from here — pass to the front is wide open.
  • spot @(500,145) [wrong]: Way too high — that's the slot. Nobody's pinning F1 to the wall.

### `u11_rr_19` — Coverage (d2) · pos: D/F
tags: U11 / Atom / U13 / Peewee

**Q:** 3-on-2 against you and your D-partner. Carrier's middle, two wings wide. You're the weak-side D — who?

**Tip:** Weak-side D takes the weak-side wing. Your partner stays mid-lane on the carrier.

**Layout:** view=right, zone=def-zone
Markers: attacker "X1"@(440,150), attacker "X2"@(440,95), attacker "X3"@(440,215), teammate "D1"@(490,150), goalie@(560,150)

**Options:**
  • spot @(470,95) [CORRECT]: ✓ Pick up the weak-side wing. D1 has the carrier, you cover X2 — that's a 1-on-1 now.
  • spot @(480,150) [wrong]: Doubling on the carrier. Both wings are now wide open for a cross-ice feed.
  • spot @(540,150) [wrong]: You retreated all the way. They walk in 3-on-2 with no resistance until the slot.

### `u11_rr_21` — Coverage (d2) · pos: D
tags: U11 / Atom / U13 / Peewee

**Q:** Defensive-zone faceoff loss to your right. You're the right-side D. Where do you go first?

**Tip:** Lost faceoff = beat your man to the slot. Don't watch the puck, find your check.

**Layout:** view=right, zone=def-zone
Markers: attacker "X-LW"@(470,205), attacker "X-D"@(490,130), teammate "C"@(485,215), goalie@(560,150)

**Options:**
  • spot @(480,130) [CORRECT]: ✓ Box out the high X-D before they can shoot. That's your immediate threat off a lost draw.
  • spot @(480,200) [wrong]: C is already on the wall battle. You're doubling up and leaving the high shot wide open.
  • spot @(555,145) [wrong]: Goalie covers net. You're looking for the next threat coming in, not standing on the goal line.

### `u11_rr_24` — Defensive Zone (d2) · pos: D
tags: U11 / Atom / U13 / Peewee

**Q:** Loose puck behind your net. You're retrieving. Your partner is below the dot on the strong side. Where do they need you?

**Tip:** If you're retrieving, partner needs to be your safety valve — net front, ready to reverse if forecheck closes.

**Layout:** view=right, zone=def-zone
Markers: teammate "YOU"@(580,175), defender "X-F"@(540,200), teammate "P"@(540,95), goalie@(560,150)

**Options:**
  • spot @(540,145) [CORRECT]: ✓ Net-front strong-side support. You can reverse to them if the forecheck pins you.
  • spot @(410,195) [wrong]: Way too high. You can't reverse to a partner at the point — too far, too risky.
  • spot @(555,220) [wrong]: Same side as the forechecker. You'll just hit them with a reverse.

### `u11_rr_28` — Breakouts (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** Your D has the puck behind the net. You're the centre. Where's your support spot?

**Tip:** Centre is the safety valve. Mid-zone, available to both D, ready to chip the puck or take a pass through middle.

**Layout:** view=right, zone=def-zone
Markers: teammate "D"@(555,175), goalie@(560,150)

**Options:**
  • spot @(470,150) [CORRECT]: ✓ Mid-zone, mid-ice. D has you as a clean middle option for a pass or chip-out.
  • spot @(410,200) [wrong]: Too far up — you're a stretch option but not a breakout outlet. D needs you closer.
  • spot @(540,95) [wrong]: You're up the wall — that's a winger's spot, not a centre's. D has nobody to pass through middle.

### `u11_rr_31` — Transition (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** Puck's about to come loose at your blue line. You're the late forward. Where do you support?

**Tip:** Late forward = high-middle support. Be available for a chip up or a quick centre play.

**Layout:** view=right, zone=neutral-zone
Markers: teammate "D"@(420,200), goalie@(560,150)

**Options:**
  • spot @(460,150) [CORRECT]: ✓ Mid-ice, available in both directions. Chip out or quick-up pass — you're the link.
  • spot @(540,95) [wrong]: Already past the puck. If we lose it here, you're 50 feet from the play.
  • spot @(410,100) [wrong]: Off the strong side. You're not a supporting option — D has no quick-up to you.

### `u11_rr_35` — Cycle Play (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** Your linemates are working a low cycle. You're F3. Where do you set up to give them a high option?

**Tip:** F3 stays high — slot or just below the point — to give the cycle a release valve and protect against the rush back.

**Layout:** view=right, zone=off-zone
Markers: teammate "F1"@(545,220), teammate "F2"@(555,95), goalie@(560,150)

**Options:**
  • spot @(460,150) [CORRECT]: ✓ Slot/high-slot. Available for a feed AND first one back if it turns over.
  • spot @(410,110) [wrong]: Too high — you're a point option only, not a scoring threat. F3's job is dual.
  • spot @(540,145) [wrong]: Crashing the net front. F1 and F2 have the low rotations — you're crowding them.

### `u11_rr_44` — Forecheck (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** F1 has angled the carrier up the wall. You're F2. Where do you set up the trap?

**Tip:** F2 mid-lane high — close enough to support F1, in the lane to pick off a back-pass to their D.

**Layout:** view=right, zone=off-zone
Markers: teammate "F1"@(540,215), attacker "X"@(530,220), goalie@(560,150)

**Options:**
  • spot @(470,195) [CORRECT]: ✓ Mid-lane, high enough to take away the back-pass to D. F1 has support.
  • spot @(540,105) [wrong]: Way off the play. F1 has no support and any reverse to weak-side D is wide open.
  • spot @(555,220) [wrong]: Doubling on F1 — both of you on the same body. Pass over you and the play breaks down.

### `u11_rr_46` — Forecheck (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** Pressure forced their D to rim it. Where does F3 get to?

**Tip:** F3 reads the rim. If it's coming up your strong side, swing high to seal it; if it's reversing, get back to the middle.

**Layout:** view=right, zone=off-zone
Markers: defender "X-D"@(580,195), goalie@(560,150)

**Options:**
  • spot @(470,95) [CORRECT]: ✓ Strong-side high — you can seal the rim or transition back if it reverses.
  • spot @(540,100) [wrong]: Too low — you'll get caught skating against the rim instead of meeting it.
  • spot @(410,195) [wrong]: Way too high — you're closer to centre than the puck. Useless on the rim.

### `u11_rr_48` — Forecheck (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** F1 went deep into a battle. You're F2 — what do you do as the rotation kicks in?

**Tip:** F2 becomes F1 when F1 commits. Take F1's old job — pressure on the puck, replace the angle.

**Layout:** view=right, zone=off-zone
Markers: teammate "F1"@(555,220), attacker "X"@(540,215), goalie@(560,150)

**Options:**
  • spot @(510,195) [CORRECT]: ✓ Step into F1's old role. Maintain pressure on the puck-side.
  • spot @(470,95) [wrong]: You stayed home. F1 is alone in the battle and any escape is uncovered.
  • spot @(555,220) [wrong]: Crashed into F1 in the corner. Now you're both committed and there's nothing high.

### `u11_rr_52` — Rush Reads (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** You're the late forward on a 3-on-3 rush. The lead F is carrying. Where do you trail to?

**Tip:** Late F is the trailer. High-slot, available for a drop or a back-pass — and first one back if it turns over.

**Layout:** view=right, zone=off-zone
Markers: teammate "F1"@(490,150), teammate "F2"@(490,100), defender@(540,145), defender@(540,195), goalie@(560,150)

**Options:**
  • spot @(425,150) [CORRECT]: ✓ Trailer in the high slot. Drop pass option, back-pressure on transition.
  • spot @(540,220) [wrong]: Crashed the net front from behind. Useless — F1 won't pass back through traffic.
  • spot @(410,95) [wrong]: Off the strong side. You're not a trailer, you're a third option F1 can't see.

### `u11_rr_55` — Rush Reads (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** Wide entry — your linemate carrying the puck along the wall. Where does the weak-side support set up?

**Tip:** Weak-side winger drives to the back post. That's the back-door tap-in if the carrier feeds across.

**Layout:** view=right, zone=off-zone
Markers: teammate "F1"@(490,95), defender@(485,105), goalie@(560,150)

**Options:**
  • spot @(545,195) [CORRECT]: ✓ Back-post drive — back-door pass becomes a tap-in.
  • spot @(460,150) [wrong]: Slot looks like a scoring spot but on a wide entry there's nobody to feed you.
  • spot @(410,195) [wrong]: You stayed at the blue line — useless for a rush chance.

### `u11_rr_58` — Power Play (d3) · pos: F/D
tags: U11 / Atom

**Q:** PP, 1-3-1 setup. The puck is on the half-wall strong side. You're the bumper. Where?

**Tip:** Bumper sits in the seam between their box and the net — feed lanes from the half-wall AND back to the point.

**Layout:** view=right, zone=off-zone
Markers: teammate "F1"@(545,220), teammate "D"@(415,150), teammate "F3"@(540,95), goalie@(560,150)

**Options:**
  • spot @(480,150) [CORRECT]: ✓ Bumper in the seam. Available from F1 on the wall AND from D at the point.
  • spot @(540,145) [wrong]: Net front is the screen's job, not the bumper. You took away your own seam.
  • spot @(415,200) [wrong]: Way off the play — bumper is a slot/seam role, not a corner.

### `u11_rr_60` — Defensive Zone (d2) · pos: F/D
tags: U11 / Atom / U13 / Peewee

**Q:** Defensive faceoff lost to the strong-side wing. Where's your first move as the strong-side D?

**Tip:** Lost faceoff = beat the puck to the wall. Get into the shot lane before they can release.

**Layout:** view=right, zone=def-zone
Markers: teammate "C"@(485,215), attacker "X-W"@(465,205), attacker "X-D"@(485,130), goalie@(560,150)

**Options:**
  • spot @(480,190) [CORRECT]: ✓ Get into the shot lane between X-W and the slot. Block-first mentality.
  • spot @(555,145) [wrong]: Retreated to the goalie. There's a free shot from the wall before you get there.
  • spot @(480,130) [wrong]: C has the high D — that's not your man on a lost draw.

---
## pov-pick (16)

### `u11_rr_entry_read` — Vision (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** Carrying the puck wide on a clean entry. Your centre is in the slot, weak-side winger crashing late. Who do you hit?

**Tip:** The late winger is the killer pass — D have to step up on the centre and leave the back door open.

**Layout:** view=POV, zone=—
Markers: teammate "C"@(500,150), defender@(490,145), teammate "LW"@(480,215), goalie@(560,150)

**Options:**
  • target "C" @(500,150) [WRONG]: C is being shadowed — stick right on the puck side. Pass dies in coverage.
  • target "LW" @(480,215) [CORRECT]: ✓ LW is late and unchecked. Hit them in stride for a clean shot.

### `u11_rr_cycle_outlet` — Vision (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** You've cycled the puck low and a defender is closing fast. Two outlets — who's open?

**Tip:** Read the eyes and sticks of the defenders. The teammate without a stick in their lane is the answer.

**Layout:** view=POV, zone=—
Markers: teammate "RW"@(460,95), defender@(470,110), teammate "D"@(415,150), goalie@(560,150)

**Options:**
  • target "RW" @(460,95) [WRONG]: Defender's stick is between you and RW. That's a takeaway.
  • target "D" @(415,150) [CORRECT]: ✓ D is wide open at the point — clean reset, regroup the play.

### `u11_rr_2on1_pass_or_shoot` — Decision-Making (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** Two-on-one. The lone D is between you and your winger. Pass or shoot?

**Tip:** If the D commits to the passing lane, shoot. If the D commits to you, pass. Read their feet.

**Layout:** view=POV, zone=—
Markers: defender "D"@(510,175), teammate "W"@(510,95), goalie@(560,150)

**Options:**
  • target "shoot" @(558,145) [CORRECT]: ✓ D is sliding to take away the pass — their feet are in the lane. Shoot far side.
  • target "pass" @(510,95) [WRONG]: D is already in the passing lane. The pass gets blocked — shot was open.

### `u11_rr_17` — Blue Line Decisions (d3) · pos: D
tags: U11 / Atom

**Q:** Pinching at the blue line on a loose puck. Their winger is already past you on the wall. Read?

**Tip:** If a forward is already past you AND your support isn't there, retreat. Pinching needs a backstop.

**Layout:** view=POV, zone=—
Markers: attacker "X"@(440,90), goalie@(560,150)

**Options:**
  • target "pinch" @(440,90) [WRONG]: X is already past — pinching loses the foot race and you're going the wrong way on a 2-on-1.
  • target "retreat" @(380,175) [CORRECT]: ✓ Retreat, get back to gap. Pinch only when you'll win the puck cleanly.

### `u11_rr_22` — Defense (d3) · pos: F/D
tags: U11 / Atom

**Q:** Carrier looking up ice — eyes on the strong-side wing, hands cocked for a pass. Where's the read?

**Tip:** Read the carrier's eyes AND their stick. If they're eyeing one option but stick says another, trust the stick.

**Layout:** view=POV, zone=—
Markers: attacker "X"@(465,145), teammate "X-W1"@(530,95), teammate "X-W2"@(525,215)

**Options:**
  • target "strong" @(530,95) [WRONG]: Their eyes are decoy. The stick was set for a back-side dish — strong-side was bait.
  • target "weak" @(525,215) [CORRECT]: ✓ The stick angle gave it away. Cut off the back-side feed and force the play wide.

### `u11_rr_27` — Transition (d2) · pos: F
tags: U9 / Novice / U11 / Atom / U13 / Peewee

**Q:** You're flying up the boards on a stretch. Your defender hit you with a long pass. What's the play ahead?

**Tip:** Look up before the pass arrives. If a teammate is open, you're already turning your hips — that's a one-touch.

**Layout:** view=POV, zone=—
Markers: teammate "C"@(490,215), defender@(480,220), teammate "RW"@(530,105), goalie@(560,150)

**Options:**
  • target "carry" @(480,95) [CORRECT]: ✓ Carry — you're already in stride and the back-side defender is high. Straight to the net.
  • target "passC" @(490,215) [WRONG]: C is shadowed. Throwing it across-ice loses your speed and gives away the entry.

### `u11_rr_30` — Transition (d2) · pos: F/D
tags: U11 / Atom / U13 / Peewee

**Q:** Regroup in the neutral zone. Strong side has pressure, weak side has space. Where do you direct the puck?

**Tip:** If one side has pressure and the other has space, you change sides every time. That's what regroups are for.

**Layout:** view=POV, zone=—
Markers: teammate "RW"@(465,100), defender@(475,110), teammate "LW"@(465,215)

**Options:**
  • target "RW" @(465,100) [WRONG]: RW is locked up. Pass goes through coverage.
  • target "LW" @(465,215) [CORRECT]: ✓ Weak-side LW has open ice. Switch the attack and they're skating with speed.

### `u11_rr_32` — Breakouts (d2) · pos: D
tags: U11 / Atom / U13 / Peewee

**Q:** Retrieved the puck behind net. Two options — quick-up to your winger, or chip glass-and-out. Read?

**Tip:** If the winger has a clean lane and you have time, pass. If the wall is bottled and you don't, glass-and-out beats a turnover.

**Layout:** view=POV, zone=—
Markers: teammate "W"@(540,95), defender@(530,110)

**Options:**
  • target "pass" @(540,95) [WRONG]: F1 is right on top of your winger. Pass dies in coverage.
  • target "chip" @(470,60) [CORRECT]: ✓ Glass and out. Beats the forecheck cleanly, neutral zone reset.

### `u11_rr_34` — Cycle Play (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** You've got the puck on the half-wall. Two cycle options — drop low, or curl up to the high slot.

**Tip:** Read where their D's are pinching. If the strong-side D commits low, curl high. If they stay home, drop low.

**Layout:** view=POV, zone=—
Markers: teammate "F2"@(550,220), defender "X-D"@(540,200), teammate "F3"@(465,145), goalie@(560,150)

**Options:**
  • target "low" @(550,220) [WRONG]: X-D collapsed low. You'd be passing into traffic — turnover.
  • target "high" @(465,145) [CORRECT]: ✓ Their D went low so the high slot is wide open. F3 has time.

### `u11_rr_36` — Blue Line Decisions (d2) · pos: D
tags: U11 / Atom / U13 / Peewee

**Q:** Walking the puck along the blue line. Lane to the net is clogged but a teammate's open low. Shoot or feed?

**Tip:** If the lane is blocked, don't force the shot. Move the puck and walk into a new lane.

**Layout:** view=POV, zone=—
Markers: defender@(450,165), defender@(490,145), teammate "RW"@(550,100), goalie@(560,150)

**Options:**
  • target "shoot" @(558,145) [WRONG]: Shot's blocked — two sticks in the lane. It's not getting through.
  • target "feed" @(550,100) [CORRECT]: ✓ Hit RW low. They walk into the open lane and you re-attack.

### `u11_rr_40` — Zone Entry (d3) · pos: F
tags: U11 / Atom

**Q:** Carrying the puck into the OZ. A trailer is right behind you, no defender on them. Drop or carry?

**Tip:** Drop pass with a trailer is gold — you take the D with you and your trailer walks into open ice.

**Layout:** view=POV, zone=—
Markers: defender "X-D"@(450,145), defender "X-D2"@(440,200), teammate "T"@(390,175)

**Options:**
  • target "drop" @(390,175) [CORRECT]: ✓ Drop pass. Both D step up to you, trailer walks in clean.
  • target "drive" @(470,150) [WRONG]: You drove into two D. Got walled off, lost the chance.

### `u11_rr_47` — Forecheck (d3) · pos: F
tags: U11 / Atom

**Q:** F1 first to a 50/50 puck. Their D is closing fast. Engage hard or chip out and reset?

**Tip:** If you don't have body position, chip out. Forcing a battle you can't win = turnover into a rush against.

**Layout:** view=POV, zone=—
Markers: defender "X-D"@(545,215)

**Options:**
  • target "engage" @(545,215) [WRONG]: Lost the body position battle. They walk out with the puck behind you.
  • target "chip" @(470,80) [CORRECT]: ✓ Chip glass and reset. Live to forecheck another shift.

### `u11_rr_49` — Rush Reads (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** 1-on-1 against the D. You've got speed, they're squared up. Shoot off the rush or drive wide?

**Tip:** If the D is squared and centred, shoot the moment the lane appears. Driving wide loses the angle.

**Layout:** view=POV, zone=—
Markers: defender "D"@(490,150), goalie@(560,150)

**Options:**
  • target "shoot" @(558,145) [CORRECT]: ✓ Shot off the rush. Goalie hadn't squared up yet — corner pocket.
  • target "drive" @(540,95) [WRONG]: Drove wide and got walled off. Lost the angle and the chance.

### `u11_rr_51` — Rush Reads (d3) · pos: F
tags: U11 / Atom

**Q:** 2-on-1, you're the carrier. Your winger crosses behind you to the strong side. What's the read?

**Tip:** Crossing 2-on-1 is built to fool the D. If they freeze on the cross, you SHOOT. If they follow the cross, you PASS.

**Layout:** view=POV, zone=—
Markers: defender "D"@(495,175), teammate "W"@(485,95), goalie@(560,150)

**Options:**
  • target "shoot" @(558,145) [WRONG]: D froze on you, expecting the cross. Shot was open but you missed it.
  • target "pass" @(485,95) [CORRECT]: ✓ D bit on the cross. Pass to the W on the back side — wide-open net.

### `u11_rr_53` — Rush Reads (d3) · pos: F
tags: U11 / Atom

**Q:** Coming into the OZ, your trailer's calling for the drop. Defenders are square. Drop or carry?

**Tip:** If the D are square and committed to you, drop. The trailer walks into the open lane behind you.

**Layout:** view=POV, zone=—
Markers: defender@(465,145), defender@(475,195), teammate "T"@(390,175)

**Options:**
  • target "drop" @(390,175) [CORRECT]: ✓ Drop. Both D committed forward to you — trailer walks in clean.
  • target "carry" @(470,150) [WRONG]: Drove into both D. Got separated from the puck before you could shoot.

### `u11_rr_57` — Penalty Kill (d3) · pos: F
tags: U11 / Atom

**Q:** PK and you've got the puck on a clear. Two options — ice it down the strong side, or chip-and-chase up the middle. Which?

**Tip:** Icing down the wall = guaranteed clear, draw fresh PK. Chip-up only works if you have body position to chase.

**Layout:** view=POV, zone=—
Markers: defender "X1"@(470,110), defender "X2"@(465,140)

**Options:**
  • target "ice" @(540,75) [CORRECT]: ✓ Ice it down the wall. PK clear, fresh shift, reset the kill.
  • target "chip" @(410,100) [WRONG]: Two of theirs in the lane. Chip gets picked off — chance against.

---
## drag-target (20)

### `u11_rr_gap_1on1` — Defense (d2) · pos: D
tags: U11 / Atom / U13 / Peewee

**Q:** Carrier is coming up the wall on a 1-on-1. You're the lone D. Where do you set your gap?

**Tip:** Mid-ice angle, stick on puck. Force them outside, don't backpedal to the net.

**Layout:** view=right, zone=def-zone
Markers: attacker "X"@(430,215), defender "YOU"@(470,150), goalie@(560,150)

**Options:**
  • target @(460,200) [BEST]: ✓ Tight angle, stick on puck, body between carrier and middle ice. They have to dump it or get walled off.
  • target @(530,175) [WORST]: You backed in to the net. Carrier walks across the slot with all day to shoot.

### `u11_rr_screen_position` — Positioning (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** Your D is winding up for a point shot. You're the net-front F. Where do you set up?

**Tip:** Goalie's eyes, not their pads. Off the post, slightly to the strong side, stick on the ice for the tip.

**Layout:** view=right, zone=off-zone
Markers: teammate "D"@(410,150), defender@(540,145), attacker "YOU"@(510,175), goalie@(560,150)

**Options:**
  • target @(545,165) [BEST]: ✓ In the goalie's eyes, off the post, stick down. You either screen the shot or tip it.
  • target @(555,110) [WORST]: You're behind the net's plane and on the wrong side. No screen, no tip — D might as well shoot at a wall.

### `u11_rr_forecheck_angle` — Forecheck (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** You're F1 forechecking. Their D is retrieving the puck behind the net. What's your angle?

**Tip:** Take away one side. Force them up the strong-side wall where F2 is waiting — never give them the middle.

**Layout:** view=right, zone=off-zone
Markers: defender "X"@(555,175), attacker "YOU"@(500,150), teammate "F2"@(460,215), goalie@(560,150)

**Options:**
  • target @(540,195) [BEST]: ✓ Strong-side angle. You force the D up the wall right into F2's pressure. Classic 1–2 forecheck.
  • target @(540,105) [WORST]: You opened the strong-side wall. They reverse the puck weak-side and breakout clean.

### `u11_rr_13` — Gap Control (d2) · pos: D
tags: U11 / Atom / U13 / Peewee

**Q:** Carrier is wide, picking up speed at centre ice. You're the lone D — where do you set your gap at the blue line?

**Tip:** Tight gap, mid-lane. Step up before they cross the line so they can't carry it in clean.

**Layout:** view=right, zone=neutral-zone
Markers: attacker "X"@(390,215), defender "YOU"@(440,175), goalie@(560,150)

**Options:**
  • target @(410,195) [BEST]: ✓ Tight gap at the line. They have to chip and chase or take it wide and lose speed.
  • target @(510,175) [WORST]: Backed in 30 feet. They walk in clean with the puck on a string.

### `u11_rr_15` — Defensive Zone (d3) · pos: D
tags: U11 / Atom

**Q:** Their D pinches in. Loose puck on the half-wall, your wing fights it free. You're the weak-side D. Where do you fill?

**Tip:** When their D pinches and a forward gets caught up, the weak-side D rotates UP to cover. Don't stay locked at the post.

**Layout:** view=right, zone=def-zone
Markers: teammate "F1"@(545,95), defender "X-D"@(420,90), teammate "D1"@(540,215), goalie@(560,150)

**Options:**
  • target @(430,165) [BEST]: ✓ Up to high-slot / point area. You pick up their pinching D before it becomes a chance against.
  • target @(555,145) [WORST]: Stuck at the net — you abandoned the high man. Goalie reads it but the high shot is wide open.

### `u11_rr_16` — Net-Front (d2) · pos: D
tags: U11 / Atom / U13 / Peewee

**Q:** Point shot incoming. Their F is parked in front of your goalie. Where do you box them out?

**Tip:** Body between attacker and the puck. Stick down in their lane. Don't let them turn and tip.

**Layout:** view=right, zone=def-zone
Markers: teammate "X-D"@(415,150), attacker "X-F"@(540,150), defender "YOU"@(525,165), goalie@(560,150)

**Options:**
  • target @(538,150) [BEST]: ✓ Sealed between attacker and goalie. Goalie sees the shot, no tip available.
  • target @(555,175) [WORST]: Behind your own attacker. They turn into the slot and tip the shot in.

### `u11_rr_18` — Defense (d2) · pos: D
tags: U11 / Atom / U13 / Peewee

**Q:** 2-on-1 against, you're the lone D. Their carrier is wide, winger inside. What's your spot?

**Tip:** Take away the pass. Goalie has the shooter. Stick in the seam, body in the lane.

**Layout:** view=right, zone=def-zone
Markers: attacker "X1"@(440,215), attacker "X2"@(450,105), defender "YOU"@(490,160), goalie@(560,150)

**Options:**
  • target @(475,150) [BEST]: ✓ Centred, stick in the passing lane. Carrier has to shoot — that's the goalie's job.
  • target @(460,215) [WORST]: You jumped the carrier — pass goes cross-ice and X2 has a tap-in.

### `u11_rr_20` — Defense (d2) · pos: D
tags: U11 / Atom / U13 / Peewee

**Q:** Carrier driving the wall in your zone. You're stick-side. Stick on puck or body on body?

**Tip:** Stick first. If you commit your body and they cut back, you're skating to the wrong place.

**Layout:** view=right, zone=def-zone
Markers: attacker "X"@(515,220), defender "YOU"@(500,195), goalie@(560,150)

**Options:**
  • target @(510,210) [BEST]: ✓ Stick on puck, body angled to the wall. They have to dump or get walled off.
  • target @(530,220) [WORST]: All-in body check. They cut back inside and you're chasing. Slot opens up.

### `u11_rr_23` — Defense (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** Last man back on a rush. Carrier's flying down the middle. Where do you cut them off?

**Tip:** Last forward back is a defender. Take the inside lane — never let them through the middle.

**Layout:** view=right, zone=neutral-zone
Markers: attacker "X"@(395,150), defender "YOU"@(450,150), goalie@(560,150)

**Options:**
  • target @(425,150) [BEST]: ✓ Inside, mid-lane. They have to go wide and lose speed — gives the D time to set.
  • target @(460,100) [WORST]: You drifted to the wing. Carrier walks down the middle with all the time in the world.

### `u11_rr_37` — Net-Front (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** Teammate winding up for a point shot. You're crashing the net. Where do you finish your route?

**Tip:** Off the post, in the goalie's eyes, stick on the ice. Goalie can't see, you can tip — that's a chance.

**Layout:** view=right, zone=off-zone
Markers: teammate "D"@(415,145), defender "X-D"@(540,145), attacker "YOU"@(510,165), goalie@(560,150)

**Options:**
  • target @(545,165) [BEST]: ✓ Off the post, in the eyes. Screen + tip — every D's worst nightmare.
  • target @(525,110) [WORST]: Wrong side, too high. No screen, no tip. Goalie sees it the whole way.

### `u11_rr_38` — Offensive Zone (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** Point shot's coming. You're a slot fill-in (not the screen). Where do you go?

**Tip:** Slot fill-in finds the rebound. Stick down, ready to whack at anything that pops out.

**Layout:** view=right, zone=off-zone
Markers: teammate "D"@(415,195), attacker "F1-screen"@(540,145), attacker "YOU"@(495,175), goalie@(560,150)

**Options:**
  • target @(510,155) [BEST]: ✓ Mid-slot, stick down. Rebound territory — most goals come from here.
  • target @(555,220) [WORST]: Behind the net. No rebound goes here — you're invisible to the play.

### `u11_rr_39` — Forecheck (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** Teammate's about to dump the puck deep. You're F1 chasing. What angle do you take?

**Tip:** Dump-and-chase, F1 takes the inside lane to cut off the strong-side wall. Force them to reverse or get hit.

**Layout:** view=right, zone=off-zone
Markers: teammate "F2"@(450,95), goalie@(560,150)

**Options:**
  • target @(530,110) [BEST]: ✓ Inside angle. You arrive with their D, cut off the wall, force a reverse.
  • target @(510,70) [WORST]: Outside angle. Their D walks the puck up the wall untouched.

### `u11_rr_43` — Forecheck (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** F1 forechecking a retrieval. The carrier already has their head up. Pressure or back off?

**Tip:** Head up = they've seen the pass. Don't run at them; take the lane away instead. F1 plays angle, not speed.

**Layout:** view=right, zone=off-zone
Markers: defender "X-D"@(560,175), attacker "YOU"@(485,145), teammate "F2"@(465,215), goalie@(560,150)

**Options:**
  • target @(530,175) [BEST]: ✓ Cut off the strong-side wall, force them up the boards into F2.
  • target @(555,175) [WORST]: Ran straight at them. They saw it coming, made the easy pass past you.

### `u11_rr_45` — Forecheck (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** F1 is engaging the carrier on the wall. You're F2. What angle do you take in?

**Tip:** F2 angles in stick-on-stick — eliminates the pass option even if the carrier escapes F1.

**Layout:** view=right, zone=off-zone
Markers: teammate "F1"@(540,215), attacker "X"@(545,220), teammate "YOU"@(485,175), goalie@(560,150)

**Options:**
  • target @(510,200) [BEST]: ✓ Stick-on-stick angle. If carrier gets it past F1, you eat the puck.
  • target @(470,95) [WORST]: You went weak side — there's nobody supporting F1 and any pass back is uncovered.

### `u11_rr_50` — Rush Reads (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** 3-on-2 rush. You're the wide winger on the strong side. Where's your route?

**Tip:** Wide winger drives the wall, hard. Pulls a D wide and opens up the slot for the centre.

**Layout:** view=right, zone=off-zone
Markers: teammate "C"@(420,150), teammate "LW"@(420,200), defender "D1"@(490,150), defender "D2"@(490,200), attacker "YOU"@(420,100), goalie@(560,150)

**Options:**
  • target @(530,95) [BEST]: ✓ Drive the wall hard. Pulls D1 wide, opens the slot for the centre's shot.
  • target @(480,150) [WORST]: You crashed the slot and now there's two attackers fighting for the same lane.

### `u11_rr_54` — Rush Reads (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** Rush against. F3 backchecking. Where do you cut into the play to support the D?

**Tip:** F3 takes the highest open attacker. Cut through the middle of the rush, not around it.

**Layout:** view=right, zone=neutral-zone
Markers: attacker "X1"@(420,150), attacker "X2"@(420,95), attacker "X3"@(420,220), defender "D1"@(480,150), defender "D2"@(480,200), teammate "YOU"@(380,195), goalie@(560,150)

**Options:**
  • target @(410,100) [BEST]: ✓ Cut through and pick up X2 — the highest unchecked attacker.
  • target @(460,175) [WORST]: Doubled up on the carrier with D1. X2 and X3 are both unmarked for the cross.

### `u11_rr_56` — Penalty Kill (d3) · pos: F/D
tags: U11 / Atom

**Q:** PK in your zone. They're cycling on the strong side. You're the strong-side PK forward. Where?

**Tip:** PK box: strong-side F stays high, takes the strong-side point, doesn't chase below the dot.

**Layout:** view=right, zone=def-zone
Markers: attacker "X1"@(545,220), teammate "D1"@(540,200), attacker "X-D"@(420,195), goalie@(560,150)

**Options:**
  • target @(460,195) [BEST]: ✓ Strong-side high. You take away the point shot AND the seam pass to the slot.
  • target @(540,220) [WORST]: Chased into the corner — you're now below the puck and out of the box.

### `u11_rr_59` — Power Play (d3) · pos: D
tags: U11 / Atom

**Q:** PP one-timer setup. The puck's about to come back to you at the point for the shot. Where do you settle for the release?

**Tip:** Off the strong-side hash. Open up to the puck so the one-timer is in stride, not stretching across your body.

**Layout:** view=right, zone=off-zone
Markers: teammate "F1"@(545,220), goalie@(560,150)

**Options:**
  • target @(425,195) [BEST]: ✓ Strong-side hash, hips open. One-timer is in stride, full velocity.
  • target @(415,95) [WORST]: Weak side. You'd have to reach across your body — the shot's a lob, not a one-timer.

### `u11_rr_61` — Offensive Zone (d2) · pos: F
tags: U11 / Atom / U13 / Peewee

**Q:** Offensive zone faceoff WIN clean back. You're the strong-side winger. Where do you go?

**Tip:** Off a clean win, strong-side winger crashes the net for screens / tips / rebounds.

**Layout:** view=right, zone=off-zone
Markers: teammate "D"@(415,195), teammate "C"@(485,205), attacker "YOU"@(485,215), goalie@(560,150)

**Options:**
  • target @(540,165) [BEST]: ✓ Crash the net. D is winding up, you're the screen / tip / rebound man.
  • target @(415,95) [WORST]: Drifted to the weak-side point. You're nowhere near the action.

### `u11_rr_62` — Game Management (d3) · pos: F/D
tags: U11 / Atom

**Q:** Up by one with 30 seconds left. They've pulled their goalie. You've got the puck behind your net. Where do you go?

**Tip:** Don't ice it — that's a faceoff in your zone. Carry the puck up the wall, eat seconds, only chip if pressured.

**Layout:** view=right, zone=def-zone
Markers: teammate "YOU"@(580,175), defender@(540,200), goalie@(560,150)

**Options:**
  • target @(555,95) [BEST]: ✓ Up the strong-side wall, controlled. Burns clock without the icing risk.
  • target @(410,150) [WORST]: You iced it. Faceoff in your zone, no goalie for them — recipe for the tying goal.
