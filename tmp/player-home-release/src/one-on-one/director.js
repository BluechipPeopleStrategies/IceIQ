import { NHL_200X85_PROFILE, normalizeFacingRadians } from "../scenario-engine/rinkFrame.js";

export const DRAFT_VERSION = "rinkreads-director-draft-v1";

const RINK_CORNER_RADIUS = 8.5344;
const CARRY_OFFSET = Object.freeze({ forward: 1, lateral: 0.7 });
const VALID_TEAMS = new Set(["home", "away"]);
const VALID_ROLES = new Set(["skater", "goalie"]);
const { bounds, landmarks } = NHL_200X85_PROFILE;

function finiteNumber(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${field} must be a finite number`);
  }
  return value;
}

function wholeNumber(value, field, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${field} must be a whole number from ${min} to ${max}`);
  }
  return value;
}

function cloneDraft(draft) {
  return {
    ...draft,
    actors: (draft.actors ?? []).map((actor) => ({
      ...actor,
      keys: (actor.keys ?? []).map((key) => ({ ...key })),
      fixedPose: actor.fixedPose ? { ...actor.fixedPose } : null,
    })),
    puck: { ...draft.puck },
    sourceRef: draft.sourceRef && typeof draft.sourceRef === "object"
      ? structuredClone(draft.sourceRef)
      : draft.sourceRef,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isInsideRoundedRink(x, y) {
  if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY) return false;
  const cornerX = x < bounds.minX + RINK_CORNER_RADIUS
    ? bounds.minX + RINK_CORNER_RADIUS
    : x > bounds.maxX - RINK_CORNER_RADIUS
      ? bounds.maxX - RINK_CORNER_RADIUS
      : null;
  const cornerY = y < bounds.minY + RINK_CORNER_RADIUS
    ? bounds.minY + RINK_CORNER_RADIUS
    : y > bounds.maxY - RINK_CORNER_RADIUS
      ? bounds.maxY - RINK_CORNER_RADIUS
      : null;
  return cornerX === null || cornerY === null
    || Math.hypot(x - cornerX, y - cornerY) <= RINK_CORNER_RADIUS + 1e-9;
}

function assertTeamRole(team, role) {
  if (!VALID_TEAMS.has(team)) throw new RangeError("team must be home or away");
  if (!VALID_ROLES.has(role)) throw new RangeError("role must be skater or goalie");
}

function defaultPose(team, role, ordinal, count = 1) {
  if (role === "goalie") {
    const right = landmarks.goalieRight;
    const point = team === "home" ? [-right[0], right[1]] : right;
    return { x: point[0], y: (ordinal - 1) * 2, facing: team === "home" ? 0 : Math.PI };
  }
  const y = count === 1 ? 0 : (ordinal - (count + 1) / 2) * 4;
  return { x: team === "home" ? -12 : 12, y, facing: team === "home" ? 0 : Math.PI };
}

function makeActor(team, role, ordinal, count) {
  const pose = defaultPose(team, role, ordinal, count);
  const prefix = team === "home" ? "H" : "A";
  return {
    id: `${team}-${role}-${ordinal}`,
    label: role === "goalie" ? `${prefix}G${ordinal > 1 ? ordinal : ""}` : `${prefix}${ordinal}`,
    team,
    role,
    keys: [{ time: 0, ...pose }],
    frozen: false,
    fixedPose: null,
  };
}

export function createDraft(home = 2, away = 2) {
  wholeNumber(home, "home", 1, 6);
  wholeNumber(away, "away", 1, 6);
  const actors = [];
  for (const [team, count] of [["home", home], ["away", away]]) {
    for (let ordinal = 1; ordinal <= count; ordinal += 1) {
      actors.push(makeActor(team, "skater", ordinal, count));
    }
    actors.push(makeActor(team, "goalie", 1, 1));
  }
  return {
    version: DRAFT_VERSION,
    title: `${home}v${away} practice draft`,
    duration: 8,
    actors,
    puck: { owner: "home-skater-1" },
    sourceRef: null,
    status: "development-not-validated",
  };
}

export function addActor(draft, team, role = "skater") {
  assertTeamRole(team, role);
  const next = cloneDraft(draft);
  const matching = next.actors.filter((actor) => actor.team === team && actor.role === role);
  const limit = role === "skater" ? 6 : 2;
  if (matching.length >= limit) {
    throw new RangeError(role === "skater" ? "a side cannot have more than six skaters" : "a side cannot have more than two goalies");
  }
  const usedOrdinals = new Set(matching.map(({ id }) => Number(id.match(/-(\d+)$/)?.[1])).filter(Number.isFinite));
  let ordinal = 1;
  while (usedOrdinals.has(ordinal)) ordinal += 1;
  next.actors.push(makeActor(team, role, ordinal, matching.length + 1));
  if (!next.puck.owner && role === "skater") next.puck.owner = `${team}-${role}-${ordinal}`;
  return next;
}

export function removeActor(draft, id) {
  const actor = draft.actors?.find((candidate) => candidate.id === id);
  if (!actor) throw new RangeError(`unknown actor: ${id}`);
  if (actor.role === "skater") {
    const teamSkaters = draft.actors.filter(({ team, role }) => team === actor.team && role === "skater");
    if (teamSkaters.length <= 1) throw new RangeError("each side must retain at least one skater");
  }
  const next = cloneDraft(draft);
  next.actors = next.actors.filter((candidate) => candidate.id !== id);
  if (next.puck.owner === id) {
    next.puck.owner = next.actors.find(({ role, team }) => role === "skater" && team === actor.team)?.id
      ?? next.actors.find(({ role }) => role === "skater")?.id
      ?? null;
  }
  return next;
}

function assertPose(pose, field = "pose") {
  if (!pose || typeof pose !== "object" || Array.isArray(pose)) throw new TypeError(`${field} must be an object`);
  const x = finiteNumber(pose.x, `${field}.x`);
  const y = finiteNumber(pose.y, `${field}.y`);
  const facing = finiteNumber(pose.facing, `${field}.facing`);
  if (!isInsideRoundedRink(x, y)) throw new RangeError(`${field} is outside the rounded playable rink`);
  return { x, y, facing: normalizeFacingRadians(facing) };
}

export function putKey(draft, id, time, pose) {
  const keyTime = finiteNumber(time, "time");
  if (keyTime < 0 || keyTime > draft.duration) throw new RangeError("time must be within the draft duration");
  const normalizedPose = assertPose(pose);
  const next = cloneDraft(draft);
  const actor = next.actors.find((candidate) => candidate.id === id);
  if (!actor) throw new RangeError(`unknown actor: ${id}`);
  const withoutSameTime = actor.keys.filter((key) => Math.abs(key.time - keyTime) > 1e-9);
  actor.keys = [...withoutSameTime, { time: keyTime, ...normalizedPose }].sort((a, b) => a.time - b.time);
  return next;
}

function shortestAngleDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function sampleActor(actor, time) {
  if (actor.frozen && actor.fixedPose) {
    return { ...actor.fixedPose, vx: 0, vy: 0, facing: normalizeFacingRadians(actor.fixedPose.facing) };
  }
  const keys = actor.keys;
  if (time <= keys[0].time) return { ...keys[0], vx: 0, vy: 0 };
  const last = keys.at(-1);
  if (time >= last.time) return { ...last, vx: 0, vy: 0 };
  const upperIndex = keys.findIndex((key) => key.time > time);
  const from = keys[upperIndex - 1];
  const to = keys[upperIndex];
  const duration = to.time - from.time;
  const progress = (time - from.time) / duration;
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    vx: (to.x - from.x) / duration,
    vy: (to.y - from.y) / duration,
    facing: normalizeFacingRadians(from.facing + shortestAngleDelta(from.facing, to.facing) * progress),
  };
}

export function setFrozen(draft, id, frozen, time = 0) {
  if (typeof frozen !== "boolean") throw new TypeError("frozen must be a boolean");
  const sampledTime = clamp(finiteNumber(time, "time"), 0, draft.duration);
  const frame = sampleDraft(draft, sampledTime);
  const sampled = frame.actors.find((actor) => actor.id === id);
  if (!sampled) throw new RangeError(`unknown actor: ${id}`);
  const next = cloneDraft(draft);
  const actor = next.actors.find((candidate) => candidate.id === id);
  actor.frozen = frozen;
  actor.fixedPose = frozen ? { x: sampled.x, y: sampled.y, facing: sampled.facing } : null;
  return next;
}

function carryPoint(owner) {
  const cos = Math.cos(owner.facing);
  const sin = Math.sin(owner.facing);
  return {
    x: owner.x + cos * CARRY_OFFSET.forward - sin * CARRY_OFFSET.lateral,
    y: owner.y + sin * CARRY_OFFSET.forward + cos * CARRY_OFFSET.lateral,
  };
}

export function sampleDraft(draft, time) {
  const sampledTime = clamp(finiteNumber(time, "time"), 0, draft.duration);
  const actors = draft.actors.map((actor) => {
    const sampled = sampleActor(actor, sampledTime);
    return {
      id: actor.id,
      label: actor.label,
      team: actor.team,
      role: actor.role,
      x: sampled.x,
      y: sampled.y,
      vx: sampled.vx,
      vy: sampled.vy,
      facing: sampled.facing,
      frozen: actor.frozen,
    };
  });
  const owner = actors.find(({ id }) => id === draft.puck.owner) ?? null;
  const point = owner ? carryPoint(owner) : { x: 0, y: 0 };
  return {
    actors,
    puck: {
      x: point.x,
      y: point.y,
      vx: owner?.vx ?? 0,
      vy: owner?.vy ?? 0,
      owner: owner?.id ?? null,
    },
    time: sampledTime,
  };
}

export function validateDraft(draft) {
  const errs = [];
  const warns = [];
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    return { ok: false, errs: ["draft must be an object"], warns };
  }
  if (draft.version !== DRAFT_VERSION) errs.push(`version must be ${DRAFT_VERSION}`);
  if (typeof draft.title !== "string" || !draft.title.trim()) errs.push("title must be a non-empty string");
  if (typeof draft.duration !== "number" || !Number.isFinite(draft.duration) || draft.duration <= 0 || draft.duration > 60) {
    errs.push("duration must be a positive finite number up to 60 seconds");
  }
  if(draft.sourceRef!==null&&draft.sourceRef!==undefined){
    if(typeof draft.sourceRef!=='object'||Array.isArray(draft.sourceRef))errs.push('sourceRef must be an object or null');
    else for(const field of ['id','nodeId','note'])if(draft.sourceRef[field]!==undefined&&typeof draft.sourceRef[field]!=='string')errs.push(`sourceRef.${field} must be text`);
  }
  if (draft.status !== "development-not-validated") errs.push("status must be development-not-validated");
  if (!Array.isArray(draft.actors)) errs.push("actors must be an array");
  const actors = Array.isArray(draft.actors) ? draft.actors : [];
  const ids = new Set();
  for (const [index, actor] of actors.entries()) {
    const prefix = `actors[${index}]`;
    if (!actor || typeof actor !== "object") {
      errs.push(`${prefix} must be an object`);
      continue;
    }
    if (typeof actor.id !== "string" || !actor.id) errs.push(`${prefix}.id must be a non-empty string`);
    else if (ids.has(actor.id)) errs.push("actor IDs must be unique");
    else ids.add(actor.id);
    if (typeof actor.label !== "string" || !actor.label) errs.push(`${prefix}.label must be a non-empty string`);
    if (!VALID_TEAMS.has(actor.team)) errs.push(`${prefix}.team must be home or away`);
    if (!VALID_ROLES.has(actor.role)) errs.push(`${prefix}.role must be skater or goalie`);
    if (typeof actor.frozen !== "boolean") errs.push(`${prefix}.frozen must be boolean`);
    if (!Array.isArray(actor.keys) || actor.keys.length === 0 || actor.keys.length > 2401) {
      errs.push(`${prefix}.keys must contain from one through 2401 keys`);
    } else {
      let priorTime = -Infinity;
      for (const key of actor.keys) {
        if (!key || typeof key !== "object") {
          errs.push(`${prefix} key must be an object`);
          continue;
        }
        if (!Number.isFinite(key.time) || key.time < 0 || key.time > draft.duration) errs.push(`${prefix} key time is outside duration`);
        if (key.time <= priorTime) errs.push(`${prefix} key times must be strictly increasing`);
        priorTime = key.time;
        if (![key.x, key.y, key.facing].every(Number.isFinite)) errs.push(`${prefix} key pose must be finite`);
        else if (!isInsideRoundedRink(key.x, key.y)) errs.push(`${prefix} key is outside the rounded playable rink`);
      }
    }
    if (actor.frozen) {
      if (!actor.fixedPose || ![actor.fixedPose.x, actor.fixedPose.y, actor.fixedPose.facing].every(Number.isFinite)) {
        errs.push(`${prefix}.fixedPose is required when frozen`);
      } else if (!isInsideRoundedRink(actor.fixedPose.x, actor.fixedPose.y)) {
        errs.push(`${prefix}.fixedPose is outside the rounded playable rink`);
      }
    }
  }
  for (const team of VALID_TEAMS) {
    const skaters = actors.filter((actor) => actor?.team === team && actor?.role === "skater").length;
    if (skaters < 1 || skaters > 6) errs.push(`${team} must have from one through six skaters`);
    const goalies = actors.filter((actor) => actor?.team === team && actor?.role === "goalie").length;
    if (goalies > 2) errs.push(`${team} cannot have more than two goalies`);
  }
  if (!draft.puck || typeof draft.puck !== "object") errs.push("puck must be an object");
  else if (draft.puck.owner !== null && !ids.has(draft.puck.owner)) errs.push("puck owner must reference an existing actor or be null");
  else if (draft.puck.owner !== null && draft.actors.find(actor => actor.id === draft.puck.owner)?.role !== 'skater') errs.push('puck owner must be a skater; goalie possession is not supported in live practice');
  return { ok: errs.length === 0, errs, warns };
}
