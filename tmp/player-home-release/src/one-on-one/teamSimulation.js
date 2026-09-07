import { NHL_200X85_PROFILE, normalizeFacingRadians } from "../scenario-engine/rinkFrame.js";
import { sampleDraft, validateDraft } from "./director.js";

// Bounded game-feel values for this development preview. They are not sourced
// or validated skating, passing, shooting, goalie, or age-band performance data.
export const TEAM_TUNING = Object.freeze({
  skaterAcceleration: 6,
  skaterTopSpeed: 7.2,
  skaterBrake: 4,
  goalieAcceleration: 5,
  goalieTopSpeed: 2.6,
  goalieBrake: 6,
  passSpeed: 13,
  shotSpeed: 19,
  puckDrag: 0.28,
  passReceiveRadius: 1.05,
  interceptionRadius: 1.15,
  stealRadius: 0.72,
  goalieSaveRadius: 0.78,
  actionCooldown: 0.3,
});

const { bounds, landmarks } = NHL_200X85_PROFILE;
const GOAL_LINE_RIGHT = landmarks.goalLineRight[0];
const GOAL_HALF_WIDTH = 0.9144;
const RINK_CORNER_RADIUS = 8.5344;
const SKATER_MARGIN = 0.55;
const PUCK_MARGIN = 0.08;
const CARRY_OFFSET = Object.freeze({ forward: 1, lateral: 0.7 });

function cloneState(state) {
  return {
    ...state,
    actors: state.actors.map((actor) => ({ ...actor })),
    puck: { ...state.puck },
    events: (state.events ?? []).map((event) => ({ ...event })),
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function validControl(value) {
  return typeof value === "number" && Number.isFinite(value) ? clamp(value, -1, 1) : 0;
}

function directionOf(team) {
  return team === "home" ? 1 : -1;
}

function constrainToRoundedRink(xValue, yValue, margin) {
  let x = clamp(xValue, bounds.minX + margin, bounds.maxX - margin);
  let y = clamp(yValue, bounds.minY + margin, bounds.maxY - margin);
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
  if (cornerX !== null && cornerY !== null) {
    const dx = x - cornerX;
    const dy = y - cornerY;
    const distance = Math.hypot(dx, dy);
    const radius = RINK_CORNER_RADIUS - margin;
    if (distance > radius) {
      x = cornerX + dx * radius / distance;
      y = cornerY + dy * radius / distance;
    }
  }
  return { x, y };
}

function normalizedDirection(x, y) {
  const length = Math.hypot(x, y);
  if (length <= 1) return { x, y, magnitude: length };
  return { x: x / length, y: y / length, magnitude: 1 };
}

function boundActor(actor, margin = SKATER_MARGIN) {
  const bounded = constrainToRoundedRink(actor.x, actor.y, margin);
  const hitX = Math.abs(bounded.x - actor.x) > 1e-10;
  const hitY = Math.abs(bounded.y - actor.y) > 1e-10;
  return { ...actor, x: bounded.x, y: bounded.y, vx: hitX ? 0 : actor.vx, vy: hitY ? 0 : actor.vy };
}

function steer(actor, control, dt, goalie = false) {
  if (actor.frozen) return { ...actor, vx: 0, vy: 0 };
  const direction = normalizedDirection(control.x, control.y);
  const topSpeed = goalie ? TEAM_TUNING.goalieTopSpeed : TEAM_TUNING.skaterTopSpeed;
  const acceleration = goalie ? TEAM_TUNING.goalieAcceleration : TEAM_TUNING.skaterAcceleration;
  const brake = goalie ? TEAM_TUNING.goalieBrake : TEAM_TUNING.skaterBrake;
  const targetVx = direction.x * topSpeed;
  const targetVy = direction.y * topSpeed;
  const dx = targetVx - actor.vx;
  const dy = targetVy - actor.vy;
  const delta = Math.hypot(dx, dy);
  const maxDelta = (direction.magnitude > 0 ? acceleration : brake) * dt;
  const scale = delta > maxDelta && delta > 0 ? maxDelta / delta : 1;
  const vx = actor.vx + dx * scale;
  const vy = actor.vy + dy * scale;
  const speed = Math.hypot(vx, vy);
  const facing = speed > 0.05 ? normalizeFacingRadians(Math.atan2(vy, vx)) : actor.facing;
  return boundActor({ ...actor, x: actor.x + vx * dt, y: actor.y + vy * dt, vx, vy, facing });
}

function toward(actor, target, scale = 1) {
  const dx = target.x - actor.x;
  const dy = target.y - actor.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.05) return { x: 0, y: 0 };
  return { x: dx / distance * scale, y: dy / distance * scale };
}

function carryPoint(owner) {
  const cos = Math.cos(owner.facing);
  const sin = Math.sin(owner.facing);
  return constrainToRoundedRink(
    owner.x + cos * CARRY_OFFSET.forward - sin * CARRY_OFFSET.lateral,
    owner.y + sin * CARRY_OFFSET.forward + cos * CARRY_OFFSET.lateral,
    PUCK_MARGIN,
  );
}

function pushEvent(state, type, details = {}) {
  state.events.push({ type, time: state.time, ...details });
}

export function createTeamGame(draft) {
  const validation = validateDraft(draft);
  if (!validation.ok) throw new TypeError(`invalid team draft: ${validation.errs.join("; ")}`);
  const frame = sampleDraft(draft, 0);
  const owner = frame.actors.find(({ id }) => id === frame.puck.owner);
  const selected = owner?.role === "skater"
    ? owner
    : frame.actors.find(({ team, role }) => team === "home" && role === "skater")
      ?? frame.actors.find(({ role }) => role === "skater");
  return {
    ...frame,
    tick: 0,
    selectedId: selected?.id ?? null,
    outcome: null,
    events: [],
    actionCooldown: 0,
    passTargetId: null,
    passTeam: null,
    shotTeam: null,
    draftVersion: draft.version,
  };
}

function switchSelection(state) {
  const selected = state.actors.find(({ id }) => id === state.selectedId);
  const team = selected?.team ?? state.actors.find(({ role }) => role === "skater")?.team;
  const skaters = state.actors.filter((actor) => actor.team === team && actor.role === "skater");
  if (skaters.length === 0) return;
  const index = skaters.findIndex(({ id }) => id === state.selectedId);
  state.selectedId = skaters[(index + 1 + skaters.length) % skaters.length].id;
  pushEvent(state, "selection-switched", { actorId: state.selectedId });
}

function choosePassTarget(state, owner) {
  const direction = directionOf(owner.team);
  return state.actors
    .filter((actor) => actor.team === owner.team && actor.role === "skater" && actor.id !== owner.id)
    .map((actor) => ({
      actor,
      progress: (actor.x - owner.x) * direction,
      distance: Math.hypot(actor.x - owner.x, actor.y - owner.y),
    }))
    .sort((a, b) => b.progress - a.progress || a.distance - b.distance || a.actor.id.localeCompare(b.actor.id))[0]?.actor ?? null;
}

function launchToward(puck, target, speed) {
  const dx = target.x - puck.x;
  const dy = target.y - puck.y;
  const distance = Math.hypot(dx, dy) || 1;
  puck.owner = null;
  puck.vx = dx / distance * speed;
  puck.vy = dy / distance * speed;
}

function applyAction(state, action) {
  if (action === "switch") {
    switchSelection(state);
    return;
  }
  if (state.actionCooldown > 0) return;
  const selected = state.actors.find(({ id }) => id === state.selectedId);
  if (!selected || state.puck.owner !== selected.id) return;
  if (action === "pass") {
    const target = choosePassTarget(state, selected);
    if (!target) return;
    const origin = carryPoint(selected);
    Object.assign(state.puck, origin);
    launchToward(state.puck, target, TEAM_TUNING.passSpeed);
    state.passTargetId = target.id;
    state.passTeam = selected.team;
    state.shotTeam = null;
    state.actionCooldown = TEAM_TUNING.actionCooldown;
    pushEvent(state, "pass", { actorId: selected.id, targetId: target.id });
  } else if (action === "shoot") {
    const direction = directionOf(selected.team);
    const origin = carryPoint(selected);
    Object.assign(state.puck, origin);
    launchToward(state.puck, { x: direction * (GOAL_LINE_RIGHT + 0.45), y: 0 }, TEAM_TUNING.shotSpeed);
    state.passTargetId = null;
    state.passTeam = null;
    state.shotTeam = selected.team;
    state.actionCooldown = TEAM_TUNING.actionCooldown;
    pushEvent(state, "shot", { actorId: selected.id });
  }
}

function moveActors(state, input, dt) {
  const owner = state.actors.find(({ id }) => id === state.puck.owner) ?? null;
  const possessionTeam = owner?.team ?? state.passTeam ?? state.shotTeam;
  const focal = owner ?? { x: state.puck.x, y: state.puck.y, team: possessionTeam ?? "home" };
  const attackingDirection = directionOf(possessionTeam ?? "home");
  const supportCounts = { home: 0, away: 0 };
  state.actors = state.actors.map((actor) => {
    if (actor.frozen) return { ...actor, vx: 0, vy: 0 };
    if (actor.role === "goalie") {
      const homeX = actor.team === "home" ? -Math.abs(actor.x) : Math.abs(actor.x);
      const target = { x: homeX, y: clamp(focal.y, -3.4, 3.4) };
      return steer(actor, toward(actor, target), dt, true);
    }
    if (actor.id === state.selectedId) {
      return steer(actor, { x: validControl(input.moveX), y: validControl(input.moveY) }, dt);
    }
    if (actor.id === state.puck.owner) {
      return steer(actor, { x: directionOf(actor.team), y: clamp(-actor.y / 8, -0.5, 0.5) }, dt);
    }
    if (possessionTeam && actor.team === possessionTeam) {
      const ordinal = supportCounts[actor.team]++;
      const side = ordinal % 2 === 0 ? 1 : -1;
      const rank = Math.floor(ordinal / 2);
      const target = {
        x: focal.x - attackingDirection * (3 + rank * 2.5),
        y: focal.y + side * (4 + rank * 1.5),
      };
      return steer(actor, toward(actor, target, 0.82), dt);
    }
    if (possessionTeam && actor.team !== possessionTeam) {
      const ordinal = supportCounts[actor.team]++;
      const side = ordinal % 2 === 0 ? 1 : -1;
      const target = {
        x: focal.x + attackingDirection * (1.8 + Math.floor(ordinal / 2) * 1.5),
        y: focal.y + side * Math.min(2.4 + ordinal, 5),
      };
      return steer(actor, toward(actor, target, 0.9), dt);
    }
    return steer(actor, { x: 0, y: 0 }, dt);
  });
}

function segmentDistance(x1, y1, x2, y2, px, py) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared > 0 ? clamp(((px - x1) * dx + (py - y1) * dy) / lengthSquared, 0, 1) : 0;
  return { distance: Math.hypot(x1 + dx * t - px, y1 + dy * t - py), t };
}

function sweptGoalCrossing(x1, y1, x2, y2, direction) {
  const goalX = direction * GOAL_LINE_RIGHT;
  if ((direction > 0 && (x1 > goalX || x2 < goalX)) || (direction < 0 && (x1 < goalX || x2 > goalX)) || x2 === x1) {
    return null;
  }
  const t = (goalX - x1) / (x2 - x1);
  if (t < 0 || t > 1) return null;
  return y1 + (y2 - y1) * t;
}

function resolveShot(state, prior) {
  const shootingTeam = state.shotTeam;
  if (!shootingTeam) return false;
  const defendingTeam = shootingTeam === "home" ? "away" : "home";
  const goalie = state.actors.find((actor) => actor.team === defendingTeam && actor.role === "goalie");
  if (goalie) {
    const sweep = segmentDistance(prior.x, prior.y, state.puck.x, state.puck.y, goalie.x, goalie.y);
    if (sweep.distance <= TEAM_TUNING.goalieSaveRadius) {
      state.puck.x = prior.x + (state.puck.x - prior.x) * sweep.t;
      state.puck.y = prior.y + (state.puck.y - prior.y) * sweep.t;
      state.puck.vx = 0;
      state.puck.vy = 0;
      state.outcome = "save";
      pushEvent(state, "save", { actorId: goalie.id });
      return true;
    }
  }
  const direction = directionOf(shootingTeam);
  const crossingY = sweptGoalCrossing(prior.x, prior.y, state.puck.x, state.puck.y, direction);
  if (crossingY !== null && Math.abs(crossingY) <= GOAL_HALF_WIDTH) {
    state.puck.x = direction * GOAL_LINE_RIGHT;
    state.puck.y = crossingY;
    state.puck.vx = 0;
    state.puck.vy = 0;
    state.outcome = `goal-${shootingTeam}`;
    pushEvent(state, "goal", { team: shootingTeam });
    return true;
  }
  return false;
}

function resolvePass(state, prior) {
  if (!state.passTargetId || !state.passTeam) return false;
  const candidates = state.actors
    .filter((actor) => actor.role === "skater" && (actor.team !== state.passTeam || actor.id === state.passTargetId))
    .map((actor) => {
      const sweep = segmentDistance(prior.x, prior.y, state.puck.x, state.puck.y, actor.x, actor.y);
      const radius = actor.team === state.passTeam ? TEAM_TUNING.passReceiveRadius : TEAM_TUNING.interceptionRadius;
      return { actor, ...sweep, radius };
    })
    .filter(({ distance, radius }) => distance <= radius)
    .sort((a, b) => a.t - b.t || (a.actor.team === state.passTeam ? 1 : -1) || a.actor.id.localeCompare(b.actor.id));
  const reached = candidates[0];
  if (!reached) return false;
  state.puck.owner = reached.actor.id;
  state.puck.vx = reached.actor.vx;
  state.puck.vy = reached.actor.vy;
  const type = reached.actor.team === state.passTeam ? "receive" : "interception";
  pushEvent(state, type, { actorId: reached.actor.id, targetId: state.passTargetId });
  state.passTargetId = null;
  state.passTeam = null;
  state.shotTeam = null;
  return true;
}

function resolvePossessionContact(state) {
  const owner = state.actors.find(({ id }) => id === state.puck.owner);
  if (!owner) return;
  const challenger = state.actors
    .filter((actor) => actor.role === "skater" && actor.team !== owner.team)
    .map((actor) => ({ actor, distance: Math.hypot(actor.x - owner.x, actor.y - owner.y) }))
    .sort((a, b) => a.distance - b.distance || a.actor.id.localeCompare(b.actor.id))[0];
  if (challenger && challenger.distance <= TEAM_TUNING.stealRadius) {
    state.puck.owner = challenger.actor.id;
    pushEvent(state, "turnover", { actorId: challenger.actor.id, fromId: owner.id });
  }
}

function movePuck(state, dt) {
  const owner = state.actors.find(({ id }) => id === state.puck.owner);
  if (owner) {
    const point = carryPoint(owner);
    Object.assign(state.puck, point, { vx: owner.vx, vy: owner.vy });
    return;
  }
  const prior = { x: state.puck.x, y: state.puck.y };
  state.puck.x += state.puck.vx * dt;
  state.puck.y += state.puck.vy * dt;
  const drag = Math.max(0, 1 - TEAM_TUNING.puckDrag * dt);
  state.puck.vx *= drag;
  state.puck.vy *= drag;
  if (resolveShot(state, prior) || resolvePass(state, prior)) return;
  const bounded = constrainToRoundedRink(state.puck.x, state.puck.y, PUCK_MARGIN);
  if (Math.abs(bounded.x - state.puck.x) > 1e-10) state.puck.vx *= -0.38;
  if (Math.abs(bounded.y - state.puck.y) > 1e-10) state.puck.vy *= -0.38;
  state.puck.x = bounded.x;
  state.puck.y = bounded.y;
}

function acquireLoosePuck(state){
  if(state.puck.owner||((state.shotTeam||state.passTargetId)&&Math.hypot(state.puck.vx,state.puck.vy)>1.5))return;
  const candidate=state.actors.filter(a=>a.role==='skater').map(a=>({a,d:Math.hypot(a.x-state.puck.x,a.y-state.puck.y)})).filter(c=>c.d<=TEAM_TUNING.passReceiveRadius).sort((a,b)=>a.d-b.d||a.a.id.localeCompare(b.a.id))[0];
  if(!candidate)return;
  state.puck.owner=candidate.a.id;state.passTargetId=null;state.passTeam=null;state.shotTeam=null;
  pushEvent(state,'pickup',{actorId:candidate.a.id});
}

export function stepTeamGame(state, input = {}, dt = 1 / 60) {
  if (typeof dt !== "number" || !Number.isFinite(dt) || dt <= 0 || dt > 0.25) {
    throw new RangeError("dt must be a finite number greater than zero and at most 0.25 seconds");
  }
  const next = cloneState(state);
  if (next.outcome) return next;
  next.time += dt;
  next.tick += 1;
  next.actionCooldown = Math.max(0, next.actionCooldown - dt);
  applyAction(next, input.action);
  moveActors(next, input, dt);
  movePuck(next, dt);
  if(!next.outcome)acquireLoosePuck(next);
  if (!next.outcome && next.puck.owner) {
    resolvePossessionContact(next);
    const owner = next.actors.find(({ id }) => id === next.puck.owner);
    if (owner) {
      const point = carryPoint(owner);
      Object.assign(next.puck, point, { vx: owner.vx, vy: owner.vy });
    }
  }
  return next;
}
