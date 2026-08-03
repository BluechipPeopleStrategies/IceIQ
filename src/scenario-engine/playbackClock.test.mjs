#!/usr/bin/env node
// Run: node src/scenario-engine/playbackClock.test.mjs
import { sampleAt, frameAt, eventTimes } from "./playbackClock.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const compiledPlay = {
  samples: [
    { t: 0, pos: [0, 0], actorId: "D1" },
    { t: 2, pos: [10, 0], actorId: "D1" },
    { t: 4, pos: [10, 10], actorId: "D1" },
    { t: 0, pos: [5, 5], actorId: "puck" },
    { t: 1, pos: [15, 5], actorId: "puck" },
  ],
  eventTimes: [0, 2, 4],
  questionFreezeTime: 2,
};

ok("sampleAt returns the exact sample at an exact timestamp", JSON.stringify(sampleAt(compiledPlay, "D1", 2)) === JSON.stringify([10, 0]));
ok("sampleAt interpolates linearly between two samples", JSON.stringify(sampleAt(compiledPlay, "D1", 1)) === JSON.stringify([5, 0]));
ok("sampleAt interpolates the second segment correctly", JSON.stringify(sampleAt(compiledPlay, "D1", 3)) === JSON.stringify([10, 5]));
ok("sampleAt clamps to the first sample before t=0", JSON.stringify(sampleAt(compiledPlay, "D1", -5)) === JSON.stringify([0, 0]));
ok("sampleAt clamps to the last sample after the track ends", JSON.stringify(sampleAt(compiledPlay, "D1", 100)) === JSON.stringify([10, 10]));
ok("sampleAt returns null for an actor with no samples", sampleAt(compiledPlay, "GHOST", 1) === null);
ok("sampleAt works independently for the puck track", JSON.stringify(sampleAt(compiledPlay, "puck", 0.5)) === JSON.stringify([10, 5]));

const frame = frameAt(compiledPlay, 1);
ok("frameAt aggregates every actor present in the samples", Object.keys(frame).sort().join(",") === "D1,puck");
ok("frameAt's per-actor values match individual sampleAt calls", JSON.stringify(frame.D1) === JSON.stringify(sampleAt(compiledPlay, "D1", 1)));
ok("frameAt returns a frozen object (immutable snapshot)", Object.isFrozen(frame));

ok("eventTimes includes 0 even if not explicitly listed", eventTimes({ samples: [], eventTimes: [], questionFreezeTime: undefined }).includes(0));
ok("eventTimes includes the question freeze time", eventTimes(compiledPlay).includes(2));
ok("eventTimes is sorted and de-duplicated", JSON.stringify(eventTimes(compiledPlay)) === JSON.stringify([0, 2, 4]));

// Determinism: repeated calls with identical inputs produce byte-identical output.
{
  const a = sampleAt(compiledPlay, "D1", 1.5);
  const b = sampleAt(compiledPlay, "D1", 1.5);
  ok("sampleAt is deterministic across repeated calls", JSON.stringify(a) === JSON.stringify(b));
}

// Mutation safety: sampleAt must never hand back a live reference into the
// shared samples array -- a consumer mutating its returned position in
// place must not corrupt the canonical data for every other consumer.
// (Caught by Phase 3's adversarial review, 2026-07-31 -- the clamp branches
// previously returned the stored array directly.)
{
  const beforeExact = JSON.stringify(compiledPlay.samples.find((s) => s.actorId === "D1" && s.t === 0).pos);
  const exactHit = sampleAt(compiledPlay, "D1", 0);
  exactHit[0] += 9999;
  ok("sampleAt's exact-timestamp result is a copy, not a live reference (t=0 boundary)", JSON.stringify(compiledPlay.samples.find((s) => s.actorId === "D1" && s.t === 0).pos) === beforeExact);

  const beforeClampEnd = JSON.stringify(compiledPlay.samples.find((s) => s.actorId === "D1" && s.t === 4).pos);
  const clampedAfterEnd = sampleAt(compiledPlay, "D1", 100);
  clampedAfterEnd[0] += 9999;
  ok("sampleAt's after-track-end clamp result is a copy, not a live reference", JSON.stringify(compiledPlay.samples.find((s) => s.actorId === "D1" && s.t === 4).pos) === beforeClampEnd);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
