// Engine-side overlay layer. Renders q.overlays[] as positioned divs on top
// of an image-backed question. Lets authors ship overlays as JSON data
// (sprites + text + puck) without flattening to a baked PNG — the engine
// composites them at render time.
//
// Sprite sheets live at /assets/sprites/{player-yellow.png, player-black.png,
// goalie.png}. Coordinate space: 0–1 normalized (matches the author tool).

import React from "react";

const SPRITE_SHEETS = {
  yellow: { src: "/assets/sprites/player-yellow.png", cols: 4, rows: 2, cellW: 384, cellH: 512 },
  black:  { src: "/assets/sprites/player-black.png",  cols: 4, rows: 2, cellW: 384, cellH: 512 },
  goalie: { src: "/assets/sprites/goalie.png",        cols: 4, rows: 4, cellW: 384, cellH: 288 },
};
const goaliePoseIdx = (team, base) => (team === "yellow" ? 0 : 8) + (base % 8);

export function OverlayLayer({ overlays }) {
  if (!Array.isArray(overlays) || overlays.length === 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {overlays.map((o, i) => {
        const rot = o.rotation || 0;

        if (o.kind === "puck") {
          const w = 0.035 * (o.scale ?? 1);
          return (
            <div key={o.id || i} style={{
              position: "absolute",
              left: `${(o.x ?? 0.5) * 100}%`,
              top: `${(o.y ?? 0.55) * 100}%`,
              transform: `translate(-50%, -50%) rotate(${rot}deg)`,
              width: `${w * 100}%`,
              aspectRatio: "2 / 1",
              background: "radial-gradient(ellipse at 50% 30%, #2a2a2a 0%, #000 70%)",
              borderRadius: "50%",
              boxShadow: "0 2px 4px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.2)",
            }} />
          );
        }
        if (o.kind === "text") {
          return (
            <div key={o.id || i} style={{
              position: "absolute",
              left: `${(o.x ?? 0.5) * 100}%`,
              top: `${(o.y ?? 0.5) * 100}%`,
              transform: `translate(-50%, -50%) rotate(${rot}deg)`,
              padding: "4px 10px",
              fontSize: (o.size ?? 18) * (o.scale ?? 1),
              fontWeight: 800,
              color: o.color || "#facc15",
              textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)",
              fontFamily: "'Anton',Impact,sans-serif",
              letterSpacing: 0.5,
              whiteSpace: "pre",
              userSelect: "none",
            }}>{o.text || ""}</div>
          );
        }
        // sprite
        const cfg = o.isGoalie ? SPRITE_SHEETS.goalie : (SPRITE_SHEETS[o.team] || SPRITE_SHEETS.yellow);
        const idx = o.isGoalie ? goaliePoseIdx(o.team, o.poseIdx ?? 0) : (o.poseIdx ?? 0);
        const col = idx % cfg.cols;
        const row = Math.floor(idx / cfg.cols);
        const baseW = 0.12;
        const w = baseW * (o.scale ?? 1);
        const spriteH = w * (cfg.cellH / cfg.cellW);
        return (
          <React.Fragment key={o.id || i}>
            {o.isFocus && (
              <div style={{
                position: "absolute",
                left: `${(o.x ?? 0.5) * 100}%`,
                top: `${((o.y ?? 0.55) - spriteH - 0.015) * 100}%`,
                width: `${w * 0.7 * 100}%`,
                aspectRatio: "3 / 1",
                transform: "translate(-50%, 0)",
                background: "radial-gradient(ellipse at center, rgba(250,204,21,0.55) 0%, rgba(250,204,21,0.22) 55%, transparent 100%)",
                border: "2px solid rgba(250,204,21,0.85)",
                borderRadius: "50%",
                boxShadow: "0 0 8px rgba(250,204,21,0.35)",
              }} />
            )}
            <div style={{
              position: "absolute",
              left: `${(o.x ?? 0.5) * 100}%`,
              top: `${(o.y ?? 0.55) * 100}%`,
              transform: `translate(-50%, -100%) rotate(${rot}deg) scaleX(${o.flip ? -1 : 1})`,
              transformOrigin: "50% 100%",
              width: `${w * 100}%`,
              aspectRatio: `${cfg.cellW} / ${cfg.cellH}`,
            }}>
              <div style={{
                width: "100%", height: "100%",
                backgroundImage: `url(${cfg.src})`,
                backgroundSize: `${cfg.cols * 100}% ${cfg.rows * 100}%`,
                backgroundPosition: `${(col / (cfg.cols - 1)) * 100}% ${(row / (cfg.rows - 1)) * 100}%`,
                backgroundRepeat: "no-repeat",
              }} />
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
