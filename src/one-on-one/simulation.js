import { NHL_200X85_PROFILE, normalizeFacingRadians } from "../scenario-engine/rinkFrame.js";

export const DT = 1 / 60;
export const DEFAULT_SETUP = Object.freeze({
  pressure: "contain",
  gap: 5,
  lane: 3,
  speed: 4,
  role: "attacker",
});
export const CARRY_OFFSET = Object.freeze({ forward: 1, lateral: 0.7 });

// These are game-feel tuning values for the development preview. They are not
// measured or validated U11/U13 performance limits.
const TUNING = Object.freeze({
  attackerAcceleration: 5.5,
  attackerTopSpeed: 7.4,
  defenderAcceleration: 5.9,
  defenderTopSpeed: 7.0,
  goalieAcceleration: 6.0,
  goalieTopSpeed: 2.8,
  skaterBrake: 3.4,
  goalieBrake: 7.0,
  shotSpeed: 17.5,
  puckDrag: 0.36,
  goalieSaveRadius: 0.66,
  pokeReach: 1.65,
  contactReach: 0.68,
  actionCooldown: 0.65,
  repetitionSeconds: 10,
});

const { bounds, landmarks } = NHL_200X85_PROFILE;
const GOAL_LINE_X = landmarks.goalLineRight[0];
const GOAL_CENTER_Y = landmarks.goalLineRight[1];
const GOALIE_HOME_X = landmarks.goalieRight[0];
const GOAL_HALF_WIDTH = 0.9144; // Six-foot opening, in canonical metres.
const RINK_CORNER_RADIUS = 8.5344;
const SKATER_MARGIN = 0.55;
const PUCK_MARGIN = 0.08;
const ATTACKER_MARGIN = Math.hypot(CARRY_OFFSET.forward, CARRY_OFFSET.lateral) + PUCK_MARGIN;
const PRESSURES = new Set(["contain", "pressure", "passive"]);
const ROLES = new Set(["attacker", "defender"]);
const CHOICES = new Set(["inside", "outside", "shoot"]);
const OPTIONAL_POSITION_FIELDS = ["attackerX", "attackerY", "defenderX", "defenderY"];

function finiteNumber(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${field} must be a finite number`);
  }
  return value;
}

function boundedNumber(value, field, min, max) {
  const number = finiteNumber(value, field);
  if (number < min || number > max) {
    throw new RangeError(`${field} must be between ${min} and ${max}`);
  }
  return number;
}

export function normalizeSetup(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("setup must be an object");
  }

  const pressure = input.pressure ?? DEFAULT_SETUP.pressure;
  const role = input.role ?? DEFAULT_SETUP.role;
  if (!PRESSURES.has(pressure)) {
    throw new RangeError(`pressure must be contain, pressure, or passive`);
  }
  if (!ROLES.has(role)) {
    throw new RangeError(`role must be attacker or defender`);
  }

  const result = {
    pressure,
    gap: boundedNumber(input.gap ?? DEFAULT_SETUP.gap, "gap", 0.5, 12),
    lane: boundedNumber(input.lane ?? DEFAULT_SETUP.lane, "lane", -10, 10),
    speed: boundedNumber(input.speed ?? DEFAULT_SETUP.speed, "speed", 0, 8),
    role,
  };

  for (const field of OPTIONAL_POSITION_FIELDS) {
    if (input[field] === undefined) continue;
    const isX = field.endsWith("X");
    const value = finiteNumber(input[field], field);
    const min = isX ? bounds.minX : bounds.minY;
    const max = isX ? bounds.maxX : bounds.maxY;
    if (value < min || value > max) {
      throw new RangeError(`${field} is outside rink bounds`);
    }
    result[field] = value;
  }

  const defaultAttackerX = landmarks.highSlotRight[0] - 3.5;
  const attackerX = result.attackerX ?? defaultAttackerX;
  const attackerY = result.attackerY ?? result.lane;
  const defenderX = result.defenderX
    ?? clamp(attackerX + result.gap, bounds.minX + SKATER_MARGIN, GOALIE_HOME_X - 1.25);
  const defenderY = result.defenderY ?? GOAL_CENTER_Y;
  for (const [name, x, y, margin] of [
    ["attacker", attackerX, attackerY, ATTACKER_MARGIN],
    ["defender", defenderX, defenderY, SKATER_MARGIN],
  ]) {
    if (!isInsideRoundedRink(x, y, margin)) {
      throw new RangeError(`${name} start is outside the rounded playable rink envelope`);
    }
  }

  return result;
}

function normalizeSeed(seed) {
  finiteNumber(seed, "seed");
  return Math.trunc(seed) >>> 0;
}

function actor(x, y, vx = 0, vy = 0, facing = 0) {
  return { x, y, vx, vy, facing };
}

export function createGame(setup = DEFAULT_SETUP, seed = 7) {
  const normalized = normalizeSetup(setup);
  const attackerX = normalized.attackerX ?? landmarks.highSlotRight[0] - 3.5;
  const attackerY = normalized.attackerY ?? normalized.lane;
  const defenderX = normalized.defenderX
    ?? clamp(attackerX + normalized.gap, bounds.minX + SKATER_MARGIN, GOALIE_HOME_X - 1.25);
  const defenderY = normalized.defenderY ?? GOAL_CENTER_Y;
  const initialSpeed = normalized.speed;

  const attackerState = actor(attackerX, attackerY, initialSpeed, 0, 0);
  const carry = carryPoint(attackerState);
  return {
    time: 0,
    tick: 0,
    seed: normalizeSeed(seed),
    setup: normalized,
    attacker: attackerState,
    defender: actor(defenderX, defenderY, 0, 0, Math.PI),
    goalie: actor(GOALIE_HOME_X, GOAL_CENTER_Y, 0, 0, Math.PI),
    puck: { x: carry.x, y: carry.y, vx: initialSpeed, vy: 0, owner: "attacker" },
    outcome: null,
    events: [],
    actionAt: null,
    shotAt: null,
    choice: null,
    choiceAt: null,
  };
}

function cloneState(state) {
  return {
    ...state,
    setup: { ...state.setup },
    attacker: { ...state.attacker },
    defender: { ...state.defender },
    goalie: { ...state.goalie },
    puck: { ...state.puck },
    events: (state.events ?? []).map((event) => ({ ...event })),
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function constrainToRoundedRink(xValue, yValue, margin) {
  let x = clamp(xValue, bounds.minX + margin, bounds.maxX - margin);
  let y = clamp(yValue, bounds.minY + margin, bounds.maxY - margin);
  const leftCornerX = bounds.minX + RINK_CORNER_RADIUS;
  const rightCornerX = bounds.maxX - RINK_CORNER_RADIUS;
  const topCornerY = bounds.minY + RINK_CORNER_RADIUS;
  const bottomCornerY = bounds.maxY - RINK_CORNER_RADIUS;
  const cornerX = x < leftCornerX ? leftCornerX : x > rightCornerX ? rightCornerX : null;
  const cornerY = y < topCornerY ? topCornerY : y > bottomCornerY ? bottomCornerY : null;

  if (cornerX !== null && cornerY !== null) {
    const dx = x - cornerX;
    const dy = y - cornerY;
    const distanceFromCenter = Math.hypot(dx, dy);
    const allowedRadius = RINK_CORNER_RADIUS - margin;
    if (distanceFromCenter > allowedRadius) {
      const scale = allowedRadius / distanceFromCenter;
      x = cornerX + dx * scale;
      y = cornerY + dy * scale;
    }
  }
  return { x, y };
}

function isInsideRoundedRink(x, y, margin) {
  const constrained = constrainToRoundedRink(x, y, margin);
  return Math.abs(constrained.x - x) < 1e-9 && Math.abs(constrained.y - y) < 1e-9;
}

function validControl(value) {
  return typeof value === "number" && Number.isFinite(value) ? clamp(value, -1, 1) : 0;
}

function normalizedDirection(x, y) {
  const length = Math.hypot(x, y);
  if (length <= 1) return { x, y, magnitude: length };
  return { x: x / length, y: y / length, magnitude: 1 };
}

function steer(actorState, control, dt, acceleration, topSpeed, brake, margin = SKATER_MARGIN) {
  const direction = normalizedDirection(control.x, control.y);
  const targetVx = direction.x * topSpeed;
  const targetVy = direction.y * topSpeed;
  const deltaVx = targetVx - actorState.vx;
  const deltaVy = targetVy - actorState.vy;
  const deltaLength = Math.hypot(deltaVx, deltaVy);
  const rate = direction.magnitude > 0 ? acceleration : brake;
  const maxDelta = rate * dt;
  const scale = deltaLength > maxDelta && deltaLength > 0 ? maxDelta / deltaLength : 1;
  const vx = actorState.vx + deltaVx * scale;
  const vy = actorState.vy + deltaVy * scale;
  const speed = Math.hypot(vx, vy);
  const facing = speed > 0.05 ? normalizeFacingRadians(Math.atan2(vy, vx)) : actorState.facing;

  return boundActor({
    ...actorState,
    x: actorState.x + vx * dt,
    y: actorState.y + vy * dt,
    vx,
    vy,
    facing,
  }, margin);
}

function boundActor(actorState, margin) {
  const { x, y } = constrainToRoundedRink(actorState.x, actorState.y, margin);
  return {
    ...actorState,
    x,
    y,
    vx: x !== actorState.x ? 0 : actorState.vx,
    vy: y !== actorState.y ? 0 : actorState.vy,
  };
}

function controlToward(from, target) {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.08) return { x: 0, y: 0 };
  return { x: dx / distance, y: dy / distance };
}

function facingToward(from, target, fallback) {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  return Math.hypot(dx, dy) > 0.001
    ? normalizeFacingRadians(Math.atan2(dy, dx))
    : fallback;
}

function attackerPolicy(state, choice, random) {
  let targetY = GOAL_CENTER_Y;
  let targetX = GOAL_LINE_X + 0.4;
  if (choice === "outside") {
    const side = Math.abs(state.attacker.y) > 0.4
      ? Math.sign(state.attacker.y)
      : (random < 0.5 ? -1 : 1);
    targetY = side * 7;
  } else if (choice === "inside") {
    targetY = GOAL_CENTER_Y;
  } else {
    const defenderClose = distance(state.attacker, state.defender) < 2.8;
    if (defenderClose) {
      const openSide = state.attacker.y === state.defender.y
        ? (random < 0.5 ? -1 : 1)
        : Math.sign(state.attacker.y - state.defender.y);
      targetY = openSide * 6;
      // The demonstration visibly protects the puck instead of skating
      // through a body. This is derived only from the current actor geometry.
      targetX = state.attacker.x - 1.5;
    } else {
      targetY = clamp(state.attacker.y * 0.35, -2.2, 2.2);
    }
  }

  return controlToward(state.attacker, {
    x: targetX,
    y: targetY,
  });
}

function defenderPolicy(state) {
  let target;
  switch (state.setup.pressure) {
    case "pressure":
      target = { x: state.attacker.x + 0.45, y: state.attacker.y };
      break;
    case "passive":
      target = {
        x: clamp(
          state.attacker.x + Math.max(state.setup.gap, 4.5),
          state.attacker.x + 3,
          GOALIE_HOME_X - 1.3,
        ),
        y: clamp(state.attacker.y * 0.28, -2.4, 2.4),
      };
      break;
    default:
      target = {
        x: clamp(state.attacker.x + 2.35, state.attacker.x + 1.2, GOALIE_HOME_X - 2),
        y: clamp(state.attacker.y * 0.62, -4.5, 4.5),
      };
      break;
  }
  return controlToward(state.defender, target);
}

function goaliePolicy(state) {
  const source = state.puck.owner === "attacker" ? state.attacker : state.puck;
  return controlToward(state.goalie, {
    x: GOALIE_HOME_X,
    y: clamp(source.y, GOAL_CENTER_Y - 1.2, GOAL_CENTER_Y + 1.2),
  });
}

function nextRandom(seed) {
  const nextSeed = (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
  return { seed: nextSeed, value: nextSeed / 4294967296 };
}

function hasEvent(state, type) {
  return state.events.some((event) => event.type === type);
}

function pushEvent(state, type, data = {}) {
  state.events.push({ type, time: state.time, ...data });
}

function carryPoint(owner) {
  const cos = Math.cos(owner.facing);
  const sin = Math.sin(owner.facing);
  return {
    x: owner.x + cos * CARRY_OFFSET.forward - sin * CARRY_OFFSET.lateral,
    y: owner.y + sin * CARRY_OFFSET.forward + cos * CARRY_OFFSET.lateral,
  };
}

function actionReady(state) {
  return state.actionAt === null || state.time - state.actionAt >= TUNING.actionCooldown;
}

function shoot(state, random) {
  const puck = state.puck;
  const side = Math.abs(state.attacker.y - state.goalie.y) > 0.35
    ? Math.sign(state.attacker.y - state.goalie.y)
    : (random < 0.5 ? -1 : 1);
  const targetY = clamp(
    state.attacker.y * 0.1 + side * (0.35 + random * 0.38),
    GOAL_CENTER_Y - GOAL_HALF_WIDTH + 0.04,
    GOAL_CENTER_Y + GOAL_HALF_WIDTH - 0.04,
  );
  const origin = carryPoint(state.attacker);
  const originX = origin.x;
  const originY = origin.y;
  const dx = GOAL_LINE_X + 0.35 - originX;
  const dy = targetY - originY;
  const length = Math.hypot(dx, dy) || 1;

  puck.x = originX;
  puck.y = originY;
  puck.vx = dx / length * TUNING.shotSpeed;
  puck.vy = dy / length * TUNING.shotSpeed;
  puck.owner = null;
  state.actionAt = state.time;
  state.shotAt = state.time;
  pushEvent(state, "shot", { aimY: targetY });
}

function poke(state) {
  state.actionAt = state.time;
  const reach = distance(state.defender, state.attacker);
  pushEvent(state, "poke", { distance: reach });
  if (state.puck.owner === "attacker" && reach <= TUNING.pokeReach) {
    finish(state, "turnover", { cause: "poke" });
  }
}

function finish(state, outcome, data = {}) {
  if (state.outcome) return;
  state.outcome = outcome;
  state.puck.owner = null;
  state.puck.vx = 0;
  state.puck.vy = 0;
  pushEvent(state, outcome, data);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function segmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0
    ? 0
    : clamp(((px - x1) * dx + (py - y1) * dy) / lengthSquared, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

function goalCrossingY(x1, y1, x2, y2) {
  if (x1 > GOAL_LINE_X || x2 < GOAL_LINE_X || x2 === x1) return null;
  const t = (GOAL_LINE_X - x1) / (x2 - x1);
  if (t < 0 || t > 1) return null;
  return y1 + (y2 - y1) * t;
}

function moveLoosePuck(state, dt) {
  const puck = state.puck;
  const fromX = puck.x;
  const fromY = puck.y;
  let toX = fromX + puck.vx * dt;
  let toY = fromY + puck.vy * dt;

  if (segmentDistance(state.goalie.x, state.goalie.y, fromX, fromY, toX, toY)
      <= TUNING.goalieSaveRadius) {
    puck.x = state.goalie.x - 0.12;
    puck.y = state.goalie.y;
    finish(state, "save");
    return;
  }

  const crossingY = goalCrossingY(fromX, fromY, toX, toY);
  if (crossingY !== null && Math.abs(crossingY - GOAL_CENTER_Y) <= GOAL_HALF_WIDTH) {
    puck.x = GOAL_LINE_X;
    puck.y = crossingY;
    finish(state, "goal");
    return;
  }

  const constrained = constrainToRoundedRink(toX, toY, PUCK_MARGIN);
  if (constrained.x !== toX || constrained.y !== toY) {
    const normalLength = Math.hypot(toX - constrained.x, toY - constrained.y);
    const normalX = normalLength > 0 ? (toX - constrained.x) / normalLength : 0;
    const normalY = normalLength > 0 ? (toY - constrained.y) / normalLength : 0;
    const alongNormal = puck.vx * normalX + puck.vy * normalY;
    puck.vx = (puck.vx - 2 * alongNormal * normalX) * 0.45;
    puck.vy = (puck.vy - 2 * alongNormal * normalY) * 0.45;
    toX = constrained.x;
    toY = constrained.y;
  }
  puck.x = toX;
  puck.y = toY;
  const drag = Math.exp(-TUNING.puckDrag * dt);
  puck.vx *= drag;
  puck.vy *= drag;
}

function attachOwnedPuck(state) {
  const owner = state.puck.owner === "attacker" ? state.attacker : null;
  if (!owner) return;
  const carry = carryPoint(owner);
  state.puck.x = carry.x;
  state.puck.y = carry.y;
  state.puck.vx = owner.vx;
  state.puck.vy = owner.vy;
}

function recordGeometryEvents(state) {
  const lateralSeparation = Math.abs(state.attacker.y - state.defender.y);
  const forwardGap = state.defender.x - state.attacker.x;
  if (lateralSeparation >= 4.2 && forwardGap >= 1.1 && !hasEvent(state, "space-created")) {
    pushEvent(state, "space-created", { lateralSeparation, forwardGap });
  }
  if (distance(state.attacker, state.defender) <= 2.2 && !hasEvent(state, "pressure-arrived")) {
    pushEvent(state, "pressure-arrived");
  }
}

export function stepGame(state, input = {}, dt = DT) {
  if (!state || typeof state !== "object") throw new TypeError("state must be an object");
  finiteNumber(dt, "dt");
  if (dt <= 0 || dt > 1) throw new RangeError("dt must be greater than 0 and at most 1 second");

  const next = cloneState(state);
  if (next.outcome) return next;

  const random = nextRandom(next.seed);
  next.seed = random.seed;
  next.time = Math.round((next.time + dt) * 1e9) / 1e9;
  next.tick += 1;

  const choice = CHOICES.has(input.choice) ? input.choice : next.choice;
  if (choice && next.choice !== choice) {
    next.choice = choice;
    next.choiceAt = next.time;
    pushEvent(next, `choice-${choice}`);
  }
  const auto = input.auto === true;
  const manualControl = {
    x: validControl(input.moveX),
    y: validControl(input.moveY),
  };
  const attackerControl = next.setup.role === "attacker" && !auto
    ? manualControl
    : attackerPolicy(next, choice, random.value);
  const defenderControl = next.setup.role === "defender" && !auto
    ? manualControl
    : defenderPolicy(next);

  next.attacker = steer(
    next.attacker,
    attackerControl,
    dt,
    auto ? 9 : TUNING.attackerAcceleration,
    TUNING.attackerTopSpeed,
    TUNING.skaterBrake,
    ATTACKER_MARGIN,
  );
  next.defender = steer(
    next.defender,
    defenderControl,
    dt,
    next.setup.pressure === "passive"
      ? 8
      : next.setup.pressure === "pressure" ? 8.5 : TUNING.defenderAcceleration,
    next.setup.pressure === "passive"
      ? 7.3
      : next.setup.pressure === "pressure" ? 7.5 : TUNING.defenderTopSpeed,
    TUNING.skaterBrake,
  );
  if (next.setup.role !== "defender" || auto) {
    next.defender.facing = facingToward(next.defender, next.attacker, next.defender.facing);
  }
  next.goalie = steer(
    next.goalie,
    goaliePolicy(next),
    dt,
    TUNING.goalieAcceleration,
    TUNING.goalieTopSpeed,
    TUNING.goalieBrake,
  );
  next.goalie.x = GOALIE_HOME_X;
  next.goalie.vx = 0;

  attachOwnedPuck(next);
  if (next.puck.owner === 'attacker') {
    const crossingY=goalCrossingY(state.puck.x,state.puck.y,next.puck.x,next.puck.y);
    if(segmentDistance(next.goalie.x,next.goalie.y,state.puck.x,state.puck.y,next.puck.x,next.puck.y)<=TUNING.goalieSaveRadius) finish(next,'save');
    else if(crossingY!==null&&Math.abs(crossingY-GOAL_CENTER_Y)<=GOAL_HALF_WIDTH) finish(next,'goal');
  }
  const pressurePoke = next.setup.role === "attacker"
    && next.setup.pressure === "pressure"
    && next.puck.owner === "attacker"
    && next.time >= 1.2
    && distance(next.defender, next.attacker) <= TUNING.pokeReach
    && actionReady(next);
  if (pressurePoke) {
    next.actionAt = next.time;
    pushEvent(next, "poke", {
      actor: "defender",
      distance: distance(next.defender, next.attacker),
    });
    finish(next, "turnover", { cause: "pressure-poke" });
  }

  const requestedAction = Boolean(input.action);
  const routeChoice = choice === "inside" || choice === "outside";
  const routeHasDeveloped = routeChoice
    && next.choiceAt !== null
    && next.time - next.choiceAt >= 0.8;
  const autoShot = auto && next.puck.owner === "attacker" && (
    choice === "shoot"
    || (routeChoice
      ? routeHasDeveloped && (next.attacker.x >= GOAL_LINE_X - 6 || next.time >= 3.1)
      : next.time >= 1.25 && (next.attacker.x >= GOAL_LINE_X - 6 || next.time >= 3.1))
  );
  if (!next.outcome && actionReady(next)) {
    if (next.setup.role === "attacker" && requestedAction && next.puck.owner === "attacker") {
      shoot(next, random.value);
    } else if (next.setup.role === "defender" && requestedAction) {
      poke(next);
    } else if (autoShot) {
      shoot(next, random.value);
    }
  }

  if (!next.outcome && next.puck.owner === null) {
    moveLoosePuck(next, dt);
  }

  if (!next.outcome && next.puck.owner === "attacker"
      && distance(next.attacker, next.defender) <= TUNING.contactReach) {
    finish(next, "turnover", { cause: "contact" });
  }

  const goalieFocus = next.puck.owner === "attacker" ? next.attacker : next.puck;
  next.goalie.facing = facingToward(next.goalie, goalieFocus, next.goalie.facing);

  if (!next.outcome) recordGeometryEvents(next);
  if (!next.outcome && next.time >= TUNING.repetitionSeconds) {
    finish(next, "timeout");
  }
  return next;
}

export function describeRep(state) {
  const events = state?.events ?? [];
  const createdSpace = events.some((event) => event.type === "space-created");
  const pressureArrived = events.some((event) => event.type === "pressure-arrived");
  const shot = events.some((event) => event.type === "shot");

  switch (state?.outcome) {
    case "goal":
      return {
        title: "Goal",
        detail: createdSpace
          ? "You created lateral separation before the shot, and the puck crossed the goal line."
          : "The puck crossed the goal line; replay the gap to see how the opening developed.",
      };
    case "save":
      return {
        title: "Saved",
        detail: createdSpace
          ? "You created lateral separation before the shot; the goalie stopped the puck."
          : "The goalie stopped the puck; the save alone does not judge the decision.",
      };
    case "turnover":
      return {
        title: "Puck turned over",
        detail: pressureArrived
          ? "The defender reached the puck carrier before the play opened up."
          : "The defender made contact with the puck; review the spacing at that moment.",
      };
    case "timeout":
      return {
        title: "Time expired",
        detail: shot
          ? "The repetition ended after the shot stayed in play."
          : "The repetition ended with the puck still in play; review where the available space changed.",
      };
    default:
      return {
        title: "Rep in progress",
        detail: pressureArrived
          ? "The defender has closed the gap."
          : "Watch the gap and the lateral space as the rush develops.",
      };
  }
}
