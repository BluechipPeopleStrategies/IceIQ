#!/usr/bin/env node
// Unit tests for the doctor's pure functions. Run: node tools/rinkreads-doctor.test.mjs
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bankSanity, checkPreflightGhost, summarize, renderMarkdown, validateSeeds } from "./rinkreads-doctor.mjs";

let pass = 0, fail = 0;
const ok = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); cond ? pass++ : fail++; };

// --- bankSanity
{
  const root = mkdtempSync(join(tmpdir(), "doc-"));
  mkdirSync(join(root, "src", "data"), { recursive: true });
  const bankPath = join(root, "src", "data", "bank.json");

  writeFileSync(bankPath, JSON.stringify({ "U9 / Novice": [{ id: "q1" }, { id: "q2" }] }));
  ok("bankSanity passes a clean bank", bankSanity(bankPath).length === 0);

  writeFileSync(bankPath, JSON.stringify({ "U9 / Novice": [{ id: "q1" }, { sit: "no id" }] }));
  const missingId = bankSanity(bankPath);
  ok("bankSanity flags a row missing id", missingId.some(i => /missing id/.test(i.issue)));

  writeFileSync(bankPath, JSON.stringify({ "U9 / Novice": "not-an-array" }));
  ok("bankSanity flags non-array level", bankSanity(bankPath).some(i => /not an array/.test(i.issue)));

  writeFileSync(bankPath, "{ not json");
  ok("bankSanity flags unparseable bank", bankSanity(bankPath).some(i => /cannot read\/parse/.test(i.issue)));

  rmSync(root, { recursive: true, force: true });
}

// --- checkPreflightGhost
{
  const root = mkdtempSync(join(tmpdir(), "doc2-"));
  mkdirSync(join(root, "tools"), { recursive: true });
  mkdirSync(join(root, "src", "data"), { recursive: true });
  writeFileSync(join(root, "tools", "preflight.mjs"), `const BANK = "src/data/questions.json";`);
  ok("checkPreflightGhost fires when questions.json missing and preflight references it",
     typeof checkPreflightGhost(root) === "string");

  writeFileSync(join(root, "src", "data", "questions.json"), "{}");
  ok("checkPreflightGhost is silent when questions.json exists",
     checkPreflightGhost(root) === null);

  rmSync(root, { recursive: true, force: true });
}

// --- summarize + renderMarkdown
{
  const findings = {
    fast: true,
    dead: {
      brokenImports: [{ file: "src/a.js", spec: "./missing" }],
      unusedFiles: ["src/orphan.jsx"],
      staleDeps: ["dead-pkg"],
      cruft: ["src/data/x.bak"],
    },
    bank: [{ level: "U9 / Novice", issue: "row 1 missing id" }],
    seeds: [{ id: "s1", errs: ["bad shape"], warns: ["soft"] }],
    ghost: "preflight points at missing questions.json",
    external: [],
  };
  const s = summarize(findings);
  ok("summarize counts broken imports", s.brokenImports === 1);
  ok("summarize counts seed errors", s.seedProblems === 1);
  ok("summarize counts ghost", s.ghost === 1);

  const md = renderMarkdown(findings, "2026-06-13T00:00:00Z");
  ok("markdown shows broken imports section", md.includes("Broken imports") && md.includes("src/a.js"));
  ok("markdown shows stale dep", md.includes("dead-pkg"));
  ok("markdown shows bank issue", md.includes("row 1 missing id"));
  ok("markdown shows ghost finding", md.includes("questions.json"));
}

// --- validateSeeds
{
  const root = mkdtempSync(join(tmpdir(), "doc3-"));
  // missing seeds dir -> []
  ok("validateSeeds returns [] when seeds dir is absent", validateSeeds(root).length === 0);

  // a malformed-JSON seed -> a parse-error entry (no dependency on lintScenario schema)
  mkdirSync(join(root, "src", "scenario", "seeds"), { recursive: true });
  writeFileSync(join(root, "src", "scenario", "seeds", "broken.json"), "{ not json");
  const res = validateSeeds(root);
  ok("validateSeeds reports a parse error for malformed seed JSON",
     res.some(r => r.id === "broken.json" && r.errs.some(e => /parse error/i.test(e))));

  rmSync(root, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
