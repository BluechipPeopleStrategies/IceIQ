import { useState, useRef, useEffect, useCallback, useMemo, Component } from "react";
import IceIQRink from "./IceIQRink";
import IceIQPOVRink from "./IceIQPOVRink";
import { C, FONT } from "./shared.jsx";

const M = 10;
const RINK_VIEWS = {
  full:    { pad: 15, w: 600, h: 300, xOffset: 0 },
  left:    { pad: 15, w: 300, h: 300, xOffset: 0 },
  right:   { pad: 15, w: 300, h: 300, xOffset: 300 },
  neutral: { pad: 15, w: 174, h: 300, xOffset: 213 },
};

const VALID_QUESTION_TYPES = [
  "mc", "diagram", "rank", "two-step", "sequence", "fill", "multi", "true-false",
  "drag-target", "drag-place", "zone-click", "multi-tap",
  "sequence-rink", "path-draw", "lane-select", "hot-spots",
  "pov-pick", "pov-mc",
];

function getViewBox(view) {
  const v = RINK_VIEWS[view] || RINK_VIEWS.full;
  const x = v.xOffset - v.pad;
  return `${x} ${-v.pad} ${v.w + v.pad * 2} ${v.h + v.pad * 2}`;
}

function toFiniteNumber(v, fallback = 0) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function useSVGPoint(ref) {
  return useCallback((evt) => {
    if (!ref.current) return { x: 0, y: 0 };
    try {
      const pt = ref.current.createSVGPoint();
      const t = evt.touches ? evt.touches[0] : evt;
      if (!t) return { x: 0, y: 0 };
      pt.x = t.clientX;
      pt.y = t.clientY;
      const ctm = ref.current.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      return pt.matrixTransform(ctm.inverse());
    } catch (err) {
      console.warn("[IceIQRinkQuestion] svgPoint failed:", err);
      return { x: 0, y: 0 };
    }
  }, [ref]);
}

function Feedback({ state, message }) {
  if (!state || !message) return null;
  const palette = state === "ok"
    ? { bg: C.greenDim, border: C.greenBorder, color: C.white }
    : state === "partial"
    ? { bg: C.yellowDim, border: "rgba(234,179,8,0.3)", color: C.white }
    : { bg: C.redDim, border: C.redBorder, color: C.white };
  return (
    <div style={{
      marginTop: "0.75rem", padding: "0.75rem 0.9rem",
      background: palette.bg, border: `1px solid ${palette.border}`,
      color: palette.color, borderRadius: 10,
      fontFamily: FONT.body, fontSize: 13, lineHeight: 1.55,
    }}>
      {message}
    </div>
  );
}

const questionTextStyle = { color: C.white, fontFamily: FONT.body, fontSize: 15, lineHeight: 1.5, margin: "0 0 0.25rem" };
const hintTextStyle = { color: C.dim, fontFamily: FONT.body, fontSize: 12, margin: "0 0 0.75rem" };
const rinkFrameStyle = { position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, background: C.bgCard, marginBottom: "0.75rem" };
const overlaySvgStyle = (interactive = true) => ({ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: interactive ? "auto" : "none" });
const actionRowStyle = (justify = "flex-end") => ({ display: "flex", gap: "0.5rem", marginTop: "0.5rem", justifyContent: justify });
const secondaryBtnStyle = {
  padding: "0.4rem 0.8rem", fontSize: 12, fontFamily: FONT.body,
  background: "transparent", color: C.dim, border: `1px solid ${C.border}`,
  borderRadius: 8, cursor: "pointer",
};
const primaryBtnStyle = {
  padding: "0.45rem 1rem", fontSize: 12, fontFamily: FONT.body, fontWeight: 700,
  background: C.gold, color: C.bg, border: "none", borderRadius: 8, cursor: "pointer",
};
const primaryBtnDisabledStyle = { ...primaryBtnStyle, background: C.dimmest, color: C.dimmer, cursor: "default" };
const chipBaseStyle = {
  padding: "0.35rem 0.85rem", fontFamily: FONT.body, fontSize: 13, fontWeight: 600,
  borderRadius: 999, userSelect: "none", border: "1px solid transparent",
};
const CHIP_PALETTE = {
  attacker: { bg: "rgba(239,68,68,0.18)", border: "rgba(239,68,68,0.45)", color: "#FCA5A5" },
  defender: { bg: "rgba(255,255,255,0.1)", border: "rgba(255,255,255,0.25)", color: C.white },
  teammate: { bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.4)", color: "#86EFAC" },
  player:   { bg: "rgba(91,164,232,0.15)", border: "rgba(91,164,232,0.4)", color: "#93C5FD" },
};

function mcButtonStyle({ done, isCorrect, isPicked }) {
  let bg = C.dimmest, bdr = C.border, col = C.dim, leftBdr = "transparent";
  if (done) {
    if (isCorrect) { bg = C.greenDim; bdr = C.greenBorder; col = C.white; leftBdr = C.green; }
    else if (isPicked) { bg = C.redDim; bdr = C.redBorder; col = C.dimmer; leftBdr = C.red; }
  }
  return {
    background: bg, border: `1px solid ${bdr}`, borderLeft: `3px solid ${leftBdr}`,
    borderRadius: 12, padding: "0.95rem 1.1rem",
    cursor: done ? "default" : "pointer",
    textAlign: "left", color: col,
    fontFamily: FONT.body, fontSize: 14, lineHeight: 1.55,
    display: "flex", alignItems: "flex-start", gap: "0.75rem",
    transition: "all 0.15s", width: "100%",
  };
}

class QuestionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("[IceIQRinkQuestion] Render error:", error, info);
    if (this.props.onError) this.props.onError(error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: "1rem", background: "rgba(234,179,8,0.1)",
          border: "1px solid rgba(234,179,8,0.3)", borderRadius: 10,
          color: C.white, fontFamily: FONT.body, fontSize: 13, lineHeight: 1.55,
        }}>
          <p style={{ fontWeight: 600, marginBottom: "0.35rem" }}>Question couldn't render</p>
          <p style={{ fontSize: 12, color: C.dim, marginBottom: "0.5rem" }}>
            This question has a data issue. The app will skip to the next question.
            You can report this so it gets fixed — look for the ID:{" "}
            <code style={{ background: C.dimmest, padding: "0 0.3rem", borderRadius: 4, color: C.white }}>
              {this.props.questionId || "unknown"}
            </code>
          </p>
          {this.props.onSkip && (
            <button onClick={this.props.onSkip} style={{
              marginTop: "0.5rem", padding: "0.35rem 0.75rem",
              background: C.gold, color: C.bg, border: "none",
              borderRadius: 8, fontSize: 12, fontFamily: FONT.body, fontWeight: 700, cursor: "pointer",
            }}>
              Skip to next question
            </button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

function validateQuestion(q) {
  const errors = [];
  const warnings = [];

  if (!q || typeof q !== "object") {
    errors.push("Question is not an object");
    return { errors, warnings, valid: false };
  }
  if (!q.id) warnings.push("Missing id field");
  if (!q.q || typeof q.q !== "string") errors.push("Missing question text (q)");
  if (!q.type) errors.push("Missing type field");
  if (q.type && !VALID_QUESTION_TYPES.includes(q.type)) {
    warnings.push(`Unknown type "${q.type}" — will fall back to MC`);
  }

  if (q.type === "drag-target") {
    if (!Array.isArray(q.targets) || q.targets.length === 0) {
      errors.push("drag-target requires a targets array");
    }
  }
  if (q.type === "drag-place") {
    if (!Array.isArray(q.slots) || q.slots.length === 0) errors.push("drag-place requires slots array");
    if (!Array.isArray(q.chips) || q.chips.length === 0) errors.push("drag-place requires chips array");
  }
  if (q.type === "zone-click") {
    if (!Array.isArray(q.zones) || q.zones.length === 0) errors.push("zone-click requires zones array");
  }
  if (q.type === "multi-tap" || q.type === "sequence-rink" || q.type === "hot-spots") {
    const arr = q.type === "hot-spots" ? q.spots : q.markers;
    if (!Array.isArray(arr) || arr.length === 0) errors.push(`${q.type} requires ${q.type === "hot-spots" ? "spots" : "markers"} array`);
  }
  if (q.type === "lane-select") {
    if (!Array.isArray(q.lanes) || q.lanes.length === 0) errors.push("lane-select requires lanes array");
  }
  if ((q.type === "mc" || q.type === "diagram") && !Array.isArray(q.choices)) {
    errors.push("mc/diagram requires choices array");
  }
  if (q.type === "pov-pick") {
    if (!q.pov || typeof q.pov !== "object") errors.push("pov-pick requires a pov config (camera + povRole)");
    if (!Array.isArray(q.targets) || q.targets.length === 0) errors.push("pov-pick requires a targets array");
  }
  if (q.type === "pov-mc") {
    if (!q.pov || typeof q.pov !== "object") errors.push("pov-mc requires a pov config (camera + povRole)");
    if (!Array.isArray(q.choices) || q.choices.length === 0) errors.push("pov-mc requires a choices array");
  }

  return { errors, warnings, valid: errors.length === 0 };
}

export default function IceIQRinkQuestion({ question, onAnswer, onReset, onSkip }) {
  const validation = validateQuestion(question);

  useEffect(() => {
    if (validation.warnings.length > 0) {
      console.warn(`[IceIQRinkQuestion] "${question?.id}" warnings:`, validation.warnings);
    }
    if (validation.errors.length > 0) {
      console.error(`[IceIQRinkQuestion] "${question?.id}" errors:`, validation.errors);
    }
  }, [question?.id, validation.errors, validation.warnings]);

  if (!validation.valid) {
    return (
      <div style={{
        padding: "1rem", background: "rgba(234,179,8,0.1)",
        border: "1px solid rgba(234,179,8,0.3)", borderRadius: 10,
        color: C.white, fontFamily: FONT.body, fontSize: 13, lineHeight: 1.55,
      }}>
        <p style={{ fontWeight: 600, marginBottom: "0.35rem" }}>Question data incomplete</p>
        <p style={{ fontSize: 12, color: C.dim, marginBottom: "0.5rem" }}>
          ID{" "}
          <code style={{ background: C.dimmest, padding: "0 0.3rem", borderRadius: 4, color: C.white }}>
            {question?.id || "unknown"}
          </code>{" "}
          is missing required fields:
        </p>
        <ul style={{ fontSize: 12, color: C.dim, margin: "0 0 0.6rem", paddingLeft: "1.25rem" }}>
          {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
        {onSkip && (
          <button onClick={onSkip} style={{
            padding: "0.35rem 0.75rem", background: C.gold, color: C.bg,
            border: "none", borderRadius: 8, fontSize: 12,
            fontFamily: FONT.body, fontWeight: 700, cursor: "pointer",
          }}>
            Skip this question
          </button>
        )}
      </div>
    );
  }

  const t = question.type;

  let Renderer;
  if (t === "mc" || t === "diagram") Renderer = question.rink ? MCWithRink : MCFallback;
  else if (t === "drag-target") Renderer = DragTarget;
  else if (t === "drag-place") Renderer = DragPlace;
  else if (t === "zone-click") Renderer = ZoneClick;
  else if (t === "multi-tap") Renderer = MultiTap;
  else if (t === "sequence-rink") Renderer = Sequence;
  else if (t === "path-draw") Renderer = PathDraw;
  else if (t === "lane-select") Renderer = LaneSelect;
  else if (t === "hot-spots") Renderer = HotSpots;
  else if (t === "pov-pick") Renderer = POVPick;
  else if (t === "pov-mc") Renderer = POVMC;
  else Renderer = question.choices ? MCFallback : null;

  if (!Renderer) {
    return (
      <div style={{
        padding: "1rem", background: "rgba(234,179,8,0.1)",
        border: "1px solid rgba(234,179,8,0.3)", borderRadius: 10,
        color: C.white, fontFamily: FONT.body, fontSize: 13, lineHeight: 1.55,
      }}>
        <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Unsupported question type: {t}</p>
        {onSkip && (
          <button onClick={onSkip} style={{
            marginTop: "0.3rem", padding: "0.35rem 0.75rem",
            background: C.gold, color: C.bg, border: "none",
            borderRadius: 8, fontSize: 12, fontFamily: FONT.body, fontWeight: 700, cursor: "pointer",
          }}>Skip</button>
        )}
      </div>
    );
  }

  return (
    <QuestionErrorBoundary questionId={question.id} onSkip={onSkip}>
      <Renderer question={question} onAnswer={onAnswer} onReset={onReset} />
    </QuestionErrorBoundary>
  );
}

function MCChoiceList({ question, onAnswer }) {
  const [picked, setPicked] = useState(null);
  const choices = Array.isArray(question.choices) ? question.choices : [];
  const correct = toFiniteNumber(question.correct, 0);
  const done = picked !== null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
      {choices.map((c, i) => {
        const isCorrect = i === correct;
        const isPicked = i === picked;
        return (
          <button key={i} disabled={done}
            onClick={() => { setPicked(i); onAnswer?.(i === correct); }}
            style={mcButtonStyle({ done, isCorrect, isPicked })}>
            <span style={{
              fontSize: 11, fontWeight: 800, minWidth: 22, marginTop: 1, flexShrink: 0,
              color: done ? (isCorrect ? C.green : isPicked ? C.red : C.dimmest) : C.dimmer,
              fontFamily: FONT.display,
            }}>
              {done ? (isCorrect ? "✓" : isPicked ? "✗" : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
            </span>
            <span style={{ wordBreak: "break-word", whiteSpace: "normal", flex: 1, fontSize: c.length > 100 ? 13 : 14 }}>{c}</span>
          </button>
        );
      })}
      {done && <Feedback state={picked === correct ? "ok" : "no"} message={question.tip} />}
    </div>
  );
}

function MCFallback({ question, onAnswer }) {
  return (
    <div>
      <p style={{ color: C.white, fontFamily: FONT.body, fontSize: 15, lineHeight: 1.5, margin: "0 0 0.9rem" }}>{question.q}</p>
      <MCChoiceList question={question} onAnswer={onAnswer} />
    </div>
  );
}

function MCWithRink({ question, onAnswer }) {
  return (
    <div>
      <p style={{ color: C.white, fontFamily: FONT.body, fontSize: 15, lineHeight: 1.5, margin: "0 0 0.9rem" }}>{question.q}</p>
      <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, background: C.bgCard, marginBottom: "0.9rem" }}>
        <IceIQRink {...(question.rink || {})} />
      </div>
      <MCChoiceList question={question} onAnswer={onAnswer} />
    </div>
  );
}

function DragTarget({ question, onAnswer, onReset }) {
  const svgRef = useRef(null);
  const svgPoint = useSVGPoint(svgRef);
  const targets = Array.isArray(question.targets) ? question.targets : [];
  const startPos = question.puckStart && typeof question.puckStart === "object"
    ? { x: toFiniteNumber(question.puckStart.x, 300), y: toFiniteNumber(question.puckStart.y, 150) }
    : { x: 300, y: 150 };
  const bestTarget = targets.find(t => t?.verdict === "best") || null;
  const [puckPos, setPuckPos] = useState(startPos);
  const [verdict, setVerdict] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [landedAt, setLandedAt] = useState(null); // target the puck landed in
  const [trail, setTrail] = useState([]); // drag trail for replay
  const dragRef = useRef({ dragging: false, offset: { x: 0, y: 0 }, last: startPos });

  const reset = () => {
    setPuckPos(startPos);
    setVerdict(null);
    setFeedback("");
    setLandedAt(null);
    setTrail([]);
    dragRef.current.last = startPos;
    onReset?.();
  };

  const onDown = (e) => {
    if (verdict) return;
    const p = svgPoint(e);
    dragRef.current.dragging = true;
    dragRef.current.offset = { x: p.x - puckPos.x, y: p.y - puckPos.y };
    setTrail([{ x: puckPos.x, y: puckPos.y }]);
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.dragging) return;
      const p = svgPoint(e);
      const nx = clamp(p.x - dragRef.current.offset.x, 0, 600);
      const ny = clamp(p.y - dragRef.current.offset.y, 0, 300);
      dragRef.current.last = { x: nx, y: ny };
      setPuckPos({ x: nx, y: ny });
      setTrail(prev => [...prev, { x: nx, y: ny }]);
      e.preventDefault();
    };
    const onUp = () => {
      if (!dragRef.current.dragging) return;
      dragRef.current.dragging = false;
      const pos = dragRef.current.last;
      const hit = targets.find(t =>
        t && Math.hypot(pos.x - toFiniteNumber(t.x, 0), pos.y - toFiniteNumber(t.y, 0)) < toFiniteNumber(t.radius, 30)
      );
      if (hit) {
        setVerdict(hit.verdict || "poor");
        setFeedback(hit.feedback || question.tip || "");
        setLandedAt(hit);
        onAnswer?.(hit.verdict === "best");
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [question, svgPoint, onAnswer, targets]);

  // Drive a 1.4s replay after drop: puck animates from start to landing,
  // and if the player's choice wasn't the best, the ideal puck also
  // travels from start to the best target in parallel.
  const replayActive = !!verdict;
  const t = useReplayT(replayActive, 1400);
  const verdictColor = !verdict ? "#ef4444"
    : verdict === "best" ? "#22c55e"
    : verdict === "okay" || verdict === "good" ? "#eab308"
    : "#ef4444";

  // Animated puck position — interpolates from start to where the player dropped.
  const animPuck = verdict && landedAt
    ? { x: startPos.x + (toFiniteNumber(landedAt.x, 300) - startPos.x) * t,
        y: startPos.y + (toFiniteNumber(landedAt.y, 150) - startPos.y) * t }
    : puckPos;
  // "What the right play looked like" — second puck for wrong answers.
  const showIdeal = verdict && verdict !== "best" && bestTarget;
  const idealPuck = showIdeal ? {
    x: startPos.x + (toFiniteNumber(bestTarget.x, 300) - startPos.x) * t,
    y: startPos.y + (toFiniteNumber(bestTarget.y, 150) - startPos.y) * t,
  } : null;

  return (
    <div>
      <p style={questionTextStyle}>{question.q}</p>
      <p style={hintTextStyle}>Drag the red puck to where it should go.</p>
      <div style={rinkFrameStyle}>
        <IceIQRink {...(question.rink || {})} />
        <svg ref={svgRef} viewBox={getViewBox(question.rink?.view)} preserveAspectRatio="none"
          style={overlaySvgStyle(!verdict)}>
          {/* Target zones — fade dashed hints while dragging, highlight the
              correct one after drop. */}
          {targets.map((tgt, i) => {
            const isBest = tgt?.verdict === "best";
            const isPicked = verdict && landedAt === tgt;
            const ringColor = !verdict ? "#22c55e"
              : isBest ? "#22c55e"
              : isPicked ? verdictColor
              : "#64748b";
            return (
              <g key={i} opacity={!verdict ? 1 : (isBest || isPicked ? 1 : 0.35)}>
                <circle cx={toFiniteNumber(tgt.x, 300)} cy={toFiniteNumber(tgt.y, 150)}
                  r={toFiniteNumber(tgt.radius, 30)}
                  fill={isBest && verdict ? "rgba(34,197,94,0.18)" : isPicked ? `${ringColor}22` : "rgba(34,197,94,0.14)"}
                  stroke={ringColor}
                  strokeWidth={verdict && (isBest || isPicked) ? 2 : 1.4}
                  strokeDasharray={verdict && isBest ? "none" : "4 2.5"} />
                {tgt.label && (
                  <text x={toFiniteNumber(tgt.x, 300)} y={toFiniteNumber(tgt.y, 150) + 4}
                    textAnchor="middle" fill={isBest && verdict ? "#86EFAC" : "#86EFAC"} fontSize="11" fontWeight="600">
                    {tgt.label}
                  </text>
                )}
              </g>
            );
          })}
          {/* Drag trail (visible during drag AND during replay so the
              player can see the path they took). */}
          {trail.length > 1 && (
            <path d={smoothPathD(trail)} fill="none" stroke={verdictColor} strokeWidth="2.5"
              strokeDasharray={verdict ? "4 3" : "none"} strokeLinecap="round" opacity={verdict ? 0.6 : 0.9}/>
          )}
          {/* Ghost line showing where the ideal puck WOULD have gone on a wrong answer. */}
          {showIdeal && (
            <line x1={startPos.x} y1={startPos.y}
              x2={toFiniteNumber(bestTarget.x, 300)} y2={toFiniteNumber(bestTarget.y, 150)}
              stroke="#22c55e" strokeWidth="2" strokeDasharray="5 3" opacity="0.65"/>
          )}
          {/* The actual puck — animates to the chosen target after drop. */}
          <g transform={`translate(${animPuck.x},${animPuck.y})`}
            style={{ cursor: verdict ? "default" : "grab" }}
            onMouseDown={onDown} onTouchStart={onDown}>
            <ellipse cx="0" cy="1" rx="10" ry="3.5" fill="#ef4444" stroke="#fff" strokeWidth="1.2" />
          </g>
          {/* A green "what should have happened" puck for wrong answers. */}
          {showIdeal && idealPuck && (
            <g transform={`translate(${idealPuck.x},${idealPuck.y})`} style={{pointerEvents:"none"}}>
              <ellipse cx="0" cy="1" rx="10" ry="3.5" fill="#22c55e" stroke="#fff" strokeWidth="1.2" opacity="0.8"/>
            </g>
          )}
        </svg>
      </div>
      {verdict && (
        <>
          {showIdeal && (
            <div style={{display:"flex",gap:".85rem",padding:".5rem .25rem",fontSize:11,color:"#94a3b8",justifyContent:"center"}}>
              <span><span style={{color:verdictColor,fontWeight:800}}>●</span> your puck</span>
              <span><span style={{color:"#22c55e",fontWeight:800}}>●</span> ideal</span>
            </div>
          )}
          <Feedback state={verdict === "best" ? "ok" : (verdict === "okay" || verdict === "good") ? "partial" : "no"} message={feedback} />
          <div style={actionRowStyle()}>
            <button onClick={reset} style={secondaryBtnStyle}>Try again</button>
          </div>
        </>
      )}
    </div>
  );
}

function DragPlace({ question, onAnswer, onReset }) {
  const svgRef = useRef(null);
  const svgPoint = useSVGPoint(svgRef);
  const slots = Array.isArray(question.slots) ? question.slots : [];
  const chips = Array.isArray(question.chips) ? question.chips : [];
  const [placed, setPlaced] = useState({});
  const [used, setUsed] = useState(new Set());
  const [checked, setChecked] = useState(false);
  const dragChipId = useRef(null);

  const reset = () => {
    setPlaced({});
    setUsed(new Set());
    setChecked(false);
    onReset?.();
  };

  const onDragOver = (e) => e.preventDefault();
  const onDrop = (e) => {
    e.preventDefault();
    if (!dragChipId.current) return;
    const p = svgPoint(e);
    const slot = slots.find(s => s && Math.hypot(p.x - toFiniteNumber(s.x, 0), p.y - toFiniteNumber(s.y, 0)) < toFiniteNumber(s.tol, 45));
    if (slot) {
      setPlaced(prev => {
        const next = { ...prev };
        if (next[slot.id]) {
          setUsed(u => { const n = new Set(u); n.delete(next[slot.id]); return n; });
        }
        next[slot.id] = dragChipId.current;
        return next;
      });
      setUsed(u => new Set([...u, dragChipId.current]));
    }
    dragChipId.current = null;
  };

  const check = () => {
    setChecked(true);
    const correctCount = slots.filter(s => placed[s.id] === s.id).length;
    onAnswer?.(correctCount === slots.length, correctCount, slots.length);
  };

  const correctCount = slots.filter(s => placed[s.id] === s.id).length;
  const allCorrect = checked && correctCount === slots.length;
  const partial = checked && correctCount > 0 && correctCount < slots.length;

  return (
    <div>
      <p style={questionTextStyle}>{question.q}</p>
      <p style={hintTextStyle}>Drag each chip onto the highlighted slot on the ice.</p>

      <div style={{
        display: "flex", flexWrap: "wrap", gap: "0.4rem",
        marginBottom: "0.75rem", padding: "0.5rem",
        background: C.dimmest, borderRadius: 10, minHeight: 44, border: `1px solid ${C.border}`,
      }}>
        {chips.map(c => {
          const isUsed = used.has(c.id);
          const palette = CHIP_PALETTE[c.kind] || { bg: C.dimmest, border: C.border, color: C.white };
          return (
            <span key={c.id}
              draggable={!isUsed && !checked}
              onDragStart={() => { dragChipId.current = c.id; }}
              onClick={() => {
                if (!isUsed || checked) return;
                const slotId = Object.keys(placed).find(k => placed[k] === c.id);
                if (slotId) {
                  setPlaced(prev => { const n = { ...prev }; delete n[slotId]; return n; });
                  setUsed(u => { const n = new Set(u); n.delete(c.id); return n; });
                }
              }}
              style={{
                ...chipBaseStyle,
                background: palette.bg, borderColor: palette.border, color: palette.color,
                cursor: isUsed ? "pointer" : "grab", opacity: isUsed ? 0.25 : 1,
              }}>
              {c.label || c.id}
            </span>
          );
        })}
      </div>

      <div style={rinkFrameStyle}>
        <IceIQRink {...(question.rink || {})} />
        <svg ref={svgRef} viewBox={getViewBox(question.rink?.view)} preserveAspectRatio="none"
          style={overlaySvgStyle(true)}
          onDragOver={onDragOver} onDrop={onDrop}>
          {slots.map(s => (
            <g key={s.id}>
              <circle cx={toFiniteNumber(s.x, 0)} cy={toFiniteNumber(s.y, 0)} r="22"
                fill="rgba(34,197,94,0.12)" stroke="#22c55e" strokeWidth="1.4" strokeDasharray="4 2.5" />
              <text x={toFiniteNumber(s.x, 0)} y={toFiniteNumber(s.y, 0) + 3} textAnchor="middle"
                fill="rgba(134,239,172,0.85)" fontSize="10" fontWeight="600">{s.id}</text>
            </g>
          ))}
          {Object.entries(placed).map(([slotId, chipId]) => {
            const slot = slots.find(s => s.id === slotId);
            const chip = chips.find(c => c.id === chipId);
            if (!slot || !chip) return null;
            const fills = { attacker: "#E24B4A", defender: "#2C2C2A", teammate: "#1D9E75", player: "#185FA5" };
            const isCorrect = checked && slotId === chipId;
            const isWrong = checked && slotId !== chipId;
            return (
              <g key={slotId} transform={`translate(${toFiniteNumber(slot.x, 0)},${toFiniteNumber(slot.y, 0)})`}>
                <circle cx="0" cy="0" r="11" fill={fills[chip.kind] || "#185FA5"}
                  stroke={isCorrect ? "#22c55e" : isWrong ? "#ef4444" : "#fff"}
                  strokeWidth={isCorrect || isWrong ? "2.2" : "1.5"} />
                <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600">{chipId}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {checked ? (
        <>
          <Feedback state={allCorrect ? "ok" : partial ? "partial" : "no"}
            message={allCorrect ? question.tip : partial ? `${correctCount} of ${slots.length} correct. ${question.tip || ""}` : question.tip} />
          <div style={actionRowStyle()}>
            <button onClick={reset} style={secondaryBtnStyle}>Try again</button>
          </div>
        </>
      ) : (
        <div style={actionRowStyle()}>
          <button onClick={reset} style={secondaryBtnStyle}>Reset</button>
          <button onClick={check} disabled={Object.keys(placed).length === 0}
            style={Object.keys(placed).length === 0 ? primaryBtnDisabledStyle : primaryBtnStyle}>
            Check formation
          </button>
        </div>
      )}
    </div>
  );
}

function ZoneClick({ question, onAnswer, onReset }) {
  const zones = Array.isArray(question.zones) ? question.zones : [];
  const [picked, setPicked] = useState(null);
  const done = picked !== null;

  const handle = (zone, i) => {
    if (done) return;
    setPicked(i);
    onAnswer?.(!!zone.correct);
  };

  const reset = () => {
    setPicked(null);
    onReset?.();
  };

  const pickedZone = picked !== null ? zones[picked] : null;

  return (
    <div>
      <p style={{ color: C.white, fontFamily: FONT.body, fontSize: 15, lineHeight: 1.5, margin: "0 0 0.25rem" }}>{question.q}</p>
      <p style={{ color: C.dim, fontFamily: FONT.body, fontSize: 12, margin: "0 0 0.75rem" }}>Tap the correct area of the rink.</p>
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, background: C.bgCard, marginBottom: "0.75rem" }}>
        <IceIQRink {...(question.rink || {})} />
        <svg viewBox={getViewBox(question.rink?.view)} preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: done ? "none" : "auto" }}>
          {zones.map((z, i) => {
            const isPicked = picked === i;
            const isUnpickedCorrect = done && !isPicked && z.correct;
            let fill = "rgba(91,164,232,0.14)";
            let stroke = "#5BA4E8";
            let sw = 1.2;
            let dash = "4 2.5";
            if (done && isPicked) {
              fill = z.correct ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.3)";
              stroke = z.correct ? "#22c55e" : "#ef4444";
              sw = 2.5;
              dash = "none";
            } else if (isUnpickedCorrect) {
              // Show the right zone if the player picked wrong — pulsing
              // yellow so they can see what they should have tapped.
              fill = "rgba(234,179,8,0.2)";
              stroke = "#eab308";
              sw = 2;
              dash = "3 2";
            } else if (done) {
              fill = "rgba(100,116,139,0.08)";
              stroke = "#64748b";
              sw = 1;
            }
            if (z.shape === "circle") {
              return (
                <g key={i}>
                  {done && isPicked && z.correct && (
                    <circle cx={toFiniteNumber(z.x, 0)} cy={toFiniteNumber(z.y, 0)}
                      r={toFiniteNumber(z.radius, 30)}
                      fill="none" stroke="#22c55e" strokeWidth="2">
                      <animate attributeName="r" values={`${toFiniteNumber(z.radius, 30)};${toFiniteNumber(z.radius, 30) + 12};${toFiniteNumber(z.radius, 30)}`} dur="1.4s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" values="0.9;0;0.9" dur="1.4s" repeatCount="indefinite"/>
                    </circle>
                  )}
                  <circle cx={toFiniteNumber(z.x, 0)} cy={toFiniteNumber(z.y, 0)}
                    r={toFiniteNumber(z.radius, 30)}
                    fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash}
                    style={{ cursor: done ? "default" : "pointer" }}
                    onClick={() => handle(z, i)} />
                </g>
              );
            }
            if (Array.isArray(z.points)) {
              const pts = z.points.map(p => `${toFiniteNumber(p.x, 0)},${toFiniteNumber(p.y, 0)}`).join(" ");
              return (
                <polygon key={i} points={pts}
                  fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash}
                  style={{ cursor: done ? "default" : "pointer", transition: "fill .3s, stroke .3s" }}
                  onClick={() => handle(z, i)} />
              );
            }
            return null;
          })}
        </svg>
      </div>
      {done && pickedZone && (
        <>
          <Feedback state={pickedZone.correct ? "ok" : "no"} message={pickedZone.msg || question.tip} />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", justifyContent: "flex-end" }}>
            <button onClick={reset} style={{
              padding: "0.4rem 0.8rem", fontSize: 12, fontFamily: FONT.body,
              background: "transparent", color: C.dim, border: `1px solid ${C.border}`,
              borderRadius: 8, cursor: "pointer",
            }}>Try again</button>
          </div>
        </>
      )}
    </div>
  );
}

function MultiTap({ question, onAnswer, onReset }) {
  const markers = Array.isArray(question.markers) ? question.markers : [];
  const [selected, setSelected] = useState(new Set());
  const [checked, setChecked] = useState(false);

  const reset = () => {
    setSelected(new Set());
    setChecked(false);
    onReset?.();
  };

  const toggle = (i) => {
    if (checked) return;
    setSelected(s => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  };

  const check = () => {
    setChecked(true);
    const correctIdxs = markers.map((m, i) => m.correct ? i : -1).filter(i => i >= 0);
    const got = [...selected].filter(i => correctIdxs.includes(i)).length;
    const wrong = [...selected].filter(i => !correctIdxs.includes(i)).length;
    const perfect = wrong === 0 && got === correctIdxs.length;
    onAnswer?.(perfect, { got, wrong, missed: correctIdxs.length - got });
  };

  const correctIdxs = markers.map((m, i) => m.correct ? i : -1).filter(i => i >= 0);
  const got = [...selected].filter(i => correctIdxs.includes(i)).length;
  const wrong = [...selected].filter(i => !correctIdxs.includes(i)).length;
  const missed = correctIdxs.length - got;
  const perfect = checked && wrong === 0 && missed === 0;

  return (
    <div>
      <p style={questionTextStyle}>{question.q}</p>
      <p style={hintTextStyle}>Tap every correct marker. More than one may be right.</p>
      <div style={rinkFrameStyle}>
        <IceIQRink {...(question.rink || {})} />
        <svg viewBox={getViewBox(question.rink?.view)} preserveAspectRatio="none"
          style={overlaySvgStyle(!checked)}>
          {markers.map((m, i) => {
            const fills = { attacker: "#E24B4A", defender: "#2C2C2A", teammate: "#1D9E75", player: "#185FA5" };
            const labels = { attacker: "X", defender: "D", teammate: "T", player: "O" };
            const sel = selected.has(i);
            const isCorrectPick = checked && sel && m.correct;
            const isWrongPick = checked && sel && !m.correct;
            const isMissed = checked && !sel && m.correct;
            let ringColor = "#5BA4E8", ringDash = "4 2.5", ringOp = sel ? "1" : "0.55";
            if (isCorrectPick) { ringColor = "#22c55e"; ringDash = "none"; ringOp = "1"; }
            if (isWrongPick) { ringColor = "#ef4444"; ringDash = "none"; ringOp = "1"; }
            if (isMissed) { ringColor = "#eab308"; ringDash = "3 2"; ringOp = "1"; }
            return (
              <g key={i} transform={`translate(${toFiniteNumber(m.x, 0)},${toFiniteNumber(m.y, 0)})`}
                style={{ cursor: checked ? "default" : "pointer" }}
                onClick={() => toggle(i)}>
                {/* Pulsing ring on correctly-picked spots after check — reward tap. */}
                {isCorrectPick && (
                  <circle cx="0" cy="0" r="22" fill="none" stroke="#22c55e" strokeWidth="2">
                    <animate attributeName="r" values="18;30;18" dur="1.4s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.9;0;0.9" dur="1.4s" repeatCount="indefinite"/>
                  </circle>
                )}
                {/* Pulsing yellow ring on missed-correct spots. "You should have hit these too." */}
                {isMissed && (
                  <circle cx="0" cy="0" r="22" fill="none" stroke="#eab308" strokeWidth="2" strokeDasharray="3 2">
                    <animate attributeName="r" values="18;26;18" dur="1.2s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="1;0.35;1" dur="1.2s" repeatCount="indefinite"/>
                  </circle>
                )}
                <circle cx="0" cy="0" r="18"
                  fill={sel ? "rgba(91,164,232,0.2)" : "none"}
                  stroke={ringColor} strokeWidth="1.8"
                  strokeDasharray={ringDash} opacity={ringOp} />
                <circle cx="0" cy="0" r="11" fill={fills[m.type] || "#185FA5"} stroke="#fff" strokeWidth="1.5" />
                <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600">
                  {m.label || labels[m.type] || ""}
                </text>
                {isMissed && (
                  <text x="0" y="-24" textAnchor="middle" fontSize="9" fontWeight="800" fill="#eab308">missed</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {checked ? (
        <>
          <Feedback state={perfect ? "ok" : got > 0 && wrong === 0 ? "partial" : "no"}
            message={perfect ? question.tip : `You got ${got} right, ${wrong} wrong, missed ${missed}. ${question.tip || ""}`} />
          <div style={actionRowStyle()}>
            <button onClick={reset} style={secondaryBtnStyle}>Try again</button>
          </div>
        </>
      ) : (
        <div style={actionRowStyle()}>
          <button onClick={reset} style={secondaryBtnStyle}>Reset</button>
          <button onClick={check} disabled={selected.size === 0}
            style={selected.size === 0 ? primaryBtnDisabledStyle : primaryBtnStyle}>
            Check answers
          </button>
        </div>
      )}
    </div>
  );
}

function Sequence({ question, onAnswer, onReset }) {
  const markers = Array.isArray(question.markers) ? question.markers : [];
  const [sequence, setSequence] = useState([]);
  const [done, setDone] = useState(false);

  const reset = () => { setSequence([]); setDone(false); onReset?.(); };

  const tap = (i) => {
    if (done || sequence.includes(i)) return;
    const next = [...sequence, i];
    setSequence(next);
    if (next.length === markers.length) {
      const correct = next.every((idx, pos) => markers[idx]?.order === pos + 1);
      setDone(true);
      onAnswer?.(correct);
    }
  };

  const correct = done && sequence.every((idx, pos) => markers[idx]?.order === pos + 1);

  // Ideal-order markers, sorted by `order`. Drives the auto-playthrough
  // puck animation on a correct sequence AND the ghost overlay on a wrong one.
  const ordered = useMemo(
    () => [...markers].filter(m => typeof m.order === "number").sort((a, b) => a.order - b.order),
    [markers]
  );
  const orderedPoints = useMemo(
    () => ordered.map(m => ({ x: toFiniteNumber(m.x, 0), y: toFiniteNumber(m.y, 0) })),
    [ordered]
  );
  // The puck visits each numbered marker in sequence over `playDuration` ms.
  // `playT` counts from 0 to `ordered.length - 1` across the run.
  const playDuration = 400 * Math.max(1, ordered.length - 1);
  const rawT = useReplayT(done, playDuration);
  const playT = rawT * Math.max(1, ordered.length - 1);
  function puckAt() {
    if (!ordered.length) return null;
    const i0 = Math.max(0, Math.min(ordered.length - 1, Math.floor(playT)));
    const i1 = Math.min(ordered.length - 1, i0 + 1);
    const f = playT - i0;
    const p0 = orderedPoints[i0];
    const p1 = orderedPoints[i1];
    if (!p0 || !p1) return null;
    return { x: p0.x + (p1.x - p0.x) * f, y: p0.y + (p1.y - p0.y) * f };
  }
  const puckPos = done && orderedPoints.length ? puckAt() : null;
  // For the path polyline showing the ideal route.
  const pathD = orderedPoints.length > 1
    ? orderedPoints.map((p, i) => (i === 0 ? "M" : "L") + ` ${p.x} ${p.y}`).join(" ")
    : "";

  return (
    <div>
      <p style={questionTextStyle}>{question.q}</p>
      <p style={hintTextStyle}>Tap the markers in the correct order, 1 → {markers.length}.</p>
      <div style={rinkFrameStyle}>
        <IceIQRink {...(question.rink || {})} />
        <svg viewBox={getViewBox(question.rink?.view)} preserveAspectRatio="none"
          style={overlaySvgStyle(!done)}>
          {/* Ideal-sequence path revealed after submission. */}
          {done && pathD && (
            <path d={pathD} fill="none" stroke={correct ? "#22c55e" : "#eab308"}
              strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 3" opacity="0.7"/>
          )}
          {markers.map((m, i) => {
            const fills = { attacker: "#E24B4A", defender: "#2C2C2A", teammate: "#1D9E75", player: "#185FA5" };
            const labels = { attacker: "X", defender: "D", teammate: "T", player: "O" };
            const seqPos = sequence.indexOf(i);
            const tapped = seqPos >= 0;
            const correctAtThisPos = done && tapped && m.order === seqPos + 1;
            const wrongAtThisPos = done && tapped && m.order !== seqPos + 1;
            return (
              <g key={i} transform={`translate(${toFiniteNumber(m.x, 0)},${toFiniteNumber(m.y, 0)})`}
                style={{ cursor: done || tapped ? "default" : "pointer" }}
                onClick={() => tap(i)}>
                {tapped && (
                  <circle cx="0" cy="0" r="16" fill="none"
                    stroke={correctAtThisPos ? "#22c55e" : wrongAtThisPos ? "#ef4444" : "#5BA4E8"}
                    strokeWidth="2.2" />
                )}
                <circle cx="0" cy="0" r="11" fill={fills[m.type] || "#185FA5"} stroke="#fff" strokeWidth="1.5" />
                <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600">
                  {m.label || labels[m.type] || ""}
                </text>
                {tapped && (
                  <>
                    <circle cx="14" cy="-12" r="8" fill={C.gold} />
                    <text x="14" y="-9" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">{seqPos + 1}</text>
                  </>
                )}
                {done && typeof m.order === "number" && (
                  <text x="-14" y="-12" textAnchor="middle" fontSize="9" fontWeight="800"
                    fill={correct ? "#22c55e" : "#eab308"}>{m.order}</text>
                )}
              </g>
            );
          })}
          {/* Animated puck traveling the ideal sequence. */}
          {puckPos && (
            <g transform={`translate(${puckPos.x},${puckPos.y})`} style={{pointerEvents:"none"}}>
              <ellipse cx="0" cy="1" rx="10" ry="3.5" fill={correct ? "#22c55e" : "#eab308"} stroke="#fff" strokeWidth="1.2" />
            </g>
          )}
        </svg>
      </div>
      {done && (
        <>
          <Feedback state={correct ? "ok" : "no"} message={correct
            ? (question.tip || "Nice order — watch the puck move through your sequence.")
            : `The numbers show the correct order. ${question.tip || ""}`} />
          <div style={actionRowStyle()}>
            <button onClick={reset} style={secondaryBtnStyle}>Try again</button>
          </div>
        </>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
// Shared polish helpers — used by PathDraw, DragTarget, LaneSelect,
// Sequence, and the other interactive renderers. Extracted so each
// renderer can add "play develops" animations without reinventing the
// same math.
// ───────────────────────────────────────────────────────────────────

// Interpolate a point t ∈ [0,1] along a list of resampled points.
function ptAt(pts, t) {
  if (!pts || pts.length === 0) return null;
  if (t <= 0) return pts[0];
  if (t >= 1) return pts[pts.length - 1];
  const idx = t * (pts.length - 1);
  const i0 = Math.floor(idx);
  const i1 = Math.min(pts.length - 1, i0 + 1);
  const f = idx - i0;
  return { x: pts[i0].x + f * (pts[i1].x - pts[i0].x), y: pts[i0].y + f * (pts[i1].y - pts[i0].y) };
}

// Drive a t ∈ [0,1] value via requestAnimationFrame. Starts when `active`
// flips to true; pass `duration` in ms (default 1500). Returns current t.
function useReplayT(active, duration = 1500) {
  const [t, setT] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (!active) { setT(0); return; }
    const start = performance.now();
    const tick = (now) => {
      const frac = Math.min(1, (now - start) / duration);
      setT(frac);
      if (frac < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [active, duration]);
  return t;
}

// ───────────────────────────────────────────────────────────────────
// Polish helpers for PathDraw
// ───────────────────────────────────────────────────────────────────

// Quadratic-midpoint smoothing — turns a list of raw points into a
// flowing SVG `d` string. Good enough to make shaky finger-drags look
// like clean skate routes without a heavy spline library.
function smoothPathD(points) {
  if (!points || points.length === 0) return "";
  if (points.length < 3) {
    return points.map((p, i) => (i === 0 ? "M" : "L") + ` ${p.x} ${p.y}`).join(" ");
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    d += ` Q ${curr.x} ${curr.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

// Resample a point list to exactly `n` equally-spaced points along its
// arc length. Lets us compare paths of different lengths fairly.
function resamplePath(points, n = 24) {
  if (!points || points.length < 2) return points ? points.slice() : [];
  const segLens = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i].x - points[i-1].x, points[i].y - points[i-1].y);
    segLens.push(d);
    total += d;
  }
  if (total === 0) return points.slice(0, 1);
  const out = [points[0]];
  const step = total / (n - 1);
  let targetD = step;
  let accum = 0;
  for (let i = 1; i < points.length && out.length < n - 1; i++) {
    const segLen = segLens[i-1];
    while (accum + segLen >= targetD && out.length < n - 1) {
      const t = (targetD - accum) / segLen;
      out.push({
        x: points[i-1].x + t * (points[i].x - points[i-1].x),
        y: points[i-1].y + t * (points[i].y - points[i-1].y),
      });
      targetD += step;
    }
    accum += segLen;
  }
  out.push(points[points.length - 1]);
  return out;
}

// Average distance between two same-length resampled paths. Lower = closer.
function pathDeviation(a, b) {
  const n = Math.min(a.length, b.length);
  if (n === 0) return Infinity;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y);
  }
  return sum / n;
}

function PathDraw({ question, onAnswer, onReset }) {
  const svgRef = useRef(null);
  const svgPoint = useSVGPoint(svgRef);
  const [path, setPath] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [result, setResult] = useState(null);
  // Replay state: `t` in [0, 1] drives the skater positions along both
  // player and ideal paths after submission. Animates over 2s.
  const [replayT, setReplayT] = useState(0);
  const replayRef = useRef(null);

  const start = question.start && typeof question.start === "object"
    ? { x: toFiniteNumber(question.start.x, 300), y: toFiniteNumber(question.start.y, 150), radius: toFiniteNumber(question.start.radius, 30) }
    : { x: 300, y: 150, radius: 30 };
  const target = question.target && typeof question.target === "object"
    ? { x: toFiniteNumber(question.target.x, 500), y: toFiniteNumber(question.target.y, 200), radius: toFiniteNumber(question.target.radius, 35) }
    : null;
  const avoid = Array.isArray(question.avoid) ? question.avoid.map(a => ({
    x: toFiniteNumber(a.x, 0), y: toFiniteNumber(a.y, 0), radius: toFiniteNumber(a.radius, 14)
  })) : [];
  // Ideal path — array of {x,y}. Present on polished questions. When set,
  // scoring is based on average deviation instead of binary target-hit.
  const idealRaw = Array.isArray(question.idealPath)
    ? question.idealPath.map(p => ({ x: toFiniteNumber(p.x, 0), y: toFiniteNumber(p.y, 0) }))
    : null;
  const idealResampled = useMemo(() => idealRaw ? resamplePath(idealRaw, 24) : null, [idealRaw]);
  const idealD = idealRaw ? smoothPathD(idealRaw) : "";

  const reset = () => {
    if (replayRef.current) cancelAnimationFrame(replayRef.current);
    setPath([]); setDrawing(false); setResult(null); setReplayT(0);
    onReset?.();
  };

  const onDown = (e) => {
    if (result) return;
    const p = svgPoint(e);
    const dist = Math.hypot(p.x - start.x, p.y - start.y);
    if (dist > start.radius) return;
    setDrawing(true);
    setPath([{ x: p.x, y: p.y }]);
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!drawing) return;
      const p = svgPoint(e);
      setPath(prev => [...prev, { x: p.x, y: p.y }]);
      e.preventDefault();
    };
    const onUp = () => {
      if (!drawing) return;
      setDrawing(false);
      setPath(prev => {
        const end = prev[prev.length - 1];
        if (!end) return prev;
        // Hard fail: ran through a defender.
        const hitAvoid = avoid.some(a => prev.some(pt => Math.hypot(pt.x - a.x, pt.y - a.y) < a.radius));
        if (hitAvoid) {
          setResult({ state: "no", msg: "Your path crossed a defender. Try curling around traffic. " + (question.tip || "") });
          onAnswer?.(false);
          return prev;
        }
        // Polished-question path: deviation-based scoring when idealPath exists.
        if (idealResampled) {
          const playerResampled = resamplePath(prev, 24);
          const dev = pathDeviation(playerResampled, idealResampled);
          const endNearTarget = target ? Math.hypot(end.x - target.x, end.y - target.y) < target.radius * 1.3 : true;
          if (dev <= 22 && endNearTarget) {
            setResult({ state: "ok", dev, msg: "Excellent route. " + (question.tip || "") });
            onAnswer?.(true);
          } else if (dev <= 42 && endNearTarget) {
            setResult({ state: "partial", dev, msg: `Close — about ${Math.round(dev)} units off the ideal line. ` + (question.tip || "") });
            onAnswer?.(false);
          } else {
            setResult({ state: "no", dev, msg: `Off the read — ${Math.round(dev)} units wide. ` + (question.tip || "") });
            onAnswer?.(false);
          }
          return prev;
        }
        // Legacy fallback: binary target-hit for questions without an idealPath.
        const nearTarget = target ? Math.hypot(end.x - target.x, end.y - target.y) < target.radius : true;
        if (nearTarget) {
          setResult({ state: "ok", msg: question.tip || "Nice route." });
          onAnswer?.(true);
        } else {
          setResult({ state: "partial", msg: "You avoided pressure but didn't reach the open ice. " + (question.tip || "") });
          onAnswer?.(false);
        }
        return prev;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [drawing, svgPoint, onAnswer, target, avoid, question.tip, idealResampled]);

  // Drive the side-by-side replay once the answer locks.
  useEffect(() => {
    if (!result || !idealResampled || path.length < 2) return;
    const startTs = performance.now();
    const DURATION = 2000;
    const tick = (now) => {
      const elapsed = now - startTs;
      const frac = Math.min(1, elapsed / DURATION);
      setReplayT(frac);
      if (frac < 1) replayRef.current = requestAnimationFrame(tick);
    };
    replayRef.current = requestAnimationFrame(tick);
    return () => { if (replayRef.current) cancelAnimationFrame(replayRef.current); };
  }, [result, idealResampled, path.length]);

  const playerResampled = useMemo(() => (path.length > 1 ? resamplePath(path, 24) : null), [path]);
  const playerD = smoothPathD(path);

  // Skater positions at time t along each path (helper shared at top of file).
  const playerSkater = result && playerResampled ? ptAt(playerResampled, replayT) : null;
  const idealSkater = result && idealResampled ? ptAt(idealResampled, replayT) : null;

  const resultColor = !result ? "#5BA4E8"
    : result.state === "ok" ? "#22c55e"
    : result.state === "partial" ? "#eab308"
    : "#ef4444";

  return (
    <div>
      <p style={questionTextStyle}>{question.q}</p>
      <p style={hintTextStyle}>Click and drag from the starting player to the open ice.</p>
      <div style={rinkFrameStyle}>
        <IceIQRink {...(question.rink || {})} />
        <svg ref={svgRef} viewBox={getViewBox(question.rink?.view)} preserveAspectRatio="none"
          style={{ ...overlaySvgStyle(!result), cursor: result ? "default" : "crosshair" }}
          onMouseDown={onDown} onTouchStart={onDown}>
          {/* Start anchor — the player icon draws from here. */}
          <circle cx={start.x} cy={start.y} r={start.radius}
            fill={result ? "rgba(91,164,232,0.08)" : "rgba(91,164,232,0.16)"}
            stroke="#5BA4E8" strokeWidth="1.2" strokeDasharray={result ? "3 3" : "5 3"} opacity={result ? 0.5 : 1}/>
          {/* Target — only show the ghost zone while drawing; replay shows skater. */}
          {target && !result && (
            <g>
              <circle cx={target.x} cy={target.y} r={target.radius}
                fill="rgba(34,197,94,0.14)" stroke="#22c55e" strokeWidth="1.4" strokeDasharray="4 2.5" />
              <text x={target.x} y={target.y + 3} textAnchor="middle" fill="#86EFAC" fontSize="10" fontWeight="600">target</text>
            </g>
          )}
          {/* Ideal-path ghost line (only visible after submission and only
              when the question provides one). */}
          {result && idealD && (
            <path d={idealD} fill="none" stroke="#22c55e" strokeWidth="2.5"
              strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round" opacity="0.75"/>
          )}
          {/* Player's drawn path — smoothed. */}
          {playerD && (
            <path d={playerD} fill="none" stroke={resultColor} strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round"
              opacity={result ? 0.85 : 1}/>
          )}
          {/* Replay skaters — two icons moving in sync along both paths. */}
          {result && playerSkater && (
            <g style={{pointerEvents:"none"}}>
              <circle cx={playerSkater.x} cy={playerSkater.y} r="10" fill={resultColor} stroke="#0b1220" strokeWidth="2"/>
              <text x={playerSkater.x} y={playerSkater.y + 3} textAnchor="middle" fontSize="11">⛸️</text>
            </g>
          )}
          {result && idealSkater && idealD && (
            <g style={{pointerEvents:"none"}}>
              <circle cx={idealSkater.x} cy={idealSkater.y} r="10" fill="#22c55e" stroke="#0b1220" strokeWidth="2"/>
              <text x={idealSkater.x} y={idealSkater.y + 3} textAnchor="middle" fontSize="11">✓</text>
            </g>
          )}
        </svg>
      </div>
      {result && (
        <>
          {/* Legend for the replay — only shown when we actually have two
              paths comparing side by side. */}
          {idealD && (
            <div style={{display:"flex",gap:".85rem",padding:".5rem .25rem",fontSize:11,color:"#94a3b8",justifyContent:"center"}}>
              <span><span style={{color:resultColor,fontWeight:800}}>●</span> your route</span>
              <span><span style={{color:"#22c55e",fontWeight:800}}>● ✓</span> ideal</span>
            </div>
          )}
          <Feedback state={result.state} message={result.msg} />
          <div style={actionRowStyle()}>
            <button onClick={reset} style={secondaryBtnStyle}>Try again</button>
          </div>
        </>
      )}
    </div>
  );
}

function LaneSelect({ question, onAnswer, onReset }) {
  const lanes = Array.isArray(question.lanes) ? question.lanes : [];
  const [picked, setPicked] = useState(null);
  const done = picked !== null;
  const t = useReplayT(done, 1200);

  const reset = () => { setPicked(null); onReset?.(); };
  const handle = (lane, i) => {
    if (done) return;
    setPicked(i);
    // Support both the `clear` boolean convention and the newer `correct`.
    const ok = !!(lane.clear || lane.correct);
    onAnswer?.(ok);
  };

  const pickedLane = picked !== null ? lanes[picked] : null;
  // Support both old (x1,y1,x2,y2) and new (from:{x,y}, to:{x,y}) shapes.
  function laneEnds(l) {
    if (!l) return { x1: 0, y1: 0, x2: 0, y2: 0 };
    const x1 = toFiniteNumber(l.x1 ?? l.from?.x, 0);
    const y1 = toFiniteNumber(l.y1 ?? l.from?.y, 0);
    const x2 = toFiniteNumber(l.x2 ?? l.to?.x, 0);
    const y2 = toFiniteNumber(l.y2 ?? l.to?.y, 0);
    return { x1, y1, x2, y2 };
  }

  // For a wrong pick — if any other lane is explicitly `clear` or `correct`,
  // show the ideal puck traveling that route too.
  const idealLane = done && pickedLane && !(pickedLane.clear || pickedLane.correct)
    ? lanes.find(l => l.clear || l.correct)
    : null;

  // Intercept effect for wrong passes: puck stops halfway and a defender
  // "appears" to show where it got picked off.
  const interceptFrac = done && pickedLane && !(pickedLane.clear || pickedLane.correct) ? 0.55 : 1;

  // Puck position at time t along the chosen lane.
  let puckPos = null;
  if (pickedLane) {
    const { x1, y1, x2, y2 } = laneEnds(pickedLane);
    const stopT = Math.min(t, interceptFrac);
    puckPos = { x: x1 + (x2 - x1) * stopT, y: y1 + (y2 - y1) * stopT };
  }
  let idealPuckPos = null;
  if (idealLane) {
    const { x1, y1, x2, y2 } = laneEnds(idealLane);
    idealPuckPos = { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
  }

  return (
    <div>
      <p style={questionTextStyle}>{question.q}</p>
      <p style={hintTextStyle}>Tap the lane with no defender in it.</p>
      <div style={rinkFrameStyle}>
        <IceIQRink {...(question.rink || {})} />
        <svg viewBox={getViewBox(question.rink?.view)} preserveAspectRatio="none"
          style={overlaySvgStyle(!done)}>
          {lanes.map((l, i) => {
            const isPicked = picked === i;
            const ok = !!(l.clear || l.correct);
            const { x1, y1, x2, y2 } = laneEnds(l);
            let stroke = "#5BA4E8", opacity = 0.28;
            if (done && isPicked) { stroke = ok ? "#22c55e" : "#ef4444"; opacity = 0.7; }
            else if (done && ok) { stroke = "#22c55e"; opacity = 0.45; }
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={stroke} strokeWidth="18" strokeLinecap="round" strokeOpacity={opacity}
                style={{ cursor: done ? "default" : "pointer" }}
                onClick={() => handle(l, i)} />
            );
          })}
          {/* Puck traveling along the chosen lane. */}
          {done && puckPos && (
            <g transform={`translate(${puckPos.x},${puckPos.y})`} style={{pointerEvents:"none"}}>
              <ellipse cx="0" cy="1" rx="9" ry="3.5"
                fill={pickedLane?.clear || pickedLane?.correct ? "#22c55e" : "#ef4444"}
                stroke="#fff" strokeWidth="1.2"/>
            </g>
          )}
          {/* Intercept marker — the defender that picked it off. */}
          {done && pickedLane && !(pickedLane.clear || pickedLane.correct) && t >= interceptFrac - 0.01 && puckPos && (
            <g transform={`translate(${puckPos.x},${puckPos.y})`} style={{pointerEvents:"none"}}>
              <circle cx="0" cy="0" r="14" fill="none" stroke="#ef4444" strokeWidth="2">
                <animate attributeName="r" values="14;22;14" dur="1.2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite"/>
              </circle>
              <text x="0" y="-18" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ef4444">intercepted</text>
            </g>
          )}
          {/* Ideal puck — what the right pass would have looked like. */}
          {done && idealPuckPos && (
            <g transform={`translate(${idealPuckPos.x},${idealPuckPos.y})`} style={{pointerEvents:"none"}}>
              <ellipse cx="0" cy="1" rx="9" ry="3.5" fill="#22c55e" stroke="#fff" strokeWidth="1.2" opacity="0.85"/>
            </g>
          )}
        </svg>
      </div>
      {done && pickedLane && (
        <>
          {idealLane && (
            <div style={{display:"flex",gap:".85rem",padding:".5rem .25rem",fontSize:11,color:"#94a3b8",justifyContent:"center"}}>
              <span><span style={{color:"#ef4444",fontWeight:800}}>●</span> your pass</span>
              <span><span style={{color:"#22c55e",fontWeight:800}}>●</span> the clean lane</span>
            </div>
          )}
          <Feedback state={pickedLane.clear || pickedLane.correct ? "ok" : "no"} message={pickedLane.msg || question.tip} />
          <div style={actionRowStyle()}>
            <button onClick={reset} style={secondaryBtnStyle}>Try again</button>
          </div>
        </>
      )}
    </div>
  );
}

// POV-pick: player sees a first-person scene and taps the correct target on
// the ice (open lane, open net side, screened shooter, etc.). q.pov is the
// camera/role config; q.targets[] are world-space hit zones. Each target has
// `correct: bool` plus optional `msg`. The first tap locks the answer.
function POVPick({ question, onAnswer, onReset }) {
  const targets = Array.isArray(question.targets) ? question.targets : [];
  const [picked, setPicked] = useState(null); // index
  const done = picked !== null;

  const reset = () => { setPicked(null); onReset?.(); };
  const handle = (target, i) => {
    if (done) return;
    setPicked(i);
    onAnswer?.(!!target.correct);
  };

  const pickedTarget = picked !== null ? targets[picked] : null;
  const correctTarget = targets.find(t => t?.correct);
  const povProps = question.pov && typeof question.pov === "object" ? question.pov : {};
  const wrongAndHasCorrect = done && pickedTarget && !pickedTarget.correct && correctTarget;

  return (
    <div>
      <p style={questionTextStyle}>{question.q}</p>
      <p style={hintTextStyle}>Tap what you see from the player's perspective.</p>
      <div style={{ ...rinkFrameStyle, marginBottom: "0.75rem" }}>
        <IceIQPOVRink
          camera={povProps.camera}
          povRole={povProps.povRole || "skater"}
          markers={povProps.markers}
          targets={targets.map((t, i) => {
            const id = t.id || `t${i}`;
            const isCorrect = t.correct;
            const isPicked = picked === i;
            // Tint targets post-submission so the right answer is visible
            // in the POV scene even if the renderer draws them as dots.
            const tint = !done ? null
              : isCorrect ? "#22c55e"
              : isPicked ? "#ef4444"
              : null;
            return { ...t, id, ...(tint ? { tint, highlight: isCorrect && done } : {}) };
          })}
          showPrompt={povProps.prompt}
          onTargetClick={done ? null : (t) => {
            const idx = targets.findIndex(x => (x.id || `t${targets.indexOf(x)}`) === t.id);
            if (idx >= 0) handle(targets[idx], idx);
          }}
        />
      </div>
      {done && pickedTarget && (
        <>
          <Feedback state={pickedTarget.correct ? "ok" : "no"} message={pickedTarget.msg || question.tip} />
          {/* On a wrong pick, surface the correct target's msg (if any)
              as a secondary "the right read was:" explanation. */}
          {wrongAndHasCorrect && correctTarget.msg && correctTarget.msg !== pickedTarget.msg && (
            <div style={{
              marginTop: "0.6rem", padding: "0.7rem 0.9rem",
              background: "rgba(34,197,94,0.08)", border: `1px solid rgba(34,197,94,0.3)`,
              borderRadius: 10, fontSize: 12.5, color: "#86EFAC", fontFamily: FONT.body, lineHeight: 1.55,
            }}>
              <b style={{color:"#22c55e"}}>The right read:</b> {correctTarget.msg}
            </div>
          )}
          <div style={actionRowStyle()}>
            <button onClick={reset} style={secondaryBtnStyle}>Try again</button>
          </div>
        </>
      )}
    </div>
  );
}

// POV-mc: first-person scene above multiple-choice options. Use when the
// decision is verbal ("what should you do?") but the read is positional.
function POVMC({ question, onAnswer }) {
  const povProps = question.pov && typeof question.pov === "object" ? question.pov : {};

  return (
    <div>
      <p style={{ ...questionTextStyle, marginBottom: "0.9rem" }}>{question.q}</p>
      <div style={{ ...rinkFrameStyle, marginBottom: "0.9rem" }}>
        <IceIQPOVRink
          camera={povProps.camera}
          povRole={povProps.povRole || "skater"}
          markers={povProps.markers}
          showPrompt={povProps.prompt}
        />
      </div>
      <MCChoiceList question={question} onAnswer={onAnswer} />
    </div>
  );
}

function HotSpots({ question, onAnswer, onReset }) {
  const spots = Array.isArray(question.spots) ? question.spots : [];
  const [picked, setPicked] = useState(null);
  const done = picked !== null;

  const reset = () => { setPicked(null); onReset?.(); };
  const handle = (spot, i) => {
    if (done) return;
    setPicked(i);
    onAnswer?.(!!spot.correct);
  };

  const pickedSpot = picked !== null ? spots[picked] : null;

  return (
    <div>
      <p style={questionTextStyle}>{question.q}</p>
      <p style={hintTextStyle}>Tap the best position.</p>
      <div style={rinkFrameStyle}>
        <IceIQRink {...(question.rink || {})} />
        <svg viewBox={getViewBox(question.rink?.view)} preserveAspectRatio="none"
          style={overlaySvgStyle(!done)}>
          {spots.map((s, i) => {
            const isPicked = picked === i;
            // After a wrong pick, surface EVERY correct spot so the player
            // sees the options they missed. A right pick still lights up
            // green; the unpicked-correct spots get a yellow "also here"
            // treatment so it doesn't look like they only had one answer.
            const isUnpickedCorrect = done && !isPicked && s.correct;
            let stroke = "#5BA4E8", fill = "none", dash = "4 2.5";
            if (done && isPicked) {
              stroke = s.correct ? "#22c55e" : "#ef4444";
              fill = s.correct ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)";
              dash = "none";
            } else if (isUnpickedCorrect) {
              stroke = "#eab308"; fill = "rgba(234,179,8,0.15)"; dash = "3 2";
            }
            return (
              <g key={i} transform={`translate(${toFiniteNumber(s.x, 0)},${toFiniteNumber(s.y, 0)})`}
                style={{ cursor: done ? "default" : "pointer" }}
                onClick={() => handle(s, i)}>
                {done && isPicked && s.correct && (
                  <circle cx="0" cy="0" r="22" fill="none" stroke="#22c55e" strokeWidth="2">
                    <animate attributeName="r" values="18;30;18" dur="1.4s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.9;0;0.9" dur="1.4s" repeatCount="indefinite"/>
                  </circle>
                )}
                {isUnpickedCorrect && (
                  <circle cx="0" cy="0" r="22" fill="none" stroke="#eab308" strokeWidth="2" strokeDasharray="3 2">
                    <animate attributeName="r" values="18;26;18" dur="1.2s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="1;0.35;1" dur="1.2s" repeatCount="indefinite"/>
                  </circle>
                )}
                <circle cx="0" cy="0" r="15" fill={fill} stroke={stroke} strokeWidth="1.8" strokeDasharray={dash} />
                <circle cx="0" cy="0" r="5" fill={isUnpickedCorrect ? "#eab308" : "#5BA4E8"} opacity="0.65" />
                {isUnpickedCorrect && (
                  <text x="0" y="-20" textAnchor="middle" fontSize="9" fontWeight="800" fill="#eab308">also here</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {done && pickedSpot && (
        <>
          <Feedback state={pickedSpot.correct ? "ok" : "no"} message={pickedSpot.msg || question.tip} />
          <div style={actionRowStyle()}>
            <button onClick={reset} style={secondaryBtnStyle}>Try again</button>
          </div>
        </>
      )}
    </div>
  );
}
