#!/usr/bin/env node
// Run: node src/utils/authRouting.test.mjs
import { preAppScreen } from "./authRouting.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

// The render gate used to be `if (!profile) -> AuthScreen`, which put an
// authenticated user with no profiles row back on the signup form forever --
// and then told them the email was already registered. Reproduced on production
// 2026-08-03 with a real session for thomas@bluechip-people-strategies.com.

ok("no supabase config -> the config screen, whatever else is true",
  preAppScreen({ hasSupabase: false, hasSession: true, hasProfile: true }) === "unconfigured");

ok("profile loaded -> render the app (no pre-app screen)",
  preAppScreen({ hasSupabase: true, hasSession: true, hasProfile: true }) === null);

ok("no session, no profile -> the auth screen",
  preAppScreen({ hasSupabase: true, hasSession: false, hasProfile: false }) === "auth");

ok("SESSION but NO profile -> finish setup, not the auth screen",
  preAppScreen({ hasSupabase: true, hasSession: true, hasProfile: false }) === "finish-setup");

// A profile without a session shouldn't happen, but if state is mid-flight the
// safe answer is to render the app rather than bounce someone who has a profile.
ok("profile without a session -> still render the app rather than bounce",
  preAppScreen({ hasSupabase: true, hasSession: false, hasProfile: true }) === null);

// Guard against the old behaviour returning.
ok("a session with no profile NEVER routes to auth",
  preAppScreen({ hasSupabase: true, hasSession: true, hasProfile: false }) !== "auth");

ok("missing/undefined flags default to the auth screen, not a crash",
  preAppScreen({ hasSupabase: true }) === "auth");

ok("an empty argument is safe", preAppScreen() === "unconfigured");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
