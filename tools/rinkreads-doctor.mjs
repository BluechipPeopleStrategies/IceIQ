#!/usr/bin/env node
// RinkReads Doctor: deterministic health pass. Zero LLM tokens.
//   node tools/rinkreads-doctor.mjs          full pass (includes external audit scripts)
//   node tools/rinkreads-doctor.mjs --fast   in-process checks only (used by the session hook)
// Writes docs/checkups/latest.{md,json}. Exit 1 if any hard error is present.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { scanDeadCode } from "./lib/deadcode-scan.mjs";
import { lintScenario } from "./scenario-author/validate.mjs";

// --- bank.json structural sanity (level-keyed object of question arrays)
export function bankSanity(bankPath) {
  let bank;
  try { bank = JSON.parse(fs.readFileSync(bankPath, "utf8")); }
  catch (e) { return [{ level: "(file)", issue: `cannot read/parse bank.json: ${e.message}` }]; }
  if (!bank || typeof bank !== "object" || Array.isArray(bank)) {
    return [{ level: "(root)", issue: "bank.json is not a level-keyed object" }];
  }
  const issues = [];
  for (const [lvl, rows] of Object.entries(bank)) {
    if (!Array.isArray(rows)) { issues.push({ level: lvl, issue: "value is not an array" }); continue; }
    rows.forEach((q, i) => {
      if (!q || typeof q !== "object") issues.push({ level: lvl, issue: `row ${i} is not an object` });
      else if (!q.id) issues.push({ level: lvl, issue: `row ${i} missing id` });
    });
  }
  return issues;
}

// --- preflight points at a file that no longer exists
export function checkPreflightGhost(root) {
  if (fs.existsSync(path.join(root, "src", "data", "questions.json"))) return null;
  let txt = "";
  try { txt = fs.readFileSync(path.join(root, "tools", "preflight.mjs"), "utf8"); } catch { return null; }
  if (/questions\.json/.test(txt)) {
    return "tools/preflight.mjs validates src/data/questions.json, which does not exist " +
           "(the live bank is src/data/bank.json). Its [bank] check is a no-op; repoint it to bank.json.";
  }
  return null;
}

// --- lint every engine seed via the existing validator
export function validateSeeds(root) {
  const dir = path.join(root, "src", "scenario", "seeds");
  const out = [];
  let files;
  try { files = fs.readdirSync(dir).filter(f => f.endsWith(".json")); } catch { return out; }
  for (const f of files) {
    let s;
    try { s = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); }
    catch (e) { out.push({ id: f, errs: [`parse error: ${e.message}`], warns: [] }); continue; }
    let r;
    try { r = lintScenario(s); }
    catch (e) { out.push({ id: s.id || f, errs: [`lintScenario threw: ${e.message}`], warns: [] }); continue; }
    const errs = r.errs || [];
    const warns = r.warns || [];
    if (!r.ok || warns.length) out.push({ id: s.id || f, errs, warns });
  }
  return out;
}

// --- run the existing audit scripts (full pass only) and capture pass/fail + output tail
const EXTERNAL = [
  { id: "gauntlet:audit", script: "tools/gauntlet-audit.mjs", args: [] },
  { id: "audit:curriculum", script: "tools/curriculum-audit.mjs", args: [] },
  { id: "test:ledger", script: "tools/curriculum-ledger-golden.mjs", args: [] },
  { id: "qa:flagged", script: "scripts/qa-sweep.mjs", args: ["--warns"] },
];
function tail(s, n = 8) { return (s || "").trim().split("\n").slice(-n).join("\n"); }
export function runExternalChecks(root) {
  return EXTERNAL.map(c => {
    try {
      const out = execFileSync(process.execPath, [c.script, ...c.args],
        { cwd: root, encoding: "utf8", stdio: "pipe", timeout: 120000 });
      return { id: c.id, status: "pass", tail: tail(out) };
    } catch (e) {
      const status = (typeof e.status === "number") ? "fail" : "errored";
      return { id: c.id, status, tail: tail(`${e.stdout || ""}\n${e.stderr || ""}`) };
    }
  });
}

// --- collect everything
export function collectFindings({ root, fast = false }) {
  return {
    fast,
    dead: scanDeadCode({ root }),
    bank: bankSanity(path.join(root, "src", "data", "bank.json")),
    seeds: validateSeeds(root),
    ghost: checkPreflightGhost(root),
    external: fast ? [] : runExternalChecks(root),
  };
}

export function summarize(f) {
  return {
    bankIssues: f.bank.length,
    seedProblems: f.seeds.filter(s => s.errs.length).length,
    seedWarnings: f.seeds.reduce((n, s) => n + s.warns.length, 0),
    brokenImports: f.dead.brokenImports.length,
    unusedFiles: f.dead.unusedFiles.length,
    staleDeps: f.dead.staleDeps.length,
    cruft: f.dead.cruft.length,
    externalFailures: f.external.filter(e => e.status !== "pass").length,
    ghost: f.ghost ? 1 : 0,
  };
}

// A hard error means something is actually broken (vs. cleanup suggestions).
export function hasHardErrors(f) {
  const s = summarize(f);
  return s.bankIssues > 0 || s.seedProblems > 0 || s.brokenImports > 0 ||
         s.externalFailures > 0 || s.ghost > 0;
}

export function renderMarkdown(f, stampISO) {
  const s = summarize(f);
  const L = [];
  L.push(`# RinkReads checkup`);
  L.push("");
  L.push(`Generated: ${stampISO}${f.fast ? " (fast pass)" : ""}`);
  L.push("");
  L.push(`Summary: ${s.bankIssues} bank issues, ${s.seedProblems} seed errors ` +
         `(${s.seedWarnings} warnings), ${s.brokenImports} broken imports, ` +
         `${s.unusedFiles} unused files, ${s.staleDeps} stale deps, ${s.cruft} cruft files, ` +
         `${s.externalFailures} external check failures, ${s.ghost} preflight ghost.`);
  L.push("");

  L.push(`## Errors`);
  if (f.ghost) L.push(`- Preflight ghost path: ${f.ghost}`);
  for (const b of f.bank) L.push(`- Bank [${b.level}]: ${b.issue}`);
  for (const sd of f.seeds.filter(x => x.errs.length)) {
    for (const e of sd.errs) L.push(`- Seed [${sd.id}]: ${e}`);
  }
  if (f.dead.brokenImports.length) {
    L.push(`### Broken imports`);
    for (const bi of f.dead.brokenImports) L.push(`- ${bi.file} -> ${bi.spec}`);
  }
  for (const e of f.external.filter(x => x.status !== "pass")) {
    L.push(`- External [${e.id}] ${e.status}:`);
    L.push("```");
    L.push(e.tail);
    L.push("```");
  }
  L.push("");

  L.push(`## Warnings`);
  for (const sd of f.seeds.filter(x => x.warns.length)) {
    for (const w of sd.warns) L.push(`- Seed [${sd.id}]: ${w}`);
  }
  L.push("");

  L.push(`## Cleanup candidates`);
  for (const u of f.dead.unusedFiles) L.push(`- Unused file: ${u}`);
  for (const d of f.dead.staleDeps) L.push(`- Stale dependency: ${d}`);
  for (const c of f.dead.cruft) L.push(`- Cruft: ${c}`);
  L.push("");
  return L.join("\n");
}

export function writeReport(root, f, stampISO) {
  const dir = path.join(root, "docs", "checkups");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "latest.json"),
    JSON.stringify({ generatedAt: stampISO, summary: summarize(f), findings: f }, null, 2));
  fs.writeFileSync(path.join(dir, "latest.md"), renderMarkdown(f, stampISO));
}

function main() {
  const fast = process.argv.includes("--fast");
  const root = process.cwd();
  const stampISO = new Date().toISOString();
  const findings = collectFindings({ root, fast });
  writeReport(root, findings, stampISO);
  const s = summarize(findings);
  console.log(`RinkReads checkup ${fast ? "(fast) " : ""}written to docs/checkups/latest.md ` +
    `| bank:${s.bankIssues} seeds:${s.seedProblems} imports:${s.brokenImports} ` +
    `dead:${s.unusedFiles} deps:${s.staleDeps} cruft:${s.cruft} ext:${s.externalFailures} ghost:${s.ghost}`);
  process.exit(hasHardErrors(findings) ? 1 : 0);
}

// Run main only when invoked directly, not when imported by tests.
if (process.argv[1] && path.basename(process.argv[1]) === "rinkreads-doctor.mjs") {
  main();
}
