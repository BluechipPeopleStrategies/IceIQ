import { QUESTION_KINDS, resolveKind } from "./questionKinds.js";

const REQUIRED_NODE_FIELDS = ["id", "q", "pos"];

function isPoint(p) {
  return Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number" && Number.isFinite(n));
}

export function validateAnimatedPlay(play) {
  const errs = [];
  const warns = [];

  if (!play || typeof play !== "object") return { ok: false, errs: ["play is not an object"], warns };
  if (play.type !== "animated-play") errs.push(`type must be animated-play, got ${JSON.stringify(play.type)}`);
  if (!play.id) errs.push("missing id");
  if (!play.sourceRef || !play.sourceRef.note || !play.sourceRef.cite) errs.push("sourceRef.note and sourceRef.cite are required");
  if (!Array.isArray(play.actors) || play.actors.length < 2) errs.push("actors must contain at least two actors");
  if (!play.nodes || typeof play.nodes !== "object") errs.push("nodes must be an object");
  if (!play.start) errs.push("missing start node");

  const actorIds = new Set((play.actors || []).map((a) => a.id));
  if (actorIds.size !== (play.actors || []).length) errs.push("actor ids must be unique");
  const nodeIds = new Set(Object.keys(play.nodes || {}));
  if (play.start && !nodeIds.has(play.start)) errs.push(`start node ${play.start} is missing`);

  let terminalCount = 0;
  for (const [nodeId, node] of Object.entries(play.nodes || {})) {
    for (const field of REQUIRED_NODE_FIELDS) {
      if (!node[field]) errs.push(`node ${nodeId} missing ${field}`);
    }
    if (node.terminal) terminalCount++;
    for (const [actorId, point] of Object.entries(node.pos || {})) {
      if (!actorIds.has(actorId)) errs.push(`node ${nodeId} positions unknown actor ${actorId}`);
      if (!isPoint(point)) errs.push(`node ${nodeId} position for ${actorId} must be [x,y]`);
    }
    if (node.puck && !isPoint(node.puck)) errs.push(`node ${nodeId} puck must be [x,y]`);
    if (node.decisionActor && !actorIds.has(node.decisionActor)) errs.push(`node ${nodeId} decisionActor ${node.decisionActor} is not an actor`);
    if (!node.terminal) {
      const kind = resolveKind(node);
      if (!QUESTION_KINDS[kind]) errs.push(`node ${nodeId} has unknown question kind ${JSON.stringify(kind)}`);
      const opts = node.ask?.opts || [];
      if (!node.ask || !Array.isArray(opts) || opts.length < 2) errs.push(`node ${nodeId} must have at least two answer options`);
      if (opts.filter((o) => o.ok).length !== 1) errs.push(`node ${nodeId} must have exactly one correct option`);
      for (const opt of opts) {
        if (!opt.id) errs.push(`node ${nodeId} has option with no id`);
        if (!opt.t) errs.push(`node ${nodeId} option ${opt.id || "unknown"} has no text`);
        if (opt.next && !nodeIds.has(opt.next)) errs.push(`node ${nodeId} option ${opt.id || "unknown"} routes to missing node ${opt.next}`);
        if (!opt.ok && !opt.no) warns.push(`node ${nodeId} wrong option ${opt.id || "unknown"} has no teaching note`);
      }
    }
  }

  if (terminalCount === 0) errs.push("play must include at least one terminal node");
  return { ok: errs.length === 0, errs, warns };
}

