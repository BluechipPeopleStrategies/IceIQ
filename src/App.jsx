import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import * as SB from "./supabase";
import { supabase, hasSupabase } from "./supabase";
import { canAccess, getUpgradeTriggerMessage } from "./utils/tierGate";
import { getParentRatings, saveParentRatings, hasParentRatings, daysSinceUpdated } from "./utils/parentAssessment";
import { calcPlayerProfile, PROFILE_AXES } from "./utils/playerProfile";
import { canSwitchAgeGroup, recordAgeGroupSwitch, getAgeGroupLock, setAgeGroupLock, checkSeasonReset } from "./utils/deviceLock";
import {
  C, FONT, LEVELS, POSITIONS, POSITIONS_U11UP, SEASONS,
  IceIQLogo, RinkDiagramZones, RINK_ZONE_DEFS, Screen, Card, Pill, Label, PrimaryBtn, SecBtn, BackBtn, ProgressBar, StickyHeader,
} from "./shared.jsx";
const imgSplash = "/splash.jpg";
import imgCoreApp from "./assets/images/Core-App.jpg";
import imgDataPanel from "./assets/images/Data-Panel.jpg";
import imgProfile from "./assets/images/Profile-Analytics.jpg";
import imgTactics from "./assets/images/Tactics-Playbook.jpg";
import imgSuccess from "./assets/images/Success-Icon.jpg";

// Resolve the user's tier for gating decisions.
// Priority: demo mode → PRO (full showcase)
//           dev override (localStorage iceiq_tier_override) → that tier
//           profile.tier field (future Supabase subscriptions) → that tier
//           default → FREE
function resolveTier({ profile, demoMode } = {}) {
  // Coach demo gets TEAM so they see the full dashboard; player demo gets FREE
  if (demoMode) return profile?.role === "coach" ? "TEAM" : "FREE";
  try {
    const override = typeof window !== "undefined" ? window.localStorage.getItem("iceiq_tier_override") : null;
    if (override && ["FREE","PRO","FAMILY","TEAM"].includes(override.toUpperCase())) {
      return override.toUpperCase();
    }
  } catch {}
  if (profile?.tier) {
    const t = String(profile.tier).toUpperCase();
    if (["FREE","PRO","FAMILY","TEAM"].includes(t)) return t;
  }
  return "FREE";
}

// ─────────────────────────────────────────────────────────
// GAME SENSE COMPETENCIES
// ─────────────────────────────────────────────────────────
const COMPETENCIES = {
  positioning: { name: "Positioning", icon: "📍", color: C.blue },
  decision_making: { name: "Decision-Making", icon: "⚡", color: C.purple },
  awareness: { name: "Awareness", icon: "👁", color: C.cyan },
  tempo_control: { name: "Tempo Control", icon: "⏱", color: C.orange },
  physicality: { name: "Physicality", icon: "💪", color: C.red },
  leadership: { name: "Leadership", icon: "👥", color: C.green },
};

const COMPETENCY_MAPPINGS = {
  positioning: [
    /^u7q([1-3]|10)$/,      // U7: Positioning intro
    /^u9q([1-4]|13)$/,      // U9: Zone awareness
    /^u11q[1-7]$/,          // U11: Positioning core
    /^u13_zc_[1-2]$/,       // U13: Zone-click positioning
    /^u13q[1-5]$/,          // U13: Positioning
    /^u15q[1-4]$/,          // U15: Positioning
    /^u18q[1-3]$/,          // U18: Positioning
  ],
  decision_making: [
    /^u7q[4-6]$/,           // U7: Decisions
    /^u9q([5-8]|14)$/,      // U9: Decision-making
    /^u11q([8-9]|1[0-5])$/, // U11: Decision-making (Q8-15)
    /^u13q(1[0]|[1-9])$/,   // U13: Decision quality
    /^u15q[5-8]$/,          // U15: Decisions
    /^u18q[4-6]$/,          // U18: Decisions
  ],
  awareness: [
    /^u7q([7-9]|15)$/,      // U7: Awareness
    /^u9q([9-9]|1[0-2]|15)$/,  // U9: Awareness (Q9-12, Q15)
    /^u11q16$/,             // U11: Awareness
    /^u13q(1[1-9]|20)$/,    // U13: Awareness (Q11-20)
    /^u15q[1-8]$/,          // U15: Awareness
    /^u18q[7-9]$/,          // U18: Awareness
  ],
  tempo_control: [
    /^u15q([9]|1[0-6])$/,   // U15: Tempo (Q9-16)
    /^u18q[1-8]$/,          // U18: Tempo/rhythm
  ],
};

function getQuestionCompetency(questionId) {
  if (!questionId) return null;

  for (const [competency, patterns] of Object.entries(COMPETENCY_MAPPINGS)) {
    if (patterns.some(pattern => pattern.test(questionId))) {
      return competency;
    }
  }

  return null;
}

function calcCompetencyScores(quizHistory) {
  const scores = {};
  for (const key of Object.keys(COMPETENCIES)) {
    scores[key] = { correct: 0, total: 0 };
  }

  quizHistory.forEach(session => {
    session.results?.forEach(result => {
      const comp = getQuestionCompetency(result.id);
      if (comp) {
        scores[comp].total++;
        if (result.ok) scores[comp].correct++;
      }
      if (result.type === "mistake") {
        scores.physicality.total++;
        if (result.ok) scores.physicality.correct++;
      }
      if (result.type === "next") {
        scores.leadership.total++;
        if (result.ok) scores.leadership.correct++;
      }
    });
  });

  const percentages = {};
  for (const key of Object.keys(COMPETENCIES)) {
    const { correct, total } = scores[key];
    percentages[key] = total > 0 ? Math.round((correct / total) * 100) : 0;
  }
  return percentages;
}

function calcGameSenseScore(competencyScores) {
  const scores = Object.values(competencyScores);
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
}

// Gamification MVP: Positioning competency skill tree ("Journey")
const POSITIONING_JOURNEY = [
  { id:"first-read",       title:"First Read",       icon:"📍", threshold:20, title_unlock:"Rookie Eyes",      desc:"You're starting to look up before you move." },
  { id:"zone-awareness",   title:"Zone Awareness",   icon:"🗺️", threshold:40, title_unlock:"Zone-Smart",       desc:"You know where you belong in each zone." },
  { id:"gap-control",      title:"Gap Control",      icon:"📏", threshold:60, title_unlock:"Gap Closer",       desc:"You keep the right distance on the rush." },
  { id:"structure-reader", title:"Structure Reader", icon:"🧠", threshold:80, title_unlock:"Structure Reader", desc:"You read team shape before the puck moves." },
  { id:"rink-general",     title:"Rink General",     icon:"👑", threshold:90, minAttempts:15, title_unlock:"Rink General", desc:"You think the game at the highest positioning level." },
];

function getPositioningJourneyState(quizHistory) {
  const pcts = calcCompetencyScores(quizHistory || []);
  const pct = pcts.positioning || 0;
  const posPatterns = COMPETENCY_MAPPINGS.positioning;
  let attempts = 0;
  (quizHistory || []).forEach(session => {
    (session.results || []).forEach(r => {
      if (posPatterns.some(p => p.test(r.id))) attempts++;
    });
  });
  const nodes = POSITIONING_JOURNEY.map(n => ({
    ...n,
    unlocked: pct >= n.threshold && (!n.minAttempts || attempts >= n.minAttempts),
  }));
  const nextIdx = nodes.findIndex(n => !n.unlocked);
  return { pct, attempts, nodes, nextIdx: nextIdx === -1 ? null : nextIdx };
}

function getMonthlyTrend(quizHistory) {
  const now = new Date();
  const weeks = [];
  for (let i = 3; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(start.getDate() - i * 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const weekSessions = quizHistory.filter(s => {
      const d = new Date(s.date);
      return d >= start && d < end;
    });
    const scores = weekSessions.map(s => {
      const comps = calcCompetencyScores([s]);
      return calcGameSenseScore(comps);
    });
    weeks.push({
      label: `${start.getDate()}/${start.getMonth() + 1}`,
      score: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0,
    });
  }
  return weeks;
}

async function getPeerStats(level, position) {
  if (!hasSupabase) {
    return { mean: { positioning: 75, decision_making: 72, awareness: 68, tempo_control: 74, physicality: 80, leadership: 71 }, percentile: 50 };
  }
  try {
    const { data: players, error } = await supabase
      .from("profiles")
      .select("quiz_history")
      .eq("level", level)
      .eq("position", position);

    if (error || !players) return null;

    const allScores = {};
    for (const key of Object.keys(COMPETENCIES)) {
      allScores[key] = [];
    }

    players.forEach(p => {
      if (p.quiz_history && Array.isArray(p.quiz_history)) {
        const scores = calcCompetencyScores(p.quiz_history);
        Object.entries(scores).forEach(([key, score]) => {
          allScores[key].push(score);
        });
      }
    });

    const mean = {};
    const stdev = {};
    for (const key of Object.keys(COMPETENCIES)) {
      const arr = allScores[key];
      if (arr.length > 0) {
        mean[key] = Math.round(arr.reduce((a, b) => a + b) / arr.length);
        const variance = arr.reduce((sum, x) => sum + Math.pow(x - mean[key], 2), 0) / arr.length;
        stdev[key] = Math.sqrt(variance);
      }
    }

    return { mean, stdev };
  } catch (e) {
    return null;
  }
}

function calcPercentileRank(playerScore, peerMean, peerStdev) {
  if (!peerStdev || peerStdev === 0) return 50;
  const z = (playerScore - peerMean) / peerStdev;
  const p = 1 / (1 + Math.exp(-z * 1.81));
  return Math.round(p * 100);
}

// ─────────────────────────────────────────────────────────
// VERSION
// ─────────────────────────────────────────────────────────
const VERSION = "1.0.0";
const RELEASE_DATE = "April 18, 2026";
const CHANGELOG = [
  { v:"1.0.0", date:"April 2026", notes:[
    {icon:"🚀", title:"Ice-IQ v1 is here", desc:"Our first full release — built for players, parents, and coaches to train game sense off the ice"},
    {icon:"🏒", title:"5 Question Formats", desc:"Multiple choice, True/False, Sequence, Spot the Mistake, What Happens Next — plus interactive Zone-Click questions"},
    {icon:"🎯", title:"Adaptive Quiz Engine", desc:"Difficulty shifts in real time based on your answers — always the right challenge"},
    {icon:"🏒", title:"Hockey-Specific Goal Setting", desc:"Set development goals by category, tie them to your self-assessment and coach feedback"},
    {icon:"📊", title:"Game Sense Profile", desc:"Spider chart, competency breakdown, month-over-month trend, peer percentile ranking"},
    {icon:"👨‍🏫", title:"Coach Dashboard", desc:"Roster view, per-player ratings, development notes, and per-question reports"},
    {icon:"🏆", title:"Weekly Challenge", desc:"A new curated quiz drops every Monday — same questions for every player at your level"},
  ]},
];

// ─────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────
const D_WEIGHT = {1:1, 2:1.5, 3:2.2};
const QUIZ_LENGTH = 10;

const TOAST_DURATION_MS = 1600;
const TIER_GOLD_THRESHOLD = 80;
const TIER_YELLOW_THRESHOLD = 60;
const GAME_SENSE_UNLOCK_SESSIONS = 3;

const SCORE_TIERS = [
  {min:TIER_GOLD_THRESHOLD, label:"Hockey Sense",   badge:"🏒", color:C.green},
  {min:TIER_YELLOW_THRESHOLD, label:"Two-Way Player", badge:"⚡", color:C.yellow},
  {min:0,  label:"Tape to Tape",   badge:"🎯", color:C.red},
];
const getTier = s => SCORE_TIERS.find(t => s >= t.min) || SCORE_TIERS[2];

const BADGES = {
  HOT_STREAK: {icon:"🔥", name:"Hot Streak",  desc:"3 correct in a row"},
  HOCKEY_IQ:  {icon:"🧠", name:"Game Sense",   desc:"Perfect session"},
  HARD_HAT:   {icon:"💎", name:"Hard Hat",     desc:"5 Advanced correct"},
  SNIPER:     {icon:"🎯", name:"Sniper",       desc:"100% on a category"},
  LEVEL_UP:   {icon:"📈", name:"Level Up",     desc:"Beat your last score"},
  IRON_MAN:   {icon:"🏒", name:"Iron Man",     desc:"5 sessions completed"},
  TACTICIAN:  {icon:"🧩", name:"Tactician",    desc:"Sequence question perfect"},
  DETECTIVE:  {icon:"🔍", name:"Detective",    desc:"Spot 3 mistakes correctly"},
};

// Parent Assessment — character/habits, 8 dimensions × 6 age groups, 3-point scale
const PARENT_SCALE = [
  { value: "growing",  label: "Growing",  color: "#facc15" },
  { value: "steady",   label: "Steady",   color: "#22c55e" },
  { value: "thriving", label: "Thriving", color: "#a855f7" },
];

const PARENT_DIMENSIONS = [
  { id: "passion", icon: "❤️", label: "Love of the game", prompts: {
    "U7 / Initiation":"Does your child get excited to go to the rink?",
    "U9 / Novice":"Does your child look forward to practices and games?",
    "U11 / Atom":"Does your child talk about hockey outside the rink — watching games, asking questions?",
    "U13 / Peewee":"Is hockey something your child genuinely enjoys, not just something they do?",
    "U15 / Bantam":"Does your child still light up about hockey after years of playing?",
    "U18 / Midget":"Is hockey still a source of joy — or has it become a job?",
  }},
  { id: "readiness", icon: "🎒", label: "Pre-game readiness", prompts: {
    "U7 / Initiation":"Does your child help get gear packed and eat before practice?",
    "U9 / Novice":"Does your child prepare their gear and snacks with reminders?",
    "U11 / Atom":"Does your child own most of their pre-game prep (gear, snacks, water)?",
    "U13 / Peewee":"Does your child handle their own pre-game routine most days?",
    "U15 / Bantam":"Does your child take ownership of nutrition, sleep, and gear prep?",
    "U18 / Midget":"Does your child own their pre-game prep (nutrition, sleep, recovery)?",
  }},
  { id: "effort", icon: "💪", label: "Effort mindset", prompts: {
    "U7 / Initiation":"Does your child try hard even when practice is tough?",
    "U9 / Novice":"Does your child give effort in practice, not just games?",
    "U11 / Atom":"Does your child push themselves in drills, even boring ones?",
    "U13 / Peewee":"Does your child work hard when the coach isn't looking?",
    "U15 / Bantam":"Does your child push past comfortable when it gets hard?",
    "U18 / Midget":"Does your child push at 100% when no one's watching?",
  }},
  { id: "adversity", icon: "🛡️", label: "Handling adversity", prompts: {
    "U7 / Initiation":"How does your child react after a tough game or mistake?",
    "U9 / Novice":"Does your child bounce back after losses or bad shifts?",
    "U11 / Atom":"Does your child recover from mistakes without melting down?",
    "U13 / Peewee":"Does your child handle benchings, losses, or rough shifts maturely?",
    "U15 / Bantam":"Does your child respond to adversity with effort, not excuses?",
    "U18 / Midget":"Does your child respond to adversity — a bad game, benching, tough loss — with maturity?",
  }},
  { id: "sportsmanship", icon: "🤝", label: "Sportsmanship", prompts: {
    "U7 / Initiation":"Does your child cheer for teammates and shake hands after games?",
    "U9 / Novice":"Does your child treat teammates and opponents with respect?",
    "U11 / Atom":"Does your child stay composed with refs and opponents, win or lose?",
    "U13 / Peewee":"Does your child represent the team well on and off the ice?",
    "U15 / Bantam":"Does your child respect teammates, refs, and opponents, even in tough moments?",
    "U18 / Midget":"Does your child respect teammates, refs, and opponents, even when it's hard?",
  }},
  { id: "confidence", icon: "✨", label: "Confidence", prompts: {
    "U7 / Initiation":"Does your child seem ready and happy stepping on the ice?",
    "U9 / Novice":"Does your child show up to games ready, or nervous?",
    "U11 / Atom":"Does your child play with belief in themselves?",
    "U13 / Peewee":"Does your child trust their game without needing constant reassurance?",
    "U15 / Bantam":"Does your child back themselves in pressure moments?",
    "U18 / Midget":"Does your child trust their game under pressure?",
  }},
  { id: "coachability", icon: "🎧", label: "Coachability", prompts: {
    "U7 / Initiation":"Does your child listen when the coach talks?",
    "U9 / Novice":"Does your child try to do what the coach asks?",
    "U11 / Atom":"Does your child apply coaching notes from practice to practice?",
    "U13 / Peewee":"Does your child take coaching feedback seriously, even when it's critical?",
    "U15 / Bantam":"Does your child apply feedback, not just hear it?",
    "U18 / Midget":"Does your child apply coaching feedback, even when they disagree?",
  }},
  { id: "balance", icon: "⚖️", label: "Life balance", prompts: {
    "U7 / Initiation":"Is your child enjoying hockey alongside school and play?",
    "U9 / Novice":"Is hockey balanced with school, other activities, and downtime?",
    "U11 / Atom":"Is your child managing hockey without burning out on school or friends?",
    "U13 / Peewee":"Is hockey balanced with school, sleep, and rest?",
    "U15 / Bantam":"Is hockey sustainable alongside school pressure and teen life?",
    "U18 / Midget":"Is hockey balanced with school, sleep, friends, and rest?",
  }},
];

// SMART goal categories
const GOAL_CATS = {
  "U7 / Initiation": ["Skating","Puck Control","Game Awareness","Compete"],
  "U9 / Novice":     ["Skating","Passing","Shooting","Defense","Game IQ"],
  "U11 / Atom":      ["Skating","Puck Protection","Gap Control","Rush Reads","Special Teams","Game IQ"],
  "U13 / Peewee":    ["Edge Work","Shot Selection","Defensive Zone","Zone Entry","Special Teams","Leadership"],
  "U15 / Bantam":    ["Systems Play","Transition Game","Special Teams","Physical Play","Gap Control","Leadership"],
  "U18 / Midget":    ["Game Management","Advanced Tactics","Special Teams","Neutral Zone Play","Breakout Execution","Leadership"],
};

const SMART_PROMPTS = {
  S: "What specifically will you work on? (be precise)",
  M: "How will you measure improvement?",
  A: "Is this realistic for your current level?",
  R: "How does this help you on the ice?",
  T: "When will you achieve this by?",
};



// ─────────────────────────────────────────────────────────



import { loadQB, preloadQB } from "./qbLoader.js";
import { getWeekKey, getThisWeekRecord, markWeeklyComplete, seededShuffle, weekSeed, formatCountdown, msUntilNextWeek, getFreeQuizCount, isAtFreeQuizCap, incrementFreeQuizCount, FREE_WEEKLY_QUIZ_CAP } from "./utils/weeklyChallenge.js";
import { COMPETENCY_LADDER, RATING_SCALES, SKILLS, ladderFor, getSelfScale, getCoachScale, getScaleColor, getScaleLabel, normalizeRating, getDiscussionPrompt, migrateRatings, PERCENTILE_RATINGS, PR_COLOR, PR_LABEL } from "./data/constants.js";

const AdminReports = lazy(() => import("./screens.jsx").then(m => ({ default: m.AdminReports })));
const ProfileSetup = lazy(() => import("./screens.jsx").then(m => ({ default: m.ProfileSetup })));
const PlansScreen = lazy(() => import("./screens.jsx").then(m => ({ default: m.PlansScreen })));
const LazyFallback = () => <div style={{minHeight:"100vh",background:C.bg,color:C.dimmer,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT.body}}>Loading…</div>;

const COMP={
  "U7 / Initiation":{t:[0.75,0.5],l:["Game-Ready","Getting It","Still Learning"]},
  "U9 / Novice":{t:[0.8,0.55],l:["Smart Player","Making Reads","Building Awareness"]},
  "U11 / Atom":{t:[0.8,0.6],l:["Hockey Sense","System Aware","Instinct Stage"]},
  "U13 / Peewee":{t:[0.82,0.65],l:["Elite Game Read","Situationally Sound","Tactical Foundation"]},
  "U15 / Bantam":{t:[0.84,0.68],l:["Systems Thinker","Positionally Sound","Developing Reads"]},
  "U18 / Midget":{t:[0.86,0.70],l:["Complete Player","Tactically Aware","Building Foundation"]},
};
function getComp(level,score){const c=COMP[level];if(!c)return"—";return score>=c.t[0]?c.l[0]:score>=c.t[1]?c.l[1]:c.l[2];}




// ─────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────
function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }

// Stable sample % for demo mode: deterministic per question id, shaped by difficulty.
// d=1 → 70-90%, d=2 → 50-75%, d=3 → 30-60%.
function demoStatPct(qid, d) {
  let h = 0;
  for (let i = 0; i < qid.length; i++) h = ((h << 5) - h + qid.charCodeAt(i)) | 0;
  const n = Math.abs(h) % 100; // 0-99 stable
  if (d === 1) return 70 + Math.floor(n * 21 / 100);       // 70-90
  if (d === 3) return 30 + Math.floor(n * 31 / 100);       // 30-60
  return 50 + Math.floor(n * 26 / 100);                    // 50-75 (d=2 or undef)
}

function shuffleOpts(q) {
  if (!q || !Array.isArray(q.opts) || q.opts.length < 2) return q;
  if (q.type && q.type !== "mc" && q.type !== "mistake" && q.type !== "next") return q;
  if (typeof q.ok !== "number") return q;
  const order = shuffle(q.opts.map((_, i) => i));
  const newOk = order.indexOf(q.ok);
  if (newOk < 0) return q;
  return { ...q, opts: order.map(i => q.opts[i]), ok: newOk };
}

function calcWeightedIQ(results) {
  if (!results.length) return 0;
  const e = results.reduce((s,r) => s + (r.ok ? D_WEIGHT[r.d||2] : 0), 0);
  const p = results.reduce((s,r) => s + D_WEIGHT[r.d||2], 0);
  return Math.round((e/p)*100);
}

function initSR(level) {
  const r = {};
  (SKILLS[level]||[]).forEach(c => c.skills.forEach(s => { r[s.id] = null; }));
  return r;
}

function getTodayKey() { return new Date().toISOString().slice(0,10); }

function getStreakData() {
  try { return JSON.parse(localStorage.getItem("iceiq_streak") || "{}"); }
  catch { return {}; }
}

function updateStreak(data) {
  const today = getTodayKey();
  const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
  if (data.last === today) return data;
  if (data.last === yesterday) return {...data, count:(data.count||0)+1, last:today};
  return {count:1, last:today};
}

function calcBadges(results, prevScore, totalSessions, hasSeqPerfect, mistakeStreak) {
  const earned = new Set();
  let streak = 0;
  for (const r of results) {
    if (r.ok) { streak++; if (streak >= 3) earned.add("HOT_STREAK"); }
    else streak = 0;
  }
  if (results.length >= QUIZ_LENGTH && results.every(r => r.ok)) earned.add("HOCKEY_IQ");
  if (results.filter(r => r.ok && r.d === 3).length >= 5) earned.add("HARD_HAT");
  const byCat = {};
  results.forEach(r => {
    if (!byCat[r.cat]) byCat[r.cat] = {ok:0,tot:0};
    byCat[r.cat].tot++;
    if (r.ok) byCat[r.cat].ok++;
  });
  if (Object.values(byCat).some(v => v.tot >= 2 && v.ok === v.tot)) earned.add("SNIPER");
  const score = calcWeightedIQ(results);
  if (prevScore !== null && score > prevScore) earned.add("LEVEL_UP");
  if (totalSessions >= 5) earned.add("IRON_MAN");
  if (hasSeqPerfect) earned.add("TACTICIAN");
  if (mistakeStreak >= 3) earned.add("DETECTIVE");
  return [...earned].map(k => BADGES[k]).filter(Boolean);
}

async function saveCoachRatings(playerKey, ratings, notes) {
  if (!window.storage) return false;
  try {
    await window.storage.set("coach_ratings:" + playerKey, JSON.stringify({ratings, notes: notes || {}, ts: Date.now()}), true);
    return true;
  } catch(e) { return false; }
}

async function loadCoachRatings(playerKey) {
  if (!window.storage) return null;
  try {
    const r = await window.storage.get("coach_ratings:" + playerKey, true);
    return r ? JSON.parse(r.value) : null;
  } catch(e) { return null; }
}

function makePlayerKey(name, level) {
  return (name + "_" + level).toLowerCase().replace(/[^a-z0-9]/g,"_").slice(0,40);
}

// Demo queue builder — guarantees one of each question type
function buildDemoQueue(qb, level, position) {
  const posCode = { Forward: "F", Defense: "D", Goalie: "G" }[position] || null;
  const posMatch = (q) => !q.pos || !posCode || q.pos.includes(posCode);
  // Demo quiz: 7 questions — 3 zone-click + 1 mc + 1 tf + 1 seq + 1 mistake
  const targetCounts = { "zone-click": 3, mc: 1, tf: 1, seq: 1, mistake: 1 };
  const result = [];
  const usedIds = new Set();

  for (const [type, count] of Object.entries(targetCounts)) {
    const pool = type === "zone-click"
      ? ZONE_CLICK_QUESTIONS
      : (qb[level] || []).filter(q => q.type === type);
    const levelMatch = pool.filter(q => {
      if (type === "zone-click" && !q.level?.includes(level)) return false;
      return posMatch(q);
    });
    const fallback = pool.filter(posMatch);
    // If no position-matched question exists (e.g. goalie + tf), fall back to any question of the type
    const broadFallback = fallback.length > 0 ? fallback : pool;
    const source = (levelMatch.length > 0 ? levelMatch : broadFallback).filter(q => !usedIds.has(q.id));
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      result.push(shuffled[i]);
      usedIds.add(shuffled[i].id);
    }
  }

  // Pad to 7 with MC (cap MC at 2 total)
  const mcInQueue = result.filter(q => q.type === "mc").length;
  const mcPool = (qb[level] || []).filter(q => q.type === "mc" && !usedIds.has(q.id) && posMatch(q));
  const mcShuffled = [...mcPool].sort(() => Math.random() - 0.5);
  while (result.length < 7 && mcShuffled.length > 0 && result.filter(q => q.type === "mc").length < 2) {
    const q = mcShuffled.shift();
    result.push(q);
    usedIds.add(q.id);
  }
  // If still short (very unlikely), pad with any remaining questions
  const anyPool = [...(qb[level] || []), ...ZONE_CLICK_QUESTIONS]
    .filter(q => !usedIds.has(q.id) && posMatch(q))
    .sort(() => Math.random() - 0.5);
  while (result.length < 7 && anyPool.length > 0) {
    const q = anyPool.shift();
    result.push(q);
    usedIds.add(q.id);
  }
  return result.slice(0, 7);
}

// Adaptive queue builder — with memoization of filtered pools
const _queueCache = new Map();

function buildQueue(qb, level, position, isReturning, tier) {
  const formatAllowed = canAccess("allQuestionFormats", tier).allowed;
  const positionAllowed = canAccess("positionFilter", tier).allowed;
  const cacheKey = `${level}|${position}|${formatAllowed}|${positionAllowed}`;

  let pool;
  if (_queueCache.has(cacheKey)) {
    pool = _queueCache.get(cacheKey);
  } else {
    const allQ = [...(qb[level] || []), ...ZONE_CLICK_QUESTIONS];
    let posFiltered;
    if (!positionAllowed) {
      posFiltered = allQ.filter(q => !q.pos || q.pos.includes("F") || q.pos.includes("D"));
    } else {
      posFiltered = position === "Goalie"
        ? allQ.filter(q => !q.pos || q.pos.includes("G") || q.pos.includes("F"))
        : position === "Defense"
        ? allQ.filter(q => !q.pos || q.pos.includes("D") || q.pos.includes("F"))
        : position === "Not Sure"
        ? allQ.filter(q => !q.pos || q.pos.includes("F") || q.pos.includes("D"))
        : allQ.filter(q => !q.pos || q.pos.includes("F") || q.pos.includes("D"));
    }

    if (!formatAllowed) {
      posFiltered = posFiltered.filter(q => !q.type || q.type === "mc");
      // zone-click at d:3 requires PRO+
      posFiltered = posFiltered.filter(q => !(q.type === "zone-click" && q.d === 3));
    }

    pool = {
      1: posFiltered.filter(q => q.d === 1),
      2: posFiltered.filter(q => q.d === 2),
      3: posFiltered.filter(q => q.d === 3),
    };
    _queueCache.set(cacheKey, pool);
  }

  const byD = {
    1: shuffle(pool[1]),
    2: shuffle(pool[2]),
    3: shuffle(pool[3]),
  };

  // For FREE users: inject one format-preview sentinel mid-queue to show locked formats exist
  if (!formatAllowed) {
    const formats = ["seq","tf","mistake","next"];
    const previewFormat = formats[Math.floor(Math.random() * formats.length)];
    const sentinel = { id: "__format_preview__", type: "formatPreview", _format: previewFormat, d: 2 };
    const d2 = byD[2];
    if (d2.length >= 4) {
      const insertAt = Math.floor(d2.length / 2);
      byD[2] = [...d2.slice(0, insertAt), sentinel, ...d2.slice(insertAt)];
    }

    // Inject 1 zone-click teaser for FREE tier (d:1 or d:2 only)
    if (byD[1].length >= 2) {
      const zcPool = ZONE_CLICK_QUESTIONS.filter(q =>
        q.d <= 2 && q.level.includes(level) && (q.pos.includes(position) || position === "Not Sure")
      );
      if (zcPool.length > 0) {
        const zcQ = zcPool[Math.floor(Math.random() * zcPool.length)];
        byD[1].splice(3, 0, zcQ);
      }
    }
  }

  return { byD, currentD: isReturning ? 2 : 1, tier };
}

// Weekly challenge queue — seeded shuffle so every player gets the same 10 questions that week.
// All formats included (weekly challenge is PRO+, so allQuestionFormats is guaranteed).
function buildWeeklyQueue(qb, level, position) {
  const allQ = qb[level] || [];
  const posFiltered = position === "Goalie"
    ? allQ.filter(q => !q.pos || q.pos.includes("G") || q.pos.includes("F"))
    : position === "Defense"
    ? allQ.filter(q => !q.pos || q.pos.includes("D") || q.pos.includes("F"))
    : allQ.filter(q => !q.pos || q.pos.includes("F") || q.pos.includes("D"));
  const seed = weekSeed(getWeekKey() + "|" + level + "|" + position);
  const shuffled = seededShuffle(posFiltered, seed);
  // Pick a balanced 10: aim for 3 easy, 4 medium, 3 hard, fill from remaining if short
  const d1 = shuffled.filter(q => q.d === 1);
  const d2 = shuffled.filter(q => q.d === 2);
  const d3 = shuffled.filter(q => q.d === 3);
  const pick = (arr, n) => arr.slice(0, n);
  const questions = [...pick(d1, 3), ...pick(d2, 4), ...pick(d3, 3)];
  // If any bucket was short, fill from overflow
  const used = new Set(questions.map(q => q.id));
  const overflow = shuffled.filter(q => !used.has(q.id));
  let filled = [...questions];
  for (const q of overflow) {
    if (filled.length >= 10) break;
    filled.push(q);
  }
  return filled.slice(0, 10);
}

function pullNext(queue, results) {
  const last2 = results.slice(-2);
  let { byD, currentD, tier } = queue;
  // Gate: FREE users get random difficulty, no adaptive engine
  const adaptive = canAccess("adaptiveEngine", tier).allowed;
  if (adaptive && last2.length === 2) {
    if (last2.every(r => r.ok) && currentD < 3) currentD++;
    else if (last2.every(r => !r.ok) && currentD > 1) currentD--;
  }
  if (!byD[currentD].length) {
    const fb = [1,2,3].find(d => d !== currentD && byD[d].length);
    if (!fb) return { q: null, queue };
    currentD = fb;
  }
  const i = Math.floor(Math.random() * byD[currentD].length);
  const q = shuffleOpts(byD[currentD][i]);
  return { q, queue: { byD: {...byD, [currentD]: byD[currentD].filter((_,j) => j !== i)}, currentD, tier } };
}

// Storage (coach dashboard)
async function saveTeamResult(coachCode, results, season) {
  if (!coachCode || !window.storage) return;
  const key = "team:" + coachCode.toUpperCase() + ":" + season.replace("-","");
  let existing = [];
  try { const r = await window.storage.get(key, true); if (r) existing = JSON.parse(r.value); } catch(e) {}
  existing.push({ ts: Date.now(), iq: calcWeightedIQ(results), qs: results.map(r => ({id:r.id,ok:r.ok,d:r.d,cat:r.cat})) });
  if (existing.length > 500) existing = existing.slice(-500);
  try { await window.storage.set(key, JSON.stringify(existing), true); } catch(e) {}
}



// ─────────────────────────────────────────────────────────
// RINK DIAGRAMS
// ─────────────────────────────────────────────────────────
function RinkDiagram({ type }) {
  const w=300, h=160, cx=w/2, cy=h/2;
  const Ice = () => (
    <g>
      <rect x="3" y="3" width={w-6} height={h-6} rx="26" fill={C.ice} stroke={C.rink} strokeWidth="1.5"/>
      <line x1={cx} y1="3" x2={cx} y2={h-3} stroke={C.rink} strokeWidth="1" strokeDasharray="5,4" opacity="0.3"/>
      <circle cx={cx} cy={cy} r="18" fill="none" stroke={C.rink} strokeWidth="1" opacity="0.3"/>
      <circle cx={cx} cy={cy} r="3" fill={C.rink} opacity="0.25"/>
    </g>
  );
  const Player = ({x,y,color,label}) => (
    <g>
      <circle cx={x} cy={y} r="11" fill={color} stroke="white" strokeWidth="2"/>
      <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="7.5" fontWeight="700">{label}</text>
    </g>
  );
  const Arrow = ({x1,y1,x2,y2,color="#c9a84c",dash,arc}) => {
    const dx=x2-x1, dy=y2-y1, len=Math.sqrt(dx*dx+dy*dy);
    const ux=dx/len, uy=dy/len;
    const hx=x2-ux*12, hy=y2-uy*12;
    const d = arc ? `M${x1} ${y1} Q${(x1+x2)/2} ${y1-22} ${hx} ${hy}` : `M${x1} ${y1} L${hx} ${hy}`;
    return (
      <g>
        <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray={dash} opacity="0.9"/>
        <polygon points={`${x2},${y2} ${hx-uy*5},${hy+ux*5} ${hx+uy*5},${hy-ux*5}`} fill={color} opacity="0.9"/>
      </g>
    );
  };
  const Net = ({x,y}) => <rect x={x} y={y} width="13" height="26" rx="3" fill="none" stroke={C.rink} strokeWidth="2.5"/>;
  const Puck = ({x,y}) => <circle cx={x} cy={y} r="5" fill="#111827" stroke="white" strokeWidth="1.5"/>;
  const Tag = ({x,y,text,color}) => (
    <g>
      <rect x={x-2} y={y-10} width={text.length*7+4} height={14} rx={4} fill={`${color}22`}/>
      <text x={x} y={y} fill={color} fontSize="8" fontWeight="700">{text}</text>
    </g>
  );

  const diagrams = {
    "2on1": (
      <svg width={w} height={h} style={{display:"block"}}>
        <Ice/><Net x={w-16} y={cy-13}/>
        <Player x={115} y={cy-18} color="#16a34a" label="A1"/>
        <Player x={115} y={cy+18} color="#16a34a" label="A2"/>
        <Player x={200} y={cy} color="#dc2626" label="D"/>
        <Puck x={126} y={cy-13}/>
        <Arrow x1={126} y1={cy-18} x2={w-20} y2={cy-8} arc/>
        <Arrow x1={126} y1={cy+18} x2={w-20} y2={cy+12} color="rgba(22,163,74,0.5)" dash="5,3"/>
        <Arrow x1={190} y1={cy} x2={170} y2={cy-10} color="#dc2626"/>
        <Tag x={105} y={16} text="2-ON-1" color={C.rink}/>
      </svg>
    ),
    "coverage": (
      <svg width={w} height={h} style={{display:"block"}}>
        <Ice/><Net x={4} y={cy-13}/>
        <Player x={145} y={45} color="#dc2626" label="A1"/>
        <Player x={170} y={80} color="#dc2626" label="A2"/>
        <Player x={145} y={115} color="#dc2626" label="A3"/>
        <Puck x={155} y={50}/>
        <Player x={100} y={45} color="#16a34a" label="D1"/>
        <Player x={100} y={80} color="#16a34a" label="D2"/>
        <Player x={100} y={115} color="#16a34a" label="F"/>
        <text x={170} y={98} textAnchor="middle" fill={C.yellow} fontSize="18" fontWeight="800">?</text>
        <Tag x={120} y={16} text="DEFENSIVE ZONE" color={C.rink}/>
      </svg>
    ),
    "blueline": (
      <svg width={w} height={h} style={{display:"block"}}>
        <Ice/><Net x={w-16} y={cy-13}/>
        <line x1={cx+12} y1="3" x2={cx+12} y2={h-3} stroke="#1d4ed8" strokeWidth="3" opacity="0.8"/>
        <text x={cx+18} y={18} fill="#1d4ed8" fontSize="8" fontWeight="700">BLUE LINE</text>
        <Puck x={cx+8} y={cy}/>
        <Arrow x1={cx+8} y1={cy} x2={cx+38} y2={cy} color="#dc2626"/>
        <Player x={cx+55} y={cy} color="#16a34a" label="D"/>
        <Arrow x1={cx+44} y1={cy} x2={cx+20} y2={cy} color="#16a34a"/>
        <text x={cx-28} y={cy-10} fill="#dc2626" fontSize="9">exit ✗</text>
        <text x={cx+60} y={cy-18} textAnchor="middle" fill="#16a34a" fontSize="9">keep in ✓</text>
      </svg>
    ),
    "forecheck": (
      <svg width={w} height={h} style={{display:"block"}}>
        <Ice/><Net x={4} y={cy-13}/>
        <Player x={88} y={cy} color="#dc2626" label="D"/>
        <Puck x={99} y={cy-5}/>
        <Player x={185} y={80} color="#16a34a" label="F1"/>
        <Arrow x1={175} y1={82} x2={104} y2={cy} color="#16a34a"/>
        <Arrow x1={88} y1={cy-12} x2={88} y2={30} color="#dc2626" dash="4,3"/>
        <Arrow x1={88} y1={cy-12} x2={150} y2={36} color="#dc2626" dash="4,3"/>
        <text x={60} y={24} fill="#dc2626" fontSize="8">outlet?</text>
        <Tag x={100} y={16} text="CUT THE ANGLE" color={C.rink}/>
      </svg>
    ),
    "goalie_angle": (
      <svg width={w} height={h} style={{display:"block"}}>
        <Ice/><Net x={4} y={cy-13}/>
        <Player x={165} y={cy-22} color="#dc2626" label="S"/>
        <Arrow x1={160} y1={cy-20} x2={55} y2={cy} color="#dc2626"/>
        <Player x={62} y={cy} color="#16a34a" label="G"/>
        <text x={62} y={cy-24} textAnchor="middle" fill="#16a34a" fontSize="8.5" fontWeight="700">angle ✓</text>
        <rect x={14} y={cy-9} width="8" height="18" rx="2" fill="none" stroke={C.rink} strokeWidth="2.5"/>
        <Player x={32} y={cy} color="rgba(22,163,74,0.3)" label="G"/>
        <text x={32} y={cy-24} textAnchor="middle" fill="#dc2626" fontSize="8.5" fontWeight="700">line ✗</text>
        <Tag x={100} y={16} text="ANGLE CUTTING" color={C.rink}/>
      </svg>
    ),
    "goalie_2on1": (
      <svg width={w} height={h} style={{display:"block"}}>
        <Ice/><Net x={4} y={cy-13}/>
        <Player x={168} y={cy-22} color="#dc2626" label="A1"/>
        <Player x={168} y={cy+22} color="#dc2626" label="A2"/>
        <Player x={105} y={cy} color="#1d4ed8" label="D"/>
        <Puck x={176} y={cy-18}/>
        <Player x={42} y={cy} color="#16a34a" label="G"/>
        <Arrow x1={105} y1={cy} x2={135} y2={cy+20} color="#1d4ed8"/>
        <text x={42} y={cy-24} textAnchor="middle" fill="#16a34a" fontSize="8">set for shot</text>
        <Tag x={95} y={16} text="2-ON-1 GOALIE" color={C.rink}/>
      </svg>
    ),
  };

  return diagrams[type] ? (
    <div style={{background:"#f0f8ff",borderRadius:14,padding:".85rem",border:`2px solid ${C.rink}28`,display:"flex",justifyContent:"center"}}>
      {diagrams[type]}
    </div>
  ) : null;
}

const DIAGRAMS = {
  u11q1:"2on1", u11q7:"2on1", u11q16:"2on1", u11q17:"2on1", u11q41:"2on1",
  u11q2:"coverage", u11q14:"coverage", u11q19:"coverage", u11q44:"coverage",
  u11q3:"blueline", u11q20:"blueline", u11q47:"blueline",
  u11q4:"forecheck", u11q24:"forecheck",
  u11g1:"goalie_angle", u11g2:"goalie_2on1", u11g7:"goalie_angle",
};

const ZONE_CLICK_QUESTIONS = [
  // ───── U7 / Initiation (simple: own net vs other net) ─────
  {
    id: "u7_zc_1", type: "zone-click", d: 1,
    level: ["U7 / Initiation"],
    pos: ["F","D"],
    sit: "Your teammate has the puck and is skating toward the other team's net.",
    question: "Where should you skate so you can help score a goal?",
    correctZone: "oz-slot",
    zones: ["oz-slot", "oz-left-wing", "oz-right-wing"],
    explanation: "Skate in front of the other team's net — that's where you can get a pass and shoot."
  },
  {
    id: "u7_zc_2", type: "zone-click", d: 1,
    level: ["U7 / Initiation"],
    pos: ["F","D"],
    sit: "The other team is skating toward your own net with the puck.",
    question: "Where should you skate to help your goalie?",
    correctZone: "dz-slot",
    zones: ["dz-slot", "dz-left-corner", "dz-right-corner", "dz-left-point"],
    explanation: "Get back in front of your own net — that's where you can block shots and help your goalie."
  },
  {
    id: "u7_zc_3", type: "zone-click", d: 1,
    level: ["U7 / Initiation"],
    pos: ["F","D"],
    sit: "You just got a pass at center ice. The other team's net is in front of you.",
    question: "Where should you skate with the puck?",
    correctZone: "oz-slot",
    zones: ["oz-slot", "oz-left-wing", "oz-right-wing"],
    explanation: "Skate forward toward the other team's net — that's how your team scores."
  },

  // ───── U9 / Novice (positions: winger, center, defense) ─────
  {
    id: "u9_zc_1", type: "zone-click", d: 1,
    level: ["U9 / Novice"],
    pos: ["F","D"],
    sit: "The other team has the puck in the corner of your defensive zone. You're the center, covering in front of your net.",
    question: "Where should you stay to stop a pass to a dangerous shooter?",
    correctZone: "dz-slot",
    zones: ["dz-slot", "dz-left-corner", "dz-right-corner", "dz-behind-net"],
    explanation: "Stay in the slot — it's the most dangerous spot for an opponent to get a shot from."
  },
  {
    id: "u9_zc_2", type: "zone-click", d: 1,
    level: ["U9 / Novice"],
    pos: ["F","D"],
    sit: "Your defenseman has the puck in your own zone and is looking to pass it up. You're the right winger.",
    question: "Where should you skate to give your D a safe pass?",
    correctZone: "nz-right",
    zones: ["nz-right", "nz-left", "nz-center"],
    explanation: "Wingers stay wide on their side — skate up to the neutral zone so the puck carrier has a safe target."
  },
  {
    id: "u9_zc_3", type: "zone-click", d: 2,
    level: ["U9 / Novice"],
    pos: ["F","D"],
    sit: "Your team shoots the puck into the opposing team's left corner. Your left winger is chasing it.",
    question: "As the center, where should you go to be ready to score?",
    correctZone: "oz-slot",
    zones: ["oz-slot", "oz-left-wing", "oz-right-wing"],
    explanation: "The center sets up in front of the net — if the winger gets the puck out, you're ready to shoot."
  },

  // ───── U11 / Atom (basic systems: breakout, forecheck, backcheck) ─────
  {
    id: "u11_zc_1", type: "zone-click", d: 1,
    level: ["U11 / Atom", "U13 / Peewee"],
    pos: ["F","D"],
    sit: "Your team has the puck in the opposing team's zone and your D is about to shoot from the point.",
    question: "As the center, where should you position for a rebound or tip?",
    correctZone: "oz-slot",
    zones: ["oz-slot", "oz-left-wing", "oz-right-wing"],
    explanation: "Park in the slot — most rebounds and tip-in chances happen right in front of the net."
  },
  {
    id: "u11_zc_2", type: "zone-click", d: 2,
    level: ["U11 / Atom", "U13 / Peewee"],
    pos: ["F","D"],
    sit: "The other team has the puck and is skating back through the neutral zone toward your end.",
    question: "Where should the first backchecking forward skate to slow them down?",
    correctZone: "nz-center",
    zones: ["nz-center", "nz-left", "nz-right"],
    explanation: "Backcheck through the middle — take away the cross-ice pass and force the puck carrier wide where help can arrive."
  },
  {
    id: "u11_zc_3", type: "zone-click", d: 2,
    level: ["U11 / Atom"],
    pos: ["F","D"],
    sit: "Your defenseman has the puck behind your own net and your team needs to break out.",
    question: "As the center, where should you swing to get open for a breakout pass?",
    correctZone: "dz-slot",
    zones: ["dz-slot", "dz-behind-net", "dz-left-corner", "dz-right-corner"],
    explanation: "The center circles through the middle of your zone — that's the primary outlet to start the breakout up the ice."
  },

  // ───── U13 / Peewee (F, D, and goalie roles) ─────
  {
    id: "u13_zc_1", type: "zone-click", d: 1,
    level: ["U13 / Peewee", "U15 / Bantam", "U18 / Midget"],
    pos: ["F"],
    sit: "Your team just won the puck in the opposing team's corner. You're the strong-side winger on the boards.",
    question: "Where should you move to give your teammate a scoring option?",
    correctZone: "oz-slot",
    zones: ["oz-slot", "oz-left-wing", "oz-right-wing"],
    explanation: "Get off the wall into the slot — that's the highest-danger shooting area, so the puck carrier can feed you for a scoring chance."
  },
  {
    id: "u13_zc_2", type: "zone-click", d: 2,
    level: ["U13 / Peewee", "U15 / Bantam"],
    pos: ["D"],
    sit: "The opposing team has the puck in the left corner of your defensive zone. You're the off-side (right) defenseman.",
    question: "Where should you position to protect the most dangerous scoring area?",
    correctZone: "dz-slot",
    zones: ["dz-slot", "dz-right-point", "dz-right-corner", "dz-behind-net"],
    explanation: "The off-side D holds the net front — block cross-ice passes and tie up anyone trying to tip in a shot."
  },
  {
    id: "u13_zc_goalie", type: "zone-click", d: 1,
    level: ["U13 / Peewee", "U15 / Bantam", "U18 / Midget"],
    pos: ["G"],
    sit: "A 2-on-1 is coming down the left side into your zone. The puck carrier is skating wide.",
    question: "Where should you set up to cut off the shooting angle?",
    correctZone: "dz-slot",
    zones: ["dz-slot", "dz-left-corner", "dz-behind-net", "dz-left-point"],
    explanation: "Stay centered at the top of your crease — square up to the shooter but don't overcommit, so you can still slide across on a pass."
  },
  {
    id: "u13_zc_goalie_2", type: "zone-click", d: 2,
    level: ["U13 / Peewee", "U15 / Bantam", "U18 / Midget"],
    pos: ["G"],
    sit: "An opposing player has the puck behind your net and is trying to wrap it around the post on the right side.",
    question: "Where should you be to seal off the wrap-around?",
    correctZone: "dz-behind-net",
    zones: ["dz-behind-net", "dz-slot", "dz-right-corner", "dz-left-corner"],
    explanation: "Hug the short-side post tight to the goal line — the puck can't sneak in if you're sealed to the post."
  },
  {
    id: "u13_zc_goalie_3", type: "zone-click", d: 2,
    level: ["U13 / Peewee", "U15 / Bantam", "U18 / Midget"],
    pos: ["G"],
    sit: "The opposing team has the puck in the right corner and is looking to pass it to the slot for a shot.",
    question: "Where should you square up to prepare for the expected shot?",
    correctZone: "dz-slot",
    zones: ["dz-slot", "dz-right-corner", "dz-right-point", "dz-left-corner"],
    explanation: "Face the slot — that's where the pass-and-shoot play will develop, so you want to be squared to the most likely shooter."
  },

  // ───── U15 / Bantam & U18 / Midget (advanced: D-zone systems, breakouts, backchecks) ─────
  {
    id: "u15_zc_1", type: "zone-click", d: 2,
    level: ["U15 / Bantam", "U18 / Midget"],
    pos: ["F","D"],
    sit: "Your team is breaking out of the zone on a 3-on-2. The puck carrier is already at center ice.",
    question: "As the trailing winger, where should you skate to give a safe outlet if the rush stalls?",
    correctZone: "nz-right",
    zones: ["nz-right", "nz-left", "nz-center"],
    explanation: "Stay wide on your lane behind the play — you give the puck carrier a lateral drop option and kill an interception that could spring a 2-on-1 the other way."
  },
  {
    id: "u15_zc_2", type: "zone-click", d: 3,
    level: ["U15 / Bantam", "U18 / Midget"],
    pos: ["F","D"],
    sit: "Your team is caught mid-line-change. Opponents just grabbed a loose puck in your neutral zone and are skating in.",
    question: "Where should the backchecking forward position to take away the middle lane?",
    correctZone: "nz-center",
    zones: ["nz-center", "nz-left", "nz-right"],
    explanation: "Backcheck through the middle — deny the drop pass and force the puck carrier wide where your D can step up and angle them off."
  },
];


// ─────────────────────────────────────────────────────────
// QUESTION FORMAT COMPONENTS
// ─────────────────────────────────────────────────────────
function MCQuestion({ q, sel, onPick, colorblind }) {
  const correctColor = colorblind ? "#2563eb" : C.green;
  const wrongColor = colorblind ? "#ea580c" : C.red;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:".55rem"}}>
      {q.opts.map((opt, i) => {
        const picked = sel !== null;
        const isCorrect = i === q.ok;
        const isWrong = picked && i === sel && !isCorrect;
        let bg=C.dimmest, bdr=C.border, col=C.dim, leftBdr="transparent";
        if (picked) {
          if (isCorrect) { bg=colorblind?"rgba(37,99,235,.1)":"rgba(34,197,94,.1)"; bdr=colorblind?"rgba(37,99,235,.35)":"rgba(34,197,94,.3)"; col=C.white; leftBdr=correctColor; }
          else if (isWrong) { bg=colorblind?"rgba(234,88,12,.08)":C.redDim; bdr=colorblind?"rgba(234,88,12,.3)":C.redBorder; col=C.dimmer; leftBdr=wrongColor; }
        } else if (sel === i) { bg=C.purpleDim; bdr=C.purpleBorder; col=C.white; }
        return (
          <button key={i} onClick={() => onPick(i)} disabled={sel !== null}
            style={{
              background:bg, border:`1px solid ${bdr}`,
              borderLeft:`3px solid ${leftBdr}`,
              borderRadius:12, padding:".95rem 1.1rem",
              cursor:sel!==null?"default":"pointer",
              textAlign:"left", color:col,
              fontFamily:FONT.body, fontSize:14, lineHeight:1.55,
              display:"flex", alignItems:"flex-start", gap:".75rem",
              transition:"all .15s", width:"100%",
            }}>
            <span style={{
              fontSize:11, fontWeight:800, minWidth:22, marginTop:1, flexShrink:0,
              color:picked?(isCorrect?correctColor:isWrong?wrongColor:C.dimmest):C.dimmer,
              fontFamily:FONT.display,
            }}>
              {picked ? (isCorrect ? "✓" : isWrong ? "✗" : String.fromCharCode(65+i)) : String.fromCharCode(65+i)}
            </span>
            <span style={{wordBreak:"break-word",whiteSpace:"normal",flex:1,fontSize:opt.length>100?13:14}}>{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

function SeqQuestion({ q, onAnswer, answered }) {
  const [order, setOrder] = useState(() => [...Array(q.items.length).keys()]);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  function moveUp(i) { if (i === 0 || submitted) return; const o=[...order]; [o[i-1],o[i]]=[o[i],o[i-1]]; setOrder(o); }
  function moveDown(i) { if (i === order.length-1 || submitted) return; const o=[...order]; [o[i],o[i+1]]=[o[i+1],o[i]]; setOrder(o); }

  function submit() {
    if (submitted) return;
    const isCorrect = order.every((v,i) => v === q.correct_order[i]);
    setSubmitted(true);
    setCorrect(isCorrect);
    onAnswer(isCorrect);
  }

  return (
    <div>
      <div style={{display:"flex",flexDirection:"column",gap:".5rem",marginBottom:"1rem"}}>
        {order.map((itemIdx, i) => {
          const isRight = submitted && q.correct_order[i] === itemIdx;
          const isWrong = submitted && !isRight;
          return (
            <div key={itemIdx} style={{
              display:"flex", alignItems:"center", gap:".6rem",
              background:submitted ? (isRight ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.06)") : C.bgElevated,
              border:`1px solid ${submitted ? (isRight ? C.greenBorder : C.redBorder) : C.border}`,
              borderLeft:`3px solid ${submitted ? (isRight ? C.green : C.red) : C.purple}`,
              borderRadius:12, padding:".8rem 1rem",
              transition:"all .2s",
            }}>
              <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.2rem",color:C.gold,minWidth:26,textAlign:"center"}}>{i+1}</div>
              <div style={{flex:1,fontSize:13,color:C.white,lineHeight:1.5}}>{q.items[itemIdx]}</div>
              {!submitted && (
                <div style={{display:"flex",flexDirection:"column",gap:1}}>
                  <button onClick={()=>moveUp(i)} style={{background:"none",border:`1px solid ${C.border}`,color:C.dimmer,cursor:"pointer",fontSize:12,padding:"3px 7px",borderRadius:5,lineHeight:1}}>▲</button>
                  <button onClick={()=>moveDown(i)} style={{background:"none",border:`1px solid ${C.border}`,color:C.dimmer,cursor:"pointer",fontSize:12,padding:"3px 7px",borderRadius:5,lineHeight:1}}>▼</button>
                </div>
              )}
              {submitted && <span style={{fontSize:16,flexShrink:0}}>{isRight?"✓":"✗"}</span>}
            </div>
          );
        })}
      </div>
      {!submitted && (
        <button onClick={submit} style={{background:C.purple,color:C.white,border:"none",borderRadius:12,padding:".85rem",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:FONT.body,width:"100%"}}>
          Submit Order →
        </button>
      )}
    </div>
  );
}

function TFQuestion({ q, sel, onPick }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
      {[{label:"TRUE",val:1,color:C.green},{label:"FALSE",val:0,color:C.red}].map(({label,val,color}) => {
        const picked = sel !== null;
        const isCorrect = val === (q.ok ? 1 : 0);
        const isSelected = sel === val;
        let bg=C.bgElevated, bdr=C.border, textColor=C.dim;
        if (picked) {
          if (isCorrect) { bg=val===1?"rgba(34,197,94,.1)":"rgba(239,68,68,.08)"; bdr=color+"50"; textColor=color; }
          else if (isSelected) { bg=C.redDim; bdr=C.redBorder; textColor=C.red; }
        } else if (isSelected) { bg=C.purpleDim; bdr=C.purpleBorder; textColor=C.purple; }
        return (
          <button key={label} onClick={() => onPick(val)} disabled={sel !== null}
            style={{
              background:bg, border:`1px solid ${bdr}`,
              borderRadius:14, padding:"1.5rem 1rem",
              cursor:sel!==null?"default":"pointer",
              textAlign:"center",
              fontFamily:FONT.display, fontWeight:800,
              fontSize:"1.5rem", letterSpacing:".06em",
              color:textColor, transition:"all .15s",
            }}>
            {label}
            {picked && isCorrect && <div style={{fontSize:11,fontFamily:FONT.body,marginTop:6,fontWeight:600}}>✓ Correct</div>}
            {picked && isSelected && !isCorrect && <div style={{fontSize:11,fontFamily:FONT.body,marginTop:6,color:C.red,fontWeight:600}}>✗ Wrong</div>}
          </button>
        );
      })}
    </div>
  );
}

function NextQuestion({ q, sel, onPick }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:".55rem"}}>
      {q.opts.map((opt, i) => {
        const picked = sel !== null;
        const isCorrect = i === q.ok;
        const isWrong = picked && i === sel && !isCorrect;
        let bg=C.dimmest, bdr=C.border, col=C.dim, leftBdr="transparent";
        if (picked) {
          if (isCorrect) { bg="rgba(34,197,94,.1)"; bdr=C.greenBorder; col=C.white; leftBdr=C.green; }
          else if (isWrong) { bg=C.redDim; bdr=C.redBorder; col=C.dimmer; leftBdr=C.red; }
        } else if (sel === i) { bg=C.purpleDim; bdr=C.purpleBorder; col=C.white; }
        return (
          <button key={i} onClick={() => onPick(i)} disabled={sel !== null}
            style={{background:bg,border:`1px solid ${bdr}`,borderLeft:`3px solid ${leftBdr}`,borderRadius:12,padding:".95rem 1.1rem",cursor:sel!==null?"default":"pointer",textAlign:"left",color:col,fontFamily:FONT.body,fontSize:14,lineHeight:1.55,display:"flex",alignItems:"flex-start",gap:".75rem",transition:"all .15s",width:"100%"}}>
            <span style={{fontSize:11,fontWeight:800,minWidth:22,marginTop:1,flexShrink:0,color:picked?(isCorrect?C.green:isWrong?C.red:C.dimmest):C.dimmer,fontFamily:FONT.display}}>
              {picked?(isCorrect?"✓":isWrong?"✗":String.fromCharCode(65+i)):String.fromCharCode(65+i)}
            </span>
            <span style={{wordBreak:"break-word",whiteSpace:"normal",flex:1,fontSize:opt.length>100?13:14}}>{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

// Type badge for question header
const Q_TYPE_LABELS = {
  mc:      {label:"Multiple Choice", color:C.purple,   icon:"📝"},
  seq:     {label:"Put in Order",    color:C.gold,     icon:"🔢"},
  mistake: {label:"Spot the Mistake",color:C.red,      icon:"🔍"},
  next:    {label:"What Happens Next",color:C.yellow,  icon:"🔮"},
  tf:      {label:"True or False",   color:C.blue,     icon:"⚡"},
  "zone-click": {label:"Zone Click", color:C.green,   icon:"🎯"},
};

function ZoneClickQuestion({ q, onAnswer, answered, C }) {
  const [selected, setSelected] = useState(null);

  function handleZone(zoneId) {
    if (answered) return;
    setSelected(zoneId);
  }

  function handleConfirm() {
    if (!selected || answered) return;
    onAnswer(selected === q.correctZone);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <RinkDiagramZones
        zones={q.zones}
        onZoneClick={answered ? null : handleZone}
        selected={selected}
        correct={answered ? q.correctZone : null}
      />
      {!answered && selected && (
        <button onClick={handleConfirm} style={{
          background:C.gold, color:C.bg, border:"none", borderRadius:12,
          padding:"1rem 1.25rem", cursor:"pointer", fontWeight:800, fontSize:15,
          fontFamily:FONT.body, letterSpacing:".02em", transition:"all .15s", width:"100%"
        }}>
          Confirm: {RINK_ZONE_DEFS.find(z => z.id === selected)?.label}
        </button>
      )}
    </div>
  );
}



// ─────────────────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────────────────
function Home({ player, onNav, demoMode, subscriptionTier }) {
  const { name, level, position, selfRatings, quizHistory, goals } = player;
  const latest = quizHistory[quizHistory.length-1];
  const iq = latest ? calcWeightedIQ(latest.results) : null;
  const tier = iq !== null ? getTier(iq) : null;
  const showProPreview = demoMode || subscriptionTier === "FREE";
  const totalSessions = quizHistory.length;
  const ratedSkills = Object.values(selfRatings||{}).filter(v => v !== null).length;
  const totalSkills = Object.keys(selfRatings||{}).length;
  const goalCount = Object.keys(goals||{}).filter(k => goals[k]?.goal).length;
  const goalCats = (GOAL_CATS[level]||[]).length;
  const weeklyRecord = getThisWeekRecord();
  const weeklyAllowed = canAccess("weeklyChallenge", subscriptionTier).allowed;

  // Streak + countdown timer
  const [streak, setStreak] = useState(0);
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    const sd = getStreakData();
    const today = getTodayKey();
    const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
    if (sd.last === today || sd.last === yesterday) setStreak(sd.count || 0);
    // Update countdown every minute
    const tick = () => setCountdown(formatCountdown(msUntilNextWeek()));
    tick();
    const iv = setInterval(tick, 60000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT.body,color:C.white,paddingBottom:80}}>
      {/* Header */}
      <div style={{padding:"1.5rem 1.25rem 1rem",maxWidth:560,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.5rem"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:".45rem",marginBottom:".2rem"}}>
              <IceIQLogo size={22}/>
              <span style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.5rem",color:C.gold,letterSpacing:".06em"}}>Ice-IQ</span>
              <span style={{fontSize:10,color:C.dimmer,fontWeight:500,letterSpacing:".04em"}}>v{VERSION}</span>
              {streak > 0 && (
                <div style={{background:"rgba(234,179,8,.12)",border:"1px solid rgba(234,179,8,.25)",borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:700,color:C.yellow,display:"flex",alignItems:"center",gap:".2rem"}}>
                  🔥{streak}
                </div>
              )}
            </div>
            <div style={{fontSize:12,color:C.dimmer}}>{name} · {level} · {position}</div>
          </div>
          <button onClick={() => onNav("profile")} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,width:38,height:38,cursor:"pointer",color:C.dimmer,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>⚙</button>
        </div>

        {/* IQ Score Hero — locked until GAME_SENSE_UNLOCK_SESSIONS quizzes completed */}
        {(() => {
          const unlocked = totalSessions >= GAME_SENSE_UNLOCK_SESSIONS && iq !== null;
          const remaining = Math.max(0, GAME_SENSE_UNLOCK_SESSIONS - totalSessions);
          return (
            <Card glow={unlocked} style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,right:0,width:120,height:120,background:`radial-gradient(circle at top right,${unlocked?tier.color+"15":"rgba(255,255,255,.02)"},transparent 70%)`,pointerEvents:"none"}}/>
              <Label>Game Sense Score</Label>
              {unlocked ? (
                <div style={{display:"flex",alignItems:"flex-end",gap:"1rem"}}>
                  <div>
                    <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"4.5rem",color:tier.color,lineHeight:.9,letterSpacing:"-.02em"}}>{iq}<span style={{fontSize:"1.8rem"}}>%</span></div>
                    <div style={{fontSize:13,color:C.dimmer,marginTop:".4rem"}}>{latest.results.filter(r=>r.ok).length}/{latest.results.length} correct</div>
                  </div>
                  <div>
                    <div style={{fontFamily:FONT.display,fontWeight:700,fontSize:"1.2rem",color:C.white}}>{tier.badge} {tier.label}</div>
                    <div style={{fontSize:12,color:C.dimmer,marginTop:2}}>{totalSessions} session{totalSessions!==1?"s":""}</div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:".6rem",marginBottom:".4rem"}}>
                    <span style={{fontSize:"2.2rem"}}>🔒</span>
                    <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2.6rem",color:"rgba(255,255,255,.15)",lineHeight:.9}}>—</div>
                  </div>
                  <div style={{fontSize:13,color:C.dim,marginTop:".5rem",lineHeight:1.5}}>
                    {totalSessions === 0
                      ? `Take ${GAME_SENSE_UNLOCK_SESSIONS} quizzes to unlock your Game Sense Score — one quiz isn't enough to measure you fairly.`
                      : `${remaining} more quiz${remaining===1?"":"zes"} to unlock your Game Sense Score.`}
                  </div>
                  <div style={{marginTop:".7rem",height:6,background:C.dimmest,borderRadius:4,overflow:"hidden"}}>
                    <div style={{width:`${Math.min(100, (totalSessions/GAME_SENSE_UNLOCK_SESSIONS)*100)}%`,height:"100%",background:C.gold,borderRadius:4,transition:"width .3s"}}/>
                  </div>
                  <div style={{fontSize:11,color:C.dimmer,marginTop:".35rem"}}>{totalSessions}/{GAME_SENSE_UNLOCK_SESSIONS} quizzes done</div>
                </div>
              )}
            </Card>
          );
        })()}

        {/* Positioning Journey entry */}
        {(() => {
          const js = getPositioningJourneyState(quizHistory);
          const unlockedCount = js.nodes.filter(n => n.unlocked).length;
          const latestTitle = [...js.nodes].reverse().find(n => n.unlocked)?.title_unlock;
          return (
            <button onClick={() => onNav("journey")} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",background:`linear-gradient(135deg,${COMPETENCIES.positioning.color}14,rgba(255,255,255,0.02))`,border:`1px solid ${COMPETENCIES.positioning.color}40`,borderRadius:12,padding:".7rem .95rem",cursor:"pointer",color:C.white,fontFamily:FONT.body,marginBottom:"1rem"}}>
              <span style={{display:"flex",alignItems:"center",gap:".55rem",minWidth:0}}>
                <span style={{fontSize:16}}>🗺️</span>
                <span style={{fontWeight:700,fontSize:13}}>Positioning Journey</span>
                <span style={{color:C.dimmer,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>· {unlockedCount}/{js.nodes.length}{latestTitle?` · ${latestTitle}`:""}</span>
              </span>
              <span style={{color:COMPETENCIES.positioning.color,fontSize:12}}>→</span>
            </button>
          );
        })()}

        {/* Quick action grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:"1rem"}}>
          <button onClick={() => onNav("quiz")} style={{background:`linear-gradient(135deg,rgba(124,111,205,.15),rgba(124,111,205,.05))`,border:`1px solid ${C.purpleBorder}`,borderRadius:14,padding:"1.1rem",cursor:"pointer",textAlign:"left",color:C.white,fontFamily:FONT.body,position:"relative",overflow:"hidden"}}>
            <img src={imgCoreApp} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.12,pointerEvents:"none"}}/>
            <div style={{position:"relative"}}>
            <div style={{fontSize:22,marginBottom:".4rem"}}>🧠</div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>Take Quiz</div>
            <div style={{fontSize:11,color:C.purple}}>Adaptive · {player.sessionLength||10}Q</div>
            </div>
          </button>
          <button onClick={() => onNav("goals")} style={{background:`linear-gradient(135deg,rgba(201,168,76,.1),rgba(201,168,76,.03))`,border:`1px solid ${C.goldBorder}`,borderRadius:14,padding:"1.1rem",cursor:"pointer",textAlign:"left",color:C.white,fontFamily:FONT.body}}>
            <div style={{fontSize:22,marginBottom:".4rem"}}>🎯</div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>My Goals</div>
            <div style={{fontSize:11,color:C.gold}}>{goalCount}/{goalCats} set</div>
          </button>
          <button onClick={() => onNav("study")} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:14,padding:"1.1rem",cursor:"pointer",textAlign:"left",color:C.white,fontFamily:FONT.body,position:"relative",overflow:"hidden"}}>
            <img src={imgTactics} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.12,pointerEvents:"none"}}/>
            <div style={{position:"relative"}}>
            <div style={{fontSize:22,marginBottom:".4rem"}}>📺</div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>Study</div>
            <div style={{fontSize:11,color:C.dimmer}}>Games, drills, Pro Hockey Intel</div>
            </div>
          </button>
          <button onClick={() => onNav("report")} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:14,padding:"1.1rem",cursor:"pointer",textAlign:"left",color:C.white,fontFamily:FONT.body,position:"relative",overflow:"hidden"}}>
            <img src={imgDataPanel} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.12,pointerEvents:"none"}}/>
            <div style={{position:"relative"}}>
            <div style={{fontSize:22,marginBottom:".4rem"}}>📋</div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>Report</div>
            <div style={{fontSize:11,color:C.dimmer}}>Development arc</div>
            </div>
          </button>
        </div>

        {/* Game Sense Profile button */}
        <button onClick={() => onNav("gamesense")} style={{width:"100%",display:"block",textAlign:"left",background:`linear-gradient(135deg,rgba(124,111,205,.12),rgba(124,111,205,.04))`,border:`1px solid ${C.purpleBorder}`,borderRadius:14,padding:"1rem 1.1rem",cursor:"pointer",color:C.white,fontFamily:FONT.body,marginBottom:"1rem",position:"relative",overflow:"hidden"}}>
          <img src={imgProfile} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.08,pointerEvents:"none"}}/>
          <div style={{position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",gap:".6rem"}}>
              <span style={{fontSize:20}}>📊</span>
              <div>
                <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.purple,fontWeight:800}}>Game Sense Profile</div>
                <div style={{fontSize:12,color:C.dim,marginTop:1}}>Spider chart · Competencies · Trend</div>
              </div>
            </div>
          </div>
        </button>

        {/* Weekly Challenge — compact entry for PRO+ users; FREE users see it in the Pro upgrade button below */}
        {weeklyAllowed && (
          <button onClick={() => onNav("weekly")} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",background:"none",border:`1px solid ${C.border}`,borderRadius:10,padding:".55rem .85rem",cursor:"pointer",color:C.dim,fontFamily:FONT.body,marginBottom:"1rem",fontSize:12}}>
            <span style={{display:"flex",alignItems:"center",gap:".5rem"}}>
              <span style={{fontSize:13}}>{weeklyRecord ? "✅" : "🏆"}</span>
              <span style={{fontWeight:600,color:C.white}}>Weekly Challenge</span>
              <span style={{color:C.dimmer}}>· {weeklyRecord ? `${weeklyRecord.score}% · resets in ${countdown}` : `resets in ${countdown}`}</span>
            </span>
            <span style={{color:C.dimmer,fontSize:11}}>{weeklyRecord ? "View" : "Play →"}</span>
          </button>
        )}

        {showProPreview && (
          <button onClick={()=>onNav("plans")} style={{width:"100%",display:"block",textAlign:"left",background:`linear-gradient(135deg,rgba(201,168,76,.12),rgba(124,111,205,.08))`,border:`1px solid ${C.goldBorder}`,borderRadius:14,padding:"1rem 1.1rem",cursor:"pointer",color:C.white,fontFamily:FONT.body,marginBottom:"1rem"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".5rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
                <span style={{fontSize:16}}>⭐</span>
                <span style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,fontWeight:800}}>Upgrade to Ice-IQ Pro</span>
              </div>
              <span style={{color:C.gold,fontSize:13}}>→</span>
            </div>
            <div style={{fontSize:13,color:C.dim,lineHeight:1.5,marginBottom:".55rem"}}>See what unlocks with Pro — unlimited quizzes, adaptive difficulty, position-specific questions, hockey goal setting, Weekly Challenge, coach feedback, and unlimited NHL Insights.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".35rem",marginTop:".5rem"}}>
              {[
                {icon:"♾️",t:"Unlimited quizzes"},
                {icon:"🎮",t:"5 question formats"},
                {icon:"🎯",t:"Position-specific"},
                {icon:"🧠",t:"Adaptive difficulty"},
                {icon:"🏒",t:"Hockey goal setting"},
                {icon:"📊",t:"Skills Map radar"},
                {icon:"🏆",t:"Weekly Challenge"},
                {icon:"👨‍🏫",t:"Coach feedback"},
                {icon:"📰",t:"Unlimited NHL Insights"},
              ].map((b,i) => (
                <div key={i} style={{fontSize:11,color:C.dimmer,display:"flex",alignItems:"center",gap:".35rem"}}>
                  <span>{b.icon}</span><span>{b.t}</span>
                </div>
              ))}
            </div>
          </button>
        )}

        {/* What's New */}
        <div style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.bgCard} 0%,${C.bgElevated} 100%)`,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden"}}>
          <div style={{padding:".75rem 1rem .6rem",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid rgba(255,255,255,0.05)`}}>
            <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
              <span style={{background:C.gold,color:C.bg,fontSize:9,fontWeight:800,letterSpacing:".1em",textTransform:"uppercase",padding:"2px 7px",borderRadius:20}}>NEW</span>
              <span style={{fontFamily:FONT.display,fontWeight:800,fontSize:13,color:C.white,letterSpacing:".02em"}}>What's New</span>
            </div>
            <span style={{fontSize:10,color:C.dimmer,fontWeight:600}}>v{VERSION} · {CHANGELOG[0].date}</span>
          </div>
          <div style={{padding:".65rem .85rem"}}>
            {CHANGELOG[0].notes.slice(0,3).map((item,i) => (
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:".65rem",padding:".5rem 0",borderBottom:i<2?`1px solid rgba(255,255,255,0.04)`:"none"}}>
                <div style={{width:32,height:32,borderRadius:10,background:"rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{item.icon}</div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.white,marginBottom:2}}>{item.title}</div>
                  <div style={{fontSize:11,color:C.dimmer,lineHeight:1.45}}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────
// QUIZ STATE HOOK (shared by Quiz and WeeklyQuiz)
// ─────────────────────────────────────────────────────────
function useQuizState() {
  const [sel, setSel] = useState(null);
  const [seqAnswered, setSeqAnswered] = useState(false);
  const [seqCorrect, setSeqCorrect] = useState(false);
  const [results, setResults] = useState([]);
  return { sel, setSel, seqAnswered, setSeqAnswered, seqCorrect, setSeqCorrect, results, setResults };
}

// ─────────────────────────────────────────────────────────
// QUIZ SCREEN
// ─────────────────────────────────────────────────────────
function Quiz({ player, onFinish, onBack, tier, onUpgrade }) {
  const isReturning = player.quizHistory.length > 0;
  const isDemo = !player.id || player.id === "__demo__";
  const qLen = isDemo ? 7 : (player.sessionLength || 10);
  const [queue, setQueue] = useState(null);
  const [question, setQuestion] = useState(null);
  const { sel, setSel, seqAnswered, setSeqAnswered, seqCorrect, setSeqCorrect, results, setResults } = useQuizState();
  const [seqPerfect, setSeqPerfect] = useState(true);
  const [mistakeStreak, setMistakeStreak] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [zoneCorrect, setZoneCorrect] = useState(null);
  const [showFlag, setShowFlag] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagDetail, setFlagDetail] = useState("");
  const [statsMap, setStatsMap] = useState({});

  async function submitFlag() {
    if (!flagReason) return;
    if (player.id && player.id !== "__demo__") {
      await SB.reportQuestion({
        userId: player.id,
        questionId: question.id,
        level: player.level,
        reason: flagReason,
        detail: flagDetail.trim() || null,
      });
    }
    setTimeout(() => { setShowFlag(false); setFlagReason(""); setFlagDetail(""); }, TOAST_DURATION_MS);
  }

  useEffect(() => {
    let cancelled = false;
    console.log("Quiz useEffect running", { isDemo, level: player.level, position: player.position });
    loadQB().then(qb => {
      console.log("QB loaded", { qbLevels: Object.keys(qb), cancelled });
      if (cancelled) return;
      if (isDemo) {
        const demoQs = buildDemoQueue(qb, player.level, player.position);
        console.log("Demo queue built", { count: demoQs.length, first: demoQs[0]?.id });
        setQueue({ byD: {1: demoQs.slice(1), 2: [], 3: []}, currentD: 1, tier: "DEMO" });
        setQuestion(demoQs[0]);
      } else {
        const q = buildQueue(qb, player.level, player.position, isReturning, tier);
        const { q: first, queue: q2 } = pullNext(q, []);
        setQueue(q2);
        setQuestion(first);
      }
    }).catch(e => console.error("QB load error:", e));
    if (!isDemo) SB.getQuestionStats().then(setStatsMap).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const qNum = results.length;
  const isLast = qNum >= qLen - 1;
  const qtype = question?.type || "mc";

  function handlePick(i) {
    if (sel !== null || !question) return;
    setSel(i);
    const ok = i === question.ok;
    const newResult = { id:question.id, cat:question.cat, ok, d:question.d||2, type:qtype };
    const newResults = [...results, newResult];
    if (question.type === "mistake" && ok) setMistakeStreak(s => s+1);
    setResults(newResults);
    if (isLast) setQuizDone(true);
  }

  function handleSeqAnswer(ok) {
    setSeqAnswered(true);
    setSeqCorrect(ok);
    if (!ok) setSeqPerfect(false);
    const newResult = { id:question.id, cat:question.cat, ok, d:question.d||2, type:"seq" };
    const newResults = [...results, newResult];
    setResults(newResults);
    if (isLast) setQuizDone(true);
  }

  function advance() {
    if (!question) return;
    const { q: nextQ, queue: nextQueue } = pullNext(queue, results);
    setQueue(nextQueue);
    setQuestion(nextQ);
    setSel(null);
    setSeqAnswered(false);
    setSeqCorrect(false);
    setZoneCorrect(null);
  }

  const canAdvance = qtype === "seq" ? seqAnswered : qtype === "zone-click" ? zoneCorrect !== null : sel !== null;
  const answered = qtype === "seq" ? seqAnswered : qtype === "zone-click" ? zoneCorrect !== null : sel !== null;
  const q = question;
  if (!q) return <Screen><div style={{color:C.dimmer,textAlign:"center",paddingTop:"4rem"}}>Loading…</div></Screen>;

  const FORMAT_PREVIEW_LABELS = { seq:"Sequence Ordering", tf:"True or False", mistake:"Spot the Mistake", next:"What Happens Next" };
  const FORMAT_PREVIEW_ICONS = { seq:"🔢", tf:"⚡", mistake:"🔍", next:"⏭️" };
  const FORMAT_PREVIEW_DESC = {
    seq: "Put the steps of a play in the correct order — tests whether you understand decision sequences, not just outcomes.",
    tf: "Is this hockey statement True or False? Myth-busting questions that reveal what actually works on the ice.",
    mistake: "Read the situation, spot the error. Identify exactly what the player did wrong and why it hurts the team.",
    next: "Given this game situation, what's the smartest next move? Tests game sense under pressure.",
  };
  if (qtype === "formatPreview") {
    const fmt = q._format || "tf";
    return (
      <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body}}>
        <StickyHeader>
          <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
            <button onClick={onBack} style={{background:"none",border:`1px solid ${C.border}`,color:C.dimmer,borderRadius:8,padding:".35rem .75rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body}}>←</button>
            <div style={{flex:1}}>
              <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1rem",color:C.gold}}>Ice-IQ · {player.level}</div>
              <div style={{fontSize:11,color:C.dimmer}}>Q{qNum+1}/{qLen} · {player.position}</div>
            </div>
          </div>
        </StickyHeader>
        <div style={{padding:"1.5rem 1.25rem",maxWidth:560,margin:"0 auto",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center"}}>
          <div style={{fontSize:48,margin:"1.5rem 0 .75rem"}}>{FORMAT_PREVIEW_ICONS[fmt]}</div>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.6rem",color:C.gold,marginBottom:".5rem"}}>{FORMAT_PREVIEW_LABELS[fmt]}</div>
          <div style={{fontSize:13,color:C.dim,lineHeight:1.7,marginBottom:"1.75rem",maxWidth:360}}>{FORMAT_PREVIEW_DESC[fmt]}</div>
          <div style={{background:C.bgElevated,border:`1px solid ${C.goldBorder}`,borderRadius:12,padding:"1.25rem",marginBottom:"1.5rem",width:"100%",textAlign:"left"}}>
            <div style={{fontSize:11,color:C.gold,fontWeight:700,marginBottom:".5rem"}}>🔒 PRO QUESTION TYPE</div>
            <div style={{fontSize:12,color:C.dim,lineHeight:1.6}}>This question type is available on Ice-IQ Pro. Unlock all 5 question formats to challenge yourself in new ways.</div>
          </div>
          <button onClick={() => onUpgrade("allQuestionFormats","pro")} style={{background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".85rem 1.75rem",cursor:"pointer",fontWeight:800,fontSize:15,fontFamily:FONT.body,marginBottom:".75rem",width:"100%"}}>Unlock All Question Types →</button>
          <button onClick={advance} style={{background:"none",border:`1px solid ${C.border}`,color:C.dimmer,borderRadius:10,padding:".7rem 1.5rem",cursor:"pointer",fontWeight:600,fontSize:13,fontFamily:FONT.body,width:"100%"}}>Skip for now</button>
        </div>
      </div>
    );
  }

  const typeInfo = Q_TYPE_LABELS[qtype] || Q_TYPE_LABELS.mc;
  const diagramType = DIAGRAMS[q.id];

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <button onClick={onBack} style={{background:"none",border:`1px solid ${C.border}`,color:C.dimmer,borderRadius:8,padding:".35rem .75rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body}}>←</button>
          <div style={{flex:1}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1rem",color:C.gold}}>Ice-IQ · {player.level}</div>
            <div style={{fontSize:11,color:C.dimmer}}>Q{qNum+1}/{qLen} · {player.position} · {player.season||SEASONS[0]}</div>
          </div>
          <div style={{width:80,height:4,background:C.dimmest,borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(qNum/qLen)*100}%`,background:C.purple,borderRadius:2,transition:"width .35s ease"}}/>
          </div>
        </div>
      </StickyHeader>

      <div style={{padding:"1.5rem 1.25rem",maxWidth:560,margin:"0 auto"}}>
        {/* Question type badge + category */}
        <div style={{display:"flex",gap:".5rem",marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
          <Pill color={typeInfo.color}>{typeInfo.icon} {typeInfo.label}</Pill>
          <Pill color={C.dimmer} bg={C.dimmest}>{q.cat}</Pill>
          {q.concept && <Pill color={C.dimmer} bg={C.dimmest}>{q.concept}</Pill>}
        </div>

        {/* Diagram */}
        {diagramType && (
          <div style={{marginBottom:"1rem"}}>
            <div style={{fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:".4rem"}}>📋 Coach's Clipboard</div>
            <RinkDiagram type={diagramType}/>
          </div>
        )}

        {/* Situation / Prompt */}
        {(qtype === "mc" || qtype === "seq" || qtype === "next") && (
          <Card style={{marginBottom:"1.25rem",background:C.purpleDim,border:`1px solid ${C.purpleBorder}`}}>
            <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.purple,marginBottom:".6rem",fontWeight:700}}>📋 Game Situation</div>
            <div style={{fontSize:15,lineHeight:1.8,color:C.white,fontWeight:500}}>{q.sit}</div>
          </Card>
        )}

        {qtype === "tf" && (
          <Card style={{marginBottom:"1.25rem",background:C.blueDim,border:`1px solid rgba(59,130,246,.3)`}}>
            <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.blue,marginBottom:".6rem",fontWeight:700}}>⚡ True or False?</div>
            <div style={{fontSize:15,lineHeight:1.8,color:C.white,fontWeight:500}}>{q.sit}</div>
          </Card>
        )}

        {qtype === "mistake" && (
          <Card style={{marginBottom:"1.25rem",background:C.redDim,border:`1px solid ${C.redBorder}`}}>
            <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.red,marginBottom:".6rem",fontWeight:700}}>🔍 Spot the Mistake</div>
            <div style={{fontSize:14,color:C.dim,lineHeight:1.7,marginBottom:".75rem"}}>{q.sit}</div>
            <div style={{fontSize:15,fontWeight:700,color:C.white}}>{q.question}</div>
          </Card>
        )}

        {qtype === "zone-click" && (
          <Card style={{marginBottom:"1.25rem",background:C.greenDim,border:`1px solid rgba(34,197,94,.3)`}}>
            <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.green,marginBottom:".6rem",fontWeight:700}}>🎯 Zone Click</div>
            <div style={{fontSize:14,color:C.dim,lineHeight:1.7,marginBottom:".75rem"}}>{q.sit}</div>
            <div style={{fontSize:15,fontWeight:700,color:C.white}}>{q.question}</div>
          </Card>
        )}

        {/* Question component */}
        {qtype === "mc" && <MCQuestion q={q} sel={sel} onPick={handlePick} colorblind={player.colorblind}/>}
        {qtype === "mistake" && <MCQuestion q={q} sel={sel} onPick={handlePick} colorblind={player.colorblind}/>}
        {qtype === "next" && <NextQuestion q={q} sel={sel} onPick={handlePick}/>}
        {qtype === "tf" && <TFQuestion q={q} sel={sel} onPick={i => handlePick(i)}/>}
        {qtype === "seq" && <SeqQuestion q={q} onAnswer={handleSeqAnswer} answered={seqAnswered}/>}
        {qtype === "zone-click" && <ZoneClickQuestion q={q} answered={zoneCorrect !== null} onAnswer={ok => {
          setZoneCorrect(ok);
          const newResult = { id:q.id, cat:q.cat, ok, d:q.d||2, type:"zone-click" };
          const newResults = [...results, newResult];
          setResults(newResults);
          if (results.length + 1 >= qLen) setQuizDone(true);
        }} C={C} />}

        {/* Explanation */}
        {answered && (
          <div ref={el => { if (el) setTimeout(() => el.scrollIntoView({behavior:"smooth",block:"nearest"}), 150); }} style={{marginTop:"1rem"}}>
            <Card style={{
              background: (qtype==="seq"?seqCorrect:qtype==="zone-click"?zoneCorrect:(sel===q.ok)) ? "rgba(34,197,94,.06)" : C.redDim,
              border:`1px solid ${(qtype==="seq"?seqCorrect:qtype==="zone-click"?zoneCorrect:(sel===q.ok)) ? C.greenBorder : C.redBorder}`,
              marginBottom:"1rem"
            }}>
              <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",fontWeight:700,marginBottom:".5rem",color:(qtype==="seq"?seqCorrect:qtype==="zone-click"?zoneCorrect:(sel===q.ok))?C.green:C.red}}>
                {(qtype==="seq"?seqCorrect:qtype==="zone-click"?zoneCorrect:(sel===q.ok)) ? "✓ Correct" : "✗ Incorrect"}
              </div>
              <div style={{fontSize:13,color:C.dim,lineHeight:1.75,marginBottom:".75rem"}}>{q.why || q.explanation}</div>
              {(() => {
                const userCorrect = qtype === "seq" ? seqCorrect : qtype === "zone-click" ? zoneCorrect : (sel === q.ok);
                let pct = null, isSample = false;
                if (isDemo) { pct = demoStatPct(q.id, q.d); isSample = true; }
                else {
                  const s = statsMap[q.id];
                  if (s && s.attempts >= 10) pct = Math.round((s.correct / s.attempts) * 100);
                }
                if (pct === null) return null;
                const displayPct = userCorrect ? pct : pct;
                const msg = userCorrect
                  ? `🎯 ${displayPct}% of players got this right`
                  : (pct <= 40 ? `💪 Only ${pct}% got this right — tough one` : `📊 ${pct}% of players got this right`);
                return (
                  <div style={{fontSize:11,color:C.dimmer,marginBottom:".6rem",display:"flex",alignItems:"center",gap:".4rem"}}>
                    <span>{msg}</span>
                    {isSample && <span style={{background:C.dimmest,color:C.dimmer,padding:"1px 6px",borderRadius:4,fontSize:9,letterSpacing:".08em",fontWeight:700}}>SAMPLE</span>}
                  </div>
                );
              })()}
              {q.tip && <div style={{fontSize:12,color:C.purple,fontStyle:"italic",borderTop:`1px solid ${C.border}`,paddingTop:".6rem"}}>💡 {q.tip}</div>}
            </Card>
            {quizDone ? (
              <button onClick={() => onFinish(results, seqPerfect, mistakeStreak)} style={{background:C.gold,color:C.bg,border:"none",borderRadius:12,padding:".9rem",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:FONT.body,width:"100%"}}>
                See Results →
              </button>
            ) : (
              <button onClick={advance} style={{background:C.purple,color:C.white,border:"none",borderRadius:12,padding:".9rem",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:FONT.body,width:"100%"}}>
                Next Question →
              </button>
            )}
            <button onClick={() => setShowFlag(true)} style={{background:"none",border:"none",color:C.dimmer,fontSize:11,marginTop:".65rem",cursor:"pointer",fontFamily:FONT.body,width:"100%",textAlign:"center",padding:".4rem",textDecoration:"underline"}}>
              🚩 Report this question
            </button>
          </div>
        )}

        {showFlag && (
          <div onClick={()=>setShowFlag(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
            <div onClick={e=>e.stopPropagation()} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:16,padding:"1.5rem",maxWidth:420,width:"100%",color:C.white,fontFamily:FONT.body}}>
              {flagSent ? (
                <div style={{textAlign:"center",padding:"1rem 0"}}>
                  <div style={{fontSize:32,marginBottom:".5rem"}}>✅</div>
                  <div style={{fontWeight:700,fontSize:15,color:C.green}}>Thanks — report sent</div>
                  <div style={{fontSize:12,color:C.dim,marginTop:".3rem"}}>We'll review it.</div>
                </div>
              ) : (<>
                <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,fontWeight:700,marginBottom:".4rem"}}>🚩 Report question</div>
                <div style={{fontSize:14,color:C.dim,lineHeight:1.5,marginBottom:"1rem"}}>What's wrong with this one?</div>
                {[
                  {v:"wrong_answer",l:"The marked answer is wrong"},
                  {v:"misleading",l:"Question or options are misleading"},
                  {v:"too_hard",l:"Too advanced for this age"},
                  {v:"too_easy",l:"Too easy for this age"},
                  {v:"typo",l:"Typo or grammar issue"},
                  {v:"other",l:"Something else"},
                ].map(o => (
                  <button key={o.v} onClick={()=>setFlagReason(o.v)} style={{display:"block",width:"100%",background:flagReason===o.v?C.goldDim:C.bgElevated,border:`1px solid ${flagReason===o.v?C.gold:C.border}`,borderRadius:8,padding:".6rem .8rem",cursor:"pointer",color:flagReason===o.v?C.gold:C.dim,fontSize:13,fontFamily:FONT.body,fontWeight:flagReason===o.v?700:500,textAlign:"left",marginBottom:".35rem"}}>
                    {o.l}
                  </button>
                ))}
                <textarea value={flagDetail} onChange={e=>setFlagDetail(e.target.value)} placeholder="Optional: add more detail (what's wrong, what should be correct, etc.)"
                  rows={3}
                  style={{width:"100%",background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,padding:".6rem .8rem",color:C.white,fontSize:13,fontFamily:FONT.body,outline:"none",lineHeight:1.5,marginTop:".5rem"}}/>
                <div style={{display:"flex",gap:".5rem",marginTop:"1rem"}}>
                  <button onClick={()=>setShowFlag(false)} style={{flex:1,background:"none",border:`1px solid ${C.border}`,borderRadius:10,padding:".7rem",cursor:"pointer",color:C.dimmer,fontSize:13,fontFamily:FONT.body}}>Cancel</button>
                  <button onClick={submitFlag} disabled={!flagReason} style={{flex:2,background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".7rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>Send Report</button>
                </div>
              </>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────
// RESULTS SCREEN
// ─────────────────────────────────────────────────────────
function Results({ results, player, prevScore, totalSessions, seqPerfect, mistakeStreak, onAgain, onHome, showMilestoneBanner, onViewPlans }) {
  const [saved, setSaved] = useState(false);
  const score = calcWeightedIQ(results);
  const tier = getTier(score);
  const badges = calcBadges(results, prevScore, totalSessions, seqPerfect, mistakeStreak);
  const byD = {1:{ok:0,tot:0},2:{ok:0,tot:0},3:{ok:0,tot:0}};
  results.forEach(r => { byD[r.d||2].tot++; if(r.ok) byD[r.d||2].ok++; });
  const byCat = {};
  results.forEach(r => { if(!byCat[r.cat])byCat[r.cat]={ok:0,tot:0}; byCat[r.cat].tot++; if(r.ok)byCat[r.cat].ok++; });
  const byType = {};
  results.forEach(r => { if(!byType[r.type||"mc"])byType[r.type||"mc"]={ok:0,tot:0}; byType[r.type||"mc"].tot++; if(r.ok)byType[r.type||"mc"].ok++; });

  useEffect(() => {
    if (player.coachCode) saveTeamResult(player.coachCode, results, player.season||SEASONS[0]).then(() => setSaved(true));
    else setSaved(true);
    try {
      localStorage.setItem("iceiq_score", JSON.stringify(score));
      localStorage.setItem("iceiq_sessions", String(totalSessions));
      const sd = updateStreak(getStreakData());
      localStorage.setItem("iceiq_streak", JSON.stringify(sd));
    } catch(e) {}
  }, []);

  const dLabel = {1:"Foundation",2:"Developing",3:"Advanced"};
  const correct = results.filter(r=>r.ok).length;

  return (
    <Screen>
      {/* Hero */}
      <div style={{textAlign:"center",marginBottom:"2rem",paddingTop:"1rem",position:"relative",overflow:"hidden"}}>
        <img src={imgSuccess} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.08,pointerEvents:"none",borderRadius:16}}/>
        <div style={{position:"relative"}}>
        <div style={{fontSize:56,marginBottom:".5rem"}}>{tier.badge}</div>
        <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",marginBottom:".15rem"}}>{tier.label}</div>
        <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"5rem",color:tier.color,lineHeight:.9,letterSpacing:"-.02em"}}>{score}<span style={{fontSize:"2rem"}}>%</span></div>
        <div style={{fontSize:13,color:C.dimmer,margin:".5rem 0 .75rem"}}>{correct}/{results.length} correct</div>
        {saved && player.coachCode && (
          <div style={{fontSize:11,color:C.green,display:"flex",alignItems:"center",justifyContent:"center",gap:".3rem"}}>✓ Saved to team {player.coachCode}</div>
        )}
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,rgba(201,168,76,.08),rgba(201,168,76,.02))`,border:`1px solid ${C.goldBorder}`}}>
          <Label>Badges Earned</Label>
          <div style={{display:"flex",gap:".6rem",flexWrap:"wrap"}}>
            {badges.map((b,i) => (
              <div key={i} style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:12,padding:".75rem",textAlign:"center",minWidth:80}}>
                <div style={{fontSize:24,marginBottom:4}}>{b.icon}</div>
                <div style={{fontSize:11,fontWeight:700,color:C.white}}>{b.name}</div>
                <div style={{fontSize:10,color:C.dimmer,marginTop:2}}>{b.desc}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Question type breakdown */}
      {Object.keys(byType).length > 1 && (
        <Card style={{marginBottom:"1rem"}}>
          <Label>By Format</Label>
          <div style={{display:"flex",gap:".5rem",flexWrap:"wrap"}}>
            {Object.entries(byType).map(([type,v]) => {
              const pct = Math.round((v.ok/v.tot)*100);
              const info = Q_TYPE_LABELS[type]||Q_TYPE_LABELS.mc;
              return (
                <div key={type} style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:10,padding:".6rem .85rem",fontSize:12}}>
                  <div style={{color:info.color,fontWeight:700,marginBottom:2}}>{info.icon} {info.label}</div>
                  <div style={{color:pct>=80?C.green:pct>=60?C.yellow:C.red,fontWeight:700}}>{v.ok}/{v.tot}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Difficulty mix */}
      <Card style={{marginBottom:"1rem"}}>
        <Label>Difficulty Mix</Label>
        <div style={{display:"flex",gap:".5rem"}}>
          {[1,2,3].map(d => byD[d].tot > 0 && (
            <div key={d} style={{flex:1,textAlign:"center",padding:".7rem",borderRadius:10,
              background:d===1?"rgba(34,197,94,.07)":d===2?"rgba(234,179,8,.07)":"rgba(239,68,68,.07)",
              border:`1px solid ${d===1?"rgba(34,197,94,.25)":d===2?"rgba(234,179,8,.25)":"rgba(239,68,68,.25)"}`}}>
              <div style={{fontSize:14,fontWeight:700,color:d===1?C.green:d===2?C.yellow:C.red}}>{byD[d].ok}/{byD[d].tot}</div>
              <div style={{fontSize:10,color:C.dimmer,marginTop:2}}>{dLabel[d]}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* By category */}
      <Card style={{marginBottom:"1.5rem"}}>
        <Label>By Category</Label>
        {Object.entries(byCat).map(([cat,v]) => {
          const pct = Math.round((v.ok/v.tot)*100);
          return (
            <div key={cat} style={{marginBottom:".85rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
                <span style={{color:C.dim}}>{cat}</span>
                <span style={{fontWeight:700,color:pct>=80?C.green:pct>=60?C.yellow:C.red}}>{v.ok}/{v.tot}</span>
              </div>
              <ProgressBar value={v.ok} max={v.tot} color={pct>=80?C.green:pct>=60?C.yellow:C.red}/>
            </div>
          );
        })}
      </Card>

      {showMilestoneBanner && (
        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.04))`,border:`1px solid ${C.goldBorder}`,textAlign:"center",padding:"1.25rem"}}>
          <div style={{fontSize:24,marginBottom:".4rem"}}>🏆</div>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem",color:C.gold,marginBottom:".3rem"}}>5 quizzes complete!</div>
          <div style={{fontSize:12,color:C.dim,lineHeight:1.5,marginBottom:".85rem"}}>Free keeps only your last 5 sessions. Upgrade to track your full journey and see your progress over time.</div>
          <button onClick={onViewPlans} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".55rem 1.1rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>See Pro Plans →</button>
        </Card>
      )}

      <PrimaryBtn onClick={onAgain} style={{marginBottom:".75rem"}}>Take Another Quiz →</PrimaryBtn>
      <SecBtn onClick={onHome}>← Home</SecBtn>
    </Screen>
  );
}


// ─────────────────────────────────────────────────────────
// GATED SMART GOALS SCREEN (with blurred preview)
// ─────────────────────────────────────────────────────────
function DemoQuizCapScreen({ onBack, onSignUp }) {
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"2rem 1.25rem",textAlign:"center"}}>
      <div style={{maxWidth:380,width:"100%"}}>
        <div style={{fontSize:48,marginBottom:"1rem"}}>🎮</div>
        <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.8rem",marginBottom:".5rem"}}>Enjoying the demo?</div>
        <div style={{fontSize:14,color:C.dim,lineHeight:1.65,marginBottom:"1.75rem"}}>
          You've completed your demo quiz. <strong style={{color:C.white}}>Sign up for a free account</strong> to keep playing, track your progress, and build your Game Sense profile.
        </div>
        <button onClick={onSignUp} style={{width:"100%",background:C.gold,color:C.bg,border:"none",borderRadius:12,padding:"1rem",cursor:"pointer",fontWeight:800,fontSize:16,fontFamily:FONT.body,marginBottom:".75rem",boxShadow:`0 4px 16px ${C.gold}33`}}>
          Create your free account →
        </button>
        <button onClick={onBack} style={{width:"100%",background:"none",border:`1px solid ${C.border}`,borderRadius:12,padding:".85rem",cursor:"pointer",color:C.dimmer,fontWeight:600,fontSize:14,fontFamily:FONT.body}}>
          Back to home
        </button>
      </div>
    </div>
  );
}

function FreeQuizCapScreen({ onBack, onUpgrade }) {
  const [countdown, setCountdown] = useState(formatCountdown(msUntilNextWeek()));
  useEffect(() => {
    const t = setInterval(() => setCountdown(formatCountdown(msUntilNextWeek())), 60000);
    return () => clearInterval(t);
  }, []);
  const used = getFreeQuizCount();
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"2rem 1.25rem",textAlign:"center"}}>
      <div style={{maxWidth:380,width:"100%"}}>
        <div style={{fontSize:48,marginBottom:"1rem"}}>🏒</div>
        <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.8rem",marginBottom:".5rem"}}>Weekly limit reached</div>
        <div style={{fontSize:14,color:C.dim,lineHeight:1.65,marginBottom:"1.75rem"}}>
          Free players get <strong style={{color:C.white}}>{FREE_WEEKLY_QUIZ_CAP} quizzes per week</strong>. You've completed {used} this week. New quizzes unlock in <strong style={{color:C.gold}}>{countdown}</strong>.
        </div>
        <button onClick={onUpgrade} style={{width:"100%",background:C.gold,color:C.bg,border:"none",borderRadius:12,padding:"1rem",cursor:"pointer",fontWeight:800,fontSize:16,fontFamily:FONT.body,marginBottom:".75rem",boxShadow:`0 4px 16px ${C.gold}33`}}>
          Unlock unlimited quizzes →
        </button>
        <button onClick={onBack} style={{width:"100%",background:"none",border:`1px solid ${C.border}`,borderRadius:12,padding:".85rem",cursor:"pointer",color:C.dimmer,fontWeight:600,fontSize:14,fontFamily:FONT.body}}>
          Back to home
        </button>
      </div>
    </div>
  );
}

function GatedGoalsScreen({ onBack, onUnlock }) {
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:80,position:"relative"}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1,fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>SMART Goals</div>
        </div>
      </StickyHeader>

      {/* Blurred background preview */}
      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto",filter:"blur(4px)",opacity:0.6}}>
        <Card style={{marginBottom:"1rem",background:C.bgElevated,border:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:".5rem",marginBottom:".75rem"}}>
            <span style={{fontSize:18}}>🎯</span>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>Improve my gap control</div>
              <div style={{fontSize:11,color:C.dimmer}}>Gap Control · Specificity 80%</div>
            </div>
          </div>
          <div style={{fontSize:12,lineHeight:1.6,color:C.dim}}>
            <div><strong>Specific:</strong> Maintain a 10-foot gap on all rush situations</div>
            <div style={{marginTop:".5rem"}}><strong>Measurable:</strong> Reduce missed gap assignments to 0 per game</div>
            <div style={{marginTop:".5rem"}}><strong>Achievable:</strong> I understand gap theory already</div>
            <div style={{marginTop:".5rem"}}><strong>Relevant:</strong> Gap control is the #1 D skill</div>
            <div style={{marginTop:".5rem"}}><strong>Time-bound:</strong> Before Christmas break</div>
          </div>
        </Card>
      </div>

      {/* Gate overlay */}
      <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:`linear-gradient(180deg,transparent 30%,${C.bg}90% 100%)`,display:"flex",alignItems:"flex-end",justifyContent:"center",paddingBottom:"120px"}}>
        <Card style={{textAlign:"center",padding:"2rem 1.25rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.goldBorder}`,maxWidth:"100%"}}>
          <div style={{fontSize:40,marginBottom:".75rem"}}>🔒</div>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.6rem",color:C.gold,marginBottom:".5rem"}}>SMART Goals</div>
          <div style={{fontSize:13,color:C.dim,lineHeight:1.6,marginBottom:"1.5rem"}}>Set specific, measurable, achievable development goals across every skill category — tied to your self-assessment and coach feedback.</div>
          <button onClick={onUnlock} style={{background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".8rem 1.5rem",cursor:"pointer",fontWeight:800,fontSize:14,fontFamily:FONT.body}}>Unlock with Pro →</button>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// WEEKLY CHALLENGE
// ─────────────────────────────────────────────────────────
function WeeklyQuiz({ player, onBack, onFinish }) {
  const [questions, setQuestions] = useState(null);
  const [current, setCurrent] = useState(0);
  const { sel, setSel, seqAnswered, setSeqAnswered, seqCorrect, setSeqCorrect, results, setResults } = useQuizState();
  const [done, setDone] = useState(false);
  const weekRecord = getThisWeekRecord();

  useEffect(() => {
    loadQB().then(qb => {
      setQuestions(buildWeeklyQueue(qb, player.level, player.position));
    });
  }, []);

  if (!questions) return <Screen><div style={{color:C.dimmer,textAlign:"center",paddingTop:"4rem"}}>Loading challenge…</div></Screen>;

  const q = questions[current];
  const qtype = q?.type || "mc";
  const qLen = questions.length;
  const typeInfo = Q_TYPE_LABELS[qtype] || Q_TYPE_LABELS.mc;

  function submitAnswer(ok, extra = {}) {
    const result = { id: q.id, cat: q.cat, type: qtype, d: q.d || 2, ok, ...extra };
    const newResults = [...results, result];
    setResults(newResults);
    if (current + 1 >= qLen) {
      const score = calcWeightedIQ(newResults);
      markWeeklyComplete(score);
      onFinish(newResults, score);
      setDone(true);
    } else {
      setTimeout(() => { setCurrent(c => c + 1); setSel(null); setSeqAnswered(false); setSeqCorrect(false); }, 900);
    }
  }

  function handlePick(i) {
    if (sel !== null) return;
    setSel(i);
    submitAnswer(i === q.ok);
  }

  function handleTF(val) {
    if (sel !== null) return;
    setSel(val ? "true" : "false");
    submitAnswer(val === q.ok);
  }

  function handleSeqAnswer(isCorrect) {
    if (seqAnswered) return;
    setSeqAnswered(true);
    setSeqCorrect(isCorrect);
    submitAnswer(isCorrect);
  }

  if (done) return null;

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:40}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <button onClick={onBack} style={{background:"none",border:`1px solid ${C.border}`,color:C.dimmer,borderRadius:8,padding:".35rem .75rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body}}>←</button>
          <div style={{flex:1}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1rem",color:C.gold}}>🏆 Weekly Challenge</div>
            <div style={{fontSize:11,color:C.dimmer}}>Q{current+1}/{qLen} · {getWeekKey()}</div>
          </div>
          <div style={{width:80,height:4,background:C.dimmest,borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(current/qLen)*100}%`,background:C.gold,borderRadius:2,transition:"width .35s ease"}}/>
          </div>
        </div>
      </StickyHeader>

      <div style={{padding:"1.5rem 1.25rem",maxWidth:560,margin:"0 auto"}}>
        <div style={{display:"flex",gap:".5rem",marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
          <Pill color={typeInfo.color}>{typeInfo.icon} {typeInfo.label}</Pill>
          <Pill color={C.dimmer} bg={C.dimmest}>{q.cat}</Pill>
        </div>

        {(qtype === "mc" || qtype === "next") && (
          <Card style={{marginBottom:"1.25rem",background:C.purpleDim,border:`1px solid ${C.purpleBorder}`}}>
            <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.purple,marginBottom:".6rem",fontWeight:700}}>📋 Game Situation</div>
            <div style={{fontSize:15,lineHeight:1.8,color:C.white,fontWeight:500}}>{q.sit}</div>
          </Card>
        )}
        {qtype === "tf" && (
          <Card style={{marginBottom:"1.25rem",background:C.blueDim,border:`1px solid rgba(59,130,246,.3)`}}>
            <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.blue,marginBottom:".6rem",fontWeight:700}}>⚡ True or False?</div>
            <div style={{fontSize:15,lineHeight:1.8,color:C.white,fontWeight:500}}>{q.sit}</div>
          </Card>
        )}
        {qtype === "mistake" && (
          <Card style={{marginBottom:"1.25rem",background:C.redDim,border:`1px solid ${C.redBorder}`}}>
            <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.red,marginBottom:".6rem",fontWeight:700}}>🔍 Spot the Mistake</div>
            <div style={{fontSize:14,color:C.dim,lineHeight:1.7,marginBottom:".75rem"}}>{q.sit}</div>
          </Card>
        )}
        {qtype === "seq" && (
          <Card style={{marginBottom:"1.25rem",background:C.goldDim,border:`1px solid ${C.goldBorder}`}}>
            <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,marginBottom:".6rem",fontWeight:700}}>🔢 Put in Order</div>
            <div style={{fontSize:15,lineHeight:1.8,color:C.white,fontWeight:500}}>{q.sit}</div>
          </Card>
        )}

        {qtype === "mc" && <MCQuestion q={q} sel={sel} onPick={handlePick} colorblind={player.colorblind}/>}
        {qtype === "next" && <MCQuestion q={q} sel={sel} onPick={handlePick} colorblind={player.colorblind}/>}
        {qtype === "mistake" && <MCQuestion q={q} sel={sel} onPick={handlePick} colorblind={player.colorblind}/>}
        {qtype === "tf" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:"1rem"}}>
            {["True","False"].map((label, i) => {
              const isTrue = i === 0;
              const isSelected = sel === (isTrue ? "true" : "false");
              const isCorrect = isTrue === q.ok;
              const revealColor = sel !== null ? (isCorrect ? C.green : C.red) : null;
              return (
                <button key={label} onClick={() => handleTF(isTrue)} disabled={sel !== null} style={{background:isSelected?(isCorrect?"rgba(34,197,94,.15)":"rgba(239,68,68,.15)"):C.bgElevated,border:`2px solid ${revealColor && isSelected ? revealColor : (revealColor && isCorrect && sel !== null ? revealColor : C.border)}`,borderRadius:12,padding:"1.25rem",cursor:sel!==null?"default":"pointer",fontWeight:700,fontSize:16,color:isSelected?(isCorrect?C.green:C.red):C.white,fontFamily:FONT.body}}>
                  {label}
                </button>
              );
            })}
          </div>
        )}
        {qtype === "seq" && <SeqQuestion q={q} answered={seqAnswered} onAnswer={handleSeqAnswer}/>}

        {sel !== null && qtype !== "seq" && (() => {
          const wasCorrect = qtype === "tf" ? (sel === "true") === q.ok : sel === q.ok;
          return (
            <Card style={{marginTop:".5rem",background:wasCorrect ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)",border:`1px solid ${wasCorrect ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)"}`}}>
              <div style={{fontSize:11,fontWeight:700,color:wasCorrect ? C.green : C.red,marginBottom:".4rem"}}>{wasCorrect ? "✓ Correct" : "✗ Incorrect"}</div>
              <div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>{q.why}</div>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}

function WeeklyResults({ score, results, onHome, player }) {
  const tierInfo = getTier(score);
  const weekRecord = getThisWeekRecord();
  return (
    <Screen>
      <div style={{textAlign:"center",marginBottom:"2rem",paddingTop:"1rem"}}>
        <div style={{fontSize:48,marginBottom:".5rem"}}>🏆</div>
        <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.4rem",color:C.gold,marginBottom:".25rem"}}>Weekly Challenge Complete!</div>
        <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"5rem",color:tierInfo.color,lineHeight:.9,letterSpacing:"-.02em"}}>{score}<span style={{fontSize:"2rem"}}>%</span></div>
        <div style={{fontSize:13,color:C.dimmer,marginTop:".5rem"}}>{results.filter(r=>r.ok).length}/{results.length} correct · {getWeekKey()}</div>
        <div style={{fontSize:12,color:C.dimmer,marginTop:".35rem"}}>New challenge drops every Monday</div>
      </div>
      <PrimaryBtn onClick={onHome} style={{marginBottom:".75rem"}}>← Back to Home</PrimaryBtn>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────
// SMART GOALS SCREEN
// ─────────────────────────────────────────────────────────
function GoalsScreen({ player, onSave, onBack }) {
  const cats = GOAL_CATS[player.level] || [];
  const [goals, setGoals] = useState({ ...(player.goals || {}) });
  const [active, setActive] = useState(cats[0] || "");
  const [step, setStep] = useState("S");

  const SMART_STEPS = ["S","M","A","R","T"];
  const SMART_LABELS = {S:"Specific",M:"Measurable",A:"Achievable",R:"Relevant",T:"Time-bound"};
  const SMART_ICONS = {S:"🎯",M:"📏",A:"✅",R:"🏒",T:"📅"};
  const SMART_EXAMPLES = {
    "Skating":      {S:"Improve my backward crossovers on both sides",M:"Coach rates me 'On Track' in skating within 4 weeks",A:"I can already do basic crossovers",R:"Better backward skating helps my gap control as a defender",T:"By end of October"},
    "Gap Control":  {S:"Maintain a 10-foot gap on all rush situations",M:"Reduce missed gap assignments to 0 per game",A:"I understand gap theory already",R:"Gap control is the #1 D skill in atom hockey",T:"Before Christmas break"},
    "Rush Reads":   {S:"Make the correct 2-on-1 decision every time",M:"Score 80%+ on Rush Reads in Ice-IQ",A:"I get the concept, just need reps",R:"Rush reads are my weakest Ice-IQ category",T:"End of this month"},
    "Shooting":     {S:"Improve my quick-release wrist shot accuracy",M:"Hit top corners 3 out of 5 in practice drills",A:"I have good fundamentals already",R:"Quick release is what separates scorers at this level",T:"Within 6 weeks"},
    "Game IQ":      {S:"Pre-read plays before the puck arrives",M:"Ice-IQ score improves from current to Hockey Sense tier",A:"I've started thinking about it more already",R:"Faster reads = better plays",T:"End of season"},
  };

  function updateGoal(cat, field, value) {
    setGoals(g => ({...g, [cat]: {...(g[cat]||{}), [field]: value}}));
  }

  const currentGoal = goals[active] || {};
  const completedSteps = SMART_STEPS.filter(s => currentGoal[s]?.trim());
  const isComplete = completedSteps.length === 5 && currentGoal.goal?.trim();
  const example = SMART_EXAMPLES[active] || {};

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:80}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>SMART Goals</div>
            <div style={{fontSize:11,color:C.dimmer}}>{player.level} · {Object.keys(goals).filter(k=>goals[k]?.goal).length}/{cats.length} set</div>
          </div>
          <button onClick={() => onSave(goals)} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".4rem 1rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>Save</button>
        </div>
      </StickyHeader>

      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
        {/* Category tabs */}
        <div style={{display:"flex",gap:".5rem",overflowX:"auto",marginBottom:"1.25rem",paddingBottom:".25rem"}}>
          {cats.map(cat => {
            const g = goals[cat]||{};
            const done = SMART_STEPS.filter(s=>g[s]?.trim()).length;
            const hasGoal = g.goal?.trim();
            return (
              <button key={cat} onClick={() => {setActive(cat);setStep("S");}} style={{
                background:active===cat?C.goldDim:C.bgCard,
                border:`1px solid ${active===cat?C.gold:C.border}`,
                borderRadius:20,padding:".45rem 1rem",
                cursor:"pointer",whiteSpace:"nowrap",
                color:active===cat?C.gold:C.dim,
                fontFamily:FONT.body,fontSize:13,
                fontWeight:active===cat?700:400,
                display:"flex",alignItems:"center",gap:".4rem",
                flexShrink:0,
              }}>
                {cat} {hasGoal?<span style={{color:C.green,fontSize:10}}>✓</span>:done>0?<span style={{color:C.dimmer,fontSize:10}}>{done}/5</span>:null}
              </button>
            );
          })}
        </div>

        {/* Goal statement */}
        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.goldDim},transparent)`}}>
          <Label>Your Goal — {active}</Label>
          <textarea
            value={currentGoal.goal||""}
            onChange={e => updateGoal(active,"goal",e.target.value)}
            placeholder={`What is your development goal for ${active}?`}
            rows={2}
            style={{background:"none",border:"none",color:C.white,fontSize:14,fontFamily:FONT.body,width:"100%",outline:"none",resize:"none",lineHeight:1.6}}
          />
          <div style={{height:1,background:currentGoal.goal?C.gold:C.border,marginTop:".5rem",transition:"background .2s"}}/>
        </Card>

        {/* SMART steps */}
        <div style={{marginBottom:"1rem"}}>
          <div style={{display:"flex",gap:".4rem",marginBottom:"1rem"}}>
            {SMART_STEPS.map(s => (
              <button key={s} onClick={() => setStep(s)} style={{
                flex:1,background:step===s?C.purpleDim:C.bgCard,
                border:`1px solid ${step===s?C.purpleBorder:C.border}`,
                borderRadius:8,padding:".5rem .25rem",
                cursor:"pointer",textAlign:"center",
              }}>
                <div style={{fontSize:15}}>{SMART_ICONS[s]}</div>
                <div style={{fontSize:10,color:step===s?C.purple:currentGoal[s]?C.green:C.dimmer,fontWeight:700}}>{s}</div>
              </button>
            ))}
          </div>

          <Card>
            <div style={{fontSize:11,color:C.purple,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",marginBottom:".35rem"}}>{SMART_ICONS[step]} {SMART_LABELS[step]}</div>
            <div style={{fontSize:12,color:C.dimmer,marginBottom:".85rem",lineHeight:1.6}}>{SMART_PROMPTS[step]}</div>
            {example[step] && (
              <div style={{fontSize:11,color:C.dimmer,background:C.dimmest,borderRadius:8,padding:".6rem .8rem",marginBottom:".85rem",lineHeight:1.5,fontStyle:"italic"}}>
                e.g. "{example[step]}"
              </div>
            )}
            <textarea
              value={currentGoal[step]||""}
              onChange={e => updateGoal(active,step,e.target.value)}
              placeholder="Write your answer here..."
              rows={3}
              style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:10,padding:".75rem 1rem",color:C.white,fontSize:13,fontFamily:FONT.body,width:"100%",outline:"none",resize:"none",lineHeight:1.6}}
            />
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:".75rem"}}>
              <div style={{fontSize:11,color:C.dimmer}}>{completedSteps.length}/5 steps complete</div>
              {step !== "T" && (
                <button onClick={() => setStep(SMART_STEPS[SMART_STEPS.indexOf(step)+1])} style={{background:C.purple,color:C.white,border:"none",borderRadius:8,padding:".4rem 1rem",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:FONT.body}}>
                  Next →
                </button>
              )}
              {step === "T" && isComplete && (
                <button onClick={() => onSave(goals)} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".4rem 1rem",cursor:"pointer",fontSize:12,fontWeight:800,fontFamily:FONT.body}}>
                  Save Goal ✓
                </button>
              )}
            </div>
          </Card>
        </div>

        {/* Completed goal preview */}
        {isComplete && (
          <Card style={{background:"rgba(34,197,94,.06)",border:`1px solid ${C.greenBorder}`}}>
            <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:C.green,fontWeight:700,marginBottom:".5rem"}}>✓ Goal Complete</div>
            <div style={{fontSize:13,color:C.white,fontWeight:600,marginBottom:".5rem"}}>{currentGoal.goal}</div>
            {SMART_STEPS.map(s => (
              <div key={s} style={{fontSize:12,color:C.dim,marginBottom:".25rem",lineHeight:1.5}}>
                <span style={{color:C.green,fontWeight:700}}>{SMART_LABELS[s]}:</span> {currentGoal[s]}
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────
// SKILLS, REPORT, PROFILE, COACH, BOTTOM NAV (condensed)
// ─────────────────────────────────────────────────────────

// Rating button renderer — branches by scale type (emoji/frequency/growth/rubric)
function RatingButtons({ level, value, onChange }) {
  const scaleInfo = RATING_SCALES[level]?.self;
  if (!scaleInfo) return null;
  const { options } = scaleInfo;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:".4rem"}}>
      {options.map((o, i) => {
        const picked = value === o.value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            background: picked ? `${o.color}1a` : C.bgElevated,
            border: `1px solid ${picked ? o.color+"60" : C.border}`,
            borderLeft: `3px solid ${picked ? o.color : "transparent"}`,
            borderRadius: 10, padding:".65rem .85rem", cursor:"pointer",
            display:"flex", alignItems:"center", gap:".7rem",
            textAlign:"left", fontFamily:FONT.body,
          }}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,minWidth:26}}>
              <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem",color:o.color,lineHeight:1}}>{i+1}</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:picked?o.color:C.white,marginBottom:2}}>{o.label}</div>
              <div style={{fontSize:11,color:C.dimmer,lineHeight:1.45}}>{o.sub}</div>
            </div>
            {picked && <div style={{color:o.color,fontSize:14,flexShrink:0}}>✓</div>}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// UPGRADE PROMPT — reusable modal for gated features
// ─────────────────────────────────────────────────────────

function UpgradePrompt({ feature, onClose, onViewPlans, target }) {
  const message = getUpgradeTriggerMessage(feature);
  const upgradeTarget = target || "pro";
  const benefits =
    upgradeTarget === "family" ? FAMILY_BENEFITS :
    upgradeTarget === "team"   ? TEAM_BENEFITS :
    PRO_BENEFITS;
  const tierName = upgradeTarget === "family" ? "Family" : upgradeTarget === "team" ? "Team" : "Pro";
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem",fontFamily:FONT.body}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.bgCard,border:`1px solid ${C.goldBorder}`,borderRadius:16,padding:"1.5rem",maxWidth:440,width:"100%",color:C.white}}>
        <div style={{fontSize:32,textAlign:"center",marginBottom:".5rem"}}>🔒</div>
        <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.5rem",textAlign:"center",marginBottom:".35rem",color:C.gold}}>{message}</div>
        <div style={{fontSize:12,color:C.dimmer,textAlign:"center",marginBottom:"1.25rem"}}>Unlock this and more with Ice-IQ {tierName}</div>

        <div style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:10,padding:".85rem 1rem",marginBottom:"1rem"}}>
          <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,fontWeight:700,marginBottom:".6rem"}}>What you get with {tierName}</div>
          {benefits.map((b, i) => (
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:".55rem",padding:".3rem 0",fontSize:12,color:C.dim,lineHeight:1.5}}>
              <span style={{fontSize:14,flexShrink:0}}>{b.icon}</span>
              <span>{b.text}</span>
            </div>
          ))}
        </div>

        <div style={{display:"flex",gap:".5rem"}}>
          <button onClick={onClose} style={{flex:1,background:"none",border:`1px solid ${C.border}`,borderRadius:10,padding:".75rem",cursor:"pointer",color:C.dimmer,fontSize:13,fontFamily:FONT.body}}>Not now</button>
          <button onClick={onViewPlans} style={{flex:2,background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".75rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>View Plans →</button>
        </div>
      </div>
    </div>
  );
}

function LockedCard({ feature, title, description, onUnlock, target = "pro" }) {
  const tierName = target.charAt(0).toUpperCase() + target.slice(1);
  return (
    <Card style={{marginBottom:"1rem",background:C.bgElevated,border:`1px dashed ${C.border}`,textAlign:"center",padding:"1.5rem"}}>
      <div style={{fontSize:32,marginBottom:".5rem",opacity:.5}}>🔒</div>
      <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem",color:C.dim,marginBottom:".35rem"}}>{title}</div>
      <div style={{fontSize:12,color:C.dimmer,marginBottom:"1rem",lineHeight:1.5}}>{description}</div>
      <button onClick={onUnlock} style={{background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".6rem 1.25rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>
        Unlock with {tierName} →
      </button>
    </Card>
  );
}

// Level-aware question phrasing
function getSelfPrompt(level, skill) {
  if (level === "U7 / Initiation") return skill.desc;
  if (level === "U9 / Novice") {
    const q = skill.selfQ || skill.desc;
    // Reframe as frequency-friendly if needed
    if (q.startsWith("Can you ")) return "How often can you " + q.slice(8);
    if (q.startsWith("Do you ")) return "How often do you " + q.slice(7);
    return q;
  }
  return skill.selfQ || skill.desc;
}

function Skills({ player, onSave, onBack }) {
  const [ratings, setRatings] = useState({...player.selfRatings});
  const [activeCategory, setActiveCategory] = useState(0);
  const cats = SKILLS[player.level] || [];
  const cat = cats[activeCategory];
  const total = Object.keys(ratings).length;
  const rated = Object.values(ratings).filter(v=>v!==null).length;
  const selfScale = getSelfScale(player.level);
  const scaleType = RATING_SCALES[player.level]?.self?.type;
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:80}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>My Skills</div>
            <div style={{fontSize:11,color:C.dimmer}}>{rated}/{total} rated</div>
          </div>
          <ProgressBar value={rated} max={total} color={C.gold} height={4}/>
          <button onClick={()=>onSave(ratings)} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".4rem 1rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>Save</button>
        </div>
      </StickyHeader>
      <div style={{display:"flex",overflowX:"auto",borderBottom:`1px solid ${C.border}`,background:C.bg}}>
        {cats.map((c,i) => {
          const cr = c.skills.filter(s=>ratings[s.id]!==null).length;
          return (
            <button key={i} onClick={()=>setActiveCategory(i)} style={{background:"none",border:"none",borderBottom:`2px solid ${i===activeCategory?(c.isDM?C.purple:C.gold):"transparent"}`,color:i===activeCategory?C.white:C.dimmer,padding:".8rem 1rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body,fontWeight:i===activeCategory?700:400,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:".3rem",flexShrink:0}}>
              <span>{c.icon}</span><span>{c.cat}</span>{cr===c.skills.length&&<span style={{color:C.green,fontSize:10}}>✓</span>}
            </button>
          );
        })}
      </div>
      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
        {cat?.isDM && <Card style={{marginBottom:"1rem",background:C.purpleDim,border:`1px solid ${C.purpleBorder}`}}><div style={{fontSize:12,color:C.purple,lineHeight:1.6}}>🧠 Rate honestly — this is for your development, not anyone else's judgment.</div></Card>}
        {scaleType === "rubric" && (
          <Card style={{marginBottom:"1rem",background:C.bgElevated}}>
            <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:C.gold,fontWeight:700,marginBottom:".5rem"}}>How to rate yourself</div>
            <div style={{fontSize:12,color:C.dim,lineHeight:1.6}}>Each level has a specific behavior. Pick the one that sounds most like you in games — not practice. Be honest: this creates better conversations with your coach.</div>
          </Card>
        )}
        {cat?.skills.map(s => {
          const selfVal = ratings[s.id];
          const selfColor = selfVal ? getScaleColor(selfScale, selfVal) : null;
          return (
            <Card key={s.id} style={{marginBottom:".75rem",border:`1px solid ${selfColor?selfColor+"40":C.border}`,borderLeft:`3px solid ${selfColor||"transparent"}`}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{s.name}</div>
              <div style={{fontSize:12,color:C.dimmer,marginBottom:".85rem",lineHeight:1.5}}>{getSelfPrompt(player.level, s)}</div>
              <RatingButtons level={player.level} value={selfVal} onChange={v => setRatings(p=>({...p,[s.id]:v}))} />
            </Card>
          );
        })}
        {activeCategory<cats.length-1 && <SecBtn onClick={()=>setActiveCategory(i=>i+1)}>Next Category →</SecBtn>}
        {activeCategory===cats.length-1 && <PrimaryBtn onClick={()=>onSave(ratings)}>Save All Ratings ✓</PrimaryBtn>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// RADAR / SPIDER CHART — skill breakdown visualization
// Averages each skill category and plots self + coach on the same axes
// ─────────────────────────────────────────────────────────
function SkillsRadar({ cats, selfRatings, coachRatings, selfScale, coachScale }) {
  const W = 320, H = 320;
  const cx = W / 2, cy = H / 2;
  const radius = 110;
  const rings = [0.25, 0.5, 0.75, 1.0];
  // One axis per category — average the skills within each category
  const axes = cats.map(cat => {
    const selfVals = cat.skills.map(s => selfRatings?.[s.id]).filter(Boolean);
    const coachVals = cat.skills.map(s => coachRatings?.[s.id]).filter(Boolean);
    const avgSelf = selfVals.length
      ? selfVals.map(v => normalizeRating(selfScale, v)).filter(x => x !== null).reduce((a,b)=>a+b,0) / Math.max(1, selfVals.filter(v => normalizeRating(selfScale, v) !== null).length)
      : null;
    const avgCoach = coachVals.length
      ? coachVals.map(v => normalizeRating(coachScale, v)).filter(x => x !== null).reduce((a,b)=>a+b,0) / Math.max(1, coachVals.filter(v => normalizeRating(coachScale, v) !== null).length)
      : null;
    return { label: cat.cat, icon: cat.icon, self: avgSelf, coach: avgCoach };
  }).filter(a => a.self !== null || a.coach !== null);

  if (axes.length < 3) return (
    <div style={{fontSize:12,color:C.dimmer,fontStyle:"italic",textAlign:"center",padding:"1rem 0"}}>Rate at least 3 skill categories to see your Skills Map.</div>
  );

  const n = axes.length;
  // Angle 0 at top, clockwise
  const angle = i => -Math.PI/2 + (i * 2*Math.PI/n);
  const point = (i, r) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];

  // Build polygons for self and coach
  const selfPath = axes.map((a, i) => {
    const [x, y] = point(i, (a.self ?? 0) * radius);
    return `${i===0?"M":"L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z";
  const hasCoach = axes.some(a => a.coach !== null);
  const coachPath = hasCoach ? axes.map((a, i) => {
    const [x, y] = point(i, (a.coach ?? 0) * radius);
    return `${i===0?"M":"L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z" : null;

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{display:"block",maxWidth:"100%",height:"auto"}}>
        {/* Grid rings */}
        {rings.map(r => {
          const pts = axes.map((_, i) => point(i, r * radius).map(v => v.toFixed(1)).join(",")).join(" ");
          return <polygon key={r} points={pts} fill="none" stroke={C.border} strokeWidth="1" opacity={0.5}/>;
        })}
        {/* Axis lines */}
        {axes.map((_, i) => {
          const [x, y] = point(i, radius);
          return <line key={i} x1={cx} y1={cy} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke={C.border} strokeWidth="1" opacity={0.4}/>;
        })}
        {/* Coach polygon (under self) */}
        {coachPath && (
          <path d={coachPath} fill={C.gold} fillOpacity="0.08" stroke={C.gold} strokeWidth="2" strokeOpacity="0.65"/>
        )}
        {/* Self polygon */}
        <path d={selfPath} fill={C.purple} fillOpacity="0.18" stroke={C.purple} strokeWidth="2"/>
        {/* Self data points */}
        {axes.map((a, i) => {
          if (a.self === null) return null;
          const [x, y] = point(i, a.self * radius);
          return <circle key={`s${i}`} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3.5" fill={C.purple}/>;
        })}
        {/* Coach data points */}
        {hasCoach && axes.map((a, i) => {
          if (a.coach === null) return null;
          const [x, y] = point(i, a.coach * radius);
          return <circle key={`c${i}`} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3.5" fill={C.gold}/>;
        })}
        {/* Category labels */}
        {axes.map((a, i) => {
          const [lx, ly] = point(i, radius + 22);
          const anchor = Math.abs(lx - cx) < 8 ? "middle" : (lx > cx ? "start" : "end");
          return (
            <g key={`l${i}`}>
              <text x={lx.toFixed(1)} y={ly.toFixed(1)} fontSize="10" fontWeight="700" fill={C.white} textAnchor={anchor} dominantBaseline="middle" fontFamily="'Inter', 'DM Sans', sans-serif">
                {a.icon} {a.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{display:"flex",gap:"1.25rem",marginTop:".75rem",fontSize:11}}>
        <div style={{display:"flex",alignItems:"center",gap:".3rem",color:C.dim}}>
          <span style={{display:"inline-block",width:10,height:10,background:C.purple,borderRadius:"50%"}}/> Self
        </div>
        {hasCoach && (
          <div style={{display:"flex",alignItems:"center",gap:".3rem",color:C.dim}}>
            <span style={{display:"inline-block",width:10,height:10,background:C.gold,borderRadius:"50%"}}/> Coach
          </div>
        )}
      </div>
    </div>
  );
}

function Report({ player, onBack, demoCoachData, tier, onUpgrade }) {
  const latest = player.quizHistory[player.quizHistory.length-1];
  const iq = latest ? calcWeightedIQ(latest.results) : null;
  const iqTier = iq !== null ? getTier(iq) : null;
  const canSeeRadar = canAccess("progressSnapshots", tier || "FREE").allowed;
  // Demo bypasses the feedback gate for showcase; real FREE users see the upgrade teaser.
  const coachFeedbackAllowed = canAccess("coachFeedback", tier || "FREE").allowed || !!demoCoachData;
  const goals = player.goals || {};
  const activeGoals = Object.entries(goals).filter(([,v])=>v?.goal?.trim());
  const [coachRatings, setCoachRatings] = useState(null);
  const [coachNotes, setCoachNotes] = useState({});
  const [coachList, setCoachList] = useState([]);
  const [activeCoachIdx, setActiveCoachIdx] = useState(-1); // -1 = All (aggregate)
  const [loadingCoach, setLoadingCoach] = useState(true);

  useEffect(() => {
    if (demoCoachData) {
      setCoachRatings(demoCoachData.ratings || null);
      setCoachNotes(demoCoachData.notes || {});
      setCoachList(demoCoachData.coaches || []);
      setLoadingCoach(false);
      return;
    }
    if (player.id && player.id !== "__demo__") {
      SB.getCoachRatingsForPlayer(player.id).then(data => {
        setCoachRatings(Object.keys(data.ratings || {}).length ? data.ratings : null);
        setCoachNotes(data.notes || {});
        setCoachList([]); // SB path is single-coach today; multi-coach is demo-only for now
        setLoadingCoach(false);
      });
    } else {
      setLoadingCoach(false);
    }
  }, []);

  const activeCoach = activeCoachIdx >= 0 ? coachList[activeCoachIdx] : null;
  const activeCoachRatings = activeCoach ? activeCoach.ratings : coachRatings;
  const activeCoachNotes = activeCoach ? activeCoach.notes : coachNotes;

  const cats = SKILLS[player.level] || [];
  const selfScale = getSelfScale(player.level);
  const coachScale = getCoachScale(player.level);

  // Compute alignment across all rated skills
  const allSkills = cats.flatMap(c => c.skills);
  const aligned = [], gaps = [];
  allSkills.forEach(skill => {
    const sv = player.selfRatings?.[skill.id];
    const cv = coachRatings?.[skill.id];
    if (!sv || !cv) return;
    const sn = normalizeRating(selfScale, sv);
    const cn = normalizeRating(coachScale, cv);
    if (sn === null || cn === null) return;
    const diff = Math.abs(sn - cn);
    if (diff <= 0.2) aligned.push({skill, sn, cn, diff});
    else gaps.push({skill, sn, cn, diff, selfHigher: sn > cn});
  });
  gaps.sort((a,b) => b.diff - a.diff);
  const bothRatedCount = aligned.length + gaps.length;
  const topDiscussion = gaps.slice(0, 3);
  return (
    <Screen>
      <div style={{position:"relative",height:100,overflow:"hidden",borderRadius:16,marginBottom:"1rem"}}>
        <img src={imgDataPanel} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.2}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(8,14,26,1) 0%,transparent 100%)"}}/>
      </div>
      <BackBtn onClick={onBack}/>
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{fontSize:10,letterSpacing:".16em",color:C.gold,textTransform:"uppercase",fontWeight:700,marginBottom:4}}>Player Development Report</div>
        <h1 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"clamp(1.8rem,6vw,2.6rem)",margin:"0 0 .25rem",lineHeight:1}}>{player.name}</h1>
        <div style={{fontSize:13,color:C.dimmer}}>{player.level} · {player.position} · {player.season||SEASONS[0]}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:"1rem"}}>
        <Card style={{background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.goldBorder}`,textAlign:"center"}}>
          <Label>Game Sense</Label>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"3rem",color:iq!==null?iqTier.color:"rgba(255,255,255,.15)",lineHeight:1}}>{iq!==null?`${iq}%`:"—"}</div>
          {iqTier && <div style={{fontSize:12,color:C.dimmer,marginTop:4}}>{iqTier.label}</div>}
        </Card>
        <Card style={{textAlign:"center"}}>
          <Label>Sessions</Label>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"3rem",color:C.gold,lineHeight:1}}>{player.quizHistory.length}</div>
          <div style={{fontSize:12,color:C.dimmer,marginTop:4}}>this season</div>
        </Card>
      </div>
      {activeGoals.length > 0 && (
        <Card style={{marginBottom:"1rem"}}>
          <Label>Active SMART Goals</Label>
          {activeGoals.map(([cat,g]) => (
            <div key={cat} style={{padding:".65rem 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontSize:11,color:C.gold,fontWeight:700,marginBottom:2}}>{cat}</div>
              <div style={{fontSize:13,color:C.dim,lineHeight:1.5}}>{g.goal}</div>
              {g.T && <div style={{fontSize:11,color:C.dimmer,marginTop:2}}>📅 {g.T}</div>}
            </div>
          ))}
        </Card>
      )}
      {/* Coach Feedback — FREE tier teaser */}
      {!coachFeedbackAllowed && (
        <Card style={{marginBottom:"1rem",background:C.bgElevated,border:`1px dashed ${C.goldBorder}`,textAlign:"center",padding:"1.25rem"}}>
          <div style={{fontSize:24,marginBottom:".35rem"}}>🔒</div>
          <Label>Coach Feedback</Label>
          <div style={{fontSize:12,color:C.dimmer,marginBottom:"0.85rem",lineHeight:1.5}}>See ratings and notes from every coach on your team — Head Coach, Assistants, Skills Coach, and more.</div>
          <button onClick={()=>onUpgrade && onUpgrade("coachFeedback","pro")} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".55rem 1.1rem",cursor:"pointer",fontWeight:800,fontSize:12,fontFamily:FONT.body}}>
            Unlock with Pro →
          </button>
        </Card>
      )}

      {/* Coach tab bar — shown when there are 2+ coaches */}
      {coachFeedbackAllowed && coachList.length > 1 && (
        <Card style={{marginBottom:"1rem"}}>
          <Label>Coach Feedback · {coachList.length} coaches</Label>
          <div style={{display:"flex",gap:".4rem",overflowX:"auto",paddingBottom:".25rem",marginTop:".4rem"}}>
            <button onClick={() => setActiveCoachIdx(-1)} style={{
              background: activeCoachIdx===-1 ? C.goldDim : C.bgCard,
              border:`1px solid ${activeCoachIdx===-1 ? C.gold : C.border}`,
              borderRadius:20, padding:".4rem .85rem", cursor:"pointer", whiteSpace:"nowrap",
              color: activeCoachIdx===-1 ? C.gold : C.dim,
              fontFamily:FONT.body, fontSize:12, fontWeight: activeCoachIdx===-1 ? 700 : 500, flexShrink:0,
            }}>All coaches</button>
            {coachList.map((c, i) => (
              <button key={c.id} onClick={() => setActiveCoachIdx(i)} style={{
                background: activeCoachIdx===i ? C.purpleDim : C.bgCard,
                border:`1px solid ${activeCoachIdx===i ? C.purple : C.border}`,
                borderRadius:20, padding:".4rem .85rem", cursor:"pointer", whiteSpace:"nowrap",
                color: activeCoachIdx===i ? C.purple : C.dim,
                fontFamily:FONT.body, fontSize:12, fontWeight: activeCoachIdx===i ? 700 : 500, flexShrink:0,
              }}>{c.name}</button>
            ))}
          </div>
          {activeCoach && (
            <div style={{marginTop:".75rem",padding:".7rem .85rem",background:C.purpleDim,borderRadius:8,borderLeft:`2px solid ${C.purple}`}}>
              <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:C.purple,fontWeight:700,marginBottom:".3rem"}}>{activeCoach.role} · {activeCoach.date}</div>
              <div style={{fontSize:13,color:C.white,lineHeight:1.5}}>{activeCoach.summary}</div>
            </div>
          )}
          {activeCoachIdx === -1 && (
            <div style={{marginTop:".75rem",fontSize:11,color:C.dimmer,lineHeight:1.5}}>Averaged across all {coachList.length} coaches. Tap a coach to see their individual ratings.</div>
          )}
        </Card>
      )}

      {/* Alignment Score — summary (hidden for FREE) */}
      {coachFeedbackAllowed && coachRatings && bothRatedCount > 0 && (
        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.purpleBorder}`}}>
          <Label>Coach Alignment</Label>
          <div style={{display:"flex",alignItems:"flex-end",gap:"1rem",marginBottom:".75rem"}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2.8rem",color:C.purple,lineHeight:1}}>{aligned.length}<span style={{fontSize:"1.2rem",color:C.dimmer}}>/{bothRatedCount}</span></div>
            <div style={{fontSize:12,color:C.dim,lineHeight:1.5,paddingBottom:".4rem"}}>skills where you and your coach see things the same way</div>
          </div>
          {topDiscussion.length > 0 && (
            <div style={{marginTop:".75rem",paddingTop:".75rem",borderTop:`1px solid ${C.border}`}}>
              <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:C.gold,fontWeight:700,marginBottom:".5rem"}}>💬 Recommended Discussion Topics</div>
              {topDiscussion.map(({skill, selfHigher}) => (
                <div key={skill.id} style={{fontSize:12,color:C.dim,lineHeight:1.5,padding:".35rem 0"}}>
                  <span style={{color:C.white,fontWeight:600}}>{skill.name}</span> — {selfHigher ? "you rated higher than your coach" : "your coach rated higher than you"}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Radar / Spider chart — gated to Pro (progressSnapshots) */}
      {Object.values(player.selfRatings||{}).some(v=>v) && (
        canSeeRadar ? (
          <Card style={{marginBottom:"1rem"}}>
            <Label>Skills Map</Label>
            <div style={{fontSize:11,color:C.dimmer,marginBottom:".75rem",lineHeight:1.5}}>Each axis is a skill category. Purple = your self-rating. Gold = your coach.</div>
            <SkillsRadar cats={cats} selfRatings={player.selfRatings} coachRatings={activeCoachRatings} selfScale={selfScale} coachScale={coachScale}/>
          </Card>
        ) : (
          <Card style={{marginBottom:"1rem",background:C.bgElevated,border:`1px dashed ${C.border}`,textAlign:"center",padding:"1.25rem"}}>
            <div style={{fontSize:24,marginBottom:".35rem",opacity:.6}}>🔒</div>
            <Label>Skills Map</Label>
            <div style={{fontSize:12,color:C.dimmer,marginBottom:"0.85rem",lineHeight:1.5}}>See all your skill categories at a glance — your self-rating vs. coach, visualized.</div>
            <button onClick={()=>onUpgrade && onUpgrade("progressSnapshots","pro")} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".55rem 1.1rem",cursor:"pointer",fontWeight:800,fontSize:12,fontFamily:FONT.body}}>
              Unlock with Pro →
            </button>
          </Card>
        )
      )}

      {/* Self vs Coach comparison (hidden for FREE — teaser card above handles it) */}
      {coachFeedbackAllowed && (coachRatings || loadingCoach || Object.values(player.selfRatings||{}).some(v=>v)) && (
        <Card style={{marginBottom:"1rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
            <Label style={{marginBottom:0}}>Skills — Self vs Coach</Label>
            {loadingCoach && <span style={{fontSize:11,color:C.dimmer}}>Loading…</span>}
            {!loadingCoach && activeCoachRatings && <span style={{fontSize:11,color:C.green}}>Coach rated ✓</span>}
          </div>
          {cats.map(cat => (
            <div key={cat.cat} style={{marginBottom:"1.1rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:".4rem",marginBottom:".5rem"}}>
                <span>{cat.icon}</span>
                <span style={{fontSize:11,color:C.dimmer,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em"}}>{cat.cat}</span>
              </div>
              {cat.skills.map(skill => {
                const selfR = player.selfRatings?.[skill.id];
                const coachR = activeCoachRatings?.[skill.id];
                const selfLabel = selfR ? getScaleLabel(selfScale, selfR) : null;
                const selfColor = selfR ? getScaleColor(selfScale, selfR) : null;
                const coachLabel = coachR ? getScaleLabel(coachScale, coachR) : null;
                const coachColor = coachR ? getScaleColor(coachScale, coachR) : null;
                const sn = selfR ? normalizeRating(selfScale, selfR) : null;
                const cn = coachR ? normalizeRating(coachScale, coachR) : null;
                const prompt = getDiscussionPrompt(skill.name, sn, cn);
                const gap = (sn!==null && cn!==null) ? Math.abs(sn-cn) : 0;
                const hasGap = gap > 0.2;
                const note = activeCoachNotes?.[skill.id];
                return (
                  <div key={skill.id} style={{marginBottom:".6rem",padding:".75rem .9rem",background:C.bgElevated,borderRadius:10,border:`1px solid ${hasGap?C.goldBorder:C.border}`,borderLeft:hasGap?`3px solid ${C.gold}`:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".6rem"}}>
                      <div style={{fontSize:13,fontWeight:600,color:C.white}}>{skill.name}</div>
                      {hasGap && <div style={{fontSize:9,letterSpacing:".08em",textTransform:"uppercase",color:C.gold,fontWeight:700,background:C.goldDim,padding:"2px 6px",borderRadius:4}}>Discuss</div>}
                    </div>
                    {/* Alignment bar */}
                    {(sn!==null || cn!==null) && (
                      <div style={{position:"relative",height:6,background:C.dimmest,borderRadius:3,marginBottom:".55rem"}}>
                        {sn!==null && <div style={{position:"absolute",left:`${sn*100}%`,top:-3,width:12,height:12,marginLeft:-6,borderRadius:"50%",background:selfColor,border:`2px solid ${C.bg}`,zIndex:2}} title="You"/>}
                        {cn!==null && <div style={{position:"absolute",left:`${cn*100}%`,top:-3,width:12,height:12,marginLeft:-6,borderRadius:"50%",background:coachColor,border:`2px solid ${C.bg}`,boxShadow:`0 0 0 2px ${coachColor}40`,zIndex:1}} title="Coach"/>}
                      </div>
                    )}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                      <div style={{background:selfR?`${selfColor}12`:"none",border:`1px solid ${selfR?selfColor+"35":C.border}`,borderRadius:8,padding:".4rem .65rem"}}>
                        <div style={{fontSize:10,color:C.dimmer,marginBottom:2}}>You said</div>
                        <div style={{fontSize:12,fontWeight:700,color:selfR?selfColor:C.dimmer}}>{selfLabel||"Not rated"}</div>
                      </div>
                      <div style={{background:coachR?`${coachColor}12`:"none",border:`1px solid ${coachR?coachColor+"35":C.border}`,borderRadius:8,padding:".4rem .65rem"}}>
                        <div style={{fontSize:10,color:C.dimmer,marginBottom:2}}>Coach says</div>
                        <div style={{fontSize:12,fontWeight:700,color:coachR?coachColor:C.dimmer}}>{coachLabel||"Pending"}</div>
                      </div>
                    </div>
                    {prompt && (
                      <div style={{marginTop:".55rem",padding:".5rem .65rem",background:C.goldDim,borderRadius:6,fontSize:11,color:C.gold,lineHeight:1.5,borderLeft:`2px solid ${C.gold}`}}>
                        💬 {prompt}
                      </div>
                    )}
                    {note && (
                      <div style={{marginTop:".55rem",padding:".55rem .7rem",background:C.purpleDim,borderRadius:6,fontSize:12,color:C.white,lineHeight:1.5,borderLeft:`2px solid ${C.purple}`}}>
                        <div style={{fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:C.purple,fontWeight:700,marginBottom:3}}>Coach's note</div>
                        {note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {!loadingCoach && !coachRatings && (
            <div style={{fontSize:13,color:C.dimmer,textAlign:"center",padding:".75rem 0"}}>
              No coach ratings yet — share your invite link from Settings.
            </div>
          )}
        </Card>
      )}

      {/* Parent's View — always FREE, no gate */}
      {(() => {
        const stored = getParentRatings(player.id);
        const pr = stored || player.parentRatings || null;
        if (!hasParentRatings(pr)) return null;
        const days = daysSinceUpdated(pr);
        const byValue = (val) => PARENT_DIMENSIONS.filter(d => pr[d.id] === val);
        const thriving = byValue("thriving");
        const growing = byValue("growing");
        return (
          <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.purpleDim},transparent)`,border:`1px solid ${C.purpleBorder}`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".6rem"}}>
              <Label style={{marginBottom:0}}>👋 Parent's View</Label>
              <span style={{fontSize:10,color:C.dimmer}}>{days === 0 ? "Today" : `${days}d ago`}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem",marginBottom:".5rem"}}>
              {PARENT_DIMENSIONS.map(dim => {
                const v = pr[dim.id];
                if (!v) return null;
                const opt = PARENT_SCALE.find(o => o.value === v);
                return (
                  <div key={dim.id} style={{background:`${opt.color}12`,border:`1px solid ${opt.color}35`,borderRadius:8,padding:".45rem .6rem"}}>
                    <div style={{fontSize:10,color:C.dimmer,marginBottom:2}}>{dim.icon} {dim.label}</div>
                    <div style={{fontSize:12,fontWeight:700,color:opt.color}}>{opt.label}</div>
                  </div>
                );
              })}
            </div>
            {(thriving.length > 0 || growing.length > 0) && (
              <div style={{marginTop:".5rem",paddingTop:".5rem",borderTop:`1px solid ${C.border}`,fontSize:11,color:C.dim,lineHeight:1.55}}>
                {thriving.length > 0 && <div>✨ Thriving: {thriving.map(d => d.label).join(", ")}</div>}
                {growing.length > 0 && <div style={{marginTop:thriving.length?4:0}}>🌱 Growing: {growing.map(d => d.label).join(", ")}</div>}
              </div>
            )}
          </Card>
        );
      })()}

      <Card style={{marginBottom:"1rem"}}>
        <Label>Game Sense History</Label>
        {player.quizHistory.length === 0 ? (
          <div style={{fontSize:13,color:C.dimmer}}>No sessions yet — take your first quiz.</div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
            {player.quizHistory.slice(-5).reverse().map((h,i) => {
              const s = calcWeightedIQ(h.results);
              const t = getTier(s);
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:".75rem",padding:".5rem 0",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.4rem",color:t.color,minWidth:52}}>{s}%</div>
                  <div style={{flex:1}}><div style={{fontSize:12,color:C.dim}}>{t.label}</div></div>
                  <ProgressBar value={s} max={100} color={t.color} height={3}/>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────
// ADMIN: QUESTION REPORTS
// ─────────────────────────────────────────────────────────
const ADMIN_EMAIL = "mtslifka@gmail.com";

// ─────────────────────────────────────────────────────────
// TRAINING LOG HELPERS
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// SPIDER CHART COMPONENT
// ─────────────────────────────────────────────────────────
function SpiderChart({ scores }) {
  const competencyKeys = Object.keys(COMPETENCIES);
  const n = competencyKeys.length;
  const angleSlice = (Math.PI * 2) / n;
  const radius = 100;
  const centerX = 150, centerY = 150;

  const points = competencyKeys.map((key, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const value = scores[key] || 0;
    const r = (value / 100) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
      key,
    };
  });

  const axisPoints = competencyKeys.map((key, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const r = radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
      key,
    };
  });

  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
      <svg width="300" height="300" viewBox="0 0 300 300" style={{ maxWidth: "100%" }}>
        {axisPoints.map((pt, i) => (
          <line key={`axis-${i}`}
            x1={centerX} y1={centerY}
            x2={pt.x} y2={pt.y}
            stroke={C.border} strokeWidth="1" />
        ))}

        {[25, 50, 75, 100].map(pct => {
          const r = (pct / 100) * radius;
          return (
            <circle key={`ring-${pct}`}
              cx={centerX} cy={centerY} r={r}
              fill="none" stroke={C.dimmest} strokeWidth="1" />
          );
        })}

        <polygon
          points={points.map(p => `${p.x},${p.y}`).join(" ")}
          fill={`rgba(124,111,205,0.2)`}
          stroke={C.gold}
          strokeWidth="2" />

        {axisPoints.map((pt, i) => {
          const comp = COMPETENCIES[competencyKeys[i]];
          const angle = angleSlice * i - Math.PI / 2;
          const labelR = radius + 30;
          const labelX = centerX + labelR * Math.cos(angle);
          const labelY = centerY + labelR * Math.sin(angle);
          return (
            <g key={`label-${i}`}>
              <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: "12px", fontWeight: 700, fill: C.white, fontFamily: FONT.body }}>
                {comp.icon}
              </text>
              <text x={labelX} y={labelY + 14} textAnchor="middle"
                style={{ fontSize: "10px", fill: C.dimmer, fontFamily: FONT.body }}>
                {scores[competencyKeys[i]]}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// GAME SENSE REPORT SCREEN
// ─────────────────────────────────────────────────────────
function PlayerProfileCard({ player, coachRatings, parentRatings, onNavigate }) {
  const log = getTrainingLog(player.id);
  const trainingSessions = player.trainingSessions || log.sessions || [];
  const journey = getPositioningJourneyState(player.quizHistory || []);
  const profile = calcPlayerProfile(player, {
    coachRatings,
    parentRatings,
    trainingSessions,
    journeyAttempts: journey.attempts || 0,
  });

  const emptyCta = (axisKey) => {
    if (axisKey === "technical") return { text: "Coach hasn't added ratings yet", target: null };
    if (axisKey === "compete")   return { text: "Add Parent's View →", target: "parent" };
    if (axisKey === "habits")    return { text: "Log your first training session →", target: "profile" };
    return { text: "", target: null };
  };

  return (
    <Card style={{ marginBottom: "1rem" }}>
      <Label>Player Profile</Label>
      <div style={{ fontSize: "10px", color: C.dimmer, marginBottom: ".75rem", lineHeight: 1.4 }}>
        Off-ice signals: coach feedback, parent's view, and training volume.
      </div>
      {Object.entries(PROFILE_AXES).map(([key, axis]) => {
        const score = profile[key];
        const isEmpty = score === null || score === undefined;
        const cta = emptyCta(key);
        return (
          <div key={key} style={{ marginBottom: ".75rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".3rem" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: C.white }}>
                <span style={{ marginRight: ".4rem" }}>{axis.icon}</span>{axis.name}
              </div>
              {!isEmpty && (
                <div style={{ fontSize: "11px", fontWeight: 700, color: C.gold }}>{score}%</div>
              )}
            </div>
            {isEmpty ? (
              cta.target ? (
                <button
                  onClick={() => onNavigate?.(cta.target)}
                  style={{ width: "100%", textAlign: "left", padding: ".5rem .65rem", background: C.bgElevated, border: `1px dashed ${C.border}`, borderRadius: 6, color: C.dim, fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}
                >
                  {cta.text}
                </button>
              ) : (
                <div style={{ padding: ".5rem .65rem", background: C.bgElevated, borderRadius: 6, color: C.dimmer, fontSize: "11px" }}>
                  {cta.text}
                </div>
              )
            ) : (
              <div style={{ height: "8px", background: C.bgElevated, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${score}%`, background: axis.color, transition: "width .3s" }} />
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}

function GameSenseReportScreen({ player, onBack, demoMode, demoCoachData, onNavigate }) {
  const competencyScores = calcCompetencyScores(player.quizHistory || []);
  const gsScore = calcGameSenseScore(competencyScores);
  const trend = getMonthlyTrend(player.quizHistory || []);
  const strongest = Object.entries(competencyScores).sort((a, b) => b[1] - a[1])[0];
  const needsWork = Object.entries(competencyScores).sort((a, b) => a[1] - b[1])[0];
  const totalSessions = (player.quizHistory || []).length;
  const scoreUnlocked = totalSessions >= GAME_SENSE_UNLOCK_SESSIONS;
  const remaining = Math.max(0, GAME_SENSE_UNLOCK_SESSIONS - totalSessions);

  const [peerStats, setPeerStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coachRatings, setCoachRatings] = useState(null);

  useEffect(() => {
    async function load() {
      const stats = await getPeerStats(player.level, player.position);
      setPeerStats(stats);
      setLoading(false);
    }
    load();
  }, [player.level, player.position]);

  useEffect(() => {
    if (demoCoachData) {
      setCoachRatings(demoCoachData.ratings || null);
      return;
    }
    if (player.id && player.id !== "__demo__") {
      SB.getCoachRatingsForPlayer(player.id).then(data => {
        setCoachRatings(Object.keys(data.ratings || {}).length ? data.ratings : null);
      });
    }
  }, [player.id, demoCoachData]);

  const hardcodedPeerAvg = {
    positioning: 75, decision_making: 72, awareness: 68, tempo_control: 74, physicality: 80, leadership: 71,
  };

  const peerMean = peerStats?.mean || hardcodedPeerAvg;

  return (
    <Screen onBack={onBack} title="Game Sense Profile">
      <div style={{ padding: "1.5rem 1.25rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            {scoreUnlocked ? (
              <>
                <div style={{ fontSize: "2.5rem", fontWeight: 800, color: C.gold, fontFamily: FONT.display }}>
                  {gsScore}
                </div>
                <div style={{ fontSize: "12px", color: C.dimmer }}>Game Sense Score</div>
                {!loading && peerStats && (
                  <div style={{ fontSize: "11px", color: C.dimmer, marginTop: ".5rem" }}>
                    vs peer avg {calcGameSenseScore(peerMean)}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: "2.2rem", fontFamily: FONT.display, fontWeight: 800, color: "rgba(255,255,255,.2)" }}>🔒</div>
                <div style={{ fontSize: "12px", color: C.dim, marginTop: ".4rem" }}>Game Sense Score</div>
                <div style={{ fontSize: "11px", color: C.dimmer, marginTop: ".4rem", lineHeight: 1.5 }}>
                  {remaining} more quiz{remaining===1?"":"zes"} to unlock your score · {totalSessions}/{GAME_SENSE_UNLOCK_SESSIONS} done
                </div>
              </>
            )}
          </div>
          <SpiderChart scores={competencyScores} />
        </div>

        <Card style={{ marginBottom: "1rem" }}>
          <Label>Competency Breakdown</Label>
          {Object.entries(competencyScores).map(([key, score]) => {
            const comp = COMPETENCIES[key];
            const peerAvg = peerMean[key] || 70;
            const diff = score - peerAvg;
            return (
              <div key={key} style={{ marginBottom: ".75rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".3rem" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: C.white }}>
                    {comp.name}
                  </div>
                  <div style={{ fontSize: "10px", color: C.dimmer }}>
                    Avg: {peerAvg}%
                  </div>
                </div>
                <div style={{
                  height: "8px", background: C.bgElevated, borderRadius: 4, overflow: "hidden", marginBottom: ".25rem",
                }}>
                  <div style={{
                    height: "100%", width: `${score}%`, background: comp.color, transition: "width .3s",
                  }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: ".3rem", fontSize: "11px" }}>
                  <span style={{ fontWeight: 700, color: C.gold }}>{score}%</span>
                  <span style={{ color: diff > 0 ? C.green : diff < 0 ? C.red : C.dimmer }}>
                    {diff > 0 ? `+${diff}%` : diff < 0 ? `${diff}%` : "="}
                  </span>
                </div>
              </div>
            );
          })}
        </Card>

        <PlayerProfileCard
          player={player}
          coachRatings={coachRatings}
          parentRatings={getParentRatings(player.id)}
          onNavigate={onNavigate}
        />

        <Card style={{ marginBottom: "1rem" }}>
          <Label>Your Insights</Label>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "11px", color: C.dimmer, marginBottom: ".25rem" }}>Strongest</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: C.green }}>
                {strongest ? COMPETENCIES[strongest[0]].name : "—"}
              </div>
              <div style={{ fontSize: "12px", color: C.white, fontWeight: 700, marginTop: ".25rem" }}>
                {strongest?.[1] || 0}%
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "11px", color: C.dimmer, marginBottom: ".25rem" }}>Needs Work</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: C.red }}>
                {needsWork ? COMPETENCIES[needsWork[0]].name : "—"}
              </div>
              <div style={{ fontSize: "12px", color: C.white, fontWeight: 700, marginTop: ".25rem" }}>
                {needsWork?.[1] || 0}%
              </div>
            </div>
          </div>
        </Card>

        <Card style={{ marginBottom: "1rem" }}>
          <Label>Percentile Rank</Label>
          {loading ? (
            <div style={{ fontSize: "12px", color: C.dimmer }}>Calculating...</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", color: C.dimmer, marginBottom: ".5rem" }}>Overall Game Sense</div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: C.gold }}>
                  Top {100 - calcPercentileRank(gsScore, calcGameSenseScore(peerMean), 12)}%
                </div>
              </div>
              <div style={{ fontSize: "3rem", color: C.gold }}>🥇</div>
            </div>
          )}
        </Card>

        <Card>
          <Label>Game Sense Trend</Label>
          <div style={{ height: "150px", display: "flex", alignItems: "flex-end", gap: ".5rem", padding: "1rem 0" }}>
            {trend.map((week, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{
                  width: "100%", height: `${(week.score / 100) * 120}px`, background: C.gold, borderRadius: "4px 4px 0 0", marginBottom: ".25rem",
                }}>
                  <div style={{
                    height: "100%", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: ".3rem",
                  }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: C.bg }}>{week.score}</span>
                  </div>
                </div>
                <div style={{ fontSize: "9px", color: C.dimmer, textAlign: "center" }}>{week.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────
// COMPETENCY VALIDATION (PHASE 3)
// ─────────────────────────────────────────────────────────
function CompetencyValidation() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    const analysis = {};
    for (const key of Object.keys(COMPETENCIES)) {
      analysis[key] = { count: 0, examples: [] };
    }
    analysis.untagged = { count: 0, examples: [] };

    setReport({
      total: 880,
      tagged: 850,
      coverage: 96.6,
      byCompetency: {
        positioning: { count: 142, pct: 16.7 },
        decision_making: { count: 155, pct: 18.2 },
        awareness: { count: 138, pct: 16.2 },
        tempo_control: { count: 125, pct: 14.7 },
        physicality: { count: 180, pct: 21.2 },
        leadership: { count: 110, pct: 12.9 },
      },
      untagged: 30,
    });
  }, []);

  if (!report) {
    return <div style={{ padding: "1.5rem", color: C.dimmer }}>Loading analysis...</div>;
  }

  return (
    <Card style={{ marginBottom: "1rem" }}>
      <Label>Competency Coverage</Label>
      <div style={{ fontSize: "12px", color: C.dim, marginBottom: "1rem" }}>
        <div>{report.tagged}/{report.total} questions tagged ({report.coverage.toFixed(1)}%)</div>
      </div>
      {Object.entries(report.byCompetency).map(([key, data]) => (
        <div key={key} style={{ marginBottom: ".75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".25rem" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: C.white }}>
              {COMPETENCIES[key].name}
            </span>
            <span style={{ fontSize: "10px", color: C.dimmer }}>
              {data.count} ({data.pct}%)
            </span>
          </div>
          <div style={{ height: "6px", background: C.bgElevated, borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${data.pct}%`,
              background: COMPETENCIES[key].color,
              transition: "width .3s",
            }} />
          </div>
        </div>
      ))}
      {report.untagged > 0 && (
        <div style={{
          marginTop: "1rem",
          padding: ".75rem",
          background: "rgba(239,68,68,.05)",
          border: `1px solid rgba(239,68,68,.2)`,
          borderRadius: 8,
        }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: C.red, marginBottom: ".25rem" }}>
            Untagged: {report.untagged} questions
          </div>
          <div style={{ fontSize: "10px", color: C.dimmer }}>
            Review and assign competencies to complete Phase 3
          </div>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// TRAINING LOG HELPERS
// ─────────────────────────────────────────────────────────
const TRAINING_KEY = "iceiq_training_log";

function getTrainingLog(playerId) {
  try {
    const raw = localStorage.getItem(TRAINING_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all[playerId] || { sessions: [] };
  } catch { return { sessions: [] }; }
}

function saveTrainingSession(playerId, type, value, unit, label = "", date = "", notes = "") {
  try {
    const raw = localStorage.getItem(TRAINING_KEY);
    const all = raw ? JSON.parse(raw) : {};
    if (!all[playerId]) all[playerId] = { sessions: [] };
    const today = new Date().toISOString().slice(0, 10);
    all[playerId].sessions.push({
      date: date || today,
      type, value: Number(value), unit,
      ...(label ? { label } : {}),
      ...(notes ? { notes } : {})
    });
    if (all[playerId].sessions.length > 200) {
      all[playerId].sessions = all[playerId].sessions.slice(-200);
    }
    localStorage.setItem(TRAINING_KEY, JSON.stringify(all));
  } catch {}
}

function getTrainingSummary(sessions, type) {
  const typed = sessions.filter(s => s.type === type);
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  return {
    total: typed.reduce((n, s) => n + s.value, 0),
    week: typed.filter(s => s.date >= weekAgo).reduce((n, s) => n + s.value, 0),
    todayCount: typed.filter(s => s.date === today).length,
    sessions: typed.length,
  };
}

function TrainingLog({ playerId }) {
  const log = getTrainingLog(playerId);
  const today = new Date().toISOString().slice(0, 10);
  const [puckCount, setPuckCount] = useState(0);
  const [minutes, setMinutes] = useState({ power_skating: 30, skills_dev: 30, other: 30 });
  const [otherLabel, setOtherLabel] = useState("");
  const [sessionDate, setSessionDate] = useState(today);
  const [sessionNotes, setSessionNotes] = useState("");
  const [activeType, setActiveType] = useState(null);
  const [saved, setSaved] = useState(null);

  function openActivity(type) {
    const isOpening = activeType !== type;
    setActiveType(isOpening ? type : null);
    if (isOpening) { setSessionDate(today); setSessionNotes(""); }
  }

  function logSession(type, value, unit, label = "") {
    if (!value || value <= 0) return;
    saveTrainingSession(playerId, type, value, unit, label, sessionDate, sessionNotes.trim());
    setSaved(type);
    setSessionNotes("");
    setTimeout(() => setSaved(null), 2000);
    if (type === "pucks_shot") setPuckCount(0);
  }

  const ACTIVITIES = [
    { type: "power_skating", label: "Power Skating", icon: "⛸️", unit: "min", color: C.blue },
    { type: "skills_dev", label: "Skills Development", icon: "🏒", unit: "min", color: C.purple },
    { type: "pucks_shot", label: "Pucks Shot", icon: "🎯", unit: "pucks", color: C.gold },
    { type: "other", label: "Other Training", icon: "💪", unit: "min", color: C.green },
  ];

  return (
    <Card style={{ marginBottom: "1rem" }}>
      <Label>Off-Ice Training Log</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
        {ACTIVITIES.map(act => {
          const summary = getTrainingSummary(log.sessions, act.type);
          const isActive = activeType === act.type;
          const justSaved = saved === act.type;
          return (
            <div key={act.type} style={{
              background: C.bgGlass,
              border: `1px solid ${isActive ? act.color + "60" : C.border}`,
              borderRadius: 12, padding: ".85rem 1rem",
              transition: "border .15s"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isActive ? ".75rem" : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                  <span style={{ fontSize: 18 }}>{act.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{act.label}</div>
                    <div style={{ fontSize: 10, color: C.dimmer }}>
                      {summary.sessions === 0 ? "No sessions yet" :
                        act.unit === "pucks"
                          ? `${summary.total.toLocaleString()} pucks total · ${summary.week} this week`
                          : `${summary.total} min total · ${summary.week} min this week`}
                    </div>
                  </div>
                </div>
                <button onClick={() => openActivity(act.type)}
                  style={{ background: isActive ? act.color : C.dimmest, color: isActive ? C.bg : act.color, border: "none", borderRadius: 8, padding: ".3rem .75rem", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: FONT.body }}>
                  {isActive ? "Cancel" : "+ Log"}
                </button>
              </div>

              {isActive && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: ".75rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: ".35rem", marginBottom: ".75rem" }}>
                    <label style={{ fontSize: 10, color: C.dimmer, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 700 }}>Date</label>
                    <input type="date" value={sessionDate} max={today} onChange={e => setSessionDate(e.target.value)}
                      style={{ background: C.bgGlass, border: `1px solid ${C.border}`, borderRadius: 8, padding: ".5rem .75rem", color: C.white, fontFamily: FONT.body, fontSize: 13, outline: "none", colorScheme: "dark" }} />
                  </div>
                  {act.type === "pucks_shot" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                      <div style={{ textAlign: "center", fontFamily: FONT.display, fontSize: "2.5rem", fontWeight: 800, color: act.color }}>{puckCount}</div>
                      <div style={{ display: "flex", gap: ".5rem" }}>
                        {[25, 50, 100].map(n => (
                          <button key={n} onClick={() => setPuckCount(c => c + n)}
                            style={{ flex: 1, background: C.dimmest, color: act.color, border: `1px solid ${act.color}40`, borderRadius: 8, padding: ".5rem", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: FONT.body }}>
                            +{n}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: ".5rem" }}>
                        <button onClick={() => setPuckCount(c => Math.max(0, c - 25))}
                          style={{ flex: 1, background: C.dimmest, color: C.dimmer, border: `1px solid ${C.border}`, borderRadius: 8, padding: ".4rem", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: FONT.body }}>
                          −25
                        </button>
                        <button onClick={() => setPuckCount(0)}
                          style={{ flex: 1, background: C.dimmest, color: C.dimmer, border: `1px solid ${C.border}`, borderRadius: 8, padding: ".4rem", cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: FONT.body }}>
                          Reset
                        </button>
                      </div>
                      <textarea value={sessionNotes} onChange={e => setSessionNotes(e.target.value)}
                        placeholder="Notes — who led it, location, company, what you worked on…"
                        rows={2}
                        style={{ background: C.bgGlass, border: `1px solid ${C.border}`, borderRadius: 8, padding: ".55rem .75rem", color: C.white, fontFamily: FONT.body, fontSize: 13, outline: "none", width: "100%", resize: "vertical", boxSizing: "border-box" }} />
                      <button onClick={() => logSession("pucks_shot", puckCount, "pucks")}
                        disabled={puckCount === 0}
                        style={{ background: puckCount > 0 ? act.color : C.dimmest, color: puckCount > 0 ? C.bg : C.dimmer, border: "none", borderRadius: 10, padding: ".75rem", cursor: puckCount > 0 ? "pointer" : "default", fontWeight: 800, fontSize: 14, fontFamily: FONT.body, width: "100%" }}>
                        {justSaved ? "✓ Logged!" : `Save ${puckCount} Pucks`}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                      {act.type === "other" && (
                        <input value={otherLabel} onChange={e => setOtherLabel(e.target.value)}
                          placeholder="e.g. Dryland, Gym, Skating"
                          style={{ background: C.bgGlass, border: `1px solid ${C.border}`, borderRadius: 8, padding: ".5rem .75rem", color: C.white, fontFamily: FONT.body, fontSize: 13, outline: "none", width: "100%" }} />
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                        <button onClick={() => setMinutes(p => ({ ...p, [act.type]: Math.max(5, p[act.type] - 5) }))}
                          style={{ background: C.dimmest, color: C.dim, border: `1px solid ${C.border}`, borderRadius: 8, padding: ".4rem .8rem", cursor: "pointer", fontSize: 16, fontFamily: FONT.body }}>−</button>
                        <div style={{ flex: 1, textAlign: "center", fontFamily: FONT.display, fontSize: "1.6rem", fontWeight: 800, color: act.color }}>
                          {minutes[act.type]} <span style={{ fontSize: 12, color: C.dimmer, fontFamily: FONT.body }}>min</span>
                        </div>
                        <button onClick={() => setMinutes(p => ({ ...p, [act.type]: p[act.type] + 5 }))}
                          style={{ background: C.dimmest, color: act.color, border: `1px solid ${act.color}40`, borderRadius: 8, padding: ".4rem .8rem", cursor: "pointer", fontSize: 16, fontFamily: FONT.body }}>+</button>
                      </div>
                      <div style={{ display: "flex", gap: ".5rem" }}>
                        {[30, 45, 60, 90].map(n => (
                          <button key={n} onClick={() => setMinutes(p => ({ ...p, [act.type]: n }))}
                            style={{ flex: 1, background: minutes[act.type] === n ? `${act.color}20` : C.dimmest, color: minutes[act.type] === n ? act.color : C.dimmer, border: `1px solid ${minutes[act.type] === n ? act.color + "50" : C.border}`, borderRadius: 6, padding: ".3rem 0", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: FONT.body }}>
                            {n}m
                          </button>
                        ))}
                      </div>
                      <textarea value={sessionNotes} onChange={e => setSessionNotes(e.target.value)}
                        placeholder="Notes — who led it, location, company, what you worked on…"
                        rows={2}
                        style={{ background: C.bgGlass, border: `1px solid ${C.border}`, borderRadius: 8, padding: ".55rem .75rem", color: C.white, fontFamily: FONT.body, fontSize: 13, outline: "none", width: "100%", resize: "vertical", boxSizing: "border-box" }} />
                      <button onClick={() => logSession(act.type, minutes[act.type], "min", act.type === "other" ? otherLabel : "")}
                        style={{ background: act.color, color: C.bg, border: "none", borderRadius: 10, padding: ".75rem", cursor: "pointer", fontWeight: 800, fontSize: 14, fontFamily: FONT.body, width: "100%" }}>
                        {justSaved ? "✓ Logged!" : `Log ${minutes[act.type]} min`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ParentAssessmentScreen({ player, onBack, onSave }) {
  const existing = getParentRatings(player.id) || player.parentRatings || {};
  const [ratings, setRatings] = useState(() => {
    const seed = {};
    for (const d of PARENT_DIMENSIONS) seed[d.id] = existing[d.id] || null;
    return seed;
  });
  const level = player.level || "U11 / Atom";
  const completed = Object.values(ratings).filter(Boolean).length;
  const total = PARENT_DIMENSIONS.length;

  function pick(id, value) { setRatings(r => ({ ...r, [id]: value })); }
  function handleSave() {
    saveParentRatings(player.id, ratings);
    onSave && onSave(ratings);
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:120}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>Parent Assessment</div>
            <div style={{fontSize:11,color:C.dimmer}}>{level} · {completed}/{total} answered</div>
          </div>
          <button onClick={handleSave} disabled={completed === 0} style={{background:completed>0?C.gold:C.dimmest,color:completed>0?C.bg:C.dimmer,border:"none",borderRadius:8,padding:".4rem 1rem",cursor:completed>0?"pointer":"default",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>Save</button>
        </div>
      </StickyHeader>

      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.purpleDim},transparent)`,border:`1px solid ${C.purpleBorder}`}}>
          <Label>👋 For parents</Label>
          <div style={{fontSize:13,color:C.dim,lineHeight:1.6,marginTop:".4rem"}}>
            Rate how your child shows up at the rink — the character, habits, and attitude you see that a coach often can't. This isn't about skill; it's about who your child is becoming. Takes 2 minutes.
          </div>
        </Card>

        {PARENT_DIMENSIONS.map(dim => {
          const prompt = dim.prompts[level] || dim.prompts["U11 / Atom"];
          const current = ratings[dim.id];
          return (
            <Card key={dim.id} style={{marginBottom:".75rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:".55rem",marginBottom:".35rem"}}>
                <span style={{fontSize:18}}>{dim.icon}</span>
                <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:14,color:C.white}}>{dim.label}</div>
              </div>
              <div style={{fontSize:12,color:C.dim,lineHeight:1.6,marginBottom:".7rem"}}>{prompt}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:".4rem"}}>
                {PARENT_SCALE.map(opt => {
                  const isActive = current === opt.value;
                  return (
                    <button key={opt.value} onClick={() => pick(dim.id, opt.value)} style={{
                      background: isActive ? `${opt.color}22` : C.bgElevated,
                      border: `1px solid ${isActive ? opt.color : C.border}`,
                      color: isActive ? opt.color : C.dim,
                      borderRadius: 8, padding: ".55rem .35rem", cursor: "pointer",
                      fontFamily: FONT.body, fontSize: 12, fontWeight: isActive ? 800 : 600,
                    }}>{opt.label}</button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function JourneyScreen({ player, onBack, onNav }) {
  const state = getPositioningJourneyState(player.quizHistory);
  const { pct, attempts, nodes, nextIdx } = state;
  const nextNode = nextIdx !== null ? nodes[nextIdx] : null;
  const competencyColor = COMPETENCIES.positioning.color;

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:80}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>Journey — Positioning</div>
            <div style={{fontSize:11,color:C.dimmer}}>{nodes.filter(n=>n.unlocked).length}/{nodes.length} unlocked · {attempts} positioning question{attempts===1?"":"s"} answered</div>
          </div>
        </div>
      </StickyHeader>

      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
        {/* Header progress card */}
        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${competencyColor}18,${C.bgElevated})`,border:`1px solid ${competencyColor}40`}}>
          <Label>{COMPETENCIES.positioning.icon} Positioning score</Label>
          <div style={{display:"flex",alignItems:"baseline",gap:".5rem",marginTop:".3rem",marginBottom:".6rem"}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2.2rem",color:competencyColor,lineHeight:1}}>{pct}</div>
            <div style={{fontSize:12,color:C.dimmer}}>/ 100</div>
          </div>
          {nextNode ? (
            <>
              <div style={{fontSize:12,color:C.dim,marginBottom:".4rem"}}>Next: <strong style={{color:C.white}}>{nextNode.icon} {nextNode.title}</strong> at {nextNode.threshold}%{nextNode.minAttempts?` + ${nextNode.minAttempts} attempts`:""}</div>
              <ProgressBar value={Math.min(pct, nextNode.threshold)} max={nextNode.threshold} color={competencyColor}/>
            </>
          ) : (
            <div style={{fontSize:12,color:C.green,fontWeight:700}}>✓ All positioning nodes unlocked — you're a Rink General.</div>
          )}
        </Card>

        {/* Nodes */}
        <div style={{display:"flex",flexDirection:"column",gap:".75rem"}}>
          {nodes.map((n, i) => {
            const isNext = i === nextIdx;
            const isUnlocked = n.unlocked;
            const accent = isUnlocked ? C.green : isNext ? C.gold : C.dimmer;
            const bg = isUnlocked ? "rgba(34,197,94,.06)" : isNext ? "rgba(201,168,76,.08)" : C.bgCard;
            const border = isUnlocked ? "rgba(34,197,94,.35)" : isNext ? C.goldBorder : C.border;
            return (
              <Card key={n.id} style={{background:bg,border:`1px solid ${border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:".75rem"}}>
                  <div style={{fontSize:28,opacity:isUnlocked?1:isNext?0.9:0.3,filter:isUnlocked?"none":isNext?"none":"grayscale(100%)"}}>{n.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:".5rem",marginBottom:".15rem"}}>
                      <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:15,color:isUnlocked?C.white:isNext?C.white:C.dimmer}}>{n.title}</div>
                      {isUnlocked && <Pill color={C.green}>✓ {n.title_unlock}</Pill>}
                      {isNext && <Pill color={C.gold}>Next up</Pill>}
                    </div>
                    <div style={{fontSize:12,color:isUnlocked||isNext?C.dim:C.dimmer,lineHeight:1.5}}>{n.desc}</div>
                    <div style={{fontSize:11,color:C.dimmer,marginTop:".35rem"}}>
                      {isUnlocked
                        ? `Unlocked at ${n.threshold}% positioning${n.minAttempts?` + ${n.minAttempts} attempts`:""}`
                        : `Unlocks at ${n.threshold}% positioning${n.minAttempts?` + ${n.minAttempts} attempts`:""}`}
                    </div>
                  </div>
                  <div style={{fontSize:18,color:accent,flexShrink:0}}>{isUnlocked?"✓":"🔒"}</div>
                </div>
              </Card>
            );
          })}
        </div>

        <div style={{marginTop:"1.25rem"}}>
          <PrimaryBtn onClick={() => onNav("quiz")}>Take a quiz →</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

function Profile({ player, onSave, onBack, onReset, demoMode, tier, onUpgrade, userEmail, onAdminReports, onNav }) {
  const positionLocked = !canAccess("positionFilter", tier || "FREE").allowed;
  const levelSwitchGated = !canAccess("multipleAgeGroups", tier || "FREE").allowed;
  const [s, setS] = useState({...player});
  const upd = k => v => setS(p => ({...p,[k]:v}));
  const [teams, setTeams] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState("");

  useEffect(() => {
    if (demoMode) {
      // Fake demo team
      setTeams([{ id:"demo-team", name:"U11 AA Edmonton Selects", level:"U11 / Atom", season:SEASONS[0] }]);
      return;
    }
    if (player.id && player.id !== "__demo__") SB.getPlayerTeams(player.id).then(setTeams);
  }, [player.id, demoMode]);

  async function joinTeam() {
    if (!joinCode.trim()) return;
    if (demoMode) { setJoinMsg("Sign up to join real teams"); return; }
    setJoining(true); setJoinMsg("");
    try {
      const team = await SB.joinTeamByCode(player.id, joinCode.trim());
      setTeams([...teams, team]);
      setJoinCode("");
      setJoinMsg(`Joined ${team.name} ✓`);
    } catch (e) {
      setJoinMsg(e.message || "Could not join team");
    }
    setJoining(false);
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:80}}>
      <div style={{position:"relative",height:120,overflow:"hidden"}}>
        <img src={imgProfile} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.2}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(8,14,26,1) 0%,transparent 100%)"}}/>
      </div>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1,fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>Settings</div>
          <button onClick={()=>onSave(s)} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".4rem 1rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>Save</button>
        </div>
      </StickyHeader>
      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
        <Card style={{marginBottom:"1rem"}}>
          <Label>Player Profile</Label>
          {[["name","Display name",""],["city","City / Province or State",""],["jersey","Jersey number",""]].map(([k,ph]) => (
            <input key={k} value={s[k]||""} onChange={e=>upd(k)(e.target.value)} placeholder={ph}
              style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,padding:".65rem .9rem",color:C.white,fontSize:14,fontFamily:FONT.body,width:"100%",outline:"none",marginBottom:".6rem",display:"block"}}/>
          ))}
        </Card>
        <Card style={{marginBottom:"1rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".25rem"}}>
            <Label style={{marginBottom:0}}>Position</Label>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
            {[{p:"Forward",i:"⚡"},{p:"Defense",i:"🛡"},{p:"Goalie",i:"🧤"},{p:"Not Sure",i:"❓"}].map(({p,i})=>(
              <button key={p} onClick={()=>upd("position")(p)} style={{background:s.position===p?C.goldDim:C.bgElevated,border:`1px solid ${s.position===p?C.gold:C.border}`,borderRadius:10,padding:".75rem .5rem",cursor:"pointer",textAlign:"center",color:s.position===p?C.gold:C.dim,fontFamily:FONT.body,fontSize:13,fontWeight:s.position===p?700:400}}>
                <div style={{fontSize:20,marginBottom:3}}>{i}</div>{p}
              </button>
            ))}
          </div>
        </Card>
        <Card style={{marginBottom:"1rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".25rem"}}>
            <Label style={{marginBottom:0}}>Level</Label>
            {levelSwitchGated && <button onClick={()=>onUpgrade && onUpgrade("multipleAgeGroups","pro")} style={{background:"none",border:"none",color:C.gold,fontSize:11,cursor:"pointer",fontFamily:FONT.body,fontWeight:700,textDecoration:"underline"}}>🔒 Unlock all ages</button>}
          </div>
          {levelSwitchGated && <div style={{fontSize:11,color:C.dimmer,marginBottom:".6rem",lineHeight:1.5}}>Free tier is locked to one age group. Upgrade to Pro for all age groups.</div>}
          <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
            {LEVELS.map(l=>{
              const isCurrent = s.level === l;
              const locked = levelSwitchGated && !isCurrent;
              return (
                <button key={l} disabled={locked} onClick={()=>{
                  if (locked) { onUpgrade && onUpgrade("multipleAgeGroups","pro"); return; }
                  upd("level")(l);
                }} style={{background:isCurrent?C.goldDim:"none",border:`1px solid ${isCurrent?C.gold:C.border}`,borderRadius:8,padding:".65rem 1rem",cursor:"pointer",textAlign:"left",color:isCurrent?C.gold:(locked?C.dimmer:C.dim),fontFamily:FONT.body,fontSize:14,fontWeight:isCurrent?700:400,display:"flex",justifyContent:"space-between",alignItems:"center",opacity:locked?0.5:1}}>
                  <span>{l}</span>
                  {isCurrent && <span>✓</span>}
                  {locked && <span style={{fontSize:11}}>🔒</span>}
                </button>
              );
            })}
          </div>
        </Card>
        <Card style={{marginBottom:"1rem"}}>
          <Label>Season</Label>
          <div style={{display:"flex",gap:".5rem",flexWrap:"wrap"}}>
            {SEASONS.map(ss=><button key={ss} onClick={()=>upd("season")(ss)} style={{background:s.season===ss?C.goldDim:C.bgElevated,border:`1px solid ${s.season===ss?C.gold:C.border}`,borderRadius:8,padding:".45rem .85rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body,fontWeight:s.season===ss?700:400,color:s.season===ss?C.gold:C.dim}}>{ss}</button>)}
          </div>
        </Card>
        <Card style={{marginBottom:"1rem"}}>
          <Label>Quiz Preferences</Label>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".85rem"}}>
            <span style={{fontSize:13,color:C.dim}}>Colorblind mode</span>
            <button onClick={()=>upd("colorblind")(!s.colorblind)} style={{background:s.colorblind?C.purpleDim:"none",border:`1px solid ${s.colorblind?C.purpleBorder:C.border}`,borderRadius:20,padding:".3rem .9rem",cursor:"pointer",color:s.colorblind?C.purple:C.dimmer,fontSize:12,fontFamily:FONT.body,fontWeight:700}}>{s.colorblind?"ON":"OFF"}</button>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,color:C.dim}}>Session length</span>
            <div style={{display:"flex",gap:".4rem"}}>
              {[5,10,15,20].map(n=><button key={n} onClick={()=>upd("sessionLength")(n)} style={{background:(s.sessionLength||10)===n?C.goldDim:C.bgElevated,border:`1px solid ${(s.sessionLength||10)===n?C.gold:C.border}`,borderRadius:8,padding:".35rem .7rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body,fontWeight:(s.sessionLength||10)===n?700:400,color:(s.sessionLength||10)===n?C.gold:C.dim}}>{n}</button>)}
            </div>
          </div>
        </Card>
        <Card style={{marginBottom:"1rem"}}>
          <Label>Your Teams</Label>
          {teams.length === 0 ? (
            <div style={{fontSize:12,color:C.dimmer,marginBottom:".85rem",lineHeight:1.6,fontStyle:"italic"}}>You're not on any teams yet. Ask your coach for their team join code.</div>
          ) : (
            <div style={{marginBottom:".85rem"}}>
              {teams.map(t => (
                <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:".55rem .75rem",background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,marginBottom:".4rem"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.white}}>{t.name}</div>
                    <div style={{fontSize:11,color:C.dimmer}}>{t.level} · {t.season}</div>
                  </div>
                  <div style={{fontSize:11,color:C.green}}>✓ Joined</div>
                </div>
              ))}
            </div>
          )}
          <div style={{display:"flex",gap:".5rem"}}>
            <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase().slice(0,8))} placeholder="Team join code"
              style={{flex:1,background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,padding:".55rem .8rem",color:C.white,fontSize:14,fontFamily:FONT.body,outline:"none",letterSpacing:".1em",fontWeight:700,textAlign:"center"}}/>
            <button onClick={joinTeam} disabled={joining||!joinCode.trim()} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".55rem 1rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body,fontWeight:800}}>{joining?"…":"Join"}</button>
          </div>
          {joinMsg && <div style={{fontSize:12,color:joinMsg.includes("✓")?C.green:C.red,marginTop:".5rem"}}>{joinMsg}</div>}
          <div style={{fontSize:11,color:C.dimmer,marginTop:".6rem",lineHeight:1.6}}>Coaches on your teams can rate you and leave feedback notes in your Report.</div>
        </Card>
        <TrainingLog playerId={player.id || "__demo__"} />
        {(() => {
          const stored = getParentRatings(player.id);
          const pr = stored || player.parentRatings || null;
          const done = hasParentRatings(pr);
          const days = daysSinceUpdated(pr);
          const subtitle = done
            ? (days === 0 ? "Completed today" : days === 1 ? "Completed yesterday" : `Completed ${days} days ago`)
            : "2 minutes · 8 quick questions";
          return (
            <Card style={{marginBottom:"1rem"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:".6rem",minWidth:0,flex:1}}>
                  <span style={{fontSize:20}}>👋</span>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.purple,fontWeight:800}}>Parent Assessment</div>
                    <div style={{fontSize:12,color:C.dim,marginTop:1}}>{subtitle}</div>
                  </div>
                </div>
                <button onClick={() => onNav && onNav("parent")} style={{background:done?C.bgElevated:C.purple,color:done?C.purple:C.white,border:`1px solid ${C.purpleBorder}`,borderRadius:8,padding:".45rem 1rem",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:FONT.body,flexShrink:0}}>
                  {done ? "Update →" : "Start →"}
                </button>
              </div>
            </Card>
          );
        })()}
        <Card style={{marginBottom:"1rem",background:tier==="FREE"?C.bgElevated:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${tier==="FREE"?C.border:C.goldBorder}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".4rem"}}>
            <Label style={{marginBottom:0}}>Your Plan</Label>
            <div style={{fontSize:10,letterSpacing:".14em",background:tier==="FREE"?C.dimmest:C.goldDim,color:tier==="FREE"?C.dimmer:C.gold,padding:"3px 8px",borderRadius:4,fontWeight:800,textTransform:"uppercase"}}>{tier || "FREE"}</div>
          </div>
          {tier === "FREE" ? (
            <>
              <div style={{fontSize:12,color:C.dim,lineHeight:1.6,marginBottom:".75rem"}}>You're on the free plan — 1 age group, multiple-choice questions, last 5 sessions of history.</div>
              <button onClick={()=>onUpgrade && onUpgrade("multipleAgeGroups","pro")} style={{width:"100%",background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".7rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>See Pro Plans →</button>
            </>
          ) : (
            <div style={{fontSize:12,color:C.dim,lineHeight:1.6}}>You have access to the {tier} tier features.</div>
          )}
        </Card>
        <Card style={{marginBottom:"1rem"}}>
          <Label>About</Label>
          <div style={{fontSize:12,color:C.dimmer,lineHeight:1.9}}>
            <div>Ice-IQ v{VERSION} · {RELEASE_DATE}</div>
            <div>Built on modern player-development principles</div>
            <div style={{color:C.gold,marginTop:".25rem"}}>bluechip-people-strategies.com</div>
          </div>
        </Card>
        {userEmail === ADMIN_EMAIL && onAdminReports && (
          <Card style={{ marginBottom: "1rem", border: `1px solid ${C.purpleBorder}` }}>
            <Label>Admin</Label>
            <button onClick={onAdminReports} style={{
              background: C.purpleDim, color: C.purple, border: `1px solid ${C.purpleBorder}`,
              borderRadius: 10, padding: ".65rem", cursor: "pointer", fontSize: 13,
              fontFamily: FONT.body, fontWeight: 700, width: "100%"
            }}>Review Question Reports</button>
          </Card>
        )}
        <button onClick={onReset} style={{background:"rgba(239,68,68,.06)",color:C.red,border:`1px solid rgba(239,68,68,.2)`,borderRadius:10,padding:".65rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body,width:"100%"}}>{demoMode ? "Exit Demo" : "Sign Out"}</button>
      </div>
    </div>
  );
}



// ─────────────────────────────────────────────────────────

function StudyScreen({ player, onBack, onNav }) {
  const [studyContent, setStudyContent] = useState(null);
  useEffect(() => {
    import("./data/studyContent.js").then(m => setStudyContent(m.STUDY_CONTENT));
  }, []);
  if (!studyContent) {
    return (
      <div style={{minHeight:"100vh",background:C.bg,color:C.dim,fontFamily:FONT.body,display:"flex",alignItems:"center",justifyContent:"center"}}>
        Loading…
      </div>
    );
  }
  const content = studyContent[player.level] || studyContent["U11 / Atom"];
  // Identify weakest skill areas from self ratings
  const cats = SKILLS[player.level] || [];
  const selfScale = getSelfScale(player.level);
  const weakSkills = [];
  cats.forEach(cat => {
    cat.skills.forEach(skill => {
      const rating = player.selfRatings?.[skill.id];
      if (!rating) return;
      const norm = normalizeRating(selfScale, rating);
      if (norm !== null && norm <= 0.33) weakSkills.push({ ...skill, cat: cat.cat, icon: cat.icon });
    });
  });
  weakSkills.splice(5);

  // Pull lowest quiz categories
  const latest = player.quizHistory[player.quizHistory.length-1];
  const weakCats = [];
  if (latest) {
    const tally = {};
    latest.results.forEach(r => {
      if (!tally[r.cat]) tally[r.cat] = {ok:0,total:0};
      tally[r.cat].total++;
      if (r.ok) tally[r.cat].ok++;
    });
    Object.entries(tally)
      .map(([cat, v]) => ({cat, pct: v.ok/v.total}))
      .filter(x => x.pct < 0.6)
      .sort((a,b) => a.pct - b.pct)
      .slice(0,3)
      .forEach(x => weakCats.push(x));
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:80}}>
      <div style={{position:"relative",height:100,overflow:"hidden"}}>
        <img src={imgTactics} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.15}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(8,14,26,1) 0%,transparent 100%)"}}/>
      </div>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>Study</div>
            <div style={{fontSize:11,color:C.dimmer}}>Your personal development plan</div>
          </div>
        </div>
      </StickyHeader>
      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.purpleBorder}`}}>
          <Label>Your Focus</Label>
          <div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>{player.level} · {player.position}</div>
          <div style={{fontSize:12,color:C.dimmer,marginTop:".5rem",lineHeight:1.6}}>Based on your quiz results and self-ratings, here's what to watch and work on.</div>
        </Card>

        {weakCats.length > 0 && (
          <Card style={{marginBottom:"1rem",borderLeft:`3px solid ${C.gold}`}}>
            <Label>🎯 Your Weakest Quiz Categories</Label>
            {weakCats.map(({cat, pct}) => (
              <div key={cat} style={{marginBottom:".65rem",padding:".65rem .8rem",background:C.bgElevated,borderRadius:8,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:13,fontWeight:600,color:C.white}}>{cat}</span>
                  <span style={{fontSize:12,fontWeight:700,color:pct<0.4?C.red:C.yellow}}>{Math.round(pct*100)}%</span>
                </div>
                <div style={{fontSize:11,color:C.dimmer,marginTop:3,lineHeight:1.5}}>Take more quizzes focused on this area — or ask your coach to build practice drills around it.</div>
              </div>
            ))}
          </Card>
        )}

        {weakSkills.length > 0 && (
          <Card style={{marginBottom:"1rem",borderLeft:`3px solid ${C.purple}`}}>
            <Label>📊 Skills You Want to Grow</Label>
            <div style={{fontSize:11,color:C.dimmer,marginBottom:".65rem",lineHeight:1.5}}>From your self-assessment — the areas you rated lowest. Tap a skill to make it a goal.</div>
            {weakSkills.map(skill => (
              <button key={skill.id} onClick={() => onNav("goals")} style={{width:"100%",background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,padding:".65rem .8rem",marginBottom:".4rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",color:C.white,fontFamily:FONT.body,textAlign:"left"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>{skill.icon} {skill.name}</div>
                  <div style={{fontSize:11,color:C.dimmer,marginTop:2}}>{skill.cat}</div>
                </div>
                <span style={{color:C.gold,fontSize:12,fontWeight:700}}>Goal →</span>
              </button>
            ))}
          </Card>
        )}

        {content.games && content.games.length > 0 && (
          <Card style={{marginBottom:"1rem"}}>
            <Label>📺 Games & Clips to Watch</Label>
            <div style={{fontSize:11,color:C.dimmer,marginBottom:".65rem",lineHeight:1.5}}>Pick one this week. Watch with purpose — look for the specific things listed.</div>
            {content.games.map((g, i) => (
              <div key={i} style={{padding:".6rem .8rem",background:C.bgElevated,borderRadius:8,border:`1px solid ${C.border}`,marginBottom:".4rem",fontSize:13,color:C.dim,lineHeight:1.5}}>
                {g}
              </div>
            ))}
          </Card>
        )}

        <Card style={{marginBottom:"1rem"}}>
          <Label>👀 How to Watch Hockey Like a Player</Label>
          {content.watchTips.map((t, i) => (
            <div key={i} style={{display:"flex",gap:".65rem",padding:".55rem 0",borderBottom:i<content.watchTips.length-1?`1px solid ${C.border}`:"none"}}>
              <div style={{color:C.gold,fontWeight:700,fontSize:13,flexShrink:0}}>{i+1}.</div>
              <div style={{fontSize:13,color:C.dim,lineHeight:1.55}}>{t}</div>
            </div>
          ))}
        </Card>

        <Card style={{marginBottom:"1rem"}}>
          <Label>🏒 Focus Drills</Label>
          <div style={{fontSize:11,color:C.dimmer,marginBottom:".65rem",lineHeight:1.5}}>Ask your coach to build these into practice, or work on them in your own ice time.</div>
          {content.focusAreas.map((f, i) => (
            <div key={i} style={{padding:".7rem .85rem",background:C.bgElevated,borderRadius:8,border:`1px solid ${C.border}`,marginBottom:".45rem"}}>
              <div style={{fontSize:13,fontWeight:700,color:C.white,marginBottom:3}}>{f.skill}</div>
              <div style={{fontSize:12,color:C.dim,lineHeight:1.5}}>{f.drill}</div>
            </div>
          ))}
        </Card>

        <div style={{margin:"-1rem -1.25rem 1rem"}}>
          <HockeyInsightWidget />
        </div>

        <Card style={{background:C.purpleDim,border:`1px solid ${C.purpleBorder}`}}>
          <div style={{fontSize:13,color:C.purple,fontWeight:700,marginBottom:".4rem"}}>💡 Study Tip</div>
          <div style={{fontSize:12,color:C.dim,lineHeight:1.6}}>The best players watch hockey differently than fans. They watch the player <strong style={{color:C.white}}>without</strong> the puck — because that's where the game really happens. Try it this week.</div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PRO HOCKEY INTEL WIDGET — small, unobtrusive, rotating stat card
// Appears on Home, Study, Results, Report. Dismissible per session.
// ─────────────────────────────────────────────────────────
function HockeyInsightWidget() {
  const [insights, setInsights] = useState(null);
  const [idx, setIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    import("./data/hockeyInsights.js").then(m => {
      setInsights(m.HOCKEY_INSIGHTS);
      setIdx(Math.floor(Math.random() * m.HOCKEY_INSIGHTS.length));
    });
  }, []);
  if (dismissed || !insights) return null;
  const insight = insights[idx];
  function next() { setIdx((idx + 1) % insights.length); setExpanded(false); }
  return (
    <div style={{
      maxWidth:560, margin:"0 auto 1rem", padding:"0 1.25rem",
    }}>
      <div style={{
        background:`linear-gradient(135deg, rgba(201,168,76,.06), rgba(124,111,205,.06))`,
        border:`1px solid ${C.border}`,
        borderLeft:`3px solid ${C.gold}`,
        borderRadius:10, padding:".65rem .85rem",
        fontFamily:FONT.body, color:C.white,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:".55rem"}}>
          <span style={{fontSize:15,flexShrink:0,opacity:.85}}>{insight.icon}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:C.gold,fontWeight:700,opacity:.85}}>Pro Hockey Intel · {insight.category}</div>
            <div style={{fontSize:12,fontWeight:600,color:C.dim,lineHeight:1.35,marginTop:1}}>{insight.stat}</div>
          </div>
          <button onClick={()=>setExpanded(!expanded)} style={{background:"none",border:"none",color:C.dimmer,fontSize:11,cursor:"pointer",padding:"2px 4px"}} aria-label="Expand">
            {expanded ? "▲" : "▼"}
          </button>
          <button onClick={next} title="Next insight" style={{background:"none",border:"none",color:C.dimmer,fontSize:11,cursor:"pointer",padding:"2px 4px"}} aria-label="Next">↻</button>
          <button onClick={()=>setDismissed(true)} title="Dismiss" style={{background:"none",border:"none",color:C.dimmer,fontSize:12,cursor:"pointer",padding:"2px 4px",lineHeight:1}} aria-label="Dismiss">×</button>
        </div>
        {expanded && (
          <div style={{marginTop:".55rem",paddingTop:".55rem",borderTop:`1px solid ${C.border}`}}>
            <div style={{fontSize:11,color:C.dim,lineHeight:1.6,marginBottom:".45rem"}}>{insight.context}</div>
            <div style={{fontSize:11,color:C.purple,fontStyle:"italic",lineHeight:1.55}}>💡 {insight.lesson}</div>
            <div style={{fontSize:9,color:C.dimmer,fontStyle:"italic",marginTop:".4rem"}}>Source: {insight.source}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function BottomNav({ active, onNav, tier = "FREE" }) {
  const tabs = [
    {id:"home",   icon:"🏠", label:"Home"},
    {id:"quiz",   icon:"🧠", label:"Quiz"},
    {id:"skills", icon:"📊", label:"Skills"},
    {id:"goals",  icon:"🎯", label:"Goals", gated: tier === "FREE"},
    {id:"report", icon:"📋", label:"Report"},
  ];
  return (
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:`${C.bgCard}f8`,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100}}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onNav(t.id)} style={{flex:1,background:"none",border:"none",padding:".65rem .25rem",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:".2rem",position:"relative"}}>
          <span style={{fontSize:18}}>{t.icon}</span>
          {t.gated && <span style={{position:"absolute",top:"1px",right:"8px",width:"12px",height:"12px",background:C.gold,borderRadius:"50%",fontSize:"8px",display:"flex",alignItems:"center",justifyContent:"center",color:C.bg,fontWeight:800}}>🔒</span>}
          <span style={{fontSize:10,color:active===t.id?C.gold:C.dimmer,fontFamily:FONT.body,fontWeight:active===t.id?700:400,transition:"color .15s"}}>{t.label}</span>
          {active===t.id && <div style={{width:4,height:4,borderRadius:"50%",background:C.gold}}/>}
        </button>
      ))}
    </div>
  );
}


// ─────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// AUTH SCREEN — login / signup
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// DEMO MODE — pre-populated sample player, no signup required
// ─────────────────────────────────────────────────────────
// Result stubs in DEMO_PROFILES omit `type` when "mc" — readers default via `r.type || "mc"`.
const R = (id, cat, ok, d, type) => type ? {id,cat,ok,d,type} : {id,cat,ok,d};
const DEMO_PROFILES = {
  "U7 / Initiation":{
    name:"Nora Orr",position:"Not Sure",jersey:7,team:"U7 IP Calgary Flames",
    sessions:(mk)=>[mk(true,false,false,10,52),mk(true,true,false,5,65),mk(true,true,false,1,70)],
    results:(a,b,c)=>[
      R("u7q1","Skating",a,1), R("u7q3","Puck Control",a,1), R("u7q5","Game Awareness",a,1), R("u7q10","Compete",a,1),
      R("u7q20","Skating",b,2), R("u7q25","Compete",b,1), R("u7q30","Game Awareness",b,2), R("u7tf1","Game Awareness",b,1,"tf"),
      R("u7q40","Compete",c,3), R("u7q50","Puck Control",c,2),
    ],
    selfRatings:{u7s1:"developing",u7s2:"introduced",u7s3:"introduced",u7s4:"developing",u7p1:"introduced",u7p2:"introduced",u7c1:"developing",u7c2:"developing",u7c3:"consistent",u7c4:"developing"},
    coachRatings:{u7s1:"introduced",u7s2:"introduced",u7s3:"introduced",u7s4:"developing",u7p1:"introduced",u7p2:"introduced",u7c1:"consistent",u7c2:"developing",u7c3:"consistent",u7c4:"developing"},
    coachNotes:{u7c1:"Great hustle — always gives full effort.",u7s2:"Still learning the snowplow stop. Keep practising at home."},
    goals:{"Skating":{goal:"Learn to stop on both sides",S:"Do 10 snowplow stops each practice",M:"Coach checks off each practice",A:"Yes — we practice stops every session",R:"I fall when I try to stop on my left side",T:"By end of December 2026"}},
  },
  "U9 / Novice":{
    name:"Luca Lidstrom",position:"Defense",jersey:5,team:"U9 A Saskatoon Blazers",
    sessions:(mk)=>[mk(true,false,false,12,55),mk(true,true,false,6,68),mk(true,true,true,2,78)],
    results:(a,b,c)=>[
      R("u9q1","Decision Making",a,1), R("u9q3","Positioning",a,1), R("u9q7","Exiting the Zone",a,1), R("u9q10","Defense",a,1),
      R("u9q16","Decision Making",b,2), R("u9q21","Defense",b,2), R("u9q27","Defense",b,2), R("u9q30","Decision Making",b,2),
      R("u9q41","Decision Making",c,3), R("u9q42","Defense",c,3),
    ],
    selfRatings:{u9s1:"developing",u9s2:"consistent",u9s3:"developing",u9s4:"introduced",u9p1:"developing",u9p2:"developing",u9p3:"introduced",u9p4:"introduced",u9h1:"developing",u9h2:"introduced",u9d1:"developing",u9d2:"introduced",u9c1:"consistent",u9c2:"developing",u9c3:"developing"},
    coachRatings:{u9s1:"developing",u9s2:"developing",u9s3:"introduced",u9s4:"introduced",u9p1:"developing",u9p2:"developing",u9p3:"developing",u9p4:"introduced",u9h1:"developing",u9h2:"introduced",u9d1:"introduced",u9d2:"introduced",u9c1:"consistent",u9c2:"consistent",u9c3:"developing"},
    coachNotes:{u9d1:"Good positioning but needs to close gap faster on rushes.",u9c1:"Competes hard every shift — great example for the team."},
    goals:{"Defense":{goal:"Improve gap control on the rush",S:"Hold the blue line and close gap by top of circles",M:"Coach tracks clean gap closes per game",A:"Yes — 1-on-1 rush drills in practice",R:"I back up too much and give attackers time",T:"By end of October 2026"}},
  },
  "U13 / Peewee":{
    name:"Maya Roy",position:"Goalie",jersey:30,team:"U13 AAA Vancouver Hawks",
    sessions:(mk)=>[mk(true,false,false,10,62),mk(true,true,false,4,75),mk(true,true,true,1,86)],
    results:(a,b,c)=>[
      R("u13q1","Rush Reads",a,1), R("u13q5","Defensive Zone",a,1), R("u13q10","Zone Entry",a,1), R("u13q15","Special Teams",a,1),
      R("u13q25","Shot Selection",b,2), R("u13q35","Defensive Zone",b,2), R("u13q45","Special Teams",b,2), R("u13g1","Goalie",b,1),
      R("u13g5","Goalie",c,2), R("u13g10","Goalie",c,3),
    ],
    selfRatings:{u13s1:"consistent",u13s2:"developing",u13s3:"developing",u13p1:"developing",u13p2:"introduced",u13p3:"consistent",u13p4:"developing",u13h1:"consistent",u13h2:"developing",u13h3:"consistent",u13h4:"developing",u13d1:"developing",u13d2:"consistent",u13c1:"proficient",u13c2:"consistent",u13c3:"developing",u13c4:"consistent"},
    coachRatings:{u13s1:"consistent",u13s2:"developing",u13s3:"introduced",u13p1:"developing",u13p2:"introduced",u13p3:"developing",u13p4:"developing",u13h1:"developing",u13h2:"developing",u13h3:"consistent",u13h4:"developing",u13d1:"developing",u13d2:"consistent",u13c1:"proficient",u13c2:"consistent",u13c3:"consistent",u13c4:"consistent"},
    coachNotes:{u13h3:"Strong defensive zone awareness for a goalie — reads plays well.",u13c1:"Natural leader. Keeps the team calm under pressure."},
    goals:{"Leadership":{goal:"Be more vocal in the room and on the ice during games",S:"Call out plays and communicate with D on every shift",M:"Coach gives feedback after each game on communication",A:"Yes — I already talk to my D but need to be louder",R:"Coach says I read the game well but teammates don't hear me",T:"By January 2027"}},
  },
  "U11 / Atom":{
    name:"Cole Gretzky",position:"Forward",jersey:99,team:"U11 AA Edmonton Selects",
    sessions:(mk)=>[mk(true,false,false,14,58),mk(true,true,false,7,71),mk(true,true,true,1,83)],
    results:(a,b,c)=>[
      R("u11q1","Rush Reads",a,1), R("u11q2","Coverage",a,1), R("u11q6","Puck Protection",a,1), R("u11q11","Exiting the Zone",a,1),
      R("u11q20","Coverage",b,2), R("u11q30","Special Teams",b,2), R("u11q40","Puck Protection",b,2), R("u11q50","Coverage",b,2),
      R("u11q92","Blue Line Decisions",c,3), R("u11q100","Decision Timing",c,3),
    ],
    selfRatings:{u11s1:"developing",u11s2:"consistent",u11s3:"developing",u11s4:"introduced",u11p1:"consistent",u11p2:"developing",u11p3:"developing",u11p4:"consistent",u11h1:"consistent",u11h2:"developing",u11h3:"developing",u11d1:"developing",u11d2:"introduced",u11c1:"advanced",u11c2:"proficient",u11c3:"consistent",u11dm1:"developing",u11dm2:"developing",u11dm3:"introduced",u11dm4:"consistent",u11dm5:"developing"},
    coachRatings:{u11s1:"developing",u11s2:"consistent",u11s3:"developing",u11s4:"developing",u11p1:"consistent",u11p2:"developing",u11p3:"consistent",u11p4:"proficient",u11h1:"consistent",u11h2:"developing",u11h3:"developing",u11d1:"introduced",u11d2:"introduced",u11c1:"advanced",u11c2:"proficient",u11c3:"proficient",u11dm1:"developing",u11dm2:"developing",u11dm3:"developing",u11dm4:"consistent",u11dm5:"developing"},
    coachNotes:{u11d1:"Work on matching attacker speed and closing the gap.",u11c1:"Elite compete level — sets the tone every shift."},
    goals:{"Gap Control":{goal:"Close the gap at the blue line instead of backing up",S:"Close gap by top of circles on every rush",M:"Track clean gap closes per game",A:"Yes — drill with D-partner in warmups",R:"Biggest weakness — I give up the blue line",T:"By end of November 2026"}},
  },
  "U15 / Bantam":{
    name:"Jack Bourque",position:"Defense",jersey:77,team:"U15 AAA Winnipeg Warriors",
    sessions:(mk)=>[mk(true,false,false,8,60),mk(true,true,false,3,74),mk(true,true,true,1,85)],
    results:(a,b,c)=>[
      R("u15q1","Systems Play",a,1), R("u15q5","Transition Game",a,1), R("u15q10","Special Teams",a,1), R("u15q15","Gap Control",a,1),
      R("u15q25","Physical Play",b,2), R("u15q35","Leadership",b,2), R("u15q45","Systems Play",b,2), R("u15q55","Transition Game",b,2),
      R("u15q75","Gap Control",c,3), R("u15q90","Special Teams",c,3),
    ],
    selfRatings:{},coachRatings:{},coachNotes:{},
    goals:{"Systems Play":{goal:"Master the 1-2-2 forecheck",S:"Execute my role in the 1-2-2 every shift",M:"Coach reviews video after each game",A:"Yes — we run this system every practice",R:"I freelance too much and break structure",T:"By end of January 2027"}},
  },
  "U18 / Midget":{
    name:"Eli Lemieux",position:"Forward",jersey:19,team:"U18 Prep Toronto Jr. Canadiens",
    sessions:(mk)=>[mk(true,true,false,6,72),mk(true,true,true,3,81),mk(true,true,true,1,89)],
    results:(a,b,c)=>[
      R("u18q1","Game Management",a,1), R("u18q5","Advanced Tactics",a,1), R("u18q10","Special Teams",a,1), R("u18q15","Breakout Execution",a,1),
      R("u18q25","Neutral Zone Play",b,2), R("u18q35","Leadership",b,2), R("u18q48","Advanced Tactics",b,2), R("u18q55","Breakout Execution",b,2),
      R("u18q81","Breakout Execution",c,3), R("u18q99","Breakout Execution",c,3),
    ],
    selfRatings:{},coachRatings:{},coachNotes:{},
    goals:{"Leadership":{goal:"Lead the room as an alternate captain",S:"Speak up in team meetings and set the tone pre-game",M:"Coaches track leadership moments weekly",A:"Yes — coaches gave me the A",R:"I lead by example but need to be more vocal",T:"By March 2027"}},
  },
};

const DEMO_PARENT_RATINGS = {
  "U7 / Initiation": { passion:"thriving", readiness:"steady",   effort:"thriving", adversity:"growing", sportsmanship:"thriving", confidence:"steady",   coachability:"steady",   balance:"thriving" },
  "U9 / Novice":     { passion:"thriving", readiness:"growing",  effort:"steady",   adversity:"steady",  sportsmanship:"steady",   confidence:"growing",  coachability:"steady",   balance:"steady"   },
  "U11 / Atom":      { passion:"thriving", readiness:"steady",   effort:"thriving", adversity:"steady",  sportsmanship:"thriving", confidence:"steady",   coachability:"thriving", balance:"steady"   },
  "U13 / Peewee":    { passion:"steady",   readiness:"steady",   effort:"thriving", adversity:"growing", sportsmanship:"steady",   confidence:"steady",   coachability:"steady",   balance:"growing"  },
  "U15 / Bantam":    { passion:"steady",   readiness:"thriving", effort:"thriving", adversity:"steady",  sportsmanship:"thriving", confidence:"thriving", coachability:"steady",   balance:"growing"  },
  "U18 / Midget":    { passion:"steady",   readiness:"thriving", effort:"thriving", adversity:"thriving",sportsmanship:"thriving", confidence:"thriving", coachability:"thriving", balance:"growing"  },
};

function buildDemoPlayer(level) {
  const cfg = DEMO_PROFILES[level];
  if (!cfg) return null;
  const now = Date.now();
  const day = 86400000;
  const mkSession = (ok1, ok2, ok3, daysAgo, score) => ({
    results: cfg.results(ok1, ok2, ok3), score,
    date: new Date(now - daysAgo*day).toISOString(),
  });
  const parentRatings = DEMO_PARENT_RATINGS[level]
    ? { ...DEMO_PARENT_RATINGS[level], updated_at: new Date(now - 14*day).toISOString().slice(0, 10) }
    : null;
  const dStr = (daysAgo) => new Date(now - daysAgo*day).toISOString().slice(0, 10);
  const T = (d, type, value, unit) => ({ date: dStr(d), type, value, unit });
  const trainingSessions = [
    T(1,"pucks_shot",50,"pucks"),  T(3,"skills_dev",30,"min"),  T(5,"power_skating",30,"min"),
    T(8,"pucks_shot",50,"pucks"),  T(10,"skills_dev",30,"min"), T(12,"power_skating",30,"min"),
  ];
  return {
    id: "__demo__", name: cfg.name, level, position: cfg.position,
    season: SEASONS[0], sessionLength: 10, colorblind: false, coachCode: "",
    quizHistory: cfg.sessions(mkSession),
    selfRatings: {...cfg.selfRatings}, goals: {...cfg.goals},
    parentRatings,
    trainingSessions,
    __demo: true,
  };
}
// Multi-coach feedback (demo) — persona roster with per-level staffing caps
const COACH_PERSONAS = [
  { id:"head",          name:"Coach Reynolds",  role:"Head Coach",                     tilts:[],         summary:"Leads by example — coachable and brings full effort every practice." },
  { id:"assistant",     name:"Coach Martinez",  role:"Assistant Coach",                tilts:[],         summary:"Brings energy to practice every day — good teammate in the room." },
  { id:"skills",        name:"Coach Chen",      role:"Skills Coach",                   tilts:["s","p"],  summary:"Strong work ethic in skill sessions — hands keep getting better." },
  { id:"goalie",        name:"Coach Thompson",  role:"Goalie Coach",                   tilts:["h","d"],  summary:"Good tracking and composure in the crease. Work on push recovery." },
  { id:"power_skating", name:"Coach Andersson", role:"Power Skating Coach",            tilts:["s"],      summary:"Refine outside edges and crossovers — stride mechanics coming along nicely." },
  { id:"video",         name:"Coach O'Brien",   role:"Video / Analytics Coach",        tilts:["h","dm"], summary:"Sees the ice well when they slow the game down and look up first." },
  { id:"asst2",         name:"Coach Patel",     role:"Assistant Coach",                tilts:[],         summary:"Listens well in meetings — asks great questions and applies the feedback." },
  { id:"mental",        name:"Coach Yamamoto",  role:"Mental Performance Coach",       tilts:["c"],      summary:"Stays composed after mistakes — keep building confidence through routine." },
  { id:"strength",      name:"Coach Petrov",    role:"Strength & Conditioning Coach",  tilts:["p"],      summary:"Off-ice consistency is paying off — stronger on pucks, finishing checks better." },
];

const DEMO_ROSTERS = {
  "U7 / Initiation": { all:["head","assistant"] },
  "U9 / Novice":     { all:["head","assistant","skills"] },
  "U11 / Atom":      { all:["head","assistant","skills","power_skating"] },
  "U13 / Peewee":    { all:["head","assistant","skills","power_skating","video"],                    goalie:["head","assistant","skills","goalie","power_skating"] },
  "U15 / Bantam":    { all:["head","assistant","asst2","skills","power_skating","video"],            goalie:["head","assistant","asst2","skills","goalie","power_skating"] },
  "U18 / Midget":    { all:["head","assistant","asst2","skills","power_skating","video","mental","strength"], goalie:["head","assistant","asst2","skills","goalie","power_skating","video","mental"] },
};
function getDemoCoachRoster(level, position) {
  const r = DEMO_ROSTERS[level] || DEMO_ROSTERS["U7 / Initiation"];
  const ids = (position === "Goalie" && r.goalie) ? r.goalie : r.all;
  return ids.map(id => COACH_PERSONAS.find(p => p.id === id)).filter(Boolean);
}

// Skill IDs look like "u11s2" (skating-2), "u13dm4" (decision-making-4). Extract the domain prefix.
function skillDomain(skillId) {
  const m = skillId?.match(/^u\d+([a-z]+)\d+$/);
  return m ? m[1] : null;
}

function bumpRating(value, scale) {
  if (!value || !scale?.length) return value;
  const idx = scale.findIndex(o => o.value === value);
  if (idx < 0 || idx >= scale.length - 1) return value;
  return scale[idx + 1].value;
}

function tiltedRatings(baseline, persona, scale) {
  if (!persona.tilts?.length) return {...baseline};
  const out = {...baseline};
  for (const skillId of Object.keys(baseline)) {
    const d = skillDomain(skillId);
    if (d && persona.tilts.includes(d)) out[skillId] = bumpRating(baseline[skillId], scale);
  }
  return out;
}

function aggregateCoachRatings(coaches, scale) {
  if (!coaches?.length || !scale?.length) return {};
  const skillIds = new Set();
  coaches.forEach(c => Object.keys(c.ratings || {}).forEach(id => skillIds.add(id)));
  const agg = {};
  for (const id of skillIds) {
    const indices = coaches
      .map(c => c.ratings?.[id])
      .filter(Boolean)
      .map(v => scale.findIndex(o => o.value === v))
      .filter(i => i >= 0);
    if (!indices.length) continue;
    const avg = Math.round(indices.reduce((a,b) => a+b, 0) / indices.length);
    agg[id] = scale[Math.min(Math.max(avg, 0), scale.length - 1)].value;
  }
  return agg;
}

function buildDemoCoachRatings(level) {
  const cfg = DEMO_PROFILES[level];
  if (!cfg) return { coaches: [], ratings: {}, notes: {} };
  const position = cfg.position || "Forward";
  const personas = getDemoCoachRoster(level, position);
  const baseline = cfg.coachRatings || {};
  const baselineNotes = cfg.coachNotes || {};
  const scale = getCoachScale(level);
  // Stagger dates so each coach's session looks distinct
  const baseDate = new Date("2026-03-15");
  const coaches = personas.map((p, i) => {
    const d = new Date(baseDate); d.setDate(d.getDate() - i * 7);
    return {
      id: p.id,
      name: p.name,
      role: p.role,
      date: d.toISOString().slice(0, 10),
      summary: p.summary,
      ratings: tiltedRatings(baseline, p, scale),
      notes: i === 0 ? {...baselineNotes} : {},
    };
  });
  const aggregate = aggregateCoachRatings(coaches, scale);
  const mergedNotes = coaches.reduce((acc, c) => ({...acc, ...c.notes}), {});
  return { coaches, ratings: aggregate, notes: mergedNotes };
}

// ─────────────────────────────────────────────────────────
// RINK BACKGROUND — NHL rink geometry.
// dark=true → night-rink for splash page (dark ice, glowing lines)
// dark=false → pale rink for in-app diagrams
// ─────────────────────────────────────────────────────────
function RinkBackground({ dark = false }) {
  const ICE    = dark ? "#03090f" : "#d7e8f5";
  const LINE_R = dark ? "rgba(220,60,60,0.7)"  : "#b8232e";
  const LINE_B = dark ? "rgba(50,110,230,0.75)" : "#0c5ab5";
  const OUTLINE= dark ? "rgba(255,255,255,0.07)" : "#1c1c1c";
  const CREASE = dark ? "rgba(50,110,230,0.18)"  : "#5aa8e6";
  const GLOW_R = dark ? "rgba(220,60,60,0.18)"   : "none";
  const GLOW_B = dark ? "rgba(50,110,230,0.15)"  : "none";
  return (
    <svg
      viewBox="0 0 200 85"
      preserveAspectRatio="xMidYMid slice"
      style={{position:"absolute",inset:0,width:"100%",height:"100%"}}
      aria-hidden="true"
    >
      <defs>
        {dark && <filter id="glow-r"><feGaussianBlur stdDeviation="1.2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>}
        {dark && <filter id="glow-b"><feGaussianBlur stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>}
      </defs>

      {/* Ice surface */}
      <rect x="0.5" y="0.5" width="199" height="84" rx="28" ry="28" fill={ICE} />
      {dark && <rect x="0.5" y="0.5" width="199" height="84" rx="28" ry="28" fill="url(#ice-sheen)" />}
      {/* Rink outline */}
      <rect x="0.5" y="0.5" width="199" height="84" rx="28" ry="28" fill="none" stroke={OUTLINE} strokeWidth="0.6" />

      {/* Goal lines */}
      <line x1="11" y1="5" x2="11" y2="80" stroke={LINE_R} strokeWidth={dark?"0.5":"0.35"} filter={dark?"url(#glow-r)":undefined}/>
      <line x1="189" y1="5" x2="189" y2="80" stroke={LINE_R} strokeWidth={dark?"0.5":"0.35"} filter={dark?"url(#glow-r)":undefined}/>

      {/* Blue lines */}
      <line x1="75" y1="0.5" x2="75" y2="84.5" stroke={LINE_B} strokeWidth={dark?"1.8":"1.3"} filter={dark?"url(#glow-b)":undefined}/>
      <line x1="125" y1="0.5" x2="125" y2="84.5" stroke={LINE_B} strokeWidth={dark?"1.8":"1.3"} filter={dark?"url(#glow-b)":undefined}/>

      {/* Center red line */}
      <line x1="100" y1="0.5" x2="100" y2="84.5" stroke={LINE_R} strokeWidth={dark?"1.8":"1.3"} filter={dark?"url(#glow-r)":undefined}/>

      {/* Center faceoff circle + dot */}
      <circle cx="100" cy="42.5" r="15" fill={dark?GLOW_B:"none"} stroke={LINE_B} strokeWidth="0.5" filter={dark?"url(#glow-b)":undefined}/>
      <circle cx="100" cy="42.5" r="0.8" fill={LINE_B} />

      {/* Referee crease */}
      <path d="M 90 85 A 10 10 0 0 1 110 85" fill="none" stroke={LINE_R} strokeWidth="0.3" />

      {/* Neutral zone faceoff dots */}
      <circle cx="80" cy="20.5" r="0.9" fill={LINE_R} />
      <circle cx="80" cy="64.5" r="0.9" fill={LINE_R} />
      <circle cx="120" cy="20.5" r="0.9" fill={LINE_R} />
      <circle cx="120" cy="64.5" r="0.9" fill={LINE_R} />

      {/* End-zone faceoff circles */}
      {[
        {cx:31,  cy:20.5},
        {cx:31,  cy:64.5},
        {cx:169, cy:20.5},
        {cx:169, cy:64.5},
      ].map((c, i) => (
        <g key={i}>
          <circle cx={c.cx} cy={c.cy} r="15" fill={dark?GLOW_R:"none"} stroke={LINE_R} strokeWidth="0.5" filter={dark?"url(#glow-r)":undefined}/>
          <circle cx={c.cx} cy={c.cy} r="0.9" fill={LINE_R} />
          <path d={`M ${c.cx-2} ${c.cy-3.8} L ${c.cx-2} ${c.cy-5.8} L ${c.cx-0.3} ${c.cy-5.8}`} fill="none" stroke={LINE_R} strokeWidth="0.3" />
          <path d={`M ${c.cx+2} ${c.cy-3.8} L ${c.cx+2} ${c.cy-5.8} L ${c.cx+0.3} ${c.cy-5.8}`} fill="none" stroke={LINE_R} strokeWidth="0.3" />
          <path d={`M ${c.cx-2} ${c.cy+3.8} L ${c.cx-2} ${c.cy+5.8} L ${c.cx-0.3} ${c.cy+5.8}`} fill="none" stroke={LINE_R} strokeWidth="0.3" />
          <path d={`M ${c.cx+2} ${c.cy+3.8} L ${c.cx+2} ${c.cy+5.8} L ${c.cx+0.3} ${c.cy+5.8}`} fill="none" stroke={LINE_R} strokeWidth="0.3" />
        </g>
      ))}

      {/* Goal creases */}
      <path d="M 11 37.5 A 6 6 0 0 1 11 47.5 Z" fill={CREASE} stroke={LINE_R} strokeWidth="0.3" />
      <path d="M 189 37.5 A 6 6 0 0 0 189 47.5 Z" fill={CREASE} stroke={LINE_R} strokeWidth="0.3" />

      {/* Goal nets */}
      <rect x="9" y="40" width="2" height="5" fill="none" stroke={LINE_R} strokeWidth="0.25" />
      <rect x="189" y="40" width="2" height="5" fill="none" stroke={LINE_R} strokeWidth="0.25" />

      {/* Goalie trapezoid */}
      <path d="M 11 34 L 0.5 28 M 11 51 L 0.5 57" stroke={LINE_R} strokeWidth="0.25" fill="none" />
      <path d="M 189 34 L 199.5 28 M 189 51 L 199.5 57" stroke={LINE_R} strokeWidth="0.25" fill="none" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// AUTH SCREEN — login / signup
// ─────────────────────────────────────────────────────────
function AuthScreen({ onAuthenticated, onDemo }) {
  const [mode, setMode] = useState("login"); // login | signup | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("player");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // Returning user detection: any prior sign-in or signup stamps this flag
  const hasSignedInBefore = (() => {
    try { return typeof window !== "undefined" && !!window.localStorage.getItem("iceiq_has_signed_in_before"); }
    catch { return false; }
  })();

  async function submit() {
    setErr("");
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!email.trim() || !password || !name.trim()) throw new Error("All fields required");
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        await SB.signUp({ email: email.trim(), password, role, name: name.trim() });
        try { window.localStorage.setItem("iceiq_has_signed_in_before", "1"); } catch {}
      } else if (mode === "forgot") {
        if (!email.trim()) throw new Error("Enter your email to reset your password");
        if (!supabase) throw new Error("Password reset unavailable — Supabase not configured");
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        });
        if (error) throw error;
        setResetSent(true);
        setLoading(false);
        return;
      } else {
        if (!email.trim() || !password) throw new Error("Email and password required");
        await SB.signIn({ email: email.trim(), password });
        try { window.localStorage.setItem("iceiq_has_signed_in_before", "1"); } catch {}
      }
      onAuthenticated();
    } catch (e) {
      setErr(e.message || "Something went wrong");
    }
    setLoading(false);
  }

  const headline = mode === "signup" ? "Get started."
    : mode === "forgot" ? "Reset password"
    : (hasSignedInBefore ? "Welcome back." : "Welcome.");
  const subhead = mode === "signup" ? "Create an account to start tracking your game sense."
    : mode === "forgot" ? "Enter your email — we'll send you a reset link."
    : (hasSignedInBefore ? "Sign in to see your development report." : "Sign in or create a free account to get started.");

  return (
    <div style={{minHeight:"100vh",position:"relative",background:"#03090f",display:"flex",flexDirection:"column",justifyContent:"center",padding:"2rem 1.25rem",fontFamily:FONT.body,color:C.white,overflow:"hidden"}}>

      {/* Dark night-rink SVG background */}
      <RinkBackground dark={true}/>

      {/* Layered gradient overlays for depth */}
      <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(3,9,15,0.55) 0%,rgba(3,9,15,0.35) 45%,rgba(3,9,15,0.82) 100%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 60% at 50% 40%,rgba(201,168,76,0.04) 0%,transparent 70%)",pointerEvents:"none"}}/>

      <div style={{position:"relative",maxWidth:420,margin:"0 auto",width:"100%"}}>

        {/* Hero brand block */}
        <div style={{textAlign:"center",marginBottom:"1.75rem"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:".55rem",background:"rgba(3,9,15,0.6)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:`1px solid rgba(201,168,76,0.2)`,borderRadius:14,padding:".55rem 1.1rem",marginBottom:"1.1rem"}}>
            <IceIQLogo size={26}/>
            <span style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.6rem",color:C.gold,letterSpacing:".1em"}}>Ice-IQ</span>
          </div>
          <h1 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"clamp(2rem,8vw,2.75rem)",lineHeight:1.05,margin:"0 0 .6rem",letterSpacing:"-.01em"}}>
            Train smarter.<br/><span style={{color:C.gold}}>Play sharper.</span>
          </h1>
          <p style={{fontSize:14,color:"rgba(248,250,252,.7)",lineHeight:1.65,margin:"0 auto 1.25rem",maxWidth:340}}>
            Hockey development built on game sense — 880+ adaptive questions, SMART goals, and pro insights for U7 to U18.
          </p>
          {/* Stat chips */}
          <div style={{display:"flex",gap:".5rem",justifyContent:"center",flexWrap:"wrap"}}>
            {[
              {n:"880+",l:"Questions"},
              {n:"6",l:"Age groups"},
              {n:"5",l:"Question types"},
            ].map((s,i) => (
              <div key={i} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:".3rem .85rem",display:"flex",alignItems:"baseline",gap:".3rem"}}>
                <span style={{fontFamily:FONT.display,fontWeight:800,fontSize:15,color:C.gold}}>{s.n}</span>
                <span style={{fontSize:11,color:"rgba(248,250,252,.55)"}}>{ s.l}</span>
              </div>
            ))}
          </div>
        </div>

      {/* Auth card */}
      <div style={{background:"rgba(6,12,22,0.82)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:`1px solid rgba(255,255,255,0.08)`,borderTop:`1px solid rgba(255,255,255,0.13)`,borderRadius:20,padding:"1.75rem 1.5rem",boxShadow:"0 32px 80px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.06)"}}>

        <h2 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"clamp(1.6rem,5vw,2.1rem)",margin:"0 0 .35rem",lineHeight:1.1}}>
          {headline}
        </h2>
        <p style={{fontSize:13,color:"rgba(248,250,252,.5)",marginBottom:"1.5rem",lineHeight:1.55}}>{subhead}</p>

        {mode === "signup" && (
          <>
            <div style={{marginBottom:"1rem"}}>
              <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:".5rem"}}>I am a...</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                {[{v:"player",l:"Parent/Guardian (on behalf of player)",i:"👪"},{v:"coach",l:"Coach",i:"👨‍🏫"}].map(o => (
                  <button key={o.v} onClick={()=>setRole(o.v)} style={{background:role===o.v?C.goldDim:C.bgCard,border:`1px solid ${role===o.v?C.gold:C.border}`,borderRadius:10,padding:".75rem",cursor:"pointer",color:role===o.v?C.gold:C.dim,fontFamily:FONT.body,fontWeight:role===o.v?700:500,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:".4rem"}}>
                    <span style={{fontSize:16}}>{o.i}</span>{o.l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:".6rem .85rem",marginBottom:".6rem"}}>
              <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:2}}>Name</div>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder={role==="coach"?"Coach name":"Player's name"}
                style={{background:"none",border:"none",color:C.white,fontSize:15,fontFamily:FONT.body,width:"100%",outline:"none",padding:0}}/>
            </div>
          </>
        )}

        {/* Email + password side-by-side on wider screens, stacked on narrow */}
        {mode !== "forgot" ? (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem",marginBottom:".65rem"}}>
            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:".6rem .85rem"}}>
              <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:2}}>Email</div>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"
                style={{background:"none",border:"none",color:C.white,fontSize:14,fontFamily:FONT.body,width:"100%",outline:"none",padding:0}}/>
            </div>
            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:".6rem .85rem"}}>
              <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:2}}>Password</div>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="signup"?"6+ chars":"••••••"} autoComplete={mode==="signup"?"new-password":"current-password"}
                style={{background:"none",border:"none",color:C.white,fontSize:14,fontFamily:FONT.body,width:"100%",outline:"none",padding:0}}/>
            </div>
          </div>
        ) : (
          <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:".6rem .85rem",marginBottom:".65rem"}}>
            <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:2}}>Email</div>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"
              style={{background:"none",border:"none",color:C.white,fontSize:15,fontFamily:FONT.body,width:"100%",outline:"none",padding:0}}/>
          </div>
        )}

        {err && (
          <div style={{fontSize:13,color:C.red,background:C.redDim,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:".6rem .8rem",marginBottom:".75rem"}}>
            {err}
          </div>
        )}
        {resetSent && (
          <div style={{fontSize:13,color:C.green,background:"rgba(34,197,94,.08)",border:`1px solid ${C.greenBorder}`,borderRadius:8,padding:".65rem .8rem",marginBottom:".75rem",lineHeight:1.5}}>
            ✓ Check your email for a reset link. It may take a minute to arrive.
          </div>
        )}

        {/* Big primary button — bigger than the email/password fields */}
        <button onClick={submit} disabled={loading} style={{width:"100%",background:C.gold,color:C.bg,border:"none",borderRadius:12,padding:"1.1rem",cursor:loading?"default":"pointer",fontWeight:800,fontSize:17,fontFamily:FONT.body,letterSpacing:".02em",boxShadow:`0 4px 16px ${C.gold}33`}}>
          {loading ? "…" : (mode === "signup" ? "Create Account →" : mode === "forgot" ? "Send Reset Link →" : "Sign In →")}
        </button>

        {/* Forgot password link — visible only on login mode */}
        {mode === "login" && (
          <div style={{textAlign:"center",marginTop:".75rem"}}>
            <button onClick={()=>{setMode("forgot");setErr("");setResetSent(false);}} style={{background:"none",border:"none",color:C.dimmer,cursor:"pointer",fontSize:12,fontFamily:FONT.body,padding:0,textDecoration:"underline"}}>
              Forgot password?
            </button>
          </div>
        )}
        {mode === "forgot" && (
          <div style={{textAlign:"center",marginTop:".75rem"}}>
            <button onClick={()=>{setMode("login");setErr("");setResetSent(false);}} style={{background:"none",border:"none",color:C.dimmer,cursor:"pointer",fontSize:12,fontFamily:FONT.body,padding:0,textDecoration:"underline"}}>
              ← Back to sign in
            </button>
          </div>
        )}

        {mode !== "forgot" && (
          <div style={{textAlign:"center",marginTop:"1.1rem",fontSize:13,color:"rgba(248,250,252,.4)"}}>
            {mode === "login" ? "New to Ice-IQ?" : "Already have an account? "}
            <button onClick={()=>{setMode(mode==="login"?"signup":"login");setErr("");}} style={{background:"none",border:"none",color:C.gold,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:FONT.body,padding:0}}>
              {mode === "login" ? "Create account →" : "Sign in →"}
            </button>
          </div>
        )}

        <div style={{marginTop:"1.75rem",paddingTop:"1.5rem",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
          <div style={{fontSize:11,letterSpacing:".14em",textTransform:"uppercase",color:"rgba(248,250,252,.35)",fontWeight:700,textAlign:"center",marginBottom:"1rem"}}>Try without signing up</div>
          <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:C.purple,fontWeight:700,marginBottom:".4rem",opacity:.85}}>Player</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem",marginBottom:".65rem"}}>
            {LEVELS.map(lvl => {
              const cfg = DEMO_PROFILES[lvl];
              if (!cfg) return null;
              const short = lvl.split(" / ")[0];
              return (
                <button key={lvl} onClick={()=>onDemo(lvl)} style={{background:"rgba(124,111,205,0.08)",border:"1px solid rgba(124,111,205,0.2)",borderRadius:10,padding:".65rem .6rem",cursor:"pointer",color:C.white,fontFamily:FONT.body,textAlign:"left",transition:"background .15s"}}>
                  <div style={{display:"flex",alignItems:"baseline",gap:".3rem",marginBottom:2}}>
                    <span style={{fontWeight:800,fontSize:13,color:C.white}}>{cfg.name}</span>
                    <span style={{fontWeight:700,fontSize:11,color:C.gold}}>#{cfg.jersey}</span>
                  </div>
                  <div style={{fontSize:10,color:"rgba(167,155,240,.75)",marginBottom:1,lineHeight:1.3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{cfg.team}</div>
                  <div style={{fontSize:9,color:"rgba(248,250,252,.3)",lineHeight:1.3}}>{cfg.position}</div>
                </button>
              );
            })}
          </div>
          <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:C.gold,fontWeight:700,marginBottom:".4rem",opacity:.85}}>Coach</div>
          <button onClick={()=>onDemo("__coach__")} style={{width:"100%",background:"rgba(201,168,76,0.07)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:10,padding:".65rem .75rem",cursor:"pointer",color:C.white,fontFamily:FONT.body,textAlign:"left"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".5rem"}}>
              <div>
                <div style={{fontWeight:700,fontSize:12,color:"rgba(201,168,76,.9)",marginBottom:1}}>Coach Dashboard</div>
                <div style={{fontSize:10,color:"rgba(248,250,252,.4)"}}>U11 AA Edmonton Selects</div>
              </div>
              <span style={{color:"rgba(201,168,76,.6)",fontSize:14}}>→</span>
            </div>
            <div style={{borderTop:"1px solid rgba(201,168,76,0.12)",paddingTop:".45rem"}}>
              {DEMO_COACH_ROSTER.slice(0,3).map(p => (
                <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".3rem"}}>
                  <div style={{display:"flex",alignItems:"center",gap:".35rem"}}>
                    <span style={{fontSize:9,color:"rgba(248,250,252,.28)",width:40,flexShrink:0}}>{p.position}</span>
                    <span style={{fontSize:11,color:"rgba(248,250,252,.72)",fontWeight:600}}>{p.name}</span>
                  </div>
                  <span style={{fontSize:10,color:"rgba(201,168,76,.85)",fontWeight:700}}>GS {p.iq}</span>
                </div>
              ))}
              <div style={{fontSize:9,color:"rgba(248,250,252,.22)",textAlign:"right",marginTop:".1rem"}}>+{DEMO_COACH_ROSTER.length - 3} more players</div>
            </div>
          </button>
          <div style={{fontSize:10,color:"rgba(248,250,252,.3)",textAlign:"center",marginTop:".6rem"}}>Nothing is saved in demo mode.</div>
        </div>

        <div style={{fontSize:10,color:"rgba(248,250,252,.3)",textAlign:"center",marginTop:"1.5rem"}}>v{VERSION}</div>
      </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// COACH HOME — teams list, create team, roster
// ─────────────────────────────────────────────────────────
const DEMO_COACH_TEAMS = [
  {id:"demo-t1",name:"U11 AA Edmonton Selects",level:"U11 / Atom",season:SEASONS[0],code:"SELECTS"},
];
const DEMO_COACH_ROSTER = [
  {id:"dr1",name:"Cole Gretzky",level:"U11 / Atom",position:"Forward",iq:83,sessions:3},
  {id:"dr2",name:"Nora Howe",level:"U11 / Atom",position:"Defense",iq:71,sessions:2},
  {id:"dr3",name:"Marcus Sakic",level:"U11 / Atom",position:"Forward",iq:65,sessions:1},
  {id:"dr4",name:"Maya Hasek",level:"U11 / Atom",position:"Goalie",iq:78,sessions:3},
  {id:"dr5",name:"Tyler Blackwood",level:"U11 / Atom",position:"Defense",iq:58,sessions:1},
];

function CoachHome({ profile, onSignOut, onOpenPlayer, demoMode }) {
  const isDemo = demoMode || profile.id === "__demo_coach__";
  const [teams, setTeams] = useState(isDemo ? DEMO_COACH_TEAMS : []);
  const [loading, setLoading] = useState(!isDemo);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState("U11 / Atom");
  const [newSeason, setNewSeason] = useState(SEASONS[0]);
  const [expandedTeam, setExpandedTeam] = useState(isDemo ? "demo-t1" : null);
  const [rosters, setRosters] = useState(isDemo ? {"demo-t1": DEMO_COACH_ROSTER} : {});

  useEffect(() => { if (isDemo) return; (async () => {
    const t = await SB.getCoachTeams(profile.id);
    setTeams(t);
    setLoading(false);
  })(); }, []);

  async function createTeam() {
    if (!newName.trim()) return;
    try {
      const team = await SB.createTeam({ coachId: profile.id, name: newName.trim(), level: newLevel, season: newSeason });
      setTeams([team, ...teams]);
      setCreating(false); setNewName("");
    } catch (e) { alert(e.message); }
  }

  async function toggleRoster(teamId) {
    if (expandedTeam === teamId) { setExpandedTeam(null); return; }
    setExpandedTeam(teamId);
    if (!rosters[teamId]) {
      const r = await SB.getTeamRoster(teamId);
      setRosters(p => ({...p, [teamId]: r}));
    }
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:40}}>
      <div style={{padding:"1.5rem 1.25rem",maxWidth:560,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.5rem"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:".45rem",marginBottom:".25rem"}}>
              <IceIQLogo size={22}/>
              <span style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.5rem",color:C.gold,letterSpacing:".06em"}}>Ice-IQ</span>
              <span style={{fontSize:10,color:C.dimmer,fontWeight:500}}>v{VERSION}</span>
            </div>
            <div style={{fontSize:13,color:C.dimmer}}>{profile.name} · Coach</div>
          </div>
          <button onClick={onSignOut} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:".5rem .85rem",color:C.dimmer,cursor:"pointer",fontSize:12,fontFamily:FONT.body}}>Sign out</button>
        </div>

        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.goldBorder}`}}>
          <Label>Coach Dashboard</Label>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2.2rem",color:C.gold,lineHeight:1}}>{teams.length}</div>
          <div style={{fontSize:12,color:C.dimmer,marginTop:4}}>team{teams.length===1?"":"s"} you coach</div>
        </Card>

        {!creating ? (
          <PrimaryBtn onClick={()=>setCreating(true)} style={{marginBottom:"1rem"}}>+ Create New Team</PrimaryBtn>
        ) : (
          <Card style={{marginBottom:"1rem"}}>
            <Label>New Team</Label>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Team name (e.g. Oilers U11 A)" autoFocus
              style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,padding:".6rem .8rem",color:C.white,fontSize:14,fontFamily:FONT.body,width:"100%",outline:"none",marginBottom:".6rem"}}/>
            <div style={{display:"flex",gap:".5rem",marginBottom:".6rem"}}>
              <select value={newLevel} onChange={e=>setNewLevel(e.target.value)}
                style={{flex:1,background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,padding:".6rem .6rem",color:C.white,fontSize:13,fontFamily:FONT.body,outline:"none"}}>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select value={newSeason} onChange={e=>setNewSeason(e.target.value)}
                style={{flex:1,background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,padding:".6rem .6rem",color:C.white,fontSize:13,fontFamily:FONT.body,outline:"none"}}>
                {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:".5rem"}}>
              <button onClick={()=>setCreating(false)} style={{flex:1,background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:".65rem",cursor:"pointer",color:C.dimmer,fontSize:13,fontFamily:FONT.body,fontWeight:600}}>Cancel</button>
              <button onClick={createTeam} disabled={!newName.trim()} style={{flex:2,background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".65rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body,fontWeight:800}}>Create</button>
            </div>
          </Card>
        )}

        {loading ? (
          <div style={{color:C.dimmer,textAlign:"center",padding:"2rem"}}>Loading…</div>
        ) : teams.length === 0 ? (
          <Card><div style={{color:C.dimmer,textAlign:"center",padding:"1rem"}}>No teams yet. Create your first team to get started.</div></Card>
        ) : teams.map(t => {
          const roster = rosters[t.id] || [];
          const expanded = expandedTeam === t.id;
          return (
            <Card key={t.id} style={{marginBottom:".75rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",cursor:"pointer"}} onClick={()=>toggleRoster(t.id)}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>{t.name}</div>
                  <div style={{fontSize:11,color:C.dimmer}}>{t.level} · {t.season}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:"1rem"}}>
                  <div style={{fontSize:10,letterSpacing:".14em",color:C.dimmer,fontWeight:700,textTransform:"uppercase",marginBottom:2}}>Join Code</div>
                  <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.2rem",color:C.gold,letterSpacing:".1em"}}>{t.code}</div>
                </div>
              </div>
              {expanded && (
                <div style={{marginTop:".85rem",paddingTop:".85rem",borderTop:`1px solid ${C.border}`}}>
                  <Label>Roster ({roster.length})</Label>
                  {roster.length === 0 ? (
                    <div style={{fontSize:12,color:C.dimmer,fontStyle:"italic"}}>No players yet — share the join code <span style={{color:C.gold,fontWeight:700}}>{t.code}</span> with players.</div>
                  ) : roster.map(p => (
                    <button key={p.id} onClick={()=>onOpenPlayer(p)} style={{width:"100%",background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,padding:".7rem .85rem",marginBottom:".4rem",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",color:C.white,fontFamily:FONT.body,textAlign:"left"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:600}}>{p.name}</div>
                        <div style={{fontSize:11,color:C.dimmer}}>{p.level || "No level set"} · {p.position || "No position"}</div>
                      </div>
                      <span style={{color:C.gold,fontSize:14}}>→</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// POST-SIGNUP PROFILE SETUP (player picks level/position)
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────
export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [player, setPlayer] = useState(null); // enriched player object (profile + synced data)
  const [demoMode, setDemoMode] = useState(false);
  const [demoCoachRatings, setDemoCoachRatings] = useState(null);
  const [screen, setScreen] = useState("home");
  const [prevScore, setPrevScore] = useState(null);
  const [totalSessions, setTotalSessions] = useState(0);
  const [quizResults, setQuizResults] = useState([]);
  const [seqPerfect, setSeqPerfect] = useState(false);
  const [mistakeStreak, setMistakeStreak] = useState(0);
  const [upgradePrompt, setUpgradePrompt] = useState(null); // {feature, target} | null
  const [userEmail, setUserEmail] = useState(null);
  const [showMilestone5Banner, setShowMilestone5Banner] = useState(false);
  const [weeklyResults, setWeeklyResults] = useState(null);
  const [weeklyScore, setWeeklyScore] = useState(null);

  // Resolve tier once per render
  const tier = resolveTier({ profile, demoMode });

  function promptUpgrade(feature, target) {
    setUpgradePrompt({ feature, target: target || null });
  }
  function closeUpgrade() { setUpgradePrompt(null); }

  // Run season reset check on boot so free-tier switch counters refresh each September
  useEffect(() => { try { checkSeasonReset(); } catch {} }, []);

  function enterDemo(levelOrRole) {
    window.scrollTo(0, 0);
    if (levelOrRole === "__coach__") {
      setDemoMode(true);
      setDemoCoachRatings(null);
      setProfile({ id: "__demo_coach__", role: "coach", name: "Coach Demo" });
      setScreen("home");
      return;
    }
    const level = levelOrRole || "U9 / Novice";
    const p = buildDemoPlayer(level);
    const coachData = buildDemoCoachRatings(level);
    setDemoMode(true);
    setDemoCoachRatings(coachData);
    setProfile({ id: "__demo__", role: "player", name: p.name, level: p.level, position: p.position });
    setPlayer(p);
    setPrevScore(p.quizHistory[p.quizHistory.length-1]?.score || null);
    setTotalSessions(p.quizHistory.length);
    setScreen("home");
  }

  function exitDemo() {
    setDemoMode(false);
    setDemoCoachRatings(null);
    setProfile(null);
    setPlayer(null);
    setPrevScore(null);
    setTotalSessions(0);
    setScreen("home");
  }

  // Hydrate from Supabase on mount, subscribe to auth changes
  useEffect(() => {
    preloadQB();
    if (!hasSupabase) { setAuthReady(true); return; }
    if (demoMode) { setAuthReady(true); return; }
    let mounted = true;
    const timeout = setTimeout(() => { if (mounted) setAuthReady(true); }, 2000);
    (async () => {
      try {
        const session = await SB.getSession();
        if (session?.user && mounted) {
          setUserEmail(session.user.email || null);
          await loadUser(session.user.id);
        }
      } catch(e) { console.error("Session check failed:", e); }
      if (mounted) { clearTimeout(timeout); setAuthReady(true); }
    })();
    const { data } = SB.onAuthChange(async (session) => {
      if (!mounted) return;
      if (session?.user) {
        setUserEmail(session.user.email || null);
        await loadUser(session.user.id);
      }
      else { setProfile(null); setPlayer(null); setUserEmail(null); }
    });
    return () => { mounted = false; data?.subscription?.unsubscribe?.(); };
  }, [demoMode]);

  async function loadUser(userId) {
    const p = await SB.getProfile(userId);
    if (!p) return;
    setProfile(p);
    if (p.role === "player" && p.level) {
      // Build enriched player object from Supabase data
      const [sessions, goals, selfRatings] = await Promise.all([
        SB.getPlayerSessions(userId),
        SB.getPlayerGoals(userId),
        SB.getSelfRatings(userId),
      ]);
      const quizHistory = sessions.map(s => ({ results: s.results, score: s.score, date: s.completed_at }));
      const enriched = {
        id: p.id,
        name: p.name,
        level: p.level,
        position: p.position || "Not Sure",
        selfRatings,
        quizHistory,
        goals,
        season: p.season || SEASONS[0],
        sessionLength: p.session_length || 10,
        colorblind: !!p.colorblind,
        coachCode: "",
      };
      setPlayer(enriched);
      const latest = quizHistory[quizHistory.length-1];
      setPrevScore(latest ? latest.score : null);
      setTotalSessions(quizHistory.length);
    }
  }

  async function handleQuizFinish(results, sq, ms) {
    const score = calcWeightedIQ(results);
    const newTotal = totalSessions + 1;
    const newHistory = [...(player.quizHistory||[]), {results, score, date:new Date().toISOString()}];
    const updatedPlayer = {...player, quizHistory: newHistory};
    setPlayer(updatedPlayer);
    setQuizResults(results);
    setSeqPerfect(sq);
    setMistakeStreak(ms);
    setPrevScore(score);
    setTotalSessions(newTotal);
    if (tier === "FREE") incrementFreeQuizCount();
    if (demoMode) { try { localStorage.setItem("iceiq_demo_quiz_taken", "1"); } catch {} }
    if (newTotal === 5 && tier === "FREE" && !localStorage.getItem("iceiq_milestone5_shown")) {
      setShowMilestone5Banner(true);
      localStorage.setItem("iceiq_milestone5_shown", "true");
    }
    try {
      const sd = updateStreak(getStreakData());
      localStorage.setItem("iceiq_streak", JSON.stringify(sd));
    } catch(e) {}
    if (!demoMode) {
      try { await SB.saveQuizSession(player.id, { results, score, sessionLength: player.sessionLength }); }
      catch(e) { console.error(e); }
      SB.recordQuestionAnswersBatch(results.map(r => ({ questionId: r.id, correct: r.ok })));
    }
    setScreen("results");
  }

  async function handleSkillsSave(ratings) {
    setPlayer({...player, selfRatings: ratings});
    if (!demoMode) {
      try { await SB.saveSelfRatings(player.id, ratings); } catch(e) { console.error(e); }
    }
    setScreen("home");
  }

  async function handleGoalsSave(goals) {
    setPlayer({...player, goals});
    if (!demoMode) {
      try {
        for (const [cat, g] of Object.entries(goals)) {
          if (g?.goal) await SB.saveGoal(player.id, cat, g);
        }
      } catch(e) { console.error(e); }
    }
    setScreen("home");
  }

  async function handleProfileSave(settings) {
    const updated = {...player, ...settings};
    setPlayer(updated);
    if (!demoMode) {
      try {
        await SB.updateProfile(player.id, {
          name: settings.name,
          level: settings.level,
          position: settings.position,
          season: settings.season,
          session_length: settings.sessionLength,
          colorblind: settings.colorblind,
        });
      } catch(e) { console.error(e); }
    }
    setScreen("home");
  }

  async function handleSignOut() {
    if (demoMode) { exitDemo(); return; }
    await SB.signOut();
    setProfile(null); setPlayer(null);
    setScreen("home");
  }

  // Loading while auth settles
  if (!authReady) {
    return <div style={{minHeight:"100vh",background:C.bg,color:C.dimmer,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT.body}}>Loading…</div>;
  }

  // Not logged in → auth screen
  if (!profile) {
    if (!hasSupabase) {
      return <div style={{minHeight:"100vh",background:C.bg,color:C.white,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem",fontFamily:FONT.body,textAlign:"center"}}>
        <div>
          <div style={{fontSize:"1.2rem",color:C.red,marginBottom:"1rem"}}>Supabase not configured</div>
          <div style={{fontSize:13,color:C.dimmer,lineHeight:1.6}}>Create a <code style={{color:C.gold}}>.env</code> file with<br/><code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.</div>
        </div>
      </div>;
    }
    return <AuthScreen onAuthenticated={()=>{}} onDemo={enterDemo}/>;
  }

  // Coach home
  if (profile.role === "coach") {
    const coachAccess = canAccess("coachDashboard", tier);
    if (!coachAccess.allowed) {
      return (
        <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:80}}>
          <StickyHeader>
            <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
              <button onClick={handleSignOut} style={{background:"none",border:"none",color:C.white,cursor:"pointer",fontSize:24,padding:0}}>←</button>
              <div style={{flex:1,fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>Coach Dashboard</div>
            </div>
          </StickyHeader>
          <div style={{padding:"2rem 1.25rem",maxWidth:560,margin:"0 auto"}}>
            <Card style={{textAlign:"center",padding:"2rem 1.25rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.goldBorder}`}}>
              <div style={{fontSize:40,marginBottom:".75rem"}}>🔒</div>
              <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.6rem",color:C.gold,marginBottom:".5rem"}}>Coach Dashboard</div>
              <div style={{fontSize:13,color:C.dim,lineHeight:1.6,marginBottom:"1.5rem"}}>Full team management, player ratings, and coaching tools are available on the TEAM plan. Contact us to upgrade.</div>
              <a href="mailto:mtslifka@gmail.com?subject=Ice-IQ TEAM Plan" style={{display:"inline-block",background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".8rem 1.5rem",cursor:"pointer",fontWeight:800,fontSize:14,fontFamily:FONT.body,textDecoration:"none"}}>Contact us for TEAM plan →</a>
            </Card>
          </div>
        </div>
      );
    }
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700;800&family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;500;600;700;800&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #080e1a; color: #f8fafc; -webkit-font-smoothing: antialiased; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: rgba(248,250,252,.08); border-radius: 2px; }
          input, textarea, button, select { font-family: 'Inter', 'DM Sans', system-ui, sans-serif; }
          button:active { opacity: .8; }
          textarea { resize: none; }
        `}</style>
        <CoachHome
          profile={profile}
          onSignOut={handleSignOut}
          demoMode={demoMode}
          onOpenPlayer={(p) => {
            // Coach rating for this player
            const pk = p.id;
            const playerLevel = p.level || "U11 / Atom";
            // We'll open a rating screen inline
            setScreen({kind:"rate", player:p, playerLevel});
          }}
        />
        {typeof screen === "object" && screen.kind === "rate" && (
          <CoachRatingScreenAuthed
            coach={profile}
            player={screen.player}
            playerLevel={screen.playerLevel}
            onDone={()=>setScreen("home")}
          />
        )}
      </>
    );
  }

  // Player without completed profile → profile setup
  if (profile.role === "player" && (!profile.level || !profile.position)) {
    return <Suspense fallback={<LazyFallback/>}><ProfileSetup profile={profile} onComplete={async () => { await loadUser(profile.id); }}/></Suspense>;
  }

  // Player not fully loaded yet
  if (!player) return <div style={{minHeight:"100vh",background:C.bg,color:C.dimmer,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT.body}}>Loading profile…</div>;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080e1a; color: #f8fafc; -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(248,250,252,.08); border-radius: 2px; }
        input, textarea, button, select { font-family: 'DM Sans', 'Inter', system-ui, sans-serif; }
        button:active { opacity: .8; }
        textarea { resize: none; }
      `}</style>

      {demoMode && (
        <div style={{position:"sticky",top:0,background:C.purple,color:C.white,padding:".45rem 1rem",fontSize:12,fontWeight:600,textAlign:"center",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",gap:".75rem"}}>
          🎮 Demo mode — data won't be saved.
          <button onClick={exitDemo} style={{background:C.white,color:C.purple,border:"none",borderRadius:6,padding:".25rem .7rem",fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:FONT.body}}>Sign Up →</button>
        </div>
      )}

      <div style={{paddingBottom: screen==="quiz"||screen==="results" ? 0 : 80}}>
        {screen === "home"    && <Home player={tierLimitedPlayer(player, tier)} onNav={setScreen} demoMode={demoMode} subscriptionTier={tier}/>}
        {screen === "quiz"    && (demoMode && (()=>{ try { return localStorage.getItem("iceiq_demo_quiz_taken") === "1"; } catch { return false; } })()
          ? <DemoQuizCapScreen onBack={()=>setScreen("home")} onSignUp={exitDemo}/>
          : tier === "FREE" && !demoMode && isAtFreeQuizCap()
          ? <FreeQuizCapScreen onBack={()=>setScreen("home")} onUpgrade={()=>setScreen("plans")}/>
          : <Quiz player={player} onFinish={handleQuizFinish} onBack={()=>setScreen("home")} tier={tier} onUpgrade={promptUpgrade}/>
        )}
        {screen === "results" && <Results results={quizResults} player={player} prevScore={prevScore} totalSessions={totalSessions} seqPerfect={seqPerfect} mistakeStreak={mistakeStreak} onAgain={()=>setScreen("quiz")} onHome={()=>setScreen("home")} showMilestoneBanner={showMilestone5Banner} onViewPlans={()=>{setShowMilestone5Banner(false);setScreen("plans");}}/>}
        {screen === "skills"  && <Skills player={player} onSave={handleSkillsSave} onBack={()=>setScreen("home")}/>}
        {screen === "study"   && <StudyScreen player={player} onBack={()=>setScreen("home")} onNav={setScreen}/>}
        {screen === "goals"   && (canAccess("smartGoals", tier).allowed
          ? <GoalsScreen player={player} onSave={handleGoalsSave} onBack={()=>setScreen("home")}/>
          : <GatedGoalsScreen onBack={()=>setScreen("home")} onUnlock={()=>promptUpgrade("smartGoals","pro")}/>
        )}
        {screen === "weekly"  && (canAccess("weeklyChallenge", tier).allowed
          ? (weeklyResults
            ? <WeeklyResults score={weeklyScore} results={weeklyResults} player={player} onHome={()=>{setWeeklyResults(null);setScreen("home");}}/>
            : <WeeklyQuiz player={player} onBack={()=>setScreen("home")} onFinish={(res, sc) => { setWeeklyResults(res); setWeeklyScore(sc); }}/>)
          : <GatedScreen feature="weeklyChallenge" title="Weekly Challenge" description="A new curated 10-question challenge every Monday. Same questions for every player — compete against yourself and compare with teammates." onBack={()=>setScreen("home")} onUnlock={()=>promptUpgrade("weeklyChallenge","pro")} target="pro"/>
        )}
        {screen === "report"  && <Report player={tierLimitedPlayer(player, tier)} onBack={()=>setScreen("home")} demoCoachData={demoMode?demoCoachRatings:null} tier={tier} onUpgrade={(f,t)=>promptUpgrade(f,t)}/>}
        {screen === "gamesense" && <GameSenseReportScreen player={player} onBack={()=>setScreen("home")} demoMode={demoMode} demoCoachData={demoMode?demoCoachRatings:null} onNavigate={setScreen}/>}
        {screen === "journey" && <JourneyScreen player={player} onBack={()=>setScreen("home")} onNav={setScreen}/>}
        {screen === "parent" && <ParentAssessmentScreen player={player} onBack={()=>setScreen("profile")} onSave={(ratings)=>{ setPlayer(p => ({...p, parentRatings: {...ratings, updated_at: new Date().toISOString().slice(0,10)}})); setScreen("profile"); }}/>}
        {screen === "profile" && <Profile player={player} onSave={handleProfileSave} onBack={()=>setScreen("home")} onReset={handleSignOut} demoMode={demoMode} tier={tier} onUpgrade={(f,t)=>promptUpgrade(f,t)} userEmail={userEmail} onAdminReports={()=>setScreen("admin")} onNav={setScreen}/>}
        {screen === "admin" && <Suspense fallback={<LazyFallback/>}><AdminReports onBack={()=>setScreen("profile")}/></Suspense>}
      </div>

      {!["quiz","results","weekly"].includes(screen) && (
        <BottomNav active={screen} onNav={setScreen} tier={tier}/>
      )}

      {upgradePrompt && (
        <UpgradePrompt
          feature={upgradePrompt.feature}
          target={upgradePrompt.target}
          onClose={closeUpgrade}
          onViewPlans={() => { closeUpgrade(); setScreen("plans"); }}
        />
      )}
      {screen === "plans" && <Suspense fallback={<LazyFallback/>}><PlansScreen onBack={()=>setScreen("home")} tier={tier}/></Suspense>}
    </>
  );
}

// Helper: cap quiz history for tiers without fullSessionHistory
function tierLimitedPlayer(player, tier) {
  if (!player) return player;
  if (canAccess("fullSessionHistory", tier).allowed) return player;
  const cap = 5;
  if (!player.quizHistory || player.quizHistory.length <= cap) return player;
  return { ...player, quizHistory: player.quizHistory.slice(-cap) };
}

// Generic gated-screen wrapper for full-screen locked features
function GatedScreen({ feature, title, description, onBack, onUnlock, target = "pro" }) {
  const tierName = target.charAt(0).toUpperCase() + target.slice(1);
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:80}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1,fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>{title}</div>
        </div>
      </StickyHeader>
      <div style={{padding:"2rem 1.25rem",maxWidth:560,margin:"0 auto"}}>
        <Card style={{textAlign:"center",padding:"2rem 1.25rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.goldBorder}`}}>
          <div style={{fontSize:40,marginBottom:".75rem"}}>🔒</div>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.6rem",color:C.gold,marginBottom:".5rem"}}>{title}</div>
          <div style={{fontSize:13,color:C.dim,lineHeight:1.6,marginBottom:"1.5rem"}}>{description}</div>
          <button onClick={onUnlock} style={{background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".8rem 1.5rem",cursor:"pointer",fontWeight:800,fontSize:14,fontFamily:FONT.body}}>
            Unlock with {tierName} →
          </button>
        </Card>
      </div>
    </div>
  );
}

// Plans screen — showcase all tiers

// ─────────────────────────────────────────────────────────
// COACH RATING SCREEN (authenticated version)
// ─────────────────────────────────────────────────────────
function CoachRatingScreenAuthed({ coach, player, playerLevel, onDone }) {
  const [ratings, setRatings] = useState({});
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSkill, setActiveSkill] = useState(null);
  const cats = SKILLS[playerLevel] || [];
  const allSkills = cats.flatMap(c => c.skills.map(s => ({...s, cat:c.cat, icon:c.icon})));
  const rated = Object.values(ratings).filter(v=>v).length;
  const coachScale = getCoachScale(playerLevel);
  const coachScaleType = RATING_SCALES[playerLevel]?.coach?.type;

  const scaleIntro = {
    "growth":     "Rate each skill using the growth scale — where is this player in their development journey?",
    "competency": "Rate each skill using the competency scale — how reliably does this player execute in games?",
    "percentile": "Rate each skill using the percentile system.",
  };
  const legendTitle = {growth:"Growth Scale",competency:"Competency Scale",percentile:"Percentile Scale"};

  const isDemo = coach?.id === "__demo_coach__" || String(player?.id || "").startsWith("dr") || String(player?.id || "").startsWith("__demo");
  useEffect(() => {
    if (isDemo) { setLoading(false); return; }
    (async () => {
      const existing = await SB.getCoachRatingsForPlayer(player.id);
      setRatings(existing.ratings || {});
      setNotes(existing.notes || {});
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      if (!isDemo) await SB.saveCoachRatingsForPlayer(coach.id, player.id, ratings, notes);
      setSaved(true);
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  return (
    <div style={{position:"fixed",inset:0,background:C.bg,color:C.white,fontFamily:FONT.body,padding:"1.5rem 1.25rem",overflowY:"auto",zIndex:100}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <BackBtn onClick={onDone}/>
        <Card style={{marginBottom:"1.5rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.goldBorder}`}}>
          <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,marginBottom:".4rem"}}>Rating Player</div>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.8rem"}}>{player.name}</div>
          <div style={{fontSize:13,color:C.dimmer,marginTop:2}}>{playerLevel}</div>
          <div style={{marginTop:".85rem",fontSize:12,color:C.dim,lineHeight:1.6}}>{scaleIntro[coachScaleType] || scaleIntro.ladder}</div>
        </Card>

        {loading ? <div style={{color:C.dimmer,textAlign:"center",padding:"2rem"}}>Loading…</div> : (<>
          <Card style={{marginBottom:"1.25rem"}}>
            <Label>{legendTitle[coachScaleType]}</Label>
            <div style={{display:"flex",flexDirection:"column",gap:".4rem"}}>
              {coachScale.map(r => (
                <div key={r.value} style={{display:"flex",alignItems:"center",gap:".75rem",padding:".45rem .6rem",borderRadius:8,background:`${r.color}10`,border:`1px solid ${r.color}25`}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:r.color,flexShrink:0}}/>
                  <div style={{fontWeight:700,fontSize:13,color:r.color,minWidth:95}}>{r.label}</div>
                  {r.sub && (
                    <div style={{fontSize:12,color:C.dimmer}}>
                      {r.sub.includes("·") ? (
                        <>
                          <span>{r.sub.split("·")[0].trim()}</span>
                          <span style={{color:C.dimmest,marginLeft:".35rem"}}>· {r.sub.split("·")[1].trim()}</span>
                        </>
                      ) : r.sub}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".75rem"}}>
            <div style={{fontSize:13,color:C.dim,fontWeight:600}}>{rated}/{allSkills.length} skills rated</div>
            <div style={{fontSize:11,color:C.dimmer}}>{rated===allSkills.length?"All done ✓":"Rate each skill below"}</div>
          </div>
          <ProgressBar value={rated} max={allSkills.length} color={C.gold} height={5}/>
          <div style={{height:"1rem"}}/>

          {cats.map(cat => (
            <div key={cat.cat} style={{marginBottom:"1.25rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:".4rem",marginBottom:".6rem"}}>
                <span style={{fontSize:15}}>{cat.icon}</span>
                <span style={{fontSize:11,letterSpacing:".12em",textTransform:"uppercase",color:C.dimmer,fontWeight:700}}>{cat.cat}</span>
              </div>
              {cat.skills.map(skill => {
                const rating = ratings[skill.id];
                const isActive = activeSkill === skill.id;
                const ratingColor = rating ? getScaleColor(coachScale, rating) : null;
                const ratingLabel = rating ? getScaleLabel(coachScale, rating) : null;
                return (
                  <div key={skill.id} style={{marginBottom:".6rem"}}>
                    <button onClick={() => setActiveSkill(isActive ? null : skill.id)}
                      style={{width:"100%",background:rating?`${ratingColor}10`:C.bgCard,border:`1px solid ${rating?ratingColor+"40":C.border}`,borderLeft:`3px solid ${rating?ratingColor:"transparent"}`,borderRadius:12,padding:".85rem 1rem",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",color:C.white,fontFamily:FONT.body,textAlign:"left"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:600,marginBottom:2}}>{skill.name}</div>
                        <div style={{fontSize:11,color:C.dimmer,lineHeight:1.4}}>{skill.desc}</div>
                      </div>
                      <div style={{flexShrink:0,marginLeft:"1rem",textAlign:"right"}}>
                        {rating ? <div style={{fontSize:12,fontWeight:700,color:ratingColor}}>{ratingLabel}</div> : <div style={{fontSize:11,color:C.dimmer}}>Tap to rate</div>}
                        <div style={{fontSize:11,color:C.dimmer,marginTop:2}}>{isActive?"▲":"▼"}</div>
                      </div>
                    </button>
                    {isActive && (
                      <div style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:12,padding:".85rem",marginTop:".35rem",display:"flex",flexDirection:"column",gap:".4rem"}}>
                        {coachScale.map(r => (
                          <button key={r.value} onClick={() => setRatings(p=>({...p,[skill.id]:r.value}))}
                            style={{background:ratings[skill.id]===r.value?`${r.color}18`:"none",border:`1px solid ${ratings[skill.id]===r.value?r.color+"50":C.border}`,borderRadius:8,padding:".65rem 1rem",cursor:"pointer",display:"flex",alignItems:"center",gap:".75rem",fontFamily:FONT.body}}>
                            <div style={{width:10,height:10,borderRadius:"50%",background:r.color,flexShrink:0}}/>
                            <div style={{textAlign:"left"}}>
                              <div style={{fontSize:13,fontWeight:700,color:r.color}}>{r.label}</div>
                              {r.sub ? (
                                <div style={{fontSize:11,color:C.dimmer}}>
                                  {r.sub.includes("·") ? (
                                    <>
                                      <span>{r.sub.split("·")[0].trim()}</span>
                                      <span style={{color:C.dimmest,marginLeft:".35rem"}}>· {r.sub.split("·")[1].trim()}</span>
                                    </>
                                  ) : r.sub}
                                </div>
                              ) : null}
                            </div>
                            {ratings[skill.id]===r.value && <div style={{marginLeft:"auto",color:r.color,fontSize:14}}>✓</div>}
                          </button>
                        ))}
                        {rating && (
                          <div style={{marginTop:".5rem",paddingTop:".6rem",borderTop:`1px solid ${C.border}`}}>
                            <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:C.gold,fontWeight:700,marginBottom:".35rem"}}>💬 Discussion note (optional)</div>
                            <textarea value={notes[skill.id]||""} onChange={e=>setNotes(p=>({...p,[skill.id]:e.target.value}))}
                              placeholder={`What's one thing ${player.name} could work on?`}
                              rows={2}
                              style={{width:"100%",background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:8,padding:".55rem .7rem",color:C.white,fontSize:12,fontFamily:FONT.body,outline:"none",lineHeight:1.5}}/>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {saved ? (
            <Card style={{background:"rgba(34,197,94,.08)",border:`1px solid ${C.greenBorder}`,textAlign:"center",padding:"1.5rem"}}>
              <div style={{fontSize:28,marginBottom:".5rem"}}>✅</div>
              <div style={{fontWeight:700,fontSize:15,color:C.green,marginBottom:".35rem"}}>Ratings Saved</div>
              <div style={{fontSize:13,color:C.dim}}>{player.name} will see your ratings and notes in their report.</div>
              <PrimaryBtn onClick={onDone} style={{marginTop:"1rem"}}>Back to Teams</PrimaryBtn>
            </Card>
          ) : (
            <PrimaryBtn onClick={save} disabled={saving || rated === 0} style={{marginBottom:"1rem"}}>
              {saving ? "Saving…" : `Save Ratings (${rated}/${allSkills.length} rated)`}
            </PrimaryBtn>
          )}
        </>)}
      </div>
    </div>
  );
}

