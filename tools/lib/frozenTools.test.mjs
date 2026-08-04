// frozenTools.test.mjs — proof that the frozen legacy direct-writers actually
// refuse, by INVOKING each one, not by reading the source.
//
// Run: node --test tools/lib/frozenTools.test.mjs   (npm run test:frozen-tools)
//
// Phase 9 Task 1 of the scenario-engine plan. Each case asserts two things:
//   1. the entry point fails (non-zero exit, or a thrown error, or a 4xx), and
//   2. the failure carries the pointer message a human can act on — the tool
//      name, the spec path, and the sanctioned replacement.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { assertNotFrozen, frozenMessage, FrozenToolError, ALLOW_ENV } from "./frozen-tools.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SPEC = "2026-07-29-scenario-engine-design.md";

// Run a node script from the repo root with the freeze ACTIVE (override
// explicitly cleared, so an inherited env var cannot make this test lie).
function runNode(args, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  if (!(ALLOW_ENV in extraEnv)) delete env[ALLOW_ENV];
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
    env,
    timeout: 60_000,
  });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

// Every refusal must be actionable, not just loud.
function assertPointerMessage(text, toolName) {
  assert.match(text, /FROZEN TOOL/, "message should announce the freeze");
  assert.ok(text.includes(toolName), `message should name the tool (${toolName})`);
  assert.ok(text.includes(SPEC), "message should point at the design spec");
  assert.match(text, /promote-scenario\.mjs|factoryPipeline\.js/, "message should name the replacement path");
  assert.ok(text.includes(ALLOW_ENV), "message should say how to override deliberately");
}

// ── 1. scripts/batch-approve.mjs ────────────────────────────────────────────
test("scripts/batch-approve.mjs refuses and writes nothing", () => {
  const { code, out } = runNode(["scripts/batch-approve.mjs"]);
  assert.notEqual(code, 0, "must exit non-zero");
  assertPointerMessage(out, "scripts/batch-approve.mjs");
  // It must fail on the freeze, not on its own missing-approved-list check.
  assert.doesNotMatch(out, /No approved list at/, "freeze must fire before the script's own checks");
});

// ── 2. scripts/generate-questions.mjs ───────────────────────────────────────
test("scripts/generate-questions.mjs refuses before spending an LLM call", () => {
  const { code, out } = runNode(["scripts/generate-questions.mjs", "--dry-run"]);
  assert.notEqual(code, 0, "must exit non-zero");
  assertPointerMessage(out, "scripts/generate-questions.mjs");
  assert.doesNotMatch(out, /request\(s\)/, "must not reach the generation loop");
});

// ── 3. tools/scenario-author.mjs (write path) ───────────────────────────────
test("tools/scenario-author.mjs new refuses before shelling out to claude", () => {
  const { code, out } = runNode(["tools/scenario-author.mjs", "new", "U13 breakout, first pass option"]);
  assert.notEqual(code, 0, "must exit non-zero");
  assertPointerMessage(out, "tools/scenario-author.mjs");
  assert.doesNotMatch(out, /generating scenario via claude/, "must not invoke the claude CLI");
});

test("tools/scenario-author.mjs read-only subcommands stay usable", () => {
  const { code, out } = runNode(["tools/scenario-author.mjs", "help"]);
  assert.equal(code, 0, "help is read-only and must still work");
  assert.match(out, /scenario-author/);
  assert.doesNotMatch(out, /FROZEN TOOL/);
});

// ── 4. tools/review-store.mjs approve() ─────────────────────────────────────
test("tools/review-store.mjs approve() throws and leaves the bank untouched", () => {
  const inline = `
    import { approve, enqueue, loadQueue } from "./tools/review-store.mjs";
    import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
    import { join } from "node:path";
    import { tmpdir } from "node:os";
    const d = mkdtempSync(join(tmpdir(), "frozen-"));
    const paths = { queue: join(d,"q.json"), bank: join(d,"bank.json"), log: join(d,"log.jsonl") };
    writeFileSync(paths.queue, JSON.stringify({ items: [{ question: { id: "q1", nodeId: "u13.x" } }] }));
    writeFileSync(paths.bank, "{}");
    // enqueue / loadQueue are NOT frozen — prove the freeze is surgical.
    if (!loadQueue(paths).items.length) { console.error("loadQueue broke"); process.exit(3); }
    if (!enqueue(paths, { question: { id: "q2", nodeId: "u13.x" } }).ok) { console.error("enqueue broke"); process.exit(3); }
    try {
      approve(paths, "q1", "2026-08-03T00:00:00Z");
      console.error("approve() did NOT throw");
      process.exit(4);
    } catch (e) {
      console.error(e.message);
      if (readFileSync(paths.bank, "utf8").trim() !== "{}") { console.error("bank was modified"); process.exit(5); }
      process.exit(1);
    }
  `;
  const { code, out } = runNode(["--input-type=module", "-e", inline]);
  assert.equal(code, 1, `expected the frozen throw path (exit 1), got ${code}: ${out}`);
  assertPointerMessage(out, "tools/review-store.mjs approve()");
});

// ── 5. tools/seed-editor-plugin.mjs POST /__seed/save ───────────────────────
// Drives the real middleware the Vite dev server would install, with a stub
// req/res — no dev server needed, but the guarded code path is genuinely run.
test("tools/seed-editor-plugin.mjs POST /__seed/save refuses with 423", async () => {
  const { seedEditorPlugin } = await import("../seed-editor-plugin.mjs");
  const plugin = seedEditorPlugin();

  let handler;
  plugin.configureServer({ middlewares: { use: (fn) => { handler = fn; } } });
  assert.equal(typeof handler, "function", "plugin should register a middleware");

  const req = Object.assign(
    { url: "/__seed/save", method: "POST", on(evt, cb) { if (evt === "end") cb(); } },
    {},
  );
  let statusCode = 0;
  let body = "";
  const res = {
    set statusCode(v) { statusCode = v; },
    get statusCode() { return statusCode; },
    setHeader() {},
    end(s) { body = s; },
  };

  await handler(req, res, () => assert.fail("must not fall through to next()"));

  assert.equal(statusCode, 423, "should answer 423 Locked");
  const parsed = JSON.parse(body);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.frozen, true);
  assert.equal(parsed.wrote, false, "must report that nothing was written");
  assertPointerMessage(parsed.errs.join("\n"), "tools/seed-editor-plugin.mjs (POST /__seed/save)");
});

test("seed-editor plugin still imports cleanly for `vite build`", async () => {
  // A module-level guard would break the production build, since vite.config.js
  // imports this plugin unconditionally. Importing + constructing must be safe.
  const { seedEditorPlugin } = await import("../seed-editor-plugin.mjs");
  const p = seedEditorPlugin();
  assert.equal(p.apply, "serve");
  assert.equal(p.name, "rinkreads-seed-editor");
});

// ── 6. tools/scenario-engine-overnight.ps1 ──────────────────────────────────
const psExe = process.platform === "win32" ? "powershell.exe" : null;

test("tools/scenario-engine-overnight.ps1 hard-stops before starting Claude", { skip: !psExe }, () => {
  const r = spawnSync(
    psExe,
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", resolve(ROOT, "tools/scenario-engine-overnight.ps1")],
    { cwd: ROOT, encoding: "utf8", timeout: 60_000 },
  );
  const out = (r.stdout || "") + (r.stderr || "");
  assert.equal(r.status, 1, `expected exit 1, got ${r.status}: ${out}`);
  assert.match(out, /STOPPED - scenario-engine-overnight\.ps1 is retired/);
  assert.match(out, /Nothing ran/);
  assert.ok(out.includes(SPEC), "should point at the design spec");
  assert.match(out, /promote-scenario\.mjs/, "should name the replacement");
  assert.doesNotMatch(out, /dangerously-skip-permissions" /, "must not have invoked claude");
});

test("the overnight script does NOT honour the human override", { skip: !psExe }, () => {
  // The escape hatch is for a person at a keyboard. The unattended runner is
  // precisely what the freeze defends against, so it must ignore the flag.
  const r = spawnSync(
    psExe,
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", resolve(ROOT, "tools/scenario-engine-overnight.ps1")],
    { cwd: ROOT, encoding: "utf8", timeout: 60_000, env: { ...process.env, [ALLOW_ENV]: "1" } },
  );
  assert.equal(r.status, 1, "must still refuse with the override set");
  assert.match((r.stdout || "") + (r.stderr || ""), /no override flag/i);
});

// ── the guard module itself ─────────────────────────────────────────────────
test("assertNotFrozen throws a FrozenToolError by default", () => {
  assert.throws(() => assertNotFrozen("scripts/batch-approve.mjs", { env: {} }), (e) => {
    assert.ok(e instanceof FrozenToolError);
    assert.equal(e.toolName, "scripts/batch-approve.mjs");
    assertPointerMessage(e.message, "scripts/batch-approve.mjs");
    return true;
  });
});

test("RINKREADS_ALLOW_FROZEN=1 lets a human through, loudly", () => {
  const seen = [];
  const orig = console.error;
  console.error = (m) => seen.push(m);
  try {
    assert.doesNotThrow(() => assertNotFrozen("scripts/batch-approve.mjs", { env: { [ALLOW_ENV]: "1" } }));
  } finally {
    console.error = orig;
  }
  assert.equal(seen.length, 1, "an override must never be silent");
  assert.match(seen[0], /RINKREADS_ALLOW_FROZEN is set/);
  assert.match(seen[0], /scripts\/batch-approve\.mjs/);
});

test("the override actually reaches a real frozen CLI", () => {
  // batch-approve should get PAST the freeze and fail on its own missing-list
  // check instead — proving the hatch works end to end, not just in-process.
  const { code, out } = runNode(["scripts/batch-approve.mjs"], { [ALLOW_ENV]: "1" });
  assert.notEqual(code, 0);
  assert.doesNotMatch(out, /FROZEN TOOL/, "the freeze should not have fired");
  assert.match(out, /No approved list at|nothing to approve/, "should reach the script's own checks");
});

test("frozenMessage covers every registered tool", () => {
  for (const name of ["scripts/batch-approve.mjs", "tools/review-store.mjs approve()"]) {
    assertPointerMessage(frozenMessage(name), name);
  }
});
