import React, { useEffect, useMemo, useRef, useState } from "react";
import { AGE_BANDS, profileForAge } from "./interactionProfiles.js";
import { motionStyle } from "./motionVocabulary.js";
import { motionPathD, motionTimings, visibleMotions as visibleMotionsFor } from "./motionGeometry.js";
import { tokenSpec } from "./tokenSystem.js";
import { resolveKindForAge, watchChainInfo } from "./questionKinds.js";
import { TWO_ON_ONE_READ_PLAY } from "./plays/twoOnOneRead.js";
import { logAnimatedPlayEvent, summarizeAnimatedPlayEvents } from "./telemetry.js";
import { ALL_ANIMATED_PLAYS } from "./playCatalog.js";
import { ActorTapTargets } from "./ActorTapTargets.jsx";
import { CoachFeedback } from "./CoachFeedback.jsx";
import { coachFeedbackHeadline } from "./coachFeedbackTone.js";
import { applyCoachAnswer, loadCoachReinforcement, saveCoachReinforcement } from "./coachReinforcement.js";
import { getCoachForQuestion } from "../coachPersonas.js";
import { HockeyPlayerArt } from "../visuals/HockeyPlayerArt.jsx";

const TEAM_FILL = {
  home: "#0B1A33",
  away: "#C9A24B",
};

const VIEWS = {
  full: "0 0 200 85",
  "half-right": "104 0 96 85",
  "half-left": "0 0 96 85",
};

// Display-order shuffle for button-rendered answer options (read-mc, verdict,
// predict-next). A catalog-wide audit (2026-07-30) found the correct answer
// sitting at a fixed array position across most of the catalog -- literally
// every 2-on-1/odd-man-reads play at index 1 of 4, most others at index 0 --
// letting a player pass every one of these items by always tapping the same
// button slot, with zero hockey reading. Never applied to lane-pick or
// spot-mistake: those answer via rink position, not list order, so there is
// no position to leak. `next`/`ok`/`id` all live on the option object itself,
// never looked up by array index, so shuffling display order is safe -- see
// AnimatedPlay.jsx's own choose(opt, index): index is pure UI highlight
// state, opt carries every real semantic.
function shuffledOptions(opts) {
  const a = (opts || []).slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// What job the player has on this read. Keyed off the actor's authored ROLE,
// which is one of exactly four values across the whole catalog: puckCarrier,
// support, defender, goalie. The line this replaced tested `=== "F1"`, so every
// decision actor not literally named F1 was called a "support read" — the
// backchecker, both forecheckers, all three gap-control defenders, and, most
// wrongly, the puck carrier in the goalie-slide play.
const DECISION_ROLE_LABEL = {
  puckCarrier: "you have the puck",
  support: "off-puck read",
  defender: "defensive read",
  goalie: "goalie read",
};
function decisionRoleLabel(actor) {
  return DECISION_ROLE_LABEL[actor?.role] || "your read";
}

function actorDisplayLabel(actor, isDecisionActor, profile) {
  if (isDecisionActor) return "YOU";

  if (profile.token === "figure") {
    if (actor.role === "goalie") return "Goalie";
    if (actor.role === "puckCarrier") return "Puck";
    if (actor.role === "support" && actor.team === "home") return "Helper";
    if (actor.role === "support" && actor.team !== "home") return "Open";

    // U7/U9 screens should not label every checker.
    // The contrasting uniform already communicates pressure; repeated labels create clutter.
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

  // shortLabel used to win here, which is how a lone "Angle" pill ended up
  // floating over the ice with nothing to explain it. The short form is a
  // truncation, not a plainer phrasing — youngLabel is the plainer phrasing.
  // Fall back to the full label so the marker always says what it marks.
  if (!isFilmRoom) {
    return cue.youngLabel || cue.label || cue.shortLabel || "";
  }

  return cue.label || "";
}

function RinkBackdrop() {
  const id = `ap-ice-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <g aria-hidden="true" pointerEvents="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2=".2" y2="1"><stop stopColor="#FFFFFF" /><stop offset=".48" stopColor="#EFF6F7" /><stop offset="1" stopColor="#D5E5EB" /></linearGradient>
        <clipPath id={`${id}-clip`}><rect x="2" y="2" width="196" height="81" rx="27" /></clipPath>
      </defs>
      <rect x="2" y="2" width="196" height="81" rx="27" fill={`url(#${id})`} stroke="#0B1A33" strokeWidth="1.4" />
      <g clipPath={`url(#${id}-clip)`} fill="none" stroke="#6A8C9F" strokeWidth=".15" opacity=".16">
        {Array.from({ length: 14 }, (_, i) => <path key={i} d={`M${(i * 17) % 193},${(i * 23) % 81}q7 -2 15 1`} />)}
      </g>
      <rect x="3.1" y="3.1" width="193.8" height="78.8" rx="26" fill="none" stroke="#C9A24B" strokeWidth=".45" />
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
      <rect x="189" y="39" width="4" height="7" fill="#F5EFE6" stroke="#D23A3A" strokeWidth="1" />
      <path d="M190 39v7m1-7v7m1-7v7m-3-5h4m-4 2h4m-4 2h4" fill="none" stroke="#5B6675" strokeWidth=".15" />
      <path d="M11.7,38 A6,6 0 0 1 11.7,47 Z" fill="#BCDcff" stroke="#D23A3A" strokeWidth="0.5" />
      <rect x="7" y="39" width="4" height="7" fill="#F5EFE6" stroke="#D23A3A" strokeWidth="1" />
      <path d="M8 39v7m1-7v7m1-7v7m-3-5h4m-4 2h4m-4 2h4" fill="none" stroke="#5B6675" strokeWidth=".15" />
    </g>
  );
}

function RoutePath({ motion, trail, delayMs }) {
  const style = motionStyle(motion.kind);
  const pathD = motionPathD(motion);
  // Ghost trails (skate routes on terminal nodes) get a faded, dashed,
  // arrow-tipped treatment so the route that produced the outcome is
  // visible without competing with pass/shot/blocked lanes.
  const marker = trail
    ? "url(#ap-arrow-skate)"
    : motion.kind === "pass" || motion.kind === "shot" ? `url(#ap-arrow-${motion.kind})` : undefined;
  return (
    <g className="ap-motion-in" style={{ opacity: 0, animation: "ap-motion-in .5s ease forwards", animationDelay: `${delayMs || 0}ms` }}>
      <path
        d={pathD}
        fill="none"
        stroke={style.stroke}
        strokeWidth={trail ? 0.9 : motion.kind === "skate" ? 1.05 : motion.kind === "blocked" ? 1.7 : style.width}
        strokeDasharray={trail ? "1.2 2.2" : style.dash}
        markerEnd={marker}
        opacity={trail ? 0.38 : motion.kind === "skate" ? 0.55 : motion.kind === "blocked" ? 0.6 : 0.95}
      />
    </g>
  );
}

function ActorToken({ actor, ageBand, isDecisionActor }) {
  const spec = tokenSpec({ actor, ageBand, isDecisionActor });
  const profile = profileForAge(ageBand);
  const showInteriorLabel = profile.token === "symbol" && spec.role === "goalie";
  const fill = TEAM_FILL[spec.team] || TEAM_FILL.home;
  const labelFill = spec.team === "home" ? "#FFFFFF" : "#0B1A33";

  if (spec.role === "goalie") {
    return (
      <g>
        <rect x="-4.5" y="-5" width="9" height="10" rx="2.3" fill={spec.representation === "symbol" ? fill : "#F5EFE6"} stroke="#FFFFFF" strokeWidth="0.8" />
        {spec.representation !== "symbol" && <HockeyPlayerArt radius={4.4} team={spec.team} goalie />}
        {showInteriorLabel && <><rect x="-1.6" y="-1.4" width="3.2" height="3.4" rx=".4" fill={fill} /><text y="1.5" fontSize="3.4" fill={labelFill} fontWeight="900" textAnchor="middle">G</text></>}
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
        <circle r={isDecisionActor ? 5.5 : 5} fill="#F5EFE6" stroke="#FFFFFF" strokeWidth="0.9" />
        <HockeyPlayerArt radius={isDecisionActor ? 5.1 : 4.6} team={spec.team} />
        {isDecisionActor && <circle r="7" fill="none" stroke="#C9A24B" strokeWidth="1" strokeDasharray="2 1.5" />}
      </g>
    );
  }

  return (
    <g>
      <circle r={isDecisionActor ? 5.2 : 4.5} fill="#F5EFE6" stroke="#FFFFFF" strokeWidth="0.75" />
      <HockeyPlayerArt radius={isDecisionActor ? 4.8 : 4.2} team={spec.team} />
      {isDecisionActor && <circle r="6.8" fill="none" stroke="#C9A24B" strokeWidth="0.9" strokeDasharray="2 1.5" />}
      {spec.role === "defender" && (
        <g stroke="#0B1A33" strokeWidth=".7" strokeLinecap="round">
          <circle r="1.8" fill="#F5EFE6" stroke="none" />
          <line x1="-1.1" y1="-1.1" x2="1.1" y2="1.1" />
          <line x1="-1.1" y1="1.1" x2="1.1" y2="-1.1" />
        </g>
      )}
    </g>
  );
}

function NodeSummary({ node, profile, pickedOption, lastKind, coachFeedback, onReplay, onNext, nextLabel }) {
  if (!node.terminal) return null;
  const spotMistakeFeedback = lastKind === "spot-mistake" && pickedOption
    ? (pickedOption.ok ? pickedOption.why : pickedOption.no)
    : null;
  const coachExplanation = [spotMistakeFeedback, questionTextForAge(node, profile)]
    .filter(Boolean)
    .join(" ");
  return (
    <div>
      {profile.celebrate && pickedOption?.ok && <div style={{ fontSize: 24, marginBottom: 6 }}>Goal!</div>}
      {coachFeedback?.showCoach && (
        <CoachFeedback
          coach={coachFeedback.coach}
          headline={coachFeedback.headline}
          correct={!!pickedOption?.ok}
          explanation={coachExplanation}
        />
      )}
      {lastKind === "spot-mistake" && pickedOption && !coachFeedback?.showCoach && (
        <div
          role="status"
          style={{
            background: pickedOption.ok ? "#E8F7EE" : "#FFF2E5",
            border: `1px solid ${pickedOption.ok ? "#2E8B57" : "#C26A1B"}`,
            borderRadius: 9,
            color: "#0B1A33",
            marginBottom: 10,
            padding: "9px 11px",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 900 }}>
            {pickedOption.ok ? "Correct" : "Not quite"}
          </div>
          {spotMistakeFeedback && (
            <div style={{ fontSize: 12.5, fontWeight: 650, lineHeight: 1.45, marginTop: 3 }}>
              {pickedOption.ok ? pickedOption.why : pickedOption.no}
            </div>
          )}
        </div>
      )}
      {/* A finished read used to dead-end here on Replay alone: the only way
          onward was the browser-style back arrow in the header. Forward is the
          primary action and reads as the primary action; Replay steps back to
          secondary so the two are not competing for the same weight. */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {onNext && (
          <button
            onClick={onNext}
            style={{ background: "#C9A24B", color: "#0B1A33", border: "none", borderRadius: 9, padding: "9px 16px", fontSize: 13.5, cursor: "pointer", fontWeight: 900 }}
          >
            {nextLabel || "Next play →"}
          </button>
        )}
        <button
          onClick={onReplay}
          style={
            onNext
              ? { background: "transparent", color: "#0B1A33", border: "1px solid #CDD5E0", borderRadius: 9, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 700 }
              : { background: "#0B1A33", color: "#FFFFFF", border: "none", borderRadius: 9, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 800 }
          }
        >
          Replay
        </button>
      </div>
    </div>
  );
}

export default function AnimatedPlay({ play, ageBand = "U11", onEvent, onNext, nextLabel, coachOverride }) {
  const profile = profileForAge(ageBand);
  const [nodeId, setNodeId] = useState(play.start);
  // Who YOU are, carried past the read that asked.
  //
  // Identity was `node.decisionActor === actor.id`, and NO terminal node in the
  // catalog carries decisionActor — 65 of 65. So the gold ring and the "YOU"
  // caption both vanished the instant you answered, which is the moment the
  // outcome is being explained to you. On the backcheck play that left two
  // identical navy circles with no text at all, and the feedback then talks
  // about "F1".
  //
  // Sticky rather than derived from the graph, because a play can ask twice
  // (dz_breakout does) and the right answer on an outcome screen is whoever you
  // were on the read that produced it.
  const youIdRef = useRef(null);
  const [picked, setPicked] = useState(null);
  const [pickedOption, setPickedOption] = useState(null);
  const [judgePick, setJudgePick] = useState(null);
  const [lastKind, setLastKind] = useState(null);
  const [coachFeedback, setCoachFeedback] = useState(null);
  // Per node: the flag is about one read, so it clears when the play moves on
  // and the acknowledgement doesn't linger over the next question.
  const [unclearFlagged, setUnclearFlagged] = useState(false);
  const [entered, setEntered] = useState(false);
  const [showMotion, setShowMotion] = useState(false);
  const startedAtRef = useRef(Date.now());
  const watchedChainsRef = useRef(new Set());

  const actorMap = useMemo(() => Object.fromEntries(play.actors.map((a) => [a.id, a])), [play.actors]);
  const node = play.nodes[nodeId];
  // Latch on the way past. Terminal nodes carry no decisionActor, so this holds
  // the last one a read declared and every downstream outcome keeps marking the
  // same player as YOU.
  if (node?.decisionActor) youIdRef.current = node.decisionActor;
  const youId = node?.decisionActor || youIdRef.current;
  const kind = resolveKindForAge(node, ageBand);
  const activeOpts = kind === "verdict" && judgePick ? node.ask?.justify?.opts : node.ask?.opts;
  // Re-shuffles on every new node/judge step (new `activeOpts` identity), not
  // on every re-render -- so a button doesn't jump under the player's finger
  // mid-decision, but a fresh question (or a replay of the same one) gets an
  // independent order each time.
  const displayOpts = useMemo(() => shuffledOptions(activeOpts), [activeOpts]);

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
    setUnclearFlagged(false);
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
  }, [nodeId, play.id, ageBand, node.terminal, node.autoNext?.next, node.autoNext?.ms]);

  function choose(opt, index) {
    if (picked !== null || node.terminal) return;
    const ms = Date.now() - startedAtRef.current;
    setLastKind(kind);

    if (kind === "verdict" && node.ask.justify && !judgePick) {
      setJudgePick(opt);
      onEvent?.({ playId: play.id, nodeId, event: "judge", kind, answerId: opt.id, ok: !!opt.ok, ms });
      return;
    }

    setPicked(index);
    setPickedOption(opt);
    const coach = coachOverride || getCoachForQuestion({ id: `${play.id}:${nodeId}`, cat: play.coachCategory });
    const reinforcement = loadCoachReinforcement();
    const reinforcementResult = applyCoachAnswer(reinforcement, {
      id: `${play.id}:${nodeId}:${opt.id}`,
      correct: !!opt.ok,
    });
    saveCoachReinforcement(globalThis.sessionStorage, reinforcementResult.state);
    setCoachFeedback({
      showCoach: reinforcementResult.showCoach,
      coach,
      headline: coachFeedbackHeadline({ id: `${play.id}:${nodeId}:${opt.id}`, correct: !!opt.ok }),
    });
    if (kind === "verdict" && judgePick) {
      onEvent?.({ playId: play.id, nodeId, event: "answer", kind, answerId: judgePick.id, justifyId: opt.id, ok: !!(judgePick.ok && opt.ok), judgeOk: !!judgePick.ok, justifyOk: !!opt.ok, ms });
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
    youIdRef.current = null;
    setNodeId(play.start);
    setPicked(null);
    setPickedOption(null);
    setJudgePick(null);
    setLastKind(null);
    setCoachFeedback(null);
    onEvent?.({ playId: play.id, nodeId: play.start, event: "replay", ms: 0 });
  }

  const positions = (!entered && node.enter) ? node.enter : node.pos;
  const displayedPuck = (!entered && node.enterPuck) ? node.enterPuck : node.puck;
  const shownMotions = visibleMotionsFor(node);
  const timings = motionTimings(shownMotions.map((entry) => entry.motion));
  const cueLabel = node.cue ? cueLabelForAge(node.cue, profile) : "";
  // The plate was a fixed 20-unit rect sized for one short word. Now that it
  // carries the full cue label, the plate has to follow the text or the copy
  // spills off the white background.
  const cueWidth = Math.max(20, cueLabel.length * 1.85 + 6);

  return (
    <div style={{ background: profile.bg, borderRadius: 12, padding: 12, border: "1px solid #E3E7EE" }}>
      <style>{`
        @keyframes ap-motion-in { to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .ap-motion-in { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
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
        {node.cue && cueLabel && (
          <g data-testid="rink-cue-marker">
            <rect
              x={(node.cue.x || 150) - cueWidth / 2}
              y={(node.cue.y || 32) - 5}
              width={cueWidth}
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
              {cueLabel}
            </text>
          </g>
        )}

        {showMotion && shownMotions.map(({ motion, trail }, index) => (
          <RoutePath key={`${motion.kind}-${index}`} motion={motion} trail={trail} delayMs={timings[index].delayMs} />
        ))}
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
          const isDecisionActor = youId === actor.id;
          return (
            <g key={actor.id} transform={`translate(${p[0]},${p[1]})`} style={{ transition: "transform 1.4s cubic-bezier(.4,0,.2,1)" }} filter="url(#ap-shadow)">
              <ActorToken actor={actorMap[actor.id]} ageBand={ageBand} isDecisionActor={isDecisionActor} />
              {/* Keep YOU through every outcome. Trainer labels sit above the
                  equipment so the name and the figure remain readable. */}
              {(isDecisionActor || profile.token === "figure" || (profile.token === "symbol" && actor.role !== "goalie") || (profile.token === "token" && actor.role !== "defender")) && (
                <text y="-8.5" textAnchor="middle" fontSize="3.2" fill="#0B1A33" stroke="#F5EFE6" strokeWidth=".65" paintOrder="stroke" fontWeight="900">{actorDisplayLabel(actor, isDecisionActor, profile)}</text>
              )}
            </g>
          );
        })}
        {displayedPuck && (
          <g transform={`translate(${displayedPuck[0]},${displayedPuck[1]})`} style={{ transition: "transform 1.4s cubic-bezier(.4,0,.2,1)" }}>
            <circle r="1.35" fill="#111111" stroke="#FFFFFF" strokeWidth="0.35" />
            <ellipse cy="-.35" rx=".8" ry=".3" fill="#5B6675" />
          </g>
        )}
        {!node.terminal && kind === "spot-mistake" && (
          <ActorTapTargets
            options={node.ask.opts}
            positions={positions}
            picked={picked}
            disabled={picked !== null}
            onChoose={choose}
          />
        )}
      </svg>

      <div style={{ padding: "8px 4px 2px" }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".5px", textTransform: "uppercase", color: profile.accent }}>
          {/* This branched on an actor ID, not a role, so everything not
              literally named "F1" was labelled "support read" — including the
              backchecker, both forecheckers, all three gap-control D, and the
              player who is carrying the puck in the goalie-slide play. Nine of
              21 decision nodes described the wrong job. Read the role. */}
          {profile.label}{youId ? ` - ${decisionRoleLabel(actorMap[youId])}` : ""}
        </div>
        {node.terminal && lastKind === "predict-next" && pickedOption && (
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#5B6575", margin: "4px 0 2px" }}>
            You predicted: {optionTextForAge(pickedOption, actorMap, profile)}. Watch what actually happens.
          </div>
        )}
        {!node.terminal && (
          <div style={{ fontSize: profile.big ? 19 : 15, fontWeight: 800, color: "#0B1A33", margin: "5px 0 10px", lineHeight: 1.35 }}>
            {kind === "verdict" && judgePick ? node.ask.justify.q : questionTextForAge(node, profile)}
          </div>
        )}
        {node.terminal ? (
          <NodeSummary node={node} profile={profile} pickedOption={pickedOption} lastKind={lastKind} coachFeedback={coachFeedback} onReplay={replay} onNext={onNext} nextLabel={nextLabel} />
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
        ) : kind === "lane-pick" ? (
          // lane-pick has no button list -- the rink itself is the only
          // control, so nothing previously told a first-time player HOW to
          // answer beyond the small numbered dashed circles. This both
          // states the interaction and gives the screen real content to
          // fill the space a button list would otherwise occupy.
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: profile.big ? "14px 16px" : "11px 14px",
            borderRadius: profile.big ? 14 : 10,
            border: "1px dashed #C9A24B",
            background: "#FBF6EA",
            marginTop: 2,
          }}>
            <span aria-hidden="true" style={{ fontSize: profile.big ? 26 : 20, lineHeight: 1 }}>👆</span>
            <span style={{ fontSize: profile.big ? 15 : 13, fontWeight: 700, color: "#7A5A17", lineHeight: 1.35 }}>
              {profile.token === "figure"
                ? "Tap a spot on the ice to pick."
                : "Tap a numbered spot on the ice to make your read."}
            </span>
          </div>
        ) : kind === "spot-mistake" ? null : (
          displayOpts
            .filter((opt) => !opt.u13Only || ["U13", "U15", "U18"].includes(ageBand))
            .map((opt, index) => {
            const isPicked = picked === index;
            const suppressImmediateFeedback = kind === "predict-next";
            const showOk = isPicked && opt.ok && !suppressImmediateFeedback;
            const showBad = isPicked && !opt.ok && !suppressImmediateFeedback;
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
                {showBad && opt.no && !suppressImmediateFeedback && <div style={{ fontSize: 12, marginTop: 5, color: "#7A2A1C", fontWeight: 500 }}>{playerFacingTextForAge(opt.no, profile)}</div>}
              </button>
            );
          })
        )}
        {/* Judge-why surfacing: once the justify answer lands, show the coaching
            copy authored on the judge pick (why/no) — it never had a display
            path, and showing it earlier would leak the justify answer. */}
        {kind === "verdict" && judgePick && picked !== null && (judgePick.why || judgePick.no) && (
          <div style={{ fontSize: 12.5, marginTop: 8, padding: "8px 10px", borderRadius: 8, background: judgePick.ok ? "#F2FAF5" : "#FFF7EF", border: `1px solid ${judgePick.ok ? "#9CCFB2" : "#E0B98A"}`, color: judgePick.ok ? "#155F38" : "#7A4A1C", lineHeight: 1.45 }}>
            <span style={{ fontWeight: 800 }}>Your call: {optionTextForAge(judgePick, actorMap, profile)}.</span>{" "}
            {playerFacingTextForAge(judgePick.why || judgePick.no, profile)}
          </div>
        )}
        {/* This was a bordered button carrying more visual weight than Replay,
            for the least useful thing on the screen: a binary flag that tells
            us a read was confusing but never why. Demoted to a quiet text
            link — it still logs the signal so the confusing plays surface in
            telemetry — and it hands off to the Feedback widget, which is where
            the detail that actually fixes a play gets written. */}
        {unclearFlagged ? (
          <div style={{ marginTop: 10, fontSize: 11.5, color: "#6B7280", lineHeight: 1.45 }}>
            Thanks — flagged. Tap <strong>Feedback</strong> (bottom right) to tell us what was confusing.
          </div>
        ) : (
          <button
            onClick={() => {
              setUnclearFlagged(true);
              onEvent?.({ playId: play.id, nodeId, event: "unclear", ms: Date.now() - startedAtRef.current });
            }}
            style={{ marginTop: 10, background: "none", border: "none", padding: 0, color: "#8792A5", fontSize: 11.5, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit" }}
          >
            This read wasn't clear
          </button>
        )}
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
