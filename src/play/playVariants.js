
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
