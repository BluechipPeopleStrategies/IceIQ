#!/usr/bin/env node
// Unit tests for the gauntlet lessons store. Run: node tools/gauntlet/lessons.test.mjs
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadLessons, addLesson, renderLessons, MAX_LESSONS } from "./lessons.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };
const tmp = () => join(mkdtempSync(join(tmpdir(), "lessons-")), "lessons.json");

// missing file -> empty
{ const p = tmp(); ok("missing file loads empty", JSON.stringify(loadLessons(p)) === JSON.stringify({ lessons: [] })); }

// add appends with count 1
{ const p = tmp(); const r = addLesson(p, "Keep U7 stems to one cue.");
  ok("add returns added", r.added === true);
  const l = loadLessons(p); ok("one lesson stored", l.lessons.length === 1 && l.lessons[0].count === 1); }

// duplicate (normalized) increments count, does not duplicate
{ const p = tmp(); addLesson(p, "Distractors must be wrong for a reason.");
  const r = addLesson(p, "  distractors MUST be wrong for a reason!  ");
  const l = loadLessons(p);
  ok("dup not duplicated", l.lessons.length === 1);
  ok("dup increments count", l.lessons[0].count === 2);
  ok("dup returns added:false", r.added === false); }

// cap: never exceeds MAX_LESSONS; lowest-count dropped first
{ const p = tmp();
  for (let i = 0; i < MAX_LESSONS + 5; i++) addLesson(p, `lesson number ${i}`);
  const l = loadLessons(p);
  ok("respects MAX_LESSONS cap", l.lessons.length === MAX_LESSONS); }

// render: empty -> "", non-empty -> bulleted block containing the text
{ ok("render empty is blank", renderLessons({ lessons: [] }) === "");
  const block = renderLessons({ lessons: [{ text: "Avoid trick wording.", count: 3 }] });
  ok("render includes the lesson text", block.includes("Avoid trick wording.")); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
