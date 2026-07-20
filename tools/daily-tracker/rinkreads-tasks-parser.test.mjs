#!/usr/bin/env node
// Run: node tools/daily-tracker/rinkreads-tasks-parser.test.mjs
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTasks, serializeTasks } from "./rinkreads-tasks-parser.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
const realPath = resolve(root, "docs/roadmap/TASKS.md");

// Round-trip against the REAL file: the core safety guarantee. If this ever
// fails, something in TASKS.md's structure changed in a way the parser
// doesn't understand yet — do not "fix" the test by loosening the
// comparison; go find out what changed and handle it properly.
const realRaw = readFileSync(realPath, "utf8");
const realParsed = parseTasks(realRaw);
ok("real file: detects CRLF", realParsed.crlf === true);
ok("real file: NOW has at least 1 item", realParsed.now.length >= 1);
ok("real file: NEXT has at least 1 item", realParsed.next.length >= 1);
ok("real file: items have no leading marker", !realParsed.now[0].startsWith("- ") && !realParsed.next[0].startsWith("1. "));
ok("real file: round-trips byte-for-byte with no edits", serializeTasks(realParsed) === realRaw);

// Small synthetic fixture: exercises every section shape without depending
// on the real file's exact current content (so this half of the suite
// doesn't need updating every time TASKS.md's content changes).
const fixture = [
  "# Title",
  "",
  "**Scope:** test",
  "",
  "---",
  "",
  "## 🔵 NOW — active front (max 3)",
  "",
  "- **A.** first",
  "- **B.** second",
  "",
  "## 🟢 NEXT — sequenced, in order",
  "",
  "1. **C.** third",
  "2. **D.** fourth",
  "",
  "## ⚪ LATER — in scope, not yet sequenced",
  "",
  "- **E.** fifth",
  "",
  "## 🅿️ PARKING LOT — out of current scope (captured, not sequenced)",
  "",
  "- **F.** sixth",
  "",
  "## Changelog",
  "",
  "- **2026-01-01** — done one",
  "",
].join("\n");

const parsed = parseTasks(fixture);
ok("fixture: crlf false for LF input", parsed.crlf === false);
ok("fixture: headerRaw captured", parsed.headerRaw.includes("**Scope:** test") && parsed.headerRaw.includes("---"));
ok("fixture: now has 2 items, markers stripped", parsed.now.length === 2 && parsed.now[0] === "**A.** first");
ok("fixture: next has 2 items, markers stripped", parsed.next.length === 2 && parsed.next[1] === "**D.** fourth");
ok("fixture: later/parking/changelog each have 1 item", parsed.later.length === 1 && parsed.parking.length === 1 && parsed.changelog.length === 1);
ok("fixture: round-trips byte-for-byte", serializeTasks(parsed) === fixture);

// A CRLF fixture, to prove the round-trip guarantee isn't an accident of
// the real file happening to work.
const crlfFixture = fixture.replace(/\n/g, "\r\n");
const crlfParsed = parseTasks(crlfFixture);
ok("crlf fixture: detected", crlfParsed.crlf === true);
ok("crlf fixture: items parsed the same as the LF version", crlfParsed.now[0] === "**A.** first");
ok("crlf fixture: round-trips byte-for-byte, CRLF preserved", serializeTasks(crlfParsed) === crlfFixture);

// serializeTasks renumbers NEXT fresh — proves the numbered list doesn't
// just parrot back whatever number happened to be in the source.
const renumbered = { ...parsed, next: [parsed.next[1]] }; // drop item 1, keep only "D"
const renumberedOut = serializeTasks(renumbered);
ok("serializeTasks renumbers NEXT from scratch", renumberedOut.includes("1. **D.** fourth") && !renumberedOut.includes("2. **D.** fourth"));

// Empty-section fixture: NOW has zero items. serializeTasks must not pad
// the gap before the next heading with extra blank lines (regression for
// the "three blank lines before NEXT" bug when a section is emptied out).
const emptyNowFixture = [
  "# Title",
  "",
  "**Scope:** test",
  "",
  "---",
  "",
  "## 🔵 NOW — active front (max 3)",
  "",
  "## 🟢 NEXT — sequenced, in order",
  "",
  "1. **C.** third",
  "2. **D.** fourth",
  "",
  "## ⚪ LATER — in scope, not yet sequenced",
  "",
  "- **E.** fifth",
  "",
  "## 🅿️ PARKING LOT — out of current scope (captured, not sequenced)",
  "",
  "- **F.** sixth",
  "",
  "## Changelog",
  "",
  "- **2026-01-01** — done one",
  "",
].join("\n");

const emptyNowParsed = parseTasks(emptyNowFixture);
ok("empty NOW fixture: now has 0 items", emptyNowParsed.now.length === 0);
ok(
  "empty NOW fixture: round-trips byte-for-byte (no triple blank line)",
  serializeTasks(emptyNowParsed) === emptyNowFixture
);

// Unrecognized heading: parseTasks must fail loudly rather than silently
// dropping the section's body content.
const unrecognizedHeadingFixture = [
  "# Title",
  "",
  "**Scope:** test",
  "",
  "---",
  "",
  "## 🔵 NOW — active front (max 3)",
  "",
  "- **A.** first",
  "",
  "## Some Extra Heading",
  "",
  "- something that would otherwise vanish",
  "",
].join("\n");

let threwForUnrecognizedHeading = false;
let unrecognizedHeadingErrorMessage = "";
try {
  parseTasks(unrecognizedHeadingFixture);
} catch (err) {
  threwForUnrecognizedHeading = true;
  unrecognizedHeadingErrorMessage = err.message;
}
ok("unrecognized heading: parseTasks throws", threwForUnrecognizedHeading);
ok(
  "unrecognized heading: error message names the offending heading",
  unrecognizedHeadingErrorMessage.includes("Some Extra Heading")
);

// Section headings must be preserved verbatim, not regenerated from the
// hardcoded SECTION_ORDER default — a hand-edited heading (e.g. "max 3"
// bumped to "max 4") must survive a Save unchanged rather than being
// silently reverted.
const rewordedHeadingFixture = fixture.replace(
  "## 🔵 NOW — active front (max 3)",
  "## 🔵 NOW — active front (max 4)"
);
const rewordedParsed = parseTasks(rewordedHeadingFixture);
ok(
  "reworded heading: headings.now captures the exact reworded text",
  rewordedParsed.headings.now === "## 🔵 NOW — active front (max 4)"
);
ok(
  "reworded heading: serializeTasks preserves the reworded heading byte-for-byte, not reverted to the hardcoded default",
  serializeTasks(rewordedParsed) === rewordedHeadingFixture
);

// Backward compatibility: code that constructs a partial structure without
// a `headings` field (e.g. code written before this field existed) must
// still serialize using the hardcoded SECTION_ORDER defaults, not throw.
const { headings: _droppedHeadings, ...noHeadingsData } = parsed;
ok(
  "no headings field: serializeTasks falls back to the hardcoded default heading",
  serializeTasks(noHeadingsData).includes("## 🔵 NOW — active front (max 3)")
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
