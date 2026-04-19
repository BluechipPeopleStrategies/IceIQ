import { getCoachScale } from "../data/constants.js";

const PARENT_VALUE_TO_PCT = { growing: 33, steady: 67, thriving: 100 };

const TRAINING_VOLUME_TARGETS = {
  power_skating: 300,
  skills_dev: 300,
  pucks_shot: 1500,
  other: 300,
};

const TRAINING_FREQUENCY_TARGET = 8;
const JOURNEY_ATTEMPTS_TARGET = 15;

export const PROFILE_AXES = {
  technical: { name: "Technical Foundation", icon: "🛠️", color: "#3b82f6" },
  compete:   { name: "Compete & Character", icon: "🔥", color: "#ef4444" },
  habits:    { name: "Habits & Preparation", icon: "⏰", color: "#eab308" },
};

function coachAvgByDomain(ratings, domains, scale) {
  if (!ratings || !scale?.length) return null;
  const targets = Array.isArray(domains) ? domains : [domains];
  const values = [];
  for (const [skillId, value] of Object.entries(ratings)) {
    const m = skillId?.match(/^u\d+([a-z]+)\d+$/);
    const d = m ? m[1] : null;
    if (!d || !targets.includes(d)) continue;
    const idx = scale.findIndex(o => o.value === value);
    if (idx >= 0) values.push((idx / (scale.length - 1)) * 100);
  }
  if (!values.length) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function parentAvgByDims(ratings, dims) {
  if (!ratings) return null;
  const values = dims
    .map(d => PARENT_VALUE_TO_PCT[ratings[d]])
    .filter(v => typeof v === "number");
  if (!values.length) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function trainingVolume30d(sessions, types) {
  if (!sessions?.length) return null;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const perType = types.map(type => {
    const total = sessions
      .filter(s => s.type === type && s.date >= cutoffStr)
      .reduce((n, s) => n + (Number(s.value) || 0), 0);
    const target = TRAINING_VOLUME_TARGETS[type] || 300;
    return Math.min(total / target, 1) * 100;
  });
  const seenAny = sessions.some(s => types.includes(s.type) && s.date >= cutoffStr);
  if (!seenAny) return null;
  return Math.round(perType.reduce((a, b) => a + b, 0) / perType.length);
}

function trainingFrequency30d(sessions) {
  if (!sessions?.length) return null;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const recent = sessions.filter(s => s.date >= cutoffStr);
  if (!recent.length) return null;
  return Math.round(Math.min(recent.length / TRAINING_FREQUENCY_TARGET, 1) * 100);
}

function weightedAvg(parts) {
  const valid = parts.filter(p => p.value !== null && p.value !== undefined);
  if (!valid.length) return null;
  const totalWeight = valid.reduce((a, p) => a + p.weight, 0);
  if (totalWeight === 0) return null;
  const sum = valid.reduce((a, p) => a + p.value * p.weight, 0);
  return Math.round(sum / totalWeight);
}

export function calcPlayerProfile(player, { coachRatings, trainingSessions, parentRatings, journeyAttempts = 0 } = {}) {
  const scale = getCoachScale(player?.level);
  const sessions = trainingSessions || [];

  const techCoach    = coachAvgByDomain(coachRatings, ["s", "p", "d"], scale);
  const techTraining = trainingVolume30d(sessions, ["power_skating", "skills_dev", "pucks_shot"]);

  const competeParent  = parentAvgByDims(parentRatings, ["passion", "effort", "adversity", "coachability", "sportsmanship", "confidence"]);
  const competeCoach   = coachAvgByDomain(coachRatings, ["c"], scale);
  const competeJourney = journeyAttempts > 0
    ? Math.round(Math.min(journeyAttempts / JOURNEY_ATTEMPTS_TARGET, 1) * 100)
    : null;

  const habitsParent   = parentAvgByDims(parentRatings, ["readiness", "balance"]);
  const habitsTraining = trainingFrequency30d(sessions);

  const technical = weightedAvg([
    { value: techCoach,    weight: 0.6 },
    { value: techTraining, weight: 0.4 },
  ]);
  const compete = weightedAvg([
    { value: competeParent,  weight: 0.6 },
    { value: competeCoach,   weight: 0.3 },
    { value: competeJourney, weight: 0.1 },
  ]);
  const habits = weightedAvg([
    { value: habitsParent,   weight: 0.5 },
    { value: habitsTraining, weight: 0.5 },
  ]);

  return {
    technical,
    compete,
    habits,
    sources: {
      technical: { coach: techCoach, training: techTraining },
      compete:   { parent: competeParent, coach: competeCoach, journey: competeJourney },
      habits:    { parent: habitsParent, training: habitsTraining },
    },
  };
}
