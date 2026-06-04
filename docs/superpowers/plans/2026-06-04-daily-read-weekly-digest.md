# Daily Read Weekly Digest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a parent-facing, opt-in weekly email digest of the Daily Read (the existing Question of the Day), with double opt-in, one-click unsubscribe, and an automated weekly send.

**Architecture:** A shared, framework-free picker computes the week's reads deterministically from `(date, level)` — the same logic the in-app Daily Read uses, so the email never drifts from the app. Opt-ins live in a Supabase table reachable only by server-side code. Three Vercel serverless functions handle subscribe/confirm/unsubscribe; a fourth runs weekly via Vercel Cron, composes each level's digest, and sends via the Resend REST API (called with `fetch`, no SDK).

**Tech Stack:** React + Vite (plain JS/JSX), Supabase (Postgres + RLS), Vercel serverless functions + Cron, Resend REST API. Tests are plain Node `.test.mjs` files (repo convention — hand-rolled pass/fail counters, run with `node`).

**Spec:** `docs/superpowers/specs/2026-06-04-daily-read-weekly-digest-design.md`

---

## File Structure

**Create:**
- `src/daily/levels.js` — single source of truth for the 6 age-level display names (pure, node-safe).
- `src/daily/picker.js` — pure deterministic picker: `hashString`, `todayYmd`, `todaysQuestion`, `weekDates`, `weeklyDigest`.
- `src/daily/picker.test.mjs` — picker unit tests.
- `src/daily/SubscribeCard.jsx` — parent opt-in form component.
- `src/daily/optInToasts.js` — reads `?subscribed=1` / `?unsubscribed=1` and toasts once.
- `api/_lib/supabaseAdmin.js` — lazily-built service-role Supabase client (server only).
- `api/_lib/subscribers.js` — table queries (upsertPending/confirm/unsubscribe/listActive).
- `api/_lib/email.js` — Resend `fetch` transport.
- `api/_lib/email.test.mjs` — transport test (mocked fetch).
- `api/_lib/digest.js` — pure digest renderer.
- `api/_lib/digest.test.mjs` — renderer test.
- `api/subscribe.js` — POST opt-in → pending row + confirmation email.
- `api/confirm.js` — GET confirm token → active.
- `api/unsubscribe.js` — GET unsub token → unsubscribed.
- `api/weekly-digest.js` — Cron-triggered weekly send.
- `supabase/migration_0013_daily_read_subscribers.sql` — table + indexes + RLS.
- `vercel.json` — one cron entry.
- `scripts/smoke-daily-read.mjs` — end-to-end smoke against real Supabase.

**Modify:**
- `src/shared.jsx:49` — re-export `LEVELS` from `src/daily/levels.js` (one source of truth).
- `src/questionOfDay.jsx` — import picker from `src/daily/picker.js`; light "Daily Read" copy.
- `src/screens.jsx` — mount `SubscribeCard` on the parents surface.
- `src/App.jsx` — call `consumeOptInQueryParams()` once at mount.
- `.env.example` — add the new server-side env vars.

**Note on running `.test.mjs`:** the repo sets `"type": "module"`, Node v24. Run a test with `node <path>.test.mjs`; it prints `PASS`/`FAIL` lines and exits non-zero on any failure.

---

## Task 1: Levels single-source-of-truth

**Files:**
- Create: `src/daily/levels.js`
- Create: `src/daily/levels.test.mjs`
- Modify: `src/shared.jsx:49`

- [ ] **Step 1: Write the failing test**

Create `src/daily/levels.test.mjs`:

```js
#!/usr/bin/env node
// Run: node src/daily/levels.test.mjs
import { LEVELS } from "./levels.js";

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  → got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
  ok ? pass++ : fail++;
};

eq("six levels in canonical order", LEVELS, [
  "U7 / Initiation","U9 / Novice","U11 / Atom","U13 / Peewee","U15 / Bantam","U18 / Midget",
]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node src/daily/levels.test.mjs`
Expected: FAIL — `Cannot find module .../src/daily/levels.js`.

- [ ] **Step 3: Create the module**

Create `src/daily/levels.js`:

```js
// Canonical age-level display names, used as bank keys and digest grouping.
// Single source of truth — src/shared.jsx re-exports this so the app and the
// server (api/*) never drift. Pure / node-safe (no React, no Vite features).
export const LEVELS = [
  "U7 / Initiation",
  "U9 / Novice",
  "U11 / Atom",
  "U13 / Peewee",
  "U15 / Bantam",
  "U18 / Midget",
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node src/daily/levels.test.mjs`
Expected: `PASS  six levels in canonical order` then `1 passed, 0 failed`.

- [ ] **Step 5: Refactor shared.jsx to re-export**

In `src/shared.jsx`, replace line 49:

```js
export const LEVELS = ["U7 / Initiation","U9 / Novice","U11 / Atom","U13 / Peewee","U15 / Bantam","U18 / Midget"];
```

with:

```js
export { LEVELS } from "./daily/levels.js";
```

- [ ] **Step 6: Verify the app still builds**

Run: `npm run build`
Expected: build succeeds (exit 0), no "LEVELS is not exported" error.

- [ ] **Step 7: Commit**

```bash
git add src/daily/levels.js src/daily/levels.test.mjs src/shared.jsx
git commit -m "feat(daily-read): extract LEVELS to single source of truth"
```

---

## Task 2: Shared deterministic picker

**Files:**
- Create: `src/daily/picker.js`
- Create: `src/daily/picker.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `src/daily/picker.test.mjs`:

```js
#!/usr/bin/env node
// Run: node src/daily/picker.test.mjs
import { hashString, todaysQuestion, weekDates, weeklyDigest } from "./picker.js";

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  → got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
  ok ? pass++ : fail++;
};
const truthy = (name, got) => eq(name, !!got, true);

const LVL = "U11 / Atom";
const qb = {
  [LVL]: [
    { id: "q1", type: "mc", cat: "Positioning", sit: "A", opts: ["x","y"], ok: 0 },
    { id: "q2", type: "tf", cat: "Awareness",   sit: "B", ok: true },
    { id: "q3", type: "mc", cat: "Breakout",    sit: "C", opts: ["x","y"], ok: 1 },
  ],
};

// hashString is stable and unsigned.
eq("hashString stable", hashString("2026-06-04|U11 / Atom"), hashString("2026-06-04|U11 / Atom"));
truthy("hashString unsigned", hashString("anything") >= 0);

// todaysQuestion is deterministic for a fixed (ymd, level).
const a = todaysQuestion(qb, LVL, "2026-06-04");
const b = todaysQuestion(qb, LVL, "2026-06-04");
eq("deterministic same day", a.id, b.id);
truthy("picks from pool", ["q1","q2","q3"].includes(a.id));

// Empty / missing level → null.
eq("empty level → null", todaysQuestion({ [LVL]: [] }, LVL, "2026-06-04"), null);
eq("missing level → null", todaysQuestion({}, "U7 / Initiation", "2026-06-04"), null);

// Non-MC/TF shapes are filtered out.
eq("filters non mc/tf", todaysQuestion({ [LVL]: [{ id: "p", type: "path" }] }, LVL, "2026-06-04"), null);

// weekDates: 7 ordered ascending days ending at the anchor.
eq("weekDates length", weekDates("2026-06-07").length, 7);
eq("weekDates ends at anchor", weekDates("2026-06-07")[6], "2026-06-07");
eq("weekDates starts 6 days earlier", weekDates("2026-06-07")[0], "2026-06-01");

// weeklyDigest: one entry per day with content, each { ymd, question }.
const wk = weeklyDigest(qb, LVL, "2026-06-07");
eq("weeklyDigest full week", wk.length, 7);
truthy("weeklyDigest item shape", wk[0].ymd && wk[0].question && wk[0].question.id);

// weeklyDigest on empty bank → [].
eq("weeklyDigest empty bank", weeklyDigest({ [LVL]: [] }, LVL, "2026-06-07"), []);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node src/daily/picker.test.mjs`
Expected: FAIL — `Cannot find module .../src/daily/picker.js`.

- [ ] **Step 3: Write the picker**

Create `src/daily/picker.js`:

```js
// Pure, framework-free Daily Read picker. Imported by the client
// (questionOfDay.jsx) AND the server (api/weekly-digest.js). No React, no
// network, no Vite-only features (no import.meta.glob) — so Node can import it
// directly for tests, and it computes the SAME read the app shows.
//
// All dates are UTC ymd strings ("YYYY-MM-DD"), matching the original QotD
// reset behavior.

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0; // unsigned
}

export function todayYmd(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

// Deterministic pick for (ymd, level) from a bank keyed by level. Filters to
// the MC/TF shapes the Daily Read renders. Returns null when the pool is empty.
export function todaysQuestion(qb, level, ymd = todayYmd()) {
  const pool = (qb[level] || []).filter(q => {
    const t = q.type || "mc";
    return t === "mc" || t === "tf";
  });
  if (!pool.length) return null;
  const seed = hashString(`${ymd}|${level}`);
  return pool[seed % pool.length];
}

// The 7 ymd strings ending at (and including) anchorYmd, oldest first.
export function weekDates(anchorYmd = todayYmd()) {
  const out = [];
  const base = new Date(`${anchorYmd}T00:00:00Z`).getTime();
  for (let i = 6; i >= 0; i--) {
    out.push(new Date(base - i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

// The week's reads for a level: [{ ymd, question }], skipping days with no
// question. Empty array when the level has no MC/TF content.
export function weeklyDigest(qb, level, anchorYmd = todayYmd()) {
  const out = [];
  for (const ymd of weekDates(anchorYmd)) {
    const q = todaysQuestion(qb, level, ymd);
    if (q) out.push({ ymd, question: q });
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node src/daily/picker.test.mjs`
Expected: all `PASS`, final line `13 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add src/daily/picker.js src/daily/picker.test.mjs
git commit -m "feat(daily-read): shared deterministic picker + weekly digest"
```

---

## Task 3: Refactor questionOfDay.jsx onto the shared picker

**Files:**
- Modify: `src/questionOfDay.jsx:24-47` (remove local `hashString`/`todayYmd`/`todaysQuestion`), `:11-16` (imports), label copy.

- [ ] **Step 1: Replace the local picker with the shared import**

In `src/questionOfDay.jsx`, add to the import block (near the top, after the existing imports around line 11-16):

```js
import { hashString, todayYmd, todaysQuestion } from "./daily/picker.js";
```

Then DELETE the now-duplicate local definitions: the `hashString` function (lines ~24-31), the `todayYmd` function (lines ~33-35), and the `todaysQuestion` function (lines ~39-47). Leave `getQotdState`/`saveQotdState` and everything below unchanged.

- [ ] **Step 2: Light Daily Read rebrand (copy only)**

In the same file, update the user-facing labels (leave the `LS_QOTD` key and logic unchanged to preserve existing done-state):
- In `QotDCard`: change the eyebrow `Question of the Day` → `Daily Read`. Change `Take today's ${player.level.split(" / ")[0]} QotD` → `Today's ${player.level.split(" / ")[0]} read`.
- In `QotDScreen` header: change `📆 Question of the Day` → `📆 Daily Read`.

- [ ] **Step 3: Verify the build still compiles**

Run: `npm run build`
Expected: exit 0, no unresolved-import or duplicate-declaration errors.

- [ ] **Step 4: Verify the picker tests still pass (guards the refactor)**

Run: `node src/daily/picker.test.mjs`
Expected: `12 passed, 0 failed` (unchanged — behavior preserved).

- [ ] **Step 5: Commit**

```bash
git add src/questionOfDay.jsx
git commit -m "refactor(daily-read): use shared picker; rebrand QotD copy to Daily Read"
```

---

## Task 4: Digest renderer

**Files:**
- Create: `api/_lib/digest.js`
- Create: `api/_lib/digest.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `api/_lib/digest.test.mjs`:

```js
#!/usr/bin/env node
// Run: node api/_lib/digest.test.mjs
import { renderDigest, CASL_MAILING_ADDRESS } from "./digest.js";

let pass = 0, fail = 0;
const truthy = (name, got) => { const ok = !!got; console.log(`${ok ? "PASS" : "FAIL"}  ${name}`); ok ? pass++ : fail++; };
const eq = (name, got, want) => { const ok = got === want; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  → got ${JSON.stringify(got)}`}`); ok ? pass++ : fail++; };

const items = [
  { ymd: "2026-06-01", question: { id: "q1", cat: "Positioning", sit: "Where do you go?" } },
  { ymd: "2026-06-02", question: { id: "q2", cat: "Awareness", q: "Scan first?" } },
];
const out = renderDigest({
  items, level: "U11 / Atom",
  unsubUrl: "https://app/api/unsubscribe?token=UNSUB123",
  appUrl: "https://app",
});

truthy("has subject", out.subject);
truthy("subject names level short", out.subject.includes("U11"));
truthy("html includes first question text", out.html.includes("Where do you go?"));
truthy("html includes second question text (q fallback)", out.html.includes("Scan first?"));
truthy("html includes unsubscribe link", out.html.includes("UNSUB123"));
truthy("html includes mailing placeholder", out.html.includes(CASL_MAILING_ADDRESS));
truthy("text includes unsubscribe url", out.text.includes("UNSUB123"));
truthy("text includes app url", out.text.includes("https://app"));

// HTML escaping guards against injection from question text.
const evil = renderDigest({ items: [{ ymd: "2026-06-01", question: { sit: "<script>x</script>" } }], level: "U11 / Atom", unsubUrl: "u", appUrl: "a" });
eq("escapes angle brackets", evil.html.includes("<script>x</script>"), false);
truthy("keeps escaped form", evil.html.includes("&lt;script&gt;"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node api/_lib/digest.test.mjs`
Expected: FAIL — `Cannot find module .../api/_lib/digest.js`.

- [ ] **Step 3: Write the renderer**

Create `api/_lib/digest.js`:

```js
// Pure render of the weekly Daily Read digest from [{ ymd, question }]. No
// network. The mailing address is a CASL-required placeholder until a real one
// is dropped in before the first public send (see the spec).

export const CASL_MAILING_ADDRESS = "{{CASL_MAILING_ADDRESS}}";

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function questionText(q) {
  return q.sit || q.q || "";
}

export function renderDigest({
  items, level, unsubUrl, appUrl,
  fromName = "RinkReads",
  mailingAddress = CASL_MAILING_ADDRESS,
}) {
  const levelShort = level.split(" / ")[0];
  const subject = `RinkReads — this week's ${levelShort} Daily Reads`;

  const rows = items.map(({ ymd, question }) =>
    `<tr><td style="padding:12px 0;border-bottom:1px solid #e2e8f0">
       <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b">${esc(ymd)} · ${esc(question.cat || "Daily Read")}</div>
       <div style="font-size:15px;color:#0b1a33;font-weight:600;margin-top:4px">${esc(questionText(question))}</div>
     </td></tr>`).join("");

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0b1a33">
    <h1 style="font-size:18px;color:#0b1a33">This week's ${esc(levelShort)} Daily Reads</h1>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <p style="margin-top:20px"><a href="${esc(appUrl)}" style="color:#c9a24b;font-weight:700;text-decoration:none">Play today's read →</a></p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
    <p style="font-size:11px;color:#64748b;line-height:1.6">
      ${esc(fromName)} · ${esc(mailingAddress)}<br/>
      You're receiving this because a parent subscribed to RinkReads Daily Reads.
      <a href="${esc(unsubUrl)}" style="color:#64748b">Unsubscribe</a>.
    </p>
  </div>`;

  const text = [
    `This week's ${levelShort} Daily Reads`,
    "",
    ...items.map(({ ymd, question }) => `- ${ymd}: ${questionText(question)}`),
    "",
    `Play: ${appUrl}`,
    "",
    `${fromName} · ${mailingAddress}`,
    `Unsubscribe: ${unsubUrl}`,
  ].join("\n");

  return { subject, html, text };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node api/_lib/digest.test.mjs`
Expected: all `PASS`, final `10 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/digest.js api/_lib/digest.test.mjs
git commit -m "feat(daily-read): pure weekly digest email renderer"
```

---

## Task 5: Resend email transport

**Files:**
- Create: `api/_lib/email.js`
- Create: `api/_lib/email.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `api/_lib/email.test.mjs`:

```js
#!/usr/bin/env node
// Run: node api/_lib/email.test.mjs
import { sendEmail } from "./email.js";

let pass = 0, fail = 0;
const truthy = (name, got) => { const ok = !!got; console.log(`${ok ? "PASS" : "FAIL"}  ${name}`); ok ? pass++ : fail++; };
const eq = (name, got, want) => { const ok = got === want; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  → got ${JSON.stringify(got)}`}`); ok ? pass++ : fail++; };

let captured = null;
const fakeFetchOk = async (url, opts) => { captured = { url, opts }; return { ok: true, status: 200, json: async () => ({ id: "email_1" }) }; };

const res = await sendEmail(
  { to: "p@example.com", subject: "Hi", html: "<b>hi</b>", text: "hi" },
  { apiKey: "re_test", from: "RinkReads <noreply@rinkreads.com>", fetchImpl: fakeFetchOk },
);

eq("posts to resend endpoint", captured.url, "https://api.resend.com/emails");
eq("sets bearer auth", captured.opts.headers.Authorization, "Bearer re_test");
truthy("body has recipient", JSON.parse(captured.opts.body).to === "p@example.com");
truthy("body has from", JSON.parse(captured.opts.body).from.includes("rinkreads.com"));
truthy("returns parsed json", res.id === "email_1");

// Non-2xx throws.
const fakeFetchErr = async () => ({ ok: false, status: 422, text: async () => "bad" });
let threw = false;
try { await sendEmail({ to: "x", subject: "s", html: "h", text: "t" }, { apiKey: "k", from: "f", fetchImpl: fakeFetchErr }); }
catch { threw = true; }
eq("throws on non-2xx", threw, true);

// Missing config throws.
let threw2 = false;
try { await sendEmail({ to: "x", subject: "s", html: "h", text: "t" }, { apiKey: "", from: "", fetchImpl: fakeFetchOk }); }
catch { threw2 = true; }
eq("throws when unconfigured", threw2, true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node api/_lib/email.test.mjs`
Expected: FAIL — `Cannot find module .../api/_lib/email.js`.

- [ ] **Step 3: Write the transport**

Create `api/_lib/email.js`:

```js
// Minimal Resend transport over fetch — no SDK dependency. Throws on missing
// config or non-2xx so callers can count failures. apiKey/from/fetchImpl are
// injectable for testing; in production they come from env + global fetch.
export async function sendEmail({ to, subject, html, text }, {
  apiKey = process.env.RESEND_API_KEY,
  from = process.env.RESEND_FROM,
  fetchImpl = fetch,
} = {}) {
  if (!apiKey || !from) throw new Error("RESEND_API_KEY / RESEND_FROM not set");
  const res = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body}`);
  }
  return res.json();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node api/_lib/email.test.mjs`
Expected: all `PASS`, final `7 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/email.js api/_lib/email.test.mjs
git commit -m "feat(daily-read): Resend fetch transport (no SDK)"
```

---

## Task 6: Supabase migration

**Files:**
- Create: `supabase/migration_0013_daily_read_subscribers.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migration_0013_daily_read_subscribers.sql`:

```sql
-- migration_0013_daily_read_subscribers.sql
-- Parent-facing Daily Read weekly digest opt-ins. Double opt-in: rows start
-- 'pending', flip to 'active' on email confirmation, 'unsubscribed' on opt-out.
-- No anon/auth access — every read/write happens server-side in api/* with the
-- service-role key (RLS-exempt). RLS is enabled with NO permissive policies, so
-- the browser client (anon key) cannot touch the subscriber list.

create table if not exists public.daily_read_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  level           text not null,
  status          text not null default 'pending'
                    check (status in ('pending','active','unsubscribed')),
  confirm_token   uuid not null default gen_random_uuid(),
  unsub_token     uuid not null default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  confirmed_at    timestamptz,
  unsubscribed_at timestamptz,
  unique (email, level)
);

create index if not exists idx_drs_status  on public.daily_read_subscribers(status);
create index if not exists idx_drs_confirm on public.daily_read_subscribers(confirm_token);
create index if not exists idx_drs_unsub   on public.daily_read_subscribers(unsub_token);

-- RLS on, zero policies → only the service-role key (api/*) can access.
alter table public.daily_read_subscribers enable row level security;
```

- [ ] **Step 2: Apply it to Supabase**

Apply the same way as prior migrations (no automated runner in this repo): open the Supabase dashboard → SQL Editor, paste the file contents, run. Verify success.

- [ ] **Step 3: Verify the table exists**

In the Supabase SQL Editor run:

```sql
select column_name from information_schema.columns
where table_name = 'daily_read_subscribers' order by ordinal_position;
```

Expected: `id, email, level, status, confirm_token, unsub_token, created_at, confirmed_at, unsubscribed_at`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migration_0013_daily_read_subscribers.sql
git commit -m "feat(daily-read): subscribers table + RLS (server-only access)"
```

---

## Task 7: Service-role client + subscriber queries

**Files:**
- Create: `api/_lib/supabaseAdmin.js`
- Create: `api/_lib/subscribers.js`

These are thin wrappers over the network; they're exercised end-to-end by the smoke script in Task 11 rather than unit-tested in isolation.

- [ ] **Step 1: Write the admin client**

Create `api/_lib/supabaseAdmin.js`:

```js
// Server-only Supabase client using the service-role key. NEVER import this
// from src/* — that bundles to the browser. api/* only.
import { createClient } from "@supabase/supabase-js";

let client = null;
export function admin() {
  if (client) return client;
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
```

- [ ] **Step 2: Write the subscriber queries**

Create `api/_lib/subscribers.js`:

```js
// Server-side subscriber-table operations. Email is normalized to lowercase so
// the (email, level) unique constraint dedupes case variants. All functions
// assume the service-role client (RLS-exempt).
import { admin } from "./supabaseAdmin.js";

const TABLE = "daily_read_subscribers";

// Insert a pending opt-in, or reset an existing (email, level) row back to
// pending with a fresh confirm token (handles re-subscribe after unsubscribe).
// Returns { id, confirm_token }.
export async function upsertPending(email, level) {
  const db = admin();
  const norm = email.trim().toLowerCase();
  const { data, error } = await db.from(TABLE)
    .upsert(
      { email: norm, level, status: "pending", confirmed_at: null, unsubscribed_at: null },
      { onConflict: "email,level" },
    )
    .select("id, confirm_token")
    .single();
  if (error) throw error;
  return data;
}

export async function confirmByToken(token) {
  const db = admin();
  const { data, error } = await db.from(TABLE)
    .update({ status: "active", confirmed_at: new Date().toISOString() })
    .eq("confirm_token", token)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function unsubscribeByToken(token) {
  const db = admin();
  const { data, error } = await db.from(TABLE)
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
    .eq("unsub_token", token)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function listActive() {
  const db = admin();
  const { data, error } = await db.from(TABLE)
    .select("email, level, unsub_token")
    .eq("status", "active");
  if (error) throw error;
  return data || [];
}
```

- [ ] **Step 3: Verify it imports without error**

Run: `node -e "import('./api/_lib/subscribers.js').then(()=>console.log('ok')).catch(e=>{console.error(e);process.exit(1)})"`
Expected: prints `ok` (module loads; `admin()` is lazy so missing env doesn't throw at import).

- [ ] **Step 4: Commit**

```bash
git add api/_lib/supabaseAdmin.js api/_lib/subscribers.js
git commit -m "feat(daily-read): service-role client + subscriber queries"
```

---

## Task 8: API endpoints

**Files:**
- Create: `api/subscribe.js`, `api/confirm.js`, `api/unsubscribe.js`, `api/weekly-digest.js`

Vercel auto-detects `api/*.js` as Node serverless functions with the `(req, res)` signature. `req.body` is parsed JSON for POST; `req.query` holds query params.

- [ ] **Step 1: Write `api/subscribe.js`**

```js
// Parent opt-in. Validates, inserts/refreshes a pending row, and sends the
// double-opt-in confirmation email. The browser calls this instead of writing
// to Supabase directly, so the anon client has no subscriber-table surface.
import { LEVELS } from "../src/daily/levels.js";
import { upsertPending } from "./_lib/subscribers.js";
import { sendEmail } from "./_lib/email.js";

const LEVEL_SET = new Set(LEVELS);
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { email, level } = req.body || {};
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: "valid email required" });
    if (!LEVEL_SET.has(level)) return res.status(400).json({ error: "valid level required" });

    const row = await upsertPending(email, level);
    const appUrl = process.env.APP_URL || "https://ice-iq.vercel.app";
    const confirmUrl = `${appUrl}/api/confirm?token=${row.confirm_token}`;

    await sendEmail({
      to: email.trim().toLowerCase(),
      subject: "Confirm your RinkReads Daily Reads",
      html: `<div style="font-family:Arial,sans-serif;color:#0b1a33">
        <p>Tap to confirm your weekly RinkReads Daily Reads:</p>
        <p><a href="${confirmUrl}" style="color:#c9a24b;font-weight:700">Confirm subscription →</a></p>
        <p style="font-size:12px;color:#64748b">If you didn't request this, you can ignore this email.</p>
      </div>`,
      text: `Confirm your weekly RinkReads Daily Reads: ${confirmUrl}\n\nIf you didn't request this, ignore this email.`,
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[subscribe]", e?.message || e);
    return res.status(500).json({ error: "subscribe failed" });
  }
}
```

- [ ] **Step 2: Write `api/confirm.js`**

```js
// Double-opt-in confirmation. GET /api/confirm?token=<confirm_token>. Idempotent
// (re-confirm is a no-op). Always redirects to the app with a status flag.
import { confirmByToken } from "./_lib/subscribers.js";

export default async function handler(req, res) {
  const appUrl = process.env.APP_URL || "https://ice-iq.vercel.app";
  const token = req.query?.token;
  if (token) { try { await confirmByToken(token); } catch (e) { console.error("[confirm]", e?.message || e); } }
  res.writeHead(302, { Location: `${appUrl}/?subscribed=1` });
  res.end();
}
```

- [ ] **Step 3: Write `api/unsubscribe.js`**

```js
// One-click unsubscribe (CASL/CAN-SPAM). GET /api/unsubscribe?token=<unsub_token>.
// No auth by design. Idempotent. Redirects to the app with a status flag.
import { unsubscribeByToken } from "./_lib/subscribers.js";

export default async function handler(req, res) {
  const appUrl = process.env.APP_URL || "https://ice-iq.vercel.app";
  const token = req.query?.token;
  if (token) { try { await unsubscribeByToken(token); } catch (e) { console.error("[unsubscribe]", e?.message || e); } }
  res.writeHead(302, { Location: `${appUrl}/?unsubscribed=1` });
  res.end();
}
```

- [ ] **Step 4: Write `api/weekly-digest.js`**

```js
// Cron-triggered weekly send. Vercel includes `Authorization: Bearer
// $CRON_SECRET` automatically when CRON_SECRET is set, so we gate on it.
// Composes each level's digest ONCE, then sends per active subscriber. Skips
// levels with no content (empty bank → sends nothing). Returns a summary.
import BANK from "../src/data/bank.json" with { type: "json" };
import { LEVELS } from "../src/daily/levels.js";
import { weeklyDigest } from "../src/daily/picker.js";
import { listActive } from "./_lib/subscribers.js";
import { renderDigest } from "./_lib/digest.js";
import { sendEmail } from "./_lib/email.js";

// Mirror qbLoader's bank merge (default missing type to "mc"). Scenario seeds
// are client-only (Vite glob) and intentionally not included server-side; the
// digest composes from bank.json, the gauntlet's primary output target.
function buildQb() {
  const qb = {};
  for (const lvl of LEVELS) {
    const rows = Array.isArray(BANK?.[lvl]) ? BANK[lvl] : [];
    qb[lvl] = rows.map(q => (q.type ? q : { ...q, type: "mc" }));
  }
  return qb;
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || (req.headers.authorization || "") !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const appUrl = process.env.APP_URL || "https://ice-iq.vercel.app";
  const qb = buildQb();
  const byLevel = new Map(LEVELS.map(lvl => [lvl, weeklyDigest(qb, lvl)]));

  let sent = 0, skipped = 0, errors = 0;
  try {
    const subs = await listActive();
    for (const s of subs) {
      const items = byLevel.get(s.level) || [];
      if (!items.length) { skipped++; continue; }
      const unsubUrl = `${appUrl}/api/unsubscribe?token=${s.unsub_token}`;
      const { subject, html, text } = renderDigest({ items, level: s.level, unsubUrl, appUrl });
      try { await sendEmail({ to: s.email, subject, html, text }); sent++; }
      catch (e) { errors++; console.error("[weekly-digest send]", s.email, e?.message || e); }
    }
  } catch (e) {
    console.error("[weekly-digest]", e?.message || e);
    return res.status(500).json({ error: "digest failed", sent, skipped, errors });
  }
  return res.status(200).json({ sent, skipped, errors });
}
```

- [ ] **Step 5: Verify all four endpoints parse and import cleanly**

Run:

```bash
for f in api/subscribe.js api/confirm.js api/unsubscribe.js api/weekly-digest.js; do
  node --check "$f" && echo "syntax ok: $f"
done
```

Expected: `syntax ok:` for all four. (Note: `--check` validates syntax only; the `with { type: "json" }` import is parsed but not executed here.)

- [ ] **Step 6: Verify the production build is unaffected**

Run: `npm run build`
Expected: exit 0. (Vite ignores `api/`; this confirms the `src/daily/levels.js` import path used by `api/subscribe.js` resolves.)

- [ ] **Step 7: Commit**

```bash
git add api/subscribe.js api/confirm.js api/unsubscribe.js api/weekly-digest.js
git commit -m "feat(daily-read): subscribe/confirm/unsubscribe/weekly-digest endpoints"
```

---

## Task 9: Cron schedule + env documentation

**Files:**
- Create: `vercel.json`
- Modify: `.env.example`

- [ ] **Step 1: Write `vercel.json`**

```json
{
  "crons": [
    { "path": "/api/weekly-digest", "schedule": "0 0 * * 1" }
  ]
}
```

(`0 0 * * 1` = 00:00 UTC Monday = 18:00 Sunday MDT / 17:00 Sunday MST. Seasonal one-hour drift accepted per the spec.)

- [ ] **Step 2: Document the new env vars**

Append to `.env.example`:

```sh

# ── Daily Read weekly digest (server-side only — set in the Vercel dashboard,
#    NEVER VITE_-prefixed, NEVER shipped to the browser) ──
# Resend transactional email (https://resend.com) — REST API, no SDK.
RESEND_API_KEY=re_your_resend_api_key
# Verified sender, e.g. "RinkReads <noreply@rinkreads.com>". Domain must be
# verified in Resend for deliverability.
RESEND_FROM=RinkReads <noreply@yourdomain.com>
# Shared secret guarding /api/weekly-digest. Vercel auto-sends it as a Bearer
# token on cron invocations when this env var is set.
CRON_SECRET=generate_a_long_random_string
# Public base URL used to build confirm/unsubscribe/play links.
APP_URL=https://ice-iq.vercel.app
```

- [ ] **Step 3: Commit**

```bash
git add vercel.json .env.example
git commit -m "feat(daily-read): weekly cron + document server env vars"
```

---

## Task 10: Parent opt-in UI

**Files:**
- Create: `src/daily/SubscribeCard.jsx`
- Create: `src/daily/optInToasts.js`
- Modify: `src/screens.jsx` (mount card on the parents surface)
- Modify: `src/App.jsx` (consume query-param flags once at mount)

**Deviation from spec (intentional):** the spec listed a second mount point — a compact card on the in-app Daily Read screen (`QotDScreen`). That screen is where the *player* answers, and "parent-facing only" is the harder constraint the user confirmed. So this plan mounts the opt-in on the parents surface only. If a second parent-facing entry point is wanted later, the home "For parents" card (`HomeStartHereCard` in `widgets.jsx`) is the right host, not the kid-facing Daily Read screen.

- [ ] **Step 1: Write the SubscribeCard component**

Create `src/daily/SubscribeCard.jsx`:

```jsx
// Parent-facing Daily Read email opt-in. Posts to /api/subscribe, which sends a
// confirmation email (double opt-in). Parent-facing copy only — never asks for
// a child's email.
import { useState } from "react";
import { LEVELS } from "./levels.js";
import { Card, C, FONT } from "../shared.jsx";

export function SubscribeCard() {
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState(LEVELS[2]); // default U11 / Atom
  const [state, setState] = useState("idle"); // idle | sending | done | error

  async function submit(e) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    try {
      const r = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), level }),
      });
      setState(r.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <Card style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: 14, color: C.white, fontWeight: 700 }}>Check your email 📬</div>
        <div style={{ fontSize: 12, color: C.dimmer, marginTop: 4, lineHeight: 1.5 }}>
          We sent a confirmation link. Tap it to start getting your player's weekly reads.
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ marginBottom: "1rem" }}>
      <div style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: C.gold, fontWeight: 800, marginBottom: 4 }}>
        For parents
      </div>
      <div style={{ fontSize: 14, color: C.white, fontWeight: 700, marginBottom: 8 }}>
        Get your player's weekly reads by email
      </div>
      <form onSubmit={submit} style={{ display: "grid", gap: ".5rem" }}>
        <input
          type="email" required placeholder="parent@email.com" value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 8, padding: ".6rem .7rem", color: C.white, fontFamily: FONT.body, fontSize: 14 }}
        />
        <select
          value={level} onChange={e => setLevel(e.target.value)}
          style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 8, padding: ".6rem .7rem", color: C.white, fontFamily: FONT.body, fontSize: 14 }}
        >
          {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <button type="submit" disabled={state === "sending"}
          style={{ background: C.gold, color: C.bg, border: "none", borderRadius: 8, padding: ".7rem", cursor: "pointer", fontWeight: 800, fontSize: 14, fontFamily: FONT.body }}>
          {state === "sending" ? "Sending…" : "Email me the weekly reads"}
        </button>
        {state === "error" && (
          <div style={{ fontSize: 12, color: C.red }}>Something went wrong — please try again.</div>
        )}
        <div style={{ fontSize: 11, color: C.dimmer, lineHeight: 1.5 }}>
          One email a week. Unsubscribe anytime. We email parents, not players.
        </div>
      </form>
    </Card>
  );
}
```

- [ ] **Step 2: Verify `C` exposes the colors used**

Run: `grep -nE "bg:|bgElevated|gold:|white:|dimmer|border:|red:" src/shared.jsx | head`
Expected: lines showing `C` includes `bg`, `bgElevated`, `gold`, `white`, `dimmer`, `border`, `red`. If any token name differs, update `SubscribeCard.jsx` to the actual name before continuing.

- [ ] **Step 3: Mount the card on the parents surface**

In `src/screens.jsx`, find `ParentsPage` (referenced in CLAUDE.md as the `#parents` surface). Add the import at the top:

```jsx
import { SubscribeCard } from "./daily/SubscribeCard.jsx";
```

Then render `<SubscribeCard />` inside `ParentsPage`'s returned content, near the top of its main column (after the page heading, before the existing body cards).

- [ ] **Step 4: Write the query-param toast consumer**

Create `src/daily/optInToasts.js`:

```js
// Consume ?subscribed=1 / ?unsubscribed=1 (set by the confirm/unsubscribe
// redirects) exactly once, toast, then strip the param so a refresh doesn't
// re-toast. Safe to call on every mount.
import { toast } from "../toast.jsx";

export function consumeOptInQueryParams() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  let changed = false;
  if (params.get("subscribed") === "1") {
    toast.success("Subscription confirmed — your weekly reads are on the way.");
    params.delete("subscribed");
    changed = true;
  }
  if (params.get("unsubscribed") === "1") {
    toast.info("You've been unsubscribed from the weekly reads.");
    params.delete("unsubscribed");
    changed = true;
  }
  if (changed) {
    const qs = params.toString();
    const url = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
    window.history.replaceState({}, "", url);
  }
}
```

- [ ] **Step 5: Call it once at app mount**

In `src/App.jsx`, add the import near the other local imports:

```js
import { consumeOptInQueryParams } from "./daily/optInToasts.js";
```

Then, inside the top-level `App` component body, add a mount-once effect alongside the existing `useEffect`s:

```js
useEffect(() => { consumeOptInQueryParams(); }, []);
```

(If `App` is a function component without other `useEffect`s nearby, place it immediately after the component's state hooks. `useEffect` is already imported in `App.jsx`; if not, add it to the existing `react` import.)

- [ ] **Step 6: Verify the build compiles**

Run: `npm run build`
Expected: exit 0, no unresolved imports.

- [ ] **Step 7: Manual smoke in dev**

Run: `npm run dev`, open the app, navigate to `#parents`. Confirm the card renders, the level dropdown lists all 6 levels, and submitting with a blank email is blocked by the browser's `required` validation. (A real submit needs the deployed API + env vars; that's covered in Task 11.)

- [ ] **Step 8: Commit**

```bash
git add src/daily/SubscribeCard.jsx src/daily/optInToasts.js src/screens.jsx src/App.jsx
git commit -m "feat(daily-read): parent opt-in card + confirm/unsubscribe toasts"
```

---

## Task 11: End-to-end smoke script

**Files:**
- Create: `scripts/smoke-daily-read.mjs`

Mirrors the existing `scripts/smoke-*.mjs` pattern: exercises the real Supabase table with the service-role key, then cleans up. Email sending is NOT exercised here (no live sends in smoke).

- [ ] **Step 1: Write the smoke script**

Create `scripts/smoke-daily-read.mjs`:

```js
// Daily Read subscriber smoke test. Exercises upsertPending → confirm →
// listActive → unsubscribe against the real Supabase instance, then deletes the
// row. No emails are sent.
//
// Usage: node scripts/smoke-daily-read.mjs
// Requires in .env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Load .env (same minimal approach as other smoke scripts).
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const { upsertPending, confirmByToken, unsubscribeByToken, listActive } =
  await import("../api/_lib/subscribers.js");
const { admin } = await import("../api/_lib/supabaseAdmin.js");

let failures = 0;
const check = (name, ok) => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}`); if (!ok) failures++; };

const email = `smoke+${Date.now()}@rinkreads.test`;
const level = "U11 / Atom";

try {
  const row = await upsertPending(email, level);
  check("upsertPending returns confirm_token", !!row?.confirm_token);

  const confirmed = await confirmByToken(row.confirm_token);
  check("confirmByToken returns true", confirmed === true);

  const active = await listActive();
  check("listActive includes the confirmed sub", active.some(s => s.email === email));

  // Need the unsub_token — fetch it directly with the admin client.
  const { data } = await admin().from("daily_read_subscribers")
    .select("unsub_token").eq("email", email).eq("level", level).single();
  const unsub = await unsubscribeByToken(data.unsub_token);
  check("unsubscribeByToken returns true", unsub === true);

  const active2 = await listActive();
  check("unsubscribed sub no longer active", !active2.some(s => s.email === email));
} finally {
  // Cleanup.
  await admin().from("daily_read_subscribers").delete().eq("email", email);
}

console.log(failures ? `\n${failures} FAILED` : "\nALL PASS");
process.exit(failures ? 1 : 0);
```

- [ ] **Step 2: Add an npm script**

In `package.json` `scripts`, add:

```json
"smoke:daily-read": "node scripts/smoke-daily-read.mjs"
```

- [ ] **Step 3: Run the smoke (requires .env + applied migration)**

Run: `npm run smoke:daily-read`
Expected: five `PASS` lines, then `ALL PASS`, exit 0. (If env vars or the migration are missing, it fails fast with a clear Supabase error — apply Task 6 first.)

- [ ] **Step 4: Commit**

```bash
git add scripts/smoke-daily-read.mjs package.json
git commit -m "test(daily-read): end-to-end subscriber smoke script"
```

---

## Deferred / follow-up (not in this plan)

- **Content seeding** — the digest is empty until the gauntlet lands bank content for the launch levels. Gating item before any public send. Tracked on the content workstream.
- **Real CASL mailing address** — replace `{{CASL_MAILING_ADDRESS}}` in `api/_lib/digest.js` before the first public send.
- **Resend domain verification** + setting `RESEND_FROM` to that domain.
- **Personalized digest** (player streak/score) — needs localStorage progress synced server-side; future phase.

## Verification summary (run before declaring done)

```bash
node src/daily/levels.test.mjs
node src/daily/picker.test.mjs
node api/_lib/digest.test.mjs
node api/_lib/email.test.mjs
npm run build
# With .env + migration applied:
npm run smoke:daily-read
```

Expected: every test file ends `0 failed` / `ALL PASS`, and `npm run build` exits 0.
