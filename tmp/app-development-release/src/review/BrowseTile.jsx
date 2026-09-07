import React, { useEffect, useRef, useState } from "react";
import RinkStage from "../scenario/RinkStage.jsx";
import { OptionsOverlay, BoardBoundary } from "./ReviewBoard.jsx";
import { stepToScenario } from "../scenario/multiStep.js";
import { toGraph, flattenNode } from "../scenario/branching.js";
import { ageTierOf, flagOf, questionTypeLabel } from "./browseCore.js";
import { hasBoard } from "./reviewCore.js";
import { levelsOf } from "../scenario/youngRink.js";
import { C, FONT } from "../shared.jsx";

// One grid cell: a lazy-mounted mini board (or a text card for board-less
// questions) + a flag badge + an "age · node" caption. The SVG only mounts when
// the tile scrolls near the viewport so a big grid doesn't render every SVG.
const BADGE = { player: "🚩", coach: "🤖", mine: "⚠", clean: "", unreviewed: "" };
const VLABEL = { keep: "KEEP", revise: "REVISE", retire: "RETIRE" };

export default function BrowseTile({ scenario, coach, myVerdict, revised, reported, onOpen }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown || !ref.current || typeof IntersectionObserver === "undefined") { if (!shown) setShown(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) { setShown(true); io.disconnect(); }
    }, { rootMargin: "300px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [shown]);

  const flag = flagOf(scenario, coach, myVerdict, reported);
  const badge = BADGE[flag];
  const kept = myVerdict?.verdict === "keep";
  const reviewed = !!myVerdict?.verdict;           // I've given this board a verdict
  const noted = !!(myVerdict?.note && myVerdict.note.trim()); // ...and left a note
  const caption = [ageTierOf(scenario), scenario.nodeId].filter(Boolean).join(" · ");
  const isBoard = hasBoard(scenario);
  // Multi-step boards have no top-level actors; thumbnail the first frame so
  // RinkStage never gets actors=undefined (which would throw and crash the grid).
  const board = (scenario.nodes && scenario.entry)
    ? flattenNode(scenario, toGraph(scenario).entry[0])
    : (Array.isArray(scenario.steps) && scenario.steps.length) ? stepToScenario(scenario, 0) : scenario;
  const stem = scenario.interaction?.prompt || scenario.mc?.stem || scenario.sit || scenario.q || "";

  return (
    <button ref={ref} onClick={() => onOpen(scenario)}
      style={{ position: "relative", padding: 0, border: `1px solid ${reviewed ? C.gold : C.border}`, borderRadius: 10, background: C.bgCard, cursor: "pointer", overflow: "hidden", textAlign: "left", opacity: reviewed ? 1 : 0.82 }}>
      {reviewed && (
        <div style={{ position: "absolute", top: 4, left: 6, zIndex: 2, display: "flex", alignItems: "center", gap: 3, fontSize: ".58rem", fontWeight: 700, letterSpacing: ".05em", padding: "1px 6px", borderRadius: 999, background: C.goldDim, color: C.gold }}>
          {VLABEL[myVerdict.verdict]}{noted ? " 📝" : ""}
        </div>
      )}
      <div style={{ position: "absolute", top: 4, right: 6, zIndex: 2, fontSize: ".9rem" }}>
        {badge}{kept ? " ✓" : ""}{revised ? " ◍" : ""}
      </div>
      <div style={{ width: "100%", aspectRatio: "2 / 1", background: isBoard ? C.bg : C.bgCard }}>
        {!isBoard
          ? <div style={{ width: "100%", height: "100%", padding: ".45rem .55rem", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: ".25rem", overflow: "hidden" }}>
              <span style={{ fontSize: ".58rem", fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "#5BA4E8" }}>{questionTypeLabel(scenario)}</span>
              <span style={{ fontSize: ".72rem", color: C.dim, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{stem}</span>
            </div>
          : shown
          ? <BoardBoundary fallback={<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: C.dim, fontSize: ".7rem" }}>board ⚠</div>}>
              <RinkStage stage={board.stage} actors={board.actors} levels={levelsOf(board)}>
                {() => <OptionsOverlay scenario={board} />}
              </RinkStage>
            </BoardBoundary>
          : <div style={{ width: "100%", height: "100%" }} />}
      </div>
      <div style={{ padding: ".3rem .45rem", fontSize: ".68rem", letterSpacing: ".03em", color: C.gold, fontFamily: FONT.body }}>{caption || questionTypeLabel(scenario)}</div>
    </button>
  );
}
