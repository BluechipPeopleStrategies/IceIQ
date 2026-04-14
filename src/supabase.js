import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
  if (error) return null;
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
  const { data } = await supabase.from("teams").select("*").eq("coach_id", coachId).order("created_at", { ascending: false });
  return data || [];
}

export async function getPlayerTeams(playerId) {
  if (!supabase) return [];
  const { data } = await supabase.from("team_members")
    .select("team_id, teams(*)")
    .eq("player_id", playerId);
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
  const { data } = await supabase.from("team_members")
    .select("player_id, profiles(*)")
    .eq("team_id", teamId);
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
  const { data } = await supabase.from("quiz_sessions")
    .select("*").eq("player_id", playerId).order("completed_at", { ascending: true });
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
  const { data } = await supabase.from("goals").select("*").eq("player_id", playerId);
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
  const { data } = await supabase.from("self_ratings").select("skill_id, value").eq("player_id", playerId);
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
  const { data } = await supabase.from("coach_ratings")
    .select("skill_id, value, note")
    .eq("player_id", playerId);
  const ratings = {}, notes = {};
  (data || []).forEach(r => { ratings[r.skill_id] = r.value; if (r.note) notes[r.skill_id] = r.note; });
  return { ratings, notes };
}
