import { useState, useRef, useEffect, useCallback, Component } from "react";
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
  const [puckPos, setPuckPos] = useState(startPos);
  const [verdict, setVerdict] = useState(null);
  const [feedback, setFeedback] = useState("");
  const dragRef = useRef({ dragging: false, offset: { x: 0, y: 0 }, last: startPos });

  const reset = () => {
    setPuckPos(startPos);
    setVerdict(null);
    setFeedback("");
    dragRef.current.last = startPos;
    onReset?.();
  };

  const onDown = (e) => {
    if (verdict) return;
    const p = svgPoint(e);
    dragRef.current.dragging = true;
    dragRef.current.offset = { x: p.x - puckPos.x, y: p.y - puckPos.y };
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

  return (
    <div>
      <p style={questionTextStyle}>{question.q}</p>
      <p style={hintTextStyle}>Drag the red puck to where it should go.</p>
      <div style={rinkFrameStyle}>
        <IceIQRink {...(question.rink || {})} />
        <svg ref={svgRef} viewBox={getViewBox(question.rink?.view)} preserveAspectRatio="none"
          style={overlaySvgStyle(!verdict)}>
          {targets.map((t, i) => (
            <g key={i}>
              <circle cx={toFiniteNumber(t.x, 300)} cy={toFiniteNumber(t.y, 150)}
                r={toFiniteNumber(t.radius, 30)}
                fill="rgba(34,197,94,0.14)" stroke="#22c55e"
                strokeWidth="1.4" strokeDasharray="4 2.5" />
              {t.label && (
                <text x={toFiniteNumber(t.x, 300)} y={toFiniteNumber(t.y, 150) + 4}
                  textAnchor="middle" fill="#86EFAC" fontSize="11" fontWeight="600">
                  {t.label}
                </text>
              )}
            </g>
          ))}
          <g transform={`translate(${puckPos.x},${puckPos.y})`}
            style={{ cursor: verdict ? "default" : "grab" }}
            onMouseDown={onDown} onTouchStart={onDown}>
            <ellipse cx="0" cy="1" rx="10" ry="3.5" fill="#ef4444" stroke="#fff" strokeWidth="1.2" />
          </g>
        </svg>
      </div>
      {verdict && (
        <>
          <Feedback state={verdict === "best" ? "ok" : verdict === "okay" ? "partial" : "no"} message={feedback} />
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
            let fill = "rgba(91,164,232,0.14)";
            let stroke = "#5BA4E8";
            let sw = 1.2;
            if (done && isPicked) {
              fill = z.correct ? "rgba(34,197,94,0.28)" : "rgba(239,68,68,0.28)";
              stroke = z.correct ? "#22c55e" : "#ef4444";
              sw = 2;
            }
            if (z.shape === "circle") {
              return (
                <circle key={i} cx={toFiniteNumber(z.x, 0)} cy={toFiniteNumber(z.y, 0)}
                  r={toFiniteNumber(z.radius, 30)}
                  fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray="4 2.5"
                  style={{ cursor: done ? "default" : "pointer" }}
                  onClick={() => handle(z, i)} />
              );
            }
            if (Array.isArray(z.points)) {
              const pts = z.points.map(p => `${toFiniteNumber(p.x, 0)},${toFiniteNumber(p.y, 0)}`).join(" ");
              return (
                <polygon key={i} points={pts}
                  fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray="4 2.5"
                  style={{ cursor: done ? "default" : "pointer" }}
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
                <circle cx="0" cy="0" r="18"
                  fill={sel ? "rgba(91,164,232,0.2)" : "none"}
                  stroke={ringColor} strokeWidth="1.8"
                  strokeDasharray={ringDash} opacity={ringOp} />
                <circle cx="0" cy="0" r="11" fill={fills[m.type] || "#185FA5"} stroke="#fff" strokeWidth="1.5" />
                <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600">
                  {m.label || labels[m.type] || ""}
                </text>
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

  return (
    <div>
      <p style={questionTextStyle}>{question.q}</p>
      <p style={hintTextStyle}>Tap the markers in the correct order, 1 → {markers.length}.</p>
      <div style={rinkFrameStyle}>
        <IceIQRink {...(question.rink || {})} />
        <svg viewBox={getViewBox(question.rink?.view)} preserveAspectRatio="none"
          style={overlaySvgStyle(!done)}>
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
              </g>
            );
          })}
        </svg>
      </div>
      {done && (
        <>
          <Feedback state={correct ? "ok" : "no"} message={question.tip} />
          <div style={actionRowStyle()}>
            <button onClick={reset} style={secondaryBtnStyle}>Try again</button>
          </div>
        </>
      )}
    </div>
  );
}

function PathDraw({ question, onAnswer, onReset }) {
  const svgRef = useRef(null);
  const svgPoint = useSVGPoint(svgRef);
  const [path, setPath] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [result, setResult] = useState(null);

  const start = question.start && typeof question.start === "object"
    ? { x: toFiniteNumber(question.start.x, 300), y: toFiniteNumber(question.start.y, 150), radius: toFiniteNumber(question.start.radius, 30) }
    : { x: 300, y: 150, radius: 30 };
  const target = question.target && typeof question.target === "object"
    ? { x: toFiniteNumber(question.target.x, 500), y: toFiniteNumber(question.target.y, 200), radius: toFiniteNumber(question.target.radius, 35) }
    : null;
  const avoid = Array.isArray(question.avoid) ? question.avoid.map(a => ({
    x: toFiniteNumber(a.x, 0), y: toFiniteNumber(a.y, 0), radius: toFiniteNumber(a.radius, 14)
  })) : [];

  const reset = () => { setPath([]); setDrawing(false); setResult(null); onReset?.(); };

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
        const nearTarget = target ? Math.hypot(end.x - target.x, end.y - target.y) < target.radius : true;
        const hitAvoid = avoid.some(a => prev.some(pt => Math.hypot(pt.x - a.x, pt.y - a.y) < a.radius));
        if (nearTarget && !hitAvoid) {
          setResult({ state: "ok", msg: question.tip || "Nice route." });
          onAnswer?.(true);
        } else if (hitAvoid) {
          setResult({ state: "no", msg: "Your path crossed a defender. Try curling around the traffic. " + (question.tip || "") });
          onAnswer?.(false);
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
  }, [drawing, svgPoint, onAnswer, target, avoid, question.tip]);

  const pathD = path.length > 0 ? path.map((pt, i) => (i === 0 ? "M" : "L") + ` ${pt.x} ${pt.y}`).join(" ") : "";

  return (
    <div>
      <p style={questionTextStyle}>{question.q}</p>
      <p style={hintTextStyle}>Click and drag from the starting player to the open ice.</p>
      <div style={rinkFrameStyle}>
        <IceIQRink {...(question.rink || {})} />
        <svg ref={svgRef} viewBox={getViewBox(question.rink?.view)} preserveAspectRatio="none"
          style={{ ...overlaySvgStyle(!result), cursor: result ? "default" : "crosshair" }}
          onMouseDown={onDown} onTouchStart={onDown}>
          {target && (
            <g>
              <circle cx={target.x} cy={target.y} r={target.radius}
                fill="rgba(34,197,94,0.14)" stroke="#22c55e" strokeWidth="1.4" strokeDasharray="4 2.5" />
              <text x={target.x} y={target.y + 3} textAnchor="middle" fill="#86EFAC" fontSize="10" fontWeight="600">target</text>
            </g>
          )}
          {pathD && (
            <path d={pathD} fill="none"
              stroke={result ? (result.state === "ok" ? "#22c55e" : "#ef4444") : "#5BA4E8"}
              strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </div>
      {result && (
        <>
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

  const reset = () => { setPicked(null); onReset?.(); };
  const handle = (lane, i) => {
    if (done) return;
    setPicked(i);
    onAnswer?.(!!lane.clear);
  };

  const pickedLane = picked !== null ? lanes[picked] : null;

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
            let stroke = "#5BA4E8", opacity = 0.28;
            if (done && isPicked) { stroke = l.clear ? "#22c55e" : "#ef4444"; opacity = 0.6; }
            return (
              <line key={i}
                x1={toFiniteNumber(l.x1, 0)} y1={toFiniteNumber(l.y1, 0)}
                x2={toFiniteNumber(l.x2, 0)} y2={toFiniteNumber(l.y2, 0)}
                stroke={stroke} strokeWidth="18" strokeLinecap="round" strokeOpacity={opacity}
                style={{ cursor: done ? "default" : "pointer" }}
                onClick={() => handle(l, i)} />
            );
          })}
        </svg>
      </div>
      {done && pickedLane && (
        <>
          <Feedback state={pickedLane.clear ? "ok" : "no"} message={pickedLane.msg || question.tip} />
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
  const povProps = question.pov && typeof question.pov === "object" ? question.pov : {};

  return (
    <div>
      <p style={questionTextStyle}>{question.q}</p>
      <p style={hintTextStyle}>Tap what you see from the player's perspective.</p>
      <div style={{ ...rinkFrameStyle, marginBottom: "0.75rem" }}>
        <IceIQPOVRink
          camera={povProps.camera}
          povRole={povProps.povRole || "skater"}
          markers={povProps.markers}
          targets={targets.map((t, i) => ({ ...t, id: t.id || `t${i}` }))}
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
            let stroke = "#5BA4E8", fill = "none", dash = "4 2.5";
            if (done && isPicked) {
              stroke = s.correct ? "#22c55e" : "#ef4444";
              fill = s.correct ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)";
              dash = "none";
            }
            return (
              <g key={i} transform={`translate(${toFiniteNumber(s.x, 0)},${toFiniteNumber(s.y, 0)})`}
                style={{ cursor: done ? "default" : "pointer" }}
                onClick={() => handle(s, i)}>
                <circle cx="0" cy="0" r="15" fill={fill} stroke={stroke} strokeWidth="1.8" strokeDasharray={dash} />
                <circle cx="0" cy="0" r="5" fill="#5BA4E8" opacity="0.55" />
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
