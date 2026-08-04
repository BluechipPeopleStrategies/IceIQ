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

// ── the probe: telling a brand-new signup apart from a stranded account ──────
//
// Both look like "session, no profile", and treating them the same shipped a
// regression: SIGNED_IN fires DURING supabase.auth.signUp(), before signUp() has
// started the profiles write, so the first render after creating an account had
// a session and no row and was shown "Finish setting up your account."
//
// That was not only a confusing flash. FinishSetupScreen defaults role to
// "player", and ensureOwnProfile upserted -- so a COACH who completed the form
// during that window had their role overwritten. Silent data corruption on the
// happy path.

ok("a signup still in flight -> loading, NOT the finish-setup form",
  preAppScreen({ hasSupabase: true, hasSession: true, hasProfile: false, probe: "pending" }) === "loading");

ok("the retry budget is spent and the row is really gone -> finish setup",
  preAppScreen({ hasSupabase: true, hasSession: true, hasProfile: false, probe: "missing" }) === "finish-setup");

ok("probe never overrides a loaded profile -- that is still just the app",
  preAppScreen({ hasSupabase: true, hasSession: true, hasProfile: true, probe: "pending" }) === null);

ok("probe never invents a session -- pending with no session is still auth",
  preAppScreen({ hasSupabase: true, hasSession: false, hasProfile: false, probe: "pending" }) === "auth");

ok("probe never overrides missing config",
  preAppScreen({ hasSupabase: false, hasSession: true, hasProfile: false, probe: "pending" }) === "unconfigured");

// Back-compat: every caller that predates the probe keeps its old behaviour,
// which is why the default is "missing" and not "pending". A caller that does
// not know must still reach the recovery screen rather than the dead end.
ok("an omitted probe still routes a profile-less session to finish-setup",
  preAppScreen({ hasSupabase: true, hasSession: true, hasProfile: false }) === "finish-setup");

ok("no probe value ever routes a session to auth -- the dead end stays closed",
  ["pending", "missing", undefined, null, "nonsense"].every(probe =>
    preAppScreen({ hasSupabase: true, hasSession: true, hasProfile: false, probe }) !== "auth"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
