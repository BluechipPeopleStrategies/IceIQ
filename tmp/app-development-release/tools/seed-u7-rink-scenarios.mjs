// Seeds 30 U7 / Initiation rink-type scenarios into src/data/questions.json.
// Creates the "U7 / Initiation" level if it doesn't exist (U7 was removed
// previously when the bank was culled; this re-adds it). Idempotent.
//
//   node tools/seed-u7-rink-scenarios.mjs
//
// Age-appropriate design:
//   - Very short prompts, kindergartener-friendly vocabulary
//   - Heavy on zone-click (one-tap UX), light on multiple choice
//   - No position labels on teammates (ageGroup="U7" in the editor)
//   - Few on-ice bodies (0–2 opponents, 1–3 teammates)
//   - Short feedback; praise-forward, never scolding

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const qPath = path.join(here, "..", "src", "data", "questions.json");

const base = () => ({
  team: [], opponents: [], puck: { zone: "slot" },
  showGoalie: true, showHomePlate: false,
  texts: [], arrows: [], flags: [], hiddenLabels: [],
});

const SCENARIOS = [
  {
    id: "u7rink1", cat: "Offensive Pressure", concept: "Skate to the puck", d: 1,
    sit: "The puck is in the corner. No one has it yet.",
    why: "In U7 hockey, the player who goes after the puck gets the puck.",
    tip: "See the puck? Skate to it.",
    scene: { ...base(),
      team: [{ id: "you1", zone: "high-slot", isYou: true }],
      puck: { zone: "right-corner" },
      question: {
        mode: "zone-click",
        prompt: "Click where you should skate.",
        zones: {
          correct: ["right-corner"],
          partial: ["right-boards"],
          wrong: ["slot","net-front","high-slot","left-corner","left-boards","behind-net","left-faceoff","right-faceoff","left-point","right-point"],
        },
        feedback: {
          correct: "Yes! Go get the puck.",
          partial: "Close — the puck is in the corner. Go all the way there.",
          wrong: "The puck is in the corner. That's where you skate!",
        },
      },
    },
  },
  {
    id: "u7rink2", cat: "Offensive Pressure", concept: "Shoot at the net", d: 1,
    sit: "You have the puck right in front of the net.",
    why: "When you have the puck close to the net, you shoot!",
    tip: "Close to the net? SHOOT.",
    scene: { ...base(),
      team: [{ id: "you1", zone: "slot", hasPuck: true, isYou: true }],
      puck: { zone: "slot" },
      question: {
        mode: "zone-click",
        prompt: "Click where you shoot the puck.",
        zones: {
          correct: ["net-front"],
          partial: ["slot"],
          wrong: ["high-slot","behind-net","left-corner","right-corner","left-point","right-point","left-faceoff","right-faceoff","left-boards","right-boards"],
        },
        feedback: {
          correct: "Great shot! Aim at the net.",
          partial: "Good — close to the net. Try to shoot right at the net.",
          wrong: "Always shoot AT the net!",
        },
      },
    },
  },
  {
    id: "u7rink3", cat: "Offensive Pressure", concept: "Rebound spot", d: 1,
    sit: "Your friend is shooting. You want to help.",
    why: "If the goalie blocks the shot, the puck might bounce in front. Be there!",
    tip: "Friend shoots? You go to the net.",
    scene: { ...base(),
      team: [{ id: "tm1", zone: "left-faceoff", hasPuck: true }, { id: "you1", zone: "high-slot", isYou: true }],
      puck: { zone: "left-faceoff" },
      question: {
        mode: "zone-click",
        prompt: "Click where you go when your friend shoots.",
        zones: {
          correct: ["net-front"],
          partial: ["slot"],
          wrong: ["high-slot","behind-net","left-corner","right-corner","left-point","right-point","left-faceoff","right-faceoff","left-boards","right-boards"],
        },
        feedback: {
          correct: "Yes! Go right in front of the net for a second chance.",
          partial: "Close! Go even closer to the net.",
          wrong: "Rebounds come to the front of the net. Go there!",
        },
      },
    },
  },
  {
    id: "u7rink4", cat: "Offensive Pressure", concept: "Get to open ice", d: 1,
    sit: "Your friend has the puck. You want them to be able to pass to you.",
    why: "If you skate to a spot with no one around, your friend can pass you the puck.",
    tip: "No puck? Find open ice near the net.",
    scene: { ...base(),
      team: [{ id: "tm1", zone: "left-corner", hasPuck: true }, { id: "you1", zone: "behind-net", isYou: true }],
      opponents: [{ id: "op1", zone: "left-corner", offsetX: 12 }],
      puck: { zone: "left-corner" },
      question: {
        mode: "zone-click",
        prompt: "Click the best open spot for you.",
        zones: {
          correct: ["slot"],
          partial: ["net-front","high-slot"],
          wrong: ["behind-net","left-corner","right-corner","left-point","right-point","left-faceoff","right-faceoff","left-boards","right-boards"],
        },
        feedback: {
          correct: "Great! You're right in front where you can shoot.",
          partial: "Good spot — near the net is where you want to be.",
          wrong: "Too far from the net. Get closer so your friend can pass to you.",
        },
      },
    },
  },
  {
    id: "u7rink5", cat: "Offensive Pressure", concept: "Pass or shoot", d: 1,
    sit: "You have the puck. Your friend is all alone right in front of the goalie.",
    why: "If your friend is wide open in front of the net, a pass gives them an easy shot.",
    tip: "Open friend? Pass it!",
    scene: { ...base(),
      team: [{ id: "you1", zone: "right-faceoff", hasPuck: true, isYou: true }, { id: "tm1", zone: "net-front" }],
      opponents: [{ id: "op1", zone: "high-slot" }],
      puck: { zone: "right-faceoff" },
      question: {
        mode: "choice",
        prompt: "Your friend is wide open in front. What do you do?",
        options: [
          { text: "Pass the puck to your friend", verdict: "correct", feedback: "Great teamwork!" },
          { text: "Shoot from here", verdict: "partial", feedback: "Not bad, but a pass is easier to score on." },
          { text: "Skate away from the net", verdict: "wrong", feedback: "You had a great play — share it with your friend!" },
          { text: "Stop and look around", verdict: "wrong", feedback: "Don't wait! Pass to your open friend." },
        ],
      },
    },
  },
  {
    id: "u7rink6", cat: "Offensive Pressure", concept: "Help your friend", d: 1,
    sit: "Your friend has the puck and somebody is bugging them.",
    why: "Skating close so your friend can pass to you is how you help.",
    tip: "Friend needs help? Skate to them.",
    scene: { ...base(),
      team: [{ id: "tm1", zone: "left-boards", hasPuck: true }, { id: "you1", zone: "right-boards", isYou: true }],
      opponents: [{ id: "op1", zone: "left-boards", offsetX: -4 }],
      puck: { zone: "left-boards" },
      question: {
        mode: "zone-click",
        prompt: "Click where you go to help your friend.",
        zones: {
          correct: ["high-slot","slot"],
          partial: ["left-faceoff"],
          wrong: ["behind-net","right-corner","right-boards","left-point","right-point","right-faceoff","net-front","left-corner","left-boards"],
        },
        feedback: {
          correct: "Nice! You're open for a pass.",
          partial: "Close to your friend — now you can help.",
          wrong: "Too far. Skate to somewhere your friend can pass to you.",
        },
      },
    },
  },
  {
    id: "u7rink7", cat: "Offensive Pressure", concept: "Best shooting spot", d: 1,
    sit: "The best place to score from is right in front of the net.",
    why: "Shots from close to the middle go in the most.",
    tip: "Middle = best shots.",
    scene: { ...base(),
      team: [{ id: "you1", zone: "high-slot", isYou: true }],
      puck: { zone: "high-slot" },
      question: {
        mode: "zone-click",
        prompt: "Click the best spot to shoot from.",
        zones: {
          correct: ["slot"],
          partial: ["net-front","high-slot"],
          wrong: ["behind-net","left-corner","right-corner","left-point","right-point","left-faceoff","right-faceoff","left-boards","right-boards"],
        },
        feedback: {
          correct: "Yes! The slot is the best shooting spot.",
          partial: "Good — any spot close to the middle works.",
          wrong: "Too far from the net for a great shot.",
        },
      },
    },
  },
  {
    id: "u7rink8", cat: "Offensive Pressure", concept: "After the shot", d: 1,
    sit: "You just took a shot.",
    why: "Always go to the net after you shoot — there might be a rebound!",
    tip: "Shot? Go to the net!",
    scene: { ...base(),
      team: [{ id: "you1", zone: "left-faceoff", hasPuck: true, isYou: true }],
      puck: { zone: "left-faceoff" },
      question: {
        mode: "choice",
        prompt: "What do you do right after you shoot?",
        options: [
          { text: "Skate to the front of the net", verdict: "correct", feedback: "Great! You might get a rebound." },
          { text: "Skate back to the bench", verdict: "wrong", feedback: "The play is still on! Go after the rebound." },
          { text: "Stop and watch", verdict: "wrong", feedback: "Never watch — always keep skating!" },
          { text: "Go behind the net", verdict: "wrong", feedback: "You can't score from behind the net. Go in front!" },
        ],
      },
    },
  },
  {
    id: "u7rink9", cat: "Offensive Pressure", concept: "Spread out", d: 1,
    sit: "Your friend is on the left side with the puck. You should be on the OTHER side so you're not bunched up.",
    why: "Two friends in the same spot makes it easy for the other team. Spread out!",
    tip: "Friend on one side? You on the other.",
    scene: { ...base(),
      team: [{ id: "tm1", zone: "left-corner", hasPuck: true }, { id: "you1", zone: "left-faceoff", isYou: true }],
      opponents: [{ id: "op1", zone: "left-corner", offsetX: 16 }],
      puck: { zone: "left-corner" },
      question: {
        mode: "zone-click",
        prompt: "Click the other side of the net so you're not bunched up.",
        zones: {
          correct: ["right-faceoff","right-boards","right-corner"],
          partial: ["slot"],
          wrong: ["left-faceoff","left-boards","left-corner","behind-net","net-front","high-slot","left-point","right-point"],
        },
        feedback: {
          correct: "Nice — you're spread out and open.",
          partial: "Middle works too, but the other side is even better.",
          wrong: "That's the same side as your friend. Go to the other side!",
        },
      },
    },
  },
  {
    id: "u7rink10", cat: "Offensive Pressure", concept: "Share the puck", d: 1,
    sit: "You have the puck. Your friend is wide open closer to the net.",
    why: "Pass to the friend in a better spot. That's smart hockey!",
    tip: "Friend closer to the net? Pass!",
    scene: { ...base(),
      team: [{ id: "you1", zone: "left-boards", hasPuck: true, isYou: true }, { id: "tm1", zone: "slot" }],
      opponents: [{ id: "op1", zone: "left-boards", offsetX: -6 }],
      puck: { zone: "left-boards" },
      question: {
        mode: "choice",
        prompt: "Your friend is wide open in front. What's the best play?",
        options: [
          { text: "Pass to your friend in front", verdict: "correct", feedback: "Perfect pass!" },
          { text: "Keep the puck and skate with it", verdict: "partial", feedback: "Your friend had a better shot — a pass is better." },
          { text: "Shoot from the boards", verdict: "wrong", feedback: "Too far from the net. Pass to your friend!" },
          { text: "Pass backwards", verdict: "wrong", feedback: "Pass FORWARD to help your team score." },
        ],
      },
    },
  },
  {
    id: "u7rink11", cat: "Offensive Pressure", concept: "Loose puck", d: 1,
    sit: "The puck is loose in the middle. Nobody has it.",
    why: "Skate as fast as you can to the puck to get it first!",
    tip: "Loose puck? Go fast!",
    scene: { ...base(),
      team: [{ id: "you1", zone: "high-slot", isYou: true }],
      opponents: [{ id: "op1", zone: "left-point" }],
      puck: { zone: "slot" },
      question: {
        mode: "zone-click",
        prompt: "Click where the puck is. Skate there!",
        zones: {
          correct: ["slot"],
          partial: ["net-front","high-slot"],
          wrong: ["behind-net","left-corner","right-corner","left-point","right-point","left-faceoff","right-faceoff","left-boards","right-boards"],
        },
        feedback: {
          correct: "Yes! Go get the puck.",
          partial: "Very close — skate to where the puck is.",
          wrong: "The puck is in the middle. Go there fast!",
        },
      },
    },
  },
  {
    id: "u7rink12", cat: "Offensive Pressure", concept: "Other side of the net", d: 1,
    sit: "Your friend is carrying the puck to the net.",
    why: "If you're on the other side of the net, the goalie has to watch both of you.",
    tip: "Friend on one side of the net? You on the other.",
    scene: { ...base(),
      team: [{ id: "tm1", zone: "right-faceoff", hasPuck: true }, { id: "you1", zone: "high-slot", isYou: true }],
      puck: { zone: "right-faceoff" },
      question: {
        mode: "zone-click",
        prompt: "Click where you go so the goalie has to watch both of you.",
        zones: {
          correct: ["left-faceoff","slot"],
          partial: ["net-front"],
          wrong: ["right-faceoff","right-boards","right-corner","behind-net","high-slot","left-corner","left-boards","left-point","right-point"],
        },
        feedback: {
          correct: "Perfect. Now the goalie has to watch both of you!",
          partial: "Good spot — in front of the net is also great.",
          wrong: "Go to the OTHER side of the net from your friend.",
        },
      },
    },
  },
  {
    id: "u7rink13", cat: "Effort", concept: "Get up fast", d: 1,
    sit: "You fell down. The puck is still moving.",
    why: "Get up quickly! Hockey doesn't stop because you fell.",
    tip: "Fell down? Get up fast!",
    scene: { ...base(),
      team: [{ id: "you1", zone: "slot", isYou: true }],
      puck: { zone: "right-corner" },
      question: {
        mode: "choice",
        prompt: "You just fell down. What do you do?",
        options: [
          { text: "Get up fast and keep playing", verdict: "correct", feedback: "That's a hockey player!" },
          { text: "Lie on the ice for a while", verdict: "wrong", feedback: "Get up fast! Your team needs you." },
          { text: "Skate to the bench", verdict: "wrong", feedback: "Only go to the bench when your coach says. Get up and keep playing!" },
          { text: "Cry", verdict: "wrong", feedback: "Tough kids get up and keep going. You've got this!" },
        ],
      },
    },
  },
  {
    id: "u7rink14", cat: "Offensive Pressure", concept: "Be a screen", d: 1,
    sit: "Your friend is shooting. You want to be in front of the goalie so they can't see.",
    why: "If you stand in front, the goalie can't see the shot coming. That's called a screen.",
    tip: "Stand between the goalie and the shot.",
    scene: { ...base(),
      team: [{ id: "tm1", zone: "left-point", hasPuck: true }, { id: "you1", zone: "high-slot", isYou: true }],
      puck: { zone: "left-point" },
      question: {
        mode: "zone-click",
        prompt: "Click where you stand so the goalie can't see the puck.",
        zones: {
          correct: ["slot","net-front"],
          partial: ["high-slot"],
          wrong: ["behind-net","left-corner","right-corner","left-point","right-point","left-faceoff","right-faceoff","left-boards","right-boards"],
        },
        feedback: {
          correct: "Perfect screen!",
          partial: "Close — stand a little closer to the goalie.",
          wrong: "You're not in front of the goalie. Get between them and the puck!",
        },
      },
    },
  },
  {
    id: "u7rink15", cat: "Defensive Zone", concept: "Goalie has the puck", d: 1,
    sit: "The goalie caught the puck.",
    why: "When the goalie has the puck, the whistle blows. Wait for the next faceoff.",
    tip: "Goalie catches? Wait for the whistle.",
    scene: { ...base(),
      team: [{ id: "you1", zone: "slot", isYou: true }],
      puck: { zone: "net-front" },
      question: {
        mode: "choice",
        prompt: "The goalie caught the puck. What do you do?",
        options: [
          { text: "Stop and wait for the whistle", verdict: "correct", feedback: "Yes! Great listening." },
          { text: "Try to hit the puck out of their glove", verdict: "wrong", feedback: "No touching the goalie. Stop and wait." },
          { text: "Skate really fast into the goalie", verdict: "wrong", feedback: "Never run into the goalie. Stop and wait!" },
          { text: "Yell at the goalie", verdict: "wrong", feedback: "Be respectful. Stop and wait for the next play." },
        ],
      },
    },
  },
  {
    id: "u7rink16", cat: "Offensive Pressure", concept: "Puck in corner", d: 1,
    sit: "The puck is in the corner. Nobody on your team is there yet.",
    why: "Somebody needs to get the puck! If you're close, that's you.",
    tip: "Puck in the corner? Go get it.",
    scene: { ...base(),
      team: [{ id: "you1", zone: "right-boards", isYou: true }, { id: "tm1", zone: "slot" }],
      puck: { zone: "right-corner" },
      question: {
        mode: "zone-click",
        prompt: "Click where you skate to get the puck.",
        zones: {
          correct: ["right-corner"],
          partial: ["right-boards"],
          wrong: ["slot","net-front","high-slot","left-corner","left-boards","behind-net","left-faceoff","right-faceoff","left-point","right-point"],
        },
        feedback: {
          correct: "Yes! Go get the puck.",
          partial: "Really close — the puck is in the corner.",
          wrong: "The puck is in the corner. GO to it!",
        },
      },
    },
  },
  {
    id: "u7rink17", cat: "Offensive Pressure", concept: "Too many opponents", d: 1,
    sit: "You have the puck but two opponents are right next to you.",
    why: "When two opponents are close, you should pass before they take the puck.",
    tip: "Two opponents? Pass quick!",
    scene: { ...base(),
      team: [{ id: "you1", zone: "slot", hasPuck: true, isYou: true }, { id: "tm1", zone: "right-faceoff" }],
      opponents: [{ id: "op1", zone: "slot", offsetX: -18 }, { id: "op2", zone: "high-slot" }],
      puck: { zone: "slot" },
      question: {
        mode: "choice",
        prompt: "Two opponents are right on you. What's best?",
        options: [
          { text: "Pass to your open friend", verdict: "correct", feedback: "Great pass under pressure!" },
          { text: "Keep the puck", verdict: "wrong", feedback: "Two opponents will take it! Pass first." },
          { text: "Shoot blind", verdict: "wrong", feedback: "A pass to your open friend is a much better play." },
          { text: "Stop and wait", verdict: "wrong", feedback: "Waiting gives the opponents the puck. Pass quick!" },
        ],
      },
    },
  },
  {
    id: "u7rink18", cat: "Offensive Pressure", concept: "Net-front power", d: 1,
    sit: "You want to be ready for any puck that comes near the net.",
    why: "The front of the net is where most goals happen. Be there!",
    tip: "Want to score? Be at the net.",
    scene: { ...base(),
      team: [{ id: "you1", zone: "high-slot", isYou: true }],
      puck: { zone: "left-corner" },
      question: {
        mode: "zone-click",
        prompt: "Click the most important spot to stand to score goals.",
        zones: {
          correct: ["net-front"],
          partial: ["slot"],
          wrong: ["high-slot","behind-net","left-corner","right-corner","left-point","right-point","left-faceoff","right-faceoff","left-boards","right-boards"],
        },
        feedback: {
          correct: "Yes! Right in front is where goals happen.",
          partial: "Great spot — very close.",
          wrong: "Too far from the net. Goals happen in FRONT!",
        },
      },
    },
  },
  {
    id: "u7rink19", cat: "Offensive Pressure", concept: "Keep head up", d: 1,
    sit: "You're skating with the puck. Somebody is coming toward you.",
    why: "Always look up when you skate with the puck. See what's happening around you!",
    tip: "Puck on your stick? Head UP.",
    scene: { ...base(),
      team: [{ id: "you1", zone: "high-slot", hasPuck: true, isYou: true }],
      opponents: [{ id: "op1", zone: "high-slot", offsetY: 30 }],
      puck: { zone: "high-slot" },
      question: {
        mode: "choice",
        prompt: "You're skating with the puck. What do you do?",
        options: [
          { text: "Keep your head UP to see everyone", verdict: "correct", feedback: "That's the #1 rule of hockey!" },
          { text: "Look down at the puck the whole time", verdict: "wrong", feedback: "Head up! You can feel the puck on your stick." },
          { text: "Close your eyes", verdict: "wrong", feedback: "Eyes open and head up — always!" },
          { text: "Look at the goalie only", verdict: "partial", feedback: "Look around! Everybody is moving." },
        ],
      },
    },
  },
  {
    id: "u7rink20", cat: "Defensive Zone", concept: "Help your team", d: 1,
    sit: "The other team is trying to score on your net. You need to help.",
    why: "When the other team has the puck in your end, skate back to help defend.",
    tip: "Other team attacking? Skate back to HELP.",
    scene: { ...base(),
      team: [{ id: "you1", zone: "slot", isYou: true }],
      opponents: [{ id: "op1", zone: "right-faceoff", hasPuck: false }, { id: "op2", zone: "net-front" }],
      puck: { zone: "right-faceoff" }, showHomePlate: true,
      question: {
        mode: "zone-click",
        prompt: "Click where you go to help defend your net.",
        zones: {
          correct: ["net-front","slot"],
          partial: ["high-slot"],
          wrong: ["behind-net","left-corner","right-corner","left-point","right-point","left-faceoff","right-faceoff","left-boards","right-boards"],
        },
        feedback: {
          correct: "Yes! Protect the front of your net.",
          partial: "Good — keep close to the net to defend.",
          wrong: "Too far away. Get close to the net to help!",
        },
      },
    },
  },
  {
    id: "u7rink21", cat: "Offensive Pressure", concept: "Skate hard", d: 1,
    sit: "The puck is far away from you but you're the closest on your team.",
    why: "Skate as fast as you can! Never let the other team get there first.",
    tip: "Be the fastest to the puck.",
    scene: { ...base(),
      team: [{ id: "you1", zone: "right-faceoff", isYou: true }],
      opponents: [{ id: "op1", zone: "high-slot" }],
      puck: { zone: "left-corner" },
      question: {
        mode: "choice",
        prompt: "The puck is far. What do you do?",
        options: [
          { text: "Skate as fast as I can to the puck", verdict: "correct", feedback: "That's hustle!" },
          { text: "Skate slowly there", verdict: "wrong", feedback: "Go fast — the other team is racing too!" },
          { text: "Wait for someone else", verdict: "wrong", feedback: "If you're closest, YOU go!" },
          { text: "Skate in a circle first", verdict: "wrong", feedback: "Straight to the puck — fast!" },
        ],
      },
    },
  },
  {
    id: "u7rink22", cat: "Offensive Pressure", concept: "Be ready for a pass", d: 1,
    sit: "Your friend has the puck. You want a pass. Where do you go?",
    why: "If you skate to the slot in front of the net, your friend can pass you the puck for a great shot.",
    tip: "Want a pass? Get in the slot.",
    scene: { ...base(),
      team: [{ id: "tm1", zone: "right-corner", hasPuck: true }, { id: "you1", zone: "right-boards", isYou: true }],
      opponents: [{ id: "op1", zone: "net-front" }],
      puck: { zone: "right-corner" },
      question: {
        mode: "zone-click",
        prompt: "Click where you go for a pass.",
        zones: {
          correct: ["slot"],
          partial: ["net-front","high-slot"],
          wrong: ["behind-net","left-corner","right-corner","left-point","right-point","right-faceoff","left-faceoff","left-boards","right-boards"],
        },
        feedback: {
          correct: "Perfect — right in front for a shot!",
          partial: "Great spot — also a good pass target.",
          wrong: "Too far from the net. Get closer so you can shoot!",
        },
      },
    },
  },
  {
    id: "u7rink23", cat: "Offensive Pressure", concept: "Shoot when open", d: 1,
    sit: "You have the puck and nobody is on top of you. The net is wide open.",
    why: "When you have a clean shot, TAKE IT. Don't wait for the other team to come!",
    tip: "Open shot? Shoot!",
    scene: { ...base(),
      team: [{ id: "you1", zone: "slot", hasPuck: true, isYou: true }],
      puck: { zone: "slot" },
      question: {
        mode: "choice",
        prompt: "You have an open shot. What do you do?",
        options: [
          { text: "Shoot right away!", verdict: "correct", feedback: "Yes! Take your chance." },
          { text: "Wait for a friend", verdict: "wrong", feedback: "Don't wait! Take the shot when it's there." },
          { text: "Skate backwards", verdict: "wrong", feedback: "You were in a great spot. Shoot!" },
          { text: "Look for the coach", verdict: "wrong", feedback: "Your coach wants you to SHOOT!" },
        ],
      },
    },
  },
  {
    id: "u7rink24", cat: "Offensive Pressure", concept: "Puck behind net", d: 1,
    sit: "Your teammate has the puck behind the net. You need to help.",
    why: "If you skate near the front or side of the net, your friend can pass to you for a shot.",
    tip: "Friend behind the net? You in front.",
    scene: { ...base(),
      team: [{ id: "tm1", zone: "behind-net", hasPuck: true }, { id: "you1", zone: "high-slot", isYou: true }],
      puck: { zone: "behind-net" },
      question: {
        mode: "zone-click",
        prompt: "Click where you go when your friend has the puck behind the net.",
        zones: {
          correct: ["slot","net-front"],
          partial: ["left-faceoff","right-faceoff"],
          wrong: ["behind-net","left-corner","right-corner","high-slot","left-point","right-point","left-boards","right-boards"],
        },
        feedback: {
          correct: "Nice — in front for a quick pass and shot.",
          partial: "Okay, but the slot right in front is the best.",
          wrong: "Too far! Get in front of the net.",
        },
      },
    },
  },
  {
    id: "u7rink25", cat: "Offensive Pressure", concept: "Nobody open", d: 1,
    sit: "Your friend has the puck but nobody on your team is open for a pass.",
    why: "If nobody is open, you have to SKATE to open ice so your friend has somewhere to pass.",
    tip: "Nobody open? YOU be open.",
    scene: { ...base(),
      team: [{ id: "tm1", zone: "left-corner", hasPuck: true }, { id: "you1", zone: "left-boards", isYou: true }],
      opponents: [{ id: "op1", zone: "left-corner", offsetX: 14 }, { id: "op2", zone: "left-boards", offsetX: -4 }, { id: "op3", zone: "slot" }],
      puck: { zone: "left-corner" },
      question: {
        mode: "choice",
        prompt: "Nobody is open for a pass. What do you do?",
        options: [
          { text: "Skate to open ice so your friend can pass to you", verdict: "correct", feedback: "Smart! Make yourself open." },
          { text: "Stand still", verdict: "wrong", feedback: "Standing still means nobody can pass to you. Move!" },
          { text: "Skate to your bench", verdict: "wrong", feedback: "The play is on! Stay out there and help." },
          { text: "Watch your friend", verdict: "wrong", feedback: "Don't watch — HELP! Skate to open ice." },
        ],
      },
    },
  },
  {
    id: "u7rink26", cat: "Offensive Pressure", concept: "Weak side", d: 1,
    sit: "Your friend is on the right side of the net. You're on the left. Stay on the left!",
    why: "If you both go to the same side, you're bunched up. Spread out!",
    tip: "Other team has LEFT? Go RIGHT.",
    scene: { ...base(),
      team: [{ id: "tm1", zone: "right-corner", hasPuck: true }, { id: "you1", zone: "left-boards", isYou: true }],
      puck: { zone: "right-corner" },
      question: {
        mode: "zone-click",
        prompt: "Click a good spot on YOUR side of the net.",
        zones: {
          correct: ["left-faceoff","slot"],
          partial: ["net-front","left-boards"],
          wrong: ["right-faceoff","right-boards","right-corner","behind-net","high-slot","left-corner","left-point","right-point"],
        },
        feedback: {
          correct: "Perfect — you're open and spread out.",
          partial: "Okay spot — a little more toward the middle is best.",
          wrong: "That's the same side as your friend. Go the OTHER way!",
        },
      },
    },
  },
  {
    id: "u7rink27", cat: "Effort", concept: "Don't swarm the puck", d: 1,
    sit: "Two friends are already chasing the same puck. Should you join them?",
    why: "If too many friends go after the same puck, nobody is open for a pass! Skate to open ice instead.",
    tip: "Friends got it? Stay open.",
    scene: { ...base(),
      team: [{ id: "tm1", zone: "left-corner" }, { id: "tm2", zone: "left-boards" }, { id: "you1", zone: "right-faceoff", isYou: true }],
      puck: { zone: "left-corner" },
      question: {
        mode: "choice",
        prompt: "Two friends are already chasing the puck. What do you do?",
        options: [
          { text: "Skate to open ice so you're ready for a pass", verdict: "correct", feedback: "Nice — don't bunch up!" },
          { text: "Join the crowd chasing the puck", verdict: "wrong", feedback: "Too many chasers! Stay open so your friend can pass to you." },
          { text: "Stand still", verdict: "wrong", feedback: "Keep moving! Find an open spot." },
          { text: "Skate behind the net", verdict: "partial", feedback: "Okay, but somewhere closer to the net would be better." },
        ],
      },
    },
  },
  {
    id: "u7rink28", cat: "Offensive Pressure", concept: "Closest = go", d: 1,
    sit: "You are the closest player to the puck. Nobody else on your team is near it.",
    why: "If you're closest to the puck, go get it! Don't wait for someone else.",
    tip: "Closest? GO.",
    scene: { ...base(),
      team: [{ id: "you1", zone: "right-boards", isYou: true }, { id: "tm1", zone: "high-slot" }],
      puck: { zone: "right-boards", offsetY: -10 },
      question: {
        mode: "zone-click",
        prompt: "Click where you skate.",
        zones: {
          correct: ["right-boards"],
          partial: ["right-corner","right-faceoff"],
          wrong: ["slot","net-front","high-slot","left-corner","left-boards","behind-net","left-faceoff","left-point","right-point"],
        },
        feedback: {
          correct: "Yes! Go get the puck.",
          partial: "Close — the puck is right on the boards.",
          wrong: "The puck is right next to you. GO!",
        },
      },
    },
  },
  {
    id: "u7rink29", cat: "Offensive Pressure", concept: "Your job without the puck", d: 1,
    sit: "Your friend has the puck. You don't.",
    why: "When you don't have the puck, your job is to skate to a spot where your friend can pass to you.",
    tip: "No puck? Be ready for one.",
    scene: { ...base(),
      team: [{ id: "tm1", zone: "left-faceoff", hasPuck: true }, { id: "you1", zone: "high-slot", offsetX: 20, isYou: true }],
      opponents: [{ id: "op1", zone: "left-faceoff", offsetX: 16 }],
      puck: { zone: "left-faceoff" },
      question: {
        mode: "choice",
        prompt: "Your friend has the puck. What's your job?",
        options: [
          { text: "Skate to a spot where they can pass to you", verdict: "correct", feedback: "Perfect — that's teamwork!" },
          { text: "Stand still and hope", verdict: "wrong", feedback: "Standing still means no pass comes to you. MOVE!" },
          { text: "Chase your friend to try to get the puck", verdict: "wrong", feedback: "Never chase your own teammate! Get open instead." },
          { text: "Skate to the goalie", verdict: "wrong", feedback: "Get to OPEN ice — not near the goalie." },
        ],
      },
    },
  },
  {
    id: "u7rink30", cat: "Offensive Pressure", concept: "Back to the net", d: 1,
    sit: "You just missed a pass. The puck is in the corner. Your team needs you back in the action.",
    why: "Don't give up when you miss a pass! Skate back to the play and help your team.",
    tip: "Missed a pass? Skate back to HELP.",
    scene: { ...base(),
      team: [{ id: "you1", zone: "left-point", isYou: true }, { id: "tm1", zone: "right-corner", hasPuck: true }],
      puck: { zone: "right-corner" },
      question: {
        mode: "zone-click",
        prompt: "Click where you skate to get back in the play.",
        zones: {
          correct: ["slot","high-slot"],
          partial: ["net-front","left-faceoff"],
          wrong: ["behind-net","left-corner","right-corner","right-boards","left-boards","right-point","left-point","right-faceoff"],
        },
        feedback: {
          correct: "Yes! Get back in the slot to help.",
          partial: "Good — get closer to the action.",
          wrong: "Get back in the middle where you can help your team!",
        },
      },
    },
  },
];

// ─── Apply to questions.json ────────────────────────────────────────────────

const LEVEL = "U7 / Initiation";
const raw = fs.readFileSync(qPath, "utf8");
const bank = JSON.parse(raw);

// Re-introduce the U7 / Initiation level if it was previously removed.
// Build a new bank object with U7 first so the JSON stays ordered by age.
let created = false;
if (!Array.isArray(bank[LEVEL])) {
  const reordered = { [LEVEL]: [] };
  for (const [k, v] of Object.entries(bank)) reordered[k] = v;
  Object.assign(bank, reordered);
  // Assign through same reference: replace contents
  for (const k of Object.keys(bank)) delete bank[k];
  Object.assign(bank, reordered);
  created = true;
  console.log(`created level "${LEVEL}"`);
}

let added = 0, skipped = 0;
for (const s of SCENARIOS) {
  if (bank[LEVEL].some(q => q.id === s.id)) {
    console.log(`skip  ${s.id}`);
    skipped++;
    continue;
  }
  // Default U7 defaults shared by every scenario
  bank[LEVEL].push({ pos: ["F"], type: "rink", ...s });
  console.log(`add   ${s.id}`);
  added++;
}

fs.writeFileSync(qPath, JSON.stringify(bank, null, 2) + "\n");
console.log(`\nDone. ${added} added, ${skipped} skipped${created ? ", U7 level created" : ""}.`);
