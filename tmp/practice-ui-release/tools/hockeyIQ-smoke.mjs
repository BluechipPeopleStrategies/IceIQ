// Hockey IQ smoke test — generates fake question_results in-memory and
// runs computeHockeyIQ against several player profiles. No Supabase,
// no DB writes; just verifies the math behaves before we wire UI.
//
//   node tools/hockeyIQ-smoke.mjs

import { computeHockeyIQ, MIN_REPS } from "../src/utils/hockeyIQ.js";

const DAY = 86400000;
const NOW = new Date("2026-04-25T18:00:00Z");

function generate({ days, repsPerDay, accuracy, avgDifficulty, avgTimeMs }) {
  const out = [];
  for (let d = days - 1; d >= 0; d--) {
    for (let i = 0; i < repsPerDay; i++) {
      const ts = NOW.getTime() - d * DAY - i * 60000;
      const correct = Math.random() < accuracy;
      const difficulty = Math.max(1, Math.min(3, Math.round(avgDifficulty + (Math.random() - 0.5))));
      const time_taken_ms = Math.max(1500, Math.round(avgTimeMs + (Math.random() - 0.5) * 4000));
      out.push({
        correct, difficulty, time_taken_ms,
        zone: ["dz", "oz", "nz"][i % 3],
        skill: ["Positioning", "Tempo", "Decision-Making"][i % 3],
        answered_at: new Date(ts).toISOString(),
      });
    }
  }
  return out;
}

function row(label, results) {
  const r = computeHockeyIQ(results, NOW);
  console.log(
    label.padEnd(28),
    `score=${String(r.score).padStart(4)}`,
    `status=${r.status.padEnd(11)}`,
    `reps=${String(r.reps).padStart(3)}`,
    `ewma=${r.ewma === null ? " null" : r.ewma.toFixed(2)}`,
    `trend=${r.trend === null ? "  - " : (r.trend >= 0 ? "+" : "") + r.trend}`,
    `best=${r.bestWindow ?? " -"}`,
  );
}

console.log(`MIN_REPS=${MIN_REPS}, asOf=${NOW.toISOString()}\n`);

row("brand-new (3 reps total)",
  generate({ days: 3, repsPerDay: 1, accuracy: 0.7, avgDifficulty: 2, avgTimeMs: 7000 }));

row("just past cold-start",
  generate({ days: 5, repsPerDay: 4, accuracy: 0.7, avgDifficulty: 2, avgTimeMs: 7000 }));

row("median player (70% d2)",
  generate({ days: 30, repsPerDay: 3, accuracy: 0.7, avgDifficulty: 2, avgTimeMs: 8000 }));

row("strong player (85% d2.5)",
  generate({ days: 30, repsPerDay: 3, accuracy: 0.85, avgDifficulty: 2.5, avgTimeMs: 6000 }));

row("elite (95% d3 fast)",
  generate({ days: 30, repsPerDay: 4, accuracy: 0.95, avgDifficulty: 3, avgTimeMs: 4500 }));

row("weak player (45% d1.5)",
  generate({ days: 30, repsPerDay: 3, accuracy: 0.45, avgDifficulty: 1.5, avgTimeMs: 10000 }));

row("improving (50%→85%)", (() => {
  const old = generate({ days: 30, repsPerDay: 3, accuracy: 0.5, avgDifficulty: 2, avgTimeMs: 9000 })
    .filter(r => (NOW - new Date(r.answered_at)) > 14 * DAY);
  const recent = generate({ days: 14, repsPerDay: 4, accuracy: 0.85, avgDifficulty: 2, avgTimeMs: 6500 });
  return [...old, ...recent];
})());
