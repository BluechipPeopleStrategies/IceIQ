// The shared deterministic playback clock, per Phase 3 Task 4 and
// framework-fit decision 1: "the same deterministic clock" must produce
// identical position/timing samples regardless of which consumer walks a
// CompiledTeachingPlay -- player preview, coach preview, or video export.
// Small, dependency-free, pure functions only: no wall-clock time, no
// randomness, no hidden state. Given the same artifact and the same query
// time, every consumer gets the same answer, always.

export const PLAYBACK_CLOCK_VERSION = "playback-clock-v1";

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

// Linear interpolation between the two samples straddling t, for one
// actor's position track. compiledPlay.samples is the flat, timestamped
// array a SimulationTrace already produces (see simulator.js's
// sampleAction) -- this just walks it deterministically.
export function sampleAt(compiledPlay, actorId, t) {
  const track = compiledPlay.samples.filter((s) => s.actorId === actorId).sort((a, b) => a.t - b.t);
  if (track.length === 0) return null;
  // Always a FRESH array, never a live reference into the shared, canonical
  // samples data -- a consumer that mutates its returned position in place
  // (a common in-place-offset pattern) would otherwise silently corrupt the
  // underlying SimulationTrace/CompiledTeachingPlay for every other
  // consumer, defeating the parity/determinism guarantee this clock exists
  // to provide. (Caught by Phase 3's adversarial review, 2026-07-31 --
  // these two clamp branches returned the stored array directly while the
  // interpolated branch below already built a fresh one.)
  if (t <= track[0].t) return [...track[0].pos];
  if (t >= track[track.length - 1].t) return [...track[track.length - 1].pos];

  for (let i = 1; i < track.length; i++) {
    if (t <= track[i].t) {
      const prev = track[i - 1];
      const cur = track[i];
      const span = cur.t - prev.t;
      const frac = span === 0 ? 0 : (t - prev.t) / span;
      return [
        round6(prev.pos[0] + (cur.pos[0] - prev.pos[0]) * frac),
        round6(prev.pos[1] + (cur.pos[1] - prev.pos[1]) * frac),
      ];
    }
  }
  return [...track[track.length - 1].pos]; // unreachable given the bounds checks above, kept as a safe fallback
}

// Every actor (and the puck, tracked as actorId "puck" in the trace's own
// samples per simulator.js's `actionKind` tagging) present in the compiled
// play at time t. Pure aggregation over sampleAt() -- no separate logic
// path, so this can never disagree with a per-actor query.
export function frameAt(compiledPlay, t) {
  const actorIds = [...new Set(compiledPlay.samples.map((s) => s.actorId))];
  const frame = {};
  for (const id of actorIds) frame[id] = sampleAt(compiledPlay, id, t);
  return Object.freeze(frame);
}

// The full list of "interesting" times a consumer should know about:
// event boundaries (question freezes, action start/end times) plus the
// compiled play's declared duration. A UI scrubber or an export renderer
// both want this same list, not two independently-derived ones.
export function eventTimes(compiledPlay) {
  const times = new Set([0]);
  for (const e of compiledPlay.eventTimes || []) times.add(e);
  if (Number.isFinite(compiledPlay.questionFreezeTime)) times.add(compiledPlay.questionFreezeTime);
  return [...times].sort((a, b) => a - b);
}
