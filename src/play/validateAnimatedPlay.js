import { QUESTION_KINDS, resolveKind, watchChainInfo } from "./questionKinds.js";
import { kindsForAge } from "./interactionProfiles.js";
import { MOTION_STYLES } from "./motionVocabulary.js";

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
    for (const [i, motion] of (node.motions || []).entries()) {
      const tag = `node ${nodeId} motion ${i}`;
      if (!isPoint(motion.from) || !isPoint(motion.to)) errs.push(`${tag} needs from/to as [x,y]`);
      if (motion.via !== undefined && (!Array.isArray(motion.via) || motion.via.length === 0 || !motion.via.every(isPoint))) {
        errs.push(`${tag} via must be a non-empty array of [x,y] points`);
      }
      if (motion.seq !== undefined && (typeof motion.seq !== "number" || motion.seq < 0)) errs.push(`${tag} seq must be a non-negative number`);
      if (motion.delayMs !== undefined && typeof motion.delayMs !== "number") errs.push(`${tag} delayMs must be a number`);
      if (!MOTION_STYLES[motion.kind]) warns.push(`${tag} has unknown kind ${JSON.stringify(motion.kind)} (falls back to skate style)`);
    }
    if (node.decisionActor && !actorIds.has(node.decisionActor)) errs.push(`node ${nodeId} decisionActor ${node.decisionActor} is not an actor`);
    if (!node.terminal) {
      if (node.autoNext) {
        if (node.ask) errs.push(`node ${nodeId} is a watch node and must not have ask`);
        if (!node.autoNext.next) errs.push(`node ${nodeId} autoNext missing next`);
        else if (!nodeIds.has(node.autoNext.next)) errs.push(`node ${nodeId} autoNext routes to missing node ${node.autoNext.next}`);
      } else {
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
        if (kind === "verdict") {
          const justify = node.ask?.justify;
          if (!justify || !Array.isArray(justify.opts) || justify.opts.length < 2) {
            errs.push(`node ${nodeId} verdict requires a justify block with at least two options`);
          } else {
            if (justify.opts.filter((o) => o.ok).length !== 1) errs.push(`node ${nodeId} justify must have exactly one correct option`);
            for (const jopt of justify.opts) {
              if (!jopt.id || !jopt.t) errs.push(`node ${nodeId} justify option missing id or text`);
              if (!jopt.evidence) errs.push(`node ${nodeId} justify option ${jopt.id || "unknown"} missing evidence (must name a visible actor or motion)`);
              else if (!actorIds.has(jopt.evidence)) errs.push(`node ${nodeId} justify evidence ${jopt.evidence} is not an actor`);
            }
          }
        }
        if (kind === "predict-next") {
          const truthNext = node.ask?.truthNext;
          if (!truthNext) errs.push(`node ${nodeId} predict-next requires ask.truthNext`);
          else if (!nodeIds.has(truthNext)) errs.push(`node ${nodeId} truthNext routes to missing node ${truthNext}`);
          for (const opt of node.ask?.opts || []) {
            if (truthNext && opt.next !== truthNext) errs.push(`node ${nodeId} predict-next option ${opt.id || "unknown"} must route to truthNext`);
          }
        }
        if (kind === "spot-mistake") {
          const mistakeActor = node.ask?.mistakeActor;
          if (!mistakeActor) errs.push(`node ${nodeId} spot-mistake requires ask.mistakeActor`);
          else if (!actorIds.has(mistakeActor)) errs.push(`node ${nodeId} mistakeActor ${mistakeActor} is not an actor`);
          for (const opt of node.ask?.opts || []) {
            if (!opt.actorId) errs.push(`node ${nodeId} spot-mistake option ${opt.id || "unknown"} missing actorId`);
            else if (!actorIds.has(opt.actorId)) errs.push(`node ${nodeId} spot-mistake option ${opt.id || "unknown"} actorId ${opt.actorId} is not an actor`);
            if (opt.ok && mistakeActor && opt.actorId !== mistakeActor) {
              errs.push(`node ${nodeId} correct spot-mistake option must match mistakeActor`);
            }
          }
        }
        for (const band of play.ageBands || []) {
          const available = kindsForAge(band).includes(kind);
          if (!available && ["U7", "U9"].includes(band)) {
            errs.push(`node ${nodeId} kind ${kind} is not available at ${band}`);
          } else if (!available) {
            warns.push(`node ${nodeId} kind ${kind} falls back to read-mc at ${band}`);
          }
        }
      }
    }
  }

  for (const [nodeId, node] of Object.entries(play.nodes || {})) {
    if (!node.autoNext || node.terminal) continue;
    const info = watchChainInfo(play, nodeId);
    if (info.cyclic) errs.push(`node ${nodeId} starts a cyclic watch chain`);
    else if (info.length > 3) errs.push(`node ${nodeId} starts a watch chain longer than 3`);
  }

  if (terminalCount === 0) errs.push("play must include at least one terminal node");
  return { ok: errs.length === 0, errs, warns };
}

