#!/usr/bin/env node
// Run: node src/utils/quizResults.test.mjs
import { upsertResult, skipResult, isSkipped, answeredCount, sessionQuestionCount, displayQuestionNumber, computeSpeedBonus, SPEED_DURATION_MS, SPEED_MAX_BONUS, SPEED_GRACE_MS } from "./quizResults.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const r = (id, extra = {}) => ({ id, cat: "c", ok: true, d: 2, type: "mc", ...extra });

// ---- upsertResult: one row per question, always -----------------------------
// `results` is divided by calcWeightedIQ(), the counter and the progress bar.
// Appending a second row for a question already answered is the 2026-08-02
// scoring bug; revisiting a skipped question must REPLACE, never append.
ok("appends a question not seen before", upsertResult([], r("q1")).length === 1);
ok("keeps distinct questions distinct", upsertResult([r("q1")], r("q2")).length === 2);
ok("revisiting the same id does NOT append", upsertResult([r("q1")], r("q1")).length === 1);
ok("revisiting REPLACES the old row", (() => {
  const out = upsertResult([r("q1", { ok: false })], r("q1", { ok: true }));
  return out.length === 1 && out[0].ok === true;
})());
ok("replacement keeps its position in the array", (() => {
  const out = upsertResult([r("a"), r("b", { ok: false }), r("c")], r("b", { ok: true }));
  return out.length === 3 && out[1].id === "b" && out[1].ok === true && out[2].id === "c";
})());
ok("a result with no id still appends rather than vanishing", upsertResult([r("q1")], { ...r(undefined) }).length === 2);

// ---- skipResult: wrong now, returnable later --------------------------------
// Thomas's call 2026-08-03: a skip counts WRONG so nobody farms a perfect score
// by skipping the hard ones, but the question stays available to come back to.
{
  const s = skipResult({ id: "q9", cat: "breakouts", d: 3, type: "scenario" });
  ok("a skip is recorded as incorrect", s.ok === false);
  ok("a skip is flagged so it can be re-offered", s.skipped === true);
  ok("a skip keeps the question's identity and metadata", s.id === "q9" && s.cat === "breakouts" && s.d === 3);
  ok("isSkipped recognises it", isSkipped(s) === true);
  ok("isSkipped is false for a normal wrong answer", isSkipped(r("q1", { ok: false })) === false);
}

// ---- coming back to a skipped question --------------------------------------
{
  let results = [r("q1"), skipResult({ id: "q2", cat: "c", d: 2, type: "mc" })];
  ok("the skip sits in results as a wrong row", results.length === 2 && results[1].ok === false);
  // Player returns and gets it right.
  results = upsertResult(results, r("q2", { ok: true }));
  ok("answering it later does not add a second row", results.length === 2);
  ok("answering it later flips it to correct", results[1].ok === true);
  ok("and it is no longer flagged as skipped", isSkipped(results[1]) === false);
}

// ---- answeredCount: what the counter should show ----------------------------
// A skipped question is recorded but not yet ANSWERED, so a progress counter
// that treats it as done would tell the player they are further along than
// they are while the question is still waiting for them.
{
  const results = [r("q1"), skipResult({ id: "q2", cat: "c", d: 2, type: "mc" }), r("q3")];
  ok("answeredCount excludes still-skipped questions", answeredCount(results) === 2);
  ok("answeredCount counts a revisited question once answered",
    answeredCount(upsertResult(results, r("q2", { ok: false }))) === 3);
  ok("answeredCount on an empty session is 0", answeredCount([]) === 0);
}

// ---- sessionQuestionCount: the length must not move mid-session -------------
// 2026-08-03 playtest (SHELL-1). Derived live, finishing the first session
// flips firstTime and re-lengthens the session under the player.
{
  ok("a first session is 5", sessionQuestionCount({ firstTime: true, sessionLength: 10 }) === 5);
  ok("a returning session uses the player's setting",
    sessionQuestionCount({ firstTime: false, sessionLength: 15 }) === 15);
  ok("a returning session with no setting falls back to 10",
    sessionQuestionCount({ firstTime: false }) === 10);
  ok("demo is 7", sessionQuestionCount({ isDemo: true, firstTime: true }) === 7);
  ok("?ids= beats every cap", sessionQuestionCount({ idsLen: 3, isDemo: true, firstTime: true }) === 3);
  ok("defaults to 10 with no arguments at all", sessionQuestionCount() === 10);

  // The regression itself: snapshot at start, then the player's history grows.
  const atStart = sessionQuestionCount({ firstTime: true, sessionLength: 10 });
  const ifRederivedAfterCompletion = sessionQuestionCount({ firstTime: false, sessionLength: 10 });
  ok("re-deriving after completion WOULD change the length (why it is snapshot)",
    atStart === 5 && ifRederivedAfterCompletion === 10);
}

// ---- displayQuestionNumber: never reads past the end ------------------------
// 2026-08-03 playtest (SHELL-2). answeredCount is clamped to qLen, so a bare
// +1 renders "Question 6 of 5" on the last question of every session.
{
  ok("a fresh session shows question 1", displayQuestionNumber(0, 5) === 1);
  ok("mid-session counts up", displayQuestionNumber(2, 5) === 3);
  ok("the last question shows 5 of 5, not 6 of 5", displayQuestionNumber(4, 5) === 5);
  ok("having answered all 5 still shows 5 of 5", displayQuestionNumber(5, 5) === 5);
  ok("an overrun past the length is still clamped", displayQuestionNumber(9, 5) === 5);
  ok("a 1-question session shows 1 of 1", displayQuestionNumber(1, 1) === 1);
  ok("garbage input degrades to 1 rather than NaN", displayQuestionNumber(undefined, undefined) === 1);
}

// ---- the two together, played out over a full first session -----------------
// Walks the exact path from the 2026-08-03 recording: 5 questions, finish,
// history written. The header must read "5 of 5" at the end and stay there.
{
  const qLen = sessionQuestionCount({ firstTime: true, sessionLength: 10 }); // snapshot
  let results = [];
  const shown = [];
  for (let i = 1; i <= 5; i++) {
    shown.push(displayQuestionNumber(Math.min(answeredCount(results), qLen), qLen));
    results = upsertResult(results, r(`q${i}`));
  }
  ok("the header counts 1,2,3,4,5 and never 6", shown.join(",") === "1,2,3,4,5");
  const afterFinish = displayQuestionNumber(Math.min(answeredCount(results), qLen), qLen);
  ok("after the final answer it holds at 5 of 5", afterFinish === 5 && qLen === 5);
  ok("the session is over", answeredCount(results) >= qLen);
}

// ---- the counter must track questions PRESENTED, not ANSWERED ---------------
// 2026-08-03 playtest (SHELL-8). Thomas: "it looked like it moved it to question
// five of five before I could even advance it." Scenario point/selection
// primitives auto-submit on the tap, so answeredCount() moves while the player
// is still reading the feedback for the question they are looking at. The number
// must hold across the answer and only step on advance.
{
  const qLen = 5;
  const shownAnswered = [];   // the defect: fed answeredCount()
  const shownPresented = [];  // the fix: fed a presented counter
  let results = [];
  let presented = 0;          // questions presented BEFORE the one on screen
  for (let i = 1; i <= qLen; i++) {
    // On screen, before answering.
    shownAnswered.push(displayQuestionNumber(Math.min(answeredCount(results), qLen), qLen));
    shownPresented.push(displayQuestionNumber(presented, qLen));
    // Player answers — auto-submitted, still reading the feedback.
    results = upsertResult(results, r(`q${i}`));
    shownAnswered.push(displayQuestionNumber(Math.min(answeredCount(results), qLen), qLen));
    shownPresented.push(displayQuestionNumber(presented, qLen));
    // Player taps Next.
    presented++;
  }
  ok("the number holds across the answer: 1,1,2,2,3,3,4,4,5,5",
    shownPresented.join(",") === "1,1,2,2,3,3,4,4,5,5");
  ok("it never skips ahead while feedback is still on screen",
    !shownPresented.join(",").startsWith("1,2,2,3"));
  ok("the old answered-fed counter DID jump early (why the input changed)",
    shownAnswered.join(",") === "1,2,2,3,3,4,4,5,5,5");
  ok("presented and answered still finish in the same place",
    shownPresented[shownPresented.length - 1] === qLen && answeredCount(results) === qLen);
  ok("a session with more advances than questions is still clamped",
    displayQuestionNumber(12, qLen) === qLen);
}

// ---- computeSpeedBonus: the reading grace -----------------------------------
// 2026-08-03 playtest (SHELL-7). questionStartedAt is stamped when the question
// RENDERS, so the bonus used to start decaying before a nine-year-old had looked
// at the play. Every seeded scenario is type:"scenario", so this was every
// placement/point/selection question in the game.
{
  const t0 = 1_000_000;
  const at = (ms) => computeSpeedBonus("scenario", true, t0, t0 + ms);

  ok("a wrong answer never earns a bonus", computeSpeedBonus("scenario", false, t0, t0) === 0);
  ok("a non-speed type never earns a bonus", computeSpeedBonus("mc", true, t0, t0) === 0);

  ok("the grace is a real, non-zero head start", SPEED_GRACE_MS > 0);
  ok("full bonus the instant the question appears", at(0) === SPEED_MAX_BONUS);
  ok("still full bonus mid-grace", at(SPEED_GRACE_MS / 2) === SPEED_MAX_BONUS);
  ok("still full bonus at the very end of the grace", at(SPEED_GRACE_MS - 1) === SPEED_MAX_BONUS);
  ok("decay starts only once the grace elapses", at(SPEED_GRACE_MS) === SPEED_MAX_BONUS);
  ok("and it HAS started decaying just after", at(SPEED_GRACE_MS + 1000) < SPEED_MAX_BONUS);

  ok("halfway through the window pays about half",
    at(SPEED_GRACE_MS + SPEED_DURATION_MS / 2) === Math.floor(SPEED_MAX_BONUS / 2));
  ok("the window closes at grace + duration", at(SPEED_GRACE_MS + SPEED_DURATION_MS) === 0);
  ok("and stays closed after", at(SPEED_GRACE_MS + SPEED_DURATION_MS + 60000) === 0);
  ok("a bonus is never negative", at(999999) >= 0);

  // The regression itself: without the grace, a player who spent the grace
  // reading was already down points before their first tap.
  const withoutGrace = Math.floor(((SPEED_DURATION_MS - SPEED_GRACE_MS) / SPEED_DURATION_MS) * SPEED_MAX_BONUS);
  ok("reading time used to cost points and now does not",
    withoutGrace < SPEED_MAX_BONUS && at(SPEED_GRACE_MS) === SPEED_MAX_BONUS);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
