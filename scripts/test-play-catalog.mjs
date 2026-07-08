
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALL_ANIMATED_PLAYS, CORE_ANIMATED_PLAYS, VARIANT_ANIMATED_PLAYS } from "../src/play/playCatalog.js";
import { validateAnimatedPlay } from "../src/play/validateAnimatedPlay.js";

describe("animated play catalog", () => {
  it("contains core plays and variants", () => {
    assert.equal(CORE_ANIMATED_PLAYS.length >= 4, true);
    assert.equal(VARIANT_ANIMATED_PLAYS.length >= 3, true);
    assert.equal(ALL_ANIMATED_PLAYS.length >= 7, true);
  });

  it("has unique ids", () => {
    const ids = ALL_ANIMATED_PLAYS.map((play) => play.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("keeps every play valid and source-backed", () => {
    for (const play of ALL_ANIMATED_PLAYS) {
      const result = validateAnimatedPlay(play);
      assert.deepEqual(result.errs, [], play.id);
      assert.equal(result.ok, true, play.id);
      assert.equal(!!play.sourceRef?.note, true, play.id);
      assert.equal(!!play.sourceRef?.cite, true, play.id);
    }
  });

  it("keeps each non-terminal question to exactly one correct answer", () => {
    for (const play of ALL_ANIMATED_PLAYS) {
      for (const node of Object.values(play.nodes)) {
        if (!node.terminal) {
          assert.equal(node.ask.opts.filter((opt) => opt.ok).length, 1, play.id + " / " + node.id);
        }
      }
    }
  });
});
