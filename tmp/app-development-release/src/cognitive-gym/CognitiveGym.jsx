import { useState, useMemo, useEffect } from "react";
import "./cognitive-gym.css";
import AnticipationDrill from "./AnticipationDrill";
import TrackingDrill from "./TrackingDrill";
import ReactionDrill from "./ReactionDrill";
import EyesUpDrill from "./EyesUpDrill";
import SnapshotDrill from "./SnapshotDrill";
import FindLaneDrill from "./FindLaneDrill";
import BestOptionDrill from "./BestOptionDrill";
import ReadNumbersDrill from "./ReadNumbersDrill";
import LateReadDrill from "./LateReadDrill";
import TwoThingsDrill from "./TwoThingsDrill";
import ShootoutDrill from "./ShootoutDrill";
import RunThePlayDrill from "./RunThePlayDrill";
import DrillIcon from "./DrillIcon";
import { getDrill, getStats, calibrateDrill } from "./gymStorage";
import { isMuted, setMuted } from "./gymAudio";
import { starTier, xpFromPoints, rankForXp, dailyDrillsDone, earnedBadges } from "./gymProgressCore";

// The drill registry. Add a drill by appending an entry here; the hub renders
// the card and routes into the component automatically.
const DRILLS = [
  {
    id: "anticipation",
    name: "Read the Pass",
    skill: "Anticipation",
    blurb: "Predict where a hidden puck crosses the line.",
    goal: "Predict where the hidden puck crosses the gold bar.",
    why: "What clues help you predict where a pass is going? Describe what you saw before the puck disappeared.",
    trains: "Predicting a hidden puck's path",
    build: "canvas",
    component: AnticipationDrill,
  },
  {
    id: "tracking",
    name: "Baylor's Pick",
    skill: "Awareness",
    blurb: "Track three teammates through traffic.",
    goal: "Follow the three marked teammates as they move.",
    why: "Which teammate was hardest to follow through traffic? Describe where you last saw them, as you would when talking through a play.",
    trains: "Following three moving targets",
    build: "canvas",
    component: TrackingDrill,
  },
  {
    id: "reaction",
    name: "Shoot or Hold",
    skill: "Reaction",
    blurb: "Tap for SHOOT. Wait for HOLD or FAKE.",
    goal: "Tap for SHOOT. Wait for HOLD or FAKE.",
    why: "The word tells you what to do here. In a hockey play, which visible clues would help you decide whether to shoot or wait?",
    trains: "Responding to a cue or waiting",
    build: "canvas",
    component: ReactionDrill,
  },
  {
    id: "eyesup",
    name: "Eyes Up",
    skill: "Vision",
    blurb: "Look at the center puck and notice a flash beside it.",
    goal: "Look at the center puck and notice where a marker flashes.",
    why: "What can you notice beside you while looking ahead? Ask a coach when you would also turn your head to check the ice.",
    trains: "Noticing a flash beside the center puck",
    build: "canvas",
    component: EyesUpDrill,
  },
  {
    id: "snapshot",
    name: "Snapshot",
    skill: "Memory",
    blurb: "Look, then tap where the marked teammate was.",
    goal: "Remember where the gold, double-ringed teammate appeared.",
    why: "What helped you remember the spot? In a hockey play, what could change after your last look?",
    trains: "Remembering a marked spot",
    build: "canvas",
    component: SnapshotDrill,
  },
  {
    id: "findlane",
    name: "Find the Lane",
    skill: "Vision",
    blurb: "Find a clear passing lane and tap that teammate.",
    goal: "Tap the teammate with a clear passing lane before time runs out.",
    why: "Point out the defender beside a blocked lane. What would have to change for that pass to become an option?",
    trains: "Spotting a clear lane between markers",
    build: "canvas",
    component: FindLaneDrill,
  },
  {
    id: "bestoption",
    name: "Best Option",
    skill: "Decisions",
    blurb: "Look at the frozen play. Choose shoot, pass, or carry.",
    goal: "Look at the lanes, then choose shoot, pass, or carry.",
    why: "Which player or lane helped you choose? Show a coach what you saw and discuss whether another choice could work.",
    trains: "Choosing an action from a frozen scene",
    build: "canvas",
    component: BestOptionDrill,
  },
  {
    id: "readnumbers",
    name: "Read the Numbers",
    skill: "Memory",
    blurb: "Watch the numbers, then find the skater whose number is called.",
    goal: "Remember each skater's number and spot.",
    why: "What helped you link a number to a spot? When skaters move during hockey, what would you need to check again?",
    trains: "Remembering numbers and positions",
    build: "canvas",
    component: ReadNumbersDrill,
  },
  {
    id: "lateread",
    name: "Late Read",
    skill: "Adapting",
    blurb: "Pass to the cued teammate, but switch if a defender steps up late.",
    goal: "Tap the cued teammate and watch for a late change.",
    why: "What changed before your tap? Describe how the defender's position affected the pass you were considering.",
    trains: "Following a cue when its target changes",
    build: "canvas",
    component: LateReadDrill,
  },
  {
    id: "twothings",
    name: "Two Things at Once",
    skill: "Focus",
    blurb: "Time the puck crossing and match the flashed shape.",
    goal: "Time the puck crossing and match the flashed shape in each round.",
    why: "Which cue did you notice first? Talk with a coach about a moment when you wanted to watch the puck and another player.",
    trains: "Timing a tap while watching for a shape",
    build: "canvas",
    component: TwoThingsDrill,
  },
  {
    id: "shootout",
    name: "Shootout",
    skill: "Shot Read",
    blurb: "Skate in alone, read the goalie, pick your spot before you run out of ice.",
    goal: "Win the shootout: read which part of the net is open on the way in and shoot it before the goalie takes it away.",
    why: "Look at the goalie before you choose a target. In this game, open spots can close as you approach. Use the scouting report, then check what is open right now. What changed your choice?",
    trains: "Choosing a target from the goalie's openings",
    build: "canvas",
    component: ShootoutDrill,
  },
  {
    id: "runtheplay",
    name: "Run the Play",
    skill: "Memory",
    blurb: "Watch a passing sequence, then tap it back in order.",
    goal: "Watch the passing order, then tap it back.",
    why: "Tell a coach who received the puck first, next, and last. Which part of a passing play would you like to see again?",
    trains: "Repeating a sequence of passes",
    build: "canvas",
    component: RunThePlayDrill,
  },
];

export default function CognitiveGym({ playerId = "default", onBack, ageBand = null }) {
  const [activeId, setActiveId] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [muted, setMutedState] = useState(() => isMuted());

  const stats = useMemo(() => getStats(playerId), [playerId, refresh]);
  const records = useMemo(
    () =>
      Object.fromEntries(DRILLS.map((d) => [d.id, getDrill(playerId, d.id)])),
    [playerId, refresh]
  );

  // Smarter start: when the gym opens, seed every untouched drill to the age band.
  useEffect(() => {
    if (!ageBand) return;
    try {
      DRILLS.forEach((d) => calibrateDrill(playerId, d.id, ageBand));
      setRefresh((r) => r + 1); // re-read seeded levels
    } catch { /* storage unavailable */ }
  }, [playerId, ageBand]);

  const DAILY_GOAL = 2;
  const todayYmd = new Date().toISOString().slice(0, 10);
  const totalXp = xpFromPoints(stats.careerPoints || 0);
  const rank = rankForXp(totalXp);
  const goalDone = dailyDrillsDone(records, todayYmd);
  const badges = earnedBadges(stats, records);

  if (activeId) {
    const Drill = DRILLS.find((d) => d.id === activeId).component;
    return (
      <div className="gym-root gym-root--active">
        <Drill
          playerId={playerId}
          onExit={() => {
            setActiveId(null);
            setRefresh((r) => r + 1); // re-read stats/records after a session
          }}
        />
      </div>
    );
  }

  return (
    <div className="gym-root gym-root--hub">
      {onBack && (
        <button
          className="gym-btn gym-btn-ghost"
          style={{ marginBottom: 14 }}
          onClick={onBack}
        >
          ← Back
        </button>
      )}
      <header className="gym-header">
        <span className="gym-kicker">RinkReads training lab</span>
        <h1>Brain Gym</h1>
        <button
          type="button"
          className="gym-btn gym-btn-ghost gym-mute"
          aria-pressed={muted}
          onClick={() => { setMuted(!muted); setMutedState(!muted); }}
        >
          {muted ? "🔇 Sound off" : "🔊 Sound on"}
        </button>
        <p className="gym-sub">
          Pick a short game. Watch the cues, make your choice, and check the result.
        </p>
        <div className="gym-stats">
          <div className="gym-stat">
            <span className="gym-stat-num">{rank.name}</span>
            <span className="gym-stat-label">rank ({totalXp} XP)</span>
          </div>
          <div className="gym-stat">
            <span className="gym-stat-num">{goalDone}/{DAILY_GOAL}</span>
            <span className="gym-stat-label">today's goal</span>
          </div>
          <div className="gym-stat">
            <span className="gym-stat-num">{stats.streak}</span>
            <span className="gym-stat-label">day streak</span>
          </div>
          <div className="gym-stat">
            <span className="gym-stat-num">{stats.longestStreak ?? 0}</span>
            <span className="gym-stat-label">best streak</span>
          </div>
          <div className="gym-stat">
            <span className="gym-stat-num">{stats.totalSessions}</span>
            <span className="gym-stat-label">sessions</span>
          </div>
          <div className="gym-stat">
            <span className="gym-stat-num">{stats.daysTrained}</span>
            <span className="gym-stat-label">days trained</span>
          </div>
          <div className="gym-stat">
            <span className="gym-stat-num">{stats.careerPoints ?? 0}</span>
            <span className="gym-stat-label">points</span>
          </div>
          <div className="gym-stat">
            <span className="gym-stat-num">{stats.bestSessionPoints ?? 0}</span>
            <span className="gym-stat-label">best session</span>
          </div>
          <div className="gym-stat">
            <span className="gym-stat-num">{stats.topLevel ?? 1}</span>
            <span className="gym-stat-label">top level</span>
          </div>
          <div className="gym-stat">
            <span className="gym-stat-num">{stats.fastestRt ? stats.fastestRt : "-"}</span>
            <span className="gym-stat-label">fastest ms</span>
          </div>
        </div>
      </header>

      <section className="gym-badges" aria-label="Badges">
        {badges.map((b) => (
          <span
            key={b.id}
            className={"gym-badge" + (b.earned ? " gym-badge-on" : "")}
            title={b.earned ? "Earned" : "Locked"}
          >
            {b.earned ? "★" : "☆"} {b.label}
          </span>
        ))}
      </section>

      <section className="gym-about">
        <h2>What this is</h2>
        <p>
          Twelve games with five rounds per session. Follow moving targets,
          remember a picture, or choose an action from the cues you see.
        </p>
        <ul>
          <li>Read the game's goal and controls before you start.</li>
          <li>The level adjusts after a run of results, making the task easier or harder.</li>
          <li>Use the result to spot what you noticed and what you want to try next.</li>
        </ul>
      </section>

      <div className="gym-grid">
        {DRILLS.map((d) => {
          const rec = records[d.id];
          const last = rec.sessions[rec.sessions.length - 1];
          return (
            <button
              key={d.id}
              type="button"
              className="gym-drill-card"
              onClick={() => setActiveId(d.id)}
            >
              <DrillIcon id={d.id} />
              <span className="gym-skill-tag">{d.skill}</span>
              <h3>{d.name}</h3>
              <p>{d.blurb}</p>
              <p className="gym-card-trains">Practice: {d.trains}</p>
              <div className="gym-card-stars" aria-label={`Mastery ${starTier(rec.level)} of 3`}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={i < starTier(rec.level) ? "gym-star on" : "gym-star"}>
                    {i < starTier(rec.level) ? "★" : "☆"}
                  </span>
                ))}
                <span className="gym-star-tier">{["", "Bronze", "Silver", "Gold"][starTier(rec.level)]}</span>
              </div>
              <div className="gym-card-meta">
                <span>Lvl {rec.level}</span>
                <span>Best {rec.bestPoints || rec.best}</span>
                <span>
                  {last
                    ? `Last ${new Date(last.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}`
                    : "Not played yet"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
