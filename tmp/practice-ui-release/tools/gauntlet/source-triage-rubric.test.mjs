#!/usr/bin/env node
// Run: node tools/gauntlet/source-triage-rubric.test.mjs
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSourceTriageRubric, renderSourceTriageRubric } from "./source-triage-rubric.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const __dirname = dirname(fileURLToPath(import.meta.url));
const rubric = loadSourceTriageRubric(resolve(__dirname, "source-triage-rubric.json"));

ok("loads a version number", typeof rubric.version === "number" && rubric.version >= 1);
ok("loads at least 3 principles", Array.isArray(rubric.principles) && rubric.principles.length >= 3);
ok("every principle has an id and text", rubric.principles.every((p) => p.id && p.text && p.text.length > 10));
ok("covers source tiers", rubric.principles.some((p) => /tier/i.test(p.text)));
ok("covers curriculum relevance", rubric.principles.some((p) => /relevan/i.test(p.text)));
ok("covers the no-verbatim-quoting output constraint", rubric.principles.some((p) => /(verbatim|quot|own words)/i.test(p.text)));

const rendered = renderSourceTriageRubric(rubric);
ok("renders a non-empty numbered block", /^1\./m.test(rendered));
ok("renders every principle's text", rubric.principles.every((p) => rendered.includes(p.text)));
ok("renders an empty string for an empty rubric", renderSourceTriageRubric({ principles: [] }) === "");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
