// Presentation only. Canonical metres, facing 0 = +x. Source time and movement
// remain authoritative; this module cannot move a player, puck or decision.
const TAU = Math.PI * 2;
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const unit = value => clamp(finite(value), -1, 1);
const angle = value => Math.atan2(Math.sin(finite(value)), Math.cos(finite(value)));
const smooth = value => value * value * (3 - 2 * value);

/**
 * actor.motion may carry mode ('skate', 'glide', 'ready'), cycleRate in Hz,
 * phaseOffset in radians and local turn/lean (-1..1), lookYaw (radians).
 * action.phases is an ordered, non-overlapping array of {name,start,end,turn,
 * lean,lookYaw}; start/end use absolute source seconds. Each phase eases from
 * the previous target to its own target. Gaps and final phases hold the pose.
 * Missing traces conservatively glide. This is not a biomechanical solver.
 * previousActor/delta intentionally do not drive pose: render history must not
 * change a paused/seeked sample. Authors provide velocity/cadence in source data.
 */
export function samplePlayerMotion({ actor = {}, time = 0 } = {}) {
  actor = actor || {};
  const motion = actor.motion || {};
  const now = finite(time);
  const vx = finite(actor.vx), vy = finite(actor.vy), facing = finite(actor.facing);
  const speed = Math.hypot(vx, vy);
  const longitudinal = vx * Math.cos(facing) + vy * Math.sin(facing);
  const transverse = -vx * Math.sin(facing) + vy * Math.cos(facing);
  const moving = speed > .05;
  const skating = ['skate', 'forward', 'backward', 'lateral'].includes(motion.mode);
  const direction = Math.abs(transverse) > Math.abs(longitudinal) ? 'lateral' : longitudinal < 0 ? 'backward' : 'forward';
  const mode = !moving || motion.mode === 'ready' ? 'ready' : skating ? direction : 'glide';
  const stride = skating && mode !== 'ready' ? clamp(speed / 5.5, 0, 1) : 0;
  // Fixed cadence avoids absolute-time * changing-speed jumps. For variable
  // cadence a source may author phaseOffset per sample, never integrate in UI.
  const rate = clamp(finite(motion.cycleRate, 1.2), .1, 4);
  const phase = stride ? ((now * rate * TAU + finite(motion.phaseOffset)) % TAU + TAU) % TAU : 0;
  const pose = { mode, phase, stride, backward: mode === 'backward',
    lateral: mode === 'lateral' ? Math.sign(transverse) : 0,
    turn: unit(motion.turn), lean: unit(motion.lean), lookYaw: angle(motion.lookYaw), action: null };
  const action = motion.action;
  if (!action || !Array.isArray(action.phases)) return pose;
  let previousEnd = -Infinity;
  for (const part of action.phases) {
    if (!part || !Number.isFinite(part.start) || !Number.isFinite(part.end) || part.end <= part.start || part.start < previousEnd) continue;
    previousEnd = part.end;
    if (now < part.start) break;
    const progress = clamp((now - part.start) / (part.end - part.start), 0, 1);
    const blend = smooth(progress);
    for (const field of ['turn', 'lean', 'lookYaw']) {
      if (!Number.isFinite(part[field])) continue;
      const target = field === 'lookYaw' ? angle(part[field]) : unit(part[field]);
      const difference = field === 'lookYaw' ? angle(target - pose[field]) : target - pose[field];
      pose[field] += difference * blend;
      if (field === 'lookYaw') pose[field] = angle(pose[field]);
    }
    pose.action = { type: typeof action.type === 'string' ? action.type : 'authored', phase: part.name || 'action', progress };
    if (progress < 1) break;
  }
  return pose;
}
