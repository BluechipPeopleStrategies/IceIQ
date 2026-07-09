import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { QUESTION_KINDS, resolveKind, kindSpec } from "../src/play/questionKinds.js";
import { validateAnimatedPlay } from "../src/play/validateAnimatedPlay.js";
import { TWO_ON_ONE_READ_PLAY } from "../src/play/plays/twoOnOneRead.js";
import { BACKCHECK_RECOVERY_PLAY } from "../src/play/plays/backcheckRecovery.js";
import { ALL_ANIMATED_PLAYS } from "../src/play/playCatalog.js";
import { collectPlayTelemetrySnapshots } from "../src/play/prototypeTelemetry.js";
import { watchChainInfo } from "../src/play/questionKinds.js";

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

function watchFixture(overrides = {}) {
  return {
    id: "fixture_watch", type: "animated-play", title: "2-on-1 fixture", concept: "odd-man-reads",
    ageBands: ["U11"], view: "half-right", start: "watch",
    sourceRef: { note: "docs/library/odd-man-reads.md", cite: "fixture" },
    actors: [
      { id: "F1", team: "home", role: "puckCarrier", label: "YOU" },
      { id: "D1", team: "away", role: "defender", label: "D1" },
    ],
    nodes: {
      watch: { id: "watch", q: "Watch the play.", pos: { F1: [140, 60], D1: [160, 50] }, autoNext: { next: "ask", ms: 100 } },
      ask: {
        id: "ask", q: "Was that the right read?", decisionActor: "F1", pos: { F1: [146, 60], D1: [158, 52] },
        ask: { q: "Was that the right read?", opts: [
          { id: "yes", t: "Right read", no: "The lane was closed.", next: "end" },
          { id: "no", t: "Better option was there", ok: true, why: "The defender committed.", next: "end" },
        ] },
      },
      end: { id: "end", terminal: true, q: "The pass was the open play.", pos: { F1: [150, 58], D1: [156, 50] } },
    },
    ...overrides,
  };
}

describe("watch-chain primitive", () => {
  it("accepts a valid watch node without ask", () => {
    const result = validateAnimatedPlay(watchFixture());
    assert.deepEqual(result.errs, []);
  });

  it("rejects a watch node that also has ask", () => {
    const play = watchFixture();
    play.nodes.watch.ask = { q: "?", opts: [{ id: "a", t: "A", ok: true }, { id: "b", t: "B", no: "n" }] };
    assert.ok(validateAnimatedPlay(play).errs.some((e) => e.includes("must not have ask")));
  });

  it("rejects dangling and cyclic autoNext, and chains longer than 3", () => {
    const dangling = watchFixture();
    dangling.nodes.watch.autoNext = { next: "missing" };
    assert.ok(validateAnimatedPlay(dangling).errs.some((e) => e.includes("routes to missing node")));

    const cyclic = watchFixture();
    cyclic.nodes.watch.autoNext = { next: "watch" };
    assert.ok(validateAnimatedPlay(cyclic).errs.some((e) => e.includes("cyclic")));

    const long = watchFixture();
    long.nodes.w2 = { id: "w2", q: "…", pos: { F1: [141, 60] }, autoNext: { next: "w3" } };
    long.nodes.w3 = { id: "w3", q: "…", pos: { F1: [142, 60] }, autoNext: { next: "w4" } };
    long.nodes.w4 = { id: "w4", q: "…", pos: { F1: [143, 60] }, autoNext: { next: "ask" } };
    long.nodes.watch.autoNext = { next: "w2" };
    assert.ok(validateAnimatedPlay(long).errs.some((e) => e.includes("watch chain longer than 3")));
  });

  it("reports chain info", () => {
    const info = watchChainInfo(watchFixture(), "watch");
    assert.deepEqual(info, { length: 1, endNodeId: "ask", cyclic: false });
  });

  it("watch nodes appear in telemetry as reveal-style snapshots", () => {
    const snaps = collectPlayTelemetrySnapshots(watchFixture(), "U11");
    assert.ok(snaps.some((s) => s.nodeId === "watch"));
  });
});

describe("spatial answers at U11/U13", () => {
  it("zone rendering is gated by kind, not by the figure profile", () => {
    const src = readFileSync(new URL("../src/play/AnimatedPlay.jsx", import.meta.url), "utf8");
    assert.ok(!src.includes('profile.token === "figure" && !node.terminal && node.ask?.choiceMode'),
      "figure-profile gate on zones should be removed");
    assert.ok(src.includes('kind === "lane-pick"') || src.includes("effectiveKind === \"lane-pick\""),
      "zone render should branch on resolved kind");
    assert.ok(src.includes('profile.token === "figure" ? (zr ?? 6) : 4.5'),
      "token profiles should always use the tighter trainer zone radius");
  });
});
