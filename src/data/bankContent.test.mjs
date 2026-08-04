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

// ─────────────────────────────────────────────────────────────────────────────
// GUARD 7 — an `mc` or `seq` stem has to actually ask something.
//
// 45 questions described a situation and then stopped. The child read a
// paragraph about a 2-on-1 and was shown four options with no question attached
// to them. Fixed in 501ed5a (and the `next` ones by rendering a badge), and this
// holds the number at zero.
//
// Unlike the under-specified detector, which the audit itself called unreliable,
// this one is exact: a stem either contains an interrogative or it does not, and
// the type-aware version had a 0% false-positive rate over 45 hand-checked
// candidates.
//
// The exemptions are the interesting part. `tf`, `mistake`, `next` and `multi`
// are exempt because the UI supplies their ask as chrome — a True/False pair, a
// "spot the mistake" frame, a "What's Your Next Move?" badge. So each exemption
// NAMES ITS RENDER SITE and the guard checks that the site still renders it.
// That is the whole lesson of this defect: the `next` badge was defined and
// never rendered, and 17 questions asked nothing for months because a string
// existed in the source and no pixel existed on screen. Deleting a badge now
// trips this guard instead of silently recreating the bug.
// ─────────────────────────────────────────────────────────────────────────────
{
  // A real ask: a question mark, a stem that runs into its options with a colon,
  // or a clause-initial directive verb ("Pick the...", "Order the steps...").
  //
  // Clause-initial, NOT string-initial. A `seq` stem almost always sets the
  // situation first and gives the instruction in a second sentence — "You have
  // to move it out of your zone. Put these steps in the right order." Anchoring
  // at the start of the string flagged three of those as askless on the first
  // run, which would have been a detector bug reported as a content defect.
  const ASKS = /\?|:\s*$|(^|[.!?]\s+)(pick|choose|order|rank|select|name|identify|decide|put|tap|drag)\b/i;
  const NEEDS_ASK = new Set(["mc", "seq"]);
  const askless = [];
  for (const [band, arr] of Object.entries(bank)) {
    for (const q of arr) {
      if (!NEEDS_ASK.has(q.type)) continue;
      const stem = [q.q, q.question, q.sit].find(s => typeof s === "string" && s.trim());
      if (!stem || !ASKS.test(stem.trim())) {
        askless.push(`${band} · ${q.id} · "${(stem || "").slice(-60)}"`);
      }
    }
  }
  ok(`every mc/seq stem contains an actual ask${askless.length ? ` — found ${askless.length}` : ""}`,
    askless.length === 0);
  askless.slice(0, 8).forEach(b => console.log(`        ${b}`));

  // The exempt types, and the render site that supplies each one's ask. If a
  // site stops rendering its chrome, the exemption is no longer earned.
  const app = readFileSync(join(HERE, "..", "App.jsx"), "utf8");
  // Needles are the rendered chrome itself, not a word that happens to appear
  // somewhere in a 6000-line file. A needle that would pass by accident guards
  // nothing.
  //
  // And each one is COUNTED, not merely found. There are two quiz surfaces —
  // the main quiz and the weekly quiz — and each renders its own copy of this
  // chrome. Checking for presence only proves one of them survived: verified by
  // deleting the main-quiz badge and watching this assertion still pass, which
  // is exactly the half-missing state that let 17 `next` questions ship with no
  // ask on one of the two screens.
  const CHROME = [
    { type: "next", sites: 2, needle: `qtype === "next" ? "🔮 What's Your Next Move?"` },
    { type: "mistake", sites: 2, needle: `🔍 Spot the Mistake` },
    { type: "tf", sites: 1, needle: `{["True","False"].map` },
  ];
  const countOf = (s) => app.split(s).length - 1;
  const missing = CHROME.filter(c => countOf(c.needle) < c.sites)
    .map(c => `${c.type}: ${countOf(c.needle)} of ${c.sites} render sites`);
  ok(`every ask-exempt type still renders the chrome that supplies its ask, on every surface${missing.length ? ` — ${missing.join("; ")}` : ""}`,
    missing.length === 0);

  // And the detector still bites, so a green line here means something.
  // And the detector still bites, and still spares the real phrasings the bank
  // uses — including the second-sentence instruction that caught it out.
  ok("the ask guard still bites on a stem that only describes a situation",
    !ASKS.test("You are on a 2-on-1 with your winger and the defender backs in")
    && !ASKS.test("Your defence partner has the puck behind the net and you are open")
    && ASKS.test("What is the best play?")
    && ASKS.test("Order the steps for getting the puck out of your end:")
    && ASKS.test("Pick the teammate with the open lane")
    && ASKS.test("You need to move it out of your zone. Put these steps in the right order.")
    && ASKS.test("Your D gives a breakout pass. Order the steps for a successful entry."));
}

// ─────────────────────────────────────────────────────────────────────────────
// GUARD 8 — the answer must not be guessable from its SHAPE.
//
// Measured 2026-08-03: the correct option is the strictly longest one in
// 156 of 237 scorable questions — 65.8% bank-wide, 72.4% at U11, against 25%
// by chance. A child who never reads a single stem and always taps the longest
// option scores about two thirds. That is not a hard question answered well; it
// is a test that leaks its own answer, and every score built on it is inflated.
//
// It happens for an innocent reason, which is why it needs a machine to catch
// it: the correct answer is the one the author has to make precise ("When the
// reward is big and losing the puck won't hurt your team badly"), while the
// distractors are quick and blunt ("Never"). Precision costs words. Nobody
// decided this; it accumulated.
//
// This is a RATCHET, not a target. The recorded rates are today's, and the
// guard fails if any band gets worse. Fixing the content is a coach's job —
// the distractors need to become plausible-but-inferior reads rather than
// absolutes — and that is queued separately. What this stops is the number
// quietly climbing while that work waits.
//
// Deliberately NOT a hard threshold at 25%: a legitimate question can have a
// long correct answer, and demanding parity everywhere would push authors to
// pad distractors, which is the same defect wearing a different hat.
// ─────────────────────────────────────────────────────────────────────────────
{
  // Today's measured rate per band, rounded UP to the next whole percent so
  // ordinary edits don't trip it. Lower these as the content improves; never
  // raise one to make a failing run pass.
  const BASELINE = {
    "U7 / Initiation": 65,
    "U9 / Novice": 50,
    "U11 / Atom": 73,
    "U13 / Peewee": 48,
    "U15 / Bantam": 17,
    "U18 / Midget": 100,   // 1 scorable question — not a rate, a coin
  };
  const MIN_SAMPLE = 10;   // below this a "rate" is noise, not a signal

  const worse = [];
  const rates = [];
  for (const [band, arr] of Object.entries(bank)) {
    let scorable = 0, keyIsLongest = 0;
    for (const q of arr) {
      const opts = q.opts || q.choices;
      if (!Array.isArray(opts) || !Number.isInteger(q.ok) || q.ok >= opts.length) continue;
      const lens = opts.map(o => String(o).length);
      const max = Math.max(...lens);
      scorable += 1;
      // Strictly longest — a tie carries no signal, so it is not counted.
      if (lens[q.ok] === max && lens.filter(l => l === max).length === 1) keyIsLongest += 1;
    }
    if (!scorable) continue;
    const rate = (100 * keyIsLongest) / scorable;
    rates.push(`${band}: ${keyIsLongest}/${scorable} = ${rate.toFixed(1)}%`);
    const cap = BASELINE[band];
    if (cap === undefined) { worse.push(`${band} is not in the baseline (${rate.toFixed(1)}%) — record it deliberately`); continue; }
    if (scorable >= MIN_SAMPLE && rate > cap) worse.push(`${band} ${rate.toFixed(1)}% > baseline ${cap}%`);
  }

  ok(`the longest-answer tell did not get worse in any band${worse.length ? ` — ${worse.join("; ")}` : ""}`,
    worse.length === 0);
  rates.forEach(r => console.log(`        ${r}`));

  // The sharpest version of the same defect: every distractor is an absolute
  // ("Never", "Always", "Every time") and the key is the only hedged option.
  // Those are answerable with no hockey knowledge at all.
  // "only" and "must" belong here as much as "never" and "always" — the six
  // real instances hinge on them ("attack only when defenders are perfectly
  // balanced", "the defender must legally move"). A first pass without them
  // found 1 of 6, which would have set the baseline five too loose.
  const ABSOLUTE = /\b(never|always|every time|every single time|whenever|only|must|all of the time|no matter what)\b/i;
  const giveaways = [];
  for (const [band, arr] of Object.entries(bank)) {
    for (const q of arr) {
      const opts = q.opts || q.choices;
      if (!Array.isArray(opts) || !Number.isInteger(q.ok) || q.ok >= opts.length) continue;
      const absolutes = opts.map(o => ABSOLUTE.test(String(o)));
      if (!absolutes[q.ok] && absolutes.filter(Boolean).length === opts.length - 1) {
        giveaways.push(`${band} · ${q.id}`);
      }
    }
  }
  // Four exist today, all at U11 -- the detector catches a subset of the six an
  // audit found by hand, because two of them lean on constructions ("anyway",
  // "anywhere counts") that no word list catches without false positives. The
  // baseline is what THIS rule measures, not what the audit reported: a ratchet
  // set to a number the code cannot verify is not a ratchet.
  // Same logic as above: this may fall, never rise.
  const ABSOLUTE_BASELINE = 4;
  ok(`no NEW question keys the only non-absolute option (${giveaways.length}, baseline ${ABSOLUTE_BASELINE})`,
    giveaways.length <= ABSOLUTE_BASELINE);
  giveaways.slice(0, 8).forEach(g => console.log(`        ${g}`));
}

const total = Object.values(bank).reduce((n, a) => n + a.length, 0);
console.log(`\nchecked ${total} questions across ${Object.keys(bank).length} bands`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
