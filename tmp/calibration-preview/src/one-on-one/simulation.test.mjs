import test from "node:test";
import assert from "node:assert/strict";

import { NHL_200X85_PROFILE } from "../scenario-engine/rinkFrame.js";
import {
  CARRY_OFFSET,
  DEFAULT_SETUP,
  createGame,
  describeRep,
  normalizeSetup,
  stepGame,
} from "./simulation.js";

test('terminal turnover releases the puck',()=>{
  const s=stepGame(createGame({role:'defender',speed:0,attackerX:10,attackerY:0,defenderX:11.2,defenderY:0}),{action:true});
  assert.equal(s.outcome,'turnover');assert.equal(s.puck.owner,null);
});
test('one route choice persists through ordinary automatic ticks',()=>{
  let s=createGame({},42);for(let i=0;i<66;i++)s=stepGame(s,{auto:true});
  let once=stepGame(s,{auto:true,choice:'outside'}), repeated=structuredClone(once);
  for(let i=0;i<35;i++){once=stepGame(once,{auto:true});repeated=stepGame(repeated,{auto:true,choice:'outside'});}
  assert.deepEqual(once,repeated);
});
test('carrying across the open goal mouth records a goal',()=>{
  let s=createGame({attackerX:25,attackerY:-.7,defenderX:15,defenderY:-8,speed:4});
  s.goalie.y=5;
  for(let i=0;i<25&&!s.outcome;i++)s=stepGame(s,{moveX:1});
  assert.equal(s.outcome,'goal');
});

function withState(state, patch) {
  return {
    ...state,
    ...patch,
    attacker: { ...state.attacker, ...patch.attacker },
    defender: { ...state.defender, ...patch.defender },
    goalie: { ...state.goalie, ...patch.goalie },
    puck: { ...state.puck, ...patch.puck },
    events: patch.events ?? state.events.map((event) => ({ ...event })),
  };
}

test("normalizeSetup fills defaults, keeps supported overrides, and drops unknown fields", () => {
  assert.deepEqual(
    normalizeSetup({ pressure: "passive", gap: 7, attackerY: -4, unknown: true }),
    { ...DEFAULT_SETUP, pressure: "passive", gap: 7, attackerY: -4 },
  );
});

test("normalizeSetup rejects non-finite coordinates and tuning values", () => {
  for (const input of [
    { speed: Number.NaN },
    { gap: Number.POSITIVE_INFINITY },
    { defenderX: Number.NEGATIVE_INFINITY },
  ]) {
    assert.throws(() => normalizeSetup(input), /finite/);
  }
});

test("normalizeSetup rejects unknown policies, roles, and out-of-bounds starts", () => {
  assert.throws(() => normalizeSetup({ pressure: "telepathic" }), /pressure/);
  assert.throws(() => normalizeSetup({ role: "goalie" }), /role/);
  assert.throws(
    () => normalizeSetup({ attackerX: NHL_200X85_PROFILE.bounds.maxX + 1 }),
    /bounds/,
  );
  assert.throws(
    () => normalizeSetup({
      attackerX: NHL_200X85_PROFILE.bounds.maxX - 0.1,
      attackerY: NHL_200X85_PROFILE.bounds.maxY - 0.1,
    }),
    /rounded/,
  );
});

test("same snapshot and input produce the same next snapshot without mutating the prior frame", () => {
  const state = createGame({ pressure: "contain", lane: -2 }, 1234);
  const before = structuredClone(state);

  const first = stepGame(state, { moveX: 1, moveY: 0.5 });
  const second = stepGame(state, { moveX: 1, moveY: 0.5 });

  assert.deepEqual(first, second);
  assert.deepEqual(state, before);
  assert.notStrictEqual(first, state);
  assert.notStrictEqual(first.attacker, state.attacker);
  assert.notStrictEqual(first.events, state.events);
});

test("owned puck starts at the shared facing-relative stick carry offset", () => {
  const state = createGame({ speed: 0, attackerX: 10, attackerY: -2 });

  assert.deepEqual(CARRY_OFFSET, { forward: 1, lateral: 0.7 });
  assert.equal(state.puck.x, 11);
  assert.equal(state.puck.y, -1.3);
});

test("attacker directional input accelerates in canonical +y while retaining forward motion", () => {
  const state = createGame({ speed: 2, role: "attacker" });
  const next = stepGame(state, { moveX: 0, moveY: 1 }, 0.25);

  assert.ok(next.attacker.vy > state.attacker.vy);
  assert.ok(next.attacker.y > state.attacker.y);
  assert.ok(next.attacker.x > state.attacker.x);
  assert.ok(next.attacker.facing > 0);
});

test("defensive role input steers the defender while the attacker demonstrates from visible state", () => {
  const state = createGame({ role: "defender", speed: 1, defenderY: 0 });
  const next = stepGame(state, { moveX: 0, moveY: -1 }, 0.25);

  assert.ok(next.defender.vy < 0);
  assert.ok(next.defender.y < state.defender.y);
  assert.ok(next.attacker.x > state.attacker.x);
});

test("a retreating AI defender faces the attacker instead of turning toward its velocity", () => {
  const state = createGame({ pressure: "passive", speed: 4 });
  const first = stepGame(state, { auto: true }, 0.25);
  const next = stepGame(first, { auto: true }, 0.25);
  const expected = Math.atan2(
    next.attacker.y - next.defender.y,
    next.attacker.x - next.defender.x,
  );
  const angleError = Math.abs(Math.atan2(
    Math.sin(next.defender.facing - expected),
    Math.cos(next.defender.facing - expected),
  ));

  assert.ok(next.defender.vx > 0, "fixture must have the defender retreating toward +x");
  assert.ok(angleError < 0.01);
});

test("skaters and a loose puck remain inside the canonical playable bounds", () => {
  const { bounds } = NHL_200X85_PROFILE;
  const state = withState(createGame(), {
    attacker: { x: bounds.maxX - 0.05, y: bounds.maxY - 0.05, vx: 9, vy: 9 },
    puck: { x: bounds.maxX - 0.01, y: bounds.minY + 0.01, vx: 20, vy: -20, owner: null },
  });
  const next = stepGame(state, { moveX: 1, moveY: 1 }, 0.5);

  for (const item of [next.attacker, next.defender, next.goalie, next.puck]) {
    assert.ok(item.x >= bounds.minX && item.x <= bounds.maxX);
    assert.ok(item.y >= bounds.minY && item.y <= bounds.maxY);
  }
});

test("actor and puck movement stay inside the visible rounded corner boards", () => {
  const radius = 8.5344;
  const cornerX = NHL_200X85_PROFILE.bounds.maxX - radius;
  const cornerY = NHL_200X85_PROFILE.bounds.maxY - radius;
  const state = withState(createGame(), {
    attacker: { x: cornerX + 5.3, y: cornerY + 5.3, vx: 8, vy: 8 },
    puck: { x: cornerX + 5.8, y: cornerY + 5.8, vx: 18, vy: 18, owner: null },
  });

  const next = stepGame(state, { moveX: 1, moveY: 1 }, 0.25);

  assert.ok(Math.hypot(next.attacker.x - cornerX, next.attacker.y - cornerY) <= radius - 0.55 + 1e-9);
  assert.ok(Math.hypot(next.puck.x - cornerX, next.puck.y - cornerY) <= radius - 0.08 + 1e-9);
});

test("a swept puck crossing inside the goal mouth scores even with a coarse step", () => {
  const goalLineX = NHL_200X85_PROFILE.landmarks.goalLineRight[0];
  const state = withState(createGame(), {
    goalie: { y: -1.2 },
    puck: { x: goalLineX - 0.4, y: 0.72, vx: 12, vy: 0, owner: null },
  });

  const next = stepGame(state, {}, 0.1);

  assert.equal(next.outcome, "goal");
  assert.equal(next.events.at(-1).type, "goal");
});

test("a swept crossing outside the goal mouth is not recorded as a goal", () => {
  const goalLineX = NHL_200X85_PROFILE.landmarks.goalLineRight[0];
  const state = withState(createGame(), {
    goalie: { y: -1.2 },
    puck: { x: goalLineX - 0.4, y: 2.2, vx: 12, vy: 0, owner: null },
  });

  const next = stepGame(state, {}, 0.1);

  assert.equal(next.outcome, null);
  assert.ok(!next.events.some((event) => event.type === "goal"));
});

test("the goalie saves a puck whose swept path reaches the goalie", () => {
  const state = withState(createGame(), {
    goalie: { y: 0, vy: 0 },
    puck: { x: createGame().goalie.x - 0.8, y: 0, vx: 14, vy: 0, owner: null },
  });

  const next = stepGame(state, {}, 0.1);

  assert.equal(next.outcome, "save");
  assert.equal(next.events.at(-1).type, "save");
});

test("a controlled defender can poke within reach for a turnover", () => {
  const state = withState(createGame({ role: "defender", speed: 0 }), {
    attacker: { x: 10, y: 0, vx: 0, vy: 0 },
    defender: { x: 11.2, y: 0, vx: 0, vy: 0 },
    puck: { x: 10.45, y: 0, vx: 0, vy: 0, owner: "attacker" },
  });

  const next = stepGame(state, { action: true }, 1 / 60);

  assert.equal(next.outcome, "turnover");
  assert.ok(next.events.some((event) => event.type === "poke"));
  assert.equal(next.events.at(-1).type, "turnover");
});

test("seeded defender policies create visibly different gap responses", () => {
  function run(pressure) {
    let state = createGame({ pressure, gap: 5, lane: 3, speed: 4 }, 42);
    let minGap = Number.POSITIVE_INFINITY;
    for (let tick = 0; tick < 240 && !state.outcome; tick += 1) {
      state = stepGame(state, { auto: true });
      minGap = Math.min(
        minGap,
        Math.hypot(state.defender.x - state.attacker.x, state.defender.y - state.attacker.y),
      );
    }
    return { state, minGap };
  }

  const pressure = run("pressure");
  const passive = run("passive");
  const contain = run("contain");

  assert.ok(passive.state.events.some((event) => event.type === "shot"));
  assert.ok(passive.minGap > contain.minGap + 0.5);
  assert.ok(pressure.minGap < passive.minGap);
  const pressureArrival = pressure.state.events.find((event) => event.type === "pressure-arrived");
  const containArrival = contain.state.events.find((event) => event.type === "pressure-arrived");
  assert.ok(pressureArrival.time < containArrival.time);
});

test("autonomous demonstrations preserve the Read & React decision window", () => {
  for (const pressure of ["passive", "contain", "pressure"]) {
    let state = createGame({ pressure }, 42);
    for (let tick = 0; tick < 66; tick += 1) {
      state = stepGame(state, { auto: true });
    }
    assert.equal(state.outcome, null, `${pressure} ended before the 1.1 second freeze`);
  }
});

test("inside and outside choices branch into different paths before an automatic shot", () => {
  let freeze = createGame({ pressure: "contain" }, 42);
  for (let tick = 0; tick < 66; tick += 1) freeze = stepGame(freeze, { auto: true });

  let inside = freeze;
  let outside = freeze;
  for (let tick = 0; tick < 42; tick += 1) {
    inside = stepGame(inside, { auto: true, choice: "inside" });
    outside = stepGame(outside, { auto: true, choice: "outside" });
  }

  assert.equal(inside.outcome, null);
  assert.equal(outside.outcome, null);
  assert.equal(inside.puck.owner, "attacker");
  assert.equal(outside.puck.owner, "attacker");
  assert.ok(outside.attacker.y > inside.attacker.y + 2);
  assert.equal(outside.events.filter((event) => event.type === "choice-outside").length, 1);
  assert.ok(Math.abs(outside.choiceAt - (freeze.time + 1 / 60)) < 1e-8);
});

test("terminal repetitions remain stable and return a deep copy", () => {
  const ended = withState(createGame(), {
    outcome: "save",
    events: [{ type: "shot", time: 1 }, { type: "save", time: 1.2 }],
  });

  const next = stepGame(ended, { action: true }, 0.5);

  assert.deepEqual(next, ended);
  assert.notStrictEqual(next, ended);
  assert.notStrictEqual(next.events, ended.events);
  assert.notStrictEqual(next.events[0], ended.events[0]);
});

test("describeRep reports observed events without treating the outcome as tactical proof", () => {
  const state = withState(createGame(), {
    outcome: "save",
    events: [
      { type: "space-created", time: 0.8 },
      { type: "shot", time: 1.2 },
      { type: "save", time: 1.4 },
    ],
  });

  assert.deepEqual(describeRep(state), {
    title: "Saved",
    detail: "You created lateral separation before the shot; the goalie stopped the puck.",
  });
});
