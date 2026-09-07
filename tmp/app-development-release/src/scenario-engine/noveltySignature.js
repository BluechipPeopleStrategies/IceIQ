// Novelty signature for ScenarioDefinitions, per the design spec's
// "Throughput and the 'hundreds per day' claim" section:
//
//   "A mirror, prose change, or non-load-bearing coordinate jitter does not
//    count as a new scenario state. Each template registers a versioned
//    novelty signature covering tactical claim, decision/cue topology,
//    answer, and minimum geometry/time distance."
//
// Why this module exists at all: the only measured throughput baseline on
// record is "48 candidates yielding 4 novel survivors," and that 48 was
// 2 commits x 3 depths x 2 shapes x 2 MIRRORS x 2 SEEDS. Mirror and seed are
// exactly the two axes the sentence above disqualifies, so the real space
// was 12, not 48 -- the baseline inflated 4x before any gate ran. Everything
// here is built so that inflation cannot happen by construction rather than
// by a reviewer remembering to divide.
//
// Relationship to src/play/noveltyGate.js: that module is the same idea one
// generation earlier, operating on legacy animated-play objects (nodes,
// ask.opts, feet-space coordinates) with no time dimension and no mirror
// canonicalization. It stays exactly as it is and keeps serving the legacy
// catalog. This module operates on ScenarioDefinitions and shares no code
// with it deliberately: one module bending to two artifact shapes is how
// both end up wrong.
//
// --- Versioning convention (matches DETECTORS_VERSION in
// physics/hardFailureDetectors.js and SCENARIO_DEFINITION_SCHEMA_VERSION in
// scenarioDefinition.js) ---
// NOVELTY_SIGNATURE_VERSION is stamped into every signature and into the
// content digest. Any change that can move an item between "novel" and "not
// novel" -- a new/removed key dimension, a changed derivation, a changed
// threshold -- is output-changing and MUST bump it, with a dated changelog
// line below saying what changed and why. A counted-novelty number is only
// comparable to another number produced under the same signature version;
// the version exists so a benchmark report can say which one it used.
//
// v1 (2026-08-03): first version.
export const NOVELTY_SIGNATURE_VERSION = "novelty-signature-v1";

import { canonicalStringify, versionedContentHash } from "./canonicalHash.js";

// --- Thresholds (the spec's "minimum geometry/time distance") -------------
//
// Both are exported named constants, never inlined, because the spec
// requires the benchmark to "publish the signature distribution and all
// thresholds" -- a threshold that only exists inside an expression cannot be
// published or audited.
//
// The organizing principle behind both numbers: a scenario state is only
// genuinely new if the LEARNER'S DECISION could differ. So each threshold is
// set at the resolution below which the learner's decision provably cannot
// differ, not at a round number that felt about right.

// Geometry: the largest displacement of any single load-bearing point
// (actor, puck, action endpoint, answer target), in RinkFrame metres.
//
// Justification, from two independent directions that agree:
//   1. Physics floor. This engine's own hard-failure detectors treat 0.5m as
//      "roughly one body envelope" (TELEPORT_MIN_DISTANCE_M). A stick adds
//      roughly another metre of interference. Under ~2m of movement a player
//      covers the same ice: no passing lane opens, none closes.
//   2. Product ceiling. The live scorers accept a tap within a normalized
//      tolerance of 0.08-0.14 (src/scenario/primitives/place-scorer.js and
//      the shipped seeds). The tightest of those, taken across the 85ft
//      axis, is ~2.1m of real ice. If the answer moves less than the
//      tolerance that accepts it, THE SAME TAP IS CORRECT IN BOTH -- they
//      are not two questions, by construction rather than by opinion.
//
// Cross-check against the legacy gate: noveltyGate.DEFAULTS.minLayoutDist is
// 0.045 rink diagonals (~2.98m) and minAnswerMove is 0.06 (~3.97m), both on
// a MEAN over actors. This threshold is lower but applied to the MAX, which
// is the stricter comparison in the case that matters (one actor moving a
// long way is diluted to nothing by a mean over five).
//
// JUDGMENT CALL -- flagged for Thomas, not settled: 2.0 is defensible from
// both directions above, but it is still a choice. Bias risk runs one way
// only (too low = counted novelty inflates, which is the exact failure this
// module exists to prevent), so the safe direction to be wrong is HIGH. Once
// a real run exists, publish the measured distance distribution and revisit;
// if near-clones are surviving, 3.0 is the next stop.
export const MIN_GEOMETRY_DISTANCE_M = 2.0;

// Time: the largest shift of any single timing field (action start, action
// end, decision-freeze time), in seconds.
//
// Justification: every shipped physics profile carries reactionDelayS = 0.3
// (physics/profiles/*.json). A timing difference smaller than the learner's
// own reaction delay cannot change any decision, because the learner cannot
// respond inside it. The simulator's SAMPLE_STEP_S = 0.5 is a competing
// anchor pointing the same way from the machine's side -- a timing
// difference the trace never samples cannot produce a different trace.
//
// JUDGMENT CALL -- flagged for Thomas: 0.3 is the learner-side number and
// 0.5 is the simulator-side number. 0.3 is chosen because the question
// "is this a different scenario state" is a question about the learner. The
// conservative alternative is 0.5; same publish-the-distribution advice as
// above.
export const MIN_TIME_DISTANCE_S = 0.3;

// Bounded brute-force slot matching (see matchGroup below). Groups larger
// than this fall back to canonical-sorted pairing rather than trying 5040+
// permutations. Real definitions have groups of 1-2.
const MAX_PERMUTED_GROUP = 6;

// --- helpers ---------------------------------------------------------------

function round6(n) {
  const r = Math.round(n * 1e6) / 1e6;
  return Object.is(r, -0) ? 0 : r; // -0 and 0 must never serialize differently
}

function slotKeyOf(actor) {
  return `${actor?.team ?? "?"}:${actor?.role ?? "?"}`;
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

// A tactical claim reference looks like "claim_dz_breakout_..._v1@v1".
// The signature keeps the claim IDENTITY and drops its version: re-approving
// or re-citing the same claim at v2 over unchanged geometry is not a new
// scenario state, and letting a claim bump manufacture novelty is precisely
// the kind of inflation this module is here to stop.
function claimIdentity(tacticalClaimVersion) {
  if (typeof tacticalClaimVersion !== "string" || !tacticalClaimVersion) return null;
  return tacticalClaimVersion.split("@")[0];
}

// --- geometry payload ------------------------------------------------------
// The continuous half of the signature. Deliberately separated from the
// discrete key: bucketing continuous coordinates into cells would make the
// key itself jitter-sensitive at every cell boundary, which is the opposite
// of what the spec asks for.

function geometryOf(def) {
  const actors = def?.initialState?.actors ?? [];
  const byId = new Map(actors.map((a) => [a.id, a]));

  const slots = {};
  for (const a of actors) {
    const key = slotKeyOf(a);
    (slots[key] ??= []).push([round6(a.position?.[0] ?? 0), round6(a.position?.[1] ?? 0)]);
  }
  for (const key of Object.keys(slots)) {
    slots[key].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  }

  const actions = (def?.intendedActions ?? []).map((action) => ({
    slot: slotKeyOf(byId.get(action.actorId)),
    kind: action.kind ?? null,
    startTime: action.startTime ?? null,
    endTime: action.endTime ?? null,
    toPosition: Array.isArray(action.toPosition)
      ? [round6(action.toPosition[0]), round6(action.toPosition[1])]
      : null,
  }));

  return {
    attackingDirection: def?.rinkFrame?.attackingDirection ?? null,
    slots,
    puck: Array.isArray(def?.initialState?.puck?.position)
      ? [round6(def.initialState.puck.position[0]), round6(def.initialState.puck.position[1])]
      : null,
    answerTarget: answerTargetOf(def),
    actions,
    freezeTime: def?.decisionFreeze?.time ?? null,
  };
}

// Where the answer LANDS on the ice: the endpoint of the last intended action
// taken by the actor the declaredRead names. Falls back to that actor's own
// spot (a carry/hold read has no separate target). Derived structurally, never
// from declaredRead.description -- prose is disqualified by the spec, and
// deriving the answer from prose would let a reword count as a new answer.
function answerTargetOf(def) {
  const actorId = def?.declaredRead?.actorId;
  if (actorId === undefined || actorId === null) return null;
  const own = (def?.initialState?.actors ?? []).find((a) => a.id === actorId);
  const acts = (def?.intendedActions ?? []).filter((a) => a.actorId === actorId && Array.isArray(a.toPosition));
  const point = acts.length ? acts[acts.length - 1].toPosition : own?.position;
  return Array.isArray(point) ? [round6(point[0]), round6(point[1])] : null;
}

// The four orientations of the same physical situation. RinkFrame's origin is
// centre ice and both bounds are symmetric (rinkFrame.js), so:
//   flipY  = the repo's own far-side mirror (src/play/playVariants.mirrorPlayY
//            does exactly this in feet-space: y -> midY*2 - y, i.e. y -> -y
//            once re-centred). This is THE transform the spec disqualifies.
//   flipX  = the same read attacked at the other end of the sheet. Valid only
//            because attackingDirection flips with it; the pair (coordinates,
//            attackingDirection) is what gets canonicalized, so a scenario at
//            +x attacking +x never collapses into a different scenario at -x
//            still attacking +x.
// Facing angles are deliberately NOT transformed or compared -- see the
// module's known-miss note in the report; no fixture sets one today, and
// adding an angular dimension would mean a third threshold with no anchor.
function orientGeometry(g, flipX, flipY) {
  const p = ([x, y]) => [round6(flipX ? -x : x), round6(flipY ? -y : y)];
  const slots = {};
  for (const [key, points] of Object.entries(g.slots)) {
    slots[key] = points.map(p).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }
  return {
    attackingDirection: flipX
      ? (g.attackingDirection === "+x" ? "-x" : g.attackingDirection === "-x" ? "+x" : g.attackingDirection)
      : g.attackingDirection,
    slots,
    puck: g.puck ? p(g.puck) : null,
    answerTarget: g.answerTarget ? p(g.answerTarget) : null,
    actions: g.actions.map((a) => ({ ...a, toPosition: a.toPosition ? p(a.toPosition) : null })),
    freezeTime: g.freezeTime,
  };
}

export function orientationsOf(geometry) {
  return [
    orientGeometry(geometry, false, false),
    orientGeometry(geometry, false, true),
    orientGeometry(geometry, true, false),
    orientGeometry(geometry, true, true),
  ];
}

// --- the discrete key ------------------------------------------------------
// Three of the spec's four dimensions. Nothing continuous goes in here, so
// the key is jitter-proof by construction; the fourth dimension (geometry/
// time distance) is measured, not bucketed.
//
// Deliberately EXCLUDED, each for a reason:
//   - declaredRead.description, observableCues text, questionKindVariants
//     copy: prose. The spec disqualifies prose changes outright.
//   - questionKindVariants[].kind and ageBands: the spec counts "question
//     variants" as a SEPARATE line from "meaningfully distinct scenario
//     states". Three question kinds over one freeze frame is one state.
//   - ageSkillProfile: same reason -- age translation is a variant axis.
//   - proofMode: provenance, not state. Re-labelling a coach-declared
//     scenario as kernel-derived does not move a single player.
//   - contentHash / id / version: identity fields, not state.
function keyPartsOf(def) {
  const actors = def?.initialState?.actors ?? [];
  const byId = new Map(actors.map((a) => [a.id, a]));

  // Dimension 1: tactical claim.
  const tacticalClaim = {
    family: def?.family ?? null,
    claim: claimIdentity(def?.tacticalClaimVersion),
  };

  // Dimension 2: answer. Which actor answers, and what they do -- structural,
  // never prose. Where it lands is continuous and lives in the geometry half.
  const answerActor = byId.get(def?.declaredRead?.actorId);
  const answer = {
    actorSlot: answerActor ? slotKeyOf(answerActor) : null,
    actionKinds: (def?.intendedActions ?? [])
      .filter((a) => a.actorId === def?.declaredRead?.actorId)
      .map((a) => a.kind ?? null),
    resolvesToTarget: answerTargetOf(def) !== null,
  };

  // Dimension 3: decision/cue topology. Who is on the ice in what role, and
  // the shape of the action sequence. Cue TEXT is prose and excluded; the
  // geometric relationships those cues describe are carried by the geometry
  // half, where a real change in them shows up as real displacement.
  const slotCounts = {};
  for (const a of actors) slotCounts[slotKeyOf(a)] = (slotCounts[slotKeyOf(a)] ?? 0) + 1;
  const topology = {
    slots: Object.entries(slotCounts).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, n]) => `${k}x${n}`),
    actionSequence: (def?.intendedActions ?? []).map(
      (a) => `${slotKeyOf(byId.get(a.actorId))}:${a.kind ?? "?"}:${Array.isArray(a.toPosition) ? "targeted" : "untargeted"}:${a.endTime === undefined ? "open" : "timed"}`
    ),
  };

  return {
    signatureVersion: NOVELTY_SIGNATURE_VERSION,
    schemaVersion: def?.schemaVersion ?? null,
    tacticalClaim,
    answer,
    topology,
  };
}

// --- public API ------------------------------------------------------------

// A signature is (discrete key) + (canonical geometry payload). Identity is
// decided by signaturesMatch(), NOT by deep-equality of this object, because
// the spec's fourth dimension is a minimum DISTANCE and a distance is
// relational by nature -- there is no hash that can express "within 2 metres".
// The key alone is the coarse bucket the benchmark's signature distribution
// should be reported over; the distance separates instances inside a bucket.
export function signatureOf(definition) {
  const keyParts = keyPartsOf(definition);
  const raw = geometryOf(definition);
  // Canonical orientation: the lexicographically smallest of the four. Used
  // for the digest and for display. Distance comparison does NOT rely on it
  // (see geometryTimeDistance) -- a near-symmetric definition could otherwise
  // flip canonical orientation under jitter and read as wildly novel.
  const oriented = orientationsOf(raw);
  const geometry = oriented
    .map((g) => ({ g, s: canonicalStringify(g) }))
    .sort((a, b) => (a.s < b.s ? -1 : a.s > b.s ? 1 : 0))[0].g;

  return Object.freeze({
    version: NOVELTY_SIGNATURE_VERSION,
    key: canonicalStringify(keyParts),
    keyParts,
    geometry,
  });
}

// Content-addressed digest of the DISCRETE key only, for run envelopes and
// the benchmark's "signature distribution" report. Uses the shared versioned
// hasher so a v1 and a v2 signature over identical content never collide.
// Two definitions sharing a digest are in the same bucket, not necessarily
// the same scenario state -- use signaturesMatch() for that.
export async function signatureDigest(signature) {
  return versionedContentHash("novelty-signature", NOVELTY_SIGNATURE_VERSION, signature.keyParts);
}

// Largest displacement of any single matched point, and largest shift of any
// single timing field. Returns Infinity for both when the two are structurally
// incomparable (different slot rosters, different action counts, different
// attacking end) -- structurally incomparable already means distinct, so the
// caller never has to special-case it.
//
// Orientation-robust: b is compared in all four orientations and the closest
// one wins. That makes the mirror collapse hold even for definitions whose
// canonical orientation is unstable under tiny perturbations.
export function geometryTimeDistance(a, b) {
  let best = { geometryM: Infinity, timeS: Infinity, answerMoveM: Infinity };
  for (const oriented of orientationsOf(b.geometry)) {
    const d = distanceOneOrientation(a.geometry, oriented);
    if (d.geometryM < best.geometryM || (d.geometryM === best.geometryM && d.timeS < best.timeS)) best = d;
  }
  return best;
}

function distanceOneOrientation(a, b) {
  const far = { geometryM: Infinity, timeS: Infinity, answerMoveM: Infinity };
  if (a.attackingDirection !== b.attackingDirection) return far;

  const aKeys = Object.keys(a.slots).sort();
  const bKeys = Object.keys(b.slots).sort();
  if (aKeys.length !== bKeys.length || aKeys.some((k, i) => k !== bKeys[i])) return far;
  if (a.actions.length !== b.actions.length) return far;

  let geometryM = 0;
  for (const key of aKeys) {
    const groupA = a.slots[key];
    const groupB = b.slots[key];
    if (groupA.length !== groupB.length) return far;
    geometryM = Math.max(geometryM, matchGroup(groupA, groupB));
  }

  if (Boolean(a.puck) !== Boolean(b.puck)) return far;
  if (a.puck) geometryM = Math.max(geometryM, distance(a.puck, b.puck));

  let answerMoveM = 0;
  if (Boolean(a.answerTarget) !== Boolean(b.answerTarget)) return far;
  if (a.answerTarget) {
    answerMoveM = distance(a.answerTarget, b.answerTarget);
    geometryM = Math.max(geometryM, answerMoveM);
  }

  let timeS = 0;
  for (let i = 0; i < a.actions.length; i++) {
    const x = a.actions[i];
    const y = b.actions[i];
    if (x.kind !== y.kind || x.slot !== y.slot) return far;
    if (Boolean(x.toPosition) !== Boolean(y.toPosition)) return far;
    if (x.toPosition) geometryM = Math.max(geometryM, distance(x.toPosition, y.toPosition));
    for (const field of ["startTime", "endTime"]) {
      const xv = x[field];
      const yv = y[field];
      if (xv === null || xv === undefined || yv === null || yv === undefined) {
        if ((xv ?? null) !== (yv ?? null)) return far;
        continue;
      }
      timeS = Math.max(timeS, Math.abs(xv - yv));
    }
  }
  if ((a.freezeTime ?? null) === null || (b.freezeTime ?? null) === null) {
    if ((a.freezeTime ?? null) !== (b.freezeTime ?? null)) return far;
  } else {
    timeS = Math.max(timeS, Math.abs(a.freezeTime - b.freezeTime));
  }

  return { geometryM, timeS, answerMoveM };
}

// Two actors in the same (team, role) slot are interchangeable -- "the two
// forecheckers" is one topology however the ids are assigned. Brute-force the
// best pairing for small groups (real definitions have 1-2 per slot) rather
// than trusting sort order, which can transpose under jitter and manufacture
// a large false displacement.
function matchGroup(groupA, groupB) {
  const n = groupA.length;
  if (n === 1) return distance(groupA[0], groupB[0]);
  if (n > MAX_PERMUTED_GROUP) {
    let worst = 0;
    for (let i = 0; i < n; i++) worst = Math.max(worst, distance(groupA[i], groupB[i]));
    return worst;
  }
  let best = Infinity;
  const permute = (remaining, chosen, worstSoFar) => {
    if (worstSoFar >= best) return; // prune
    if (!remaining.length) { best = Math.min(best, worstSoFar); return; }
    for (let i = 0; i < remaining.length; i++) {
      const d = distance(groupA[chosen], remaining[i]);
      permute(remaining.filter((_, j) => j !== i), chosen + 1, Math.max(worstSoFar, d));
    }
  };
  permute(groupB, 0, 0);
  return best;
}

// The spec's rule, in one place: same tactical claim + same answer + same
// decision/cue topology + closer than the minimum geometry AND time distance
// = the same scenario state, not a new one.
export function signaturesMatch(a, b) {
  if (a.key !== b.key) return false;
  const d = geometryTimeDistance(a, b);
  return d.geometryM < MIN_GEOMETRY_DISTANCE_M && d.timeS < MIN_TIME_DISTANCE_S;
}

// Filter candidates against a supplied corpus AND against earlier survivors
// in the same batch. The second half matters as much as the first: a batch of
// 48 mirror/seed permutations is mostly self-duplication, and a gate that only
// checked against the existing corpus would pass all 48.
//
// candidates / existing: ScenarioDefinitions (or { definition } wrappers).
// Returns { kept, rejected, survivorRate } where kept is the novel subset in
// input order and rejected carries the specific reason and measured distances.
export function filterNovel(candidates = [], existing = [], opts = {}) {
  const minGeometryM = opts.minGeometryM ?? MIN_GEOMETRY_DISTANCE_M;
  const minTimeS = opts.minTimeS ?? MIN_TIME_DISTANCE_S;

  const unwrap = (item) => (item && item.definition ? item.definition : item);
  const pool = existing.map((item) => {
    const def = unwrap(item);
    return { def, sig: signatureOf(def), source: "corpus" };
  });

  const kept = [];
  const rejected = [];

  for (const item of candidates) {
    const def = unwrap(item);
    const sig = signatureOf(def);
    let reason = null;

    for (const other of pool) {
      if (other.sig.key !== sig.key) continue;
      const d = geometryTimeDistance(sig, other.sig);
      if (d.geometryM < minGeometryM && d.timeS < minTimeS) {
        reason =
          `same scenario state as ${other.def?.id ?? "(unidentified)"} (${other.source}): ` +
          `geometry ${d.geometryM.toFixed(2)}m < ${minGeometryM}m and time ${d.timeS.toFixed(2)}s < ${minTimeS}s`;
        break;
      }
    }

    if (reason) {
      rejected.push({ definition: def, signature: sig, reason });
    } else {
      kept.push(def);
      pool.push({ def, sig, source: "earlier survivor in this batch" });
    }
  }

  return {
    kept,
    rejected,
    survivorRate: candidates.length ? kept.length / candidates.length : 0,
    signatureVersion: NOVELTY_SIGNATURE_VERSION,
    thresholds: { minGeometryM, minTimeS },
  };
}
