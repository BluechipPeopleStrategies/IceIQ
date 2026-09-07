import { ANCHORS, WALL_SEGMENT_NAMES, distanceToSegment } from "./rinkAnchors.js";

// Point-landmark tolerance in rink-200x85 units. Derived (not guessed) from
// the 2026-07-30 anchor-fidelity audit: every legitimately-placed claim found
// in the real catalog ran 0.5-4.3 units off its anchor; the confirmed bug and
// a second independent cluster both ran 8-11.7 units off. 5 clears every
// clean case with margin while catching both with margin either side.
// docs/superpowers/specs/2026-07-30-anchor-fidelity-validator-design.md
const DEFAULT_POINT_TOLERANCE = 5;

// Wider tolerance for line-segment (wall/boards) landmarks, per the
// 2026-07-30 wall-anchor investigation: a boards run has length, so even
// legitimate directional "toward the wall" content lands 7.9-9.2 units from
// the nearest point on the corrected boards segment, while the confirmed
// dzBreakoutEscapePressure-class bug sits at 11.51+. 10 clears every
// legitimate case found with margin while still catching that class of bug.
const DEFAULT_SEGMENT_TOLERANCE = 10;

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

// Checks a node's declared `intendedAnchor` claims (per actor id, or "puck")
// against the actor's actual pos/puck coordinate. `intendedAnchor` is
// optional per node; nodes that don't declare one are untouched by this gate.
// An anchor name resolves as a POINT landmark (ANCHORS) or, if not found
// there, a SEGMENT landmark (WALL_SEGMENT_NAMES) — each with its own
// tolerance, since a boards run legitimately tolerates more spread than a
// single-point landmark like a net or the slot.
//
// Deliberately NOT handled here: nodes reached via a `choiceMode:'lane-pick'`
// option, whose correct resting position is defined by that option's own
// `zone:[x,y,r]`, not by any rink anchor (see backcheckRecovery.js's
// `wallRecovery` node in the 2026-07-30 wall-anchor investigation — its
// position matches its triggering zone's center exactly, but is 10.44 units
// from the nearest wall-segment point, which would be a false positive under
// this check). Do not add `intendedAnchor` to a lane-pick-reached node until
// a zone-aware check exists; leaving it undeclared is the correct, deliberate
// choice today, not an oversight.
export function validateAnchorFidelity(play, { pointTolerance = DEFAULT_POINT_TOLERANCE, segmentTolerance = DEFAULT_SEGMENT_TOLERANCE } = {}) {
  const errs = [];
  const warns = [];

  for (const [nodeId, node] of Object.entries(play.nodes || {})) {
    const intended = node.intendedAnchor;
    if (!intended) continue;

    for (const [actorId, anchorName] of Object.entries(intended)) {
      const point = ANCHORS[anchorName];
      const segment = WALL_SEGMENT_NAMES[anchorName];
      if (!point && !segment) {
        errs.push({ playId: play.id, nodeId, message: `intendedAnchor references unknown anchor "${anchorName}" for ${actorId}` });
        continue;
      }

      const actual = actorId === "puck" ? node.puck : node.pos?.[actorId];
      if (!Array.isArray(actual)) {
        errs.push({ playId: play.id, nodeId, message: `intendedAnchor declared for ${actorId} but no matching pos/puck coordinate exists on this node` });
        continue;
      }

      const isSegment = !point;
      const d = isSegment ? distanceToSegment(actual, segment[0], segment[1]) : dist(actual, point);
      const tolerance = isSegment ? segmentTolerance : pointTolerance;
      if (d > tolerance) {
        const landmark = isSegment ? `segment ${anchorName} (${segment[0].join(",")} -> ${segment[1].join(",")})` : `${anchorName} (${point.join(",")})`;
        errs.push({
          playId: play.id,
          nodeId,
          message: `${actorId} declares intendedAnchor "${anchorName}" — ${landmark} — but sits at [${actual.join(",")}], ${d.toFixed(2)} units away (tolerance ${tolerance})`,
        });
      }
    }
  }

  return { ok: errs.length === 0, errs, warns };
}

export function validatePlayCatalogAnchorFidelity(plays, opts) {
  const results = plays.map((play) => ({
    playId: play.id,
    title: play.title,
    ...validateAnchorFidelity(play, opts),
  }));

  return {
    ok: results.every((result) => result.ok),
    results,
    errs: results.flatMap((result) => result.errs),
    warns: results.flatMap((result) => result.warns),
  };
}
