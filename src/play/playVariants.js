import { RINK } from "./rinkAnchors.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function mergeDeep(base, patch) {
  if (!isPlainObject(base) || !isPlainObject(patch)) return clone(patch);
  const next = clone(base);

  for (const [key, value] of Object.entries(patch)) {
    if (isPlainObject(value) && isPlainObject(next[key])) {
      next[key] = mergeDeep(next[key], value);
    } else {
      next[key] = clone(value);
    }
  }

  return next;
}

function upsertActors(baseActors, addedActors = []) {
  const byId = new Map((baseActors || []).map((actor) => [actor.id, clone(actor)]));
  for (const actor of addedActors) {
    byId.set(actor.id, { ...(byId.get(actor.id) || {}), ...clone(actor) });
  }
  return [...byId.values()];
}

export function makePlayVariant(basePlay, variant) {
  const play = clone(basePlay);

  play.id = variant.id;
  play.title = variant.title || basePlay.title;
  play.variantOf = basePlay.id;
  play.variantLabel = variant.label || "";
  play.difficulty = variant.difficulty || "standard";
  play.ageBands = variant.ageBands || basePlay.ageBands;
  play.sourceRef = {
    ...basePlay.sourceRef,
    ...(variant.sourceRef || {}),
    cite: variant.sourceRef?.cite || basePlay.sourceRef?.cite || "",
  };

  if (variant.actorsToAdd?.length) {
    play.actors = upsertActors(play.actors, variant.actorsToAdd);
  }

  if (variant.actorPatches) {
    play.actors = play.actors.map((actor) => ({
      ...actor,
      ...(variant.actorPatches[actor.id] || {}),
    }));
  }

  if (variant.nodes) {
    for (const [nodeId, patch] of Object.entries(variant.nodes)) {
      play.nodes[nodeId] = mergeDeep(play.nodes[nodeId] || {}, patch);
    }
  }

  if (variant.start) play.start = variant.start;
  return play;
}

// --- Mirror transform (the variation-generator design's T1) -----------------
// Reflect a play across the rink's long axis (flip Y in the 200x85 space):
// the high-side play becomes the far-side play, glove-side reads become
// blocker-side reads. View and prose stay valid because nothing in the copy
// names top/bottom; geometry is transformed field-by-field (never a blind
// deep walk, so labels and non-coordinate numbers are untouched).

function flipY(y) {
  return Math.round((RINK.width - y) * 10) / 10;
}

function flipPoint(point) {
  return [point[0], flipY(point[1])];
}

function mirrorNodeY(node) {
  const n = clone(node);
  for (const key of ["enter", "pos"]) {
    if (isPlainObject(n[key])) {
      for (const actorId of Object.keys(n[key])) n[key][actorId] = flipPoint(n[key][actorId]);
    }
  }
  if (Array.isArray(n.puck)) n.puck = flipPoint(n.puck);
  if (Array.isArray(n.enterPuck)) n.enterPuck = flipPoint(n.enterPuck);
  if (isPlainObject(n.possessionChange) && Array.isArray(n.possessionChange.counterTo)) {
    n.possessionChange.counterTo = flipPoint(n.possessionChange.counterTo);
  }
  if (isPlainObject(n.freeze) && typeof n.freeze.y === "number") n.freeze.y = flipY(n.freeze.y);
  if (Array.isArray(n.motions)) {
    n.motions = n.motions.map((m) => {
      const out = { ...m };
      if (Array.isArray(out.from)) out.from = flipPoint(out.from);
      if (Array.isArray(out.to)) out.to = flipPoint(out.to);
      if (Array.isArray(out.via)) out.via = out.via.map(flipPoint);
      return out;
    });
  }
  if (Array.isArray(n.overlays)) {
    n.overlays = n.overlays.map((o) => (typeof o.y === "number" ? { ...o, y: flipY(o.y) } : o));
  }
  if (isPlainObject(n.cue) && typeof n.cue.y === "number") n.cue.y = flipY(n.cue.y);
  return n;
}

export function mirrorPlayY(basePlay, { id, title, label = "far-side mirror" } = {}) {
  const play = clone(basePlay);
  play.id = id || `${basePlay.id}_mirror`;
  if (title) play.title = title;
  play.variantOf = basePlay.id;
  play.variantLabel = label;
  for (const nodeId of Object.keys(play.nodes)) {
    play.nodes[nodeId] = mirrorNodeY(play.nodes[nodeId]);
  }
  return play;
}
