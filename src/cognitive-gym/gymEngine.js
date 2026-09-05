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
    onResult = null,
    onChange = null,
  } = opts;
  let level = Math.min(Math.max(startLevel, 1), maxLevel);
  let ups = Math.min(Math.max(startUps, 0), upStreak - 1);
  let downs = Math.min(Math.max(startDowns, 0), downStreak - 1);
  // In-session combo: consecutive successes, reset only by a miss (a level-up
  // does NOT reset it, unlike `ups`). Arcade-style; display + audio only.
  let combo = 0;
  let bestCombo = 0;
  return {
    get level() { return level; },
    get ups() { return ups; },
    get downs() { return downs; },
    get combo() { return combo; },
    get bestCombo() { return bestCombo; },
    // consecutive same-result reps still needed to promote / relegate
    get toPromote() { return Math.max(1, upStreak - ups); },
    get toRelegate() { return Math.max(1, downStreak - downs); },
    record(success) {
      if (success) { combo += 1; if (combo > bestCombo) bestCombo = combo; }
      else combo = 0;
      if (onResult) { try { onResult(success, combo); } catch { /* cue failure never breaks a rep */ } }
      if (success) {
        ups += 1;
        downs = 0;
        if (ups >= upStreak && level < maxLevel) {
          level += 1; ups = 0;
          if (onChange) { try { onChange(level, 1); } catch { /* ignore */ } }
        }
      } else {
        downs += 1;
        ups = 0;
        if (downs >= downStreak && level > 1) {
          level -= 1; downs = 0;
          if (onChange) { try { onChange(level, -1); } catch { /* ignore */ } }
        }
      }
      return level;
    },
    snapshot() { return { level, ups, downs }; },
    reset(to = 1) { level = Math.min(Math.max(to, 1), maxLevel); ups = 0; downs = 0; },
  };
}

// --- Session length ---------------------------------------------------------
// Reps in one gym session. Deliberately short: a session should be finishable
// in a couple of minutes so it gets played often, not once. Thomas, 2026-08-03:
// "why don't we do five reps on all of these games, for now, ten is a lot."
// Every drill imports this rather than carrying its own number, so the session
// length is one edit rather than twelve.
export const REPS_PER_SESSION = 5;

// --- Action Rail ------------------------------------------------------------
// Every drill puts the controls the player needs to progress in ONE fixed,
// centred band INSIDE the play surface, in the same place in every drill. The
// band is reserved: no drill may place a tap target in it, and moving targets
// bounce off this boundary rather than the canvas edge. Otherwise a control
// lands on top of something you have to tap, which is exactly the complaint
// behind S2-23 / S2-24 / S2-25 / S2-28. Keep in sync with --gym-rail-band in
// cognitive-gym.css.
export const GYM_RAIL_BAND = 0.14;
export const GYM_TARGET_MAX_Y = 1 - GYM_RAIL_BAND; // 0.86

// Largest y a tap target may occupy on a canvas of height H.
export function targetMaxY(H) {
  return H * GYM_TARGET_MAX_Y;
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

const rinkPaintCache = new WeakMap();

function rinkPaint(ctx, W, H, orientation) {
  // Recording contexts used by geometry exporters can omit cosmetic gradients.
  if (!ctx.createLinearGradient || !ctx.createRadialGradient) return { ice: '#eaf6fb', glow: 'transparent' };
  const key = `${Math.round(W)}x${Math.round(H)}:${orientation}`;
  const cached = rinkPaintCache.get(ctx);
  if (cached?.key === key) return cached;
  const gradient = orientation === "portrait"
    ? ctx.createLinearGradient(0, 0, W, H)
    : ctx.createLinearGradient(0, 0, W, H * 0.7);
  gradient.addColorStop(0, "#f9fdff");
  gradient.addColorStop(0.48, "#eaf6fb");
  gradient.addColorStop(1, "#d9edf6");
  const glow = ctx.createRadialGradient(W * 0.48, H * 0.24, 0, W * 0.48, H * 0.24, Math.max(W, H) * 0.52);
  glow.addColorStop(0, "rgba(255,255,255,0.8)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  const paints = { key, ice: gradient, glow };
  rinkPaintCache.set(ctx, paints);
  return paints;
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
// Board geometry, exported so generators can agree with what drawRink actually
// draws. A generator that samples the full rectangle will happily place a
// target — or an answer — in a corner that is outside the boards (S2-29).
export const BOARD_MARGIN = 2;
export const BOARD_CORNER_FRAC = 0.22;

export function boardCornerRadius(W, H) {
  return Math.min(W, H) * BOARD_CORNER_FRAC;
}

// Where the net sits when the whole canvas is ONE end zone, plus how much room
// around it a generator has to leave alone. Exported for the same reason
// BOARD_MARGIN is: a generator that samples the full rectangle will otherwise
// drop a skater — or an answer — inside the crease.
// The zone is 21.3 m deep (4 m behind the goal line + 17.3 m out to the blue
// line) by 30 m wide, per RINK_DIMENSIONS. Everything below is that geometry
// divided through, so the crease, net and faceoff dots are to scale instead of
// eyeballed: at 600x372 the depth axis lands within a couple of percent of the
// width axis in pixels per metre.
const ZONE_DEPTH_M = 21.3;
const ZONE_WIDTH_M = 30;
export const END_ZONE_GOAL_LINE_FRAC = 4 / ZONE_DEPTH_M;        // 0.188
const CREASE_R_FRAC = 1.8 / ZONE_WIDTH_M;                        // 1.8 m radius
const NET_MOUTH_FRAC = 1.83 / ZONE_WIDTH_M;
const NET_DEPTH_FRAC = 1.12 / ZONE_DEPTH_M;
const FACEOFF_R_FRAC = 4.5 / ZONE_WIDTH_M;
const FACEOFF_FROM_GOAL_LINE = (4 + 6) / ZONE_DEPTH_M;           // 0.469
const FACEOFF_FROM_CENTER = 7 / ZONE_WIDTH_M;                    // 0.233

export function endZoneNet(W, H, orientation = "portrait") {
  const portrait = orientation !== "landscape";
  const across = portrait ? W : H;
  const deep = portrait ? H : W;
  const r = across * CREASE_R_FRAC;
  // A skater standing on the net looks as wrong as one standing in the paint,
  // so the generator's keep-out covers the net's depth behind the goal line too.
  const keepOut = r + deep * NET_DEPTH_FRAC;
  return portrait
    ? { x: W * 0.5, y: H * END_ZONE_GOAL_LINE_FRAC, r, keepOut }
    : { x: W * END_ZONE_GOAL_LINE_FRAC, y: H * 0.5, r, keepOut };
}

// `zone: "end"` draws ONE end zone filling the canvas instead of the whole
// 200-foot sheet. Decision 1, docs/manual-playtest/2026-08-03-decisions-round3.md:
// Run the Play was scattering skaters across a full sheet, so a pass could span
// the rink and skaters sat on both sides of both blue lines with no puck
// established — every sequence was offside on paper, and the markers were tiny.
//
// There is deliberately NO blue line in this view. Its own boundary is the
// canvas edge, so no skater can be on the wrong side of one; and decision 2 of
// the same session bans showing a blue line to U7/U9 at all, who play cross-ice
// and half-ice. Omitting it satisfies both.
export function drawRink(ctx, W, H, { orientation = "landscape", zone = "full" } = {}) {
  const R = boardCornerRadius(W, H); // board corner radius
  const m = BOARD_MARGIN;
  const endZone = zone === "end";

  // ice — rounded on all four sides for a whole sheet, on three for a zone
  // (the fourth side is the blue line, where the ice keeps going).
  const icePath = endZone
    ? () => zonePath(ctx, W, H, R, m, orientation)
    : () => roundRectPath(ctx, m, m, W - 2 * m, H - 2 * m, R);

  icePath();
  const paints = rinkPaint(ctx, W, H, orientation);
  ctx.fillStyle = paints.ice;
  ctx.fill();

  // everything inside stays within the boards
  ctx.save();
  icePath();
  ctx.clip();

  // Low-contrast skate texture and overhead-light blooms make the shared 2D
  // surface feel like ice while preserving every drill's clue geometry. The
  // pattern is deterministic and uses no per-frame arrays or random numbers.
  ctx.save();
  ctx.globalAlpha = 0.075;
  ctx.strokeStyle = "#4b7790";
  ctx.lineWidth = 1;
  for (let i = 0; i < 11; i += 1) {
    const sx = ((i * 83) % 97) / 97 * W;
    const sy = ((i * 47) % 89) / 89 * H;
    ctx.beginPath();
    ctx.moveTo(sx - W * 0.04, sy - H * 0.015);
    ctx.quadraticCurveTo(sx, sy + H * 0.018, sx + W * 0.055, sy);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = paints.glow;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  if (endZone) {
    drawEndZoneMarkings(ctx, W, H, orientation);
    ctx.restore(); // unclip
    drawZoneBoards(ctx, W, H, R, m, orientation);
    return;
  }

  // blue lines + red centre line.
  //
  // ORIENTATION MATTERS AND IT WAS WRONG. These were always drawn vertically —
  // a landscape sheet, attacking left-to-right. But Late Read and Run the Play
  // lay their plays out along Y: YOU sits at the bottom and the receivers are
  // seeded above. So the zones ran PERPENDICULAR to the direction of play, and
  // "up ice" in the drill crossed no line the rink actually drew. That is why
  // nearly every Late Read trial rendered a receiver in a position that would
  // be offside if the lines meant anything.
  //
  // `orientation` lets a vertical-play drill draw a vertical sheet, so the
  // lines and the play finally agree. Landscape stays the default; the seven
  // drills that were already correct are untouched.
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = "#1b6cb0";
  if (orientation === "portrait") {
    ctx.fillRect(0, H * 0.33 - 2.5, W, 5);
    ctx.fillRect(0, H * 0.67 - 2.5, W, 5);
    ctx.fillStyle = "#c8102e";
    ctx.fillRect(0, H * 0.5 - 2, W, 4);
  } else {
    ctx.fillRect(W * 0.33 - 2.5, 0, 5, H);
    ctx.fillRect(W * 0.67 - 2.5, 0, 5, H);
    ctx.fillStyle = "#c8102e";
    ctx.fillRect(W * 0.5 - 2, 0, 4, H);
  }
  ctx.restore();

  // goal lines (thin red) near each end
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "#c8102e";
  ctx.lineWidth = 1.5;
  [0.08, 0.92].forEach((g) => {
    ctx.beginPath();
    if (orientation === "portrait") { ctx.moveTo(0, H * g); ctx.lineTo(W, H * g); }
    else { ctx.moveTo(W * g, 0); ctx.lineTo(W * g, H); }
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
  drawBoards(ctx, W, H, R, m);
}

// boards + a lighter glass line just inside them
function drawBoards(ctx, W, H, R, m) {
  ctx.save();
  ctx.shadowColor = "rgba(1, 12, 21, 0.34)";
  ctx.shadowBlur = 12;
  roundRectPath(ctx, m, m, W - 2 * m, H - 2 * m, R);
  ctx.strokeStyle = "#27485e";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.shadowBlur = 0;
  roundRectPath(ctx, m + 2.5, m + 2.5, W - 2 * m - 5, H - 2 * m - 5, Math.max(0, R - 2.5));
  ctx.strokeStyle = "rgba(190,231,247,0.78)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// A zone has boards on THREE sides. The fourth is the blue line — open ice,
// the rest of the rink continues past it — so it gets no boards and no rounded
// corners. Drawing a rounded board there (the first cut did) says the rink ends
// at centre ice, which is a different lie from the one this view came to fix.
function zonePath(ctx, W, H, R, m, orientation) {
  ctx.beginPath();
  if (orientation === "portrait") {      // open along the bottom
    ctx.moveTo(m, H);
    ctx.lineTo(m, m + R);
    ctx.arcTo(m, m, m + R, m, R);
    ctx.lineTo(W - m - R, m);
    ctx.arcTo(W - m, m, W - m, m + R, R);
    ctx.lineTo(W - m, H);
  } else {                               // open along the right
    ctx.moveTo(W, m);
    ctx.lineTo(m + R, m);
    ctx.arcTo(m, m, m, m + R, R);
    ctx.lineTo(m, H - m - R);
    ctx.arcTo(m, H - m, m + R, H - m, R);
    ctx.lineTo(W, H - m);
  }
}

function drawZoneBoards(ctx, W, H, R, m, orientation) {
  ctx.save();
  ctx.lineCap = "butt";
  zonePath(ctx, W, H, R, m, orientation);
  ctx.strokeStyle = "#6b8294";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

// One end zone, filling the canvas: goal line, crease + net, and the two
// end-zone faceoff circles. No blue line, no centre line, no centre circle, no
// second net — see the note on drawRink for why the blue line is absent on
// purpose rather than forgotten.
//
// Portrait attacks UP the screen (the puck enters from the bottom, which is
// where the zone's open edge is). Landscape attacks LEFT.
function drawEndZoneMarkings(ctx, W, H, orientation) {
  const portrait = orientation === "portrait";
  const g = END_ZONE_GOAL_LINE_FRAC;
  const net = endZoneNet(W, H, portrait ? "portrait" : "landscape");

  // goal line, running the full width of the zone
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "#c8102e";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (portrait) { ctx.moveTo(0, H * g); ctx.lineTo(W, H * g); }
  else { ctx.moveTo(W * g, 0); ctx.lineTo(W * g, H); }
  ctx.stroke();
  ctx.restore();

  // crease, opening away from the end boards
  ctx.fillStyle = "rgba(27,108,176,0.22)";
  ctx.strokeStyle = "#1b6cb0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (portrait) ctx.arc(net.x, net.y, net.r, 0, Math.PI);
  else ctx.arc(net.x, net.y, net.r, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  ctx.stroke();

  // the net itself, sitting on the goal line
  ctx.save();
  ctx.strokeStyle = "#c8102e";
  ctx.lineWidth = 2;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  const nw = (portrait ? W : H) * NET_MOUTH_FRAC;   // mouth, across the zone
  const nd = (portrait ? H : W) * NET_DEPTH_FRAC;   // depth, behind the goal line
  ctx.beginPath();
  if (portrait) ctx.rect(net.x - nw / 2, net.y - nd, nw, nd);
  else ctx.rect(net.x - nd, net.y - nw / 2, nd, nw);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // the zone's two faceoff circles, 6 m out from the goal line and 7 m off centre
  const circ = (portrait ? W : H) * FACEOFF_R_FRAC;
  const near = 0.5 - FACEOFF_FROM_CENTER, far = 0.5 + FACEOFF_FROM_CENTER;
  const spots = portrait
    ? [[near, FACEOFF_FROM_GOAL_LINE], [far, FACEOFF_FROM_GOAL_LINE]]
    : [[FACEOFF_FROM_GOAL_LINE, near], [FACEOFF_FROM_GOAL_LINE, far]];
  spots.forEach(([fx, fy]) => {
    ctx.strokeStyle = "#c8102e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(W * fx, H * fy, circ, 0, Math.PI * 2);
    ctx.stroke();
    faceoffDot(ctx, W * fx, H * fy);
  });
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
