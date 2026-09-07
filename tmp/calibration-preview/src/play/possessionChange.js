const INTERCEPTION_COPY = /\b(?:breaks up the pass|forced pass|picked off|checker was waiting for that pass)\b/i;

function samePoint(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === 2
    && a.every((value, index) => value === b[index]);
}

export function validatePossessionChange(node, actorIds) {
  const change = node?.possessionChange;
  if (!change) return [];
  const errors = [];
  if (change.kind !== "interception") errors.push("kind must be interception");
  if (!actorIds.has(change.toActor)) errors.push(`unknown actor ${change.toActor}`);
  if (!Array.isArray(change.counterTo) || change.counterTo.length !== 2) errors.push("counterTo must be [x,y]");
  const defenderEntry = node.enter?.[change.toActor];
  if (!defenderEntry) errors.push("counter node needs defender enter position");
  if (!node.pos?.[change.toActor]) errors.push("counter node needs defender final position");
  if (!node.enterPuck || !node.puck) errors.push("counter node needs enterPuck and puck");
  if (!defenderEntry || !node.motions?.some((motion) => motion.kind === "blocked" && samePoint(motion.to, defenderEntry))) {
    errors.push("blocked route must end at defender entry position");
  }
  return errors;
}

export function explicitInterceptionNodes(play) {
  function chainHasPossessionChange(node) {
    let current = node;
    for (let step = 0; step < 3 && current?.autoNext?.next; step += 1) {
      current = play.nodes?.[current.autoNext.next];
      if (current?.possessionChange) return true;
    }
    return false;
  }
  return Object.entries(play?.nodes || {})
    .filter(([, node]) => INTERCEPTION_COPY.test(`${node.q || ""} ${node.youngQ || ""}`)
      && !node.possessionChange && !chainHasPossessionChange(node))
    .map(([nodeId]) => ({ playId: play.id, nodeId }));
}
