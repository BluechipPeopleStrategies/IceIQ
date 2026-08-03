#!/usr/bin/env node
// Run: node src/cognitive-gym/readNumbersPoints.test.mjs
//
// Pins the Read the Numbers scoring curve.
//
// Thomas, 2026-08-03: "let's do something with the points system, because when
// you go 'number two' and then '+2', it just looks kind of amateurish."
//
// It was not a display problem. The drill fed a REACTION TIME into a curve tuned
// for a SPATIAL MISS — the gym-wide DECAY of 0.12 over a 3200 ms window. A
// correct read at a normal 1.5 s reaction scored 20 points out of a nominal
// 1000, at 2.4 s it scored 2, and from ~2.92 s onward a correct answer scored
// exactly ZERO. On a drill about jersey numbers, answering "which one was #2?"
// correctly could literally print "+2".
//
// The fix gave gradedPoints a per-call decay and floor. These assertions exist
// so nobody retunes it back toward the spatial curve without noticing that a
// right answer stops paying.

import { answerPoints, ANSWER_DECAY, ANSWER_FLOOR, scoreRead } from "./readNumbersCore.js";
import { gradedPoints, MAX_REP, DECAY } from "./gymPoints.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const WINDOW = 3200;
const at = ms => answerPoints(Math.min(Math.max(ms / WINDOW, 0), 1));

// ---- the property that actually matters --------------------------------------
// A correct answer must always be worth something. This is the whole defect.
{
  let worstMs = null, worst = Infinity;
  for (let ms = 0; ms <= WINDOW; ms += 25) {
    const p = at(ms);
    if (p < worst) { worst = p; worstMs = ms; }
  }
  ok(`a correct answer ALWAYS scores (worst is ${worst} at ${worstMs}ms)`, worst > 0);
  ok("even a buzzer-beater is not a token score", at(WINDOW) >= 100);
  ok("answering past the window still scores the floor", answerPoints(1.5) > 0);
}

// ---- the specific numbers Thomas saw ------------------------------------------
{
  ok(`2.40s no longer scores 2 (now ${at(2400)})`, at(2400) > 100);
  ok(`2.92s no longer scores 0 (now ${at(2920)})`, at(2920) > 100);
  ok(`1.50s is no longer 20 (now ${at(1500)})`, at(1500) > 300);
}

// ---- speed must still pay ------------------------------------------------------
// A floor that flattens the curve would fix the "+2" and break the drill.
{
  const fast = at(200), slow = at(WINDOW);
  ok(`instant beats last-instant by a real margin (${fast} vs ${slow})`, fast / slow >= 3);
  ok("the curve is monotonically non-increasing in time", (() => {
    let prev = Infinity;
    for (let ms = 0; ms <= WINDOW; ms += 50) {
      const p = at(ms);
      if (p > prev) return false;
      prev = p;
    }
    return true;
  })());
  ok("an instant answer is worth near the maximum", at(0) >= MAX_REP * 0.85);
}

// ---- a wrong answer is still worth nothing ------------------------------------
{
  ok("a wrong pick scores 0", scoreRead(1, 2, 400, WINDOW).points === 0);
  ok("a wrong pick is not a success", scoreRead(1, 2, 400, WINDOW).success === false);
  ok("no pick at all scores 0", scoreRead(null, 2, 400, WINDOW).points === 0);
  ok("a correct pick scores and succeeds", (() => {
    const r = scoreRead(2, 2, 400, WINDOW);
    return r.success === true && r.points > 0;
  })());
}

// ---- the spatial drills must be untouched --------------------------------------
// `floor` defaults to 0, so nothing that scores a distance changed.
{
  ok("gradedPoints still defaults to no floor", gradedPoints(1) === Math.round(MAX_REP * Math.exp(-1 / DECAY)));
  ok("a spatial miss can still score 0", gradedPoints(1) < 1);
  ok("an exact spatial hit is still max", gradedPoints(0) === MAX_REP);
  ok("the read-numbers decay is gentler than the spatial one", ANSWER_DECAY > DECAY);
  ok("the read-numbers floor is opt-in and positive", ANSWER_FLOOR > 0);
}

// ---- the curve, for the record -------------------------------------------------
console.log("\n  correct answer at →  points");
for (const ms of [0, 200, 500, 1000, 1500, 2000, 2400, 2920, 3200]) {
  console.log(`    ${(ms / 1000).toFixed(2)}s${" ".repeat(12)}${at(ms)}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
