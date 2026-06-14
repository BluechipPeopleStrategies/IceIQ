# Playtest Feedback (dev-bypass) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dev-bypass-only in-app feedback widget that captures a note, category, auto-context, and a game screenshot, uploads it to an owner-scoped Supabase table, and a pull script that brings the feedback back to the dev session.

**Architecture:** A pure `feedbackContext.js` (note/context/category helpers) is unit tested. A `FeedbackWidget` React component (gated by dev-bypass) captures input + a downscaled canvas screenshot and calls `savePlaytestFeedback()` in `supabase.js`, which inserts into a new owner-only `playtest_feedback` table (RLS by owner email). `scripts/pull-feedback.mjs` (service-role, mirrors `pull-reviews.mjs`) writes a markdown worklist + saved screenshots for Claude to act on.

**Tech Stack:** React 18 + Vite, plain JS ES modules, Supabase (`@supabase/supabase-js`), HTML canvas, `node --test` + `node:assert/strict`.

---

## Scope

One self-contained feature. Migrations are applied by hand in the Supabase dashboard (the SQL file
is delivered for the owner to run). The owner playtests while signed in as one of two allowed
owner emails; RLS enforces owner-only insert and read. Screenshots are canvas-only (the gym
drills) and stored inline as a downscaled JPEG. Out of scope: anonymous feedback, html2canvas
full-screen capture, an in-app viewer.

## File structure

| File | Responsibility | Action |
|------|----------------|--------|
| `supabase/migration_0019_playtest_feedback.sql` | Table + owner-only RLS | Create |
| `src/devtools/feedbackContext.js` | Pure: sanitizeNote, buildFeedbackContext, CATEGORIES | Create |
| `src/devtools/FeedbackWidget.jsx` | Dev-bypass-gated floating widget + screenshot capture | Create |
| `src/devtools/feedback-widget.css` | Widget styles | Create |
| `src/supabase.js` | `savePlaytestFeedback()` write helper | Modify |
| `src/App.jsx` | Mount `<FeedbackWidget>` | Modify |
| `scripts/pull-feedback.mjs` | Service-role pull → worklist + screenshots | Create |
| `scripts/test-feedback.mjs` | Unit tests for the pure helpers | Create |
| `package.json` | Add `test:feedback` + `pull-feedback` scripts | Modify |
| `.gitignore` | Ignore generated feedback artifacts | Modify |

---

## Task 1: The Supabase migration

**Files:**
- Create: `supabase/migration_0019_playtest_feedback.sql`

No automated test (migrations are pasted into the Supabase dashboard by the owner). The check is
that the SQL is valid and idempotent.

- [ ] **Step 1: Create `supabase/migration_0019_playtest_feedback.sql`**

```sql
-- Migration 0019: playtest_feedback (in-app dev-bypass feedback while playtesting).
-- Owner-only insert and read. Paste into Supabase Dashboard -> SQL Editor -> Run. Idempotent.
create table if not exists public.playtest_feedback (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid references public.profiles(id) on delete set null,
  screen      text,
  drill       text,
  category    text,
  note        text,
  context     jsonb,
  screenshot  text,          -- downscaled JPEG dataURL (inline; dev-only, low volume)
  app_version text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_playtest_feedback_created
  on public.playtest_feedback(created_at desc);

alter table public.playtest_feedback enable row level security;

-- Owner emails allowed to write and read. lower() guards against case
-- (Supabase stores emails lowercased). Keep BOTH policy lists in sync.
drop policy if exists "owner inserts playtest feedback" on public.playtest_feedback;
create policy "owner inserts playtest feedback" on public.playtest_feedback
  for insert with check (
    lower(auth.jwt() ->> 'email') in ('mtslifka@gmail.com', 'thomas@bluechip-people-strategies.com')
  );

drop policy if exists "owner reads playtest feedback" on public.playtest_feedback;
create policy "owner reads playtest feedback" on public.playtest_feedback
  for select using (
    lower(auth.jwt() ->> 'email') in ('mtslifka@gmail.com', 'thomas@bluechip-people-strategies.com')
  );
```

- [ ] **Step 2: Sanity-check the SQL is balanced**

Run: `node -e "const s=require('fs').readFileSync('supabase/migration_0019_playtest_feedback.sql','utf8'); const o=(s.match(/\(/g)||[]).length, c=(s.match(/\)/g)||[]).length; if(o!==c){console.error('paren mismatch',o,c);process.exit(1)} console.log('parens balanced:',o)"`
Expected: `parens balanced: <n>` (no mismatch error). This is a cheap guard; the real validation is running it in the Supabase dashboard.

- [ ] **Step 3: Commit**

```bash
git add supabase/migration_0019_playtest_feedback.sql
git commit -m "feat(feedback): migration 0019 playtest_feedback table + owner RLS"
```

---

## Task 2: Pure context helpers + tests

**Files:**
- Create: `src/devtools/feedbackContext.js`
- Create: `scripts/test-feedback.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-feedback.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORIES, isCategory, sanitizeNote, buildFeedbackContext,
} from "../src/devtools/feedbackContext.js";

test("categories: five known chips, isCategory validates", () => {
  assert.equal(CATEGORIES.length, 5);
  assert.ok(CATEGORIES.includes("bug"));
  assert.equal(isCategory("idea"), true);
  assert.equal(isCategory("nonsense"), false);
});

test("sanitizeNote trims, caps at 2000, nulls empties and non-strings", () => {
  assert.equal(sanitizeNote("  hi  "), "hi");
  assert.equal(sanitizeNote("   "), null);
  assert.equal(sanitizeNote(""), null);
  assert.equal(sanitizeNote(123), null);
  assert.equal(sanitizeNote("x".repeat(3000)).length, 2000);
});

test("buildFeedbackContext includes set fields, rounds viewport, is JSON-safe", () => {
  const ctx = buildFeedbackContext({
    screen: "cogym", drillTitle: "Pick Your Spot", version: "0.1-beta",
    viewport: { w: 390.6, h: 844 }, userAgent: "UA",
    nowIso: "2026-06-13T10:00:00.000Z",
  });
  assert.equal(ctx.screen, "cogym");
  assert.equal(ctx.drill, "Pick Your Spot");
  assert.equal(ctx.appVersion, "0.1-beta");
  assert.deepEqual(ctx.viewport, { w: 391, h: 844 });
  assert.equal(ctx.userAgent, "UA");
  assert.equal(ctx.at, "2026-06-13T10:00:00.000Z");
  assert.ok(JSON.stringify(ctx).length > 0);
});

test("buildFeedbackContext omits missing fields", () => {
  const ctx = buildFeedbackContext({ screen: "home" });
  assert.deepEqual(Object.keys(ctx), ["screen"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/test-feedback.mjs`
Expected: FAIL with module-not-found (`feedbackContext.js` does not exist).

- [ ] **Step 3: Create `src/devtools/feedbackContext.js`**

```js
// Pure helpers for the dev-bypass playtest feedback widget. No DOM, no network,
// so they are unit-testable in plain Node.

// Feedback categories shown as chips. First is the default selection.
export const CATEGORIES = ["bug", "idea", "difficulty", "art-visual", "copy"];

export function isCategory(x) {
  return CATEGORIES.includes(x);
}

// Trim and cap a note. Returns null for empty/whitespace or non-strings.
export function sanitizeNote(note, max = 2000) {
  if (typeof note !== "string") return null;
  const t = note.trim();
  if (!t) return null;
  return t.slice(0, max);
}

// Build the normalized context blob stored with a feedback note. The caller
// passes values in (no DOM access here). Empty/invalid fields are omitted.
export function buildFeedbackContext({
  screen, drillTitle, version, viewport, userAgent, nowIso,
} = {}) {
  const ctx = {};
  if (screen) ctx.screen = String(screen);
  if (drillTitle) ctx.drill = String(drillTitle);
  if (version) ctx.appVersion = String(version);
  if (viewport && Number.isFinite(viewport.w) && Number.isFinite(viewport.h)) {
    ctx.viewport = { w: Math.round(viewport.w), h: Math.round(viewport.h) };
  }
  if (userAgent) ctx.userAgent = String(userAgent);
  if (nowIso) ctx.at = String(nowIso);
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/test-feedback.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Add the `test:feedback` npm script**

In `package.json` `scripts`, near the other `test:*` entries, add:

```json
    "test:feedback": "node --test scripts/test-feedback.mjs",
```

- [ ] **Step 6: Commit**

```bash
git add src/devtools/feedbackContext.js scripts/test-feedback.mjs package.json
git commit -m "feat(feedback): pure context helpers + tests"
```

---

## Task 3: The Supabase write helper

**Files:**
- Modify: `src/supabase.js`

- [ ] **Step 1: Add `savePlaytestFeedback` after `recordQuizFeedback`**

In `src/supabase.js`, immediately after the `recordQuizFeedback` function (it ends with
`} catch (e) { warn("recordQuizFeedback", e); return null; }`), add:

```js
// ─────────────────────────────────────────────
// PLAYTEST FEEDBACK (dev-bypass in-app feedback; owner-only via RLS)
// ─────────────────────────────────────────────
// A real write (not fire-and-forget): returns { ok, data } or { ok:false, error }
// so the widget can confirm the upload to the owner. RLS restricts inserts to the
// owner emails, so a non-owner / signed-out session gets an error here.
export async function savePlaytestFeedback({
  screen, drill, category, note, context, screenshot, appVersion,
} = {}) {
  if (!supabase) return { ok: false, error: "offline" };
  try {
    const { data: userData } = await supabase.auth.getUser();
    const authorId = userData && userData.user ? userData.user.id : null;
    const { data, error } = await supabase.from("playtest_feedback").insert({
      author_id: authorId,
      screen: screen || null,
      drill: drill || null,
      category: category || null,
      note: note || null,
      context: context || null,
      screenshot: screenshot || null,
      app_version: appVersion || null,
    }).select().single();
    if (error) { warn("savePlaytestFeedback", error); return { ok: false, error: error.message }; }
    return { ok: true, data };
  } catch (e) {
    warn("savePlaytestFeedback", e);
    return { ok: false, error: e.message || String(e) };
  }
}
```

- [ ] **Step 2: Verify it exports cleanly**

Run: `node --input-type=module -e "import('./src/supabase.js').then(m => console.log(typeof m.savePlaytestFeedback))"`
Expected output: `function`
(Supabase env vars are not needed for the import; `supabase` is null without them and the helper handles that.)

- [ ] **Step 3: Commit**

```bash
git add src/supabase.js
git commit -m "feat(feedback): savePlaytestFeedback write helper (owner-scoped)"
```

---

## Task 4: The feedback widget

**Files:**
- Create: `src/devtools/FeedbackWidget.jsx`
- Create: `src/devtools/feedback-widget.css`

- [ ] **Step 1: Create `src/devtools/feedback-widget.css`**

```css
.fbw-root { position: fixed; right: 16px; bottom: 16px; z-index: 9999; font: 14px/1.4 system-ui, sans-serif; }
.fbw-fab {
  background: #c9a24b; color: #14243c; border: none; border-radius: 999px;
  padding: 9px 16px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.3);
}
.fbw-panel {
  width: 300px; background: #142840; color: #eaf2fb; border: 1px solid #2a466b;
  border-radius: 12px; padding: 12px; box-shadow: 0 8px 28px rgba(0,0,0,.45);
}
.fbw-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.fbw-x { background: none; border: none; color: #9fb3c9; font-size: 20px; line-height: 1; cursor: pointer; }
.fbw-note {
  width: 100%; box-sizing: border-box; resize: vertical; border-radius: 8px;
  border: 1px solid #2a466b; background: #0e1b2e; color: #eaf2fb; padding: 8px; font: inherit;
}
.fbw-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.fbw-chip {
  border: 1px solid #2a466b; background: #0e1b2e; color: #cdddee; border-radius: 999px;
  padding: 3px 10px; font-size: 12px; cursor: pointer;
}
.fbw-chip-on { background: #c9a24b; color: #14243c; border-color: #c9a24b; font-weight: 700; }
.fbw-shot { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: #9fb3c9; margin-bottom: 8px; }
.fbw-actions { display: flex; align-items: center; gap: 10px; }
.fbw-send {
  background: #1b6cb0; color: #fff; border: none; border-radius: 8px; padding: 7px 16px;
  font-weight: 700; cursor: pointer;
}
.fbw-send:disabled { opacity: .5; cursor: default; }
.fbw-status { font-size: 12.5px; color: #9fb3c9; }
```

(Note: there is one intentional fix here — the first `.fbw-panel` border line is overridden by the
second; keep only the valid `#2a466b` border. If you prefer, delete the first `border:` line.)

- [ ] **Step 2: Create `src/devtools/FeedbackWidget.jsx`**

```jsx
import { useState } from "react";
import "./feedback-widget.css";
import { isDevBypassEnabled } from "../utils/devBypass";
import { CATEGORIES, sanitizeNote, buildFeedbackContext } from "./feedbackContext";
import { savePlaytestFeedback } from "../supabase";

// Find the active game canvas (gym drills render <canvas class="gym-canvas">).
function gameCanvas() {
  return document.querySelector("canvas.gym-canvas") || document.querySelector("canvas");
}

// Capture the active canvas as a downscaled JPEG dataURL, or null. The gym
// canvases are drawn from shapes/text (no cross-origin images) so they are not
// tainted and toDataURL is safe.
function captureCanvasShot() {
  try {
    const c = gameCanvas();
    if (!c || !c.width) return null;
    const scale = Math.min(1, 720 / c.width);
    const off = document.createElement("canvas");
    off.width = Math.round(c.width * scale);
    off.height = Math.round(c.height * scale);
    off.getContext("2d").drawImage(c, 0, 0, off.width, off.height);
    return off.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  }
}

export default function FeedbackWidget({ screen = null, version = null }) {
  const devOn =
    isDevBypassEnabled() ||
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV);

  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [shot, setShot] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // null | "ok" | { error }

  if (!devOn) return null;

  const hasCanvas = !!gameCanvas();

  async function send() {
    setSending(true);
    setStatus(null);
    const drillTitle =
      (document.querySelector(".gym-drill-title")?.textContent || "").trim() || null;
    const context = buildFeedbackContext({
      screen,
      drillTitle,
      version,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      userAgent: navigator.userAgent,
      nowIso: new Date().toISOString(),
    });
    const screenshot = shot ? captureCanvasShot() : null;
    const res = await savePlaytestFeedback({
      screen,
      drill: drillTitle,
      category,
      note: sanitizeNote(note),
      context,
      screenshot,
      appVersion: version,
    });
    setSending(false);
    if (res && res.ok) {
      setStatus("ok");
      setNote("");
      setTimeout(() => { setStatus(null); setOpen(false); }, 1200);
    } else {
      setStatus({ error: (res && res.error) || "failed" });
    }
  }

  return (
    <div className="fbw-root">
      {!open && (
        <button className="fbw-fab" onClick={() => { setStatus(null); setOpen(true); }}>
          Feedback
        </button>
      )}
      {open && (
        <div className="fbw-panel" role="dialog" aria-label="Playtest feedback">
          <div className="fbw-head">
            <strong>Playtest feedback</strong>
            <button className="fbw-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>
          <textarea
            className="fbw-note"
            rows={4}
            placeholder="What did you notice? (bug, idea, too hard/easy, art, copy...)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="fbw-chips">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={"fbw-chip" + (c === category ? " fbw-chip-on" : "")}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <label className="fbw-shot">
            <input
              type="checkbox"
              checked={shot && hasCanvas}
              disabled={!hasCanvas}
              onChange={(e) => setShot(e.target.checked)}
            />
            Include screenshot {hasCanvas ? "" : "(no game on screen)"}
          </label>
          <div className="fbw-actions">
            <button className="fbw-send" onClick={send} disabled={sending || !sanitizeNote(note)}>
              {sending ? "Sending..." : "Send"}
            </button>
            <span className="fbw-status" aria-live="polite">
              {status === "ok" ? "Sent" : status && status.error ? `Failed: ${status.error}` : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no errors referencing `FeedbackWidget` or `feedbackContext`.

- [ ] **Step 4: Commit**

```bash
git add src/devtools/FeedbackWidget.jsx src/devtools/feedback-widget.css
git commit -m "feat(feedback): dev-bypass feedback widget + canvas screenshot"
```

---

## Task 5: Mount the widget in the app

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add the import**

In `src/App.jsx`, after the existing `import CognitiveGym from "./cognitive-gym/CognitiveGym";`
line (near the top imports), add:

```js
import FeedbackWidget from "./devtools/FeedbackWidget";
```

- [ ] **Step 2: Render the widget in the main app shell**

Find the Cognitive Gym screen render line (added earlier; around line 8306):

```jsx
        {screen === "cogym" && <CognitiveGym playerId={player.id || "__demo__"} onBack={()=>setScreen("home")} tierKey={tier} onLocked={() => promptUpgrade("fullGym", "prospect")}/>}
```

Immediately AFTER that line (as a sibling within the same parent container), add:

```jsx
        <FeedbackWidget screen={screen} version={VERSION} />
```

The widget self-gates on dev-bypass and is `position: fixed`, so it renders across the app shell.
`screen` is the main component's state and `VERSION` is the module-level constant (both in scope
here).

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat(feedback): mount FeedbackWidget in the app shell"
```

---

## Task 6: The pull-feedback script

**Files:**
- Create: `scripts/pull-feedback.mjs`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Create `scripts/pull-feedback.mjs`**

```js
// Pull playtest_feedback from Supabase -> a markdown worklist + saved screenshots.
// Run: npm run pull-feedback   (needs VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env)
// Mirrors scripts/pull-reviews.mjs (service-role read bypasses RLS).
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (m) env[m[1]] = m[2];
    }
  } catch { /* no .env */ }
  return env;
}
const env = { ...loadEnv(), ...process.env };
const url = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

const LIMIT = Number(process.argv[2]) || 50;
const { data, error } = await sb
  .from("playtest_feedback")
  .select("id,screen,drill,category,note,context,screenshot,app_version,created_at")
  .order("created_at", { ascending: false })
  .limit(LIMIT);
if (error) { console.error(error.message); process.exit(1); }

const shotsDir = join(ROOT, "docs/feedback-shots");
const lines = ["# Playtest feedback worklist", "", `Pulled ${data.length} most recent (limit ${LIMIT}).`, ""];
let saved = 0;
for (const r of data) {
  let shotLine = "";
  if (typeof r.screenshot === "string" && r.screenshot.startsWith("data:image")) {
    try {
      mkdirSync(shotsDir, { recursive: true });
      const b64 = r.screenshot.split(",")[1] || "";
      const ext = (r.screenshot.slice(5, r.screenshot.indexOf(";")).split("/")[1]) || "jpg";
      writeFileSync(join(shotsDir, `${r.id}.${ext}`), Buffer.from(b64, "base64"));
      shotLine = `shot: docs/feedback-shots/${r.id}.${ext}`;
      saved += 1;
    } catch { /* skip a bad image */ }
  }
  lines.push(`## ${r.created_at} — [${r.category || "?"}] ${r.screen || ""}${r.drill ? " / " + r.drill : ""}`);
  lines.push("");
  lines.push(r.note || "(no note)");
  if (r.context) lines.push("", "context: `" + JSON.stringify(r.context) + "`");
  if (shotLine) lines.push("", shotLine);
  lines.push("");
}
const out = join(ROOT, "docs/playtest-feedback-worklist.md");
writeFileSync(out, lines.join("\n"));
console.log(`Wrote ${out} (${data.length} entries, ${saved} screenshots saved to docs/feedback-shots/).`);
```

- [ ] **Step 2: Add the npm script**

In `package.json` `scripts`, near the other pull scripts (`pull-reviews`, `pull-requests`), add:

```json
    "pull-feedback": "node scripts/pull-feedback.mjs",
```

- [ ] **Step 3: Ignore the generated artifacts**

Append to `.gitignore`:

```
# Generated playtest feedback artifacts (pulled from Supabase, may hold screenshots)
docs/playtest-feedback-worklist.md
docs/feedback-shots/
```

- [ ] **Step 4: Verify the script runs (graceful without creds)**

Run: `npm run pull-feedback`
Expected: either it writes `docs/playtest-feedback-worklist.md` (if `.env` has
`SUPABASE_SERVICE_ROLE_KEY`), or it prints `Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env` and exits 1. No stack trace either way.

- [ ] **Step 5: Commit**

```bash
git add scripts/pull-feedback.mjs package.json .gitignore
git commit -m "feat(feedback): pull-feedback script -> worklist + screenshots"
```

---

## Verification (end of plan)

- [ ] `npm run test:feedback` passes (4 tests).
- [ ] `npm run build` succeeds.
- [ ] `npm run pull-feedback` runs without a stack trace (writes the worklist or reports missing env).
- [ ] Manual playtest (after the owner runs migration 0019 in the connected Supabase project, and
  is signed in as an allowed owner email with dev-bypass on): the Feedback button appears, a note
  with a category and screenshot sends and shows "Sent", and the row (with screenshot + context)
  appears via `npm run pull-feedback` / the dashboard. If not signed in as owner, Send shows
  "Failed: ..." (RLS), which is expected.

## Self-review notes

Spec coverage against `docs/superpowers/specs/2026-06-13-playtest-feedback-design.md`:
- Dev-bypass-gated, app-wide floating widget: Tasks 4, 5.
- Note + category + auto-context + canvas screenshot: Tasks 2 (context), 4 (widget + capture).
- Owner-scoped table, both emails, lower() RLS: Task 1.
- Write helper returning ok/error for confirmation: Task 3.
- Inline JPEG screenshot storage: Task 4 (`captureCanvasShot`), Task 1 (`screenshot text`).
- Closing the loop (pull-feedback, worklist + screenshots): Task 6.
- Error handling (offline disables / RLS surfaces / no-canvas omits shot): Tasks 3, 4.
- Testing (pure helpers): Task 2; integration is the manual playtest in Verification.
- Non-goals respected: no anon path (RLS owner-only), no html2canvas (canvas-only), no in-app
  viewer (pull script + dashboard instead).

Type/name consistency: `savePlaytestFeedback` field names (`screen, drill, category, note,
context, screenshot, appVersion`) match the widget's call and the table columns (`app_version`
mapped from `appVersion`). `buildFeedbackContext` / `sanitizeNote` / `CATEGORIES` signatures match
between `feedbackContext.js`, the tests, and the widget.
```
