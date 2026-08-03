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

/**
 * How many questions this session is.
 *
 * Must be SNAPSHOT at session start, never re-derived per render. `firstTime`
 * reads player.quizHistory.length, and handleQuizComplete writes that history
 * BEFORE setScreen("results") resolves (it sits behind an awaited Supabase
 * write). Derived live, the first session therefore recomputes 5 -> 10 the
 * instant the player finishes it: `isLast` goes false, the quiz keeps serving
 * questions, and "Finish & See Results" silently becomes question 6 of 10.
 * That is the 2026-08-03 playtest defect (SHELL-1).
 *
 * `idsLen` wins outright — the dashboard's "Play this set" plays exactly the
 * set it was handed, uncapped by the demo or first-time lengths.
 */
export function sessionQuestionCount({ idsLen = 0, isDemo = false, firstTime = false, sessionLength = 0 } = {}) {
  if (idsLen > 0) return idsLen;
  if (isDemo) return 7;
  if (firstTime) return 5;
  return sessionLength || 10;
}

/**
 * The 1-based question number to display, e.g. the 5 in "Question 5 of 5".
 *
 * `answeredCount` is already clamped to the session length, so adding one to it
 * for display renders "Question 6 of 5" on every completed session. The
 * 2026-08-02 fix put the clamp inside the count and left the +1 outside it,
 * which is why the overrun came back on 2026-08-03 (SHELL-2). Clamping here
 * keeps both halves in one place.
 */
export function displayQuestionNumber(answered, qLen) {
  const total = Number(qLen) > 0 ? Number(qLen) : 1;
  const n = Number(answered) > 0 ? Number(answered) : 0;
  return Math.min(n + 1, total);
}
