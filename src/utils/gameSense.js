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
// 64-LEVEL JOURNEY (8 worlds × 8 levels). Each world is a themed map
// with its own gradient, icon, and 8 level names that follow the theme
// narrative. Curve is easy-front / grind-back: clearing the first world
// takes ~8 quizzes, the last world pushes ~150 (FREE) / ~90 (PRO).
// ─────────────────────────────────────────────────────────
export const WORLD_THEMES = [
  { id:1, name:"Frozen Pond",          icon:"🧊", gradient:"linear-gradient(135deg,#7dd3fc,#1e3a8a)",   accent:"#60a5fa",
    desc:"Backyard ice. Where every player starts.",
    levelNames:["Lace-Up","First Stride","Open Ice","Snow Angel","Puck Drop","Blue Line Dash","Pond Hero","Pond Champ"] },
  { id:2, name:"Learn-to-Play Rink",   icon:"🏟️", gradient:"linear-gradient(135deg,#86efac,#14532d)",   accent:"#22c55e",
    desc:"The first real barn. Learn the whistle.",
    levelNames:["Cone Drill","Two-Touch","Find a Friend","Pass & Skate","Shoot on Net","Change on Fly","Whistle Stop","Scrimmage Star"] },
  { id:3, name:"Minor Hockey Arena",   icon:"🏒", gradient:"linear-gradient(135deg,#fbbf24,#78350f)",   accent:"#f59e0b",
    desc:"House league Saturdays. Team hockey begins.",
    levelNames:["Team Shift","Face-Off Win","Wall Support","Neutral Zone","Backcheck","Breakout Pass","Cycle Down","First Goal"] },
  { id:4, name:"City Tournament",      icon:"🏆", gradient:"linear-gradient(135deg,#fb923c,#7c2d12)",   accent:"#f97316",
    desc:"Hotel hockey. Back-to-backs. Medal weekend.",
    levelNames:["Bus Ride","Warm-Up Lap","First Shift","Between Periods","Hat Trick Hunt","Comeback Kid","OT Hero","Medal Moment"] },
  { id:5, name:"Regional Select",      icon:"⭐", gradient:"linear-gradient(135deg,#c084fc,#581c87)",   accent:"#a855f7",
    desc:"Tryout camps. Where the game speeds up.",
    levelNames:["Tryout Tape","Camp Mile","Wall of Selects","System Day","Power Play Run","PK Minute","Shutout Shift","Selection Day"] },
  { id:6, name:"Provincial Cup",       icon:"🥇", gradient:"linear-gradient(135deg,#60a5fa,#1e3a8a)",   accent:"#3b82f6",
    desc:"Best of the province. Everyone can play.",
    levelNames:["Road Game","Faster Ice","Bigger Bodies","Video Session","Special Teams","Battle Bracket","Semi-Final","Provincial Final"] },
  { id:7, name:"National Championship",icon:"🏅", gradient:"linear-gradient(135deg,#fb7185,#881337)",   accent:"#e11d48",
    desc:"Country's best. Every game is a test.",
    levelNames:["National Skate","Elite Camp","Weight Room","Film Room","Round Robin","Quarterfinal","Semi-Final","Gold Medal Game"] },
  { id:8, name:"The Show",             icon:"👑", gradient:"linear-gradient(135deg,#fde68a,#1f2937)",   accent:"#fbbf24",
    desc:"The top level. Captain the team through it.",
    levelNames:["Draft Day","Rookie Camp","Training Camp","Opening Night","Playoff Push","Division Final","Conference Final","Captain's Cup"] },
];

// Every activity the journey can require. Each world picks a subset — quizzes
// is the spine for all 64 levels, other metrics are per-world so the journey
// tours what the product actually offers (watching clips, logging training,
// setting goals, coach feedback, team homework).
export const ACTIVITY_METRICS = {
  quizzes:         { label:"Quizzes taken",        short:"quiz",     icon:"🧠" },
  training:        { label:"Off-ice sessions logged", short:"session", icon:"💪" },
  clipsWatched:    { label:"Game clips studied",   short:"clip",     icon:"📺" },
  insightsRead:    { label:"NHL Insights read",    short:"insight",  icon:"📰" },
  goalsSet:        { label:"SMART goals set",      short:"goal",     icon:"🎯" },
  skillsRated:     { label:"Skills self-rated",    short:"skill",    icon:"📊" },
  coachRated:      { label:"Coach rating on file", short:"coach rating", icon:"👨‍🏫", boolean:true },
  assignmentsDone: { label:"Coach homework done",  short:"homework", icon:"📋" },
};

// Per-world activity recipe. Worlds 1–4 keep things age-friendly (quizzes,
// watching, training, goals). Worlds 5+ tour the Pro/Team features (skills
// rating, coach feedback, insights, homework) so the back half of the journey
// shows off the full product.
export const WORLD_ACTIVITIES = [
  ["quizzes"],                                       // 1 Frozen Pond
  ["quizzes", "clipsWatched"],                       // 2 Learn-to-Play Rink
  ["quizzes", "training"],                           // 3 Minor Hockey Arena
  ["quizzes", "goalsSet"],                           // 4 City Tournament
  ["quizzes", "skillsRated", "coachRated"],          // 5 Regional Select
  ["quizzes", "insightsRead", "clipsWatched"],       // 6 Provincial Cup
  ["quizzes", "assignmentsDone", "training"],        // 7 National Championship
  ["quizzes", "coachRated", "training", "goalsSet"], // 8 The Show
];

// Build the full requirement object for a single level.
//   `globalIdx` 0..63 · `tier` "FREE" | "PRO" | "FAMILY" | "TEAM"
// quizzes follow a power curve (easy-front, grind-back). Secondary activities
// ramp gently within their home world (1,1,2,2,3,3,4,4) and scale 1.5× for
// FREE so the paid tiers feel faster. Boolean metrics (coach rating) only
// need a single completion.
function buildLevelRequirements(globalIdx, tier) {
  const worldIdx = Math.floor(globalIdx / 8);
  const levelInWorld = globalIdx % 8;
  const isFree = tier === "FREE";
  const maxQuizzes = isFree ? 150 : 90;
  const curve = isFree ? 1.6 : 1.55;
  // Quizzes — hand-tuned first world (1..8), power-curve thereafter.
  const quizzesRaw = globalIdx < 8
    ? globalIdx + 1
    : Math.round(Math.pow(globalIdx / 64, curve) * maxQuizzes);
  const quizzes = Math.max(globalIdx + 1, quizzesRaw);
  const req = { quizzes };
  const scale = isFree ? 1.5 : 1;
  for (const act of WORLD_ACTIVITIES[worldIdx]) {
    if (act === "quizzes") continue;
    if (ACTIVITY_METRICS[act]?.boolean) {
      req[act] = 1;
    } else {
      const base = Math.ceil((levelInWorld + 1) / 2); // 1,1,2,2,3,3,4,4
      req[act] = Math.max(1, Math.ceil(base * scale));
    }
  }
  return req;
}

export function levelRequirementsForTier(tier) {
  const out = [];
  for (let i = 0; i < 64; i++) out.push(buildLevelRequirements(i, tier));
  // Quiz threshold is monotonic by construction via Math.max(globalIdx+1, …),
  // but we re-run the monotonic fence to guard against curve tweaks.
  for (let i = 1; i < out.length; i++) {
    if (out[i].quizzes <= out[i-1].quizzes) out[i].quizzes = out[i-1].quizzes + 1;
  }
  return out;
}

// `state` is a bag of activity counts: { quizzes, training, clipsWatched,
// insightsRead, goalsSet, skillsRated, coachRated, assignmentsDone }. Caller
// assembles it from player state + LS + (optionally) coach feedback / team
// homework fetches. Missing keys are treated as 0.
export function getJourneyV2(state, tier) {
  const s = state || {};
  const reqs = levelRequirementsForTier(tier);
  const levels = reqs.map((req, i) => {
    const worldIdx = Math.floor(i / 8);
    const levelInWorld = i % 8;
    const world = WORLD_THEMES[worldIdx];
    const unmet = Object.entries(req).filter(([k, v]) => (s[k] || 0) < v).map(([k]) => k);
    return {
      idx: i,
      worldIdx,
      levelInWorld,
      name: world.levelNames[levelInWorld],
      worldName: world.name,
      worldIcon: world.icon,
      worldGradient: world.gradient,
      worldAccent: world.accent,
      requirements: req,
      unmet,
      unlocked: unmet.length === 0,
      // Legacy keys kept for old callers.
      quizzes: req.quizzes,
      training: req.training || 0,
    };
  });
  const nextIdx = levels.findIndex(l => !l.unlocked);
  const currentIdx = nextIdx === -1 ? levels.length - 1 : Math.max(0, nextIdx - 1);
  const currentWorldIdx = nextIdx === -1 ? 7 : Math.floor(nextIdx / 8);
  return {
    state: s,
    levels,
    nextIdx: nextIdx === -1 ? null : nextIdx,
    currentIdx,
    currentWorldIdx,
    worlds: WORLD_THEMES,
    tier: tier === "FREE" ? "FREE" : "PAID",
    // Legacy keys for code that read these directly.
    quizzes: s.quizzes || 0,
    training: s.training || 0,
  };
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
