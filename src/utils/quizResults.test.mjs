#!/usr/bin/env node
// Run: node src/utils/quizResults.test.mjs
import { upsertResult, skipResult, isSkipped, answeredCount } from "./quizResults.js";

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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
