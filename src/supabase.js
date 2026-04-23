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
  if (error) console.warn(`[IceIQ/supabase] ${context}:`, error.message || error);
}

if (!url || !key) {
  console.warn("[IceIQ] Supabase env vars missing — auth/sync disabled. Copy .env.example to .env and fill in your Supabase project URL and anon key.");
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
