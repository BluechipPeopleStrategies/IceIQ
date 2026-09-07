import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { artLint, artLintCatalog, RULES, renderedCueLabel } from "../src/play/artLint.js";
import { ALL_ANIMATED_PLAYS } from "../src/play/playCatalog.js";
import { expandTwoOnOneFamily } from "../src/play/kernels/twoOnOneKernel.js";

// A minimal valid play to mutate per golden case.
function basePlay(overrides = {}) {
  return {
    id: "art_test_play",
    type: "animated-play",
    title: "Art test",
    ageBands: ["U11"],
    view: "half-right",
    start: "rush",
    actors: [
      { id: "F1", team: "home", role: "puckCarrier", label: "YOU" },
      { id: "F2", team: "home", role: "support", label: "F2" },
      { id: "D1", team: "away", role: "defender", label: "D1" },
    ],
    nodes: {
      rush: {
        id: "rush",
        q: "What is the best read?",
        decisionActor: "F1",
        pos: { F1: [146, 60], F2: [162, 25], D1: [160, 45] },
        puck: [143, 60],
        motions: [],
        overlays: [],
        ask: {
          actor: "F1",
          q: "What is the best read?",
          opts: [
            { id: "pass_backdoor", t: "Pass across", ok: true, next: "end" },
            { id: "shoot_far", t: "Shoot", no: "No.", next: "end" },
          ],
        },
        ...overrides.rush,
      },
      end: { id: "end", terminal: true, q: "Done.", pos: { F1: [150, 60] }, ...overrides.end },
    },
  };
}

describe("art lint: gates", () => {
  it("live catalog is art-clean (zero blocks; warns are logged debt)", () => {
    const r = artLintCatalog(ALL_ANIMATED_PLAYS);
    const blocks = r.findings.flatMap((f) => f.blocks.map((b) => `${f.playId}: ${b.rule} ${b.detail}`));
    assert.deepEqual(blocks, []);
  });

  it("every kernel candidate is art-clean", () => {
    const r = artLintCatalog(expandTwoOnOneFamily());
    assert.equal(r.ok, true);
    assert.equal(r.findings.length, 0);
  });

  it("every rule declares provenance", () => {
    for (const [id, rule] of Object.entries(RULES)) {
      assert.ok(rule.source && rule.source.length > 10, id);
    }
  });
});

describe("art lint: golden cases (one per rule — the promotion loop's pins)", () => {
  it("token-overlap: merged tokens at the decision freeze block", () => {
    const p = basePlay({ rush: { pos: { F1: [146, 60], F2: [148, 61], D1: [160, 45] } } });
    const r = artLint(p);
    assert.ok(r.blocks.some((b) => b.rule === "token-overlap"), JSON.stringify(r));
  });

  it("token-overlap: terminal-node contact is legal", () => {
    const p = basePlay({ end: { pos: { F1: [150, 60], D1: [152, 61] } } });
    assert.equal(artLint(p).blocks.length, 0);
  });

  it("out-of-bounds: a point off the sheet blocks", () => {
    const p = basePlay({ rush: { puck: [205, 60] } });
    assert.ok(artLint(p).blocks.some((b) => b.rule === "out-of-bounds"));
  });

  it("cue-covers-actor: a label on top of an actor blocks (AL-004 regression)", () => {
    // reproduces the shipped defect caught 2026-07-21: cue 1.0ft from an actor
    const p = basePlay({ rush: { cue: { label: "Middle open", x: 161, y: 45.5 } } });
    const r = artLint(p);
    assert.ok(r.blocks.some((b) => b.rule === "cue-covers-actor"), JSON.stringify(r.blocks));
  });

  it("cue-label-length: long rink labels warn for young bands", () => {
    const p = basePlay({ rush: { cue: { label: "Quick shot lane open", x: 130, y: 20 } } });
    assert.ok(artLint(p).warns.some((w) => w.rule === "cue-label-length"));
  });

  it("cue-label-length: measures the RENDERED string, not label (S2-18 regression)", () => {
    // A long youngLabel behind a short label is what a young player actually
    // sees, so it must warn — the old lint measured label and let it through.
    const p = basePlay({ rush: { cue: { label: "Step", youngLabel: "Step across into the lane", x: 130, y: 20 } } });
    assert.ok(artLint(p).warns.some((w) => w.rule === "cue-label-length"), JSON.stringify(artLint(p).warns));

    // Conversely a long label with a short youngLabel renders short and is fine.
    const q = basePlay({ rush: { cue: { label: "Read the ice again", youngLabel: "Look again", x: 130, y: 20 } } });
    assert.ok(!artLint(q).warns.some((w) => w.rule === "cue-label-length"));

    // shortLabel is the last resort, same as the renderer's fallback chain.
    const s = basePlay({ rush: { cue: { shortLabel: "Way too long to fit here", x: 130, y: 20 } } });
    assert.ok(artLint(s).warns.some((w) => w.rule === "cue-label-length"));
  });

  it("renderedCueLabel mirrors cueLabelForAge's fallback chain", () => {
    assert.equal(renderedCueLabel({ label: "Step", shortLabel: "St" }), "Step");
    assert.equal(renderedCueLabel({ label: "Step", youngLabel: "Steps to you" }), "Steps to you");
    assert.equal(renderedCueLabel({ shortLabel: "Angle" }), "Angle");
    assert.equal(renderedCueLabel(undefined), "");
  });

  it("answer-leak-arrow: a pass arrow to the correct target blocks", () => {
    const p = basePlay({
      rush: { motions: [{ kind: "pass", from: [146, 60], to: [161, 26] }] },
    });
    assert.ok(artLint(p).blocks.some((b) => b.rule === "answer-leak-arrow"));
  });

  it("answer-leak-arrow: a blocked line to the same spot is legal (shows coverage, not the answer)", () => {
    const p = basePlay({
      rush: { motions: [{ kind: "blocked", from: [146, 60], to: [161, 26] }] },
    });
    assert.equal(artLint(p).blocks.length, 0);
  });

  it("answer-leak-cue: a cue marker on the answer target blocks", () => {
    const p = basePlay({ rush: { overlays: [{ kind: "cue", label: "Open", x: 163, y: 27 }] } });
    assert.ok(artLint(p).blocks.some((b) => b.rule === "answer-leak-cue"));
  });

  it("puck-adrift: carrier reads warn when the puck is far from the carrier", () => {
    const p = basePlay({ rush: { puck: [120, 40] } });
    assert.ok(artLint(p).warns.some((w) => w.rule === "puck-adrift"));
  });

  it("puck-adrift: off-puck reads never fire (backcheck-style)", () => {
    const p = basePlay();
    p.actors[0].role = "backchecker";
    p.nodes.rush.puck = [120, 40];
    assert.ok(!artLint(p).warns.some((w) => w.rule === "puck-adrift"));
  });
});
