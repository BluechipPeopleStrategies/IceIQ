# RinkReads Daily Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone local dashboard (`tools/daily-tracker/rinkreads-daily-tracker.html` + a tiny Node server) that parses `docs/roadmap/TASKS.md` into Today/This Week/Later/Waiting/Done, and lets Thomas remove, add, and move items between sections — writing changes back to the real file.

**Architecture:** A pure parser/serializer module (the correctness-critical piece — round-trips every byte of an untouched file), a pure ops module (remove/add/move on the parsed structure), a small `node:http` server exposing those as a JSON API with file-write safety (backup-before-write), and a dependency-free single-page HTML client.

**Tech Stack:** Node.js ESM (`.mjs`), `node:http`/`node:fs`/`node:path`/`node:url` only — zero new dependencies. Plain HTML/CSS/JS client, no framework, no build step. Tests use this project's existing plain pass/fail counter convention (see `tools/gauntlet-audit.test.mjs`), run directly with `node`.

## Global Constraints

- Zero new npm dependencies anywhere in this plan.
- `docs/roadmap/TASKS.md` **must round-trip byte-for-byte** when nothing is edited — this is the core safety guarantee and is verified by a dedicated test against the real file (Task 1).
- The file uses **CRLF (`\r\n`) line endings** — confirmed by direct testing against the real file. The parser must detect this and the serializer must restore it; internal logic works on `\n`-normalized text throughout.
- Every write to `TASKS.md` is preceded by a timestamped backup in `docs/roadmap/.tracker-backups/` (gitignored — local scratch, never committed).
- Items are opaque strings (no leading `- `/`N. ` marker, that's regenerated fresh on serialize). The parser/serializer never inspects or reformats an item's internal markdown.
- Server is local-only (`127.0.0.1:8788`), separate port from BlueChip's tracker (`8787`) so both can run at once.
- No Notion sync, no connection to the BlueChip daily tracker — fully separate tool.
- Editable sections: `now`, `next`, `later`, `parking`. `changelog` is read-only (parsed and returned, never written to by an add/remove/move).

---

## Task 1: Parser/serializer module

**Files:**
- Create: `tools/daily-tracker/rinkreads-tasks-parser.mjs`
- Test: `tools/daily-tracker/rinkreads-tasks-parser.test.mjs`

**Interfaces:**
- Produces: `parseTasks(raw: string) -> { headerRaw: string, now: string[], next: string[], later: string[], parking: string[], changelog: string[], crlf: boolean }`. `serializeTasks(data) -> string`.

- [ ] **Step 1: Write the failing test**

Create `tools/daily-tracker/rinkreads-tasks-parser.test.mjs`:

```js
#!/usr/bin/env node
// Run: node tools/daily-tracker/rinkreads-tasks-parser.test.mjs
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTasks, serializeTasks } from "./rinkreads-tasks-parser.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
const realPath = resolve(root, "docs/roadmap/TASKS.md");

// Round-trip against the REAL file: the core safety guarantee. If this ever
// fails, something in TASKS.md's structure changed in a way the parser
// doesn't understand yet — do not "fix" the test by loosening the
// comparison; go find out what changed and handle it properly.
const realRaw = readFileSync(realPath, "utf8");
const realParsed = parseTasks(realRaw);
ok("real file: detects CRLF", realParsed.crlf === true);
ok("real file: NOW has at least 1 item", realParsed.now.length >= 1);
ok("real file: NEXT has at least 1 item", realParsed.next.length >= 1);
ok("real file: items have no leading marker", !realParsed.now[0].startsWith("- ") && !realParsed.next[0].startsWith("1. "));
ok("real file: round-trips byte-for-byte with no edits", serializeTasks(realParsed) === realRaw);

// Small synthetic fixture: exercises every section shape without depending
// on the real file's exact current content (so this half of the suite
// doesn't need updating every time TASKS.md's content changes).
const fixture = [
  "# Title",
  "",
  "**Scope:** test",
  "",
  "---",
  "",
  "## 🔵 NOW — active front (max 3)",
  "",
  "- **A.** first",
  "- **B.** second",
  "",
  "## 🟢 NEXT — sequenced, in order",
  "",
  "1. **C.** third",
  "2. **D.** fourth",
  "",
  "## ⚪ LATER — in scope, not yet sequenced",
  "",
  "- **E.** fifth",
  "",
  "## 🅿️ PARKING LOT — out of current scope (captured, not sequenced)",
  "",
  "- **F.** sixth",
  "",
  "## Changelog",
  "",
  "- **2026-01-01** — done one",
  "",
].join("\n");

const parsed = parseTasks(fixture);
ok("fixture: crlf false for LF input", parsed.crlf === false);
ok("fixture: headerRaw captured", parsed.headerRaw.includes("**Scope:** test") && parsed.headerRaw.includes("---"));
ok("fixture: now has 2 items, markers stripped", parsed.now.length === 2 && parsed.now[0] === "**A.** first");
ok("fixture: next has 2 items, markers stripped", parsed.next.length === 2 && parsed.next[1] === "**D.** fourth");
ok("fixture: later/parking/changelog each have 1 item", parsed.later.length === 1 && parsed.parking.length === 1 && parsed.changelog.length === 1);
ok("fixture: round-trips byte-for-byte", serializeTasks(parsed) === fixture);

// A CRLF fixture, to prove the round-trip guarantee isn't an accident of
// the real file happening to work.
const crlfFixture = fixture.replace(/\n/g, "\r\n");
const crlfParsed = parseTasks(crlfFixture);
ok("crlf fixture: detected", crlfParsed.crlf === true);
ok("crlf fixture: items parsed the same as the LF version", crlfParsed.now[0] === "**A.** first");
ok("crlf fixture: round-trips byte-for-byte, CRLF preserved", serializeTasks(crlfParsed) === crlfFixture);

// serializeTasks renumbers NEXT fresh — proves the numbered list doesn't
// just parrot back whatever number happened to be in the source.
const renumbered = { ...parsed, next: [parsed.next[1]] }; // drop item 1, keep only "D"
const renumberedOut = serializeTasks(renumbered);
ok("serializeTasks renumbers NEXT from scratch", renumberedOut.includes("1. **D.** fourth") && !renumberedOut.includes("2. **D.** fourth"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/daily-tracker/rinkreads-tasks-parser.test.mjs`
Expected: FAIL with a module-not-found error for `./rinkreads-tasks-parser.mjs`.

- [ ] **Step 3: Write the implementation**

Create `tools/daily-tracker/rinkreads-tasks-parser.mjs`:

```js
// Pure parse/serialize for docs/roadmap/TASKS.md. Each section is a flat
// list of items; each item is stored WITHOUT its leading list marker ("- "
// or "N. ") so serializeTasks() can regenerate markers fresh — this is what
// keeps NEXT a clean sequential numbered list after an add/remove/move. An
// item this parser doesn't understand is never invented or dropped:
// everything between one marker and the next (or the next heading, or EOF)
// round-trips as one opaque string, exactly as written. No DOM, no fs —
// pure string in, structure out (and back), unit-testable in plain Node.
//
// The file uses CRLF line endings. Internal logic works on \n-normalized
// text; parseTasks() records whether the input was CRLF so serializeTasks()
// can restore it, keeping saves from silently rewriting the whole file's
// line-ending convention.

const SECTION_MATCHERS = [
  { key: "now", re: /NOW/ },
  { key: "next", re: /NEXT/ },
  { key: "later", re: /LATER/ },
  { key: "parking", re: /PARKING LOT/ },
  { key: "changelog", re: /Changelog/ },
];

const HEADING_LINE_RE = /^## /;
const DASH_ITEM_RE = /^- /;
const NUM_ITEM_RE = /^\d+\.\s/;

function sectionKeyForHeading(headingLine) {
  const m = SECTION_MATCHERS.find((s) => s.re.test(headingLine));
  return m ? m.key : null;
}

// Split a section body into items, stripping each item's leading marker. An
// item runs from one marker line to just before the next marker line (or
// the end of the body), so a hypothetical multi-line bullet stays intact
// even though the current file only ever has single-line bullets.
function parseItems(body) {
  const lines = body.split("\n");
  const items = [];
  let current = null;
  for (const line of lines) {
    if (DASH_ITEM_RE.test(line)) {
      if (current !== null) items.push(current.join("\n").trim());
      current = [line.replace(DASH_ITEM_RE, "")];
    } else if (NUM_ITEM_RE.test(line)) {
      if (current !== null) items.push(current.join("\n").trim());
      current = [line.replace(NUM_ITEM_RE, "")];
    } else if (current !== null) {
      current.push(line);
    }
    // Lines before the first marker (e.g. a leading blank line) are
    // dropped; serializeTasks() regenerates that spacing fresh.
  }
  if (current !== null) items.push(current.join("\n").trim());
  return items.filter((it) => it.length > 0);
}

// Parse the full raw text of TASKS.md into
// { headerRaw, now, next, later, parking, changelog, crlf }.
export function parseTasks(rawInput) {
  const crlf = rawInput.includes("\r\n");
  const raw = crlf ? rawInput.replace(/\r\n/g, "\n") : rawInput;

  const firstHeadingIdx = raw.search(/^## /m);
  const headerRaw = firstHeadingIdx === -1 ? raw : raw.slice(0, firstHeadingIdx).replace(/\n+$/, "");
  const rest = firstHeadingIdx === -1 ? "" : raw.slice(firstHeadingIdx);

  const result = { headerRaw, now: [], next: [], later: [], parking: [], changelog: [], crlf };
  if (!rest) return result;

  const lines = rest.split("\n");
  let currentKey = null;
  let bodyLines = [];
  const flush = () => {
    if (currentKey) result[currentKey] = parseItems(bodyLines.join("\n"));
    bodyLines = [];
  };
  for (const line of lines) {
    if (HEADING_LINE_RE.test(line)) {
      flush();
      currentKey = sectionKeyForHeading(line);
    } else {
      bodyLines.push(line);
    }
  }
  flush();
  return result;
}

const SECTION_ORDER = [
  { key: "now", heading: "## 🔵 NOW — active front (max 3)", marker: "dash" },
  { key: "next", heading: "## 🟢 NEXT — sequenced, in order", marker: "num" },
  { key: "later", heading: "## ⚪ LATER — in scope, not yet sequenced", marker: "dash" },
  { key: "parking", heading: "## 🅿️ PARKING LOT — out of current scope (captured, not sequenced)", marker: "dash" },
  { key: "changelog", heading: "## Changelog", marker: "dash" },
];

// Serialize the structure back into the full TASKS.md text. Regenerates
// every heading and marker fresh (so NEXT is always a clean 1..N sequence);
// every item's own text is written back exactly as stored. Restores CRLF
// line endings if the source used them.
export function serializeTasks(data) {
  const parts = [data.headerRaw];
  for (const { key, heading, marker } of SECTION_ORDER) {
    const items = data[key] || [];
    const bulleted = items.map((it, i) => (marker === "num" ? `${i + 1}. ${it}` : `- ${it}`));
    parts.push(`${heading}\n\n${bulleted.join("\n")}`);
  }
  let out = parts.join("\n\n") + "\n";
  if (data.crlf) out = out.replace(/\n/g, "\r\n");
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tools/daily-tracker/rinkreads-tasks-parser.test.mjs`
Expected: `17 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add tools/daily-tracker/rinkreads-tasks-parser.mjs tools/daily-tracker/rinkreads-tasks-parser.test.mjs
git commit -m "feat(daily-tracker): add TASKS.md parser/serializer (CRLF-safe, round-trips)"
```

---

## Task 2: Add/remove/move operations

**Files:**
- Create: `tools/daily-tracker/rinkreads-tasks-ops.mjs`
- Test: `tools/daily-tracker/rinkreads-tasks-ops.test.mjs`

**Interfaces:**
- Consumes: the structure shape produced by Task 1's `parseTasks` (does not import it directly — operates on plain objects with `now`/`next`/`later`/`parking`/`changelog` array fields).
- Produces: `removeItem(data, section, index) -> newData`. `addItem(data, section, text) -> newData`. `moveItem(data, fromSection, index, toSection) -> newData`. `NOW_SOFT_LIMIT: number`. `nowWarning(data) -> string | null`.

- [ ] **Step 1: Write the failing test**

Create `tools/daily-tracker/rinkreads-tasks-ops.test.mjs`:

```js
#!/usr/bin/env node
// Run: node tools/daily-tracker/rinkreads-tasks-ops.test.mjs
import { removeItem, addItem, moveItem, NOW_SOFT_LIMIT, nowWarning } from "./rinkreads-tasks-ops.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const base = {
  headerRaw: "# Title",
  now: ["A", "B"],
  next: ["C", "D"],
  later: ["E"],
  parking: [],
  changelog: ["done one"],
  crlf: false,
};

// removeItem
const afterRemove = removeItem(base, "now", 0);
ok("removeItem drops the item at the index", afterRemove.now.length === 1 && afterRemove.now[0] === "B");
ok("removeItem does not mutate the input", base.now.length === 2);
ok("removeItem rejects changelog (read-only)", (() => { try { removeItem(base, "changelog", 0); return false; } catch { return true; } })());

// addItem
const afterAdd = addItem(base, "later", "  F  ");
ok("addItem appends to the end", afterAdd.later.length === 2 && afterAdd.later[1] === "F");
ok("addItem trims whitespace", afterAdd.later[1] === "F");
ok("addItem does not mutate the input", base.later.length === 1);
ok("addItem rejects an empty/whitespace-only item", (() => { try { addItem(base, "later", "   "); return false; } catch { return true; } })());
ok("addItem rejects changelog (read-only)", (() => { try { addItem(base, "changelog", "x"); return false; } catch { return true; } })());

// moveItem
const afterMove = moveItem(base, "now", 1, "parking");
ok("moveItem removes from the source section", afterMove.now.length === 1 && afterMove.now[0] === "A");
ok("moveItem adds to the target section", afterMove.parking.length === 1 && afterMove.parking[0] === "B");
ok("moveItem does not mutate the input", base.now.length === 2 && base.parking.length === 0);
ok("moveItem on an out-of-range index throws", (() => { try { moveItem(base, "now", 9, "later"); return false; } catch { return true; } })());

// nowWarning
ok("NOW_SOFT_LIMIT is 3", NOW_SOFT_LIMIT === 3);
ok("nowWarning is null at/under the limit", nowWarning({ ...base, now: ["1", "2", "3"] }) === null);
ok("nowWarning fires over the limit", typeof nowWarning({ ...base, now: ["1", "2", "3", "4"] }) === "string");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/daily-tracker/rinkreads-tasks-ops.test.mjs`
Expected: FAIL with a module-not-found error for `./rinkreads-tasks-ops.mjs`.

- [ ] **Step 3: Write the implementation**

Create `tools/daily-tracker/rinkreads-tasks-ops.mjs`:

```js
// Pure add/remove/move operations on a parsed TASKS.md structure (see
// rinkreads-tasks-parser.mjs for the shape). Every function returns a NEW
// structure rather than mutating its input, so the server/client can reason
// about state changes without aliasing bugs. No DOM, no fs.

const EDITABLE_SECTIONS = ["now", "next", "later", "parking"];

function assertEditable(section) {
  if (!EDITABLE_SECTIONS.includes(section)) {
    throw new Error(`cannot edit section: ${section} (changelog is read-only)`);
  }
}

export function removeItem(data, section, index) {
  assertEditable(section);
  const items = data[section].slice();
  if (index < 0 || index >= items.length) throw new Error(`no item at ${section}[${index}]`);
  items.splice(index, 1);
  return { ...data, [section]: items };
}

export function addItem(data, section, text) {
  assertEditable(section);
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("cannot add an empty item");
  return { ...data, [section]: [...data[section], trimmed] };
}

export function moveItem(data, fromSection, index, toSection) {
  const text = data[fromSection] && data[fromSection][index];
  if (text == null) throw new Error(`no item at ${fromSection}[${index}]`);
  const removed = removeItem(data, fromSection, index);
  return addItem(removed, toSection, text);
}

// TASKS.md's own stated rule: "NOW — active front (max 3)". A soft,
// non-blocking check — the UI shows this but never prevents a save.
export const NOW_SOFT_LIMIT = 3;
export function nowWarning(data) {
  return data.now.length > NOW_SOFT_LIMIT
    ? `Today has ${data.now.length} items (recommended max ${NOW_SOFT_LIMIT}).`
    : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tools/daily-tracker/rinkreads-tasks-ops.test.mjs`
Expected: `13 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add tools/daily-tracker/rinkreads-tasks-ops.mjs tools/daily-tracker/rinkreads-tasks-ops.test.mjs
git commit -m "feat(daily-tracker): add remove/add/move operations on the parsed structure"
```

---

## Task 3: Local server

**Files:**
- Create: `tools/daily-tracker/rinkreads-server.mjs`
- Test: `tools/daily-tracker/rinkreads-server.test.mjs`

**Interfaces:**
- Consumes: `parseTasks`, `serializeTasks` from Task 1 (`./rinkreads-tasks-parser.mjs`).
- Produces: `createTrackerServer({ tasksPath?, backupDir?, htmlPath? }) -> http.Server` (not yet listening — caller calls `.listen(port)`). `DEFAULT_PORT = 8788`, `DEFAULT_TASKS_PATH`, `DEFAULT_BACKUP_DIR`, `DEFAULT_HTML_PATH` (all exported so the CLI entry point and tests share the same values, with tests overriding them).

- [ ] **Step 1: Write the failing test**

Create `tools/daily-tracker/rinkreads-server.test.mjs`:

```js
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

server.close();
rmSync(tmpRoot, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/daily-tracker/rinkreads-server.test.mjs`
Expected: FAIL with a module-not-found error for `./rinkreads-server.mjs`.

- [ ] **Step 3: Write the implementation**

Create `tools/daily-tracker/rinkreads-server.mjs`:

```js
#!/usr/bin/env node
// Local-only Node HTTP server for the RinkReads Daily Tracker. Serves the
// static tracker HTML and exposes GET/POST /api/tasks backed by
// docs/roadmap/TASKS.md. Every write is backed up first. No dependencies
// beyond node:http/fs/path/url — matches the "zero new dependencies"
// convention already used throughout tools/gauntlet/.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTasks, serializeTasks } from "./rinkreads-tasks-parser.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

export const DEFAULT_PORT = 8788;
export const DEFAULT_TASKS_PATH = resolve(root, "docs/roadmap/TASKS.md");
export const DEFAULT_BACKUP_DIR = resolve(root, "docs/roadmap/.tracker-backups");
export const DEFAULT_HTML_PATH = resolve(__dirname, "rinkreads-daily-tracker.html");

function sendJSON(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(json) });
  res.end(json);
}

function readBody(req) {
  return new Promise((resolveP, rejectP) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolveP(data));
    req.on("error", rejectP);
  });
}

// Factory so tests can point the server at a temp file instead of the real
// TASKS.md. Returns a plain node:http server (not yet listening).
export function createTrackerServer({
  tasksPath = DEFAULT_TASKS_PATH,
  backupDir = DEFAULT_BACKUP_DIR,
  htmlPath = DEFAULT_HTML_PATH,
} = {}) {
  function backupTasksFile() {
    if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    copyFileSync(tasksPath, resolve(backupDir, `TASKS.md.${stamp}.bak`));
  }

  return createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/api/tasks") {
        const raw = readFileSync(tasksPath, "utf8");
        return sendJSON(res, 200, parseTasks(raw));
      }
      if (req.method === "POST" && req.url === "/api/tasks") {
        const body = await readBody(req);
        const data = JSON.parse(body);
        backupTasksFile();
        writeFileSync(tasksPath, serializeTasks(data), "utf8");
        const fresh = parseTasks(readFileSync(tasksPath, "utf8"));
        return sendJSON(res, 200, fresh);
      }
      if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
        const html = readFileSync(htmlPath, "utf8");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        return res.end(html);
      }
      // Serve rinkreads-tasks-ops.mjs as a static ES module so the browser
      // client can `import` the SAME tested remove/add/move logic Task 2
      // unit-tests, instead of a second, unsynchronized reimplementation.
      if (req.method === "GET" && req.url === "/rinkreads-tasks-ops.mjs") {
        const opsPath = resolve(dirname(htmlPath), "rinkreads-tasks-ops.mjs");
        const js = readFileSync(opsPath, "utf8");
        res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
        return res.end(js);
      }
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    } catch (e) {
      sendJSON(res, 500, { error: e.message });
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createTrackerServer();
  server.listen(DEFAULT_PORT, "127.0.0.1", () => {
    console.log(`RinkReads Daily Tracker: http://127.0.0.1:${DEFAULT_PORT}/`);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tools/daily-tracker/rinkreads-server.test.mjs`
Expected: `11 passed, 0 failed`.

- [ ] **Step 5: Add the backup directory to .gitignore**

Add this line to `.gitignore` (append near the other local-scratch entries, e.g. next to `.worktrees/`):

```
docs/roadmap/.tracker-backups/
```

- [ ] **Step 6: Commit**

```bash
git add tools/daily-tracker/rinkreads-server.mjs tools/daily-tracker/rinkreads-server.test.mjs .gitignore
git commit -m "feat(daily-tracker): add local server (GET/POST /api/tasks, backup-before-write)"
```

---

## Task 4: Client HTML

**Files:**
- Create: `tools/daily-tracker/rinkreads-daily-tracker.html`

**Interfaces:**
- Consumes: `GET /api/tasks` and `POST /api/tasks` from Task 3's server (relative fetch calls — the HTML is served BY that same server, so no CORS/base-URL configuration is needed). Also imports `removeItem`, `addItem`, `moveItem`, `nowWarning` from Task 2's `rinkreads-tasks-ops.mjs`, loaded as a static ES module at `/rinkreads-tasks-ops.mjs` (the route Task 3 Step 3 adds) — the client reuses the exact tested logic rather than reimplementing it.

No automated test for this file — matches this codebase's existing convention that render/UI code is play-tested, not unit-tested (see `tools/gauntlet/README.md`'s equivalent note in the sibling `cognitive-gym` skill: "Render loops are play-tested, not unit-tested"). Verified instead by the manual smoke test in Task 5.

- [ ] **Step 1: Write the client**

Create `tools/daily-tracker/rinkreads-daily-tracker.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RinkReads Daily Tracker</title>
<style>
  :root { --bg:#0b1b2b; --panel:#112b44; --text:#eaf2f8; --muted:#9db8c9; --gold:#f2b705; --line:#1e3f5f; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font-family:system-ui,sans-serif; padding:20px; }
  h1 { font-size:1.4rem; margin:0 0 4px; }
  .sub { color:var(--muted); font-size:.85rem; margin:0 0 18px; }
  .warning { background:#3a2a0c; border:1px solid var(--gold); color:var(--gold); padding:8px 12px; border-radius:8px; margin-bottom:14px; font-size:.85rem; display:none; }
  .board { display:grid; gap:14px; grid-template-columns:1fr; }
  @media(min-width:900px) { .board { grid-template-columns:repeat(3,1fr); } }
  .section { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:14px; }
  .section h2 { font-size:.95rem; text-transform:uppercase; letter-spacing:.06em; margin:0 0 10px; color:var(--gold); }
  .item { background:var(--bg); border:1px solid var(--line); border-radius:8px; padding:8px 10px; margin-bottom:8px; font-size:.85rem; }
  .item-row { display:flex; justify-content:space-between; gap:8px; align-items:flex-start; }
  .item-actions { display:flex; gap:6px; flex-shrink:0; }
  .item-actions button, .item-actions select { font-size:.7rem; padding:2px 6px; }
  .add-row { display:flex; gap:6px; margin-top:8px; }
  .add-row input { flex:1; background:var(--bg); border:1px solid var(--line); color:var(--text); border-radius:6px; padding:6px 8px; font-size:.8rem; }
  button { background:var(--gold); color:var(--bg); border:none; border-radius:6px; padding:6px 10px; font-weight:700; cursor:pointer; font-size:.8rem; }
  button.ghost { background:transparent; border:1px solid var(--line); color:var(--muted); }
  .save-bar { position:sticky; bottom:0; background:var(--bg); padding:14px 0; margin-top:14px; display:flex; align-items:center; gap:12px; }
  .status { color:var(--muted); font-size:.8rem; }
  .readonly .item { opacity:.75; }
</style>
</head>
<body>
  <h1>RinkReads Daily Tracker</h1>
  <p class="sub">Reads and writes <code>docs/roadmap/TASKS.md</code> directly. Nothing saves until you click Save.</p>
  <div class="warning" id="now-warning"></div>
  <div class="board" id="board"></div>
  <div class="save-bar">
    <button id="save-btn">Save</button>
    <button class="ghost" id="reload-btn">Reload</button>
    <span class="status" id="status"></span>
  </div>

<script type="module">
import { removeItem, addItem, moveItem, nowWarning } from "/rinkreads-tasks-ops.mjs";

const SECTIONS = [
  { key: "now", title: "Today", editable: true },
  { key: "next", title: "This Week", editable: true },
  { key: "later", title: "Later", editable: true },
  { key: "parking", title: "Waiting", editable: true },
  { key: "changelog", title: "Done", editable: false },
];

let state = null; // the last-loaded/saved structure from the server

function setStatus(msg) {
  document.getElementById("status").textContent = msg;
}

async function loadTasks() {
  setStatus("Loading…");
  const res = await fetch("/api/tasks");
  state = await res.json();
  render();
  setStatus("Loaded.");
}

// removeItem/addItem/moveItem are the SAME functions Task 2 unit-tests —
// imported, not reimplemented, so the tested logic is what actually runs.
function removeAt(section, index) {
  state = removeItem(state, section, index);
  render();
}

function addTo(section, text) {
  try {
    state = addItem(state, section, text);
  } catch {
    return; // empty/whitespace-only input — addItem throws, just ignore it
  }
  render();
}

function moveTo(fromSection, index, toSection) {
  if (fromSection === toSection) return;
  state = moveItem(state, fromSection, index, toSection);
  render();
}

function render() {
  const board = document.getElementById("board");
  board.innerHTML = "";
  for (const { key, title, editable } of SECTIONS) {
    const section = document.createElement("div");
    section.className = "section" + (editable ? "" : " readonly");
    const h2 = document.createElement("h2");
    h2.textContent = `${title} (${state[key].length})`;
    section.appendChild(h2);

    state[key].forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "item";
      const row = document.createElement("div");
      row.className = "item-row";
      const text = document.createElement("span");
      text.textContent = item;
      row.appendChild(text);
      if (editable) {
        const actions = document.createElement("div");
        actions.className = "item-actions";
        const rm = document.createElement("button");
        rm.className = "ghost";
        rm.textContent = "Remove";
        rm.onclick = () => removeAt(key, index);
        actions.appendChild(rm);
        const moveSel = document.createElement("select");
        const placeholder = document.createElement("option");
        placeholder.textContent = "Move to…";
        placeholder.value = "";
        moveSel.appendChild(placeholder);
        for (const s of SECTIONS) {
          if (!s.editable || s.key === key) continue;
          const opt = document.createElement("option");
          opt.value = s.key;
          opt.textContent = s.title;
          moveSel.appendChild(opt);
        }
        moveSel.onchange = () => {
          if (moveSel.value) moveTo(key, index, moveSel.value);
        };
        actions.appendChild(moveSel);
        row.appendChild(actions);
      }
      div.appendChild(row);
      section.appendChild(div);
    });

    if (editable) {
      const addRow = document.createElement("div");
      addRow.className = "add-row";
      const input = document.createElement("input");
      input.placeholder = "Add an item…";
      input.onkeydown = (e) => {
        if (e.key === "Enter") {
          addTo(key, input.value);
          input.value = "";
        }
      };
      const addBtn = document.createElement("button");
      addBtn.textContent = "Add";
      addBtn.onclick = () => {
        addTo(key, input.value);
        input.value = "";
      };
      addRow.appendChild(input);
      addRow.appendChild(addBtn);
      section.appendChild(addRow);
    }

    board.appendChild(section);
  }

  const warnEl = document.getElementById("now-warning");
  const warning = nowWarning(state);
  if (warning) {
    warnEl.style.display = "block";
    warnEl.textContent = warning;
  } else {
    warnEl.style.display = "none";
  }
}

async function save() {
  setStatus("Saving…");
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!res.ok) {
    setStatus("Save failed — see console.");
    console.error(await res.text());
    return;
  }
  state = await res.json();
  render();
  setStatus("Saved.");
}

document.getElementById("save-btn").onclick = save;
document.getElementById("reload-btn").onclick = loadTasks;

loadTasks();
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add tools/daily-tracker/rinkreads-daily-tracker.html
git commit -m "feat(daily-tracker): add the tracker client (view + remove/add/move UI)"
```

---

## Task 5: Launcher, README, and manual smoke test

**Files:**
- Create: `tools/daily-tracker/start-rinkreads-tracker.cmd`
- Create: `tools/daily-tracker/README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: `createTrackerServer` behavior from Task 3, verified through the actual CLI entry point (`node tools/daily-tracker/rinkreads-server.mjs`) rather than a new interface.

- [ ] **Step 1: Add the npm script**

In `package.json`, add a new entry to `"scripts"` (anywhere near other top-level tool scripts, e.g. next to `"gauntlet:audit"`):

```json
    "daily-tracker": "node tools/daily-tracker/rinkreads-server.mjs",
```

- [ ] **Step 2: Write the double-click launcher**

Create `tools/daily-tracker/start-rinkreads-tracker.cmd`:

```bat
@echo off
cd /d "%~dp0..\.."
node tools\daily-tracker\rinkreads-server.mjs
pause
```

- [ ] **Step 3: Write the README**

Create `tools/daily-tracker/README.md`:

```markdown
# RinkReads Daily Tracker

A local dashboard for `docs/roadmap/TASKS.md`. Separate from and unrelated to
BlueChip's daily tracker (different repo, different port, no shared code).

## Files

- `rinkreads-daily-tracker.html` — the dashboard UI (served by the local server, not opened directly via `file://`).
- `rinkreads-server.mjs` — local server (`127.0.0.1:8788`), reads/writes `docs/roadmap/TASKS.md`.
- `rinkreads-tasks-parser.mjs` / `rinkreads-tasks-ops.mjs` — pure parse/serialize and remove/add/move logic (unit-tested).
- `start-rinkreads-tracker.cmd` — double-click to start the server.

## Use it

1. Run `npm run daily-tracker` (or double-click `start-rinkreads-tracker.cmd`).
2. Open `http://127.0.0.1:8788/`.
3. Remove, add, or move items. Nothing writes to disk until you click **Save**.

TASKS.md stays the one canonical source — this tracker reads and writes the
real file directly, with a timestamped backup in
`docs/roadmap/.tracker-backups/` before every save.

## What it does NOT do

- No Notion sync.
- No editing an item's internal text/formatting — only whole-item remove, add,
  and move between sections.
- No auto-generated Changelog entries — marking something done just removes
  it from its section; write the actual changelog line the normal way (in a
  Claude Code session, or by hand).
- No concurrent-edit detection yet — if TASKS.md changes on disk after the
  tracker loaded it, Save will overwrite those changes. Don't leave the
  tracker open for hours while also editing TASKS.md elsewhere.
```

- [ ] **Step 4: Run the full test suite together**

```bash
node tools/daily-tracker/rinkreads-tasks-parser.test.mjs
node tools/daily-tracker/rinkreads-tasks-ops.test.mjs
node tools/daily-tracker/rinkreads-server.test.mjs
```

Expected: all three print `N passed, 0 failed`.

- [ ] **Step 5: Manual smoke test against the REAL file**

```bash
git status --short docs/roadmap/TASKS.md
```

Expected: no output (clean working tree for this file before starting).

```bash
npm run daily-tracker
```

Leave it running. In a browser, open `http://127.0.0.1:8788/`. Confirm:

- All 5 sections render with roughly the item counts you'd expect from reading `docs/roadmap/TASKS.md` directly.
- Add a throwaway item to Later (e.g. "TEST ITEM — delete me"), click Save. Confirm the page reflects it after save.
- Remove that same throwaway item, click Save again.

Stop the server (Ctrl+C), then:

```bash
git diff docs/roadmap/TASKS.md
```

Expected: **no diff** (the throwaway add + remove round-tripped back to the original content) — this is the real-world proof of the round-trip guarantee, on top of Task 1's automated test. If there IS an unexpected diff (e.g. a stray whitespace change unrelated to the throwaway item), stop and investigate before considering this task done — do not dismiss it as cosmetic.

```bash
ls docs/roadmap/.tracker-backups/
```

Expected: two backup files (one per Save click) — confirms the backup-before-write path fired on the real file, not just in the test's temp directory.

- [ ] **Step 6: Commit**

```bash
git add package.json tools/daily-tracker/start-rinkreads-tracker.cmd tools/daily-tracker/README.md
git commit -m "chore(daily-tracker): add launcher, README, and npm script"
```
