#!/usr/bin/env node
// Round 2 of thin-category fills. Targets the 6 cats still at 2-3
// questions after the first pass: U11 Skating, Cycle Play, Game IQ,
// Shooting; U15 Game Management, Finishing. Idempotent.

import fs from "node:fs";
import path from "node:path";

const BANK = path.resolve("src/data/questions.json");
const bank = JSON.parse(fs.readFileSync(BANK, "utf8"));

const SEEDS = {
  "U11 / Atom": [
    // Skating (was =2)
    { id:"u11_sk1", cat:"Skating", pos:["F","D"], d:1,
      sit:"You're on defense and the play is moving laterally along the blue line. What stride helps you stay with it?",
      opts:["Crossovers — stay square with power to either side.","Straight-line skating.","Snowplow stops.","One-foot glide."], ok:0,
      why:"Crossovers let a defender mirror lateral puck movement without losing power or losing balance.",
      tip:"Lateral play = crossovers." },
    { id:"u11_sk2", cat:"Skating", pos:["F","D"], d:1, type:"tf",
      sit:"Backwards skating is just as important as forward skating for defensemen.",
      ok:true,
      why:"D-men spend most of their shift skating backwards or in transition. Backward skating, pivots, and crossovers are the core.",
      tip:"D = backward machine." },
    { id:"u11_sk3", cat:"Skating", pos:["F","D"], d:1,
      sit:"What's the most efficient way to change directions quickly?",
      opts:["Edge work — dig in and push off.","Slow down, then turn.","Stop completely.","Jump."], ok:0,
      why:"Inside and outside edges are how fast players change directions without losing speed.",
      tip:"Edges win races." },

    // Cycle Play (was =3)
    { id:"u11_cyc1", cat:"Cycle Play", pos:["F"], d:2,
      sit:"Your teammate passes to you on the half-wall in the offensive zone. What do you usually do next?",
      opts:["Protect the puck and cycle it low or find the next option.","Shoot from the wall.","Skate to the point.","Dump it out of the zone."], ok:0,
      why:"The cycle is about maintaining possession. Protect, look, and move the puck low or back — wear defenders out.",
      tip:"Protect → look → move." },
    { id:"u11_cyc2", cat:"Cycle Play", pos:["F"], d:1, type:"tf",
      sit:"In a cycle, the most important job is to keep moving your feet so you're always a pass option.",
      ok:true,
      why:"Stationary cyclers die. Keep feet moving, support the carrier, give them an outlet with speed.",
      tip:"Cycle = feet always moving." },
    { id:"u11_cyc3", cat:"Cycle Play", pos:["F"], d:2,
      sit:"The defender pins your teammate on the boards. What's the cycle read?",
      opts:["Sit above and be the outlet.","Crash the net.","Go back to the point.","Head to the bench."], ok:0,
      why:"Pinned teammate needs a release valve. Sit a stick's length above the battle — not in it — and take the chip-up.",
      tip:"Pinned teammate → outlet above." },

    // Game IQ (was =3)
    { id:"u11_iq1", cat:"Game IQ", pos:["F","D"], d:2,
      sit:"Your team just scored to tie the game. What's the best mindset for your next shift?",
      opts:["Stay smart — don't chase the go-ahead goal with risky plays.","Force everything into the net.","Celebrate longer at the bench.","Play dump-and-chase only."], ok:0,
      why:"After a big goal, the team that stays disciplined usually wins. Don't chase the next one and gift the other team a rush.",
      tip:"Tie game = stay disciplined." },
    { id:"u11_iq2", cat:"Game IQ", pos:["F","D"], d:1, type:"tf",
      sit:"A player with high hockey IQ thinks about where the puck is going, not just where it is.",
      ok:true,
      why:"Anticipation is the difference between chasing and controlling. See the play a half-second ahead.",
      tip:"See the next play, not the current one." },
    { id:"u11_iq3", cat:"Game IQ", pos:["F","D"], d:2,
      sit:"It's the end of the game and you're up 1-0. What's a smart play in your offensive zone?",
      opts:["Keep the puck low and cycle — eat clock.","Take a flashy shot from the point.","Try a saucer pass through the slot.","Dump it out of the zone."], ok:0,
      why:"Up a goal late = game management. Cycle low, eat clock, make them come get it.",
      tip:"Up a goal late = cycle low." },

    // Shooting (was =3)
    { id:"u11_sh1", cat:"Shooting", pos:["F"], d:1,
      sit:"You're at the side of the net with the puck. The goalie is sprawled. Best shot?",
      opts:["Tuck it into the empty top corner.","Slap shot at the goalie.","Pass it back to the point.","Skate behind the net."], ok:0,
      why:"Empty net = calm, accurate, top corner. Don't overthink it.",
      tip:"Goalie down = top corner, calm." },
    { id:"u11_sh2", cat:"Shooting", pos:["F"], d:1, type:"tf",
      sit:"A quick release matters more than shot power for most goals.",
      ok:true,
      why:"Goalies mostly track shots they see cleanly. Quick release on and off your stick = they don't have time to react.",
      tip:"Quick release > raw power." },
    { id:"u11_sh3", cat:"Shooting", pos:["F"], d:1,
      sit:"You're in the slot. Your shot is blocked. What's the next play?",
      opts:["Get the rebound or fake and shoot again.","Skate back to the bench.","Blame your stick.","Freeze the puck."], ok:0,
      why:"Shots get blocked. Good shooters stay hunting — track the rebound or reset the shot.",
      tip:"Blocked? Hunt it again." },
  ],

  "U15 / Bantam": [
    // Game Management (was =3)
    { id:"u15_gm1", cat:"Game Management", pos:["F","D"], d:2,
      sit:"3rd period, your team is up by 1, 4 minutes to go. Best line philosophy?",
      opts:["Simple plays, short shifts, get pucks out clean.","Force the extra goal with risky plays.","Hold the puck as long as possible.","Take more shots from bad angles."], ok:0,
      why:"Late with a lead = short shifts, simple plays, clean exits. Don't give them oxygen.",
      tip:"Lead late = simple + short." },
    { id:"u15_gm2", cat:"Game Management", pos:["F","D"], d:2,
      sit:"You're down by a goal with 90 seconds left. You have the puck in your zone. Best play?",
      opts:["Join the rush — calculated risk is worth it.","Play it safe and cycle.","Glass-and-out.","Freeze the puck."], ok:0,
      why:"Down late = calculated risk > safe. Join the attack, create numbers, force a chance.",
      tip:"Down late = push, don't coast." },
    { id:"u15_gm3", cat:"Game Management", pos:["F","D"], d:2, type:"tf",
      sit:"Your team should play the same way in minute 1 as minute 59 — score + time don't matter.",
      ok:false,
      why:"Elite teams adjust constantly. Tight playoff game ≠ 6-1 blowout ≠ early-period feel-out. Read the state.",
      tip:"Score + time = adjust." },

    // Finishing (was =3)
    { id:"u15_fin1", cat:"Finishing", pos:["F"], d:2,
      sit:"You break in alone on the goalie. What's the highest-percentage move?",
      opts:["Deke to your forehand and elevate.","Shoot from the blue line.","Pass back to no one.","Dump it in."], ok:0,
      why:"Breakaways favor the attacker. Get to your forehand, pick the corner, elevate. Quick eyes on the goalie's pads.",
      tip:"Breakaway = forehand, elevate." },
    { id:"u15_fin2", cat:"Finishing", pos:["F"], d:2,
      sit:"You receive a pass backdoor in the slot. What's the play?",
      opts:["One-timer into the open net.","Stop and stickhandle.","Look for another pass.","Hesitate."], ok:0,
      why:"Backdoor feeds die when the goalie recovers. One-time it into the open side — speed beats stickhandling here.",
      tip:"Backdoor = one-time it." },
    { id:"u15_fin3", cat:"Finishing", pos:["F"], d:2, type:"tf",
      sit:"Great finishers look at the goalie, not the puck, right before they shoot.",
      ok:true,
      why:"Top finishers scan the goalie's position AND what the goalie is giving up. Their hands find the puck by feel.",
      tip:"Finisher's eyes = goalie, not puck." },
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
console.log(`Round 2 thin-cat seed: ${added} added, ${skipped} skipped.`);
