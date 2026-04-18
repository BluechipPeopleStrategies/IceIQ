// Build and validate the output
const fs = require('fs');
const input = require('./batch2_u11_4.json');

// For each question, the 3 distractors keyed by original position (excluding ok index)
// Each entry: { id, distractors: [opt0, opt2, opt3] or similar with original indices }
// We'll store 4 opts with correct at ok
// Targets per question (correctLen):
// u11g7=76, u11g8=104, u11g9=99, u11g10=111, u11g11=124, u11g12=111, u11g13=78,
// u11g14=109, u11g15=121, u11g16=92, u11g18=101, u11g19=107, u11mis1=105, u11mis2=109,
// u11mis3=118, u11mis4=119, u11mis5=116, u11mis7=172, u11mis8=110, u11next2=98,
// u11next3=92, u11next4=109, u11next5=130, u11next6=105, u11next7=136, u11next8=128
const drafts = {
  u11g7: {
    // 76 -> aim 70/78/82
    0: "Commit to the backhand since you read it first — drop butterfly there",
    2: "Dive flat across your pads to try to cover both posts from behind you",
    3: "Skate way out to the top of the crease to challenge and cut the angle down"
  },
  u11g8: {
    // 104 -> aim 98/106/112
    0: "Stay tight on the post and trust it — the post takes the short side, so you don't need to move at all",
    2: "Drop into a butterfly on the post to seal along your pad and take away any low shot across the crease",
    3: "Come out into the crease to challenge the cut — step out aggressively to cut the angle as they skate across"
  },
  u11g9: {
    // 99 -> aim 93/101/106
    0: "Say nothing and trust your defense to sort out the front of the net all by themselves on the play",
    2: "Skate out of your crease right away to cover the open attacker at the front of the net yourself",
    3: "Drop into your butterfly early and just wait patiently for the pass to come out of the corner to you"
  },
  u11g10: {
    // 111 -> aim 105/113/117
    0: "Stay in your current low position — you're already set, so trust your positioning and let the point shooter try",
    2: "Drop into butterfly right away — a point shot usually goes low through traffic, so put your pads down to take the bottom",
    3: "Back up to your goal line and square up — giving yourself more time to read the shot is the best play here"
  },
  u11g11: {
    // 124 -> aim 118/126/131
    0: "Give up on the puck and just reset for the next shift — once you're down on the ice you can't recover in time any way",
    2: "Wave your glove at the ref to call for a penalty since you got knocked down — ask for a delayed whistle on the shot",
    3: "Stay still and trust the post to save you — the puck usually clangs off the pipe from that angle, so freezing is the best shot"
  },
  u11g12: {
    // 111 -> aim 105/113/117
    0: "Stay on the right post and trust your teammates — your D should take the backdoor player, so hold post and cover the shooter",
    2: "Come out of your crease toward the puck carrier on the half-wall — challenge and take away the angle since they have the puck now",
    3: "Drop into a butterfly on the right post — seal the ice short side and let your defenseman take the backdoor player cutting across"
  },
  u11g13: {
    // 78 -> aim 72/80/84
    0: "Nothing much — shooters move arms in all kinds of ways on a rush",
    2: "They're going to pass instead — a dropping elbow means they're setting up a sauce pass",
    3: "They'll deke before shooting — dropping the elbow is how shooters load a forehand deke move"
  },
  u11g14: {
    // 109 -> aim 103/111/115
    0: "Spread your legs wide apart in your stance — giving yourself a wide base takes away the low corners of the net cleanly",
    2: "Drop into a butterfly right away on the ice — getting your pads flat on the ice seals the 5-hole and takes the low shot",
    3: "Stand with feet at shoulder width for balance — a normal stance gives you mobility to react to any shot including the 5-hole"
  },
  u11g15: {
    // 121 -> aim 115/123/128
    0: "Freeze the puck right away to kill the clock — any stoppage you can get late in a one-goal game is good to burn time off",
    2: "Kick the puck away from the front of your net — push it anywhere out of the danger area and let your team sort out possession",
    3: "Throw the puck to the corner with your glove — get it out of the slot area and let your defensemen retrieve it behind the goal line"
  },
  u11g16: {
    // 92 -> aim 86/94/98
    0: "Say nothing and trust your D to spot the forwards sneaking in behind them themselves",
    2: "Wait a few seconds to see if your D notice the forwards sneaking behind them on the pass",
    3: "Yell for a line change so a fresh group can come on and sort out the coverage problem fast"
  },
  u11g18: {
    // 101 -> aim 95/103/107
    0: "Stay in the middle of your crease and wait patiently for the puck to appear out the other side of the net",
    2: "Come out past the crease line to try to stop them behind the net before they can wrap around at all",
    3: "Drop into the butterfly right away and slide across the blue paint behind you to cover the wraparound chance"
  },
  u11g19: {
    // 107 -> aim 101/109/113
    0: "Skate all the way out to the top of the circles so you cut their shooting angle down to almost nothing",
    2: "Drop into the butterfly as soon as they cross the blue line to seal low ice and take the 5-hole away",
    3: "Stay planted right on your goal line and wait for them to shoot first before you make any move at all"
  },
  u11mis1: {
    // 105 -> aim 99/107/112
    0: "They should have stayed back on the bench longer — too many players out there causes confusion on the shift",
    2: "They should have gone straight to the net front — the slot is the most dangerous area so that's where they go",
    3: "They skated too slow on the play — if they had chased harder they would have won the battle and the puck back"
  },
  u11mis2: {
    // 109 -> aim 103/111/115
    0: "You were skating too slow to keep up with the play — more speed through the neutral zone would catch the puck",
    2: "You should have stopped at center ice and waited — a trailing forward stays back at the red line until the puck is in",
    3: "The puck carrier was too slow getting over the line — if they had pushed the pace you wouldn't have gotten ahead"
  },
  u11mis3: {
    // 118 -> aim 112/120/124
    0: "The forwards weren't skating hard enough — if all three chased with more speed they would have caught the puck first",
    2: "The defensemen were too far back at the blue line — they should have stepped up to pinch and kept the puck in the zone there",
    3: "The goalie didn't stop the breakout pass across the ice — goalies should play the puck when their team is forechecking hard"
  },
  u11mis4: {
    // 119 -> aim 113/121/125
    0: "You should have pinched harder and finished the check — if you commit to a pinch you have to follow through all the way",
    2: "Your partner should have covered for you — when one D pinches, the other D rotates middle, and your partner didn't read it",
    3: "The forward got lucky on the bounce — the puck took a weird hop off the boards that nobody could have predicted on that play"
  },
  u11mis5: {
    // 116 -> aim 110/118/122
    0: "The defensemen were out of position on the turnover — they were too deep in the offensive zone and couldn't get back fast",
    2: "The goalie came out too far from the net — he was too aggressive playing the puck and couldn't recover in time on the rush",
    3: "The coach called the wrong play that shift — the system your team was running left too many forwards deep in the offensive zone"
  },
  u11mis7: {
    // 172 -> aim 166/174/178
    0: "The ref made a bad call on the line change — at this level the refs often miss line changes and blow down ones that were actually legal, and this play clearly shouldn't have been called dead at all",
    2: "Offside at center — the fresh player jumped onto the ice past the red line while the puck was still back in the defensive zone, so the play was ruled offside at the center red line on the change",
    3: "Icing on the tired player — the tired player skated past center without playing the puck, so the ref blew it down for icing against the team that was making the line change on the fly there"
  },
  u11mis8: {
    // 110 -> aim 104/112/116
    0: "Turned faster on the turn — if you had whipped your body around quicker the defender wouldn't have caught up to you there",
    2: "Shot the puck immediately off the boards — a quick wrist shot toward the net was better than turning into the defender coming in",
    3: "Called loudly for help from your teammates — a quick yell brings a winger low to support you on the boards before the hit lands"
  },
  u11next2: {
    // 98 -> aim 92/100/104
    0: "Your team backs off and resets — let the pass complete and set up your D structure back at your own blue line",
    2: "Everyone collapses to the corner — all three forwards go low to pin the puck against the boards and win it back fast",
    3: "The play resets at center ice — a blind pass usually gets knocked into neutral and both teams go back to regroup fast"
  },
  u11next3: {
    // 92 -> aim 86/94/98
    0: "You keep skating backward to the outside and let them cut — stay in your lane since forcing outside is still goal",
    2: "You stop and watch the cut — let them cross the middle so you can see where they're going before you react",
    3: "You go for a big hip check — when they cut back inside they expose themselves, so step up and knock them off the puck"
  },
  u11next4: {
    // 109 -> aim 103/111/115
    0: "They dump the puck in and change — dumping it deep is the safe play after a turnover so tired players can get fresh legs",
    2: "They pass the puck back to the goalie to reset — a controlled breakout beats rushing into a play with no support up ice",
    3: "They wait for everyone to get set in position — regrouping at center gives your team a full five-player attack into the zone"
  },
  u11next5: {
    // 130 -> aim 124/132/136
    0: "The open player passes the puck back across — they send it back to the left half-wall to reset the power play because no shot is clean",
    2: "The open player skates it to the corner — they carry it down low behind the goal line to set up a cycle with the forwards on that side",
    3: "The play dies — the PK recovers too fast across the ice so the open player just holds the puck and waits for everyone to set up again"
  },
  u11next6: {
    // 105 -> aim 99/107/112
    0: "Play continues normally — the puck came from behind the red line but nobody touched it, so the refs let the play go on",
    2: "Your team gets a power play — shooting the puck the length of the ice under pressure is legal, and a panic clear gets ruled clean",
    3: "The other team gets a minor — a defenseman panicking and firing the puck down is delay of game, so the refs call two minutes on it"
  },
  u11next7: {
    // 136 -> aim 130/138/142
    0: "You hold the puck forever on your skate — keeping it pinned kills time, tires the defender, and eventually the ref whistles it dead for a faceoff",
    2: "You leave the puck and skate away — once you've tied up the defender your job is done, so release to the slot and let a teammate grab it fast",
    3: "You shoot the puck at net right off your skate — any puck toward the net from the boards can cause a rebound that a teammate can tap in quickly"
  },
  u11next8: {
    // 128 -> aim 122/130/134
    0: "You dump the puck deep and chase — a flat-footed D won't react fast, but dumping the puck in is always the safer play than carrying over",
    2: "You stop at the blue line and wait — let the defender commit, then make your read once your wingers catch up for a full zone entry play",
    3: "You pass it backward to the trailer — drop the puck to your center at center ice and let them attack with fresh speed through the neutral zone"
  }
};

// Build output array in original order
const output = [];
for (const q of input) {
  const opts = [null, null, null, null];
  opts[q.ok] = q.opts[q.ok];
  const d = drafts[q.id];
  for (const [idx, text] of Object.entries(d)) {
    opts[parseInt(idx)] = text;
  }
  output.push({ id: q.id, opts });
}

// Validate
let allOk = true;
let mixOk = 0;
const errors = [];
for (const q of input) {
  const out = output.find(o => o.id === q.id);
  if (out.opts[q.ok] !== q.opts[q.ok]) { errors.push(q.id + ': correct opt changed!'); allOk = false; }
  const correctLen = q.correctLen;
  let hasGE = false;
  let hasLE = false;
  for (let i = 0; i < 4; i++) {
    if (i === q.ok) continue;
    const len = out.opts[i].length;
    const delta = len - correctLen;
    if (Math.abs(delta) > 10) { errors.push(q.id + ' opt' + i + ': delta ' + delta + ' (len ' + len + ' vs ' + correctLen + ')'); allOk = false; }
    if (len >= correctLen) hasGE = true;
    if (len <= correctLen) hasLE = true;
  }
  if (hasGE && hasLE) mixOk++;
  else if (!hasGE) errors.push(q.id + ': no distractor >= correct');
  else if (!hasLE) errors.push(q.id + ': no distractor <= correct');
}
console.log('Total:', input.length, 'AllWithin10:', allOk, 'Mix:', mixOk);
if (errors.length) {
  console.log('ERRORS:');
  errors.forEach(e => console.log(' ', e));
}

if (allOk && mixOk === input.length) {
  fs.writeFileSync('./output2_u11_4.json', JSON.stringify(output, null, 2));
  console.log('WROTE FILE');
} else {
  console.log('NOT WRITING - fix errors first');
}
