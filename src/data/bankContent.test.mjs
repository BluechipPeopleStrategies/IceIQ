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
// Line and rule names live in GUARD 5 rather than here. They failed for a
// different reason — naming a RULE the child's game does not have, not a place
// on the sheet — and keeping them separate keeps each failure message honest
// about what it caught.
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

// ─────────────────────────────────────────────────────────────────────────────
// GUARD 5 — no full-sheet line or line-rule at U7/U9.
//
// Thomas, 2026-08-03: "I'm okay with rewriting around an idea, but then we
// should be showing only cross-ice clips for U7 and U9."
//
// This is the sibling of GUARD 1 and it caught more than the six questions that
// prompted it. U7 plays cross-ice and U9 half-ice, so there is no blue line, no
// centre red line, and no centre ice in the game these children play — and with
// no blue line there is no offside and no icing either. Nine questions named one
// of them, in a distractor or a scenario, and every one was rewritten around the
// idea underneath: "stop at the blue line so you do not get too close" became
// "stop partway"; "called for offside" became "lose the puck on their own".
//
// The rule survives, the line does not. Adding a term here is cheap; a child
// being taught a rule that does not exist in their game is not.
// ─────────────────────────────────────────────────────────────────────────────
{
  const BANNED = /\b(blue ?line|red ?line|cent(?:er|re) ?ice|cent(?:er|re) ?line|off-?side|icing)\b/i;
  const YOUNG = ["U7 / Initiation", "U9 / Novice"];
  const bad = [];
  for (const band of YOUNG) {
    for (const q of bank[band] || []) {
      const m = prose(q).match(BANNED);
      if (m) bad.push(`${band} · ${q.id} · "${m[0]}"`);
    }
  }
  ok(`no full-sheet line or line-rule at U7/U9${bad.length ? ` — found ${bad.length}` : ""}`,
    bad.length === 0);
  bad.slice(0, 10).forEach(b => console.log(`        ${b}`));

  // Self-check: the guard must actually be able to fail. A regex that matches
  // nothing passes every band silently, which is exactly how a vacuous guard
  // gets shipped and trusted.
  const canFail = ["stop at the blue line", "called for offside", "shoot from center ice"]
    .every(s => BANNED.test(s));
  ok("the line guard still matches the phrasings it was written for", canFail);
}

// ─────────────────────────────────────────────────────────────────────────────
// GUARD 6 — Canadian spelling, and no gendered position names, in player prose.
//
// Thomas's call, 2026-08-03: "lean Canadian." The product is Edmonton minor
// hockey, so `centre` and `defence` are the words the rink uses. The bank was
// 95% American, which is why this is a one-time correction plus a guard — it
// only gets more expensive as the bank grows.
//
// `defenseman` was 70% of the gendered batch on its own, and the app had
// already effectively chosen `defender` (596 uses to 58) without anyone
// deciding to. `odd-man rush` stays: Thomas kept it, it is the name of the
// situation, and no child reads it as being about men.
//
// PROSE ONLY, and the scoping is the whole difficulty. `center` appears 515
// times in src/ and only 61 are words a player reads — the rest are
// `textAlign: "center"`, `centerIce`, `center_ice_dot`. This guard reads the
// named prose fields off each question and never sees an id, a sceneId, or an
// asset path, so it cannot tempt anyone into a global replace that would take
// the layout down with it.
// ─────────────────────────────────────────────────────────────────────────────
{
  const AMERICAN = /\b(center(ed|s)?|defense|offense|favorite|colors?|behavior|neighbors?)\b/i;
  const GENDERED = /\b(defense?m[ae]n|linesman|open man|the man\b)\b/i;
  const badSpell = [], badGender = [];
  for (const [band, arr] of Object.entries(bank)) {
    for (const q of arr) {
      // media.alt is player-facing too — a screen reader speaks it aloud.
      const text = prose(q) + " " + (q.media?.alt || "");
      const s = text.match(AMERICAN);
      if (s) badSpell.push(`${band} · ${q.id} · "${s[0]}"`);
      const g = text.match(GENDERED);
      if (g) badGender.push(`${band} · ${q.id} · "${g[0]}"`);
    }
  }
  ok(`Canadian spelling in player prose${badSpell.length ? ` — found ${badSpell.length}` : ""}`,
    badSpell.length === 0);
  badSpell.slice(0, 8).forEach(b => console.log(`        ${b}`));
  ok(`no gendered position names in player prose${badGender.length ? ` — found ${badGender.length}` : ""}`,
    badGender.length === 0);
  badGender.slice(0, 8).forEach(b => console.log(`        ${b}`));

  // Both regexes must still bite, and must still leave the words we kept alone.
  const bites = AMERICAN.test("center ice") && AMERICAN.test("the defense is set")
    && GENDERED.test("the opposing defenseman");
  const spares = !AMERICAN.test("centre ice") && !AMERICAN.test("defensive zone")
    && !GENDERED.test("an odd-man rush") && !GENDERED.test("women's hockey");
  ok("the spelling and gender guards still bite, and still spare what we kept",
    bites && spares);
}

const total = Object.values(bank).reduce((n, a) => n + a.length, 0);
console.log(`\nchecked ${total} questions across ${Object.keys(bank).length} bands`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
