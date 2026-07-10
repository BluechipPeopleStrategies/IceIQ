import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { QUESTION_KINDS, resolveKind, resolveKindForAge, kindSpec, validatePromptAnswerContract } from "../src/play/questionKinds.js";
import { validateAnimatedPlay } from "../src/play/validateAnimatedPlay.js";
import { validateFactoryStandards } from "../src/play/validateFactoryStandards.js";
import { TWO_ON_ONE_READ_PLAY } from "../src/play/plays/twoOnOneRead.js";
import { BACKCHECK_RECOVERY_PLAY } from "../src/play/plays/backcheckRecovery.js";
import { ALL_ANIMATED_PLAYS } from "../src/play/playCatalog.js";
import { collectPlayTelemetrySnapshots } from "../src/play/prototypeTelemetry.js";
import { watchChainInfo } from "../src/play/questionKinds.js";
import { VERDICT_TWO_ON_ONE_FORCED_SHOT } from "../src/play/plays/verdictTwoOnOneForcedShot.js";
import { SPOT_MISTAKE_FLAT_SUPPORT } from "../src/play/plays/spotMistakeFlatSupport.js";
import { SUPPORT_ANGLE_FLAT } from "../src/play/plays/supportAngleFlat.js";
import { PREDICT_TWO_ON_ONE_DEFENDER_STEP } from "../src/play/plays/predictTwoOnOneDefenderStep.js";
import { kindsForAge } from "../src/play/interactionProfiles.js";
import { buildScenarioFamilyReport, playKinds } from "../src/play/playFamilies.js";
import { logAnimatedPlayEvent, summarizeAnimatedPlayEvents } from "../src/play/telemetry.js";

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

  it("round-trips an explicit verdict kind", () => {
    assert.equal(resolveKind({ ask: { kind: "verdict", opts: [] } }), "verdict");
  });

  it("never degrades direct manipulation to buttons", () => {
    const spotNode = Object.values(SPOT_MISTAKE_FLAT_SUPPORT.nodes)
      .find((node) => node.ask?.kind === "spot-mistake");
    assert.equal(resolveKindForAge(spotNode, "U7"), "spot-mistake");

    const predictNode = Object.values(PREDICT_TWO_ON_ONE_DEFENDER_STEP.nodes)
      .find((node) => node.ask?.kind === "predict-next");
    assert.equal(resolveKindForAge(predictNode, "U11"), "read-mc");
  });

  it("rejects direct-manipulation wording for button answers", () => {
    assert.match(
      validatePromptAnswerContract("Tap the skater who made the wrong read.", "read-mc"),
      /requires a direct rink interaction/
    );
    assert.match(
      validatePromptAnswerContract("Move the skater into support.", "read-mc"),
      /requires a direct rink interaction/
    );
    assert.equal(
      validatePromptAnswerContract("Which skater made the wrong read?", "read-mc"),
      null
    );
    assert.equal(
      validatePromptAnswerContract("Tap the skater who made the wrong read.", "spot-mistake"),
      null
    );

    const mismatched = structuredClone(TWO_ON_ONE_READ_PLAY);
    mismatched.nodes.rush.ask.q = "Tap the best answer.";
    const result = validateAnimatedPlay(mismatched);
    assert.ok(result.errs.some((error) => error.includes("node rush") && error.includes("direct rink interaction")));
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

  it("watch nodes snapshot as watch, not read-mc questions", () => {
    const snaps = collectPlayTelemetrySnapshots(VERDICT_TWO_ON_ONE_FORCED_SHOT, "U11");
    const watchSnap = snaps.find((s) => s.nodeId === "watch");
    assert.equal(watchSnap.kind, "watch");
    assert.equal(watchSnap.eventType, "prototype_watch_viewed");
  });

  it("verdict wrong-justify attributes the wrong answer to the justify option", () => {
    const src = readFileSync(new URL("../src/play/telemetry.js", import.meta.url), "utf8");
    assert.ok(src.includes("justifyId"), "stored events must carry justifyId");
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

  it("summarize attributes a wrong-justify verdict to the justify option, not the correct judge pick", () => {
    const map = new Map();
    const storage = {
      getItem: (key) => (map.has(key) ? map.get(key) : null),
      setItem: (key, value) => map.set(key, String(value)),
      removeItem: (key) => map.delete(key),
    };
    logAnimatedPlayEvent({
      playId: "t",
      nodeId: "judge",
      event: "answer",
      kind: "verdict",
      answerId: "better_option",
      justifyId: "goalie_deep",
      ok: false,
      judgeOk: true,
      justifyOk: false,
      ms: 100,
    }, storage);
    const summary = summarizeAnimatedPlayEvents("t", storage);
    assert.equal(summary.mostCommonWrongAnswer, "goalie_deep");
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

  it("keeps predict-next selections neutral until the truth reveal", () => {
    const src = readFileSync(new URL("../src/play/AnimatedPlay.jsx", import.meta.url), "utf8");
    assert.ok(src.includes('const suppressImmediateFeedback = kind === "predict-next";'),
      "predict-next picks should define a neutral pre-reveal feedback gate");
    assert.ok(src.includes("const showOk = isPicked && opt.ok && !suppressImmediateFeedback;"),
      "predict-next correct picks should not flash green before the truth node");
    assert.ok(src.includes("const showBad = isPicked && !opt.ok && !suppressImmediateFeedback;"),
      "predict-next wrong picks should not flash red before the truth node");
    assert.ok(src.includes("showBad && opt.no && !suppressImmediateFeedback"),
      "predict-next wrong-copy should wait for the truth node");
  });
});

describe("spot-mistake kind", () => {
  it("proof play is valid and registered", async () => {
    const { SPOT_MISTAKE_FLAT_SUPPORT } = await import("../src/play/plays/spotMistakeFlatSupport.js");
    assert.deepEqual(validateAnimatedPlay(SPOT_MISTAKE_FLAT_SUPPORT).errs, []);
    const { ALL_ANIMATED_PLAYS: catalog } = await import("../src/play/playCatalog.js");
    assert.ok(catalog.some((p) => p.id === SPOT_MISTAKE_FLAT_SUPPORT.id));
  });

  it("spot-mistake tap zones paint above actors and puck (hit-test order)", () => {
    const src = readFileSync(new URL("../src/play/AnimatedPlay.jsx", import.meta.url), "utf8");
    const zoneIdx = src.indexOf("<ActorTapTargets");
    assert.ok(zoneIdx > src.indexOf("play.actors.map"), "zones must render after actor tokens");
    assert.ok(zoneIdx > src.indexOf('circle r="1.35"'), "zones must render after the puck");
  });

  it("renders generous accessible actor tap targets", () => {
    const src = readFileSync(new URL("../src/play/ActorTapTargets.jsx", import.meta.url), "utf8");
    assert.match(src, /HIT_RADIUS\s*=\s*8/);
    assert.ok(src.includes('role="button"'));
    assert.ok(src.includes('tabIndex={disabled ? -1 : 0}'));
    assert.ok(src.includes('aria-label={option.t}'));
    assert.ok(src.includes('data-actor-id={option.actorId}'));
    assert.ok(src.includes('key === "Enter" || key === " "'));
  });

  it("states whether an actor tap was correct before the rewind summary", () => {
    const src = readFileSync(new URL("../src/play/AnimatedPlay.jsx", import.meta.url), "utf8");
    assert.ok(src.includes('pickedOption.ok ? "Correct" : "Not quite"'));
    assert.ok(src.includes("pickedOption.ok ? pickedOption.why : pickedOption.no"));
  });

  it("puts the defender and stolen puck directly in the failed pass lane", () => {
    const { intercept, replayIntercept } = SPOT_MISTAKE_FLAT_SUPPORT.nodes;
    assert.deepEqual(intercept.pos.D1, [147, 44]);
    assert.deepEqual(intercept.puck, [144.5, 45]);
    assert.deepEqual(replayIntercept.pos.D1, [147, 44]);
    assert.deepEqual(replayIntercept.puck, [144.5, 45]);

    for (const node of [intercept, replayIntercept]) {
      const blocked = node.motions.find((motion) => motion.kind === "blocked");
      assert.deepEqual(blocked.from, [146, 58]);
      assert.deepEqual(blocked.to, [147, 44]);
      assert.equal(blocked.label, "picked off");
    }
  });

  it("stages the interception and counter before the question and in slow replay", () => {
    const nodes = SPOT_MISTAKE_FLAT_SUPPORT.nodes;
    assert.equal(nodes.watch.autoNext.next, "intercept");
    assert.equal(nodes.intercept.autoNext.next, "counter");
    assert.equal(nodes.counter.autoNext.next, "spot");
    assert.equal(nodes.spot.ask.opts.every((option) => option.next === "replayRead"), true);
    assert.equal(nodes.replayRead.autoNext.next, "replayIntercept");
    assert.equal(nodes.replayIntercept.autoNext.next, "rewind");
    assert.ok(nodes.replayRead.autoNext.ms > nodes.watch.autoNext.ms);
    assert.ok(nodes.replayIntercept.autoNext.ms > nodes.intercept.autoNext.ms);
    assert.deepEqual(nodes.counter.pos.D1, nodes.counter.possessionChange.counterTo);
    assert.deepEqual(nodes.rewind.pos.D1, nodes.rewind.possessionChange.counterTo);
  });

  it("turns the visible defender step into a simple player decision", () => {
    const entry = PREDICT_TWO_ON_ONE_DEFENDER_STEP.nodes.entry;
    assert.doesNotMatch(entry.ask.q, /what does the defender do next/i);
    assert.equal(entry.ask.q, "The defender steps toward YOU. Which play is now open?");
    assert.equal(entry.ask.opts.find((option) => option.ok).t, "Pass to F2");
    assert.equal(
      PREDICT_TWO_ON_ONE_DEFENDER_STEP.nodes.truth.q,
      "Correct. The defender steps toward YOU, so they cannot also cover F2. Make the pass."
    );

    const hiddenIntent = structuredClone(PREDICT_TWO_ON_ONE_DEFENDER_STEP);
    hiddenIntent.nodes.entry.ask.q = "What does the defender do next?";
    assert.ok(validateAnimatedPlay(hiddenIntent).errs.some((error) => error.includes("hidden opponent intent")));
  });

  it("assigns the visible forced-pass turnover to the puck carrier", () => {
    const ask = SPOT_MISTAKE_FLAT_SUPPORT.nodes.spot.ask;
    assert.equal(ask.mistakeActor, "F1");
    assert.deepEqual(ask.opts.filter((option) => option.ok).map((option) => option.actorId), ["F1"]);
    assert.match(ask.opts.find((option) => option.actorId === "F1").why, /covered pass|defender.*lane/i);
    assert.match(ask.opts.find((option) => option.actorId === "F2").no, /puck carrier.*decision|cannot force/i);
    assert.match(SPOT_MISTAKE_FLAT_SUPPORT.nodes.rewind.q, /If the lane is taken, hold, shoot, or attack the open ice\./);
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

describe("support-angle actor read", () => {
  it("separates support availability from turnover blame", () => {
    assert.deepEqual(validateAnimatedPlay(SUPPORT_ANGLE_FLAT).errs, []);
    assert.ok(ALL_ANIMATED_PLAYS.some((play) => play.id === SUPPORT_ANGLE_FLAT.id));
    const ask = SUPPORT_ANGLE_FLAT.nodes.read.ask;
    assert.match(ask.q, /create a better passing angle/i);
    assert.equal(ask.mistakeActor, "F2");
    assert.deepEqual(ask.opts.filter((option) => option.ok).map((option) => option.actorId), ["F2"]);
    assert.doesNotMatch(JSON.stringify(SUPPORT_ANGLE_FLAT), /turnover|blame|guilty|forced pass/i);
  });

  it("puts terminal tactical feedback inside the coach card", () => {
    const renderer = readFileSync(new URL("../src/play/AnimatedPlay.jsx", import.meta.url), "utf8");
    assert.match(renderer, /explanation=\{coachExplanation\}/);
    assert.match(renderer, /!node\.terminal && \(/);
  });
});

describe("age gating", () => {
  it("bands expose their kind lists", () => {
    assert.deepEqual(kindsForAge("U7"), ["read-mc", "lane-pick"]);
    assert.deepEqual(kindsForAge("U9"), ["read-mc", "lane-pick"]);
    assert.deepEqual(kindsForAge("U11"), ["read-mc", "lane-pick", "verdict", "spot-mistake"]);
    assert.deepEqual(kindsForAge("U13"), ["read-mc", "lane-pick", "verdict", "spot-mistake", "predict-next"]);
    assert.deepEqual(kindsForAge("U18"), ["read-mc", "lane-pick", "verdict", "spot-mistake", "predict-next"]);
  });

  it("errors when a new kind targets U7/U9 and warns on fallback bands", () => {
    const young = structuredClone(SPOT_MISTAKE_FLAT_SUPPORT);
    young.ageBands = ["U9", "U11"];
    assert.ok(validateAnimatedPlay(young).errs.some((e) => e.includes("not available at U9")));

    const fallback = structuredClone(PREDICT_TWO_ON_ONE_DEFENDER_STEP);
    fallback.ageBands = ["U11", "U13"]; // U11 cannot natively render predict-next yet
    const result = validateAnimatedPlay(fallback);
    assert.deepEqual(result.errs, []);
    assert.ok(result.warns.some((w) => w.includes("falls back to read-mc")));
  });
});

describe("factory kind coverage", () => {
  it("reports kinds per play and per family", () => {
    assert.deepEqual(playKinds(TWO_ON_ONE_READ_PLAY), ["read-mc"]);
    assert.deepEqual(playKinds(VERDICT_TWO_ON_ONE_FORCED_SHOT), ["verdict"]);

    const report = buildScenarioFamilyReport();
    const twoOnOne = report.families.find((f) => f.id === "two_on_one");
    assert.ok(twoOnOne.kindCounts["read-mc"] >= 1);
    assert.ok(twoOnOne.kindCounts["verdict"] >= 1);
    assert.ok(twoOnOne.kindCounts["predict-next"] >= 1);
    assert.ok(twoOnOne.kindCounts["spot-mistake"] >= 1);
  });

  it("warns when a complete family is single-kind", () => {
    const report = buildScenarioFamilyReport([
      structuredClone(TWO_ON_ONE_READ_PLAY),
    ].map((p, i) => ({ ...p, id: `${p.id}_${i}` })));
    // gap_control etc. will warn for zero plays; the single-kind warning needs a full family:
    const fakeFamilyPlays = Array.from({ length: 6 }, (_, i) => ({
      ...structuredClone(TWO_ON_ONE_READ_PLAY),
      id: `fake_2v1_${i}`,
    }));
    const full = buildScenarioFamilyReport(fakeFamilyPlays);
    assert.ok(full.warnings.some((w) => w.familyId === "two_on_one" && w.message.includes("only 1 question kind")));
  });

  it("watch-chain plays' first question is not a follow-up (no reRead warnings)", () => {
    const verdictResult = validateFactoryStandards(VERDICT_TWO_ON_ONE_FORCED_SHOT);
    const spotResult = validateFactoryStandards(SPOT_MISTAKE_FLAT_SUPPORT);
    for (const result of [verdictResult, spotResult]) {
      assert.ok(!result.warns.some((w) => w.message.includes("reRead")), JSON.stringify(result.warns));
      assert.ok(!result.errs.some((e) => e.message.includes("reRead")), JSON.stringify(result.errs));
    }
  });
});
