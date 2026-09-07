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
