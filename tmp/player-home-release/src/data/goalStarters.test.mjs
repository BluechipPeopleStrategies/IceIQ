#!/usr/bin/env node
// Run: node src/data/goalStarters.test.mjs
//
// The regression this file exists for: SMART Goals used to resolve example copy
// by CATEGORY NAME ALONE, which covered 9 of 29 (level, category) pairs. U13 and
// U18 got nothing at all, on every category, on all five fields. COVERAGE below
// is that test. Run it against the old code and it fails ~20 times.
//
// GOAL_CATS lives inline in App.jsx and LEVELS lives in shared.jsx, and neither
// file can be imported into plain node (JSX). Both are read as text and the
// array literals are parsed, which is enough: if either declaration is
// reformatted past the parser, the test fails loudly rather than silently
// checking nothing (see the "the source parsers actually found something"
// assertions).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canSetGoals } from "./goalBands.js";
import {
  GOAL_CATEGORIES,
  SMART_FIELDS,
  MAX_CHIP_CHARS,
  starterOptionsFor,
  starterSourceFor,
  hasSpecificStarters,
  exampleFor,
} from "./goalStarters.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..");

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };
const todo = (n) => console.log(`TODO  ${n}`);

// ---- read the two source-of-truth tables out of the app ---------------------
function parseLevels() {
  const src = readFileSync(join(SRC, "shared.jsx"), "utf8");
  const m = /export\s+const\s+LEVELS\s*=\s*(\[[\s\S]*?\])\s*;/.exec(src);
  return m ? JSON.parse(m[1]) : [];
}

function parseGoalCats() {
  const src = readFileSync(join(SRC, "App.jsx"), "utf8");
  const m = /const\s+GOAL_CATS\s*=\s*\{([\s\S]*?)\n\}\s*;/.exec(src);
  if (!m) return {};
  const out = {};
  const row = /"([^"]+)"\s*:\s*(\[[^\]]*\])/g;
  let r;
  while ((r = row.exec(m[1]))) out[r[1]] = JSON.parse(r[2]);
  return out;
}

const LEVELS = parseLevels();
const GOAL_CATS = parseGoalCats();

ok("the source parsers actually found LEVELS", LEVELS.length >= 5);
ok("the source parsers actually found GOAL_CATS", Object.keys(GOAL_CATS).length >= 5);

// ---- every level in LEVELS has goal categories ------------------------------
// Asserted against this module, which is the table App.jsx will read from once
// the inline one is deleted. The equivalent check against App.jsx's own table is
// the TODO below, and it is a TODO rather than a failure only because fixing it
// means editing App.jsx.
{
  const missing = LEVELS.filter((l) => !(GOAL_CATEGORIES[l] || []).length);
  ok(`every LEVELS entry has goal categories${missing.length ? ` — missing ${missing.join(", ")}` : ""}`,
    missing.length === 0);

  const missingInApp = LEVELS.filter((l) => !(GOAL_CATS[l] || []).length);
  if (missingInApp.length) {
    todo(`App.jsx GOAL_CATS has no entry for ${missingInApp.join(", ")} — ` +
      `those players open SMART Goals with zero category tabs. GOAL_CATEGORIES ` +
      `in goalStarters.js already carries the set; wiring it is an App.jsx change. ` +
      `Turn this TODO into an ok() once it is wired.`);
  }
}

// ---- parity, so the inline table can be deleted without changing behaviour --
{
  const drift = [];
  for (const [level, cats] of Object.entries(GOAL_CATS)) {
    const mine = GOAL_CATEGORIES[level];
    if (!mine) { drift.push(`${level}: absent from GOAL_CATEGORIES`); continue; }
    if (mine.join("|") !== cats.join("|")) drift.push(`${level}: ${mine.join(",")} vs ${cats.join(",")}`);
  }
  ok(`GOAL_CATEGORIES matches App.jsx GOAL_CATS, in order${drift.length ? ` — ${drift.length} off` : ""}`,
    drift.length === 0);
  drift.forEach((d) => console.log(`        ${d}`));
}

// ---- COVERAGE: the regression -----------------------------------------------
// Every live (level, category) pair, every one of the five fields, 2-4 options,
// and S/M/R written for that exact pair rather than inherited from the band.
{
  const gaps = [];
  const thin = [];
  let pairs = 0;
  for (const [level, cats] of Object.entries(GOAL_CATS)) {
    for (const cat of cats) {
      pairs++;
      if (!hasSpecificStarters(level, cat)) { gaps.push(`${level} · ${cat} · no entry`); continue; }
      for (const f of SMART_FIELDS) {
        const opts = starterOptionsFor(level, cat, f);
        if (!opts.length) { gaps.push(`${level} · ${cat} · ${f} · none`); continue; }
        if (opts.length < 2 || opts.length > 4) thin.push(`${level} · ${cat} · ${f} · ${opts.length}`);
        if ("SMR".includes(f) && starterSourceFor(level, cat, f) !== "category") {
          gaps.push(`${level} · ${cat} · ${f} · fell back to the band default`);
        }
      }
    }
  }
  ok(`all ${pairs} live (level, category) pairs resolve all 5 SMART fields${gaps.length ? ` — ${gaps.length} gaps` : ""}`,
    gaps.length === 0);
  gaps.slice(0, 12).forEach((g) => console.log(`        ${g}`));
  ok(`every field offers 2-4 options${thin.length ? ` — ${thin.length} outside the range` : ""}`, thin.length === 0);
  thin.slice(0, 12).forEach((t) => console.log(`        ${t}`));
}

// Same sweep across this module's own table, which also covers the U7 band that
// GOAL_CATS has not adopted yet.
{
  const gaps = [];
  for (const [level, cats] of Object.entries(GOAL_CATEGORIES)) {
    for (const cat of cats) {
      for (const f of SMART_FIELDS) {
        if (starterOptionsFor(level, cat, f).length < 2) gaps.push(`${level} · ${cat} · ${f}`);
      }
    }
  }
  ok(`every band in this module, U7 included, resolves all 5 fields${gaps.length ? ` — ${gaps.length} gaps` : ""}`,
    gaps.length === 0);
  gaps.slice(0, 12).forEach((g) => console.log(`        ${g}`));
}

// ---- collect every option once, for the content guards ----------------------
const ALL = []; // { level, cat, field, text }
for (const [level, cats] of Object.entries(GOAL_CATEGORIES)) {
  for (const cat of cats) {
    for (const f of SMART_FIELDS) {
      for (const text of starterOptionsFor(level, cat, f)) ALL.push({ level, cat, field: f, text });
    }
  }
}
ok("the content guards have options to check", ALL.length > 300);

// ---- M means measurable -----------------------------------------------------
// The one field that fails silently: an M option with nothing countable in it is
// just another sentence. A digit, a number word, a deadline, or a rung on the
// app's live ladder (constants.js COMPETENCY_LADDER) all qualify.
{
  const COUNTABLE = /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|twice|half|every|each)\b|\b(introduced|developing|consistent|proficient|advanced|tier)\b/i;
  const bad = ALL.filter((o) => o.field === "M" && !COUNTABLE.test(o.text));
  ok(`every M option contains something countable${bad.length ? ` — ${bad.length} do not` : ""}`, bad.length === 0);
  bad.slice(0, 10).forEach((o) => console.log(`        ${o.level} · ${o.cat} · "${o.text}"`));

  // Self-check: a guard that cannot fail is a guard that was never run.
  ok("the measurable guard still rejects an unmeasurable sentence",
    COUNTABLE.test("Get better at my skating") === false && COUNTABLE.test("Do it 8 of 10 times") === true);
}

// ---- chip length ------------------------------------------------------------
{
  const long = ALL.filter((o) => o.text.length > MAX_CHIP_CHARS);
  ok(`no option exceeds ${MAX_CHIP_CHARS} characters${long.length ? ` — ${long.length} do` : ""}`, long.length === 0);
  long.slice(0, 10).forEach((o) => console.log(`        ${o.text.length} · ${o.level} · ${o.cat} · "${o.text}"`));
  ok("no option is blank or padded", ALL.every((o) => o.text.trim() === o.text && o.text.length > 0));
}

// ---- U7 / U9 vocabulary -----------------------------------------------------
// Mirrors bankContent.test.mjs GUARD 1 (zone names) and GUARD 5 (full-sheet
// lines and the rules that depend on them). Kept as two separate guards for the
// same reason it is split there: they fail for different reasons, and the
// failure message should say which.
{
  const ZONES = /\b(neutral zone|defensive zone|offensive zone|attacking zone|own zone|your zone|their zone|d-zone|o-zone|the slot)\b/i;
  const YOUNG = ["U7 / Initiation", "U9 / Novice"];
  const bad = ALL.filter((o) => YOUNG.includes(o.level) && ZONES.test(o.text));
  ok(`no zone names at U7/U9${bad.length ? ` — found ${bad.length}` : ""}`, bad.length === 0);
  bad.slice(0, 8).forEach((o) => console.log(`        ${o.level} · ${o.cat} · "${o.text}"`));
  ok("the zone guard still matches the phrasings it was written for",
    ["cover the defensive zone", "read the neutral zone"].every((s) => ZONES.test(s)));
}
{
  const LINES = /\b(blue ?line|red ?line|cent(?:er|re) ?ice|cent(?:er|re) ?line|off-?side|icing)\b/i;
  const YOUNG = ["U7 / Initiation", "U9 / Novice"];
  const bad = ALL.filter((o) => YOUNG.includes(o.level) && LINES.test(o.text));
  ok(`no full-sheet line or line-rule at U7/U9${bad.length ? ` — found ${bad.length}` : ""}`, bad.length === 0);
  bad.slice(0, 8).forEach((o) => console.log(`        ${o.level} · ${o.cat} · "${o.text}"`));
  ok("the line guard still matches the phrasings it was written for",
    ["stop at the blue line", "called for offside", "shoot from center ice"].every((s) => LINES.test(s)));
}

// ---- voice ------------------------------------------------------------------
{
  const dashes = ALL.filter((o) => /[—–]/.test(o.text));
  ok(`no em or en dashes${dashes.length ? ` — ${dashes.length}` : ""}`, dashes.length === 0);
  dashes.slice(0, 6).forEach((o) => console.log(`        ${o.level} · "${o.text}"`));

  // Goals reach for something. "Stop being bad at X" is a different instrument.
  const DEFICIT = /\b(weakest|my worst|stop being|fix my|reduce my|bad at|struggle with)\b/i;
  const deficit = ALL.filter((o) => DEFICIT.test(o.text));
  ok(`nothing is framed as fixing a deficiency${deficit.length ? ` — ${deficit.length}` : ""}`, deficit.length === 0);
  deficit.slice(0, 6).forEach((o) => console.log(`        ${o.level} · ${o.cat} · "${o.text}"`));

  // A retired scale value. 'On Track' only exists in migrateRatings()'s legacy
  // map; the live rungs are Introduced/Developing/Consistent/Proficient/Advanced.
  const retired = ALL.filter((o) => /\b(on track|needs work|excels)\b/i.test(o.text));
  ok(`no option cites a retired rating label${retired.length ? ` — ${retired.length}` : ""}`, retired.length === 0);
  retired.slice(0, 6).forEach((o) => console.log(`        ${o.level} · "${o.text}"`));

  // U7 has no rating scale at all (RATING_SCALES has no U7 entry), so a U7 goal
  // measured by "what my coach rates me" is unmeasurable in this app.
  const u7rating = ALL.filter((o) => o.level === "U7 / Initiation" && /\b(rates?|marks?)\b/i.test(o.text));
  ok(`no U7 option depends on a coach rating${u7rating.length ? ` — ${u7rating.length}` : ""}`, u7rating.length === 0);
  u7rating.slice(0, 6).forEach((o) => console.log(`        ${o.cat} · "${o.text}"`));
}

// ---- no duplicates inside one option group ----------------------------------
{
  const dupes = [];
  for (const [level, cats] of Object.entries(GOAL_CATEGORIES)) {
    for (const cat of cats) {
      for (const f of SMART_FIELDS) {
        const opts = starterOptionsFor(level, cat, f);
        if (new Set(opts).size !== opts.length) dupes.push(`${level} · ${cat} · ${f}`);
      }
    }
  }
  ok(`no repeated option inside one group${dupes.length ? ` — ${dupes.length}` : ""}`, dupes.length === 0);
  dupes.slice(0, 8).forEach((d) => console.log(`        ${d}`));
}

// ---- lookup behaviour -------------------------------------------------------
ok("a bare age group resolves the same as a full level string",
  starterOptionsFor("U13", "Zone Entry", "S")[0] === starterOptionsFor("U13 / Peewee", "Zone Entry", "S")[0]);
ok("field lookup is case-insensitive",
  starterOptionsFor("U13 / Peewee", "Zone Entry", "s").length === starterOptionsFor("U13 / Peewee", "Zone Entry", "S").length);
ok("an unknown category still returns the band's generic options, never nothing",
  starterOptionsFor("U15 / Bantam", "Faceoffs", "M").length >= 2);
ok("an unknown category is reported as a band fallback, not as written content",
  starterSourceFor("U15 / Bantam", "Faceoffs", "M") === "band" && hasSpecificStarters("U15 / Bantam", "Faceoffs") === false);
ok("an unknown level returns nothing rather than U7 words to a U18 player",
  starterOptionsFor("nonsense", "Skating", "S").length === 0);
ok("a null level returns nothing", starterOptionsFor(null, "Skating", "S").length === 0);
ok("an unknown field returns nothing", starterOptionsFor("U13 / Peewee", "Zone Entry", "X").length === 0);

// ---- exampleFor replaces the inline SMART_EXAMPLES row ----------------------
{
  const missing = [];
  for (const [level, cats] of Object.entries(GOAL_CATEGORIES)) {
    for (const cat of cats) {
      const ex = exampleFor(level, cat);
      for (const f of SMART_FIELDS) if (!ex[f]) missing.push(`${level} · ${cat} · ${f}`);
    }
  }
  ok(`exampleFor returns all 5 placeholder strings for every pair${missing.length ? ` — ${missing.length} missing` : ""}`,
    missing.length === 0);
  missing.slice(0, 8).forEach((m) => console.log(`        ${m}`));
}

// ---- controllability: a goal the player cannot cause is not their goal ------
//
// 28 of the 29 categories above U7 carried exactly one "Coach rates my X
// Consistent" measurable — a template someone applied, not drift. It fails
// three ways at once: the athlete cannot cause it, cannot observe it, and in
// minor hockey the ladder mostly never gets updated, so it silently resolves as
// FAILED for reasons they did not cause. ratingCopy.js states in capitals that
// MOST PLAYERS HAVE NO TEAM, so for the typical user these were goals nobody
// could ever mark done.
//
// Coach references stay legal in ACHIEVABLE, where this file already uses them
// correctly ("My coach has worked on it with me") — that is coach input as
// evidence of feasibility, which is exactly right.
{
  const VERDICT = /\b(coach rates|my coach marks)\b/i;
  const bad = [];
  for (const [level, cats] of Object.entries(GOAL_CATEGORIES)) {
    for (const cat of cats) {
      for (const s of starterOptionsFor(level, cat, "M")) {
        if (VERDICT.test(s)) bad.push(`${level} · ${cat} · "${s}"`);
      }
    }
  }
  ok(`no Measurable resolves on a coach's verdict${bad.length ? ` — ${bad.length}` : ""}`,
    bad.length === 0);
  bad.slice(0, 6).forEach(b => console.log(`        ${b}`));
}

// ---- index 0 is the live product, so it carries an extra standard -----------
//
// exampleFor() returns opts[0] and App.jsx renders it as the placeholder a
// player actually sees. So whatever sits at index 0 is shipped, and the other
// two options in the array are not — they are only reachable once tappable
// chips exist. Ten of 33 categories used to lead their Measurable with a coach
// verdict, which meant that was the only measurable those players ever saw.
{
  const NEVER_FIRST = [
    [/\b(coach rates|my coach marks)\b/i, "a coach's verdict"],
    // Cross-session streaks only. A streak bounded inside one session, where
    // the streak IS the skill, is legitimate — "10 snowplow stops in a row at
    // practice" is a rep target, not an all-or-nothing month. What fails is a
    // streak spanning games or practices, where one bad day zeroes the work.
    [/\bstraight (games|practices)\b|\b(games|practices) in a row\b/i, "a cross-session streak"],
    [/\bnever\b|\bevery shift\b|on every shot/i, "an absolute"],
  ];
  // Scoped to bands that actually reach a player. U7 keeps its content in this
  // file — for reuse by whatever replaces SMART for the youngest band, and so
  // the decision is reversible — but canSetGoals() closes the door, so holding
  // it to a shipping standard would be enforcing a rule on strings nobody sees.
  //
  // U7 is also the proof the gate is right: all THREE of its Teamwork
  // measurables were independently flagged by a reviewer. There was no good
  // option to lead with, because measurement itself is the wrong ask at 5-6.
  const bad = [];
  for (const [level, cats] of Object.entries(GOAL_CATEGORIES)) {
    if (!canSetGoals(level)) continue;
    for (const cat of cats) {
      const first = starterOptionsFor(level, cat, "M")[0] || "";
      for (const [re, why] of NEVER_FIRST) {
        if (re.test(first)) bad.push(`${level} · ${cat} leads with ${why}: "${first}"`);
      }
    }
  }
  ok(`no shipping category leads its Measurable with a verdict, streak or absolute${bad.length ? ` — ${bad.length}` : ""}`,
    bad.length === 0);
  bad.slice(0, 6).forEach(b => console.log(`        ${b}`));

  ok("U7 does not set SMART goals, and U9 is the first band that does",
    !canSetGoals("U7 / Initiation") && canSetGoals("U9 / Novice"));
  ok("the goal gate fails closed on an unparseable level, like canSelfRate",
    !canSetGoals("") && !canSetGoals(null) && !canSetGoals("Rookie"));
}

// ---- the migrated strings survived ------------------------------------------
// Nine strings came over from App.jsx's SMART_EXAMPLES. These are the ones kept
// verbatim; the four that changed, and why, are documented at the top of
// goalStarters.js.
{
  const KEPT = [
    ["U11 / Atom", "Skating", "S", "Improve my backward crossovers on both sides"],
    ["U11 / Atom", "Skating", "A", "I can already do basic crossovers"],
    ["U11 / Atom", "Skating", "R", "Better backward skating helps my gap control as a defender"],
    ["U11 / Atom", "Gap Control", "S", "Maintain a 10-foot gap on all rush situations"],
    ["U11 / Atom", "Gap Control", "A", "I understand gap theory already"],
    ["U11 / Atom", "Gap Control", "R", "Gap control is the #1 D skill in atom hockey"],
    ["U11 / Atom", "Rush Reads", "S", "Make the correct 2-on-1 decision every time"],
    ["U11 / Atom", "Rush Reads", "M", "Score 80%+ on Rush Reads in RinkReads"],
    ["U11 / Atom", "Rush Reads", "A", "I get the concept, just need reps"],
    ["U11 / Atom", "Game IQ", "S", "Pre-read plays before the puck arrives"],
    ["U11 / Atom", "Game IQ", "M", "RinkReads score improves from current to Hockey Sense tier"],
    ["U11 / Atom", "Game IQ", "R", "Faster reads = better plays"],
    // "Hit top corners 3 out of 5 in practice drills" was pinned here and is
    // now CUT. It came over verbatim from SMART_EXAMPLES, and being inherited
    // was the only reason it survived a migration that correctly rejected three
    // other strings on content grounds. Three independent expert reviews
    // (psychology, developmental, hockey) each cut it: most 7-to-8 year olds
    // cannot elevate a puck at all, so 60% top-corner accuracy is a weekly
    // failure generator at the age with the least accumulated evidence that
    // they are any good. It was also M[0], so under exampleFor it was the ONLY
    // measurable a U9 ever saw for shooting. Provenance is not justification.
  ];
  const lost = KEPT.filter(([l, c, f, s]) => !starterOptionsFor(l, c, f).includes(s));
  ok(`the preserved SMART_EXAMPLES strings are still present${lost.length ? ` — ${lost.length} lost` : ""}`,
    lost.length === 0);
  lost.slice(0, 8).forEach(([l, c, f, s]) => console.log(`        ${l} · ${c} · ${f} · "${s}"`));

  // "atom" is a U11 word. The old table keyed examples by category name alone,
  // so this line was also being shown to U15s, whose Gap Control category is
  // the same string. That leak is the bug this module was written to end.
  const leaked = ALL.filter((o) => o.level !== "U11 / Atom" && /\batom\b/i.test(o.text));
  ok(`the atom-specific line does not leak to another band${leaked.length ? ` — ${leaked.length}` : ""}`, leaked.length === 0);
  leaked.slice(0, 6).forEach((o) => console.log(`        ${o.level} · ${o.cat} · "${o.text}"`));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
