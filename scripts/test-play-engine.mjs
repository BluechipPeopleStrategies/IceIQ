import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { motionPathD, motionPoints, motionTimings, visibleMotions } from "../src/play/motionGeometry.js";
import { ANCHORS, ANCHOR_NAMES, RINK, at, mirrorX } from "../src/play/rinkAnchors.js";
import { validateAnimatedPlay } from "../src/play/validateAnimatedPlay.js";
import { ALL_ANIMATED_PLAYS } from "../src/play/playCatalog.js";
import { GAP_CONTROL_PIVOT_MATCH_PLAY } from "../src/play/plays/gapControlPivotMatch.js";

describe("motion paths (waypoints)", () => {
  it("keeps two-point skate and blocked motions as straight lines (legacy exact)", () => {
    assert.equal(motionPathD({ kind: "skate", from: [118, 42], to: [145, 42] }), "M118,42 L145,42");
    assert.equal(motionPathD({ kind: "blocked", from: [150, 48], to: [187, 42] }), "M150,48 L187,42");
  });

  it("keeps two-point pass and shot motions on the legacy bump curve (exact)", () => {
    assert.equal(motionPathD({ kind: "pass", from: [166, 50], to: [174, 30] }), "M166,50 Q 170,23 174,30");
    assert.equal(motionPathD({ kind: "shot", from: [171, 42], to: [187, 42] }), "M171,42 Q 179,35 187,42");
  });

  it("draws via waypoints as a smooth spline through every point", () => {
    const motion = { kind: "pass", from: [184, 58], via: [[193, 50], [193, 35]], to: [184, 27] };
    const d = motionPathD(motion);
    assert.equal(d.startsWith("M184,58"), true);
    assert.equal((d.match(/C/g) || []).length, 3); // one cubic segment per hop
    assert.equal(d.includes("193,50"), true);
    assert.equal(d.endsWith("184,27"), true);
  });

  it("lists points in order including via", () => {
    const motion = { kind: "skate", from: [0, 0], via: [[5, 5]], to: [10, 0] };
    assert.deepEqual(motionPoints(motion), [[0, 0], [5, 5], [10, 0]]);
  });
});

describe("motion choreography", () => {
  it("staggers by authored order by default", () => {
    const timings = motionTimings([{ kind: "skate" }, { kind: "skate" }, { kind: "blocked" }]);
    assert.deepEqual(timings.map((t) => t.delayMs), [0, 450, 900]);
  });

  it("groups motions into the same beat via seq", () => {
    const timings = motionTimings([
      { kind: "skate", seq: 0 },
      { kind: "skate", seq: 0 },
      { kind: "blocked", seq: 1 },
    ]);
    assert.deepEqual(timings.map((t) => t.delayMs), [0, 0, 450]);
  });

  it("lets delayMs override the beat entirely and clamps negatives", () => {
    const timings = motionTimings([{ kind: "pass", delayMs: 1200 }, { kind: "shot", delayMs: -50 }]);
    assert.deepEqual(timings.map((t) => t.delayMs), [1200, 0]);
  });
});

describe("visible motions (answer-leak guard + ghost trails)", () => {
  const motions = [
    { kind: "skate", from: [0, 0], to: [1, 1] },
    { kind: "pass", from: [0, 0], to: [1, 1] },
    { kind: "shot", from: [0, 0], to: [1, 1] },
    { kind: "blocked", from: [0, 0], to: [1, 1] },
  ];

  it("hides skate and shot on question nodes so the picture cannot leak the answer", () => {
    const shown = visibleMotions({ terminal: false, motions });
    assert.deepEqual(shown.map((entry) => entry.motion.kind), ["pass", "blocked"]);
    assert.equal(shown.every((entry) => entry.trail === false), true);
  });

  it("renders skate motions on terminal nodes as ghost trails", () => {
    const shown = visibleMotions({ terminal: true, motions });
    assert.deepEqual(shown.map((entry) => entry.motion.kind), ["skate", "pass", "shot", "blocked"]);
    assert.deepEqual(shown.map((entry) => entry.trail), [true, false, false, false]);
  });

  it("existing terminal nodes carry skate routes for the trails to show", () => {
    const terminals = Object.values(GAP_CONTROL_PIVOT_MATCH_PLAY.nodes).filter((node) => node.terminal);
    const withTrails = terminals.filter((node) => visibleMotions(node).some((entry) => entry.trail));
    assert.equal(withTrails.length >= 1, true);
  });
});

describe("motion validation", () => {
  const base = ALL_ANIMATED_PLAYS[0];

  function withStartMotions(motions) {
    const start = base.nodes[base.start];
    return { ...base, nodes: { ...base.nodes, [base.start]: { ...start, motions } } };
  }

  it("accepts valid via waypoints", () => {
    const play = withStartMotions([{ kind: "pass", from: [10, 10], via: [[12, 5]], to: [20, 10] }]);
    assert.deepEqual(validateAnimatedPlay(play).errs, []);
  });

  it("rejects malformed via, seq, and delayMs", () => {
    const bad = withStartMotions([
      { kind: "pass", from: [10, 10], via: [[12]], to: [20, 10] },
      { kind: "skate", from: [10, 10], to: [20, 10], seq: -1 },
      { kind: "skate", from: [10, 10], to: [20, 10], delayMs: "soon" },
    ]);
    const result = validateAnimatedPlay(bad);
    assert.equal(result.errs.filter((e) => e.includes("via")).length, 1);
    assert.equal(result.errs.filter((e) => e.includes("seq")).length, 1);
    assert.equal(result.errs.filter((e) => e.includes("delayMs")).length, 1);
  });

  it("warns on unknown motion kinds", () => {
    const odd = withStartMotions([{ kind: "teleport", from: [10, 10], to: [20, 10] }]);
    const result = validateAnimatedPlay(odd);
    assert.equal(result.warns.some((w) => w.includes("teleport")), true);
  });

  it("keeps every catalog play valid under the new motion checks", () => {
    for (const play of ALL_ANIMATED_PLAYS) {
      assert.deepEqual(validateAnimatedPlay(play).errs, [], play.id);
    }
  });

  it("validates and renders puck entry positions", () => {
    const bad = withStartMotions([]);
    bad.nodes[bad.start].enterPuck = [12];
    assert.ok(validateAnimatedPlay(bad).errs.some((error) => error.includes("enterPuck")));

    const src = readFileSync(new URL("../src/play/AnimatedPlay.jsx", import.meta.url), "utf8");
    assert.ok(src.includes("const displayedPuck = (!entered && node.enterPuck) ? node.enterPuck : node.puck;"));
  });

  it("requires explicit possession-change geometry", async () => {
    const { validatePossessionChange } = await import("../src/play/possessionChange.js");
    const actorIds = new Set(["D1"]);
    assert.deepEqual(validatePossessionChange({
      possessionChange: { kind: "interception", fromTeam: "home", toActor: "D1", counterTo: [136, 43] },
      enter: { D1: [147, 44] },
      pos: { D1: [136, 43] },
      enterPuck: [144.5, 45],
      puck: [133.5, 44],
      motions: [{ kind: "blocked", from: [146, 58], to: [147, 44] }],
    }, actorIds), []);

    assert.ok(validatePossessionChange({
      possessionChange: { kind: "interception", toActor: "missing", counterTo: [136, 43] },
      pos: {},
    }, actorIds).some((error) => error.includes("unknown actor")));
  });

  it("choreographs every explicit pass interception in the catalog", async () => {
    const { explicitInterceptionNodes } = await import("../src/play/possessionChange.js");
    const missing = ALL_ANIMATED_PLAYS.flatMap(explicitInterceptionNodes);
    assert.deepEqual(missing, []);
  });
});

describe("rink anchors", () => {
  it("keeps every anchor inside the drawn rink", () => {
    for (const name of ANCHOR_NAMES) {
      const [x, y] = ANCHORS[name];
      assert.equal(x >= 2 && x <= 198, true, `${name} x=${x}`);
      assert.equal(y >= 2 && y <= 83, true, `${name} y=${y}`);
    }
  });

  it("resolves anchors with offsets", () => {
    assert.deepEqual(at("slotRight"), [176, 42.5]);
    assert.deepEqual(at("netFrontRight", -6, 2), [178.5, 44.5]);
  });

  it("throws on unknown anchor names instead of authoring a silent [NaN,NaN]", () => {
    assert.throws(() => at("theSlot"), /unknown rink anchor/);
  });

  it("mirrors across center ice for half-left authoring", () => {
    assert.deepEqual(mirrorX([176, 42.5]), [24, 42.5]);
    assert.deepEqual(mirrorX(mirrorX(at("circleTopRight"))), at("circleTopRight"));
    assert.equal(RINK.length, 200);
  });
});
