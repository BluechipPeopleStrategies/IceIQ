import test from "node:test";
import assert from "node:assert/strict";

test('malformed source metadata and unbounded key arrays fail draft validation',()=>{
 const d=createDraft();d.sourceRef={id:{bad:true}};assert.equal(validateDraft(d).ok,false);
 const long=createDraft();long.duration=Infinity;assert.equal(validateDraft(long).ok,false);
});

import { NHL_200X85_PROFILE } from "../scenario-engine/rinkFrame.js";
import {
  addActor,
  createDraft,
  putKey,
  removeActor,
  sampleDraft,
  setFrozen,
  validateDraft,
} from "./director.js";

test("createDraft makes deterministic team presets with skaters, goalies, and a valid owner", () => {
  const first = createDraft(2, 3);
  const second = createDraft(2, 3);

  assert.deepEqual(first, second);
  assert.equal(first.version, "rinkreads-director-draft-v1");
  assert.equal(first.duration, 8);
  assert.equal(first.status, "development-not-validated");
  assert.equal(first.sourceRef, null);
  assert.equal(first.actors.filter(({ team, role }) => team === "home" && role === "skater").length, 2);
  assert.equal(first.actors.filter(({ team, role }) => team === "away" && role === "skater").length, 3);
  assert.equal(first.actors.filter(({ role }) => role === "goalie").length, 2);
  assert.ok(first.actors.some(({ id }) => id === first.puck.owner));
  assert.deepEqual(validateDraft(first), { ok: true, errs: [], warns: [] });
});

test("addActor and removeActor return new drafts with stable IDs and no stale puck owner", () => {
  const draft = createDraft(1, 1);
  const withSkater = addActor(draft, "home");
  const ownerId = draft.puck.owner;
  const ownerMoved = { ...withSkater, puck: { owner: withSkater.actors.at(-1).id } };
  const removed = removeActor(ownerMoved, ownerMoved.puck.owner);

  assert.deepEqual(draft, createDraft(1, 1));
  assert.equal(withSkater.actors.at(-1).id, "home-skater-2");
  assert.notEqual(removed.puck.owner, ownerMoved.puck.owner);
  assert.ok(removed.puck.owner === null || removed.actors.some(({ id }) => id === removed.puck.owner));
  assert.throws(() => addActor(createDraft(6, 1), "home"), /six skaters/);
  assert.throws(() => removeActor(draft, "home-skater-1"), /at least one skater/);
});

test("putKey inserts sorted bounded poses without mutating the prior draft", () => {
  const draft = createDraft(1, 1);
  const before = structuredClone(draft);
  const id = draft.puck.owner;
  const keyed = putKey(putKey(draft, id, 6, { x: 12, y: 4, facing: Math.PI }), id, 2, {
    x: -4,
    y: -2,
    facing: 0,
  });

  assert.deepEqual(draft, before);
  assert.deepEqual(keyed.actors.find((actor) => actor.id === id).keys.map(({ time }) => time), [0, 2, 6]);
  assert.throws(
    () => putKey(draft, id, 1, { x: NHL_200X85_PROFILE.bounds.maxX, y: NHL_200X85_PROFILE.bounds.maxY, facing: 0 }),
    /rounded playable rink/,
  );
});

test("sampleDraft linearly samples position and takes the shortest facing path", () => {
  let draft = createDraft(1, 1);
  const id = draft.puck.owner;
  draft = putKey(draft, id, 0, { x: 0, y: 0, facing: 350 * Math.PI / 180 });
  draft = putKey(draft, id, 2, { x: 10, y: 4, facing: 10 * Math.PI / 180 });

  const frame = sampleDraft(draft, 1);
  const actor = frame.actors.find((item) => item.id === id);

  assert.equal(actor.x, 5);
  assert.equal(actor.y, 2);
  assert.equal(actor.vx, 5);
  assert.equal(actor.vy, 2);
  assert.ok(actor.facing < 1e-10 || Math.abs(actor.facing - Math.PI * 2) < 1e-10);
  assert.deepEqual(Object.keys(frame).sort(), ["actors", "puck", "time"]);
});

test("setFrozen captures the sampled pose and sampleDraft holds it with zero velocity", () => {
  let draft = createDraft(1, 1);
  const id = draft.puck.owner;
  draft = putKey(draft, id, 4, { x: 8, y: 4, facing: Math.PI / 2 });
  const frozen = setFrozen(draft, id, true, 2);
  const atSeven = sampleDraft(frozen, 7).actors.find((actor) => actor.id === id);

  assert.deepEqual(atSeven, {
    id,
    label: "H1",
    team: "home",
    role: "skater",
    x: -2,
    y: 2,
    vx: 0,
    vy: 0,
    facing: Math.PI / 4,
    frozen: true,
  });
  const unfrozen = setFrozen(frozen, id, false);
  assert.equal(unfrozen.actors.find((actor) => actor.id === id).fixedPose, null);
});

test("sampleDraft places an owned puck at the carrier stick and never emits stale possession", () => {
  const draft = createDraft(1, 1);
  const frame = sampleDraft(draft, 0);
  const carrier = frame.actors.find(({ id }) => id === frame.puck.owner);

  assert.equal(frame.puck.x, carrier.x + 1);
  assert.equal(frame.puck.y, carrier.y + 0.7);
  assert.equal(frame.puck.vx, carrier.vx);
  assert.equal(frame.puck.vy, carrier.vy);

  const stale = { ...draft, puck: { owner: "missing" } };
  assert.match(validateDraft(stale).errs.join(" "), /puck owner/);
  const unsupported = { ...draft, puck: { owner: 'home-goalie-1' } };
  assert.match(validateDraft(unsupported).errs.join(' '), /puck owner must be a skater/);
});

test("validateDraft rejects duplicate IDs, malformed keys, and rounded-corner violations", () => {
  const draft = createDraft(1, 1);
  const duplicate = {
    ...draft,
    actors: [...draft.actors, structuredClone(draft.actors[0])],
  };
  assert.match(validateDraft(duplicate).errs.join(" "), /unique/);

  const badKeys = structuredClone(draft);
  badKeys.actors[0].keys = [
    { time: 2, x: 0, y: 0, facing: 0 },
    { time: 1, x: 0, y: 0, facing: 0 },
  ];
  assert.match(validateDraft(badKeys).errs.join(" "), /increasing/);

  const corner = structuredClone(draft);
  corner.actors[0].keys[0] = {
    time: 0,
    x: NHL_200X85_PROFILE.bounds.maxX,
    y: NHL_200X85_PROFILE.bounds.maxY,
    facing: 0,
  };
  assert.match(validateDraft(corner).errs.join(" "), /rounded playable rink/);
});
