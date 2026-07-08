// Challenges Hub — the timeline-game "locked but visible" mechanic applied
// to modes RinkReads already has. Nothing here is a new game mode; it's a
// frame that turns a flat menu into anticipation:
//   Daily Drill    — always open
//   Speed Round    — unlocks when Unit 1 (Skating & Movement) is cleared
//   Weekly Challenge — unlocks when Unit 3 (Hockey Sense) is cleared
// Locked cards show dimmed art + the exact unlock condition, which pulls
// players forward on the Skill Path (GAME_DESIGN_SPEC.md A2).

import React, { useMemo } from "react";
import { C, FONT, StickyHeader, BackBtn } from "../shared.jsx";
import { getPath, levelToBand } from "./pathData.js";
import { getPathState } from "./pathProgress.js";

function unitCleared(path, ps, unitIdx) {
  const u = path.units[unitIdx];
  return !!u && u.nodes.every(n => ps.states.get(n.id) === "done");
}

function ModeCard({ icon, title, blurb, locked, lockText, accent, onGo }) {
  return (
    <button onClick={() => !locked && onGo()} style={{
      width: "100%", textAlign: "left", cursor: locked ? "default" : "pointer",
      background: locked ? C.bgElevated : `linear-gradient(120deg, ${accent}, ${C.bgElevated} 140%)`,
      border: `1px solid ${locked ? C.border : "transparent"}`, borderRadius: 16,
      padding: "1.05rem 1.1rem", marginBottom: ".85rem", color: C.white, fontFamily: FONT.body,
      opacity: locked ? 0.75 : 1, boxShadow: locked ? "none" : "inset 0 -4px 0 rgba(0,0,0,.22)",
      display: "flex", alignItems: "center", gap: ".9rem",
    }}>
      <span style={{ fontSize: 30, filter: locked ? "grayscale(1) opacity(.5)" : "none" }}>{icon}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontFamily: FONT.display, fontSize: "1.15rem", letterSpacing: ".02em", color: locked ? C.dim : "#fff" }}>{title}</span>
        <span style={{ display: "block", fontSize: 12, color: locked ? C.dimmer : "rgba(255,255,255,.88)", lineHeight: 1.4, marginTop: 2 }}>
          {locked ? <>🔒 {lockText}</> : blurb}
        </span>
      </span>
      {!locked && <span style={{ fontSize: 20, color: "#fff" }}>→</span>}
    </button>
  );
}

export function ChallengesHub({ player, onBack, onNav }) {
  const band = levelToBand(player?.level);
  const path = useMemo(() => getPath(band), [band]);
  const ps = useMemo(() => getPathState(player?.id || "__demo__", band, path), [player?.id, band, path]);
  const u1 = unitCleared(path, ps, 0);
  const u3 = unitCleared(path, ps, 2);
  const u1Name = path.units[0]?.name || "Unit 1";
  const u3Name = path.units[2]?.name || "Unit 3";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: FONT.body, paddingBottom: 96 }}>
      <StickyHeader>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", alignItems: "center", gap: ".9rem" }}>
          <BackBtn onClick={onBack}/>
          <div>
            <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: "1.1rem" }}>Challenges</div>
            <div style={{ fontSize: 11, color: C.dimmer }}>Clear the path to open new modes</div>
          </div>
        </div>
      </StickyHeader>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "1rem 1.1rem" }}>
        <ModeCard icon="🎯" title="Daily Drill" accent="#185FA5"
          blurb="One fresh read every day. Keep the streak alive."
          locked={false} onGo={() => onNav({ kind: "qotd" })}/>
        <ModeCard icon="⚡" title="Speed Round" accent="#CF4520"
          blurb="Beat the clock. Fast reads, no second guessing."
          locked={!u1} lockText={`Unlocks when you clear ${u1Name} on the Skill Path`}
          onGo={() => onNav({ kind: "speed" })}/>
        <ModeCard icon="🏆" title="Weekly Challenge" accent="#8a6d1a"
          blurb="Seven days, one leaderboard run. New set every Monday."
          locked={!u3} lockText={`Unlocks when you clear ${u3Name} on the Skill Path`}
          onGo={() => onNav("weekly")}/>
        <div style={{ fontSize: 11.5, color: C.dimmer, textAlign: "center", marginTop: ".6rem", lineHeight: 1.5 }}>
          More modes are coming to this board. Keep clearing skills.
        </div>
      </div>
    </div>
  );
}

export default ChallengesHub;
