#!/usr/bin/env node
// Run: node tools/daily-tracker/rinkreads-server.test.mjs
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createTrackerServer } from "./rinkreads-server.mjs";
import { parseTasks, serializeTasks } from "./rinkreads-tasks-parser.mjs";

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

// POST /api/tasks with an invalid payload (now missing entirely): expect
// 400, and confirm nothing was written — no on-disk change, no new backup.
const beforeInvalidOnDisk = readFileSync(tasksPath, "utf8");
const backupsBeforeInvalid = readdirSync(backupDir).length;
const { now: _droppedNow, ...missingNowPayload } = postBody;
const invalidRes = await fetch(`${base}/api/tasks`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(missingNowPayload),
});
ok("POST with now missing entirely returns 400", invalidRes.status === 400);
const invalidBody = await invalidRes.json();
ok("400 response includes an error message", typeof invalidBody.error === "string" && invalidBody.error.length > 0);
ok("invalid POST does not modify the file on disk", readFileSync(tasksPath, "utf8") === beforeInvalidOnDisk);
ok("invalid POST does not create a backup", readdirSync(backupDir).length === backupsBeforeInvalid);

// changelog is enforced read-only server-side: even if a client sends a
// different changelog, the server must ignore it and keep whatever is
// actually on disk.
const diskBeforeChangelogTest = parseTasks(readFileSync(tasksPath, "utf8"));
const tamperedPayload = { ...postBody, changelog: ["**9999-99-99** — tampered entry that should never be written"] };
const tamperedRes = await fetch(`${base}/api/tasks`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(tamperedPayload),
});
ok("POST with a tampered changelog still returns 200", tamperedRes.status === 200);
const afterTamperedOnDisk = parseTasks(readFileSync(tasksPath, "utf8"));
ok(
  "server ignores the client-sent changelog and keeps what was on disk before the POST",
  JSON.stringify(afterTamperedOnDisk.changelog) === JSON.stringify(diskBeforeChangelogTest.changelog)
);
ok("the tampered changelog entry was not written to disk", !readFileSync(tasksPath, "utf8").includes("tampered entry"));

// 404 for an unknown route
const missingRes = await fetch(`${base}/nope`);
ok("an unknown route returns 404", missingRes.status === 404);

await new Promise((resolveClose) => server.close(resolveClose));
rmSync(tmpRoot, { recursive: true, force: true });

// A second server instance, backed by a CRLF fixture, proves a POST with
// crlf: true actually writes \r\n line endings to disk end-to-end — not
// just that the parser's own CRLF unit test round-trips in isolation. The
// real docs/roadmap/TASKS.md uses CRLF, so this is the guarantee that
// actually matters.
const crlfFixture = FIXTURE.replace(/\n/g, "\r\n");
const tmpRoot2 = mkdtempSync(join(tmpdir(), "rinkreads-tracker-test-crlf-"));
const tasksPath2 = resolve(tmpRoot2, "TASKS.md");
const backupDir2 = resolve(tmpRoot2, ".tracker-backups");
const htmlPath2 = resolve(tmpRoot2, "index.html");
writeFileSync(tasksPath2, crlfFixture, "utf8");
writeFileSync(htmlPath2, "<html>tracker</html>", "utf8");
writeFileSync(resolve(tmpRoot2, "rinkreads-tasks-ops.mjs"), "export const marker = 'ops-module';", "utf8");

const server2 = createTrackerServer({ tasksPath: tasksPath2, backupDir: backupDir2, htmlPath: htmlPath2 });
await new Promise((resolveP) => server2.listen(0, "127.0.0.1", resolveP));
const port2 = server2.address().port;
const base2 = `http://127.0.0.1:${port2}`;

const getRes2 = await fetch(`${base2}/api/tasks`);
const getBody2 = await getRes2.json();
ok("CRLF fixture: GET /api/tasks detects crlf true", getBody2.crlf === true);

const edited2 = { ...getBody2, now: [] };
const postRes2 = await fetch(`${base2}/api/tasks`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(edited2),
});
ok("CRLF fixture: POST /api/tasks returns 200", postRes2.status === 200);

const expectedOnDisk2 = serializeTasks({ ...parseTasks(crlfFixture), now: [] });
const onDisk2 = readFileSync(tasksPath2, "utf8");
ok("CRLF fixture: written file uses \\r\\n line endings, not bare \\n", onDisk2.includes("\r\n") && !/[^\r]\n/.test(onDisk2));
ok("CRLF fixture: written file matches expected content byte-for-byte", onDisk2 === expectedOnDisk2);

await new Promise((resolveClose) => server2.close(resolveClose));
rmSync(tmpRoot2, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
