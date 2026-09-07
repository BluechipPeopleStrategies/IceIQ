# Transcript Source Triage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `tools/source-triage.mjs`, a new gauntlet entry point that triages ~228 scraped YouTube transcripts (5 channels) into PURSUE / MAYBE-then-resolved / SKIP verdicts with a suggested source tier and a short rationale, writing one grouped report per run — without reading full transcripts for content that's obviously irrelevant, and without auto-writing anything into Obsidian.

**Architecture:** A three-stage funnel (title pre-filter -> capped-excerpt judgment -> full-read escalation on MAYBE only) built as small, pure/testable modules under `tools/gauntlet/`, orchestrated by a CLI script `tools/source-triage.mjs` that mirrors the existing `tools/gauntlet-audit.mjs` pattern exactly (same `runAgent`/`runPool` plumbing, same report-to-`docs/factory/coach-runs/` convention, same `opts.mock`-based test seams).

**Tech Stack:** Node.js ESM (`.mjs`), the existing `tools/lib/claude-agent.mjs` (`runAgent`, shells to the `claude` CLI), `tools/gauntlet/pool.mjs` (`runPool` for bounded concurrency). No new dependencies. Tests use the project's plain pass/fail counter convention (see `tools/gauntlet-audit.test.mjs`), run directly with `node`, not a test framework.

## Global Constraints

- Reuse the existing `tools/gauntlet/` harness (`runAgent`, `runPool`, the `opts.mock`/`opts.mockXxx` test-seam convention). Do not build a parallel `.claude/agents` panel — this is a locked precedent from `docs/superpowers/specs/2026-06-11-rinkreads-coach-agents-design.md`.
- Model is never pinned to a specific model (not Fable 5, not hardcoded). It inherits the run's default (`"sonnet"`, matching `gauntlet-audit.mjs`'s `parseArgs` default) and is overridable via `--coach-model`.
- Input is `*.en.vtt` files only, under `tools/tcs-scraper/transcripts/*/raw/` across all 5 channel folders (including `coaches-site-glass-and-out`). `*.en-orig.vtt` siblings are always skipped.
- Every verdict rationale must be written as an original claim/topic summary, never a transcript excerpt or quotation beyond a few attributed words — this is a hard output constraint from the design spec's copyright-boundary section.
- Any PURSUE verdict on the `coaches-site-glass-and-out` channel must carry an extra flag in the report: this copy was not acquired through the authenticated/paced/citation-only manifest and must not be cited directly; it needs to be re-acquired through the real TCS manifest workflow first.
- Nothing is auto-written into Obsidian or the Acquisition Log. The report file is the only output.
- No new npm/pip dependencies without asking first (per global instructions).

---

## Task 1: VTT parsing utilities

**Files:**
- Create: `tools/gauntlet/vtt-parse.mjs`
- Test: `tools/gauntlet/vtt-parse.test.mjs`

**Interfaces:**
- Produces: `parseVtt(rawText: string) -> string[]` (plain spoken-text lines, cue numbers/timestamps/inline tags stripped, consecutive duplicate lines collapsed). `buildExcerpt(lines: string[], opts?: {headLines?: number, midLines?: number, wordCap?: number}) -> string`. `chunkText(lines: string[], opts?: {wordsPerChunk?: number}) -> string[]`.

- [ ] **Step 1: Write the failing test**

Create `tools/gauntlet/vtt-parse.test.mjs`:

```js
#!/usr/bin/env node
// Run: node tools/gauntlet/vtt-parse.test.mjs
import { parseVtt, buildExcerpt, chunkText } from "./vtt-parse.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const sample = `WEBVTT
Kind: captions
Language: en

1
00:00:00.160 --> 00:00:02.560
hey what's up everybody welcome back

2
00:00:02.560 --> 00:00:02.570
hey what's up everybody welcome back

3
00:00:02.570 --> 00:00:05.840
to another video today we're going
to talk about gap control
`;

const lines = parseVtt(sample);
ok("parseVtt drops the WEBVTT header", !lines.some((l) => l === "WEBVTT"));
ok("parseVtt drops Kind/Language metadata lines", !lines.some((l) => /^(Kind|Language):/.test(l)));
ok("parseVtt drops cue index lines", !lines.some((l) => /^\d+$/.test(l)));
ok("parseVtt drops timestamp lines", !lines.some((l) => l.includes("-->")));
ok("parseVtt collapses the consecutive duplicate cue", lines.filter((l) => l === "hey what's up everybody welcome back").length === 1);
ok("parseVtt keeps the remaining spoken lines", lines.includes("to another video today we're going") && lines.includes("to talk about gap control"));

const inlineTagSample = `WEBVTT

00:00:00.000 --> 00:00:01.000
<00:00:00.160><c> hello</c> <00:00:00.500><c> world</c>
`;
const tagLines = parseVtt(inlineTagSample);
ok("parseVtt strips inline timing tags", tagLines.every((l) => !l.includes("<")));

// buildExcerpt: short input returns everything (capped), long input samples head + middle
const shortLines = ["one", "two", "three"];
ok("buildExcerpt returns all lines when input is shorter than head+mid", buildExcerpt(shortLines, { headLines: 80, midLines: 40 }) === "one two three");

const longLines = Array.from({ length: 300 }, (_, i) => `line${i}`);
const excerpt = buildExcerpt(longLines, { headLines: 10, midLines: 5, wordCap: 1000 });
ok("buildExcerpt includes the first head line", excerpt.includes("line0"));
ok("buildExcerpt includes a middle-sample line, not just head", excerpt.includes(`line${Math.floor(300 / 3)}`));
ok("buildExcerpt does not include the last line (outside head+mid window)", !excerpt.includes("line299"));

const wordCapLines = Array.from({ length: 50 }, (_, i) => `word${i}`);
const capped = buildExcerpt(wordCapLines, { headLines: 50, midLines: 0, wordCap: 10 });
ok("buildExcerpt honors wordCap", capped.split(/\s+/).filter(Boolean).length <= 11); // 10 words + ellipsis marker

// chunkText: splits on line boundaries, never mid-line, respects word budget
const manyLines = Array.from({ length: 20 }, (_, i) => `sentence number ${i} has five words`);
const chunks = chunkText(manyLines, { wordsPerChunk: 30 });
ok("chunkText produces more than one chunk for a large input", chunks.length > 1);
ok("chunkText never splits a line in half", chunks.every((c) => manyLines.some((l) => c.includes(l))));
ok("chunkText reassembles to the same content", chunks.join(" ").split(/\s+/).filter(Boolean).join(" ") === manyLines.join(" ").split(/\s+/).filter(Boolean).join(" "));
ok("chunkText on empty input returns one empty chunk", chunkText([]).length === 1 && chunkText([])[0] === "");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/gauntlet/vtt-parse.test.mjs`
Expected: FAIL immediately with a module-not-found error for `./vtt-parse.mjs` (it doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `tools/gauntlet/vtt-parse.mjs`:

```js
// Pure VTT-caption helpers for the source-triage funnel. Turns a raw .vtt
// file into plain spoken-text lines (no cue numbers, timestamps, or inline
// timing tags), then builds either a capped excerpt (stage 2 of the funnel)
// or word-budgeted chunks for a full sequential read (stage 3). No DOM, no
// network — pure string processing, unit-testable in plain Node.

// Parse a raw .vtt file's text into an ordered array of spoken-text lines.
// Drops the WEBVTT header, Kind:/Language: metadata, numeric cue-index
// lines, "-->" timestamp lines, and strips inline <...> timing tags some
// auto-generated tracks carry. Auto-captions frequently repeat the same
// line across overlapping/rolling cues; collapse immediate duplicates so
// they don't inflate the word count or excerpt sampling.
export function parseVtt(raw) {
  const lines = String(raw || "").split(/\r?\n/);
  const out = [];
  let prev = null;
  for (const rawLine of lines) {
    const t = rawLine.trim();
    if (!t) continue;
    if (t === "WEBVTT") continue;
    if (/^(Kind|Language):/i.test(t)) continue;
    if (/^\d+$/.test(t)) continue; // cue index
    if (t.includes("-->")) continue; // timestamp line
    const clean = t.replace(/<[^>]+>/g, "").trim();
    if (!clean) continue;
    if (clean === prev) continue; // collapse consecutive duplicate cues
    out.push(clean);
    prev = clean;
  }
  return out;
}

function capWords(text, wordCap) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= wordCap) return text;
  return words.slice(0, wordCap).join(" ") + " […]";
}

// Build a bounded excerpt for the cheap "stage 2" judgment call: the first
// `headLines` lines plus a `midLines` sample starting a third of the way
// through (so a transcript's actual content, not just its intro, gets
// represented), then hard-capped to `wordCap` words total so token cost
// stays roughly constant regardless of the source video's length.
export function buildExcerpt(lines, { headLines = 80, midLines = 40, wordCap = 3000 } = {}) {
  if (!lines.length) return "";
  if (lines.length <= headLines + midLines) return capWords(lines.join(" "), wordCap);
  const head = lines.slice(0, headLines);
  const midStart = Math.floor(lines.length / 3);
  const mid = lines.slice(midStart, midStart + midLines);
  return capWords(`${head.join(" ")} […] ${mid.join(" ")}`, wordCap);
}

// Split lines into ~wordsPerChunk-word segments for the "stage 3" full-read
// escalation, never splitting a single line across two chunks. Returns at
// least one chunk (possibly empty) so callers can always iterate the result.
export function chunkText(lines, { wordsPerChunk = 8000 } = {}) {
  const chunks = [];
  let current = [];
  let wordCount = 0;
  for (const line of lines) {
    const w = line.split(/\s+/).filter(Boolean).length;
    if (wordCount + w > wordsPerChunk && current.length) {
      chunks.push(current.join(" "));
      current = [];
      wordCount = 0;
    }
    current.push(line);
    wordCount += w;
  }
  if (current.length) chunks.push(current.join(" "));
  return chunks.length ? chunks : [""];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tools/gauntlet/vtt-parse.test.mjs`
Expected: `16 passed, 0 failed` (all `ok(...)` lines print `PASS`).

- [ ] **Step 5: Commit**

```bash
git add tools/gauntlet/vtt-parse.mjs tools/gauntlet/vtt-parse.test.mjs
git commit -m "feat(gauntlet): add VTT parsing utilities for source triage"
```

---

## Task 2: Title-based pre-filter

**Files:**
- Create: `tools/gauntlet/source-prefilter.mjs`
- Test: `tools/gauntlet/source-prefilter.test.mjs`

**Interfaces:**
- Produces: `preFilter({ title: string }) -> { skip: boolean, reason: string|null }`

- [ ] **Step 1: Write the failing test**

Create `tools/gauntlet/source-prefilter.test.mjs` (titles are real filenames already present in the repo's `tools/tcs-scraper/transcripts/` corpus, used here only as short factual labels, not reproduced content):

```js
#!/usr/bin/env node
// Run: node tools/gauntlet/source-prefilter.test.mjs
import { preFilter } from "./source-prefilter.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const skipCases = [
  "Chipotle-USA Hockey Nationals ｜ Shattuck-St. Mary's Claim Youth Tier I 15O Championship",
  "Team USA Falls in Overtime to Czechia, 3-2",
  "UNCLE PAV vs. KANE VAN GATE ｜ Surprise Shootout Challenge",
  "I TRIED BLIND HOCKEY!",
  "THE MARSBLADE R1 ｜ Game Rollerblade",
  "NEW STICKHANDLING VIDEO GAME!？ ｜ Sense Arena",
];
for (const title of skipCases) {
  const r = preFilter({ title });
  ok(`pre-filters obvious non-candidate: "${title}"`, r.skip === true && typeof r.reason === "string" && r.reason.length > 0);
}

const keepCases = [
  "Go from the grassroots to the Games with Shawn Burnett",
  "College Hockey Recruiting & New NCAA Rules with Guest Mike McMahon, College Hockey Insider - EP 416",
  "SHORT SHIFTS - QUICKSAND",
  "FRIDAY FACEOFF - MENTAL HEALTH IN HOCKEY",
  "HOW TO MICHIGAN (But it gets progressively harder...)",
];
for (const title of keepCases) {
  const r = preFilter({ title });
  ok(`does NOT pre-filter an ambiguous/on-topic title: "${title}"`, r.skip === false && r.reason === null);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/gauntlet/source-prefilter.test.mjs`
Expected: FAIL with a module-not-found error for `./source-prefilter.mjs`.

- [ ] **Step 3: Write the implementation**

Create `tools/gauntlet/source-prefilter.mjs`:

```js
// Deterministic, zero-cost pre-filter for the source-triage funnel's stage 1.
// Judges ONLY the title/filename — never opens the transcript — so obvious
// non-candidates (game recaps, gear/product reviews, pure entertainment or
// challenge content) never reach a model call. Deliberately coarse: this is
// meant to under-skip (send borderline titles on to the real excerpt judge
// in stage 2) rather than over-skip a real candidate. Pure + unit-tested.

const SKIP_PATTERNS = [
  {
    reason: "game recap, score, or championship result",
    re: /\b(falls to|falls in|defeats?|claims?\s+.*championship|wins?\s+\d+-\d+|\d+-\d+\s+(win|loss)|final score)\b/i,
  },
  {
    reason: "gear, equipment, or product review",
    re: /\b(marsblade|sense arena|unboxing|product review|new\s+.*(skate|stick|blade|gear|rollerblade))\b/i,
  },
  {
    reason: "entertainment or challenge content",
    re: /\b(surprise\s+.*challenge|\bvs\.?\s|i tried\s|blind hockey)\b/i,
  },
];

export function preFilter({ title }) {
  const t = String(title || "");
  for (const p of SKIP_PATTERNS) {
    if (p.re.test(t)) return { skip: true, reason: p.reason };
  }
  return { skip: false, reason: null };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tools/gauntlet/source-prefilter.test.mjs`
Expected: `11 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add tools/gauntlet/source-prefilter.mjs tools/gauntlet/source-prefilter.test.mjs
git commit -m "feat(gauntlet): add deterministic title pre-filter for source triage"
```

---

## Task 3: Source-triage rubric (data + loader/render)

**Files:**
- Create: `tools/gauntlet/source-triage-rubric.json`
- Create: `tools/gauntlet/source-triage-rubric.mjs`
- Test: `tools/gauntlet/source-triage-rubric.test.mjs`

**Interfaces:**
- Produces: `loadSourceTriageRubric(path?: string) -> {version: number, principles: {id: string, text: string}[]}`. `renderSourceTriageRubric(data) -> string` (numbered prompt-injectable block, mirrors `renderRubric` in `tools/gauntlet/rubric.mjs`).

- [ ] **Step 1: Write the failing test**

Create `tools/gauntlet/source-triage-rubric.test.mjs`:

```js
#!/usr/bin/env node
// Run: node tools/gauntlet/source-triage-rubric.test.mjs
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSourceTriageRubric, renderSourceTriageRubric } from "./source-triage-rubric.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const __dirname = dirname(fileURLToPath(import.meta.url));
const rubric = loadSourceTriageRubric(resolve(__dirname, "source-triage-rubric.json"));

ok("loads a version number", typeof rubric.version === "number" && rubric.version >= 1);
ok("loads at least 3 principles", Array.isArray(rubric.principles) && rubric.principles.length >= 3);
ok("every principle has an id and text", rubric.principles.every((p) => p.id && p.text && p.text.length > 10));
ok("covers source tiers", rubric.principles.some((p) => /tier/i.test(p.text)));
ok("covers curriculum relevance", rubric.principles.some((p) => /relevan/i.test(p.text)));
ok("covers the no-verbatim-quoting output constraint", rubric.principles.some((p) => /(verbatim|quot|own words)/i.test(p.text)));

const rendered = renderSourceTriageRubric(rubric);
ok("renders a non-empty numbered block", /^1\./m.test(rendered));
ok("renders every principle's text", rubric.principles.every((p) => rendered.includes(p.text)));
ok("renders an empty string for an empty rubric", renderSourceTriageRubric({ principles: [] }) === "");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/gauntlet/source-triage-rubric.test.mjs`
Expected: FAIL with a module-not-found error for `./source-triage-rubric.mjs`.

- [ ] **Step 3: Write the rubric data**

Create `tools/gauntlet/source-triage-rubric.json`:

```json
{
  "version": 1,
  "principles": [
    {
      "id": "curriculum-relevance",
      "text": "Judge curriculum relevance first: does this concern hockey IQ / decision-making content in RinkReads' sense (tactics, systems, small-area games, scanning and anticipation, age-banded skill progression)? Game results, equipment/product content, and general entertainment are not relevant regardless of production quality."
    },
    {
      "id": "source-tiers",
      "text": "Apply source tiers per-video, never inherited automatically from the channel. Tier 1 (primary and authoritative): national federations, formal player-development frameworks, coach-education programs, peer-reviewed research. Tier 2 (established professional practice): recognized coaching associations, reputable development programs and academies, established clinics and detailed systems material. Tier 3 (inspiration and corroboration): experienced-coach videos, drill libraries, instructional content. A Tier 1 organization's highlight reel or news recap is NOT automatically Tier 1 content; judge what is actually said in this specific video."
    },
    {
      "id": "apparent-novelty",
      "text": "Note whether the content looks like it might add something not already standard (a specific age-banded progression detail, a named system, a concrete coaching cue) versus generic material any coaching source would say the same way. Novelty raises the value of a PURSUE verdict but is not required for one."
    },
    {
      "id": "verdict-discipline",
      "text": "Return PURSUE only when the content is both curriculum-relevant and credible enough to be worth a human's time extracting evidence from. Return SKIP when either relevance or credibility clearly fails. Return MAYBE only when a longer read is genuinely needed to tell — not as a default hedge."
    },
    {
      "id": "own-words-only",
      "text": "Write every rationale in your own words as a claim or topic summary. Never quote the transcript verbatim beyond a few attributed words, and never reproduce extended passages. This report must be safely shareable and committable on its own."
    }
  ]
}
```

- [ ] **Step 4: Write the loader/render module**

Create `tools/gauntlet/source-triage-rubric.mjs`:

```js
// Loader/renderer for the source-triage rubric — mirrors tools/gauntlet/rubric.mjs's
// loadRubric/renderRubric shape exactly, but for the source-credibility rubric
// (a separate concern from the scenario-content quality rubric). Pure + unit-tested.
import { readFileSync } from "node:fs";

export function loadSourceTriageRubric(path) {
  try {
    const j = JSON.parse(readFileSync(path, "utf8"));
    return { version: Number(j.version) || 1, principles: Array.isArray(j.principles) ? j.principles : [] };
  } catch {
    return { version: 1, principles: [] };
  }
}

// Render the rubric as a prompt-injectable block (empty string when there are
// none). Numbered so the judge can refer to a principle by number in notes.
export function renderSourceTriageRubric(data) {
  const principles = data?.principles || [];
  if (!principles.length) return "";
  return "Source-triage rubric — apply ALL of these:\n" +
    principles.map((p, i) => `${i + 1}. ${p.text}`).join("\n");
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node tools/gauntlet/source-triage-rubric.test.mjs`
Expected: `9 passed, 0 failed`.

- [ ] **Step 6: Commit**

```bash
git add tools/gauntlet/source-triage-rubric.json tools/gauntlet/source-triage-rubric.mjs tools/gauntlet/source-triage-rubric.test.mjs
git commit -m "feat(gauntlet): add source-triage rubric (tiers, relevance, no-verbatim rule)"
```

---

## Task 4: Prompt builders

**Files:**
- Create: `tools/gauntlet/source-triage-prompts.mjs`
- Test: `tools/gauntlet/source-triage-prompts.test.mjs`

**Interfaces:**
- Consumes: `renderSourceTriageRubric` from Task 3 (`./source-triage-rubric.mjs`).
- Produces: `buildExcerptTriagePrompt({ title, channel, date, excerpt }) -> {system, prompt}` (schema: `{"verdict":"PURSUE"|"SKIP"|"MAYBE","tier":1|2|3|null,"notes":["..."]}`). `buildFullReadChunkPrompt({ title, channel, date, chunkBody, chunkIndex, totalChunks, priorNotes, isLast }) -> {system, prompt}` (schema when `isLast`: `{"verdict":"PURSUE"|"SKIP","tier":1|2|3|null,"notes":["..."]}`; otherwise: `{"leaning":"PURSUE"|"SKIP"|"UNSURE","notes":["..."]}`). Note: the parameter is named `chunkBody`, not `chunkText`, to avoid visual confusion with the unrelated `chunkText()` function exported by `vtt-parse.mjs` and imported into the gate module in Task 5.

- [ ] **Step 1: Write the failing test**

Create `tools/gauntlet/source-triage-prompts.test.mjs`:

```js
#!/usr/bin/env node
// Run: node tools/gauntlet/source-triage-prompts.test.mjs
import { buildExcerptTriagePrompt, buildFullReadChunkPrompt } from "./source-triage-prompts.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const base = { title: "Gap Control Fundamentals", channel: "hockey-canada", date: "20260313", excerpt: "today we talk about gap control and closing space" };

const ex = buildExcerptTriagePrompt(base);
ok("excerpt prompt returns system + prompt strings", typeof ex.system === "string" && typeof ex.prompt === "string");
ok("excerpt prompt system mentions the rubric tiers", /tier/i.test(ex.system));
ok("excerpt prompt system requires the PURSUE|SKIP|MAYBE schema", /PURSUE.*SKIP.*MAYBE/s.test(ex.system));
ok("excerpt prompt system requires notes in the judge's own words", /own words/i.test(ex.system));
ok("excerpt prompt body includes the title", ex.prompt.includes(base.title));
ok("excerpt prompt body includes the channel", ex.prompt.includes(base.channel));
ok("excerpt prompt body includes the excerpt text", ex.prompt.includes(base.excerpt));

const midChunk = buildFullReadChunkPrompt({ title: base.title, channel: base.channel, date: base.date, chunkBody: "chunk one text", chunkIndex: 0, totalChunks: 3, priorNotes: [], isLast: false });
ok("mid-chunk prompt requires the leaning schema, not a final verdict", /leaning/i.test(midChunk.system) && !/"verdict"/.test(midChunk.system));
ok("mid-chunk prompt body says which chunk this is", midChunk.prompt.includes("1") && midChunk.prompt.includes("3"));

const lastChunk = buildFullReadChunkPrompt({ title: base.title, channel: base.channel, date: base.date, chunkBody: "final chunk text", chunkIndex: 2, totalChunks: 3, priorNotes: ["earlier note"], isLast: true });
ok("last-chunk prompt requires a final PURSUE|SKIP verdict schema", /"verdict"/.test(lastChunk.system) && /PURSUE.*SKIP/s.test(lastChunk.system));
ok("last-chunk prompt carries forward prior notes", lastChunk.prompt.includes("earlier note"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/gauntlet/source-triage-prompts.test.mjs`
Expected: FAIL with a module-not-found error for `./source-triage-prompts.mjs`.

- [ ] **Step 3: Write the implementation**

Create `tools/gauntlet/source-triage-prompts.mjs`:

```js
// System + user prompts for the source-triage funnel's two judgment calls
// (stage 2 excerpt judgment, stage 3 full-read escalation chunks). Each
// builder returns { system, prompt }; the caller feeds these to runAgent()
// and parses the JSON the model returns. Mirrors the shape of
// tools/gauntlet/prompts.mjs.
import { loadSourceTriageRubric, renderSourceTriageRubric } from "./source-triage-rubric.mjs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUBRIC = loadSourceTriageRubric(resolve(__dirname, "source-triage-rubric.json"));
const RUBRIC_BLOCK = renderSourceTriageRubric(RUBRIC);

const ROLE = `You are triaging scraped hockey-content video transcripts for RinkReads, an app
that builds an evidence-led youth-hockey decision-making curriculum. Your ONLY job is
to decide whether a transcript is worth a human's time mining for curriculum evidence.
You are NOT extracting evidence yourself, and you must write every rationale in your
own words — never quote the transcript verbatim beyond a few attributed words.`;

export function buildExcerptTriagePrompt({ title, channel, date, excerpt }) {
  const system = `${ROLE}

${RUBRIC_BLOCK}

You are seeing a CAPPED EXCERPT (not the full transcript) — the opening plus a sample
from the middle. If the excerpt is not enough to judge confidently, return MAYBE rather
than guessing; a longer read is available on MAYBE.
Return ONLY: {"verdict":"PURSUE"|"SKIP"|"MAYBE","tier":1|2|3|null,"notes":["short, specific, in your own words"]}`;
  const prompt = `Channel: ${channel}
Date: ${date}
Title: ${title}

Excerpt:
${excerpt}

Judge this excerpt.`;
  return { system, prompt };
}

export function buildFullReadChunkPrompt({ title, channel, date, chunkBody, chunkIndex, totalChunks, priorNotes, isLast }) {
  const priorBlock = priorNotes && priorNotes.length
    ? `\nNotes from earlier chunks of this same transcript:\n${priorNotes.map((n) => `- ${n}`).join("\n")}\n`
    : "";
  if (!isLast) {
    const system = `${ROLE}

${RUBRIC_BLOCK}

You are reading this transcript one chunk at a time because the excerpt alone was not
enough to judge confidently. This is chunk ${chunkIndex + 1} of ${totalChunks} — NOT the
last one, so do not give a final verdict yet.
Return ONLY: {"leaning":"PURSUE"|"SKIP"|"UNSURE","notes":["short, specific, in your own words"]}`;
    const prompt = `Channel: ${channel}
Date: ${date}
Title: ${title}
${priorBlock}
Chunk ${chunkIndex + 1} of ${totalChunks}:
${chunkBody}

Give your current leaning based on everything read so far.`;
    return { system, prompt };
  }
  const system = `${ROLE}

${RUBRIC_BLOCK}

You are reading this transcript one chunk at a time because the excerpt alone was not
enough to judge confidently. This is the FINAL chunk (${chunkIndex + 1} of ${totalChunks})
— give your final decision now. No MAYBE is allowed at this point.
Return ONLY: {"verdict":"PURSUE"|"SKIP","tier":1|2|3|null,"notes":["short, specific, in your own words"]}`;
  const prompt = `Channel: ${channel}
Date: ${date}
Title: ${title}
${priorBlock}
Final chunk ${chunkIndex + 1} of ${totalChunks}:
${chunkBody}

Give your final PURSUE or SKIP verdict based on everything read across all chunks.`;
  return { system, prompt };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tools/gauntlet/source-triage-prompts.test.mjs`
Expected: `11 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add tools/gauntlet/source-triage-prompts.mjs tools/gauntlet/source-triage-prompts.test.mjs
git commit -m "feat(gauntlet): add source-triage prompt builders"
```

---

## Task 5: Escalation gate (triageTranscript)

**Files:**
- Create: `tools/gauntlet/source-triage-gate.mjs`
- Test: `tools/gauntlet/source-triage-gate.test.mjs`

**Interfaces:**
- Consumes: `buildExcerpt`, `chunkText` from Task 1 (`./vtt-parse.mjs`). `buildExcerptTriagePrompt`, `buildFullReadChunkPrompt` from Task 4 (`./source-triage-prompts.mjs`). `runAgent` from `../lib/claude-agent.mjs`.
- Produces: `triageTranscript({ title, channel, date, lines, opts }) -> Promise<{ verdict: "PURSUE"|"SKIP", tier: 1|2|3|null, notes: string[], escalated: boolean }>`.

- [ ] **Step 1: Write the failing test**

Create `tools/gauntlet/source-triage-gate.test.mjs`:

```js
#!/usr/bin/env node
// Run: node tools/gauntlet/source-triage-gate.test.mjs
import { triageTranscript } from "./source-triage-gate.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const base = { title: "T", channel: "hockey-canada", date: "20260101", lines: ["hello world, this is a transcript about gap control and reading the play"] };

// Confident PURSUE from the excerpt stage -> no escalation
const r1 = await triageTranscript({ ...base, opts: { mock: true, mockExcerpt: { verdict: "PURSUE", tier: 2, notes: ["on-topic tactics content"] } } });
ok("confident excerpt PURSUE resolves without escalation", r1.verdict === "PURSUE" && r1.tier === 2 && r1.escalated === false);

// Confident SKIP from the excerpt stage -> no escalation
const r2 = await triageTranscript({ ...base, opts: { mock: true, mockExcerpt: { verdict: "SKIP", tier: null, notes: ["off-topic"] } } });
ok("confident excerpt SKIP resolves without escalation", r2.verdict === "SKIP" && r2.escalated === false);

// MAYBE from the excerpt stage -> escalates to a full read, single-chunk case
const manyLines = Array.from({ length: 50 }, (_, i) => `line ${i} about hockey tactics`);
const r3 = await triageTranscript({
  title: "T", channel: "hockey-canada", date: "20260101", lines: manyLines,
  opts: { mock: true, mockExcerpt: { verdict: "MAYBE", tier: null, notes: ["unclear from excerpt"] }, mockFullRead: { verdict: "PURSUE", tier: 3, notes: ["turned out relevant on full read"] } },
});
ok("excerpt MAYBE escalates to a full read", r3.escalated === true);
ok("escalated verdict comes from the full-read mock", r3.verdict === "PURSUE" && r3.tier === 3);
ok("escalated verdict is never MAYBE", r3.verdict === "PURSUE" || r3.verdict === "SKIP");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/gauntlet/source-triage-gate.test.mjs`
Expected: FAIL with a module-not-found error for `./source-triage-gate.mjs`.

- [ ] **Step 3: Write the implementation**

Create `tools/gauntlet/source-triage-gate.mjs`:

```js
// Three-stage escalation for the source-triage funnel: a capped-excerpt
// judgment first, escalating to a full sequential read ONLY when the
// excerpt judge returns MAYBE. Mirrors the Head-Coach-gates-the-room shape
// of tools/gauntlet/coach-gate.mjs, applied to read depth instead of panel
// size — the cost driver here is transcript length, not debate complexity.
import { runAgent } from "../lib/claude-agent.mjs";
import { buildExcerpt, chunkText } from "./vtt-parse.mjs";
import { buildExcerptTriagePrompt, buildFullReadChunkPrompt } from "./source-triage-prompts.mjs";

// Stage 2: judge a capped excerpt. Returns { verdict, tier, notes }.
async function excerptTriage({ title, channel, date, excerpt, opts }) {
  if (opts.mock) return opts.mockExcerpt || { verdict: "SKIP", tier: null, notes: ["[mock] default skip"] };
  try {
    const r = await runAgent({ ...buildExcerptTriagePrompt({ title, channel, date, excerpt }), model: opts.coachModel });
    return { verdict: r.verdict, tier: r.tier ?? null, notes: r.notes || [] };
  } catch (e) {
    return { verdict: "MAYBE", tier: null, notes: [`excerpt judge error: ${e.message}`] };
  }
}

// Stage 3: sequential full-read escalation over word-budgeted chunks.
// Returns { verdict, tier, notes }. Only the final chunk is allowed to
// return a terminal PURSUE/SKIP; earlier chunks return a "leaning" that
// gets carried forward as context for the next chunk.
async function fullReadEscalation({ title, channel, date, lines, opts }) {
  if (opts.mock) return opts.mockFullRead || { verdict: "SKIP", tier: null, notes: ["[mock] default skip"] };
  // chunkText() (the vtt-parse.mjs export, distinct from this loop's
  // per-iteration chunkBody value) always returns at least one chunk, and
  // the final iteration below always returns before the loop can exit
  // normally — so every code path is covered without a fallback after it.
  const chunks = chunkText(lines, { wordsPerChunk: 8000 });
  const notes = [];
  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    try {
      const r = await runAgent({
        ...buildFullReadChunkPrompt({ title, channel, date, chunkBody: chunks[i], chunkIndex: i, totalChunks: chunks.length, priorNotes: notes, isLast }),
        model: opts.coachModel,
      });
      if (r.notes) notes.push(...r.notes);
      if (isLast) return { verdict: r.verdict, tier: r.tier ?? null, notes };
    } catch (e) {
      notes.push(`chunk ${i + 1} error: ${e.message}`);
      if (isLast) return { verdict: "SKIP", tier: null, notes };
    }
  }
}

// Top-level orchestrator for one transcript. `lines` is the output of
// parseVtt() — plain spoken-text lines, no timestamps/cue numbers.
export async function triageTranscript({ title, channel, date, lines, opts }) {
  const excerpt = buildExcerpt(lines);
  const stage2 = await excerptTriage({ title, channel, date, excerpt, opts });
  if (stage2.verdict !== "MAYBE") {
    return { verdict: stage2.verdict, tier: stage2.tier, notes: stage2.notes, escalated: false };
  }
  const stage3 = await fullReadEscalation({ title, channel, date, lines, opts });
  return { verdict: stage3.verdict, tier: stage3.tier, notes: [...stage2.notes, ...stage3.notes], escalated: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tools/gauntlet/source-triage-gate.test.mjs`
Expected: `5 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add tools/gauntlet/source-triage-gate.mjs tools/gauntlet/source-triage-gate.test.mjs
git commit -m "feat(gauntlet): add source-triage escalation gate (excerpt -> full-read on MAYBE)"
```

---

## Task 6: CLI entry point

**Files:**
- Create: `tools/source-triage.mjs`
- Test: `tools/source-triage.test.mjs`

**Interfaces:**
- Consumes: `parseVtt` from `tools/gauntlet/vtt-parse.mjs`. `preFilter` from `tools/gauntlet/source-prefilter.mjs`. `triageTranscript` from `tools/gauntlet/source-triage-gate.mjs`. `runPool` from `tools/gauntlet/pool.mjs`.
- Produces (exported for the test, mirroring `gauntlet-audit.mjs`'s exports): `parseFilename(file: string) -> {date: string, title: string, videoId: string}`. `loadTranscripts({ root: string }) -> {channel, file, title, date, videoId, path}[]`. `renderReport(rows, date) -> string`.

- [ ] **Step 1: Write the failing test**

Create `tools/source-triage.test.mjs`:

```js
#!/usr/bin/env node
// Run: node tools/source-triage.test.mjs
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { parseFilename, loadTranscripts, renderReport } from "./source-triage.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

ok(
  "parseFilename splits date/title/videoId on a real-shaped filename",
  (() => {
    const r = parseFilename("20260329__Chipotle-USA Hockey Nationals ｜ Shattuck-St. Mary's Claim Youth Tier I 15O Championship__qd6hB97h-oo.en.vtt");
    return r.date === "20260329" && r.videoId === "qd6hB97h-oo" && r.title.includes("Chipotle-USA Hockey Nationals");
  })()
);

// loadTranscripts against a small temp fixture tree (never depends on the
// real, gitignored tools/tcs-scraper/transcripts corpus, so this passes on
// a fresh clone / CI with no scraped data present).
const fixtureRoot = mkdtempSync(join(tmpdir(), "source-triage-fixture-"));
for (const channel of ["chan-a", "chan-b"]) {
  const dir = resolve(fixtureRoot, channel, "raw");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "20260101__Some Title__abc123.en.vtt"), "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nhello\n");
  writeFileSync(resolve(dir, "20260101__Some Title__abc123.en-orig.vtt"), "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nhello\n");
}
const transcripts = loadTranscripts({ root: fixtureRoot });
ok("loadTranscripts finds one .en.vtt per fixture channel (2 total)", transcripts.length === 2);
ok("loadTranscripts excludes .en-orig.vtt siblings", transcripts.every((t) => !t.file.endsWith(".en-orig.vtt")));
ok("loadTranscripts tags each entry with its channel folder name", transcripts.some((t) => t.channel === "chan-a") && transcripts.some((t) => t.channel === "chan-b"));
rmSync(fixtureRoot, { recursive: true, force: true });

ok("loadTranscripts on a missing root returns an empty array", loadTranscripts({ root: resolve(fixtureRoot, "does-not-exist") }).length === 0);

const rows = [
  { channel: "hockey-canada", title: "A", verdict: "PURSUE", tier: 2, notes: ["good"], escalated: false },
  { channel: "hockey-canada", title: "B", verdict: "SKIP", tier: null, notes: ["off-topic"], escalated: false },
  { channel: "coaches-site-glass-and-out", title: "C", verdict: "PURSUE", tier: 3, notes: ["interesting"], escalated: true },
];
const md = renderReport(rows, "2026-07-11");
ok("report groups by channel", md.includes("hockey-canada") && md.includes("coaches-site-glass-and-out"));
ok("report shows verdicts", md.includes("PURSUE") && md.includes("SKIP"));
ok("report tallies verdict counts", /PURSUE\s+2/.test(md) || md.includes("PURSUE 2"));
ok("report flags a coaches-site-glass-and-out PURSUE for re-acquisition", /re-acquir/i.test(md));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/source-triage.test.mjs`
Expected: FAIL with a module-not-found error for `./source-triage.mjs`.

- [ ] **Step 3: Write the implementation**

Create `tools/source-triage.mjs`:

```js
#!/usr/bin/env node
// Transcript source triage. Walks the scraped-transcript channels, runs the
// three-stage funnel (title pre-filter -> capped excerpt -> full-read
// escalation on MAYBE) over every unique video, and writes ONE grouped
// report to docs/factory/coach-runs/. It NEVER writes into Obsidian or the
// Acquisition Log, and never edits/deletes a transcript — it only assesses.
//
// Usage:
//   node tools/source-triage.mjs                    # all channels, real judge (inherits sonnet)
//   node tools/source-triage.mjs --mock              # no claude calls (smoke)
//   node tools/source-triage.mjs --limit 5 --dry-run
//   node tools/source-triage.mjs --channel pavel-barber
//   node tools/source-triage.mjs --coach-model claude-fable-5
//   node tools/source-triage.mjs --concurrency 5
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseVtt } from "./gauntlet/vtt-parse.mjs";
import { preFilter } from "./gauntlet/source-prefilter.mjs";
import { triageTranscript } from "./gauntlet/source-triage-gate.mjs";
import { runPool } from "./gauntlet/pool.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const defaultTranscriptRoot = resolve(root, "tools/tcs-scraper/transcripts");

// "YYYYMMDD__Title__videoId.en.vtt" -> { date, title, videoId }. Splits on
// the FIRST "__" (date boundary) and the LAST "__" (videoId boundary), so a
// title containing "__" itself (unseen in practice, but not assumed away)
// still parses correctly.
export function parseFilename(file) {
  const base = file.replace(/\.en\.vtt$/, "");
  const firstSep = base.indexOf("__");
  const lastSep = base.lastIndexOf("__");
  const date = base.slice(0, firstSep);
  const videoId = base.slice(lastSep + 2);
  const title = base.slice(firstSep + 2, lastSep);
  return { date, title, videoId };
}

// Enumerate every *.en.vtt under root/*/raw/ (skipping *.en-orig.vtt
// siblings). Returns [] if root doesn't exist (fresh clone with no scraped
// data — this corpus is gitignored on purpose).
export function loadTranscripts({ root: transcriptRoot }) {
  if (!existsSync(transcriptRoot)) return [];
  const out = [];
  for (const channel of readdirSync(transcriptRoot)) {
    const rawDir = resolve(transcriptRoot, channel, "raw");
    if (!existsSync(rawDir) || !statSync(rawDir).isDirectory()) continue;
    for (const file of readdirSync(rawDir)) {
      if (!file.endsWith(".en.vtt")) continue;
      const { date, title, videoId } = parseFilename(file);
      out.push({ channel, file, title, date, videoId, path: resolve(rawDir, file) });
    }
  }
  return out;
}

export function renderReport(rows, date) {
  const channels = {};
  for (const r of rows) (channels[r.channel] ||= []).push(r);
  let md = `# Source Triage — ${date}\n\nTitle/excerpt/full-read funnel over ${rows.length} scraped transcript(s). Verdicts: PURSUE / SKIP.\n`;
  const tally = rows.reduce((m, r) => ((m[r.verdict] = (m[r.verdict] || 0) + 1), m), {});
  md += `\n**Tally:** ` + Object.entries(tally).map(([k, n]) => `${k} ${n}`).join(" · ") + `\n`;
  for (const channel of Object.keys(channels).sort()) {
    md += `\n## ${channel}\n\n| Title | Verdict | Tier | Escalated | Notes |\n|---|---|---|---|---|\n`;
    for (const r of channels[channel]) {
      const flag = channel === "coaches-site-glass-and-out" && r.verdict === "PURSUE"
        ? " **[re-acquire via the authenticated TCS manifest before citing — this copy was not acquired through that process]**"
        : "";
      md += `| ${r.title} | ${r.verdict} | ${r.tier ?? "—"} | ${r.escalated ? "yes" : "no"} | ${(r.notes || []).join("; ").replace(/\|/g, "/")}${flag} |\n`;
    }
  }
  return md;
}

function parseArgs(argv) {
  const a = { mock: false, dryRun: false, limit: Infinity, channel: null, coachModel: "sonnet", concurrency: 3 };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--mock") a.mock = true;
    else if (t === "--dry-run") a.dryRun = true;
    else if (t === "--limit") a.limit = parseInt(argv[++i], 10);
    else if (t === "--channel") a.channel = argv[++i];
    else if (t === "--coach-model") a.coachModel = argv[++i];
    else if (t === "--concurrency") a.concurrency = parseInt(argv[++i], 10);
  }
  return a;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  let transcripts = loadTranscripts({ root: defaultTranscriptRoot });
  if (opts.channel) transcripts = transcripts.filter((t) => t.channel === opts.channel);
  if (Number.isFinite(opts.limit)) transcripts = transcripts.slice(0, opts.limit);
  if (!transcripts.length) { console.log("No transcripts found."); return; }

  console.log(`Triaging ${transcripts.length} transcript(s) on ${opts.coachModel}${opts.mock ? " [mock]" : ""}…\n`);
  const rows = await runPool(transcripts, opts.concurrency, async (t) => {
    const pf = preFilter({ title: t.title });
    if (pf.skip) {
      console.log(`SKIP    ${t.channel}/${t.title} (pre-filtered: ${pf.reason})`);
      return { channel: t.channel, title: t.title, verdict: "SKIP", tier: null, notes: [`pre-filtered: ${pf.reason}`], escalated: false };
    }
    const raw = readFileSync(t.path, "utf8");
    const lines = parseVtt(raw);
    const r = await triageTranscript({ title: t.title, channel: t.channel, date: t.date, lines, opts });
    console.log(`${r.verdict.padEnd(6)}  ${t.channel}/${t.title}${r.escalated ? " (full read)" : ""}`);
    return { channel: t.channel, title: t.title, verdict: r.verdict, tier: r.tier, notes: r.notes, escalated: r.escalated };
  });

  const date = new Date().toISOString().slice(0, 10);
  const outDir = resolve(root, "docs/factory/coach-runs");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, `source-triage-${date}.md`);
  if (!opts.dryRun) writeFileSync(outFile, renderReport(rows, date), "utf8");
  const pursued = rows.filter((r) => r.verdict === "PURSUE").length;
  console.log(`\nDone. ${rows.length} assessed; ${pursued} PURSUE.${opts.dryRun ? " (dry-run: no writes)" : ` Report: ${outFile}`}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tools/source-triage.test.mjs`
Expected: `9 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add tools/source-triage.mjs tools/source-triage.test.mjs
git commit -m "feat(tools): add source-triage CLI entry point"
```

---

## Task 7: Wire the npm script and run a real smoke test

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing new — this task only wires the CLI already built in Task 6.

- [ ] **Step 1: Add the npm script**

In `package.json`, add a new entry to `"scripts"` near the other `gauntlet`-prefixed entries (find `"gauntlet:audit": "node tools/gauntlet-audit.mjs",` and add directly after it):

```json
    "gauntlet:audit": "node tools/gauntlet-audit.mjs",
    "source:triage": "node tools/source-triage.mjs",
```

- [ ] **Step 2: Run the full new test suite together**

Run each test file directly (this project's `tools/gauntlet` tests are not wired into `node --test`; they're run individually per the header comment in each file):

```bash
node tools/gauntlet/vtt-parse.test.mjs
node tools/gauntlet/source-prefilter.test.mjs
node tools/gauntlet/source-triage-rubric.test.mjs
node tools/gauntlet/source-triage-prompts.test.mjs
node tools/gauntlet/source-triage-gate.test.mjs
node tools/source-triage.test.mjs
```

Expected: every file prints `N passed, 0 failed` and exits 0.

- [ ] **Step 3: Dry-run smoke test against the real corpus (mock mode, no claude calls)**

```bash
npm run source:triage -- --mock --limit 5 --dry-run
```

Expected: console output lists up to 5 transcripts, each verdict SKIP — either `(pre-filtered: ...)` when the title trips the deterministic pre-filter, or the mock excerpt stage's default skip otherwise (`--mock` has no per-title variation, so a real PURSUE only shows up in a real, non-mock run) — ending with `Done. N assessed; 0 PURSUE. (dry-run: no writes)`. No file is written under `docs/factory/coach-runs/` (dry-run). This step is just confirming the plumbing runs end-to-end without spending tokens, not exercising real judgment.

If `tools/tcs-scraper/transcripts/` is not present on the machine running this (it's gitignored, so a fresh clone won't have it), this step instead prints `No transcripts found.` — that's expected and not a failure; it just means there's nothing local to smoke-test against yet.

- [ ] **Step 4: Real run against one channel (uses actual `claude` CLI calls — costs tokens)**

Only run this once Thomas confirms he wants to spend the tokens:

```bash
npm run source:triage -- --channel pavel-barber
```

Expected: a report is written to `docs/factory/coach-runs/source-triage-<today>.md`. Read it and confirm the verdicts look reasonable before running the remaining 4 channels (including `coaches-site-glass-and-out`, which will carry the re-acquisition flag on any PURSUE).

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "chore: wire source:triage npm script"
```
