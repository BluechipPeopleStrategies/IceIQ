import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  makeTwoOnOnePlay,
  expandTwoOnOneFamily,
  pointSegDist,
  COMMITS,
  DEPTHS,
  SHAPES,
  LANE_BLOCKED_MAX_FT,
  LANE_CLEAR_MIN_FT,
} from "../src/play/kernels/twoOnOneKernel.js";
import { validateAnimatedPlay } from "../src/play/validateAnimatedPlay.js";
import { validateFactoryStandards } from "../src/play/validateFactoryStandards.js";
import {
  answerSignature,
  answerTarget,
  layoutDistance,
  answerDistance,
  filterNovel,
} from "../src/play/noveltyGate.js";
import { ALL_ANIMATED_PLAYS } from "../src/play/playCatalog.js";

const NET = [190, 43];

describe("twoOnOne kernel: correct by construction", () => {
  const family = expandTwoOnOneFamily();

  it("expands the full parameter space", () => {
    assert.equal(family.length, COMMITS.length * DEPTHS.length * SHAPES.length * 2 * 2);
  });

  it("every candidate passes the animated-play validator", () => {
    for (const play of family) {
      const result = validateAnimatedPlay(play);
      assert.deepEqual(result.errors || [], [], play.id);
    }
  });

  it("every candidate passes factory standards", () => {
    for (const play of family) {
      const result = validateFactoryStandards(play);
      assert.deepEqual(result.errs || [], [], play.id);
    }
  });

  it("stepsUp: pass lane provably clear, shot lane covered", () => {
    for (const play of family.filter((p) => p.generated.params.commit === "stepsUp" && !p.generated.params.mirror)) {
      const rush = play.nodes.rush;
      const d = rush.pos.D1;
      assert.ok(pointSegDist(d, rush.pos.F1, rush.pos.F2) >= LANE_CLEAR_MIN_FT, `${play.id} pass lane`);
      assert.ok(pointSegDist(d, rush.pos.F1, NET) <= LANE_BLOCKED_MAX_FT + 2, `${play.id} shot lane`);
    }
  });

  it("holdsMiddle: pass lane provably blocked, shot lane clear", () => {
    for (const play of family.filter((p) => p.generated.params.commit === "holdsMiddle" && !p.generated.params.mirror)) {
      const rush = play.nodes.rush;
      const d = rush.pos.D1;
      assert.ok(pointSegDist(d, rush.pos.F1, rush.pos.F2) <= LANE_BLOCKED_MAX_FT, `${play.id} pass lane`);
      assert.ok(pointSegDist(d, rush.pos.F1, NET) >= LANE_CLEAR_MIN_FT, `${play.id} shot lane`);
    }
  });

  it("the correct answer follows the commit", () => {
    const up = makeTwoOnOnePlay({ commit: "stepsUp" });
    const hold = makeTwoOnOnePlay({ commit: "holdsMiddle" });
    assert.equal(up.nodes.rush.ask.opts.find((o) => o.ok).id, "pass_backdoor");
    assert.equal(hold.nodes.rush.ask.opts.find((o) => o.ok).id, "shoot_lane");
  });

  it("is deterministic per parameter set and unique across the space", () => {
    const a = makeTwoOnOnePlay({ commit: "stepsUp", depth: 8, shape: "trailer", seed: 2 });
    const b = makeTwoOnOnePlay({ commit: "stepsUp", depth: 8, shape: "trailer", seed: 2 });
    assert.deepEqual(a, b);
    const ids = family.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("kernel ids never collide with the live catalog", () => {
    const live = new Set(ALL_ANIMATED_PLAYS.map((p) => p.id));
    for (const play of family) assert.ok(!live.has(play.id), play.id);
  });
});

describe("novelty gate", () => {
  const base = makeTwoOnOnePlay({ commit: "stepsUp", depth: 0, shape: "backPost", seed: 1 });
  const jitterSibling = makeTwoOnOnePlay({ commit: "stepsUp", depth: 0, shape: "backPost", seed: 2 });
  const mirrored = makeTwoOnOnePlay({ commit: "stepsUp", depth: 0, shape: "backPost", seed: 1, mirror: true });
  const otherBranch = makeTwoOnOnePlay({ commit: "holdsMiddle", depth: 0, shape: "backPost", seed: 1 });

  it("reads the answer target (pass -> receiver, shot -> net)", () => {
    assert.equal(answerTarget(base).kind, "pass");
    assert.equal(answerTarget(otherBranch).kind, "shot");
  });

  it("mirror moves the answer; jitter does not", () => {
    assert.ok(answerDistance(base, mirrored) > 0.06, "mirror should move the answer");
    assert.ok(answerDistance(base, jitterSibling) < 0.06, "jitter should not move the answer");
    assert.ok(layoutDistance(base, jitterSibling) < 0.045, "jitter layout is a clone");
  });

  it("kills jitter-only clones, keeps mirrors and branch changes", () => {
    const { kept, rejected } = filterNovel([jitterSibling, mirrored, otherBranch], [base]);
    assert.ok(rejected.some((r) => r.play.id === jitterSibling.id), "jitter sibling must die");
    assert.ok(kept.some((p) => p.id === mirrored.id), "mirror must survive");
    assert.ok(kept.some((p) => p.id === otherBranch.id), "other branch must survive");
  });

  it("different signatures for mirrored answers, and caps enforce scarcity", () => {
    assert.notEqual(answerSignature(base), answerSignature(mirrored));
    const depthVariants = [0, 8, 16].flatMap((depth) => [
      makeTwoOnOnePlay({ commit: "stepsUp", depth, shape: "backPost", seed: 1 }),
      makeTwoOnOnePlay({ commit: "stepsUp", depth, shape: "trailer", seed: 1 }),
    ]);
    const { kept } = filterNovel(depthVariants, [], { capPerSignature: 2 });
    const sigs = kept.map((p) => answerSignature(p));
    for (const s of new Set(sigs)) {
      assert.ok(sigs.filter((x) => x === s).length <= 2, `cap exceeded for ${s}`);
    }
  });

  it("gates the full expansion against the live catalog without error", () => {
    const { kept, rejected } = filterNovel(expandTwoOnOneFamily(), ALL_ANIMATED_PLAYS);
    assert.equal(kept.length + rejected.length, expandTwoOnOneFamily().length);
    assert.ok(kept.length >= 2, "expansion should yield at least a couple of novel plays");
    assert.ok(rejected.length > kept.length, "most of a jittered space should be pruned");
  });
});
