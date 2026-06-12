// Shared engine for the Cognitive Gym drills.
// Adaptive difficulty, level->parameter helpers, and canvas/rink utilities.
// No drill-specific logic lives here.

// Adaptive level controller.
// `upStreak` consecutive successes raise the level; `downStreak` consecutive
// failures lower it. Levels are clamped to [1, maxLevel].
export function createAdaptiveLevel(startLevel = 1, opts = {}) {
  const { maxLevel = 20, upStreak = 3, downStreak = 2 } = opts;
  let level = Math.min(Math.max(startLevel, 1), maxLevel);
  let ups = 0;
  let downs = 0;
  return {
    get level() {
      return level;
    },
    record(success) {
      if (success) {
        ups += 1;
        downs = 0;
        if (ups >= upStreak && level < maxLevel) {
          level += 1;
          ups = 0;
        }
      } else {
        downs += 1;
        ups = 0;
        if (downs >= downStreak && level > 1) {
          level -= 1;
          downs = 0;
        }
      }
      return level;
    },
    reset(to = 1) {
      level = Math.min(Math.max(to, 1), maxLevel);
      ups = 0;
      downs = 0;
    },
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
export function setupCanvas(canvas, host, aspect = 0.62) {
  const dpr = window.devicePixelRatio || 1;
  const W = host.clientWidth;
  const H = Math.round(W * aspect);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, W, H };
}

// Draw the stylized rink backdrop (ice, blue lines, red center line and circle,
// faceoff dots, boards).
export function drawRink(ctx, W, H) {
  ctx.fillStyle = "#f4f9fc";
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#1b6cb0";
  ctx.fillRect(W * 0.36 - 2, 0, 4, H);
  ctx.fillRect(W * 0.64 - 2, 0, 4, H);
  ctx.fillStyle = "#c8102e";
  ctx.fillRect(W * 0.5 - 1.5, 0, 3, H);
  ctx.strokeStyle = "#c8102e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(W * 0.5, H * 0.5, Math.min(W, H) * 0.16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#c8102e";
  [
    [0.2, 0.28],
    [0.2, 0.72],
    [0.8, 0.28],
    [0.8, 0.72],
  ].forEach(([fx, fy]) => {
    ctx.beginPath();
    ctx.arc(W * fx, H * fy, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  ctx.strokeStyle = "#9db8c9";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);
}

// Pointer position relative to a canvas, handling both mouse and touch events.
export function pointerPos(evt, canvas) {
  const rect = canvas.getBoundingClientRect();
  const p = evt.touches && evt.touches.length ? evt.touches[0] : evt;
  return { x: p.clientX - rect.left, y: p.clientY - rect.top };
}
