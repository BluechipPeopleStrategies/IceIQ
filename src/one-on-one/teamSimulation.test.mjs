import test from "node:test";
import assert from "node:assert/strict";

import { NHL_200X85_PROFILE } from "../scenario-engine/rinkFrame.js";
import { createDraft, putKey, removeActor, setFrozen } from "./director.js";
import { createTeamGame, stepTeamGame } from "./teamSimulation.js";

test('a player can collect a loose puck and then pass it',()=>{
 let draft=putKey(createDraft(2,2),'home-skater-1',0,{x:0,y:0,facing:0});draft.puck.owner=null;
 let s=stepTeamGame(createTeamGame(draft),{});assert.equal(s.puck.owner,'home-skater-1');
 s=stepTeamGame(s,{action:'pass'});assert.equal(s.puck.owner,null);assert.equal(s.events.at(-1).type,'pass');
});

function place(draft, id, x, y, facing = 0) {
  return putKey(draft, id, 0, { x, y, facing });
}

function runUntil(state, predicate, ticks = 240) {
  let next = state;
  for (let tick = 0; tick < ticks && !predicate(next); tick += 1) {
    next = stepTeamGame(next, {});
  }
  return next;
}

test("createTeamGame converts 1v1 through 5v5 drafts to the generic serializable frame", () => {
  for (let size = 1; size <= 5; size += 1) {
    const state = createTeamGame(createDraft(size, size));
    assert.equal(state.actors.filter(({ role }) => role === "skater").length, size * 2);
    assert.ok(state.actors.every((actor) => (
      Object.keys(actor).sort().join(",") === "facing,frozen,id,label,role,team,vx,vy,x,y"
    )));
    assert.equal(state.selectedId, "home-skater-1");
    assert.equal(state.puck.owner, state.selectedId);
    assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
  }
});

test("same state and input produce the same next state without mutating the prior frame", () => {
  const state = createTeamGame(createDraft(2, 2));
  const before = structuredClone(state);
  const first = stepTeamGame(state, { moveX: 1, moveY: 0.4 }, 0.2);
  const second = stepTeamGame(state, { moveX: 1, moveY: 0.4 }, 0.2);

  assert.deepEqual(first, second);
  assert.deepEqual(state, before);
  assert.notStrictEqual(first, state);
  assert.notStrictEqual(first.actors, state.actors);
});

test("the selected puck carrier moves live while teammates support and defenders track", () => {
  const state = createTeamGame(createDraft(2, 2));
  const controlledBefore = state.actors.find(({ id }) => id === state.selectedId);
  const supportBefore = state.actors.find(({ id }) => id === "home-skater-2");
  const defenderBefore = state.actors.find(({ id }) => id === "away-skater-1");
  const next = stepTeamGame(state, { moveX: 1, moveY: 1 }, 0.25);
  const controlled = next.actors.find(({ id }) => id === next.selectedId);
  const support = next.actors.find(({ id }) => id === "home-skater-2");
  const defender = next.actors.find(({ id }) => id === "away-skater-1");

  assert.ok(controlled.x > controlledBefore.x);
  assert.ok(controlled.y > controlledBefore.y);
  assert.ok(Math.hypot(support.x - supportBefore.x, support.y - supportBefore.y) > 0.01);
  assert.ok(Math.hypot(defender.x - defenderBefore.x, defender.y - defenderBefore.y) > 0.01);
});

test("switch selects the next same-team skater and never transfers possession by itself", () => {
  const state = createTeamGame(createDraft(3, 2));
  const next = stepTeamGame(state, { action: "switch" });

  assert.equal(next.selectedId, "home-skater-2");
  assert.equal(next.puck.owner, "home-skater-1");
  assert.equal(next.events.at(-1).type, "selection-switched");
});

test("a pass travels as a loose puck and is received by a teammate", () => {
  let draft = createDraft(2, 1);
  draft = place(draft, "home-skater-1", -6, -3);
  draft = place(draft, "home-skater-2", 3, 3);
  draft = place(draft, "away-skater-1", 8, -9, Math.PI);
  let state = createTeamGame(draft);
  state = stepTeamGame(state, { action: "pass" });

  assert.equal(state.puck.owner, null);
  assert.equal(state.passTargetId, "home-skater-2");
  assert.equal(state.events.at(-1).type, "pass");

  state = runUntil(state, (candidate) => candidate.puck.owner !== null);
  assert.equal(state.puck.owner, "home-skater-2");
  assert.equal(state.events.at(-1).type, "receive");
});

test("an opponent on the passing lane intercepts before the intended receiver", () => {
  let draft = createDraft(2, 1);
  draft = place(draft, "home-skater-1", -7, 0);
  draft = place(draft, "home-skater-2", 6, 0);
  draft = place(draft, "away-skater-1", 0, 0, Math.PI);
  draft = setFrozen(draft, "away-skater-1", true);
  let state = stepTeamGame(createTeamGame(draft), { action: "pass" });
  state = runUntil(state, (candidate) => candidate.puck.owner !== null);

  assert.equal(state.puck.owner, "away-skater-1");
  assert.equal(state.events.at(-1).type, "interception");
  const frozen = state.actors.find(({ id }) => id === "away-skater-1");
  assert.deepEqual({ x: frozen.x, y: frozen.y, vx: frozen.vx, vy: frozen.vy }, { x: 0, y: 0, vx: 0, vy: 0 });
});

test("shots can be saved or score through the correct goal line", () => {
  let saveDraft = createDraft(1, 1);
  saveDraft = place(saveDraft, "home-skater-1", 23, 0);
  let saved = stepTeamGame(createTeamGame(saveDraft), { action: "shoot" });
  saved = runUntil(saved, ({ outcome }) => outcome !== null);
  assert.equal(saved.outcome, "save");
  assert.equal(saved.events.at(-1).type, "save");

  let goalDraft = createDraft(1, 1);
  goalDraft = place(goalDraft, "home-skater-1", 23, 0);
  goalDraft = removeActor(goalDraft, "away-goalie-1");
  let scored = stepTeamGame(createTeamGame(goalDraft), { action: "shoot" });
  scored = runUntil(scored, ({ outcome }) => outcome !== null);
  assert.equal(scored.outcome, "goal-home");
  assert.equal(scored.events.at(-1).type, "goal");
});

test("frozen actors hold exact poses and all live objects stay inside rounded boards", () => {
  let draft = createDraft(1, 1);
  draft = place(draft, "away-skater-1", 0, 8, Math.PI);
  draft = setFrozen(draft, "away-skater-1", true);
  let state = createTeamGame(draft);
  for (let tick = 0; tick < 120; tick += 1) {
    state = stepTeamGame(state, { moveX: 1, moveY: -1 });
  }
  const frozen = state.actors.find(({ id }) => id === "away-skater-1");
  assert.deepEqual({ x: frozen.x, y: frozen.y, vx: frozen.vx, vy: frozen.vy }, { x: 0, y: 8, vx: 0, vy: 0 });

  const { bounds } = NHL_200X85_PROFILE;
  const cornerRadius = 8.5344;
  for (const item of [...state.actors, state.puck]) {
    assert.ok(item.x >= bounds.minX && item.x <= bounds.maxX);
    assert.ok(item.y >= bounds.minY && item.y <= bounds.maxY);
    const cx = item.x < bounds.minX + cornerRadius
      ? bounds.minX + cornerRadius
      : item.x > bounds.maxX - cornerRadius
        ? bounds.maxX - cornerRadius
        : null;
    const cy = item.y < bounds.minY + cornerRadius
      ? bounds.minY + cornerRadius
      : item.y > bounds.maxY - cornerRadius
        ? bounds.maxY - cornerRadius
        : null;
    if (cx !== null && cy !== null) assert.ok(Math.hypot(item.x - cx, item.y - cy) <= cornerRadius + 1e-9);
  }
});

test("terminal team states remain stable deep copies", () => {
  let draft = createDraft(1, 1);
  draft = place(draft, "home-skater-1", 23, 0);
  draft = removeActor(draft, "away-goalie-1");
  let ended = stepTeamGame(createTeamGame(draft), { action: "shoot" });
  ended = runUntil(ended, ({ outcome }) => outcome !== null);

  const next = stepTeamGame(ended, { action: "switch", moveX: -1 }, 0.25);
  assert.deepEqual(next, ended);
  assert.notStrictEqual(next, ended);
  assert.notStrictEqual(next.events, ended.events);
  assert.notStrictEqual(next.actors, ended.actors);
});
