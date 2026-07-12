#!/usr/bin/env node
// Run: node tools/daily-tracker/rinkreads-server.test.mjs
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createTrackerServer } from "./rinkreads-server.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const FIXTURE = [
  "# Title",
  "",
  "---",
  "",
  "## 🔵 NOW — active front (max 3)",
  "",
  "- **A.** first",
  "",
  "## 🟢 NEXT — sequenced, in order",
  "",
  "1. **B.** second",
  "",
  "## ⚪ LATER — in scope, not yet sequenced",
  "",
  "- **C.** third",
  "",
  "## 🅿️ PARKING LOT — out of current scope (captured, not sequenced)",
  "",
  "- **D.** fourth",
  "",
  "## Changelog",
  "",
  "- **2026-01-01** — done one",
  "",
].join("\n");

const tmpRoot = mkdtempSync(join(tmpdir(), "rinkreads-tracker-test-"));
const tasksPath = resolve(tmpRoot, "TASKS.md");
const backupDir = resolve(tmpRoot, ".tracker-backups");
const htmlPath = resolve(tmpRoot, "index.html");
writeFileSync(tasksPath, FIXTURE, "utf8");
writeFileSync(htmlPath, "<html>tracker</html>", "utf8");
// The ops module is resolved relative to htmlPath's directory (see
// rinkreads-server.mjs's /rinkreads-tasks-ops.mjs route), so the fixture
// needs a real copy alongside the fixture HTML, not the actual source file.
writeFileSync(resolve(tmpRoot, "rinkreads-tasks-ops.mjs"), "export const marker = 'ops-module';", "utf8");

const server = createTrackerServer({ tasksPath, backupDir, htmlPath });
await new Promise((resolveP) => server.listen(0, "127.0.0.1", resolveP));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

// GET /
const homeRes = await fetch(`${base}/`);
ok("GET / serves the tracker HTML", homeRes.status === 200 && (await homeRes.text()).includes("tracker"));

// GET /rinkreads-tasks-ops.mjs — the static route the client imports from
const opsRes = await fetch(`${base}/rinkreads-tasks-ops.mjs`);
ok("GET /rinkreads-tasks-ops.mjs serves the ops module", opsRes.status === 200 && (await opsRes.text()).includes("ops-module"));
ok("GET /rinkreads-tasks-ops.mjs sets a JS content type", (opsRes.headers.get("content-type") || "").includes("javascript"));

// GET /api/tasks
const getRes = await fetch(`${base}/api/tasks`);
const getBody = await getRes.json();
ok("GET /api/tasks returns 200", getRes.status === 200);
ok("GET /api/tasks returns parsed NOW", Array.isArray(getBody.now) && getBody.now[0] === "**A.** first");

// POST /api/tasks: remove the NOW item, confirm it's gone on the next GET,
// confirm a backup was written, confirm the on-disk file actually changed.
const edited = { ...getBody, now: [] };
const postRes = await fetch(`${base}/api/tasks`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(edited),
});
const postBody = await postRes.json();
ok("POST /api/tasks returns 200", postRes.status === 200);
ok("POST /api/tasks returns the fresh parse reflecting the edit", postBody.now.length === 0);

const reGet = await (await fetch(`${base}/api/tasks`)).json();
ok("a subsequent GET reflects the write", reGet.now.length === 0 && reGet.next[0] === "**B.** second");

const onDisk = readFileSync(tasksPath, "utf8");
ok("the real file on disk was actually rewritten", !onDisk.includes("**A.** first"));

const backups = readdirSync(backupDir);
ok("a backup file was created before the write", backups.length === 1 && backups[0].startsWith("TASKS.md."));
const backupContent = readFileSync(resolve(backupDir, backups[0]), "utf8");
ok("the backup holds the PRE-edit content", backupContent === FIXTURE);

// 404 for an unknown route
const missingRes = await fetch(`${base}/nope`);
ok("an unknown route returns 404", missingRes.status === 404);

await new Promise((resolveClose) => server.close(resolveClose));
rmSync(tmpRoot, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
