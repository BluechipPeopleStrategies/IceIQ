// Per-category mastery computed from a player's quiz history.
// Stars:
//   0 ☆☆☆ — < 5 attempts in the category, OR <60% accuracy
//   1 ★☆☆ — ≥ 5 attempts and ≥75% accuracy
//   2 ★★☆ — ≥ 10 attempts and ≥80% accuracy
//   3 ★★★ — ≥ 20 attempts and ≥85% accuracy
//
// Thresholds are intentionally easier than the Journey unlocks — mastery
// is meant to feel reachable on multiple categories within a few sessions.

export function computeCategoryMastery(quizHistory) {
  const byCat = new Map(); // cat -> { attempts, correct }
  for (const session of quizHistory || []) {
    for (const r of (session.results || [])) {
      const cat = r.cat || "Uncategorized";
      const cur = byCat.get(cat) || { attempts: 0, correct: 0 };
      cur.attempts += 1;
      if (r.ok) cur.correct += 1;
      byCat.set(cat, cur);
    }
  }
  const out = {};
  for (const [cat, { attempts, correct }] of byCat) {
    const accuracy = attempts > 0 ? correct / attempts : 0;
    let stars = 0;
    if (attempts >= 20 && accuracy >= 0.85) stars = 3;
    else if (attempts >= 10 && accuracy >= 0.80) stars = 2;
    else if (attempts >= 5 && accuracy >= 0.75) stars = 1;
    out[cat] = { attempts, correct, accuracy, stars };
  }
  return out;
}

// Sort categories so the most "interesting" ones surface first: in-progress
// (1-2 stars) over both not-started and maxed; within each band, more
// attempts first. Maxed (3★) stay visible but at the bottom as trophies.
export function rankCategories(masteryMap) {
  const entries = Object.entries(masteryMap);
  return entries.sort(([, a], [, b]) => {
    const aActive = a.stars > 0 && a.stars < 3 ? 0 : a.stars === 3 ? 2 : 1;
    const bActive = b.stars > 0 && b.stars < 3 ? 0 : b.stars === 3 ? 2 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return b.attempts - a.attempts;
  });
}

// Next-threshold copy for a category — what does the player need to do to
// pop the next star? Returns { needAttempts, needAccuracy, target } or
// null if already maxed.
export function nextThreshold(stars, attempts, accuracy) {
  if (stars >= 3) return null;
  if (stars === 0 && attempts < 5) return { needAttempts: 5 - attempts, target: "1 star", needAccuracy: 0.75 };
  if (stars === 0) return { needAttempts: 0, target: "1 star", needAccuracy: 0.75 };
  if (stars === 1) return { needAttempts: Math.max(0, 10 - attempts), target: "2 stars", needAccuracy: 0.80 };
  if (stars === 2) return { needAttempts: Math.max(0, 20 - attempts), target: "3 stars", needAccuracy: 0.85 };
  return null;
}
