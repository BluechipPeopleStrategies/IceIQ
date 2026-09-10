#!/usr/bin/env node
// Run: node --test src/utils/coachTrainingSource.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { loadRosterTraining, isDemoTeam, DEMO_TEAM_ID } from "./coachTrainingSource.js";

const roster = [{ id: "dr1" }, { id: "dr2" }, { id: null }];

test("the demo team is recognised by id", () => {
  assert.equal(isDemoTeam(DEMO_TEAM_ID), true);
  assert.equal(isDemoTeam("demo-t2"), true, "the coach demo's second and third teams");
  assert.equal(isDemoTeam("demo-t3"), true);
  assert.equal(isDemoTeam("demo-team"), true, "the player preview's team");
  assert.equal(isDemoTeam("11111111-2222-3333-4444-555555555555"), false);
  assert.equal(isDemoTeam("demo-t1x"), false);
  assert.equal(isDemoTeam(undefined), false);
  assert.equal(isDemoTeam(null), false);
});

test("a demo roster never touches the cloud and reads the device log", async () => {
  // QA 2026-09-10: 16 x HTTP 400 and a "could not be loaded" alert on the
  // landing-page coach demo, because dr1..dr16 are not UUIDs.
  const remoteCalls = [];
  const local = id => ({ sessions: [{ id: id + "-s1", date: "2026-09-09", type: "practice", value: 45, unit: "min" }] });
  const out = await loadRosterTraining(roster, { demo: true, remote: async id => { remoteCalls.push(id); return []; }, local });
  assert.deepEqual(remoteCalls, []);
  assert.equal(out.dr1.length, 1);
  assert.equal(out.dr2[0].id, "dr2-s1");
  assert.equal("null" in out, false);
});

test("a demo player with no local log gets an empty list, not a crash", async () => {
  const out = await loadRosterTraining(roster, { demo: true, remote: async () => { throw new Error("must not be called"); }, local: () => { throw new Error("unreadable"); } });
  assert.deepEqual(out.dr1, []);
});

test("a real team reads every player strictly from the cloud", async () => {
  const calls = [];
  const out = await loadRosterTraining(roster, { demo: false, remote: async (id, opts) => { calls.push([id, opts.strict]); return [{ id: id + "-r" }]; }, local: () => { throw new Error("must not be called"); } });
  assert.deepEqual(calls.sort(), [["dr1", true], ["dr2", true]]);
  assert.equal(out.dr1[0].id, "dr1-r");
});

test("a cloud failure on a real team still surfaces (the section must not report zero activity)", async () => {
  await assert.rejects(loadRosterTraining(roster, { demo: false, remote: async () => { throw new Error("400"); }, local: () => ({}) }), /400/);
});

test("remote returning null becomes an empty list", async () => {
  const out = await loadRosterTraining([{ id: "a" }], { demo: false, remote: async () => null, local: () => ({}) });
  assert.deepEqual(out.a, []);
});
