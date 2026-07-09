import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { QUESTION_KINDS, resolveKind, kindSpec } from "../src/play/questionKinds.js";
import { validateAnimatedPlay } from "../src/play/validateAnimatedPlay.js";
import { TWO_ON_ONE_READ_PLAY } from "../src/play/plays/twoOnOneRead.js";
import { BACKCHECK_RECOVERY_PLAY } from "../src/play/plays/backcheckRecovery.js";
import { ALL_ANIMATED_PLAYS } from "../src/play/playCatalog.js";
import { collectPlayTelemetrySnapshots } from "../src/play/prototypeTelemetry.js";

describe("question kind registry", () => {
  it("defines the five kinds with full contracts", () => {
    assert.deepEqual(
      Object.keys(QUESTION_KINDS).sort(),
      ["lane-pick", "predict-next", "read-mc", "spot-mistake", "verdict"]
    );
    for (const spec of Object.values(QUESTION_KINDS)) {
      assert.ok(spec.playback && spec.answer && spec.reveal);
    }
  });

  it("defaults legacy plays to read-mc and choiceMode to lane-pick", () => {
    assert.equal(resolveKind(TWO_ON_ONE_READ_PLAY.nodes.rush), "read-mc");
    const lanePickNode = Object.values(BACKCHECK_RECOVERY_PLAY.nodes)
      .find((n) => n.ask?.choiceMode === "lane-pick");
    assert.ok(lanePickNode, "backcheckRecovery should contain a lane-pick node");
    assert.equal(resolveKind(lanePickNode), "lane-pick");
    assert.equal(resolveKind({ terminal: true }), null);
    assert.equal(kindSpec("read-mc").answer, "buttons");
    assert.equal(kindSpec("nope"), null);
  });

  it("rejects unknown kinds in validation", () => {
    const bad = structuredClone(TWO_ON_ONE_READ_PLAY);
    bad.nodes.rush.ask.kind = "mystery";
    const result = validateAnimatedPlay(bad);
    assert.equal(result.ok, false);
    assert.ok(result.errs.some((e) => e.includes("unknown question kind")));
  });

  it("keeps every existing play valid with zero data changes", () => {
    for (const play of ALL_ANIMATED_PLAYS) {
      assert.deepEqual(validateAnimatedPlay(play).errs, [], play.id);
    }
  });

  it("stamps kind onto telemetry snapshots", () => {
    const snaps = collectPlayTelemetrySnapshots(TWO_ON_ONE_READ_PLAY, "U11");
    const question = snaps.find((s) => !s.terminal);
    const reveal = snaps.find((s) => s.terminal);
    assert.equal(question.kind, "read-mc");
    assert.equal(reveal.kind, null);
  });
});

describe("spatial answers at U11/U13", () => {
  it("zone rendering is gated by kind, not by the figure profile", () => {
    const src = readFileSync(new URL("../src/play/AnimatedPlay.jsx", import.meta.url), "utf8");
    assert.ok(!src.includes('profile.token === "figure" && !node.terminal && node.ask?.choiceMode'),
      "figure-profile gate on zones should be removed");
    assert.ok(src.includes('kind === "lane-pick"') || src.includes("effectiveKind === \"lane-pick\""),
      "zone render should branch on resolved kind");
  });
});
