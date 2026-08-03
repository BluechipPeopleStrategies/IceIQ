#!/usr/bin/env node
// Run: node src/data/bankContent.test.mjs
//
// Regression guards for two content rules that are BOTH at zero violations
// today. Landing them now is the point — a guard added while a rule is already
// clean costs nothing and never lets it drift back. Both came out of the
// 2026-08-03 playtests, and both were found by a person rather than a tool.
//
// A guard cannot detect "vague". These two are the checkable subset.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const bank = JSON.parse(readFileSync(join(HERE, "bank.json"), "utf8"));

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

/** Every player-facing string on a question. */
function prose(q) {
  return [
    q.sit, q.q, q.question, q.why, q.tip, q.explain,
    ...(q.opts || []), ...(q.choices || []),
  ].filter(s => typeof s === "string").join(" ");
}
const hasImage = q => !!(q.media && q.media.url);

// ─────────────────────────────────────────────────────────────────────────────
// GUARD 1 — no zone names at U7/U9.
//
// Thomas, 2026-08-03: "let's get rid of the [zone] words from U7 and U9."
// Hockey Canada plays these bands cross-ice and half-ice. There is no neutral
// zone, no point and no blue line in the game these children actually play, so
// a zone name at U7 names a thing the child has never stood on. Net-relative
// language instead: "your own end", "the end you are attacking", "the middle of
// the ice", "the front of the net".
//
// `blue line` is NOT in this list yet — six questions still use it and are held
// pending a decision, because there the phrase names a RULE (offside) rather
// than a place, so removing it changes what the question teaches. Add it here
// once those six are resolved.
// ─────────────────────────────────────────────────────────────────────────────
{
  const BANNED = /\b(neutral zone|defensive zone|offensive zone|attacking zone|own zone|your zone|their zone|d-zone|o-zone|the slot)\b/i;
  const YOUNG = ["U7 / Initiation", "U9 / Novice"];
  const bad = [];
  for (const band of YOUNG) {
    for (const q of bank[band] || []) {
      const m = prose(q).match(BANNED);
      if (m) bad.push(`${band} · ${q.id} · "${m[0]}"`);
    }
  }
  ok(`no zone names at U7/U9${bad.length ? ` — found ${bad.length}` : ""}`, bad.length === 0);
  bad.slice(0, 8).forEach(b => console.log(`        ${b}`));
}

// ─────────────────────────────────────────────────────────────────────────────
// GUARD 2 — colour may identify a player only when an image makes it visible.
//
// Thomas, 2026-08-03: "The jersey colour doesn't matter in this question."
// A colour with no picture names something the player cannot see. In all eight
// questions this caught, the colour turned out to carry no information at all —
// each already said "teammate" or "defender" in the same sentence.
//
// The colour list deliberately includes GOLD. My first sweep omitted it and
// reported 3 questions when there were 8; the miss is the reason this guard is
// data-driven rather than a remembered list.
// ─────────────────────────────────────────────────────────────────────────────
{
  const COLOUR = /\b(white|black|red|blue|gold|green|yellow|orange|dark|light|grey|gray)[- ](jersey|shirt|sweater|player|teammate|defender|defence?man|defense?man|opponent|skater|team|centre|center|wing|winger|forward)s?\b/i;
  const bad = [];
  for (const [band, arr] of Object.entries(bank)) {
    for (const q of arr) {
      if (hasImage(q)) continue;
      const m = prose(q).match(COLOUR);
      if (m) bad.push(`${band} · ${q.id} · "${m[0]}"`);
    }
  }
  ok(`no player identified by colour without an image${bad.length ? ` — found ${bad.length}` : ""}`,
    bad.length === 0);
  bad.slice(0, 8).forEach(b => console.log(`        ${b}`));
}

// ─────────────────────────────────────────────────────────────────────────────
// GUARD 3 — every question declares a type.
//
// U11 shipped 156 questions with no `type` field at all. They rendered as MC by
// accident rather than by declaration, and were invisible to four call sites
// that test `q.type` by equality — including the one that decides which format
// drills a band can offer. That is what "there are no true/false questions
// available for U11 / Atom yet" actually meant.
// ─────────────────────────────────────────────────────────────────────────────
{
  const KNOWN = new Set(["mc", "tf", "mistake", "next", "seq", "multi", "scenario"]);
  const untyped = [], unknown = [];
  for (const [band, arr] of Object.entries(bank)) {
    for (const q of arr) {
      if (!q.type) untyped.push(`${band} · ${q.id}`);
      else if (!KNOWN.has(q.type)) unknown.push(`${band} · ${q.id} · "${q.type}"`);
    }
  }
  ok(`every question declares a type${untyped.length ? ` — ${untyped.length} untyped` : ""}`,
    untyped.length === 0);
  ok(`no question declares an unknown type${unknown.length ? ` — ${unknown.join(", ")}` : ""}`,
    unknown.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// GUARD 4 — a `tf` question must have a boolean answer key.
//
// Not currently violated, and it must never be. TFQuestion reads `q.ok ? 1 : 0`.
// Give it an mc-shaped question with a numeric `ok` and `ok: 0` silently marks
// FALSE correct while `ok: 1|2|3` marks TRUE correct — the answer key inverts
// with no error raised anywhere. This is the cheapest possible guard against
// the worst possible defect.
// ─────────────────────────────────────────────────────────────────────────────
{
  const bad = [];
  for (const [band, arr] of Object.entries(bank)) {
    for (const q of arr) {
      if (q.type !== "tf") continue;
      if (typeof q.ok !== "boolean") bad.push(`${band} · ${q.id} · ok=${JSON.stringify(q.ok)}`);
    }
  }
  ok(`every tf question has a boolean answer key${bad.length ? ` — ${bad.join(", ")}` : ""}`,
    bad.length === 0);
}

const total = Object.values(bank).reduce((n, a) => n + a.length, 0);
console.log(`\nchecked ${total} questions across ${Object.keys(bank).length} bands`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
