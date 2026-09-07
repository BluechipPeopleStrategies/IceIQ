// Hockey IQ Score — rolling 60-140 score per player, IQ-style.
//
// One number per answered question (`raw`), then exponentially-weighted
// moving average across the trailing 30 days with a 7-day half-life.
// EWMA is mapped to 60-140 by z-score against a hardcoded reference
// distribution (see calibration note below).
//
// Per-rep raw:
//   correctness = correct ? difficulty : -0.5 * difficulty
//   time_factor = clip(EXPECTED_TIME_MS / time_taken_ms, 0.7, 1.3)
//                 (defaults to 1.0 when time_taken_ms is missing)
//   raw         = correctness * time_factor
//
// Cold-start: fewer than MIN_REPS in the 30-day window returns
// { score: null, status: "calibrating", reps }. UI should render a
// placeholder, not a fake number.

export const HALF_LIFE_DAYS = 7;
export const WINDOW_DAYS = 30;
export const MIN_REPS = 15;

export const EXPECTED_TIME_MS = 8000;
export const TIME_FACTOR_FLOOR = 0.7;
export const TIME_FACTOR_CEIL = 1.3;

// Calibration: hardcoded reference mean/sd of EWMA-raw across a
// "median player" distribution. Derived from a 70%-correct player on
// d=2 with neutral timing (raw ≈ 1.1) and ±1 SD bands at 50% and 85%
// correct. Recalibrate once we have real production data.
export const REFERENCE_MEAN = 1.1;
export const REFERENCE_SD = 0.5;

export function rawScore({ correct, difficulty, time_taken_ms }) {
  const d = Number(difficulty) || 1;
  const correctness = correct ? d : -0.5 * d;
  let timeFactor = 1.0;
  if (Number.isFinite(time_taken_ms) && time_taken_ms > 0) {
    timeFactor = Math.min(
      TIME_FACTOR_CEIL,
      Math.max(TIME_FACTOR_FLOOR, EXPECTED_TIME_MS / time_taken_ms),
    );
  }
  return correctness * timeFactor;
}

// Trailing-30-day EWMA evaluated at `asOf`. `results` rows must have
// `answered_at` (ISO string or Date) and the fields rawScore needs.
// Half-life 7d → decay = ln(2)/7.
export function ewmaAt(results, asOf = new Date()) {
  const asOfMs = (asOf instanceof Date ? asOf : new Date(asOf)).getTime();
  const cutoff = asOfMs - WINDOW_DAYS * 86400000;
  const decayPerDay = Math.LN2 / HALF_LIFE_DAYS;
  let num = 0, den = 0, reps = 0;
  for (const r of results) {
    const t = new Date(r.answered_at).getTime();
    if (!Number.isFinite(t) || t < cutoff || t > asOfMs) continue;
    const ageDays = (asOfMs - t) / 86400000;
    const w = Math.exp(-decayPerDay * ageDays);
    num += w * rawScore(r);
    den += w;
    reps += 1;
  }
  if (!den) return { ewma: null, reps: 0 };
  return { ewma: num / den, reps };
}

export function ewmaToScore(ewma) {
  if (ewma === null || ewma === undefined) return null;
  const z = (ewma - REFERENCE_MEAN) / REFERENCE_SD;
  return Math.max(60, Math.min(140, Math.round(100 + 15 * z)));
}

// Pure calculator used by both the live hook and offline tooling.
// Returns { score, status, reps, ewma, trend, bestWindow }.
//   trend       — score(asOf) - score(asOf - 30d), null if either side is calibrating
//   bestWindow  — highest daily score across the last 30 days, null if calibrating
export function computeHockeyIQ(results, asOf = new Date()) {
  const today = ewmaAt(results, asOf);
  const score = today.reps >= MIN_REPS ? ewmaToScore(today.ewma) : null;
  const status = score === null ? "calibrating" : "ready";

  let trend = null;
  if (score !== null) {
    const past = ewmaAt(results, new Date(asOf.getTime() - WINDOW_DAYS * 86400000));
    if (past.reps >= MIN_REPS) {
      trend = score - ewmaToScore(past.ewma);
    }
  }

  let bestWindow = null;
  if (score !== null) {
    let best = -Infinity;
    for (let d = 0; d < WINDOW_DAYS; d++) {
      const sample = ewmaAt(results, new Date(asOf.getTime() - d * 86400000));
      if (sample.reps < MIN_REPS) continue;
      const s = ewmaToScore(sample.ewma);
      if (s > best) best = s;
    }
    bestWindow = best === -Infinity ? null : best;
  }

  return { score, status, reps: today.reps, ewma: today.ewma, trend, bestWindow };
}
