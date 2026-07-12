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

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

// Validate a POST body's shape before it ever reaches serializeTasks(). A
// malformed or partial payload (empty object, client bug, stray curl call)
// must never reach the write path — returns an error string, or null if the
// shape is valid.
function validateTasksPayload(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "request body must be a JSON object";
  }
  if (typeof data.headerRaw !== "string" || data.headerRaw.length === 0) {
    return "headerRaw must be a non-empty string";
  }
  for (const key of ["now", "next", "later", "parking", "changelog"]) {
    if (!isStringArray(data[key])) {
      return `${key} must be an array of strings`;
    }
  }
  return null;
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
        const validationError = validateTasksPayload(data);
        if (validationError) {
          return sendJSON(res, 400, { error: validationError });
        }
        // changelog is read-only: no matter what the client sends, always
        // write back whatever is actually on disk right now. The ops
        // module's assertEditable() enforces this client-side too, but this
        // is the one place that controls the real write, so it must not
        // trust the client.
        const current = parseTasks(readFileSync(tasksPath, "utf8"));
        const toWrite = { ...data, changelog: current.changelog };
        backupTasksFile();
        writeFileSync(tasksPath, serializeTasks(toWrite), "utf8");
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
