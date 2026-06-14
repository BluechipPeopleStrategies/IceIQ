import test from "node:test";
import assert from "node:assert/strict";
import { calibratedStartLevel, seededLevel } from "../src/cognitive-gym/gymEngine.js";

test("calibratedStartLevel seeds by age band, defaults to 1", () => {
  assert.equal(calibratedStartLevel("U7"), 2);
  assert.equal(calibratedStartLevel("u9"), 4);
  assert.equal(calibratedStartLevel("U11"), 6);
  assert.equal(calibratedStartLevel("U15"), 1);
  assert.equal(calibratedStartLevel(null), 1);
});

test("seededLevel seeds an untouched drill, never lowers, leaves played drills", () => {
  // untouched (no sessions) -> seeded up to the age level
  assert.equal(seededLevel({ level: 1, sessions: [] }, "U11"), 6);
  // never lower an existing higher level
  assert.equal(seededLevel({ level: 9, sessions: [] }, "U7"), 9);
  // a played drill is left alone
  assert.equal(seededLevel({ level: 3, sessions: [{ date: "2026-06-14" }] }, "U11"), 3);
  // unknown band on untouched -> stays 1
  assert.equal(seededLevel({ level: 1, sessions: [] }, "U15"), 1);
});

import {
  starTier, xpFromPoints, rankForXp, dailyDrillsDone, earnedBadges,
} from "../src/cognitive-gym/gymProgressCore.js";

test("starTier: 0/1/2/3 at levels <5 / >=5 / >=10 / >=15", () => {
  assert.equal(starTier(1), 0);
  assert.equal(starTier(5), 1);
  assert.equal(starTier(10), 2);
  assert.equal(starTier(15), 3);
  assert.equal(starTier(20), 3);
});

test("xpFromPoints is points/10, floored at 0", () => {
  assert.equal(xpFromPoints(0), 0);
  assert.equal(xpFromPoints(950), 95);
  assert.equal(xpFromPoints(-5), 0);
});

test("rankForXp climbs the ladder and reports the next threshold", () => {
  assert.equal(rankForXp(0).name, "Warming Up");
  assert.equal(rankForXp(0).nextAt, 500);
  assert.equal(rankForXp(1500).name, "Heads Up");
  const top = rankForXp(99999);
  assert.equal(top.name, "Hockey IQ");
  assert.equal(top.nextAt, null);
});

test("dailyDrillsDone counts distinct drills played on the given day", () => {
  const records = {
    a: { sessions: [{ date: "2026-06-14T10:00:00Z" }] },
    b: { sessions: [{ date: "2026-06-13T10:00:00Z" }] },
    c: { sessions: [] },
  };
  assert.equal(dailyDrillsDone(records, "2026-06-14"), 1);
  assert.equal(dailyDrillsDone(records, "2026-06-13"), 1);
  assert.equal(dailyDrillsDone(records, "2026-01-01"), 0);
});

test("earnedBadges reflects stats and records", () => {
  const stats = { totalSessions: 30, longestStreak: 8 };
  const records = {
    x: { level: 4, sessions: [{ date: "d" }] },
    shootout: { level: 2, sessions: Array.from({ length: 10 }, () => ({ date: "d" })) },
  };
  const map = Object.fromEntries(earnedBadges(stats, records).map((b) => [b.id, b.earned]));
  assert.equal(map.weekStreak, true);
  assert.equal(map.regular, true);
  assert.equal(map.goalieBeater, true);
  assert.equal(map.allDrills, true); // every record here has a session
  assert.equal(map.firstLevelUp, false); // no drill above level 1
});
