import { supabase, hasSupabase } from "../supabase";
import { C } from "../shared.jsx";

// ─────────────────────────────────────────────────────────
// GAME SENSE COMPETENCIES
// ─────────────────────────────────────────────────────────
export const COMPETENCIES = {
  positioning: { name: "Positioning", icon: "📍", color: C.blue },
  decision_making: { name: "Decision-Making", icon: "⚡", color: C.purple },
  awareness: { name: "Awareness", icon: "👁", color: C.cyan },
  tempo_control: { name: "Tempo Control", icon: "⏱", color: C.orange },
  leadership: { name: "Leadership", icon: "👥", color: C.green },
};

export const COMPETENCY_MAPPINGS = {
  positioning: [
    /^u7q([1-3]|10)$/,
    /^u9q([1-4]|13)$/,
    /^u11q[1-7]$/,
    /^u13q[1-5]$/,
    /^u15q[1-4]$/,
    /^u18q[1-3]$/,
  ],
  decision_making: [
    /^u7q[4-6]$/,
    /^u9q([5-8]|14)$/,
    /^u11q([8-9]|1[0-5])$/,
    /^u13q(1[0]|[1-9])$/,
    /^u15q[5-8]$/,
    /^u18q[4-6]$/,
  ],
  awareness: [
    /^u7q([7-9]|15)$/,
    /^u9q([9-9]|1[0-2]|15)$/,
    /^u11q16$/,
    /^u13q(1[1-9]|20)$/,
    /^u15q[1-8]$/,
    /^u18q[7-9]$/,
  ],
  tempo_control: [
    /^u15q([9]|1[0-6])$/,
    /^u18q[1-8]$/,
    /^u\d+tempo\d+$/,
  ],
  leadership: [
    /^u\d+lead\d+$/,
  ],
};

export function getQuestionCompetency(questionId) {
  if (!questionId) return null;
  for (const [competency, patterns] of Object.entries(COMPETENCY_MAPPINGS)) {
    if (patterns.some(pattern => pattern.test(questionId))) {
      return competency;
    }
  }
  return null;
}

export function calcCompetencyScores(quizHistory) {
  const scores = {};
  for (const key of Object.keys(COMPETENCIES)) {
    scores[key] = { correct: 0, total: 0 };
  }

  quizHistory.forEach(session => {
    session.results?.forEach(result => {
      const comp = getQuestionCompetency(result.id);
      if (comp) {
        scores[comp].total++;
        if (result.ok) scores[comp].correct++;
      }
      if (result.type === "next") {
        scores.leadership.total++;
        if (result.ok) scores.leadership.correct++;
      }
    });
  });

  const percentages = {};
  for (const key of Object.keys(COMPETENCIES)) {
    const { correct, total } = scores[key];
    percentages[key] = total > 0 ? Math.round((correct / total) * 100) : 0;
  }
  return percentages;
}

export function calcGameSenseScore(competencyScores) {
  const scores = Object.values(competencyScores);
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
}

// ─────────────────────────────────────────────────────────
// ICE IQ JOURNEY — rink-path progression.
// Shared 8 stations, shared activity thresholds, age-specific labels.
// Unlocks are activity-based (quizzes taken + training sessions logged)
// rather than correctness-%, so a kid who shows up every week but still
// works at 55% accuracy continues to progress.
// ─────────────────────────────────────────────────────────
// Paid tiers (PRO, TEAM) — the baseline. Comfortable cadence for a player
// who quizzes a few times a week and logs training sporadically.
export const ICE_IQ_THRESHOLDS = [
  { id:"showed-up",       quizzes:1,  training:0  },
  { id:"face-off",        quizzes:3,  training:1  },
  { id:"blue-line",       quizzes:8,  training:2  },
  { id:"find-slot",       quizzes:18, training:4  },
  { id:"back-check",      quizzes:30, training:7  },
  { id:"pressure-puck",   quizzes:45, training:12 },
  { id:"read-rush",       quizzes:65, training:18 },
  { id:"captain-c",       quizzes:90, training:25 },
];

// FREE tier — same 8 stations, but ~1.7–2× the workload. FREE is capped at
// 3 quizzes/week, so "captain-c" at 150 quizzes is reachable in ~50 weeks
// of disciplined play. Stations 2–3 stay close to paid so new users still
// see early wins; the later stations diverge sharply to make PRO worth it.
export const ICE_IQ_THRESHOLDS_FREE = [
  { id:"showed-up",       quizzes:1,   training:0  },
  { id:"face-off",        quizzes:5,   training:2  },
  { id:"blue-line",       quizzes:14,  training:4  },
  { id:"find-slot",       quizzes:30,  training:8  },
  { id:"back-check",      quizzes:50,  training:14 },
  { id:"pressure-puck",   quizzes:80,  training:22 },
  { id:"read-rush",       quizzes:115, training:32 },
  { id:"captain-c",       quizzes:150, training:45 },
];

export function thresholdsForTier(tier) {
  return tier === "FREE" ? ICE_IQ_THRESHOLDS_FREE : ICE_IQ_THRESHOLDS;
}

// FREE-path station names — gamey, Mario-world-map style. One shared set
// across age groups because the FREE path is framed as a grind mode rather
// than an age-bespoke narrative. Paid tiers keep the age-specific labels.
export const ICE_IQ_JOURNEY_LABELS_FREE_MAP = {
  "showed-up":     { title:"Frozen Pond",      icon:"🧊", desc:"Lace up. Your first quiz opens the map." },
  "face-off":      { title:"Home Rink",        icon:"🏟️", desc:"You know the barn. Now learn the whistle." },
  "blue-line":     { title:"Blue Line Bridge", icon:"🌉", desc:"Cross the first line with the puck on your stick." },
  "find-slot":     { title:"Neutral Zone",     icon:"🗺️", desc:"No-man's-land. Pick your route." },
  "back-check":    { title:"Forecheck Forest", icon:"🌲", desc:"Hunt the puck through traffic." },
  "pressure-puck": { title:"Slot Summit",      icon:"⛰️", desc:"The high-danger peak. Plant your flag." },
  "read-rush":     { title:"Rush Ridge",       icon:"🏔️", desc:"Read the attack before it crests." },
  "captain-c":     { title:"Captain's Castle", icon:"🏰", desc:"Boss map. The team plays through you." },
};

export const ICE_IQ_JOURNEY_LABELS = {
  "U7 / Initiation": {
    "showed-up":     { title:"You showed up",      icon:"🏒", desc:"Your first quiz is on the board." },
    "face-off":      { title:"Know your side",     icon:"🟢", desc:"You know which end is yours." },
    "blue-line":     { title:"Chase smart",        icon:"🎯", desc:"You skate toward the puck on purpose." },
    "find-slot":     { title:"Pass to a friend",   icon:"🤝", desc:"You look up before you shoot." },
    "back-check":    { title:"Find the net",       icon:"🥅", desc:"You know where you're trying to go." },
    "pressure-puck": { title:"Help on D",          icon:"🛡️", desc:"You come back when your team needs help." },
    "read-rush":     { title:"Skate back",         icon:"↩️", desc:"You hustle back every shift." },
    "captain-c":     { title:"Little coach",       icon:"⭐", desc:"Teammates follow where you go." },
  },
  "U9 / Novice": {
    "showed-up":     { title:"You showed up",      icon:"🏒", desc:"Every journey starts with one quiz." },
    "face-off":      { title:"Face-off ready",     icon:"⚪", desc:"You know where you start." },
    "blue-line":     { title:"Stay on your wing",  icon:"🟦", desc:"You hold your side of the ice." },
    "find-slot":     { title:"Pass to open ice",   icon:"🎯", desc:"You look up before you pass." },
    "back-check":    { title:"Crash the net",      icon:"🥅", desc:"You get to the scoring area." },
    "pressure-puck": { title:"Back-check brain",   icon:"🛡️", desc:"You come back hard every shift." },
    "read-rush":     { title:"Read the rush",      icon:"👀", desc:"You see 2-on-1s before they happen." },
    "captain-c":     { title:"Captain's C",        icon:"🅒", desc:"You anchor the team." },
  },
  "U11 / Atom": {
    "showed-up":     { title:"Rookie reps",        icon:"🏒", desc:"Reps are on the board." },
    "face-off":      { title:"Blue-line reader",   icon:"🟦", desc:"You read zone entries." },
    "blue-line":     { title:"Support the puck",   icon:"🤝", desc:"You're an option, not a spectator." },
    "find-slot":     { title:"Find the slot",      icon:"🎯", desc:"You know where goals come from." },
    "back-check":    { title:"Angle + pin",        icon:"🛡️", desc:"You take away time and space." },
    "pressure-puck": { title:"Pressure the puck",  icon:"⚡", desc:"Your forecheck creates turnovers." },
    "read-rush":     { title:"Read before receive",icon:"👁️", desc:"You know what you'll do before the puck arrives." },
    "captain-c":     { title:"Rink General",       icon:"👑", desc:"You read team shape before the puck moves." },
  },
  "U13 / Peewee": {
    "showed-up":     { title:"Showing up",         icon:"🏒", desc:"On the board." },
    "face-off":      { title:"Zone entry options", icon:"🟦", desc:"You carry, chip, or dump with intent." },
    "blue-line":     { title:"NZ regroup",         icon:"🔄", desc:"You reset when the entry isn't there." },
    "find-slot":     { title:"High-danger reads",  icon:"🎯", desc:"You know which ice creates goals." },
    "back-check":    { title:"Gap control",        icon:"📏", desc:"You keep the right distance on the rush." },
    "pressure-puck": { title:"Tempo change-ups",   icon:"⏱️", desc:"You vary speed to open time and space." },
    "read-rush":     { title:"Two steps ahead",    icon:"👁️", desc:"You anticipate the reset, not just the shot." },
    "captain-c":     { title:"Team engine",        icon:"⚙️", desc:"The team moves because you moved first." },
  },
  "U15 / Bantam": {
    "showed-up":     { title:"Checked in",         icon:"🏒", desc:"Reps logged." },
    "face-off":      { title:"Breakout options",   icon:"🟦", desc:"You read the forecheck before receiving." },
    "blue-line":     { title:"Pre-scan reception", icon:"👀", desc:"You scan before the puck arrives." },
    "find-slot":     { title:"Slot priority",      icon:"🎯", desc:"You protect and attack the slot." },
    "back-check":    { title:"Stick-on-puck",      icon:"🛡️", desc:"Your stick takes away plays, not bodies." },
    "pressure-puck": { title:"Transition triggers",icon:"⚡", desc:"You turn defense into offense in one touch." },
    "read-rush":     { title:"Anticipate reset",   icon:"👁️", desc:"You read where the puck's going next, not where it is." },
    "captain-c":     { title:"Systems anchor",     icon:"⚙️", desc:"The system runs through you." },
  },
  "U18 / Midget": {
    "showed-up":     { title:"Locked in",          icon:"🏒", desc:"First reps recorded." },
    "face-off":      { title:"Pre-scan every touch",icon:"👀", desc:"Your head is up before the puck arrives." },
    "blue-line":     { title:"Manage the puck",    icon:"🟦", desc:"You make the right play, not the pretty one." },
    "find-slot":     { title:"High-% plays",       icon:"🎯", desc:"You pick the percentage, not the highlight." },
    "back-check":    { title:"Defensive posture", icon:"🛡️", desc:"You're always between the puck and your net." },
    "pressure-puck": { title:"Tempo manipulation",icon:"⏱️", desc:"You control pace — yours and theirs." },
    "read-rush":     { title:"Pre-game reads",    icon:"📋", desc:"You prepare for what the other team does." },
    "captain-c":     { title:"Team captain",      icon:"🅒", desc:"The team plays at your standard." },
  },
};

export function getIceIQJourneyState(quizHistory, trainingSessions, level, tier) {
  const quizzes = Array.isArray(quizHistory) ? quizHistory.length : 0;
  const training = Array.isArray(trainingSessions) ? trainingSessions.length : 0;
  const labels = tier === "FREE"
    ? ICE_IQ_JOURNEY_LABELS_FREE_MAP
    : (ICE_IQ_JOURNEY_LABELS[level] || ICE_IQ_JOURNEY_LABELS["U9 / Novice"]);
  const thresholds = thresholdsForTier(tier);
  const stations = thresholds.map((t, i) => ({
    ...t,
    ...(labels[t.id] || {}),
    unlocked: quizzes >= t.quizzes && training >= t.training,
    index: i,
  }));
  const nextIdx = stations.findIndex(s => !s.unlocked);
  return { quizzes, training, stations, nextIdx: nextIdx === -1 ? null : nextIdx, tier: tier === "FREE" ? "FREE" : "PAID" };
}

// Legacy name — keep so existing callsites don't explode during HMR. Shape
// mapped to the new station list. Delete after all callsites migrate.
export const POSITIONING_JOURNEY = ICE_IQ_THRESHOLDS;
export function getPositioningJourneyState(quizHistory, trainingSessions, level) {
  const s = getIceIQJourneyState(quizHistory, trainingSessions, level);
  // Old-shape compatibility: expose `pct` + `attempts` + `nodes` keys.
  const nodes = s.stations.map(st => ({
    id: st.id, title: st.title, icon: st.icon, desc: st.desc,
    threshold: 0, minAttempts: st.quizzes,
    unlocked: st.unlocked,
  }));
  return { pct: 0, attempts: s.quizzes, nodes, nextIdx: s.nextIdx, quizzes: s.quizzes, training: s.training, stations: s.stations };
}

export function getMonthlyTrend(quizHistory) {
  const now = new Date();
  const weeks = [];
  for (let i = 3; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(start.getDate() - i * 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const weekSessions = quizHistory.filter(s => {
      const d = new Date(s.date);
      return d >= start && d < end;
    });
    const scores = weekSessions.map(s => {
      const comps = calcCompetencyScores([s]);
      return calcGameSenseScore(comps);
    });
    weeks.push({
      label: `${start.getDate()}/${start.getMonth() + 1}`,
      score: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0,
    });
  }
  return weeks;
}

export async function getPeerStats(level, position) {
  if (!hasSupabase) {
    return { mean: { positioning: 75, decision_making: 72, awareness: 68, tempo_control: 74, leadership: 71 }, percentile: 50 };
  }
  try {
    const { data: players, error } = await supabase
      .from("profiles")
      .select("quiz_history")
      .eq("level", level)
      .eq("position", position);

    if (error || !players) return null;

    const allScores = {};
    for (const key of Object.keys(COMPETENCIES)) {
      allScores[key] = [];
    }

    players.forEach(p => {
      if (p.quiz_history && Array.isArray(p.quiz_history)) {
        const scores = calcCompetencyScores(p.quiz_history);
        Object.entries(scores).forEach(([key, score]) => {
          allScores[key].push(score);
        });
      }
    });

    const mean = {};
    const stdev = {};
    for (const key of Object.keys(COMPETENCIES)) {
      const arr = allScores[key];
      if (arr.length > 0) {
        mean[key] = Math.round(arr.reduce((a, b) => a + b) / arr.length);
        const variance = arr.reduce((sum, x) => sum + Math.pow(x - mean[key], 2), 0) / arr.length;
        stdev[key] = Math.sqrt(variance);
      }
    }

    return { mean, stdev };
  } catch (e) {
    return null;
  }
}

export function calcPercentileRank(playerScore, peerMean, peerStdev) {
  if (!peerStdev || peerStdev === 0) return 50;
  const z = (playerScore - peerMean) / peerStdev;
  const p = 1 / (1 + Math.exp(-z * 1.81));
  return Math.round(p * 100);
}

export const GAME_SENSE_UNLOCK_SESSIONS = 3;
