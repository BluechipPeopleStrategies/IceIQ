// Seeds realistic-but-not-excessive history into the three demo
// accounts so a fresh login lands on a populated dashboard, not a
// blank one. Designed to leave plenty of room for the visitor to
// still explore — partial Journey progress, mid-mastery on a few
// categories, an open homework assignment, etc.
//
// Usage:
//   node scripts/seed-demo-history.mjs            # dry-run summary
//   node scripts/seed-demo-history.mjs --apply    # write
//
// Idempotent: re-running clears any prior seeded history first so
// the visitor experience stays consistent. Run AFTER
// create-demo-accounts.mjs so the auth users + profiles exist.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const APPLY = process.argv.includes("--apply");

const ACCOUNTS = {
  free:  "demo-free@iceiq.demo",
  pro:   "demo-pro@iceiq.demo",
  coach: "demo-coach@iceiq.demo",
};

// ─────────────────────────────────────────────────────────────────────
// Helpers

function ok(m)   { console.log(`  ✓ ${m}`); }
function info(m) { console.log(`  · ${m}`); }
function fail(m, e) { console.error(`  ✗ ${m}:`, e?.message || e); process.exitCode = 1; }

async function findUserId(email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const u = (data?.users || []).find(x => (x.email || "").toLowerCase() === email.toLowerCase());
  return u ? u.id : null;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// Sample IDs that resemble real bank entries — used so the dashboard's
// per-question-stats lookups don't cough up undefined errors.
const QUIZ_QUESTIONS = {
  freeU11: [
    "u11q1", "u11q2", "u11q3", "u11q4", "u11q5", "u11q6", "u11q7", "u11q8", "u11q9", "u11q10",
  ],
  proU13: [
    "u13q1", "u13q2", "u13q3", "u13q4", "u13q5", "u13q6", "u13q7", "u13q8", "u13q9", "u13q10",
  ],
};

const CATEGORIES = {
  U11: ["Hockey Sense", "Puck Support", "Defense", "Forechecking", "Vision"],
  U13: ["Decision-Making", "Breakouts", "Vision", "Defense", "Power Play", "Puck Support"],
};

// Build a synthetic quiz session: 10 results, mix of categories, ~70% correct.
function buildQuizResults(qids, cats, accuracy) {
  return qids.map((id, i) => {
    const cat = cats[i % cats.length];
    const ok = Math.random() < accuracy;
    return { id, cat, ok, d: 1 + (i % 3), type: "mc" };
  });
}

function score(results) {
  const total = results.length;
  if (!total) return 0;
  const correct = results.filter(r => r.ok).length;
  return Math.round((correct / total) * 100);
}

// ─────────────────────────────────────────────────────────────────────
// Seed actions

async function clearPlayerHistory(playerId) {
  await admin.from("quiz_sessions").delete().eq("player_id", playerId);
  await admin.from("self_ratings").delete().eq("player_id", playerId);
  await admin.from("goals").delete().eq("player_id", playerId);
}

async function seedQuizSessions(playerId, sessions) {
  for (const s of sessions) {
    const { error } = await admin.from("quiz_sessions").insert({
      player_id: playerId,
      results: s.results,
      score: s.score,
      session_length: s.results.length,
      completed_at: s.at,
    });
    if (error) throw error;
  }
}

async function seedSelfRatings(playerId, entries) {
  if (!entries.length) return;
  const rows = entries.map(([skill_id, value]) => ({
    player_id: playerId, skill_id, value,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await admin.from("self_ratings").upsert(rows, {
    onConflict: "player_id,skill_id",
  });
  if (error) throw error;
}

async function seedGoals(playerId, goals) {
  if (!goals.length) return;
  const rows = goals.map(g => ({
    player_id: playerId, ...g,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await admin.from("goals").upsert(rows, {
    onConflict: "player_id,category",
  });
  if (error) throw error;
}

async function clearCoachState(coachId) {
  // Cascading delete: removing the team takes assignments, completions,
  // team_members, etc. with it.
  const { data: teams } = await admin.from("teams").select("id").eq("coach_id", coachId);
  for (const t of teams || []) {
    await admin.from("teams").delete().eq("id", t.id);
  }
}

async function seedCoachState(coachId, freePlayerId, proPlayerId) {
  const code = "DEMO" + Math.random().toString(36).slice(2, 5).toUpperCase();
  const { data: team, error: tErr } = await admin.from("teams").insert({
    coach_id: coachId,
    name: "Demo Mites",
    level: "U13 / Peewee",
    season: "2025-26",
    code,
  }).select().single();
  if (tErr) throw tErr;

  // Add the two demo players to the roster so the coach sees real
  // names + a populated team analytics view.
  for (const playerId of [freePlayerId, proPlayerId].filter(Boolean)) {
    const { error } = await admin.from("team_members").insert({
      team_id: team.id, player_id: playerId,
    });
    // 23505 = duplicate; already on roster from a prior seed run we missed cleaning.
    if (error && error.code !== "23505") throw error;
  }

  // One open homework assignment due in five days.
  const due = new Date();
  due.setDate(due.getDate() + 5);
  await admin.from("assignments").insert({
    coach_id: coachId,
    team_id: team.id,
    title: "Watch the NHL highlight clip",
    description: "Find one read in the clip you'd have made differently. Bring it to practice on Tuesday.",
    due_date: due.toISOString().slice(0, 10),
    target_players: null,
  });

  return { teamId: team.id, code };
}

// ─────────────────────────────────────────────────────────────────────
// Main

async function main() {
  console.log(`Ice-IQ demo history → ${url}\n`);

  const ids = {};
  for (const [k, email] of Object.entries(ACCOUNTS)) {
    ids[k] = await findUserId(email);
    if (!ids[k]) {
      fail(`account "${email}" not found`, new Error("run scripts/create-demo-accounts.mjs --apply first"));
      return;
    }
  }

  // ── FREE — light history. Two quiz sessions, one self-rating, one goal.
  const freeSessions = [
    { results: buildQuizResults(QUIZ_QUESTIONS.freeU11, CATEGORIES.U11, 0.55), at: daysAgo(8) },
    { results: buildQuizResults(QUIZ_QUESTIONS.freeU11, CATEGORIES.U11, 0.70), at: daysAgo(2) },
  ].map(s => ({ ...s, score: score(s.results) }));
  const freeRatings = [
    ["u11_skating_fwd", "B"],
    ["u11_passing_basic", "B"],
  ];
  const freeGoals = [
    { category: "Puck Support", goal: "Be the closest open option for whoever has the puck", s: "Be visible", m: "5 supports per period", a: "yes", r: "team plays better", t: "this month" },
  ];

  // ── PRO — eight quiz sessions across 4 weeks at climbing accuracy,
  // a handful of self-ratings, two active goals. Plenty of progress
  // visible without being maxed out.
  const proSessions = [];
  for (let i = 0; i < 8; i++) {
    const acc = 0.55 + (i / 14); // 55% → ~85%
    proSessions.push({
      results: buildQuizResults(QUIZ_QUESTIONS.proU13, CATEGORIES.U13, acc),
      at: daysAgo(28 - i * 3),
    });
  }
  for (const s of proSessions) s.score = score(s.results);
  const proRatings = [
    ["u13_decision_making_pressure", "A"],
    ["u13_breakouts_first_pass", "B"],
    ["u13_vision_scan", "B"],
    ["u13_defense_gap", "C"],
  ];
  const proGoals = [
    { category: "Defense", goal: "Tighter gap by the blue line", s: "Match speed sooner", m: "1-on-1 wins per game", a: "yes", r: "fewer rush chances against", t: "next four games" },
    { category: "Decision-Making", goal: "Faster reads on entries", s: "Pre-scan twice before puck arrives", m: "shoulder checks per shift", a: "yes", r: "cleaner zone entries", t: "season" },
  ];

  if (!APPLY) {
    info(`would seed ${freeSessions.length} sessions + ${freeRatings.length} ratings + ${freeGoals.length} goal(s) for FREE`);
    info(`would seed ${proSessions.length} sessions + ${proRatings.length} ratings + ${proGoals.length} goals for PRO`);
    info(`would seed coach team + roster (free + pro) + 1 open assignment`);
    console.log("\nDRY RUN — pass --apply to write.");
    return;
  }

  try {
    // FREE
    await clearPlayerHistory(ids.free);
    await seedQuizSessions(ids.free, freeSessions);
    await seedSelfRatings(ids.free, freeRatings);
    await seedGoals(ids.free, freeGoals);
    ok(`FREE: ${freeSessions.length} sessions · ${freeRatings.length} ratings · ${freeGoals.length} goal`);

    // PRO
    await clearPlayerHistory(ids.pro);
    await seedQuizSessions(ids.pro, proSessions);
    await seedSelfRatings(ids.pro, proRatings);
    await seedGoals(ids.pro, proGoals);
    ok(`PRO:  ${proSessions.length} sessions · ${proRatings.length} ratings · ${proGoals.length} goals`);

    // COACH
    await clearCoachState(ids.coach);
    const team = await seedCoachState(ids.coach, ids.free, ids.pro);
    ok(`COACH: team "${team.code}" · 2-player roster · 1 open assignment`);
  } catch (e) {
    fail("seed", e);
    return;
  }

  console.log("\n✓ demo history seeded.");
}

try { await main(); }
catch (e) { fail("seed-demo-history", e); }
process.exit(process.exitCode || 0);
