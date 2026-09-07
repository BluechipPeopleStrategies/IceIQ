// Pure parse/serialize for docs/roadmap/TASKS.md. Each section is a flat
// list of items; each item is stored WITHOUT its leading list marker ("- "
// or "N. ") so serializeTasks() can regenerate markers fresh — this is what
// keeps NEXT a clean sequential numbered list after an add/remove/move. An
// item this parser doesn't understand is never invented or dropped:
// everything between one marker and the next (or the next heading, or EOF)
// round-trips as one opaque string, exactly as written. No DOM, no fs —
// pure string in, structure out (and back), unit-testable in plain Node.
//
// The file uses CRLF line endings. Internal logic works on \n-normalized
// text; parseTasks() records whether the input was CRLF so serializeTasks()
// can restore it, keeping saves from silently rewriting the whole file's
// line-ending convention.

const SECTION_MATCHERS = [
  { key: "now", re: /NOW/ },
  { key: "next", re: /NEXT/ },
  { key: "later", re: /LATER/ },
  { key: "parking", re: /PARKING LOT/ },
  { key: "changelog", re: /Changelog/ },
];

const HEADING_LINE_RE = /^## /;
const DASH_ITEM_RE = /^- /;
const NUM_ITEM_RE = /^\d+\.\s/;

function sectionKeyForHeading(headingLine) {
  const m = SECTION_MATCHERS.find((s) => s.re.test(headingLine));
  return m ? m.key : null;
}

// Split a section body into items, stripping each item's leading marker. An
// item runs from one marker line to just before the next marker line (or
// the end of the body), so a hypothetical multi-line bullet stays intact
// even though the current file only ever has single-line bullets.
function parseItems(body) {
  const lines = body.split("\n");
  const items = [];
  let current = null;
  for (const line of lines) {
    if (DASH_ITEM_RE.test(line)) {
      if (current !== null) items.push(current.join("\n").trim());
      current = [line.replace(DASH_ITEM_RE, "")];
    } else if (NUM_ITEM_RE.test(line)) {
      if (current !== null) items.push(current.join("\n").trim());
      current = [line.replace(NUM_ITEM_RE, "")];
    } else if (current !== null) {
      current.push(line);
    }
    // Lines before the first marker (e.g. a leading blank line) are
    // dropped; serializeTasks() regenerates that spacing fresh.
  }
  if (current !== null) items.push(current.join("\n").trim());
  return items.filter((it) => it.length > 0);
}

// Parse the full raw text of TASKS.md into
// { headerRaw, now, next, later, parking, changelog, crlf, headings }.
// `headings` maps each section key to its ACTUAL heading line text as found
// in the source, so a hand-edit to a heading (reworded text, a bumped
// number, a changed emoji) round-trips verbatim instead of being silently
// reverted to serializeTasks()'s hardcoded default on the next save.
export function parseTasks(rawInput) {
  const crlf = rawInput.includes("\r\n");
  const raw = crlf ? rawInput.replace(/\r\n/g, "\n") : rawInput;

  const firstHeadingIdx = raw.search(/^## /m);
  const headerRaw = firstHeadingIdx === -1 ? raw : raw.slice(0, firstHeadingIdx).replace(/\n+$/, "");
  const rest = firstHeadingIdx === -1 ? "" : raw.slice(firstHeadingIdx);

  const result = { headerRaw, now: [], next: [], later: [], parking: [], changelog: [], crlf, headings: {} };
  if (!rest) return result;

  const lines = rest.split("\n");
  let currentKey = null;
  let bodyLines = [];
  const flush = () => {
    if (currentKey) result[currentKey] = parseItems(bodyLines.join("\n"));
    bodyLines = [];
  };
  for (const line of lines) {
    if (HEADING_LINE_RE.test(line)) {
      flush();
      currentKey = sectionKeyForHeading(line);
      if (currentKey === null) {
        throw new Error(
          `Unrecognized TASKS.md section heading: "${line}" — the tracker doesn't know how to preserve this. Extend SECTION_MATCHERS before parsing this file.`
        );
      }
      result.headings[currentKey] = line;
    } else {
      bodyLines.push(line);
    }
  }
  flush();
  return result;
}

const SECTION_ORDER = [
  { key: "now", heading: "## 🔵 NOW — active front (max 3)", marker: "dash" },
  { key: "next", heading: "## 🟢 NEXT — sequenced, in order", marker: "num" },
  { key: "later", heading: "## ⚪ LATER — in scope, not yet sequenced", marker: "dash" },
  { key: "parking", heading: "## 🅿️ PARKING LOT — out of current scope (captured, not sequenced)", marker: "dash" },
  { key: "changelog", heading: "## Changelog", marker: "dash" },
];

// Serialize the structure back into the full TASKS.md text. Regenerates
// every marker fresh (so NEXT is always a clean 1..N sequence); every item's
// own text is written back exactly as stored. Each heading is written back
// using data.headings[key] (the actual text captured at parse time) so a
// hand-edited heading survives; only when data.headings is missing a key
// (e.g. a partial structure built by code that predates the `headings`
// field) does it fall back to the hardcoded SECTION_ORDER default. Restores
// CRLF line endings if the source used them.
export function serializeTasks(data) {
  const parts = [data.headerRaw];
  for (const { key, heading, marker } of SECTION_ORDER) {
    const items = data[key] || [];
    const headingText = (data.headings && data.headings[key]) || heading;
    const bulleted = items.map((it, i) => (marker === "num" ? `${i + 1}. ${it}` : `- ${it}`));
    parts.push(bulleted.length ? `${headingText}\n\n${bulleted.join("\n")}` : headingText);
  }
  let out = parts.join("\n\n") + "\n";
  if (data.crlf) out = out.replace(/\n/g, "\r\n");
  return out;
}
