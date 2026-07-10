import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { COACH_PERSONAS, coachReaction, getCoachForQuestion } from "../src/coachPersonas.js";

test("coach personalities are stable and distributed", () => {
  assert.deepEqual(COACH_PERSONAS.map((coach) => coach.id), ["kincaid", "danno", "marques", "kowalski"]);
  assert.equal(getCoachForQuestion({ id: "play:a" }).id, getCoachForQuestion({ id: "play:a" }).id);
  assert.ok(new Set(["a", "b", "c", "d", "e"].map((id) => getCoachForQuestion({ id }).id)).size > 1);
  assert.equal(typeof coachReaction(COACH_PERSONAS[0], true, "U11", 0), "string");
  assert.equal(typeof coachReaction(COACH_PERSONAS[0], false, "U11", 0), "string");
  assert.ok(COACH_PERSONAS.every((coach) => coach.flavorCorrect.young.length >= 8));
  assert.ok(COACH_PERSONAS.every((coach) => coach.flavorIncorrect.mid.length >= 6));
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.ok(app.includes('from "./coachPersonas.js"'));
  assert.equal(app.includes("const COACH_PERSONAS = ["), false);
});
