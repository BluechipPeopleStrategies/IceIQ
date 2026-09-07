// Pure helpers for the coach pre-review + resolve/pass-log loop.
// No Supabase, no Vite — node-testable. boardHash is the SAME hash the deck uses,
// so coach reviews can be matched to the board version they judged (stale detection).
import { boardHash } from "../../src/review/reviewCore.js";

// auditScenario result → a coach_reviews row. reviewed_at is left to the DB default.
export function coachRow({ seed, result, model }) {
  return {
    scenario_id: seed.id,
    verdict: String(result.verdict || "").toLowerCase(),
    confidence: result.confidence ?? null,
    notes: (result.notes || []).join(" · ") || null,
    convened: !!result.convened,
    board_hash: boardHash(seed),
    model: model || null,
  };
}

// Build the feedback_log rows to append for one resolved board: one per source
// (owner / coach) that actually had open feedback, all sharing one iteration.
export function buildLogRows({ scenario_id, node, change, priorMaxIteration, ownerReview, coachReview }) {
  const iteration = (priorMaxIteration || 0) + 1;
  const rows = [];
  const ownerFeedback = ownerReview && (ownerReview.note || ownerReview.verdict);
  if (ownerFeedback) rows.push({ scenario_id, node: node || null, iteration, source: "owner", feedback: ownerReview.note || ownerReview.verdict, change });
  if (coachReview && coachReview.notes) rows.push({ scenario_id, node: node || null, iteration, source: "coach", feedback: coachReview.notes, change });
  return rows;
}

// Group feedback_log rows by node (question type) for the markdown pass log.
export function groupByNode(rows) {
  const out = {};
  for (const r of rows || []) (out[r.node || "(unknown)"] ||= []).push(r);
  return out;
}
