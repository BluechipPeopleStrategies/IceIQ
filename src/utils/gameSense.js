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
  physicality: { name: "Physicality", icon: "💪", color: C.red },
  leadership: { name: "Leadership", icon: "👥", color: C.green },
};

export const COMPETENCY_MAPPINGS = {
  positioning: [
    /^u7q([1-3]|10)$/,
    /^u9q([1-4]|13)$/,
    /^u11q[1-7]$/,
    /^u13_zc_[1-2]$/,
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
      if (result.type === "mistake") {
        scores.physicality.total++;
        if (result.ok) scores.physicality.correct++;
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

// Gamification MVP: Positioning competency skill tree ("Journey")
export const POSITIONING_JOURNEY = [
  { id:"first-read",       title:"First Read",       icon:"📍", threshold:20, title_unlock:"Rookie Eyes",      desc:"You're starting to look up before you move." },
  { id:"zone-awareness",   title:"Zone Awareness",   icon:"🗺️", threshold:40, title_unlock:"Zone-Smart",       desc:"You know where you belong in each zone." },
  { id:"gap-control",      title:"Gap Control",      icon:"📏", threshold:60, title_unlock:"Gap Closer",       desc:"You keep the right distance on the rush." },
  { id:"structure-reader", title:"Structure Reader", icon:"🧠", threshold:80, title_unlock:"Structure Reader", desc:"You read team shape before the puck moves." },
  { id:"rink-general",     title:"Rink General",     icon:"👑", threshold:90, minAttempts:15, title_unlock:"Rink General", desc:"You think the game at the highest positioning level." },
];

export function getPositioningJourneyState(quizHistory) {
  const pcts = calcCompetencyScores(quizHistory || []);
  const pct = pcts.positioning || 0;
  const posPatterns = COMPETENCY_MAPPINGS.positioning;
  let attempts = 0;
  (quizHistory || []).forEach(session => {
    (session.results || []).forEach(r => {
      if (posPatterns.some(p => p.test(r.id))) attempts++;
    });
  });
  const nodes = POSITIONING_JOURNEY.map(n => ({
    ...n,
    unlocked: pct >= n.threshold && (!n.minAttempts || attempts >= n.minAttempts),
  }));
  const nextIdx = nodes.findIndex(n => !n.unlocked);
  return { pct, attempts, nodes, nextIdx: nextIdx === -1 ? null : nextIdx };
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
    return { mean: { positioning: 75, decision_making: 72, awareness: 68, tempo_control: 74, physicality: 80, leadership: 71 }, percentile: 50 };
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
