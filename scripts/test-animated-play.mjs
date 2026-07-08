import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TWO_ON_ONE_READ_PLAY } from "../src/play/plays/twoOnOneRead.js";
import { validateAnimatedPlay } from "../src/play/validateAnimatedPlay.js";

describe("2-on-1 animated play object", () => {
  it("is valid, sourced, and has a terminal reveal", () => {
    const result = validateAnimatedPlay(TWO_ON_ONE_READ_PLAY);
    assert.deepEqual(result.errs, []);
    assert.equal(result.ok, true);
    assert.equal(TWO_ON_ONE_READ_PLAY.type, "animated-play");
    assert.equal(TWO_ON_ONE_READ_PLAY.sourceRef.note, "docs/library/odd-man-reads.md");
    assert.equal(TWO_ON_ONE_READ_PLAY.start, "rush");
    assert.equal(TWO_ON_ONE_READ_PLAY.nodes.finish.terminal, true);
  });

  it("has exactly one correct first read", () => {
    const opts = TWO_ON_ONE_READ_PLAY.nodes.rush.ask.opts;
    assert.equal(opts.filter((o) => o.ok).length, 1);
    assert.equal(opts.find((o) => o.ok).id, "pass_backdoor");
  });

  it("rejects missing sourceRef and dangling routes", () => {
    const noSource = { ...TWO_ON_ONE_READ_PLAY, sourceRef: null };
    assert.equal(validateAnimatedPlay(noSource).ok, false);

    const badRoute = {
      ...TWO_ON_ONE_READ_PLAY,
      nodes: {
        ...TWO_ON_ONE_READ_PLAY.nodes,
        rush: {
          ...TWO_ON_ONE_READ_PLAY.nodes.rush,
          ask: {
            ...TWO_ON_ONE_READ_PLAY.nodes.rush.ask,
            opts: [{ id: "bad", t: "Bad", ok: true, next: "missing" }],
          },
        },
      },
    };
    assert.equal(validateAnimatedPlay(badRoute).ok, false);
  });
});

