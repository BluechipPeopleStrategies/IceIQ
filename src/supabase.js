import { createClient } from "@supabase/supabase-js";

// Error-handling conventions for this module:
//
//   Writes (saveX / createX / updateX / signX):
//     - If `supabase` is null (env vars missing), return a no-op sentinel
//       (null / undefined) and do not throw — the app works offline.
//     - If the network call errors, THROW the Supabase error so callers can
//       map it to a user-visible message.
//
//   Reads (getX / listX):
//     - Return the expected shape on success (e.g. array, object, string).
//     - Return the empty/null equivalent on failure and log via `warn` so
//       errors surface in DevTools without crashing the UI. Do NOT throw
//       from reads — the render tree doesn't want to branch on read errors.
//
//   Telemetry (recordX):
//     - Best-effort fire-and-forget. Silent catch by design, annotated.

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

function warn(context, error) {
  if (error) console.warn(`[RinkReads/supabase] ${context}:`, error.message || error);
}

if (!url || !key) {
  console.warn("[RinkReads] Supabase env vars missing — auth/sync disabled. Copy .env.example to .env and fill in your Supabase project URL and anon key.");
}

export const supabase = (url && key) ? createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
}) : null;

export const hasSupabase = !!supabase;

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
export async function signUp({ email, password, role, name }) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (data.user) {
    // Create profile row
    const { error: pErr } = await supabase.from("profiles").insert({
      id: data.user.id,
      role, name,
    });
    if (pErr) throw pErr;
  }
  return data;
}

export async function signIn({ email, password }) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(callback) {
  if (!supabase) return { subscription: { unsubscribe: () => {} } };
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}

// Fires when the user lands via a password-reset email link. The app uses
// this to route them to the "set new password" screen — without it, the
// reset link just logs the user in with their old password unchanged.
//
// Race-condition note: detectSessionInUrl=true causes Supabase to process
// the recovery hash during createClient init, firing PASSWORD_RECOVERY
// before any React component can subscribe. Past events don't replay on
// subscribe, so a naive useEffect listener misses the event entirely.
//
// We work around this by subscribing at module init (below) and storing
// the recovery flag + session. Callers via onPasswordRecovery() get fired
// immediately if the event already happened, or on next firing otherwise.
let _recoveryFired = false;
let _recoverySession = null;
const _recoveryListeners = new Set();

if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      _recoveryFired = true;
      _recoverySession = session;
      for (const fn of _recoveryListeners) {
        try { fn(session); } catch (e) { warn("onPasswordRecovery callback", e); }
      }
    }
  });
}

export function onPasswordRecovery(callback) {
  if (!supabase) return { subscription: { unsubscribe: () => {} } };
  if (_recoveryFired) {
    // Event already fired before this subscriber registered. Fire async so
    // callers' state updates happen on the next tick rather than during render.
    Promise.resolve().then(() => callback(_recoverySession));
  }
  _recoveryListeners.add(callback);
  return {
    subscription: {
      unsubscribe: () => { _recoveryListeners.delete(callback); },
    },
  };
}

export async function updatePassword(newPassword) {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// ─────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────
export async function getProfile(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) { warn("getProfile", error); return null; }
  return data;
}

export async function updateProfile(userId, patch) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────
// TEAMS
// ─────────────────────────────────────────────
export async function createTeam({ coachId, name, level, season }) {
  if (!supabase) throw new Error("Supabase not configured");
  const code = generateTeamCode();
  const { data, error } = await supabase.from("teams")
    .insert({ coach_id: coachId, name, level, season, code })
    .select().single();
  if (error) throw error;
  return data;
}

export async function getCoachTeams(coachId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from("teams").select("*").eq("coach_id", coachId).order("created_at", { ascending: false });
  if (error) { warn("getCoachTeams", error); return []; }
  return data || [];
}

export async function getPlayerTeams(playerId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from("team_members")
    .select("team_id, teams(*)")
    .eq("player_id", playerId);
  if (error) { warn("getPlayerTeams", error); return []; }
  return (data || []).map(r => r.teams).filter(Boolean);
}

export async function joinTeamByCode(playerId, code) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data: team, error: tErr } = await supabase.from("teams").select("*").eq("code", code.toUpperCase()).single();
  if (tErr || !team) throw new Error("Team not found");
  const { error } = await supabase.from("team_members").insert({ team_id: team.id, player_id: playerId });
  if (error && error.code !== "23505") throw error; // ignore duplicate
  return team;
}

export async function getTeamRoster(teamId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from("team_members")
    .select("player_id, profiles(*)")
    .eq("team_id", teamId);
  if (error) { warn("getTeamRoster", error); return []; }
  return (data || []).map(r => r.profiles).filter(Boolean);
}

function generateTeamCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

// ─────────────────────────────────────────────
// QUIZ SESSIONS
// ─────────────────────────────────────────────
export async function saveQuizSession(playerId, { results, score, sessionLength }) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("quiz_sessions")
    .insert({ player_id: playerId, results, score, session_length: sessionLength })
    .select().single();
  if (error) throw error;
  return data;
}

export async function getPlayerSessions(playerId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from("quiz_sessions")
    .select("*").eq("player_id", playerId).order("completed_at", { ascending: true });
  if (error) { warn("getPlayerSessions", error); return []; }
  return data || [];
}

// Bulk-fetch quiz history for every player on a coach's roster. RLS policy
// `coach reads team sessions` (schema.sql) permits this when auth.uid() is
// the coach of a team the player is on. Returns a map of
// { playerId: [{ results, score, date }] } suitable for attaching to roster
// rows before calling calcTeamCompetencyAverages().
export async function getTeamQuizHistory(playerIds) {
  if (!supabase || !Array.isArray(playerIds) || !playerIds.length) return {};
  const { data, error } = await supabase.from("quiz_sessions")
    .select("player_id, results, score, completed_at")
    .in("player_id", playerIds)
    .order("completed_at", { ascending: true });
  if (error) { warn("getTeamQuizHistory", error); return {}; }
  const byPlayer = {};
  for (const row of data || []) {
    if (!byPlayer[row.player_id]) byPlayer[row.player_id] = [];
    byPlayer[row.player_id].push({
      results: row.results,
      score: row.score,
      date: (row.completed_at || "").slice(0, 10),
      completed_at: row.completed_at,
    });
  }
  return byPlayer;
}

// ─────────────────────────────────────────────
// GOALS
// ─────────────────────────────────────────────
export async function saveGoal(playerId, category, goalData) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("goals")
    .upsert({
      player_id: playerId,
      category,
      goal: goalData.goal,
      s: goalData.S, m: goalData.M, a: goalData.A, r: goalData.R, t: goalData.T,
      completed: !!goalData.completed,
      updated_at: new Date().toISOString(),
    })
    .select().single();
  if (error) throw error;
  return data;
}

export async function getPlayerGoals(playerId) {
  if (!supabase) return {};
  const { data, error } = await supabase.from("goals").select("*").eq("player_id", playerId);
  if (error) { warn("getPlayerGoals", error); return {}; }
  const out = {};
  (data || []).forEach(g => {
    out[g.category] = { goal: g.goal, S: g.s, M: g.m, A: g.a, R: g.r, T: g.t, completed: g.completed };
  });
  return out;
}

// ─────────────────────────────────────────────
// SELF RATINGS
// ─────────────────────────────────────────────
export async function saveSelfRatings(playerId, ratings) {
  if (!supabase) return;
  const rows = Object.entries(ratings)
    .filter(([_, v]) => v !== null && v !== undefined)
    .map(([skill_id, value]) => ({ player_id: playerId, skill_id, value, updated_at: new Date().toISOString() }));
  if (!rows.length) return;
  const { error } = await supabase.from("self_ratings").upsert(rows);
  if (error) throw error;
}

export async function getSelfRatings(playerId) {
  if (!supabase) return {};
  const { data, error } = await supabase.from("self_ratings").select("skill_id, value").eq("player_id", playerId);
  if (error) { warn("getSelfRatings", error); return {}; }
  const out = {};
  (data || []).forEach(r => { out[r.skill_id] = r.value; });
  return out;
}

// ─────────────────────────────────────────────
// COACH RATINGS
// ─────────────────────────────────────────────
export async function saveCoachRatingsForPlayer(coachId, playerId, ratings, notes) {
  if (!supabase) return;
  const rows = Object.entries(ratings)
    .filter(([_, v]) => v)
    .map(([skill_id, value]) => ({
      coach_id: coachId, player_id: playerId, skill_id, value,
      note: notes?.[skill_id] || null,
      updated_at: new Date().toISOString(),
    }));
  if (!rows.length) return;
  const { error } = await supabase.from("coach_ratings").upsert(rows);
  if (error) throw error;
}

export async function getCoachRatingsForPlayer(playerId) {
  if (!supabase) return { ratings: {}, notes: {} };
  const { data, error } = await supabase.from("coach_ratings")
    .select("skill_id, value, note")
    .eq("player_id", playerId);
  if (error) { warn("getCoachRatingsForPlayer", error); return { ratings: {}, notes: {} }; }
  const ratings = {}, notes = {};
  (data || []).forEach(r => { ratings[r.skill_id] = r.value; if (r.note) notes[r.skill_id] = r.note; });
  return { ratings, notes };
}

// Private coach notes per player. Reuses the coach_ratings table with a
// sentinel skill_id so no new migration is needed — the RLS policies that
// already govern coach_ratings apply unchanged (coach can only read/write
// their own rows for players on a team they coach).
const COACH_NOTE_SENTINEL = "__general_notes__";

export async function saveCoachPlayerNote(coachId, playerId, note) {
  if (!supabase) return;
  const row = {
    coach_id: coachId,
    player_id: playerId,
    skill_id: COACH_NOTE_SENTINEL,
    value: "note",
    note: note || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("coach_ratings").upsert(row);
  if (error) throw error;
}

export async function getCoachPlayerNote(playerId) {
  if (!supabase) return "";
  const { data, error } = await supabase.from("coach_ratings")
    .select("note")
    .eq("player_id", playerId)
    .eq("skill_id", COACH_NOTE_SENTINEL)
    .maybeSingle();
  if (error) { warn("getCoachPlayerNote", error); return ""; }
  return data?.note || "";
}

// ─────────────────────────────────────────────
// ASSIGNMENTS (coach → team homework)
// ─────────────────────────────────────────────
// `target_players` is null when the assignment is for the whole team; a uuid[]
// when it's scoped to specific players. RLS enforces that only team members
// in the target audience can read the row.

export async function createAssignment(coachId, teamId, { title, description, dueDate, targetPlayers }) {
  if (!supabase) return null;
  const row = {
    coach_id: coachId,
    team_id: teamId,
    title: title?.trim(),
    description: description?.trim() || null,
    due_date: dueDate || null,
    target_players: Array.isArray(targetPlayers) && targetPlayers.length ? targetPlayers : null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("assignments").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateAssignment(assignmentId, patch) {
  if (!supabase) return null;
  const row = {
    ...patch,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("assignments").update(row).eq("id", assignmentId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteAssignment(assignmentId) {
  if (!supabase) return;
  const { error } = await supabase.from("assignments").delete().eq("id", assignmentId);
  if (error) throw error;
}

export async function getAssignmentsForTeam(teamId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from("assignments")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });
  if (error) { warn("getAssignmentsForTeam", error); return []; }
  return data || [];
}

// Player-side: RLS filters down to assignments where the player is a member
// of the team AND either the whole-team row or targeted explicitly.
export async function getAssignmentsForPlayer(playerId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from("assignments")
    .select("*, teams(name, level)")
    .order("created_at", { ascending: false });
  if (error) { warn("getAssignmentsForPlayer", error); return []; }
  return data || [];
}

export async function markAssignmentComplete(assignmentId, playerId, note) {
  if (!supabase) return;
  const row = {
    assignment_id: assignmentId,
    player_id: playerId,
    completed_at: new Date().toISOString(),
    note: note || null,
  };
  const { error } = await supabase.from("assignment_completions").upsert(row);
  if (error) throw error;
}

export async function unmarkAssignmentComplete(assignmentId, playerId) {
  if (!supabase) return;
  const { error } = await supabase.from("assignment_completions")
    .delete()
    .eq("assignment_id", assignmentId)
    .eq("player_id", playerId);
  if (error) throw error;
}

export async function getCompletionsForPlayer(playerId) {
  if (!supabase) return new Set();
  const { data, error } = await supabase.from("assignment_completions")
    .select("assignment_id")
    .eq("player_id", playerId);
  if (error) { warn("getCompletionsForPlayer", error); return new Set(); }
  return new Set((data || []).map(r => r.assignment_id));
}

export async function getCompletionsForAssignment(assignmentId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from("assignment_completions")
    .select("player_id, completed_at, note")
    .eq("assignment_id", assignmentId);
  if (error) { warn("getCompletionsForAssignment", error); return []; }
  return data || [];
}

// ─────────────────────────────────────────────
// TEAM CHALLENGES (coach-authored fixed quiz + team leaderboard)
// ─────────────────────────────────────────────

export async function createTeamChallenge(coachId, teamId, { title, questionIds, dueDate }) {
  if (!supabase) return null;
  const row = {
    coach_id: coachId,
    team_id: teamId,
    title: title?.trim(),
    question_ids: Array.isArray(questionIds) ? questionIds : [],
    due_date: dueDate || null,
  };
  const { data, error } = await supabase.from("team_challenges").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTeamChallenge(challengeId) {
  if (!supabase) return;
  const { error } = await supabase.from("team_challenges").delete().eq("id", challengeId);
  if (error) throw error;
}

export async function getTeamChallenges(teamId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from("team_challenges")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });
  if (error) { warn("getTeamChallenges", error); return []; }
  return data || [];
}

// Player-side: list every challenge visible to the player (RLS filters by
// team membership). Includes team name for card display.
export async function getChallengesForPlayer(playerId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from("team_challenges")
    .select("*, teams(name, level)")
    .order("created_at", { ascending: false });
  if (error) { warn("getChallengesForPlayer", error); return []; }
  return data || [];
}

export async function submitChallengeResult(challengeId, playerId, { score, results }) {
  if (!supabase) return;
  const row = {
    challenge_id: challengeId,
    player_id: playerId,
    score: Math.round(score),
    results,
  };
  const { error } = await supabase.from("challenge_results").upsert(row);
  if (error) throw error;
}

export async function getChallengeResults(challengeId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from("challenge_results")
    .select("player_id, score, completed_at, profiles(name)")
    .eq("challenge_id", challengeId)
    .order("score", { ascending: false });
  if (error) { warn("getChallengeResults", error); return []; }
  return (data || []).map(r => ({
    player_id: r.player_id,
    score: r.score,
    completed_at: r.completed_at,
    name: r.profiles?.name || "",
  }));
}

export async function getChallengeCompletionsForPlayer(playerId) {
  if (!supabase) return new Set();
  const { data, error } = await supabase.from("challenge_results")
    .select("challenge_id").eq("player_id", playerId);
  if (error) { warn("getChallengeCompletionsForPlayer", error); return new Set(); }
  return new Set((data || []).map(r => r.challenge_id));
}

// ─────────────────────────────────────────────
// TRAINING SESSIONS (off-ice log, coach-visible on TEAM tier)
// ─────────────────────────────────────────────
// Storage is dual-write: the player's local LS cache stays the primary
// record (it works offline and doesn't need auth), and each save fires a
// background upsert here so coaches can read the team's activity. Read
// shape mirrors utils/trainingLog.js so the CoachTrainingSection can use
// the same getTrainingSummary() helper against the remote rows.

export async function saveTrainingSessionRemote(playerId, session) {
  if (!supabase || !playerId) return;
  // Silent best-effort — a failed Supabase write must NOT break the LS save
  // the player already did. Coaches just see slightly stale data.
  try {
    const row = {
      player_id: playerId,
      session_date: session.date || new Date().toISOString().slice(0, 10),
      type: session.type,
      value: Number(session.value) || 0,
      unit: session.unit || "min",
      label: session.label || null,
      notes: session.notes || null,
      coach: session.coach || null,
      price: (session.price === null || session.price === undefined || session.price === "") ? null : Number(session.price),
    };
    await supabase.from("training_sessions").insert(row);
  } catch { /* silent */ }
}

export async function getTrainingSessionsForPlayer(playerId) {
  if (!supabase || !playerId) return [];
  const { data, error } = await supabase.from("training_sessions")
    .select("session_date, type, value, unit, label, notes, coach, price")
    .eq("player_id", playerId)
    .order("session_date", { ascending: false })
    .limit(200);
  if (error) { warn("getTrainingSessionsForPlayer", error); return []; }
  // Reshape to match the LS "sessions" array shape so existing summary
  // helpers work unchanged.
  return (data || []).map(r => ({
    date: r.session_date,
    type: r.type,
    value: Number(r.value),
    unit: r.unit,
    ...(r.label ? { label: r.label } : {}),
    ...(r.notes ? { notes: r.notes } : {}),
    ...(r.coach ? { coach: r.coach } : {}),
    ...(r.price ? { price: Number(r.price) } : {}),
  }));
}

// ─────────────────────────────────────────────
// QUIZ FEEDBACK (post-results "what would you like more of?" prompt)
// ─────────────────────────────────────────────
// Best-effort write — failures are swallowed so a Supabase hiccup never
// breaks the post-quiz experience. The card is purely opt-in anyway.
export async function recordQuizFeedback(playerId, { choice, note, score, level }) {
  if (!supabase || !playerId || !choice) return null;
  try {
    const { data, error } = await supabase.from("quiz_feedback").insert({
      player_id: playerId,
      choice,
      note: note ? note.trim().slice(0, 500) : null,
      score: Number.isFinite(score) ? Math.round(score) : null,
      level: level || null,
    }).select().single();
    if (error) { warn("recordQuizFeedback", error); return null; }
    return data;
  } catch (e) { warn("recordQuizFeedback", e); return null; }
}

// ─────────────────────────────────────────────
// QUESTION RESULTS (per-rep, source for the Hockey IQ score)
// ─────────────────────────────────────────────
import { computeHockeyIQ, WINDOW_DAYS } from "./utils/hockeyIQ.js";

export async function recordQuestionResult(playerId, {
  questionId, correct, timeTakenMs, difficulty, zone, skill, answeredAt,
}) {
  if (!supabase || !playerId) return null;
  const row = {
    player_id: playerId,
    question_id: questionId,
    correct: !!correct,
    time_taken_ms: Number.isFinite(timeTakenMs) ? Math.round(timeTakenMs) : null,
    difficulty: Number(difficulty) || 1,
    zone: zone || null,
    skill: skill || null,
    ...(answeredAt ? { answered_at: answeredAt } : {}),
  };
  const { data, error } = await supabase.from("question_results").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function getQuestionResultsWindow(playerId, days = WINDOW_DAYS) {
  if (!supabase || !playerId) return [];
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase.from("question_results")
    .select("correct, time_taken_ms, difficulty, zone, skill, answered_at")
    .eq("player_id", playerId)
    .gte("answered_at", since)
    .order("answered_at", { ascending: true });
  if (error) { warn("getQuestionResultsWindow", error); return []; }
  return (data || []).map(r => ({
    correct: r.correct,
    time_taken_ms: r.time_taken_ms,
    difficulty: r.difficulty,
    zone: r.zone,
    skill: r.skill,
    answered_at: r.answered_at,
  }));
}

// Returns { score, status, reps, ewma, trend, bestWindow }. See
// utils/hockeyIQ.js for the shape and formula. Pulls a 60-day window
// (2x WINDOW_DAYS) so the trend lookback can compute against fully
// populated EWMAs at asOf - 30d.
export async function calculateHockeyIQ(playerId) {
  if (!playerId) return { score: null, status: "calibrating", reps: 0, ewma: null, trend: null, bestWindow: null };
  const results = await getQuestionResultsWindow(playerId, WINDOW_DAYS * 2);
  return computeHockeyIQ(results, new Date());
}

// ─────────────────────────────────────────────
// QUESTION STATS (aggregate % correct across all users)
// ─────────────────────────────────────────────
// Telemetry — intentionally silent. Stats are best-effort and must never
// block or crash a session. No warn() here on purpose.
export async function recordQuestionAnswer(questionId, correct) {
  if (!supabase || !questionId) return;
  try {
    await supabase.rpc("record_question_answer", {
      p_question_id: questionId,
      p_correct: !!correct,
    });
  } catch { /* telemetry — silent by design */ }
}

// Telemetry — silent by design (see recordQuestionAnswer).
export async function recordQuestionAnswersBatch(answers) {
  if (!supabase || !answers?.length) return;
  try {
    await supabase.rpc("record_question_answers_batch", {
      p_answers: JSON.stringify(answers.map(a => ({ question_id: a.questionId, correct: !!a.correct })))
    });
  } catch { /* telemetry — silent by design */ }
}

export async function getQuestionStats() {
  if (!supabase) return {};
  const { data, error } = await supabase.from("question_stats").select("question_id, attempts, correct");
  if (error) { warn("getQuestionStats", error); return {}; }
  const out = {};
  (data || []).forEach(r => {
    out[r.question_id] = { attempts: r.attempts, correct: r.correct };
  });
  return out;
}

// ─────────────────────────────────────────────
// QUESTION REPORTS (users flag bad questions)
// ─────────────────────────────────────────────
export async function reportQuestion({ userId, questionId, level, reason, detail }) {
  if (!supabase) return false;
  const { error } = await supabase.from("question_reports").insert({
    user_id: userId || null,
    question_id: questionId,
    level,
    reason,
    detail: detail || null,
  });
  if (error) { warn("question_reports write", error); return false; }
  return true;
}

// ─────────────────────────────────────────────
// ADMIN: QUESTION REPORTS
// ─────────────────────────────────────────────
// RLS NOTE: The admin user needs a policy on question_reports that allows
// SELECT and UPDATE for their auth.uid(). Example policy:
//   CREATE POLICY "Admin can read all reports"
//     ON question_reports FOR SELECT
//     USING (auth.uid() = '<your-admin-user-uuid>');
//   CREATE POLICY "Admin can update all reports"
//     ON question_reports FOR UPDATE
//     USING (auth.uid() = '<your-admin-user-uuid>');

export async function getQuestionReports() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("question_reports")
    .select("*")
    .order("resolved", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) { warn("getQuestionReports", error); return []; }
  return data || [];
}

export async function resolveReport(reportId) {
  if (!supabase) return false;
  const { error } = await supabase
    .from("question_reports")
    .update({ resolved: true })
    .eq("id", reportId);
  if (error) { warn("question_reports write", error); return false; }
  return true;
}

// ─────────────────────────────────────────────
// ADMIN: REVIEW QUESTIONS (curation workspace)
// ─────────────────────────────────────────────
// Admin-only RLS via auth.jwt() ->> 'email' = mtslifka@gmail.com.
// See supabase/migration_0004_review_questions.sql.

export async function listReviewQuestions() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("review_questions")
    .select("*")
    .order("age", { ascending: true })
    .order("id", { ascending: true });
  if (error) { warn("listReviewQuestions", error); return []; }
  return data || [];
}

export async function updateReviewQuestionCurrent(id, current) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("review_questions")
    .update({ current, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) { warn("updateReviewQuestionCurrent", error); return null; }
  return data;
}

export async function setReviewQuestionStatus(id, status) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("review_questions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) { warn("setReviewQuestionStatus", error); return null; }
  return data;
}

export async function resetReviewQuestion(id) {
  if (!supabase) return null;
  // Fetch original first, then overwrite current with it and clear status.
  const { data: row, error: fErr } = await supabase
    .from("review_questions")
    .select("original")
    .eq("id", id)
    .single();
  if (fErr || !row) { warn("resetReviewQuestion.fetch", fErr); return null; }
  const newCurrent = row.original || { type: "mc", cat: "", sit: "", opts: [], ok: 0, tip: "" };
  const { data, error } = await supabase
    .from("review_questions")
    .update({ current: newCurrent, status: "unreviewed", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) { warn("resetReviewQuestion.update", error); return null; }
  return data;
}

export async function createReviewQuestion({ age, level, current, id }) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("review_questions")
    .insert({
      id,
      age,
      level,
      original: null,
      current,
      status: "unreviewed",
      created_in_tool: true,
    })
    .select()
    .single();
  if (error) { warn("createReviewQuestion", error); return null; }
  return data;
}
