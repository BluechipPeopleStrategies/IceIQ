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
import { VERDICT_TWO_ON_ONE_FORCED_SHOT } from "../src/play/plays/verdictTwoOnOneForcedShot.js";

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

  it("renderer keys skip state per chain via watchChainInfo", () => {
    const src = readFileSync(new URL("../src/play/AnimatedPlay.jsx", import.meta.url), "utf8");
    assert.ok(src.includes("watchChainInfo(play, nodeId).endNodeId"),
      "skip gate and jump should use the chain end node id");
    assert.ok(!src.includes("k.startsWith(`${play.id}:`)"),
      "per-play skip key check should be gone");
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

describe("verdict kind", () => {
  it("proof play is valid and registered", async () => {
    assert.deepEqual(validateAnimatedPlay(VERDICT_TWO_ON_ONE_FORCED_SHOT).errs, []);
    const { ALL_ANIMATED_PLAYS: catalog } = await import("../src/play/playCatalog.js");
    assert.ok(catalog.some((p) => p.id === VERDICT_TWO_ON_ONE_FORCED_SHOT.id));
    assert.deepEqual(VERDICT_TWO_ON_ONE_FORCED_SHOT.ageBands, ["U11", "U13"]);
  });

  it("verdict nodes require an anchored justify block", () => {
    const play = structuredClone(VERDICT_TWO_ON_ONE_FORCED_SHOT);
    const judge = Object.values(play.nodes).find((n) => n.ask?.kind === "verdict");
    delete judge.ask.justify;
    assert.ok(validateAnimatedPlay(play).errs.some((e) => e.includes("justify")));

    const play2 = structuredClone(VERDICT_TWO_ON_ONE_FORCED_SHOT);
    const judge2 = Object.values(play2.nodes).find((n) => n.ask?.kind === "verdict");
    delete judge2.ask.justify.opts[0].evidence;
    assert.ok(validateAnimatedPlay(play2).errs.some((e) => e.includes("evidence")));
  });

  it("justify has exactly one correct option", () => {
    const judge = Object.values(VERDICT_TWO_ON_ONE_FORCED_SHOT.nodes).find((n) => n.ask?.kind === "verdict");
    assert.equal(judge.ask.justify.opts.filter((o) => o.ok).length, 1);
  });

  it("verdict copy judges the read, never the player", () => {
    const text = JSON.stringify(VERDICT_TWO_ON_ONE_FORCED_SHOT);
    assert.ok(!/you were wrong|you failed|bad choice/i.test(text));
  });

  it("judge node does not frame the learner as the skater (no decisionActor)", () => {
    const judge = Object.values(VERDICT_TWO_ON_ONE_FORCED_SHOT.nodes).find((n) => n.ask?.kind === "verdict");
    assert.equal(judge.decisionActor, undefined);
  });

  it("verdict answer telemetry requires both phases correct", () => {
    const src = readFileSync(new URL("../src/play/AnimatedPlay.jsx", import.meta.url), "utf8");
    assert.ok(src.includes("ok: !!(judgePick.ok && opt.ok)"),
      "combined ok must gate on judge AND justify picks");
  });
});

describe("predict-next kind", () => {
  it("proof play is valid, U13-only, and registered", async () => {
    const { PREDICT_TWO_ON_ONE_DEFENDER_STEP } = await import("../src/play/plays/predictTwoOnOneDefenderStep.js");
    assert.deepEqual(validateAnimatedPlay(PREDICT_TWO_ON_ONE_DEFENDER_STEP).errs, []);
    assert.deepEqual(PREDICT_TWO_ON_ONE_DEFENDER_STEP.ageBands, ["U13"]);
    const { ALL_ANIMATED_PLAYS: catalog } = await import("../src/play/playCatalog.js");
    assert.ok(catalog.some((p) => p.id === PREDICT_TWO_ON_ONE_DEFENDER_STEP.id));
  });

  it("requires truthNext and all options routing to it", async () => {
    const { PREDICT_TWO_ON_ONE_DEFENDER_STEP } = await import("../src/play/plays/predictTwoOnOneDefenderStep.js");
    const noTruth = structuredClone(PREDICT_TWO_ON_ONE_DEFENDER_STEP);
    const ask = Object.values(noTruth.nodes).find((n) => n.ask?.kind === "predict-next").ask;
    delete ask.truthNext;
    assert.ok(validateAnimatedPlay(noTruth).errs.some((e) => e.includes("truthNext")));

    const forked = structuredClone(PREDICT_TWO_ON_ONE_DEFENDER_STEP);
    const ask2 = Object.values(forked.nodes).find((n) => n.ask?.kind === "predict-next").ask;
    ask2.opts[1].next = Object.keys(forked.nodes)[0];
    assert.ok(validateAnimatedPlay(forked).errs.some((e) => e.includes("must route to truthNext")));
  });

  it("rejects a predict option that omits next", async () => {
    const { PREDICT_TWO_ON_ONE_DEFENDER_STEP } = await import("../src/play/plays/predictTwoOnOneDefenderStep.js");
    const omitted = structuredClone(PREDICT_TWO_ON_ONE_DEFENDER_STEP);
    const ask = Object.values(omitted.nodes).find((n) => n.ask?.kind === "predict-next").ask;
    delete ask.opts[0].next;
    assert.ok(validateAnimatedPlay(omitted).errs.some((e) => e.includes("must route to truthNext")));
  });

  it("every answered question updates lastKind (no stale prediction banner)", () => {
    const src = readFileSync(new URL("../src/play/AnimatedPlay.jsx", import.meta.url), "utf8");
    const guardIdx = src.indexOf("if (picked !== null || node.terminal) return;");
    const setIdx = src.indexOf("setLastKind(kind);");
    assert.ok(guardIdx > -1 && setIdx > guardIdx && setIdx - guardIdx < 200,
      "setLastKind must run at the top of choose(), before any branch");
    assert.equal(src.indexOf("setLastKind(kind);", setIdx + 1), -1,
      "setLastKind(kind) should appear exactly once");
  });
});

describe("spot-mistake kind", () => {
  it("proof play is valid and registered", async () => {
    const { SPOT_MISTAKE_FLAT_SUPPORT } = await import("../src/play/plays/spotMistakeFlatSupport.js");
    assert.deepEqual(validateAnimatedPlay(SPOT_MISTAKE_FLAT_SUPPORT).errs, []);
    const { ALL_ANIMATED_PLAYS: catalog } = await import("../src/play/playCatalog.js");
    assert.ok(catalog.some((p) => p.id === SPOT_MISTAKE_FLAT_SUPPORT.id));
  });

  it("enforces one defensible mistake", async () => {
    const { SPOT_MISTAKE_FLAT_SUPPORT } = await import("../src/play/plays/spotMistakeFlatSupport.js");

    const noActor = structuredClone(SPOT_MISTAKE_FLAT_SUPPORT);
    const ask = Object.values(noActor.nodes).find((n) => n.ask?.kind === "spot-mistake").ask;
    delete ask.mistakeActor;
    assert.ok(validateAnimatedPlay(noActor).errs.some((e) => e.includes("mistakeActor")));

    const mismatch = structuredClone(SPOT_MISTAKE_FLAT_SUPPORT);
    const ask2 = Object.values(mismatch.nodes).find((n) => n.ask?.kind === "spot-mistake").ask;
    ask2.mistakeActor = "D1"; // correct option still points at F2
    assert.ok(validateAnimatedPlay(mismatch).errs.some((e) => e.includes("must match mistakeActor")));

    const noActorId = structuredClone(SPOT_MISTAKE_FLAT_SUPPORT);
    const ask3 = Object.values(noActorId.nodes).find((n) => n.ask?.kind === "spot-mistake").ask;
    delete ask3.opts[0].actorId;
    assert.ok(validateAnimatedPlay(noActorId).errs.some((e) => e.includes("actorId")));
  });
});
