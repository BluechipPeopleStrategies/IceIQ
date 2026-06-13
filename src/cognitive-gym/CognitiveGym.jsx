import { useState, useMemo } from "react";
import "./cognitive-gym.css";
import AnticipationDrill from "./AnticipationDrill";
import TrackingDrill from "./TrackingDrill";
import ReactionDrill from "./ReactionDrill";
import EyesUpDrill from "./EyesUpDrill";
import SnapshotDrill from "./SnapshotDrill";
import FindLaneDrill from "./FindLaneDrill";
import { getDrill, getStats } from "./gymStorage";

// The drill registry. Add a drill by appending an entry here; the hub renders
// the card and routes into the component automatically.
const DRILLS = [
  {
    id: "anticipation",
    name: "Read the Pass",
    skill: "Anticipation",
    blurb: "Predict where a hidden puck crosses the line.",
    goal: "Call where the puck is going before it gets there.",
    why: "Reading a pass early is how you pick off a lane, beat a player to the spot, and arrive where the puck will be instead of chasing where it was.",
    trains: "Reading plays, picking off passes, judging bank passes",
    build: "canvas",
    component: AnticipationDrill,
  },
  {
    id: "tracking",
    name: "Baylor's Pick",
    skill: "Awareness",
    blurb: "Track three teammates through traffic.",
    goal: "Keep track of all three teammates at once, even while the play is moving.",
    why: "Knowing where your options are without staring at the puck is how you find the open man, break out cleanly, and see the check before it arrives.",
    trains: "Rink awareness without puck-watching, seeing hits coming",
    build: "canvas",
    component: TrackingDrill,
  },
  {
    id: "reaction",
    name: "Shoot or Hold",
    skill: "Reaction",
    blurb: "Tap on blue. Hold on orange. Beat the clock.",
    goal: "Fire on blue, stay still on orange, and beat the clock every time.",
    why: "A faster release gets the puck off before the window closes, and the discipline to hold stops you from forcing a bad pass or jumping offside.",
    trains: "Quick release, shot/pass discipline, not jumping early",
    build: "canvas",
    component: ReactionDrill,
  },
  {
    id: "eyesup",
    name: "Eyes Up",
    skill: "Vision",
    blurb: "Keep your eyes centered and catch a flash in the corner.",
    goal: "Keep your eyes on the center puck and catch where a teammate flashes out of the corner of your eye.",
    why: "Hockey is played with your eyes up, not glued to the puck. Catching a teammate or a checker out of the corner of your eye is how you make the shoulder check, find the back-door option, and feel the play around you before you ever turn your head.",
    trains: "Scanning, shoulder checks, seeing the back-door without puck-watching",
    build: "canvas",
    component: EyesUpDrill,
  },
  {
    id: "snapshot",
    name: "Snapshot",
    skill: "Memory",
    blurb: "Glance once, then tap where the open teammate was.",
    goal: "Take one quick snapshot of the ice and remember where the open teammate was.",
    why: "Good players read the ice in one heads-up look before the pass arrives, so they already know their options the moment they get the puck. Training that one-glance snapshot is how you make a quick play under pressure instead of stickhandling with your head down looking for help.",
    trains: "Reading the ice in one glance, knowing your options before the puck arrives",
    build: "canvas",
    component: SnapshotDrill,
  },
  {
    id: "findlane",
    name: "Find the Lane",
    skill: "Vision",
    blurb: "Spot the one teammate with a clean lane and hit them before it closes.",
    goal: "Spot the one teammate with a clean passing lane and hit them before it closes.",
    why: "The puck is only yours for a second, and the open seam does not stay open. Learning to see the one clear lane through traffic, and to thread the pass before a defender slides over to take it away, is how you turn a scramble into a clean play and put the puck on a teammate's tape instead of into a shin pad.",
    trains: "Seeing the open seam, threading a pass through traffic, deciding fast",
    build: "canvas",
    component: FindLaneDrill,
  },
];

export default function CognitiveGym({ playerId = "default", onBack }) {
  const [activeId, setActiveId] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const stats = useMemo(() => getStats(playerId), [playerId, refresh]);
  const records = useMemo(
    () =>
      Object.fromEntries(DRILLS.map((d) => [d.id, getDrill(playerId, d.id)])),
    [playerId, refresh]
  );

  if (activeId) {
    const Drill = DRILLS.find((d) => d.id === activeId).component;
    return (
      <div className="gym-root">
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
    <div className="gym-root">
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
        <h1>Cognitive Gym</h1>
        <p className="gym-sub">
          Train the part of your game that happens between the ears. Two or three
          short sessions a week.
        </p>
        <div className="gym-stats">
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

      <section className="gym-about">
        <h2>What this is</h2>
        <p>
          The Cognitive Gym trains the part of your game that happens between the
          ears: anticipation, awareness, and fast, clean decisions. Short
          sessions, a few times a week, and the level climbs as you do.
        </p>
        <ul>
          <li>Keep sessions short. Two or three a week beats one long grind.</li>
          <li>Each game adapts. String good reps together and you move up.</li>
          <li>Slip and you drop back a level, so every rep counts.</li>
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
              <span className="gym-skill-tag">{d.skill}</span>
              <h3>{d.name}</h3>
              <p>{d.blurb}</p>
              <p className="gym-card-trains">Trains: {d.trains}</p>
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
