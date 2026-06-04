// Data-driven play renderer. One `play` object (positions + motion + decision
// tree) renders on a top-down rink. The age band picks an INTERACTION_PROFILE
// that swaps token representation (figure -> numbered token -> X/O symbol) and
// the interactivity feel. Same data, different age experience.
//
// Live demo route: /#playtest
import React, { useState, useEffect } from "react";

const TEAM_FILL = { black: "#1a1a1a", gold: "#C9A24B" };

// Same coordinates, different glyph + feel per age band.
export const INTERACTION_PROFILES = {
  U7:  { label: "U7 · Playground", token: "figure", accent: "#2aa3ff", bg: "#eaf6ff", big: true,  celebrate: true },
  U9:  { label: "U9 · Mini-games", token: "figure", accent: "#2aa3ff", bg: "#eef7ff", big: true,  celebrate: true },
  U11: { label: "U11 · The Trainer", token: "token",  accent: "#C9A24B", bg: "#fbf8f0", big: false, celebrate: false },
  U13: { label: "U13 · Read & React", token: "token",  accent: "#C9A24B", bg: "#fbf8f0", big: false, celebrate: false },
  U15: { label: "U15 · Pro Reps", token: "symbol", accent: "#0B1A33", bg: "#f3f5f8", big: false, celebrate: false },
  U18: { label: "U18 · Film Room", token: "symbol", accent: "#0B1A33", bg: "#eef1f5", big: false, celebrate: false },
};
export const AGE_BANDS = Object.keys(INTERACTION_PROFILES);

// A play can render full-ice or zoomed into one zone (half-ice). Half-ice makes
// the players bigger/clearer when the whole read lives in one end.
const VIEWS = { full: "0 0 200 85", "half-right": "104 0 96 85", "half-left": "0 0 96 85" };

function RinkBackdrop() {
  return (
    <g>
      <rect x="2" y="2" width="196" height="81" rx="27" fill="#eef5fb" stroke="#0B1A33" strokeWidth="1.4" />
      <rect x="99.2" y="2" width="1.6" height="81" fill="#d23a3a" />
      <rect x="74" y="2" width="2" height="81" fill="#2b6fd6" /><rect x="124" y="2" width="2" height="81" fill="#2b6fd6" />
      <rect x="11" y="9" width="0.7" height="67" fill="#d23a3a" /><rect x="188.3" y="9" width="0.7" height="67" fill="#d23a3a" />
      <circle cx="100" cy="42.5" r="13" fill="none" stroke="#d23a3a" strokeWidth="0.6" />
      <g fill="none" stroke="#d23a3a" strokeWidth="0.6"><circle cx="169" cy="22" r="13" /><circle cx="169" cy="63" r="13" /><circle cx="31" cy="22" r="13" /><circle cx="31" cy="63" r="13" /></g>
      <path d="M188.3,38 A6,6 0 0 0 188.3,47 Z" fill="#bcdcff" stroke="#d23a3a" strokeWidth="0.5" /><rect x="189" y="39" width="4" height="7" fill="none" stroke="#d23a3a" strokeWidth="1" />
      <path d="M11.7,38 A6,6 0 0 1 11.7,47 Z" fill="#bcdcff" stroke="#d23a3a" strokeWidth="0.5" /><rect x="7" y="39" width="4" height="7" fill="none" stroke="#d23a3a" strokeWidth="1" />
    </g>
  );
}

// One actor, drawn centred at origin, in the representation for this age band.
function Token({ rep, team, isGoalie, label, stickAngle }) {
  if (rep === "symbol") {
    const navy = "#0B1A33", red = "#b4321f";
    if (isGoalie) return <text y="1.6" fontSize="5" fill={navy} fontWeight="800" textAnchor="middle" fontFamily="Inter,Arial">▽</text>;
    if (team === "gold") return <g stroke={red} strokeWidth="1.1" strokeLinecap="round"><line x1="-3" y1="-3" x2="3" y2="3" /><line x1="-3" y1="3" x2="3" y2="-3" /></g>;
    return <circle r="3.4" fill="none" stroke={navy} strokeWidth="1.1" />;
  }
  const fill = TEAM_FILL[team] || "#1a1a1a";
  const numFill = team === "gold" ? "#0B1A33" : "#fff";
  if (rep === "figure") {
    // Friendly top-down player: helmet + jersey body + stick.
    if (isGoalie) return (
      <g>
        <rect x="-4.2" y="-4" width="8.4" height="8.4" rx="2.2" fill={fill} stroke="#fff" strokeWidth="0.5" />
        <circle cy="-2.6" r="2.4" fill="#2f2f2f" stroke="#fff" strokeWidth="0.3" />
        <text y="3.1" fontSize="2.8" fill={numFill} fontWeight="800" textAnchor="middle" fontFamily="Inter,Arial">G</text>
      </g>
    );
    return (
      <g>
        <ellipse rx="4.3" ry="5.2" fill={fill} stroke="#fff" strokeWidth="0.8" />
        <circle cy="-2.9" r="2.9" fill="#26344d" stroke="#fff" strokeWidth="0.55" />
        <circle cx="-1" cy="-3.6" r="0.75" fill="#fff" opacity="0.75" />
        <text y="2.9" fontSize="3.1" fill={numFill} fontWeight="800" textAnchor="middle" fontFamily="Inter,Arial">{label}</text>
      </g>
    );
  }
  return (
    <g>
      <circle r="4.6" fill={fill} stroke="#fff" strokeWidth="0.5" />
      <text y="1.4" fontSize="3.4" fill={numFill} fontWeight="800" textAnchor="middle" fontFamily="Inter,Arial">{isGoalie ? "G" : label}</text>
    </g>
  );
}

export function RinkPlay({ play, ageBand = "U11" }) {
  const profile = INTERACTION_PROFILES[ageBand] || INTERACTION_PROFILES.U11;
  const [nodeId, setNodeId] = useState(play.start);
  const [picked, setPicked] = useState(null);
  const [advancing, setAdvancing] = useState(false);
  const [entered, setEntered] = useState(false);
  useEffect(() => { setNodeId(play.start); setPicked(null); setAdvancing(false); }, [play, ageBand]);
  // Entry animation: render at the node's `enter` (e.g. D in contain) for a tick,
  // then snap to `pos` (D stepped up) so the trigger motion actually plays.
  useEffect(() => {
    setEntered(false);
    const t = setTimeout(() => setEntered(true), 140);
    return () => clearTimeout(t);
  }, [nodeId, play, ageBand]);

  const node = play.nodes[nodeId];
  const pos = node.pos;

  function choose(opt, i) {
    if (picked !== null) return;
    setPicked(i);
    if (opt.ok) {
      setAdvancing(true);
      setTimeout(() => { setNodeId(opt.next); setPicked(null); setAdvancing(false); }, 850);
    }
  }

  const ov = node.overlays || [];
  const puckPos = (!entered && node.enterPuck) ? node.enterPuck : node.puck;
  return (
    <div style={{ background: profile.bg, borderRadius: 16, padding: 12, border: "1px solid #e3e7ee" }}>
      <svg viewBox={VIEWS[play.view] || VIEWS.full} style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <marker id="rp-arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#C9A24B" /></marker>
          <filter id="rp-sh" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="0.6" stdDeviation="0.6" floodColor="#0b1a33" floodOpacity="0.35" /></filter>
        </defs>
        <RinkBackdrop />
        {ov.map((o, i) => o.kind === "arrow"
          ? <path key={i} d={`M${o.x1},${o.y1} Q ${(o.x1 + o.x2) / 2},${Math.min(o.y1, o.y2) - 8} ${o.x2},${o.y2}`} fill="none" stroke="#C9A24B" strokeWidth="1.4" strokeDasharray="3 2" markerEnd="url(#rp-arr)" />
          : <circle key={i} cx={o.x} cy={o.y} r={o.r || 6} fill="none" stroke={o.color || "#36d17a"} strokeWidth="1.2" strokeDasharray="2.5 1.8" />)}
        {play.actors.map(a => {
          const p = (!entered && node.enter && node.enter[a.id]) ? node.enter[a.id] : (pos[a.id] || [a.x, a.y]);
          // Stick points at the puck; the carrier (on the puck) points at the net.
          const isCarrier = puckPos && Math.hypot(puckPos[0] - p[0], puckPos[1] - p[1]) < 7;
          const tgt = isCarrier ? [192, 42] : (puckPos || [192, 42]);
          const stickAngle = Math.atan2(tgt[1] - p[1], tgt[0] - p[0]) * 180 / Math.PI;
          return (
            <g key={a.id} transform={`translate(${p[0]},${p[1]})`} style={{ transition: "transform .7s cubic-bezier(.4,0,.2,1)" }} filter={profile.token === "symbol" ? undefined : "url(#rp-sh)"}>
              <Token rep={profile.token} team={a.team} isGoalie={a.goalie} label={a.id} stickAngle={stickAngle} />
            </g>
          );
        })}
        {/* puck */}
        {puckPos && <g transform={`translate(${puckPos[0]},${puckPos[1]})`} style={{ transition: "transform .7s cubic-bezier(.4,0,.2,1)" }}>
          <circle r="2.4" fill="none" stroke="#C9A24B" strokeWidth="0.9" /><circle r="1.1" fill="#111" />
        </g>}
      </svg>

      <div style={{ padding: "6px 4px 2px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".5px", textTransform: "uppercase", color: profile.accent }}>
          {profile.label}{node.ask ? ` · you are #${node.ask.actor}` : ""}
        </div>
        <div style={{ fontSize: profile.big ? 19 : 15, fontWeight: 700, color: "#0B1A33", margin: "4px 0 10px", lineHeight: 1.35 }}>
          {node.terminal ? node.q : node.ask.q}
        </div>
        {node.terminal ? (
          <div>
            {profile.celebrate && <div style={{ fontSize: 26, marginBottom: 6 }}>🎉🥅🎉</div>}
            <button onClick={() => { setNodeId(play.start); setPicked(null); }} style={{ background: "#0B1A33", color: "#fff", border: "none", borderRadius: 9, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>↻ Replay</button>
          </div>
        ) : node.ask.opts.map((o, i) => {
          const isPicked = picked === i;
          const showOk = isPicked && o.ok, showBad = isPicked && !o.ok;
          return (
            <button key={i} onClick={() => choose(o, i)} disabled={picked !== null && o.ok}
              style={{
                display: "block", width: "100%", textAlign: "left", fontFamily: "inherit",
                fontSize: profile.big ? 16 : 13.5, padding: profile.big ? "13px 14px" : "10px 12px",
                margin: "7px 0", borderRadius: profile.big ? 14 : 10, cursor: "pointer",
                border: `${showOk ? 2 : 1}px solid ${showOk ? "#0B6B3A" : showBad ? "#b4321f" : "#e3e7ee"}`,
                background: showOk ? "#f2faf5" : showBad ? "#fdf3f1" : "#fff",
                color: showOk ? "#155f38" : showBad ? "#7a2a1c" : "#3a4252",
                fontWeight: showOk ? 700 : (profile.big ? 700 : 400),
              }}>
              {o.t}{showOk ? " ✓" : ""}
              {showBad && o.no && <div style={{ fontSize: 12, marginTop: 5, color: "#7a2a1c", fontWeight: 400 }}>{o.no}</div>}
            </button>
          );
        })}
        {advancing && <div style={{ fontSize: 12.5, color: "#155f38", marginTop: 6, fontWeight: 700 }}>Right read — advancing…</div>}
        {profile.token === "figure" && <div style={{ fontSize: 11, color: "#6b7686", marginTop: 10 }}>Note: option text would be age-authored (shorter + voice for U7); this demo reuses one set.</div>}
      </div>
    </div>
  );
}

// The 2-on-1 → pass → finish tree, as data.
export const SAMPLE_PLAY = {
  concept: "2-on-1 pass read", view: "half-right", actors: [
    { id: "7", team: "black" }, { id: "23", team: "black" }, { id: "D", team: "gold" }, { id: "G", team: "gold", goalie: true },
  ],
  start: "A",
  nodes: {
    A: {
      pos: { "7": [146, 60], "23": [162, 24], D: [160, 50], G: [186, 42] }, puck: [141, 60],
      enter: { D: [180, 43] },
      overlays: [{ kind: "ring", color: "#C9A24B", x: 141, y: 60, r: 4 }],
      ask: {
        actor: "7", q: "The lone D steps up to you. What's the play?",
        opts: [
          { t: "Shoot far side", no: "The D stepped into your lane — blocked. With a teammate wide open, that's the low-percentage play." },
          { t: "Pass cross-ice to #23 (back door)", ok: 1, next: "B" },
          { t: "Deke the D", no: "Deking invites the D back into the play and kills the odd-man advantage." },
          { t: "Hold and wait", no: "Waiting lets the D recover and the goalie set. The window is now." },
        ],
      },
    },
    B: {
      pos: { "7": [162, 54], "23": [162, 24], D: [170, 40], G: [187, 36] }, puck: [160, 24],
      overlays: [{ kind: "arrow", x1: 160, y1: 25, x2: 183, y2: 41 }, { kind: "ring", x: 185, y: 47, r: 5 }],
      ask: {
        actor: "23", q: "You catch it at the back door, goalie still sliding. Now what?",
        opts: [
          { t: "Shoot quick into the open side", ok: 1, next: "GOAL" },
          { t: "Keep skating to the corner", no: "You skated off the open net — the goalie recovers. Chance gone." },
          { t: "Pass back to #7", no: "#7 is covered now and the goalie's still moving. You gave up an open net." },
          { t: "Hold the puck", no: "Every split second lets the goalie get square. Shoot now." },
        ],
      },
    },
    GOAL: {
      pos: { "7": [162, 54], "23": [158, 27], D: [170, 40], G: [181, 30] }, puck: [191, 44], terminal: true,
      q: "Goal! The step-up opened the back door, and the quick shot beat the sliding goalie.",
    },
  },
};

// Demo harness mounted at /#playtest — toggle the age band to see the same play
// re-skin (figures -> tokens -> symbols) and re-feel.
export function RinkPlayTest() {
  const [age, setAge] = useState("U11");
  return (
    <div style={{ minHeight: "100vh", background: "#f4f6fa", fontFamily: "Inter,system-ui,Arial,sans-serif", padding: "20px 16px 60px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#C9A24B", fontWeight: 800 }}>Play engine</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0B1A33" }}>Same play · pick the age</div>
          </div>
          <select value={age} onChange={e => setAge(e.target.value)} style={{ fontFamily: "inherit", fontSize: 14, padding: "8px 10px", borderRadius: 9, border: "1px solid #cdd5e0" }}>
            {AGE_BANDS.map(a => <option key={a} value={a}>{INTERACTION_PROFILES[a].label}</option>)}
          </select>
        </div>
        <RinkPlay key={age} play={SAMPLE_PLAY} ageBand={age} />
        <p style={{ fontSize: 12.5, color: "#6b7686", lineHeight: 1.55, marginTop: 14 }}>
          One play object. Switch the age: U7/U9 render players as <b>figures</b>, U11/U13 as <b>numbered tokens</b>, U15/U18 as <b>X's &amp; O's</b>. Answer #7's read → the pass spawns #23's read → goal. Coordinates never change; only the representation and feel do.
        </p>
      </div>
    </div>
  );
}
