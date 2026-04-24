#!/usr/bin/env node
// Seed hand-written MC/TF questions to backfill thin categories at
// U9/U11/U13/U15. Thin = had only 1 question in the bank as of 2026-04-24,
// which meant a player repeatedly saw the same question in that category.
//
// Idempotent — skips ids that already exist.

import fs from "node:fs";
import path from "node:path";

const BANK = path.resolve("src/data/questions.json");
const bank = JSON.parse(fs.readFileSync(BANK, "utf8"));

const SEEDS = {
  "U9 / Novice": [
    // Orientation (was =1)
    { id:"u9_or1", cat:"Orientation", pos:["F","D"], d:1,
      sit:"The whistle blew. Where do you line up for a face-off in your own zone?",
      opts:["At the face-off dot closest to your net.","At center ice.","In front of the other team's net.","On the bench."], ok:0,
      why:"In your own zone, every face-off has a spot. You line up at the dot closest to your goalie.",
      tip:"Own zone = own dot." },
    { id:"u9_or2", cat:"Orientation", pos:["F","D"], d:1, type:"tf",
      sit:"You always defend the goal with the same color as your team's jerseys.",
      ok:false,
      why:"Nope! You defend the goalie on YOUR team — not the team color. Always know which goal is yours.",
      tip:"Know your goalie. Defend their net." },
    { id:"u9_or3", cat:"Orientation", pos:["F","D"], d:1,
      sit:"Your coach yells 'back!' What does that usually mean?",
      opts:["Skate back toward your own goalie.","Skate backward in circles.","Back up to the bench and sit.","Lean backward on your skates."], ok:0,
      why:"'Back!' means get back to your own end. Your team is defending and they need you home.",
      tip:"'Back!' = skate to your goalie." },

    // Zone Awareness (was =1)
    { id:"u9_za1", cat:"Zone Awareness", pos:["F","D"], d:1,
      sit:"Which zone is YOUR offensive zone?",
      opts:["The zone where the other team's net is.","The zone where your goalie stands.","The middle zone.","The penalty box."], ok:0,
      why:"Your offensive zone is the one you're trying to score in — where the OTHER team's net is.",
      tip:"You score = offensive zone." },
    { id:"u9_za2", cat:"Zone Awareness", pos:["F","D"], d:1, type:"tf",
      sit:"The neutral zone is the area between the two blue lines.",
      ok:true,
      why:"Yes. Neutral zone = middle of the rink, between the blue lines. Not offensive, not defensive.",
      tip:"Between blue lines = neutral." },
    { id:"u9_za3", cat:"Zone Awareness", pos:["F","D"], d:1,
      sit:"You just crossed your own blue line into the middle of the rink. Which zone are you in now?",
      opts:["Neutral zone.","Offensive zone.","Defensive zone.","Penalty zone."], ok:0,
      why:"Crossing out of your own zone puts you in the neutral zone. Good awareness!",
      tip:"Between the blues = neutral." },
  ],

  "U11 / Atom": [
    // Puck Support (was =1)
    { id:"u11_sup1", cat:"Puck Support", pos:["F","D"], d:2,
      sit:"Your teammate has the puck along the wall in the offensive zone. You're nearby. What should you do?",
      opts:["Find open ice within one pass.","Skate behind the net, out of sight.","Yell at them to shoot.","Stand still and watch."], ok:0,
      why:"Puck support means giving the carrier an easy outlet. Open yourself up one pass away so they don't have to force it.",
      tip:"Be an option, not a spectator." },
    { id:"u11_sup2", cat:"Puck Support", pos:["F","D"], d:2, type:"tf",
      sit:"Good puck support means skating AWAY from your teammate who has the puck so you don't crowd them.",
      ok:false,
      why:"Too far away and you're not a pass option. Stay close enough to receive — usually about one stick-length to a half-rink away, depending on the play.",
      tip:"Close enough to help, not so close you crowd." },
    { id:"u11_sup3", cat:"Puck Support", pos:["F"], d:2,
      sit:"A teammate is battling for the puck in the corner. Where's the best spot to support them?",
      opts:["A few feet above them, ready for a pass out.","Right on top of them in the corner.","Behind your goalie.","At the other team's blue line."], ok:0,
      why:"Corner battles need an outlet up high. Sit a few feet above, ready for the chip-up. Two people in the corner = wasted bodies.",
      tip:"Corner battle? Sit above it." },

    // 2-on-1 (was =1)
    { id:"u11_2on1a", cat:"2-on-1", pos:["F"], d:2,
      sit:"You're the puck carrier on a 2-on-1. The defender drifts toward YOU. What's the right play?",
      opts:["Pass to your teammate.","Shoot high.","Dump and chase.","Stop and wait."], ok:0,
      why:"If the D takes you, they're not taking the pass. Move the puck across and your teammate has a look.",
      tip:"D on you → pass." },
    { id:"u11_2on1b", cat:"2-on-1", pos:["F"], d:2,
      sit:"You're the puck carrier on a 2-on-1. The defender stays in the middle, taking away the pass. What's the play?",
      opts:["Shoot — go to the net yourself.","Force the pass anyway.","Pass back to your D.","Pull up and wait."], ok:0,
      why:"If the defender commits to the passing lane, they're giving you the shot. Take it.",
      tip:"D on the pass → shoot." },
    { id:"u11_2on1c", cat:"2-on-1", pos:["F"], d:2, type:"tf",
      sit:"On a 2-on-1 you should always pass no matter what the defender does.",
      ok:false,
      why:"Reading the defender is the whole point. Pass OR shoot depending on who they take — not a default.",
      tip:"Read first, then decide." },

    // Starts (was =1)
    { id:"u11_start1", cat:"Starts", pos:["F","D"], d:1,
      sit:"The puck drops at center ice and bounces to your stick. First move?",
      opts:["Look up and find a teammate.","Skate to the bench.","Shoot it down the ice.","Freeze the puck."], ok:0,
      why:"Every breakout starts with head up. Look first, then make the read.",
      tip:"Head up before you move the puck." },
    { id:"u11_start2", cat:"Starts", pos:["F","D"], d:1, type:"tf",
      sit:"The best skaters take 2–3 hard strides right away — they don't glide.",
      ok:true,
      why:"Short hard strides out of the blocks win races for the puck and give you speed to protect or attack.",
      tip:"Hard strides first. Glide later." },
    { id:"u11_start3", cat:"Starts", pos:["F","D"], d:1,
      sit:"You're in a tight corner with the puck. You want to escape. How do you start?",
      opts:["Low, explosive first steps.","Long smooth glide.","Slow backward crossovers.","Stop and wait."], ok:0,
      why:"In tight spaces you need quick separation — stay low and explode off your edges.",
      tip:"Low + explosive = escape." },

    // Net-Front (was =1)
    { id:"u11_net1", cat:"Net-Front", pos:["F"], d:2,
      sit:"Your teammate is winding up from the point. You're the net-front forward. What do you do?",
      opts:["Plant in front of the goalie for a screen or tip.","Skate to the far boards.","Go to the bench.","Raise your stick above your head."], ok:0,
      why:"Net-front is a job. Screen the goalie, be ready to tip, and hunt the rebound. That's where ugly goals are born.",
      tip:"Point shot = plant at the net." },
    { id:"u11_net2", cat:"Net-Front", pos:["F"], d:2, type:"tf",
      sit:"A good net-front forward keeps their stick on the ice even after the shot is taken.",
      ok:true,
      why:"Rebounds pop out fast. Stick on the ice = you can tip, redirect, or jam — all with no extra motion.",
      tip:"Stick down, always." },
    { id:"u11_net3", cat:"Net-Front", pos:["F"], d:2,
      sit:"You're at the net-front and the defender crosschecks you out of position. What's the smart play?",
      opts:["Re-establish position fast, keep the stick down.","Fall to the ice and stay there.","Skate away and pout.","Drop your stick and yell."], ok:0,
      why:"Good net-front guys get moved, then get back. Don't waste the shift. Reset, stick down, hunt the rebound.",
      tip:"Moved? Get back." },

    // Passing (was =1)
    { id:"u11_pass1", cat:"Passing", pos:["F","D"], d:1,
      sit:"Where should you aim a pass to a skating teammate?",
      opts:["A stick-length ahead of where they are now.","Right at their current skates.","Behind them, at their heels.","At the boards."], ok:0,
      why:"Lead your teammate. A pass goes to where they'll be, not where they are.",
      tip:"Pass to space, not the player." },
    { id:"u11_pass2", cat:"Passing", pos:["F","D"], d:1, type:"tf",
      sit:"A hard, flat pass is usually better than a soft, floating pass.",
      ok:true,
      why:"Hard flat passes are easier to handle, harder to intercept, and faster to the target. Soft floaters are picked off.",
      tip:"Flat and firm. Not soft." },
    { id:"u11_pass3", cat:"Passing", pos:["F","D"], d:1,
      sit:"You're about to pass and you notice a defender in the passing lane. What do you do?",
      opts:["Delay or find a different teammate.","Fire it through anyway.","Pass it into the defender.","Throw your stick."], ok:0,
      why:"Passes into defenders become their rush the other way. If the lane isn't open, reset and find a new option.",
      tip:"Lane blocked? Reset." },

    // Teamwork (was =2) — add 3 more to reach 5
    { id:"u11_tmw1", cat:"Teamwork", pos:["F","D"], d:1,
      sit:"A teammate makes a mistake that leads to a goal against. First move on the bench?",
      opts:["Tap their pads and say 'next shift.'","Yell at them.","Roll your eyes.","Turn your back."], ok:0,
      why:"Teams that pick each other up score more the rest of the game. Teams that tear each other down lose fast.",
      tip:"Mistake? Pick them up." },
    { id:"u11_tmw2", cat:"Teamwork", pos:["F","D"], d:1, type:"tf",
      sit:"It's a teammate's job to set you up — you don't have to pass back or look for them after.",
      ok:false,
      why:"Good teams move the puck both ways. If a teammate sets you up, you look for them next time. That's trust.",
      tip:"Give it to get it." },
    { id:"u11_tmw3", cat:"Teamwork", pos:["F","D"], d:1,
      sit:"Coach benches you unexpectedly. What's the team-first response?",
      opts:["Cheer for the players on the ice.","Slam the gate.","Refuse to answer questions.","Skate to the bathroom."], ok:0,
      why:"Bench energy matters. Cheering teammates on — especially when you're frustrated — is captain behavior.",
      tip:"Benched? Cheer louder." },
  ],

  "U13 / Peewee": [
    // Vision (was =1)
    { id:"u13_vis1", cat:"Vision", pos:["F","D"], d:2,
      sit:"You're about to receive a pass along the wall. When should you first look up?",
      opts:["Before the puck gets to you.","Right when you touch it.","After you've stickhandled a couple times.","Only if a defender is near."], ok:0,
      why:"Pre-scan — look up BEFORE the puck arrives. When it's on your stick, you already know what to do.",
      tip:"See it before you feel it." },
    { id:"u13_vis2", cat:"Vision", pos:["F","D"], d:2, type:"tf",
      sit:"Elite players look up at least two or three times during a single puck possession.",
      ok:true,
      why:"Pre-scanning is a habit the best players do constantly. Each look updates the map — where teammates and defenders moved.",
      tip:"Head up, over and over." },
    { id:"u13_vis3", cat:"Vision", pos:["F"], d:2,
      sit:"You've got the puck in the offensive zone. Your eyes should mostly be on...",
      opts:["Space, teammates, and defenders.","The puck.","The goalie.","Your own skates."], ok:0,
      why:"The puck is on your stick — you can feel it. Your eyes should be scanning the ice for options.",
      tip:"Eyes = teammates. Feel = puck." },

    // Breakout (was =1)
    { id:"u13_brk1", cat:"Breakout", pos:["F","D"], d:2,
      sit:"Your goalie freezes the puck. Your D-partner grabs it behind the net for a breakout. Where should you be?",
      opts:["Open on your side boards, ready to receive.","Crashing the net from behind.","Standing behind your D.","At center ice."], ok:0,
      why:"Wingers hug the wall on their side for the D-to-W pass. That's the cornerstone breakout.",
      tip:"Winger on the wall, stick on the ice." },
    { id:"u13_brk2", cat:"Breakout", pos:["F","D"], d:2, type:"tf",
      sit:"If the winger on your breakout is covered, a good option is to reverse the puck behind the net.",
      ok:true,
      why:"The reverse (D-to-D behind the net) is a staple escape when the first read isn't there.",
      tip:"Winger covered? Reverse." },
    { id:"u13_brk3", cat:"Breakout", pos:["F"], d:2,
      sit:"You're the center on a breakout. Where's your ideal route?",
      opts:["Swing low, then build speed through the middle.","Stand at the blue line.","Stay next to the wall.","Behind your goalie."], ok:0,
      why:"Centers swing low, pick up speed, and provide the late middle option. That timing pressures the other team all the way up.",
      tip:"Center = low-to-high, fast." },

    // Goaltending (was =1)
    { id:"u13_goal1", cat:"Goaltending", pos:["G"], d:2,
      sit:"A shooter breaks in 1-on-1 on you from the right wing. First priority?",
      opts:["Get to the top of your crease and square to the shooter.","Drop into a butterfly right away.","Skate to the hash marks.","Close your eyes."], ok:0,
      why:"Challenge the angle first. Square and take away net — then decide if the shot or deke forces you into the butterfly.",
      tip:"Square. Challenge. Then react." },
    { id:"u13_goal2", cat:"Goaltending", pos:["G"], d:2, type:"tf",
      sit:"On a cross-crease pass, the goalie's push should lead with the far-side leg.",
      ok:true,
      why:"Leading with the far-side leg (T-push or butterfly slide) seals the ice and gets you across faster than a two-foot shuffle.",
      tip:"Cross-crease? Far leg first." },
    { id:"u13_goal3", cat:"Goaltending", pos:["G"], d:2,
      sit:"A shot is screened by your own defenseman. What do you do?",
      opts:["Drop into butterfly and take away the bottom half of the net.","Try to skate around the screen.","Yell at your D.","Wave your glove."], ok:0,
      why:"Screened shots beat goalies low. Drop, get big, and take away the ice you can't see.",
      tip:"Screened? Get big, get low." },

    // Support (was =1)
    { id:"u13_spt1", cat:"Support", pos:["F","D"], d:2,
      sit:"Your D-partner is chasing a puck into the corner in your own end. Where should you be?",
      opts:["In the slot, covering net-front.","Right next to them in the corner.","At center ice.","Behind your own net."], ok:0,
      why:"One D to the puck, the other to the net-front — that's the pairing rule. Never leave the slot empty.",
      tip:"One to puck, one to net." },
    { id:"u13_spt2", cat:"Support", pos:["F","D"], d:2, type:"tf",
      sit:"Good support = always right next to your teammate with the puck.",
      ok:false,
      why:"Too close = you're not a release valve. Support is about being reachable AND useful — usually a zone away, not a foot away.",
      tip:"Close enough to help, not crowd." },
    { id:"u13_spt3", cat:"Support", pos:["F"], d:2,
      sit:"Your winger gets hemmed along the wall. You're the center. Best support position?",
      opts:["High slot, ready for a chip-up or to cover if they lose it.","Down low with them.","Behind the goalie.","At the red line."], ok:0,
      why:"Centers play high to give the chip-up and to back-pressure if the battle gets lost.",
      tip:"Winger low, center high." },

    // Decision-Making (was =1)
    { id:"u13_dm1", cat:"Decision-Making", pos:["F","D"], d:2,
      sit:"You're skating into the offensive zone with speed and a 1-on-2 against you. What's the play?",
      opts:["Chip it deep and forecheck.","Try to skate through both defenders.","Pass back to your D at the line.","Dump it out of the zone."], ok:0,
      why:"1-on-2s rarely produce scoring chances. Chip-and-chase flips the rink and puts you on the forecheck — way better odds.",
      tip:"1-on-2? Chip and chase." },
    { id:"u13_dm2", cat:"Decision-Making", pos:["F","D"], d:2, type:"tf",
      sit:"Great decision-making = always making the flashy play.",
      ok:false,
      why:"Great decision-making = picking the right play for the moment. Sometimes it's flashy, usually it isn't.",
      tip:"Right > flashy." },
    { id:"u13_dm3", cat:"Decision-Making", pos:["F","D"], d:2,
      sit:"Late in a period with a one-goal lead, you have the puck in the neutral zone with a risky stretch-pass available. What's the call?",
      opts:["Safe chip or soft dump-in.","Force the stretch pass.","Skate backward.","Shoot it toward their empty blue line."], ok:0,
      why:"Game management — late with a lead, high-risk passes go the wrong way. Chip it deep, change lines, reset.",
      tip:"Up a goal late? Simple." },
  ],

  "U15 / Bantam": [
    // Breakouts (was =1)
    { id:"u15_brk1", cat:"Breakouts", pos:["F","D"], d:2,
      sit:"The forecheck is applying heavy pressure on your D behind the net. You're the weak-side winger. Best read?",
      opts:["Come lower and offer a reverse support.","Stay high on your wall.","Skate straight to the bench.","Crash the net."], ok:0,
      why:"Against a heavy forecheck, wingers sometimes need to come down to give the D a second option — a low reverse outlet.",
      tip:"Heavy pressure? Come low." },
    { id:"u15_brk2", cat:"Breakouts", pos:["F","D"], d:2, type:"tf",
      sit:"A good breakout adjusts based on how the other team forechecks — it's not one fixed pattern.",
      ok:true,
      why:"Elite teams read the forecheck and flex. 1-2-2, 2-1-2, trap — each demands a different breakout option.",
      tip:"Read the forecheck, pick your out." },
    { id:"u15_brk3", cat:"Breakouts", pos:["D"], d:2,
      sit:"You retrieve a dump-in behind the net. Two forecheckers are coming hard. What's the highest-percentage play?",
      opts:["Rim the puck hard off the boards to the strong-side winger.","Skate it up the middle yourself.","Throw it high through the slot.","Freeze it and take an icing."], ok:0,
      why:"Rimming is a staple breakout escape — fast, hard, predictable for your winger. Middle-ice carries into heavy forecheck = turnovers.",
      tip:"Under pressure? Rim it." },

    // Puck Management (was =1)
    { id:"u15_pm1", cat:"Puck Management", pos:["F","D"], d:2,
      sit:"You're in your own end with a questionable pass available through the middle. Right call?",
      opts:["Glass-and-out — don't force it.","Force the middle pass.","Skate through two defenders.","Reverse to your goalie."], ok:0,
      why:"In your own end, the middle is sacred. If you aren't 100% sure, glass it out and regroup in the neutral zone.",
      tip:"Own end middle = only if certain." },
    { id:"u15_pm2", cat:"Puck Management", pos:["F","D"], d:2, type:"tf",
      sit:"Good puck management means taking fewer low-percentage shots from bad angles and saving possession.",
      ok:true,
      why:"Shooting from zero-angle just gives the puck back. Keeping possession = more chances later.",
      tip:"Manage the puck. Don't donate it." },
    { id:"u15_pm3", cat:"Puck Management", pos:["F"], d:2,
      sit:"Late in the game, up by one, you gain the offensive zone. A risky cross-ice pass is open. What's the smart play?",
      opts:["Cycle the puck low and kill time.","Force the cross-ice pass.","Shoot from the blue line.","Skate into the defender."], ok:0,
      why:"Up a goal late = protect possession. Cycle low, eat clock, force them to chase.",
      tip:"Up late? Cycle, don't gamble." },

    // Decision-Making (was =1)
    { id:"u15_dm1", cat:"Decision-Making", pos:["F","D"], d:2,
      sit:"It's your third period, score tied, 40 seconds left in your shift. You get a 50/50 chance to pinch as a D. Right call?",
      opts:["Stay back — your legs are fried and the consequences are too high.","Pinch hard — go for it.","Skate to the bench right now.","Yell for a change."], ok:0,
      why:"Decision-making is situational. Tired legs + tight game + high consequence = stay. Pinch on clean reads only.",
      tip:"Tired + tight game = safe." },
    { id:"u15_dm2", cat:"Decision-Making", pos:["F","D"], d:2, type:"tf",
      sit:"The right decision at 0-0 in the first period is sometimes different from the right decision with a 3-goal lead in the third.",
      ok:true,
      why:"Game state matters. What's great in one scenario can be reckless in another. Elite players constantly adjust.",
      tip:"Score + time = context." },
    { id:"u15_dm3", cat:"Decision-Making", pos:["F"], d:2,
      sit:"Down a goal late, you receive a puck at center with a clean look at a stretch pass through the middle. Right call?",
      opts:["Go for it — the risk is worth the reward.","Chip it deep safely.","Reverse to your D.","Freeze the puck."], ok:0,
      why:"Down late = take calculated risks. Forcing chances is worth it when the alternative is losing. Flip in the lead situation, and it's the opposite.",
      tip:"Down late? Take smart risks." },
  ],
};

let added = 0, skipped = 0;
for (const [level, seeds] of Object.entries(SEEDS)) {
  if (!bank[level]) bank[level] = [];
  for (const q of seeds) {
    if (bank[level].some(x => x.id === q.id)) { skipped++; continue; }
    bank[level].push(q);
    added++;
  }
}
fs.writeFileSync(BANK, JSON.stringify(bank, null, 2) + "\n", "utf8");
console.log(`Thin-cat seed: ${added} added, ${skipped} skipped.`);
for (const [level] of Object.entries(SEEDS)) {
  console.log(`  ${level} now: ${bank[level].length}`);
}
