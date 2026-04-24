#!/usr/bin/env node
// Seed U7 / Initiation question bank. Vocabulary is 5–7-year-old appropriate.
// Idempotent — skip if id already present.

import fs from "node:fs";
import path from "node:path";

const BANK = path.resolve("src/data/questions.json");
const bank = JSON.parse(fs.readFileSync(BANK, "utf8"));
const LEVEL = "U7 / Initiation";

const SEEDS = [
  {
    id: "u7i1", cat: "Teamwork", pos: ["F", "D"], d: 1,
    sit: "Your teammate has the puck. What should you do?",
    opts: [
      "Skate close and be ready for a pass.",
      "Skate away from them.",
      "Sit down and wait.",
      "Try to take the puck from them.",
    ],
    ok: 0,
    why: "Good teammates stay close and ready — that way the puck carrier has someone to pass to.",
    tip: "Stay with your teammate. Be ready.",
  },
  {
    id: "u7i2", cat: "Positioning", pos: ["F", "D"], d: 1,
    sit: "Where is the best spot to help your team?",
    opts: [
      "Near the puck.",
      "By the bench.",
      "Behind your goalie.",
      "In the stands.",
    ],
    ok: 0,
    why: "You help the team most when you're near the puck — ready to get it, pass it, or stop the other team.",
    tip: "Go where the puck is.",
  },
  {
    id: "u7i3", cat: "Roles", pos: ["F", "D"], d: 1,
    sit: "What is the goalie's job?",
    opts: [
      "To stop the puck.",
      "To score lots of goals.",
      "To sit on the bench.",
      "To cheer for the team.",
    ],
    ok: 0,
    why: "The goalie's job is to stop the puck from going in the net. That's the most important save!",
    tip: "Goalies stop pucks.",
  },
  {
    id: "u7i4", cat: "Puck Skills", pos: ["F", "D"], d: 1,
    sit: "Your teammate passes you the puck. What should you do first?",
    opts: [
      "Try to stop it with your stick and look up.",
      "Kick it with your foot.",
      "Give it back to the other team.",
      "Sit down with it.",
    ],
    ok: 0,
    why: "Stop the puck first, then look up to see where your teammates are.",
    tip: "Stop it. Look up.",
  },
  {
    id: "u7i5", cat: "Compete", pos: ["F", "D"], d: 1, type: "tf",
    sit: "If you fall down, you should stay on the ice and wait.",
    ok: false,
    why: "Hockey players fall a lot! The best ones get up fast and keep playing.",
    tip: "Fall down, get up, keep skating.",
  },
  {
    id: "u7i6", cat: "Listening", pos: ["F", "D"], d: 1,
    sit: "Your coach is talking to the team. What should you do?",
    opts: [
      "Listen and look at the coach.",
      "Skate in circles.",
      "Talk to your friend.",
      "Close your eyes.",
    ],
    ok: 0,
    why: "When you listen to your coach, you learn how to play better. That's how you get good.",
    tip: "Coach talks, you listen.",
  },
  {
    id: "u7i7", cat: "Compete", pos: ["F", "D"], d: 1,
    sit: "You lose the puck to the other team. What do you do?",
    opts: [
      "Try to get it back.",
      "Go to the bench.",
      "Stop skating.",
      "Give up.",
    ],
    ok: 0,
    why: "When you lose the puck, chase it! Good hockey players don't give up — they work to get it back.",
    tip: "Lost the puck? Go get it.",
  },
  {
    id: "u7i8", cat: "Shooting", pos: ["F"], d: 1,
    sit: "When you shoot, where should you aim?",
    opts: [
      "At an empty spot in the net.",
      "Right at the goalie's chest.",
      "Over the glass.",
      "At your teammate.",
    ],
    ok: 0,
    why: "Shoot where the goalie isn't. If there's an empty spot, aim there!",
    tip: "Find the hole. Shoot it.",
  },
  {
    id: "u7i9", cat: "Teamwork", pos: ["F", "D"], d: 1, type: "tf",
    sit: "A good teammate cheers when a friend scores a goal.",
    ok: true,
    why: "Yes! Good teammates celebrate together, no matter who scored. The whole team did it.",
    tip: "Team goal = everyone celebrates.",
  },
  {
    id: "u7i10", cat: "Practice", pos: ["F", "D"], d: 1,
    sit: "What's the best way to get better at hockey?",
    opts: [
      "Practice lots.",
      "Watch a lot of TV.",
      "Eat candy before games.",
      "Complain a lot.",
    ],
    ok: 0,
    why: "Hockey is a skill — the more you practice, the better you get. Every pro player practiced a lot when they were little.",
    tip: "Practice = getting better.",
  },
  {
    id: "u7i11", cat: "Safety", pos: ["F", "D"], d: 1, type: "tf",
    sit: "You should always wear your helmet when you're on the ice.",
    ok: true,
    why: "Helmets protect your head. Always wear one — even at practice.",
    tip: "On the ice = helmet on.",
  },
  {
    id: "u7i12", cat: "Roles", pos: ["F"], d: 1,
    sit: "Forwards mostly try to...",
    opts: [
      "Score goals.",
      "Guard the net.",
      "Sit on the bench.",
      "Skate backward.",
    ],
    ok: 0,
    why: "Forwards are the players who try to score. Defense players try to stop the other team from scoring.",
    tip: "Forwards score. D-men stop.",
  },
  {
    id: "u7i13", cat: "Roles", pos: ["D"], d: 1,
    sit: "Defense players (D-men) mostly try to...",
    opts: [
      "Stop the other team from scoring.",
      "Score lots of goals.",
      "Sit on the bench.",
      "Jump over the boards.",
    ],
    ok: 0,
    why: "D-men protect their own net. They stop the other team from getting the puck close to the goalie.",
    tip: "D-men protect the net.",
  },
  {
    id: "u7i14", cat: "Compete", pos: ["F", "D"], d: 1, type: "tf",
    sit: "If your team is losing, it's okay to give up.",
    ok: false,
    why: "Never give up! Try your best every shift. That's what real hockey players do.",
    tip: "Losing? Keep trying.",
  },
  {
    id: "u7i15", cat: "Puck Skills", pos: ["F", "D"], d: 1,
    sit: "When you're skating with the puck, you should...",
    opts: [
      "Keep your head up and look around.",
      "Look at the puck the whole time.",
      "Close your eyes.",
      "Look at the ceiling.",
    ],
    ok: 0,
    why: "Looking up helps you see your teammates and the other team. If you only watch the puck, you might skate into someone!",
    tip: "Head up when you have the puck.",
  },
];

let added = 0, skipped = 0;
if (!bank[LEVEL]) bank[LEVEL] = [];
for (const q of SEEDS) {
  if (bank[LEVEL].some(x => x.id === q.id)) { skipped++; continue; }
  bank[LEVEL].push(q);
  added++;
}
fs.writeFileSync(BANK, JSON.stringify(bank, null, 2) + "\n", "utf8");
console.log(`U7 seed: ${added} added, ${skipped} skipped. Total U7 now: ${bank[LEVEL].length}.`);
