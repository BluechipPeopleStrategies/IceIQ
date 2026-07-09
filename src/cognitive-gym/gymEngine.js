// Shared engine for the Cognitive Gym drills.
// Adaptive difficulty, level->parameter helpers, and canvas/rink utilities.
// No drill-specific logic lives here.

import { resolveBand } from "./gymBand.js";

// Adaptive level controller.
// `upStreak` consecutive successes raise the level; `downStreak` consecutive
// failures lower it. Levels are clamped to [1, maxLevel].
// Pass `startUps`/`startDowns` to seed a mid-streak from stored state.
export function createAdaptiveLevel(startLevel = 1, opts = {}) {
  const {
    maxLevel = 20,
    upStreak = 3,
    downStreak = 2,
    startUps = 0,
    startDowns = 0,
  } = opts;
  let level = Math.min(Math.max(startLevel, 1), maxLevel);
  let ups = Math.min(Math.max(startUps, 0), upStreak - 1);
  let downs = Math.min(Math.max(startDowns, 0), downStreak - 1);
  return {
    get level() { return level; },
    get ups() { return ups; },
    get downs() { return downs; },
    // consecutive same-result reps still needed to promote / relegate
    get toPromote() { return Math.max(1, upStreak - ups); },
    get toRelegate() { return Math.max(1, downStreak - downs); },
    record(success) {
      if (success) {
        ups += 1;
        downs = 0;
        if (ups >= upStreak && level < maxLevel) { level += 1; ups = 0; }
      } else {
        downs += 1;
        ups = 0;
        if (downs >= downStreak && level > 1) { level -= 1; downs = 0; }
      }
      return level;
    },
    snapshot() { return { level, ups, downs }; },
    reset(to = 1) { level = Math.min(Math.max(to, 1), maxLevel); ups = 0; downs = 0; },
  };
}

// Map a level (1..maxLevel) onto a 0..1 difficulty fraction.
export function levelT(level, maxLevel = 20) {
  return (Math.min(level, maxLevel) - 1) / (maxLevel - 1);
}

// Linear interpolation.
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Uniform random in [min, max).
export function rand(min, max) {
  return min + Math.random() * (max - min);
}

// Size a canvas for the device pixel ratio and return its 2d context plus the
// CSS pixel dimensions (W, H). `aspect` is height / width.
//
// The width is capped so the WHOLE rink stays on screen: never wider than
// MAX_W (so it doesn't balloon on a wide desktop) and never so tall that the
// rink runs past ~72% of the viewport height (leaving room for the top bar and
// hint). On phones the container width is the binding constraint, so behaviour
// there is unchanged.
const MAX_W = 760;
const VH_FRACTION = 0.72;
export function setupCanvas(canvas, host, aspect = 0.62) {
  const dpr = window.devicePixelRatio || 1;
  const vh = (typeof window !== "undefined" ? window.innerHeight : 800) * VH_FRACTION;
  const W = Math.max(0, Math.min(host.clientWidth, MAX_W, vh / aspect));
  const H = Math.round(W * aspect);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, W, H };
}

// Rounded-rectangle path (the boards' rounded corners).
function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function faceoffDot(ctx, x, y) {
  ctx.fillStyle = "#c8102e";
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}

// Draw a hockey-rink backdrop that reads like a real sheet: rounded boards with
// a glass line, two blue lines, the red center line + circle, four end-zone
// faceoff circles + dots, goal lines, and blue creases.
export function drawRink(ctx, W, H) {
  const R = Math.min(W, H) * 0.22; // board corner radius
  const m = 2;

  // ice
  roundRectPath(ctx, m, m, W - 2 * m, H - 2 * m, R);
  ctx.fillStyle = "#f4f9fc";
  ctx.fill();

  // everything inside stays within the rounded boards
  ctx.save();
  roundRectPath(ctx, m, m, W - 2 * m, H - 2 * m, R);
  ctx.clip();

  // blue lines + red center line
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = "#1b6cb0";
  ctx.fillRect(W * 0.33 - 2.5, 0, 5, H);
  ctx.fillRect(W * 0.67 - 2.5, 0, 5, H);
  ctx.fillStyle = "#c8102e";
  ctx.fillRect(W * 0.5 - 2, 0, 4, H);
  ctx.restore();

  // goal lines (thin red) near each end
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "#c8102e";
  ctx.lineWidth = 1.5;
  [0.08, 0.92].forEach((gx) => {
    ctx.beginPath();
    ctx.moveTo(W * gx, 0);
    ctx.lineTo(W * gx, H);
    ctx.stroke();
  });
  ctx.restore();

  // center circle + dot
  ctx.strokeStyle = "#1b6cb0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(W * 0.5, H * 0.5, Math.min(W, H) * 0.16, 0, Math.PI * 2);
  ctx.stroke();
  faceoffDot(ctx, W * 0.5, H * 0.5);

  // four end-zone faceoff circles + dots
  const circ = Math.min(W, H) * 0.12;
  [
    [0.2, 0.3],
    [0.2, 0.7],
    [0.8, 0.3],
    [0.8, 0.7],
  ].forEach(([fx, fy]) => {
    ctx.strokeStyle = "#c8102e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(W * fx, H * fy, circ, 0, Math.PI * 2);
    ctx.stroke();
    faceoffDot(ctx, W * fx, H * fy);
  });

  // blue goal creases at each end
  const crease = Math.min(W, H) * 0.09;
  ctx.fillStyle = "rgba(27,108,176,0.22)";
  ctx.strokeStyle = "#1b6cb0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(W * 0.08, H * 0.5, crease, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W * 0.92, H * 0.5, crease, Math.PI / 2, (Math.PI * 3) / 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore(); // unclip

  // boards + a lighter glass line just inside them
  roundRectPath(ctx, m, m, W - 2 * m, H - 2 * m, R);
  ctx.strokeStyle = "#6b8294";
  ctx.lineWidth = 3;
  ctx.stroke();
  roundRectPath(ctx, m + 2.5, m + 2.5, W - 2 * m - 5, H - 2 * m - 5, Math.max(0, R - 2.5));
  ctx.strokeStyle = "rgba(173,216,230,0.55)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// Pointer position relative to a canvas, handling both mouse and touch events.
export function pointerPos(evt, canvas) {
  const rect = canvas.getBoundingClientRect();
  const p = evt.touches && evt.touches.length ? evt.touches[0] : evt;
  return { x: p.clientX - rect.left, y: p.clientY - rect.top };
}

// Age-seeded starting level for a drill, so a kid begins near their real level
// instead of level 1. Accepts full division strings ("U11 / Atom") — resolution
// happens in gymBand.js. Unknown bands return 1 (no seed).
const BAND_SEED = { U7: 2, U9: 4, U11: 6, U13: 7, U15: 8, U18: 8 };
export function calibratedStartLevel(ageBand) {
  return BAND_SEED[resolveBand(ageBand)] || 1;
}

// The level a drill should start at given its stored record and the age band.
// Only seeds an untouched drill (no sessions yet); never lowers an existing level.
export function seededLevel(record, ageBand) {
  const cur = (record && record.level) || 1;
  const played = record && Array.isArray(record.sessions) && record.sessions.length > 0;
  if (played) return cur;
  return Math.max(cur, calibratedStartLevel(ageBand));
}
