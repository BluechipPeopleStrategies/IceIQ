#!/usr/bin/env node
// Run: node src/qotdResolve.test.mjs
//
// S2-6: "Daily Drill errors out — something went wrong, and reloading dumps you
// to the landing page."
//
// The cause was a prop contract with two callers and only one of them honouring
// it. `QotDCard` on Home resolved today's question and passed it; the Daily
// Drill card in ChallengesHub navigated with `onNav({ kind: "qotd" })` and no
// question at all. `QotDScreen` read `question.type` as its third statement and
// threw, which the root error boundary turned into "Something went wrong" —
// losing the whole app state, and on reload the landing page.
//
// It hid because `QotDCard` returns null in demo/dev mode, so in a preview
// session the Home route was invisible and the broken route was the only one.
//
// This file does not render React — the repo has no component-test harness. It
// asserts the two things that actually made the bug possible, both of which are
// checkable from source:
//
//   1. every navigation to a screen `kind` supplies what that screen needs, or
//      the screen resolves it itself
//   2. the picker's contract — it is allowed to return null, so any caller that
//      dereferences the result without a guard is a crash waiting to happen

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const read = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");
const qotd = read("./questionOfDay.jsx");
const hub = read("./path/ChallengesHub.jsx");

// ---- 1. the screen no longer trusts the prop --------------------------------

ok("QotDScreen accepts the question as OPTIONAL, renaming the prop rather than reading it directly",
  /export function QotDScreen\(\{\s*question:\s*questionProp/.test(qotd));

ok("it resolves its own question when the caller did not supply one",
  /if \(questionProp\)/.test(qotd) && /todaysQuestion\(qb, player\.level\)/.test(qotd));

ok("it renders a real empty state instead of dereferencing a missing question",
  /if \(!question\) \{/.test(qotd));

{
  // The original crash line. It must now sit AFTER the guard, or the guard is
  // decorative — this is the assertion that would have caught the bug.
  const guardAt = qotd.indexOf("if (!question) {");
  const derefAt = qotd.indexOf("const isTF = question.type");
  ok("the guard comes before the first dereference of `question`",
    guardAt > -1 && derefAt > -1 && guardAt < derefAt);
}

{
  // React requires stable hook order. The early return is only safe if no hook
  // runs after it.
  const after = qotd.slice(qotd.indexOf("const isTF = question.type"));
  const hooks = after.match(/\buse(State|Effect|Ref|Memo|Callback|Reducer|Context)\s*\(/g) || [];
  ok(`no hook runs after the early return (found ${hooks.length})`, hooks.length === 0);
}

// ---- 2. the caller that broke it ---------------------------------------------

ok("ChallengesHub still navigates to qotd without a question — which is now fine, and is why the screen must self-resolve",
  /onNav\(\{\s*kind:\s*"qotd"\s*\}\)/.test(hub));

// ---- 3. the picker is allowed to return nothing ------------------------------

{
  // todaysQuestion filters the age pool down to plain mc/tf. A band with no
  // such question yields null, and every caller has to survive that. This is
  // the second latent crash the fix closes, on the Home path.
  const picker = qotd.slice(qotd.indexOf("function todaysQuestion"));
  ok("todaysQuestion filters the pool, so an empty result is a real outcome rather than an impossibility",
    /\.filter\(/.test(picker));
  ok("the screen's resolve path coalesces a null pick rather than passing it through",
    /todaysQuestion\(qb, player\.level\) \|\| null/.test(qotd));
}

// ---- 4. the empty state is usable, not a dead end ----------------------------

ok("the empty state offers a way back, so it cannot become its own trap",
  /onClick=\{onBack\}/.test(qotd.slice(qotd.indexOf("if (!question) {"), qotd.indexOf("const isTF = question.type"))));

ok("the empty state distinguishes a load failure from an empty pool from a missing age group",
  /Could not load today's question/.test(qotd)
  && /No question for your age group today/.test(qotd)
  && /Set your age group/.test(qotd));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
