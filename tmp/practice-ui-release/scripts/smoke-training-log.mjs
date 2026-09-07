// Coach-visible training log smoke test. Verifies migration_0007 ran and
// the RLS policies route reads correctly.
//
// Flow exercised:
//   - Player logs a training session (authenticated, own-row insert)
//   - Another random coach who does NOT own the team CANNOT read it
//   - The coach who DOES own the team (via team_members) can read it
//
// Usage:
//   node scripts/smoke-training-log.mjs
//
// Requires VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

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
if (!url || !anonKey || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const created = { users: [], teams: [] };

function ok(label) { console.log(`  ✓ ${label}`); }
function gen(role) { return `smoke-${role}-${Date.now()}-${Math.floor(Math.random() * 10000)}@rinkreads.test`; }

async function main() {
  console.log("RinkReads training-log smoke test → " + url);
  const pw = "smoke-" + Math.random().toString(36).slice(2, 12);

  // Create one team-owning coach + one unrelated coach + one player.
  const { data: coachA } = await admin.auth.admin.createUser({
    email: gen("coachA"), password: pw, email_confirm: true,
  });
  created.users.push(coachA.user.id);
  const { data: coachB } = await admin.auth.admin.createUser({
    email: gen("coachB"), password: pw, email_confirm: true,
  });
  created.users.push(coachB.user.id);
  const { data: player } = await admin.auth.admin.createUser({
    email: gen("player"), password: pw, email_confirm: true,
  });
  created.users.push(player.user.id);
  ok("created 2 coaches + 1 player auth users");

  await admin.from("profiles").insert([
    { id: coachA.user.id, role: "coach", name: "Coach A" },
    { id: coachB.user.id, role: "coach", name: "Coach B" },
    { id: player.user.id, role: "player", name: "Smoke Player", level: "U11 / Atom", position: "Forward" },
  ]);
  ok("inserted profiles");

  const teamCode = "TRN" + Math.random().toString(36).slice(2, 6).toUpperCase();
  const { data: team } = await admin.from("teams").insert({
    coach_id: coachA.user.id, name: "Smoke Team", level: "U11 / Atom", season: "2025-26", code: teamCode,
  }).select().single();
  created.teams.push(team.id);
  await admin.from("team_members").insert({ team_id: team.id, player_id: player.user.id });
  ok("coach A owns a team with the player on it");

  // Player signs in and logs a training session.
  const playerEmail = player.user.email;
  const playerClient = createClient(url, anonKey, { auth: { persistSession: false } });
  await playerClient.auth.signInWithPassword({ email: playerEmail, password: pw });
  const { error: insertErr } = await playerClient.from("training_sessions").insert({
    player_id: player.user.id,
    session_date: new Date().toISOString().slice(0, 10),
    type: "ice_time",
    value: 45,
    unit: "min",
    label: "Team practice",
    coach: "Coach A",
  });
  if (insertErr) throw new Error("player insert: " + insertErr.message);
  ok("player logged a training session");

  // Coach A (owns the team) reads it.
  const coachAEmail = coachA.user.email;
  const coachAClient = createClient(url, anonKey, { auth: { persistSession: false } });
  await coachAClient.auth.signInWithPassword({ email: coachAEmail, password: pw });
  const { data: aRows, error: aErr } = await coachAClient.from("training_sessions")
    .select("*").eq("player_id", player.user.id);
  if (aErr) throw new Error("coach A read: " + aErr.message);
  if ((aRows?.length || 0) !== 1) throw new Error("coach A expected 1 row, got " + (aRows?.length || 0));
  ok("coach A (owns team) reads the session via RLS");

  // Coach B (no team) cannot read it.
  const coachBEmail = coachB.user.email;
  const coachBClient = createClient(url, anonKey, { auth: { persistSession: false } });
  await coachBClient.auth.signInWithPassword({ email: coachBEmail, password: pw });
  const { data: bRows } = await coachBClient.from("training_sessions")
    .select("*").eq("player_id", player.user.id);
  if ((bRows?.length || 0) !== 0) throw new Error("coach B should see 0 rows, got " + (bRows?.length || 0));
  ok("coach B (unrelated) gets 0 rows — RLS holds");

  console.log("\n✓ training-log smoke test passed");
}

async function cleanup() {
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
  console.error("  ✗", e?.message || e);
  process.exitCode = 1;
} finally {
  await cleanup();
  console.log("  ✓ cleaned up disposable rows");
}

process.exit(process.exitCode || 0);
