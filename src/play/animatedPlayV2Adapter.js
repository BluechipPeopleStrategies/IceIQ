// Thin, OPTIONAL adapter: translates a CompiledTeachingPlay (RinkFrame
// metres, scenario-engine schema) into the legacy animated-play node shape
// (200x85 feet, pos/puck keyed by actor id) that AnimatedPlay.jsx already
// renders. Per Phase 3 Task 4 and the design spec: "the first implementation
// plan must either add an animated-play-v2 keyframe/duration contract... or
// make the renderer consume CompiledTeachingPlay directly" -- this file is
// the former, additive path. AnimatedPlay.jsx has ZERO diff this phase; a
// future phase decides whether/how to actually wire this in.
//
// Existing v1 catalog content is completely unaffected -- this module is
// never imported by anything that renders today.

import { frameAt, sampleAt } from "../scenario-engine/playbackClock.js";
import { rinkFrameToPlaySpace } from "../scenario-engine/frameAdapters.js";

// Convert every actor+puck position at time t into the legacy pos={id:[x,y]}
// / puck=[x,y] shape, in feet. Puck samples are tagged actorId:"puck" in a
// CompiledTeachingPlay's own sample array per simulator.js's convention --
// this includes samples from the puck simply being carried (mirrored from
// its carrier's own skate actions), not only from an explicit pass/shot.
export function legacyPositionsAt(compiledPlay, t) {
  const frame = frameAt(compiledPlay, t);
  const pos = {};
  let puck = null;
  for (const [id, metresPoint] of Object.entries(frame)) {
    if (!metresPoint) continue;
    const feetPoint = rinkFrameToPlaySpace(metresPoint);
    if (id === "puck") puck = feetPoint;
    else pos[id] = feetPoint;
  }
  return { pos, puck };
}

// A single "node," in the exact shape AnimatedPlay.jsx already reads
// (q text is NOT produced here -- that's authored copy, not physics-engine
// output; a real wiring phase would merge this with the definition's own
// declaredRead/questionKindVariants copy, which is out of this thin
// adapter's scope).
export function compiledPlayToLegacyNode(compiledPlay, t) {
  const { pos, puck } = legacyPositionsAt(compiledPlay, t);
  return {
    pos,
    puck,
    terminal: t >= compiledPlay.eventTimes[compiledPlay.eventTimes.length - 1],
  };
}

// The freeze-moment node specifically -- the point AnimatedPlay.jsx's
// question UI actually renders from.
export function compiledPlayToFreezeNode(compiledPlay) {
  return compiledPlayToLegacyNode(compiledPlay, compiledPlay.questionFreezeTime);
}

// A legacy `motions` array entry, from one actor's own samples -- for a
// consumer that wants the whole trajectory, not just one instant.
export function legacyMotionsForActor(compiledPlay, actorId) {
  const track = compiledPlay.samples
    .filter((s) => s.actorId === actorId)
    .sort((a, b) => a.t - b.t);
  if (track.length < 2) return [];
  const motions = [];
  for (let i = 1; i < track.length; i++) {
    // actionKind carries the real action.kind ("skate", "pass", "shot", ...)
    // from simulator.js -- deriving it from a lossy pass/shot boolean
    // previously mislabeled every puck-carry segment AND every shot as
    // "pass" (caught by Phase 3's adversarial review, 2026-07-31).
    motions.push({
      kind: track[i].actionKind ?? "skate",
      from: rinkFrameToPlaySpace(track[i - 1].pos),
      to: rinkFrameToPlaySpace(track[i].pos),
      actor: actorId === "puck" ? undefined : actorId,
    });
  }
  return motions;
}
