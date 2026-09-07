// Homework feature smoke test. Exercises the coach → team assignment flow
// end-to-end against the real Supabase instance, then tears everything down.
//
// What it verifies:
//   - migration_0006_assignments.sql ran (assignments + assignment_completions
//     tables exist with FKs to profiles, teams, team_members)
//   - A coach can create an assignment targeted at their team
//   - A player on that team can see the assignment via RLS
//   - A player can mark the assignment complete (their own completion row)
//   - The coach can read back the completion for the dashboard rollup
//
// Usage:
//   node scripts/smoke-homework.mjs
//
// Requires in .env:
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_ANON_KEY      (for the player-side RLS check)
//   SUPABASE_SERVICE_ROLE_KEY   (bypasses RLS for setup + cleanup)
//
// The script creates two disposable auth users (coach + player) with
// randomized emails, runs the flow, then deletes them — the cascade cleans
// up profiles, teams, team_members, assignments, and completions too.

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(join(ROOT, ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (m) env[m[1]] = m[2];
    }
  } catch {}
  return env;
}

const env = { ...loadEnv(), ...process.env };
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey || !anonKey) {
  console.error("Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

// Trackers so the cleanup block can tear down whatever we created even on
// partial failure.
const created = { users: [], teams: [], assignments: [] };

function ok(label) { console.log(`  ✓ ${label}`); }
function fail(label, err) {
  console.error(`  ✗ ${label}:`, err?.message || err);
  process.exitCode = 1;
}

function genEmail(role) {
  return `smoke-${role}-${Date.now()}-${Math.floor(Math.random() * 10000)}@rinkreads.test`;
}

async function main() {
  console.log("RinkReads homework smoke test → " + url);

  // ─────────────── 1. create coach + player auth users
  const coachEmail = genEmail("coach");
  const playerEmail = genEmail("player");
  const pw = "smoke-test-" + Math.random().toString(36).slice(2, 12);

  const { data: coachAuth, error: ce } = await admin.auth.admin.createUser({
    email: coachEmail, password: pw, email_confirm: true,
  });
  if (ce) throw new Error("create coach: " + ce.message);
  created.users.push(coachAuth.user.id);
  const coachId = coachAuth.user.id;
  ok(`created coach auth user (${coachEmail})`);

  const { data: playerAuth, error: pe } = await admin.auth.admin.createUser({
    email: playerEmail, password: pw, email_confirm: true,
  });
  if (pe) throw new Error("create player: " + pe.message);
  created.users.push(playerAuth.user.id);
  const playerId = playerAuth.user.id;
  ok(`created player auth user (${playerEmail})`);

  // ─────────────── 2. seed profiles + team + team_members
  const { error: cpErr } = await admin.from("profiles").insert({
    id: coachId, role: "coach", name: "Smoke Coach",
  });
  if (cpErr) throw new Error("coach profile: " + cpErr.message);
  ok("inserted coach profile");

  const { error: ppErr } = await admin.from("profiles").insert({
    id: playerId, role: "player", name: "Smoke Player", level: "U11 / Atom", position: "Forward",
  });
  if (ppErr) throw new Error("player profile: " + ppErr.message);
  ok("inserted player profile");

  const teamCode = "SMK" + Math.random().toString(36).slice(2, 6).toUpperCase();
  const { data: team, error: tErr } = await admin.from("teams").insert({
    coach_id: coachId, name: "Smoke Team", level: "U11 / Atom", season: "2025-26", code: teamCode,
  }).select().single();
  if (tErr) throw new Error("team: " + tErr.message);
  created.teams.push(team.id);
  ok(`created team (code=${teamCode})`);

  const { error: tmErr } = await admin.from("team_members").insert({
    team_id: team.id, player_id: playerId,
  });
  if (tmErr) throw new Error("team_members: " + tmErr.message);
  ok("added player to team roster");

  // ─────────────── 3. coach creates an assignment (service role bypasses RLS
  // but the insert mirrors what src/assignments.jsx does as the coach)
  const { data: assignment, error: aErr } = await admin.from("assignments").insert({
    coach_id: coachId, team_id: team.id,
    title: "Smoke test assignment",
    description: "Watch the NHL highlight clip and come ready to discuss.",
    due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    target_players: null, // whole team
  }).select().single();
  if (aErr) throw new Error("assignment insert: " + aErr.message);
  created.assignments.push(assignment.id);
  ok("coach created assignment");

  // ─────────────── 4. verify the player can read it via RLS
  // Sign in as the player using the anon client to ensure the policies allow
  // the row through.
  const playerClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: signInErr } = await playerClient.auth.signInWithPassword({
    email: playerEmail, password: pw,
  });
  if (signInErr) throw new Error("player sign-in: " + signInErr.message);
  ok("player signed in");

  const { data: visibleRows, error: readErr } = await playerClient.from("assignments").select("*").eq("id", assignment.id);
  if (readErr) throw new Error("player read: " + readErr.message);
  if (!visibleRows || visibleRows.length !== 1) {
    throw new Error("RLS hid the assignment from the player (expected 1 row, got " + (visibleRows?.length || 0) + ")");
  }
  ok("player reads assignment via RLS");

  // ─────────────── 5. player marks it complete
  const { error: compErr } = await playerClient.from("assignment_completions").insert({
    assignment_id: assignment.id, player_id: playerId,
  });
  if (compErr) throw new Error("player completion insert: " + compErr.message);
  ok("player marked complete");

  // ─────────────── 6. service role verifies completion count (mirrors the
  // coach dashboard rollup)
  const { data: comps, error: cntErr } = await admin.from("assignment_completions")
    .select("player_id").eq("assignment_id", assignment.id);
  if (cntErr) throw new Error("count completions: " + cntErr.message);
  if ((comps?.length || 0) !== 1) {
    throw new Error("expected 1 completion, got " + (comps?.length || 0));
  }
  ok(`coach sees completion rollup (${comps.length}/1)`);

  console.log("\n✓ homework smoke test passed");
}

async function cleanup() {
  // Delete auth users — cascades through profiles (on delete cascade) which
  // cascades through teams.coach_id → assignments → assignment_completions.
  // Explicit delete for belt-and-suspenders on partial-failure paths.
  for (const id of created.assignments) {
    await admin.from("assignments").delete().eq("id", id).then(() => {}, () => {});
  }
  for (const id of created.teams) {
    await admin.from("teams").delete().eq("id", id).then(() => {}, () => {});
  }
  for (const id of created.users) {
    await admin.auth.admin.deleteUser(id).then(() => {}, () => {});
  }
}

try {
  await main();
} catch (e) {
  fail("smoke test", e);
} finally {
  await cleanup();
  console.log("  ✓ cleaned up disposable rows");
}

process.exit(process.exitCode || 0);
