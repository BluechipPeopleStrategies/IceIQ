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
