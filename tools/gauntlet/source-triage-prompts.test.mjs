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
