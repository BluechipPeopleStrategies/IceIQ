// Read the Play — player-facing tile for the animated-play catalog.
// Serves playsForAge(band) for the player's age band (U11/U13 today). List of
// plays -> tap to run one in AnimatedPlay -> every interaction logged through
// the standard animated-play telemetry. No new rink primitives.
import { useMemo, useState } from "react";
import { C, FONT, StickyHeader, BackBtn } from "../shared.jsx";
import { playsForAge } from "./playCatalog.js";
import AnimatedPlay from "./AnimatedPlay.jsx";
import { logAnimatedPlayEvent, summarizeAnimatedPlayEvents } from "./telemetry.js";
import { classifyPlayFamily } from "./playFamilies.js";

// Player-facing family name for a play's concept tag. Never show the raw
// concept string (e.g. "off-puck-support-offense", "backcheck-recovery") --
// it's an internal slug, not copy. Falls back to a hyphen/underscore-cleaned
// version only for the handful of plays with no family match.
function familyLabel(play) {
  const family = classifyPlayFamily(play);
  if (family?.title) return family.title;
  return play?.concept ? String(play.concept).replace(/[_-]/g, " ") : "";
}

// player.level is a division string like "U11 / Atom"; the catalog wants "U11".
export function bandFromLevel(level) {
  return String(level || "").trim().split(/[\s/]/)[0] || "";
}

export default function ReadThePlay({ player, onBack }) {
  const band = bandFromLevel(player?.level);
  const plays = useMemo(() => playsForAge(band), [band]);
  const [active, setActive] = useState(null);
  // Bump to refresh per-play summaries after a run ends.
  const [statsBump, setStatsBump] = useState(0);

  const stats = useMemo(() => {
    const m = {};
    for (const p of plays) m[p.id] = summarizeAnimatedPlayEvents(p.id);
    return m;
  }, [plays, statsBump]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: FONT.body, paddingBottom: 80 }}>
      <StickyHeader>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", alignItems: "center", gap: "1rem" }}>
          <BackBtn onClick={() => (active ? (setActive(null), setStatsBump(b => b + 1)) : onBack())} />
          <div style={{ flex: 1, fontFamily: FONT.display, fontWeight: 800, fontSize: "1.1rem" }}>
            🏒 Read the Play
          </div>
          <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, letterSpacing: ".08em" }}>{band}</div>
        </div>
      </StickyHeader>

      <div style={{ padding: "1.25rem", maxWidth: 560, margin: "0 auto" }}>
        {active ? (
          <AnimatedPlay
            key={active.id + "-" + band}
            play={active}
            ageBand={band}
            onEvent={(e) => logAnimatedPlayEvent(e)}
          />
        ) : plays.length === 0 ? (
          <div style={{ color: C.dim, fontSize: 14, lineHeight: 1.5 }}>
            No plays for your age group yet — new plays are added all the time. Check back soon.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: C.dim, marginBottom: "1rem", lineHeight: 1.5 }}>
              Watch the play develop, then make the read before the whistle. Replay any play as often as you want.
            </div>
            {plays.map((p) => {
              const s = stats[p.id];
              const done = s && s.answers > 0;
              return (
                <button
                  key={p.id}
                  onClick={() => setActive(p)}
                  style={{
                    width: "100%", display: "block", textAlign: "left",
                    background: "linear-gradient(135deg,rgba(122,215,143,.12),rgba(122,215,143,.03))",
                    border: "1px solid rgba(122,215,143,.3)", borderRadius: 14,
                    padding: ".85rem 1rem", cursor: "pointer", color: C.white,
                    fontFamily: FONT.body, marginBottom: ".7rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".6rem" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{p.title}</div>
                      {familyLabel(p) && (
                        <div style={{ fontSize: 11, color: C.dim, marginTop: 2, textTransform: "capitalize" }}>
                          {familyLabel(p)}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: done ? "#7ad78f" : C.dim, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {done ? `${s.correct}/${s.answers} reads` : "New"}
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
