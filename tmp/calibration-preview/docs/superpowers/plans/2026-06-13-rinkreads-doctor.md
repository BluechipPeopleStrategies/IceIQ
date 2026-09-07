# RinkReads Doctor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-maintaining developer agent for RinkReads that runs a deterministic health pass (bank/seed integrity plus dead-code/dep hygiene), surfaces findings once per day on activity, and applies high confidence fixes only on demand.

**Architecture:** Three layers. Layer 1 is a zero-token Node orchestrator (`tools/rinkreads-doctor.mjs`) that runs existing validators plus a new dead-code scan (`tools/lib/deadcode-scan.mjs`) and writes a report to `docs/checkups/`. Layer 2 is a SessionStart hook (`tools/doctor-hook.py`, wired in `.claude/settings.json`) with a 24-hour debounce and an activity gate; it runs the fast pass and surfaces a one-line summary. Layer 3 is an on-demand agent (`.claude/agents/rinkreads-doctor.md`) plus a `/checkup` command that read the report and fix on request.

**Tech Stack:** Node 18+ ES modules (`.mjs`), the repo's existing lightweight test harness (`ok(name, cond)` + `process.exit`), Python 3 for the hook, Claude Code agent/command markdown.

**Branch safety:** Work on a feature branch, never `main` (Vercel deploys `main`). Confirm with `git rev-parse --abbrev-ref HEAD` before the first commit. Never push.

**Source of truth (from the spec):** the live bank is `src/data/bank.json`; engine scenarios are `src/scenario/seeds/*.json`. `src/data/questions.json` no longer exists.

---

## File Structure

- Create: `tools/lib/deadcode-scan.mjs` — pure dead-code/dep/cruft scanner. One responsibility: given a repo root, report broken imports, unreachable files, stale deps, and stray backup/temp files. No I/O beyond reads.
- Create: `tools/lib/deadcode-scan.test.mjs` — unit tests for the scanner against temp-dir fixtures.
- Create: `tools/rinkreads-doctor.mjs` — orchestrator + report renderer + CLI. Collects findings (scan + bank sanity + seed lint + preflight-ghost + optional external audits), renders `latest.md`/`latest.json`.
- Create: `tools/rinkreads-doctor.test.mjs` — unit tests for the pure functions (renderers, bank sanity, ghost check).
- Create: `tools/doctor-hook.py` — SessionStart logic: debounce + activity gate, run the fast pass, emit summary.
- Create: `.claude/agents/rinkreads-doctor.md` — the fixer agent definition.
- Create: `.claude/commands/checkup.md` — the `/checkup` slash command.
- Modify: `package.json` — add `doctor` and `doctor:fast` scripts.
- Modify: `.claude/settings.json` — add the SessionStart hook.
- Modify: `.gitignore` — ignore `.claude/.doctor-state.json` and `docs/checkups/`.
- Generated (not authored): `docs/checkups/latest.md`, `docs/checkups/latest.json`, `.claude/.doctor-state.json`.

---

## Task 1: Dead-code scanner — parse, resolve, broken imports

**Files:**
- Create: `tools/lib/deadcode-scan.mjs`
- Test: `tools/lib/deadcode-scan.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tools/lib/deadcode-scan.test.mjs`:

```js
#!/usr/bin/env node
// Unit tests for the dead-code scanner. Run: node tools/lib/deadcode-scan.test.mjs
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseImports, resolveImport, walkFiles, scanBrokenImports,
} from "./deadcode-scan.mjs";

let pass = 0, fail = 0;
const ok = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); cond ? pass++ : fail++; };

// --- parseImports
{
  const src = `
    import a from "./a.js";
    import { b, c } from "../lib/b";
    import "./side-effect.css";
    export { d } from "./d";
    const e = require("./e.js");
    const f = await import("./f.jsx");
    import pkg from "some-pkg";
  `;
  const specs = parseImports(src);
  ok("parseImports finds default import", specs.includes("./a.js"));
  ok("parseImports finds named import", specs.includes("../lib/b"));
  ok("parseImports finds side-effect import", specs.includes("./side-effect.css"));
  ok("parseImports finds re-export", specs.includes("./d"));
  ok("parseImports finds require", specs.includes("./e.js"));
  ok("parseImports finds dynamic import", specs.includes("./f.jsx"));
  ok("parseImports finds bare package", specs.includes("some-pkg"));
}

// --- resolveImport + scanBrokenImports
{
  const root = mkdtempSync(join(tmpdir(), "dcs-"));
  mkdirSync(join(root, "src", "lib"), { recursive: true });
  writeFileSync(join(root, "src", "main.jsx"), `import a from "./a.js"; import miss from "./nope.js";`);
  writeFileSync(join(root, "src", "a.js"), `export default 1;`);
  writeFileSync(join(root, "src", "lib", "b.jsx"), `export const b = 2;`);

  ok("resolveImport finds .js sibling",
     resolveImport(join(root, "src", "main.jsx"), "./a.js") === join(root, "src", "a.js"));
  ok("resolveImport finds .jsx by extensionless spec",
     resolveImport(join(root, "src", "main.jsx"), "./lib/b") === join(root, "src", "lib", "b.jsx"));
  ok("resolveImport returns null for missing",
     resolveImport(join(root, "src", "main.jsx"), "./nope.js") === null);

  ok("walkFiles lists js/jsx under src",
     walkFiles(join(root, "src"), [".js", ".jsx"]).length === 3);

  const broken = scanBrokenImports(root);
  ok("scanBrokenImports flags exactly the missing one",
     broken.length === 1 && broken[0].spec === "./nope.js" && broken[0].file === join("src", "main.jsx"));
  ok("scanBrokenImports ignores bare packages",
     !broken.some(b => b.spec === "some-pkg"));

  rmSync(root, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/lib/deadcode-scan.test.mjs`
Expected: FAIL — `Cannot find module './deadcode-scan.mjs'` (the module does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `tools/lib/deadcode-scan.mjs`:

```js
// Zero-dependency dead-code / dependency / cruft scanner for RinkReads (src/ only).
// Heuristic by design: import parsing is regex-based, so it can over-report a broken
// import (e.g. a spec inside a comment) and under-reports nothing important. Findings
// are reported, never auto-applied; the agent verifies each before acting.
import fs from "node:fs";
import path from "node:path";

// Extract import/require/dynamic-import/re-export specifiers from JS/JSX source.
export function parseImports(src) {
  const specs = new Set();
  const patterns = [
    /import\s+[^;]*?from\s*['"]([^'"]+)['"]/g, // import x from "..."
    /import\s*['"]([^'"]+)['"]/g,              // import "..."
    /export\s+[^;]*?from\s*['"]([^'"]+)['"]/g, // export ... from "..."
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,      // require("...")
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,       // dynamic import("...")
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(src))) specs.add(m[1]);
  }
  return [...specs];
}

// Resolve a RELATIVE specifier from importerFile against the filesystem.
// Honors .js/.jsx/.json and index files. Returns absolute path or null.
export function resolveImport(importerFile, spec) {
  const base = path.resolve(path.dirname(importerFile), spec);
  const candidates = [
    base, base + ".js", base + ".jsx", base + ".json",
    path.join(base, "index.js"), path.join(base, "index.jsx"),
  ];
  for (const c of candidates) {
    try { if (fs.statSync(c).isFile()) return c; } catch { /* not a file */ }
  }
  return null;
}

// Recursively list files under dir with one of the given extensions. Skips node_modules.
export function walkFiles(dir, exts) {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === "node_modules") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkFiles(full, exts));
    else if (exts.some(x => e.name.endsWith(x))) out.push(full);
  }
  return out;
}

// Relative imports under src/ that do not resolve to a real file.
export function scanBrokenImports(root) {
  const srcDir = path.join(root, "src");
  const broken = [];
  for (const f of walkFiles(srcDir, [".js", ".jsx"])) {
    const src = fs.readFileSync(f, "utf8");
    for (const spec of parseImports(src)) {
      if (!spec.startsWith(".")) continue; // bare packages handled by stale-deps
      if (resolveImport(f, spec) === null) {
        broken.push({ file: path.relative(root, f), spec });
      }
    }
  }
  return broken;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tools/lib/deadcode-scan.test.mjs`
Expected: PASS — `11 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add tools/lib/deadcode-scan.mjs tools/lib/deadcode-scan.test.mjs
git commit -m "feat(doctor): dead-code scanner — import parse/resolve + broken imports"
```

---

## Task 2: Dead-code scanner — unused files, stale deps, cruft, aggregate

**Files:**
- Modify: `tools/lib/deadcode-scan.mjs` (append functions)
- Test: `tools/lib/deadcode-scan.test.mjs` (insert tests before the final summary block)

- [ ] **Step 1: Write the failing tests**

In `tools/lib/deadcode-scan.test.mjs`, add these imports to the existing import block (extend the `from "./deadcode-scan.mjs"` list):

```js
import {
  parseImports, resolveImport, walkFiles, scanBrokenImports,
  parseGlobSpecs, globToRegExp, buildReachable, findUnusedFiles,
  packageNameOf, collectBareImports, scanStaleDeps, scanCruft, scanDeadCode,
} from "./deadcode-scan.mjs";
```

Then insert this block immediately BEFORE the final `console.log(\`\n${pass} passed, ${fail} failed\`);` line:

```js
// --- glob helpers
ok("globToRegExp matches single star within a segment",
   globToRegExp("/a/*.json").test("/a/x.json") && !globToRegExp("/a/*.json").test("/a/b/x.json"));
ok("globToRegExp matches double star across segments",
   globToRegExp("/a/**/*.js").test("/a/b/c.js"));
ok("parseGlobSpecs extracts import.meta.glob pattern",
   parseGlobSpecs(`const m = import.meta.glob("./seeds/*.json", { eager: true });`)[0] === "./seeds/*.json");

// --- unused files, deps, cruft, aggregate
{
  const root = mkdtempSync(join(tmpdir(), "dcs2-"));
  mkdirSync(join(root, "src", "scenario", "seeds"), { recursive: true });
  mkdirSync(join(root, "src", "data", "backups"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({
    dependencies: { "used-pkg": "1.0.0", "dead-pkg": "1.0.0", "vite": "5.0.0" },
    devDependencies: { "esbuild": "1.0.0" },
  }));
  writeFileSync(join(root, "src", "main.jsx"),
    `import a from "./a.js"; import x from "used-pkg"; ` +
    `const s = import.meta.glob("./scenario/seeds/*.json", { eager: true });`);
  writeFileSync(join(root, "src", "a.js"), `export default 1;`);
  writeFileSync(join(root, "src", "orphan.jsx"), `export const dead = 1;`);
  writeFileSync(join(root, "src", "a.test.js"), `// test file, not dead`);
  writeFileSync(join(root, "src", "scenario", "seeds", "s1.json"), `{ "id": "s1" }`);
  writeFileSync(join(root, "src", "data", "x.bak"), `old`);
  writeFileSync(join(root, "src", "data", "questions.json.ship.tmp"), `old`);
  writeFileSync(join(root, "src", "data", "backups", "keep.bak"), `intentional`);

  const reachable = buildReachable(root, "src/main.jsx");
  ok("buildReachable includes entry and static import",
     reachable.has(join(root, "src", "main.jsx")) && reachable.has(join(root, "src", "a.js")));
  ok("buildReachable includes glob-matched seed",
     reachable.has(join(root, "src", "scenario", "seeds", "s1.json")));

  const unused = findUnusedFiles(root, "src/main.jsx");
  ok("findUnusedFiles flags orphan", unused.includes(join("src", "orphan.jsx")));
  ok("findUnusedFiles ignores test files", !unused.some(u => u.endsWith("a.test.js")));
  ok("findUnusedFiles does not flag reachable files", !unused.includes(join("src", "a.js")));

  ok("packageNameOf handles scoped pkg", packageNameOf("@scope/pkg/sub") === "@scope/pkg");
  ok("packageNameOf handles plain pkg", packageNameOf("react/jsx-runtime") === "react");

  const used = collectBareImports(root);
  ok("collectBareImports finds used package", used.has("used-pkg"));

  const stale = scanStaleDeps(root);
  ok("scanStaleDeps flags unused dependency", stale.includes("dead-pkg"));
  ok("scanStaleDeps ignores used dependency", !stale.includes("used-pkg"));
  ok("scanStaleDeps ignores build-time dep on allowlist", !stale.includes("vite"));

  const cruft = scanCruft(root);
  ok("scanCruft flags .bak loose in data", cruft.includes(join("src", "data", "x.bak")));
  ok("scanCruft flags .ship.tmp", cruft.includes(join("src", "data", "questions.json.ship.tmp")));
  ok("scanCruft leaves backups/ dir alone", !cruft.some(c => c.includes("backups")));

  const all = scanDeadCode({ root, entry: "src/main.jsx" });
  ok("scanDeadCode aggregates all four buckets",
     Array.isArray(all.brokenImports) && all.unusedFiles.includes(join("src", "orphan.jsx")) &&
     all.staleDeps.includes("dead-pkg") && all.cruft.length >= 2);

  rmSync(root, { recursive: true, force: true });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/lib/deadcode-scan.test.mjs`
Expected: FAIL — `SyntaxError` or `... is not a function` because `parseGlobSpecs`, `globToRegExp`, `buildReachable`, `findUnusedFiles`, `packageNameOf`, `collectBareImports`, `scanStaleDeps`, `scanCruft`, `scanDeadCode` are not exported yet.

- [ ] **Step 3: Write the implementation**

Append to `tools/lib/deadcode-scan.mjs`:

```js
// Build-time dependencies that legitimately have no src/ import.
export const BUILD_DEPS = new Set([
  "vite", "@vitejs/plugin-react", "postcss", "tailwindcss", "autoprefixer", "eslint",
]);

// Extract import.meta.glob("PATTERN") specifiers from source.
export function parseGlobSpecs(src) {
  const out = [];
  const re = /import\.meta\.glob\(\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}

// Convert a glob pattern (supports * and **) to an anchored RegExp over "/"-joined paths.
export function globToRegExp(pattern) {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") {
      if (pattern[i + 1] === "*") { re += ".*"; i++; if (pattern[i + 1] === "/") i++; }
      else re += "[^/]*";
    } else if ("/.+?()[]{}^$|\\".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp("^" + re + "$");
}

// Set of absolute file paths reachable from the entry via static imports and globs.
export function buildReachable(root, entryRel = "src/main.jsx") {
  const srcDir = path.join(root, "src");
  const entry = path.join(root, entryRel);
  const reachable = new Set();
  const stack = [];
  if (fs.existsSync(entry)) { reachable.add(entry); stack.push(entry); }
  const srcFiles = walkFiles(srcDir, [".js", ".jsx", ".json"]);
  while (stack.length) {
    const f = stack.pop();
    let src;
    try { src = fs.readFileSync(f, "utf8"); } catch { continue; }
    for (const spec of parseImports(src)) {
      if (!spec.startsWith(".")) continue;
      const r = resolveImport(f, spec);
      if (r && !reachable.has(r)) { reachable.add(r); stack.push(r); }
    }
    for (const g of parseGlobSpecs(src)) {
      const absPattern = path.resolve(path.dirname(f), g).split(path.sep).join("/");
      const rx = globToRegExp(absPattern);
      for (const cand of srcFiles) {
        const norm = cand.split(path.sep).join("/");
        if (rx.test(norm) && !reachable.has(cand)) { reachable.add(cand); stack.push(cand); }
      }
    }
  }
  return reachable;
}

// src/ .js/.jsx files not reachable from the entry (test files excluded).
export function findUnusedFiles(root, entryRel = "src/main.jsx") {
  const srcDir = path.join(root, "src");
  const reachable = buildReachable(root, entryRel);
  const unused = [];
  for (const f of walkFiles(srcDir, [".js", ".jsx"])) {
    if (reachable.has(f)) continue;
    if (/\.test\.(js|jsx)$/.test(f)) continue;
    unused.push(path.relative(root, f));
  }
  return unused;
}

// Normalize a bare specifier to its package name (handles scopes and subpaths).
export function packageNameOf(spec) {
  if (spec.startsWith("@")) {
    const parts = spec.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
  }
  return spec.split("/")[0];
}

// Set of package names imported anywhere under src/ (excludes relative and node: specs).
export function collectBareImports(root) {
  const srcDir = path.join(root, "src");
  const names = new Set();
  for (const f of walkFiles(srcDir, [".js", ".jsx"])) {
    const src = fs.readFileSync(f, "utf8");
    for (const spec of parseImports(src)) {
      if (spec.startsWith(".") || spec.startsWith("node:")) continue;
      names.add(packageNameOf(spec));
    }
  }
  return names;
}

// dependencies declared in package.json but never imported under src/ (build deps allowlisted).
export function scanStaleDeps(root, allowlist = BUILD_DEPS) {
  let pkg;
  try { pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")); }
  catch { return []; }
  const deps = Object.keys(pkg.dependencies || {});
  const used = collectBareImports(root);
  return deps.filter(d => !used.has(d) && !allowlist.has(d));
}

// Stray backup/temp files loose directly in src/data/ (the backups/ subdir is intentional).
export function scanCruft(root) {
  const dataDir = path.join(root, "src", "data");
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dataDir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.isDirectory()) continue;
    if (/\.(bak|tmp|orig)$/i.test(e.name)) out.push(path.relative(root, path.join(dataDir, e.name)));
  }
  return out;
}

// Aggregate all four buckets.
export function scanDeadCode({ root, entry = "src/main.jsx" } = {}) {
  return {
    brokenImports: scanBrokenImports(root),
    unusedFiles: findUnusedFiles(root, entry),
    staleDeps: scanStaleDeps(root),
    cruft: scanCruft(root),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tools/lib/deadcode-scan.test.mjs`
Expected: PASS — all assertions pass, `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add tools/lib/deadcode-scan.mjs tools/lib/deadcode-scan.test.mjs
git commit -m "feat(doctor): dead-code scanner — unused files, stale deps, cruft, aggregate"
```

---

## Task 3: Doctor orchestrator — bank sanity, ghost check, renderers, CLI

**Files:**
- Create: `tools/rinkreads-doctor.mjs`
- Test: `tools/rinkreads-doctor.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tools/rinkreads-doctor.test.mjs`:

```js
#!/usr/bin/env node
// Unit tests for the doctor's pure functions. Run: node tools/rinkreads-doctor.test.mjs
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bankSanity, checkPreflightGhost, summarize, renderMarkdown } from "./rinkreads-doctor.mjs";

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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/rinkreads-doctor.test.mjs`
Expected: FAIL — `Cannot find module './rinkreads-doctor.mjs'`.

- [ ] **Step 3: Write the implementation**

Create `tools/rinkreads-doctor.mjs`:

```js
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
    const r = lintScenario(s);
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
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main();
}
```

Note on the direct-run guard: on Windows the `import.meta.url` pathname has a leading slash (for example `/C:/...`). The `path.resolve` on both sides normalizes them so the comparison holds. If a subagent finds the guard does not fire when running `node tools/rinkreads-doctor.mjs`, replace the condition with `import.meta.url === \`file://${process.argv[1]}\`` is NOT reliable cross-platform; instead use the `process.argv[1]` basename check: `path.basename(process.argv[1] || "") === "rinkreads-doctor.mjs"`. Verify in Task 8.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tools/rinkreads-doctor.test.mjs`
Expected: PASS — `0 failed`. (Tests import named functions only; `main()` does not run on import.)

- [ ] **Step 5: Commit**

```bash
git add tools/rinkreads-doctor.mjs tools/rinkreads-doctor.test.mjs
git commit -m "feat(doctor): orchestrator — bank sanity, seed lint, ghost check, renderers, CLI"
```

---

## Task 4: npm scripts and .gitignore

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Add the npm scripts**

In `package.json`, inside the `"scripts"` object, add these two entries next to the other `test:`/`audit:` scripts:

```json
    "doctor": "node tools/rinkreads-doctor.mjs",
    "doctor:fast": "node tools/rinkreads-doctor.mjs --fast",
```

- [ ] **Step 2: Add gitignore entries**

Append to `.gitignore`:

```gitignore
# RinkReads Doctor
.claude/.doctor-state.json
docs/checkups/
```

- [ ] **Step 3: Verify the scripts resolve**

Run: `npm run doctor:fast`
Expected: prints a `RinkReads checkup (fast) written to docs/checkups/latest.md | ...` line and creates `docs/checkups/latest.md` and `docs/checkups/latest.json`. (Findings counts will reflect the real repo; that is fine here. Exit code may be 1 if hard errors exist; that is expected.)

- [ ] **Step 4: Commit**

```bash
git add package.json .gitignore
git commit -m "chore(doctor): add doctor/doctor:fast npm scripts and gitignore report state"
```

---

## Task 5: SessionStart hook

**Files:**
- Create: `tools/doctor-hook.py`
- Modify: `.claude/settings.json`

- [ ] **Step 1: Write the hook script**

Create `tools/doctor-hook.py`:

```python
#!/usr/bin/env python3
# SessionStart hook for RinkReads Doctor. Runs the fast deterministic pass at most
# once per 24h, and only when RinkReads has changed since the last run. Emits a
# one-line systemMessage. Fails silent on any error (never blocks session start).
import json, os, subprocess, sys, time

ROOT = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
STATE = os.path.join(ROOT, ".claude", ".doctor-state.json")
REPORT = os.path.join(ROOT, "docs", "checkups", "latest.json")
WATCH = ["src", "tools"]

def emit(msg=None):
    print(json.dumps({"systemMessage": msg} if msg else {}))
    sys.exit(0)

def read_state():
    try:
        with open(STATE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def git(args):
    try:
        r = subprocess.run(["git", "-C", ROOT, *args],
                           capture_output=True, text=True, timeout=10)
        return r.stdout
    except Exception:
        return ""

def last_commit_epoch():
    try:
        return int((git(["log", "-1", "--format=%ct"]) or "0").strip() or 0)
    except Exception:
        return 0

def tree_dirty():
    return bool(git(["status", "--porcelain"]).strip())

def newest_mtime(dirs):
    newest = 0.0
    for d in dirs:
        for root, _, files in os.walk(os.path.join(ROOT, d)):
            if "node_modules" in root:
                continue
            for fn in files:
                try:
                    m = os.path.getmtime(os.path.join(root, fn))
                    if m > newest:
                        newest = m
                except OSError:
                    pass
    return newest

def main():
    state = read_state()
    last = float(state.get("lastRun", 0))
    now = time.time()
    if (now - last) < 24 * 3600:
        emit()
    active = (last_commit_epoch() > last) or tree_dirty() or (newest_mtime(WATCH) > last)
    if not active:
        emit()
    try:
        subprocess.run(["node", os.path.join("tools", "rinkreads-doctor.mjs"), "--fast"],
                       cwd=ROOT, capture_output=True, text=True, timeout=120)
    except Exception:
        emit()
    try:
        os.makedirs(os.path.dirname(STATE), exist_ok=True)
        with open(STATE, "w", encoding="utf-8") as f:
            json.dump({"lastRun": now}, f)
    except Exception:
        pass
    try:
        with open(REPORT, encoding="utf-8") as f:
            s = json.load(f).get("summary", {})
        parts = []
        if s.get("bankIssues"): parts.append(f"{s['bankIssues']} bank issues")
        if s.get("seedProblems"): parts.append(f"{s['seedProblems']} seed errors")
        if s.get("brokenImports"): parts.append(f"{s['brokenImports']} broken imports")
        if s.get("unusedFiles"): parts.append(f"{s['unusedFiles']} dead files")
        if s.get("staleDeps"): parts.append(f"{s['staleDeps']} stale deps")
        if s.get("cruft"): parts.append(f"{s['cruft']} cruft files")
        if s.get("ghost"): parts.append("preflight ghost-path")
        summary = ", ".join(parts) if parts else "all clear"
        emit(f"RinkReads checkup: {summary}. See docs/checkups/latest.md; run /checkup to fix.")
    except Exception:
        emit("RinkReads checkup ran. See docs/checkups/latest.md; run /checkup to fix.")

main()
```

- [ ] **Step 2: Wire the hook into settings.json**

Replace the contents of `.claude/settings.json` with (this preserves the existing `permissions` block and adds `hooks`):

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run build)",
      "Bash(npm run build:dashboard)",
      "Bash(npm run dev)",
      "Bash(npm run doctor)",
      "Bash(npm run doctor:fast)"
    ]
  },
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "shell": "bash",
            "command": "python \"$CLAUDE_PROJECT_DIR/tools/doctor-hook.py\"",
            "statusMessage": "RinkReads Doctor: checkup gate"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 3: Verify the hook gate logic manually (forced run)**

Simulate a due run by clearing state, then invoking the hook directly:

Run:
```bash
rm -f .claude/.doctor-state.json
CLAUDE_PROJECT_DIR="$(pwd)" python tools/doctor-hook.py
```
Expected: prints a single JSON object containing a `systemMessage` like `RinkReads checkup: ... See docs/checkups/latest.md; run /checkup to fix.`, creates `.claude/.doctor-state.json`, and refreshes `docs/checkups/latest.json`.

- [ ] **Step 4: Verify the debounce**

Run the hook a second time immediately:
```bash
CLAUDE_PROJECT_DIR="$(pwd)" python tools/doctor-hook.py
```
Expected: prints `{}` (debounced, under 24h since the last run) and does not re-run the doctor.

- [ ] **Step 5: Commit**

```bash
git add tools/doctor-hook.py .claude/settings.json
git commit -m "feat(doctor): SessionStart hook with 24h debounce + activity gate"
```

---

## Task 6: Fixer agent definition

**Files:**
- Create: `.claude/agents/rinkreads-doctor.md`

- [ ] **Step 1: Write the agent definition**

Create `.claude/agents/rinkreads-doctor.md`:

```markdown
---
name: rinkreads-doctor
description: Reads the latest RinkReads checkup report and, on request, applies high-confidence fixes (broken imports, proven-dead files, validator-pinpointed JSON errors). Reports judgment-heavy items without changing them. Never pushes, never commits to main.
tools: Read, Edit, Write, Bash, Grep, Glob
---

You keep the RinkReads codebase healthy. The deterministic checks already ran; your
job is to interpret `docs/checkups/latest.json` and fix only what is safe.

Source of truth: the live bank is `src/data/bank.json`; engine scenarios are
`src/scenario/seeds/*.json`. `src/data/questions.json` does not exist.

Workflow:
1. Read `docs/checkups/latest.json`. If it is missing or stale, run
   `npm run doctor` first, then read it.
2. Summarize findings grouped as Errors, Warnings, Cleanup candidates.
3. Fix ONLY high-confidence items, and only when the user has asked you to fix:
   - Broken imports: repair the path if the target obviously moved (grep for the
     basename first), otherwise remove the dead import and report it.
   - Unused files: before deleting, grep the whole repo (including `import.meta.glob`
     patterns and dynamic `import(...)`) for any reference. Delete only if truly
     unreferenced. When in doubt, leave it and list it.
   - Malformed JSON the validators pinpoint to an exact location: fix the exact field.
   - Cruft (.bak/.tmp loose in src/data/): offer to remove; never touch
     `src/data/backups/`.
4. NEVER auto-change judgment-heavy items: a scenario that lints clean but reads
   wrong, a dependency that might be used dynamically, a file that looks unused but
   is clearly work-in-progress. List them for the user.
5. After fixes, re-run `npm run doctor` and confirm the counts dropped.

Commit rules (hard):
- Confirm the branch with `git rev-parse --abbrev-ref HEAD`. If it is `main`, STOP and
  ask the user to switch to a feature branch. Vercel deploys `main`.
- Scope each commit to only the files you changed. Clear message. Include the trailer
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Never push. Never run `git push`.

Your final message: what you fixed (with paths), what you deliberately left and why,
and the before/after checkup counts.
```

- [ ] **Step 2: Verify the frontmatter parses**

Run: `node -e "const fs=require('fs');const t=fs.readFileSync('.claude/agents/rinkreads-doctor.md','utf8');const m=t.match(/^---\n([\s\S]*?)\n---/);if(!m){console.error('NO FRONTMATTER');process.exit(1)};['name:','description:','tools:'].forEach(k=>{if(!m[1].includes(k)){console.error('MISSING '+k);process.exit(1)}});console.log('frontmatter ok')"`
Expected: `frontmatter ok`.

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/rinkreads-doctor.md
git commit -m "feat(doctor): rinkreads-doctor fixer agent (fix-on-demand, branch-safe)"
```

---

## Task 7: /checkup command

**Files:**
- Create: `.claude/commands/checkup.md`

- [ ] **Step 1: Write the command**

Create `.claude/commands/checkup.md`:

```markdown
---
description: Run a full RinkReads health checkup now and offer to fix what is safe.
---

Run a fresh, full RinkReads Doctor pass regardless of the 24h gate, then help fix.

1. Run `npm run doctor` (the full pass, including the audit scripts). It writes
   `docs/checkups/latest.{md,json}`.
2. Read `docs/checkups/latest.json` and give the user a tight summary grouped as
   Errors, Warnings, and Cleanup candidates, worst first.
3. Ask whether to fix. If yes, dispatch the `rinkreads-doctor` agent to apply only
   high-confidence fixes on the current branch (it will refuse on `main`), then report
   what changed and the new counts.

Do not push. Do not commit to `main`.
```

- [ ] **Step 2: Verify it parses**

Run: `node -e "const fs=require('fs');const t=fs.readFileSync('.claude/commands/checkup.md','utf8');if(!/^---\n[\s\S]*?description:[\s\S]*?\n---/.test(t)){console.error('bad frontmatter');process.exit(1)};console.log('command ok')"`
Expected: `command ok`.

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/checkup.md
git commit -m "feat(doctor): /checkup command (full pass + fix-on-demand handoff)"
```

---

## Task 8: End-to-end verification against the real repo

**Files:** none created; this task proves the system works and that the direct-run guard fires.

- [ ] **Step 1: Run the full doctor against the real repo**

Run: `npm run doctor`
Expected: prints the one-line `RinkReads checkup written to docs/checkups/latest.md | ...` summary and writes both report files. If it prints nothing and exits 0 without writing files, the direct-run guard did not fire; apply the fallback from Task 3 Step 3 (basename check), re-run, and confirm output appears.

- [ ] **Step 2: Confirm the known findings are caught**

Run: `node -e "const r=require('./docs/checkups/latest.json');console.log('ghost:',r.summary.ghost,'cruft:',r.summary.cruft);console.log(r.findings.dead.cruft)"`
Expected: `ghost: 1` (preflight points at the missing `questions.json`) and `cruft:` at least 1, with the array including `src/data/questions.json.ship.tmp`. This is the worked proof that the agent catches real breakage.

- [ ] **Step 3: Run the full unit test suite for the new code**

Run:
```bash
node tools/lib/deadcode-scan.test.mjs && node tools/rinkreads-doctor.test.mjs
```
Expected: both print `0 failed`.

- [ ] **Step 4: Sanity-check the fast pass excludes external checks**

Run: `node -e "const r=require('child_process').execSync('node tools/rinkreads-doctor.mjs --fast').toString();console.log('ok')" && node -e "const r=require('./docs/checkups/latest.json');console.log('external entries:', r.findings.external.length)"`
Expected: `external entries: 0` (fast pass ran no audit scripts), and `latest.json` still written.

- [ ] **Step 5: Final commit (only if any verification fix was applied)**

If Step 1 required the guard fallback, commit it:
```bash
git add tools/rinkreads-doctor.mjs
git commit -m "fix(doctor): robust direct-run guard for the CLI entry"
```
Otherwise, no commit (report files are gitignored).

---

## Self-Review

**Spec coverage:**
- Layer 1 deterministic doctor + report -> Tasks 3, 4 (orchestrator, renderers, scripts).
- Reuse existing validators (gauntlet:audit, curriculum-audit, ledger, qa:flagged, validate-seed/lintScenario) -> Task 3 `runExternalChecks` + `validateSeeds`.
- New dead-code/import/dep/cruft scan, src/ only, tools/ excluded -> Tasks 1, 2.
- Bank.json as source of truth, validated directly; preflight-ghost flagged -> Task 3 `bankSanity` + `checkPreflightGhost`, proven in Task 8 Step 2.
- Layer 2 hook: 24h debounce + activity gate, fast pass, one-line summary, fail-silent -> Task 5.
- Layer 3 agent + /checkup, fix-on-demand, branch-safe (never main/push) -> Tasks 6, 7.
- Report output paths and run-state file, gitignored -> Task 4.

**Placeholder scan:** No TBD/TODO. Every code step shows complete code. Verification steps show exact commands and expected output.

**Type/name consistency:** Function names match across tasks and tests: `parseImports`, `resolveImport`, `walkFiles`, `scanBrokenImports`, `parseGlobSpecs`, `globToRegExp`, `buildReachable`, `findUnusedFiles`, `packageNameOf`, `collectBareImports`, `scanStaleDeps`, `scanCruft`, `scanDeadCode`, `bankSanity`, `checkPreflightGhost`, `validateSeeds`, `runExternalChecks`, `collectFindings`, `summarize`, `hasHardErrors`, `renderMarkdown`, `writeReport`. The report JSON shape (`summary` keys) used by the hook in Task 5 matches `summarize()` in Task 3.

**Known heuristic risk (documented, not a gap):** regex import parsing can over-report a broken import; this is why session-start is report-only and the agent verifies before acting (Task 6 Step 3).
