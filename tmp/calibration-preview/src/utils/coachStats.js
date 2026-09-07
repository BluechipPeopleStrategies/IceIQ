// Client-side team aggregation for the Coach Dashboard.
// Reuses the per-player competency math from gameSense.js — see
// `calcCompetencyScores` for the single-player percentage calc.

import { calcCompetencyScores, COMPETENCIES } from "./gameSense.js";

// Below this percentage a player is considered "below grade level" on the
// weakest competency.
const GRADE_LEVEL_THRESHOLD = 60;

export function calcTeamCompetencyAverages(roster) {
  const keys = Object.keys(COMPETENCIES);
  const sums = Object.fromEntries(keys.map(k => [k, 0]));
  const counts = Object.fromEntries(keys.map(k => [k, 0]));

  let activePlayers = 0;
  const perPlayer = [];

  (roster || []).forEach(p => {
    // Supabase profiles store the column as snake_case `quiz_history`;
    // demo data uses camelCase `quizHistory`. Accept either.
    const hist = Array.isArray(p?.quizHistory) ? p.quizHistory
               : Array.isArray(p?.quiz_history) ? p.quiz_history
               : [];
    if (hist.length === 0) return;
    const scores = calcCompetencyScores(hist);
    activePlayers++;
    perPlayer.push({ id: p.id, name: p.name, scores });
    keys.forEach(k => {
      const v = scores[k];
      if (typeof v === "number" && v > 0) {
        sums[k] += v;
        counts[k]++;
      }
    });
  });

  const teamAverages = {};
  keys.forEach(k => {
    teamAverages[k] = counts[k] > 0 ? Math.round(sums[k] / counts[k]) : 0;
  });

  const populatedKeys = keys.filter(k => counts[k] > 0);
  if (activePlayers === 0 || populatedKeys.length === 0) {
    return {
      teamAverages,
      weakestKey: null,
      weakestPct: 0,
      playersBelowGrade: 0,
      activePlayers: 0,
      rosterSize: (roster || []).length,
    };
  }

  const weakestKey = populatedKeys.reduce(
    (min, k) => (teamAverages[k] < teamAverages[min] ? k : min),
    populatedKeys[0]
  );
  const weakestPct = teamAverages[weakestKey];
  const playersBelowGrade = perPlayer.filter(p => (p.scores[weakestKey] || 0) < GRADE_LEVEL_THRESHOLD).length;

  return {
    teamAverages,
    weakestKey,
    weakestPct,
    playersBelowGrade,
    activePlayers,
    rosterSize: (roster || []).length,
  };
}

export function calcTeamGameSenseScore(teamAverages) {
  const vals = Object.values(teamAverages || {}).filter(v => typeof v === "number" && v > 0);
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export { GRADE_LEVEL_THRESHOLD };
