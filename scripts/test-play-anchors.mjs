import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALL_ANIMATED_PLAYS } from "../src/play/playCatalog.js";
import { validateAnchorFidelity, validatePlayCatalogAnchorFidelity } from "../src/play/validateAnchorFidelity.js";

describe("RinkReads anchor fidelity", () => {
  it("keeps every catalog play's declared intendedAnchor claims within tolerance", () => {
    const result = validatePlayCatalogAnchorFidelity(ALL_ANIMATED_PLAYS);
    assert.deepEqual(result.errs, []);
    assert.equal(result.ok, true);
  });

  it("passes a play whose actor sits at its declared anchor", () => {
    const goodPlay = {
      id: "good_anchor_fidelity",
      nodes: {
        retrieval: {
          id: "retrieval",
          intendedAnchor: { D1: "behindNetRight" },
          pos: { D1: [192.9, 43.1] },
        },
      },
    };
    const result = validateAnchorFidelity(goodPlay);
    assert.deepEqual(result.errs, []);
    assert.equal(result.ok, true);
  });

  it("catches the confirmed 2026-07-29 bug shape: a declared anchor claim that drifted 11.5 units", () => {
    const badPlay = {
      id: "bad_anchor_fidelity",
      nodes: {
        retrieval: {
          id: "retrieval",
          intendedAnchor: { D1: "behindNetRight" },
          pos: { D1: [193, 54] },
        },
      },
    };
    const result = validateAnchorFidelity(badPlay);
    assert.equal(result.ok, false);
    assert.ok(result.errs[0].message.includes("units away"));
  });

  it("catches a puck-position drift, not just actor positions", () => {
    const badPuckPlay = {
      id: "bad_puck_anchor",
      nodes: {
        retrieval: {
          id: "retrieval",
          intendedAnchor: { puck: "slotRight" },
          puck: [130, 10],
        },
      },
    };
    const result = validateAnchorFidelity(badPuckPlay);
    assert.equal(result.ok, false);
  });

  it("flags an intendedAnchor referencing an anchor name that doesn't exist", () => {
    const typoPlay = {
      id: "typo_anchor",
      nodes: {
        retrieval: {
          id: "retrieval",
          intendedAnchor: { D1: "behindTheNetRight" },
          pos: { D1: [192.5, 42.5] },
        },
      },
    };
    const result = validateAnchorFidelity(typoPlay);
    assert.equal(result.ok, false);
    assert.ok(result.errs[0].message.includes("unknown anchor"));
  });

  it("ignores nodes that declare no intendedAnchor at all", () => {
    const untaggedPlay = {
      id: "untagged",
      nodes: {
        retrieval: { id: "retrieval", pos: { D1: [0, 0] } },
      },
    };
    const result = validateAnchorFidelity(untaggedPlay);
    assert.deepEqual(result.errs, []);
    assert.equal(result.ok, true);
  });

  // Segment (wall/boards) landmarks — 2026-07-30 wall-anchor investigation.
  // A boards run has length, so "near the wall" is point-to-segment, not
  // point-to-point; these tolerate more spread (10 units) than a point
  // landmark like the net or slot (5 units).

  it("passes an actor within tolerance of a wall segment, even off the segment's own endpoints", () => {
    const goodWallPlay = {
      id: "good_wall_segment",
      nodes: {
        pressure: {
          id: "pressure",
          intendedAnchor: { A1: "wallSegmentRightBottom" },
          pos: { A1: [172, 62] }, // real forecheckTakeAwayReverse.js coordinate; ~8.1 from the segment
        },
      },
    };
    const result = validateAnchorFidelity(goodWallPlay);
    assert.deepEqual(result.errs, []);
    assert.equal(result.ok, true);
  });

  it("catches an actor genuinely far from a declared wall segment", () => {
    const badWallPlay = {
      id: "bad_wall_segment",
      nodes: {
        pressure: {
          id: "pressure",
          intendedAnchor: { A1: "wallSegmentRightBottom" },
          pos: { A1: [140, 42] }, // mid-ice, nowhere near the right boards
        },
      },
    };
    const result = validateAnchorFidelity(badWallPlay);
    assert.equal(result.ok, false);
    assert.ok(result.errs[0].message.includes("segment"));
  });

  it("uses a wider tolerance for segments than points, on purpose", () => {
    // 7 units off: fails a point check (tolerance 5), passes a segment check (tolerance 10).
    const pointFail = validateAnchorFidelity({
      id: "point_check",
      nodes: { n: { id: "n", intendedAnchor: { A1: "wallBottomRight" }, pos: { A1: [168, 78] } } },
    });
    const segmentPass = validateAnchorFidelity({
      id: "segment_check",
      nodes: { n: { id: "n", intendedAnchor: { A1: "wallSegmentRightBottom" }, pos: { A1: [168, 78] } } },
    });
    assert.equal(pointFail.ok, false);
    assert.equal(segmentPass.ok, true);
  });
});
