// Targeted fix for the 6 MC questions flagged by quality-scan as mc-dup-opt.
// Each had the same filler text pasted into two (sometimes three) wrong-answer
// slots. Replaced with genuine, distinct distractors so the question actually
// tests the concept instead of giving the player two "obviously same" options.
//
//   node tools/fix-dup-opts.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const qPath = path.join(here, "..", "src", "data", "questions.json");
const bank = JSON.parse(fs.readFileSync(qPath, "utf8"));

const FIXES = {
  // U15 — PK box, PP moves puck to point
  u15q9: {
    opts: [
      "Shift up and toward the puck as a unit to pressure and close lanes.",
      "Collapse to the net and let the point player shoot.",
      "Sag the stick-side forward into the shot lane and force the goalie to see it clean.",
      "Rotate your low kill into a 1-3 so one forward can attack the puck aggressively.",
    ],
  },
  // U15 — PK, opposing D sets up PP breakout
  u15q24: {
    opts: [
      "Controlled pressure — take away the easy first pass without going deep.",
      "Send both forwards hard on the forecheck to force a turnover in their zone.",
      "Stand still at your blue line and let them walk the puck up unchecked.",
      "Drop into a 1-3 NZ trap and dare them to dump it in.",
    ],
  },
  // U15 goalie — post play, attacker tight to post
  u15g1: {
    opts: [
      "RVH — pad stacked against the post, blocker and glove covering high to seal the entire post.",
      "Stay centered and react — don't anticipate the play.",
      "Overslide to the backside expecting a cross-crease pass.",
      "VH with your lead leg up since that gives you more mobility to push across if they go.",
    ],
  },
  // U18 — benched after two penalties
  u18q21: {
    opts: [
      "Play disciplined but don't change your compete level — show the coach you can be physical and smart.",
      "Play the same way regardless of the game score or time.",
      "Play the exact same way that got you the penalties since you were just unlucky with the officials.",
      "Go out hunting big hits to swing momentum back and prove a point to the bench.",
    ],
  },
  // U18 — D supporting pressured forward in NZ
  u18q64: {
    opts: [
      "Get close enough to be an outlet for a drop pass — give them an escape option before the pressure forces a turnover in a dangerous area of the neutral zone on the play.",
      "Stay back at your own blue line since if they lose the puck you need to be in defensive position already and moving forward would leave the back end completely.",
      "Dump and change instead of managing the puck in transition.",
      "Pinch aggressively to create a 2-on-1 up ice and ask your partner to cover behind you.",
    ],
  },
  // U18 goalie — attacker behind net, both-sides threat
  u18g13: {
    opts: [
      "Stay centered and patient — read their body language and commit to the side they choose at the last possible moment. Moving too early gives them the other side of the net for free.",
      "Pick a side and commit early since being aggressive on one side gives you the best chance of making the save and if they go the other way it was just a good play by them.",
      "Stay centered and react — don't anticipate the play.",
      "Drop into a full butterfly with your pads flat to the crease to block any short-side wraparound.",
    ],
  },
};

let fixed = 0;
for (const level of Object.keys(bank)) {
  for (const q of bank[level]) {
    const fix = FIXES[q.id];
    if (!fix) continue;
    q.opts = fix.opts;
    // ok index stays 0 (the correct answer is unchanged as option A)
    fixed++;
    console.log(`fixed ${q.id} in ${level}`);
  }
}

fs.writeFileSync(qPath, JSON.stringify(bank, null, 2) + "\n");
console.log(`\nRewrote ${fixed} questions with distinct distractors.`);
