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
    trains: "Reading plays, picking off passes, judging bank passes",
    component: AnticipationDrill,
  },
  {
    id: "tracking",
    name: "Head on a Swivel",
    skill: "Awareness",
    blurb: "Track three teammates through traffic.",
    trains: "Rink awareness without puck-watching, seeing hits coming",
    component: TrackingDrill,
  },
  {
    id: "reaction",
    name: "Shoot or Hold",
    skill: "Reaction",
    blurb: "Tap on blue. Hold on orange. Beat the clock.",
    trains: "Quick release, shot/pass discipline, not jumping early",
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
        </div>
      </header>

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
                <span>Best {rec.best}</span>
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
