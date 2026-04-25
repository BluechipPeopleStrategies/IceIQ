// Team-challenge smoke test. Verifies migration_0008 ran and the RLS
// policies route reads correctly.
//
// Flow:
//   - Coach creates a challenge targeted at their team
//   - Player on the team reads the challenge via RLS
//   - Player submits a result (authenticated)
//   - Coach reads the leaderboard (result row visible)
//   - An unrelated coach cannot read the challenge OR the result
//
// Usage:
//   node scripts/smoke-team-challenge.mjs

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
  console.log("RinkReads team-challenge smoke test → " + url);
  const pw = "smoke-" + Math.random().toString(36).slice(2, 12);

  const { data: coachA } = await admin.auth.admin.createUser({ email: gen("coachA"), password: pw, email_confirm: true });
  created.users.push(coachA.user.id);
  const { data: coachB } = await admin.auth.admin.createUser({ email: gen("coachB"), password: pw, email_confirm: true });
  created.users.push(coachB.user.id);
  const { data: player } = await admin.auth.admin.createUser({ email: gen("player"), password: pw, email_confirm: true });
  created.users.push(player.user.id);
  ok("created 2 coaches + 1 player");

  await admin.from("profiles").insert([
    { id: coachA.user.id, role: "coach", name: "Coach A" },
    { id: coachB.user.id, role: "coach", name: "Coach B" },
    { id: player.user.id, role: "player", name: "Smoke Player", level: "U11 / Atom", position: "Forward" },
  ]);

  const teamCode = "CHL" + Math.random().toString(36).slice(2, 6).toUpperCase();
  const { data: team } = await admin.from("teams").insert({
    coach_id: coachA.user.id, name: "Smoke Team", level: "U11 / Atom", season: "2025-26", code: teamCode,
  }).select().single();
  created.teams.push(team.id);
  await admin.from("team_members").insert({ team_id: team.id, player_id: player.user.id });
  ok("team + roster wired");

  // Coach A creates challenge via anon client (RLS path).
  const coachAClient = createClient(url, anonKey, { auth: { persistSession: false } });
  await coachAClient.auth.signInWithPassword({ email: coachA.user.email, password: pw });
  const { data: challenge, error: crErr } = await coachAClient.from("team_challenges").insert({
    coach_id: coachA.user.id, team_id: team.id,
    title: "Smoke Challenge",
    question_ids: ["u11q1", "u11q2", "u11tf1"],
  }).select().single();
  if (crErr) throw new Error("coach create: " + crErr.message);
  ok("coach A created challenge");

  // Player reads challenge.
  const playerClient = createClient(url, anonKey, { auth: { persistSession: false } });
  await playerClient.auth.signInWithPassword({ email: player.user.email, password: pw });
  const { data: visible } = await playerClient.from("team_challenges").select("*").eq("id", challenge.id);
  if ((visible?.length || 0) !== 1) throw new Error("player should see 1 challenge, got " + (visible?.length || 0));
  ok("player reads challenge via RLS");

  // Player submits result.
  const { error: subErr } = await playerClient.from("challenge_results").insert({
    challenge_id: challenge.id, player_id: player.user.id,
    score: 85,
    results: [{ id: "u11q1", cat: "Coverage", ok: true }],
  });
  if (subErr) throw new Error("player submit: " + subErr.message);
  ok("player submitted result");

  // Coach A reads leaderboard.
  const { data: board, error: bErr } = await coachAClient.from("challenge_results")
    .select("player_id, score").eq("challenge_id", challenge.id);
  if (bErr) throw new Error("coach A read: " + bErr.message);
  if ((board?.length || 0) !== 1) throw new Error("coach A expected 1 row, got " + (board?.length || 0));
  ok("coach A reads leaderboard");

  // Unrelated coach sees nothing.
  const coachBClient = createClient(url, anonKey, { auth: { persistSession: false } });
  await coachBClient.auth.signInWithPassword({ email: coachB.user.email, password: pw });
  const { data: bChallenges } = await coachBClient.from("team_challenges").select("*").eq("id", challenge.id);
  if ((bChallenges?.length || 0) !== 0) throw new Error("coach B should see 0 challenges, got " + (bChallenges?.length || 0));
  const { data: bResults } = await coachBClient.from("challenge_results").select("*").eq("challenge_id", challenge.id);
  if ((bResults?.length || 0) !== 0) throw new Error("coach B should see 0 results, got " + (bResults?.length || 0));
  ok("unrelated coach B is blocked on both tables");

  console.log("\n✓ team-challenge smoke test passed");
}

async function cleanup() {
  for (const id of created.teams) {
    await admin.from("teams").delete().eq("id", id).then(() => {}, () => {});
  }
  for (const id of created.users) {
    await admin.auth.admin.deleteUser(id).then(() => {}, () => {});
  }
}

try { await main(); } catch (e) {
  console.error("  ✗", e?.message || e);
  process.exitCode = 1;
} finally {
  await cleanup();
  console.log("  ✓ cleaned up disposable rows");
}

process.exit(process.exitCode || 0);
