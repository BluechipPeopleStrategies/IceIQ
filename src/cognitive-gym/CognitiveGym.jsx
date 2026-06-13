import { useState, useMemo } from "react";
import "./cognitive-gym.css";
import AnticipationDrill from "./AnticipationDrill";
import TrackingDrill from "./TrackingDrill";
import ReactionDrill from "./ReactionDrill";
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
    name: "Head on a Swivel",
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
