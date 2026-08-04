#!/usr/bin/env node
// Run: node src/utils/routeMemory.test.mjs
//
// `screen` is in-memory React state with no URL routing, so every reload
// returned to Home. That is the second half of the Daily Drill report: the
// crash dumped the player out, and the error boundary's own Reload button
// dumped them again.
//
// The naive fix is wrong in two specific ways, and both are asserted here.

import { rememberScreen, recallScreen, forgetScreen, RESTORABLE } from "./routeMemory.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

// A stand-in for sessionStorage, so this runs in plain node.
function fakeStore() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    get size() { return m.size; },
  };
}

// ---- the happy path ---------------------------------------------------------

{
  const s = fakeStore();
  rememberScreen("report", s);
  ok("a stable screen is remembered and comes back", recallScreen(s) === "report");
}

{
  const s = fakeStore();
  rememberScreen("training", s);
  forgetScreen(s);
  ok("forgetting clears it, so the next sign-in starts Home", recallScreen(s) === null);
}

// ---- wrong way #1: object screens carry live data ---------------------------

{
  // {kind:"qotd", question} etc. The payload cannot survive a reload, and
  // restoring the kind WITHOUT it is exactly the crash fixed in e999307 —
  // QotDScreen dereferenced a question that was not there.
  const s = fakeStore();
  rememberScreen("report", s);
  rememberScreen({ kind: "qotd", question: { id: "q1" } }, s);
  ok("an object screen is not remembered", recallScreen(s) === null);
  ok("and it CLEARS a previous memory rather than leaving a stale one",
    s.size === 0);
}

// ---- wrong way #2: restoring an in-progress session is worse than Home ------

{
  const s = fakeStore();
  for (const transient of ["quiz", "weekly", "results"]) {
    rememberScreen("home", s);
    rememberScreen(transient, s);
    ok(`"${transient}" is not restorable — arriving cold would look like lost progress`,
      recallScreen(s) === null);
  }
}

ok("the allow-list excludes every in-progress or spent session screen",
  !RESTORABLE.has("quiz") && !RESTORABLE.has("weekly") && !RESTORABLE.has("results"));

ok("and excludes the auth and marketing routes, which are reached deliberately",
  !RESTORABLE.has("password-reset") && !RESTORABLE.has("admin") && !RESTORABLE.has("parents"));

// ---- never break navigation over storage --------------------------------

{
  // Private browsing modes throw on access rather than returning null.
  const hostile = {
    getItem() { throw new Error("SecurityError"); },
    setItem() { throw new Error("SecurityError"); },
    removeItem() { throw new Error("SecurityError"); },
  };
  let threw = false;
  try {
    rememberScreen("report", hostile);
    forgetScreen(hostile);
    ok("a throwing storage still yields null rather than propagating",
      recallScreen(hostile) === null);
  } catch { threw = true; }
  ok("a throwing storage never breaks navigation", !threw);
}

{
  const s = fakeStore();
  s.setItem("rinkreads_last_screen_v1", "some-screen-that-no-longer-exists");
  ok("a stale value from an older build is ignored, not navigated to",
    recallScreen(s) === null);
}

ok("unknown and empty screens are simply not remembered",
  (() => { const s = fakeStore(); rememberScreen("", s); rememberScreen(null, s); return recallScreen(s) === null; })());

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
