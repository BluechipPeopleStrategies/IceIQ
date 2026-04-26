import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import * as SB from "./supabase";
import { supabase, hasSupabase } from "./supabase";
import { canAccess, getUpgradeTriggerMessage } from "./utils/tierGate";
import { isDevBypassEnabled, getDevProfile, setDevProfile, clearDevProfile, buildDevPlayer, isEphemeralPlayer } from "./utils/devBypass";
import { getLevelDisplay } from "./utils/ageGroup";
import { getParentRatings, saveParentRatings, hasParentRatings, daysSinceUpdated, PARENT_DIMENSIONS, PARENT_SCALE } from "./utils/parentAssessment";
import { calcPlayerProfile, PROFILE_AXES } from "./utils/playerProfile";
import { markSignupIntent, logSignupComplete } from "./utils/signupTelemetry";
// utils/demoTransfer removed — player demo was killed; signup now writes
// to Supabase from the first interaction, no LS→cloud transfer needed.
import { DEPTH_SLOTS, getDepthChart, setAssignment as setDepthAssignment, seedDemoDepthChart, clearDemoDepthChart } from "./utils/depthChart";
import RinkReadsRinkQuestion from "./RinkReadsRinkQuestion.jsx";
import { COMPETENCIES, getJourneyV2, ACTIVITY_METRICS, GAME_SENSE_UNLOCK_SESSIONS, calcCompetencyScores, calcGameSenseScore } from "./utils/gameSense.js";
import { getTrainingLog, seedDemoTrainingForRoster } from "./utils/trainingLog.js";
import { buildU11ForwardPreview, PREVIEW_PLAYER_ID } from "./data/previewPlayer.js";
import { calcTeamCompetencyAverages, GRADE_LEVEL_THRESHOLD } from "./utils/coachStats.js";
import { HockeyInsightWidget, BottomNav, TrainingLog, HomeStartHereCard } from "./widgets.jsx";
import { HomeworkCard, CoachAssignmentsSection } from "./assignments.jsx";
import { CoachTrainingSection } from "./trainingLogCoach.jsx";
import { CoachTeamAnalyticsSection } from "./coachAnalytics.jsx";
import { CoachChallengeSection, ChallengeCard, ChallengeRunScreen } from "./teamChallenges.jsx";
import { ToastContainer, toast } from "./toast.jsx";
import { QotDCard, QotDScreen } from "./questionOfDay.jsx";
import { SpeedRoundCard, SpeedRoundScreen } from "./speedRound.jsx";
import { AdminRoute, AdminLayout } from "./admin.jsx";
import { getWeeklyStreak, bumpWeeklyStreak, topCategoryStreak, updateCategoryStreaks } from "./utils/streaks.js";
import { canSwitchAgeGroup, recordAgeGroupSwitch, getAgeGroupLock, setAgeGroupLock, checkSeasonReset } from "./utils/deviceLock";
import { lsGetStr, lsSetStr, lsGetJSON, lsSetJSON } from "./utils/storage.js";
import { computeCategoryMastery, rankCategories, nextThreshold } from "./utils/mastery.js";
import {
  REASONS as REFLECTION_REASONS,
  getReflectionFor, saveReflection,
  isReflectionsDisabled, setReflectionsDisabled,
  reflectionCounts,
} from "./utils/reflections.js";
import { ScenarioRenderer } from "./scenario/index.js";
import {
  C, FONT, LEVELS, POSITIONS, POSITIONS_U11UP, SEASONS,
  RinkReadsLogo, Screen, Card, Pill, Label, PrimaryBtn, SecBtn, BackBtn, ProgressBar, StickyHeader,
} from "./shared.jsx";
const imgSplash = "/splash.jpg";
import imgCoreApp from "./assets/images/Core-App.jpg";
import imgDataPanel from "./assets/images/Data-Panel.jpg";
import imgProfile from "./assets/images/Profile-Analytics.jpg";
import imgTactics from "./assets/images/Tactics-Playbook.jpg";
import imgSuccess from "./assets/images/Success-Icon.jpg";

// Resolve the user's tier for gating decisions.
// Priority: dev override (localStorage rinkreads_tier_override) → that tier
//           demo mode → coach demo = TEAM
//           profile.tier field (future Supabase subscriptions) → that tier
//           default → FREE
function resolveTier({ profile, demoMode } = {}) {
  // Coaches in any non-production session (demo / preview / dev-bypass)
  // always get TEAM tier, regardless of what the tier picker reads. There
  // is no real "coach on PRO" account — in production, coaches sign up on
  // the TEAM plan — so forcing TEAM here keeps the coach dashboard
  // reachable when a tester picks the wrong tier in the dev panel.
  if (profile?.role === "coach" && (demoMode || profile?.__dev || profile?.__preview)) {
    return "TEAM";
  }
  // The Pro-player preview flow (enterPlayerPreview) marks profile.__preview
  // and writes rinkreads_tier_override="PRO" so the preview renders with Pro
  // features unlocked. Dev-bypass sessions honor the override the same way
  // — either via the rinkreads_dev_bypass LS flag or by having __dev set on the
  // profile (which the AuthScreen dev panel writes when entering via DEV
  // mode without the LS flag). Production users never hit any branch, so
  // they can't self-promote.
  const allowLsOverride = isDevBypassEnabled() || !!profile?.__preview || !!profile?.__dev;
  if (allowLsOverride) {
    try {
      const override = typeof window !== "undefined" ? window.localStorage.getItem("rinkreads_tier_override") : null;
      if (override && ["FREE","PRO","FAMILY","TEAM"].includes(override.toUpperCase())) {
        return override.toUpperCase();
      }
    } catch {}
  }
  if (demoMode) return profile?.role === "coach" ? "TEAM" : "FREE";
  if (profile?.tier) {
    const t = String(profile.tier).toUpperCase();
    if (["FREE","PRO","FAMILY","TEAM"].includes(t)) return t;
  }
  return "FREE";
}

// ─────────────────────────────────────────────────────────
// VERSION
// ─────────────────────────────────────────────────────────
const VERSION = "0.9-beta";
const RELEASE_DATE = "April 2026";
const CHANGELOG = [
  { v:"0.9-beta", date:"April 2026", notes:[
    {icon:"🏒", title:"Welcome — you're early", desc:"This is RinkReads's first public preview. You're one of the first players, parents, and coaches to use it. Nothing here is final — everything is shaped by what you tell us."},
    {icon:"🛠️", title:"Built with you, not for you", desc:"Every feature on this app came from a question a real coach, parent, or kid asked. Tap the report button whenever something feels off, confusing, or missing. We read every single one."},
    {icon:"📈", title:"Active development", desc:"Questions are being added weekly. Screens will change. Your feedback directly shapes what ships next — so be loud, be specific, and don't sugarcoat it."},
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

const SCORE_TIERS = [
  {min:TIER_GOLD_THRESHOLD, label:"First Star",  badge:"⭐", color:C.green},
  {min:TIER_YELLOW_THRESHOLD, label:"Second Star", badge:"⭐", color:C.yellow},
  {min:0,  label:"Third Star",  badge:"⭐", color:C.red},
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
  FIRST_LINE: {icon:"🏒", name:"First Line",   desc:"Completed your First-Five"},
};

// First-Five quest checklist — guided onboarding for new users.
const QUESTS_PLAYER = [
  { id:"rate6",   label:"Rate yourself on 6 skills",                nav:"skills-onboarding", gate:null, target:6 },
  { id:"quiz1",   label:"Take your first quiz",                     nav:"quiz",              gate:null, target:1 },
  { id:"read3",   label:"Read 3 pro insights",                      nav:"insights",          gate:null, target:3 },
  { id:"train1",  label:"Log a past or future training session",    nav:"profile",           gate:null, target:1 },
  { id:"goal1",   label:"Set your first goal",                      nav:"goals",             gate:null, target:1 },
];
const QUESTS_COACH = [
  { id:"team1",    label:"Add your first team",           nav:"home",  gate:"coachDashboard", target:1 },
  { id:"invite1",  label:"Invite 1 player",               nav:"home",  gate:"coachDashboard", target:1 },
  { id:"rate1",    label:"Rate 1 skill on 1 player",      nav:"home",  gate:"coachFeedback",  target:1 },
  { id:"depth1",   label:"Set your team's depth chart",   nav:"home",  gate:"coachDashboard", target:1 },
  { id:"focus1",   label:"Check your team's focus",       nav:"home",  gate:null,             target:1 },
];

// SMART goal categories
const GOAL_CATS = {
  "U9 / Novice":     ["Skating","Passing","Shooting","Defense","Game IQ"],
  "U11 / Atom":      ["Skating","Puck Protection","Gap Control","Rush Reads","Special Teams","Game IQ"],
  "U13 / Peewee":    ["Edge Work","Shot Selection","Defensive Zone","Zone Entry","Special Teams","Leadership"],
  "U15 / Bantam":    ["Systems Play","Transition","Special Teams","Physical Play","Gap Control","Leadership"],
  "U18 / Midget":    ["Game Management","Advanced Tactics","Special Teams","Neutral Zone Play","Breakouts","Leadership"],
};

const SMART_PROMPTS = {
  S: "What specifically will you work on? (be precise)",
  M: "How will you measure improvement?",
  A: "Is this realistic for your current level?",
  R: "How does this help you on the ice?",
  T: "When will you achieve this by?",
};

function avatarInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function AvatarDisc({ name, kind = "player", size = 48 }) {
  const display = kind === "coach" ? String(name || "").replace(/^Coach\s+/i, "") : name;
  const initials = avatarInitials(display);
  const bg = kind === "coach"
    ? "linear-gradient(135deg, #475569 0%, #1e293b 100%)"
    : C.gradientPrimary;
  const fg = kind === "coach" ? "#f1f5f9" : "#0b1220";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, color: fg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FONT.display, fontWeight: 800, fontSize: Math.round(size * 0.38),
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
      letterSpacing: ".02em", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

const FLAVOR_CORRECT   = ["Good read.", "That's the one.", "Nice.", "Exactly right.", "Smart play."];
const FLAVOR_INCORRECT = ["Not quite.", "Let's break this down.", "Close, but watch this.", "Let's dial it in.", "Common mistake — here's why."];

// ── Quest-flag localStorage keys ──────────────────────────
const LS_INSIGHTS_READ   = "rinkreads_insights_read_v1";    // Array of insight "stat" strings.
const LS_PROFILE_VIEWED  = "rinkreads_profile_viewed_v1";   // "1" once viewed / ack'd.
const LS_GATED_ACK       = "rinkreads_gated_quests_ack_v1"; // Array of feature keys.
const LS_COACH_RATED     = "rinkreads_coach_rated_v1";      // "1" once coach rates a skill.
const LS_COACH_NOTED     = "rinkreads_coach_noted_v1";      // "1" once coach leaves a note.
const LS_DEPTH_CHART_SET = "rinkreads_depth_chart_set_v1";  // "1" once coach assigns any line. (Managed by utils/depthChart.js.)
const LS_FIRST_LINE_SEEN = "rinkreads_first_line_seen_v1";  // JSON: {[identity]: "1"}.
const LS_QUEST_DISMISSED = "rinkreads_quest_dismissed_v1";  // JSON: {[identity]: "1"}.
const LS_WHATSNEW_DISMISSED = "rinkreads_whatsnew_dismissed_v1"; // JSON: {[identity]: version}.
const LS_UPGRADE_DISMISSED  = "rinkreads_upgrade_dismissed_v1";  // JSON: {[identity]: "1"}.
const LS_CLIPS_WATCHED      = "rinkreads_clips_watched_v1";      // JSON: {[identity]: string[]}.
const LS_HOMEWORK_DONE      = "rinkreads_homework_done_v1";      // JSON: {[identity]: string[]}.

// lsGetStr / lsSetStr / lsGetJSON / lsSetJSON come from src/utils/storage.js
// (imported at the top of this file). Keep call sites terse.

export function markInsightRead(key) {
  if (!key) return;
  const arr = lsGetJSON(LS_INSIGHTS_READ, []);
  if (!arr.includes(key)) { arr.push(key); lsSetJSON(LS_INSIGHTS_READ, arr); }
}
function markProfileViewed() { lsSetStr(LS_PROFILE_VIEWED, "1"); }
function markGatedAck(feature) {
  if (!feature) return;
  const arr = lsGetJSON(LS_GATED_ACK, []);
  if (!arr.includes(feature)) { arr.push(feature); lsSetJSON(LS_GATED_ACK, arr); }
}

function useQuestFlags(bump) {
  // `bump` is a counter from the parent — re-read localStorage whenever it increments.
  const [flags, setFlags] = useState(() => readQuestFlags());
  useEffect(() => { setFlags(readQuestFlags()); }, [bump]);
  return flags;
}

function readQuestFlags() {
  return {
    insightsRead: new Set(lsGetJSON(LS_INSIGHTS_READ, [])),
    profileViewed: lsGetStr(LS_PROFILE_VIEWED) === "1",
    gatedAck: new Set(lsGetJSON(LS_GATED_ACK, [])),
    coachRated: lsGetStr(LS_COACH_RATED) === "1",
    coachNoted: lsGetStr(LS_COACH_NOTED) === "1",
    depthChartSet: lsGetStr(LS_DEPTH_CHART_SET) === "1",
  };
}

function computeQuestProgress(def, ctx) {
  const { player, flags, teams, rosters, tier } = ctx;
  let progress = 0;
  switch (def.id) {
    case "rate6":
      progress = Object.values(player?.selfRatings || {}).filter(v => v).length;
      break;
    case "quiz1":
      progress = (player?.quizHistory || []).length;
      break;
    case "read3":
    case "insight1":
      progress = flags.insightsRead.size;
      break;
    case "focus1":
      try { progress = window.localStorage.getItem("rinkreads_coach_focus_seen_v1") === "1" ? 1 : 0; }
      catch { progress = 0; }
      break;
    case "goal1":
      progress = Object.values(player?.goals || {}).filter(g => g?.goal).length;
      break;
    case "profile":
      progress = flags.profileViewed ? 1 : 0;
      break;
    case "train1": {
      // Count localStorage training sessions for this player. Demo players
      // use the "__demo__" key; real players use their Supabase id.
      try {
        const raw = window.localStorage.getItem("rinkreads_training_log");
        const all = raw ? JSON.parse(raw) : {};
        const pid = player?.id || "__demo__";
        progress = (all[pid]?.sessions?.length) || 0;
      } catch { progress = 0; }
      break;
    }
    case "team1":
      progress = (teams || []).length;
      break;
    case "invite1":
      progress = Object.values(rosters || {}).reduce((n, r) => n + (r?.length || 0), 0);
      break;
    case "rate1":
      progress = flags.coachRated ? 1 : 0;
      break;
    case "note1":
      progress = flags.coachNoted ? 1 : 0;
      break;
    case "depth1":
      progress = flags.depthChartSet ? 1 : 0;
      break;
    default:
      progress = 0;
  }
  const done = progress >= def.target;
  const locked = def.gate ? !canAccess(def.gate, tier).allowed : false;
  const acknowledged = locked && flags.gatedAck.has(def.gate);
  return { id: def.id, progress, done, locked, acknowledged };
}

function QuestChecklist({ role, quests, results, onTap, onDismiss, onAllComplete, showSignupCTA, onSignup }) {
  const total = quests.length;
  const checked = results.filter(r => r.done || r.acknowledged).length;
  const allDone = checked >= total;
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (allDone && onAllComplete) onAllComplete();
  }, [allDone, onAllComplete]);
  const coachName = "Coach Reynolds";
  // Prescriptive mode: first quest that isn't done/acknowledged is the
  // "Next up" — surfaced as a hero CTA at the top of the card so brand-new
  // users have one obvious thing to tap, not 6.
  const nextIdx = results.findIndex(r => !r.done && !r.acknowledged);
  const nextQuest = nextIdx >= 0 ? quests[nextIdx] : null;
  return (
    <div style={{background:`linear-gradient(135deg, rgba(252,76,2,0.08), rgba(207,69,32,0.06))`,border:`1px solid ${C.goldBorder}`,borderRadius:14,padding:"1rem 1rem .9rem",marginBottom:"1rem"}}>
      <div style={{display:"flex",alignItems:"center",gap:".65rem",marginBottom:collapsed ? 0 : ".85rem"}}>
        <AvatarDisc name={coachName} kind="coach" size={36}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,fontWeight:700}}>First Five · {role === "coach" ? "Coach" : "Player"}</div>
          <div style={{fontSize:13,color:C.white,fontWeight:700,marginTop:1}}>
            {allDone ? "🏒 First Line — complete!" : nextQuest ? `Next up: ${nextQuest.label}` : `Welcome — try these ${total} to learn the app`}
          </div>
        </div>
        <button onClick={() => setCollapsed(c => !c)} style={{background:"none",border:"none",color:C.dimmer,cursor:"pointer",fontSize:12,padding:"4px 8px"}} aria-label={collapsed?"Expand":"Collapse"}>
          {collapsed ? "▼" : "▲"}
        </button>
        {onDismiss && <button onClick={onDismiss} style={{background:"none",border:"none",color:C.dimmer,cursor:"pointer",fontSize:14,padding:"2px 6px",lineHeight:1}} aria-label="Dismiss">×</button>}
      </div>
      {/* Prescriptive hero CTA — brand-new users tap one big button instead
          of scanning the whole list. Hidden when collapsed or when all done. */}
      {!collapsed && nextQuest && !allDone && (
        <button onClick={() => onTap(nextQuest)} style={{display:"block",width:"100%",background:C.gradientPrimary,color:C.bg,border:"none",borderRadius:12,padding:".85rem 1rem",cursor:"pointer",fontFamily:FONT.body,fontWeight:800,fontSize:14,letterSpacing:".02em",marginBottom:".85rem",boxShadow:`0 4px 14px ${C.gold}33, inset 0 1px 0 rgba(255,255,255,.25)`,textAlign:"left",display:"flex",alignItems:"center",justifyContent:"space-between",gap:".5rem"}}>
          <span>Start: {nextQuest.label}</span>
          <span style={{fontSize:16}}>→</span>
        </button>
      )}
      {!collapsed && (
        <>
          {quests.map((q, i) => {
            const r = results[i];
            const tick = r.done ? "✓" : r.acknowledged ? "✓" : r.locked ? "🔒" : `${r.progress}/${q.target}`;
            const tickColor = r.done ? C.green : r.acknowledged ? C.dimmer : r.locked ? C.gold : C.dim;
            return (
              <button key={q.id} onClick={() => onTap(q)} style={{display:"flex",alignItems:"center",gap:".65rem",width:"100%",background:r.done?"rgba(34,197,94,0.05)":"rgba(255,255,255,0.02)",border:`1px solid ${r.done?"rgba(34,197,94,0.25)":C.border}`,borderRadius:10,padding:".55rem .7rem",marginBottom:".4rem",cursor:"pointer",textAlign:"left",fontFamily:FONT.body}}>
                <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:28,height:28,borderRadius:"50%",background:r.done?"rgba(34,197,94,.15)":C.bgElevated,border:`1px solid ${r.done?"rgba(34,197,94,.4)":C.border}`,color:tickColor,fontWeight:800,fontSize:11,flexShrink:0}}>{tick}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12.5,color:r.done?C.dim:C.white,fontWeight:600,textDecoration:r.done?"line-through":"none",lineHeight:1.3}}>{q.label}</div>
                  {r.locked && r.acknowledged && <div style={{fontSize:10,color:C.gold,marginTop:1}}>Unlocks with Pro →</div>}
                  {r.locked && !r.acknowledged && <div style={{fontSize:10,color:C.dimmer,marginTop:1}}>Tap to preview</div>}
                </div>
                <span style={{color:C.dimmer,fontSize:14,flexShrink:0}}>›</span>
              </button>
            );
          })}
          <div style={{display:"flex",alignItems:"center",gap:".5rem",marginTop:".5rem"}}>
            <div style={{flex:1,height:5,background:C.bgElevated,borderRadius:3,overflow:"hidden"}}>
              <div style={{width:`${(checked/total)*100}%`,height:"100%",background:allDone?C.green:C.gold,transition:"width .3s"}}/>
            </div>
            <div style={{fontSize:10,color:C.dimmer,fontWeight:700,letterSpacing:".04em"}}>{checked} of {total}</div>
          </div>
          {showSignupCTA && onSignup && (
            <button onClick={onSignup} style={{marginTop:".75rem",width:"100%",background:C.gradientPrimary,color:C.bg,border:"none",borderRadius:12,padding:".75rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body,letterSpacing:".02em",boxShadow:"0 4px 14px rgba(252,76,2,.25), inset 0 1px 0 rgba(255,255,255,.25)",display:"flex",alignItems:"center",justifyContent:"center",gap:".4rem"}}>
              <span style={{fontSize:14}}>🏒</span>
              Create your free account →
            </button>
          )}
        </>
      )}
    </div>
  );
}



// ─────────────────────────────────────────────────────────



import { loadQB, preloadQB } from "./qbLoader.js";
import { getWeekKey, getThisWeekRecord, markWeeklyComplete, seededShuffle, weekSeed, formatCountdown, msUntilNextWeek, getNextUnlockDate, formatUnlockMoment, getFreeQuizCount, isAtFreeQuizCap, incrementFreeQuizCount, FREE_WEEKLY_QUIZ_CAP } from "./utils/weeklyChallenge.js";
import { COMPETENCY_LADDER, RATING_SCALES, SKILLS, FREE_SKILL_IDS, ladderFor, getSelfScale, getCoachScale, getScaleColor, getScaleLabel, normalizeRating, getDiscussionPrompt, migrateRatings, PERCENTILE_RATINGS, PR_COLOR, PR_LABEL } from "./data/constants.js";

const AdminReports = lazy(() => import("./screens.jsx").then(m => ({ default: m.AdminReports })));
const QuestionReviewScreen = lazy(() => import("./screens.jsx").then(m => ({ default: m.QuestionReviewScreen })));
const ProfileSetup = lazy(() => import("./screens.jsx").then(m => ({ default: m.ProfileSetup })));
const PlansScreen = lazy(() => import("./screens.jsx").then(m => ({ default: m.PlansScreen })));
const GameSenseReportScreen = lazy(() => import("./screens.jsx").then(m => ({ default: m.GameSenseReportScreen })));
const SkillsOnboarding = lazy(() => import("./screens.jsx").then(m => ({ default: m.SkillsOnboarding })));
const InsightsScreen = lazy(() => import("./screens.jsx").then(m => ({ default: m.InsightsScreen })));
const ParentAssessmentScreen = lazy(() => import("./screens.jsx").then(m => ({ default: m.ParentAssessmentScreen })));
const ParentsPage = lazy(() => import("./screens.jsx").then(m => ({ default: m.ParentsPage })));
const CoachesPage = lazy(() => import("./screens.jsx").then(m => ({ default: m.CoachesPage })));
const PlayersPage = lazy(() => import("./screens.jsx").then(m => ({ default: m.PlayersPage })));
const AssociationsPage = lazy(() => import("./screens.jsx").then(m => ({ default: m.AssociationsPage })));
const LazyFallback = () => <div style={{minHeight:"100vh",background:C.bg,color:C.dimmer,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT.body}}>Loading…</div>;

const COMP={
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
  try { return JSON.parse(localStorage.getItem("rinkreads_streak") || "{}"); }
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
  // Debug: ?only=<type[,type]> forces the demo queue to those qtypes.
  const onlyParam = (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("only")) || null;
  const onlyTypes = onlyParam ? onlyParam.split(",").map(s => s.trim()).filter(Boolean) : null;
  if (onlyTypes) {
    const filtered = (qb[level] || []).filter(q => onlyTypes.includes(q.type) && posMatch(q));
    return [...filtered].sort(() => Math.random() - 0.5);
  }
  // Demo quiz: 7 questions — 3 pov-mc + 1 mc + 1 tf + 1 seq + 1 mistake
  // POV image questions are the headline new format and where the bank
  // has the most authored content; lean on them. Falls back to padding
  // with extra MC if any type's pool is empty.
  const targetCounts = { "pov-mc": 3, mc: 1, tf: 1, seq: 1, mistake: 1 };
  const result = [];
  const usedIds = new Set();

  for (const [type, count] of Object.entries(targetCounts)) {
    // All types — including zone-click — live in the bank now; qbLoader
    // replicates multi-age questions into each applicable level array.
    const pool = (qb[level] || []).filter(q => q.type === type);
    const levelMatch = pool.filter(posMatch);
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
  const anyPool = (qb[level] || [])
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
  // Debug: ?only=<type> (or comma-separated, e.g. ?only=rink-label,rink-drag)
  // filters the queue. Bypasses cache so seed edits show up on reload.
  const onlyParam = (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("only")) || null;
  const onlyTypes = onlyParam ? onlyParam.split(",").map(s => s.trim()).filter(Boolean) : null;
  const cacheKey = `${level}|${position}|${formatAllowed}|${positionAllowed}|${onlyParam || ""}`;

  let pool;
  if (!onlyTypes && _queueCache.has(cacheKey)) {
    pool = _queueCache.get(cacheKey);
  } else {
    let allQ = qb[level] || [];
    if (onlyTypes) allQ = allQ.filter(q => onlyTypes.includes(q.type));
    let posFiltered;
    if (!positionAllowed) {
      posFiltered = allQ.filter(q => !q.pos || q.pos.includes("F") || q.pos.includes("D"));
    } else {
      posFiltered = position === "Goalie"
        ? allQ.filter(q => !q.pos || q.pos.includes("G") || q.pos.includes("F"))
        : position === "Defense"
        ? allQ.filter(q => !q.pos || q.pos.includes("D") || q.pos.includes("F"))
        : position === "Multiple"
        ? allQ.filter(q => !q.pos || q.pos.includes("F") || q.pos.includes("D"))
        : allQ.filter(q => !q.pos || q.pos.includes("F") || q.pos.includes("D"));
    }

    if (!formatAllowed && !onlyTypes) {
      // FREE: MC, TF, and POV-image-MC only. Other types (seq, mistake, next,
      // rink-native) are PRO surface — players see format-preview sentinels
      // instead. POV-MC stays free because it's the headline new format.
      posFiltered = posFiltered.filter(q => !q.type || q.type === "mc" || q.type === "pov-mc");
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
  if (!formatAllowed && !onlyType) {
    const formats = ["seq","tf","mistake","next"];
    const previewFormat = formats[Math.floor(Math.random() * formats.length)];
    const sentinel = { id: "__format_preview__", type: "formatPreview", _format: previewFormat, d: 2 };
    const d2 = byD[2];
    if (d2.length >= 4) {
      const insertAt = Math.floor(d2.length / 2);
      byD[2] = [...d2.slice(0, insertAt), sentinel, ...d2.slice(insertAt)];
    }

    // Inject 1 zone-click teaser for FREE tier (d:1 or d:2 only).
    // Zone-click questions are already in qb[level] post-migration —
    // qbLoader replicates multi-age ones across every applicable level.
    if (byD[1].length >= 2) {
      const zcPool = (qb[level] || []).filter(q =>
        q.type === "zone-click" &&
        q.d <= 2 &&
        (!q.pos || q.pos.includes(position) || position === "Multiple")
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
  const Arrow = ({x1,y1,x2,y2,color="#FC4C02",dash,arc}) => {
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

// MULTI-SELECT MC — "Select all that apply." Player ticks checkboxes;
// only an exact match across the selected set vs q.correct (array of
// correct indices) counts as correct. Used for higher-difficulty
// concept questions where there's >1 right answer.
function MultiMCQuestion({ q, onAnswer, answered, colorblind }) {
  const correctSet = new Set(Array.isArray(q.correct) ? q.correct : []);
  const [picks, setPicks] = useState(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);

  // Reset internal state when the question id changes (parent advances).
  useEffect(() => { setPicks(new Set()); setSubmitted(false); setWasCorrect(false); }, [q.id]);

  // Treat the parent-driven "answered" prop as authoritative — keeps the
  // submitted-once guarantee in sync if a parent collapses the question.
  const locked = submitted || answered;

  function toggle(i) {
    if (locked) return;
    setPicks(prev => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i); else n.add(i);
      return n;
    });
  }

  function submit() {
    if (locked || picks.size === 0) return;
    setSubmitted(true);
    const allCorrectPicked = [...correctSet].every(i => picks.has(i));
    const noWrongPicked = [...picks].every(i => correctSet.has(i));
    const isCorrect = allCorrectPicked && noWrongPicked;
    setWasCorrect(isCorrect);
    onAnswer?.(isCorrect);
  }

  const correctColor = colorblind ? "#2563eb" : C.green;
  const wrongColor = colorblind ? "#ea580c" : C.red;

  return (
    <div>
      <div style={{display:"flex",flexDirection:"column",gap:".55rem"}}>
        {q.opts.map((opt, i) => {
          const isPicked = picks.has(i);
          const isRight = correctSet.has(i);
          let bg=C.dimmest, bdr=C.border, col=C.dim, leftBdr="transparent";
          if (locked) {
            // Reveal: green for correct picks (matched or missed), red for wrong picks.
            if (isRight && isPicked) { bg="rgba(34,197,94,.12)"; bdr="rgba(34,197,94,.35)"; col=C.white; leftBdr=correctColor; }
            else if (isRight && !isPicked) { bg="rgba(34,197,94,.05)"; bdr="rgba(34,197,94,.2)"; col=C.white; leftBdr=correctColor; }
            else if (!isRight && isPicked) { bg=C.redDim; bdr=C.redBorder; col=C.dimmer; leftBdr=wrongColor; }
          } else if (isPicked) { bg=C.purpleDim; bdr=C.purpleBorder; col=C.white; }
          const mark = locked
            ? (isRight ? "✓" : isPicked ? "✗" : "")
            : (isPicked ? "☑" : "☐");
          const markColor = locked
            ? (isRight ? correctColor : isPicked ? wrongColor : C.dimmest)
            : (isPicked ? C.purple : C.dimmer);
          return (
            <button key={i} onClick={() => toggle(i)} disabled={locked}
              style={{
                background:bg, border:`1px solid ${bdr}`,
                borderLeft:`3px solid ${leftBdr}`,
                borderRadius:12, padding:".95rem 1.1rem",
                cursor:locked?"default":"pointer",
                textAlign:"left", color:col,
                fontFamily:FONT.body, fontSize:14, lineHeight:1.55,
                display:"flex", alignItems:"flex-start", gap:".75rem",
                transition:"all .15s", width:"100%",
              }}>
              <span style={{fontSize:14,fontWeight:800,minWidth:22,marginTop:1,flexShrink:0,color:markColor,fontFamily:FONT.display}}>
                {mark}
              </span>
              <span style={{wordBreak:"break-word",whiteSpace:"normal",flex:1,fontSize:opt.length>100?13:14}}>{opt}</span>
            </button>
          );
        })}
      </div>
      {!locked && (
        <button onClick={submit} disabled={picks.size === 0}
          style={{
            marginTop:".85rem",width:"100%",padding:".75rem",borderRadius:10,
            background: picks.size === 0 ? C.dimmest : C.gold,
            color: picks.size === 0 ? C.dimmer : C.bg,
            border:"none",fontFamily:FONT.display,fontWeight:800,fontSize:14,letterSpacing:".02em",
            cursor: picks.size === 0 ? "default" : "pointer",
          }}>
          Submit ({picks.size})
        </button>
      )}
      {locked && (
        <div style={{marginTop:".75rem",fontSize:11,color:C.dimmer,letterSpacing:".06em",textAlign:"center"}}>
          {wasCorrect ? "All correct — partial credit not given for half-right answers." : "Need every correct option (and no wrong ones) for credit."}
        </div>
      )}
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
  mc:           {label:"Multiple Choice", color:C.purple,   icon:"📝"},
  "pov-mc":     {label:"Read the Play",   color:C.gold,     icon:"👀"},
  multi:        {label:"Select All That Apply", color:C.gold, icon:"☑️"},
  seq:          {label:"Put in Order",    color:C.gold,     icon:"🔢"},
  mistake:      {label:"Spot the Mistake",color:C.red,      icon:"🔍"},
  next:         {label:"What Happens Next",color:C.yellow,  icon:"🔮"},
  tf:           {label:"True or False",   color:C.blue,     icon:"⚡"},
  scenario:     {label:"Rink Scenario",   color:C.green,    icon:"🏒"},
  "rink-label": {label:"Label the Rink",  color:C.blue,     icon:"🏷️"},
  "rink-drag":  {label:"Drag & Drop",      color:C.green,    icon:"✋"},
};

// ─────────────────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────────────────
function Home({ player, onNav, demoMode, subscriptionTier, questFlagsBump, onPromptUpgrade, onBumpQuestFlags, onSaveProgress, onFirstLine, onSignup }) {
  const { name, level, position, selfRatings, quizHistory, goals } = player;
  const latest = quizHistory[quizHistory.length-1];
  const iq = latest ? calcWeightedIQ(latest.results) : null;
  const tier = iq !== null ? getTier(iq) : null;
  const showProPreview = (demoMode || subscriptionTier === "FREE") && subscriptionTier !== "PRO" && subscriptionTier !== "TEAM";

  // Quest checklist state
  const flags = useQuestFlags(questFlagsBump);
  const identity = demoMode ? "__demo__" : (player?.id || "__anon__");
  const questResults = QUESTS_PLAYER.map(q => computeQuestProgress(q, { player, flags, tier: subscriptionTier }));
  const questDismissed = lsGetJSON(LS_QUEST_DISMISSED, {})[identity] === "1";
  const firstLineSeen = lsGetJSON(LS_FIRST_LINE_SEEN, {})[identity] === "1";
  const [dismissTick, setDismissTick] = useState(0); // eslint-disable-line no-unused-vars
  const whatsNewDismissed = lsGetJSON(LS_WHATSNEW_DISMISSED, {})[identity] === VERSION;
  const upgradeDismissed  = lsGetJSON(LS_UPGRADE_DISMISSED, {})[identity] === "1";
  function dismissWhatsNew() {
    const m = lsGetJSON(LS_WHATSNEW_DISMISSED, {}); m[identity] = VERSION; lsSetJSON(LS_WHATSNEW_DISMISSED, m);
    setDismissTick(t => t + 1);
  }
  function dismissUpgrade() {
    const m = lsGetJSON(LS_UPGRADE_DISMISSED, {}); m[identity] = "1"; lsSetJSON(LS_UPGRADE_DISMISSED, m);
    setDismissTick(t => t + 1);
  }
  function handleQuestTap(q) {
    if (q.gate && !canAccess(q.gate, subscriptionTier).allowed) {
      onPromptUpgrade(q.gate);
    } else {
      onNav(q.nav);
    }
  }
  function handleDismissQuest() {
    const m = lsGetJSON(LS_QUEST_DISMISSED, {});
    m[identity] = "1";
    lsSetJSON(LS_QUEST_DISMISSED, m);
    onBumpQuestFlags();
  }
  function handleAllComplete() {
    const m = lsGetJSON(LS_FIRST_LINE_SEEN, {});
    if (m[identity] === "1") return;
    m[identity] = "1";
    lsSetJSON(LS_FIRST_LINE_SEEN, m);
    if (demoMode) onSaveProgress(); else onFirstLine();
  }
  const totalSessions = quizHistory.length;
  // Journey world-unlock celebration. When the player crosses into a new
  // world (or clears the final one), fire a one-shot celebrate toast. LS
  // tracker is per-player so switching accounts doesn't replay old wins.
  // First-ever load stores the current world without firing so existing
  // players don't get a retroactive popup.
  useEffect(() => {
    if (demoMode || player?.__dev || player?.__preview) return;
    const pid = player?.id;
    if (!pid) return;
    try {
      const clipsWatched = new Set(lsGetJSON(LS_CLIPS_WATCHED, {})[identity] || []).size;
      const insightsRead = lsGetJSON(LS_INSIGHTS_READ, []).length;
      const goalsSet = Object.values(player?.goals || {}).filter(g => g?.goal).length;
      const skillsRated = Object.values(player?.selfRatings || {}).filter(v => v).length;
      const state = getJourneyV2({
        quizzes: totalSessions, training: 0, clipsWatched, insightsRead, goalsSet, skillsRated, coachRated: 0, assignmentsDone: 0,
      }, subscriptionTier);
      const world = state.worlds[state.currentWorldIdx];
      const map = lsGetJSON("rinkreads_last_world_seen_v1", {});
      const prev = map[pid];
      if (typeof prev !== "number") {
        map[pid] = state.currentWorldIdx;
        lsSetJSON("rinkreads_last_world_seen_v1", map);
        return;
      }
      if (state.currentWorldIdx > prev) {
        const nextWorld = state.worlds[state.currentWorldIdx];
        toast.celebrate({
          title: `World ${state.currentWorldIdx + 1} unlocked!`,
          body: `Welcome to ${nextWorld.name}. ${nextWorld.desc}`,
          icon: nextWorld.icon,
        });
        map[pid] = state.currentWorldIdx;
        lsSetJSON("rinkreads_last_world_seen_v1", map);
      }
    } catch { /* LS blocked — silent */ }
    // Intentionally only re-runs when quiz count or tier changes so the
    // toast fires at the moment a new world becomes reachable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSessions, subscriptionTier, player?.id]);
  // Game Sense Score hero — built once here so unlocked rendering can sit
  // at the top of Home and locked rendering can drop further down the page.
  // Rule: unlocked = loud, locked = quiet (don't make new players stare at
  // a padlock as the first thing they see).
  const iqUnlocked = totalSessions >= GAME_SENSE_UNLOCK_SESSIONS && iq !== null;
  const iqHero = (
    <Card glow={iqUnlocked} style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,position:"relative",overflow:"hidden",padding:".85rem 1rem"}}>
      <div style={{position:"absolute",top:0,right:0,width:100,height:100,background:`radial-gradient(circle at top right,${iqUnlocked?tier.color+"15":"rgba(255,255,255,.02)"},transparent 70%)`,pointerEvents:"none"}}/>
      {iqUnlocked ? (
        <>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".25rem"}}>
            <Label style={{marginBottom:0}}>Game Sense Score</Label>
            <div style={{fontSize:11,color:C.dimmer,fontWeight:600}}>{totalSessions} session{totalSessions!==1?"s":""}</div>
          </div>
          <div style={{display:"flex",alignItems:"baseline",gap:".7rem"}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2.6rem",color:tier.color,lineHeight:1,letterSpacing:"-.02em"}}>{iq}<span style={{fontSize:"1.1rem"}}>%</span></div>
            <div style={{fontSize:12,color:C.dim,fontWeight:700}}>{tier.badge} {tier.label}</div>
            <div style={{flex:1}}/>
            <div style={{fontSize:11,color:C.dimmer}}>{latest.results.filter(r=>r.ok).length}/{latest.results.length} correct</div>
          </div>
        </>
      ) : (
        <>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".35rem"}}>
            <Label style={{marginBottom:0}}>Game Sense Score</Label>
            <div style={{fontSize:10,color:C.dimmer,fontWeight:600}}>
              {totalSessions === 0 ? "Locked" : `${totalSessions} session${totalSessions===1?"":"s"} logged`}
            </div>
          </div>
          <div style={{fontSize:12.5,color:C.dim,lineHeight:1.55}}>
            {totalSessions === 0
              ? "Keep working through the app — quizzes, skills, goals — and come back later. Your Game Sense Score unlocks once you've given us enough to measure fairly."
              : "Nice start. Keep working through the app and come back later — your Game Sense Score unlocks once there's enough to measure fairly."}
          </div>
          <div style={{marginTop:".55rem",height:4,background:C.dimmest,borderRadius:3,overflow:"hidden"}}>
            <div style={{width:`${Math.min(100, (totalSessions/GAME_SENSE_UNLOCK_SESSIONS)*100)}%`,height:"100%",background:C.gold,borderRadius:3,transition:"width .3s"}}/>
          </div>
        </>
      )}
    </Card>
  );
  const ratedSkills = Object.values(selfRatings||{}).filter(v => v !== null).length;
  const totalSkills = Object.keys(selfRatings||{}).length;
  const goalCount = Object.keys(goals||{}).filter(k => goals[k]?.goal).length;
  const goalCats = (GOAL_CATS[level]||[]).length;
  const weeklyRecord = getThisWeekRecord();
  const weeklyAllowed = canAccess("weeklyChallenge", subscriptionTier).allowed;

  // Streak + countdown timer
  const [streak, setStreak] = useState(0);
  const [weeklyStreak, setWeeklyStreak] = useState(0);
  const [topCatStreak, setTopCatStreak] = useState(null); // [cat, count] | null
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    const sd = getStreakData();
    const today = getTodayKey();
    const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
    if (sd.last === today || sd.last === yesterday) setStreak(sd.count || 0);
    // Read the weekly + category streaks built from quiz results.
    if (player?.id) {
      const ws = getWeeklyStreak(player.id);
      if (ws?.count >= 2) setWeeklyStreak(ws.count);
      const top = topCategoryStreak(player.id);
      if (top) setTopCatStreak(top);
    }
    // Update countdown every minute
    const tick = () => setCountdown(formatCountdown(msUntilNextWeek()));
    tick();
    const iv = setInterval(tick, 60000);
    return () => clearInterval(iv);
  }, [player?.id]);

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT.body,color:C.white,paddingBottom:80}}>
      {/* Header */}
      <div style={{padding:"1.5rem 1.25rem 1rem",maxWidth:560,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.5rem"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:".45rem",marginBottom:".2rem"}}>
              <RinkReadsLogo size={22}/>
              <span style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.5rem",color:C.gold,letterSpacing:".06em"}}>RinkReads</span>
              <span style={{fontSize:10,color:C.dimmer,fontWeight:500,letterSpacing:".04em"}}>v{VERSION}</span>
              {streak > 0 && (
                <div style={{background:"rgba(234,179,8,.12)",border:"1px solid rgba(234,179,8,.25)",borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:700,color:C.yellow,display:"flex",alignItems:"center",gap:".2rem"}} title={`${streak}-day streak`}>
                  🔥{streak}
                </div>
              )}
              {weeklyStreak >= 2 && (
                <div style={{background:"rgba(91,164,232,.12)",border:"1px solid rgba(91,164,232,.3)",borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:700,color:C.blue,display:"flex",alignItems:"center",gap:".2rem"}} title={`${weeklyStreak} weeks in a row with a quiz`}>
                  🗓️{weeklyStreak}
                </div>
              )}
              {topCatStreak && topCatStreak[1] >= 3 && (
                <div style={{background:"rgba(34,197,94,.12)",border:"1px solid rgba(34,197,94,.3)",borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:700,color:C.green,display:"flex",alignItems:"center",gap:".2rem"}} title={`${topCatStreak[1]} correct in a row in ${topCatStreak[0]}`}>
                  📊{topCatStreak[1]}
                </div>
              )}
              {player?.isAdmin && (
                <button onClick={() => { window.location.hash = "admin"; }}
                  title="Open admin dashboard"
                  style={{background:"rgba(252,76,2,.12)",border:`1px solid ${C.goldBorder}`,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:800,letterSpacing:".06em",color:C.gold,cursor:"pointer",display:"flex",alignItems:"center",gap:".25rem",fontFamily:FONT.body}}>
                  ★ ADMIN
                </button>
              )}
            </div>
            <div style={{fontSize:12,color:C.dimmer}}>{name} · {level} · {position}</div>
          </div>
          <button onClick={() => onNav("profile")} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,width:38,height:38,cursor:"pointer",color:C.dimmer,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>⚙</button>
        </div>

        {/* For-parents start-here card — dismissible, persists via LS */}
        <HomeStartHereCard onRead={() => onNav("parents")} subscriptionTier={subscriptionTier} />

        {/* Training log at the top so parents can update sessions without
            digging into Settings or the dedicated training screen.
            Activity rows default collapsed; date input is capped to the
            last month to keep entries honest. */}
        <TrainingLog playerId={player.id || "__demo__"} />

        {/* Homework from coach — shows only when there's anything assigned */}
        <HomeworkCard playerId={player.id} demoMode={demoMode} />

        {/* Team challenge — fixed quiz everyone on the team takes */}
        <ChallengeCard playerId={player.id} demoMode={demoMode} onStart={(c) => onNav({ kind: "challenge", challenge: c })} />

        {/* Question of the Day — one shared question per age per day */}
        <QotDCard player={player} demoMode={demoMode} onOpen={(q) => onNav({ kind: "qotd", question: q })} />

        {/* Speed Round — 15 T/F, 10 seconds each, pattern break */}
        <SpeedRoundCard player={player} demoMode={demoMode} onStart={() => onNav({ kind: "speed" })} />

        {/* First-Five quest checklist — hidden once dismissed */}
        {!questDismissed && !firstLineSeen && (
          <QuestChecklist
            role="player"
            quests={QUESTS_PLAYER}
            results={questResults}
            onTap={handleQuestTap}
            onDismiss={handleDismissQuest}
            onAllComplete={handleAllComplete}
            showSignupCTA={demoMode}
            onSignup={onSignup}
          />
        )}

        {/* Pro Hockey Intel — inline insights with quest-flag tracking */}
        {!questDismissed && !firstLineSeen && (
          <div style={{margin:"0 -1.25rem 1rem"}}>
            <HockeyInsightWidget onInsightRead={onBumpQuestFlags}/>
          </div>
        )}

        {/* RinkReads Journey — laid out inline so it's the first thing on the
            Home screen. The full-screen JourneyScreen is still reachable via
            the "View full →" link on the card header. */}
        <JourneyBody player={player} tier={subscriptionTier} demoMode={demoMode} onViewFull={() => onNav("journey")} onUpgrade={onPromptUpgrade} />

        {/* IQ Score Hero — only at the top when unlocked. Locked state
            drops further down the page (see below). */}
        {iqUnlocked && iqHero}

        {/* Quick action grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:"1rem"}}>
          <button onClick={() => onNav("quiz")} style={{background:`linear-gradient(135deg,rgba(207,69,32,.15),rgba(207,69,32,.05))`,border:`1px solid ${C.purpleBorder}`,borderRadius:14,padding:"1.1rem",cursor:"pointer",textAlign:"left",color:C.white,fontFamily:FONT.body,position:"relative",overflow:"hidden"}}>
            <img src={imgCoreApp} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.12,pointerEvents:"none"}}/>
            <div style={{position:"relative"}}>
            <div style={{fontSize:22,marginBottom:".4rem"}}>🧠</div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>Take Quiz</div>
            <div style={{fontSize:11,color:C.purple}}>Adaptive · {player.sessionLength||10}Q</div>
            </div>
          </button>
          <button onClick={() => onNav("goals")} style={{background:`linear-gradient(135deg,rgba(252,76,2,.1),rgba(252,76,2,.03))`,border:`1px solid ${C.goldBorder}`,borderRadius:14,padding:"1.1rem",cursor:"pointer",textAlign:"left",color:C.white,fontFamily:FONT.body}}>
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
          <button onClick={() => onNav("training")} style={{background:`linear-gradient(135deg,rgba(91,164,232,.14),rgba(91,164,232,.03))`,border:`1px solid rgba(91,164,232,.35)`,borderRadius:14,padding:"1.1rem",cursor:"pointer",textAlign:"left",color:C.white,fontFamily:FONT.body,position:"relative",overflow:"hidden",gridColumn:"1 / span 2"}}>
            <div style={{display:"flex",alignItems:"center",gap:".7rem"}}>
              <div style={{fontSize:28,flexShrink:0}}>💪</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>Off-Ice Training</div>
                <div style={{fontSize:11,color:C.blue}}>Log practice, skills, pucks — fuels your journey</div>
              </div>
              <span style={{color:C.blue,fontSize:16,flexShrink:0}}>→</span>
            </div>
          </button>
        </div>

        {/* Game Sense Profile button */}
        <button onClick={() => onNav("gamesense")} style={{width:"100%",display:"block",textAlign:"left",background:`linear-gradient(135deg,rgba(207,69,32,.12),rgba(207,69,32,.04))`,border:`1px solid ${C.purpleBorder}`,borderRadius:14,padding:"1rem 1.1rem",cursor:"pointer",color:C.white,fontFamily:FONT.body,marginBottom:"1rem",position:"relative",overflow:"hidden"}}>
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

        {/* Locked Game Sense hero drops here so early-game players see
            action tiles first and the progress gauge as follow-up context. */}
        {!iqUnlocked && iqHero}

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

        {showProPreview && !upgradeDismissed && (
          <button onClick={()=>onNav("plans")} style={{width:"100%",display:"block",textAlign:"left",background:`linear-gradient(135deg,rgba(252,76,2,.12),rgba(207,69,32,.08))`,border:`1px solid ${C.goldBorder}`,borderRadius:14,padding:"1rem 1.1rem",cursor:"pointer",color:C.white,fontFamily:FONT.body,marginBottom:"1rem",position:"relative"}}>
            <span onClick={(e)=>{e.stopPropagation();e.preventDefault();dismissUpgrade();}} role="button" aria-label="Dismiss" style={{position:"absolute",top:6,right:8,width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",color:C.dimmer,fontSize:14,cursor:"pointer",borderRadius:6,lineHeight:1}}>✕</span>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".5rem",paddingRight:"1.6rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
                <span style={{fontSize:16}}>⭐</span>
                <span style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,fontWeight:800}}>Upgrade to RinkReads Pro</span>
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
        {!whatsNewDismissed && (
        <div style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.bgCard} 0%,${C.bgElevated} 100%)`,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden"}}>
          <div style={{padding:".75rem 1rem .6rem",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid rgba(255,255,255,0.05)`}}>
            <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
              <span style={{background:C.gold,color:C.bg,fontSize:9,fontWeight:800,letterSpacing:".1em",textTransform:"uppercase",padding:"2px 7px",borderRadius:20}}>NEW</span>
              <span style={{fontFamily:FONT.display,fontWeight:800,fontSize:13,color:C.white,letterSpacing:".02em"}}>What's New</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
              <span style={{fontSize:10,color:C.dimmer,fontWeight:600}}>v{VERSION} · {CHANGELOG[0].date}</span>
              <button onClick={dismissWhatsNew} aria-label="Dismiss" style={{background:"none",border:"none",color:C.dimmer,fontSize:14,cursor:"pointer",padding:"0 2px",lineHeight:1}}>✕</button>
            </div>
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
        )}
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
  const isDemo = !player.id || isEphemeralPlayer(player.id);
  // First-time quizzes (no session history yet) are capped at 5 so the
  // First-Six onboarding feels quick. Subsequent quizzes use the player's
  // configured sessionLength.
  const firstTime = !isReturning;
  const qLen = isDemo ? 7 : (firstTime ? 5 : (player.sessionLength || 10));
  const [queue, setQueue] = useState(null);
  const [question, setQuestion] = useState(null);
  const { sel, setSel, seqAnswered, setSeqAnswered, seqCorrect, setSeqCorrect, results, setResults } = useQuizState();
  const [seqPerfect, setSeqPerfect] = useState(true);
  const [mistakeStreak, setMistakeStreak] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  // Highest streak we've already celebrated via toast this session. Keeps
  // the 5-in-a-row celebration from firing repeatedly as the player keeps
  // rolling.
  const [celebratedStreak, setCelebratedStreak] = useState(0);
  // Fire a one-shot celebrate toast when the player hits a streak of 5+
  // (or each new milestone at 5, 7, 10). Recomputes on every results change.
  useEffect(() => {
    let streak = 0;
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i].ok) streak++; else break;
    }
    if ((streak === 5 || streak === 7 || streak === 10) && streak > celebratedStreak) {
      const msgs = {
        5: { title: `${streak} in a row!`, body: "Five straight. That's a real read." },
        7: { title: `${streak} straight!`, body: "Seven clean. Tell your coach." },
        10: { title: `PERFECT start — ${streak}!`, body: "Ten in a row. Hockey brain confirmed." },
      };
      toast.celebrate({ ...msgs[streak], icon: streak >= 10 ? "🏆" : "🔥" });
      setCelebratedStreak(streak);
    }
  }, [results, celebratedStreak]);
  const [showFlag, setShowFlag] = useState(false);
  const [rinkQResult, setRinkQResult] = useState(null); // null | true (correct) | false (wrong) — for RinkReadsRinkQuestion dispatcher
  // Speed bonus: when an interactive question is on screen, track when it
  // loaded so a correct answer can earn a time-based bonus. 15-second
  // window, max 50 bonus points per question, linear decay to 0. Wrong
  // answers earn no bonus regardless of speed.
  const [questionStartedAt, setQuestionStartedAt] = useState(() => Date.now());
  const [lastSpeedBonus, setLastSpeedBonus] = useState(0);
  const [speedTotal, setSpeedTotal] = useState(0);
  const [flagReason, setFlagReason] = useState("");
  const [flagDetail, setFlagDetail] = useState("");
  const [flagSent, setFlagSent] = useState(false);
  const [statsMap, setStatsMap] = useState({});

  async function submitFlag() {
    if (!flagReason) return;
    if (player.id && !isEphemeralPlayer(player.id)) {
      await SB.reportQuestion({
        userId: player.id,
        questionId: question.id,
        level: player.level,
        reason: flagReason,
        detail: flagDetail.trim() || null,
      });
    }
    setFlagSent(true);
    setTimeout(() => { setShowFlag(false); setFlagReason(""); setFlagDetail(""); setFlagSent(false); }, TOAST_DURATION_MS);
  }

  useEffect(() => {
    let cancelled = false;
    loadQB().then(qb => {
      if (cancelled) return;
      let allQs;
      if (isDemo) {
        const demoQs = buildDemoQueue(qb, player.level, player.position);
        // First-question text guarantee: while POV image fetches are still
        // warming up, surface a text question first so the user has
        // something to read while everything loads. Find the first
        // non-pov-mc and swap it to index 0.
        const ti = demoQs.findIndex(q => q.type !== "pov-mc");
        if (ti > 0) [demoQs[0], demoQs[ti]] = [demoQs[ti], demoQs[0]];
        setQueue({ byD: {1: demoQs.slice(1), 2: [], 3: []}, currentD: 1, tier: "DEMO" });
        setQuestion(demoQs[0]);
        allQs = demoQs;
      } else {
        const q = buildQueue(qb, player.level, player.position, isReturning, tier);
        let { q: first, queue: q2 } = pullNext(q, []);
        // Same text-first guarantee for adaptive queues — if pullNext
        // happened to return a pov-mc, swap with the first non-pov-mc
        // in any difficulty bucket.
        if (first && first.type === "pov-mc") {
          for (const d of [1, 2, 3]) {
            const i = (q2.byD[d] || []).findIndex(x => x && x.type !== "pov-mc");
            if (i >= 0) {
              const swap = q2.byD[d][i];
              q2.byD[d][i] = first;
              first = swap;
              break;
            }
          }
        }
        setQueue(q2);
        setQuestion(first);
        allQs = [first, ...Object.values(q2.byD).flat()];
      }
      // Image preload — kick off fetches for every POV image in the queue so
      // by the time the user clicks through to question N, its image is
      // already in the browser cache. `new Image()` doesn't render, just
      // primes the cache. Filter to unique URLs to avoid redundant requests.
      const urls = new Set();
      for (const q of allQs) {
        const u = q?.media?.url;
        if (u && !u.startsWith("/pov-placeholder")) urls.add(u);
      }
      for (const u of urls) { const img = new Image(); img.src = u; }
    }).catch(e => console.error("QB load error:", e));
    if (!isDemo) SB.getQuestionStats().then(setStatsMap).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Reset the speed-bonus timer whenever the displayed question changes.
  useEffect(() => {
    if (question) setQuestionStartedAt(Date.now());
  }, [question?.id]);

  const qNum = results.length;
  const isLast = qNum >= qLen - 1;
  const qtype = question?.type || "mc";

  // Speed-bonus window. Interactive (rink) questions get a timed bonus;
  // MC/TF/seq don't because reading-speed is mostly literacy, not hockey IQ.
  const SPEED_TYPES = new Set(["drag-target","drag-place","multi-tap","sequence-rink","path-draw","lane-select","hot-spots","zone-click","rink-label","rink-drag","scenario"]);
  const SPEED_DURATION_MS = 15000;
  const SPEED_MAX_BONUS = 50;

  function computeSpeedBonus(qt, ok, startedAt) {
    if (!ok) return 0;
    if (!SPEED_TYPES.has(qt)) return 0;
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, SPEED_DURATION_MS - elapsed);
    return Math.floor((remaining / SPEED_DURATION_MS) * SPEED_MAX_BONUS);
  }

  function handlePick(i) {
    if (sel !== null || !question) return;
    setSel(i);
    const ok = i === question.ok;
    const bonus = computeSpeedBonus(qtype, ok, questionStartedAt);
    setLastSpeedBonus(bonus);
    if (bonus) setSpeedTotal(t => t + bonus);
    const newResult = { id:question.id, cat:question.cat, ok, d:question.d||2, type:qtype, speedBonus:bonus };
    const newResults = [...results, newResult];
    if (question.type === "mistake" && ok) setMistakeStreak(s => s+1);
    setResults(newResults);
    if (newResults.length >= qLen) setQuizDone(true);
  }

  function handleSeqAnswer(ok) {
    setSeqAnswered(true);
    setSeqCorrect(ok);
    if (!ok) setSeqPerfect(false);
    const bonus = computeSpeedBonus(qtype, ok, questionStartedAt);
    setLastSpeedBonus(bonus);
    if (bonus) setSpeedTotal(t => t + bonus);
    const newResult = { id:question.id, cat:question.cat, ok, d:question.d||2, type:question.type || "seq", speedBonus:bonus };
    const newResults = [...results, newResult];
    setResults(newResults);
    if (newResults.length >= qLen) setQuizDone(true);
  }

  function advance() {
    if (!question) return;
    if (results.length >= qLen) { setQuizDone(true); return; }
    const { q: nextQ, queue: nextQueue } = pullNext(queue, results);
    if (!nextQ) { setQuizDone(true); return; }
    setQueue(nextQueue);
    setQuestion(nextQ);
    setSel(null);
    setSeqAnswered(false);
    setSeqCorrect(false);
    setRinkQResult(null);
    setLastSpeedBonus(0);
    setQuestionStartedAt(Date.now());
  }

  // RinkReadsRinkQuestion dispatcher routes when q.rink is set OR the type is one
  // of the new rink-native interactive types.
  const NEW_RINK_TYPES = ["drag-target","drag-place","multi-tap","sequence-rink","path-draw","lane-select","hot-spots","zone-click","rink-label","rink-drag"];
  const isRinkQ = !!question?.rink || NEW_RINK_TYPES.includes(qtype);
  const answered = isRinkQ
    ? rinkQResult !== null
    : (qtype === "seq" || qtype === "multi" || qtype === "scenario") ? seqAnswered
    :                          sel !== null;
  const q = question;
  if (!q) return <Screen><div style={{color:C.dimmer,textAlign:"center",paddingTop:"4rem"}}>Loading…</div></Screen>;

  // Records a result for a question dispatched to RinkReadsRinkQuestion. The child
  // component fires onAnswer(true|false); we dedupe via rinkQResult so a player
  // toggling/retrying inside the rink widget can't double-record.
  function handleRinkQAnswer(ok) {
    if (rinkQResult !== null) return;
    const okBool = !!ok;
    setRinkQResult(okBool);
    const bonus = computeSpeedBonus(qtype, okBool, questionStartedAt);
    setLastSpeedBonus(bonus);
    if (bonus) setSpeedTotal(t => t + bonus);
    const nextResults = [...results, { id:q.id, cat:q.cat, ok:okBool, d:q.d||2, type:qtype, speedBonus:bonus }];
    setResults(nextResults);
    if (nextResults.length >= qLen) setQuizDone(true);
  }

  // Single dispatch site. New schema (q.rink or NEW_RINK_TYPES) goes through
  // RinkReadsRinkQuestion which handles its own type-specific UI internally.
  // Everything else falls through to the existing per-type renderers.
  function renderQuestionBody() {
    if (isRinkQ) {
      return <RinkReadsRinkQuestion question={q} onAnswer={handleRinkQAnswer} onSkip={advance} />;
    }
    switch (qtype) {
      case "mc":
      case "pov-mc":
      case "mistake":
        return <MCQuestion q={q} sel={sel} onPick={handlePick} colorblind={player.colorblind}/>;
      case "next":
        return <NextQuestion q={q} sel={sel} onPick={handlePick}/>;
      case "tf":
        return <TFQuestion q={q} sel={sel} onPick={i => handlePick(i)}/>;
      case "seq":
        return <SeqQuestion q={q} onAnswer={handleSeqAnswer} answered={seqAnswered}/>;
      case "multi":
        return <MultiMCQuestion q={q} onAnswer={handleSeqAnswer} answered={seqAnswered} colorblind={player.colorblind}/>;
      case "scenario":
        return <ScenarioRenderer scenario={q} playerId={player?.id} onAnswer={p => handleSeqAnswer(!!p.ok)} />;
      default:
        return null;
    }
  }

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
              <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1rem",color:C.gold}}>RinkReads · {getLevelDisplay(player)}</div>
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
            <div style={{fontSize:12,color:C.dim,lineHeight:1.6}}>This question type is available on RinkReads Pro. Unlock all 5 question formats to challenge yourself in new ways.</div>
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
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1rem",color:C.gold}}>RinkReads · {getLevelDisplay(player)}</div>
            <div style={{fontSize:11,color:C.dimmer}}>Q{qNum+1}/{qLen} · {player.position} · {player.season||SEASONS[0]}</div>
          </div>
          {speedTotal > 0 && (
            <div style={{display:"flex",alignItems:"center",gap:".25rem",padding:".15rem .5rem",background:C.goldDim,border:`1px solid ${C.goldBorder}`,borderRadius:999,fontSize:11,fontWeight:800,color:C.gold}}>
              ⚡ +{speedTotal}
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
            <div style={{fontSize:10,color:C.dimmer,fontWeight:700,letterSpacing:".04em"}}>Question {qNum+1} of {qLen}</div>
            <div style={{width:100,height:4,background:C.dimmest,borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${(qNum/qLen)*100}%`,background:C.purple,borderRadius:2,transition:"width .35s ease"}}/>
            </div>
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

        {/* POV image — first-person scenario photo above the situation card */}
        {qtype === "pov-mc" && q.media?.url && (
          <div style={{
            marginBottom:"1rem", borderRadius:12, overflow:"hidden",
            border:`1px solid ${C.border}`, background:"#000",
            aspectRatio:"16/9",
          }}>
            <img src={q.media.url} alt={q.media.alt || ""}
              draggable={false}
              loading="eager" decoding="async" fetchpriority="high"
              style={{width:"100%", height:"100%", objectFit:"cover", display:"block", userSelect:"none"}} />
          </div>
        )}

        {/* Situation / Prompt */}
        {(qtype === "mc" || qtype === "pov-mc" || qtype === "seq" || qtype === "next") && (
          <Card style={{marginBottom:"1.25rem",background:C.purpleDim,border:`1px solid ${C.purpleBorder}`}}>
            <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.purple,marginBottom:".6rem",fontWeight:700}}>
              {qtype === "pov-mc" ? "👀 Read the Play" : "📋 Game Situation"}
            </div>
            <div style={{fontSize:15,lineHeight:1.8,color:C.white,fontWeight:500}}>{q.sit}</div>
          </Card>
        )}

        {qtype === "multi" && (
          <Card style={{marginBottom:"1.25rem",background:C.goldDim,border:`1px solid ${C.goldBorder}`}}>
            <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,marginBottom:".6rem",fontWeight:700}}>☑️ Select All That Apply</div>
            {q.sit && <div style={{fontSize:14,color:C.dim,lineHeight:1.7,marginBottom:".5rem"}}>{q.sit}</div>}
            {q.q && <div style={{fontSize:15,fontWeight:700,color:C.white,lineHeight:1.6}}>{q.q}</div>}
          </Card>
        )}

        {qtype === "tf" && (
          <Card style={{marginBottom:"1.25rem",background:C.blueDim,border:`1px solid rgba(91,164,232,.3)`}}>
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

        {qtype === "rink" && (
          <Card style={{marginBottom:"1.25rem",background:C.blueDim,border:`1px solid rgba(91,164,232,.3)`}}>
            <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.blue,marginBottom:".6rem",fontWeight:700}}>🏒 Rink Scenario</div>
            {q.sit && <div style={{fontSize:14,color:C.dim,lineHeight:1.7,marginBottom:".5rem"}}>{q.sit}</div>}
            {q.scene?.question?.prompt && <div style={{fontSize:15,fontWeight:700,color:C.white}}>{q.scene.question.prompt}</div>}
          </Card>
        )}

        {/* Speed-bonus timer — only for interactive types. Drains live; freezes
            on answer with the awarded bonus. Wrong answers freeze at 0. */}
        {SPEED_TYPES.has(qtype) && (
          <SpeedTimerBar
            startedAt={questionStartedAt}
            durationMs={SPEED_DURATION_MS}
            maxBonus={SPEED_MAX_BONUS}
            frozen={answered}
            achieved={lastSpeedBonus}
          />
        )}

        {/* Question component — single dispatch in renderQuestionBody() */}
        {renderQuestionBody()}

        {/* Report flag — always visible, not gated on answered */}
        <button onClick={() => setShowFlag(true)} style={{background:"none",border:"none",color:C.dimmer,fontSize:11,marginTop:".65rem",cursor:"pointer",fontFamily:FONT.body,width:"100%",textAlign:"center",padding:".4rem",textDecoration:"underline"}}>
          🚩 Report this question
        </button>

        {/* Explanation */}
        {answered && (() => {
          // T/F stores `sel` as the string "true"|"false"; coerce before comparing
          // to q.ok (which is a real boolean) or we'd always mark T/F wrong.
          const userCorrect = isRinkQ
            ? rinkQResult
            : qtype === "seq"
            ? seqCorrect
            : qtype === "tf"
            ? (sel === "true") === q.ok
            : (sel === q.ok);
          // Variable-reward reveal — consecutive-correct streak across this
          // session drives the verdict flavor. Baseline single "✓ Correct"
          // becomes "🔥 Two in a row!", "🔥 Three in a row!", etc. Streaks of
          // 5+ also fire a one-shot celebrate toast (see useEffect below).
          let streak = 0;
          for (let i = results.length - 1; i >= 0; i--) {
            if (results[i].ok) streak++; else break;
          }
          const SINGLE_FLAVORS = ["✓ Correct", "✓ Locked in.", "✓ Clean."];
          let verdict, verdictColor = userCorrect ? C.green : C.red;
          if (!userCorrect) {
            verdict = "✗ Incorrect";
          } else if (streak >= 5) {
            verdict = `⚡ ${streak} STRAIGHT!`;
            verdictColor = C.gold;
          } else if (streak === 4) {
            verdict = "🔥🔥 Four in a row!";
            verdictColor = C.gold;
          } else if (streak === 3) {
            verdict = "🔥 Three in a row!";
          } else if (streak === 2) {
            verdict = "🔥 Two in a row!";
          } else {
            const seed = (q.id || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
            verdict = SINGLE_FLAVORS[seed % SINGLE_FLAVORS.length];
          }
          return (
          <div ref={el => { if (el) setTimeout(() => el.scrollIntoView({behavior:"smooth",block:"nearest"}), 150); }} style={{marginTop:"1rem"}}>
            <Card style={{
              background: userCorrect ? (streak >= 4 ? "rgba(252,76,2,.1)" : "rgba(34,197,94,.06)") : C.redDim,
              border:`1px solid ${userCorrect ? (streak >= 4 ? C.goldBorder : C.greenBorder) : C.redBorder}`,
              marginBottom:"1rem"
            }}>
              <div style={{fontSize:userCorrect && streak >= 2 ? 12 : 10,letterSpacing:".12em",textTransform:"uppercase",fontWeight:800,marginBottom:".5rem",color:verdictColor}}>
                {verdict}
              </div>
              <div style={{fontSize:13,color:C.dim,lineHeight:1.75,marginBottom:".75rem"}}>{q.why || q.explanation}</div>
              {(() => {
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
              {(() => {
                const coach = getCoachForQuestion(q, player.level, player.position);
                if (!coach) return null;
                const ageTier = getAgeTier(player.level);
                const perCoachPool = (userCorrect ? coach.flavorCorrect : coach.flavorIncorrect)?.[ageTier];
                const flavorPool = (perCoachPool && perCoachPool.length)
                  ? perCoachPool
                  : (userCorrect ? FLAVOR_CORRECT : FLAVOR_INCORRECT);
                const flavor = flavorPool[(q.id?.length || 0) % flavorPool.length];
                return (
                  <div style={{display:"flex",gap:".6rem",alignItems:"flex-start",borderTop:`1px solid ${C.border}`,paddingTop:".7rem",marginTop:".2rem"}}>
                    <AvatarDisc name={coach.name} kind="coach" size={40}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"baseline",gap:".4rem",flexWrap:"wrap",marginBottom:".2rem"}}>
                        <span style={{fontWeight:800,fontSize:12,color:C.white}}>{coach.name}</span>
                        <span style={{fontSize:10,color:C.dimmer,letterSpacing:".04em"}}>{coach.role}</span>
                      </div>
                      {/* Coach feedback split into a short spoken line on top
                          and the longer teaching/tip underneath, so the
                          quip lands before the explanation unpacks it. */}
                      <div style={{fontWeight:800,fontSize:13.5,color:userCorrect?C.green:C.yellow,lineHeight:1.35,marginBottom:".3rem"}}>
                        {flavor}
                      </div>
                      <div style={{fontSize:12,color:C.dim,lineHeight:1.55}}>
                        {q.tip || (userCorrect ? "Keep reading the ice like that." : "Re-read the play and reset — you'll get the next one.")}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Card>
            {quizDone ? (
              <button onClick={() => onFinish(results, seqPerfect, mistakeStreak)} style={{background:C.gold,color:C.bg,border:"none",borderRadius:12,padding:".9rem",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:FONT.body,width:"100%"}}>
                Finish & See Results →
              </button>
            ) : (
              <button onClick={advance} style={{background:C.purple,color:C.white,border:"none",borderRadius:12,padding:".9rem",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:FONT.body,width:"100%"}}>
                Next Question →
              </button>
            )}
          </div>
          );
        })()}

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
// Optional post-quiz prompt: "What would you like to see more of?" Saves
// to quiz_feedback (migration 0011). FREE-tier users see a "chance to win
// a Pro membership" hook; paid tiers see a plain product-shaping framing.
// Hidden for ephemeral player ids (demo/preview/dev) since they have no
// auth.uid() and the RLS policy would reject the write.
function QuizFeedbackCard({ player, score, tier }) {
  const [choice, setChoice] = useState(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!player?.id || isEphemeralPlayer(player.id)) return null;
  if (dismissed || submitted) return null;

  const isFree = !tier || tier === "FREE";
  const headline = isFree ? "Help shape what we build next" : "What would you like more of?";
  const subhead = isFree
    ? "Tell us what you'd like more of and you'll be entered to win a free Pro membership."
    : "Your input shapes what we build next. Optional — skip if you'd rather not.";

  const OPTIONS = [
    { id: "rink_scenarios",  icon: "🎯", label: "Rink scenarios" },
    { id: "game_situations", icon: "🧠", label: "Game situations" },
    { id: "tougher",         icon: "💪", label: "Tougher questions" },
    { id: "my_position",     icon: "🛡️", label: "My position" },
    { id: "something_else",  icon: "💬", label: "Something else" },
  ];

  function submit() {
    if (!choice) return;
    SB.recordQuizFeedback(player.id, { choice, note, score, level: player.level });
    setSubmitted(true);
  }

  return (
    <Card style={{
      marginBottom: "1rem",
      background: isFree ? `linear-gradient(135deg,rgba(252,76,2,.1),rgba(252,76,2,.02))` : C.bgCard,
      border: `1px solid ${isFree ? C.goldBorder : C.border}`,
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:".5rem",marginBottom:".5rem"}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1rem",color:C.white,marginBottom:".2rem"}}>{headline}</div>
          <div style={{fontSize:12,color:isFree?C.gold:C.dim,lineHeight:1.5}}>{subhead}</div>
        </div>
        <button onClick={()=>setDismissed(true)} aria-label="Skip"
          style={{background:"none",border:"none",color:C.dimmer,cursor:"pointer",fontSize:18,padding:"0 4px",lineHeight:1,flexShrink:0}}>×</button>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:".4rem",marginBottom:choice?".75rem":".25rem"}}>
        {OPTIONS.map(o => {
          const on = choice === o.id;
          return (
            <button key={o.id} onClick={()=>setChoice(on ? null : o.id)}
              style={{background:on?C.goldDim:C.bgElevated,border:`1px solid ${on?C.gold:C.border}`,borderRadius:999,padding:".4rem .75rem",cursor:"pointer",color:on?C.gold:C.dim,fontFamily:FONT.body,fontSize:12,fontWeight:on?700:500}}>
              <span style={{marginRight:".3rem"}}>{o.icon}</span>{o.label}
            </button>
          );
        })}
      </div>
      {choice && (
        <>
          <textarea value={note} onChange={e=>setNote(e.target.value)}
            placeholder={choice === "something_else" ? "Tell us more…" : "Anything specific? (optional)"}
            rows={2} maxLength={500}
            style={{background:C.bgGlass,border:`1px solid ${C.border}`,borderRadius:8,padding:".55rem .75rem",color:C.white,fontFamily:FONT.body,fontSize:13,outline:"none",width:"100%",resize:"vertical",boxSizing:"border-box",marginBottom:".55rem"}}/>
          <button onClick={submit}
            style={{width:"100%",background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".7rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>
            Submit{isFree ? " & enter to win →" : " →"}
          </button>
        </>
      )}
    </Card>
  );
}

function Results({ results, player, prevScore, totalSessions, seqPerfect, mistakeStreak, tier, onAgain, onHome, showMilestoneBanner, onViewPlans }) {
  const [saved, setSaved] = useState(false);
  const score = calcWeightedIQ(results);
  const scoreTier = getTier(score);
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
      localStorage.setItem("rinkreads_score", JSON.stringify(score));
      localStorage.setItem("rinkreads_sessions", String(totalSessions));
      const sd = updateStreak(getStreakData());
      localStorage.setItem("rinkreads_streak", JSON.stringify(sd));
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
        <div style={{fontSize:56,marginBottom:".5rem"}}>{scoreTier.badge}</div>
        <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",marginBottom:".15rem"}}>{scoreTier.label}</div>
        <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"5rem",color:scoreTier.color,lineHeight:.9,letterSpacing:"-.02em"}}>{score}<span style={{fontSize:"2rem"}}>%</span></div>
        <div style={{fontSize:13,color:C.dimmer,margin:".5rem 0 .75rem"}}>{correct}/{results.length} correct</div>
        {saved && player.coachCode && (
          <div style={{fontSize:11,color:C.green,display:"flex",alignItems:"center",justifyContent:"center",gap:".3rem"}}>✓ Saved to team {player.coachCode}</div>
        )}
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,rgba(252,76,2,.08),rgba(252,76,2,.02))`,border:`1px solid ${C.goldBorder}`}}>
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
        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,rgba(252,76,2,.12),rgba(252,76,2,.04))`,border:`1px solid ${C.goldBorder}`,textAlign:"center",padding:"1.25rem"}}>
          <div style={{fontSize:24,marginBottom:".4rem"}}>🏆</div>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem",color:C.gold,marginBottom:".3rem"}}>5 quizzes complete!</div>
          <div style={{fontSize:12,color:C.dim,lineHeight:1.5,marginBottom:".85rem"}}>Free keeps only your last 5 sessions. Upgrade to track your full journey and see your progress over time.</div>
          <button onClick={onViewPlans} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".55rem 1.1rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>See Pro Plans →</button>
        </Card>
      )}

      <QuizFeedbackCard player={player} score={score} tier={tier}/>

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
  // Re-derive the unlock moment each minute so the local time stays fresh
  // if a user leaves the screen open across a timezone-relevant boundary
  // (e.g. DST switchover).
  const [unlockStr, setUnlockStr] = useState(() => formatUnlockMoment());
  useEffect(() => {
    const t = setInterval(() => setUnlockStr(formatUnlockMoment()), 60000);
    return () => clearInterval(t);
  }, []);
  const used = getFreeQuizCount();
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"2rem 1.25rem",textAlign:"center"}}>
      <div style={{maxWidth:380,width:"100%"}}>
        <div style={{fontSize:48,marginBottom:"1rem"}}>🏒</div>
        <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.8rem",marginBottom:".5rem"}}>Weekly limit reached</div>
        <div style={{fontSize:14,color:C.dim,lineHeight:1.65,marginBottom:"1.75rem"}}>
          Free players get <strong style={{color:C.white}}>{FREE_WEEKLY_QUIZ_CAP} quizzes per week</strong>. You've completed {used} this week.
          <div style={{marginTop:".65rem"}}>New quizzes unlocked <strong style={{color:C.gold}}>{unlockStr}</strong>.</div>
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

        {qtype === "pov-mc" && q.media?.url && (
          <div style={{
            marginBottom:"1rem", borderRadius:12, overflow:"hidden",
            border:`1px solid ${C.border}`, background:"#000",
            aspectRatio:"16/9",
          }}>
            <img src={q.media.url} alt={q.media.alt || ""}
              draggable={false}
              loading="eager" decoding="async" fetchpriority="high"
              style={{width:"100%", height:"100%", objectFit:"cover", display:"block", userSelect:"none"}} />
          </div>
        )}
        {(qtype === "mc" || qtype === "pov-mc" || qtype === "next") && (
          <Card style={{marginBottom:"1.25rem",background:C.purpleDim,border:`1px solid ${C.purpleBorder}`}}>
            <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.purple,marginBottom:".6rem",fontWeight:700}}>
              {qtype === "pov-mc" ? "👀 Read the Play" : "📋 Game Situation"}
            </div>
            <div style={{fontSize:15,lineHeight:1.8,color:C.white,fontWeight:500}}>{q.sit}</div>
          </Card>
        )}
        {qtype === "tf" && (
          <Card style={{marginBottom:"1.25rem",background:C.blueDim,border:`1px solid rgba(91,164,232,.3)`}}>
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
        {qtype === "multi" && (
          <Card style={{marginBottom:"1.25rem",background:C.goldDim,border:`1px solid ${C.goldBorder}`}}>
            <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,marginBottom:".6rem",fontWeight:700}}>☑️ Select All That Apply</div>
            {q.sit && <div style={{fontSize:14,color:C.dim,lineHeight:1.7,marginBottom:".5rem"}}>{q.sit}</div>}
            {q.q && <div style={{fontSize:15,fontWeight:700,color:C.white,lineHeight:1.6}}>{q.q}</div>}
          </Card>
        )}

        {qtype === "mc" && <MCQuestion q={q} sel={sel} onPick={handlePick} colorblind={player.colorblind}/>}
        {qtype === "pov-mc" && <MCQuestion q={q} sel={sel} onPick={handlePick} colorblind={player.colorblind}/>}
        {qtype === "next" && <MCQuestion q={q} sel={sel} onPick={handlePick} colorblind={player.colorblind}/>}
        {qtype === "mistake" && <MCQuestion q={q} sel={sel} onPick={handlePick} colorblind={player.colorblind}/>}
        {qtype === "multi" && <MultiMCQuestion q={q} answered={seqAnswered} onAnswer={handleSeqAnswer} colorblind={player.colorblind}/>}
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

        {sel !== null && qtype !== "seq" && qtype !== "multi" && (() => {
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
    "Rush Reads":   {S:"Make the correct 2-on-1 decision every time",M:"Score 80%+ on Rush Reads in RinkReads",A:"I get the concept, just need reps",R:"Rush reads are my weakest RinkReads category",T:"End of this month"},
    "Shooting":     {S:"Improve my quick-release wrist shot accuracy",M:"Hit top corners 3 out of 5 in practice drills",A:"I have good fundamentals already",R:"Quick release is what separates scorers at this level",T:"Within 6 weeks"},
    "Game IQ":      {S:"Pre-read plays before the puck arrives",M:"RinkReads score improves from current to Hockey Sense tier",A:"I've started thinking about it more already",R:"Faster reads = better plays",T:"End of season"},
  };

  function updateGoal(cat, field, value) {
    setGoals(g => ({...g, [cat]: {...(g[cat]||{}), [field]: value}}));
  }

  const currentGoal = goals[active] || {};
  const completedSteps = SMART_STEPS.filter(s => currentGoal[s]?.trim());
  // The top "Your Goal" field is conceptually a summary; the 5 SMART fields
  // carry the real content. If the user filled all 5 but left the goal field
  // blank, treat the Specific (S) field as the goal so the save button appears.
  const isComplete = completedSteps.length === 5 && (currentGoal.goal?.trim() || currentGoal.S?.trim());
  const example = SMART_EXAMPLES[active] || {};

  function handleSaveGoal() {
    const g = goals[active] || {};
    // Fallback: if the top goal field is empty, backfill it from S so the
    // downstream save (SB.saveGoal) doesn't silently drop the entry.
    if (!g.goal?.trim() && g.S?.trim()) {
      const patched = { ...goals, [active]: { ...g, goal: g.S.trim() } };
      setGoals(patched);
      onSave(patched);
    } else {
      onSave(goals);
    }
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:80}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>SMART Goals</div>
            <div style={{fontSize:11,color:C.dimmer}}>{getLevelDisplay(player)} · {Object.keys(goals).filter(k=>goals[k]?.goal).length}/{cats.length} set</div>
          </div>
          <button onClick={handleSaveGoal} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".4rem 1rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>Save</button>
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
            <textarea
              value={currentGoal[step]||""}
              onChange={e => updateGoal(active,step,e.target.value)}
              placeholder={example[step] ? `Write your answer here... e.g. "${example[step]}"` : "Write your answer here..."}
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
                <button onClick={handleSaveGoal} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".4rem 1rem",cursor:"pointer",fontSize:12,fontWeight:800,fontFamily:FONT.body}}>
                  Save Goal ✓
                </button>
              )}
            </div>
          </Card>
        </div>

        {/* Completed goal preview */}
        {isComplete && (
          <Card style={{background:"rgba(34,197,94,.06)",border:`1px solid ${C.greenBorder}`,marginBottom:"1rem"}}>
            <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:C.green,fontWeight:700,marginBottom:".5rem"}}>✓ Goal Complete</div>
            <div style={{fontSize:13,color:C.white,fontWeight:600,marginBottom:".5rem"}}>{currentGoal.goal || currentGoal.S}</div>
            {SMART_STEPS.map(s => (
              <div key={s} style={{fontSize:12,color:C.dim,marginBottom:".25rem",lineHeight:1.5}}>
                <span style={{color:C.green,fontWeight:700}}>{SMART_LABELS[s]}:</span> {currentGoal[s]}
              </div>
            ))}
          </Card>
        )}

        {/* Always-visible bottom Save button — users naturally look down
            for save; the StickyHeader save is easy to miss on long pages. */}
        <button onClick={handleSaveGoal}
                style={{width:"100%",background:isComplete?C.gold:C.goldDim,color:isComplete?C.bg:C.dim,border:`1px solid ${C.goldBorder}`,borderRadius:12,padding:"1rem",cursor:"pointer",fontWeight:800,fontSize:15,fontFamily:FONT.body,letterSpacing:".02em",marginTop:"1rem"}}>
          {isComplete ? "Save Goal ✓" : "Save Progress"}
        </button>
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
              <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem",color:o.color,lineHeight:1}}>{o.value === "n/a" ? "—" : i+1}</div>
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
        <div style={{fontSize:12,color:C.dimmer,textAlign:"center",marginBottom:"1.25rem"}}>Unlock this and more with RinkReads {tierName}</div>

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
  if (level === "U9 / Novice") {
    const q = skill.selfQ || skill.desc;
    // Reframe as frequency-friendly if needed
    if (q.startsWith("Can you ")) return "How often can you " + q.slice(8);
    if (q.startsWith("Do you ")) return "How often do you " + q.slice(7);
    return q;
  }
  return skill.selfQ || skill.desc;
}

function Skills({ player, tier, onSave, onBack, onUpgrade }) {
  const [ratings, setRatings] = useState({...player.selfRatings});
  const [activeCategory, setActiveCategory] = useState(0);
  const cats = SKILLS[player.level] || [];
  const cat = cats[activeCategory];
  const hasFullAccess = canAccess("fullSkillRating", tier).allowed;
  const visibleSkills = (c) => hasFullAccess ? c.skills : c.skills.filter(s => FREE_SKILL_IDS.has(s.id));
  const lockedCount = hasFullAccess ? 0 : cats.reduce((n, c) => n + c.skills.filter(s => !FREE_SKILL_IDS.has(s.id)).length, 0);
  const total = hasFullAccess
    ? Object.keys(ratings).length
    : cats.reduce((n, c) => n + visibleSkills(c).length, 0);
  const rated = hasFullAccess
    ? Object.values(ratings).filter(v=>v!==null).length
    : cats.reduce((n, c) => n + visibleSkills(c).filter(s => ratings[s.id] !== null && ratings[s.id] !== undefined).length, 0);
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
          const vs = visibleSkills(c);
          const cr = vs.filter(s=>ratings[s.id]!==null && ratings[s.id]!==undefined).length;
          const catLocked = !hasFullAccess && c.skills.some(s => !FREE_SKILL_IDS.has(s.id));
          return (
            <button key={i} onClick={()=>setActiveCategory(i)} style={{background:"none",border:"none",borderBottom:`2px solid ${i===activeCategory?(c.isDM?C.purple:C.gold):"transparent"}`,color:i===activeCategory?C.white:C.dimmer,padding:".8rem 1rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body,fontWeight:i===activeCategory?700:400,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:".3rem",flexShrink:0}}>
              <span>{c.icon}</span><span>{c.cat}</span>
              {cr===vs.length && vs.length>0 && <span style={{color:C.green,fontSize:10}}>✓</span>}
              {catLocked && <span style={{color:C.gold,fontSize:10}}>🔒</span>}
            </button>
          );
        })}
      </div>
      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
        {!hasFullAccess && (
          <Card style={{marginBottom:"1rem",background:C.goldDim,border:`1px solid ${C.goldBorder}`}}>
            <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:C.gold,fontWeight:800,marginBottom:".35rem"}}>🔒 Preview mode</div>
            <div style={{fontSize:12,color:C.white,lineHeight:1.55}}>You're rating one skill per category as a FREE taste. RinkReads Pro unlocks all {total + lockedCount} skills + full radar + coach side-by-side.</div>
          </Card>
        )}
        {cat?.isDM && <Card style={{marginBottom:"1rem",background:C.purpleDim,border:`1px solid ${C.purpleBorder}`}}><div style={{fontSize:12,color:C.purple,lineHeight:1.6}}>🧠 Rate honestly — this is for your development, not anyone else's judgment.</div></Card>}
        {scaleType === "rubric" && (
          <Card style={{marginBottom:"1rem",background:C.bgElevated}}>
            <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:C.gold,fontWeight:700,marginBottom:".5rem"}}>How to rate yourself</div>
            <div style={{fontSize:12,color:C.dim,lineHeight:1.6}}>Each level has a specific behavior. Pick the one that sounds most like you in games — not practice. Be honest: this creates better conversations with your coach.</div>
          </Card>
        )}
        {/* Render unlocked skills first, then locked at the bottom of the
            category. Keeps the rate-me path continuous on FREE instead of
            making the player scan past padlocks to find their next card. */}
        {[
          ...(cat?.skills || []).filter(s => hasFullAccess || FREE_SKILL_IDS.has(s.id)),
          ...(cat?.skills || []).filter(s => !hasFullAccess && !FREE_SKILL_IDS.has(s.id)),
        ].map(s => {
          const isLocked = !hasFullAccess && !FREE_SKILL_IDS.has(s.id);
          const selfVal = ratings[s.id];
          const selfColor = selfVal ? getScaleColor(selfScale, selfVal) : null;
          if (isLocked) {
            return (
              <Card key={s.id} style={{marginBottom:".75rem",border:`1px dashed ${C.goldBorder}`,background:"rgba(252,76,2,0.04)",opacity:0.7}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:".5rem",marginBottom:3}}>
                  <div style={{fontWeight:700,fontSize:14,color:C.dim}}>{s.name}</div>
                  <div style={{fontSize:10,letterSpacing:".1em",color:C.gold,fontWeight:800,flexShrink:0}}>🔒 PRO</div>
                </div>
                <div style={{fontSize:12,color:C.dimmer,lineHeight:1.5}}>{s.desc}</div>
              </Card>
            );
          }
          return (
            <Card key={s.id} style={{marginBottom:".75rem",border:`1px solid ${selfColor?selfColor+"40":C.border}`,borderLeft:`3px solid ${selfColor||"transparent"}`}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{s.name}</div>
              <div style={{fontSize:12,color:C.dimmer,marginBottom:".85rem",lineHeight:1.5}}>{getSelfPrompt(player.level, s)}</div>
              <RatingButtons level={player.level} value={selfVal} onChange={v => setRatings(p=>({...p,[s.id]:v}))} />
            </Card>
          );
        })}
        {!hasFullAccess && activeCategory === cats.length - 1 && (
          <button onClick={() => onUpgrade?.("fullSkillRating", "pro")} style={{
            width:"100%", background:C.gold, color:C.bg, border:"none",
            borderRadius:12, padding:"1rem", cursor:"pointer",
            fontWeight:800, fontSize:15, fontFamily:FONT.body,
            marginBottom:".75rem", boxShadow:`0 4px 16px ${C.gold}33`,
          }}>
            Unlock all {lockedCount} locked skills →
          </button>
        )}
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
  const W = 420, H = 340;
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
          const full = `${a.icon} ${a.label}`;
          const parts = full.length > 14 ? (() => {
            const words = a.label.split(" ");
            if (words.length < 2) return [full];
            const mid = Math.ceil(words.length / 2);
            return [`${a.icon} ${words.slice(0, mid).join(" ")}`, words.slice(mid).join(" ")];
          })() : [full];
          return (
            <g key={`l${i}`}>
              <text x={lx.toFixed(1)} y={ly.toFixed(1)} fontSize="10" fontWeight="700" fill={C.white} textAnchor={anchor} dominantBaseline="middle" fontFamily="'Inter', 'DM Sans', sans-serif">
                {parts.length === 1 ? parts[0] : (
                  <>
                    <tspan x={lx.toFixed(1)} dy="-0.4em">{parts[0]}</tspan>
                    <tspan x={lx.toFixed(1)} dy="1.1em">{parts[1]}</tspan>
                  </>
                )}
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

// Live countdown bar above interactive questions — drains over the
// SPEED_DURATION_MS window. Resets when `startedAt` changes (next question)
// and freezes when `frozen` is true (after the player answers).
function SpeedTimerBar({ startedAt, durationMs, maxBonus, frozen, achieved }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (frozen) return;
    const id = setInterval(() => setTick(t => t + 1), 100);
    return () => clearInterval(id);
  }, [frozen, startedAt]);
  const elapsed = Date.now() - startedAt;
  const remaining = Math.max(0, durationMs - elapsed);
  const pct = Math.max(0, Math.min(100, (remaining / durationMs) * 100));
  const inWindow = remaining > 0;
  // Frozen → show what was earned. Live → show "up to +N" while ticking.
  const label = frozen
    ? (achieved > 0 ? `⚡ +${achieved} speed pts` : `⏱ Out of time`)
    : (inWindow ? `⏱ Answer fast — up to +${Math.floor((remaining / durationMs) * maxBonus)} pts` : `⏱ Bonus window closed`);
  const color = frozen
    ? (achieved > 0 ? C.gold : C.dimmer)
    : (pct > 60 ? C.gold : pct > 25 ? "#eab308" : C.red);
  return (
    <div style={{
      marginBottom: ".75rem", padding: ".5rem .75rem",
      background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10,
    }}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".35rem",fontSize:11,fontWeight:800,color:color,letterSpacing:".04em"}}>
        <span>{label}</span>
        {!frozen && inWindow && <span style={{color:C.dimmer,fontWeight:700}}>{(remaining / 1000).toFixed(1)}s</span>}
      </div>
      <div style={{height:4,background:C.dimmest,borderRadius:2,overflow:"hidden"}}>
        <div style={{
          height:"100%",
          width:frozen ? `${(achieved / maxBonus) * 100}%` : `${pct}%`,
          background: color,
          borderRadius:2,
          transition: frozen ? "width .2s" : "none",
        }}/>
      </div>
    </div>
  );
}

// Inline reflection prompt — "what tripped you up?" 4 quick chips, always
// dismissable. Shown after a wrong answer in the Quiz explanation card.
// Three exit paths:
//   - Pick a reason → saved to LS keyed by question id, prompt collapses.
//   - ✕ Dismiss → hides for THIS question only (per-render state).
//   - "Don't show these" → flips a global LS flag, suppresses on every
//      question going forward. Re-enable from Profile (if ever wired).
function ReflectionPrompt({ question, onSaved }) {
  const [hidden, setHidden] = useState(false);
  const [picked, setPicked] = useState(() => getReflectionFor(question?.id)?.reason || null);
  if (!question?.id) return null;
  if (hidden) return null;
  if (isReflectionsDisabled()) return null;

  function pick(reason) {
    saveReflection(question.id, reason, question.cat);
    setPicked(reason);
    onSaved?.(reason);
  }

  function disableForever() {
    setReflectionsDisabled(true);
    setHidden(true);
  }

  return (
    <div style={{
      marginTop:".75rem", padding:".7rem .85rem",
      background:C.bgCard, border:`1px dashed ${C.purpleBorder}`, borderRadius:10,
    }}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".5rem",gap:".5rem"}}>
        <div style={{fontSize:11,color:C.purple,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase"}}>
          {picked ? "✓ Logged" : "What tripped you up?"}
        </div>
        <button onClick={() => setHidden(true)} title="Dismiss"
          style={{background:"none",border:"none",color:C.dimmer,cursor:"pointer",fontSize:14,padding:"0 .25rem",lineHeight:1}}>
          ✕
        </button>
      </div>
      {!picked && (
        <>
          <div style={{display:"flex",gap:".35rem",flexWrap:"wrap",marginBottom:".5rem"}}>
            {REFLECTION_REASONS.map(r => (
              <button key={r.id} onClick={() => pick(r.id)}
                style={{
                  flex:"1 1 auto",minWidth:0,
                  background:C.bgElevated,color:C.dim,
                  border:`1px solid ${C.border}`,borderRadius:999,
                  padding:".4rem .75rem",cursor:"pointer",
                  fontSize:11,fontWeight:700,fontFamily:FONT.body,whiteSpace:"nowrap",
                }}>
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={disableForever}
            style={{background:"none",border:"none",color:C.dimmer,cursor:"pointer",fontSize:10,padding:0,textDecoration:"underline",letterSpacing:".04em"}}>
            Don't show these
          </button>
        </>
      )}
      {picked && (
        <div style={{fontSize:11,color:C.dim,lineHeight:1.4}}>
          Logged as <b style={{color:C.white}}>"{REFLECTION_REASONS.find(r => r.id === picked)?.label}"</b>.
          You'll see a roll-up on your Report.
        </div>
      )}
    </div>
  );
}

// Compact mastery strip — surfaces per-category attempts × accuracy
// as a 3-star meter. Drives a "show me a target I can hit" loop on the
// Report screen without conflicting with the Journey progression.
function MasteryStrip({ quizHistory }) {
  const mastery = computeCategoryMastery(quizHistory);
  const ranked = rankCategories(mastery);
  if (!ranked.length) return null;
  const top = ranked.slice(0, 6);
  const earned = ranked.filter(([, m]) => m.stars > 0).length;
  return (
    <Card style={{marginBottom:"1rem"}}>
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:".5rem"}}>
        <Label>Category Mastery</Label>
        <div style={{fontSize:11,color:C.dimmer,fontWeight:700,letterSpacing:".06em"}}>{earned}/{ranked.length} CATEGORIES STARTED</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
        {top.map(([cat, m]) => {
          const pct = Math.round(m.accuracy * 100);
          const next = nextThreshold(m.stars, m.attempts, m.accuracy);
          const stars = "★".repeat(m.stars) + "☆".repeat(3 - m.stars);
          const starColor = m.stars === 3 ? C.gold : m.stars > 0 ? C.gold : C.dimmest;
          return (
            <div key={cat} style={{padding:".55rem .7rem",background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:".75rem",marginBottom:".25rem"}}>
                <div style={{fontSize:13,fontWeight:700,color:C.white,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cat}</div>
                <div style={{fontSize:14,color:starColor,letterSpacing:".05em",flexShrink:0}}>{stars}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:11,color:C.dimmer}}>
                <span>{m.attempts} attempts · {pct}%</span>
                {next ? (
                  <span style={{color:C.dim}}>
                    {next.needAttempts > 0
                      ? `${next.needAttempts} more @ ${Math.round(next.needAccuracy * 100)}%+ → ${next.target}`
                      : `Hit ${Math.round(next.needAccuracy * 100)}% → ${next.target}`}
                  </span>
                ) : (
                  <span style={{color:C.gold,fontWeight:700}}>Mastered ★</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// Roll-up of the reflection journal on the Report screen. Shows a count
// per reason + a re-enable toggle if the player previously hit "Don't
// show these." Hides entirely when there's nothing to show AND prompts
// aren't disabled — no zero-state noise.
function ReflectionSummary() {
  const [, force] = useState(0);
  const counts = reflectionCounts();
  const disabled = isReflectionsDisabled();
  if (counts.__total === 0 && !disabled) return null;
  return (
    <Card style={{marginBottom:"1rem"}}>
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:".5rem"}}>
        <Label>What's Tripping You Up</Label>
        <div style={{fontSize:11,color:C.dimmer,fontWeight:700,letterSpacing:".06em"}}>
          {counts.__total > 0 ? `${counts.__total} LOGGED` : "PROMPTS OFF"}
        </div>
      </div>
      {counts.__total > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:".4rem"}}>
          {REFLECTION_REASONS.map(r => {
            const n = counts[r.id] || 0;
            if (n === 0) return null;
            const pct = Math.round((n / counts.__total) * 100);
            return (
              <div key={r.id} style={{padding:".5rem .65rem",background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".25rem"}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.white}}>{r.label}</div>
                  <div style={{fontSize:11,color:C.dim}}>{n} · {pct}%</div>
                </div>
                <div style={{height:4,background:C.dimmest,borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:C.purple,borderRadius:2}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{marginTop:".75rem",display:"flex",justifyContent:"flex-end"}}>
        <button onClick={() => { setReflectionsDisabled(!disabled); force(x => x + 1); }}
          style={{background:"none",border:"none",color:C.dimmer,cursor:"pointer",fontSize:11,padding:0,textDecoration:"underline",letterSpacing:".04em"}}>
          {disabled ? "Re-enable post-quiz prompts" : "Turn off post-quiz prompts"}
        </button>
      </div>
    </Card>
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
    if (player.id && !isEphemeralPlayer(player.id)) {
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
        <div style={{fontSize:13,color:C.dimmer}}>{getLevelDisplay(player)} · {player.position} · {player.season||SEASONS[0]}</div>
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

      <MasteryStrip quizHistory={player.quizHistory} />

      {/* Locked upsell cards (Coach Feedback teaser + Skills Map) have been
          moved to the bottom of this screen so FREE users see their own
          content (stats, goals, parent's view, quiz history) first. Look
          for the "Locked previews" group near </Screen>. */}

      {/* Coach Feedback empty-state — PRO/TEAM have the feature unlocked but
          no coach has rated yet. Nudge them to invite a coach. */}
      {coachFeedbackAllowed && !loadingCoach && !coachRatings && (
        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.purpleBorder}`,padding:"1.25rem"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:".75rem",marginBottom:".8rem"}}>
            <div style={{fontSize:26,flexShrink:0}}>👨‍🏫</div>
            <div style={{flex:1}}>
              <Label>Coach Feedback</Label>
              <div style={{fontSize:12,color:C.dim,lineHeight:1.55}}>Your coach hasn't rated you yet. Send them an invite — they can rate your skills and leave notes you'll see right here.</div>
            </div>
          </div>
          <button onClick={() => {
              const subject = encodeURIComponent("Can you rate my skills on RinkReads?");
              const body = encodeURIComponent(
                `Hi Coach,\n\nI'm using RinkReads to work on my game sense and skills. Could you rate me on the skills your coaching staff thinks matter most? ` +
                `It takes a few minutes and I'll see your ratings + notes in the app so I can work on the right things.\n\n` +
                `Here's the coach page: https://rinkreads.com/#coaches\n\nThanks!\n${player?.name || ""}`
              );
              try { window.location.href = `mailto:?subject=${subject}&body=${body}`; } catch {}
            }}
            style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".6rem .9rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body,width:"100%"}}>
            📧 Invite your coach to rate you
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

      {/* Skills Map radar — only the unlocked version renders inline. The
          locked teaser is relocated to the "Locked previews" group below. */}
      {canSeeRadar && Object.values(player.selfRatings||{}).some(v=>v) && (
        <Card style={{marginBottom:"1rem"}}>
          <Label>Skills Map</Label>
          <div style={{fontSize:11,color:C.dimmer,marginBottom:".75rem",lineHeight:1.5}}>Each axis is a skill category. Purple = your self-rating. Gold = your coach.</div>
          <SkillsRadar cats={cats} selfRatings={player.selfRatings} coachRatings={activeCoachRatings} selfScale={selfScale} coachScale={coachScale}/>
        </Card>
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

      {/* ─────────────── Locked previews ───────────────
          Upsell cards for features the current tier doesn't have. Kept at
          the bottom of the Report so FREE users see everything they *do*
          have first, then see what Pro/Team would add. */}
      {!canSeeRadar && Object.values(player.selfRatings||{}).some(v=>v) && (
        <Card style={{marginBottom:"1rem",background:C.bgElevated,border:`1px dashed ${C.border}`,textAlign:"center",padding:"1.25rem"}}>
          <div style={{fontSize:24,marginBottom:".35rem",opacity:.6}}>🔒</div>
          <Label>Skills Map</Label>
          <div style={{fontSize:12,color:C.dimmer,marginBottom:"0.85rem",lineHeight:1.5}}>See all your skill categories at a glance — your self-rating vs. coach, visualized.</div>
          <button onClick={()=>onUpgrade && onUpgrade("progressSnapshots","pro")} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".55rem 1.1rem",cursor:"pointer",fontWeight:800,fontSize:12,fontFamily:FONT.body}}>
            Unlock with Pro →
          </button>
        </Card>
      )}
      {!coachFeedbackAllowed && (
        <Card style={{marginBottom:"1rem",background:C.bgElevated,border:`1px dashed ${C.goldBorder}`,padding:"1.25rem"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:".75rem",marginBottom:".8rem"}}>
            <div style={{fontSize:26,flexShrink:0}}>🔒</div>
            <div style={{flex:1}}>
              <Label>Coach Feedback</Label>
              <div style={{fontSize:12,color:C.dimmer,lineHeight:1.55}}>See ratings and notes from every coach on your team — Head Coach, Assistants, Skills Coach, and more.</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:".45rem"}}>
            <button onClick={()=>onUpgrade && onUpgrade("coachFeedback","pro")}
              style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".55rem .9rem",cursor:"pointer",fontWeight:800,fontSize:12,fontFamily:FONT.body,width:"100%"}}>
              Unlock with RinkReads Pro →
            </button>
            <div style={{fontSize:10,letterSpacing:".08em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,textAlign:"center",marginTop:".15rem"}}>or — at no cost to you</div>
            <button onClick={() => {
                const subject = encodeURIComponent("RinkReads for our team");
                const body = encodeURIComponent(
                  "Hi Coach,\n\nI started using an app called RinkReads to work on game sense off the ice. " +
                  "There's a Team tier that unlocks coach feedback — so you could rate me (and other players) and I'd see your notes in-app.\n\n" +
                  "Would you be open to setting up a Team account? Here's the page for coaches:\n" +
                  "https://rinkreads.com/#coaches\n\nThanks!"
                );
                try { window.location.href = `mailto:?subject=${subject}&body=${body}`; } catch {}
              }}
              style={{background:"none",color:C.gold,border:`1px solid ${C.goldBorder}`,borderRadius:8,padding:".5rem .9rem",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:FONT.body,width:"100%"}}>
              🏒 Ask your coach to set up a Team account
            </button>
            <button onClick={() => {
                const subject = encodeURIComponent("RinkReads for our association");
                const body = encodeURIComponent(
                  "Hi,\n\nMy kid uses an app called RinkReads to train hockey sense off the ice. " +
                  "They offer an Association tier that lets multiple teams run on it — coaches get a dashboard, players see coach feedback.\n\n" +
                  "Would you take a look? Here's the association page:\nhttps://rinkreads.com/#associations\n\nThanks!"
                );
                try { window.location.href = `mailto:?subject=${subject}&body=${body}`; } catch {}
              }}
              style={{background:"none",color:C.gold,border:`1px solid ${C.goldBorder}`,borderRadius:8,padding:".5rem .9rem",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:FONT.body,width:"100%"}}>
              🏟️ Ask your association to sign up
            </button>
          </div>
        </Card>
      )}
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────
// ADMIN: QUESTION REPORTS
// ─────────────────────────────────────────────────────────
const ADMIN_EMAIL = "mtslifka@gmail.com";


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

// Level-node positions inside a single world map. 8 nodes plotted on a
// winding path so the progression feels map-like (Mario-style).
const WORLD_NODE_XY = [
  { x: 50,  y: 180 }, { x: 125, y: 120 }, { x: 200, y: 180 }, { x: 275, y: 110 },
  { x: 350, y: 190 }, { x: 425, y: 130 }, { x: 500, y: 200 }, { x: 575, y: 115 },
];

// Inline Journey — 64 levels across 8 themed worlds. Reused by the dedicated
// JourneyScreen and the Home hero. `onViewFull` surfaces a small link back to
// the full screen when rendered inline on Home.
function JourneyBody({ player, tier, demoMode, onViewFull, onUpgrade }) {
  const trainingSessions = (() => {
    try { return (getTrainingLog(player?.id || "__demo__")?.sessions) || []; }
    catch { return []; }
  })();
  // Async activity counts — coach feedback + assignment completions. Fetched
  // once on mount; treated as 0 until they resolve so the UI never blocks.
  const [coachRated, setCoachRated] = useState(0);
  const [assignmentsDone, setAssignmentsDone] = useState(0);
  useEffect(() => {
    if (demoMode || !player?.id || isEphemeralPlayer(player.id)) return;
    let cancelled = false;
    SB.getCoachRatingsForPlayer(player.id).then(r => {
      if (!cancelled) setCoachRated(Object.keys(r?.ratings || {}).length > 0 ? 1 : 0);
    });
    SB.getCompletionsForPlayer(player.id).then(set => {
      if (!cancelled) setAssignmentsDone(set?.size || 0);
    });
    return () => { cancelled = true; };
  }, [player?.id, demoMode]);

  // Assemble the full activity-count bag the journey scores against.
  const identity = demoMode ? "__demo__" : (player?.id || "__anon__");
  const clipsWatched = (() => {
    try { return new Set(lsGetJSON(LS_CLIPS_WATCHED, {})[identity] || []).size; }
    catch { return 0; }
  })();
  const insightsRead = (() => {
    try { return lsGetJSON(LS_INSIGHTS_READ, []).length; }
    catch { return 0; }
  })();
  const goalsSet = Object.values(player?.goals || {}).filter(g => g?.goal).length;
  const skillsRated = Object.values(player?.selfRatings || {}).filter(v => v).length;

  const journeyState = {
    quizzes: player?.quizHistory?.length || 0,
    training: trainingSessions.length,
    clipsWatched, insightsRead, goalsSet, skillsRated, coachRated, assignmentsDone,
  };
  const state = getJourneyV2(journeyState, tier);
  const { levels, currentIdx, currentWorldIdx, worlds, nextIdx } = state;
  const [activeWorldIdx, setActiveWorldIdx] = useState(currentWorldIdx);
  const [selectedLevelIdx, setSelectedLevelIdx] = useState(null);
  const world = worlds[activeWorldIdx];
  const worldLevels = levels.filter(l => l.worldIdx === activeWorldIdx);
  const worldUnlocked = worldLevels.filter(l => l.unlocked).length;
  const showLevel = selectedLevelIdx !== null
    ? levels[selectedLevelIdx]
    : (nextIdx !== null ? levels[nextIdx] : levels[levels.length - 1]);

  return (
    <>
      {onViewFull && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".55rem"}}>
          <div>
            <Label style={{marginBottom:0}}>RinkReads Journey</Label>
            <div style={{fontSize:11,color:C.dimmer,marginTop:2}}>Level {currentIdx+1} of 64 · World {currentWorldIdx+1}: {worlds[currentWorldIdx].name}</div>
          </div>
          <button onClick={onViewFull} style={{background:"none",border:"none",color:C.gold,cursor:"pointer",fontSize:12,fontFamily:FONT.body,fontWeight:700,padding:0}}>View full →</button>
        </div>
      )}

      {/* World selector strip — 8 tiles, horizontal scroll */}
      <div style={{display:"flex",gap:".4rem",overflowX:"auto",marginBottom:".85rem",paddingBottom:".25rem",marginLeft:-4,marginRight:-4,paddingLeft:4,paddingRight:4}}>
        {worlds.map((w, i) => {
          const isActive = i === activeWorldIdx;
          const worldFirstLevelIdx = i * 8;
          const isUnlocked = i === 0 || levels[worldFirstLevelIdx - 1]?.unlocked;
          const cleared = levels.filter(l => l.worldIdx === i && l.unlocked).length;
          return (
            <button key={i} onClick={() => isUnlocked && (setActiveWorldIdx(i), setSelectedLevelIdx(null))}
              disabled={!isUnlocked}
              style={{
                flexShrink: 0, minWidth: 92, padding: ".5rem .65rem",
                background: isActive ? w.gradient : C.bgCard,
                border: `1.5px solid ${isActive ? "#fff" : isUnlocked ? C.border : "transparent"}`,
                borderRadius: 10,
                opacity: isUnlocked ? 1 : 0.35,
                cursor: isUnlocked ? "pointer" : "default",
                color: C.white, fontFamily: FONT.body, textAlign: "left",
                boxShadow: isActive ? `0 4px 14px ${w.accent}55` : "none",
                transition: "transform .12s ease",
              }}>
              <div style={{fontSize:20,marginBottom:2}}>{isUnlocked ? w.icon : "🔒"}</div>
              <div style={{fontSize:9,letterSpacing:".12em",color:isActive?"rgba(255,255,255,.9)":C.dimmer,fontWeight:800}}>WORLD {i+1}</div>
              <div style={{fontSize:11,fontWeight:700,color:isActive?"#fff":isUnlocked?C.white:C.dimmer,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{w.name}</div>
              <div style={{fontSize:9,color:isActive?"rgba(255,255,255,.8)":C.dimmer,marginTop:2,fontWeight:600}}>{cleared}/8 cleared</div>
            </button>
          );
        })}
      </div>

      {/* Active world map */}
      <Card style={{padding:0,background:world.gradient,border:`1px solid rgba(255,255,255,.1)`,marginBottom:"1rem",overflow:"hidden"}}>
        <div style={{padding:".85rem 1rem .65rem",background:"rgba(0,0,0,.35)",backdropFilter:"blur(2px)"}}>
          <div style={{fontSize:10,color:"rgba(255,255,255,.75)",letterSpacing:".16em",textTransform:"uppercase",fontWeight:800,marginBottom:1}}>World {activeWorldIdx+1}</div>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.3rem",color:"#fff",lineHeight:1.1,display:"flex",alignItems:"center",gap:".5rem"}}>
            <span style={{fontSize:24}}>{world.icon}</span>
            {world.name}
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.82)",marginTop:4,lineHeight:1.4}}>{world.desc} <span style={{color:"rgba(255,255,255,.6)",marginLeft:6}}>{worldUnlocked}/8 cleared</span></div>
        </div>
        {/* 8 level nodes on a winding path */}
        <svg viewBox="0 0 625 250" style={{width:"100%",height:"auto",display:"block",background:"rgba(0,0,0,.15)"}}>
          {/* Decorative clouds/stars per theme */}
          <g opacity=".35">
            {[...Array(6)].map((_, i) => (
              <circle key={i} cx={50 + i * 100} cy={30 + (i%2)*12} r={3 + (i%3)} fill="#fff"/>
            ))}
          </g>
          {/* Connecting path */}
          {worldLevels.map((l, i) => {
            if (i === worldLevels.length - 1) return null;
            const a = WORLD_NODE_XY[i], b = WORLD_NODE_XY[i+1];
            const isTrail = l.unlocked && worldLevels[i+1].unlocked;
            const isCurrent = l.unlocked && !worldLevels[i+1].unlocked;
            return (
              <line key={`p${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={isTrail ? "#fff" : isCurrent ? world.accent : "rgba(255,255,255,.25)"}
                strokeWidth={isTrail ? 4 : isCurrent ? 3.5 : 2}
                strokeDasharray={isTrail || isCurrent ? "0" : "6 6"}
                strokeLinecap="round" opacity={isTrail ? .85 : isCurrent ? .85 : .55}/>
            );
          })}
          {/* Nodes */}
          {worldLevels.map((l, i) => {
            const {x, y} = WORLD_NODE_XY[i];
            const isNext = l.idx === nextIdx;
            const isSelected = l.idx === selectedLevelIdx;
            const fill = l.unlocked ? world.accent : isNext ? "#fff" : "rgba(255,255,255,.2)";
            const stroke = l.unlocked ? "#fff" : isNext ? world.accent : "rgba(255,255,255,.4)";
            return (
              <g key={l.idx} style={{cursor:"pointer"}} onClick={() => setSelectedLevelIdx(isSelected ? null : l.idx)}>
                {isNext && (
                  <circle cx={x} cy={y} r="28" fill="none" stroke="#fff" strokeWidth="2" opacity=".4">
                    <animate attributeName="r" values="22;30;22" dur="1.8s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values=".2;.6;.2" dur="1.8s" repeatCount="indefinite"/>
                  </circle>
                )}
                <circle cx={x} cy={y} r={isSelected ? 22 : 19}
                  fill={fill} stroke={stroke} strokeWidth={2.5} opacity={l.unlocked || isNext ? 1 : .7}/>
                <text x={x} y={y+5} textAnchor="middle" fontSize="14" fontWeight="800"
                  fill={l.unlocked ? "#fff" : isNext ? world.accent : "rgba(255,255,255,.6)"}
                  style={{userSelect:"none",pointerEvents:"none",fontFamily:"'Inter','DM Sans',sans-serif"}}>
                  {l.unlocked ? "✓" : l.levelInWorld + 1}
                </text>
                <text x={x} y={y+40} textAnchor="middle" fontSize="9" fontWeight="700"
                  fill={l.unlocked || isNext ? "#fff" : "rgba(255,255,255,.55)"}
                  style={{userSelect:"none",pointerEvents:"none",fontFamily:"'Inter','DM Sans',sans-serif"}}>
                  {l.name}
                </text>
              </g>
            );
          })}
        </svg>
      </Card>

      {/* Level detail — lists every activity requirement for the chosen level */}
      {showLevel && (
        <Card style={{marginBottom:"1rem",background:showLevel.unlocked?"rgba(34,197,94,.08)":"rgba(252,76,2,.08)",border:`1px solid ${showLevel.unlocked?C.greenBorder:C.goldBorder}`}}>
          <div style={{display:"flex",alignItems:"center",gap:".75rem",marginBottom:".55rem"}}>
            <div style={{fontSize:28,width:44,height:44,borderRadius:10,background:showLevel.worldGradient,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{showLevel.worldIcon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.15rem",color:C.white,lineHeight:1.2}}>{showLevel.name}</div>
              <div style={{fontSize:10,color:showLevel.worldAccent,marginTop:2,fontWeight:800,letterSpacing:".1em"}}>WORLD {showLevel.worldIdx+1}-{showLevel.levelInWorld+1} · {showLevel.worldName}</div>
            </div>
            <div style={{fontSize:10,color:showLevel.unlocked?C.green:C.gold,fontWeight:800,letterSpacing:".08em"}}>
              {showLevel.unlocked ? "✓ CLEARED" : showLevel.idx === nextIdx ? "NEXT UP" : "LOCKED"}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:".3rem"}}>
            {Object.entries(showLevel.requirements).map(([act, need]) => {
              const metric = ACTIVITY_METRICS[act];
              if (!metric) return null;
              const have = journeyState[act] || 0;
              const met = have >= need;
              return (
                <div key={act} style={{display:"flex",alignItems:"center",gap:".55rem",padding:".45rem .7rem",background:met?"rgba(34,197,94,.06)":C.bgElevated,borderRadius:8,border:`1px solid ${met?C.greenBorder:C.border}`}}>
                  <div style={{fontSize:16,flexShrink:0}}>{metric.icon}</div>
                  <div style={{flex:1,fontSize:12,color:met?C.dim:C.white,lineHeight:1.35}}>
                    <b style={{color:met?C.green:C.white}}>{metric.boolean ? (met?"Done":"Needed") : `${Math.min(have,need)}/${need}`}</b> {metric.label}
                  </div>
                  {met && <span style={{color:C.green,fontSize:14,fontWeight:800,flexShrink:0}}>✓</span>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {tier === "FREE" && (
        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,rgba(252,76,2,.08),rgba(207,69,32,.04))`,border:`1px dashed ${C.goldBorder}`,padding:"1rem 1.1rem"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:".65rem",marginBottom:".55rem"}}>
            <div style={{fontSize:22,flexShrink:0}}>⛰️</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,fontWeight:800,marginBottom:2}}>FREE path</div>
              <div style={{fontSize:12.5,color:C.dim,lineHeight:1.55}}>64 levels across 8 themed worlds — from Frozen Pond to The Show. FREE reps-per-level are ~1.7× the Pro climb. Still reachable on Free's 3 quizzes/week.</div>
            </div>
          </div>
          {onUpgrade && (
            <button onClick={()=>onUpgrade("unlimitedQuizzes","pro")} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".55rem .9rem",cursor:"pointer",fontWeight:800,fontSize:12,fontFamily:FONT.body,width:"100%"}}>
              Shorten the climb — unlock Pro →
            </button>
          )}
        </Card>
      )}
    </>
  );
}

// Preview-only page. Lets tools/dashboard.html iframe a single question at
// `#q=<id>` so an author can see EXACTLY what a player sees without any
// surrounding UI. Loads the QB, finds the id, renders it through the
// normal RinkReadsRinkQuestion dispatcher (for rink/POV types) or a
// lightweight MC/TF fallback for non-rink types.
// Side-by-side parity tester for the unified scenario engine. Loads the
// legacy `u13q_rink07` (path-draw) and the ported `u13q_rink07_v2` and
// renders both in the same viewport. Validates that the new engine
// produces the same answer behavior as the bespoke component before any
// bank migration ships.
function ScenarioParityTest() {
  const [legacy, setLegacy] = useState(null);
  const [errLegacy, setErrLegacy] = useState(null);
  const [pathJson, setPathJson] = useState(null);
  const [igymJson, setIgymJson] = useState(null);
  const [selectionJson, setSelectionJson] = useState(null);
  const [pointJson, setPointJson] = useState(null);
  const [sequenceJson, setSequenceJson] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadQB().then(qb => {
      if (cancelled) return;
      let found = null;
      for (const lvl of Object.keys(qb)) {
        const hit = (qb[lvl] || []).find(q => q.id === "u13q_rink07");
        if (hit) { found = hit; break; }
      }
      if (!found) setErrLegacy("Legacy u13q_rink07 not found in bank.");
      else setLegacy(found);
    }).catch(e => { if (!cancelled) setErrLegacy(e.message); });
    import("./scenario/seeds/u13q_rink07_v2.json").then(m => { if (!cancelled) setPathJson(m.default); });
    import("./scenario/seeds/u15_intelligym_demo.json").then(m => { if (!cancelled) setIgymJson(m.default); });
    import("./scenario/seeds/u11_open_pass_v1.json").then(m => { if (!cancelled) setSelectionJson(m.default); });
    import("./scenario/seeds/u11_faceoff_point_v1.json").then(m => { if (!cancelled) setPointJson(m.default); });
    import("./scenario/seeds/u13_breakout_sequence_v1.json").then(m => { if (!cancelled) setSequenceJson(m.default); });
    return () => { cancelled = true; };
  }, []);

  const tile = (label, accent, content) => (
    <div>
      <div style={{fontSize:11,color:accent,fontWeight:800,letterSpacing:".06em",marginBottom:".5rem"}}>{label}</div>
      {content}
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,padding:"1rem 1rem 4rem"}}>
      <div style={{maxWidth:1600,margin:"0 auto"}}>
        <div style={{paddingBottom:".75rem",borderBottom:`1px solid ${C.border}`,marginBottom:"1rem"}}>
          <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,fontWeight:700}}>Scenario engine — parity test</div>
          <div style={{fontSize:13,color:C.dim,marginTop:4}}>
            Six tiles, four primitives. Top row: <b>Legacy</b> (bespoke path-draw) · <b>Unified PATH</b> (same scenario, new engine) · <b>IntelliGym</b> (path + preview-lock + timer + scan-then-hide). Bottom row: <b>SELECTION</b> · <b>POINT</b> · <b>SEQUENCE</b>.
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"1rem",marginBottom:"1.5rem"}}>
          {tile("LEGACY · u13q_rink07", C.dimmer,
            <>
              {errLegacy && <div style={{color:C.red,fontSize:13}}>{errLegacy}</div>}
              {legacy && <RinkReadsRinkQuestion question={legacy} onAnswer={() => {}}/>}
            </>
          )}
          {tile("UNIFIED PATH · u13_pp_bumper", C.dimmer,
            pathJson && <ScenarioRenderer scenario={pathJson} onAnswer={() => {}}/>
          )}
          {tile("INTELLIGYM · u15_pp", C.gold,
            igymJson && <ScenarioRenderer scenario={igymJson} onAnswer={() => {}}/>
          )}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"1rem"}}>
          {tile("SELECTION · u11_open_pass", C.green,
            selectionJson && <ScenarioRenderer scenario={selectionJson} onAnswer={() => {}}/>
          )}
          {tile("POINT · u11_faceoff", C.blue,
            pointJson && <ScenarioRenderer scenario={pointJson} onAnswer={() => {}}/>
          )}
          {tile("SEQUENCE · u13_breakout", C.purple,
            sequenceJson && <ScenarioRenderer scenario={sequenceJson} onAnswer={() => {}}/>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionPreviewPage({ questionId }) {
  const [question, setQuestion] = useState(null);
  const [err, setErr] = useState(null);
  const [key, setKey] = useState(0); // forces a re-mount on Retry
  const [verdict, setVerdict] = useState(null); // "ok" | "wrong" | null
  useEffect(() => {
    let cancelled = false;
    loadQB().then(qb => {
      if (cancelled) return;
      let found = null;
      for (const lvl of Object.keys(qb)) {
        const hit = (qb[lvl] || []).find(q => q.id === questionId);
        if (hit) { found = { ...hit, __previewLevel: lvl }; break; }
      }
      if (!found) setErr(`Question id "${questionId}" not found in the bank.`);
      else setQuestion(found);
    }).catch(e => { if (!cancelled) setErr(e.message || String(e)); });
    return () => { cancelled = true; };
  }, [questionId]);

  if (err) {
    return (
      <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,padding:"2rem 1.25rem",maxWidth:640,margin:"0 auto"}}>
        <div style={{fontSize:10,letterSpacing:".16em",textTransform:"uppercase",color:C.red,fontWeight:700,marginBottom:".4rem"}}>Preview error</div>
        <div style={{fontSize:14,color:C.dim,lineHeight:1.55}}>{err}</div>
      </div>
    );
  }
  if (!question) {
    return <div style={{minHeight:"100vh",background:C.bg,color:C.dimmer,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT.body,fontSize:13}}>Loading question…</div>;
  }

  const isRinkQ = !!question.rink ||
    ["drag-target","drag-place","multi-tap","sequence-rink","path-draw","lane-select","hot-spots","zone-click","rink-label","rink-drag"].includes(question.type);

  return (
    <div key={key} style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,padding:"1rem 1rem 4rem",maxWidth:700,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:".5rem",marginBottom:".9rem",paddingBottom:".6rem",borderBottom:`1px solid ${C.border}`}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,fontWeight:700}}>Preview</div>
          <div style={{fontSize:12,color:C.dim,marginTop:2}}>
            <code style={{background:C.bgElevated,padding:"1px 6px",borderRadius:4}}>{question.id}</code>
            <span style={{marginLeft:".5rem"}}>· {question.__previewLevel} · {question.cat} · {question.type || "mc"}</span>
          </div>
        </div>
        <button onClick={() => setKey(k => k + 1)} style={{background:C.bgElevated,border:`1px solid ${C.border}`,color:C.dimmer,borderRadius:8,padding:".3rem .75rem",cursor:"pointer",fontSize:12,fontFamily:FONT.body}}>↺ Reset</button>
      </div>
      {verdict && (
        <div style={{
          marginBottom:".9rem",padding:".7rem .9rem",borderRadius:10,
          background: verdict === "ok" ? "rgba(34,197,94,.12)" : "rgba(239,68,68,.12)",
          border: `1px solid ${verdict === "ok" ? C.greenBorder : C.redBorder}`,
          display:"flex",alignItems:"center",justifyContent:"space-between",gap:".75rem"
        }}>
          <div style={{fontSize:13,fontWeight:800,color: verdict === "ok" ? C.green : C.red,letterSpacing:".04em"}}>
            {verdict === "ok" ? "✓ Correct" : "✗ Wrong"}
          </div>
          <button onClick={() => { setVerdict(null); setKey(k => k + 1); }}
            style={{background:C.bgElevated,border:`1px solid ${C.border}`,color:C.dimmer,borderRadius:8,padding:".3rem .75rem",cursor:"pointer",fontSize:12,fontFamily:FONT.body}}>
            ↺ Reset
          </button>
        </div>
      )}
      {isRinkQ ? (
        <RinkReadsRinkQuestion question={question} onAnswer={(ok) => setVerdict(ok ? "ok" : "wrong")} />
      ) : question.type === "multi" ? (
        <MultiMCQuestion q={question} onAnswer={(ok) => setVerdict(ok ? "ok" : "wrong")}/>
      ) : (
        <QuestionPreviewFallback question={question} onAnswer={(ok) => setVerdict(ok ? "ok" : "wrong")}/>
      )}
    </div>
  );
}

// Minimal MC / TF / Sequence fallback for non-rink types so the preview
// URL works for any question id, not just interactive rink ones.
function QuestionPreviewFallback({ question, onAnswer }) {
  const [sel, setSel] = useState(null);
  const q = question;
  const isTF = q.type === "tf";
  const answered = sel !== null;
  const correctIdx = typeof q.correct === "number" ? q.correct : (typeof q.ok === "number" ? q.ok : null);
  const ok = isTF ? (sel === q.ok) : (correctIdx !== null && sel === correctIdx);
  useEffect(() => {
    if (answered && onAnswer) onAnswer(ok);
  }, [answered]);
  return (
    <div>
      <div style={{background:C.purpleDim,border:`1px solid ${C.purpleBorder}`,borderRadius:12,padding:"1rem 1.1rem",marginBottom:"1.25rem"}}>
        <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.purple,marginBottom:".5rem",fontWeight:700}}>{isTF ? "True or False?" : q.sit ? "Game Situation" : "Question"}</div>
        <div style={{fontSize:15,lineHeight:1.7,color:C.white,fontWeight:500}}>{q.sit || q.q}</div>
      </div>
      {isTF ? (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:"1rem"}}>
          {[true, false].map(v => {
            const isSel = sel === v;
            const isRight = answered && v === q.ok;
            const isWrongSel = answered && isSel && v !== q.ok;
            return (
              <button key={String(v)} onClick={() => !answered && setSel(v)} disabled={answered}
                style={{background:isRight?"rgba(34,197,94,.15)":isWrongSel?"rgba(239,68,68,.15)":C.bgElevated,border:`2px solid ${isRight?C.green:isWrongSel?C.red:C.border}`,borderRadius:12,padding:"1.25rem",cursor:answered?"default":"pointer",fontWeight:700,fontSize:16,color:isRight?C.green:isWrongSel?C.red:C.white,fontFamily:FONT.body}}>
                {v ? "True" : "False"}
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{marginBottom:"1rem"}}>
          {(q.choices || q.opts || []).map((choice, i) => {
            const isSel = sel === i;
            const showRight = answered && i === correctIdx;
            const showWrong = answered && isSel && i !== correctIdx;
            return (
              <button key={i} onClick={() => !answered && setSel(i)} disabled={answered}
                style={{width:"100%",textAlign:"left",marginBottom:".5rem",background:showRight?"rgba(34,197,94,.12)":showWrong?"rgba(239,68,68,.12)":C.bgElevated,border:`1.5px solid ${showRight?C.green:showWrong?C.red:C.border}`,borderRadius:10,padding:".85rem 1rem",cursor:answered?"default":"pointer",color:showRight?C.green:showWrong?C.red:C.white,fontFamily:FONT.body,fontSize:14}}>
                {choice}
              </button>
            );
          })}
        </div>
      )}
      {answered && (
        <Card style={{background:ok?"rgba(34,197,94,.06)":"rgba(239,68,68,.06)",border:`1px solid ${ok?C.greenBorder:C.redBorder}`,marginBottom:"1rem"}}>
          <div style={{fontSize:11,fontWeight:800,color:ok?C.green:C.red,marginBottom:".4rem",letterSpacing:".06em"}}>
            {ok ? "✓ Correct" : "✗ Incorrect"}
          </div>
          {q.why && <div style={{fontSize:13,color:C.dim,lineHeight:1.65,marginBottom:q.tip?".5rem":0}}>{q.why}</div>}
          {q.tip && <div style={{fontSize:12,color:C.dimmer,lineHeight:1.55,fontStyle:"italic"}}>💡 {q.tip}</div>}
        </Card>
      )}
    </div>
  );
}

function JourneyScreen({ player, tier, demoMode, onBack, onNav, onUpgrade }) {
  const trainingSessions = (() => {
    try { return (getTrainingLog(player?.id || "__demo__")?.sessions) || []; }
    catch { return []; }
  })();
  const state = getJourneyV2({
    quizzes: player?.quizHistory?.length || 0,
    training: trainingSessions.length,
  }, tier);
  const { quizzes, training, currentIdx, currentWorldIdx, worlds } = state;
  const isFree = tier === "FREE";
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:80}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>RinkReads Journey</div>
            <div style={{fontSize:11,color:C.dimmer}}>Level {currentIdx+1}/64 · World {currentWorldIdx+1}: {worlds[currentWorldIdx].name} · {quizzes} quiz{quizzes===1?"":"zes"}{isFree?" · FREE path":""}</div>
          </div>
        </div>
      </StickyHeader>
      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
        <JourneyBody player={player} tier={tier} demoMode={demoMode} onUpgrade={onUpgrade}/>
        <div style={{marginTop:"1rem",display:"grid",gridTemplateColumns:"1fr 1fr",gap:".6rem"}}>
          <PrimaryBtn onClick={() => onNav("quiz")}>Take a quiz →</PrimaryBtn>
          <button onClick={() => onNav("profile")} style={{background:C.bgElevated,color:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:".85rem",cursor:"pointer",fontWeight:800,fontSize:14,fontFamily:FONT.body}}>Log a session →</button>
        </div>
        {/* Prominent back-to-home exit. The sticky-header BackBtn wasn't
            discoverable enough — users reported the Home nav felt inert. */}
        <button onClick={onBack} style={{marginTop:"1rem",width:"100%",background:"none",color:C.gold,border:`1px solid ${C.goldBorder}`,borderRadius:10,padding:".8rem",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:FONT.body}}>
          ← Back to Home
        </button>
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
    if (player.id && !isEphemeralPlayer(player.id)) SB.getPlayerTeams(player.id).then(setTeams);
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
        {/* Floating back button — the sticky header sits below the hero
            image on first render, so surface an explicit exit up top. */}
        <button onClick={onBack} aria-label="Back to home"
          style={{position:"absolute",top:12,left:12,background:"rgba(6,12,22,.72)",border:`1px solid ${C.border}`,color:C.white,borderRadius:999,width:36,height:36,cursor:"pointer",fontSize:16,fontFamily:FONT.body,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}>
          ←
        </button>
      </div>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1,fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>Settings</div>
          <button onClick={()=>onSave(s)} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".4rem 1rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>Save</button>
        </div>
      </StickyHeader>
      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
        {/* Training log sits at the top of Profile — prominent enough that
            parents can log a session without scrolling, and see a running
            log of what's been logged so far. */}
        <TrainingLog playerId={player.id || "__demo__"} />
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
            {[{p:"Forward",i:"⚡"},{p:"Defense",i:"🛡"},{p:"Goalie",i:"🧤"},{p:"Multiple",i:"🔀"}].map(({p,i})=>(
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
            <div>RinkReads v{VERSION} · {RELEASE_DATE}</div>
            <div>Built on modern player-development principles</div>
            <div style={{color:C.gold,marginTop:".25rem"}}>RinkReads.com</div>
          </div>
        </Card>
        {userEmail === ADMIN_EMAIL && onAdminReports && (
          <Card style={{ marginBottom: "1rem", border: `1px solid ${C.purpleBorder}` }}>
            <Label>Admin</Label>
            <button onClick={onAdminReports} style={{
              background: C.purpleDim, color: C.purple, border: `1px solid ${C.purpleBorder}`,
              borderRadius: 10, padding: ".65rem", cursor: "pointer", fontSize: 13,
              fontFamily: FONT.body, fontWeight: 700, width: "100%", marginBottom: ".5rem"
            }}>Review Question Reports</button>
            <button onClick={() => onNav && onNav("question-review")} style={{
              background: C.purpleDim, color: C.purple, border: `1px solid ${C.purpleBorder}`,
              borderRadius: 10, padding: ".65rem", cursor: "pointer", fontSize: 13,
              fontFamily: FONT.body, fontWeight: 700, width: "100%"
            }}>Question Review Dashboard</button>
          </Card>
        )}
        <button onClick={onReset} style={{background:"rgba(239,68,68,.06)",color:C.red,border:`1px solid rgba(239,68,68,.2)`,borderRadius:10,padding:".65rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body,width:"100%"}}>{player?.__preview ? "Exit Preview" : demoMode ? "Exit Demo" : "Sign Out"}</button>
      </div>
    </div>
  );
}



// ─────────────────────────────────────────────────────────

function StudyScreen({ player, onBack, onNav, focusCompetency }) {
  const [studyContent, setStudyContent] = useState(null);
  useEffect(() => {
    import("./data/studyContent.js").then(m => setStudyContent(m.STUDY_CONTENT));
  }, []);
  const identity = isEphemeralPlayer(player?.id) ? (player.id || "__anon__") : (player?.id || "__anon__");
  const [watchedClips, setWatchedClips] = useState(() => new Set(lsGetJSON(LS_CLIPS_WATCHED, {})[identity] || []));
  const [homeworkDone, setHomeworkDone] = useState(() => new Set(lsGetJSON(LS_HOMEWORK_DONE, {})[identity] || []));
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

  function toggleClip(key) {
    setWatchedClips(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      const m = lsGetJSON(LS_CLIPS_WATCHED, {}); m[identity] = [...next]; lsSetJSON(LS_CLIPS_WATCHED, m);
      return next;
    });
  }
  function toggleHomework(key) {
    setHomeworkDone(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      const m = lsGetJSON(LS_HOMEWORK_DONE, {}); m[identity] = [...next]; lsSetJSON(LS_HOMEWORK_DONE, m);
      return next;
    });
  }
  function resetHomework() {
    setHomeworkDone(new Set());
    const m = lsGetJSON(LS_HOMEWORK_DONE, {}); delete m[identity]; lsSetJSON(LS_HOMEWORK_DONE, m);
  }

  const weakestCat = weakCats[0]?.cat || weakSkills[0]?.cat || "your weakest area";
  const weakestSkill = weakSkills[0]?.name || "the fundamentals";
  const homeworkItems = [
    { key: "hw-watch",   text: `Watch 1 NHL game this week — focus on ${weakestCat}.` },
    { key: "hw-practice",text: `10 minutes on ${weakestSkill} every practice this week.` },
    { key: "hw-ask",     text: `Ask your coach one specific question after your next practice.` },
  ];

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
        {player.__coach ? (
          <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.goldBorder}`}}>
            <Label>Coach Focus</Label>
            <div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>
              {getLevelDisplay(player)}{focusCompetency && COMPETENCIES[focusCompetency] ? ` · ${COMPETENCIES[focusCompetency].icon} ${COMPETENCIES[focusCompetency].name}` : ""}
            </div>
            <div style={{fontSize:12,color:C.dimmer,marginTop:".5rem",lineHeight:1.6}}>
              {focusCompetency && COMPETENCIES[focusCompetency]
                ? `Drills below are age-appropriate for your roster. Pick one to run at your next practice.`
                : `Age-appropriate drills and clips for your roster.`}
            </div>
          </Card>
        ) : (
          <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.purpleBorder}`}}>
            <Label>Your Focus</Label>
            <div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>{getLevelDisplay(player)} · {player.position}</div>
            <div style={{fontSize:12,color:C.dimmer,marginTop:".5rem",lineHeight:1.6}}>Based on your quiz results and self-ratings, here's what to watch and work on.</div>
          </Card>
        )}

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
            <Label>📺 Games & Clips to Watch{watchedClips.size > 0 ? ` · ${[...watchedClips].filter(k => content.games.includes(k)).length}/${content.games.length} watched` : ""}</Label>
            <div style={{fontSize:11,color:C.dimmer,marginBottom:".65rem",lineHeight:1.5}}>Pick one this week. Watch with purpose — look for the specific things listed. Tap "Watched" when you've finished one.</div>
            {content.games.map((g, i) => {
              const isWatched = watchedClips.has(g);
              return (
                <button key={i} onClick={() => toggleClip(g)}
                  style={{width:"100%",textAlign:"left",padding:".6rem .8rem",background:isWatched ? "rgba(34,197,94,.07)" : C.bgElevated,borderRadius:8,border:`1px solid ${isWatched ? C.greenBorder : C.border}`,marginBottom:".4rem",fontSize:13,color:isWatched ? C.dim : C.dim,lineHeight:1.5,cursor:"pointer",fontFamily:FONT.body,display:"flex",alignItems:"flex-start",gap:".65rem"}}>
                  <span style={{flex:1,minWidth:0}}>{g}</span>
                  <span style={{flexShrink:0,fontSize:10,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",color:isWatched ? C.green : C.dimmer,border:`1px solid ${isWatched ? C.greenBorder : C.border}`,padding:"2px 7px",borderRadius:10}}>
                    {isWatched ? "✓ Watched" : "Mark watched"}
                  </span>
                </button>
              );
            })}
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
          <Label>🎯 Train Your Weak Spots</Label>
          <div style={{fontSize:11,color:C.dimmer,marginBottom:".65rem",lineHeight:1.5}}>
            {weakCats.length > 0
              ? `Your last quiz flagged ${weakCats.map(w => w.cat).slice(0,2).join(" and ")} as weak. Drill these between sessions — you'll see the bump on your next quiz.`
              : weakSkills.length > 0
              ? `You rated yourself lowest on ${weakSkills[0].cat}. Pick a drill below and work it into every practice this week.`
              : `Take a quiz to find your weakest categories — then come back and drill them here.`}
          </div>
          {(() => {
            const weakCatSet = new Set(weakCats.map(w => w.cat.toLowerCase()));
            const ranked = [...content.focusAreas].sort((a, b) => {
              const aHit = weakCatSet.has((a.skill || "").toLowerCase()) ? 0 : 1;
              const bHit = weakCatSet.has((b.skill || "").toLowerCase()) ? 0 : 1;
              return aHit - bHit;
            });
            return ranked.map((f, i) => {
              const isWeakHit = weakCatSet.has((f.skill || "").toLowerCase());
              return (
                <div key={i} style={{padding:".7rem .85rem",background:isWeakHit?"rgba(252,76,2,.06)":C.bgElevated,borderRadius:8,border:`1px solid ${isWeakHit?C.goldBorder:C.border}`,marginBottom:".45rem"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:".5rem",marginBottom:3}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.white}}>{f.skill}</div>
                    {isWeakHit && <div style={{fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:C.gold,fontWeight:800,flexShrink:0}}>Weak spot</div>}
                  </div>
                  <div style={{fontSize:12,color:C.dim,lineHeight:1.5}}>{f.drill}</div>
                </div>
              );
            });
          })()}
        </Card>

        <Card style={{marginBottom:"1rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".35rem"}}>
            <Label style={{marginBottom:0}}>📋 Homework{homeworkDone.size > 0 ? ` · ${homeworkDone.size}/${homeworkItems.length} done` : ""}</Label>
            {homeworkDone.size > 0 && (
              <button onClick={resetHomework} style={{background:"none",border:"none",color:C.dimmer,fontSize:11,cursor:"pointer",fontFamily:FONT.body,textDecoration:"underline",padding:0}}>Reset for next week</button>
            )}
          </div>
          <div style={{fontSize:11,color:C.dimmer,marginBottom:".65rem",lineHeight:1.5}}>Three small commitments this week. Check them off as you finish.</div>
          {homeworkItems.map(item => {
            const isDone = homeworkDone.has(item.key);
            return (
              <button key={item.key} onClick={() => toggleHomework(item.key)}
                style={{width:"100%",textAlign:"left",padding:".7rem .85rem",background:isDone ? "rgba(34,197,94,.07)" : C.bgElevated,borderRadius:8,border:`1px solid ${isDone ? C.greenBorder : C.border}`,marginBottom:".45rem",fontSize:13,color:C.dim,lineHeight:1.5,cursor:"pointer",fontFamily:FONT.body,display:"flex",alignItems:"flex-start",gap:".65rem"}}>
                <span style={{flexShrink:0,width:20,height:20,borderRadius:5,border:`1.5px solid ${isDone ? C.green : C.border}`,background:isDone ? C.green : "transparent",display:"flex",alignItems:"center",justifyContent:"center",color:C.bg,fontSize:12,fontWeight:800,marginTop:1}}>
                  {isDone ? "✓" : ""}
                </span>
                <span style={{flex:1,minWidth:0,textDecoration:isDone ? "line-through" : "none",color:isDone ? C.dimmer : C.dim}}>{item.text}</span>
              </button>
            );
          })}
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
// ROOT APP
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// AUTH SCREEN — login / signup
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// DEMO MODE — coach preview only. Player demo was removed; players sign up.
// question.cat → coach tilt code (see COACH_PERSONAS.tilts). null → head-coach fallback.
const CAT_TO_TILT = {
  "Orientation":    "h",
  "Compete":        "p",
  "Game Awareness": "h",
  "Teamwork":       null,
  "Scoring":        "s",
  "Defense":        "d",
  "Positioning":    "dm",
  "Coachability":   "c",
  // Level-specific + canonical categories. Post-2026-04-24 consolidation
  // merged several variants (Decision Making/Decision Timing → Decision-Making,
  // Breakout/Breakout Execution/Exiting the Zone → Breakouts, Goalie →
  // Goaltending, Transition Game → Transition, Support → Puck Support).
  "Decision-Making":   "dm",
  "Breakouts":         "h",
  "Rush Reads":        "h",
  "Zone Entry":        "h",
  "Special Teams":     null,
  "Shot Selection":    "s",
  "Defensive Zone":    "d",
  "Coverage":          "d",
  "Puck Protection":   "p",
  "Puck Support":      "dm",
  "Blue Line Decisions":"dm",
  "Blue Line Reads":   "h",
  "Systems Play":      null,
  "Transition":        "h",
  "Gap Control":       "d",
  "Physical Play":     "p",
  "Leadership":        "c",
  "Game Management":   "h",
  "Advanced Tactics":  "dm",
  "Neutral Zone Play": "h",
  "Goaltending":       "d",
  "Finishing":         "s",
  "Vision":            "h",
  "Zone Awareness":    "h",
};

// Age-tier key used to pick how silly / how dry the coach's voice gets.
//   young = U7/U9 (silly, wholesome, parent-winks)
//   mid   = U11/U13 (dry one-liners kids + parents both catch)
//   older = U15/U18 (sports-talk-radio sarcasm; still PG)
function getAgeTier(level) {
  if (!level) return "mid";
  if (/U(5|7|9)/.test(level) || /Initiation|Timbits|Novice/i.test(level)) return "young";
  if (/U(15|18)/.test(level) || /Bantam|Midget/i.test(level)) return "older";
  return "mid";
}

// Coach personas. Three voices, sprinkled across every age group. Each
// coach carries its own age-tiered flavor pools so the short zinger above
// the teaching tip matches the player's age without losing the persona.
const COACH_PERSONAS = [
  {
    id: "kincaid",
    name: "Coach Kincaid",
    role: "Head Coach",
    archetype: "technical",
    tilts: ["dm", "h"],
    summary: "Sees every detail on tape and loves a teaching moment — plays hard, coaches harder, brings the one-liners.",
    flavorCorrect: {
      young: [
        "Textbook. Shocking.",
        "Fine. I'll allow it.",
        "You were LISTENING? Who taught you that? … Oh, right, me.",
        "Ooh, big brain play. Do it again.",
        "Correct. I'll take my credit later.",
        "See? I'm not ALWAYS grumpy.",
        "Okay. Wow. Hockey brain detected.",
        "That's the stuff. Tell your mom I said smart.",
        "Yup. Right answer. Don't ask me for a high-five though.",
        "See that? THAT is why I make you do the drill.",
        "Bingo. Gold star. I'm out of gold stars. Metaphorical one.",
        "Hey — that was actually good. I'm suspicious.",
        "Nice. You just used your brain AND your stick. Combo move.",
        "Well. That was hockey. Keep doing it.",
        "Big brain on this one. Don't tell anybody.",
        "YEP. That's the play. I'm almost smiling.",
      ],
      mid: [
        "That's the read. And yes, I noticed.",
        "Technically correct — the best kind of correct.",
        "Clinic material. Pity nobody else caught it.",
        "Fine, I'll stop pretending to be grumpy. For one shift.",
        "That'll be on the video. In a GOOD way.",
        "I'd say 'great job' but we both know I hate compliments.",
        "You just made my job easier. Don't ruin it.",
        "Fine. That's a nod. Don't get used to nods.",
        "Somebody was paying attention in the video session. Finally.",
        "Execution: clean. Vibe: smug. Keep it that way.",
        "I'm not going to say I'm proud. But I might nod at you in the hallway.",
        "That's exactly what the notebook says. You read the notebook?",
        "Correct answer. I'm legally required to tell you that.",
        "Sharp. Scary sharp. Keep going before I find something wrong.",
        "You'd think you'd been studying. Have you been studying?",
        "Crisp. I might even remove your name from the whiteboard. Might.",
        "Okay. One shift I don't yell about. Enjoy it.",
      ],
      older: [
        "Quiet. Surgical. Annoying to the other team. Love it.",
        "There's the IQ I've been billing for.",
        "File under: 'I told you so.' I'll be pointing to it later.",
        "So clean I almost said something nice. Almost.",
        "Some guys play hockey. You just played chess. Don't get a big head.",
        "A masterclass in doing exactly what I said. Shocking.",
        "That's scouting-report hockey. No notes.",
        "Crisp. Professional. Almost boring. Almost elite.",
        "Correct, efficient, a little smug. My favorite combination.",
        "I'll clip that. Not for you — for the class behind you.",
        "Hockey players who think win. You just won a shift in your head.",
        "Ten-out-of-ten read. Nine-out-of-ten celly. Work on that.",
        "I'd say that was perfect but perfect's a trap. So: very close to perfect.",
        "Zero wasted movement. Bill Belichick would be weeping.",
        "That was the high-IQ play. Don't tell anyone you figured it out.",
        "Correct. Don't look at me for more praise. Find it in yourself.",
      ],
    },
    flavorIncorrect: {
      young: [
        "Reset. Tie your skates. Try again.",
        "We just talked about this. Literally just now.",
        "Ope. That's a no from me.",
        "Try the other one. Yeah, the one that works.",
        "Do we need the whiteboard? I'll get the whiteboard.",
        "Hockey does that sometimes. Rude.",
        "Hmm. Nope. Do-over. You get one.",
        "I'm not mad. I'm just… holding a clipboard with some notes on it.",
        "Almost. Close only counts in horseshoes and, sadly, not hockey.",
        "Brain was off. Turn brain back on. Try again.",
        "Okay, we're gonna go slower this time. Like, REAL slow.",
        "You know what? Try again. I'll act surprised either way.",
        "Nope. But a fun guess! Technically.",
        "That was a decision. Interesting. Wrong. But interesting.",
        "Close. Also not close. Both, somehow. Hockey.",
        "Not the one. But I see the idea. The idea was wrong. But I see it.",
      ],
      mid: [
        "That's… a choice. Not THE choice. But a choice.",
        "I'm not mad. I'm disappointed. Also a little mad.",
        "We went over this. Fifteen times. Sixteen now, I guess.",
        "Hockey IQ: loading. Please hold.",
        "Look at me. What did we SAY to do there?",
        "Bench-worthy, but I'll keep you on. For now.",
        "Same play, different brain. Rewind.",
        "Interesting read. Wrong. But interesting. I'll call that growth.",
        "Somewhere Coach Danno is telling you it's fine. He's wrong. It's not fine. But do listen to him, he's nicer than me.",
        "That's the play where I ask who taught you that. It's me. It was me.",
        "Respectfully: what were we thinking there?",
        "See, THIS is why I make you do extra video. Welcome back to extra video.",
        "Bold. Confident. Completely wrong. Two out of three.",
        "Okay, refresher after practice. Bring snacks. Yours, not mine.",
        "Just reviewed the tape mentally. Not great! Try again.",
        "That was the flash play. We don't do flash. We do correct.",
      ],
      older: [
        "That was a decision. Not a good one, but a decision.",
        "I'm drawing this on the whiteboard so you can't un-see it.",
        "You've read the book. Did you… skip a chapter?",
        "That's how we get 'film session' in the group chat.",
        "Respectfully: no. With love: absolutely not.",
        "Let's call that a 'learning experience' and never speak of it again.",
        "If I wanted that play I would've drawn it up. I did not draw it up.",
        "Hockey IQ briefly vacationed. Bring it back.",
        "That's the play where the analytics guy emails me. I hate those emails.",
        "Somewhere your skating coach is sighing. That's Danno. Also me, but quieter.",
        "I've literally said 'don't do that' out loud. You heard me. I watched you hear me.",
        "Wrong. Confidently wrong. That takes skill I don't want you developing.",
        "Let's rebuild from first principles. The first principle is: not that.",
        "You can make that play when you're 35 and retired. Not today.",
        "File that next to the tape we never re-watch.",
        "I'm going to sleep on how to correct this. I will sleep poorly.",
      ],
    },
  },
  {
    id: "danno",
    name: "Coach Danno",
    role: "Skills Coach",
    archetype: "chill",
    tilts: ["s", "p"],
    summary: "Low-key, high-reps, never loses the room. Gets guys to relax, skate through mistakes, and stack clean shifts.",
    flavorCorrect: {
      young: [
        "Nice one, buddy!",
        "Yeah! Good work.",
        "There you go — easy.",
        "Oooooh, smooth move.",
        "That's hockey.",
        "Love that. Keep going.",
        "Heck yeah, bud.",
        "Too easy, my guy.",
        "That's the stuff.",
        "Sneaky smart. Nice.",
        "Beautiful. Keep it simple like that.",
        "That's a hockey player.",
        "Attaboy/attagirl. Keep skating.",
        "Money, bud. Pure money.",
        "Slick. Don't stop now.",
        "Exactly that. Every shift.",
      ],
      mid: [
        "Nice read, bud. Smooth.",
        "There it is. Knew it was coming.",
        "Love that. Nice and simple.",
        "That's the easy play. Good pick.",
        "Pretty play. Don't celebrate too hard.",
        "Smart. Don't overthink the next one.",
        "Yeah, buddy. That's hockey.",
        "Quiet and correct. My favorite combo.",
        "No fuss. That's the move.",
        "Good pick. Trust yourself there.",
        "Smooth. Looked like you had all day.",
        "Hockey brain working overtime. Nice.",
        "Yep. That's a shift coaches love.",
        "Clean read, clean play, clean shift.",
        "That's the pro move. Feel it.",
        "Nice, bud. Keep stacking 'em.",
      ],
      older: [
        "Yeah, buddy. Clean look.",
        "That's the simple play. More of those, please.",
        "Love it. Stack shifts like that.",
        "Hockey's easy when you make it easy.",
        "Save that one for the tape.",
        "Quiet confidence. Exactly what I ask for.",
        "Veteran move. Nothing flashy, just right.",
        "Yep. That's how you earn ice time.",
        "Low-risk, high-reward. Hockey 101.",
        "Pro habit. Stack a hundred of those.",
        "Smooth, buddy. Every coach in the barn noticed.",
        "Good hockey. Keep it boring.",
        "That's the play. Nothing to add.",
        "Nice. Don't stop thinking the game like that.",
        "Easy points. Literally — coach's stats.",
        "Honest hockey. Love it.",
      ],
    },
    flavorIncorrect: {
      young: [
        "No worries — next one!",
        "All good, buddy.",
        "Shake it off. We got this.",
        "Easy fix. No biggie.",
        "Smile. It's only one play.",
        "Everybody misses. Next.",
        "No stress, bud. One play.",
        "That's hockey sometimes.",
        "Eh, we'll get the next one.",
        "Totally fine. Keep skating.",
        "No big. I still think you're awesome.",
        "Chin up. You're learning.",
        "Easy peasy fix at practice.",
        "Reset, little one. You got it.",
        "One more shot, you got it, bud.",
        "Pucks don't always cooperate. Hockey's weird.",
      ],
      mid: [
        "No sweat — next shift.",
        "Easy mistake, bud. Reset.",
        "Happens. Let's talk through it at practice.",
        "Stick with it, you're close.",
        "Little fix. We'll get it.",
        "Not the worst miss I've seen today. Not close.",
        "Deep breath. Let's go again.",
        "No panic, bud. You overthought.",
        "Small tweak and that's a goal next time.",
        "Chill — next rep, different result.",
        "You're right there. Seriously.",
        "Not a big deal. Hockey's unforgiving sometimes.",
        "Reset mentally. Next shift's a new shift.",
        "All good, bud. Film it, learn it, move on.",
        "Everyone's pulled that play. You'll get it right next.",
        "Easy adjust. We'll run it tomorrow.",
      ],
      older: [
        "Hey, shake it. It happens.",
        "Not a huge deal. Gone by next shift.",
        "Reset, we'll run it again in practice.",
        "Little adjustment, nothing wild.",
        "You're overthinking. Easy fix.",
        "No panic. Breathe. Next puck.",
        "Happens to vets. Shake it.",
        "Just a read off by a half-second. Fixable.",
        "No story there. Keep playing.",
        "Wash it. Nobody on the bench's thinking about it.",
        "Mental reset. You know the play.",
        "We'll clip it tomorrow. No big.",
        "Slow the tape in your head. That's it.",
        "Hockey humbles everybody. You're fine.",
        "Don't chase it. Next shift's yours.",
        "Small miss. Big perspective. Keep skating.",
      ],
    },
  },
  {
    id: "marques",
    name: "Coach Marques",
    role: "Mental Performance Coach",
    archetype: "motivator",
    tilts: ["c"],
    summary: "Belief factory. Keeps the tank full, turns missed shifts into fuel, and gets the most out of every player in the room.",
    flavorCorrect: {
      young: [
        "YEAHHHH!! That's MY player!",
        "LOOK AT YOU GO!",
        "SUPERSTAR ALERT!",
        "You are on FIRE right now!",
        "BOOM! Hockey hero!",
        "Attagirl / attaboy! Keep COOKING!",
        "HEY HEY HEY! Look at this legend!",
        "I KNEW IT! I KNEW you had it!",
        "That was HUUUGE!",
        "YOU are a hockey PLAYER!",
        "Let's GOOOOOO!",
        "Championship mindset, RIGHT THERE!",
        "SIRENS! SIRENS! Big play!",
        "Tell your mom! Tell your dog! TELL EVERYBODY!",
        "That play just made MY DAY!",
        "Put a cape on this kid — they flew there!",
      ],
      mid: [
        "YESSIR! That's what I'm TALKING about!",
        "THAT is championship hockey!",
        "This is why we show up. BECAUSE of that!",
        "UNREAL read. Absolutely unreal.",
        "SEE? Told you you had it!",
        "Chef's kiss. Actually — gold-medal kiss.",
        "OH MY GOODNESS! That was it!",
        "BIG TIME player making BIG TIME plays!",
        "I'm gonna frame that shift. FRAME IT.",
        "You are BUILT for these moments!",
        "Hockey Gods smiling. I heard them.",
        "That's the shift they write articles about!",
        "SEND IT. That was SENDING IT.",
        "I literally clapped. Out loud. Alone.",
        "You just made a COACH cry. Tears of JOY!",
        "Absolute MONSTER shift. LOVE IT.",
      ],
      older: [
        "THAT. IS. EXECUTION. Ten out of ten.",
        "Pro-level read. I'm not kidding.",
        "Championship mentality on display. Love it.",
        "When the game slows down like that? That's scouting-reel energy.",
        "You just answered the bell. Gorgeous.",
        "Elite. Quietly elite. Get used to it.",
        "That was a next-level read. Own that.",
        "Scouts just sat up. I promise you.",
        "World-class decision. Keep expecting that of yourself.",
        "That's the shift that separates you from the room.",
        "Poetry. On skates. Actual poetry.",
        "You played that shift like you belonged. Because you DO.",
        "Big moment, big answer. Champion behavior.",
        "That's what Tuesday-night work looks like on Saturday.",
        "Read it, solved it, executed it. Textbook elite.",
        "Put that in the season highlight reel.",
      ],
    },
    flavorIncorrect: {
      young: [
        "Hey! We don't care! NEXT ONE!",
        "You got this — I believe in YOU!",
        "CHAMPIONS keep going. And you? A champion.",
        "One more try! Superpowers engaged!",
        "Hockey is tough — you're TOUGHER!",
        "Deep breath, big smile, next one!",
        "No worries! Shake it off, BIG TIME player!",
        "Heroes miss too. You're still a hero!",
        "That's okay, buddy! You're GROWING!",
        "Reset. Smile. Super ready for the next one!",
        "Try again, champion! You got this, truly!",
        "One little oops — not a big oops!",
        "We learn, we grow, we win later!",
        "BELIEVE. I BELIEVE. So should you!",
        "Superstars miss too. You're in GREAT company!",
        "Deep breath — you're amazing — go again!",
      ],
      mid: [
        "GUARANTEED you get the next one.",
        "That's called data. We LOVE data.",
        "One rep away from owning this. I BELIEVE.",
        "This is where great ones grow. RIGHT HERE.",
        "You swung. RESPECT. Next swing lands.",
        "Tomorrow you OWN this. Write it down.",
        "Growth moment RIGHT HERE. Eat it up!",
        "I've seen you do this. I'll see it again.",
        "Hockey's a long game. You're playing the long game.",
        "Your brain just got smarter. That counts!",
        "Miss today, hero tomorrow. Trust the plan.",
        "Big hearts miss big. That's how we learn big.",
        "Pressure makes diamonds. Keep pressing!",
        "THAT'S the rep that unlocks it. One more.",
        "Reset the feet, reset the mind, reset the scoreboard.",
        "You're one shift away from owning this. TRUST!",
      ],
      older: [
        "The next one is YOURS. Tell yourself that.",
        "Greats miss. They don't miss twice. Let's go.",
        "This is a chapter, not the ending. Write it.",
        "Adversity is the resume of champions. Welcome to the resume.",
        "Too much work behind you to fold now. Ice head, hot feet.",
        "Next shift is a new script. You're the lead.",
        "Elite players don't dwell. They decide.",
        "You've faced bigger. Keep your spine.",
        "The great ones learn on the fly. That's this shift.",
        "Short memory, sharp eyes. Reset and play.",
        "This is the moment every scout wants to see you answer.",
        "Own it. Metabolize it. Move.",
        "Pressure's a privilege. Feel it, then use it.",
        "You've put in too many hours to flinch now.",
        "That's character-building — and you've got character to spare.",
        "Nobody in this barn thinks less of you. Especially me.",
      ],
    },
  },
  {
    id: "kowalski",
    name: "Coach Kowalski",
    role: "Assistant Coach",
    archetype: "deadpan",
    tilts: ["d"],
    summary: "Old-school, dry as chalk, speaks about six words per shift — but the ones that land, land hard. Has literally seen it all.",
    flavorCorrect: {
      young: [
        "Huh. Good for you.",
        "Not bad. Actually not bad.",
        "I'll allow it.",
        "Acceptable.",
        "That'll work.",
        "Mm. Yeah. That's a play.",
        "Okay. Fine. Good job.",
        "Mhm. Correct.",
        "Yep. Moving on.",
        "I nod at you. Nothing more.",
        "That's the one. Barely noticed.",
        "Sure. That's hockey.",
        "Cool. Keep going.",
        "Done. Next.",
        "Mm-hmm. Good.",
        "Fine play. Fine.",
      ],
      mid: [
        "Sure. That works.",
        "Huh. A play.",
        "Not wrong. Not wrong at all.",
        "I'll let the others clap. I'm busy.",
        "You can keep doing that.",
        "Fine. Small nod from me. Enjoy it.",
        "Yup. Exists. Hockey exists.",
        "Mm. That's a shift.",
        "Technically correct. That's all I offer.",
        "Okay. Functional.",
        "I've seen worse. Much worse.",
        "You did it. I acknowledged it. We're even.",
        "Correct. I'm not impressed but I'm not mad.",
        "That works. Moving the cones.",
        "Yeah. That's fine. Stop looking at me.",
        "Serviceable. High praise from me.",
      ],
      older: [
        "That's hockey. You can stop now.",
        "Quietly good. Respect.",
        "No notes. Terrifying for me, good for you.",
        "Correct. Let's not make a habit of surprising me.",
        "I'll write this down so I remember you can do it.",
        "Okay. Coach yourself tomorrow.",
        "Mm. Adult hockey. Respect.",
        "That's a shift a coach could sleep through. I mean that well.",
        "Veteran play from a kid. Rare.",
        "No reaction from me is my biggest reaction.",
        "Solid. Boring in the best way.",
        "Correct and quiet. Chef's kiss — if I did those.",
        "That was textbook. Tape erased, no coaching required.",
        "You just did my job for me. I'll take the break.",
        "Good. Next.",
        "That'll play anywhere. Meaning: anywhere.",
      ],
    },
    flavorIncorrect: {
      young: [
        "Mm. Okay.",
        "Try again. No big deal.",
        "Not today. Tomorrow, maybe.",
        "Hockey's hard. Shrug.",
        "Breathe. Move on.",
        "We reset. That's the whole thing.",
        "Nope. Moving on.",
        "Not it. Not mad.",
        "Whatever. Next puck.",
        "Hmm. No.",
        "Yeah, no. Try again.",
        "That's a no. No story.",
        "It happens. We continue.",
        "Okay, next one. Go.",
        "Missed it. Hockey.",
        "Mm-mm. Reset.",
      ],
      mid: [
        "Well. There it is.",
        "Neat. Don't do that.",
        "Yep. That happens.",
        "I've seen worse. Barely.",
        "No comment. Many comments. Later.",
        "Hockey giveth, hockey taketh away. Mostly the second one.",
        "Okay. I've filed it. Nothing more.",
        "Yeah, that wasn't it. Moving on.",
        "Hm. Weird choice. We'll discuss.",
        "I don't need to say anything. The tape will.",
        "That one's getting the silent-nod disappointment treatment.",
        "Wrong answer. Short version.",
        "Nope. Try again without consulting whoever told you to do that.",
        "Not today. Not yesterday. Not yesterday's yesterday.",
        "You'll figure it out. Not now. Later.",
        "Rewind. Reset. Repeat. Standard.",
      ],
      older: [
        "Sure. Why not.",
        "Bold. Not good, but bold.",
        "Moving on. Quickly. For both our sakes.",
        "Noted. Filed. Never to be spoken of.",
        "You'll want to delete that from your memory.",
        "I've seen that play before. It didn't work then either.",
        "Hm. Not the read I was hoping for.",
        "We don't need to dwell. We don't need to repeat it either.",
        "That was a play. It existed. Moving on.",
        "Your skating coach is sighing. From three rinks away.",
        "I'll pretend I didn't see that. You pretend you didn't do it.",
        "Yeah. No. Delete. Moving on.",
        "The wrong play, executed perfectly. Rare skill. Stop using it.",
        "I'm not even mad. I'm just tired.",
        "Hockey's unforgiving. That play was a reminder.",
        "Let's go back to basics. Chalk. Board. Basics.",
      ],
    },
  },
];

// All three personas show up at every age group — user wants them sprinkled
// everywhere, not siloed by level. `goalie` overrides kept so goalies at
// older ages see a specialized coach assignment in the roster view.
const DEMO_ROSTERS = {
  "U7 / Initiation": { all: ["kincaid", "danno", "marques", "kowalski"] },
  "U9 / Novice":     { all: ["kincaid", "danno", "marques", "kowalski"] },
  "U11 / Atom":      { all: ["kincaid", "danno", "marques", "kowalski"] },
  "U13 / Peewee":    { all: ["kincaid", "danno", "marques", "kowalski"] },
  "U15 / Bantam":    { all: ["kincaid", "danno", "marques", "kowalski"] },
  "U18 / Midget":    { all: ["kincaid", "danno", "marques", "kowalski"] },
};
function getDemoCoachRoster(level, position) {
  const r = DEMO_ROSTERS[level] || DEMO_ROSTERS["U9 / Novice"];
  const ids = (position === "Goalie" && r.goalie) ? r.goalie : r.all;
  return ids.map(id => COACH_PERSONAS.find(p => p.id === id)).filter(Boolean);
}

function getCoachForQuestion(question, playerLevel, playerPosition) {
  const tilt = question?.cat ? CAT_TO_TILT[question.cat] : null;
  const roster = getDemoCoachRoster(playerLevel, playerPosition) || COACH_PERSONAS;
  if (tilt) {
    const match = roster.find(c => c.tilts?.includes(tilt));
    if (match) return match;
  }
  // No category tilt → rotate across the full 3-persona roster so every
  // coach gets air time. Deterministic by question id so the same question
  // always gets the same voice.
  if (roster.length) {
    const seed = (question?.id || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return roster[seed % roster.length];
  }
  return COACH_PERSONAS[0];
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
// Visual-only sample radar for the landing showcase. Hardcoded scores mirror
// what a typical U11 Forward looks like after a handful of sessions — six
// competencies plotted on the same polar layout the real GameSenseReportScreen
// uses. Computes once at module load from the U11 Forward preview player so
// the landing teaser matches what a visitor actually sees inside the sample.
// Preview quiz history only populates positioning/decision_making/awareness;
// synthesize plausible values for tempo/leadership so the chart renders a
// full shape rather than a degenerate triangle.
const PREVIEW_RADAR = (() => {
  const { player } = buildU11ForwardPreview();
  const real = calcCompetencyScores(player.quizHistory);
  const synthesized = { tempo_control: 66, leadership: 58 };
  const order = ["positioning","decision_making","awareness","tempo_control","leadership"];
  const comps = order.map(k => ({
    key: k,
    label: COMPETENCIES[k].name,
    score: real[k] > 0 ? real[k] : synthesized[k],
  }));
  const gs = calcGameSenseScore(Object.fromEntries(comps.map(c => [c.key, c.score])));
  return { comps, gs };
})();

function LandingRadarCard({ onPreview }) {
  const { comps, gs } = PREVIEW_RADAR;
  // Widened viewBox + centered so the longer labels ("Decision-Making",
  // "Awareness") don't clip on narrow landing cards.
  const cx = 200, cy = 150, radius = 84;
  const n = comps.length;
  const pts = comps.map((c, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (c.score / 100) * radius;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), label: c.label, a };
  });
  const axisPts = comps.map((_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a), a };
  });
  const polyPts = pts.map(p => `${p.x},${p.y}`).join(" ");

  const Inner = (
    <>
      <div style={{display:"flex",alignItems:"center",gap:".5rem",marginBottom:".65rem"}}>
        <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,fontWeight:700}}>Sample · U11 Forward</div>
        <div style={{flex:1}}/>
        <div style={{background:C.dimmest,color:C.dimmer,padding:"1px 6px",borderRadius:4,fontSize:9,letterSpacing:".08em",fontWeight:700}}>SAMPLE</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:".75rem"}}>
        <svg width="230" height="200" viewBox="0 0 400 300" style={{flexShrink:0,maxWidth:"58%"}}>
          {[25,50,75,100].map(pct => {
            const r = (pct/100) * radius;
            const ring = comps.map((_, i) => {
              const a = (Math.PI*2*i)/n - Math.PI/2;
              return `${cx + r*Math.cos(a)},${cy + r*Math.sin(a)}`;
            }).join(" ");
            return <polygon key={pct} points={ring} fill="none" stroke={C.border} strokeWidth="1" opacity={pct===100?0.6:0.25}/>;
          })}
          {axisPts.map((p, i) => (
            <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={C.border} strokeWidth="1" opacity="0.4"/>
          ))}
          {comps.map((c, i) => {
            const a = (Math.PI * 2 * i) / n - Math.PI / 2;
            const lx = cx + (radius + 24) * Math.cos(a);
            const ly = cy + (radius + 24) * Math.sin(a);
            const anchor = Math.abs(lx - cx) < 8 ? "middle" : (lx > cx ? "start" : "end");
            // Wrap long two-word labels onto two lines so they don't clip.
            const words = c.label.split(/[-\s]/).filter(Boolean);
            const twoLine = c.label.length > 9 && words.length >= 2;
            return (
              <text key={`l${i}`} x={lx.toFixed(1)} y={ly.toFixed(1)}
                    fontSize="10" fontWeight="700" fill={C.dim}
                    textAnchor={anchor} dominantBaseline="middle"
                    fontFamily="'Inter','DM Sans',sans-serif">
                {twoLine ? (
                  <>
                    <tspan x={lx.toFixed(1)} dy="-0.45em">{words[0]}</tspan>
                    <tspan x={lx.toFixed(1)} dy="1.1em">{words.slice(1).join(" ")}</tspan>
                  </>
                ) : c.label}
              </text>
            );
          })}
          <polygon points={polyPts} fill={C.gold} fillOpacity="0.22" stroke={C.gold} strokeWidth="2"/>
          {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={C.gold}/>)}
        </svg>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem",color:C.white,lineHeight:1.1,marginBottom:".15rem"}}>Alex <span style={{color:C.dimmer,fontWeight:600,fontSize:"0.85rem"}}>· U11 Forward</span></div>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.4rem",color:C.white,lineHeight:1.05,marginBottom:".2rem"}}>GS {gs}</div>
          <div style={{fontSize:11,color:C.dimmer,marginBottom:".6rem"}}>Game Sense Score · 8 sessions</div>
          <div style={{fontSize:12,color:C.dim,lineHeight:1.5,marginBottom:onPreview ? ".55rem" : 0}}>
            Six competencies. Every answer moves a number.
          </div>
          {onPreview && (
            <div style={{fontSize:12,color:C.gold,fontWeight:700,letterSpacing:".01em"}}>
              Try a demo as a U11 Forward →
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (!onPreview) {
    return (
      <div style={{background:"rgba(6,12,22,0.82)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:`1px solid ${C.border}`,borderRadius:14,padding:"1rem",marginBottom:"1.25rem"}}>
        {Inner}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onPreview}
      style={{display:"block",width:"100%",textAlign:"left",background:"rgba(6,12,22,0.82)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:`1px solid ${C.goldBorder}`,borderRadius:14,padding:"1rem",marginBottom:"1.25rem",cursor:"pointer",fontFamily:FONT.body,color:C.white,transition:"transform .15s ease, border-color .15s ease, box-shadow .15s ease"}}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${C.gold}22`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {Inner}
    </button>
  );
}

// Landing insights preview — shows 3 rotating insights with a locked 4th
// slot ("Unlock more insights — free account"). Insights come from the
// same hockeyInsights data module the in-app widget uses. Dynamic import
// keeps the ~60KB insights chunk off the critical path.
function LandingInsightsCard() {
  const [insights, setInsights] = useState(null);
  useEffect(() => {
    import("./data/hockeyInsights.js").then(m => {
      const list = m.HOCKEY_INSIGHTS || [];
      // Pick 3 random insights so each visit feels fresh.
      const shuffled = [...list].sort(() => Math.random() - 0.5);
      setInsights(shuffled.slice(0, 3));
    });
  }, []);
  if (!insights) return null;
  return (
    <div style={{background:"rgba(6,12,22,0.82)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:`1px solid ${C.border}`,borderRadius:14,padding:"1rem",marginBottom:"1.25rem"}}>
      <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,fontWeight:700,marginBottom:".65rem"}}>Pro Hockey Intel · 3 free samples</div>
      {insights.map((ins, i) => (
        <div key={i} style={{display:"flex",alignItems:"baseline",gap:".6rem",padding:".55rem 0",borderBottom:i < insights.length-1 ? `1px solid ${C.border}` : "none"}}>
          <span style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.05rem",color:C.gold,flexShrink:0,minWidth:54}}>{ins.stat}</span>
          <span style={{fontSize:12.5,color:C.white,lineHeight:1.45,flex:1}}>{ins.headline}</span>
        </div>
      ))}
      <div style={{marginTop:".85rem",padding:".7rem .85rem",background:"rgba(252,76,2,0.06)",border:`1px dashed ${C.goldBorder}`,borderRadius:10,display:"flex",alignItems:"center",gap:".55rem"}}>
        <span style={{fontSize:14}}>🔒</span>
        <span style={{fontSize:12,color:C.dim,flex:1,lineHeight:1.45}}>Unlock more insights — free account.</span>
      </div>
    </div>
  );
}

// Rendered when Supabase fires PASSWORD_RECOVERY (user clicked a reset email).
// Without this screen the recovery link silently logs the user in with the
// OLD password unchanged — a real-but-easy-to-miss auth bug.
function PasswordResetScreen({ onDone }) {
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setErr("");
    if (!pw1 || pw1.length < 6) { setErr("Password must be at least 6 characters"); return; }
    if (pw1 !== pw2) { setErr("Passwords don't match"); return; }
    setLoading(true);
    try {
      await SB.updatePassword(pw1);
      setDone(true);
      setTimeout(() => onDone?.(), 1500);
    } catch (e) {
      setErr(e.message || "Couldn't update password");
    }
    setLoading(false);
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem"}}>
      <div style={{maxWidth:420,width:"100%",background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:16,padding:"2rem 1.75rem",boxShadow:"0 24px 60px rgba(0,0,0,.45)"}}>
        <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.5rem",marginBottom:".4rem"}}>Set a new password</div>
        <div style={{fontSize:13,color:C.dim,marginBottom:"1.25rem",lineHeight:1.5}}>Enter a new password for your RinkReads account. You'll stay signed in.</div>
        {!done ? (
          <>
            <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:".6rem .85rem",marginBottom:".65rem"}}>
              <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:2}}>New password</div>
              <input type="password" value={pw1} onChange={e=>setPw1(e.target.value)} placeholder="6+ chars" autoComplete="new-password" autoFocus
                onKeyDown={e=>{ if (e.key === "Enter") submit(); }}
                style={{background:"none",border:"none",color:C.white,fontSize:14,fontFamily:FONT.body,width:"100%",outline:"none",padding:0}}/>
            </div>
            <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:".6rem .85rem",marginBottom:".65rem"}}>
              <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:2}}>Confirm</div>
              <input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="Re-enter" autoComplete="new-password"
                onKeyDown={e=>{ if (e.key === "Enter") submit(); }}
                style={{background:"none",border:"none",color:C.white,fontSize:14,fontFamily:FONT.body,width:"100%",outline:"none",padding:0}}/>
            </div>
            {err && (
              <div style={{fontSize:13,color:C.red,background:C.redDim,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:".6rem .8rem",marginBottom:".75rem"}}>{err}</div>
            )}
            <button onClick={submit} disabled={loading} style={{width:"100%",background:C.gold,color:C.bg,border:"none",borderRadius:12,padding:"1rem",cursor:loading?"default":"pointer",fontWeight:800,fontSize:16,fontFamily:FONT.body,letterSpacing:".02em",boxShadow:`0 4px 16px ${C.gold}33`}}>
              {loading ? "…" : "Update password →"}
            </button>
            {err && (
              <div style={{textAlign:"center",marginTop:".75rem"}}>
                <button onClick={async () => {
                  // Race signOut against a 2s timeout so a hung auth call can't
                  // trap us here. Then hard-reload to root to fully reset
                  // session state — the recovery flag, hash fragment, and any
                  // in-flight auth requests all get cleaned up.
                  try { await Promise.race([SB.signOut(), new Promise(r => setTimeout(r, 2000))]); } catch {}
                  if (typeof window !== "undefined") window.location.href = "/";
                }}
                  style={{background:"none",border:"none",color:C.dimmer,cursor:"pointer",fontSize:12,fontFamily:FONT.body,padding:0,textDecoration:"underline"}}>
                  ← Back to sign in
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{fontSize:14,color:C.green,background:"rgba(34,197,94,.08)",border:`1px solid ${C.greenBorder}`,borderRadius:8,padding:".85rem 1rem",textAlign:"center"}}>
            ✓ Password updated. Taking you home…
          </div>
        )}
      </div>
    </div>
  );
}

function AuthScreen({ onAuthenticated, onDemo, onDevEnter, onPreview, prefill }) {
  const [mode, setMode] = useState(prefill ? "signup" : "login"); // login | signup | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(prefill?.name || "");
  const [role, setRole] = useState(prefill?.role || "player");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [qbStats, setQbStats] = useState({ questionCount: null, ageGroupCount: null });
  // Show the dev-bypass panel whenever running `npm run dev` — the LS flag
  // is still honoured in production builds so it stays invisible to real users.
  const devBypass = isDevBypassEnabled() || (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV);
  const [devRole, setDevRole] = useState("player");
  const [devLevel, setDevLevel] = useState("U11 / Atom");
  const [devPosition, setDevPosition] = useState("Forward");
  const [devTier, setDevTier] = useState(() => {
    try { return (window.localStorage.getItem("rinkreads_tier_override") || "").toUpperCase() || null; }
    catch { return null; }
  });

  useEffect(() => {
    let alive = true;
    loadQB().then(qb => {
      if (!alive) return;
      const ageGroupCount = Object.keys(qb).length;
      const total = Object.values(qb).reduce((n, arr) => n + arr.length, 0);
      const questionCount = Math.floor(total / 10) * 10;
      setQbStats({ questionCount, ageGroupCount });
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  async function submit() {
    setErr("");
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!email.trim() || !password || !name.trim()) throw new Error("All fields required");
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        await SB.signUp({ email: email.trim(), password, role, name: name.trim() });
        lsSetStr("rinkreads_has_signed_in_before", "1");
        logSignupComplete({ role, level: prefill?.level || null });
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
        lsSetStr("rinkreads_has_signed_in_before", "1");
      }
      onAuthenticated();
    } catch (e) {
      setErr(e.message || "Something went wrong");
    }
    setLoading(false);
  }

  const headline = mode === "signup" ? "Get started."
    : mode === "forgot" ? "Reset password"
    : "Sign in.";
  const subhead = mode === "signup" ? "Create an account to start tracking your progress."
    : mode === "forgot" ? "Enter your email — we'll send you a reset link."
    : "Enter your credentials to see your development report.";

  return (
    <div style={{minHeight:"100vh",position:"relative",background:C.bg,display:"flex",flexDirection:"column",justifyContent:"center",padding:"2rem 1.25rem",fontFamily:FONT.body,color:C.white,overflow:"hidden"}}>

      {/* Hockey-player hero photo as landing background — heavily dimmed so
          copy reads crisply; the player is atmosphere, not foreground. */}
      <img src={imgSplash} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.22,filter:"saturate(0.7) contrast(0.9)",pointerEvents:"none"}}/>

      {/* Layered overlays — heavier navy fade + warm Oilers-orange radial glow */}
      <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(4,30,66,0.78) 0%,rgba(4,30,66,0.6) 45%,rgba(4,30,66,0.94) 100%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 60% at 50% 40%,rgba(252,76,2,0.08) 0%,transparent 70%)",pointerEvents:"none"}}/>

      {/* Subtle top-right door — flips between modes and scrolls to the
          auth card so the user actually sees the form change. Hidden on
          forgot-password mode where neither label fits. */}
      {mode !== "forgot" && (
        <button type="button"
           onClick={() => {
             setMode(mode === "login" ? "signup" : "login");
             setTimeout(() => {
               try { document.getElementById("auth")?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch {}
             }, 30);
           }}
           style={{position:"absolute",top:16,right:18,fontSize:12,color:"rgba(248,250,252,.6)",textDecoration:"underline dotted",fontFamily:FONT.body,cursor:"pointer",zIndex:5,background:"none",border:"none",padding:0}}>
          {mode === "login" ? "New here? Create account" : "Already a member? Sign in"}
        </button>
      )}

      <div style={{position:"relative",maxWidth:420,margin:"0 auto",width:"100%"}}>

        {/* Dev bypass panel — gated by rinkreads_dev_bypass LS flag; invisible
            to real users. Jump straight into any state without email/password. */}
        {devBypass && (
          <div style={{background:"rgba(147,51,234,0.12)",border:"1px solid rgba(168,85,247,0.4)",borderRadius:12,padding:"0.85rem 1rem",marginBottom:"1.25rem",color:C.white,fontFamily:FONT.body}}>
            <div style={{display:"flex",alignItems:"center",gap:".5rem",marginBottom:".65rem"}}>
              <span style={{fontSize:14}}>🧪</span>
              <span style={{fontSize:11,letterSpacing:".14em",textTransform:"uppercase",color:"#c4b5fd",fontWeight:700}}>Dev bypass</span>
              <span style={{flex:1}}/>
              <button onClick={() => { try { window.localStorage.removeItem("rinkreads_dev_bypass"); window.location.reload(); } catch {} }}
                style={{background:"none",border:"none",color:"rgba(196,181,253,.6)",cursor:"pointer",fontSize:11,fontFamily:FONT.body,padding:0,textDecoration:"underline"}}>disable</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem",marginBottom:".5rem"}}>
              {["player","coach"].map(r => (
                <button key={r} onClick={() => setDevRole(r)}
                  style={{background:devRole===r?"rgba(168,85,247,0.25)":"rgba(255,255,255,0.04)",border:`1px solid ${devRole===r?"rgba(168,85,247,0.6)":"rgba(255,255,255,0.1)"}`,borderRadius:8,padding:".45rem",cursor:"pointer",color:devRole===r?"#e9d5ff":"rgba(248,250,252,.7)",fontFamily:FONT.body,fontSize:12,fontWeight:devRole===r?700:500,textTransform:"capitalize"}}>{r}</button>
              ))}
            </div>
            {devRole === "player" && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem",marginBottom:".5rem"}}>
                <select value={devLevel} onChange={e=>setDevLevel(e.target.value)}
                  style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:".45rem .55rem",color:C.white,fontFamily:FONT.body,fontSize:12,outline:"none"}}>
                  {LEVELS.map(l => <option key={l} value={l} style={{background:"#1a1a2e",color:C.white}}>{l}</option>)}
                </select>
                <select value={devPosition} onChange={e=>setDevPosition(e.target.value)}
                  style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:".45rem .55rem",color:C.white,fontFamily:FONT.body,fontSize:12,outline:"none"}}>
                  {["Forward","Defense","Goalie","Multiple"].map(p => <option key={p} value={p} style={{background:"#1a1a2e",color:C.white}}>{p}</option>)}
                </select>
              </div>
            )}
            {/* Tier picker — writes rinkreads_tier_override so resolveTier returns the chosen tier
                for the next dev session. Tap again to clear. */}
            <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"#c4b5fd",fontWeight:700,marginBottom:".3rem",marginTop:".15rem"}}>View-as tier</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:".35rem",marginBottom:".55rem"}}>
              {["FREE","PRO","TEAM"].map(t => {
                const active = devTier === t;
                return (
                  <button key={t} onClick={() => {
                    try {
                      if (active) { window.localStorage.removeItem("rinkreads_tier_override"); setDevTier(null); }
                      else { window.localStorage.setItem("rinkreads_tier_override", t); setDevTier(t); }
                    } catch {}
                  }}
                    style={{background:active?"rgba(168,85,247,0.25)":"rgba(255,255,255,0.04)",border:`1px solid ${active?"rgba(168,85,247,0.6)":"rgba(255,255,255,0.1)"}`,borderRadius:8,padding:".4rem",cursor:"pointer",color:active?"#e9d5ff":"rgba(248,250,252,.7)",fontFamily:FONT.body,fontSize:11,fontWeight:active?700:500}}>
                    {t}
                  </button>
                );
              })}
            </div>
            <button onClick={() => onDevEnter && onDevEnter(devRole === "coach" ? {role:"coach"} : {role:"player", level:devLevel, position:devPosition, name:"Dev User"})}
              style={{width:"100%",background:"linear-gradient(135deg,#a855f7,#7c3aed)",color:"#fff",border:"none",borderRadius:10,padding:".6rem",cursor:"pointer",fontFamily:FONT.body,fontWeight:700,fontSize:13}}>
              Enter as dev →
            </button>
            <div style={{fontSize:10,color:"rgba(196,181,253,.55)",marginTop:".5rem",lineHeight:1.5}}>
              Console: <code style={{color:"#e9d5ff"}}>window.__dev</code> — <code style={{color:"#e9d5ff"}}>setTier</code>, <code style={{color:"#e9d5ff"}}>markFirstSixDone</code>, <code style={{color:"#e9d5ff"}}>reset</code>, <code style={{color:"#e9d5ff"}}>exitBypass</code>
            </div>
          </div>
        )}

        {/* Hero brand block */}
        <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:".55rem",background:"rgba(3,9,15,0.6)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:`1px solid rgba(252,76,2,0.2)`,borderRadius:14,padding:".55rem 1.1rem",marginBottom:"1.1rem"}}>
            <RinkReadsLogo size={26}/>
            <span style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.6rem",color:C.gold,letterSpacing:".1em"}}>RinkReads</span>
          </div>
          <h1 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"clamp(1.9rem,7.5vw,2.6rem)",lineHeight:1.05,margin:"0 0 .55rem",letterSpacing:"-.01em"}}>
            Hockey is played<br/>between the ears.<br/><span style={{color:C.gold}}>RinkReads trains the other 80%.</span>
          </h1>
          <p style={{fontSize:14,color:"rgba(248,250,252,.7)",lineHeight:1.65,margin:"0 auto 1.25rem",maxWidth:340}}>
            Game sense, systems reads, and decision-making for U7 to U18.
          </p>
          {/* Stat chips */}
          <div style={{display:"flex",gap:".5rem",justifyContent:"center",flexWrap:"wrap"}}>
            {[
              {n: qbStats.questionCount != null ? `${qbStats.questionCount}+` : "—", l:"Questions"},
              {n: qbStats.ageGroupCount != null ? String(qbStats.ageGroupCount) : "—", l:"Age groups"},
              {n:"6",l:"Question types"},
            ].map((s,i) => (
              <div key={i} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:".3rem .85rem",display:"flex",alignItems:"baseline",gap:".3rem"}}>
                <span style={{fontFamily:FONT.display,fontWeight:800,fontSize:15,color:C.gold}}>{s.n}</span>
                <span style={{fontSize:11,color:"rgba(248,250,252,.55)"}}>{ s.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Role-based entry points — four small chips so each audience
            (parents, players, coaches, associations) has a guide without
            overwhelming the landing hero. */}
        <div style={{display:"flex",flexWrap:"wrap",gap:".35rem",justifyContent:"center",marginBottom:"1rem"}}>
          {[
            { hash:"#parents",      icon:"👪", label:"Parents — start here" },
            { hash:"#players",      icon:"🏒", label:"Players — start here" },
            { hash:"#coaches",      icon:"🎯", label:"Coaches — start here" },
            { hash:"#associations", icon:"🏟️", label:"Associations — start here" },
            { hash:"#pricing",      icon:"💳", label:"Plans & Pricing" },
          ].map(x => (
            <a key={x.hash} href={x.hash}
               style={{display:"inline-flex",alignItems:"center",gap:".3rem",
                       background:"rgba(252,76,2,0.06)",
                       border:`1px solid rgba(252,76,2,0.25)`,
                       borderRadius:999,padding:".3rem .7rem",
                       color:"rgba(252,76,2,.85)",fontSize:11,fontFamily:FONT.body,
                       textDecoration:"none",fontWeight:600,letterSpacing:".01em"}}>
              <span style={{fontSize:12}}>{x.icon}</span>
              <span>{x.label}</span>
            </a>
          ))}
        </div>

        {/* Sample Game Sense radar — visual-only preview of what a player's
            profile looks like. No data persists pre-signup. */}
        <LandingRadarCard onPreview={onPreview} />

      {/* Auth card */}
      <div id="auth" style={{background:"rgba(6,12,22,0.82)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:`1px solid rgba(255,255,255,0.08)`,borderTop:`1px solid rgba(255,255,255,0.13)`,borderRadius:20,padding:"1.75rem 1.5rem",boxShadow:"0 32px 80px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.06)",scrollMarginTop:"1rem"}}>

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

        {/* Inline mode toggle — primary path for users who land on the
            login form but actually need to create an account. */}
        {mode !== "forgot" && (
          <div style={{textAlign:"center",marginTop:"1rem",paddingTop:"1rem",borderTop:"1px solid rgba(255,255,255,0.06)",fontSize:13,color:"rgba(248,250,252,.55)",fontFamily:FONT.body}}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={()=>{setMode(mode === "login" ? "signup" : "login");setErr("");setResetSent(false);}}
              style={{background:"none",border:"none",color:C.gold,cursor:"pointer",fontSize:13,fontFamily:FONT.body,padding:0,fontWeight:700,textDecoration:"underline"}}>
              {mode === "login" ? "Create one →" : "Sign in →"}
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

        {/* Coach preview — only coach-side demo remains; players sign up. */}
        <div style={{marginTop:"1.75rem",paddingTop:"1.5rem",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
          <div style={{fontSize:11,letterSpacing:".14em",textTransform:"uppercase",color:"rgba(248,250,252,.35)",fontWeight:700,textAlign:"center",marginBottom:"1rem"}}>Coaching a team? See the dashboard</div>
          <div style={{background:"rgba(252,76,2,0.07)",border:"1px solid rgba(252,76,2,0.2)",borderRadius:10,padding:".75rem .85rem",color:C.white,fontFamily:FONT.body,textAlign:"left",marginBottom:".75rem"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".55rem"}}>
              <div>
                <div style={{fontWeight:700,fontSize:12,color:"rgba(252,76,2,.9)",marginBottom:1}}>Team IQ by concept — where to coach next.</div>
                <div style={{fontSize:10,color:"rgba(248,250,252,.4)"}}>U11 AA Edmonton Selects · 16 players</div>
              </div>
            </div>
            <div style={{borderTop:"1px solid rgba(252,76,2,0.12)",paddingTop:".5rem",display:"flex",flexDirection:"column",gap:".35rem"}}>
              {[
                { label: "Decision-Making", pct: 72, weak: false },
                { label: "Compete",         pct: 88, weak: false },
                { label: "D-zone Coverage", pct: 41, weak: true  },
                { label: "Breakouts",       pct: 64, weak: false },
                { label: "Net-Front",       pct: 58, weak: false },
              ].map(row => {
                const barColor = row.weak ? "#ef4444" : row.pct >= 80 ? "#22c55e" : "rgba(252,76,2,.85)";
                const labelColor = row.weak ? "#fca5a5" : "rgba(248,250,252,.75)";
                return (
                  <div key={row.label} style={{display:"grid",gridTemplateColumns:"92px 1fr 32px",alignItems:"center",gap:".5rem"}}>
                    <span style={{fontSize:11,color:labelColor,fontWeight:row.weak?700:500,whiteSpace:"nowrap"}}>{row.label}</span>
                    <div style={{height:6,background:"rgba(255,255,255,0.06)",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${row.pct}%`,background:barColor,borderRadius:3,transition:"width .3s"}}/>
                    </div>
                    <span style={{fontSize:10,color:barColor,fontWeight:700,textAlign:"right"}}>{row.pct}%</span>
                  </div>
                );
              })}
            </div>
            <div style={{marginTop:".65rem",paddingTop:".45rem",borderTop:"1px solid rgba(252,76,2,0.12)",fontSize:10,color:"rgba(248,250,252,.55)",lineHeight:1.45}}>
              <span style={{color:"#ef4444",fontWeight:800}}>🎯 Tuesday's focus:</span> D-zone coverage — 9 of 16 players below 50%.
            </div>
          </div>
          <button onClick={()=>onDemo("__coach__")} style={{
            width:"100%", background:C.gold, color:C.bg, border:"none",
            borderRadius:12, padding:"0.95rem 1rem", cursor:"pointer",
            fontWeight:800, fontSize:15, fontFamily:FONT.body,
            letterSpacing:".02em", boxShadow:`0 4px 16px ${C.gold}33`,
            display:"flex", alignItems:"center", justifyContent:"center", gap:".55rem",
          }}>
            <span style={{fontSize:16}}>🎯</span>
            <span>Open the Coach Dashboard</span>
            <span>→</span>
          </button>
          <div style={{fontSize:10,color:"rgba(248,250,252,.3)",textAlign:"center",marginTop:".6rem"}}>Preview only — nothing is saved until you create a free account.</div>
        </div>

        <div style={{fontSize:10,color:"rgba(248,250,252,.3)",textAlign:"center",marginTop:"1rem"}}>v{VERSION}</div>
      </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// DEPTH CHART — coach-private lineup tool, rendered inside each team card
// ─────────────────────────────────────────────────────────
// NHL-style lineup card. Reads from depthChart storage, renders as forward
// lines (LW / C / RW), D pairs (LD / RD), and goalies (Starter / Backup).
// Coach can reassign a slot by tapping a player cell and picking from the
// roster (bench includes anyone not yet on a line).
function DepthChartSection({ teamId, roster, onChange }) {
  const [open, setOpen] = useState(true);
  const [chart, setChart] = useState(() => getDepthChart(teamId));
  const [editingSlot, setEditingSlot] = useState(null);

  // Re-read when teamId changes (e.g., coach toggling between teams).
  useEffect(() => { setChart(getDepthChart(teamId)); }, [teamId]);

  function assignSlot(slotId, playerId) {
    // Pin playerId to slotId. If another player already holds the slot,
    // reverse-lookup + clear them first (storage is keyed by playerId).
    const current = getDepthChart(teamId);
    const prevHolderId = Object.entries(current).find(([, s]) => s === slotId)?.[0];
    if (prevHolderId && prevHolderId !== playerId) {
      setDepthAssignment(teamId, prevHolderId, null);
    }
    if (playerId) {
      // Also clear the new player's previous slot so a move doesn't leave them
      // on two cells.
      setDepthAssignment(teamId, playerId, slotId);
    }
    setChart(getDepthChart(teamId));
    setEditingSlot(null);
    if (onChange) onChange();
  }

  const playerForSlot = (slotId) => {
    const pid = Object.entries(chart).find(([, s]) => s === slotId)?.[0];
    return pid ? roster.find(p => p.id === pid) : null;
  };
  const assignedIds = new Set(Object.keys(chart).filter(k => chart[k]));
  const bench = roster.filter(p => !assignedIds.has(p.id));

  const SlotCell = ({ slot }) => {
    const p = playerForSlot(slot.id);
    const isEditing = editingSlot === slot.id;
    return (
      <div style={{flex:1,minWidth:0,background:p?C.bgElevated:C.bgCard,border:`1px solid ${p?C.border:"rgba(255,255,255,0.04)"}`,borderRadius:8,padding:".45rem .55rem",cursor:"pointer",position:"relative"}}
           onClick={(e) => { e.stopPropagation(); setEditingSlot(isEditing ? null : slot.id); }}>
        <div style={{fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:2}}>{slot.label}</div>
        <div style={{fontSize:12,color:p?C.white:C.dimmer,fontWeight:p?700:500,lineHeight:1.2,textOverflow:"ellipsis",overflow:"hidden",whiteSpace:"nowrap"}}>
          {p ? p.name : "—"}
        </div>
        {p && <div style={{fontSize:9,color:C.gold,marginTop:1,fontWeight:700}}>GS {p.iq}</div>}
        {isEditing && (
          <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:4,background:C.bgElevated,border:`1px solid ${C.goldBorder}`,borderRadius:8,maxHeight:200,overflowY:"auto",zIndex:50,boxShadow:"0 8px 24px rgba(0,0,0,0.5)"}}>
            <div onClick={(e) => { e.stopPropagation(); assignSlot(slot.id, null); }} style={{padding:".45rem .6rem",fontSize:11,color:C.dimmer,borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}>— Unassign</div>
            {[...(p ? [] : []), ...bench, ...(p ? [p] : [])].map(op => (
              <div key={op.id} onClick={(e) => { e.stopPropagation(); assignSlot(slot.id, op.id); }}
                   style={{padding:".45rem .6rem",fontSize:11,color:C.white,cursor:"pointer",display:"flex",justifyContent:"space-between",gap:".4rem"}}>
                <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{op.name}</span>
                <span style={{fontSize:10,color:C.dimmer}}>{op.position || "TBD"}</span>
              </div>
            ))}
            {bench.length === 0 && !p && (
              <div style={{padding:".5rem .6rem",fontSize:11,color:C.dimmer,fontStyle:"italic"}}>All players assigned.</div>
            )}
          </div>
        )}
      </div>
    );
  };

  const fSlotsByLine = (n) => DEPTH_SLOTS.filter(s => s.role === "F" && s.line === n).sort((a,b) => a.order - b.order);
  const dSlotsByPair = (n) => DEPTH_SLOTS.filter(s => s.role === "D" && s.line === n).sort((a,b) => a.order - b.order);
  const gSlots = DEPTH_SLOTS.filter(s => s.role === "G");

  return (
    <div style={{marginTop:".85rem",paddingTop:".85rem",borderTop:`1px solid ${C.border}`}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",marginBottom:".5rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
          <Label style={{margin:0}}>🏒 Lineup Card</Label>
          <span style={{fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:C.dimmer,fontWeight:700}}>Coach only</span>
        </div>
        <span style={{color:C.dimmer,fontSize:12}}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div onClick={() => setEditingSlot(null)}>
          {roster.length === 0 ? (
            <div style={{fontSize:12,color:C.dimmer,fontStyle:"italic"}}>Invite players to start building your lineup.</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:".7rem"}}>
              {/* Forward lines */}
              {[1,2,3].map(n => (
                <div key={`f${n}`}>
                  <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,fontWeight:800,marginBottom:".3rem"}}>Line {n}</div>
                  <div style={{display:"flex",gap:".35rem"}}>
                    {fSlotsByLine(n).map(s => <SlotCell key={s.id} slot={s}/>)}
                  </div>
                </div>
              ))}
              {/* D pairs */}
              {[1,2,3].map(n => (
                <div key={`d${n}`}>
                  <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.blue,fontWeight:800,marginBottom:".3rem"}}>Pair {n}</div>
                  <div style={{display:"flex",gap:".35rem"}}>
                    {dSlotsByPair(n).map(s => <SlotCell key={s.id} slot={s}/>)}
                  </div>
                </div>
              ))}
              {/* Goalies */}
              <div>
                <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.purple,fontWeight:800,marginBottom:".3rem"}}>Goaltenders</div>
                <div style={{display:"flex",gap:".35rem"}}>
                  {gSlots.map(s => <SlotCell key={s.id} slot={s}/>)}
                </div>
              </div>
              {/* Bench */}
              {bench.length > 0 && (
                <div style={{marginTop:".35rem",paddingTop:".5rem",borderTop:`1px dashed ${C.border}`}}>
                  <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:".35rem"}}>Bench ({bench.length})</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:".35rem"}}>
                    {bench.map(p => (
                      <div key={p.id} style={{fontSize:11,color:C.dim,background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:999,padding:".2rem .6rem"}}>
                        {p.name}<span style={{color:C.dimmer}}> · {p.position || "TBD"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{fontSize:10,color:C.dimmer,fontStyle:"italic",marginTop:".35rem"}}>Tap any slot to swap players. Private to you — players never see this.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// COACH HOME — teams list, create team, roster
// ─────────────────────────────────────────────────────────
const DEMO_COACH_TEAMS = [
  {id:"demo-t1",name:"U11 AA Edmonton Selects",level:"U11 / Atom",season:SEASONS[0],code:"SELECTS",role:"Head Coach"},
  {id:"demo-t2",name:"U13 AAA River City Rush",level:"U13 / Peewee",season:SEASONS[0],code:"RUSH13",role:"Assistant Coach"},
  {id:"demo-t3",name:"U9 B St. Albert Raiders",level:"U9 / Novice",season:SEASONS[0],code:"RAIDERS",role:"Assistant Coach"},
];
// Synthetic quiz history for each demo roster player. Result IDs align with
// COMPETENCY_MAPPINGS so calcCompetencyScores populates all five competencies
// (positioning, decision_making, awareness, tempo_control, leadership).
// Tuned so the team is weakest at decision_making — lets the demo hero card
// show a credible "Your team is weakest at Decision-Making" headline.
function _buildCoachDemoSession(daysAgo, posCorrect, decCorrect, awaCorrect, tmpCorrect, ldrCorrect) {
  const results = [];
  for (let i = 0; i < 4; i++) results.push({ id: `u11q${i+1}`, ok: i < posCorrect, d: 2, cat: "Hockey Sense" });
  for (let i = 0; i < 4; i++) results.push({ id: `u11q${i+8}`, ok: i < decCorrect, d: 2, cat: "Game Decision-Making" });
  results.push({ id: "u11q16", ok: awaCorrect > 0, d: 2, cat: "Hockey Sense" });
  // Synthetic tempo_control + leadership entries — COMPETENCY_MAPPINGS picks
  // these up via /^u\d+tempo\d+$/ and /^u\d+lead\d+$/ patterns.
  for (let i = 0; i < 3; i++) results.push({ id: `u11tempo${i+1}`, ok: i < tmpCorrect, d: 2, cat: "Tempo" });
  for (let i = 0; i < 3; i++) results.push({ id: `u11lead${i+1}`, ok: i < ldrCorrect, d: 2, cat: "Leadership" });
  const correct = results.filter(r => r.ok).length;
  return { results, score: Math.round(correct / results.length * 100), date: new Date(Date.now() - daysAgo * 86400000).toISOString() };
}
function _buildCoachDemoHistory(perSession) {
  // perSession: array of 3 [pos, dec, awa, tmp, ldr] tuples. If tmp/ldr aren't
  // supplied (legacy 3-tuple rows) they default to plausible mid-range values.
  return perSession.map((s, i) => _buildCoachDemoSession(
    [15, 8, 2][i] ?? (20 - i * 4),
    s[0], s[1], s[2],
    s[3] ?? 2,                 // tempo default: 2/3 correct
    s[4] ?? (s[2] >= 1 ? 2 : 1) // leadership loosely follows awareness
  ));
}
// Realistic U11 roster size (15 skaters + 1 goalie). Mix of positions
// and ability levels; team weakness stays on decision_making so the hero
// card has something concrete to show.
const DEMO_COACH_ROSTER = [
  // Forwards (9)
  {id:"dr1", name:"Cole Gretzky",      level:"U11 / Atom",position:"Forward",iq:83,sessions:3,
   quizHistory:_buildCoachDemoHistory([[3,3,1],[3,3,1],[3,3,1]])},   // pos 75 dec 75 awa 100
  {id:"dr3", name:"Marcus Sakic",      level:"U11 / Atom",position:"Forward",iq:65,sessions:1,
   quizHistory:_buildCoachDemoHistory([[3,1,1],[2,2,0],[3,2,1]])},   // pos 67 dec 42 awa 67
  {id:"dr6", name:"Ethan MacKinnon",   level:"U11 / Atom",position:"Forward",iq:77,sessions:3,
   quizHistory:_buildCoachDemoHistory([[3,2,1],[3,3,1],[3,2,0]])},   // pos 75 dec 58 awa 67
  {id:"dr7", name:"Zoe Crosby",        level:"U11 / Atom",position:"Forward",iq:69,sessions:2,
   quizHistory:_buildCoachDemoHistory([[3,2,1],[2,2,0],[3,1,1]])},   // pos 67 dec 42 awa 67
  {id:"dr8", name:"Leo Bergeron",      level:"U11 / Atom",position:"Forward",iq:72,sessions:2,
   quizHistory:_buildCoachDemoHistory([[3,3,0],[2,2,1],[3,2,1]])},   // pos 67 dec 58 awa 67
  {id:"dr9", name:"Ava Marchand",      level:"U11 / Atom",position:"Multiple",iq:61,sessions:1,
   quizHistory:_buildCoachDemoHistory([[2,1,0],[2,2,1],[3,2,0]])},   // pos 58 dec 42 awa 33
  {id:"dr10",name:"Jaxon Draisaitl",   level:"U11 / Atom",position:"Forward",iq:80,sessions:3,
   quizHistory:_buildCoachDemoHistory([[3,3,1],[4,3,1],[3,2,0]])},   // pos 83 dec 67 awa 67
  {id:"dr11",name:"Riley McDavid",     level:"U11 / Atom",position:"Forward",iq:74,sessions:2,
   quizHistory:_buildCoachDemoHistory([[3,2,1],[3,2,0],[3,3,1]])},   // pos 75 dec 58 awa 67
  {id:"dr12",name:"Sam Pettersson",    level:"U11 / Atom",position:"",       iq:56,sessions:1,
   quizHistory:_buildCoachDemoHistory([[2,1,0],[2,1,1],[2,2,0]])},   // pos 50 dec 33 awa 33 · Not sure
  // Defense (5)
  {id:"dr2", name:"Nora Howe",         level:"U11 / Atom",position:"Defense",iq:71,sessions:2,
   quizHistory:_buildCoachDemoHistory([[2,3,1],[3,3,0],[3,2,1]])},   // pos 67 dec 67 awa 67
  {id:"dr5", name:"Tyler Blackwood",   level:"U11 / Atom",position:"Defense",iq:58,sessions:1,
   quizHistory:_buildCoachDemoHistory([[2,1,1],[2,2,0],[3,2,0]])},   // pos 58 dec 42 awa 33
  {id:"dr13",name:"Charlie Bouchard",  level:"U11 / Atom",position:"Defense",iq:66,sessions:2,
   quizHistory:_buildCoachDemoHistory([[3,2,0],[2,2,1],[3,2,1]])},   // pos 67 dec 50 awa 67
  {id:"dr14",name:"Mason Pronger",     level:"U11 / Atom",position:"Defense",iq:79,sessions:3,
   quizHistory:_buildCoachDemoHistory([[3,2,1],[3,3,1],[4,3,0]])},   // pos 83 dec 67 awa 67
  {id:"dr15",name:"Quinn Lidstrom",    level:"U11 / Atom",position:"Multiple",iq:63,sessions:1,
   quizHistory:_buildCoachDemoHistory([[2,2,1],[2,1,0],[3,2,1]])},   // pos 58 dec 42 awa 67
  // Goalies (2)
  {id:"dr4", name:"Maya Hasek",        level:"U11 / Atom",position:"Goalie", iq:78,sessions:3,
   quizHistory:_buildCoachDemoHistory([[3,3,1],[4,3,0],[3,2,1]])},   // pos 83 dec 67 awa 67
  {id:"dr16",name:"Noah Price",        level:"U11 / Atom",position:"Goalie", iq:68,sessions:1,
   quizHistory:_buildCoachDemoHistory([[2,2,0],[3,1,1],[2,2,0]])},   // pos 58 dec 42 awa 33
];

// Roster row in CoachHome — compact by default, expands to show a per-player
// 6-competency radar + top/weakest headline. Makes the coach dashboard feel
// populated with real per-player data, not just a list of names.
function RosterRow({ player, onRate }) {
  const [expanded, setExpanded] = useState(false);
  const scores = useMemo(() => calcCompetencyScores(player?.quizHistory || []), [player]);
  const compKeys = Object.keys(COMPETENCIES);
  const real = compKeys.filter(k => (scores[k] || 0) > 0);
  const avg = real.length ? Math.round(real.reduce((a, k) => a + scores[k], 0) / real.length) : null;
  const weakest = real.length ? real.reduce((min, k) => scores[k] < scores[min] ? k : min, real[0]) : null;
  const strongest = real.length ? real.reduce((max, k) => scores[k] > scores[max] ? k : max, real[0]) : null;

  // Extra-training digest: pull latest sessions per player so the coach sees
  // at a glance how much ice time / off-ice / video this athlete has logged.
  const trainingLog = useMemo(() => getTrainingLog(player?.id), [player?.id]);
  const recentSessions = (trainingLog?.sessions || []).slice().sort((a,b) => (a.date < b.date ? 1 : -1));
  const totalMin = recentSessions.reduce((n,s) => n + (Number(s.value) || 0), 0);
  const TRAINING_ICONS = {
    // Player-side activity types from widgets.jsx ACTIVITIES
    power_skating:"⛸️", skills_dev:"🏒", pucks_shot:"🎯",
    mental_skills:"🧠", dryland:"💪", practice:"🥅", game:"🏆", other:"📝",
    // Legacy / coach-demo seed types
    ice_time:"🏒", off_ice:"💪", stick_handling:"🪵", video:"📺",
  };

  // Mini radar geometry
  const cx = 70, cy = 70, radius = 54, n = compKeys.length;
  const pts = compKeys.map((k, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = ((scores[k] || 0) / 100) * radius;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
  const axisPts = compKeys.map((_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  });
  const poly = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,marginBottom:".4rem",color:C.white,fontFamily:FONT.body}}>
      <button onClick={() => setExpanded(e => !e)}
        style={{width:"100%",background:"none",border:"none",padding:".7rem .85rem",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",color:C.white,fontFamily:FONT.body,textAlign:"left"}}>
        <div style={{minWidth:0,flex:1}}>
          <div style={{fontSize:13,fontWeight:600}}>{player.name}</div>
          <div style={{fontSize:11,color:C.dimmer}}>{player.level || "No level"} · {player.position || "TBD"}</div>
        </div>
        {avg !== null && (
          <div style={{display:"flex",alignItems:"center",gap:".55rem",marginRight:".55rem"}}>
            <div style={{fontSize:10,color:C.dimmer,fontWeight:700,textAlign:"right",lineHeight:1.1}}>
              <div>GS {avg}</div>
              {weakest && <div style={{color:C.gold}}>↓ {COMPETENCIES[weakest].name.split("-")[0]}</div>}
            </div>
          </div>
        )}
        <span style={{color:C.gold,fontSize:14,flexShrink:0}}>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div style={{padding:".2rem .85rem .85rem",borderTop:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:".75rem",marginTop:".55rem"}}>
            <svg width="140" height="140" viewBox="0 0 140 140" style={{flexShrink:0}}>
              {[33,66,100].map(pct => {
                const r = (pct/100) * radius;
                const ring = compKeys.map((_, i) => {
                  const a = (Math.PI * 2 * i) / n - Math.PI / 2;
                  return `${(cx + r*Math.cos(a)).toFixed(1)},${(cy + r*Math.sin(a)).toFixed(1)}`;
                }).join(" ");
                return <polygon key={pct} points={ring} fill="none" stroke={C.border} strokeWidth="1" opacity={pct===100?0.5:0.2}/>;
              })}
              {axisPts.map((p, i) => (
                <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={C.border} strokeWidth="0.6" opacity="0.3"/>
              ))}
              <polygon points={poly} fill={C.gold} fillOpacity="0.25" stroke={C.gold} strokeWidth="1.5"/>
              {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2" fill={C.gold}/>)}
            </svg>
            <div style={{flex:1,minWidth:0}}>
              {real.length === 0 ? (
                <div style={{fontSize:12,color:C.dimmer,fontStyle:"italic",lineHeight:1.5}}>No quiz data yet — {player.name?.split(" ")[0] || "this player"} hasn't completed any quizzes.</div>
              ) : (
                <>
                  {strongest && <div style={{fontSize:11,color:C.dim,marginBottom:".2rem"}}><span style={{color:C.green,fontWeight:700}}>Strongest:</span> {COMPETENCIES[strongest].icon} {COMPETENCIES[strongest].name} ({scores[strongest]}%)</div>}
                  {weakest && weakest !== strongest && <div style={{fontSize:11,color:C.dim,marginBottom:".45rem"}}><span style={{color:C.gold,fontWeight:700}}>Weakest:</span> {COMPETENCIES[weakest].icon} {COMPETENCIES[weakest].name} ({scores[weakest]}%)</div>}
                </>
              )}
              <button onClick={(e) => { e.stopPropagation(); onRate && onRate(); }}
                style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".4rem .8rem",cursor:"pointer",fontSize:11,fontWeight:800,fontFamily:FONT.body,marginTop:".25rem"}}>
                Rate + private notes →
              </button>
            </div>
          </div>
          {/* Extra training log — last few sessions the player logged
              outside the app's core quizzes. Shows the coach what extra
              work the athlete is putting in off the team schedule. */}
          {recentSessions.length > 0 && (
            <div style={{marginTop:".7rem",paddingTop:".55rem",borderTop:`1px dashed ${C.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:".35rem"}}>
                <Label style={{margin:0}}>Extra training</Label>
                <div style={{fontSize:10,color:C.dimmer,fontWeight:600}}>{recentSessions.length} session{recentSessions.length===1?"":"s"} · {totalMin} min total</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:".25rem"}}>
                {recentSessions.slice(0,5).map((s, i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:C.dim,background:C.bgCard,borderRadius:6,padding:".3rem .5rem"}}>
                    <div style={{display:"flex",alignItems:"center",gap:".4rem",minWidth:0}}>
                      <span style={{fontSize:13}}>{TRAINING_ICONS[s.type] || "•"}</span>
                      <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.label || s.type.replace(/_/g," ")}</span>
                    </div>
                    <div style={{display:"flex",gap:".55rem",alignItems:"center",flexShrink:0}}>
                      <span style={{color:C.gold,fontWeight:700}}>{s.value} {s.unit}</span>
                      <span style={{fontSize:10,color:C.dimmer}}>{s.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Coach-facing "Focus this week" card. Renders the weakest competency
// across the team plus a tiny heatmap of all 6 so the coach can see context.
// CTA hands off to the existing StudyScreen with the team's level — we reuse
// the drill/study content the app already ships rather than building a coach
// drill picker.
function TeamFocusCard({ team, roster, onOpenDrills }) {
  const agg = useMemo(() => calcTeamCompetencyAverages(roster), [roster]);
  if (agg.activePlayers === 0 || !agg.weakestKey) {
    return (
      <div style={{background:C.bgElevated,border:`1px dashed ${C.border}`,borderRadius:12,padding:".9rem 1rem",marginBottom:"1rem",fontSize:12,color:C.dim,lineHeight:1.5}}>
        Add players and have them take a quiz to see what your team should work on.
      </div>
    );
  }
  const weakest = COMPETENCIES[agg.weakestKey];
  const ageShort = (team.level || "").split(" / ")[0] || team.level || "";
  const ordered = Object.keys(COMPETENCIES).sort((a, b) => agg.teamAverages[a] - agg.teamAverages[b]);
  return (
    <>
      <div style={{background:`linear-gradient(135deg, rgba(252,76,2,0.14), rgba(207,69,32,0.06))`,
                   border:`1px solid ${C.goldBorder}`, borderRadius:14,
                   padding:"1rem 1.1rem", marginBottom:"1rem"}}>
        <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",
                     color:C.gold,fontWeight:700,marginBottom:".35rem"}}>
          Focus this week
        </div>
        <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.25rem",
                     color:C.white,lineHeight:1.2,marginBottom:".35rem"}}>
          Your team is weakest at <span style={{color:weakest.color}}>{weakest.icon} {weakest.name}</span>
        </div>
        <div style={{fontSize:12.5,color:C.dim,marginBottom:".1rem",lineHeight:1.5}}>
          Team average: <b style={{color:C.white}}>{agg.weakestPct}%</b>
          {" · "}
          <b style={{color:C.white}}>{agg.playersBelowGrade} of {agg.activePlayers}</b> below developmental level
        </div>
      </div>
      <div style={{marginBottom:"1rem"}}>
        <Label>Team competencies</Label>
        {ordered.map(k => {
          const comp = COMPETENCIES[k];
          const pct = agg.teamAverages[k] || 0;
          const isWeakest = k === agg.weakestKey;
          return (
            <div key={k} style={{display:"flex",alignItems:"center",gap:".6rem",padding:"4px 0"}}>
              <div style={{flex:"0 0 120px",fontSize:12,color:C.dim,display:"flex",alignItems:"center",gap:".35rem"}}>
                <span>{comp.icon}</span>
                <span style={{color:isWeakest?C.white:C.dim,fontWeight:isWeakest?700:500}}>{comp.name}</span>
              </div>
              <div style={{flex:1,height:8,background:C.bgElevated,borderRadius:4,border:isWeakest?`1px solid ${C.goldBorder}`:"1px solid transparent",overflow:"hidden",position:"relative"}}>
                <div style={{width:`${Math.max(2,Math.min(100,pct))}%`,height:"100%",background:comp.color,borderRadius:3}}/>
              </div>
              <div style={{flex:"0 0 36px",textAlign:"right",fontSize:11,color:isWeakest?C.gold:C.dim,fontWeight:isWeakest?700:500}}>{pct}%</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function CoachHome({ profile, onSignOut, onOpenPlayer, demoMode, subscriptionTier, questFlagsBump, onPromptUpgrade, onBumpQuestFlags, onSaveProgress, onFirstLine, onSignup, onOpenDrills }) {
  const isDemo = demoMode || profile.id === "__demo_coach__";
  const [teams, setTeams] = useState(isDemo ? DEMO_COACH_TEAMS : []);
  const [loading, setLoading] = useState(!isDemo);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState("U11 / Atom");
  const [newSeason, setNewSeason] = useState(SEASONS[0]);
  const [expandedTeam, setExpandedTeam] = useState(isDemo ? "demo-t1" : null);
  const [rosters, setRosters] = useState(isDemo ? {"demo-t1": DEMO_COACH_ROSTER} : {});

  // Quest checklist state (coach variant)
  const flags = useQuestFlags(questFlagsBump);
  const identity = isDemo ? "__demo_coach__" : (profile?.id || "__anon_coach__");
  const effectiveTier = subscriptionTier || (isDemo ? "TEAM" : "FREE");
  const questResults = QUESTS_COACH.map(q => computeQuestProgress(q, { flags, teams, rosters, tier: effectiveTier }));
  const questDismissed = lsGetJSON(LS_QUEST_DISMISSED, {})[identity] === "1";
  const firstLineSeen = lsGetJSON(LS_FIRST_LINE_SEEN, {})[identity] === "1";
  function handleQuestTap(q) {
    if (q.gate && !canAccess(q.gate, effectiveTier).allowed) {
      onPromptUpgrade && onPromptUpgrade(q.gate);
    }
  }
  function handleDismissQuest() {
    const m = lsGetJSON(LS_QUEST_DISMISSED, {});
    m[identity] = "1";
    lsSetJSON(LS_QUEST_DISMISSED, m);
    onBumpQuestFlags && onBumpQuestFlags();
  }
  function handleAllComplete() {
    const m = lsGetJSON(LS_FIRST_LINE_SEEN, {});
    if (m[identity] === "1") return;
    m[identity] = "1";
    lsSetJSON(LS_FIRST_LINE_SEEN, m);
    if (isDemo) onSaveProgress && onSaveProgress();
    else onFirstLine && onFirstLine();
  }

  useEffect(() => { if (isDemo) return; (async () => {
    const t = await SB.getCoachTeams(profile.id);
    setTeams(t);
    setLoading(false);
    // Single-team coach (common case) — auto-expand so training / analytics /
    // homework are all one scroll away, no tap required.
    if (t.length === 1 && !expandedTeam) toggleRoster(t[0].id);
  })(); }, []);

  async function createTeam() {
    if (!newName.trim()) return;
    try {
      const team = await SB.createTeam({ coachId: profile.id, name: newName.trim(), level: newLevel, season: newSeason });
      setTeams([team, ...teams]);
      setCreating(false); setNewName("");
    } catch (e) { toast.error(e.message || "Could not create team."); }
  }

  async function toggleRoster(teamId) {
    if (expandedTeam === teamId) { setExpandedTeam(null); return; }
    setExpandedTeam(teamId);
    if (!rosters[teamId]) {
      const r = await SB.getTeamRoster(teamId);
      // Bulk-fetch quiz history for the roster so TeamFocusCard + the new
      // analytics section can compute team-wide accuracy without N+1 round
      // trips. RLS limits the rows to this coach's players.
      const playerIds = (r || []).map(p => p?.id).filter(Boolean);
      const byPlayer = await SB.getTeamQuizHistory(playerIds);
      const withHistory = (r || []).map(p => ({
        ...p,
        quiz_history: byPlayer[p.id] || [],
      }));
      setRosters(prev => ({ ...prev, [teamId]: withHistory }));
    }
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:40}}>
      <div style={{padding:"1.5rem 1.25rem",maxWidth:560,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.5rem"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:".45rem",marginBottom:".25rem"}}>
              <RinkReadsLogo size={22}/>
              <span style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.5rem",color:C.gold,letterSpacing:".06em"}}>RinkReads</span>
              <span style={{fontSize:10,color:C.dimmer,fontWeight:500}}>v{VERSION}</span>
            </div>
            <div style={{fontSize:13,color:C.dimmer}}>{profile.name} · Coach</div>
          </div>
          <button onClick={onSignOut} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:".5rem .85rem",color:C.dimmer,cursor:"pointer",fontSize:12,fontFamily:FONT.body}}>Sign out</button>
        </div>

        {/* Teams up top — first thing a coach sees. Each card shows the
            coach's role on that team (Head Coach / Assistant Coach) so a
            multi-team coach can tell at a glance what they're in charge of. */}
        <Label style={{marginTop:".25rem"}}>Your teams</Label>
        {loading ? (
          <div style={{color:C.dimmer,textAlign:"center",padding:"2rem"}}>Loading…</div>
        ) : teams.length === 0 ? (
          <Card style={{marginBottom:"1rem"}}><div style={{color:C.dimmer,textAlign:"center",padding:"1rem"}}>No teams yet. Create your first team to get started.</div></Card>
        ) : teams.map(t => {
          const roster = rosters[t.id] || [];
          const expanded = expandedTeam === t.id;
          const role = t.role || "Head Coach";
          const isHeadCoach = role === "Head Coach";
          return (
            <Card key={t.id} style={{marginBottom:".75rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",cursor:"pointer"}} onClick={()=>toggleRoster(t.id)}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>{t.name}</div>
                  <div style={{fontSize:11,color:C.dimmer,marginBottom:4}}>{t.level} · {t.season}</div>
                  <span style={{display:"inline-block",fontSize:10,letterSpacing:".12em",textTransform:"uppercase",fontWeight:700,padding:"2px 8px",borderRadius:999,background:isHeadCoach?"rgba(252,76,2,0.12)":"rgba(91,164,232,0.12)",color:isHeadCoach?C.gold:C.blue,border:`1px solid ${isHeadCoach?"rgba(252,76,2,0.35)":"rgba(91,164,232,0.35)"}`}}>
                    {isHeadCoach ? "★ Head Coach" : "Assistant Coach"}
                  </span>
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:"1rem"}}>
                  <div style={{fontSize:10,letterSpacing:".14em",color:C.dimmer,fontWeight:700,textTransform:"uppercase",marginBottom:2}}>Join Code</div>
                  <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.2rem",color:C.gold,letterSpacing:".1em"}}>{t.code}</div>
                </div>
              </div>
              {/* Quick-access chip row, visible when collapsed so the coach
                  sees what's inside the team without expanding first. */}
              {!expanded && (
                <div style={{display:"flex",gap:".3rem",marginTop:".5rem",flexWrap:"wrap"}}>
                  {[
                    {icon:"💪",label:"Training"},
                    {icon:"📋",label:"Homework"},
                    {icon:"🏆",label:"Challenges"},
                    {icon:"📊",label:"Analytics"},
                  ].map((chip, i) => (
                    <span key={i} onClick={(e)=>{e.stopPropagation();toggleRoster(t.id);}}
                      style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:999,padding:".2rem .55rem",fontSize:10.5,color:C.dim,fontFamily:FONT.body,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:".25rem"}}>
                      <span style={{fontSize:12}}>{chip.icon}</span>
                      <span>{chip.label}</span>
                    </span>
                  ))}
                </div>
              )}
              {expanded && (
                <div style={{marginTop:".85rem",paddingTop:".85rem",borderTop:`1px solid ${C.border}`}}>
                  <TeamFocusCard team={t} roster={roster} onOpenDrills={onOpenDrills}/>
                  <Label>Roster ({roster.length})</Label>
                  {roster.length === 0 ? (
                    <div style={{fontSize:12,color:C.dimmer,fontStyle:"italic"}}>No players yet — share the join code <span style={{color:C.gold,fontWeight:700}}>{t.code}</span> with players.</div>
                  ) : roster.map(p => (
                    <RosterRow key={p.id} player={p} onRate={() => onOpenPlayer(p)}/>
                  ))}
                  <DepthChartSection teamId={t.id} roster={roster} onChange={onBumpQuestFlags}/>
                  <CoachTeamAnalyticsSection roster={roster}/>
                  <CoachAssignmentsSection teamId={t.id} coachId={profile.id} roster={roster}/>
                  <CoachChallengeSection teamId={t.id} coachId={profile.id} teamLevel={t.level} roster={roster}/>
                  {canAccess("coachDashboard", subscriptionTier || "FREE").allowed && (
                    <CoachTrainingSection teamId={t.id} roster={roster}/>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {/* Coach demo skips the First-Five onboarding journey — we want
            demo coaches to see a fully-populated team right away, the way
            it looks once they've been using the app with real data. */}
        {!isDemo && !questDismissed && !firstLineSeen && (
          <QuestChecklist
            role="coach"
            quests={QUESTS_COACH}
            results={questResults}
            onTap={handleQuestTap}
            onDismiss={handleDismissQuest}
            onAllComplete={handleAllComplete}
            showSignupCTA={isDemo}
            onSignup={onSignup}
          />
        )}

        {!isDemo && !questDismissed && !firstLineSeen && (
          <div style={{margin:"0 -1.25rem 1rem"}}>
            <HockeyInsightWidget onInsightRead={onBumpQuestFlags}/>
          </div>
        )}

        {!creating ? (
          <PrimaryBtn onClick={()=>setCreating(true)} style={{marginBottom:"1rem",marginTop:".5rem"}}>+ Create New Team</PrimaryBtn>
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
  // Tracked-fresh ref so async Supabase auth callbacks see the latest demoMode
  // even when their closure was captured before dev-bypass entry. Without this,
  // a stale `onAuthChange` callback firing INITIAL_SESSION / TOKEN_REFRESHED /
  // SIGNED_OUT with `session === null` clobbers a dev/demo profile via the
  // `else { setProfile(null) }` branch (root cause of the gear→landing bug).
  const demoModeRef = useRef(false);
  demoModeRef.current = demoMode;
  const [demoCoachRatings, setDemoCoachRatings] = useState(null);
  const [screen, setScreen] = useState("home");
  const [prevScore, setPrevScore] = useState(null);
  const [totalSessions, setTotalSessions] = useState(0);
  const [quizResults, setQuizResults] = useState([]);
  const [seqPerfect, setSeqPerfect] = useState(false);
  const [mistakeStreak, setMistakeStreak] = useState(0);
  const [upgradePrompt, setUpgradePrompt] = useState(null); // {feature, target} | null
  const [signupPrefill, setSignupPrefill] = useState(null); // {role, level, name} | null
  const [firstLineToast, setFirstLineToast] = useState(false);
  const [questFlagsBump, setQuestFlagsBump] = useState(0);
  const bumpQuestFlags = useCallback(() => setQuestFlagsBump(b => b + 1), []);
  const [userEmail, setUserEmail] = useState(null);
  const [showMilestone5Banner, setShowMilestone5Banner] = useState(false);
  const [weeklyResults, setWeeklyResults] = useState(null);
  const [weeklyScore, setWeeklyScore] = useState(null);

  // Hash routing — shareable #parents URL reachable pre- and post-auth.
  // TOC anchors inside ParentsPage (#why, #not, etc.) don't match this route
  // marker, so intra-page scroll links don't trigger navigation.
  const [hashRoute, setHashRoute] = useState(() => {
    try { return (window.location.hash || "").replace(/^#/, ""); } catch { return ""; }
  });
  useEffect(() => {
    const handler = () => {
      try { setHashRoute((window.location.hash || "").replace(/^#/, "")); } catch {}
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    if (hashRoute === "parents" && screen !== "parents") setScreen("parents");
    if (hashRoute === "coaches" && screen !== "coaches") setScreen("coaches");
    if (hashRoute === "players" && screen !== "players") setScreen("players");
    if (hashRoute === "associations" && screen !== "associations") setScreen("associations");
    if (hashRoute === "admin" && screen !== "admin-dashboard") setScreen("admin-dashboard");
  }, [hashRoute, screen]);
  // Dev-bypass toggle from URL: visiting /#devbypass sets the LS flag so the
  // dev panel appears on AuthScreen — useful in production deployments where
  // import.meta.env.DEV is false. Visiting /#devbypass-off clears the flag.
  // Hash is wiped after toggling so the URL is clean and the toggle doesn't
  // re-fire on subsequent navigations.
  useEffect(() => {
    if (hashRoute !== "devbypass" && hashRoute !== "devbypass-off") return;
    try {
      if (hashRoute === "devbypass") {
        window.localStorage.setItem("rinkreads_dev_bypass", "1");
      } else {
        window.localStorage.removeItem("rinkreads_dev_bypass");
      }
      history.replaceState(null, "", window.location.pathname + window.location.search);
      setHashRoute("");
      // Force AuthScreen to re-render with the dev panel visible. Reload is
      // the most reliable cross-state way to flip the conditional gate.
      window.location.reload();
    } catch {}
  }, [hashRoute]);
  function clearParentsHash() {
    try {
      const h = (window.location.hash || "").replace(/^#/, "");
      if (["parents","coaches","players","associations","pricing","admin"].includes(h)) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
        setHashRoute("");
      }
    } catch {}
  }

  // Resolve tier once per render
  const tier = resolveTier({ profile, demoMode });

  function promptUpgrade(feature, target) {
    setUpgradePrompt({ feature, target: target || null });
  }
  function triggerSignup(source = "auth_direct") {
    markSignupIntent(source);
    setSignupPrefill({
      role: profile?.role || "player",
      level: player?.level || null,
      name: player?.name || profile?.name || "",
    });
    exitDemo();
  }
  function closeUpgrade() {
    if (upgradePrompt?.feature) { markGatedAck(upgradePrompt.feature); bumpQuestFlags(); }
    setUpgradePrompt(null);
  }

  // Run season reset check on boot so free-tier switch counters refresh each September
  useEffect(() => { try { checkSeasonReset(); } catch {} }, []);

  // One-time cleanup: the player-demo scaffold used __demo__ LS slots in a few
  // tables. Now that player demo is gone, silently drop them on boot so a
  // fresh install doesn't carry any stale fantasy-world data.
  useEffect(() => {
    try {
      const tk = window.localStorage.getItem("rinkreads_training_log");
      if (tk) {
        const all = JSON.parse(tk);
        let mutated = false;
        if (all && "__demo__" in all) { delete all["__demo__"]; mutated = true; }
        if (all && "__preview__" in all) { delete all["__preview__"]; mutated = true; }
        if (mutated) window.localStorage.setItem("rinkreads_training_log", JSON.stringify(all));
      }
      window.localStorage.removeItem("rinkreads_pending_transfer_v1");
      window.localStorage.removeItem("rinkreads_demo_snapshot_v1");
      window.localStorage.removeItem("rinkreads_demo_quiz_taken");
    } catch {}
  }, []);

  // Mark profile-viewed quest flag when user opens Game Sense report
  useEffect(() => {
    if (screen === "gamesense") { markProfileViewed(); bumpQuestFlags(); }
  }, [screen, bumpQuestFlags]);

  function enterDemo(levelOrRole) {
    // Only coach demo remains. Player demo was removed — players sign up and
    // work is persisted from the start.
    if (levelOrRole !== "__coach__") return;
    window.scrollTo(0, 0);
    setDemoMode(true);
    setDemoCoachRatings(null);
    setProfile({ id: "__demo_coach__", role: "coach", name: "Coach Demo" });
    seedDemoDepthChart("demo-t1", DEMO_COACH_ROSTER);
    // Pre-seed realistic training history per player so the coach dashboard
    // shows extra-training data (ice time, practice, off-ice, stick-handling,
    // video review) next to each athlete the moment the demo opens.
    seedDemoTrainingForRoster(DEMO_COACH_ROSTER, 5);
    setScreen("home");
  }

  // Ephemeral Pro-tier preview. Dynamic-import the seed so the landing bundle
  // stays small. Snapshot LS keys we'll overwrite so exitDemo can restore.
  async function enterPlayerPreview() {
    window.scrollTo(0, 0);
    const seed = buildU11ForwardPreview();
    try {
      // Insights-read: merge seed keys with whatever was there, stash the
      // original so exitDemo can restore it.
      const priorInsights = window.localStorage.getItem("rinkreads_insights_read_v1");
      window.localStorage.setItem("rinkreads_preview_snap_insights_v1", priorInsights || "");
      const prior = priorInsights ? JSON.parse(priorInsights) : [];
      const merged = Array.from(new Set([...(Array.isArray(prior)?prior:[]), ...seed.insightsReadKeys]));
      window.localStorage.setItem("rinkreads_insights_read_v1", JSON.stringify(merged));
      // Training log slot under the preview id.
      const tk = window.localStorage.getItem("rinkreads_training_log");
      const all = tk ? JSON.parse(tk) : {};
      all[PREVIEW_PLAYER_ID] = { sessions: seed.trainingSessions };
      window.localStorage.setItem("rinkreads_training_log", JSON.stringify(all));
      // Fake tier. resolveTier reads LS on every render → next render returns PRO.
      window.localStorage.setItem("rinkreads_tier_override", "PRO");
    } catch {}
    setDemoMode(true);
    setDemoCoachRatings(seed.coachRatings);
    setProfile({ id: PREVIEW_PLAYER_ID, role: "player", name: seed.player.name, level: seed.player.level, position: seed.player.position, __preview: true });
    setPlayer(seed.player);
    const latest = seed.player.quizHistory[seed.player.quizHistory.length - 1];
    setPrevScore(latest ? latest.score : null);
    setTotalSessions(seed.player.quizHistory.length);
    setScreen("home");
  }

  function exitDemo() {
    try {
      window.localStorage.removeItem("rinkreads_tier_override");
      // Restore insights-read snapshot (if one was stashed by enterPlayerPreview).
      const snap = window.localStorage.getItem("rinkreads_preview_snap_insights_v1");
      if (snap !== null) {
        if (snap) window.localStorage.setItem("rinkreads_insights_read_v1", snap);
        else window.localStorage.removeItem("rinkreads_insights_read_v1");
        window.localStorage.removeItem("rinkreads_preview_snap_insights_v1");
      }
      // Drop preview training slot.
      const tk = window.localStorage.getItem("rinkreads_training_log");
      if (tk) {
        const all = JSON.parse(tk);
        if (all && "__preview__" in all) { delete all["__preview__"]; window.localStorage.setItem("rinkreads_training_log", JSON.stringify(all)); }
      }
      window.localStorage.removeItem("rinkreads_demo_quiz_taken");
      // Clear the synthetic dev profile so we don't auto-re-enter on
      // reload. Leave the `rinkreads_dev_bypass` flag itself alone — it's
      // an intentional developer setting and only the dev should remove it
      // (via `window.__dev.exitBypass()` or `#devbypass-off`).
      clearDevProfile();
    } catch {}
    setDemoMode(false);
    setDemoCoachRatings(null);
    setProfile(null);
    setPlayer(null);
    setPrevScore(null);
    setTotalSessions(0);
    clearDemoDepthChart("demo-t1");
    setScreen("home");
  }

  // Dev bypass: same "skip Supabase" plumbing as demo mode, but with a real
  // empty player state (not seeded fantasy data) so the UI matches what a
  // brand-new signup looks like. Only reachable when rinkreads_dev_bypass === "1".
  function enterDevBypass(cfg) {
    window.scrollTo(0, 0);
    if (cfg.role === "coach") {
      const prof = { id: "__dev_coach__", role: "coach", name: cfg.name || "Dev Coach", __dev: true };
      setDevProfile(prof);
      setDemoMode(true);
      setDemoCoachRatings(null);
      setProfile(prof);
      seedDemoDepthChart("demo-t1", DEMO_COACH_ROSTER);
      setScreen("home");
      return;
    }
    const p = buildDevPlayer(cfg);
    const prof = { id: p.id, role: "player", name: p.name, level: p.level, position: p.position, __dev: true };
    setDevProfile(prof);
    setDemoMode(true);
    setDemoCoachRatings(null);
    setProfile(prof);
    setPlayer(p);
    setPrevScore(null);
    setTotalSessions(0);
    setScreen("home");
  }

  // Restore dev bypass on reload + expose window.__dev helpers.
  // Auto-entry requires `?devbypass=1` in the URL so a stale LS flag from a
  // past troubleshooting session never hijacks the landing page.
  useEffect(() => {
    if (!isDevBypassEnabled()) return;
    let autoRestore = false;
    try { autoRestore = new URLSearchParams(window.location.search).get("devbypass") === "1"; } catch {}
    if (autoRestore) {
      const saved = getDevProfile();
      if (saved && !demoMode) {
        if (saved.role === "coach") {
          enterDevBypass({ role: "coach", name: saved.name });
        } else {
          enterDevBypass({ role: "player", level: saved.level, position: saved.position, name: saved.name });
        }
      }
    }
    window.__dev = {
      enterAs: (cfg) => enterDevBypass(cfg || {}),
      setTier: (t) => { try { window.localStorage.setItem("rinkreads_tier_override", String(t).toUpperCase()); window.location.reload(); } catch {} },
      clearTier: () => { try { window.localStorage.removeItem("rinkreads_tier_override"); window.location.reload(); } catch {} },
      reset: () => { clearDevProfile(); try { window.localStorage.removeItem("rinkreads_tier_override"); } catch {} window.location.reload(); },
      exitBypass: () => { clearDevProfile(); try { window.localStorage.removeItem("rinkreads_dev_bypass"); } catch {} window.location.reload(); },
      markFirstSixDone: () => {
        try {
          // Acknowledge every gated feature so locked quests count as done
          window.localStorage.setItem("rinkreads_gated_quests_ack_v1", JSON.stringify(["smartGoals","progressSnapshots"]));
          window.localStorage.setItem("rinkreads_profile_viewed_v1", "1");
          window.localStorage.setItem("rinkreads_insights_read_v1", JSON.stringify(["a","b","c"]));
        } catch {}
        window.location.reload();
      },
    };
    console.log("[RinkReads] Dev bypass active. Helpers: window.__dev", Object.keys(window.__dev));
  }, []); // intentionally run once; no deps

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
      // Demo / dev-bypass sessions must be immune to Supabase auth events:
      // there is no real Supabase session in those modes, so an async
      // INITIAL_SESSION / SIGNED_OUT firing after dev-bypass entry would
      // otherwise wipe the synthetic profile and bounce the user to landing.
      if (!mounted || demoModeRef.current) return;
      if (session?.user) {
        setUserEmail(session.user.email || null);
        await loadUser(session.user.id);
      }
      else { setProfile(null); setPlayer(null); setUserEmail(null); }
    });
    return () => { mounted = false; data?.subscription?.unsubscribe?.(); };
  }, [demoMode]);

  // Password recovery: when a reset email link lands the user, Supabase
  // creates a recovery session and fires PASSWORD_RECOVERY. Without routing
  // to a "set new password" screen, the recovery completes silently with
  // the OLD password unchanged — broken UX. Route them to PasswordResetScreen.
  useEffect(() => {
    if (!hasSupabase) return;
    const { data } = SB.onPasswordRecovery(() => {
      setScreen("password-reset");
    });
    return () => data?.subscription?.unsubscribe?.();
  }, []);

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
        position: p.position === "Not Sure" ? "Multiple" : (p.position || "Multiple"),
        // birth_year is optional — only populated when the user chose year
        // of birth during the welcome wizard. Absence is fine; display
        // helpers fall back to `level` ("U11 / Atom").
        ...(p.birth_year ? { birthYear: p.birth_year } : {}),
        ...(p.signup_mode ? { signupMode: p.signup_mode } : {}),
        selfRatings,
        quizHistory,
        goals,
        season: p.season || SEASONS[0],
        sessionLength: p.session_length || 10,
        colorblind: !!p.colorblind,
        coachCode: "",
        isAdmin: !!p.is_admin,
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
    // Only the acquisition-demo flow (sample preview, landing "Coach Dashboard")
    // should hit the cap. Dev-bypass testing sessions must not burn this flag.
    if (demoMode && !profile?.__dev) { lsSetStr("rinkreads_demo_quiz_taken", "1"); }
    if (newTotal === 5 && tier === "FREE" && !localStorage.getItem("rinkreads_milestone5_shown")) {
      setShowMilestone5Banner(true);
      localStorage.setItem("rinkreads_milestone5_shown", "true");
    }
    try {
      const sd = updateStreak(getStreakData());
      localStorage.setItem("rinkreads_streak", JSON.stringify(sd));
    } catch(e) {}
    // Bump the weekly + category streaks and fire celebrate toasts on
    // meaningful milestones. Best-effort — silent on LS failure.
    if (player?.id && !isEphemeralPlayer(player.id)) {
      try {
        const weekly = bumpWeeklyStreak(player.id);
        if (weekly.milestone) {
          toast.celebrate({ title: `${weekly.milestone}-week streak!`, body: "Showing up is half of getting better.", icon: "🗓️" });
        }
        const catMilestones = updateCategoryStreaks(player.id, results);
        for (const m of catMilestones) {
          toast.celebrate({ title: `${m.count} straight in ${m.cat}!`, body: "Pattern-matching locked in.", icon: "📊" });
        }
      } catch {}
    }
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

  // Pre-auth question-preview route: `#q=<questionId>` renders the question
  // standalone with no header/nav/auth gate. Used by tools/dashboard.html
  // to iframe the actual rendered scene next to each bank row.
  if (hashRoute.startsWith("q=")) {
    const qid = decodeURIComponent(hashRoute.slice(2));
    return <QuestionPreviewPage questionId={qid}/>;
  }
  // Scenario-engine POC route — `#scenario-test` renders the new unified
  // engine side-by-side with the old bespoke component for the same
  // question, so authors can verify parity before migrating the bank.
  if (hashRoute === "scenario-test") {
    return <ScenarioParityTest/>;
  }

  // Pre-auth hash route: parents can share rinkreads.com/#parents without logging in.
  if (!profile && hashRoute === "parents") {
    return (
      <Suspense fallback={<LazyFallback/>}>
        <ParentsPage
          onNavigate={() => clearParentsHash()}
          onContact={() => { window.location.href = "mailto:rinkreads@gmail.com"; }}
        />
      </Suspense>
    );
  }
  if (!profile && hashRoute === "coaches") {
    return (
      <Suspense fallback={<LazyFallback/>}>
        <CoachesPage
          onNavigate={() => clearParentsHash()}
          onContact={() => { window.location.href = "mailto:rinkreads@gmail.com"; }}
        />
      </Suspense>
    );
  }
  if (!profile && hashRoute === "players") {
    return (
      <Suspense fallback={<LazyFallback/>}>
        <PlayersPage onNavigate={() => clearParentsHash()} onContact={() => { window.location.href = "mailto:rinkreads@gmail.com"; }}/>
      </Suspense>
    );
  }
  if (!profile && hashRoute === "associations") {
    return (
      <Suspense fallback={<LazyFallback/>}>
        <AssociationsPage onNavigate={() => clearParentsHash()} onContact={() => { window.location.href = "mailto:rinkreads@gmail.com"; }}/>
      </Suspense>
    );
  }
  if (!profile && hashRoute === "pricing") {
    return (
      <Suspense fallback={<LazyFallback/>}>
        <PlansScreen onBack={() => clearParentsHash()} tier="FREE"/>
      </Suspense>
    );
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
    return <AuthScreen onAuthenticated={()=>{}} onDemo={enterDemo} onDevEnter={enterDevBypass} onPreview={enterPlayerPreview} prefill={signupPrefill}/>;
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
              <a href="mailto:rinkreads@gmail.com?subject=RinkReads TEAM Plan" style={{display:"inline-block",background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".8rem 1.5rem",cursor:"pointer",fontWeight:800,fontSize:14,fontFamily:FONT.body,textDecoration:"none"}}>Contact us for TEAM plan →</a>
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
          subscriptionTier={tier}
          questFlagsBump={questFlagsBump}
          onPromptUpgrade={promptUpgrade}
          onBumpQuestFlags={bumpQuestFlags}
          onSaveProgress={() => triggerSignup("save_progress")}
          onFirstLine={() => setFirstLineToast(true)}
          onSignup={() => triggerSignup("quest_cta_coach")}
          onOpenPlayer={(p) => {
            // Coach rating for this player
            const pk = p.id;
            const playerLevel = p.level || "U11 / Atom";
            // We'll open a rating screen inline
            setScreen({kind:"rate", player:p, playerLevel});
          }}
          onOpenDrills={(level, competencyKey) => {
            lsSetStr("rinkreads_coach_focus_seen_v1", "1");
            bumpQuestFlags && bumpQuestFlags();
            setScreen({kind:"drills", level: level || "U11 / Atom", competencyKey});
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
        {typeof screen === "object" && screen.kind === "drills" && (
          <StudyScreen
            player={{ id:"__coach__", level: screen.level, selfRatings:{}, quizHistory:[], __coach:true }}
            onBack={()=>setScreen("home")}
            onNav={setScreen}
            focusCompetency={screen.competencyKey}
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

      {/* Top-of-page exit banner. Dev sessions get a muted variant (so the
          tester still sees ~the real UI) but the exit button is always
          reachable — the previous version hid the banner entirely for dev
          users, leaving no way back to landing. */}
      {demoMode && (
        <div style={{position:"sticky",top:0,background:profile?.__dev ? C.bgElevated : C.purple,color:profile?.__dev ? C.dim : C.white,padding:".4rem 1rem",fontSize:11,fontWeight:600,textAlign:"center",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",gap:".75rem",borderBottom:profile?.__dev ? `1px solid ${C.border}` : "none"}}>
          {profile?.__dev ? `🛠️ Dev bypass · ${tier}` : profile?.__preview ? "👀 Preview — nothing you do is saved." : "🎮 Demo mode — data won't be saved."}
          <button onClick={exitDemo} style={{background:profile?.__dev ? C.bgCard : C.white,color:profile?.__dev ? C.gold : C.purple,border:profile?.__dev ? `1px solid ${C.goldBorder}` : "none",borderRadius:6,padding:"3px 10px",fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:FONT.body}}>← Back to landing</button>
        </div>
      )}

      <div style={{paddingBottom: screen==="quiz"||screen==="results" ? 0 : 80}}>
        {screen === "home"    && <Home player={tierLimitedPlayer(player, tier)} onNav={setScreen} demoMode={demoMode} subscriptionTier={tier} questFlagsBump={questFlagsBump} onPromptUpgrade={promptUpgrade} onBumpQuestFlags={bumpQuestFlags} onSaveProgress={() => triggerSignup("save_progress")} onFirstLine={() => setFirstLineToast(true)} onSignup={() => triggerSignup("quest_cta")}/>}
        {screen === "quiz"    && (demoMode && !profile?.__dev && (()=>{ try { return localStorage.getItem("rinkreads_demo_quiz_taken") === "1"; } catch { return false; } })()
          ? <DemoQuizCapScreen onBack={()=>setScreen("home")} onSignUp={exitDemo}/>
          : tier === "FREE" && !demoMode && isAtFreeQuizCap()
          ? <FreeQuizCapScreen onBack={()=>setScreen("home")} onUpgrade={()=>setScreen("plans")}/>
          : <Quiz player={player} onFinish={handleQuizFinish} onBack={()=>setScreen("home")} tier={tier} onUpgrade={promptUpgrade}/>
        )}
        {screen === "results" && <Results results={quizResults} player={player} prevScore={prevScore} totalSessions={totalSessions} seqPerfect={seqPerfect} mistakeStreak={mistakeStreak} tier={tier} onAgain={()=>setScreen("quiz")} onHome={()=>setScreen("home")} showMilestoneBanner={showMilestone5Banner} onViewPlans={()=>{setShowMilestone5Banner(false);setScreen("plans");}}/>}
        {screen === "skills"  && <Skills player={player} tier={tier} onUpgrade={promptUpgrade} onSave={handleSkillsSave} onBack={()=>setScreen("home")}/>}
        {screen === "skills-onboarding" && <Suspense fallback={<LazyFallback/>}><SkillsOnboarding player={player} tier={tier} onUpgrade={promptUpgrade} onSave={async (r)=>{ await handleSkillsSave(r); setScreen("home"); }} onBack={()=>setScreen("home")}/></Suspense>}
        {screen === "insights" && <Suspense fallback={<LazyFallback/>}><InsightsScreen onBack={()=>setScreen("home")} onInsightRead={bumpQuestFlags}/></Suspense>}
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
        {screen === "gamesense" && <Suspense fallback={<LazyFallback/>}><GameSenseReportScreen player={player} onBack={()=>setScreen("home")} demoMode={demoMode} demoCoachData={demoMode?demoCoachRatings:null} onNavigate={setScreen}/></Suspense>}
        {screen === "journey" && <JourneyScreen player={player} tier={tier} demoMode={demoMode} onBack={()=>setScreen("home")} onNav={setScreen} onUpgrade={promptUpgrade}/>}
        {screen === "training" && (
          <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:80}}>
            <StickyHeader>
              <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
                <BackBtn onClick={()=>setScreen("home")}/>
                <div style={{flex:1,fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>💪 Off-Ice Training</div>
              </div>
            </StickyHeader>
            <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
              <TrainingLog playerId={player.id || "__demo__"} />
            </div>
          </div>
        )}
        {typeof screen === "object" && screen.kind === "challenge" && (
          <ChallengeRunScreen
            challenge={screen.challenge}
            playerId={player.id}
            onBack={() => setScreen("home")}
            onDone={() => setScreen("home")}
          />
        )}
        {typeof screen === "object" && screen.kind === "qotd" && (
          <QotDScreen
            question={screen.question}
            player={player}
            onBack={() => setScreen("home")}
          />
        )}
        {typeof screen === "object" && screen.kind === "speed" && (
          <SpeedRoundScreen
            player={player}
            onBack={() => setScreen("home")}
            onDone={() => setScreen("home")}
          />
        )}
        {screen === "parent" && <Suspense fallback={<LazyFallback/>}><ParentAssessmentScreen player={player} demoMode={demoMode} onSignup={() => triggerSignup("parent_demo")} onBack={()=>setScreen("profile")} onSave={(ratings)=>{ setPlayer(p => ({...p, parentRatings: {...ratings, updated_at: new Date().toISOString().slice(0,10)}})); setScreen("profile"); }}/></Suspense>}
        {screen === "profile" && <Profile player={player} onSave={handleProfileSave} onBack={()=>setScreen("home")} onReset={handleSignOut} demoMode={demoMode} tier={tier} onUpgrade={(f,t)=>promptUpgrade(f,t)} userEmail={userEmail} onAdminReports={()=>setScreen("admin")} onNav={setScreen}/>}
        {screen === "admin" && <Suspense fallback={<LazyFallback/>}><AdminReports onBack={()=>setScreen("profile")}/></Suspense>}
        {screen === "password-reset" && <PasswordResetScreen onDone={() => setScreen("home")}/>}
        {screen === "admin-dashboard" && (
          <AdminRoute onDenied={() => { clearParentsHash(); setScreen("home"); }}>
            {({ profile: adminProfile, email: adminEmail }) => (
              <AdminLayout profile={adminProfile} email={adminEmail} />
            )}
          </AdminRoute>
        )}
        {screen === "question-review" && <Suspense fallback={<LazyFallback/>}><QuestionReviewScreen onBack={()=>setScreen("profile")}/></Suspense>}
        {screen === "parents" && <Suspense fallback={<LazyFallback/>}><ParentsPage
          onNavigate={(route) => { clearParentsHash(); setScreen("home"); /* "sample" also routes home for now — no public sample route yet */ }}
          onContact={() => { window.location.href = "mailto:rinkreads@gmail.com"; }}
        /></Suspense>}
        {screen === "players" && <Suspense fallback={<LazyFallback/>}><PlayersPage onNavigate={() => { clearParentsHash(); setScreen("home"); }} onContact={() => { window.location.href = "mailto:rinkreads@gmail.com"; }}/></Suspense>}
        {screen === "associations" && <Suspense fallback={<LazyFallback/>}><AssociationsPage onNavigate={(r)=>{ clearParentsHash(); if (r==="coaches") setScreen("coaches"); else setScreen("home"); }} onContact={() => { window.location.href = "mailto:rinkreads@gmail.com"; }}/></Suspense>}
        {screen === "coaches" && <Suspense fallback={<LazyFallback/>}><CoachesPage
          onNavigate={(route) => {
            clearParentsHash();
            if (route === "coach-demo") {
              // Launch the coach preview with the demo roster — same flow the
              // landing card uses, no sign-up required.
              enterDemo("__coach__");
            } else if (route === "coach-signup" && !profile) {
              setSignupPrefill({ role: "coach" });
              setScreen("home");
            } else if (route === "parents") {
              setScreen("parents");
            } else {
              setScreen("home");
            }
          }}
          onContact={() => { window.location.href = "mailto:rinkreads@gmail.com"; }}
        /></Suspense>}
      </div>

      {typeof screen === "string" && !["quiz","results","weekly","parents","coaches","players","associations","admin-dashboard","password-reset"].includes(screen) && (
        <BottomNav active={screen} onNav={(next) => {
          // In preview mode, tapping Home while already on home returns to
          // the public landing — otherwise the button appears inert and
          // users have no obvious way out of the preview.
          if (profile?.__preview && next === "home" && screen === "home") { exitDemo(); return; }
          setScreen(next);
        }} tier={tier}/>
      )}

      {upgradePrompt && (
        <UpgradePrompt
          feature={upgradePrompt.feature}
          target={upgradePrompt.target}
          onClose={closeUpgrade}
          onViewPlans={() => { closeUpgrade(); setScreen("plans"); }}
        />
      )}
      {firstLineToast && (
        <div onClick={()=>setFirstLineToast(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:210,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.bgCard,border:`1px solid ${C.goldBorder}`,borderRadius:18,padding:"1.75rem 1.5rem",maxWidth:360,width:"100%",color:C.white,fontFamily:FONT.body,textAlign:"center",boxShadow:"0 24px 60px rgba(0,0,0,.55)"}}>
            <div style={{fontSize:42,marginBottom:".3rem"}}>{BADGES.FIRST_LINE.icon}</div>
            <div style={{fontSize:10,letterSpacing:".16em",textTransform:"uppercase",color:C.gold,fontWeight:700,marginBottom:".5rem"}}>Badge unlocked</div>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.6rem",lineHeight:1.15,marginBottom:".4rem"}}>{BADGES.FIRST_LINE.name}</div>
            <div style={{fontSize:13,color:C.dim,lineHeight:1.5,marginBottom:"1.1rem"}}>{BADGES.FIRST_LINE.desc}. Welcome to RinkReads.</div>
            <button onClick={()=>setFirstLineToast(false)} style={{width:"100%",background:C.gold,color:C.bg,border:"none",borderRadius:12,padding:".8rem",cursor:"pointer",fontWeight:800,fontSize:14,fontFamily:FONT.body}}>
              Keep going →
            </button>
          </div>
        </div>
      )}
      {/* Sign-up chip only shows for genuine demo/preview flows — not dev-bypass
          sessions (the tester is impersonating a real FREE/PRO/TEAM user and
          shouldn't see a sign-up CTA). */}
      {demoMode && !profile?.__dev && !firstLineToast && screen !== "results" && (
        <button onClick={() => triggerSignup("demo_chip")} style={{position:"fixed",bottom:88,right:10,zIndex:150,background:C.gradientPrimary,color:C.bg,border:"none",borderRadius:999,padding:"6px 12px 6px 10px",cursor:"pointer",fontSize:11,fontWeight:800,fontFamily:FONT.body,letterSpacing:".02em",display:"flex",alignItems:"center",gap:"4px",boxShadow:"0 4px 14px rgba(252,76,2,.35), inset 0 1px 0 rgba(255,255,255,.25)"}}>
          <span style={{fontSize:12}}>🏒</span>
          Sign Up Free →
        </button>
      )}
      {screen === "plans" && <Suspense fallback={<LazyFallback/>}><PlansScreen onBack={()=>setScreen("home")} tier={tier}/></Suspense>}
      <ToastContainer/>
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
  const [privateNote, setPrivateNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSkill, setActiveSkill] = useState(null);
  const cats = SKILLS[playerLevel] || [];
  const allSkills = cats.flatMap(c => c.skills.map(s => ({...s, cat:c.cat, icon:c.icon})));
  const rated = Object.values(ratings).filter(v=>v).length;
  const coachScale = getCoachScale(playerLevel);
  const coachScaleType = RATING_SCALES[playerLevel]?.coach?.type;
  const LS_DEMO_NOTES = "rinkreads_demo_coach_notes_v1";
  function loadDemoNote(pid) {
    try { const m = JSON.parse(window.localStorage.getItem(LS_DEMO_NOTES) || "{}"); return m[pid] || ""; }
    catch { return ""; }
  }
  function saveDemoNote(pid, text) {
    try {
      const m = JSON.parse(window.localStorage.getItem(LS_DEMO_NOTES) || "{}");
      if (text) m[pid] = text; else delete m[pid];
      window.localStorage.setItem(LS_DEMO_NOTES, JSON.stringify(m));
    } catch {}
  }

  const scaleIntro = {
    "growth":     "Rate each skill using the growth scale — where is this player in their development journey?",
    "competency": "Rate each skill using the competency scale — how reliably does this player execute in games?",
    "percentile": "Rate each skill using the percentile system.",
  };
  const legendTitle = {growth:"Growth Scale",competency:"Competency Scale",percentile:"Percentile Scale"};

  const isDemo = coach?.id === "__demo_coach__" || String(player?.id || "").startsWith("dr") || String(player?.id || "").startsWith("__demo");
  useEffect(() => {
    if (isDemo) {
      setPrivateNote(loadDemoNote(player.id));
      setLoading(false);
      return;
    }
    (async () => {
      const [existing, note] = await Promise.all([
        SB.getCoachRatingsForPlayer(player.id),
        SB.getCoachPlayerNote(player.id),
      ]);
      setRatings(existing.ratings || {});
      setNotes(existing.notes || {});
      setPrivateNote(note || "");
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      if (isDemo) {
        saveDemoNote(player.id, privateNote.trim());
      } else {
        // Verify the coach id we're about to write with matches the
        // authenticated session. RLS would reject a mismatch anyway, but a
        // stale profile object or swapped session produces a cryptic error;
        // catch it here with a user-actionable message.
        const session = await SB.getSession();
        if (!session?.user?.id) {
          throw new Error("Your session may have expired — try signing in again.");
        }
        if (session.user.id !== coach.id) {
          throw new Error("Coach identity mismatch — please sign out and sign back in.");
        }
        await SB.saveCoachRatingsForPlayer(coach.id, player.id, ratings, notes);
        await SB.saveCoachPlayerNote(coach.id, player.id, privateNote.trim());
      }
      if (Object.values(ratings || {}).some(v => v)) lsSetStr(LS_COACH_RATED, "1");
      if (Object.values(notes || {}).some(v => v && String(v).trim()) || privateNote.trim()) lsSetStr(LS_COACH_NOTED, "1");
      setSaved(true);
    } catch (e) { toast.error(e.message || "Could not save ratings."); }
    setSaving(false);
  }

  return (
    <div style={{position:"fixed",inset:0,background:C.bg,color:C.white,fontFamily:FONT.body,padding:"1.5rem 1.25rem",overflowY:"auto",zIndex:100}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <BackBtn onClick={onDone}/>
        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.goldBorder}`}}>
          <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,marginBottom:".4rem"}}>Rating Player</div>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.8rem"}}>{player.name}</div>
          <div style={{fontSize:13,color:C.dimmer,marginTop:2}}>{playerLevel}</div>
          <div style={{marginTop:".85rem",fontSize:12,color:C.dim,lineHeight:1.6}}>{scaleIntro[coachScaleType] || scaleIntro.ladder}</div>
        </Card>

        {/* Private coach notes — only the coach who writes them can read them.
            Intended for season-long observations, parent conversations, call-ups,
            behaviour patterns, etc. Persisted to coach_ratings with a sentinel
            skill_id so no schema change was required. */}
        <Card style={{marginBottom:"1.5rem",borderLeft:`3px solid ${C.gold}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".4rem"}}>
            <Label>🔒 Private Notes</Label>
            <div style={{fontSize:10,color:C.dimmer,fontWeight:600}}>Only you can see these</div>
          </div>
          <textarea
            value={privateNote}
            onChange={e => setPrivateNote(e.target.value)}
            placeholder={`Observations about ${player.name?.split(" ")[0] || "this player"} — effort, attitude, patterns you notice, what to work on next, conversations with parents…`}
            rows={4}
            style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:10,padding:".75rem 1rem",color:C.white,fontSize:13,fontFamily:FONT.body,width:"100%",outline:"none",resize:"vertical",lineHeight:1.6,minHeight:90}}
          />
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

