export const PARENT_SCALE = [
  { value: "rarely",    label: "Rarely",    color: "#facc15" },
  { value: "sometimes", label: "Sometimes", color: "#22c55e" },
  { value: "often",     label: "Often",     color: "#a855f7" },
];

// Legacy values from the pre-v2 scale. getParentRatings migrates on read.
const LEGACY_TO_NEW = { growing: "rarely", steady: "sometimes", thriving: "often" };
function migrateRatings(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const out = { ...raw };
  for (const k of Object.keys(out)) {
    if (LEGACY_TO_NEW[out[k]]) out[k] = LEGACY_TO_NEW[out[k]];
  }
  return out;
}

export const PARENT_DIMENSIONS = [
  { id: "passion", icon: "❤️", label: "Love of the game", prompts: {
    "U9 / Novice":"Does your child look forward to practices and games?",
    "U11 / Atom":"Does your child talk about hockey outside the rink — watching games, asking questions?",
    "U13 / Peewee":"Is hockey something your child genuinely enjoys, not just something they do?",
    "U15 / Bantam":"Does your child still light up about hockey after years of playing?",
    "U18 / Midget":"Is hockey still a source of joy — or has it become a job?",
  }},
  { id: "readiness", icon: "🎒", label: "Pre-game readiness", prompts: {
    "U9 / Novice":"Does your child prepare their gear and snacks with reminders?",
    "U11 / Atom":"Does your child own most of their pre-game prep (gear, snacks, water)?",
    "U13 / Peewee":"Does your child handle their own pre-game routine most days?",
    "U15 / Bantam":"Does your child take ownership of nutrition, sleep, and gear prep?",
    "U18 / Midget":"Does your child own their pre-game prep (nutrition, sleep, recovery)?",
  }},
  { id: "effort", icon: "💪", label: "Effort mindset", prompts: {
    "U9 / Novice":"Does your child give effort in practice, not just games?",
    "U11 / Atom":"Does your child push themselves in drills, even boring ones?",
    "U13 / Peewee":"Does your child work hard when the coach isn't looking?",
    "U15 / Bantam":"Does your child push past comfortable when it gets hard?",
    "U18 / Midget":"Does your child push at 100% when no one's watching?",
  }},
  { id: "adversity", icon: "🛡️", label: "Handling adversity", prompts: {
    "U9 / Novice":"Does your child bounce back after losses or bad shifts?",
    "U11 / Atom":"Does your child recover from mistakes without melting down?",
    "U13 / Peewee":"Does your child handle benchings, losses, or rough shifts maturely?",
    "U15 / Bantam":"Does your child respond to adversity with effort, not excuses?",
    "U18 / Midget":"Does your child respond to adversity — a bad game, benching, tough loss — with maturity?",
  }},
  { id: "sportsmanship", icon: "🤝", label: "Sportsmanship", prompts: {
    "U9 / Novice":"Does your child treat teammates and opponents with respect?",
    "U11 / Atom":"Does your child stay composed with refs and opponents, win or lose?",
    "U13 / Peewee":"Does your child represent the team well on and off the ice?",
    "U15 / Bantam":"Does your child respect teammates, refs, and opponents, even in tough moments?",
    "U18 / Midget":"Does your child respect teammates, refs, and opponents, even when it's hard?",
  }},
  { id: "confidence", icon: "✨", label: "Confidence", prompts: {
    "U9 / Novice":"Does your child show up to games ready, or nervous?",
    "U11 / Atom":"Does your child play with belief in themselves?",
    "U13 / Peewee":"Does your child trust their game without needing constant reassurance?",
    "U15 / Bantam":"Does your child back themselves in pressure moments?",
    "U18 / Midget":"Does your child trust their game under pressure?",
  }},
  { id: "coachability", icon: "🎧", label: "Coachability", prompts: {
    "U9 / Novice":"Does your child try to do what the coach asks?",
    "U11 / Atom":"Does your child apply coaching notes from practice to practice?",
    "U13 / Peewee":"Does your child take coaching feedback seriously, even when it's critical?",
    "U15 / Bantam":"Does your child apply feedback, not just hear it?",
    "U18 / Midget":"Does your child apply coaching feedback, even when they disagree?",
  }},
  { id: "balance", icon: "⚖️", label: "Life balance", prompts: {
    "U9 / Novice":"Is hockey balanced with school, other activities, and downtime?",
    "U11 / Atom":"Is your child managing hockey without burning out on school or friends?",
    "U13 / Peewee":"Is hockey balanced with school, sleep, and rest?",
    "U15 / Bantam":"Is hockey sustainable alongside school pressure and teen life?",
    "U18 / Midget":"Is hockey balanced with school, sleep, friends, and rest?",
  }},
];

const KEY = "rinkreads_parent_assessment";

export function getParentRatings(playerId) {
  if (!playerId) return null;
  try {
    const raw = localStorage.getItem(KEY);
    const all = raw ? JSON.parse(raw) : {};
    return migrateRatings(all[playerId] || null);
  } catch { return null; }
}

export function saveParentRatings(playerId, ratings) {
  if (!playerId) return;
  try {
    const raw = localStorage.getItem(KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[playerId] = { ...ratings, updated_at: new Date().toISOString().slice(0, 10) };
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export function hasParentRatings(ratings) {
  if (!ratings) return false;
  const { updated_at, ...rest } = ratings;
  return Object.values(rest).some(v => v);
}

export function daysSinceUpdated(ratings) {
  if (!ratings?.updated_at) return null;
  const then = new Date(ratings.updated_at).getTime();
  const now = Date.now();
  return Math.floor((now - then) / 86400000);
}
