import React, { useEffect, useMemo, useRef, useState } from "react";
import { AGE_BANDS, profileForAge } from "./interactionProfiles.js";
import { motionStyle } from "./motionVocabulary.js";
import { tokenSpec } from "./tokenSystem.js";
import { resolveKind, watchChainInfo } from "./questionKinds.js";
import { TWO_ON_ONE_READ_PLAY } from "./plays/twoOnOneRead.js";
import { logAnimatedPlayEvent, summarizeAnimatedPlayEvents } from "./telemetry.js";
import { ALL_ANIMATED_PLAYS } from "./playCatalog.js";

const TEAM_FILL = {
  home: "#0F4C8C",
  away: "#1A1A1A",
};

const VIEWS = {
  full: "0 0 200 85",
  "half-right": "104 0 96 85",
  "half-left": "0 0 96 85",
};

function actorDisplayLabel(actor, isDecisionActor, profile) {
  if (isDecisionActor) return "YOU";

  if (profile.token === "figure") {
    if (actor.role === "goalie") return "Goalie";
    if (actor.role === "puckCarrier") return "Puck";
    if (actor.role === "support" && actor.team === "home") return "Helper";
    if (actor.role === "support" && actor.team !== "home") return "Open";

    // U7/U9 screens should not label every checker.
    // The black token already communicates pressure; repeated labels create clutter.
    return "";
  }

  return actor.label;
}

function questionTextForAge(node, profile) {
  if (profile?.token === "figure") {
    return playerFacingTextForAge(node?.youngQ || node?.ask?.youngQ || node?.ask?.q || node?.q || "", profile);
  }

  return node?.ask?.q || node?.q || "";
}

function isFilmRoomProfile(profile) {
  const label = JSON.stringify(profile || {}).toLowerCase();
  return label.includes("u15") || label.includes("u18") || label.includes("film");
}

function playerFacingTextForAge(value, profile) {
  const raw = String(value || "");

  // U15/U18 can keep film-room shorthand, but younger groups should not.
  if (isFilmRoomProfile(profile)) return raw;

  return raw
    .replace(/\bF2\b/g, "support teammate")
    .replace(/\bF1\b/g, "teammate with the puck")
    .replace(/\bD1\b/g, "defender")
    .replace(/\bA1\b/g, "puck carrier")
    .replace(/\bA2\b/g, "open player")
    .replace(/\bBC1\b/g, "backchecker")
    .replace(/\bbackchecker\b/gi, "backchecker")
    .replace(/\bsupport option\b/gi, "support teammate");
}

function optionTextForAge(opt, actorMap, profile) {
  if (!opt) return "";

  const raw = profile?.token === "figure" && opt.youngT ? opt.youngT : opt.t;
  return playerFacingTextForAge(raw, profile);
}

function feedbackTextForAge(opt, profile) {
  if (!opt) return "";

  const raw =
    profile?.token === "figure"
      ? opt.youngWhy || opt.why || opt.no || opt.outcome || ""
      : opt.why || opt.no || opt.outcome || "";

  return playerFacingTextForAge(raw, profile);
}

function answerToneForAge(opt, profile) {
  if (!opt) return "";

  if (opt.ok) {
    return profile?.token === "figure" ? "Nice read" : "Correct read";
  }

  return profile?.token === "figure" ? "Try again" : "Not quite";
}

function resultCardTitleForAge(opt, profile) {
  if (!opt) return "";

  const action = optionTextForAge(opt, {}, profile);
  const tone = answerToneForAge(opt, profile);

  return action ? tone + ": " + action : tone;
}

function cueLabelForAge(cue, profile) {
  if (!cue) return "";

  const profileText = JSON.stringify(profile || {}).toLowerCase();
  const isFilmRoom = profileText.includes("u15") || profileText.includes("u18") || profileText.includes("film");

  if (!isFilmRoom) {
    return cue.youngLabel || cue.shortLabel || cue.label || "";
  }

  return cue.label || "";
}

function RinkBackdrop() {
  return (
    <g>
      <rect x="2" y="2" width="196" height="81" rx="27" fill="#EEF5FB" stroke="#0B1A33" strokeWidth="1.4" />
      <rect x="99.2" y="2" width="1.6" height="81" fill="#D23A3A" />
      <rect x="74" y="2" width="2" height="81" fill="#2B6FD6" />
      <rect x="124" y="2" width="2" height="81" fill="#2B6FD6" />
      <rect x="11" y="9" width="0.7" height="67" fill="#D23A3A" />
      <rect x="188.3" y="9" width="0.7" height="67" fill="#D23A3A" />
      <circle cx="100" cy="42.5" r="13" fill="none" stroke="#D23A3A" strokeWidth="0.6" />
      <g fill="none" stroke="#D23A3A" strokeWidth="0.6">
        <circle cx="169" cy="22" r="13" />
        <circle cx="169" cy="63" r="13" />
        <circle cx="31" cy="22" r="13" />
        <circle cx="31" cy="63" r="13" />
      </g>
      <path d="M188.3,38 A6,6 0 0 0 188.3,47 Z" fill="#BCDcff" stroke="#D23A3A" strokeWidth="0.5" />
      <rect x="189" y="39" width="4" height="7" fill="none" stroke="#D23A3A" strokeWidth="1" />
      <path d="M11.7,38 A6,6 0 0 1 11.7,47 Z" fill="#BCDcff" stroke="#D23A3A" strokeWidth="0.5" />
      <rect x="7" y="39" width="4" height="7" fill="none" stroke="#D23A3A" strokeWidth="1" />
    </g>
  );
}

function RoutePath({ motion, index }) {
  const style = motionStyle(motion.kind);
  const [x1, y1] = motion.from;
  const [x2, y2] = motion.to;
  const mx = (x1 + x2) / 2;
  const my = Math.min(y1, y2) - 7;
  const pathD = motion.kind === "skate" || motion.kind === "blocked"
    ? `M${x1},${y1} L${x2},${y2}`
    : `M${x1},${y1} Q ${mx},${my} ${x2},${y2}`;
  const marker = motion.kind === "pass" || motion.kind === "shot" ? `url(#ap-arrow-${motion.kind})` : undefined;
  return (
    <g>
      <path
        d={pathD}
        fill="none"
        stroke={style.stroke}
        strokeWidth={motion.kind === "skate" ? 1.05 : motion.kind === "blocked" ? 1.7 : style.width}
        strokeDasharray={style.dash}
        markerEnd={marker}
        opacity={motion.kind === "skate" ? 0.55 : motion.kind === "blocked" ? 0.6 : 0.95}
      />
    </g>
  );
}

function ActorToken({ actor, ageBand, isDecisionActor }) {
  const spec = tokenSpec({ actor, ageBand, isDecisionActor });
  const profile = profileForAge(ageBand);
  const showInteriorLabel = profile.token === "token" || (profile.token === "symbol" && spec.role === "goalie");
  const fill = TEAM_FILL[spec.team] || TEAM_FILL.home;
  const labelFill = spec.team === "home" ? "#FFFFFF" : "#FFFFFF";

  if (spec.role === "goalie") {
    return (
      <g>
        <rect x="-4.5" y="-5" width="9" height="10" rx="2.3" fill={fill} stroke="#FFFFFF" strokeWidth="0.8" />
        {showInteriorLabel && <text y="1.5" fontSize="3.4" fill={labelFill} fontWeight="900" textAnchor="middle">G</text>}
      </g>
    );
  }

  if (spec.representation === "symbol") {
    if (spec.role === "defender") {
      return (
        <g stroke="#0B1A33" strokeWidth="1.2" strokeLinecap="round">
          <line x1="-3.4" y1="-3.4" x2="3.4" y2="3.4" />
          <line x1="-3.4" y1="3.4" x2="3.4" y2="-3.4" />
        </g>
      );
    }
    return <circle r={spec.role === "puckCarrier" ? 4.2 : 3.5} fill="none" stroke="#0B1A33" strokeWidth="1.2" />;
  }

  if (spec.representation === "figure") {
    return (
      <g>
        <circle r={isDecisionActor ? 5.5 : 5} fill={fill} stroke="#FFFFFF" strokeWidth="0.9" />
        <path d="M-3.2,-1.6 C-1.2,-3 1.2,-3 3.2,-1.6" fill="none" stroke="#FFFFFF" strokeWidth="1.05" strokeLinecap="round" opacity="0.95" />
        {isDecisionActor && <circle r="7" fill="none" stroke="#C9A24B" strokeWidth="1" strokeDasharray="2 1.5" />}
      </g>
    );
  }

  return (
    <g>
      <circle r={isDecisionActor ? 5.2 : 4.5} fill={fill} stroke="#FFFFFF" strokeWidth="0.75" />
      {isDecisionActor && <circle r="6.8" fill="none" stroke="#C9A24B" strokeWidth="0.9" strokeDasharray="2 1.5" />}
      {spec.role === "defender" && (
        <g stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round">
          <line x1="-2.7" y1="-2.7" x2="2.7" y2="2.7" />
          <line x1="-2.7" y1="2.7" x2="2.7" y2="-2.7" />
        </g>
      )}
      {showInteriorLabel && spec.role !== "defender" && (
        <text y="1.4" fontSize="3.1" fill={labelFill} fontWeight="900" textAnchor="middle">{spec.interiorLabel}</text>
      )}
    </g>
  );
}

function NodeSummary({ node, profile, pickedOption, onReplay }) {
  if (!node.terminal) return null;
  return (
    <div>
      {profile.celebrate && pickedOption?.ok && <div style={{ fontSize: 24, marginBottom: 6 }}>Goal!</div>}
      <button onClick={onReplay} style={{ background: "#0B1A33", color: "#FFFFFF", border: "none", borderRadius: 9, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 800 }}>
        Replay
      </button>
    </div>
  );
}

export default function AnimatedPlay({ play, ageBand = "U11", onEvent }) {
  const profile = profileForAge(ageBand);
  const [nodeId, setNodeId] = useState(play.start);
  const [picked, setPicked] = useState(null);
  const [pickedOption, setPickedOption] = useState(null);
  const [judgePick, setJudgePick] = useState(null);
  const [entered, setEntered] = useState(false);
  const [showMotion, setShowMotion] = useState(false);
  const startedAtRef = useRef(Date.now());
  const watchedChainsRef = useRef(new Set());

  const actorMap = useMemo(() => Object.fromEntries(play.actors.map((a) => [a.id, a])), [play.actors]);
  const node = play.nodes[nodeId];
  const kind = resolveKind(node);

  useEffect(() => {
    let enterTimer;
    let motionTimer;
    let advanceTimer;
    let loopTimer;

    function runCycle() {
      setEntered(false);
      setShowMotion(false);
      motionTimer = setTimeout(() => setShowMotion(true), 500);
      enterTimer = setTimeout(() => setEntered(true), 950);
    }

    startedAtRef.current = Date.now();
    setJudgePick(null);
    runCycle();

    if (!node.terminal && node.autoNext) {
      advanceTimer = setTimeout(() => {
        const nextNode = play.nodes[node.autoNext.next];
        if (!nextNode?.autoNext) watchedChainsRef.current.add(`${play.id}:${node.autoNext.next}`);
        setNodeId(node.autoNext.next);
      }, node.autoNext.ms ?? 2600);
    } else if (!node.terminal) {
      loopTimer = setInterval(runCycle, 4200);
    }

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(motionTimer);
      clearTimeout(advanceTimer);
      clearInterval(loopTimer);
    };
  }, [nodeId, play.id, ageBand, node.terminal]);

  function choose(opt, index) {
    if (picked !== null || node.terminal) return;
    const ms = Date.now() - startedAtRef.current;

    if (kind === "verdict" && node.ask.justify && !judgePick) {
      setJudgePick(opt);
      onEvent?.({ playId: play.id, nodeId, event: "judge", kind, answerId: opt.id, ok: !!opt.ok, ms });
      return;
    }

    setPicked(index);
    setPickedOption(opt);
    if (kind === "verdict" && judgePick) {
      onEvent?.({ playId: play.id, nodeId, event: "answer", kind, answerId: judgePick.id, justifyId: opt.id, ok: !!judgePick.ok, ms });
      setTimeout(() => {
        setNodeId(judgePick.next);
        setPicked(null);
        setJudgePick(null);
      }, judgePick.ok && opt.ok ? 750 : 1050);
      return;
    }

    onEvent?.({ playId: play.id, nodeId, event: "answer", kind, answerId: opt.id, ok: !!opt.ok, ms });
    setTimeout(() => {
      setNodeId(opt.next);
      setPicked(null);
    }, opt.ok ? 750 : 1050);
  }

  function replay() {
    setNodeId(play.start);
    setPicked(null);
    setPickedOption(null);
    setJudgePick(null);
    onEvent?.({ playId: play.id, nodeId: play.start, event: "replay", ms: 0 });
  }

  const positions = (!entered && node.enter) ? node.enter : node.pos;
  const puck = node.puck;
  const visibleMotions = node.terminal
    ? (node.motions || []).filter((motion) => motion.kind !== "skate")
    : (node.motions || []).filter((motion) => motion.kind !== "skate" && motion.kind !== "shot");

  return (
    <div style={{ background: profile.bg, borderRadius: 12, padding: 12, border: "1px solid #E3E7EE" }}>
      <svg viewBox={VIEWS[play.view] || VIEWS.full} style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          {["skate", "pass", "shot"].map((motionKind) => (
            <marker key={motionKind} id={`ap-arrow-${motionKind}`} markerWidth="4" markerHeight="4" refX="3.6" refY="2" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L4,2 L0,4 Z" fill="#0B1A33" />
            </marker>
          ))}
          <filter id="ap-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="0.7" stdDeviation="0.7" floodColor="#0B1A33" floodOpacity="0.35" />
          </filter>
        </defs>
        <RinkBackdrop />
        {node.cue && cueLabelForAge(node.cue, profile) && (
          <g data-testid="rink-cue-marker">
            <rect
              x={(node.cue.x || 150) - 10}
              y={(node.cue.y || 32) - 5}
              width="20"
              height="9"
              rx="4.5"
              fill="#FFFFFF"
              stroke="#C9A24B"
              strokeWidth="0.9"
              opacity="0.96"
            />
            <text
              x={node.cue.x || 150}
              y={(node.cue.y || 32) + 1.1}
              textAnchor="middle"
              fontSize="3.15"
              fill="#0B1A33"
              fontWeight="900"
            >
              {cueLabelForAge(node.cue, profile)}
            </text>
          </g>
        )}

        {showMotion && visibleMotions.map((motion, index) => <RoutePath key={`${motion.kind}-${index}`} motion={motion} index={index} />)}
        {(node.overlays || []).map((overlay, index) => {
          if (overlay.kind === "freeze") {
            return (
              <g key={`freeze-${index}`}>
                <circle cx={overlay.x} cy={overlay.y} r="6" fill="none" stroke="#C9A24B" strokeWidth="1.1" strokeDasharray="2 1.5" />
              </g>
            );
          }
          if (overlay.kind === "target") {
            return <circle key={`target-${index}`} cx={overlay.x} cy={overlay.y} r={overlay.r || 5} fill="none" stroke="#C9A24B" strokeWidth="1.1" strokeDasharray="2 1.5" />;
          }
          return null;
        })}
        {!node.terminal && kind === "lane-pick" && (node.ask.opts || []).map((opt, index) => {
          if (!opt.zone) return null;
          const [zx, zy, zr] = opt.zone;
          // Zone radii in play data are authored for the U7/U9 playground look.
          // Trainer bands always use the tighter ring regardless of data radius.
          const zoneR = profile.token === "figure" ? (zr ?? 6) : 4.5;
          return (
            <g
              key={`choice-zone-${opt.id}`}
              onClick={() => choose(opt, index)}
              style={{ cursor: picked !== null ? "default" : "pointer" }}
              opacity={picked !== null ? 0.45 : 0.9}
            >
              <circle cx={zx} cy={zy} r={zoneR} fill="#FFFFFF" stroke="#C9A24B" strokeWidth="1.2" strokeDasharray="2 1.5" />
              <text x={zx} y={zy + 1.8} textAnchor="middle" fontSize="3.15" fill="#0B1A33" fontWeight="900">{index + 1}</text>
            </g>
          );
        })}
        {play.actors.map((actor) => {
          const p = positions[actor.id];
          if (!p) return null;
          const isDecisionActor = node.decisionActor === actor.id;
          return (
            <g key={actor.id} transform={`translate(${p[0]},${p[1]})`} style={{ transition: "transform 1.4s cubic-bezier(.4,0,.2,1)" }} filter="url(#ap-shadow)">
              <ActorToken actor={actorMap[actor.id]} ageBand={ageBand} isDecisionActor={isDecisionActor} />
              {(profile.token === "figure" || (isDecisionActor && actor.role === "defender") || (profile.token === "symbol" && actor.role !== "goalie")) && (
                <text y="-8.5" textAnchor="middle" fontSize="3.2" fill="#0B1A33" fontWeight="900">{actorDisplayLabel(actor, isDecisionActor, profile)}</text>
              )}
            </g>
          );
        })}
        {puck && (
          <g transform={`translate(${puck[0]},${puck[1]})`} style={{ transition: "transform 1.4s cubic-bezier(.4,0,.2,1)" }}>
            <circle r="1.35" fill="#111111" stroke="#FFFFFF" strokeWidth="0.35" />
          </g>
        )}
      </svg>

      <div style={{ padding: "8px 4px 2px" }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".5px", textTransform: "uppercase", color: profile.accent }}>
          {profile.label}{node.decisionActor ? ` - ${node.decisionActor === "F1" ? "you have the puck" : "support read"}` : ""}
        </div>
        <div style={{ fontSize: profile.big ? 19 : 15, fontWeight: 800, color: "#0B1A33", margin: "5px 0 10px", lineHeight: 1.35 }}>
          {kind === "verdict" && judgePick ? node.ask.justify.q : questionTextForAge(node, profile)}
        </div>
        {node.terminal ? (
          <NodeSummary node={node} profile={profile} pickedOption={pickedOption} onReplay={replay} />
        ) : node.autoNext ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 12, color: "#5B6575", fontWeight: 700 }}>Watch the play…</div>
            {["U13", "U15", "U18"].includes(ageBand) && watchedChainsRef.current.has(`${play.id}:${watchChainInfo(play, nodeId).endNodeId}`) && (
              <button
                onClick={() => {
                  onEvent?.({ playId: play.id, nodeId, event: "watch_skip", ms: Date.now() - startedAtRef.current });
                  setNodeId(watchChainInfo(play, nodeId).endNodeId);
                }}
                style={{ background: "transparent", border: "1px solid #CDD5E0", borderRadius: 8, color: "#4B5563", padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>
                Skip to the question
              </button>
            )}
          </div>
        ) : (
          (kind === "verdict" && judgePick ? node.ask.justify.opts : node.ask.opts)
            .filter((opt) => !opt.u13Only || ["U13", "U15", "U18"].includes(ageBand))
            .map((opt, index) => {
            const isPicked = picked === index;
            const showOk = isPicked && opt.ok;
            const showBad = isPicked && !opt.ok;
            return (
              <button key={opt.id} onClick={() => choose(opt, index)} disabled={picked !== null}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  fontFamily: "inherit",
                  fontSize: profile.big ? 16 : 13.5,
                  padding: profile.big ? "13px 14px" : "10px 12px",
                  margin: "7px 0",
                  borderRadius: profile.big ? 14 : 10,
                  cursor: picked !== null ? "default" : "pointer",
                  border: `${showOk ? 2 : 1}px solid ${showOk ? "#0B6B3A" : showBad ? "#A32D2D" : "#CDD5E0"}`,
                  background: showOk ? "#F2FAF5" : showBad ? "#FDF3F1" : "#FFFFFF",
                  color: showOk ? "#155F38" : showBad ? "#7A2A1C" : "#2F3747",
                  fontWeight: showOk ? 800 : 600,
                }}>
                {profile.token === "figure" && opt.icon ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span aria-hidden="true" style={{ fontSize: 23, width: 30, textAlign: "center" }}>{opt.icon}</span>
                    <span>{opt.youngT || opt.t}{showOk ? " - nice read!" : ""}</span>
                  </span>
                ) : (
                  <>{optionTextForAge(opt, actorMap, profile)}{showOk ? " - right read" : ""}</>
                )}
                {showBad && opt.no && <div style={{ fontSize: 12, marginTop: 5, color: "#7A2A1C", fontWeight: 500 }}>{playerFacingTextForAge(opt.no, profile)}</div>}
              </button>
            );
          })
        )}
        <button onClick={() => onEvent?.({ playId: play.id, nodeId, event: "unclear", ms: Date.now() - startedAtRef.current })}
          style={{ marginTop: 8, background: "transparent", border: "1px dashed #8792A5", borderRadius: 8, color: "#4B5563", padding: "6px 8px", fontSize: 12, cursor: "pointer" }}>
          Mark this read unclear
        </button>
      </div>
    </div>
  );
}

export function AnimatedPlayTest() {
  const [age, setAge] = useState("U11");
  const [playId, setPlayId] = useState(TWO_ON_ONE_READ_PLAY.id);
  const [events, setEvents] = useState([]);

  const activePlay = useMemo(
    () => ALL_ANIMATED_PLAYS.find((play) => play.id === playId) || TWO_ON_ONE_READ_PLAY,
    [playId]
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6FA", fontFamily: "Inter, system-ui, Arial, sans-serif", padding: "20px 16px 60px" }}>
      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#C9A24B", fontWeight: 900 }}>Animated read kernel</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: "#0B1A33" }}>{activePlay.title}</div>
            {activePlay.variantOf && (
              <div style={{ marginTop: 3, fontSize: 12, color: "#5B6575", fontWeight: 700 }}>
                Variant: {activePlay.variantLabel || activePlay.difficulty}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 10, marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, color: "#4B5563", fontWeight: 800 }}>
            Scenario
            <select value={playId} onChange={(event) => { setPlayId(event.target.value); setEvents([]); }} style={{ display: "block", width: "100%", marginTop: 5, fontFamily: "inherit", fontSize: 14, padding: "8px 10px", borderRadius: 9, border: "1px solid #CDD5E0" }}>
              {ALL_ANIMATED_PLAYS.map((play) => (
                <option key={play.id} value={play.id}>
                  {play.variantOf ? "Variant - " : ""}{play.title}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "block", fontSize: 12, color: "#4B5563", fontWeight: 800 }}>
            Age band
            <select value={age} onChange={(event) => setAge(event.target.value)} style={{ display: "block", width: "100%", marginTop: 5, fontFamily: "inherit", fontSize: 14, padding: "8px 10px", borderRadius: 9, border: "1px solid #CDD5E0" }}>
              {AGE_BANDS.map((band) => <option key={band} value={band}>{profileForAge(band).label}</option>)}
            </select>
          </label>
        </div>

        <AnimatedPlay
          key={activePlay.id + "-" + age}
          play={activePlay}
          ageBand={age}
          onEvent={(event) => {
            const logged = logAnimatedPlayEvent(event);
            setEvents((prev) => [...prev.slice(-5), logged || event]);
          }}
        />

        <div style={{ marginTop: 14, fontSize: 12, color: "#5B6575", lineHeight: 1.5 }}>
          Use the selector to test core scenarios and slight variations. Variants change pressure, spacing, or timing without changing the underlying renderer.
        </div>

        <div style={{ marginTop: 12, background: "#FFFFFF", border: "1px solid #DDE3EC", borderRadius: 10, padding: 10, fontSize: 12, color: "#243044" }}>
          <strong>Prototype telemetry:</strong> {JSON.stringify(summarizeAnimatedPlayEvents(activePlay.id))}
        </div>

        <pre style={{ marginTop: 12, background: "#0B1A33", color: "#E5E7EB", borderRadius: 10, padding: 10, fontSize: 11, overflowX: "auto" }}>
          {JSON.stringify(events, null, 2)}
        </pre>
      </div>
    </div>
  );
}

