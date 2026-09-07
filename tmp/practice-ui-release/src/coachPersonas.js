export const CAT_TO_TILT = {
  "Orientation":    "h",
  "Compete":        "p",
  "Game Awareness": "h",
  "Teamwork":       null,
  "Scoring":        "s",
  "Defense":        "d",
  "Positioning":    "dm",
  "Coachability":   "c",
  // Level-specific + canonical categories. Post-2026-04-24 consolidation
  // merged several variants (Decision Making/Decision Timing → Decision-Making,
  // Breakout/Breakout Execution/Exiting the Zone → Breakouts, Goalie →
  // Goaltending, Transition Game → Transition, Support → Puck Support).
  "Decision-Making":   "dm",
  "Breakouts":         "h",
  "Rush Reads":        "h",
  "Zone Entry":        "h",
  "Special Teams":     null,
  "Shot Selection":    "s",
  "Defensive Zone":    "d",
  "Coverage":          "d",
  "Puck Protection":   "p",
  "Puck Support":      "dm",
  "Blue Line Decisions":"dm",
  "Blue Line Reads":   "h",
  "Systems Play":      null,
  "Transition":        "h",
  "Gap Control":       "d",
  "Physical Play":     "p",
  "Leadership":        "c",
  "Game Management":   "h",
  "Advanced Tactics":  "dm",
  "Neutral Zone Play": "h",
  "Goaltending":       "d",
  "Finishing":         "s",
  "Vision":            "h",
  "Zone Awareness":    "h",
};

// Age-tier key used to pick how silly / how dry the coach's voice gets.
//   young = U7/U9 (silly, wholesome, parent-winks)
//   mid   = U11/U13 (dry one-liners kids + parents both catch)
//   older = U15/U18 (sports-talk-radio sarcasm; still PG)
export function getAgeTier(level) {
  if (!level) return "mid";
  if (/U(5|7|9)/.test(level) || /Initiation|Timbits|Novice/i.test(level)) return "young";
  if (/U(15|18)/.test(level) || /Bantam|Midget/i.test(level)) return "older";
  return "mid";
}

// Coach personas. Three voices, sprinkled across every age group. Each
// coach carries its own age-tiered flavor pools so the short zinger above
// the teaching tip matches the player's age without losing the persona.
export const COACH_PERSONAS = [
  {
    id: "kincaid",
    name: "Coach Kincaid",
    role: "Head Coach",
    archetype: "technical",
    imageUrl: "/assets/coaches/kincaid.png",
    tilts: ["dm", "h"],
    summary: "Sees every detail on tape and loves a teaching moment — plays hard, coaches harder, brings the one-liners.",
    // Tight 1–2 word lines per coach. The teaching content is the question's
    // q.tip, not the flavor; flavor is just the coach's reaction.
    flavorCorrect: {
      young: ["Yes.", "Right.", "Smart.", "Sharp.", "Good.", "Yep.", "Locked in.", "Hockey brain.", "There it is.", "Acceptable.", "Fine — I'll allow it."],
      mid:   ["Yes.", "Right.", "Smart.", "Sharp.", "Clinic.", "Locked in.", "Crisp.", "Acceptable.", "Hockey brain.", "There it is.", "Fine — I noticed."],
      older: ["Correct.", "Sharp.", "Crisp.", "Clinic.", "Locked in.", "Surgical.", "Scout-report stuff.", "No notes.", "Acceptable."],
    },
    flavorIncorrect: {
      young: ["No.", "Reset.", "Read it.", "Try again.", "Slow it down.", "Look up.", "Brain back on.", "Whiteboard."],
      mid:   ["No.", "Reset.", "Read it.", "Try again.", "Tighten up.", "Watch the tape.", "Wrong call.", "Slow it down."],
      older: ["No.", "Reset.", "Tighten up.", "Watch the tape.", "Wrong call.", "Read it.", "Whiteboard."],
    },
  },
  {
    id: "danno",
    name: "Coach Danno",
    role: "Skills Coach",
    archetype: "chill",
    imageUrl: "/assets/coaches/danno.png",
    tilts: ["s", "p"],
    summary: "Low-key, high-reps, never loses the room. Gets players to relax, skate through mistakes, and stack clean shifts.",
    flavorCorrect: {
      young: ["Nice, bud.", "Yes!", "Beauty.", "Love it.", "Smooth.", "There it is.", "Yeah, bud.", "Easy.", "Sweet.", "Heck yeah.", "Money.", "Slick.", "Big read.", "Locked in."],
      mid:   ["Nice read.", "Beauty.", "Love it.", "Smooth.", "There it is.", "Locked in.", "Big read.", "Easy.", "Slick.", "Pro habit."],
      older: ["Beauty.", "Smooth.", "Love it.", "Locked in.", "Pro habit.", "Veteran move.", "Honest hockey.", "Quiet confidence.", "Nothing flashy."],
    },
    flavorIncorrect: {
      young: ["All good, bud.", "Shake it.", "Next one.", "Reset.", "Close.", "Almost.", "No worries.", "Easy fix.", "Keep skating."],
      mid:   ["Shake it.", "Reset.", "Close.", "Next shift.", "Easy adjust.", "Small fix.", "Keep going."],
      older: ["Reset.", "Shake it.", "Wash it.", "Next shift.", "Small miss.", "Easy fix."],
    },
  },
  {
    id: "marques",
    name: "Coach Marques",
    role: "Development Coach",
    archetype: "generalist",
    imageUrl: "/assets/coaches/marques.png",
    tilts: [],
    summary: "Positive, practical, and comfortable coaching the whole game. Connects tactical reads to the next playable adjustment.",
    flavorCorrect: {
      young: ["YES!", "BOOM!", "LET'S GO!", "BIG read!", "MONEY!", "FIRE!", "Locked in!", "SUPERSTAR.", "On FIRE!", "Champion."],
      mid:   ["YESSIR.", "BIG TIME.", "ELITE.", "Locked.", "MONEY.", "Championship.", "Built for this.", "BIG read.", "Sending it."],
      older: ["Elite.", "Pro-level.", "Locked in.", "Championship.", "World-class.", "BIG moment.", "Scouting-reel.", "Quietly elite."],
    },
    flavorIncorrect: {
      young: ["Reset.", "Next one.", "Believe.", "Champion.", "Shake it.", "Growth.", "I believe.", "Try again.", "You got this."],
      mid:   ["Reset.", "Next rep.", "Growth moment.", "Trust it.", "Believe.", "Shake it.", "Long game."],
      older: ["Reset.", "Move.", "Own it.", "Short memory.", "Decide.", "Metabolize.", "Use it."],
    },
  },
  {
    id: "kowalski",
    name: "Coach Kowalski",
    role: "Assistant Coach",
    archetype: "deadpan",
    imageUrl: "/assets/coaches/kowalski.png",
    tilts: ["d"],
    summary: "Old-school, dry as chalk, speaks about six words per shift — but the ones that land, land hard. Has literally seen it all.",
    flavorCorrect: {
      young: ["Mm.", "Sure.", "Yep.", "Acceptable.", "Allowed.", "Decent.", "Correct.", "Fine.", "Hm.", "Solid."],
      mid:   ["Mm.", "Sure.", "Correct.", "Acceptable.", "Solid.", "Functional.", "Serviceable.", "Hm."],
      older: ["Mm.", "Quietly good.", "Solid.", "Veteran.", "Correct.", "No notes.", "Textbook."],
    },
    flavorIncorrect: {
      young: ["No.", "Hm.", "Reset.", "Try again.", "Mm-mm.", "Not it.", "Move on.", "Whatever."],
      mid:   ["No.", "Hm.", "Reset.", "Wrong.", "Try again.", "Filed."],
      older: ["No.", "Hm.", "Reset.", "Filed.", "Move on.", "Noted.", "Delete."],
    },
  },
];

// All three personas show up at every age group — user wants them sprinkled
// everywhere, not siloed by level. `goalie` overrides kept so goalies at
// older ages see a specialized coach assignment in the roster view.
const DEMO_ROSTERS = {
  "U7 / Initiation": { all: ["kincaid", "danno", "marques", "kowalski"] },
  "U9 / Novice":     { all: ["kincaid", "danno", "marques", "kowalski"] },
  "U11 / Atom":      { all: ["kincaid", "danno", "marques", "kowalski"] },
  "U13 / Peewee":    { all: ["kincaid", "danno", "marques", "kowalski"] },
  "U15 / Bantam":    { all: ["kincaid", "danno", "marques", "kowalski"] },
  "U18 / Midget":    { all: ["kincaid", "danno", "marques", "kowalski"] },
};
export function getDemoCoachRoster(level, position) {
  const r = DEMO_ROSTERS[level] || DEMO_ROSTERS["U9 / Novice"];
  const ids = (position === "Goalie" && r.goalie) ? r.goalie : r.all;
  return ids.map(id => COACH_PERSONAS.find(p => p.id === id)).filter(Boolean);
}

export function getCoachForQuestion(question, playerLevel, playerPosition) {
  const tilt = question?.cat ? CAT_TO_TILT[question.cat] : null;
  const roster = getDemoCoachRoster(playerLevel, playerPosition) || COACH_PERSONAS;
  if (tilt) {
    const match = roster.find(c => c.tilts?.includes(tilt));
    if (match) return match;
  }
  // No category tilt → rotate across the full 3-persona roster so every
  // coach gets air time. Deterministic by question id so the same question
  // always gets the same voice.
  if (roster.length) {
    const seed = (question?.id || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return roster[seed % roster.length];
  }
  return COACH_PERSONAS[0];
}

export function coachReaction(coach, correct, level, reactionIndex = 0) {
  const tier = getAgeTier(level);
  const pool = (correct ? coach?.flavorCorrect : coach?.flavorIncorrect)?.[tier] || [];
  return pool.length ? pool[Math.abs(reactionIndex) % pool.length] : (correct ? "Correct." : "Reset.");
}
