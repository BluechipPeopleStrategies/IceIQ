const tests = [
  // u9q89 correct=116, [106,126], need >=116
  ['u9q89', 116, [
    'Everyone chases the puck carrier together at the same time so you can all pressure the puck and strip it away as a fast group',
    'All four of you backskate straight to your own blue line and stand in a tight wall across the front of your net area',
    'One player steps up to battle the puck carrier while the other three retreat all the way back to the crease line at once'
  ]],
  // u9q92 correct=127, [117,137], need >=127
  ['u9q92', 127, [
    'The tricky cross-ice pass because it gets the puck out of the zone way faster than any short pass to your own D partner in the corner',
    'Carry it yourself around the back of the net and try to skate away from the forechecking pressure up the far side of the ice',
    'Wait for a better option to appear because one of your teammates will probably get open soon if you just hold the puck'
  ]],
  // u9q93 correct=96, [86,106], need >=96
  ['u9q93', 96, [
    'Skate down into the corner to help your partner battle for the puck and win it back quickly',
    'Skate up to your blue line and get ready for the breakout the moment your team wins the puck back',
    'Follow the nearest attacker wherever they go around the zone and stay glued to them tightly'
  ]],
  // u9q94 correct=108, [98,118], need >=108
  ['u9q94', 108, [
    'Watch carefully to see if your goalie covers the rebound or plays the puck before you commit to going into the corner',
    'Call loudly for your goalie to come out and play the puck in the corner before the opposing player can get to it first',
    'Back up all the way to your own crease and wait for the next shot that might come from the corner area'
  ]],
  // u9q95 correct=90, [80,100], need >=90
  ['u9q95', 90, [
    'Say nothing and let the D figure out the forecheck pressure all on their own without any help at all',
    'Skate over yourself to get between the forechecker and the winger before the pass arrives',
    'Call for the pass yourself so the D sends the puck straight to you in open ice instead'
  ]],
  // u9q98 correct=122, [112,132], need >=122
  ['u9q98', 122, [
    'Watch the puck carefully because it is way more important to know where the puck is than to know where your assigned man is',
    'Try to watch both the puck and your assigned man at exactly the same time with equal focus on each of them the whole shift',
    'Skate into the corner yourself to help your team battle for the puck and win it back from the other team as fast as you can'
  ]],
  // u9q99 correct=112, [102,122], need >=112
  ['u9q99', 112, [
    'Push through the tiredness because the play needs you and your linemates are counting on you to come back on the backcheck',
    'Jog slowly back to the D-zone so you save some energy for the rest of your shift out on the ice out there',
    'Yell at the other team puck carrier to slow them down so your team can set up the defense in your zone first'
  ]],
  // u9q100 correct=88, [78,98], need >=88
  ['u9q100', 88, [
    'Pass to the winger on the left because they were the first option you saw as you scanned the ice',
    'Pass to the D on the right because they are the safest option and nobody is close to them at all',
    'Carry it in yourself and try to beat the defenders one-on-one with your speed and moves up the ice'
  ]],
  // u9g1 correct=78, [68,88], need >=78
  ['u9g1', 78, [
    'Stay flat on your goal line so the whole crease is behind you to react to the shot',
    'Skate all the way out past your blue line to challenge the shooter far from the net',
    'Lie flat down on the ice right away and hope the shooter misses the net entirely'
  ]],
  // u9g2 correct=111, [101,121], need >=111
  ['u9g2', 111, [
    'Skate out of the crease to challenge the puck carrier and cut their shooting angle before they fire a shot at you',
    'Yell at your defenseman to step up and take the puck carrier out of the play before a shot can happen on you',
    'Come out past the crease all the way to the top of the circles and meet the attackers up high on the ice'
  ]],
  // u9g3 correct=83, [73,93], need >=83
  ['u9g3', 83, [
    'Try to kick the puck away with one foot while standing up on your skates the whole time',
    'Fall sideways quickly onto the ice to cover the bottom with your leg pad and skate',
    'Stand straight up and hope that the shot hits you somewhere on your leg pads or chest'
  ]],
  // u9g6 correct=109, [99,119], need >=109
  ['u9g6', 109, [
    'Never touch the puck because leaving the crease always gives the other team a chance to score on the open net',
    'Only if the other team is definitely not coming for the puck and you have a fully clear path to reach it quickly',
    'Kick it with your skate out to the corner so your winger can grab the puck there and start the breakout cleanly'
  ]],
  // u9g8 correct=48, [38,58], need >=48
  ['u9g8', 48, [
    'In the middle of your net ready to move and react fast',
    'All the way across touching the far right post',
    'Out at the top of your crease to challenge'
  ]],
  // u9g9 correct=74, [64,84], need >=74
  ['u9g9', 74, [
    'Say nothing and just grab the puck fast before your D can get to it',
    'Tap them on the shoulder pad with your blocker to signal you have it',
    'Wait until after the play is over to talk about who should have gone for the puck'
  ]],
  // u9g10 correct=101, [91,111], need >=101
  ['u9g10', 101, [
    'Watch the bodies in front of your net carefully so you do not lose sight of any player near the crease',
    'Wait patiently for the puck to come out of the pile into a clear area where you can see it fully',
    'Drop immediately into your butterfly to cover the bottom of the net in case the puck pops out low'
  ]],
  // u9g11 correct=86, [76,96], need >=86
  ['u9g11', 86, [
    'Stay on your near post and trust your D to cover the back-door attacker first',
    'Skate out hard toward the puck carrier to challenge them right at the top of the crease',
    'Stay exactly where you are on the near post and wait for the shot to come your way'
  ]],
  // u9g12 correct=120, [110,130], need >=120
  ['u9g12', 120, [
    'Always cover the puck for a faceoff no matter who is about to get the puck because a stoppage gives your team a rest',
    'Always leave the puck for your team no matter what is happening in front because your team needs to start the breakout play',
    'Kick the puck away from the crease as hard as you can anywhere so the other team cannot get a second shot on you at all'
  ]],
  // u9g13 correct=107, [97,117], need >=107
  ['u9g13', 107, [
    'Nothing special — just play the puck straight up the way you would with any other shooter coming at you on a rush',
    'They are going to deke around you to the left side of the net instead of firing a shot through the middle',
    'They are going to pass the puck over to their open teammate cutting to the net on the far side of the rush'
  ]],
  // u9g14 correct=146, [136,156], need >=146
  ['u9g14', 146, [
    'Give up the goal and just see what happens next because there is really nothing else you can do from flat on the ice like this position anymore',
    'Stay completely still on the ice and hope the shooter somehow misses the wide-open net that you have given them with the positioning mistake',
    'Call for help from your defensemen so they can slide across in front of the shooter and block the shooting lane from where you cannot reach'
  ]],
  // u9g15 correct=108, [98,118], need >=108
  ['u9g15', 108, [
    'Skate slowly and carefully across your crease to make sure you do not lose your balance or get caught out of position',
    'Turn around and skate quickly across the crease to the far right post so you can set up square to the puck',
    'Stay on the left post a bit too long and hope the puck comes back to your side before you commit to moving across'
  ]],
  // u9mis3 correct=148, [138,158], need >=148
  ['u9mis3', 148, [
    'They are being smart by waiting for the breakaway so they can score the moment the puck gets flipped up to them from the D-zone by any teammate',
    'The coach told them to stay up there in case the puck came up the ice, so they are just following the game plan they were given for this long shift',
    'They are too tired to skate all the way back and help in the defensive zone, so they are just conserving their energy for later in the game this period'
  ]],
  // u9mis7 correct=147, [137,157], need >=147
  ['u9mis7', 147, [
    'The teammate should have eyes in the back of their head to see the forechecker coming behind them even without turning around to look for the pressure',
    'The forechecker was simply too fast for anyone to stop once they committed hard to the puck carrier coming in from the blind side at full speed like that',
    'The teammate should have passed the puck much sooner so that they would not have gotten caught behind the net with the pressure coming right in on them'
  ]],
  // u9next3 correct=139, [129,149], need >=139
  ['u9next3', 139, [
    'You give up on the play because the forward is gone and catching them from behind is pretty much impossible at this point in the rush anyway',
    'You yell loudly at your defensemen for letting the attacker get behind them so they know not to make the same mistake on the very next shift',
    'You coast back slowly toward your own net because there is no chance of catching up now and you want to save some of your energy for later'
  ]],
  // u9next4 correct=149, [139,159], need >=149
  ['u9next4', 149, [
    'You pass to the corner to a teammate who can then cycle the puck down low and set up a much better scoring chance from below the goal line on a play',
    'You skate in closer to the net so you get a better angle, and then you shoot once you have a cleaner look at the puck past the screen players in front',
    'You wait patiently for a better passing lane to open up so that the screening teammates have a chance to reposition themselves into the slot area'
  ]],
  // u9next5 correct=153, [143,163], need >=153
  ['u9next5', 153, [
    'The D tries to carry the puck out alone up the middle by skating through both forecheckers with quick stickhandling moves at full speed up the whole ice',
    'The D shoots the puck hard down the entire length of the ice to get it safely out and reset everything from a neutral position at center with a fresh start',
    'The D freezes the puck against the boards behind the net to force a faceoff and get a quick shift change for the tired line that needs to rest on the bench'
  ]],
  // u9next6 correct=149, [139,159], need >=149
  ['u9next6', 149, [
    'You forecheck hard even though you are tired because backing off now just means the other team gets a clean, easy breakout up the ice on your own line',
    'You stand still at the blue line and rest a few seconds to catch your breath before chasing the puck back down into the zone to retrieve it from them',
    'You call a timeout so your tired line can get a proper rest on the bench before the other team starts moving the puck up the ice toward your end'
  ]],
  // u9next7 correct=131, [121,141], need >=131
  ['u9next7', 131, [
    'Puck carrier keeps going hard up the ice alone and tries to beat both defenders with pure speed down the outside lane all by themselves',
    'Puck carrier dumps it into the zone so the forwards can chase and create a new play with an aggressive forecheck down low in the corners',
    'Puck carrier stops and waits for the trailing forward to catch up before making any move into the offensive zone across the blue line'
  ]],
];
for (const [id, correct, ds] of tests) {
  const lens = ds.map(d => d.length);
  let bad = false, hasLonger = false;
  for (const L of lens) {
    if (Math.abs(L - correct) > 10) bad = true;
    if (L > correct) hasLonger = true;
  }
  if (bad || !hasLonger) {
    console.log(id, 'correct=' + correct, 'lens=' + lens.join(','), bad ? 'BAD' : '', !hasLonger ? 'NOLONGER' : '');
    for (let i = 0; i < ds.length; i++) {
      const delta = ds[i].length - correct;
      if (Math.abs(delta) > 10) console.log('  bad', i, 'len=' + ds[i].length, 'delta=' + delta, '::', ds[i]);
    }
  }
}
console.log('---checked---');
