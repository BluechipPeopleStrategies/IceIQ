// Quiz result bookkeeping.
//
// `results` is the single array behind the question counter, the progress bar,
// the "N/M correct" line AND calcWeightedIQ(). Every one of those divides by its
// length, so how rows get added to it is a scoring decision, not bookkeeping.
// Appending a second row for a question the player already met is exactly the
// defect that shipped on 2026-08-02 ("Question 6 of 5", with real players'
// percentages depressed by every multi-step question they encountered).
//
// These helpers exist so that logic is testable in isolation rather than inline
// in an 8,000-line component.

/**
 * Add a result, replacing any existing row for the same question.
 *
 * Replacement keeps the original position so the session's order is stable —
 * a player who skips question 2, answers 3 and 4, then comes back to 2 should
 * still see it as question 2 in any review, not appended at the end.
 *
 * A result with no id cannot be matched against anything, so it appends. That
 * is deliberate: dropping it would silently lose an answer, which is worse than
 * an extra row.
 */
export function upsertResult(results, next) {
  const list = Array.isArray(results) ? results : [];
  if (!next || next.id === undefined || next.id === null) return [...list, next];
  const i = list.findIndex((r) => r && r.id === next.id);
  if (i === -1) return [...list, next];
  const out = list.slice();
  out[i] = next;
  return out;
}

/**
 * The result recorded when a player skips.
 *
 * Counts WRONG immediately (Thomas, 2026-08-03) so skipping is never a free
 * pass — otherwise a player farms a perfect score by skipping anything hard.
 * The `skipped` flag is what lets the question be re-offered, and it is dropped
 * the moment a real answer replaces this row via upsertResult.
 */
export function skipResult(q) {
  return {
    id: q?.id,
    cat: q?.cat,
    ok: false,
    d: q?.d || 2,
    type: q?.type,
    skipped: true,
    speedBonus: 0,
  };
}

/** True while a question is skipped and still waiting to be come back to. */
export function isSkipped(result) {
  return !!(result && result.skipped === true);
}

/**
 * How many questions the player has actually ANSWERED.
 *
 * Distinct from results.length, which includes questions that are skipped and
 * still outstanding. A counter built on the raw length tells a player they are
 * further through the session than they are, while the question is still
 * queued for them.
 */
export function answeredCount(results) {
  return (Array.isArray(results) ? results : []).filter((r) => r && !isSkipped(r)).length;
}
