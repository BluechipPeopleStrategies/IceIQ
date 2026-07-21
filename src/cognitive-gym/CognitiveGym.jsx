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
  {
    id: "bestoption",
    name: "Best Option",
    skill: "Decisions",
    blurb: "The play freezes on your stick. Shoot, pass, or carry, pick the best read fast.",
    goal: "Read the frozen play and pick the best option, shoot, pass, or carry, before the clock runs out.",
    why: "When you get the puck in the offensive zone you have a heartbeat to decide: shoot it, move it, or take it. Good players make that read fast and make it right, so they get the shot off before the lane closes, find the open teammate before the defender slides over, or keep their feet moving when nothing is there yet. Training that shoot, pass, or carry decision is how you stop freezing with the puck and start making the play the ice is giving you.",
    trains: "Reading shoot/pass/carry fast, deciding under pressure, not freezing with the puck",
    build: "canvas",
    component: BestOptionDrill,
  },
  {
    id: "readnumbers",
    name: "Read the Numbers",
    skill: "Vision",
    blurb: "Read a number off a skater streaking across the ice, then pick it.",
    goal: "Read the number on the jersey of a skater streaking across the ice, then pick it before it slips your mind.",
    why: "On the ice the play never holds still. Picking a teammate's number off a jersey as they fly up the wing, or clocking a number on the rush, is how you find the open man and put the puck on the right tape instead of guessing. Training your eyes to lock onto a small, fast-moving target is the same skill that helps you track the puck and read bodies at full speed.",
    trains: "Dynamic visual acuity, tracking a fast target, reading numbers on the move",
    build: "canvas",
    component: ReadNumbersDrill,
  },
  {
    id: "lateread",
    name: "Late Read",
    skill: "Adapting",
    blurb: "Pass to the cued teammate, but switch if a defender steps up late.",
    goal: "Hit the teammate the play is going to right now, and switch if a defender steps up and the read changes late.",
    why: "The play you saw a second ago is not always the play that is there now. A defender steps up, a lane closes, and the right pass becomes the wrong one. Good players do not force their first idea once the ice changes. They keep their head up, read the defender stepping into the lane, and switch to the teammate who is open now. Training that, not committing too early and adjusting when the picture changes, is how you stop throwing pucks into trouble and start making the play the ice is actually giving you.",
    trains: "Reading a late change, inhibiting your first idea, switching when the ice changes",
    build: "canvas",
    component: LateReadDrill,
  },
  {
    id: "twothings",
    name: "Two Things at Once",
    skill: "Focus",
    blurb: "Tap the puck as it crosses center, and call the shape that flashes, both at once.",
    goal: "Tap the puck right as it crosses the center line, and tap the shape that flashes up top, at the same time. Both count.",
    why: "Hockey never asks you to do one thing at a time. You track the puck and the play while still reading where bodies and lanes are, all at once. Training your brain to hold two jobs at the same time, the puck in front of you and a cue off to the side, is how you keep your head up for two things at once instead of locking onto one and losing the other.",
    trains: "Divided attention, tracking the play while reading a cue, keeping your head up for two things at once",
    build: "canvas",
    component: TwoThingsDrill,
  },
  {
    id: "shootout",
    name: "Shootout",
    skill: "Shot Read",
    blurb: "Skate in alone, read the goalie, pick your spot before you run out of ice.",
    goal: "Win the shootout: read which part of the net is open on the way in and shoot it before the goalie takes it away.",
    why: "Breakaway scorers don't guess. They read the goalie on the way in and shoot where he isn't. Every goalie has a tell, and the scouting report only helps if you use it. Training that read at speed, with the window closing, is how you stay calm in alone instead of shooting into a pad.",
    trains: "Reading the goalie, shot selection under pressure, using a scouting report",
    build: "canvas",
    component: ShootoutDrill,
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
          Train the part of your game that happens between the ears. Two or three
          short sessions a week.
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
          The Brain Gym trains the part of your game that happens between the
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
              <DrillIcon id={d.id} />
              <span className="gym-skill-tag">{d.skill}</span>
              <h3>{d.name}</h3>
              <p>{d.blurb}</p>
              <p className="gym-card-trains">Trains: {d.trains}</p>
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
