import React, { useEffect, useRef, useState } from "react";
import RinkStage from "../scenario/RinkStage.jsx";
import { OptionsOverlay, BoardBoundary } from "./ReviewBoard.jsx";
import { stepToScenario } from "../scenario/multiStep.js";
import { ageTierOf, flagOf } from "./browseCore.js";
import { C, FONT } from "../shared.jsx";

// One grid cell: a lazy-mounted mini board + a flag badge + an "age · node" caption.
// The SVG only mounts when the tile scrolls near the viewport (IntersectionObserver),
// so a 148-board grid doesn't render 148 SVGs at once.
const BADGE = { coach: "🚩", mine: "⚠", clean: "", unreviewed: "" };
const VLABEL = { keep: "KEEP", revise: "REVISE", retire: "RETIRE" };

export default function BrowseTile({ scenario, coach, myVerdict, revised, onOpen }) {
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

  const flag = flagOf(scenario, coach, myVerdict);
  const badge = BADGE[flag];
  const kept = myVerdict?.verdict === "keep";
  const reviewed = !!myVerdict?.verdict;           // I've given this board a verdict
  const noted = !!(myVerdict?.note && myVerdict.note.trim()); // ...and left a note
  const caption = [ageTierOf(scenario), scenario.nodeId].filter(Boolean).join(" · ");
  // Multi-step boards have no top-level actors; thumbnail the first frame so
  // RinkStage never gets actors=undefined (which would throw and crash the grid).
  const board = (Array.isArray(scenario.steps) && scenario.steps.length) ? stepToScenario(scenario, 0) : scenario;

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
      <div style={{ width: "100%", aspectRatio: "2 / 1", background: C.bg }}>
        {shown
          ? <BoardBoundary fallback={<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: C.dim, fontSize: ".7rem" }}>board ⚠</div>}>
              <RinkStage stage={board.stage} actors={board.actors} levels={board.levels}>
                {() => <OptionsOverlay scenario={board} />}
              </RinkStage>
            </BoardBoundary>
          : <div style={{ width: "100%", height: "100%" }} />}
      </div>
      <div style={{ padding: ".3rem .45rem", fontSize: ".68rem", letterSpacing: ".03em", color: C.gold, fontFamily: FONT.body }}>{caption}</div>
    </button>
  );
}
