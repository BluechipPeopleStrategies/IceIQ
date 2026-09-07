#!/usr/bin/env node
// Run: node src/utils/colorblindCoverage.test.mjs
//
// Guards a CLASS of defect, not a single bug.
//
// Green-vs-red is the worst possible pairing for the most common form of colour
// blindness, which is the entire reason the app has a colorblind setting. On
// 2026-08-03 that setting was silently doing nothing on most question types:
// MCQuestion and MultiMCQuestion honoured it, while TFQuestion, NextQuestion and
// SeqQuestion did not even accept the prop and hardcoded C.green / C.red. A
// player could turn it on and see no change on a true-false question, with no
// error and no way to tell it was broken.
//
// The fix routed every renderer through verdictColors(). This test stops the
// next renderer — or the next call site — from quietly dropping back out. It
// scans source text rather than importing, because App.jsx is JSX and cannot be
// imported from plain node.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, "..", "App.jsx");
const src = readFileSync(APP, "utf8");

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

// Every component that renders a right/wrong verdict to a player.
const RENDERERS = ["MCQuestion", "MultiMCQuestion", "TFQuestion", "NextQuestion", "SeqQuestion"];

// Call sites that legitimately have no player in scope. QuestionPlayerView backs
// the #q= author preview and the #review dashboard — owner-facing tooling, not a
// player session, so there is no colorblind setting to read.
const EXEMPT_CALLSITE_CONTEXT = "QuestionPlayerView";

/**
 * Split `function <name>(...)` into its parameter list and its body.
 *
 * Both need real bracket matching. The params are destructured — `({ q, sel,
 * colorblind })` — so the first `{` after the name is the DESTRUCTURING brace,
 * not the body. Naive `indexOf("{")` stops at the parameter object and returns a
 * body of a few characters, which silently makes every "does the body contain X"
 * assertion pass. That bug was in the first version of this test.
 */
function splitFn(name) {
  const start = src.indexOf(`function ${name}(`);
  if (start === -1) return null;
  const parenAt = src.indexOf("(", start);
  let depth = 0, closeParen = -1;
  for (let i = parenAt; i < src.length; i++) {
    if (src[i] === "(") depth++;
    else if (src[i] === ")") { depth--; if (depth === 0) { closeParen = i; break; } }
  }
  if (closeParen === -1) return null;
  const params = src.slice(parenAt, closeParen + 1);
  const openBrace = src.indexOf("{", closeParen);
  depth = 0;
  for (let i = openBrace; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) return { params, body: src.slice(openBrace, i + 1) }; }
  }
  return null;
}

/**
 * Every `<Name ... />` JSX element, matched with brace awareness.
 *
 * A regex like `<Name\b[^>]*?/>` breaks on any prop holding an arrow function —
 * `onPick={i => handlePick(i)}` contains a `>` and truncates the match. That
 * bug was also in the first version of this test, and it hid TFQuestion.
 */
function callSites(name) {
  const out = [];
  const re = new RegExp(`<${name}\\b`, "g");
  let m;
  while ((m = re.exec(src)) !== null) {
    let depth = 0;
    for (let i = m.index; i < src.length; i++) {
      const ch = src[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ">" && depth === 0) { out.push(src.slice(m.index, i + 1)); break; }
    }
  }
  return out;
}

// ---- 1. the shared helper exists --------------------------------------------
ok("verdictColors() helper is defined", /function verdictColors\s*\(/.test(src));

// ---- 2. every renderer accepts the prop -------------------------------------
for (const name of RENDERERS) {
  const fn = splitFn(name);
  ok(`${name} exists in App.jsx`, fn !== null);
  if (!fn) continue;
  ok(`${name} accepts a colorblind prop`, /\bcolorblind\b/.test(fn.params));
  // Sanity-check the parser itself, so a body that failed to extract can never
  // make the colour assertions below pass by being empty.
  ok(`${name} body extracted (>200 chars, got ${fn.body.length})`, fn.body.length > 200);
}

// ---- 3. no renderer hardcodes a verdict colour ------------------------------
// The palette tokens and raw rgba tints for green/red must not appear inside a
// renderer body — they belong in verdictColors() alone, where the setting is
// applied once.
const BANNED = [
  { pattern: /C\.green(?!Border)/, label: "C.green" },
  { pattern: /C\.red(?!Border|Dim)/, label: "C.red" },
  { pattern: /C\.greenBorder/, label: "C.greenBorder" },
  { pattern: /C\.redBorder/, label: "C.redBorder" },
  { pattern: /rgba\(34,\s*197,\s*94/, label: "raw green rgba" },
  { pattern: /rgba\(239,\s*68,\s*68/, label: "raw red rgba" },
];
for (const name of RENDERERS) {
  const fn = splitFn(name);
  if (!fn) continue;
  const hits = BANNED.filter(b => b.pattern.test(fn.body)).map(b => b.label);
  ok(`${name} hardcodes no verdict colour${hits.length ? ` (found: ${hits.join(", ")})` : ""}`,
    hits.length === 0);
}

// ---- 4. every call site passes the prop -------------------------------------
// A renderer that accepts `colorblind` still shows green/red if a call site
// forgets to pass it — which is exactly how WeeklyQuiz's <SeqQuestion> and the
// main dispatch's <NextQuestion> / <TFQuestion> stayed broken.
for (const name of RENDERERS) {
  const sites = callSites(name);
  ok(`${name} has at least one call site`, sites.length > 0);
  const missing = sites.filter(s => !/\bcolorblind\s*=/.test(s));
  // Allow only the author-preview dispatch, identified by its surrounding fn.
  const realMissing = missing.filter(s => {
    const at = src.indexOf(s);
    const preceding = src.slice(Math.max(0, at - 1200), at);
    return !preceding.includes(EXEMPT_CALLSITE_CONTEXT);
  });
  ok(`every player-facing <${name}> passes colorblind` +
     (realMissing.length ? ` (missing on ${realMissing.length})` : ""),
    realMissing.length === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
