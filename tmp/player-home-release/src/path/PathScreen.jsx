// Skill Path — the Duolingo-style home for RinkReads.
//
// A winding vertical path of lesson nodes built from the locked
// curriculum ledger. Units = ledger domains. Nodes = per-age concepts
// at their ledger depth (I/D/M/R). Linear unlock, replayable cleared
// nodes with a 3-star mastery ladder, reward-only XP, daily-streak
// flame in the header (reads the existing rinkreads_streak store).
//
// Tapping a node opens a detail card (concept, depth, "why this
// matters" read connection) with Start / Practice again. onStartLesson
// hands the node to App.jsx, which runs a concept-scoped quiz session.

import React, { useMemo, useState } from "react";
import { C, FONT, StickyHeader, BackBtn } from "../shared.jsx";
import { getPath, levelToBand, DEPTH_BLURB } from "./pathData.js";
import { getPathState } from "./pathProgress.js";

function dailyStreakCount() {
  try {
    const sd = JSON.parse(localStorage.getItem("rinkreads_streak") || "{}");
    return sd.count || sd.current || 0;
  } catch { return 0; }
}

const NODE = 66;        // node diameter
const ANCHOR_NODE = 78; // anchor concepts render bigger
const WAVE = 74;        // horizontal wind amplitude

function Star({ on }) {
  return <span style={{ fontSize: 11, opacity: on ? 1 : 0.25 }}>★</span>;
}

function NodeBubble({ node, state, rec, color, onTap, waveX }) {
  const size = node.anchor ? ANCHOR_NODE : NODE;
  const done = state === "done";
  const active = state === "active";
  const locked = state === "locked";

  const bg = done
    ? `linear-gradient(160deg, ${color.main}, ${C.bgElevated})`
    : active
      ? C.gradientPrimary
      : C.bgElevated;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: `translateX(${waveX}px)`, marginBottom: 26, position: "relative" }}>
      {active && (
        <div style={{
          position: "absolute", top: -30, background: C.bgCard, border: `1px solid ${C.goldBorder}`,
          color: C.gold, fontFamily: FONT.display, letterSpacing: ".14em", fontSize: 11,
          padding: "4px 12px", borderRadius: 8, animation: "rrPathBob 1.6s ease-in-out infinite", zIndex: 2,
        }}>
          START
          <div style={{ position: "absolute", left: "50%", bottom: -5, transform: "translateX(-50%) rotate(45deg)", width: 8, height: 8, background: C.bgCard, borderRight: `1px solid ${C.goldBorder}`, borderBottom: `1px solid ${C.goldBorder}` }}/>
        </div>
      )}
      <button
        onClick={() => !locked && onTap(node)}
        aria-label={`${node.name} — ${locked ? "locked" : done ? "completed" : "start lesson"}`}
        style={{
          width: size, height: size, borderRadius: "50%", cursor: locked ? "default" : "pointer",
          background: bg, border: "none", position: "relative",
          boxShadow: locked
            ? "inset 0 -4px 0 rgba(0,0,0,.35)"
            : `inset 0 -5px 0 rgba(0,0,0,.3), 0 6px 18px ${active ? "rgba(252,76,2,.4)" : "rgba(0,0,0,.35)"}`,
          opacity: locked ? 0.45 : 1,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: node.anchor ? 30 : 26,
          transition: "transform .12s ease",
          animation: active ? "rrPathPulse 2s ease-in-out infinite" : "none",
        }}
        onMouseDown={e => { if (!locked) e.currentTarget.style.transform = "scale(.94)"; }}
        onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        {locked ? "🔒" : done ? (node.anchor ? "🏆" : "✓") : node.anchor ? "🏒" : "🥅"}
        {node.anchor && !locked && (
          <div style={{ position: "absolute", inset: -5, borderRadius: "50%", border: `2px dashed ${done ? color.main : C.gold}`, opacity: 0.7 }}/>
        )}
      </button>
      {done && (
        <div style={{ marginTop: 4, color: color.main, lineHeight: 1 }}>
          <Star on={rec?.stars >= 1}/><Star on={rec?.stars >= 2}/><Star on={rec?.stars >= 3}/>
        </div>
      )}
      <div style={{
        marginTop: done ? 2 : 6, fontSize: 11, fontWeight: 700, fontFamily: FONT.body,
        color: locked ? C.dimmer : C.dim, maxWidth: 120, textAlign: "center", lineHeight: 1.25,
      }}>
        {node.name}
      </div>
    </div>
  );
}

function NodeCard({ node, state, rec, color, onStart, onClose }) {
  const done = state === "done";
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 220, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.bgCard, borderTop: `3px solid ${color.main}`, borderRadius: "18px 18px 0 0",
        padding: "1.4rem 1.25rem 1.6rem", width: "100%", maxWidth: 560, color: C.white, fontFamily: FONT.body,
        boxShadow: "0 -18px 50px rgba(0,0,0,.55)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: ".5rem" }}>
          <span style={{ fontSize: 26 }}>{node.anchor ? "🏒" : "🥅"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT.display, fontSize: "1.25rem", letterSpacing: ".02em" }}>{node.name}</div>
            <div style={{ fontSize: 11, color: color.main, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>
              {node.depthLabel}{node.anchor ? " · Anchor skill" : ""}
            </div>
          </div>
          {done && (
            <div style={{ color: color.main, fontSize: 14 }}>
              {"★".repeat(rec?.stars || 0)}{"☆".repeat(3 - (rec?.stars || 0))}
            </div>
          )}
        </div>
        {node.definition && <div style={{ fontSize: 13.5, color: C.dim, lineHeight: 1.55, marginBottom: ".55rem" }}>{node.definition}</div>}
        {node.readConnection && (
          <div style={{ fontSize: 12.5, color: C.white, lineHeight: 1.5, background: color.dim, border: `1px solid ${C.border}`, borderRadius: 10, padding: ".6rem .7rem", marginBottom: ".65rem" }}>
            <span style={{ fontWeight: 800, color: color.main }}>Why it matters: </span>{node.readConnection}
          </div>
        )}
        <div style={{ fontSize: 11.5, color: C.dimmer, marginBottom: "1rem" }}>{DEPTH_BLURB[node.depth] || ""}</div>
        <button onClick={() => onStart(node)} style={{
          width: "100%", background: C.gradientPrimary, color: C.white, border: "none", borderRadius: 12,
          padding: ".95rem", cursor: "pointer", fontWeight: 800, fontSize: 15, fontFamily: FONT.body,
          boxShadow: "inset 0 -4px 0 rgba(0,0,0,.25)",
        }}>
          {done ? `Practice again ${rec?.stars >= 3 ? "· keep it sharp" : "· go for " + ((rec?.stars || 0) + 1) + " stars"}` : "Start lesson →"}
        </button>
        <button onClick={onClose} style={{ width: "100%", marginTop: ".55rem", background: "none", color: C.dim, border: "none", padding: ".5rem", cursor: "pointer", fontSize: 13, fontFamily: FONT.body }}>
          Not now
        </button>
      </div>
    </div>
  );
}

function UnitBanner({ unit, unitNum, totalUnits, clearedInUnit }) {
  return (
    <div style={{
      background: `linear-gradient(120deg, ${unit.color.main}, ${C.bgElevated} 130%)`,
      borderRadius: 14, padding: "1rem 1.1rem", margin: "1.6rem 0 1.4rem",
      boxShadow: "inset 0 -4px 0 rgba(0,0,0,.22)",
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(255,255,255,.85)", fontFamily: FONT.body }}>
        Unit {unitNum} of {totalUnits} · {clearedInUnit}/{unit.nodes.length} cleared
      </div>
      <div style={{ fontFamily: FONT.display, fontSize: "1.35rem", color: "#fff", letterSpacing: ".02em", margin: "2px 0 3px" }}>{unit.name}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,.85)", lineHeight: 1.45, fontFamily: FONT.body }}>{unit.definition}</div>
    </div>
  );
}

export function PathScreen({ player, onBack, onStartLesson }) {
  const band = levelToBand(player?.level);
  const path = useMemo(() => getPath(band), [band]);
  const playerId = player?.id || "__demo__";
  const [tick, setTick] = useState(0); // eslint-disable-line no-unused-vars
  const ps = useMemo(() => getPathState(playerId, band, path), [playerId, band, path, tick]);
  const [openNode, setOpenNode] = useState(null);
  const streak = dailyStreakCount();
  const allDone = ps.clearedCount === ps.totalCount && ps.totalCount > 0;

  let flatIdx = 0;
  let nodesSeen = 0;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: FONT.body, paddingBottom: 96 }}>
      <style>{`
        @keyframes rrPathPulse { 0%,100% { box-shadow: inset 0 -5px 0 rgba(0,0,0,.3), 0 0 0 0 rgba(252,76,2,.45);} 50% { box-shadow: inset 0 -5px 0 rgba(0,0,0,.3), 0 0 0 14px rgba(252,76,2,0);} }
        @keyframes rrPathBob { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-5px);} }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
      `}</style>

      <StickyHeader>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", alignItems: "center", gap: ".9rem" }}>
          <BackBtn onClick={onBack}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: "1.1rem", letterSpacing: ".02em" }}>Skill Path · {band}</div>
            <div style={{ fontSize: 11, color: C.dimmer }}>{ps.clearedCount}/{ps.totalCount} skills cleared</div>
          </div>
          <div title="Day streak" style={{ display: "flex", alignItems: "center", gap: 4, background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 999, padding: "4px 10px", fontSize: 13, fontWeight: 800 }}>
            🔥 <span style={{ color: streak > 0 ? C.gold : C.dimmer }}>{streak}</span>
          </div>
          <div title="Path XP" style={{ display: "flex", alignItems: "center", gap: 4, background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 999, padding: "4px 10px", fontSize: 13, fontWeight: 800 }}>
            ⚡ <span style={{ color: C.blue }}>{ps.xp}</span>
          </div>
        </div>
      </StickyHeader>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 1.1rem" }}>
        {path.units.map((unit, ui) => {
          const clearedInUnit = unit.nodes.filter(n => ps.states.get(n.id) === "done").length;
          return (
            <div key={unit.id}>
              <UnitBanner unit={unit} unitNum={ui + 1} totalUnits={path.units.length} clearedInUnit={clearedInUnit}/>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {unit.nodes.map(node => {
                  const waveX = Math.round(Math.sin((flatIdx = nodesSeen++) * 1.05) * WAVE);
                  return (
                    <NodeBubble
                      key={node.id}
                      node={node}
                      state={ps.states.get(node.id)}
                      rec={ps.done[node.id]}
                      color={unit.color}
                      waveX={waveX}
                      onTap={setOpenNode}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        <div style={{ textAlign: "center", margin: "2rem 0 1rem" }}>
          <div style={{ fontSize: 46, filter: allDone ? "none" : "grayscale(1) opacity(.4)" }}>🏆</div>
          <div style={{ fontFamily: FONT.display, fontSize: "1.05rem", color: allDone ? C.gold : C.dimmer, letterSpacing: ".04em" }}>
            {allDone ? `${band} path complete` : `Clear every skill to finish the ${band} path`}
          </div>
          {allDone && <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>Replay any node to push it to 3 stars.</div>}
        </div>
      </div>

      {openNode && (
        <NodeCard
          node={openNode}
          state={ps.states.get(openNode.id)}
          rec={ps.done[openNode.id]}
          color={path.units[openNode.unitIdx].color}
          onClose={() => setOpenNode(null)}
          onStart={(n) => { setOpenNode(null); onStartLesson(n); }}
        />
      )}
    </div>
  );
}

export default PathScreen;
