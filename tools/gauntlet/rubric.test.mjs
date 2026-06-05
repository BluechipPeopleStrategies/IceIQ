#!/usr/bin/env node
// Run: node tools/gauntlet/rubric.test.mjs
import { loadRubric, renderRubric, applyConsolidation, MAX_PRINCIPLES } from "./rubric.mjs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

// loadRubric reads the shipped rubric.json
{
  const here = dirname(fileURLToPath(import.meta.url));
  const r = loadRubric(resolve(here, "rubric.json"));
  ok("ships >= 5 principles", r.principles.length >= 5);
  ok("every principle has id + text", r.principles.every((p) => p.id && typeof p.text === "string" && p.text.length > 10));
  ok("version is a number", typeof r.version === "number");
}

// loadRubric is tolerant of a missing/garbage file
{
  const r = loadRubric("does/not/exist.json");
  ok("missing file -> empty rubric", r.principles.length === 0 && r.version === 1);
}

// renderRubric numbers the principles; empty -> empty string
{
  const block = renderRubric({ principles: [{ id: "a", text: "First rule here." }, { id: "b", text: "Second rule here." }] });
  ok("render numbers principles", block.includes("1. First rule here.") && block.includes("2. Second rule here."));
  ok("render has a header", /rubric/i.test(block));
  ok("render empty -> ''", renderRubric({ principles: [] }) === "" && renderRubric(null) === "");
}

// applyConsolidation normalizes, derives ids, dedupes, bumps version
{
  const base = { version: 3, principles: [{ id: "old", text: "old principle text" }] };
  const out = applyConsolidation(base, [
    { text: "Balance option lengths so nothing stands out." },          // id derived from text
    { id: "Read Not Recall!", text: "Force a genuine read every time." }, // id slugified
    { id: "read-not-recall", text: "duplicate id, should be dropped." },  // dup id
    { text: "x" },                                                        // too short, dropped
  ]);
  ok("version bumped", out.version === 4);
  ok("blank/short dropped, dup id dropped", out.principles.length === 2);
  ok("id slugified", out.principles.some((p) => p.id === "read-not-recall"));
  ok("id derived from text when absent", out.principles[0].id.startsWith("balance-option-lengths"));
}

// applyConsolidation caps at MAX_PRINCIPLES
{
  const many = Array.from({ length: MAX_PRINCIPLES + 5 }, (_, i) => ({ id: `p${i}`, text: `principle number ${i} here` }));
  const out = applyConsolidation({ version: 1, principles: [] }, many);
  ok("caps at MAX_PRINCIPLES", out.principles.length === MAX_PRINCIPLES);
}

// applyConsolidation with no valid principles keeps the old rubric, no version bump
{
  const base = { version: 5, principles: [{ id: "keep", text: "keep this one principle" }] };
  const out = applyConsolidation(base, []);
  ok("empty input keeps old principles", out.principles.length === 1 && out.version === 5);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
